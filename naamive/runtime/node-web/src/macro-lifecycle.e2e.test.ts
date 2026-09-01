import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('LR-02 requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  const {pool,withTransaction}=await import('./db.js');
  const {createProductCommitmentRevision,decideProductCommitmentGate}=await import('./product-commitment.js');
  const {macroLifecycleProjection,reconcileMacroLifecycle}=await import('./macro-lifecycle.js');

  type Fixture={projectId:string;intakeId:string;requirementsId:string;reviewId:string;source:{source_intake_revision_id:string;source_requirements_artifact_id:string;source_review_artifact_id:string}};
  const fixture=async(label:string,state='WAITING_FOR_PRODUCT_COMMITMENT'):Promise<Fixture>=>{
    const projectId=randomUUID(),intakeId=randomUUID(),requirementsId=randomUUID(),reviewId=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,'owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',4,$3,'{}')`,[projectId,label,state]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,$5,'tester')`,[intakeId,projectId,'a'.repeat(64),'b'.repeat(64),`file:///tmp/${intakeId}`]);
    await pool.query(`INSERT INTO artifacts(id,project_id,artifact_type,storage_uri,storage_key,sha256,schema_version) VALUES
      ($1,$3,'product-requirements',$4,$5,$6,1),($2,$3,'product-commitment-review',$7,$8,$9,1)`,[requirementsId,reviewId,projectId,`file:///tmp/${requirementsId}`,`lr02/${projectId}/${requirementsId}`,'c'.repeat(64),`file:///tmp/${reviewId}`,`lr02/${projectId}/${reviewId}`,'d'.repeat(64)]);
    return {projectId,intakeId,requirementsId,reviewId,source:{source_intake_revision_id:intakeId,source_requirements_artifact_id:requirementsId,source_review_artifact_id:reviewId}};
  };
  const candidate=(module_key:string,objective=`Objetivo ${module_key}`,dependencies:string[]=[])=>({module_key,name:`Módulo ${module_key}`,objective,scope:[`Escopo ${module_key}`],out_of_scope:[],dependencies,acceptance_criteria:[`Aceite ${module_key}`],source_evidence:{requirement_refs:[`REQ-${module_key.toUpperCase()}`],artifact_refs:[]}});
  const proposal=(modules:ReturnType<typeof candidate>[])=>({contract_version:'PRODUCT_COMMITMENT_MODULES:v1',candidate_modules:modules,investment_and_risks:{investment:['Incremental'],risks:['Controlado']}});
  const create=async(f:Fixture,key:string,modules:ReturnType<typeof candidate>[])=>withTransaction(client=>createProductCommitmentRevision(client,f.projectId,proposal(modules),f.source,key));
  const approve=async(revision:any,key:string)=>decideProductCommitmentGate(revision.project_id,revision.gate_record_id,{version:1,decision:'APPROVE',reason:'Compromisso aprovado.',evidence:{acknowledged:true},actor_id:'lr02-owner',actor_role:'BUSINESS_OWNER',idempotency_key:key});
  const drain=async(projectId:string)=>{
    for(let turn=0;turn<20;turn++){
      await reconcileMacroLifecycle(100,`lr02-test:${randomUUID()}`,projectId);
      const remaining=Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_intents WHERE project_id=$1 AND status IN ('PENDING','FAILED','LEASED') AND available_at<=clock_timestamp()`,[projectId])).rows[0].n);
      if(!remaining)return;
    }
    assert.fail('macro lifecycle did not converge');
  };

  test('LR-02 converges discovery, SAME/CHANGED/ADDED/REMOVED, partial replay and succession races in PostgreSQL',async t=>{
    t.after(async()=>{await pool.query(`UPDATE workflow_rollouts SET selection_enabled=false WHERE workflow_code='PROJECT_DISCOVERY' AND workflow_version=4`);await pool.end();});

    const main=await fixture('LR-02 mixed delta');
    const r1:any=await create(main,`r1:${main.projectId}`,[candidate('a'),candidate('b'),candidate('c')]);
    await approve(r1,`approve-r1:${main.projectId}`);
    const obligationsBefore=(await pool.query(`SELECT module_key,required,materialized_module_id,present_in_current_commitment,scope_change_pending FROM committed_module_obligations WHERE project_id=$1 ORDER BY module_key`,[main.projectId])).rows;
    assert.deepEqual(obligationsBefore.map((row:any)=>[row.module_key,row.required,row.materialized_module_id,row.present_in_current_commitment,row.scope_change_pending]),[['a',true,null,true,false],['b',true,null,true,false],['c',true,null,true,false]],'obligations exist before materialization');
    await Promise.all([reconcileMacroLifecycle(100,'lr02-racer-a',main.projectId),reconcileMacroLifecycle(100,'lr02-racer-b',main.projectId)]);
    await drain(main.projectId);
    const firstModules=(await pool.query(`SELECT m.id,m.module_key,m.state,m.workflow_code,m.workflow_version,r.id AS revision_id,r.revision,r.status,r.candidate_fingerprint,(SELECT count(*)::int FROM module_rounds mr WHERE mr.module_id=m.id) AS rounds FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.project_id=$1 ORDER BY m.module_key`,[main.projectId])).rows;
    assert.deepEqual(firstModules.map((row:any)=>[row.module_key,row.state,row.workflow_version,row.revision,row.status,row.rounds]),[['a','IDENTIFIED',2,1,'APPROVED',1],['b','IDENTIFIED',2,1,'APPROVED',1],['c','IDENTIFIED',2,1,'APPROVED',1]]);
    assert.ok(firstModules.every((row:any)=>/^[a-f0-9]{64}$/.test(row.candidate_fingerprint)));
    assert.equal((await pool.query(`SELECT complete FROM commitment_materialization_checkpoints WHERE product_commitment_revision_id=$1`,[r1.id])).rows[0].complete,true);
    const a1=firstModules[0],b1=firstModules[1],c1=firstModules[2];
    await pool.query(`UPDATE modules SET state=CASE module_key WHEN 'a' THEN 'VALIDATING' WHEN 'b' THEN 'READY_FOR_DELIVERY' ELSE state END WHERE project_id=$1`,[main.projectId]);
    await pool.query(`UPDATE projects SET state='IMPLEMENTATION' WHERE id=$1`,[main.projectId]);

    const r2:any=await create(main,`r2:${main.projectId}`,[candidate('a'),candidate('b','Objetivo b alterado'),candidate('d')]);
    await approve(r2,`approve-r2:${main.projectId}`);
    await drain(main.projectId);
    const evolved=(await pool.query(`SELECT m.id,m.module_key,m.state,r.id AS revision_id,r.revision,r.predecessor_revision_id,r.source_product_commitment_revision_id,r.source_product_commitment_module_id,(SELECT count(*)::int FROM module_rounds mr WHERE mr.module_id=m.id) AS rounds FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.project_id=$1 ORDER BY m.module_key`,[main.projectId])).rows;
    const a2=evolved.find((row:any)=>row.module_key==='a'),b2=evolved.find((row:any)=>row.module_key==='b'),c2=evolved.find((row:any)=>row.module_key==='c'),d2=evolved.find((row:any)=>row.module_key==='d');
    assert.equal(a2.id,a1.id);assert.equal(a2.revision_id,a1.revision_id);assert.equal(a2.state,'VALIDATING');assert.equal(a2.rounds,1);
    assert.equal(b2.id,b1.id);assert.notEqual(b2.revision_id,b1.revision_id);assert.equal(b2.revision,2);assert.equal(b2.predecessor_revision_id,b1.revision_id);assert.equal(b2.source_product_commitment_revision_id,r2.id);assert.ok(b2.source_product_commitment_module_id);assert.equal(b2.state,'IDENTIFIED');assert.equal(b2.rounds,2);
    assert.equal(c2.id,c1.id);assert.ok(d2);assert.equal(d2.revision,1);
    const mixedObligations=(await pool.query(`SELECT module_key,required,materialized_module_id,present_in_current_commitment,scope_change_pending,generation FROM committed_module_obligations WHERE project_id=$1 ORDER BY module_key`,[main.projectId])).rows;
    assert.deepEqual(mixedObligations.map((row:any)=>[row.module_key,row.required,row.materialized_module_id!==null,row.present_in_current_commitment,row.scope_change_pending,row.generation]),[['a',true,true,true,false,1],['b',true,true,true,false,1],['c',true,true,false,true,1],['d',true,true,true,false,1]]);
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[main.projectId])).rows[0].state,'ARCHITECTURE');
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_transitions WHERE project_id=$1 AND transition_type='REOPEN_TRANSITION' AND reason='PRODUCT_COMMITMENT_EVOLUTION'`,[main.projectId])).rows[0].n),2,'one module and one project reopening');
    const projection:any=await macroLifecycleProjection(main.projectId);
    assert.equal(projection.commitment_materialization_status.complete,true);
    assert.deepEqual(projection.blockers.scope_change_pending,['c']);
    assert.equal(projection.effective_required_module_set.length,4);
    await drain(main.projectId);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM product_commitment_module_materializations WHERE product_commitment_revision_id=$1`,[r2.id])).rows[0].n),3,'replay does not duplicate lineage');

    const b2Round=(await pool.query(`SELECT id FROM module_rounds WHERE module_id=$1 AND revision_id=$2`,[b2.id,b2.revision_id])).rows[0].id;
    const oldWorkItem=randomUUID(),recoveryOperation=randomUUID(),recoveryDecision=randomUUID();
    await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,state,payload,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$5,'Old B work','WAITING_FOR_ESCALATION',$6,'WORK_ITEM_DELIVERY',2)`,[oldWorkItem,main.projectId,b2.id,b2.revision_id,b2Round,{work_item_id:oldWorkItem,depends_on_ids:[],allowlist:[],denylist:[],qa_matrix:[]}]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'RECOVER_WORK_ITEM','QUEUED',$3,$4)`,[recoveryOperation,main.projectId,`lr02-recovery:${oldWorkItem}`,randomUUID()]);
    await pool.query(`INSERT INTO recovery_decisions(id,project_id,policy_version,cause,effect_certainty,evidence_footprint,selected_action,reason,work_item_id,evidence_refs,finding_refs,source_state,source_version,classification_key,classification_fingerprint,idempotency_key,operation_id)
      VALUES($1,$2,'RECOVERY_POLICY:v1','INFRA_TRANSIENT','NO_EFFECT','[]','RETRY','Preserve predecessor recovery',$3,'[]','[]','WAITING_FOR_ESCALATION',1,$4,$5,$6,$7)`,[recoveryDecision,main.projectId,oldWorkItem,`lr02-class:${oldWorkItem}`,'a'.repeat(64),`lr02-decision:${oldWorkItem}`,recoveryOperation]);
    await pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload) VALUES
      ($1,'MODULE_DEFINITION_ACCEPTED',$2,$3),
      ($1,'ARCHITECTURE_ACCEPTED',$4,'{}')`,[main.projectId,randomUUID(),{module_id:b2.id},randomUUID()]);
    const r3:any=await create(main,`r3:${main.projectId}`,[candidate('a'),candidate('b','Objetivo b alterado',['a']),candidate('c'),candidate('d')]);
    await approve(r3,`approve-r3:${main.projectId}`);await drain(main.projectId);
    const reintroduced=(await pool.query(`SELECT m.id,m.module_key,m.state,r.id AS revision_id,r.revision FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.project_id=$1 ORDER BY m.module_key`,[main.projectId])).rows;
    const b3=reintroduced.find((row:any)=>row.module_key==='b'),c3=reintroduced.find((row:any)=>row.module_key==='c');
    assert.equal(c3.id,c1.id);assert.equal(c3.revision_id,c1.revision_id,'reintroduced unchanged C reuses its lineage');
    assert.equal(b3.id,b1.id);assert.equal(b3.revision,3);assert.equal(b3.state,'IDENTIFIED','module-only evidence from the predecessor revision is fenced');
    assert.equal((await pool.query(`SELECT execution_state FROM recovery_decisions WHERE id=$1`,[recoveryDecision])).rows[0].execution_state,'PENDING','evolution does not erase or reclassify predecessor recovery');
    assert.deepEqual((await pool.query(`SELECT payload->'dependencies' AS dependencies FROM module_revisions WHERE id=$1`,[b3.revision_id])).rows[0].dependencies,['a'],'dependency change creates the new revision');
    const reintroducedC=(await pool.query(`SELECT generation,required,present_in_current_commitment,scope_change_pending FROM committed_module_obligations WHERE project_id=$1 AND module_key='c'`,[main.projectId])).rows[0];
    assert.deepEqual([reintroducedC.generation,reintroducedC.required,reintroducedC.present_in_current_commitment,reintroducedC.scope_change_pending],[1,true,true,false]);
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[main.projectId])).rows[0].state,'ARCHITECTURE','architecture evidence predating the current commitment revision is fenced');
    await Promise.all([
      pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload) VALUES($1,'MODULE_DEFINITION_ACCEPTED',$2,$3)`,[main.projectId,randomUUID(),{module_id:b3.id,module_revision_id:b3.revision_id}]),
      reconcileMacroLifecycle(100,'lr02-event-racer',main.projectId)
    ]);await Promise.all([reconcileMacroLifecycle(100,'lr02-transition-racer-a',main.projectId),reconcileMacroLifecycle(100,'lr02-transition-racer-b',main.projectId)]);await drain(main.projectId);
    assert.equal((await pool.query(`SELECT state FROM modules WHERE id=$1`,[b3.id])).rows[0].state,'DEFINED');
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_transitions WHERE aggregate_id=$1 AND source_state='IDENTIFIED' AND target_state='DEFINED'`,[b3.id])).rows[0].n),1,'event discovery and concurrent reconcilers emit one transition');
    await assert.rejects(pool.query(`UPDATE module_revisions SET candidate_fingerprint=$2 WHERE id=$1`,[b3.revision_id,'f'.repeat(64)]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`INSERT INTO committed_module_obligations(id,project_id,module_key,generation,introduced_by_revision_id,last_present_revision_id) VALUES($1,$2,'c',2,$3,$3)`,[randomUUID(),main.projectId,r3.id]),(error:any)=>error.code==='23505');

    const successionFirst=await fixture('LR-02 succession first');
    const sf1:any=await create(successionFirst,`r1:${successionFirst.projectId}`,[candidate('a'),candidate('b'),candidate('c')]);
    await approve(sf1,`approve-r1:${successionFirst.projectId}`);
    await pool.query(`UPDATE macro_lifecycle_intents SET available_at=clock_timestamp()+interval '1 day' WHERE project_id=$1 AND payload->>'module_key'='c'`,[successionFirst.projectId]);
    await reconcileMacroLifecycle(100,'lr02-partial',successionFirst.projectId);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM modules WHERE project_id=$1`,[successionFirst.projectId])).rows[0].n),2);
    const sf2:any=await create(successionFirst,`r2:${successionFirst.projectId}`,[candidate('a'),candidate('b'),candidate('d')]);
    await approve(sf2,`approve-r2:${successionFirst.projectId}`);await drain(successionFirst.projectId);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM modules WHERE project_id=$1 AND module_key='c'`,[successionFirst.projectId])).rows[0].n),0,'stale predecessor intent cannot create removed C');
    const sfC=(await pool.query(`SELECT required,materialized_module_id,present_in_current_commitment,scope_change_pending FROM committed_module_obligations WHERE project_id=$1 AND module_key='c'`,[successionFirst.projectId])).rows[0];
    assert.deepEqual([sfC.required,sfC.materialized_module_id,sfC.present_in_current_commitment,sfC.scope_change_pending],[true,null,false,true]);
    assert.equal((await pool.query(`SELECT status FROM macro_lifecycle_intents WHERE project_id=$1 AND payload->>'product_commitment_revision_id'=$2 AND payload->>'module_key'='c'`,[successionFirst.projectId,sf1.id])).rows[0].status,'SUPERSEDED');
    assert.equal((await macroLifecycleProjection(successionFirst.projectId) as any).commitment_materialization_status.complete,true);
    assert.deepEqual((await macroLifecycleProjection(successionFirst.projectId) as any).blockers.required_unmaterialized,['c']);

    const materializationFirst=await fixture('LR-02 materialization first');
    const mf1:any=await create(materializationFirst,`r1:${materializationFirst.projectId}`,[candidate('a'),candidate('c')]);await approve(mf1,`approve-r1:${materializationFirst.projectId}`);await drain(materializationFirst.projectId);
    const cModule=(await pool.query(`SELECT id FROM modules WHERE project_id=$1 AND module_key='c'`,[materializationFirst.projectId])).rows[0].id;
    const mf2:any=await create(materializationFirst,`r2:${materializationFirst.projectId}`,[candidate('a')]);await approve(mf2,`approve-r2:${materializationFirst.projectId}`);await drain(materializationFirst.projectId);
    const mfC=(await pool.query(`SELECT materialized_module_id,required,present_in_current_commitment,scope_change_pending FROM committed_module_obligations WHERE project_id=$1 AND module_key='c'`,[materializationFirst.projectId])).rows[0];
    assert.deepEqual([mfC.materialized_module_id,mfC.required,mfC.present_in_current_commitment,mfC.scope_change_pending],[cModule,true,false,true]);

    const discoveryProject=randomUUID(),discoveryIntake=randomUUID(),registrationGate=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,selected_discovery_workflow_code,selected_discovery_workflow_version,state,draft) VALUES($1,'LR-02 discovery','owner','tester','/tmp','local','main','000','PROJECT_INTAKE',1,'PROJECT_DISCOVERY',4,'WAITING_FOR_REGISTRATION','{}')`,[discoveryProject]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,$5,'tester')`,[discoveryIntake,discoveryProject,'e'.repeat(64),'f'.repeat(64),`file:///tmp/${discoveryIntake}`]);
    await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'REGISTER_PROJECT',$3)`,[registrationGate,discoveryProject,discoveryIntake]);
    await pool.query(`UPDATE workflow_rollouts SET selection_enabled=false WHERE workflow_code='PROJECT_DISCOVERY' AND workflow_version=4`);
    const {testAuthenticatedHeaders}=await import('./test-auth.js'),{createApiServer}=await import('./server.js');
    const session=await testAuthenticatedHeaders(discoveryProject,[{role_code:'OPERATOR',action_code:'OPERATE_PROJECT'}]);
    const server=createApiServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    try{
      const address=server.address() as import('node:net').AddressInfo;
      const response=await fetch(`http://127.0.0.1:${address.port}/api/projects/${discoveryProject}/decision`,{method:'POST',headers:{...session.headers,'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED',gate_id:registrationGate,version:1,feedback:''})});
      assert.equal(response.status,200);assert.equal((await response.json() as any).state,'ANALYSIS');
    }finally{server.close();await session.cleanup();}
    assert.deepEqual((await pool.query(`SELECT workflow_code,workflow_version,state FROM projects WHERE id=$1`,[discoveryProject])).rows[0],{workflow_code:'PROJECT_DISCOVERY',workflow_version:4,state:'ANALYSIS'});
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_intents WHERE project_id=$1 AND kind='DISCOVERY'`,[discoveryProject])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM operations WHERE project_id=$1`,[discoveryProject])).rows[0].n),0,'commit can end after durable intent and before operation');
    await pool.query(`UPDATE macro_lifecycle_intents SET status='LEASED',lease_owner='crashed-worker',lease_token=$2,lease_expires_at=clock_timestamp()-interval '1 second' WHERE project_id=$1 AND kind='DISCOVERY'`,[discoveryProject,randomUUID()]);
    await Promise.all([reconcileMacroLifecycle(100,'discovery-racer-a',discoveryProject),reconcileMacroLifecycle(100,'discovery-racer-b',discoveryProject)]);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM operations WHERE project_id=$1 AND kind='PRODUCT_DISCOVERY'`,[discoveryProject])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE project_id=$1 AND kind='ANALYZE_PRODUCT_NEED'`,[discoveryProject])).rows[0].n),1);
    await pool.query(`UPDATE workflow_rollouts SET selection_enabled=false WHERE workflow_code='PROJECT_DISCOVERY' AND workflow_version=4`);

    const legacy=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'LR-02 legacy','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',3,'REGISTERED','{}')`,[legacy]);
    await reconcileMacroLifecycle(100,'legacy-regression',legacy);
    assert.equal((await pool.query(`SELECT workflow_version,state FROM projects WHERE id=$1`,[legacy])).rows[0].workflow_version,3);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM macro_lifecycle_intents WHERE project_id=$1`,[legacy])).rows[0].n),0);

    const scoped=await fixture('LR-02 scoped reconciliation'),external=await fixture('LR-02 global reconciliation');
    const addReevaluation=async(f:Fixture,key:string)=>pool.query(`INSERT INTO macro_lifecycle_intents(id,project_id,destination,kind,aggregate_type,aggregate_id,idempotency_key,payload,evidence_refs,available_at)
      VALUES($1,$2,'MACRO_LIFECYCLE','MACRO_REEVALUATE','PROJECT',$2,$3,'{}','[]','epoch')`,[randomUUID(),f.projectId,key]);
    const scopedKey=`lr02-scope:${scoped.projectId}`,externalKey=`lr02-global:${external.projectId}`;
    await addReevaluation(external,externalKey);await addReevaluation(scoped,scopedKey);
    await reconcileMacroLifecycle(1,'lr02-scope-only',scoped.projectId);
    assert.deepEqual((await pool.query(`SELECT status,attempts FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[scopedKey])).rows[0],{status:'COMPLETED',attempts:1});
    assert.deepEqual((await pool.query(`SELECT status,attempts FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[externalKey])).rows[0],{status:'PENDING',attempts:0},'a scoped reconcile neither claims nor processes another project');
    await reconcileMacroLifecycle(1,'lr02-global-regression');
    assert.deepEqual((await pool.query(`SELECT status,attempts FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[externalKey])).rows[0],{status:'COMPLETED',attempts:1},'an unscoped reconcile remains global');
  });
}
