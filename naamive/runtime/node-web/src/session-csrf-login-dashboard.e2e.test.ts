import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET = 'gat03-fix-02-bootstrap-secret-long-enough';

if (!process.env.DATABASE_URL) {
  test('GAT-03-FIX-02 requer PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-session-csrf-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= resolve(process.cwd(), '../../..');
  process.env.NAAMIVE_OPERATOR_ID ??= 'gat03-fix02-legacy-operator';
  const { pool } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const prefix = `gat03session-${randomUUID().slice(0, 8)}`;
  const adminUsername = `${prefix}-admin`, observerUsername = `${prefix}-observer`, serviceUsername = `${prefix}-service`, projectId = `${prefix}-project`;
  const origin = 'http://127.0.0.1:3000';
  const call = (base: string, path: string, init: RequestInit = {}) => fetch(`${base}${path}`, { ...init, headers: { origin, ...init.headers } });
  const cookie = (response: Response) => String(response.headers.get('set-cookie') ?? '').split(';')[0];
  const body = (id: string) => ({
    project_id: id, repository_path: resolve(process.cwd(), '../../..'), base_branch: 'main',
    dirty_tree_confirmation: { confirmed: true, reason: 'GAT-03-FIX-02 session/CSRF regression.' },
    title: `Session restoration ${id}`, business_owner: 'Operações',
    business_problem: 'Uma sessão válida deve continuar mutável após reload.',
    desired_outcome: 'CSRF é restaurado de forma segura.', success_metrics: ['Operação mutável aceita'],
    stakeholders: ['Operações'], known_constraints: ['Sem autoridade adicional'],
    evidence_sources: ['Teste E2E PostgreSQL'], assumptions: ['Clone Git local disponível'], open_questions: ['Nenhuma']
  });
  const cleanup = async () => {
    await pool.query(`DELETE FROM events WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM operations WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM intake_revisions WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM artifacts WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`, [projectId]);
    await pool.query(`DELETE FROM projects WHERE id=$1`, [projectId]);
    await pool.query(`DELETE FROM auth_audit_records WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_sessions WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_role_grants WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_credentials WHERE principal_id IN (SELECT id FROM auth_principals WHERE username IN ($1,$2,$3))`, [adminUsername, observerUsername, serviceUsername]);
    await pool.query(`DELETE FROM auth_principals WHERE username IN ($1,$2,$3)`, [adminUsername, observerUsername, serviceUsername]);
  };

  test('GAT-03-FIX-02 restaura sessão/CSRF após reload sem novo login e mantém falha fechada', async t => {
    await cleanup();
    const server = createApiServer();
    await new Promise<void>(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
    const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    t.after(async () => { server.close(); await cleanup(); await pool.end(); });

    const anonymousRoot = await call(base, '/', { redirect: 'manual' });
    assert.equal(anonymousRoot.status, 302);
    assert.equal(anonymousRoot.headers.get('location'), '/login');
    assert.equal((await call(base, '/api/auth/session')).status, 401, 'missing cookie fails closed');
    assert.equal((await call(base, '/api/auth/session', { headers: { cookie: 'naamive_session=invalid' } })).status, 401, 'invalid cookie fails closed');

    const bootstrap = await call(base, '/api/auth/bootstrap', { method: 'POST', headers: { 'content-type': 'application/json', 'x-naamive-bootstrap-secret': process.env.NAAMIVE_AUTH_BOOTSTRAP_SECRET! }, body: JSON.stringify({ username: adminUsername, password: 'senha-admin-segura-123' }) });
    assert.equal(bootstrap.status, 201);
    const login = await call(base, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: adminUsername, password: 'senha-admin-segura-123' }) });
    assert.equal(login.status, 200);
    const initial = await login.json() as { csrf_token: string };
    const adminCookie = cookie(login);
    assert.match(initial.csrf_token, /^[A-Za-z0-9_-]{32,}$/);
    assert.equal((await call(base, '/', { headers: { cookie: adminCookie }, redirect: 'manual' })).status, 200, 'valid session opens the application');
    assert.equal((await call(base, '/login', { headers: { cookie: adminCookie }, redirect: 'manual' })).headers.get('location'), '/', 'valid session avoids redundant login');

    // This is the reload boundary: only the HttpOnly cookie survives, then the
    // new app load explicitly obtains a fresh CSRF token from that session.
    const restoredResponse = await call(base, '/api/auth/session', { headers: { cookie: adminCookie } });
    assert.equal(restoredResponse.status, 200);
    const restored = await restoredResponse.json() as { principal: { username: string }; csrf_token: string };
    assert.equal(restored.principal.username, adminUsername);
    assert.match(restored.csrf_token, /^[A-Za-z0-9_-]{32,}$/);
    assert.notEqual(restored.csrf_token, initial.csrf_token);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM auth_audit_records WHERE action_code='AUTH_LOGIN' AND principal_id=(SELECT id FROM auth_principals WHERE username=$1)`, [adminUsername])).rows[0].n, 1, 'restoration never performs another password login');

    const post = (headers: HeadersInit) => call(base, '/api/projects', { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body(projectId)) });
    assert.equal((await post({ cookie: adminCookie })).status, 403, 'missing CSRF remains rejected');
    assert.equal((await post({ cookie: adminCookie, 'x-csrf-token': initial.csrf_token })).status, 403, 'pre-reload CSRF is no longer accepted');
    const created = await post({ cookie: adminCookie, 'x-csrf-token': restored.csrf_token });
    assert.equal(created.status, 201, await created.text());
    assert.equal((await call(base, `/api/projects/${projectId}/projection`, { headers: { cookie: adminCookie } })).status, 200, 'GAT-03-FIX-01 creator grant and UI projection remain available');

    const adminHeaders = { cookie: adminCookie, 'x-csrf-token': restored.csrf_token, 'content-type': 'application/json' };
    const observerCreated = await call(base, '/api/admin/auth/principals', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ username: observerUsername, password: 'senha-observer-segura-123', grants: [] }) });
    assert.equal(observerCreated.status, 201);
    const observerLogin = await call(base, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: observerUsername, password: 'senha-observer-segura-123' }) });
    const observerCookie = cookie(observerLogin);
    const observerSession = await call(base, '/api/auth/session', { headers: { cookie: observerCookie } });
    assert.equal(observerSession.status, 200);
    assert.equal((await call(base, '/api/projects', { headers: { cookie: observerCookie } })).status, 403, 'session restoration does not grant project-list authority');
    const serviceCreated = await call(base, '/api/admin/auth/service-principals', { method: 'POST', headers: adminHeaders, body: JSON.stringify({ username: serviceUsername, grants: [{ role_code: 'WORKER_SERVICE', action_code: 'WORKER_EXECUTE', project_id: projectId }] }) });
    assert.equal(serviceCreated.status, 201);
    const service = await serviceCreated.json() as { principal_id: string; credential: string };
    assert.equal((await call(base, '/api/auth/session', { headers: { authorization: `Service ${service.principal_id}:${service.credential}` } })).status, 403, 'service credentials cannot enter the browser session-restoration flow');

    await pool.query(`UPDATE auth_sessions SET created_at=clock_timestamp()-interval '2 hours',expires_at=clock_timestamp()-interval '1 second' WHERE session_hash=$1`, [createHash('sha256').update(observerCookie.split('=')[1]).digest('hex')]);
    assert.equal((await call(base, '/api/auth/session', { headers: { cookie: observerCookie } })).status, 401, 'expired session cannot be restored');
    const revokedLogin = await call(base, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: observerUsername, password: 'senha-observer-segura-123' }) });
    const revokedCookie = cookie(revokedLogin);
    await pool.query(`UPDATE auth_sessions SET revoked_at=clock_timestamp() WHERE session_hash=$1`, [createHash('sha256').update(revokedCookie.split('=')[1]).digest('hex')]);
    assert.equal((await call(base, '/api/auth/session', { headers: { cookie: revokedCookie } })).status, 401, 'revoked session cannot be restored');

    const logout = await call(base, '/api/auth/logout', { method: 'POST', headers: { cookie: adminCookie, 'x-csrf-token': restored.csrf_token } });
    assert.equal(logout.status, 204);
    assert.equal((await call(base, '/api/auth/session', { headers: { cookie: adminCookie } })).status, 401, 'logout revokes the session used by reload restoration');
    assert.equal((await call(base, '/', { headers: { cookie: adminCookie }, redirect: 'manual' })).headers.get('location'), '/login', 'reload after logout remains on login');
  });
}
