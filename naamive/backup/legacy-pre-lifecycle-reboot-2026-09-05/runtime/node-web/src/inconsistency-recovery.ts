import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool, withTransaction } from './db.js';
import { ApiError } from './service.js';
import { config } from './config.js';

const strategy = {
  workflowCode: 'PROJECT_DISCOVERY',
  workflowVersion: 3,
  projectState: 'TECHNOLOGY_SELECTION_PREPARING',
  jobKind: 'PREPARE_TECHNOLOGY_SELECTION_CONTEXT',
} as const;
const maxGovernedRecoveries = 3;

export type InconsistencyCaseProjection = {
  id: string;
  project_id: string;
  resource_kind: 'PROJECT';
  resource_id: string;
  source_operation_id: string;
  source_job_id: string;
  source_job_kind: string;
  cause_code: string;
  classification: string;
  severity: string;
  status: string;
  generation: number;
  recovery_attempts: number;
  recoverability: string;
  recommended_action: string;
  evidence_refs: unknown;
  resolution_operation_id: string | null;
  resolution_job_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

const caseProjection = (row: any): InconsistencyCaseProjection => ({
  id: String(row.id), project_id: String(row.project_id), resource_kind: 'PROJECT', resource_id: String(row.resource_id),
  source_operation_id: String(row.source_operation_id), source_job_id: String(row.source_job_id), source_job_kind: String(row.source_job_kind),
  cause_code: String(row.cause_code), classification: String(row.classification), severity: String(row.severity), status: String(row.status),
  generation: Number(row.generation), recovery_attempts: Number(row.recovery_attempts), recoverability: String(row.recoverability), recommended_action: String(row.recommended_action),
  evidence_refs: row.evidence_refs ?? [], resolution_operation_id: row.resolution_operation_id ? String(row.resolution_operation_id) : null,
  resolution_job_id: row.resolution_job_id ? String(row.resolution_job_id) : null, resolved_at: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
  created_at: new Date(row.created_at).toISOString(), updated_at: new Date(row.updated_at).toISOString(),
});

const terminalSource = async (client: PoolClient, jobId: string, lock = false) => (await client.query(`SELECT j.id AS source_job_id,j.project_id,j.operation_id AS source_operation_id,j.kind AS source_job_kind,j.status AS job_status,j.attempts,j.last_error,
    o.status AS operation_status,o.revision_id,o.workflow_code AS operation_workflow_code,o.workflow_version AS operation_workflow_version,
    p.workflow_code,p.workflow_version,p.state,p.archived_at
  FROM jobs j JOIN operations o ON o.id=j.operation_id JOIN projects p ON p.id=j.project_id
  WHERE j.id=$1 ${lock ? 'FOR UPDATE OF j,o,p' : ''}`,[jobId])).rows[0];

/** Materializes only the explicitly supported no-effect strategy.  The source
 * rows are read/locked but never mutated.  The unique source_job_id is the
 * durable historical/reconciler idempotency fence. */
export const materializeTerminalJobInconsistency = async (client: PoolClient, jobId: string) => {
  const source = await terminalSource(client, jobId, true);
  if (!source || source.job_status !== 'FAILED' || source.operation_status !== 'FAILED' || source.source_job_kind !== strategy.jobKind ||
      source.workflow_code !== strategy.workflowCode || Number(source.workflow_version) !== strategy.workflowVersion || source.state !== strategy.projectState || source.archived_at ||
      source.operation_workflow_code !== strategy.workflowCode || Number(source.operation_workflow_version) !== strategy.workflowVersion) return null;
  const existing = (await client.query(`SELECT * FROM inconsistency_cases WHERE source_job_id=$1 FOR UPDATE`, [jobId])).rows[0];
  if (existing) return caseProjection(existing);
  const id = randomUUID();
  const inserted = (await client.query(`INSERT INTO inconsistency_cases(
      id,project_id,resource_kind,resource_id,source_operation_id,source_job_id,source_job_kind,cause_code,classification,severity,status,recoverability,recommended_action,evidence_refs)
    VALUES($1,$2,'PROJECT',$2,$3,$4,$5,$6,'TERMINAL_JOB_FAILURE','HIGH','OPEN','SAFE_AFTER_READY_ABSENCE_VERIFIED','RECOVER_FAILED_OPERATION',$7::jsonb)
    RETURNING *`, [id, source.project_id, source.source_operation_id, source.source_job_id, source.source_job_kind, String(source.last_error ?? 'AGENT_EXECUTION_FAILED'), JSON.stringify([{ type: 'source_job', id: source.source_job_id }, { type: 'source_operation', id: source.source_operation_id }])])).rows[0];
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TERMINAL_JOB_INCONSISTENCY_RECORDED',$2,$3,$4,$5,$6,$7,$8)`, [source.project_id, randomUUID(), source.source_operation_id, source.source_job_id,
    { inconsistency_case_id:id, source_job_kind:source.source_job_kind, cause_code:String(source.last_error ?? 'AGENT_EXECUTION_FAILED'), recommended_action:'RECOVER_FAILED_OPERATION' }, config().operatorId, strategy.workflowCode, strategy.workflowVersion]);
  return caseProjection(inserted);
};

