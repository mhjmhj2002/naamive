import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';

if (!process.env.DATABASE_URL) test('worker restart requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-worker-restart-artifacts'; process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp'; process.env.NAAMIVE_OPERATOR_ID ??= 'phase-one-restart-operator';
  const { pool } = await import('./db.js'); const projectId = `worker-restart-${randomUUID().slice(0, 8)}`, revisionId = randomUUID(), operationId = randomUUID(), jobId = randomUUID();
  test('a fresh worker process recovers an expired lease after restart', async (t) => {
    const payload = { title: 'Restart', business_owner: 'Operações', business_problem: 'Worker reiniciado', desired_outcome: 'Recuperar job', success_metrics: ['Job concluído'], stakeholders: ['Operações'], known_constraints: ['Nenhuma restrição conhecida'], evidence_sources: ['Teste'], assumptions: ['Banco disponível'], open_questions: ['Nenhuma'] };
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','0000000',$4)`, [projectId, payload.title, payload.business_owner, payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,$6,'test')`, [revisionId, projectId, payload, 'c'.repeat(64), 'd'.repeat(64), 'file:///tmp/intake.md']);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'VALIDATE_INTAKE','RUNNING',$3,$4,$5)`, [operationId, projectId, `restart-operation-${operationId}`, randomUUID(), revisionId]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,available_at,lease_expires_at,idempotency_key) VALUES($1,$2,$3,$4,'VALIDATE_INTAKE','LEASED',now()-interval '1 minute',now()-interval '1 second',$5)`, [jobId, operationId, projectId, revisionId, `restart-job-${jobId}`]);
    const worker = spawn(process.execPath, [resolve(process.cwd(), 'dist/worker.js')], { env: process.env, stdio: 'ignore' }); t.after(async () => { worker.kill('SIGTERM'); await pool.query('DELETE FROM events WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM artifacts WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM artifact_intents WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM gates WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM jobs WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM operations WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM intake_revisions WHERE project_id=$1',[projectId]); await pool.query('DELETE FROM projects WHERE id=$1',[projectId]); await pool.end(); });
    for (let n = 0; n < 30; n++) { const row = await pool.query('SELECT status FROM jobs WHERE id=$1',[jobId]); if (row.rows[0]?.status === 'COMPLETED') break; await new Promise((done) => setTimeout(done, 100)); }
    assert.equal((await pool.query('SELECT status FROM jobs WHERE id=$1',[jobId])).rows[0].status, 'COMPLETED'); assert.equal((await pool.query('SELECT state FROM projects WHERE id=$1',[projectId])).rows[0].state, 'WAITING_FOR_REGISTRATION');
  });
}
