import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  test('AUT-01 scheduler requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-aut01-artifacts';
  process.env.NAAMIVE_OPERATOR_ID ??= 'aut01-test-operator';
  const { pool } = await import('./db.js');
  const { scheduleWorkItem, reconcileEligibilityScheduler, reconcileWaitingDependencies, ELIGIBILITY_PREDICATE_VERSION } = await import('./eligibility-scheduler.js');
  const { resolveExternalBlocker } = await import('./phase3.js');
  const { controlledPlanFixture, validatePlan } = await import('./module-planning.js');
  const activeCount=async()=>Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS')`)).rows[0].n);

  // A prior interrupted run may have left only AUT-01 disposable fixtures.
  // Clear those before measuring global capacity; production project keys are
  // never matched by this test-only prefix.
  await pool.query(`DELETE FROM events WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM artifact_intents WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM artifacts WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM work_item_scheduling_decisions WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM jobs WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM deliveries WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM worktrees WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM operations WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM work_items WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id LIKE 'aut01-%')`);
  await pool.query(`DELETE FROM modules WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM module_revisions WHERE project_id LIKE 'aut01-%'`);
  await pool.query(`DELETE FROM projects WHERE id LIKE 'aut01-%'`);

  const setup=async()=>{
    const project=`aut01-${randomUUID().slice(0,8)}`,revision=randomUUID(),module=randomUUID(),round=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,'AUT-01','Ops','test','/tmp','test://origin','main','0000000','{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`,[project]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'aut01',1,'{}','APPROVED')`,[revision,project]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state) VALUES($1,$2,'aut01',$3,'WORK_ITEMS_ACTIVE')`,[module,project,revision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,revision]);
    const work=async(state='ELIGIBLE_FOR_DISPATCH',depends:string[]=[])=>{const id=randomUUID();await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,state,payload,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'WORK_ITEM_DELIVERY',2)`,[id,project,module,revision,round,`WI ${id.slice(0,6)}`,state,{work_item_id:id,depends_on_ids:depends,qa_matrix:[]}]);return id;};
    const cleanup=async()=>{await pool.query(`DELETE FROM events WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM artifacts WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM work_item_scheduling_decisions WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM jobs WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM deliveries WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM worktrees WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM operations WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM work_items WHERE project_id=$1`,[project]);await pool.query(`DELETE FROM module_rounds WHERE module_id=$1`,[module]);await pool.query(`DELETE FROM modules WHERE id=$1`,[module]);await pool.query(`DELETE FROM module_revisions WHERE id=$1`,[revision]);await pool.query(`DELETE FROM projects WHERE id=$1`,[project]);};
    return {project,work,cleanup};
  };

  test('AUT-01 dispatches one active attempt atomically under concurrent replay', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);
    const wi=await s.work();
    const [a,b,reconciled]=await Promise.all([scheduleWorkItem(s.project,wi,'MODULE_PLAN_APPROVED'),scheduleWorkItem(s.project,wi,'EVENT_REPLAY'),reconcileEligibilityScheduler()]);
    assert.equal([a.reason,b.reason,...reconciled.map((x:any)=>x.reason)].filter(x=>x==='DISPATCHED').length,1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1 AND state='RESERVED'`,[wi])).rows[0].n,1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM jobs WHERE delivery_id=(SELECT id FROM deliveries WHERE work_item_id=$1) AND status='PENDING'`,[wi])).rows[0].n,1);
    const decisions=(await pool.query(`SELECT decision_code,predicate_version FROM work_item_scheduling_decisions WHERE work_item_id=$1 ORDER BY created_at,id`,[wi])).rows;
    assert.equal(decisions.filter((x:any)=>x.decision_code==='DISPATCHED').length,1);
    assert.ok(decisions.every((x:any)=>x.predicate_version===ELIGIBILITY_PREDICATE_VERSION));
  });

  test('AUT-01 preserves ACCEPT plus integration dependency semantics and blocker cardinality', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);
    const predecessor=await s.work('ACCEPTED'),dependent=await s.work('ELIGIBLE_FOR_DISPATCH',[predecessor]);
    assert.equal((await scheduleWorkItem(s.project,dependent,'DEPENDENCY_REEVALUATION')).reason,'WAITING_DEPENDENCIES');
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[predecessor]);
    const blocked=await s.work('WAITING_FOR_EXTERNAL_INPUT');
    await pool.query(`INSERT INTO work_item_external_blockers(id,work_item_id,dependency_id,justification) VALUES($1,$2,'metric','Metric unavailable'),($3,$2,'interface','Interface unavailable')`,[randomUUID(),blocked,randomUUID()]);
    const first=await resolveExternalBlocker(s.project,blocked,{dependency_id:'metric',justification:'Metric supplied'},`blocker-${randomUUID()}`);
    assert.equal(first.state,'WAITING_FOR_EXTERNAL_INPUT');
    const second=await resolveExternalBlocker(s.project,blocked,{dependency_id:'interface',justification:'Interface supplied'},`blocker-${randomUUID()}`);
    assert.equal(second.state,'ELIGIBLE_FOR_DISPATCH');
    assert.equal((await pool.query(`SELECT count(*)::int n FROM work_item_external_blockers WHERE work_item_id=$1 AND state='RESOLVED'`,[blocked])).rows[0].n,2);
  });

  test('AUT-01 exposes capacity waiting and reconciles an eligible row after capacity release', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+1);
    const s=await setup();t.after(async()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;await s.cleanup();});
    const first=await s.work(),second=await s.work();
    assert.equal((await scheduleWorkItem(s.project,first,'MODULE_PLAN_APPROVED')).reason,'DISPATCHED');
    assert.equal((await scheduleWorkItem(s.project,second,'MODULE_PLAN_APPROVED')).reason,'WAITING_CAPACITY');
    await pool.query(`UPDATE deliveries SET state='FAILED' WHERE work_item_id=$1`,[first]);
    await pool.query(`UPDATE worktrees SET state='RELEASED' WHERE work_item_id=$1`,[first]);
    await reconcileEligibilityScheduler();
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[second])).rows[0].state,'DISPATCHED');
  });

  test('AUT-01 handles simple DAGs, chains, roots, fan-out and fan-in without human work-item authorization', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+20);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);
    const rootA=await s.work('INTEGRATED'),rootB=await s.work(),chain=await s.work('WAITING_FOR_DEPENDENCIES',[rootB]);
    const fanOutB=await s.work('WAITING_FOR_DEPENDENCIES',[rootA]),fanOutC=await s.work('WAITING_FOR_DEPENDENCIES',[rootA]);
    const fanInA=await s.work('INTEGRATED'),fanInB=await s.work('ACCEPTED'),fanInC=await s.work('WAITING_FOR_DEPENDENCIES',[fanInA,fanInB]);
    assert.equal((await scheduleWorkItem(s.project,rootB,'MODULE_PLAN_APPROVED')).reason,'DISPATCHED');
    assert.equal((await scheduleWorkItem(s.project,chain,'DEPENDENCY_REEVALUATION')).reason,'WAITING_DEPENDENCIES');
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[rootB]);
    assert.equal((await scheduleWorkItem(s.project,chain,'DEPENDENCY_REEVALUATION')).reason,'DISPATCHED');
    const fanOut=await Promise.all([scheduleWorkItem(s.project,fanOutB,'INTEGRATION_COMPLETED'),scheduleWorkItem(s.project,fanOutC,'INTEGRATION_COMPLETED')]);
    assert.deepEqual(fanOut.map(x=>x.reason).sort(),['DISPATCHED','DISPATCHED']);
    assert.equal((await scheduleWorkItem(s.project,fanInC,'INTEGRATION_COMPLETED')).reason,'WAITING_DEPENDENCIES');
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[fanInB]);
    assert.equal((await scheduleWorkItem(s.project,fanInC,'INTEGRATION_COMPLETED')).reason,'DISPATCHED');
    assert.equal((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE project_id=$1`,[s.project])).rows[0].n,5);
  });

  test('AUT-01 never treats execution, QA, or ACCEPT without integration as a dependency release', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);
    const predecessor=await s.work('PRODUCING'),dependent=await s.work('WAITING_FOR_DEPENDENCIES',[predecessor]);
    for(const state of ['PRODUCING','QA_IN_PROGRESS','ACCEPTED']){await pool.query(`UPDATE work_items SET state=$2 WHERE id=$1`,[predecessor,state]);assert.equal((await scheduleWorkItem(s.project,dependent,`PREDECESSOR_${state}`)).reason,'WAITING_DEPENDENCIES');}
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[predecessor]);
    assert.equal((await scheduleWorkItem(s.project,dependent,'INTEGRATION_COMPLETED')).reason,'DISPATCHED');
  });

  test('AUT-01 re-evaluates dependency waits from an integration event without a manual dispatch', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);const predecessor=await s.work('ACCEPTED'),dependent=await s.work('WAITING_FOR_DEPENDENCIES',[predecessor]);
    assert.equal((await reconcileWaitingDependencies('AUT02_INTEGRATION_COMPLETED',s.project)).find((result:any)=>result.reason==='DISPATCHED'),undefined);
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[predecessor]);
    const results=await reconcileWaitingDependencies('AUT02_INTEGRATION_COMPLETED',s.project);
    assert.equal(results.filter((result:any)=>result.reason==='DISPATCHED').length,1);
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[dependent])).rows[0].state,'DISPATCHED');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`,[dependent])).rows[0].n),1);
  });

  test('AUT-01 rejects a cyclic plan deterministically before any work item is materialized or dispatched', async t=>{
    const s=await setup();t.after(s.cleanup);
    const context={module_definition:{acceptance_criteria:[{criterion_id:'criterion-1',text:'works'}],business_dependencies:[]}};
    const plan=controlledPlanFixture(context);const first={...plan.work_items[0],work_item_id:'metric',depends_on_ids:['interface']},second={...plan.work_items[0],work_item_id:'interface',title:'Interface',objective:'Interface',output:'Verifiable Interface delivered',depends_on_ids:['metric']};
    const cyclic={...plan,work_items:[first,second],criterion_coverage:[{criterion_id:'criterion-1',work_item_ids:['metric','interface']}]};
    await assert.rejects(async()=>validatePlan(cyclic,context),/DEPENDENCY_CYCLE/);
    await assert.rejects(async()=>validatePlan(cyclic,context),/DEPENDENCY_CYCLE/);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM work_items WHERE project_id=$1`,[s.project])).rows[0].n,0);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM jobs WHERE project_id=$1`,[s.project])).rows[0].n,0);
  });

  test('AUT-01 serializes two work items competing for the final capacity slot', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+1);
    const s=await setup();t.after(async()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;await s.cleanup();});
    const a=await s.work(),b=await s.work();const outcomes=await Promise.all([scheduleWorkItem(s.project,a,'SIMULTANEOUS_EVENT'),scheduleWorkItem(s.project,b,'SIMULTANEOUS_EVENT')]);
    assert.deepEqual(outcomes.map(x=>x.reason).sort(),['DISPATCHED','WAITING_CAPACITY']);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE project_id=$1 AND state='RESERVED'`,[s.project])).rows[0].n,1);
  });

  test('AUT-01 rolls back decision, reservation, job and event together after a controlled transaction crash', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);const wi=await s.work();
    await assert.rejects(()=>scheduleWorkItem(s.project,wi,'CRASH_TEST',async()=>{throw new Error('SIMULATED_CRASH_BEFORE_COMMIT');}),/SIMULATED_CRASH_BEFORE_COMMIT/);
    const rolledBack={
      decisions:(await pool.query(`SELECT count(*)::int n FROM work_item_scheduling_decisions WHERE work_item_id=$1`,[wi])).rows[0].n,
      deliveries:(await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`,[wi])).rows[0].n,
      jobs:(await pool.query(`SELECT count(*)::int n FROM jobs WHERE delivery_id IN (SELECT id FROM deliveries WHERE work_item_id=$1)`,[wi])).rows[0].n,
      events:(await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1`,[s.project])).rows[0].n
    };
    assert.deepEqual(rolledBack,{decisions:0,deliveries:0,jobs:0,events:0});
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[wi])).rows[0].state,'ELIGIBLE_FOR_DISPATCH');
    assert.equal((await scheduleWorkItem(s.project,wi,'CRASH_RECOVERY')).reason,'DISPATCHED');
  });

  test('AUT-01 restart and replay converge to one committed reservation', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);const wi=await s.work();
    assert.equal((await scheduleWorkItem(s.project,wi,'MODULE_PLAN_APPROVED')).reason,'DISPATCHED');
    await reconcileEligibilityScheduler();
    const replay=await Promise.all([scheduleWorkItem(s.project,wi,'MODULE_PLAN_APPROVED'),scheduleWorkItem(s.project,wi,'EXTERNAL_BLOCKER_RESOLVED'),scheduleWorkItem(s.project,wi,'RECONCILE')]);
    assert.ok(replay.every(x=>x.reason==='NOT_ELIGIBLE'));
    assert.equal((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1 AND state='RESERVED'`,[wi])).rows[0].n,1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM jobs WHERE delivery_id=(SELECT id FROM deliveries WHERE work_item_id=$1)`,[wi])).rows[0].n,1);
  });

  test('AUT-01 Metric/Interface lifecycle regression dispatches Metric, re-evaluates Interface, and avoids limbo', async t=>{
    const old=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=String(await activeCount()+10);t.after(()=>{if(old===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=old;});
    const s=await setup();t.after(s.cleanup);const metric=await s.work(),ui=await s.work('WAITING_FOR_DEPENDENCIES',[metric]);
    await pool.query(`UPDATE work_items SET title='Métrica' WHERE id=$1`,[metric]);await pool.query(`UPDATE work_items SET title='Interface' WHERE id=$1`,[ui]);
    assert.equal((await scheduleWorkItem(s.project,metric,'MODULE_PLAN_APPROVED')).reason,'DISPATCHED');
    assert.equal((await scheduleWorkItem(s.project,ui,'EXECUTION_SUCCEEDED')).reason,'WAITING_DEPENDENCIES');
    await pool.query(`UPDATE work_items SET state='INTEGRATED' WHERE id=$1`,[metric]);
    assert.equal((await scheduleWorkItem(s.project,ui,'INTEGRATION_COMPLETED')).reason,'DISPATCHED');
    const states=(await pool.query(`SELECT title,state FROM work_items WHERE project_id=$1 ORDER BY title`,[s.project])).rows;
    assert.deepEqual(states.map((x:any)=>x.state),['DISPATCHED','INTEGRATED']);
  });
}