/** Reconciles historical terminal rows as well as a small crash window between
 * terminalization and materialization.  Recovery-generated jobs already have
 * a case reference and must never create a second case. */
export const reconcileTerminalJobInconsistencies = async () => {
  const candidates = (await pool.query(`SELECT j.id FROM jobs j
    JOIN operations o ON o.id=j.operation_id JOIN projects p ON p.id=j.project_id
    LEFT JOIN inconsistency_cases c ON c.source_job_id=j.id
    WHERE j.status='FAILED' AND o.status='FAILED' AND j.kind=$1 AND j.inconsistency_case_id IS NULL AND c.id IS NULL
      AND p.workflow_code=$2 AND p.workflow_version=$3 AND p.state=$4 AND p.archived_at IS NULL
      AND o.workflow_code=$2 AND o.workflow_version=$3
    ORDER BY j.completed_at NULLS LAST,j.id LIMIT 100`, [strategy.jobKind, strategy.workflowCode, strategy.workflowVersion, strategy.projectState])).rows;
  let materialized = 0;
  for (const candidate of candidates) {
    const recorded = await withTransaction((client) => materializeTerminalJobInconsistency(client, candidate.id));
    if (recorded) materialized += 1;
  }
  // A recovery whose worker disappeared without a conclusive context result is
  // made visibly non-retryable until the normal reconciler can observe READY
  // or a terminal outcome.  This is deliberately fail-closed.
  const waiting = await pool.query(`UPDATE inconsistency_cases c SET status='WAITING_RECONCILIATION',updated_at=clock_timestamp()
    FROM jobs j
    WHERE c.resolution_job_id=j.id AND c.status='RECOVERY_RUNNING' AND j.status='LEASED' AND j.lease_expires_at<clock_timestamp()
      AND NOT EXISTS(SELECT 1 FROM technology_selection_contexts t WHERE t.project_key=c.project_id AND t.status='READY')`);
  const ready = await pool.query(`UPDATE inconsistency_cases c SET status='RESOLVED',resolved_at=coalesce(resolved_at,clock_timestamp()),updated_at=clock_timestamp()
    WHERE c.status IN ('OPEN','RECOVERY_PENDING','RECOVERY_RUNNING','WAITING_RECONCILIATION')
      AND EXISTS(SELECT 1 FROM technology_selection_contexts t WHERE t.project_key=c.project_id AND t.status='READY')`);
  return { materialized, waiting_reconciliation: waiting.rowCount ?? 0, resolved_from_effect: ready.rowCount ?? 0 };
};

