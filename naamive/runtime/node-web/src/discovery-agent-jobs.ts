import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { putArtifact } from './artifacts.js';
import { transitionTarget } from './workflow.js';
import type { AgentResult } from './agent.js';
import { config } from './config.js';

const event = async (client: pg.PoolClient, projectId: string, type: string, operationId: string, jobId: string, revisionId: string | null, payload: object = {}) =>
  client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,workflow_code,workflow_version FROM projects WHERE id=$1`, [projectId, type, randomUUID(), operationId, jobId, revisionId, payload, config().operatorId]);

const nextJob = async (client: pg.PoolClient, job: { operation_id: string; project_id: string; revision_id: string | null }, kind: string) => {
  const id = randomUUID();
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)`, [id, job.operation_id, job.project_id, job.revision_id, kind, `${kind}:${job.operation_id}:${id}`]);
  return id;
};

export const persistDiscoveryAgentOutcome = async (client: pg.PoolClient, job: { id: string; kind: string; project_id: string; operation_id: string; revision_id: string | null }, result: AgentResult, executionArtifactHash?: string) => {
  const type = job.kind === 'ANALYZE_PRODUCT_NEED' ? 'product-need-analysis' : job.kind === 'DEFINE_PRODUCT_REQUIREMENTS' ? 'product-requirements' : 'product-commitment-review';
  const artifact = await putArtifact(client, job.project_id, type, JSON.stringify({ schema_version: 1, correlation_id: job.operation_id, input_references: [], ...result.evidence, result: result.result }), job.id);
  await client.query(`UPDATE artifacts SET metadata=$3 WHERE project_id=$1 AND storage_key=$2`, [job.project_id, artifact.key, result.evidence]);
  let trigger = '', next = '';
  if (job.kind === 'ANALYZE_PRODUCT_NEED') { trigger = 'ANALYSIS_COMPLETED'; next = 'DEFINE_PRODUCT_REQUIREMENTS'; }
  else if (job.kind === 'DEFINE_PRODUCT_REQUIREMENTS') { trigger = 'REQUIREMENTS_COMPLETED'; next = 'REVIEW_PRODUCT_COMMITMENT'; }
  else if (result.result === 'REQUIRES_ADJUSTMENT') trigger = 'REVIEW_REQUIRES_ADJUSTMENT';
  else trigger = 'REVIEW_READY_FOR_GATE';
  const target = await transitionTarget(client, job.project_id, trigger);
  await client.query('UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1', [job.project_id, target]);
  await event(client, job.project_id, trigger, job.operation_id, job.id, job.revision_id, { agent: job.kind, phase: type, evidence_type: type, evidence_hash: artifact.hash, execution_artifact_hash: executionArtifactHash ?? null, result: result.result, next_action: next || 'Aguardando sua decisão' });
  if (next) {
    await nextJob(client, job, next);
    return;
  }
  if (trigger !== 'REVIEW_READY_FOR_GATE') return;
  const candidateGateId = randomUUID();
  const evidence = (await client.query(`SELECT artifact_type,sha256,metadata FROM (
    SELECT DISTINCT ON (artifact_type) artifact_type,sha256,metadata,created_at FROM artifacts
    WHERE project_id=$1 AND artifact_type IN ('product-need-analysis','product-requirements','product-commitment-review')
    ORDER BY artifact_type,created_at DESC
  ) latest ORDER BY created_at`, [job.project_id])).rows;
  if (evidence.length !== 3) throw new Error('PRODUCT_COMMITMENT_EVIDENCE_INCOMPLETE');
  const inserted = await client.query(`INSERT INTO gates(id,project_id,kind,revision_id,evidence)
    VALUES($1,$2,'PRODUCT_COMMITMENT',$3,$4)
    ON CONFLICT (project_id) WHERE status='OPEN' DO NOTHING RETURNING id`, [candidateGateId, job.project_id, job.revision_id, { evidence }]);
  const gateId = inserted.rows[0]?.id ?? (await client.query(`SELECT id FROM gates WHERE project_id=$1 AND status='OPEN' FOR UPDATE`, [job.project_id])).rows[0]?.id;
  if (!gateId) throw new Error('PRODUCT_COMMITMENT_GATE_NOT_CREATED');
  await event(client, job.project_id, 'GATE_OPENED', job.operation_id, job.id, job.revision_id, { gate_id: gateId, kind: 'PRODUCT_COMMITMENT', evidence });
};
