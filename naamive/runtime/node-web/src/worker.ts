import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { pool, withTransaction } from './db.js';
import { ArtifactStorageError, putArtifact } from './artifacts.js';
import { validateIntake, ApiError } from './service.js';
import { config } from './config.js';
import { transitionTarget } from './workflow.js';
import { AgentConfigurationError, AgentExecutionError, AgentReadinessError, checkAgentReadiness, executeAgent, executeDevelopmentAgent, executeModulePlanAgent } from './agent.js';
import { log } from './log.js';
import { finalizeDevelopmentJob, prepareDevelopmentJob } from './phase3.js';
import { persistDiscoveryAgentOutcome } from './discovery-agent-jobs.js';
import { agentExecutionService } from './agent-execution-service.js';
import { executeTechnologyInventory } from './inventory.js';
import { prepareTechnologySelectionContext } from './selection-context.js';
import { controlledPlanFixture, persistPlan, buildPlanContext, MODULE_PLAN_VALIDATOR_VERSION, MODULE_PLAN_SANITIZER_VERSION, canonicalHash, sanitizePlan, validatePlan } from './module-planning.js';
import { recordPlanRunBoundaries, createPlanTelemetrySink, terminatePlanTelemetry, completePlanTelemetry } from './plan-telemetry.js';
import { createDevelopmentTelemetrySink, persistDevelopmentFailureEvidence } from './development-telemetry.js';
import { detectDevelopmentRuntimeInconsistencies, reconcileDevelopmentRuntime } from './development-runtime.js';
import { startRuntimeProcess } from './runtime-process.js';
import { reconcileMacroLifecycle } from './macro-lifecycle.js';
import { executeIndependentReview } from './assurance.js';
import { configuredWorkerService } from './auth.js';
import { recoverDevelopmentFailure, reconcileCauseAwareRecovery } from './recovery.js';

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
    SET status='LEASED',attempts=attempts+1,lease_expires_at=clock_timestamp()+($1||' seconds')::interval,heartbeat_at=clock_timestamp(),started_at=coalesce(started_at,clock_timestamp()),last_signal_at=clock_timestamp(),metadata=CASE WHEN kind='DEVELOP_WORK_ITEM' THEN jsonb_set(coalesce(metadata,'{}'::jsonb),'{build_id}',to_jsonb(coalesce($3::text,'unknown')),true) ELSE coalesce(metadata,'{}'::jsonb) END
    WHERE id IN (SELECT id FROM candidate)
    RETURNING *`, [String(leaseSeconds()), projectId ?? null, config().buildId]);
  if (!leased.rowCount) return null;
  const job = leased.rows[0];
  await client.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`, [job.operation_id]);
  return job;
});

