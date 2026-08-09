import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pool, withTransaction } from './db.js';
import { config, containedPath } from './config.js';
import { putArtifact, putArchiveRecord } from './artifacts.js';
import { transitionTarget } from './workflow.js';
import type pg from 'pg';
import { publicEvent } from './projection.js';
import { listProjectExecutionData } from './agent-execution-admin.js';

type Intake = Record<string, unknown>;
const fields = ['title', 'business_owner', 'business_problem', 'desired_outcome', 'success_metrics', 'stakeholders', 'known_constraints', 'evidence_sources', 'assumptions', 'open_questions'];
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const tech = /\b(python|node(?:\.js)?|javascript|typescript|java|angular|react|framework|banco de dados|postgres(?:ql)?|mysql|mongodb|cloud|aws|azure|gcp|openai|modelo de ia|arquitetura|microservi[cç]o|deployment)\b/i;
export class ApiError extends Error { constructor(readonly status: number, readonly code: string, message = code) { super(message); } }
const canonical = (value: unknown) => JSON.stringify(value, Object.keys(value as object).sort());
const event = (client: pg.PoolClient, projectId: string, type: string, correlation: string, payload: object, operationId?: string, jobId?: string, revisionId?: string) => client.query(
  'INSERT INTO events(project_id,event_type,correlation_id,payload,operation_id,job_id,revision_id,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [projectId, type, correlation, payload, operationId ?? null, jobId ?? null, revisionId ?? null, config().operatorId]);

export const validateIntake = (payload: Intake) => {
  const errors: Array<{ code: string; field: string; message: string }> = [];
  for (const field of fields) {
    const value = payload[field]; const meaningful = Array.isArray(value) ? value.some((item) => String(item).trim()) : typeof value === 'string' && value.trim() && !/^<.*>$/.test(value.trim());
    if (!meaningful) errors.push({ code: 'INTAKE_REQUIRED', field, message: 'Campo obrigatório' });
  }
  for (const field of ['business_problem', 'desired_outcome', 'known_constraints', 'assumptions', 'open_questions']) if (typeof payload[field] === 'string' && tech.test(payload[field])) errors.push({ code: 'INTAKE_TECHNOLOGY_DECISION', field, message: 'A necessidade não pode decidir tecnologia' });
  return errors;
};

const gitBinding = (path: string, requestedBase: unknown, dirtyConfirmation: unknown) => {
  try {
    const repositoryPath = containedPath(path, config().repositoryRoots);
    const git = (...args: string[]) => execFileSync('git', ['-C', repositoryPath, ...args], { encoding: 'utf8' }).trim();
    const origin = git('remote', 'get-url', 'origin'); const normalizedOrigin = origin.replace(/\/$/, '').replace(/\.git$/, '');
    const explicitBase = typeof requestedBase === 'string' && requestedBase.trim();
    let originHead = '', baseSource = explicitBase ? 'PROJECT_CONFIGURATION' : 'ORIGIN_HEAD';
    if (!explicitBase) {
      try { originHead = git('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, ''); }
      catch { originHead = git('branch', '--show-current'); baseSource = 'LOCAL_HEAD_FALLBACK'; }
    }
    const base = explicitBase || originHead;
    const sha = git('rev-parse', 'HEAD'); const dirty = git('status', '--porcelain');
    const confirmation = dirtyConfirmation as { confirmed?: unknown; reason?: unknown } | undefined;
    const dirtyReason = typeof confirmation?.reason === 'string' ? confirmation.reason.trim() : '';
    const confirmed = Boolean(confirmation?.confirmed) && dirtyReason.length > 0;
    if (!origin || !base || !sha) throw new Error(); if (dirty && !confirmed) throw new ApiError(422, 'REPOSITORY_DIRTY_CONFIRMATION_REQUIRED');
    return { repositoryPath, origin, normalizedOrigin, base, baseSource, sha, dirty: Boolean(dirty), dirtyReason: confirmed ? dirtyReason : null };
  }
  catch (error) {
    if (error instanceof ApiError) throw error;
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') throw new ApiError(422, 'REPOSITORY_PATH_NOT_FOUND', 'Informe o caminho absoluto de um clone Git local existente.');
    if (error instanceof Error && error.message === 'REPOSITORY_PATH_NOT_ALLOWED') throw new ApiError(422, 'REPOSITORY_PATH_NOT_ALLOWED', 'O clone precisa estar abaixo de uma raiz Git permitida.');
    throw new ApiError(422, 'REPOSITORY_INVALID', 'O caminho precisa apontar para um clone Git válido com origin.');
  }
};

export const createProject = async (body: Intake) => {
  const id = String(body.project_id ?? ''); if (!slug.test(id)) throw new ApiError(422, 'INTAKE_PROJECT_ID_INVALID');
  const binding = gitBinding(String(body.repository_path ?? ''), body.base_branch, body.dirty_tree_confirmation); const correlation = randomUUID();
  return withTransaction(async (client) => {
    try { await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,created_by,updated_by,repository_path,repository_origin,repository_origin_normalized,base_branch,branch_base_source,initial_sha,dirty_tree_confirmed,dirty_tree_reason,dirty_tree_confirmed_by,draft)
      VALUES($1,$2,$3,$4,$4,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`, [id, String(body.title ?? ''), String(body.business_owner ?? ''), config().operatorId, binding.repositoryPath, binding.origin, binding.normalizedOrigin, binding.base, binding.baseSource, binding.sha, binding.dirty, binding.dirtyReason, binding.dirty ? config().operatorId : null, body]); }
    catch { throw new ApiError(409, 'INTAKE_PROJECT_ID_EXISTS'); }
    await event(client, id, 'PROJECT_CREATED', correlation, { repository_origin: binding.origin, base_branch: binding.base, base_branch_source: binding.baseSource, initial_sha: binding.sha, dirty_tree_confirmed: binding.dirty }); return { project_id: id };
  });
};

export const saveIntake = async (projectId: string, body: Intake) => withTransaction(async (client) => {
  const result = await client.query('UPDATE projects SET draft=$2, updated_by=$3, updated_at=now() WHERE id=$1 AND state=$4 RETURNING id', [projectId, body, config().operatorId, 'DRAFT']); if (!result.rowCount) throw new ApiError(409, 'PROJECT_NOT_EDITABLE');
  await event(client, projectId, 'INTAKE_SAVED', randomUUID(), {}); return { project_id: projectId };
});

export const bindRepository = async (projectId: string, payload: Intake) => withTransaction(async (client) => {
  const binding = gitBinding(String(payload.repository_path ?? ''), payload.base_branch, payload.dirty_tree_confirmation);
  const result = await client.query(`UPDATE projects SET repository_path=$2,repository_origin=$3,repository_origin_normalized=$4,base_branch=$5,branch_base_source=$6,initial_sha=$7,dirty_tree_confirmed=$8,dirty_tree_reason=$9,dirty_tree_confirmed_by=$10,updated_by=$10,updated_at=now() WHERE id=$1 AND state='DRAFT' RETURNING id`, [projectId, binding.repositoryPath, binding.origin, binding.normalizedOrigin, binding.base, binding.baseSource, binding.sha, binding.dirty, binding.dirtyReason, config().operatorId]);
  if (!result.rowCount) throw new ApiError(409, 'PROJECT_NOT_EDITABLE'); await event(client, projectId, 'REPOSITORY_BOUND', randomUUID(), { repository_origin: binding.origin, base_branch: binding.base, base_branch_source: binding.baseSource, initial_sha: binding.sha, dirty_tree_confirmed: binding.dirty }); return { project_id: projectId };
});

export const submitIntake = async (projectId: string, key: string) => withTransaction(async (client) => {
  const project = await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId]); if (!project.rowCount) throw new ApiError(404, 'PROJECT_NOT_FOUND'); const row = project.rows[0];
  const existing = await client.query('SELECT id FROM operations WHERE idempotency_key=$1', [key]); if (existing.rowCount) return { operation_id: existing.rows[0].id, status: 'ACCEPTED' };
  if (row.state !== 'DRAFT') throw new ApiError(409, 'PROJECT_OPERATION_ACTIVE');
  if ((await client.query(`SELECT 1 FROM operations WHERE project_id=$1 AND status IN ('ACCEPTED','QUEUED','RUNNING')`, [projectId])).rowCount) throw new ApiError(409, 'PROJECT_OPERATION_ACTIVE');
  const errors = validateIntake(row.draft); if (errors.length) throw new ApiError(422, 'INTAKE_INVALID', JSON.stringify(errors));
  const payload = row.draft as Intake; const structured = canonical(payload); const revisionId = randomUUID(); const markdown = `---\nschema_version: 1\nproject_id: ${projectId}\nrevision_id: ${revisionId}\n---\n\n# Solicitação de Projeto\n\n${Object.entries(payload).map(([k,v]) => `## ${k}\n\n${Array.isArray(v) ? v.map((x) => `- ${x}`).join('\n') : v}`).join('\n\n')}`;
  const structuredHash = createHash('sha256').update(structured).digest('hex'); const markdownHash = createHash('sha256').update(markdown).digest('hex');
  const snapshot = await putArtifact(client, projectId, 'intake-revision', JSON.stringify({ payload, markdown, structuredHash, markdownHash }), revisionId);
  await client.query('INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,$6,$7)', [revisionId, projectId, payload, structuredHash, markdownHash, snapshot.uri, row.submitted_by]);
  const operationId = randomUUID(), jobId = randomUUID(), correlation = randomUUID();
  await client.query('INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,$3,$4,$5,$6,$7)', [operationId, projectId, 'VALIDATE_INTAKE', 'QUEUED', key, correlation, revisionId]);
  await client.query('INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)', [jobId, operationId, projectId, revisionId, 'VALIDATE_INTAKE', `validate-intake:${projectId}:${revisionId}`]);
  await event(client, projectId, 'INTAKE_SUBMITTED', correlation, {}, operationId, jobId, revisionId); return { operation_id: operationId, status: 'ACCEPTED' };
});

export const startProductDiscovery = async (projectId: string, key: string) => {
  return withTransaction(async (client) => {
  const project = await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE', [projectId]); if (!project.rowCount) throw new ApiError(404, 'PROJECT_NOT_FOUND'); const row = project.rows[0];
  const existing = await client.query('SELECT id FROM operations WHERE idempotency_key=$1', [key]); if (existing.rowCount) return { operation_id: existing.rows[0].id, status: 'ACCEPTED' };
  if (row.state !== 'REGISTERED' || row.archived_at) throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const operationId=randomUUID(), jobId=randomUUID(), correlation=randomUUID();
  const workflowVersion=3;
  await client.query(`UPDATE projects SET workflow_code='PROJECT_DISCOVERY',workflow_version=$2,state='ANALYSIS_IN_PROGRESS',updated_at=now() WHERE id=$1`, [projectId,workflowVersion]);
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5,'PROJECT_DISCOVERY',$6)`, [operationId,projectId,key,correlation,row.id ? (await client.query('SELECT id FROM intake_revisions WHERE project_id=$1 ORDER BY submitted_at DESC LIMIT 1',[projectId])).rows[0]?.id ?? null : null,workflowVersion]);
  const revisionId=(await client.query('SELECT revision_id FROM operations WHERE id=$1',[operationId])).rows[0].revision_id;
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'ANALYZE_PRODUCT_NEED',$5)`,[jobId,operationId,projectId,revisionId,`analysis:${projectId}:${operationId}`]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,operation_id,job_id,revision_id,actor_id,workflow_code,workflow_version)
    VALUES($1,'PRODUCT_DISCOVERY_STARTED',$2,$3,$4,$5,$6,$7,'PROJECT_DISCOVERY',$8)`, [projectId,correlation,{stage:'ANALYZE_PRODUCT_NEED',workflow_version:workflowVersion},operationId,jobId,revisionId,config().operatorId,workflowVersion]); return {operation_id:operationId,status:'ACCEPTED'};
  });
};

export const retryProductDiscovery = async (projectId:string,key:string) => {
  return withTransaction(async client => {
    const project=await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE',[projectId]); if(!project.rowCount) throw new ApiError(404,'PROJECT_NOT_FOUND'); const row=project.rows[0];
    const existing=await client.query('SELECT id FROM operations WHERE idempotency_key=$1',[key]); if(existing.rowCount) return {operation_id:existing.rows[0].id,status:'ACCEPTED'};
    if(row.workflow_code!=='PROJECT_DISCOVERY'||row.state!=='DISCOVERY_FAILED'||row.archived_at) throw new ApiError(409,'WORKFLOW_TRANSITION_NOT_ALLOWED');
    if((await client.query(`SELECT 1 FROM operations WHERE project_id=$1 AND status IN ('ACCEPTED','QUEUED','RUNNING')`,[projectId])).rowCount) throw new ApiError(409,'PROJECT_OPERATION_ACTIVE');
    const failed=await client.query(`SELECT j.kind,o.revision_id,o.id FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.project_id=$1 AND j.status='FAILED' AND j.kind IN ('ANALYZE_PRODUCT_NEED','DEFINE_PRODUCT_REQUIREMENTS','REVIEW_PRODUCT_COMMITMENT') ORDER BY j.completed_at DESC NULLS LAST LIMIT 1`,[projectId]); if(!failed.rowCount) throw new ApiError(409,'DISCOVERY_RETRY_NOT_AVAILABLE');
    const prior=failed.rows[0], trigger=`RETRY_${prior.kind}`, target=await transitionTarget(client,projectId,trigger),operationId=randomUUID(),jobId=randomUUID(),correlation=randomUUID();
    await client.query(`UPDATE projects SET state=$2,failure_stage=NULL,failure_code=NULL,updated_at=now() WHERE id=$1`,[projectId,target]);
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5)`,[operationId,projectId,key,correlation,prior.revision_id]);
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,$5,$6)`,[jobId,operationId,projectId,prior.revision_id,prior.kind,`retry:${prior.kind}:${operationId}`]);
    await event(client,projectId,'PRODUCT_DISCOVERY_RETRY_ACCEPTED',correlation,{failed_operation_id:prior.id,stage:prior.kind},operationId,jobId,prior.revision_id);
    return {operation_id:operationId,status:'ACCEPTED'};
  });
};
export const applyReviewAdjustments = async (projectId:string,body:Record<string,unknown>,key:string) => withTransaction(async client => {
  const feedback=typeof body.feedback==='string'?body.feedback.trim():''; if(!feedback) throw new ApiError(422,'REVIEW_ADJUSTMENT_FEEDBACK_REQUIRED','Descreva os ajustes a aplicar.'); if(feedback.length>500) throw new ApiError(422,'REVIEW_ADJUSTMENT_FEEDBACK_TOO_LONG','Descreva os ajustes em até 500 caracteres.');
  const p=(await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE',[projectId])).rows[0]; if(!p) throw new ApiError(404,'PROJECT_NOT_FOUND'); if(p.state!=='WAITING_FOR_REVIEW_ADJUSTMENT'||p.archived_at) throw new ApiError(409,'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const target=await transitionTarget(client,projectId,'APPLY_REVIEW_ADJUSTMENTS'),operationId=randomUUID(),jobId=randomUUID(),correlation=randomUUID(); const revision=(await client.query('SELECT id FROM intake_revisions WHERE project_id=$1 ORDER BY submitted_at DESC LIMIT 1',[projectId])).rows[0].id;
  await client.query('UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1',[projectId,target]); await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5)`,[operationId,projectId,key,correlation,revision]); await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'DEFINE_PRODUCT_REQUIREMENTS',$5)`,[jobId,operationId,projectId,revision,`operator-rework:${operationId}`]); await event(client,projectId,'REVIEW_ADJUSTMENTS_APPLIED',correlation,{feedback},operationId,jobId,revision); return {operation_id:operationId,status:'ACCEPTED'};
});

export const archiveProject = async (projectId: string, body: Record<string, unknown>) => withTransaction(async (client) => {
  if (body.confirmed !== true || typeof body.reason !== 'string' || !body.reason.trim()) throw new ApiError(422,'ARCHIVE_CONFIRMATION_AND_REASON_REQUIRED');
  const p=await client.query('SELECT * FROM projects WHERE id=$1 FOR UPDATE',[projectId]); if(!p.rowCount) throw new ApiError(404,'PROJECT_NOT_FOUND'); const row=p.rows[0]; if(row.archived_at) throw new ApiError(409,'PROJECT_ALREADY_ARCHIVED');
  const policy=await client.query(`SELECT target_workflow_code,target_workflow_version FROM workflow_global_policies WHERE policy_code='ARCHIVE_PROJECT' AND source_workflow_code=$1 AND source_state=$2`,[row.workflow_code,row.state]);
  if(!policy.rowCount) throw new ApiError(409,'WORKFLOW_TRANSITION_NOT_ALLOWED');
  const correlation=randomUUID();
  await client.query(`UPDATE projects SET workflow_code=$2,workflow_version=$3,state='ARCHIVING',updated_at=now() WHERE id=$1`,[projectId,policy.rows[0].target_workflow_code,policy.rows[0].target_workflow_version]);
  await event(client,projectId,'PROJECT_ARCHIVING',correlation,{from_state:row.state,reason:body.reason.trim()});
  await client.query(`UPDATE jobs SET status='FAILED',completed_at=now(),last_error='PROJECT_ARCHIVED' WHERE project_id=$1 AND status IN ('PENDING','RETRYABLE','LEASED')`,[projectId]);
  await client.query(`UPDATE operations SET status='FAILED',failure_code='PROJECT_ARCHIVED',completed_at=now() WHERE project_id=$1 AND status IN ('ACCEPTED','QUEUED','RUNNING')`,[projectId]);
  await client.query(`UPDATE gates SET status='CANCELLED',decided_at=now() WHERE project_id=$1 AND status='OPEN'`,[projectId]);
  const record={schema_version:1,project_id:projectId,archived_by:config().operatorId,archive_reason:body.reason.trim(),archived_from_state:row.state,archived_at:new Date().toISOString()};
  const artifact=await putArchiveRecord(client,projectId,JSON.stringify(record));
  const target=await transitionTarget(client,projectId,'ARCHIVING_COMPLETED');
  await client.query(`UPDATE projects SET state=$2,archived_at=now(),archived_by=$3,archive_reason=$4,archived_from_state=$5,updated_at=now() WHERE id=$1`,[projectId,target,config().operatorId,body.reason.trim(),row.state]);
  await event(client,projectId,'PROJECT_ARCHIVED',correlation,{...record,artifact_hash:artifact.hash}); return {project_id:projectId,state:target};
});

export const projectTimeline = async (projectId: string, after = 0) => (await pool.query('SELECT id,event_type,created_at AS occurred_at,payload FROM events WHERE project_id=$1 AND id > $2 ORDER BY id', [projectId, after])).rows.map(publicEvent);
const projectedProjects = `SELECT p.id,p.title,p.state,p.updated_at,sd.label AS status,sd.next_action,
  (SELECT event_type FROM events e WHERE e.project_id=p.id ORDER BY id DESC LIMIT 1) AS last_event
 FROM projects p
 LEFT JOIN workflow_definitions wd ON wd.code=p.workflow_code AND wd.version=p.workflow_version
 LEFT JOIN state_status_mappings sm ON sm.workflow_id=wd.id AND sm.state_code=p.state AND sm.event_code IS NULL AND sm.status_type_code='JOURNEY' AND sm.audience_code='OPERATOR'
 LEFT JOIN status_definitions sd ON sd.code=sm.status_code AND sd.version=sm.status_definition_version`;
export const listProjects = async (archived=false) => (await pool.query(`${projectedProjects} ${archived ? 'WHERE p.archived_at IS NOT NULL' : 'WHERE p.archived_at IS NULL'} ORDER BY p.updated_at DESC`)).rows;
const display = (state:string, review:Record<string,unknown>|null) => {
  const labels:Record<string,[string,string]>={ANALYSIS_IN_PROGRESS:['Analisando necessidade','Identificando problema e objetivos'],REQUIREMENTS_IN_PROGRESS:['Definindo requisitos','Detalhando escopo e critérios'],REVIEW_IN_PROGRESS:['Revisando proposta','Validando o pacote de produto'],WAITING_FOR_REVIEW_ADJUSTMENT:['Aguardando seus ajustes','A revisão pediu complementos'],WAITING_FOR_PRODUCT_COMMITMENT:['Aguardando sua decisão','Pacote pronto para aprovação'],DISCOVERY_FAILED:['Descoberta interrompida','Falha na etapa de descoberta'],PRODUCT_COMMITMENT:['Compromisso de produto','Pacote aprovado']}; const [display_status,default_reason]=labels[state]??[state,'Sem ação necessária']; const reason=state==='WAITING_FOR_REVIEW_ADJUSTMENT'?'A revisão pediu complementos.':default_reason; return {display_status,status_reason:reason};
};
export const projectDetail = async (projectId: string) => {
  const project = await pool.query(`${projectedProjects.replace('p.updated_at,','p.updated_at,p.failure_stage,p.failure_code,')} WHERE p.id=$1`, [projectId]);
  if (!project.rowCount) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  const gate = await pool.query(`SELECT id,kind,version,status,revision_id,opened_at,evidence FROM gates WHERE project_id=$1 AND status='OPEN' ORDER BY opened_at DESC LIMIT 1`, [projectId]);
  const operations = await pool.query(`SELECT id,kind,status,created_at,completed_at,failure_code FROM operations WHERE project_id=$1 ORDER BY created_at DESC`, [projectId]);
  const artifacts=await pool.query(`SELECT artifact_type,sha256,created_at FROM artifacts WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]);
  const review=await pool.query(`SELECT metadata FROM artifacts WHERE project_id=$1 AND artifact_type='product-commitment-review' ORDER BY created_at DESC LIMIT 1`,[projectId]);
  const activeJob=await pool.query(`SELECT kind,heartbeat_at,lease_expires_at,available_at FROM jobs WHERE project_id=$1 AND status='LEASED' ORDER BY available_at DESC LIMIT 1`,[projectId]);
  const reviewData=(review.rows[0]?.metadata??null) as Record<string,unknown>|null;
  const runtimeData = config().runtimeProjectionEnabled ? await listProjectExecutionData(projectId) : { executions: [], attempts: [] };
  return { ...project.rows[0], ...display(project.rows[0].state,reviewData), gate: gate.rows[0] ?? null, operations: operations.rows, artifacts:artifacts.rows, review:reviewData, active_job:activeJob.rows[0] ?? null, agent_executions: runtimeData.executions, agent_attempts: runtimeData.attempts };
};
