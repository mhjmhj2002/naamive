import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { after } from 'node:test';
import { buildActionPayload } from '../web/action-payload.js';

if (!process.env.DATABASE_URL) {
  test('legacy product commitment descriptor requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const { testAuthenticatedHeaders } = await import('./test-auth.js');
  after(async () => { await pool.end(); });

  type Fixture = { projectId: string; gateId: string; gateVersion: number; cleanup(): Promise<void> };
  const fixture = async (suffix: string, workflowCode = 'PROJECT_DISCOVERY', workflowVersion = 3): Promise<Fixture> => {
    const projectId = `ui01-fix02-${suffix}-${randomUUID().slice(0, 8)}`;
    const gateId = randomUUID(), revisionId = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,'owner','test','/tmp','local','main','000',$3,$4,'WAITING_FOR_PRODUCT_COMMITMENT','{}')`, [projectId, `UI-01-FIX-02 ${suffix}`, workflowCode, workflowVersion]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,'memory://ui01-fix02','test')`, [revisionId, projectId, `ui01-fix02-structured-${suffix}`, `ui01-fix02-markdown-${suffix}`]);
    await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id,evidence) VALUES($1,$2,'PRODUCT_COMMITMENT',$3,'{"persisted":true}')`, [gateId, projectId, revisionId]);
    return {
      projectId, gateId, gateVersion: 1,
      cleanup: async () => {
        await pool.query(`DELETE FROM events WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM artifacts WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM operations WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM gates WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM intake_revisions WHERE project_id=$1`, [projectId]);
        await pool.query(`DELETE FROM projects WHERE id=$1`, [projectId]);
      },
    };
  };

  test('PROJECT_DISCOVERY v3 publishes and executes the endpoint-compatible legacy product commitment descriptor', async t => {
    const approved = await fixture('approved');
    const rejected = await fixture('rejected');
    const guarded = await fixture('guarded');
    const unauthorized = await fixture('unauthorized');
    const unknownWorkflowId = randomUUID();
    const unknownCode = `UNKNOWN_UI01_FIX02_${randomUUID().slice(0, 8)}`;
    const unknown = await fixture('unknown');
    const sessions: Array<{ cleanup(): Promise<void> }> = [];
    const server = createApiServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    const request = (headers: Record<string, string>, path: string, init: RequestInit = {}) => fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
    t.after(async () => {
      server.closeAllConnections(); server.close();
      for (const session of sessions.reverse()) await session.cleanup();
      await pool.query(`UPDATE workflow_definitions SET status='RETIRED' WHERE id=$1`, [unknownWorkflowId]);
      await pool.query(`DELETE FROM workflow_states WHERE workflow_id=$1`, [unknownWorkflowId]);
      await pool.query(`DELETE FROM workflow_definitions WHERE id=$1`, [unknownWorkflowId]);
      await Promise.all([approved.cleanup(), rejected.cleanup(), guarded.cleanup(), unauthorized.cleanup(), unknown.cleanup()]);
    });

    await pool.query(`INSERT INTO workflow_definitions(id,code,version,scope,status,published_at) VALUES($1,$2,99,'PROJECT','PUBLISHED',clock_timestamp())`, [unknownWorkflowId, unknownCode]);
    await pool.query(`INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position) VALUES($1,'WAITING_FOR_PRODUCT_COMMITMENT','Unknown product commitment state',false,1)`, [unknownWorkflowId]);
    await pool.query(`UPDATE projects SET workflow_code=$2,workflow_version=99 WHERE id=$1`, [unknown.projectId, unknownCode]);

    const operator = await testAuthenticatedHeaders(approved.projectId, [
      { role_code: 'OPERATOR', action_code: 'READ_PROJECT' },
      { role_code: 'OPERATOR', action_code: 'OPERATE_PROJECT' },
    ]);
    sessions.push(operator);
    const projectionResponse = await request(operator.headers, `/api/projects/${approved.projectId}/projection`);
    assert.equal(projectionResponse.status, 200);
    const projection: any = await projectionResponse.json();
    const descriptor = projection.allowed_actions.find((action: any) => action.code === 'PRODUCT_COMMITMENT_DECISION');
    assert.ok(descriptor, 'the explicit PROJECT_DISCOVERY v3 adapter publishes the capability');
    assert.deepEqual(descriptor.target, { resource_kind: 'GATE', resource_id: approved.gateId });
    assert.deepEqual(descriptor.command, { method: 'POST', href: `/api/projects/${approved.projectId}/decision`, idempotency_required: true });
    assert.deepEqual(descriptor.input.schema.properties.decision.enum, ['APPROVED', 'REJECTED']);
    assert.deepEqual(descriptor.input_binding.decision_options, [
      { code: 'APPROVED', label: 'Aprovar', consequence: 'Aprova o compromisso; a transição seguinte é determinada pelo workflow persistido.' },
      { code: 'REJECTED', label: 'Solicitar ajustes', consequence: 'Registra o feedback e retorna pelo fluxo legado de ajustes.' },
    ]);
    assert.deepEqual(descriptor.input_binding.fields.map((field: any) => ({ name: field.name, source: field.source, value: field.value, send: field.send, editable: field.editable })), [
      { name: 'gate_id', source: 'SERVER_BOUND', value: approved.gateId, send: true, editable: false },
      { name: 'version', source: 'SERVER_BOUND', value: approved.gateVersion, send: true, editable: false },
      { name: 'decision', source: 'HUMAN_INPUT', value: undefined, send: true, editable: true },
      { name: 'feedback', source: 'HUMAN_INPUT', value: undefined, send: true, editable: true },
    ]);
    assert.equal(descriptor.input_binding.fields.some((field: any) => field.name === 'reason' || field.name === 'evidence'), false);
    assert.deepEqual(projection.next_action, { text: 'Decisão pendente no gate PRODUCT_COMMITMENT.', descriptor_code: 'PRODUCT_COMMITMENT_DECISION' });
    assert.deepEqual(buildActionPayload(new Map([['decision', 'APPROVED']]), descriptor.input_binding.fields), { gate_id: approved.gateId, version: approved.gateVersion, decision: 'APPROVED' }, 'the generic UI payload builder uses only descriptor bindings');
    const approval = await request(operator.headers, descriptor.command.href, { method: descriptor.command.method, headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-approved:${approved.projectId}` }, body: JSON.stringify(buildActionPayload(new Map([['decision', 'APPROVED']]), descriptor.input_binding.fields)) });
    const approvalBody: any = await approval.json();
    assert.equal(approval.status, 200, JSON.stringify(approvalBody));
    assert.equal((await pool.query(`SELECT status FROM gates WHERE id=$1`, [approved.gateId])).rows[0].status, 'APPROVED');
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM events WHERE project_id=$1 AND event_type='PRODUCT_COMMITMENT_APPROVED'`, [approved.projectId])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`, [approved.projectId])).rows[0].state, approvalBody.state);

    const rejector = await testAuthenticatedHeaders(rejected.projectId, [{ role_code: 'OPERATOR', action_code: 'READ_PROJECT' }, { role_code: 'OPERATOR', action_code: 'OPERATE_PROJECT' }]);
    sessions.push(rejector);
    const rejectedProjection: any = await (await request(rejector.headers, `/api/projects/${rejected.projectId}/projection`)).json();
    const rejectDescriptor = rejectedProjection.allowed_actions.find((action: any) => action.code === 'PRODUCT_COMMITMENT_DECISION');
    const rejectionPayload = buildActionPayload(new Map([['decision', 'REJECTED'], ['feedback', 'Ajustar a priorização do fluxo.']]), rejectDescriptor.input_binding.fields);
    const rejectedResponse = await request(rejector.headers, rejectDescriptor.command.href, { method: rejectDescriptor.command.method, headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-rejected:${rejected.projectId}` }, body: JSON.stringify(rejectionPayload) });
    assert.equal(rejectedResponse.status, 200, await rejectedResponse.text());
    assert.equal((await pool.query(`SELECT status FROM gates WHERE id=$1`, [rejected.gateId])).rows[0].status, 'REJECTED');
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM events WHERE project_id=$1 AND event_type='PRODUCT_COMMITMENT_ADJUSTMENTS_REQUESTED' AND payload->>'feedback'=$2`, [rejected.projectId, 'Ajustar a priorização do fluxo.'])).rows[0].n, 1);

    const guardSession = await testAuthenticatedHeaders(guarded.projectId, [{ role_code: 'OPERATOR', action_code: 'READ_PROJECT' }, { role_code: 'OPERATOR', action_code: 'OPERATE_PROJECT' }]);
    sessions.push(guardSession);
    const guardedProjection: any = await (await request(guardSession.headers, `/api/projects/${guarded.projectId}/projection`)).json();
    const guardedDescriptor = guardedProjection.allowed_actions.find((action: any) => action.code === 'PRODUCT_COMMITMENT_DECISION');
    const rejectWithoutFeedback = await request(guardSession.headers, guardedDescriptor.command.href, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-no-feedback:${guarded.projectId}` }, body: JSON.stringify(buildActionPayload(new Map([['decision', 'REJECTED']]), guardedDescriptor.input_binding.fields)) });
    assert.equal(rejectWithoutFeedback.status, 422); assert.equal((await rejectWithoutFeedback.json() as any).code, 'GATE_FEEDBACK_REQUIRED');
    const wrongGate = await request(guardSession.headers, guardedDescriptor.command.href, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-wrong-gate:${guarded.projectId}` }, body: JSON.stringify({ gate_id: randomUUID(), version: guarded.gateVersion, decision: 'APPROVED' }) });
    assert.equal(wrongGate.status, 409);
    const stale = await request(guardSession.headers, guardedDescriptor.command.href, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-stale:${guarded.projectId}` }, body: JSON.stringify({ gate_id: guarded.gateId, version: guarded.gateVersion + 1, decision: 'APPROVED' }) });
    assert.equal(stale.status, 409);
    const closeGate = await request(guardSession.headers, guardedDescriptor.command.href, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-close:${guarded.projectId}` }, body: JSON.stringify({ gate_id: guarded.gateId, version: guarded.gateVersion, decision: 'APPROVED' }) });
    assert.equal(closeGate.status, 200);
    const closed = await request(guardSession.headers, guardedDescriptor.command.href, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-closed:${guarded.projectId}` }, body: JSON.stringify({ gate_id: guarded.gateId, version: guarded.gateVersion, decision: 'APPROVED' }) });
    assert.equal(closed.status, 409);

    const denied = await testAuthenticatedHeaders(unauthorized.projectId, [{ role_code: 'OPERATOR', action_code: 'READ_PROJECT' }]);
    sessions.push(denied);
    const deniedProjection: any = await (await request(denied.headers, `/api/projects/${unauthorized.projectId}/projection`)).json();
    assert.equal(deniedProjection.allowed_actions.some((action: any) => action.code === 'PRODUCT_COMMITMENT_DECISION'), false);
    assert.deepEqual(deniedProjection.next_action, { text: 'Decisão pendente no gate PRODUCT_COMMITMENT.' });
    const deniedRequest = await request(denied.headers, `/api/projects/${unauthorized.projectId}/decision`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `ui01-fix02-denied:${unauthorized.projectId}` }, body: JSON.stringify({ gate_id: unauthorized.gateId, version: unauthorized.gateVersion, decision: 'APPROVED' }) });
    assert.equal(deniedRequest.status, 403);

    const unknownReader = await testAuthenticatedHeaders(unknown.projectId, [{ role_code: 'OPERATOR', action_code: 'READ_PROJECT' }, { role_code: 'OPERATOR', action_code: 'OPERATE_PROJECT' }]);
    sessions.push(unknownReader);
    const unknownProjection: any = await (await request(unknownReader.headers, `/api/projects/${unknown.projectId}/projection`)).json();
    assert.equal(unknownProjection.project.journey_status, 'LEGACY_READ_ONLY');
    assert.equal(unknownProjection.allowed_actions.some((action: any) => action.code === 'PRODUCT_COMMITMENT_DECISION'), false);
    assert.equal(unknownProjection.next_action, null, 'an unknown legacy workflow never becomes actionable from an equal state name');
  });
}
