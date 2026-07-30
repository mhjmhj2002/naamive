import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { putArtifact } from './artifacts.js';
import { validateIntake } from './service.js';
import { config } from './config.js';
import { transitionTarget } from './workflow.js';

const delays = [5, 15, 30];
export const runOnce = async (): Promise<boolean> => {
  const lock = await pool.connect();
  try {
    if (!(await lock.query('SELECT pg_try_advisory_lock(941001) AS locked')).rows[0].locked) return false;
    return await withTransaction(async (client) => {
      const claimed = await client.query(`WITH candidate AS (SELECT id FROM jobs WHERE (status IN ('PENDING','RETRYABLE') AND available_at <= now()) OR (status='LEASED' AND lease_expires_at < now()) ORDER BY available_at FOR UPDATE SKIP LOCKED LIMIT 1)
        UPDATE jobs SET status='LEASED', attempts=attempts+1, lease_expires_at=now()+interval '2 minutes' WHERE id IN (SELECT id FROM candidate) RETURNING *`);
      if (!claimed.rowCount) return false; const job = claimed.rows[0];
      await client.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`, [job.operation_id]);
      try {
        const revision = (await client.query('SELECT payload FROM intake_revisions WHERE id=$1', [job.revision_id])).rows[0];
        const errors = validateIntake(revision.payload); const correlation = randomUUID();
        const report = JSON.stringify({ schema_version: 1, result: errors.length ? 'INVALID' : 'VALID', errors });
        await putArtifact(client, job.project_id, 'validation-report', report, job.id);
        if (errors.length) {
          await client.query(`UPDATE jobs SET status='COMPLETED', completed_at=now() WHERE id=$1`, [job.id]); await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=now() WHERE id=$1`, [job.operation_id]);
          await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id) VALUES($1,'INTAKE_REQUIRES_ADJUSTMENT',$2,$3,$4,$5,$6,$7)`, [job.project_id, correlation, job.operation_id, job.id, job.revision_id, { errors }, config().operatorId]); return true;
        }
        const gateId = randomUUID(); await putArtifact(client, job.project_id, 'gate-opened', JSON.stringify({ gate_id: gateId, revision_id: job.revision_id }), job.id, gateId);
        const target = await transitionTarget(client, job.project_id, 'INTAKE_VALIDATED'); await client.query(`UPDATE projects SET state=$2, updated_at=now() WHERE id=$1`, [job.project_id, target]); await client.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'REGISTER_PROJECT',$3)`, [gateId, job.project_id, job.revision_id]);
        await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=now() WHERE id=$1`, [job.id]); await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=now() WHERE id=$1`, [job.operation_id]);
        await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id) VALUES($1,'INTAKE_VALIDATED',$2,$3,$4,$5,$6,$8),($1,'GATE_OPENED',$2,$3,$4,$5,$7,$8)`, [job.project_id, correlation, job.operation_id, job.id, job.revision_id, {}, { gate_id: gateId, kind: 'REGISTER_PROJECT', version: 1 }, config().operatorId]); return true;
      } catch (error) {
        const attempt = Number(job.attempts); const permanent = attempt >= 4;
        await client.query(`UPDATE jobs SET status=$2, available_at=now() + ($3 || ' seconds')::interval, last_error=$4, completed_at=CASE WHEN $2='FAILED' THEN now() END WHERE id=$1`, [job.id, permanent ? 'FAILED' : 'RETRYABLE', String(delays[Math.min(attempt - 1, 2)]), 'VALIDATION_EXECUTION_FAILED']);
        await client.query(`UPDATE operations SET status=$2, failure_code=$3, completed_at=CASE WHEN $2='FAILED' THEN now() END WHERE id=$1`, [job.operation_id, permanent ? 'FAILED' : 'QUEUED', permanent ? 'VALIDATION_EXECUTION_FAILED' : null]);
        if (permanent) await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id) VALUES($1,'INTAKE_EXECUTION_FAILED',$2,$3,$4,$5,$6,$7)`, [job.project_id, randomUUID(), job.operation_id, job.id, job.revision_id, { code: 'VALIDATION_EXECUTION_FAILED' }, config().operatorId]); return true;
      }
    });
  } finally { try { await lock.query('SELECT pg_advisory_unlock(941001)'); } finally { lock.release(); } }
};
if (process.argv[1]?.endsWith('worker.ts') || process.argv[1]?.endsWith('worker.js')) { while (true) { await runOnce(); await new Promise((done) => setTimeout(done, 1000)); } }
