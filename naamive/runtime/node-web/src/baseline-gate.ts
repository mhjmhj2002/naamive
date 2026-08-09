import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { putArtifact } from './artifacts.js';
import { evaluateBaselineCardinality } from './cardinality-validator.js';
import { evaluateCompatibility } from './compatibility-evaluator.js';
import { config } from './config.js';
import { withTransaction } from './db.js';
import { ApiError } from './service.js';
import { validateTechnologyBaselineRevisionPayload } from './technology-contracts.js';
import { transitionTarget } from './workflow.js';

const operation = async (client: pg.PoolClient, projectId: string, kind: string, key: string, correlationId: string, revisionId: string) => {
  const id = randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version)
    SELECT $1,$2,$3,'SUCCEEDED',$4,$5,$6,workflow_code,workflow_version FROM projects WHERE id=$2`, [id, projectId, kind, key, correlationId, revisionId]);
  return id;
};

const priorOperation = async (client: pg.PoolClient, key: string) => (await client.query('SELECT id FROM operations WHERE idempotency_key=$1', [key])).rows[0]?.id as string | undefined;
export const baselineRevisionHash = (payload: unknown) => createHash('sha256').update(JSON.stringify(payload)).digest('hex');
export const validateBaselineGateDecision = (body: Record<string, unknown>, gate: { id: string; version: number }) => {
  if (body.gate_id !== gate.id || Number(body.version) !== gate.version) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  const approved = body.decision === 'APPROVED', rejected = body.decision === 'REJECTED', feedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
  if (!approved && !rejected) throw new ApiError(422, 'GATE_DECISION_INVALID');
  if (rejected && !feedback) throw new ApiError(422, 'GATE_FEEDBACK_REQUIRED');
  return { approved, feedback };
};

const revalidate = async (client: pg.PoolClient, revision: any) => {
  const context = (await client.query(`SELECT id,technology_catalog_revision_id,technology_profile_id,status
    FROM technology_selection_contexts WHERE id=$1 AND project_key=$2 FOR SHARE`, [revision.selection_context_id, revision.project_id])).rows[0];
  if (!context || context.status !== 'READY' || context.technology_catalog_revision_id !== revision.technology_catalog_revision_id || !context.technology_profile_id) throw new ApiError(409, 'TECHNOLOGY_BASELINE_CONTEXT_INVALID');
  const profile = (await client.query(`SELECT profile_id FROM technology_catalog_revision_profiles
    WHERE revision_id=$1 AND profile_id=$2 AND is_active FOR SHARE`, [context.technology_catalog_revision_id, context.technology_profile_id])).rows[0];
  if (!profile) throw new ApiError(409, 'TECHNOLOGY_BASELINE_PROFILE_INVALID');
  const items = (await client.query(`SELECT i.catalog_item_id,i.category_id,i.is_active,i.metadata,c.is_active AS category_active
    FROM technology_baseline_revision_items i
    JOIN technology_catalog_revision_items si ON si.revision_id=i.technology_catalog_revision_id AND si.catalog_item_id=i.catalog_item_id
    JOIN technology_catalog_revision_categories c ON c.revision_id=si.revision_id AND c.category_id=si.category_id
    WHERE i.baseline_revision_id=$1 ORDER BY i.display_order,i.catalog_item_id FOR SHARE`, [revision.id])).rows;
  const payload = await validateTechnologyBaselineRevisionPayload(revision.payload);
  if (payload.technology_catalog_revision_id !== revision.technology_catalog_revision_id || payload.items.length !== items.length || items.some((item: any) => !item.is_active || !item.category_active)) throw new ApiError(422, 'TECHNOLOGY_BASELINE_CATALOG_INVALID');
  const persisted = new Set(items.map((item: any) => item.catalog_item_id));
  if (payload.items.some(item => !persisted.has(item.catalog_item_id))) throw new ApiError(422, 'TECHNOLOGY_BASELINE_ITEM_SNAPSHOT_INVALID');
  const profileItems = (await client.query(`SELECT catalog_item_id,classification,version_constraint FROM technology_catalog_revision_profile_items
    WHERE revision_id=$1 AND profile_id=$2 FOR SHARE`, [context.technology_catalog_revision_id, context.technology_profile_id])).rows;
  const submitted = new Map(payload.items.map(item => [item.catalog_item_id, item]));
  if (profileItems.some((item: any) => {
    const selected = submitted.get(item.catalog_item_id);
    return !selected || selected.classification !== item.classification || (selected.version_constraint ?? null) !== item.version_constraint;
  })) throw new ApiError(422, 'TECHNOLOGY_BASELINE_PROFILE_COMPOSITION_INVALID');
  const categories = (await client.query(`SELECT category_id AS id,code,name,selection_mode,min_selections,max_selections,is_active,display_order
    FROM technology_catalog_revision_categories WHERE revision_id=$1 AND is_active`, [revision.technology_catalog_revision_id])).rows;
  const cardinality = evaluateBaselineCardinality(payload, categories, items.map((item: any) => ({ id: item.catalog_item_id, category_id: item.category_id })));
  if (!cardinality.valid) throw new ApiError(422, `TECHNOLOGY_BASELINE_CARDINALITY_INVALID:${cardinality.findings[0].code}`);
  const rules = (await client.query(`SELECT compatibility_rule_id AS id,source_item_id,relationship_type,target_item_id,constraint_expression,severity,message,is_active
    FROM technology_catalog_revision_compatibility_rules WHERE revision_id=$1 AND is_active`, [revision.technology_catalog_revision_id])).rows;
  const compatibility = evaluateCompatibility(payload.items.filter(item => item.classification !== 'PROHIBITED'), rules);
  if (compatibility.blocking) throw new ApiError(422, `TECHNOLOGY_BASELINE_COMPATIBILITY_INVALID:${compatibility.findings.find(finding => finding.blocking)?.code}`);
  return payload;
};

export const submitTechnologyBaseline = async (projectId: string, baselineRevisionId: string, key: string) => withTransaction(async client => {
  const existing = await priorOperation(client, key); if (existing) return { operation_id: existing, status: 'ACCEPTED' };
  const project = (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId])).rows[0];
  if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  if (project.archived_at || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3 || project.state !== 'TECHNOLOGY_BASELINE_IN_REVIEW') throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const revision = (await client.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`, [baselineRevisionId, projectId])).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_BASELINE_REVISION_NOT_FOUND');
  if (revision.status !== 'DRAFT') throw new ApiError(409, 'TECHNOLOGY_BASELINE_REVISION_NOT_DRAFT');
  await revalidate(client, revision);
  const correlationId = randomUUID(), operationId = await operation(client, projectId, 'SUBMIT_TECHNOLOGY_BASELINE', key, correlationId, revision.id);
  const gateId = randomUUID();
  await client.query(`INSERT INTO technology_baseline_gates(id,project_id,project_key,baseline_revision_id,status)
    VALUES($1,$2,$2,$3,'OPEN')`, [gateId, projectId, revision.id]);
  await client.query(`UPDATE technology_baseline_revisions SET status='PENDING_APPROVAL',updated_at=clock_timestamp() WHERE id=$1`, [revision.id]);
  const target = await transitionTarget(client, projectId, 'SUBMIT_TECHNOLOGY_BASELINE');
  await client.query(`UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1`, [projectId, target]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TECHNOLOGY_BASELINE_SUBMITTED',$2,$3,$4,$5,$6,$7,$8)`, [projectId, correlationId, operationId, revision.id, { baseline_revision_id: revision.id, gate_id: gateId }, config().operatorId, project.workflow_code, project.workflow_version]);
  return { operation_id: operationId, status: 'ACCEPTED', gate_id: gateId };
});

