import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  test('Phase 1 PostgreSQL acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL to run integration acceptance' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-phase1-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp';
  process.env.NAAMIVE_OPERATOR_ID ??= 'phase-one-test-operator';
  const { pool } = await import('./db.js');
  const { runOnce } = await import('./worker.js');
  const { projectTimeline } = await import('./service.js');
  const projectId = `phase-one-e2e-${randomUUID().slice(0, 8)}`;
  const revisionId = randomUUID(), operationId = randomUUID(), jobId = randomUUID();
  const payload = { title: 'Aceite', business_owner: 'Operações', business_problem: 'Fluxo sem teste', desired_outcome: 'Aceite verificável', success_metrics: ['Conclusão'], stakeholders: ['Operações'], known_constraints: ['Nenhuma restrição conhecida'], evidence_sources: ['Teste'], assumptions: ['PostgreSQL disponível'], open_questions: ['Nenhuma'] };

  test('recovers an expired lease, persists artifacts and replays timeline after reconnect', async (t) => {
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [projectId, payload.title, payload.business_owner, 'test', '/tmp', 'test://origin', 'main', '0000000', payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,$3,$4,$5,$6,$7)`, [revisionId, projectId, payload, 'a'.repeat(64), 'b'.repeat(64), 'file:///tmp/intake.md', 'test']);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id)
      VALUES($1,$2,'VALIDATE_INTAKE','RUNNING',$3,$4,$5)`, [operationId, projectId, `e2e-operation-${operationId}`, randomUUID(), revisionId]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,attempts,available_at,lease_expires_at,idempotency_key)
      VALUES($1,$2,$3,$4,'VALIDATE_INTAKE','LEASED',0,now()-interval '1 minute',now()-interval '1 second',$5)`, [jobId, operationId, projectId, revisionId, `e2e-job-${jobId}`]);
    t.after(async () => {
      await pool.query('DELETE FROM events WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM artifacts WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM artifact_intents WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM gates WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM jobs WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM operations WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM intake_revisions WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM projects WHERE id=$1', [projectId]); await pool.end();
    });
    for (let n = 0; n < 30; n++) { await runOnce(); const job = await pool.query('SELECT status FROM jobs WHERE id=$1', [jobId]); if (job.rows[0]?.status === 'COMPLETED') break; await new Promise((done) => setTimeout(done, 100)); }
    const state = await pool.query('SELECT state FROM projects WHERE id=$1', [projectId]); assert.equal(state.rows[0].state, 'WAITING_FOR_REGISTRATION');
    const artifacts = await pool.query('SELECT artifact_type FROM artifacts WHERE project_id=$1 ORDER BY artifact_type', [projectId]); assert.deepEqual(artifacts.rows.map((row) => row.artifact_type), ['gate-opened', 'validation-report']);
    const timeline = await projectTimeline(projectId); assert.deepEqual(timeline.map((row) => row.event_type), ['INTAKE_VALIDATED', 'GATE_OPENED']);
    assert.deepEqual(await projectTimeline(projectId, Number(timeline[1].id)), []);
    await pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'REPLAY_CURSOR_CHECK',$2,$3,$4)`, [projectId, randomUUID(), { summary: 'cursor replay' }, 'test']);
    const replay = await projectTimeline(projectId, Number(timeline[0].id));
    assert.deepEqual(replay.map((row: any) => row.id), [timeline[1].id, replay[1].id]);
    assert.deepEqual((await projectTimeline(projectId, Number(timeline[1].id))).map((row: any) => row.id), [replay[1].id]);
    const reconnectSeen = new Set<number>(); for (const row of [...replay, ...await projectTimeline(projectId, Number(timeline[0].id))]) reconnectSeen.add(Number(row.id));
    assert.equal(reconnectSeen.size, replay.length);
  });
}
