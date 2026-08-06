import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { ArtifactStorageError, putArtifact } from './artifacts.js';
import { validateIntake } from './service.js';
import { config } from './config.js';
import { transitionTarget } from './workflow.js';
import { AgentConfigurationError, AgentExecutionError, AgentReadinessError, checkAgentReadiness, executeAgent } from './agent.js';
import { log } from './log.js';
import { prepareDevelopmentJob } from './phase3.js';
import { persistDiscoveryAgentOutcome } from './discovery-agent-jobs.js';
import { agentExecutionService } from './agent-execution-service.js';

const delays = [5, 15, 30];
const leaseSeconds = () => Math.max(config().agentTimeoutSeconds + config().agentHeartbeatSeconds * 2, 120);
const event = async (client: any, projectId: string, type: string, operationId: string | null, jobId: string | null, revisionId: string | null, payload: object = {}) =>
  client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,workflow_code,workflow_version FROM projects WHERE id=$1`, [projectId, type, randomUUID(), operationId, jobId, revisionId, payload, config().operatorId]);

const leaseJob = (projectId?: string) => withTransaction(async (client) => {
  const leased = await client.query(`WITH candidate AS (
      SELECT id FROM jobs
      WHERE ($2::text IS NULL OR project_id=$2)
        AND (((status IN ('PENDING','RETRYABLE')) AND available_at<=clock_timestamp()) OR (status='LEASED' AND lease_expires_at<clock_timestamp()))
      ORDER BY available_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE jobs
    SET status='LEASED',attempts=attempts+1,lease_expires_at=clock_timestamp()+($1||' seconds')::interval,heartbeat_at=clock_timestamp()
    WHERE id IN (SELECT id FROM candidate)
    RETURNING *`, [String(leaseSeconds()), projectId ?? null]);
  if (!leased.rowCount) return null;
  const job = leased.rows[0];
  await client.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`, [job.operation_id]);
  return job;
});

const completeJob = async (job: any, result?: any) => withTransaction(async (client) => {
  const owned = await client.query(`SELECT 1 FROM jobs WHERE id=$1 AND status='LEASED' AND lease_expires_at>=clock_timestamp() FOR UPDATE`, [job.id]);
  if (!owned.rowCount) throw new Error('JOB_LEASE_LOST');
  const revision = job.revision_id ? (await client.query('SELECT payload FROM intake_revisions WHERE id=$1', [job.revision_id])).rows[0] : undefined;
  if (job.kind === 'DEVELOP_WORK_ITEM') {
    // The isolated worktree was already prepared by the leased worker.
  } else if (job.kind === 'VALIDATE_INTAKE') {
    const errors = validateIntake(revision?.payload ?? {});
    await putArtifact(client, job.project_id, 'validation-report', JSON.stringify({ schema_version: 1, result: errors.length ? 'INVALID' : 'VALID', errors }), job.id);
    if (errors.length) {
      await event(client, job.project_id, 'INTAKE_REQUIRES_ADJUSTMENT', job.operation_id, job.id, job.revision_id, { errors });
    } else {
      const gateId = randomUUID();
      await putArtifact(client, job.project_id, 'gate-opened', JSON.stringify({ gate_id: gateId }), job.id, gateId);
      const target = await transitionTarget(client, job.project_id, 'INTAKE_VALIDATED');
      await client.query('UPDATE projects SET state=$2 WHERE id=$1', [job.project_id, target]);
      await client.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'REGISTER_PROJECT',$3)`, [gateId, job.project_id, job.revision_id]);
      await event(client, job.project_id, 'INTAKE_VALIDATED', job.operation_id, job.id, job.revision_id);
      await event(client, job.project_id, 'GATE_OPENED', job.operation_id, job.id, job.revision_id, { gate_id: gateId, kind: 'REGISTER_PROJECT' });
    }
  } else if (result) {
    await persistDiscoveryAgentOutcome(client, job, result);
  }
  await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp() WHERE id=$1`, [job.id]);
  const pending = await client.query(`SELECT 1 FROM jobs WHERE operation_id=$1 AND status IN('PENDING','RETRYABLE','LEASED')`, [job.operation_id]);
  if (!pending.rowCount) await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id]);
});