const completeJob = async (job: any, result?: any, actorId='system:worker') => withTransaction(async (client) => {
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
    await persistDiscoveryAgentOutcome(client, job, result, undefined, actorId);
  }
  if (job.kind === 'PLAN_MODULE_WORK_ITEMS') await completePlanTelemetry(client, job);
  await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp() WHERE id=$1`, [job.id]);
  const pending = await client.query(`SELECT 1 FROM jobs WHERE operation_id=$1 AND status IN('PENDING','RETRYABLE','LEASED')`, [job.operation_id]);
  if (!pending.rowCount) await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id]);
});

const failLegacyJob = async (job: any, error: unknown) => withTransaction(async (client) => {
  const code = error instanceof AgentConfigurationError || error instanceof AgentExecutionError || error instanceof AgentReadinessError || error instanceof ArtifactStorageError || error instanceof ApiError ? error.code : 'AGENT_EXECUTION_FAILED';
  const current = (await client.query(`SELECT attempts FROM jobs WHERE id=$1 AND status='LEASED' FOR UPDATE`, [job.id])).rows[0];
  if (!current) return;
  const permanent = Number(current.attempts) > config().agentMaxRetries;
  const delay = delays[Math.min(Number(current.attempts) - 1, 2)];
  await client.query(`UPDATE jobs SET status=$2,last_error=$3,available_at=clock_timestamp()+($4||' seconds')::interval,completed_at=CASE WHEN $2='FAILED' THEN clock_timestamp() END WHERE id=$1`, [job.id, permanent ? 'FAILED' : 'RETRYABLE', code, String(delay)]);
  if (job.kind === 'REVIEW') {
    // REVIEW has a durable execution of its own.  Return that dispatch to a
    // recoverable state on retry; a terminal reviewer failure is visible and
    // never turns the producer output into an implicit acceptance.
    await client.query(`UPDATE agent_execution SET state=$2,completed_at=CASE WHEN $2='FAILED' THEN clock_timestamp() ELSE NULL END,next_action=$3
      WHERE job_id=$1 AND job_kind='REVIEW' AND state NOT IN ('SUCCEEDED','CANCELLED')`, [job.id, permanent ? 'FAILED' : 'SELECTED', permanent ? 'Reviewer indisponível; intervenção necessária.' : 'Reviewer será reexecutado pelo worker.']);
    if (permanent) await client.query(`UPDATE work_acceptances SET state='WAITING_FOR_INDEPENDENT_REVIEWER',updated_at=clock_timestamp()
      WHERE id=(SELECT acceptance_id FROM assurance_reviews WHERE dispatch_execution_id=(SELECT id FROM agent_execution WHERE job_id=$1 AND job_kind='REVIEW')) AND state NOT IN ('ACCEPTED','CANCELLED')`, [job.id]);
  }
  if (job.kind === 'DEVELOP_WORK_ITEM') {
    // A failed executor never leaves a work item claiming active development
    // without a leased attempt.  The same reserved worktree is reconciled on
    // retry; terminal failure releases it for governed rework.
    await client.query(`UPDATE deliveries SET state=$2 WHERE id=$1`, [job.delivery_id, permanent ? 'FAILED' : 'RESERVED']);
    await client.query(`UPDATE worktrees SET state=$2 WHERE id=(SELECT worktree_id FROM deliveries WHERE id=$1)`, [job.delivery_id, permanent ? 'RELEASED' : 'PREPARED']);
    await client.query(`UPDATE work_items SET state=CASE WHEN workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 THEN CASE WHEN $2 THEN 'RECOVERY_REQUIRED' ELSE 'DISPATCHED' END ELSE CASE WHEN $2 THEN 'REWORK_ELIGIBLE' ELSE 'WAITING_FOR_WORK_ITEM_AUTHORIZATION' END END,version=version+1 WHERE id=(SELECT work_item_id FROM deliveries WHERE id=$1)`, [job.delivery_id, permanent]);
    if (permanent) await persistDevelopmentFailureEvidence(client, job, code);
  }
  if (permanent) {
    await client.query(`UPDATE operations SET status='FAILED',failure_code=$2,completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id, code]);
    if (job.kind === 'PLAN_MODULE_WORK_ITEMS') {
      // F5-23 pendency 20/22: durable termination evidence with the cause of
      // interruption and the accumulated duration, associated with job/operation.
      await terminatePlanTelemetry(client, job, code);
      // Pendência 17: agent failures OUTSIDE persistPlan (timeout, unavailability,
      // unconfigured agent, invalid workdir/binary) persist the SAME sanitized durable
      // JSON + Markdown evidence used for contract/validation failures. Validation/
      // sanitization/contract failures already persist their own evidence inside
      // persistPlan; avoid duplicating that report here (dedup below).
      const err = error as { code?: unknown; errors?: unknown; detail?: unknown };
      const perRule = Array.isArray(err.errors)
        ? err.errors.map((x: unknown) => (typeof x === 'string' ? x : String(x)))
        : (typeof err.detail === 'string' && err.detail.trim()
          ? [err.detail]
          : (err instanceof ApiError && typeof err.code === 'string'
            ? String(err.code).split(',').filter(Boolean)
            : []));
      const errors = Array.isArray(perRule) ? perRule : [];
      const report = {
        schema_version: 1,
        validator_version: MODULE_PLAN_VALIDATOR_VERSION,
        sanitizer_version: MODULE_PLAN_SANITIZER_VERSION,
        job_id: job.id,
        operation_id: job.operation_id,
        module_id: job.module_id,
        project_id: job.project_id,
        code,
        errors,
        next_action: 'RETRY_MODULE_PLAN',
        report_hash: canonicalHash({ code, errors: errors.slice().sort() })
      };
      const already = await client.query(`SELECT 1 FROM artifacts WHERE project_id=$1 AND execution_id=$2 AND artifact_type='module-plan-rejection-report'`, [job.project_id, job.operation_id]);
      if (!already.rowCount) {
        const json = JSON.stringify(report);
        const evidence = await putArtifact(client, job.project_id, 'module-plan-rejection-report', json, job.operation_id);
        await putArtifact(client, job.project_id, 'module-plan-rejection-report-markdown', `# module-plan-rejection-report\n\n\`\`\`json\n${JSON.stringify(report, null, 2)}\n\`\`\`\n`, job.operation_id);
        await event(client, job.project_id, 'MODULE_PLAN_FAILED', job.operation_id, job.id, job.revision_id, { module_id: job.module_id, code, errors, next_action: 'RETRY_MODULE_PLAN', evidence_hash: evidence.hash });
      }
  } else if (job.kind !== 'REVIEW' && job.kind !== 'DEVELOP_WORK_ITEM' && job.kind !== 'VALIDATE_INTAKE' && job.kind !== 'RECONCILE_AGENT_EXECUTION' && job.kind !== 'START_TECHNOLOGY_INVENTORY' && job.kind !== 'PREPARE_TECHNOLOGY_SELECTION_CONTEXT') {
      const target = await transitionTarget(client, job.project_id, 'AGENT_EXECUTION_FAILED');
      await client.query(`UPDATE projects SET state=$2,failure_stage=$3,failure_code=$4,updated_at=clock_timestamp() WHERE id=$1`, [job.project_id, target, job.kind, code]);
    }
    await event(client, job.project_id, 'AGENT_EXECUTION_FAILED', job.operation_id, job.id, job.revision_id, { code, stage: job.kind, next_action: 'Corrija o problema e tente novamente' });
    log('worker', 'error', 'job_failed', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(current.attempts), code });
  } else {
    log('worker', 'warn', 'job_retry_scheduled', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(current.attempts), code, retry_in_seconds: delay });
  }
});

