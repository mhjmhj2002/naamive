import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

if (!process.env.DATABASE_URL) {
  test('HTTP acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL to run integration acceptance' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-http-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= resolve(process.cwd(), '../../..');
  process.env.NAAMIVE_OPERATOR_ID ??= 'phase-one-http-operator';
  const { createApiServer } = await import('./server.js'); const { runOnce } = await import('./worker.js'); const { pool } = await import('./db.js');
  const projectId = `http-acceptance-${randomUUID().slice(0, 8)}`;

  test('serves the web journey, SSE replay, submission, worker and registration decision', async (t) => {
    const server = createApiServer(); await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    const address = server.address(); assert.ok(address && typeof address !== 'string'); const base = `http://127.0.0.1:${address.port}`;
    t.after(async () => { server.close(); await pool.query('DELETE FROM events WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM artifacts WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM artifact_intents WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM gates WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM jobs WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM operations WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM intake_revisions WHERE project_id=$1', [projectId]); await pool.query('DELETE FROM projects WHERE id=$1', [projectId]); await pool.end(); });
    assert.match(await (await fetch(base)).text(), /NAAMIVE/);
    const body = { project_id: projectId, repository_path: resolve(process.cwd(), '../../..'), base_branch: 'agent/clean-project-baseline', dirty_tree_confirmation: { confirmed: true, reason: 'Acceptance workspace changes acknowledged.' }, title: 'Aceite HTTP', business_owner: 'Operações', business_problem: 'Aceite sem navegador', desired_outcome: 'Registro verificável', success_metrics: ['Registro'], stakeholders: ['Operações'], known_constraints: ['Nenhuma restrição conhecida'], evidence_sources: ['Teste'], assumptions: ['Clone disponível'], open_questions: ['Nenhuma'] };
    assert.equal((await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status, 201);
    const sse = await fetch(`${base}/api/projects/${projectId}/events?after=0`); const reader = sse.body!.getReader(); const first = await reader.read(); assert.match(new TextDecoder().decode(first.value), /PROJECT_CREATED/); await reader.cancel();
    const submitted = await fetch(`${base}/api/projects/${projectId}/submit`, { method: 'POST', headers: { 'idempotency-key': `http-${projectId}` } }); assert.equal(submitted.status, 202); assert.equal(await runOnce(), true);
    const detail = await (await fetch(`${base}/api/projects/${projectId}`)).json() as { state: string; gate: { id: string; version: number } }; assert.equal(detail.state, 'WAITING_FOR_REGISTRATION');
    const decided = await fetch(`${base}/api/projects/${projectId}/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ decision: 'APPROVED', gate_id: detail.gate.id, version: detail.gate.version }) }); assert.equal(decided.status, 200); assert.equal((await decided.json() as { state: string }).state, 'REGISTERED');
  });
}
