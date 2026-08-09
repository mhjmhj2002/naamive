import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { lstatSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type pg from 'pg';
import { config, containedPath } from './config.js';
import { putArtifact } from './artifacts.js';

const MAX_BYTES = 128 * 1024, MAX_FIELD = 160, MAX_DEPTH = 8;
const allowed = new Set(['package.json']);
const git = (repo: string, args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const code = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, MAX_FIELD);
const clean = (value: unknown) => typeof value === 'string' && value.length <= MAX_FIELD && !/(?:password|secret|token|key)=/i.test(value) ? value : null;
type Fact = { source_path: string; detector_code: string; confidence: number; value: string };

export const parsePackageInventoryFacts = (path: string): Fact[] => {
  const stat = lstatSync(path); if (stat.isSymbolicLink() || !stat.isFile() || stat.size > MAX_BYTES) throw new Error('INVENTORY_REJECTED_UNSAFE_MANIFEST');
  let data: unknown; try { data = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error('INVENTORY_REJECTED_MALFORMED_MANIFEST'); }
  const walk = (v: unknown, depth = 0): void => { if (depth > MAX_DEPTH) throw new Error('INVENTORY_REJECTED_MANIFEST_DEPTH'); if (v && typeof v === 'object') Object.values(v as object).forEach(x => walk(x, depth + 1)); };
  walk(data); const object = data as Record<string, unknown>; const facts: Fact[] = [];
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
    const values = object[section]; if (!values || typeof values !== 'object' || Array.isArray(values)) continue;
    for (const [name, version] of Object.entries(values as Record<string, unknown>)) { const value = clean(version); if (value) facts.push({ source_path: 'package.json', detector_code: 'PACKAGE_DEPENDENCY', confidence: 0.95, value: code(name) }); }
  }
  const engine = (object.engines as Record<string, unknown> | undefined)?.node; const value = clean(engine);
  if (value) facts.push({ source_path: 'package.json', detector_code: 'PACKAGE_ENGINE', confidence: 0.8, value: `NODEJS_${(value.match(/\d+/)?.[0] ?? '').slice(0, 3)}` });
  return facts;
};

