import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import test, { after } from 'node:test';
import type { AuthenticatedPrincipal } from './auth.js';

if (!process.env.DATABASE_URL) {
  test('UI-01 focused PostgreSQL validation requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { authorize, matchAuthorization, resolveCapability, createServicePrincipal } = await import('./auth.js');
  const { buildStateActionProjection, STATE_ACTION_PROJECTION_SCHEMA, workflowKind } = await import('./state-action-projection.js');
  const { createApiServer } = await import('./server.js');
  after(async () => { await pool.end(); });

  const principal = (id = randomUUID(), type: 'HUMAN' | 'SERVICE' = 'HUMAN'): AuthenticatedPrincipal => ({ id, type, username: `ui01-${id.slice(0, 12)}` });
  const insertPrincipal = async (value: AuthenticatedPrincipal) => {
    await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,$2,$3)`, [value.id, value.type, value.username]);
  };
  const grant = async (value: AuthenticatedPrincipal, action: string, role: string, projectId: string | null = null, resourceType: string | null = null, resourceId: string | null = null, expiresAt: string | null = null) => {
    const id = randomUUID();
    await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [id, value.id, role, action, projectId, resourceType, resourceId, expiresAt]);
    return id;
  };
  const cleanupPrincipals = async (ids: string[]) => {
    if (!ids.length) return;
    await pool.query(`DELETE FROM auth_audit_records WHERE principal_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM auth_sessions WHERE principal_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM auth_role_grants WHERE principal_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM auth_credentials WHERE principal_id = ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM auth_principals WHERE id = ANY($1::uuid[])`, [ids]);
  };

  test('UI-01 authorization matching is read-only, scope-aware, and shared with command auditing', async t => {
    const human = principal();
    const service = principal(randomUUID(), 'SERVICE');
    t.after(async () => { await cleanupPrincipals([human.id, service.id]); });
    await insertPrincipal(human); await insertPrincipal(service);
    const projectId = `ui01-auth-${randomUUID().slice(0, 8)}`, resourceId = randomUUID();
    const activeGrant = await grant(human, 'OPERATE_PROJECT', 'OPERATOR', projectId, 'WORK_ITEM', resourceId);
    const requirement = { action: 'OPERATE_PROJECT', projectId, resourceType: 'WORK_ITEM', resourceId, roles: ['OPERATOR'] };
    const now = new Date('2026-08-29T12:00:00.000Z');
    const auditBefore = Number((await pool.query(`SELECT count(*) FROM auth_audit_records WHERE principal_id=$1`, [human.id])).rows[0].count);
    assert.equal((await resolveCapability(human, requirement, now)).allowed, true);
    assert.equal((await resolveCapability(human, { ...requirement, projectId: 'another-project' }, now)).allowed, false);
    assert.equal((await resolveCapability(human, { ...requirement, resourceId: randomUUID() }, now)).allowed, false);
    assert.equal((await resolveCapability(human, { ...requirement, roles: ['BUSINESS_OWNER'] }, now)).allowed, false);
    await pool.query(`UPDATE auth_role_grants SET expires_at=$2 WHERE id=$1`, [activeGrant, '2026-08-29T11:59:59.000Z']);
    assert.equal((await resolveCapability(human, requirement, now)).allowed, false, 'expired grants are denied at the supplied snapshot instant');
    await pool.query(`UPDATE auth_role_grants SET expires_at=NULL,status='REVOKED',revoked_at=clock_timestamp() WHERE id=$1`, [activeGrant]);
    assert.equal((await resolveCapability(human, requirement, now)).allowed, false, 'revoked grants are denied');
    await pool.query(`UPDATE auth_role_grants SET status='ACTIVE',revoked_at=NULL WHERE id=$1`, [activeGrant]);
    assert.equal((await resolveCapability(human, { action: 'DELIVERY_EXECUTE', projectId }, now)).allowed, false, 'HUMAN never receives service-only actions');
    assert.equal((await resolveCapability(service, { action: 'DELIVERY_PAUSE_RESUME', projectId }, now)).allowed, false, 'SERVICE never receives human-only actions');
    assert.equal(Number((await pool.query(`SELECT count(*) FROM auth_audit_records WHERE principal_id=$1`, [human.id])).rows[0].count), auditBefore, 'capability probing writes no audit record');
    const command = await authorize(human, requirement);
    assert.equal(command.grantId, activeGrant, 'command enforcement uses the same matching grant');
    assert.equal(Number((await pool.query(`SELECT count(*) FROM auth_audit_records WHERE principal_id=$1`, [human.id])).rows[0].count), auditBefore + 1, 'authorize retains command auditing');
    assert.equal((await matchAuthorization(human, requirement, now)).allowed, true, 'the underlying matcher agrees with resolveCapability and authorize');
  });

  const fixture = async () => {
    const projectId = `ui01-projection-${randomUUID().slice(0, 8)}`;
    const moduleId = randomUUID(), revisionId = randomUUID(), roundId = randomUUID(), workItemId = randomUUID(), intakeRevisionId = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'UI-01 projection','owner','test','/tmp','local','main','000','PROJECT_DISCOVERY',4,'IMPLEMENTATION','{}')`, [projectId]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}','ui01-structured','ui01-markdown','memory://ui01','test')`, [intakeRevisionId, projectId]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'ui01-module',1,'{}','APPROVED')`, [revisionId, projectId]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'ui01-module',$3,'PLANNING_IN_PROGRESS','MODULE_DELIVERY',2)`, [moduleId, projectId, revisionId]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`, [roundId, moduleId, revisionId]);
    await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$5,'UI-01 work item','{}','WAITING_FOR_EXTERNAL_INPUT','WORK_ITEM_DELIVERY',2)`, [workItemId, projectId, moduleId, revisionId, roundId]);
    await pool.query(`INSERT INTO work_item_external_blockers(id,work_item_id,dependency_id,justification) VALUES($1,$2,'dependency-ui01','waiting for external fact')`, [randomUUID(), workItemId]);
    await pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload) VALUES($1,'UI01_FIXTURE_EVENT',$2,'{}')`, [projectId, randomUUID()]);
    return {
      projectId, moduleId, revisionId, roundId, workItemId, intakeRevisionId,
      cleanup: async () => {
        await pool.query(`DELETE FROM events WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM operations WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM gate_decisions WHERE gate_id IN (SELECT id FROM gate_records WHERE project_id=$1)`, [projectId]);
        await pool.query(`DELETE FROM gate_records WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM resume_records WHERE pause_id IN (SELECT id FROM pause_records WHERE project_id=$1)`, [projectId]);
        await pool.query(`DELETE FROM pause_records WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM cancellation_records WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM work_item_external_blockers WHERE work_item_id=$1`, [workItemId]);
        await pool.query(`DELETE FROM work_items WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM module_rounds WHERE module_id=$1`, [moduleId]);
        await pool.query(`DELETE FROM modules WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM module_revisions WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM intake_revisions WHERE id=$1`, [intakeRevisionId]);
        await pool.query(`DELETE FROM projects WHERE id=$1`, [projectId]);
      }
    };
  };

  test('UI-01 projection preserves resource truth, activity cardinality, legacy fail-closed behavior, descriptors, and snapshot time', async t => {
    const f = await fixture(); const human = principal();
    t.after(async () => { await cleanupPrincipals([human.id]); await f.cleanup(); });
    await insertPrincipal(human);
    await grant(human, 'READ_PROJECT', 'OPERATOR', f.projectId);
    await grant(human, 'DECIDE_CATALOG_GATE', 'TECH_LEAD', f.projectId, 'MODULE', f.moduleId);
    await grant(human, 'DELIVERY_PAUSE_RESUME', 'ON_CALL_OWNER', f.projectId, 'PROJECT', f.projectId);
    await grant(human, 'OPERATE_PROJECT', 'OPERATOR', f.projectId, 'WORK_ITEM', f.workItemId);
    const gateId = randomUUID();
    await pool.query(`INSERT INTO gate_records(id,project_id,gate_code,catalog_version,scope_type,scope_id,condition_code,evidence,reason,authority_roles,allowed_decisions,decision_effects,correlation_id,idempotency_key) VALUES($1,$2,'MATERIAL_ARCHITECTURE',1,'MODULE',$3,'MATERIALITY_POLICY_MATCHED','{}','UI-01 descriptor proof',$4,$5,'{}',$6,$7)`, [gateId, f.projectId, f.moduleId, JSON.stringify(['TECH_LEAD']), JSON.stringify(['APPROVE', 'REWORK']), randomUUID(), `ui01-gate:${gateId}`]);
    const job = async (status: 'LEASED' | 'PENDING' | 'RETRYABLE', moduleId: string | null, seconds = 60) => {
      const operationId = randomUUID(), jobId = randomUUID();
      await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'UI01_ACTIVITY','QUEUED',$3,$4,$5)`, [operationId, f.projectId, `ui01-operation:${operationId}`, randomUUID(), f.intakeRevisionId]);
      await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,module_id,kind,status,lease_expires_at,idempotency_key) VALUES($1,$2,$3,$4,$5,'UI01_ACTIVITY',$6,CASE WHEN $6='LEASED' THEN clock_timestamp()+($7 || ' seconds')::interval ELSE NULL END,$8)`, [jobId, operationId, f.projectId, f.intakeRevisionId, moduleId, status, seconds, `ui01-job:${jobId}`]);
    };
    await job('LEASED', f.moduleId); await job('LEASED', null); await job('PENDING', f.moduleId); await job('RETRYABLE', f.moduleId); await job('LEASED', f.moduleId, -60);
    const projection = await buildStateActionProjection(f.projectId, human);
    assert.equal(projection.schema_version, STATE_ACTION_PROJECTION_SCHEMA);
    for (const key of ['project_id', 'as_of_event_id', 'project', 'resources', 'activity', 'stop', 'cause', 'next_action', 'allowed_actions']) assert.ok(key in projection);
    assert.equal(projection.project.lifecycle_state, 'IMPLEMENTATION');
    assert.equal(projection.resources.modules[0].lifecycle_state, 'PLANNING_IN_PROGRESS');
    assert.equal(projection.resources.work_items[0].lifecycle_state, 'WAITING_FOR_EXTERNAL_INPUT');
    assert.equal(projection.project.journey_status, 'IMPLEMENTATION', 'journey status never replaces lifecycle state');
    assert.equal(projection.project.legacy, false);
    assert.equal(projection.activity.running_count, 2); assert.equal(projection.activity.queued_count, 1); assert.equal(projection.activity.retryable_count, 1);
    assert.equal(projection.activity.state, 'RUNNING');
    assert.ok(projection.activity.items.some(item => item.state === 'UNKNOWN'), 'an expired lease remains visible but is not running');
    assert.equal(projection.activity.items.length, 5, 'concurrent facts remain individually represented');
    const gate = projection.allowed_actions.find(action => action.code === 'DECIDE_GATE');
    assert.ok(gate);
    assert.deepEqual(Object.keys(gate).sort(), ['code', 'command', 'confirmation', 'expected', 'input', 'target']);
    assert.equal(gate.command.method, 'POST'); assert.ok(gate.command.href.includes('/catalog-gates/')); assert.equal(gate.command.idempotency_required, true);
    assert.equal(gate.expected.gate_version, 1); assert.equal(gate.expected.as_of_event_id, projection.as_of_event_id);
    assert.equal(gate.confirmation.required, true); assert.ok(gate.input.schema); assert.deepEqual(gate.input.required_fields, gate.input.schema!.required);
    const blocker = projection.allowed_actions.find(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER');
    assert.equal(blocker?.expected.resource_version, 1, 'a representative recovery descriptor includes the resource version');
    assert.ok(projection.allowed_actions.some(action => action.code === 'PAUSE_PROJECT'));
    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE principal_id=$1 AND action_code='DECIDE_CATALOG_GATE'`, [human.id]);
    assert.equal((await buildStateActionProjection(f.projectId, human)).allowed_actions.some(action => action.code === 'DECIDE_GATE'), false, 'descriptors disappear as soon as the capability is absent');
    const pauseId = randomUUID();
    await pool.query(`INSERT INTO pause_records(id,resource_kind,resource_id,project_id,previous_active_state,workflow_code,workflow_version,normative_generation,reason,evidence,actor_id,authority_role,idempotency_key,pause_fence) VALUES($1,'PROJECT',$2,$2,'IMPLEMENTATION','PROJECT_DISCOVERY',4,'ui01','UI-01 stop precedence','{}',$3,'ON_CALL_OWNER',$4,1)`, [pauseId, f.projectId, human.id, `ui01-pause:${pauseId}`]);
    const paused = await buildStateActionProjection(f.projectId, human);
    assert.equal(paused.activity.state, 'PAUSED'); assert.ok(paused.activity.items.some(item => item.state === 'RUNNING'));
    const resume = paused.allowed_actions.find(action => action.code === 'RESUME_PROJECT');
    assert.equal(resume?.expected.pause_version, 1); assert.equal(resume?.expected.fence, '1');
    await pool.query(`INSERT INTO cancellation_records(id,resource_kind,resource_id,project_id,reason,evidence,actor_id,authority_role,idempotency_key,cancellation_fence) VALUES($1,'PROJECT',$2,$2,'UI-01 cancellation precedence','{}',$3,'BUSINESS_OWNER',$4,1)`, [randomUUID(), f.projectId, human.id, `ui01-cancel:${f.projectId}`]);
    const cancelled = await buildStateActionProjection(f.projectId, human);
    assert.equal(cancelled.activity.state, 'CANCELLED'); assert.ok(cancelled.activity.items.some(item => item.state === 'RUNNING'));

    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE principal_id=$1 AND action_code='OPERATE_PROJECT'`, [human.id]);
    await pool.query(`UPDATE projects SET workflow_code='PROJECT_INTAKE',workflow_version=1,state='DRAFT' WHERE id=$1`, [f.projectId]);
    const legacy = await buildStateActionProjection(f.projectId, human);
    assert.equal(legacy.project.legacy, true);
    assert.deepEqual(legacy.allowed_actions.map(action => action.code), [], 'known legacy publishes only explicitly declared, authorized adapter actions');
    const unknown = workflowKind('UNKNOWN_UI01', 99, 'PUBLISHED');
    assert.deepEqual(unknown, { current: false, legacy: true, unknown: true, journey_status: 'LEGACY_READ_ONLY' });
    assert.deepEqual(legacy.allowed_actions, [], 'unknown workflow classification has no state-name action fallback');
  });

  test('UI-01 HTTP projection is actor-specific, audit-free on GET, rejects stale authority, and publishes generic SSE invalidation', async t => {
    const f = await fixture(); const human = principal(); const denied = principal(); const principalIds = [human.id, denied.id];
    const session = randomBytes(32).toString('base64url'), csrf = randomBytes(32).toString('base64url');
    t.after(async () => { await cleanupPrincipals(principalIds); await f.cleanup(); });
    await insertPrincipal(human); await insertPrincipal(denied);
    await pool.query(`INSERT INTO auth_sessions(id,principal_id,session_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+interval '1 hour')`, [randomUUID(), human.id, createHash('sha256').update(session).digest('hex'), createHash('sha256').update(csrf).digest('hex')]);
    await grant(human, 'READ_PROJECT', 'OPERATOR', f.projectId);
    const decisionGrant = await grant(human, 'DECIDE_CATALOG_GATE', 'TECH_LEAD', f.projectId, 'MODULE', f.moduleId);
    const gateId = randomUUID();
    await pool.query(`INSERT INTO gate_records(id,project_id,gate_code,catalog_version,scope_type,scope_id,condition_code,evidence,reason,authority_roles,allowed_decisions,decision_effects,correlation_id) VALUES($1,$2,'MATERIAL_ARCHITECTURE',1,'MODULE',$3,'MATERIALITY_POLICY_MATCHED','{}','UI-01 stale authority proof',$4,$5,'{}',$6)`, [gateId, f.projectId, f.moduleId, JSON.stringify(['TECH_LEAD']), JSON.stringify(['APPROVE']), randomUUID()]);
    const service = await createServicePrincipal({ username: `ui01svc-${randomUUID().slice(0, 10)}`, grants: [{ role_code: 'WORKER_SERVICE', action_code: 'READ_PROJECT', project_id: f.projectId }] });
    principalIds.push(service.principal_id);
    const server = createApiServer(); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); server.close(); });
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const headers = { cookie: `naamive_session=${session}`, 'x-csrf-token': csrf, origin: 'http://127.0.0.1:3000' };
    const rejectedRequest = async (path: string, init?: RequestInit) => {
      const warn = console.warn; console.warn = () => {};
      try { return await fetch(`${base}${path}`, init); } finally { console.warn = warn; }
    };
    assert.equal((await rejectedRequest(`/api/projects/${f.projectId}/projection`)).status, 401);
    assert.equal((await rejectedRequest(`/api/projects/${f.projectId}/projection`, { headers: { cookie: `naamive_session=not-a-session` } })).status, 401);
    const deniedSession = randomBytes(32).toString('base64url');
    await pool.query(`INSERT INTO auth_sessions(id,principal_id,session_hash,csrf_hash,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+interval '1 hour')`, [randomUUID(), denied.id, createHash('sha256').update(deniedSession).digest('hex'), createHash('sha256').update(randomBytes(32)).digest('hex')]);
    assert.equal((await rejectedRequest(`/api/projects/${f.projectId}/projection`, { headers: { cookie: `naamive_session=${deniedSession}` } })).status, 403);
    const before = Number((await pool.query(`SELECT count(*) FROM auth_audit_records WHERE principal_id=$1`, [human.id])).rows[0].count);
    const response = await fetch(`${base}/api/projects/${f.projectId}/projection`, { headers }); assert.equal(response.status, 200);
    const body = await response.json() as any;
    assert.equal(body.schema_version, STATE_ACTION_PROJECTION_SCHEMA); assert.ok(body.allowed_actions.some((action: any) => action.code === 'DECIDE_GATE'));
    assert.equal(Number((await pool.query(`SELECT count(*) FROM auth_audit_records WHERE principal_id=$1`, [human.id])).rows[0].count), before, 'GET capability discovery creates no audit rows');
    const serviceResponse = await fetch(`${base}/api/projects/${f.projectId}/projection`, { headers: { authorization: `Service ${service.principal_id}:${service.credential}` } });
    assert.equal(serviceResponse.status, 200); assert.deepEqual((await serviceResponse.json() as any).allowed_actions, [], 'service receives no human descriptor');
    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE id=$1`, [decisionGrant]);
    const stale = await rejectedRequest(`/api/projects/${f.projectId}/catalog-gates/${gateId}/decision`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json', 'idempotency-key': `ui01-stale:${gateId}` }, body: JSON.stringify({ version: 1, decision: 'APPROVE', reason: 'stale authority', evidence: {} }) });
    assert.equal(stale.status, 403, 'a projection descriptor never grants command authority');
    const controller = new AbortController();
    const sse = await fetch(`${base}/api/projects/${f.projectId}/events`, { headers, signal: controller.signal }); assert.equal(sse.status, 200);
    const reader = sse.body!.getReader(); const first = await reader.read(); await reader.cancel(); controller.abort();
    const transport = new TextDecoder().decode(first.value);
    assert.match(transport, /event: UI01_FIXTURE_EVENT/);
    assert.equal((transport.match(/data: \{/g) ?? []).length, 2, 'one durable timeline item is emitted as both named and generic SSE');
  });
}
