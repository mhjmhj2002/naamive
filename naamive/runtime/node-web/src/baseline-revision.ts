import { randomUUID } from 'node:crypto';
import { config } from './config.js';
import { withTransaction } from './db.js';
import { ApiError } from './service.js';
import { transitionTarget } from './workflow.js';

const previousOperation = async (client: any, key: string) =>
  (await client.query('SELECT id FROM operations WHERE idempotency_key=$1', [key])).rows[0]?.id as string | undefined;

/** Starts a new, immutable baseline revision from a terminal predecessor. */
export const startTechnologyBaselineRevision = async (projectId: string, revisionId: string, key: string) => withTransaction(async client => {
  const existing = await previousOperation(client, key);
  if (existing) return { operation_id: existing, status: 'ACCEPTED' };
  const project = (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId])).rows[0];
  if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  if (project.archived_at || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3) throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const predecessor = (await client.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`, [revisionId, projectId])).rows[0];
  if (!predecessor) throw new ApiError(404, 'TECHNOLOGY_BASELINE_REVISION_NOT_FOUND');
  if (!['APPROVED', 'REJECTED'].includes(predecessor.status)) throw new ApiError(409, 'TECHNOLOGY_BASELINE_REVISION_NOT_TERMINAL');
  if (predecessor.status === 'APPROVED' && project.state !== 'READY_FOR_MODULE_MATERIALIZATION') throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  if (predecessor.status === 'REJECTED' && project.state !== 'TECHNOLOGY_BASELINE_IN_REVIEW') throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const active = await client.query(`SELECT 1 FROM technology_baseline_revisions WHERE baseline_id=$1 AND status IN ('DRAFT','PENDING_APPROVAL') FOR UPDATE`, [predecessor.baseline_id]);
  if (active.rowCount) throw new ApiError(409, 'TECHNOLOGY_BASELINE_REVISION_ACTIVE_EXISTS');
  const correlationId = randomUUID(), operationId = randomUUID(), jobId = randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,workflow_code,workflow_version)
    VALUES($1,$2,'START_TECHNOLOGY_BASELINE_REVISION','QUEUED',$3,$4,$5,$6)`, [operationId, projectId, key, correlationId, project.workflow_code, project.workflow_version]);
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,kind,idempotency_key,technology_baseline_revision_id)
    VALUES($1,$2,$3,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT',$4,$5)`, [jobId, operationId, projectId, `baseline-revision:${operationId}`, predecessor.id]);
  const target = await transitionTarget(client, projectId, 'START_TECHNOLOGY_BASELINE_REVISION');
  await client.query(`UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1`, [projectId, target]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TECHNOLOGY_BASELINE_REVISION_STARTED',$2,$3,$4,$5,$6,$7,$8)`, [projectId, correlationId, operationId, predecessor.id, { baseline_revision_id: predecessor.id, job_id: jobId }, config().operatorId, project.workflow_code, project.workflow_version]);
  return { operation_id: operationId, status: 'ACCEPTED', job_id: jobId };
});
