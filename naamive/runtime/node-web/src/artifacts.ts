import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';
import { log } from './log.js';
import type pg from 'pg';

export class ArtifactStorageError extends Error { constructor(readonly code:string) { super(code); } }

const forbiddenEvidenceField = /(?:^|_)(?:token|password|secret|api_key|authorization|configuration|config|content|stdout|stderr|prompt)(?:$|_)/i;
const credentialUrl = /:\/\/[^/\s:@]+:[^@\s/]+@/;
const sensitiveAssignment = /(?:token|password|secret|api[_ -]?key|authorization)\s*[=:]/i;
const isForbiddenEvidenceField = (key: string) => !['content_hash', 'evidence_hash'].includes(key) && forbiddenEvidenceField.test(key);

/** F5 evidence is an operational reference, never a configuration or prompt archive. */
export const sanitizeTechnologyEvidence = (value: unknown): unknown => {
  if (typeof value === 'string') return credentialUrl.test(value) || sensitiveAssignment.test(value) ? undefined : value;
  if (Array.isArray(value)) return value.map(sanitizeTechnologyEvidence).filter(item => item !== undefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !isForbiddenEvidenceField(key))
    .map(([key, item]) => [key, sanitizeTechnologyEvidence(item)])
    .filter(([, item]) => item !== undefined));
};

export const hasForbiddenTechnologyEvidence = (value: unknown): boolean => {
  if (typeof value === 'string') return credentialUrl.test(value) || sensitiveAssignment.test(value);
  if (Array.isArray(value)) return value.some(hasForbiddenTechnologyEvidence);
  return !!value && typeof value === 'object' && Object.entries(value as Record<string, unknown>).some(([key, item]) => isForbiddenEvidenceField(key) || hasForbiddenTechnologyEvidence(item));
};

