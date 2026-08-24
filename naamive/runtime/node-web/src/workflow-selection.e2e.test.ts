import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('LR-02-FIX-01 requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  process.env.NAAMIVE_ARTIFACT_STORE_URI??='file:///tmp/naamive-workflow-selection-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS??=resolve(process.cwd(),'../../..');
  process.env.NAAMIVE_OPERATOR_ID??='lr02-fix01-operator';
  const {pool}=await import('./db.js');
  const {createApiServer}=await import('./server.js');
  const {reconcileMacroLifecycle}=await import('./macro-lifecycle.js');
  const {selectedWorkflow}=await import('./workflow.js');
  const {testAuthenticatedHeaders}=await import('./test-auth.js');
  type Created={id:string;intakeId:string;gateId:string;session:Awaited<ReturnType<typeof testAuthenticatedHeaders>>};
  const created:Created[]=[];
  const cleanup=async()=>{
    for(const fixture of created.reverse()){
      await fixture.session.cleanup();
      for(const table of ['macro_lifecycle_transitions','macro_lifecycle_intents','events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])
        await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[fixture.id]);
      await pool.query(`DELETE FROM projects WHERE id=$1`,[fixture.id]);
    }
    await pool.query(`UPDATE workflow_rollouts SET selection_enabled=false WHERE workflow_code='PROJECT_DISCOVERY' AND workflow_version=4`);
  };
  const rollout=(enabled:boolean)=>pool.query(`UPDATE workflow_rollouts SET selection_enabled=$1,updated_at=clock_timestamp() WHERE workflow_code='PROJECT_DISCOVERY' AND workflow_version=4 AND selection_scope='NEW_PROJECTS'`,[enabled]);

  test('LR-02-FIX-01 freezes NEW_PROJECTS workflow selection before registration approval',async t=>{
    t.after(async()=>{await cleanup();await pool.end();});
    const server=createApiServer();await new Promise<void>(resolveListen=>server.listen(0,'127.0.0.1',resolveListen));
    t.after(()=>new Promise<void>(resolveClose=>server.close(()=>resolveClose())));
    const base=`http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
    const create=async(label:string,enabled:boolean)=>{
      await rollout(enabled);
      const id=`lr02-fix01-${label}-${randomUUID().slice(0,8)}`,intakeId=randomUUID(),gateId=randomUUID();
      const session=await testAuthenticatedHeaders(id,[{role_code:'OPERATOR',action_code:'CREATE_PROJECT',project_id:null},{role_code:'OPERATOR',action_code:'READ_PROJECT'},{role_code:'OPERATOR',action_code:'OPERATE_PROJECT'}]);
      const response=await fetch(`${base}/api/projects`,{method:'POST',headers:{...session.headers,'content-type':'application/json'},body:JSON.stringify({project_id:id,repository_path:resolve(process.cwd(),'../../..'),base_branch:'phase6.5-lifecycle-alignment',dirty_tree_confirmation:{confirmed:true,reason:'LR-02-FIX-01 test workspace'},title:`Workflow selection ${label}`,business_owner:'Operações',business_problem:'Seleção tardia de lifecycle',desired_outcome:'Seleção imutável por instância',success_metrics:['Sem migração implícita'],stakeholders:['Operações'],known_constraints:['Preservar legado'],evidence_sources:['Teste PostgreSQL'],assumptions:['Rollout transacional'],open_questions:['Nenhuma']})});
      assert.equal(response.status,201,await response.text());
      await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,$5,'tester')`,[intakeId,id,randomUUID().replaceAll('-','').padEnd(64,'a').slice(0,64),randomUUID().replaceAll('-','').padEnd(64,'b').slice(0,64),`file:///tmp/${intakeId}`]);
      await pool.query(`UPDATE projects SET state='WAITING_FOR_REGISTRATION' WHERE id=$1`,[id]);
      await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'REGISTER_PROJECT',$3)`,[gateId,id,intakeId]);
      const fixture={id,intakeId,gateId,session};created.push(fixture);return fixture;
    };
    const approve=async(fixture:Created)=>fetch(`${base}/api/projects/${fixture.id}/decision`,{method:'POST',headers:{...fixture.session.headers,'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED',gate_id:fixture.gateId,version:1,feedback:''})});
    const binding=(id:string)=>pool.query(`SELECT workflow_code,workflow_version,selected_discovery_workflow_code,selected_discovery_workflow_version,state FROM projects WHERE id=$1`,[id]).then(result=>result.rows[0]);
    const counts=async(id:string)=>({
      intents:Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_intents WHERE project_id=$1 AND kind='DISCOVERY'`,[id])).rows[0].n),
      events:Number((await pool.query(`SELECT count(*)::int AS n FROM events WHERE project_id=$1 AND event_type='MACRO_DISCOVERY_REQUESTED'`,[id])).rows[0].n),
      operations:Number((await pool.query(`SELECT count(*)::int AS n FROM operations WHERE project_id=$1 AND kind='PRODUCT_DISCOVERY'`,[id])).rows[0].n),
      jobs:Number((await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE project_id=$1 AND kind='ANALYZE_PRODUCT_NEED'`,[id])).rows[0].n)
    });

    const legacy=await create('legacy',false);
    assert.deepEqual(await binding(legacy.id),{workflow_code:'PROJECT_INTAKE',workflow_version:1,selected_discovery_workflow_code:'PROJECT_DISCOVERY',selected_discovery_workflow_version:3,state:'WAITING_FOR_REGISTRATION'});
    await rollout(true);await rollout(false);await rollout(true);
    let response=await approve(legacy);assert.equal(response.status,200,await response.text());
    assert.deepEqual(await binding(legacy.id),{workflow_code:'PROJECT_INTAKE',workflow_version:1,selected_discovery_workflow_code:'PROJECT_DISCOVERY',selected_discovery_workflow_version:3,state:'REGISTERED'});
    assert.deepEqual(await counts(legacy.id),{intents:0,events:0,operations:0,jobs:0});
    response=await approve(legacy);assert.equal(response.status,200,await response.text());
    assert.deepEqual(await counts(legacy.id),{intents:0,events:0,operations:0,jobs:0},'legacy approval replay remains a v4 no-op');

    const current=await create('v4',true);
    assert.deepEqual(await binding(current.id),{workflow_code:'PROJECT_INTAKE',workflow_version:1,selected_discovery_workflow_code:'PROJECT_DISCOVERY',selected_discovery_workflow_version:4,state:'WAITING_FOR_REGISTRATION'});
    const projected=await fetch(`${base}/api/projects/${current.id}`,{headers:current.session.headers}),projectedBody=await projected.json() as any;
    assert.equal(projected.status,200);assert.deepEqual({code:projectedBody.selected_discovery_workflow_code,version:projectedBody.selected_discovery_workflow_version},{code:'PROJECT_DISCOVERY',version:4});
    assert.deepEqual((await pool.query(`SELECT payload->'selected_discovery_workflow' AS selected FROM events WHERE project_id=$1 AND event_type='PROJECT_CREATED'`,[current.id])).rows[0].selected,{workflow_code:'PROJECT_DISCOVERY',workflow_version:4});
    await rollout(false);await rollout(true);await rollout(false);
    response=await approve(current);const approvedBody=await response.text();assert.equal(response.status,200,approvedBody);assert.equal(JSON.parse(approvedBody).state,'ANALYSIS');
    assert.deepEqual(await binding(current.id),{workflow_code:'PROJECT_DISCOVERY',workflow_version:4,selected_discovery_workflow_code:'PROJECT_DISCOVERY',selected_discovery_workflow_version:4,state:'ANALYSIS'});
    assert.deepEqual(await counts(current.id),{intents:1,events:1,operations:0,jobs:0},'approval commits state and intent before side effects');
    response=await approve(current);assert.equal(response.status,200,await response.text());
    assert.deepEqual(await counts(current.id),{intents:1,events:1,operations:0,jobs:0},'approval replay does not duplicate the intent or event');
    await Promise.all([reconcileMacroLifecycle(20,'lr02-fix01-a'),reconcileMacroLifecycle(20,'lr02-fix01-b')]);
    assert.deepEqual(await counts(current.id),{intents:1,events:1,operations:1,jobs:1});
    await assert.rejects(pool.query(`UPDATE projects SET selected_discovery_workflow_version=3 WHERE id=$1`,[current.id]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE projects SET workflow_version=3 WHERE id=$1`,[current.id]),(error:any)=>error.code==='23514');

    await rollout(false);
    const lockingClient=await pool.connect();let committed=false;await lockingClient.query('BEGIN');
    try{
      assert.equal((await selectedWorkflow(lockingClient,'PROJECT_DISCOVERY','NEW_PROJECTS')),null);
      let toggled=false;const toggle=rollout(true).then(()=>{toggled=true;});
      await new Promise(resolveWait=>setTimeout(resolveWait,50));assert.equal(toggled,false,'rollout update waits for the creation-time selection lock');
      await lockingClient.query('COMMIT');committed=true;await toggle;
    }finally{if(!committed)await lockingClient.query('ROLLBACK').catch(()=>{});lockingClient.release();}
  });
}
