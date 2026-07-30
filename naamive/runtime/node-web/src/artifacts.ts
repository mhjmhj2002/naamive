import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';
import { pool } from './db.js';
import type pg from 'pg';

export const putArtifact = async (client: pg.PoolClient, projectId: string, type: string, content: string, executionId?: string, gateId?: string) => {
  const hash = createHash('sha256').update(content).digest('hex');
  const section = gateId ? `gates/${gateId}` : `executions/${executionId ?? 'submission'}`;
  const key = `projects/${projectId}/${section}/${type}-${hash}.json`;
  const path = join(config().artifactRoot, key);
  const uri = new URL(`file://${path}`).toString();
  // The intent uses the caller transaction. Using a second connection here
  // deadlocks with the project row lock held by submission/worker commands.
  await client.query(`INSERT INTO artifact_intents(id,project_id,execution_id,gate_id,artifact_type,storage_key,storage_uri,expected_sha256)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (project_id,storage_key) DO NOTHING`, [randomUUID(), projectId, executionId ?? null, gateId ?? null, type, key, uri, hash]);
  await mkdir(join(path, '..'), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
  try { await rename(temporary, path); } catch (error: unknown) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
  await client.query(`INSERT INTO artifacts(id,project_id,execution_id,gate_id,artifact_type,storage_uri,storage_key,sha256,schema_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,1) ON CONFLICT (project_id,storage_key) DO NOTHING`, [randomUUID(), projectId, executionId ?? null, gateId ?? null, type, uri, key, hash]);
  await client.query(`UPDATE artifact_intents SET status='COMPLETED',completed_at=now() WHERE project_id=$1 AND storage_key=$2 AND expected_sha256=$3`, [projectId, key, hash]);
  return { uri, hash, key };
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
