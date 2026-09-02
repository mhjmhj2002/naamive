import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET='gat03-fix-01-bootstrap-secret-long-enough';

if (!process.env.DATABASE_URL) {
  test('GAT-03-FIX-01 requer PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-project-creator-rbac-grants-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= resolve(process.cwd(), '../../..');
  process.env.NAAMIVE_OPERATOR_ID ??= 'gat03-fix01-legacy-operator';
  const { pool } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const prefix = `gat03fix-${randomUUID().slice(0, 8)}`;
  const projectA = `${prefix}-a`, projectB = `${prefix}-b`, failedProject = `${prefix}-atomic`;
  const adminUsername = `${prefix}-admin`, observerUsername = `${prefix}-observer`, serviceUsername = `${prefix}-service`;
  const origin = 'http://127.0.0.1:3000';
  const call = (base: string, path: string, init: RequestInit = {}) => fetch(`${base}${path}`, { ...init, headers: { origin, ...init.headers } });
  const cookie = (response: Response) => String(response.headers.get('set-cookie') ?? '').split(';')[0];
  const assertStatus = async (response: Response, expected: number) => {
    if (response.status !== expected) assert.equal(response.status, expected, await response.text());
  };
  const intake = (projectId: string) => ({
    project_id: projectId,
    repository_path: resolve(process.cwd(), '../../..'),
    base_branch: 'main',
    dirty_tree_confirmation: { confirmed: true, reason: 'E2E project creator RBAC regression.' },
    title: `Project creator grants ${projectId}`,
    business_owner: 'Operações',
    business_problem: 'O criador precisa continuar o fluxo do projeto.',
    desired_outcome: 'Acesso ordinário limitado ao projeto criado.',
    success_metrics: ['Projeção e intake acessíveis'],
    stakeholders: ['Operações'],
    known_constraints: ['Sem autoridade de gate implícita'],
    evidence_sources: ['Teste E2E PostgreSQL'],
    assumptions: ['Clone Git local disponível'],
    open_questions: ['Nenhuma']
  });
  const cleanup = async () => {
    for (const projectId of [projectA, projectB, failedProject]) {
      await pool.query(`DELETE FROM events WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM operations WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM intake_revisions WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM artifacts WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`, [projectId]);
      await pool.query(`DELETE FROM projects WHERE id=$1`, [projectId]);
    }
    await pool.query(`DELETE FROM auth_audit_records WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_sessions WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_role_grants WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_credentials WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_principals WHERE username IN ($1,$2,$3)`, [adminUsername, observerUsername, serviceUsername]);
  };

  test('GAT-03-FIX-01 concede somente grants ordinários ao criador e mantém a criação atômica', async t => {
    await cleanup();
    const server = createApiServer();
    await new Promise<void>(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    const triggerName = `gat03fix_grant_trigger_${randomUUID().replaceAll('-', '')}`;
    const functionName = `gat03fix_grant_failure_${randomUUID().replaceAll('-', '')}`;
    t.after(async () => {
      await pool.query(`DROP TRIGGER IF EXISTS ${triggerName} ON auth_role_grants`);
      await pool.query(`DROP FUNCTION IF EXISTS ${functionName}()`);
      server.close();
      await cleanup();
      await pool.end();
    });

    const bootstrap = await call(base, '/api/auth/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json', 'x-naamive-bootstrap-secret': process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET! }, body: JSON.stringify({ username: adminUsername, password: 'senha-admin-segura-123' }) });
    await assertStatus(bootstrap, 201);
    const creatorId = (await bootstrap.json() as { principal_id: string }).principal_id;
    const login = await call(base, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: adminUsername, password: 'senha-admin-segura-123' }) });
    await assertStatus(login, 200);
    const session = await login.json() as { csrf_token: string };
    const creatorHeaders = { cookie: cookie(login), 'x-csrf-token': session.csrf_token };
    const creatorCall = (path: string, init: RequestInit = {}) => call(base, path, { ...init, headers: { ...creatorHeaders, ...init.headers } });

    const created = await creatorCall('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake(projectA)) });
    await assertStatus(created, 201);
    const grants = (await pool.query(`SELECT role_code,action_code,project_id,resource_type,resource_id FROM auth_role_grants WHERE principal_id=$1 AND project_id=$2 AND status='ACTIVE' ORDER BY action_code`, [creatorId, projectA])).rows;
    assert.deepEqual(grants, [
      { role_code: 'OPERATOR', action_code: 'OPERATE_PROJECT', project_id: projectA, resource_type: null, resource_id: null },
      { role_code: 'OPERATOR', action_code: 'READ_PROJECT', project_id: projectA, resource_type: null, resource_id: null }
    ]);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM auth_role_grants WHERE principal_id=$1 AND project_id=$2 AND action_code='DECIDE_CATALOG_GATE' AND status='ACTIVE'`, [creatorId, projectA])).rows[0].n, 0);
    assert.deepEqual((await pool.query(`SELECT submitted_by,created_by,updated_by FROM projects WHERE id=$1`, [projectA])).rows[0], { submitted_by: creatorId, created_by: creatorId, updated_by: creatorId });
    assert.equal((await pool.query(`SELECT actor_id FROM events WHERE project_id=$1 AND event_type='PROJECT_CREATED'`, [projectA])).rows[0].actor_id, creatorId);
    assert.equal((await creatorCall('/api/projects')).status, 200);
    assert.equal((await creatorCall(`/api/projects/${projectA}/projection`)).status, 200);
    const events = await creatorCall(`/api/projects/${projectA}/events`);
    assert.equal(events.status, 200);
    await events.body?.cancel();
    assert.equal((await creatorCall(`/api/projects/${projectA}/intake`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake(projectA)) })).status, 200);
    assert.equal((await creatorCall(`/api/projects/${projectA}/submit`, { method: 'POST', headers: { 'idempotency-key': `${prefix}-submit` } })).status, 202);

    const observerCreate = await creatorCall('/api/admin/auth/principals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: observerUsername, password: 'senha-observer-segura-123', grants: [{ role_code: 'OPERATOR', action_code: 'CREATE_PROJECT' }, { role_code: 'OPERATOR', action_code: 'LIST_PROJECTS' }] }) });
    await assertStatus(observerCreate, 201);
    const observerLogin = await call(base, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: observerUsername, password: 'senha-observer-segura-123' }) });
    await assertStatus(observerLogin, 200);
    const observer = await observerLogin.json() as { csrf_token: string };
    const observerHeaders = { cookie: cookie(observerLogin), 'x-csrf-token': observer.csrf_token };
    const observerCall = (path: string, init: RequestInit = {}) => call(base, path, { ...init, headers: { ...observerHeaders, ...init.headers } });
    assert.equal((await observerCall(`/api/projects/${projectA}/projection`)).status, 403);

    const projectBCreate = await observerCall('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake(projectB)) });
    await assertStatus(projectBCreate, 201);
    assert.equal((await observerCall(`/api/projects/${projectB}/projection`)).status, 200);
    assert.equal((await observerCall(`/api/projects/${projectA}/projection`)).status, 403);
    assert.equal((await creatorCall(`/api/projects/${projectB}/projection`)).status, 403);

    const serviceCreate = await creatorCall('/api/admin/auth/service-principals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: serviceUsername, grants: [{ role_code: 'WORKER_SERVICE', action_code: 'WORKER_EXECUTE', project_id: projectA }] }) });
    await assertStatus(serviceCreate, 201);
    const service = await serviceCreate.json() as { principal_id: string; credential: string };
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM auth_role_grants WHERE principal_id=$1 AND role_code='OPERATOR' AND action_code IN ('READ_PROJECT','OPERATE_PROJECT') AND project_id IN ($2,$3)`, [service.principal_id, projectA, projectB])).rows[0].n, 0);
    assert.equal((await call(base, `/api/projects/${projectA}/projection`, { headers: { authorization: `Service ${service.principal_id}:${service.credential}` } })).status, 403);

    const duplicate = await creatorCall('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake(projectA)) });
    assert.equal(duplicate.status, 409);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM auth_role_grants WHERE principal_id=$1 AND project_id=$2 AND role_code='OPERATOR' AND action_code IN ('READ_PROJECT','OPERATE_PROJECT') AND status='ACTIVE'`, [creatorId, projectA])).rows[0].n, 2);

    await pool.query(`CREATE FUNCTION ${functionName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.project_id = '${failedProject}' THEN RAISE EXCEPTION 'GAT03_FIX01_GRANT_PERSISTENCE_FAILED'; END IF; RETURN NEW; END; $$`);
    await pool.query(`CREATE TRIGGER ${triggerName} BEFORE INSERT ON auth_role_grants FOR EACH ROW EXECUTE FUNCTION ${functionName}()`);
    const failed = await creatorCall('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(intake(failedProject)) });
    assert.equal(failed.status, 500);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM projects WHERE id=$1`, [failedProject])).rows[0].n, 0);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM auth_role_grants WHERE principal_id=$1 AND project_id=$2`, [creatorId, failedProject])).rows[0].n, 0);
  });
}
