import { randomUUID } from 'node:crypto';
import { log } from './log.js';
import { config } from './config.js';
import { pool, withTransaction } from './db.js';
import { CodexOperationalEventType, CodexOperationalEvent } from './codex-events.js';

/**
 * F5-23 pendencies 19-22: durable, sanitized activity/health evidence for
 * PLAN_MODULE_WORK_ITEMS.
 *
 * Records are sanitized, associated with the job/operation, and emitted as
 * timeline events. A heartbeat NEVER counts as functional progress — it only
 * proves the process is alive. Only `last_operational_event_at` /
 * `operational_event_count` reflect real operational events (the closed
 * contract from `codex exec --json`).
 *
 * Every payload persisted here is drawn from the closed event contract only
 * (event_type, sequence, sanitized usage counters). Prompts, reasoning, tool
 * arguments, file contents, secrets and raw output never cross this module.
 */

export const PLAN_TELEMETRY_EVENT_STARTED = 'MODULE_PLAN_TELEMETRY_STARTED';
export const PLAN_TELEMETRY_EVENT_OPERATIONAL = 'MODULE_PLAN_TELEMETRY_EVENT';
export const PLAN_TELEMETRY_EVENT_HEARTBEAT = 'MODULE_PLAN_TELEMETRY_HEARTBEAT';
export const PLAN_TELEMETRY_EVENT_DISCARDED = 'MODULE_PLAN_TELEMETRY_DISCARDED';
export const PLAN_TELEMETRY_EVENT_TERMINATED = 'MODULE_PLAN_TELEMETRY_TERMINATED';
export const PLAN_TELEMETRY_EVENT_COMPLETED = 'MODULE_PLAN_TELEMETRY_COMPLETED';

export type PlanExecutorStatus = 'na fila' | 'em execução' | 'ativo sem evento novo' | 'degradado';
export type PlanHealth = 'QUEUED' | 'ALIVE' | 'ALIVE_NO_PROGRESS' | 'DEGRADED' | 'TERMINATED';

export const planTelemetryEnabled = (): boolean => config().planTelemetryEnabled;

/** Pure health derivation for the projection/UI. Heartbeat proves liveness, never progress. */
export const derivePlanStatus = (opts: {
  jobStatus?: string | null;
  lastSignalAt?: string | null;
  startedAt?: string | null;
  terminated?: boolean;
  noSignalSeconds: number;
  timeoutSeconds: number;
}): { executorStatus: PlanExecutorStatus; health: PlanHealth } => {
  const { jobStatus, lastSignalAt, startedAt, terminated, noSignalSeconds, timeoutSeconds } = opts;
  if (terminated) return { executorStatus: 'degradado', health: 'TERMINATED' };
  if (!jobStatus || jobStatus !== 'LEASED') return { executorStatus: 'na fila', health: 'QUEUED' };
  if (!startedAt || !lastSignalAt) return { executorStatus: 'degradado', health: 'DEGRADED' };
  const now = Date.now();
  const signalMs = Date.parse(lastSignalAt);
  const startMs = Date.parse(startedAt);
  if (!Number.isFinite(signalMs) || !Number.isFinite(startMs)) return { executorStatus: 'degradado', health: 'DEGRADED' };
  const signalAge = Math.max(0, now - signalMs);
  const elapsed = Math.max(0, now - startMs);
  // Timeout is enforced on the elapsed duration (job has run too long).
  if (elapsed >= timeoutSeconds * 1000 || signalAge >= timeoutSeconds * 1000) {
    return { executorStatus: 'degradado', health: 'DEGRADED' };
  }
  if (signalAge <= noSignalSeconds * 1000) return { executorStatus: 'em execução', health: 'ALIVE' };
  // Heartbeat still proves the process is alive, but no NEW operational event
  // arrived within the no-signal window → active without functional progress.
  return { executorStatus: 'ativo sem evento novo', health: 'ALIVE_NO_PROGRESS' };
};

