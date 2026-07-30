import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pool, withTransaction } from './db.js';
import { config, containedPath } from './config.js';
import { putArtifact } from './artifacts.js';
import type pg from 'pg';

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
  const repositoryPath = containedPath(path, config().repositoryRoots);
  const git = (...args: string[]) => execFileSync('git', ['-C', repositoryPath, ...args], { encoding: 'utf8' }).trim();
  try {
    const origin = git('remote', 'get-url', 'origin'); const normalizedOrigin = origin.replace(/\/$/, '').replace(/\.git$/, '');
    const explicitBase = typeof requestedBase === 'string' && requestedBase.trim();
    const originHead = explicitBase ? '' : git('symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD').replace(/^origin\//, '');
    const base = explicitBase || originHead; const baseSource = explicitBase ? 'PROJECT_CONFIGURATION' : 'ORIGIN_HEAD';
    const sha = git('rev-parse', 'HEAD'); const dirty = git('status', '--porcelain');
    const confirmation = dirtyConfirmation as { confirmed?: unknown; reason?: unknown } | undefined;
    const dirtyReason = typeof confirmation?.reason === 'string' ? confirmation.reason.trim() : '';
    const confirmed = Boolean(confirmation?.confirmed) && dirtyReason.length > 0;
    if (!origin || !base || !sha) throw new Error(); if (dirty && !confirmed) throw new ApiError(422, 'REPOSITORY_DIRTY_CONFIRMATION_REQUIRED');
    return { repositoryPath, origin, normalizedOrigin, base, baseSource, sha, dirty: Boolean(dirty), dirtyReason: confirmed ? dirtyReason : null };
  }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(422, 'REPOSITORY_INVALID'); }
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

export const projectTimeline = async (projectId: string, after = 0) => (await pool.query('SELECT * FROM events WHERE project_id=$1 AND id > $2 ORDER BY id', [projectId, after])).rows;
const projectedProjects = `SELECT p.id,p.title,p.state,p.updated_at,sd.label AS status,sd.next_action,
  (SELECT event_type FROM events e WHERE e.project_id=p.id ORDER BY id DESC LIMIT 1) AS last_event
 FROM projects p
 LEFT JOIN workflow_definitions wd ON wd.code=p.workflow_code AND wd.version=p.workflow_version
 LEFT JOIN state_status_mappings sm ON sm.workflow_id=wd.id AND sm.state_code=p.state AND sm.event_code IS NULL AND sm.status_type_code='JOURNEY' AND sm.audience_code='OPERATOR'
 LEFT JOIN status_definitions sd ON sd.code=sm.status_code AND sd.version=sm.status_definition_version`;
export const listProjects = async () => (await pool.query(`${projectedProjects} ORDER BY p.updated_at DESC`)).rows;
export const projectDetail = async (projectId: string) => {
  const project = await pool.query(`${projectedProjects} WHERE p.id=$1`, [projectId]);
  if (!project.rowCount) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  const gate = await pool.query(`SELECT id,kind,version,status,revision_id,opened_at FROM gates WHERE project_id=$1 AND status='OPEN' ORDER BY opened_at DESC LIMIT 1`, [projectId]);
  const operations = await pool.query(`SELECT id,kind,status,created_at,completed_at,failure_code FROM operations WHERE project_id=$1 ORDER BY created_at DESC`, [projectId]);
  return { ...project.rows[0], gate: gate.rows[0] ?? null, operations: operations.rows };
};
