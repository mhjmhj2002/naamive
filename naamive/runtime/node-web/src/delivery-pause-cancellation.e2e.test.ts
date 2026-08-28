import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) {
  test('GAT-02 pause/cancellation PostgreSQL proof requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { cancelResource, markExternalEffectInFlight, markExternalEffectUnknown, pauseResource, reconcileDeliveryLifecycle, resumeResource } = await import('./delivery-lifecycle.js');

  const project = randomUUID();
  const module = randomUUID();
  const revision = randomUUID();
  const cleanup = async () => {
    await pool.query(`DELETE FROM events WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM external_effect_records WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM resume_records WHERE pause_id IN (SELECT id FROM pause_records WHERE project_id=$1)`, [project]);
    await pool.query(`DELETE FROM pause_records WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM cancellation_records WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM modules WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM module_revisions WHERE project_id=$1`, [project]);
    await pool.query(`DELETE FROM projects WHERE id=$1`, [project]);
  };

  test('GAT-02 PostgreSQL fences pause, resume, external effects and cancellation without last-write-wins', async t => {
    t.after(async () => { await cleanup(); await pool.end(); });
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'GAT-02 fences','owner','test','/tmp','local','main','000','PROJECT_DISCOVERY',4,'DELIVERY','{}')`, [project]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'fenced-module',1,'{}','APPROVED')`, [revision, project]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'fenced-module',$3,'READY_FOR_DELIVERY','MODULE_DELIVERY',2)`, [module, project, revision]);

    const pauseInput = { reason: 'maintenance window', evidence: { ticket: 'OPS-42' }, actor_id: 'on-call', authority_role: 'ON_CALL_OWNER', idempotency_key: `pause:${project}` };
    const pause: any = await pauseResource('PROJECT', project, project, pauseInput);
    assert.equal(pause.previous_active_state, 'DELIVERY');
    assert.equal(Number(pause.pause_fence), 1);
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`, [project])).rows[0].state, 'PAUSED');
    assert.equal((await pauseResource('PROJECT', project, project, pauseInput)).id, pause.id, 'identical pause replays converge');
    await assert.rejects(pauseResource('PROJECT', project, project, { ...pauseInput, reason: 'different reason' }), (error: any) => error.code === 'PAUSE_IDEMPOTENCY_CONFLICT');
    await assert.rejects(markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect-paused:${project}`, target: { endpoint: 'release' } }), (error: any) => error.code === 'PAUSE_FENCE_ACTIVE');

    const resumeInput = { expected_pause_version: 1, evidence: { ticket_resolved: 'OPS-42' }, actor_id: 'on-call', authority_role: 'ON_CALL_OWNER', idempotency_key: `resume:${pause.id}` };
    const resumed: any = await resumeResource(pause.id, resumeInput);
    assert.equal(resumed.result, 'RESTORED');
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`, [project])).rows[0].state, 'DELIVERY');
    assert.equal((await resumeResource(pause.id, resumeInput)).id, resumed.id, 'identical resume replays converge');
    await assert.rejects(resumeResource(pause.id, { ...resumeInput, evidence: { ticket_resolved: 'other' } }), (error: any) => error.code === 'RESUME_IDEMPOTENCY_CONFLICT');

    const effect: any = await markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect:${project}`, target: { endpoint: 'release', revision: 1 } });
    assert.equal(effect.status, 'IN_FLIGHT');
    assert.equal((await markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect:${project}`, target: { revision: 1, endpoint: 'release' } })).id, effect.id, 'canonical effect replay converges');
    await assert.rejects(markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect:${project}`, target: { endpoint: 'different' } }), (error: any) => error.code === 'EXTERNAL_EFFECT_IDEMPOTENCY_CONFLICT');
    await markExternalEffectUnknown(effect.id, { timeout: true });
    await reconcileDeliveryLifecycle();
    assert.equal((await pool.query(`SELECT status FROM external_effect_records WHERE id=$1`, [effect.id])).rows[0].status, 'RECONCILE_REQUIRED');
    await assert.rejects(markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect:${project}`, target: { endpoint: 'release', revision: 1 } }), (error: any) => error.code === 'EXTERNAL_EFFECT_BLIND_RETRY_FORBIDDEN');

    const cancellationInput = { reason: 'business cancellation', evidence: { approved: true }, actor_id: 'owner', authority_role: 'BUSINESS_OWNER', idempotency_key: `cancel:${project}` };
    const cancellation: any = await cancelResource('PROJECT', project, project, cancellationInput);
    assert.equal(cancellation.status, 'TERMINAL');
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`, [project])).rows[0].state, 'CANCELLED');
    assert.equal((await pool.query(`SELECT state FROM modules WHERE id=$1`, [module])).rows[0].state, 'CANCELLED');
    assert.equal((await cancelResource('PROJECT', project, project, cancellationInput)).id, cancellation.id, 'identical cancellation replays converge');
    await assert.rejects(cancelResource('PROJECT', project, project, { ...cancellationInput, evidence: { approved: false } }), (error: any) => error.code === 'CANCELLATION_IDEMPOTENCY_CONFLICT');
    await assert.rejects(pauseResource('PROJECT', project, project, { ...pauseInput, idempotency_key: `pause-after-cancel:${project}` }), (error: any) => error.code === 'CANCELLATION_FENCE_ACTIVE');
    await assert.rejects(markExternalEffectInFlight({ project_id: project, resource_kind: 'PROJECT', resource_id: project, effect_key: `effect-cancelled:${project}`, target: { endpoint: 'release' } }), (error: any) => error.code === 'CANCELLATION_FENCE_ACTIVE');
  });
}