const failJob = async (job: any, error: unknown) => withTransaction(async (client) => {
  const code = error instanceof AgentConfigurationError || error instanceof AgentExecutionError || error instanceof AgentReadinessError || error instanceof ArtifactStorageError ? error.code : 'AGENT_EXECUTION_FAILED';
  const current = (await client.query(`SELECT attempts FROM jobs WHERE id=$1 AND status='LEASED' FOR UPDATE`, [job.id])).rows[0];
  if (!current) return;
  const permanent = Number(current.attempts) > config().agentMaxRetries;
  const delay = delays[Math.min(Number(current.attempts) - 1, 2)];
  await client.query(`UPDATE jobs SET status=$2,last_error=$3,available_at=clock_timestamp()+($4||' seconds')::interval,completed_at=CASE WHEN $2='FAILED' THEN clock_timestamp() END WHERE id=$1`, [job.id, permanent ? 'FAILED' : 'RETRYABLE', code, String(delay)]);
  if (permanent) {
    await client.query(`UPDATE operations SET status='FAILED',failure_code=$2,completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id, code]);
    if (job.kind !== 'VALIDATE_INTAKE' && job.kind !== 'RECONCILE_AGENT_EXECUTION') {
      const target = await transitionTarget(client, job.project_id, 'AGENT_EXECUTION_FAILED');
      await client.query(`UPDATE projects SET state=$2,failure_stage=$3,failure_code=$4,updated_at=clock_timestamp() WHERE id=$1`, [job.project_id, target, job.kind, code]);
    }
    await event(client, job.project_id, 'AGENT_EXECUTION_FAILED', job.operation_id, job.id, job.revision_id, { code, stage: job.kind, next_action: 'Corrija o problema e tente novamente' });
    log('worker', 'error', 'job_failed', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(current.attempts), code });
  } else {
    log('worker', 'warn', 'job_retry_scheduled', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(current.attempts), code, retry_in_seconds: delay });
  }
});

const heartbeat = (job: any) => setInterval(() => {
  void pool.query(`UPDATE jobs SET heartbeat_at=clock_timestamp(),lease_expires_at=clock_timestamp()+($2||' seconds')::interval WHERE id=$1 AND status='LEASED'`, [job.id, String(leaseSeconds())]);
}, config().agentHeartbeatSeconds * 1000);

export const runOnce = async (projectId?: string): Promise<boolean> => {
  const lock = await pool.connect();
  try {
    if (!(await lock.query('SELECT pg_try_advisory_lock(941001) locked')).rows[0].locked) return false;
    if (agentExecutionService.isEnabled()) await agentExecutionService.recoverDispatchedAttempts();
    const job = await leaseJob(projectId);
    if (!job) return false;
    log('worker', 'info', 'job_started', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(job.attempts) });
    const timer = heartbeat(job);
    let step = 'prepare_job';
    try {
      if (job.kind === 'DEVELOP_WORK_ITEM') {
        step = 'prepare_isolated_worktree';
        await prepareDevelopmentJob(job);
        step = 'persist_result';
        await completeJob(job);
      } else if (agentExecutionService.isEnabled() && agentExecutionService.handlesJob(job.kind)) {
        step = 'agent_execution_service';
        await agentExecutionService.executeLeasedJob(job);
      } else {
        if (job.kind !== 'VALIDATE_INTAKE') {
          step = 'agent_readiness';
          await checkAgentReadiness();
        }
        step = 'agent_invocation';
        const result = job.kind === 'VALIDATE_INTAKE' ? undefined : await (async () => {
          const intake = (await pool.query('SELECT payload FROM intake_revisions WHERE id=$1', [job.revision_id])).rows[0].payload;
          const adjustment = (await pool.query(`SELECT payload->>'feedback' AS feedback FROM events WHERE project_id=$1 AND event_type='REVIEW_ADJUSTMENTS_APPLIED' ORDER BY id DESC LIMIT 1`, [job.project_id])).rows[0]?.feedback ?? null;
          return executeAgent(job.kind, { intake, project_id: job.project_id, review_adjustment_feedback: adjustment });
        })();
        step = 'persist_result';
        await completeJob(job, result);
      }
      log('worker', 'info', 'job_completed', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(job.attempts) });
    } catch (error) {
      const cause = error as { code?: unknown; constraint?: unknown };
      log('worker', 'error', 'job_execution_failed', {
        job_id: job.id,
        operation_id: job.operation_id,
        project_id: job.project_id,
        kind: job.kind,
        attempt: Number(job.attempts),
        step,
        error_kind: error instanceof Error ? error.constructor.name : 'UnknownError',
        cause_code: typeof cause.code === 'string' ? cause.code : undefined,
        cause_constraint: typeof cause.constraint === 'string' ? cause.constraint : undefined
      });
      await failJob(job, error);
    } finally {
      clearInterval(timer);
    }
    return true;
  } finally {
    try { await lock.query('SELECT pg_advisory_unlock(941001)'); } finally { lock.release(); }
  }
};

if (process.argv[1]?.endsWith('worker.ts') || process.argv[1]?.endsWith('worker.js')) {
  log('worker', 'info', 'worker_started', { poll_interval_seconds: 1 });
  process.on('SIGTERM', () => { log('worker', 'info', 'worker_stopped'); process.exit(0); });
  while (true) {
    try { await runOnce(); }
    catch (error) { log('worker', 'error', 'worker_cycle_failed', { error_kind: error instanceof Error ? error.constructor.name : 'UnknownError' }); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