export const decideTechnologyBaseline = async (projectId: string, baselineRevisionId: string, body: Record<string, unknown>, key: string) => withTransaction(async client => {
  const existing = await priorOperation(client, key); if (existing) return { operation_id: existing, status: 'ACCEPTED' };
  const project = (await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId])).rows[0];
  if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  if (project.archived_at || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3 || project.state !== 'WAITING_FOR_TECHNOLOGY_BASELINE') throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const revision = (await client.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`, [baselineRevisionId, projectId])).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_BASELINE_REVISION_NOT_FOUND');
  const gate = (await client.query(`SELECT * FROM technology_baseline_gates WHERE baseline_revision_id=$1 AND status='OPEN' FOR UPDATE`, [revision.id])).rows[0];
  if (!gate) throw new ApiError(409, 'GATE_VERSION_CONFLICT');
  const { approved, feedback } = validateBaselineGateDecision(body, gate);
  const correlationId = randomUUID(), operationId = await operation(client, projectId, 'DECIDE_TECHNOLOGY_BASELINE', key, correlationId, revision.id), hash = baselineRevisionHash(revision.payload);
  const artifact = await putArtifact(client, projectId, 'technology-baseline-decision', JSON.stringify({ schema_version: 1, baseline_revision_id: revision.id, gate_id: gate.id, gate_version: gate.version, decision: body.decision, feedback, revision_hash: hash, actor: config().operatorId, correlation_id: correlationId }), operationId, gate.id);
  await client.query(`UPDATE technology_baseline_gates SET status=$2,decision=$3,feedback=$4,revision_hash=$5,decision_artifact_hash=$6,decided_at=clock_timestamp() WHERE id=$1`, [gate.id, approved ? 'APPROVED' : 'REJECTED', body.decision, feedback || null, hash, artifact.hash]);
  await client.query(`UPDATE technology_baseline_revisions SET status=$2,updated_at=clock_timestamp() WHERE id=$1`, [revision.id, approved ? 'APPROVED' : 'REJECTED']);
  const trigger = approved ? 'APPROVE_TECHNOLOGY_BASELINE' : 'REQUEST_BASELINE_ADJUSTMENTS';
  const target = await transitionTarget(client, projectId, trigger);
  await client.query(`UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1`, [projectId, target]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [projectId, approved ? 'TECHNOLOGY_BASELINE_APPROVED' : 'TECHNOLOGY_BASELINE_ADJUSTMENTS_REQUESTED', correlationId, operationId, revision.id, { baseline_revision_id: revision.id, gate_id: gate.id, gate_version: gate.version, feedback, revision_hash: hash, evidence_hash: artifact.hash }, config().operatorId, project.workflow_code, project.workflow_version]);
  return { operation_id: operationId, status: 'ACCEPTED' };
});
