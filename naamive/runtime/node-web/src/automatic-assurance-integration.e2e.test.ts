import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('AUT-02 requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  process.env.NAAMIVE_ARTIFACT_STORE_URI??='file:///tmp/naamive-aut02-artifacts';
  process.env.NAAMIVE_OPERATOR_ID??='aut02-test-operator';
  const {pool,withTransaction}=await import('./db.js');
  const {AUT02_PIPELINE_VERSION,AUT02_POLICY_VERSION,enqueueAut02Intent}=await import('./aut02-ledger.js');
  const {automaticAssuranceIntegrationProjection,deterministicHash,finalizeAut02IntegratedCandidate,reconcileAutomaticAssuranceIntegration}=await import('./automatic-assurance-integration.js');

  const git=(cwd:string,...args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();
  const repository=()=>{
    const root=mkdtempSync(join(tmpdir(),'naamive-aut02-e2e-'));
    git(root,'init');git(root,'config','user.name','AUT-02 Test');git(root,'config','user.email','aut02@test.invalid');
    execFileSync('sh',['-lc','printf base > base.txt'],{cwd:root});git(root,'add','base.txt');git(root,'commit','-m','base');
    const base=git(root,'rev-parse','HEAD');git(root,'branch','integration',base);git(root,'checkout','-b','phases/3');
    execFileSync('sh',['-lc','printf phase > phase.txt'],{cwd:root});git(root,'add','phase.txt');git(root,'commit','-m','phase');
    return{root,base,phase:git(root,'rev-parse','HEAD')};
  };
  const h=(seed:string)=>deterministicHash(seed);

  test('AUT-02 creates one immutable multi-WI candidate only after the last merge and finalizes all members atomically',async t=>{
    const repo=repository(),project=randomUUID(),moduleRevision=randomUUID(),module=randomUUID(),round=randomUUID(),plan=randomUUID(),runtime=randomUUID(),executionPolicy=randomUUID(),assurancePolicy=randomUUID(),correlation=randomUUID();
    t.after(async()=>{await pool.query(`UPDATE assurance_policies SET enabled=false WHERE id=$1`,[assurancePolicy]);await pool.end();});
    const workItems=[randomUUID(),randomUUID(),randomUUID()].sort(),logical=workItems.map((id,index)=>({work_item_id:`wi-${index+1}`,materialized_id:id}));
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'AUT-02 E2E','owner','test',$2,'local','main',$3,'{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`,[project,repo.root,repo.base]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'aut02',1,'{}','APPROVED')`,[moduleRevision,project]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'aut02',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,moduleRevision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,moduleRevision]);
    await pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,'test','APPROVED','WORK_ITEM_DELIVERY',2)`,[plan,project,module,moduleRevision,{work_items:logical.map(item=>({work_item_id:item.work_item_id}))},h('plan'),h('plan-json'),h('plan-md')]);
    await withTransaction(async client=>{
      await client.query(`SET CONSTRAINTS ALL DEFERRED`);
      await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`,[runtime,`aut02-${project}`]);
      await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','AUT-02 E2E')`,[runtime]);
    });
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`,[executionPolicy,`aut02-policy-${project}`,runtime]);
    await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`,[assurancePolicy,`aut02-assurance-${project}`,{agentPolicyNames:[`aut02-policy-${project}`],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},{schema_version:1,reviewer_runtime_ids:[runtime]}]);

    const facts:any[]=[];
    for(let index=0;index<logical.length;index++){
      const workItem=logical[index].materialized_id,worktree=randomUUID(),delivery=randomUUID(),operation=randomUUID(),job=randomUUID(),execution=randomUUID(),deliveryCandidate=randomUUID(),qaReport=randomUUID(),acceptance=randomUUID(),review=randomUUID(),decision=randomUUID(),mergeIntent=randomUUID(),mergeResult=randomUUID();
      const itemRevision=h(`work-item-${index}`),snapshotHash=h(`snapshot-${index}`),qaHash=h(`qa-${index}`),reportHash=h(`report-${index}`);
      await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$5,$6,$7,'ACCEPTED','WORK_ITEM_DELIVERY',2)`,[workItem,project,module,moduleRevision,round,`WI ${index+1}`,{work_item_id:logical[index].work_item_id,plan_revision_id:plan,acceptance_criteria:['accepted'],qa_matrix:[{command:'true',cwd:'.',timeout_seconds:10}],depends_on_ids:[]}]);
      await pool.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,$4,$5,$6,'RELEASED')`,[worktree,project,workItem,join(repo.root,`.wi-${index}`),`work-items/${workItem}`,repo.base]);
      await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'SCHEDULE_DEVELOPMENT','SUCCEEDED',$3,$4)`,[operation,project,`aut02-e2e-op:${operation}`,correlation]);
      await pool.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,head_sha,commits,qa_matrix,state,job_id) VALUES($1,$2,$3,$4,$5,$6,$7,'[]',$8::jsonb,'QA_APPROVED',NULL)`,[delivery,project,workItem,moduleRevision,worktree,repo.base,repo.phase,JSON.stringify([{command:'true',cwd:'.',timeout_seconds:10}])]);
      await pool.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM','COMPLETED',$5)`,[job,operation,project,delivery,`aut02-e2e-job:${job}`]);
      await pool.query(`UPDATE deliveries SET job_id=$2 WHERE id=$1`,[delivery,job]);
      await pool.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selection_reason,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$8,'DEVELOP_WORK_ITEM',$5,'development-agent','1','DEVELOP_WORK_ITEM','INTERNAL',$6,$7,1,'OUTPUT_SUBMITTED','{}','ORCHESTRATION_EXECUTION',1)`,[execution,job,operation,project,`aut02-e2e-execution:${execution}`,executionPolicy,`aut02-policy-${project}`,project]);
      await pool.query(`INSERT INTO work_item_delivery_candidates(id,pipeline_version,policy_version,project_id,module_id,module_revision_id,module_round_id,module_plan_revision_id,work_item_id,work_item_revision_id,delivery_id,job_id,producer_execution_id,worktree_id,base_sha,head_sha,branch_ref,changed_paths_hash,patch_hash,commits,output_evidence_refs,producer_identity,qa_matrix,qa_matrix_hash,acceptance_criteria,acceptance_criteria_hash,source_operation_id,correlation_id,idempotency_key,snapshot_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'[]','[]','{}',$20::jsonb,$21,'[]',$22,$23,$24,$25,$26)`,[deliveryCandidate,AUT02_PIPELINE_VERSION,AUT02_POLICY_VERSION,project,module,moduleRevision,round,plan,workItem,itemRevision,delivery,job,execution,worktree,repo.base,repo.phase,`work-items/${workItem}`,h(`paths-${index}`),h(`patch-${index}`),JSON.stringify([{command:'true',cwd:'.',timeout_seconds:10}]),qaHash,h('criteria'),operation,correlation,`delivery-candidate:v1:${delivery}:${repo.phase}`,snapshotHash]);
      await pool.query(`INSERT INTO delivery_qa_reports(id,project_id,delivery_candidate_id,policy_version,executor_version,environment_version,head_sha,qa_matrix_hash,result,report,report_hash,evidence_refs) VALUES($1,$2,$3,'DELIVERY_QA_POLICY:v1','test','node',$4,$5,'PASS','{}',$6,'[]')`,[qaReport,project,deliveryCandidate,repo.phase,qaHash,reportHash]);
      await pool.query(`INSERT INTO work_acceptances(id,execution_id,project_id,correlation_id,policy_id,policy_version,producer_identity,state,classification,delivery_candidate_id) VALUES($1,$2,$3,$4,$5,1,'{}','ACCEPTED','INTERNAL',$6)`,[acceptance,execution,project,correlation,assurancePolicy,deliveryCandidate]);
      await pool.query(`INSERT INTO assurance_reviews(id,acceptance_id,version,reviewer_agent_id,reviewer_agent_version,execution_context_hash,independence_check,state,review_package,decided_at) VALUES($1,$2,1,'quality-assurance','1',$3,$4,'DECIDED','{}',clock_timestamp())`,[review,acceptance,h(`context-${index}`),{eligible:true,different_agent:true,different_context:true,different_runtime:true}]);
      await pool.query(`INSERT INTO review_decisions(id,review_id,decision,evidence,idempotency_key) VALUES($1,$2,'ACCEPT','{}',$3)`,[decision,review,`aut02-e2e-review:${review}`]);
      await pool.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,correlation_id,idempotency_key,status,completed_at) VALUES($1,$2,'GIT_PHASE','MERGE_WORK_ITEM',$3,$4,$5,$6,$7,$8,$9,'COMPLETED',clock_timestamp())`,[mergeIntent,project,deliveryCandidate,workItem,module,moduleRevision,round,correlation,`merge:v1:${deliveryCandidate}`]);
      facts.push({workItem,deliveryCandidate,delivery,qaReport,acceptance,review,decision,mergeIntent,mergeResult,itemRevision,snapshotHash,qaHash,reportHash});
    }
    const insertMerge=async(fact:any,index:number)=>pool.query(`INSERT INTO work_item_merge_results(id,project_id,delivery_candidate_id,work_item_id,intent_id,target_ref,phase_before_sha,delivery_head_sha,phase_after_sha,expected_parents,observed_parents,state,evidence,evidence_hash,recorded_at) VALUES($1,$2,$3,$4,$5,'phases/3',$6,$7,$7,$8,$8,'MERGE_RECORDED','{}',$9,clock_timestamp()+($10*interval '1 millisecond'))`,[fact.mergeResult,project,fact.deliveryCandidate,fact.workItem,fact.mergeIntent,repo.base,repo.phase,JSON.stringify([repo.base,repo.phase]),h(`merge-evidence-${index}`),index]);
    await insertMerge(facts[0],0);await insertMerge(facts[1],1);
    await withTransaction(client=>enqueueAut02Intent(client,{projectId:project,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-test:n-minus-one:${project}`,correlationId:correlation,moduleId:module,moduleRevisionId:moduleRevision,moduleRoundId:round}));
    await reconcileAutomaticAssuranceIntegration(10,'aut02-e2e-n-minus-one');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1 AND pipeline_version=$2`,[project,AUT02_PIPELINE_VERSION])).rows[0].n),0);
    assert.ok((await pool.query(`SELECT state FROM work_items WHERE project_id=$1 ORDER BY id`,[project])).rows.every((row:any)=>row.state==='ACCEPTED'));

    await insertMerge(facts[2],2);
    const failureFunction=`aut02_e2e_fail_ready_${randomUUID().replaceAll('-','')}`,failureTrigger=`aut02_e2e_fail_ready_${randomUUID().replaceAll('-','')}`;
    await pool.query(`CREATE FUNCTION ${failureFunction}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id='${facts[1].workItem}'::uuid AND NEW.state='READY_FOR_INTEGRATION' THEN RAISE EXCEPTION 'AUT02_E2E_CONTROLLED_READY_FAILURE'; END IF; RETURN NEW; END $$`);
    await pool.query(`CREATE TRIGGER ${failureTrigger} BEFORE UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION ${failureFunction}()`);
    await withTransaction(client=>enqueueAut02Intent(client,{projectId:project,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-test:controlled-rollback:${project}`,correlationId:correlation,moduleId:module,moduleRevisionId:moduleRevision,moduleRoundId:round}));
    await reconcileAutomaticAssuranceIntegration(10,'aut02-e2e-controlled-rollback');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1 AND pipeline_version=$2`,[project,AUT02_PIPELINE_VERSION])).rows[0].n),0);
    assert.ok((await pool.query(`SELECT state FROM work_items WHERE project_id=$1 ORDER BY id`,[project])).rows.every((row:any)=>row.state==='ACCEPTED'));
    await pool.query(`DROP TRIGGER ${failureTrigger} ON work_items`);await pool.query(`DROP FUNCTION ${failureFunction}()`);
    await withTransaction(client=>enqueueAut02Intent(client,{projectId:project,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-test:last-a:${project}`,correlationId:correlation,moduleId:module,moduleRevisionId:moduleRevision,moduleRoundId:round}));
    await withTransaction(client=>enqueueAut02Intent(client,{projectId:project,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-test:last-b:${project}`,correlationId:correlation,moduleId:module,moduleRevisionId:moduleRevision,moduleRoundId:round}));
    await Promise.all([reconcileAutomaticAssuranceIntegration(10,'aut02-e2e-last-a'),reconcileAutomaticAssuranceIntegration(10,'aut02-e2e-last-b')]);
    const candidates=(await pool.query(`SELECT * FROM integration_candidates WHERE project_id=$1 AND pipeline_version=$2`,[project,AUT02_PIPELINE_VERSION])).rows;assert.equal(candidates.length,1);const candidate=candidates[0];
    assert.equal(candidate.manifest.members.length,3);assert.equal(candidate.manifest_hash,deterministicHash(candidate.manifest));
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidate_members WHERE candidate_id=$1`,[candidate.id])).rows[0].n),3);
    assert.ok((await pool.query(`SELECT state FROM work_items WHERE project_id=$1 ORDER BY id`,[project])).rows.every((row:any)=>row.state==='READY_FOR_INTEGRATION'));
    await assert.rejects(pool.query(`UPDATE integration_candidates SET manifest='{}' WHERE id=$1`,[candidate.id]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE integration_candidate_members SET member_index=9 WHERE candidate_id=$1 AND member_index=0`,[candidate.id]),(error:any)=>error.code==='23514');
    await withTransaction(client=>enqueueAut02Intent(client,{projectId:project,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-test:replay:${project}`,correlationId:correlation,moduleId:module,moduleRevisionId:moduleRevision,moduleRoundId:round}));await reconcileAutomaticAssuranceIntegration(10,'aut02-e2e-replay');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1 AND pipeline_version=$2`,[project,AUT02_PIPELINE_VERSION])).rows[0].n),1);
    const projected=await automaticAssuranceIntegrationProjection(project);assert.equal(projected.candidates[0].manifest_hash,candidate.manifest_hash);assert.equal(projected.work_items.length,3);assert.ok(projected.work_items.every((member:any)=>member.candidate_id===candidate.id&&member.candidate_manifest_hash===candidate.manifest_hash));

    git(repo.root,'checkout','integration');git(repo.root,'merge','--no-ff','--no-edit','phases/3');const integratedSha=git(repo.root,'rev-parse','HEAD'),integratedParents=git(repo.root,'show','-s','--format=%P',integratedSha).split(' '),attempt=randomUUID(),integrationOperation=randomUUID();
    assert.deepEqual(integratedParents,[repo.base,repo.phase]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'INTEGRATE_CANDIDATE','RUNNING',$3,$4)`,[integrationOperation,project,`aut02-e2e-integration:${candidate.id}`,correlation]);
    await pool.query(`UPDATE integration_candidates SET state='INTEGRATION_IN_PROGRESS' WHERE id=$1`,[candidate.id]);await pool.query(`UPDATE work_items SET state='INTEGRATING' WHERE project_id=$1`,[project]);
    await pool.query(`INSERT INTO integration_attempts(id,project_id,candidate_id,operation_id,idempotency_key,integration_before_sha,candidate_sha,state,expected_parents) VALUES($1,$2,$3,$4,$5,$6,$7,'PRE_EFFECT',$8::jsonb)`,[attempt,project,candidate.id,integrationOperation,`aut02-e2e-attempt:${candidate.id}`,repo.base,repo.phase,JSON.stringify([repo.base,repo.phase])]);
    await pool.query(`UPDATE work_items SET state='READY_FOR_INTEGRATION' WHERE id=$1`,[facts[1].workItem]);await assert.rejects(finalizeAut02IntegratedCandidate(candidate.id,attempt,integratedSha),(error:any)=>error.code==='AUT02_COLLECTIVE_FINALIZATION_CONFLICT');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_items WHERE project_id=$1 AND state='INTEGRATED'`,[project])).rows[0].n),0);await pool.query(`UPDATE work_items SET state='INTEGRATING' WHERE id=$1`,[facts[1].workItem]);
    const finalizers=await Promise.all([finalizeAut02IntegratedCandidate(candidate.id,attempt,integratedSha),finalizeAut02IntegratedCandidate(candidate.id,attempt,integratedSha)]);assert.equal(finalizers.filter(result=>result.replayed).length,1);const finalized=finalizers.find(result=>!result.replayed)!;assert.equal(finalized.work_item_ids?.length,3);
    assert.ok((await pool.query(`SELECT state FROM work_items WHERE project_id=$1 ORDER BY id`,[project])).rows.every((row:any)=>row.state==='INTEGRATED'));
    assert.equal((await pool.query(`SELECT state FROM integration_candidates WHERE id=$1`,[candidate.id])).rows[0].state,'INTEGRATED');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[`macro-reevaluate:v1:${project}:aut02-candidate:${candidate.id}`])).rows[0].n),1);
    const replay=await finalizeAut02IntegratedCandidate(candidate.id,attempt,integratedSha);assert.equal(replay.replayed,true);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type='INTEGRATION_RECORDED'`,[project])).rows[0].n),1);
  });
}