export const startTechnologyInventory = async (client: pg.PoolClient, projectId: string, idempotencyKey: string) => {
  const project = (await client.query('SELECT id,initial_sha FROM projects WHERE id=$1 FOR UPDATE', [projectId])).rows[0];
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  const existing = await client.query('SELECT id FROM operations WHERE idempotency_key=$1', [idempotencyKey]); if (existing.rowCount) return { operation_id: existing.rows[0].id, status: 'ACCEPTED' };
  const context = (await client.query(`SELECT id,technology_catalog_revision_id FROM technology_selection_contexts WHERE project_key=$1 AND status='READY' ORDER BY created_at DESC LIMIT 1`, [projectId])).rows[0];
  if (!context) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_INVALID');
  const revision = (await client.query('SELECT id FROM intake_revisions WHERE project_id=$1 ORDER BY submitted_at DESC LIMIT 1', [projectId])).rows[0]; if (!revision) throw new Error('INVENTORY_INTAKE_REVISION_REQUIRED');
  const operationId=randomUUID(), jobId=randomUUID(), correlation=randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'TECHNOLOGY_INVENTORY','QUEUED',$3,$4,$5)`, [operationId,projectId,idempotencyKey,correlation,revision.id]);
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'START_TECHNOLOGY_INVENTORY',$5)`, [jobId,operationId,projectId,revision.id,`technology-inventory:${operationId}`]);
  const artifact = await putArtifact(client, projectId, 'technology-inventory', JSON.stringify({ schema_version: 1, status: 'RESERVED', requested_sha: project.initial_sha, selection_context_id: context.id, technology_catalog_revision_id: context.technology_catalog_revision_id }), jobId);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id)
    VALUES($1,'TECHNOLOGY_INVENTORY_STARTED',$2,$3,$4,$5,$6,$7)`, [projectId, correlation, operationId, jobId, revision.id, { summary: 'Inventário tecnológico iniciado.', technology_catalog_revision_id: context.technology_catalog_revision_id, selection_context_id: context.id, evidence_hash: artifact.hash, next_action: 'Aguardar a coleta do inventário.' }, config().operatorId]);
  return { operation_id: operationId, status: 'ACCEPTED' };
};

export const executeTechnologyInventory = async (client: pg.PoolClient, job: any) => {
  // The inventory transaction may have committed before a worker crashes while
  // completing its job.  A retried lease must preserve that immutable snapshot
  // instead of collecting it a second time.
  const ready = await client.query(`SELECT 1 FROM events WHERE job_id=$1 AND event_type='TECHNOLOGY_INVENTORY_READY' LIMIT 1`, [job.id]);
  if (ready.rowCount) return;
  const project=(await client.query('SELECT id,repository_path,initial_sha FROM projects WHERE id=$1', [job.project_id])).rows[0];
  const context=(await client.query(`SELECT id,technology_catalog_revision_id FROM technology_selection_contexts WHERE project_key=$1 AND status='READY' ORDER BY created_at DESC LIMIT 1`,[job.project_id])).rows[0];
  if (!project || !context) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_INVALID'); const repo=containedPath(project.repository_path, config().repositoryRoots), sha=project.initial_sha;
  const temp=mkdtempSync(join(tmpdir(),'naamive-inventory-'));
  try {
    git(repo,['worktree','add','--detach','--no-checkout',temp,sha]); git(temp,['checkout','--detach',sha]);
    if (git(temp,['rev-parse',sha]) !== sha) throw new Error('INVENTORY_SNAPSHOT_SHA_DIVERGED');
    const unsafeEntries = git(temp, ['ls-files', '-s']).split('\n').some(line => line.startsWith('120000 ') || line.startsWith('160000 '));
    if (unsafeEntries) throw new Error('INVENTORY_REJECTED_UNSAFE_GIT_ENTRY');
    const facts: Fact[]=[]; for (const path of allowed) { const file=join(temp,path); try { facts.push(...parsePackageInventoryFacts(file)); } catch (error: any) { if (error?.code !== 'ENOENT') throw error; } }
    if (git(temp,['rev-parse',sha]) !== sha) throw new Error('INVENTORY_SNAPSHOT_SHA_DIVERGED');
    const items=(await client.query(`SELECT catalog_item_id,is_active,code FROM technology_catalog_revision_items WHERE revision_id=$1`,[context.technology_catalog_revision_id])).rows;
    const rows=facts.map(f=>{const matches=items.filter((i:any)=>i.code===f.value); return {...f,resolution_result:matches.length>1?'AMBIGUOUS_CATALOG_ITEM':matches.length===1?(matches[0].is_active?'RESOLVED_ACTIVE':'RESOLVED_INACTIVE'):'UNKNOWN_CATALOG_ITEM',catalog_item_id:matches.length===1?matches[0].catalog_item_id:null};});
    for(const row of rows) await client.query(`INSERT INTO technology_inventory(id,project_id,project_key,repository_sha,job_id,technology_catalog_revision_id,source_path,detector_code,confidence,value,resolution_result,catalog_item_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,[randomUUID(),job.project_id,job.project_id,sha,job.id,context.technology_catalog_revision_id,row.source_path,row.detector_code,row.confidence,row.value,row.resolution_result,row.catalog_item_id]);
    const snapshot={schema_version:1,requested_sha:sha,read_sha:sha,selection_context_id:context.id,technology_catalog_revision_id:context.technology_catalog_revision_id,facts:rows}; const hash=createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'); const artifact = await putArtifact(client,job.project_id,'technology-inventory',JSON.stringify({...snapshot,content_hash:hash}),job.id);
    const started = (await client.query(`SELECT EXTRACT(EPOCH FROM clock_timestamp()-created_at)*1000 AS duration_ms FROM operations WHERE id=$1`, [job.operation_id])).rows[0]?.duration_ms;
    await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id)
      SELECT $1,'TECHNOLOGY_INVENTORY_READY',correlation_id,$2,$3,$4,$5 FROM operations WHERE id=$2`, [job.project_id, job.operation_id, job.id, { summary: 'Inventário tecnológico concluído.', duration_ms: started === undefined ? null : Math.max(0, Math.round(Number(started))), technology_catalog_revision_id: context.technology_catalog_revision_id, selection_context_id: context.id, evidence_hash: artifact.hash, next_action: 'Criar ou revisar a Technology Baseline.' }, config().operatorId]);
  } finally { try { git(repo,['worktree','remove','--force',temp]); } catch {} rmSync(temp,{recursive:true,force:true}); }
};