export const markInconsistencyRecoveryRunning = async (client: PoolClient, job: any) => {
  if (!job.inconsistency_case_id) return;
  await client.query(`UPDATE inconsistency_cases SET status='RECOVERY_RUNNING',updated_at=clock_timestamp()
    WHERE id=$1 AND project_id=$2 AND resolution_job_id=$3 AND status IN ('RECOVERY_PENDING','WAITING_RECONCILIATION')`, [job.inconsistency_case_id, job.project_id, job.id]);
};

export const resolveInconsistencyRecovery = async (client: PoolClient, job: any) => {
  if (!job.inconsistency_case_id) return;
  const current = (await client.query(`SELECT * FROM inconsistency_cases WHERE id=$1 AND project_id=$2 AND resolution_job_id=$3 FOR UPDATE`, [job.inconsistency_case_id, job.project_id, job.id])).rows[0];
  if (!current || ['RESOLVED','TERMINAL','SUPERSEDED'].includes(current.status)) return;
  const ready = (await client.query(`SELECT 1 FROM technology_selection_contexts WHERE project_key=$1 AND status='READY' LIMIT 1`, [job.project_id])).rowCount;
  if (!ready) throw new ApiError(409, 'INCONSISTENCY_RECOVERY_EFFECT_NOT_CONFIRMED');
  await client.query(`UPDATE inconsistency_cases SET status='RESOLVED',resolved_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1`, [current.id]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TERMINAL_JOB_INCONSISTENCY_RESOLVED',$2,$3,$4,$5,$6,$7,$8)`, [job.project_id, randomUUID(), job.operation_id, job.id, { inconsistency_case_id:current.id, source_job_id:current.source_job_id }, config().operatorId, strategy.workflowCode, strategy.workflowVersion]);
};

export const markInconsistencyRecoveryTerminalFailure = async (client: PoolClient, job: any, code: string) => {
  if (!job.inconsistency_case_id) return;
  const current = (await client.query(`SELECT * FROM inconsistency_cases WHERE id=$1 AND project_id=$2 AND resolution_job_id=$3 FOR UPDATE`, [job.inconsistency_case_id, job.project_id, job.id])).rows[0];
  if (!current || ['RESOLVED','TERMINAL','SUPERSEDED'].includes(current.status)) return;
  const attempts = Number(current.recovery_attempts) + 1;
  const status = attempts >= maxGovernedRecoveries ? 'TERMINAL' : 'OPEN';
  await client.query(`UPDATE inconsistency_cases SET status=$2,recovery_attempts=$3,generation=generation+1,updated_at=clock_timestamp(),evidence_refs=evidence_refs || $4::jsonb WHERE id=$1`,
    [current.id,status,attempts,JSON.stringify([{ type:'recovery_terminal_failure', job_id:job.id, operation_id:job.operation_id, code }])]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TERMINAL_JOB_INCONSISTENCY_RECOVERY_FAILED',$2,$3,$4,$5,$6,$7,$8)`, [job.project_id, randomUUID(), job.operation_id, job.id,
    { inconsistency_case_id:current.id, recovery_attempt:attempts, status, code }, config().operatorId, strategy.workflowCode, strategy.workflowVersion]);
};