export const putArtifact = async (client: pg.PoolClient, projectId: string, type: string, content: string, executionId?: string, gateId?: string) => {
  if (type.startsWith('technology-')) {
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { throw new ArtifactStorageError('TECHNOLOGY_EVIDENCE_INVALID'); }
    content = JSON.stringify(sanitizeTechnologyEvidence(parsed));
  }
  const hash = createHash('sha256').update(content).digest('hex');
  const section = gateId ? `gates/${gateId}` : `executions/${executionId ?? 'submission'}`;
  const extension = type.endsWith('-markdown') ? 'md' : 'json';
  // Artifact type is metadata, not a filesystem path. Keep a readable bounded
  // prefix and a type digest so an unexpectedly long identifier cannot exceed
  // filesystem limits or collide with another type.
  const typePrefix = type.replace(/[^a-z0-9-]/gi, '-').slice(0, 48) || 'artifact';
  const typeDigest = createHash('sha256').update(type).digest('hex').slice(0, 12);
  const key = `projects/${projectId}/${section}/${typePrefix}-${typeDigest}-${hash}.${extension}`;
  const path = join(config().artifactRoot, key);
  const uri = new URL(`file://${path}`).toString();
  // The intent uses the caller transaction. Using a second connection here
  // deadlocks with the project row lock held by submission/worker commands.
  const intentId = randomUUID();
  const artifactId = randomUUID();
  try { await client.query(`INSERT INTO artifact_intents(id,project_id,execution_id,gate_id,artifact_type,storage_key,storage_uri,expected_sha256)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (project_id,storage_key) DO NOTHING`, [intentId, projectId, executionId ?? null, gateId ?? null, type, key, uri, hash]);
  await mkdir(join(path, '..'), { recursive: true });
  // Network filesystems may accept the final bounded filename but reject an
  // appended UUID suffix. Keep the atomic temporary name short in its parent.
  const temporary = join(dirname(path), `.naamive-${randomUUID()}.tmp`);
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
  try { await rename(temporary, path); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  await client.query(`INSERT INTO artifacts(id,project_id,execution_id,gate_id,artifact_type,storage_uri,storage_key,sha256,schema_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,1) ON CONFLICT (project_id,storage_key) DO NOTHING`, [artifactId, projectId, executionId ?? null, gateId ?? null, type, uri, key, hash]);
  await client.query(`UPDATE artifact_intents SET status='COMPLETED',completed_at=now() WHERE project_id=$1 AND storage_key=$2 AND expected_sha256=$3`, [projectId, key, hash]);
  if (type.startsWith('product-') && !type.endsWith('-markdown')) {
    let readable: unknown = content; try { readable = JSON.parse(content); } catch { /* keep sanitized content */ }
    await putArtifact(client, projectId, `${type}-markdown`, `# ${type}\n\n\`\`\`json\n${JSON.stringify(readable, null, 2)}\n\`\`\`\n`, executionId, gateId);
  }
  const storedId = (await client.query(`SELECT id FROM artifacts WHERE project_id=$1 AND storage_key=$2`, [projectId, key])).rows[0]?.id ?? artifactId;
  return { id: storedId, uri, hash, key };
  } catch(error) { const cause=error as NodeJS.ErrnoException; log('artifact','error','artifact_write_failed',{project_id:projectId,artifact_type:type,storage_key_length:key.length,path_length:path.length,cause_code:cause.code}); if(cause.code==='ENAMETOOLONG') throw new ArtifactStorageError('ARTIFACT_PATH_TOO_LONG'); throw error; }
};

export const putArchiveRecord = async (client: pg.PoolClient, projectId: string, content: string) => {
  const hash=createHash('sha256').update(content).digest('hex'); const key=`archive/projects/${projectId}/archive-record.json`; const path=join(config().artifactRoot,key); const uri=new URL(`file://${path}`).toString();
  await client.query(`INSERT INTO artifact_intents(id,project_id,artifact_type,storage_key,storage_uri,expected_sha256) VALUES($1,$2,'archive-record',$3,$4,$5) ON CONFLICT(project_id,storage_key) DO NOTHING`,[randomUUID(),projectId,key,uri,hash]);
  await mkdir(join(path,'..'),{recursive:true}); try { await writeFile(path,content,{encoding:'utf8',flag:'wx'}); } catch(error) { if((error as NodeJS.ErrnoException).code!=='EEXIST' || createHash('sha256').update(await readFile(path)).digest('hex')!==hash) throw error; }
  await client.query(`INSERT INTO artifacts(id,project_id,artifact_type,storage_uri,storage_key,sha256,schema_version) VALUES($1,$2,'archive-record',$3,$4,$5,1) ON CONFLICT(project_id,storage_key) DO NOTHING`,[randomUUID(),projectId,uri,key,hash]);
  await client.query(`UPDATE artifact_intents SET status='COMPLETED',completed_at=now() WHERE project_id=$1 AND storage_key=$2 AND expected_sha256=$3`,[projectId,key,hash]); return {uri,key,hash};
};

export const reconcileArtifactIntents = async (): Promise<number> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const intents = await client.query(`SELECT * FROM artifact_intents WHERE status='RESERVED' ORDER BY created_at FOR UPDATE SKIP LOCKED`);
    let recovered = 0;
    for (const intent of intents.rows) {
      const path = join(config().artifactRoot, intent.storage_key);
      try {
        const hash = createHash('sha256').update(await readFile(path)).digest('hex');
        if (hash !== intent.expected_sha256) continue;
        await client.query(`INSERT INTO artifacts(id,project_id,execution_id,gate_id,artifact_type,storage_uri,storage_key,sha256,schema_version)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (project_id,storage_key) DO NOTHING`, [randomUUID(), intent.project_id, intent.execution_id, intent.gate_id, intent.artifact_type, intent.storage_uri, intent.storage_key, hash, intent.schema_version]);
        await client.query(`UPDATE artifact_intents SET status='COMPLETED',completed_at=now() WHERE id=$1`, [intent.id]); recovered++;
      } catch { /* hash mismatch or absent object remains RESERVED for investigation */ }
    }
    await client.query('COMMIT'); return recovered;
  } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; }
  finally { client.release(); }
};
