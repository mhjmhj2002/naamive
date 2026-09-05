import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) test('workflow v3 acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-workflow-v3-e2e-artifacts';
  process.env.NAAMIVE_OPERATOR_ID ??= 'workflow-v3-test-operator';
  const { pool } = await import('./db.js');
  const { archiveProject, startProductDiscovery } = await import('./service.js');
  const { transitionTarget } = await import('./workflow.js');
  const draft = { title: 'Workflow v3', business_owner: 'Operações' };
  const cleanup = async (projectId: string) => {
    for (const table of ['events', 'artifacts', 'artifact_intents', 'gates', 'jobs', 'operations', 'intake_revisions']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [projectId]);
    await pool.query('DELETE FROM projects WHERE id=$1', [projectId]);
  };
  const project = async (version: number, state: string) => {
    const id = `workflow-v3-${randomUUID().slice(0, 8)}`;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','PROJECT_DISCOVERY',$4,$5,$6)`, [id, draft.title, draft.business_owner, version, state, draft]);
    return id;
  };

  test.after(async () => pool.end());

  test('selects and persists workflow v3 atomically for projects leaving intake', async (t) => {
    const id = `workflow-v3-start-${randomUUID().slice(0, 8)}`;
    t.after(() => cleanup(id));
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','PROJECT_INTAKE',1,'REGISTERED',$4)`, [id, draft.title, draft.business_owner, draft]);
    const revisionId = randomUUID();
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`, [revisionId, id, draft, 'a'.repeat(64), 'b'.repeat(64)]);

    await startProductDiscovery(id, `workflow-v3-start:${id}`);
    const selected = await pool.query('SELECT workflow_code,workflow_version,state FROM projects WHERE id=$1', [id]);
    assert.deepEqual(selected.rows[0], { workflow_code: 'PROJECT_DISCOVERY', workflow_version: 3, state: 'ANALYSIS_IN_PROGRESS' });
    const operation = await pool.query('SELECT workflow_code,workflow_version FROM operations WHERE project_id=$1', [id]);
    assert.deepEqual(operation.rows[0], { workflow_code: 'PROJECT_DISCOVERY', workflow_version: 3 });
    const started = await pool.query(`SELECT workflow_code,workflow_version,payload->>'workflow_version' AS selected_version FROM events WHERE project_id=$1 AND event_type='PRODUCT_DISCOVERY_STARTED'`, [id]);
    assert.deepEqual(started.rows[0], { workflow_code: 'PROJECT_DISCOVERY', workflow_version: 3, selected_version: '3' });
    await assert.rejects(pool.query(`UPDATE operations SET workflow_version=2 WHERE project_id=$1`, [id]), (error: any) => error.code === '23514');
    await assert.rejects(pool.query(`UPDATE events SET workflow_version=2 WHERE project_id=$1 AND event_type='PRODUCT_DISCOVERY_STARTED'`, [id]), (error: any) => error.code === '23514');
  });

  test('keeps v2 transitions available while v3 follows the baseline gate', async (t) => {
    const legacy = await project(2, 'WAITING_FOR_PRODUCT_COMMITMENT');
    const current = await project(3, 'WAITING_FOR_PRODUCT_COMMITMENT');
    t.after(async () => { await cleanup(legacy); await cleanup(current); });
    const client = await pool.connect();
    try {
      assert.equal(await transitionTarget(client, legacy, 'PRODUCT_COMMITMENT_APPROVED'), 'PRODUCT_COMMITMENT');
      assert.equal(await transitionTarget(client, current, 'PRODUCT_COMMITMENT_APPROVED'), 'TECHNOLOGY_SELECTION_PREPARING');
    }
    finally { client.release(); }
  });

  test('archives every active v3 baseline state', async (t) => {
    const states = ['TECHNOLOGY_SELECTION_PREPARING', 'TECHNOLOGY_BASELINE_IN_REVIEW', 'WAITING_FOR_TECHNOLOGY_BASELINE', 'READY_FOR_MODULE_MATERIALIZATION'];
    const ids = await Promise.all(states.map((state) => project(3, state)));
    t.after(async () => { for (const id of ids) await cleanup(id); });
    for (const id of ids) {
      const result = await archiveProject(id, { confirmed: true, reason: 'Encerrar cenário v3' });
      assert.equal(result.state, 'ARCHIVED');
    }
  });
}
