import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import test, { after } from 'node:test';
import type { AuthenticatedPrincipal } from './auth.js';

if (!process.env.DATABASE_URL) {
  test('UI-01 focused PostgreSQL validation requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { authorize, matchAuthorization, resolveCapability, createServicePrincipal } = await import('./auth.js');
  const { buildStateActionProjection, STATE_ACTION_PROJECTION_SCHEMA } = await import('./state-action-projection.js');
  const { createApiServer } = await import('./server.js');
  const { buildActionPayload } = await import('../web/action-payload.js');
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
        await pool.query(`DELETE FROM gates WHERE project_id=$1`, [projectId]);
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
    const f = await fixture(); const human = principal(); const observer = principal();
    let unknownWorkflowId: string | null = null;
    let legacyCapabilityFixture: { projectId: string; intakeRevisionId: string } | null = null;
    t.after(async () => {
      if (unknownWorkflowId) {
        await pool.query(`UPDATE workflow_definitions SET status='RETIRED' WHERE id=$1`, [unknownWorkflowId]);
        await pool.query(`DELETE FROM workflow_states WHERE workflow_id=$1`, [unknownWorkflowId]);
        await pool.query(`DELETE FROM workflow_definitions WHERE id=$1`, [unknownWorkflowId]);
      }
      if (legacyCapabilityFixture) {
        await pool.query(`DELETE FROM gates WHERE project_id=$1`, [legacyCapabilityFixture.projectId]);
        await pool.query(`DELETE FROM intake_revisions WHERE id=$1`, [legacyCapabilityFixture.intakeRevisionId]);
        await pool.query(`DELETE FROM projects WHERE id=$1`, [legacyCapabilityFixture.projectId]);
      }
      await cleanupPrincipals([human.id, observer.id]); await f.cleanup();
    });
    await insertPrincipal(human); await insertPrincipal(observer);
    await grant(human, 'READ_PROJECT', 'OPERATOR', f.projectId);
    await grant(observer, 'READ_PROJECT', 'OPERATOR', f.projectId);
    await grant(human, 'DECIDE_CATALOG_GATE', 'TECH_LEAD', f.projectId, 'MODULE', f.moduleId);
    await grant(human, 'DELIVERY_PAUSE_RESUME', 'ON_CALL_OWNER', f.projectId, 'PROJECT', f.projectId);
    await grant(human, 'DELIVERY_CANCEL', 'BUSINESS_OWNER', f.projectId, 'PROJECT', f.projectId);
    await grant(human, 'DELIVERY_PAUSE_RESUME', 'ON_CALL_OWNER', f.projectId, 'MODULE', f.moduleId);
    await grant(human, 'DELIVERY_CANCEL', 'BUSINESS_OWNER', f.projectId, 'MODULE', f.moduleId);
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
    for (const key of ['project_id', 'as_of_event_id', 'project', 'resources', 'activity', 'stop', 'cause', 'next_action', 'allowed_actions', 'stop_surfaces']) assert.ok(key in projection);
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
    assert.deepEqual(Object.keys(gate).sort(), ['code', 'command', 'confirmation', 'descriptor_id', 'expected', 'input', 'input_binding', 'presentation', 'target']);
    assert.equal(gate.command.method, 'POST'); assert.ok(gate.command.href.includes('/catalog-gates/')); assert.equal(gate.command.idempotency_required, true);
    assert.equal(gate.expected.gate_version, 1); assert.equal(gate.expected.as_of_event_id, projection.as_of_event_id);
    assert.equal(gate.confirmation.required, true); assert.ok(gate.input.schema); assert.deepEqual(gate.input.required_fields, gate.input.schema!.required);
    assert.equal(gate.presentation.kind, 'HUMAN_DECISION'); assert.ok(gate.descriptor_id); assert.ok(gate.input_binding.decision_options?.length);
    const gateSurface = projection.stop_surfaces.find(surface => surface.action_descriptor_id === gate.descriptor_id);
    assert.equal(gateSurface?.resource_kind, 'GATE'); assert.equal(gateSurface?.type, 'MATERIAL_ARCHITECTURE');
    const blocker = projection.allowed_actions.find(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER');
    assert.equal(blocker?.expected.resource_version, 1, 'a representative recovery descriptor includes the resource version');
    assert.equal(blocker?.input_binding.fields.find(field => field.name === 'dependency_id')?.source, 'SERVER_BOUND');
    assert.equal(blocker?.input_binding.fields.some(field => field.name === 'dependency_id' && field.editable), false, 'the operator never types a technical dependency id');
    assert.deepEqual(buildActionPayload(new Map([['justification', 'External fact is now available']]), blocker?.input_binding.fields), { justification: 'External fact is now available', dependency_id: 'dependency-ui01' });
    await pool.query(`DELETE FROM work_item_external_blockers WHERE work_item_id=$1`, [f.workItemId]);
    const zeroBlockers = await buildStateActionProjection(f.projectId, human);
    assert.equal(zeroBlockers.allowed_actions.some(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER'), false, 'zero active blockers publishes no resolution capability');
    const blockerAId = randomUUID(), blockerBId = randomUUID();
    await pool.query(`INSERT INTO work_item_external_blockers(id,work_item_id,dependency_id,justification) VALUES($1,$2,'dependency-ui01-a','first active blocker'),($3,$2,'dependency-ui01-b','second active blocker')`, [blockerAId, f.workItemId, blockerBId]);
    const twoBlockers = await buildStateActionProjection(f.projectId, human);
    const blockerDescriptors = twoBlockers.allowed_actions.filter(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER');
    const blockerSurfaces = twoBlockers.stop_surfaces.filter(surface => surface.resource_kind === 'WORK_ITEM' && surface.resource_id === f.workItemId && surface.type === 'WAITING_FOR_EXTERNAL_INPUT');
    assert.equal(blockerDescriptors.length, 2, 'each active blocker receives its own executable capability');
    assert.equal(blockerSurfaces.length, 2, 'each active blocker has a distinct stop surface');
    assert.equal(new Set(blockerDescriptors.map(action => action.descriptor_id)).size, 2, 'descriptor ids are deterministic and unique before projection collision handling');
    assert.deepEqual(blockerDescriptors.map(action => action.input_binding.fields.find(field => field.name === 'dependency_id')?.value).sort(), ['dependency-ui01-a', 'dependency-ui01-b']);
    for (const action of blockerDescriptors) {
      const dependencyId = action.input_binding.fields.find(field => field.name === 'dependency_id')?.value;
      assert.deepEqual(action.input_binding.fields.filter(field => field.source === 'SERVER_BOUND').map(field => [field.name, field.value]), [['dependency_id', dependencyId]]);
      assert.deepEqual(buildActionPayload(new Map([['justification', 'External fact is now available']]), action.input_binding.fields), { justification: 'External fact is now available', dependency_id: dependencyId });
      assert.equal(blockerSurfaces.filter(surface => surface.action_descriptor_id === action.descriptor_id).length, 1, 'each blocker surface links to its exact descriptor');
    }
    const surfaceA = blockerSurfaces.find(surface => surface.id.endsWith(`blocker:${blockerAId}`));
    const surfaceB = blockerSurfaces.find(surface => surface.id.endsWith(`blocker:${blockerBId}`));
    assert.ok(surfaceA?.operational_message.includes('first active blocker')); assert.ok(surfaceB?.operational_message.includes('second active blocker'), 'cards carry allowlisted human context instead of a technical dependency id');
    const observerBlockers = await buildStateActionProjection(f.projectId, observer);
    assert.equal(observerBlockers.allowed_actions.some(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER'), false, 'a principal without the grant receives no blocker button');
    assert.ok(observerBlockers.stop_surfaces.some(surface => surface.resource_kind === 'WORK_ITEM' && surface.resource_id === f.workItemId && surface.type === 'WAITING_FOR_EXTERNAL_INPUT' && surface.action_descriptor_id === null), 'a principal without the grant still sees the external wait');
    await pool.query(`UPDATE work_item_external_blockers SET state='RESOLVED',resolved_at=clock_timestamp() WHERE id=$1`, [blockerAId]);
    await pool.query(`UPDATE work_items SET version=version+1 WHERE id=$1`, [f.workItemId]);
    const oneRemainingBlocker = await buildStateActionProjection(f.projectId, human);
    const remainingDescriptor = oneRemainingBlocker.allowed_actions.find(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER');
    const remainingSurface = oneRemainingBlocker.stop_surfaces.find(surface => surface.action_descriptor_id === remainingDescriptor?.descriptor_id);
    assert.equal(remainingSurface?.id, surfaceB?.id, 'resolving another blocker does not renumber or change this blocker surface identity');
    for (const code of ['PAUSE_PROJECT', 'CANCEL_PROJECT', 'PAUSE_MODULE', 'CANCEL_MODULE']) {
      const descriptor = projection.allowed_actions.find(action => action.code === code);
      assert.ok(descriptor, `${code} is published when the resource is active`);
      assert.ok(projection.stop_surfaces.some(surface => surface.action_descriptor_id === descriptor.descriptor_id), `${code} has its own actionable surface`);
    }
    const observerProjection = await buildStateActionProjection(f.projectId, observer);
    assert.equal(observerProjection.allowed_actions.some(action => ['PAUSE_PROJECT', 'CANCEL_PROJECT', 'PAUSE_MODULE', 'CANCEL_MODULE'].includes(action.code)), false);
    assert.ok(observerProjection.stop_surfaces.some(surface => surface.type === 'CANCEL_PROJECT' && surface.action_descriptor_id === null), 'an ungranted principal still receives an explanatory cancellation surface');
    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE principal_id=$1 AND action_code='DECIDE_CATALOG_GATE'`, [human.id]);
    assert.equal((await buildStateActionProjection(f.projectId, human)).allowed_actions.some(action => action.code === 'DECIDE_GATE'), false, 'descriptors disappear as soon as the capability is absent');
    const pauseId = randomUUID();
    await pool.query(`INSERT INTO pause_records(id,resource_kind,resource_id,project_id,previous_active_state,workflow_code,workflow_version,normative_generation,reason,evidence,actor_id,authority_role,idempotency_key,pause_fence) VALUES($1,'PROJECT',$2,$2,'IMPLEMENTATION','PROJECT_DISCOVERY',4,'ui01','UI-01 stop precedence','{}',$3,'ON_CALL_OWNER',$4,1)`, [pauseId, f.projectId, human.id, `ui01-pause:${pauseId}`]);
    const paused = await buildStateActionProjection(f.projectId, human);
    assert.equal(paused.activity.state, 'PAUSED'); assert.ok(paused.activity.items.some(item => item.state === 'RUNNING'));
    const resume = paused.allowed_actions.find(action => action.code === 'RESUME_PROJECT');
    assert.equal(resume?.expected.pause_version, 1); assert.equal(resume?.expected.fence, '1');
    assert.ok(paused.allowed_actions.some(action => action.code === 'CANCEL_PROJECT'), 'project cancellation remains available while paused');
    assert.ok(paused.stop_surfaces.some(surface => surface.resource_kind === 'PROJECT' && surface.type === 'PAUSED' && surface.action_descriptor_id === resume?.descriptor_id));
    assert.ok(paused.stop_surfaces.some(surface => surface.type === 'CANCEL_PROJECT' && surface.action_descriptor_id === paused.allowed_actions.find(action => action.code === 'CANCEL_PROJECT')?.descriptor_id));
    const modulePauseId = randomUUID();
    await pool.query(`INSERT INTO pause_records(id,resource_kind,resource_id,project_id,previous_active_state,workflow_code,workflow_version,normative_generation,reason,evidence,actor_id,authority_role,idempotency_key,pause_fence) VALUES($1,'MODULE',$2,$3,'PLANNING_IN_PROGRESS','MODULE_DELIVERY',2,'ui01','UI-01 module pause','{}',$4,'ON_CALL_OWNER',$5,1)`, [modulePauseId, f.moduleId, f.projectId, human.id, `ui01-module-pause:${modulePauseId}`]);
    const modulePaused = await buildStateActionProjection(f.projectId, human);
    const moduleResume = modulePaused.allowed_actions.find(action => action.code === 'RESUME_MODULE');
    const moduleCancel = modulePaused.allowed_actions.find(action => action.code === 'CANCEL_MODULE');
    assert.ok(moduleResume); assert.ok(moduleCancel, 'module cancellation remains available while paused');
    assert.ok(modulePaused.stop_surfaces.some(surface => surface.resource_kind === 'MODULE' && surface.type === 'PAUSED' && surface.action_descriptor_id === moduleResume.descriptor_id));
    assert.ok(modulePaused.stop_surfaces.some(surface => surface.type === 'CANCEL_MODULE' && surface.action_descriptor_id === moduleCancel.descriptor_id));
    await pool.query(`INSERT INTO cancellation_records(id,resource_kind,resource_id,project_id,reason,evidence,actor_id,authority_role,idempotency_key,cancellation_fence) VALUES($1,'PROJECT',$2,$2,'UI-01 cancellation precedence','{}',$3,'BUSINESS_OWNER',$4,1)`, [randomUUID(), f.projectId, human.id, `ui01-cancel:${f.projectId}`]);
    const cancelled = await buildStateActionProjection(f.projectId, human);
    assert.equal(cancelled.activity.state, 'CANCELLED'); assert.ok(cancelled.activity.items.some(item => item.state === 'RUNNING'));

    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE principal_id=$1 AND action_code='OPERATE_PROJECT'`, [human.id]);
    await pool.query(`DELETE FROM cancellation_records WHERE project_id=$1`, [f.projectId]);
    await pool.query(`DELETE FROM pause_records WHERE project_id=$1`, [f.projectId]);
    await pool.query(`UPDATE projects SET workflow_code='PROJECT_INTAKE',workflow_version=1,state='DRAFT' WHERE id=$1`, [f.projectId]);
    const legacy = await buildStateActionProjection(f.projectId, human);
    assert.equal(legacy.project.legacy, true);
    assert.deepEqual(legacy.allowed_actions.filter(action => action.presentation.kind === 'LEGACY').map(action => action.code), [], 'known legacy project publishes no capability absent an explicit adapter declaration');
    assert.ok(legacy.allowed_actions.some(action => action.code === 'PAUSE_MODULE'), 'a current module preserves its independent pause capability');
    assert.ok(legacy.allowed_actions.some(action => action.code === 'CANCEL_MODULE'), 'a current module preserves its independent cancellation capability');
    const legacyProjectSurface = legacy.stop_surfaces.find(surface => surface.resource_kind === 'PROJECT' && surface.resource_id === f.projectId && surface.category === 'LEGACY');
    assert.equal(legacyProjectSurface?.type, 'LEGACY_READ_ONLY', 'known legacy without a declared capability is read-only');
    assert.equal(legacyProjectSurface?.action_descriptor_id, null, 'legacy read-only surface publishes no capability');
    const legacyCapabilityProjectId = `ui01-legacy-${randomUUID().slice(0, 8)}`, legacyCapabilityIntakeRevisionId = randomUUID();
    legacyCapabilityFixture = { projectId: legacyCapabilityProjectId, intakeRevisionId: legacyCapabilityIntakeRevisionId };
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'UI-01 legacy capability','owner','test','/tmp','local','main','000','PROJECT_DISCOVERY',1,'WAITING_FOR_PRODUCT_COMMITMENT','{}')`, [legacyCapabilityProjectId]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}','ui01-legacy-structured','ui01-legacy-markdown','memory://ui01-legacy','test')`, [legacyCapabilityIntakeRevisionId, legacyCapabilityProjectId]);
    await grant(human, 'READ_PROJECT', 'OPERATOR', legacyCapabilityProjectId);
    await grant(human, 'OPERATE_PROJECT', 'OPERATOR', legacyCapabilityProjectId);
    const legacyGateId = randomUUID();
    await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id,evidence) VALUES($1,$2,'PRODUCT_COMMITMENT',$3,'{}')`, [legacyGateId, legacyCapabilityProjectId, legacyCapabilityIntakeRevisionId]);
    const legacyCapability = await buildStateActionProjection(legacyCapabilityProjectId, human);
    const legacyDescriptor = legacyCapability.allowed_actions.find(action => action.code === 'PRODUCT_COMMITMENT_DECISION');
    assert.equal(legacyDescriptor?.presentation.kind, 'LEGACY', 'the adapter presentation remains legacy instead of being reclassified as a generic operation');
    const legacySurface = legacyCapability.stop_surfaces.find(surface => surface.action_descriptor_id === legacyDescriptor?.descriptor_id);
    assert.ok(legacySurface); assert.notEqual(legacySurface.type, 'LEGACY_READ_ONLY'); assert.equal(legacySurface.action_descriptor_id, legacyDescriptor?.descriptor_id, 'the legacy stop links to the exact published adapter descriptor');
    await pool.query(`UPDATE auth_role_grants SET status='REVOKED',revoked_at=clock_timestamp() WHERE principal_id=$1 AND action_code='OPERATE_PROJECT'`, [human.id]);
    unknownWorkflowId = randomUUID(); const unknownWorkflowCode = `UNKNOWN_UI01_${randomUUID().slice(0, 8)}`;
    await pool.query(`INSERT INTO workflow_definitions(id,code,version,scope,status,published_at) VALUES($1,$2,99,'PROJECT','PUBLISHED',clock_timestamp())`, [unknownWorkflowId, unknownWorkflowCode]);
    await pool.query(`INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position) VALUES($1,'WAITING_FOR_PRODUCT_COMMITMENT','Unknown actionable-looking state',false,1)`, [unknownWorkflowId]);
    await pool.query(`UPDATE projects SET workflow_code=$2,workflow_version=99,state='WAITING_FOR_PRODUCT_COMMITMENT' WHERE id=$1`, [f.projectId, unknownWorkflowCode]);
    const unknown = await buildStateActionProjection(f.projectId, human);
    assert.equal(unknown.project.legacy, true); assert.equal(unknown.project.journey_status, 'LEGACY_READ_ONLY');
    assert.deepEqual(unknown.allowed_actions.filter(action => action.target.resource_kind === 'PROJECT' && action.target.resource_id === f.projectId), [], 'an unknown project workflow never derives a project action from an actionable-looking state name');
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
    const helper = await fetch(`${base}/projection-refresh.js`);
    assert.equal(helper.status, 200); assert.match(String(helper.headers.get('content-type')), /text\/javascript/); assert.equal(helper.headers.get('cache-control'), 'no-store');
    assert.match(await helper.text(), /export const canApplyProjection/);
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