export const requestTerminalJobRecovery = async (projectId: string, caseId: string, expectedGeneration: unknown) => withTransaction(async (client) => {
  if (!Number.isSafeInteger(expectedGeneration) || Number(expectedGeneration) < 1) throw new ApiError(422, 'INCONSISTENCY_GENERATION_REQUIRED');
  const current = (await client.query(`SELECT * FROM inconsistency_cases WHERE id=$1 AND project_id=$2 FOR UPDATE`, [caseId, projectId])).rows[0];
  if (!current) throw new ApiError(404, 'INCONSISTENCY_CASE_NOT_FOUND');
  if (Number(current.generation) !== Number(expectedGeneration)) throw new ApiError(409, 'INCONSISTENCY_GENERATION_STALE');
  if (current.status === 'RESOLVED') throw new ApiError(409, 'INCONSISTENCY_ALREADY_RESOLVED');
  if (['TERMINAL','SUPERSEDED'].includes(current.status)) throw new ApiError(409, 'INCONSISTENCY_RECOVERY_NOT_AVAILABLE');
  if (['RECOVERY_PENDING','RECOVERY_RUNNING','WAITING_RECONCILIATION'].includes(current.status)) return caseProjection(current);
  if (current.status !== 'OPEN' || current.recommended_action !== 'RECOVER_FAILED_OPERATION' || current.source_job_kind !== strategy.jobKind) throw new ApiError(409, 'INCONSISTENCY_RECOVERY_NOT_SUPPORTED');
  const source = await terminalSource(client, current.source_job_id, true);
  if (!source || source.project_id !== projectId || source.job_status !== 'FAILED' || source.operation_status !== 'FAILED' || source.source_job_kind !== strategy.jobKind ||
      source.workflow_code !== strategy.workflowCode || Number(source.workflow_version) !== strategy.workflowVersion || source.state !== strategy.projectState || source.archived_at ||
      source.operation_workflow_code !== strategy.workflowCode || Number(source.operation_workflow_version) !== strategy.workflowVersion) throw new ApiError(409, 'INCONSISTENCY_RECOVERY_SOURCE_STALE');
  const ready = await client.query(`SELECT 1 FROM technology_selection_contexts WHERE project_key=$1 AND status='READY' LIMIT 1`, [projectId]);
  if (ready.rowCount) throw new ApiError(409, 'INCONSISTENCY_RECOVERY_EFFECT_ALREADY_PRESENT');
  const active = await client.query(`SELECT 1 FROM jobs WHERE project_id=$1 AND kind=$2 AND status IN ('PENDING','RETRYABLE','LEASED') LIMIT 1 FOR UPDATE`, [projectId, strategy.jobKind]);
  if (active.rowCount) throw new ApiError(409, 'INCONSISTENCY_EQUIVALENT_OPERATION_ACTIVE');
  const operationId = randomUUID(), jobId = randomUUID(), correlation = randomUUID(), key = `inconsistency-recovery:${current.id}:${current.generation}`;
  const existing = (await client.query(`SELECT * FROM operations WHERE idempotency_key=$1 FOR UPDATE`, [key])).rows[0];
  if (existing) return caseProjection(current);
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version,inconsistency_case_id,predecessor_operation_id)
    VALUES($1,$2,$3,'QUEUED',$4,$5,$6,$7,$8,$9,$10)`, [operationId,projectId,strategy.jobKind,key,correlation,source.revision_id,strategy.workflowCode,strategy.workflowVersion,current.id,source.source_operation_id]);
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key,inconsistency_case_id,predecessor_job_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [jobId,operationId,projectId,source.revision_id,strategy.jobKind,`inconsistency-recovery-job:${current.id}:${current.generation}`,current.id,source.source_job_id]);
  const updated = (await client.query(`UPDATE inconsistency_cases SET status='RECOVERY_PENDING',resolution_operation_id=$2,resolution_job_id=$3,updated_at=clock_timestamp() WHERE id=$1 RETURNING *`, [current.id,operationId,jobId])).rows[0];
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TERMINAL_JOB_INCONSISTENCY_RECOVERY_REQUESTED',$2,$3,$4,$5,$6,$7,$8)`, [projectId,correlation,operationId,jobId,
    { inconsistency_case_id:current.id, generation:Number(current.generation), source_operation_id:source.source_operation_id, source_job_id:source.source_job_id }, config().operatorId,strategy.workflowCode,strategy.workflowVersion]);
  return caseProjection(updated);
});

export const inconsistencyCaseProjection = async (caseId: string) => {
  const row = (await pool.query(`SELECT * FROM inconsistency_cases WHERE id=$1`, [caseId])).rows[0];
  if (!row) throw new ApiError(404, 'INCONSISTENCY_CASE_NOT_FOUND');
  return caseProjection(row);
};