const failJob=async(job:any,error:unknown,step:string)=>job.kind==='DEVELOP_WORK_ITEM'
  ? recoverDevelopmentFailure(job,error,step)
  : failLegacyJob(job,error);

const heartbeat = (job: any) => setInterval(() => {
  void pool.query(`UPDATE jobs SET heartbeat_at=clock_timestamp(),last_signal_at=clock_timestamp(),lease_expires_at=clock_timestamp()+($2||' seconds')::interval WHERE id=$1 AND status='LEASED'`, [job.id, String(leaseSeconds())]);
  // F5-23 pendency 20/22: a periodic heartbeat records that the process is
  // alive (last_signal_at) but NEVER counts as functional progress. Emitted as
  // a timeline event via the durable telemetry sink.
  if (job.kind === 'PLAN_MODULE_WORK_ITEMS') void createPlanTelemetrySink(job).recordHeartbeat();
  if (job.kind === 'DEVELOP_WORK_ITEM') void createDevelopmentTelemetrySink(job).heartbeat();
}, (job.kind === 'DEVELOP_WORK_ITEM' ? config().developmentHeartbeatSeconds : config().planHeartbeatSeconds) * 1000);

export const runOnce = async (projectId?: string, actorId='system:worker'): Promise<boolean> => {
  await detectDevelopmentRuntimeInconsistencies();
  await reconcileDevelopmentRuntime();
  await reconcileCauseAwareRecovery();
  const lock = await pool.connect();
  try {
    const lockKey=projectId??randomUUID();
    if (!(await lock.query('SELECT pg_try_advisory_lock(hashtext($1)) locked',[`worker:${lockKey}`])).rows[0].locked) return false;
    if (agentExecutionService.isEnabled()) await agentExecutionService.recoverDispatchedAttempts();
    const job = await leaseJob(projectId);
    if (!job) return false;
    log('worker', 'info', 'job_started', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(job.attempts) });
    const timer = heartbeat(job);
    let step = 'prepare_job';
    try {
      if (job.kind === 'REVIEW') {
        step = 'independent_review';
        await executeIndependentReview(job);
        step = 'persist_result';
        await completeJob(job,undefined,actorId);
      } else if (job.kind === 'DEVELOP_WORK_ITEM') {
        step = 'prepare_isolated_worktree';
        const delivery=await prepareDevelopmentJob(job);
        // Real execution-start evidence: the orchestration layer marks the
        // attempt RUNNING and emits a durable DEVELOPMENT_STARTED event only
        // when it is about to genuinely invoke the agent.  A reserved or
        // dispatched environment is NOT a running execution.
        if (delivery) {
          step = 'mark_agent_started';
          await withTransaction(async (client) => {
            const owned = await client.query(`SELECT 1 FROM jobs WHERE id=$1 AND status='LEASED' AND lease_expires_at>=clock_timestamp() FOR UPDATE`, [job.id]);
            if (!owned.rowCount) throw new Error('JOB_LEASE_LOST');
            await client.query(`UPDATE deliveries SET state='RUNNING' WHERE id=$1`, [delivery.id]);
            await event(client, job.project_id, 'DEVELOPMENT_STARTED', job.operation_id, job.id, null, { work_item_id: delivery.work_item_id, delivery_id: delivery.id, job_id: job.id, branch: delivery.branch, base_sha: delivery.base_sha });
          });
          step = 'dispatch_development_agent';
          await executeDevelopmentAgent({project_id:job.project_id,work_item_id:delivery.work_item_id,objective:delivery.payload?.objective,inputs:delivery.payload?.inputs,output:delivery.payload?.output,acceptance_criteria:delivery.payload?.acceptance_criteria,allowlist:delivery.payload?.allowlist,denylist:delivery.payload?.denylist,qa_matrix:delivery.qa_matrix,branch:delivery.branch,base_sha:delivery.base_sha},delivery.path,job);
        }
        await finalizeDevelopmentJob(job);
        await pool.query(`UPDATE jobs SET last_operational_event_at=clock_timestamp(),operational_event_count=operational_event_count+1,last_signal_at=clock_timestamp() WHERE id=$1 AND status='LEASED'`, [job.id]);
        step = 'persist_result';
        await completeJob(job,undefined,actorId);
      } else if (job.kind === 'PLAN_MODULE_WORK_ITEMS') {
        step = 'module_plan';
        // F5-23 pendency 20: durable start evidence for the planning job/operation.
        await recordPlanRunBoundaries(job, true);
        const module = (await pool.query(`SELECT r.payload,r.criteria,m.technology_baseline_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [job.module_id])).rows[0];
        // A retry must replay the FAILED round's persisted snapshot exactly; it is never rebuilt from current state.
        let snapshot=(await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`,[job.operation_id])).rows[0];
        if(!snapshot){
          // The controlled adapter is an explicit non-production test adapter; it still passes
          // through the identical closed contract and semantic validator in persistPlan.
          const architectureRow=(await pool.query(`SELECT a.storage_uri FROM module_gates g JOIN artifacts a ON a.sha256=g.evidence->>'architecture_hash' WHERE g.module_id=$1 AND g.kind='ARCHITECTURE_DECISION' AND g.status='APPROVED' ORDER BY g.decided_at DESC LIMIT 1`,[job.module_id])).rows[0];
          const architecture=architectureRow?.storage_uri?JSON.parse(await readFile(new URL(architectureRow.storage_uri),'utf8')):{};
          const baseline=module?.technology_baseline_revision_id?(await pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`,[module.technology_baseline_revision_id])).rows[0]:{};
          const previous=(await pool.query(`SELECT * FROM module_plan_revisions WHERE module_id=$1 ORDER BY revision_number DESC LIMIT 1`,[job.module_id])).rows[0]??null;
          const context=buildPlanContext({ payload: module?.payload, criteria: module?.criteria }, architecture, baseline, previous);
          await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) SELECT $1,$2,$3,m.current_revision_id,m.technology_baseline_revision_id,$4,$5,$6 FROM modules m WHERE m.id=$3 ON CONFLICT (operation_id) DO NOTHING`,[job.operation_id,job.project_id,job.module_id,context.context_schema_version,context,context.context_hash]);
          snapshot=(await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`,[job.operation_id])).rows[0];
        }
        const context=snapshot.context_payload;
        let plan=config().agentAdapter === 'controlled' && config().runtimeEnvironment !== 'production' ? controlledPlanFixture(context) : await executeModulePlanAgent(context, job);
        if(config().agentAdapter !== 'controlled')try{validatePlan(sanitizePlan(plan),context);}catch(error){if(!(error instanceof ApiError))throw error;plan=await executeModulePlanAgent(context,job,{errors:String(error.code).split(',').filter(Boolean),candidate:plan});validatePlan(sanitizePlan(plan),context);}
        await persistPlan(job,plan);
        step = 'persist_result';
        await completeJob(job,undefined,actorId);
      } else if (job.kind === 'START_TECHNOLOGY_INVENTORY') {
        step = 'technology_inventory';
        await withTransaction((client) => executeTechnologyInventory(client, job));
        step = 'persist_result';
        await completeJob(job,undefined,actorId);
      } else if (job.kind === 'PREPARE_TECHNOLOGY_SELECTION_CONTEXT') {
        step = 'technology_selection_context';
        await withTransaction((client) => prepareTechnologySelectionContext(client, job));
        step = 'persist_result';
        await completeJob(job,undefined,actorId);
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
        await completeJob(job,result,actorId);
      }
      log('worker', 'info', 'job_completed', { job_id: job.id, operation_id: job.operation_id, project_id: job.project_id, kind: job.kind, attempt: Number(job.attempts) });
    } catch (error) {
      const cause = error as { code?: unknown; constraint?: unknown; exitCode?: unknown; signal?: unknown };
      log('worker', 'error', 'job_execution_failed', {
        job_id: job.id,
        operation_id: job.operation_id,
        project_id: job.project_id,
        kind: job.kind,
        attempt: Number(job.attempts),
        step,
        error_kind: error instanceof Error ? error.constructor.name : 'UnknownError',
        cause_code: typeof cause.code === 'string' ? cause.code : undefined,
        exit_code: typeof cause.exitCode === 'number' ? cause.exitCode : undefined,
        signal: typeof cause.signal === 'string' ? cause.signal : undefined,
        cause_constraint: typeof cause.constraint === 'string' ? cause.constraint : undefined
      });
      await failJob(job, error,step);
    } finally {
      clearInterval(timer);
    }
    return true;
  } finally {
    try { await lock.query('SELECT pg_advisory_unlock_all()'); } finally { lock.release(); }
  }
};

if (process.argv[1]?.endsWith('worker.ts') || process.argv[1]?.endsWith('worker.js')) {
  // A credencial é criada/rotacionada pelo administrador e nunca é uma sessão
  // humana ou o NAAMIVE_OPERATOR_ID legado. Sem ela o worker falha fechado.
  const workerPrincipal=await configuredWorkerService();
  const stopRuntime=await startRuntimeProcess('WORKER');
  log('worker', 'info', 'worker_started', { poll_interval_seconds: 1 });
  let stopping=false; const stop=async()=>{if(stopping)return;stopping=true;log('worker','info','worker_stopped');await stopRuntime();await pool.end();process.exit(0);};
  process.once('SIGTERM',()=>void stop()); process.once('SIGINT',()=>void stop());
  while (true) {
    try { await reconcileMacroLifecycle(10,`macro-worker:${workerPrincipal.id}`); await runOnce(undefined,workerPrincipal.id); }
    catch (error) { log('worker', 'error', 'worker_cycle_failed', { error_kind: error instanceof Error ? error.constructor.name : 'UnknownError' }); }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