const emitTimeline = async (exec: any, projectId: string, type: string, operationId: string | null, jobId: string | null, payload: object) => {
  await exec.query(
    `INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
     SELECT $1,$2,$3,$4,$5,$6,$7,workflow_code,workflow_version FROM projects WHERE id=$1`,
    [projectId, type, randomUUID(), operationId, jobId, payload, config().operatorId]
  );
};

const sanitizeReason = (reason: string): string => String(reason ?? 'UNKNOWN').replace(/[\\x00-\\x1f\\x7f]/g, ' ').trim().slice(0, 200) || 'UNKNOWN';

/** Record the planning start (started_at + durable telemetry row). Idempotent. */
export const recordPlanStart = async (exec: any, job: any): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  await exec.query(
    `INSERT INTO module_plan_telemetry(operation_id,job_id,project_id,module_id,started_at)
     VALUES($1,$2,$3,$4,clock_timestamp())
     ON CONFLICT (operation_id) DO NOTHING`,
    [job.operation_id, job.id, job.project_id, job.module_id ?? null]
  );
  await exec.query(`UPDATE jobs SET started_at=COALESCE(started_at,clock_timestamp()) WHERE id=$1`, [job.id]);
};

/** Persist one closed-contract operational event and bump the real-progress signal. */
export const recordPlanOperationalEvent = async (exec: any, job: any, sequence: number, eventType: CodexOperationalEventType, payload: Record<string, unknown>): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  await exec.query(
    `INSERT INTO module_plan_operational_events(project_id,operation_id,job_id,module_id,sequence,event_type,payload)
     VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [job.project_id, job.operation_id, job.id, job.module_id ?? null, sequence, eventType, JSON.stringify(payload)]
  );
  await exec.query(
    `UPDATE module_plan_telemetry SET last_operational_event_at=clock_timestamp(),last_signal_at=clock_timestamp(),operational_event_count=operational_event_count+1 WHERE operation_id=$1`,
    [job.operation_id]
  );
  await exec.query(
    `UPDATE jobs SET last_operational_event_at=clock_timestamp(),last_signal_at=clock_timestamp(),operational_event_count=operational_event_count+1 WHERE id=$1`,
    [job.id]
  );
  await emitTimeline(exec, job.project_id, PLAN_TELEMETRY_EVENT_OPERATIONAL, job.operation_id, job.id, {
    module_id: job.module_id ?? null, sequence, event_type: eventType, payload
  });
};

/** Fail-closed: record that an unknown/non-contract line was discarded (never the raw line). */
export const recordPlanDiscarded = async (exec: any, job: any, reason: string): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  const clean = sanitizeReason(reason);
  await exec.query(`UPDATE module_plan_telemetry SET discarded_event_count=discarded_event_count+1 WHERE operation_id=$1`, [job.operation_id]);
  await exec.query(`UPDATE jobs SET discarded_event_count=discarded_event_count+1 WHERE id=$1`, [job.id]);
  await emitTimeline(exec, job.project_id, PLAN_TELEMETRY_EVENT_DISCARDED, job.operation_id, job.id, {
    module_id: job.module_id ?? null, reason: clean
  });
};

/** Periodic heartbeat: proves liveness only (last_signal_at). Never progress. */
export const recordPlanHeartbeat = async (exec: any, job: any): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  await exec.query(
    `UPDATE module_plan_telemetry SET last_signal_at=clock_timestamp(),heartbeat_count=heartbeat_count+1 WHERE operation_id=$1`,
    [job.operation_id]
  );
  await exec.query(`UPDATE jobs SET last_signal_at=clock_timestamp() WHERE id=$1`, [job.id]);
  await emitTimeline(exec, job.project_id, PLAN_TELEMETRY_EVENT_HEARTBEAT, job.operation_id, job.id, {
    module_id: job.module_id ?? null
  });
};

/** Termination: record the cause of interruption and the accumulated duration. */
export const terminatePlanTelemetry = async (exec: any, job: any, reason: string): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  const clean = sanitizeReason(reason);
  await exec.query(
    `UPDATE module_plan_telemetry SET terminated_at=clock_timestamp(),interrupted_reason=$2,
       duration_ms=greatest(0,floor(extract(epoch FROM (clock_timestamp()-started_at))*1000)::int)
     WHERE operation_id=$1`,
    [job.operation_id, clean]
  );
  await exec.query(`UPDATE jobs SET interrupted_reason=$2 WHERE id=$1`, [job.id, clean]);
  await emitTimeline(exec, job.project_id, PLAN_TELEMETRY_EVENT_TERMINATED, job.operation_id, job.id, {
    module_id: job.module_id ?? null, reason: clean
  });
};

/** Successful completion is distinct from interruption in both evidence and timeline. */
export const completePlanTelemetry = async (exec: any, job: any): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  await exec.query(
    `UPDATE module_plan_telemetry SET terminated_at=clock_timestamp(),interrupted_reason=NULL,
       duration_ms=greatest(0,floor(extract(epoch FROM (clock_timestamp()-started_at))*1000)::int)
     WHERE operation_id=$1`,
    [job.operation_id]
  );
  await exec.query(`UPDATE jobs SET interrupted_reason=NULL WHERE id=$1`, [job.id]);
  await emitTimeline(exec, job.project_id, PLAN_TELEMETRY_EVENT_COMPLETED, job.operation_id, job.id, {
    module_id: job.module_id ?? null
  });
};

/** Guarded wrapper for stream-side effects so a persistence failure never kills the agent process. */
export const safeTelemetry = async (work: () => Promise<void>, context: string): Promise<void> => {
  try {
    await work();
  } catch (error) {
    log('worker', 'warn', 'plan_telemetry_write_failed', { context, error_kind: error instanceof Error ? error.constructor.name : 'UnknownError' });
  }
};

export type PlanTelemetrySink = {
  recordStart: () => Promise<void>;
  recordOperational: (sequence: number, event: CodexOperationalEvent) => Promise<void>;
  recordDiscarded: (reason: string) => Promise<void>;
  recordHeartbeat: () => Promise<void>;
  terminate: (reason: string) => Promise<void>;
};

/**
 * Create a telemetry sink bound to a planning job/operation. All effects run in
 * their own short transaction and are guarded so a persistence failure never
 * kills the agent process or corrupts the plan result. Only closed-contract
 * operational payloads are written.
 */
export const createPlanTelemetrySink = (job: { id: string; operation_id: string; project_id: string; module_id?: string | null }): PlanTelemetrySink => {
  const run = async (work: (exec: any) => Promise<void>) => safeTelemetry(async () => withTransaction(work), `job:${job.id}`);
  return {
    recordStart: () => run((exec) => recordPlanStart(exec, job)),
    recordOperational: (sequence: number, event: CodexOperationalEvent) => run((exec) => {
      const payload: Record<string, unknown> = {};
      if (event.type === 'thread.started' && event.thread_id) payload.thread_id = event.thread_id;
      if (event.type === 'turn.completed' && event.usage) {
        for (const [k, v] of Object.entries(event.usage)) if (v !== undefined) payload[k] = v;
      }
      return recordPlanOperationalEvent(exec, job, sequence, event.type, payload);
    }),
    recordDiscarded: (reason: string) => run((exec) => recordPlanDiscarded(exec, job, reason)),
    recordHeartbeat: () => run((exec) => recordPlanHeartbeat(exec, job)),
    terminate: (reason: string) => run((exec) => terminatePlanTelemetry(exec, job, reason))
  };
};

/** Convenience: persist the planning start + termination inside one transaction (used by the worker). */
export const recordPlanRunBoundaries = async (job: any, start: boolean, reason?: string): Promise<void> => {
  if (!planTelemetryEnabled() || !job?.operation_id) return;
  await safeTelemetry(async () => withTransaction(async (exec) => {
    if (start) await recordPlanStart(exec, job);
    else if (reason) await terminatePlanTelemetry(exec, job, reason);
  }), `job:${job.id}`);
};
