import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('AUT-02 integration recovery requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  process.env.NAAMIVE_ARTIFACT_STORE_URI??='file:///tmp/naamive-aut02-recovery-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS??='/tmp';
  process.env.NAAMIVE_OPERATOR_ID??='aut02-recovery-test-operator';
  const {pool,withTransaction}=await import('./db.js');
  const {AUT02_PIPELINE_VERSION,AUT02_POLICY_VERSION,AUT02_V1_PIPELINE_VERSION,AUT02_V1_POLICY_VERSION}=await import('./aut02-ledger.js');
  const {deterministicHash,finalizeAut02IntegratedCandidate}=await import('./automatic-assurance-integration.js');
  const {mergeAndPushDetached}=await import('./git-delivery.js');
  const {requestIntegrationRecovery}=await import('./recovery.js');
  test.after(async()=>pool.end());

  const git=(cwd:string,...args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();
  const hash=(value:string)=>deterministicHash(value);
  type Pipeline=typeof AUT02_V1_PIPELINE_VERSION|typeof AUT02_PIPELINE_VERSION;

  const seed=async(pipeline:Pipeline,label:string)=>{
    const root=mkdtempSync(join(tmpdir(),'naamive-aut02-recovery-')),bare=join(root,'remote.git'),repo=join(root,'repo');
    execFileSync('git',['init','--bare',bare]);execFileSync('git',['clone',bare,repo]);
    git(repo,'config','user.name','AUT-02 Recovery Test');git(repo,'config','user.email','aut02-recovery@test.invalid');
    writeFileSync(join(repo,'base.txt'),'base');git(repo,'add','.');git(repo,'commit','-m','base');git(repo,'branch','-M','integration');git(repo,'push','origin','integration');
    git(repo,'checkout','-b','phases/3');writeFileSync(join(repo,`${label}.txt`),label);git(repo,'add','.');git(repo,'commit','-m',label);git(repo,'push','origin','phases/3');git(repo,'checkout','integration');
    const base=git(repo,'rev-parse','HEAD'),phase=git(repo,'rev-parse','phases/3');
    const project=randomUUID(),revision=randomUUID(),module=randomUUID(),round=randomUUID(),plan=randomUUID(),workItem=randomUUID(),dependent=randomUUID(),worktree=randomUUID(),delivery=randomUUID(),operation=randomUUID(),job=randomUUID(),runtime=randomUUID(),executionPolicy=randomUUID(),assurancePolicy=randomUUID(),execution=randomUUID(),deliveryCandidate=randomUUID(),qaReport=randomUUID(),acceptance=randomUUID(),review=randomUUID(),reviewDecision=randomUUID(),mergeIntent=randomUUID(),mergeResult=randomUUID(),candidate=randomUUID(),attempt=randomUUID(),correlation=randomUUID();
    const policy=pipeline===AUT02_PIPELINE_VERSION?AUT02_POLICY_VERSION:AUT02_V1_POLICY_VERSION;
    const planItems=['primary','dependent'];
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'AUT-02 recovery','owner','test',$2,$3,'integration',$4,'{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`,[project,repo,`file://${bare}`,base]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'recovery',1,'{}','APPROVED')`,[revision,project]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'recovery',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,revision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,revision]);
    await pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version,integration_pipeline_version) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,'test','APPROVED','WORK_ITEM_DELIVERY',2,$9)`,[plan,project,module,revision,{work_items:planItems.map(work_item_id=>({work_item_id}))},hash(`${label}:plan`),hash(`${label}:json`),hash(`${label}:markdown`),pipeline]);
    await withTransaction(async client=>{await client.query(`SET CONSTRAINTS ALL DEFERRED`);await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`,[runtime,`aut02-recovery-${project}`]);await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','AUT-02 recovery')`,[runtime]);});
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`,[executionPolicy,`aut02-recovery-policy-${project}`,runtime]);
    await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`,[assurancePolicy,`aut02-recovery-assurance-${project}`,{agentPolicyNames:[`aut02-recovery-policy-${project}`],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},{schema_version:1,reviewer_runtime_ids:[runtime]}]);
    await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id,integration_pipeline_version) VALUES($1,$2,$3,$4,$5,'primary',$6,'INTEGRATING','WORK_ITEM_DELIVERY',2,$7,'primary',$8),($9,$2,$3,$4,$5,'dependent',$10,'WAITING_FOR_DEPENDENCIES','WORK_ITEM_DELIVERY',2,$7,'dependent',$8)`,[workItem,project,module,revision,round,{work_item_id:'primary',plan_revision_id:plan,depends_on_ids:[],allowlist:['persistence.txt'],denylist:['.env'],qa_matrix:[{command:'true',cwd:'.',timeout_seconds:10}]},plan,pipeline,dependent,{work_item_id:'dependent',plan_revision_id:plan,depends_on_ids:['primary'],allowlist:['persistence.txt'],denylist:['.env'],qa_matrix:[]}]);
    await pool.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,$4,$5,$6,'RELEASED')`,[worktree,project,workItem,join(root,'worktree'),`work-items/${workItem}`,base]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'INTEGRATE_CANDIDATE','RUNNING',$3,$4)`,[operation,project,`aut02-recovery-operation:${candidate}`,correlation]);
    await pool.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,head_sha,commits,qa_matrix,state,job_id) VALUES($1,$2,$3,$4,$5,$6,$7,'[]',$8::jsonb,'QA_APPROVED',NULL)`,[delivery,project,workItem,revision,worktree,base,phase,JSON.stringify([{command:'true',cwd:'.',timeout_seconds:10}])]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM','COMPLETED',$5)`,[job,operation,project,delivery,`aut02-recovery-job:${job}`]);await pool.query(`UPDATE deliveries SET job_id=$2 WHERE id=$1`,[delivery,job]);
    await pool.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selection_reason,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$8,'DEVELOP_WORK_ITEM',$5,'development-agent','1','DEVELOP_WORK_ITEM','INTERNAL',$6,$7,1,'OUTPUT_SUBMITTED','{}','ORCHESTRATION_EXECUTION',1)`,[execution,job,operation,project,`aut02-recovery-execution:${execution}`,executionPolicy,`aut02-recovery-policy-${project}`,project]);
    const itemRevision=hash(`${label}:item`),qaHash=hash(`${label}:qa`),snapshotHash=hash(`${label}:snapshot`);
    await pool.query(`INSERT INTO work_item_delivery_candidates(id,pipeline_version,policy_version,project_id,module_id,module_revision_id,module_round_id,module_plan_revision_id,plan_work_item_id,work_item_id,work_item_revision_id,delivery_id,job_id,producer_execution_id,worktree_id,base_sha,head_sha,branch_ref,changed_paths_hash,patch_hash,commits,output_evidence_refs,producer_identity,qa_matrix,qa_matrix_hash,acceptance_criteria,acceptance_criteria_hash,source_operation_id,correlation_id,idempotency_key,snapshot_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'primary',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'[]','[]','{}',$20::jsonb,$21,'[]',$22,$23,$24,$25,$26)`,[deliveryCandidate,pipeline,policy,project,module,revision,round,plan,workItem,itemRevision,delivery,job,execution,worktree,base,phase,`work-items/${workItem}`,hash(`${label}:paths`),hash(`${label}:patch`),JSON.stringify([{command:'true',cwd:'.',timeout_seconds:10}]),qaHash,hash(`${label}:criteria`),operation,correlation,`delivery-candidate:${label}:${project}`,snapshotHash]);
    await pool.query(`INSERT INTO delivery_qa_reports(id,project_id,delivery_candidate_id,policy_version,executor_version,environment_version,head_sha,qa_matrix_hash,result,report,report_hash,evidence_refs) VALUES($1,$2,$3,'DELIVERY_QA_POLICY:v1','test','node',$4,$5,'PASS','{}',$6,'[]')`,[qaReport,project,deliveryCandidate,phase,qaHash,hash(`${label}:report`)]);
    await pool.query(`INSERT INTO work_acceptances(id,execution_id,project_id,correlation_id,policy_id,policy_version,producer_identity,state,classification,delivery_candidate_id) VALUES($1,$2,$3,$4,$5,1,'{}','ACCEPTED','INTERNAL',$6)`,[acceptance,execution,project,correlation,assurancePolicy,deliveryCandidate]);
    await pool.query(`INSERT INTO assurance_reviews(id,acceptance_id,version,reviewer_agent_id,reviewer_agent_version,execution_context_hash,independence_check,state,review_package,decided_at) VALUES($1,$2,1,'quality-assurance','1',$3,$4,'DECIDED','{}',clock_timestamp())`,[review,acceptance,hash(`${label}:context`),{eligible:true,different_agent:true,different_context:true,different_runtime:true}]);
    await pool.query(`INSERT INTO review_decisions(id,review_id,decision,evidence,idempotency_key) VALUES($1,$2,'ACCEPT','{}',$3)`,[reviewDecision,review,`aut02-recovery-review:${review}`]);
    await pool.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,correlation_id,idempotency_key,status,completed_at) VALUES($1,$2,'GIT_PHASE','MERGE_WORK_ITEM',$3,$4,$5,$6,$7,$8,$9,'COMPLETED',clock_timestamp())`,[mergeIntent,project,deliveryCandidate,workItem,module,revision,round,correlation,`aut02-recovery-merge:${deliveryCandidate}`]);
    await pool.query(`INSERT INTO work_item_merge_results(id,project_id,delivery_candidate_id,work_item_id,intent_id,target_ref,phase_before_sha,delivery_head_sha,phase_after_sha,expected_parents,observed_parents,state,evidence,evidence_hash,recorded_at) VALUES($1,$2,$3,$4,$5,'phases/3',$6,$7,$7,$8,$8,'MERGE_RECORDED','{}',$9,clock_timestamp())`,[mergeResult,project,deliveryCandidate,workItem,mergeIntent,base,phase,JSON.stringify([base,phase]),hash(`${label}:merge`)]);
    const member={member_index:0,plan_work_item_id:'primary',work_item_id:workItem,work_item_revision_id:itemRevision,delivery_candidate_id:deliveryCandidate,delivery_id:delivery,qa_report_id:qaReport,work_acceptance_id:acceptance,assurance_review_id:review,review_decision_id:reviewDecision,merge_result_id:mergeResult,merged_sha:phase};
    const manifest:any={schema_version:pipeline===AUT02_PIPELINE_VERSION?'IntegrationCandidateManifest:v2':'IntegrationCandidateManifest:v1',pipeline_version:pipeline,policy_version:policy,project_id:project,module_id:module,module_revision_id:revision,module_round_id:round,module_plan_revision_id:plan,required_work_item_set_policy_version:'RequiredWorkItemSet:v1',required_work_item_set:planItems,observed_work_item_set:['primary'],required_work_item_set_fingerprint:hash(`${label}:required-set`),phase_ref:'phases/3',phase_sha:phase,integration_ref:'integration',members:[member]};
    if(pipeline===AUT02_PIPELINE_VERSION){manifest.integration_cohort_policy_version='IntegrationCohort:v1';manifest.integration_cohort_hash=hash(`${label}:cohort`);}
    await pool.query(`INSERT INTO integration_candidates(id,project_id,phase_sha,manifest,state,blocked_kind,pipeline_version,policy_version,module_id,module_revision_id,module_round_id,generation,manifest_hash,idempotency_key,correlation_id) VALUES($1,$2,$3,$4,'INTEGRATION_BLOCKED','GIT_RECOVERABLE',$5,$6,$7,$8,$9,1,$10,$11,$12)`,[candidate,project,phase,manifest,pipeline,policy,module,revision,round,hash(JSON.stringify(manifest)),`aut02-recovery-candidate:${label}:${project}`,correlation]);
    await pool.query(`INSERT INTO integration_candidate_members(candidate_id,project_id,member_index,work_item_id,work_item_revision_id,delivery_candidate_id,delivery_id,qa_report_id,work_acceptance_id,assurance_review_id,review_decision_id,merge_result_id,merged_sha,member_manifest) VALUES($1,$2,0,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[candidate,project,workItem,itemRevision,deliveryCandidate,delivery,qaReport,acceptance,review,reviewDecision,mergeResult,phase,member]);
    if(pipeline===AUT02_PIPELINE_VERSION)await pool.query(`INSERT INTO integration_candidate_member_reservations(candidate_id,project_id,work_item_id) VALUES($1,$2,$3)`,[candidate,project,workItem]);
    return {root,repo,project,workItem,dependent,candidate,attempt,operation,base,phase,pipeline,manifest,cleanup:()=>rmSync(root,{recursive:true,force:true})};
  };

  const assertCanonicalRecovery=async(s:Awaited<ReturnType<typeof seed>>)=>{
    assert.equal((await pool.query(`SELECT state FROM integration_candidates WHERE id=$1`,[s.candidate])).rows[0].state,'INTEGRATED');
    assert.equal((await pool.query(`SELECT state FROM integration_attempts WHERE id=$1`,[s.attempt])).rows[0].state,'INTEGRATED');
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[s.workItem])).rows[0].state,'INTEGRATED');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type='INTEGRATION_RECORDED' AND payload->>'candidate_id'=$2`,[s.project,s.candidate])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type='WORK_ITEM_INTEGRATED' AND payload->>'work_item_id'=$2`,[s.project,s.workItem])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='aut02-integration-evidence'`,[s.project])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[`macro-reevaluate:v1:${s.project}:aut02-candidate:${s.candidate}`])).rows[0].n),1);
    if(s.pipeline===AUT02_PIPELINE_VERSION)assert.equal((await pool.query(`SELECT state FROM integration_candidate_member_reservations WHERE candidate_id=$1 AND work_item_id=$2`,[s.candidate,s.workItem])).rows[0].state,'RELEASED');
  };

  test('AUT-02 v2 recovery canonically records and retries integration cohorts while preserving v1 retry compatibility',async t=>{
    const priorConcurrency=process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY='999';t.after(()=>{if(priorConcurrency===undefined)delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY=priorConcurrency;});
    const applied=await seed(AUT02_PIPELINE_VERSION,'v2-applied');t.after(applied.cleanup);
    const appliedMerge=mergeAndPushDetached(applied.repo,'phases/3','integration',applied.phase,applied.base);
    await pool.query(`INSERT INTO integration_attempts(id,project_id,candidate_id,operation_id,idempotency_key,integration_before_sha,candidate_sha,state,expected_parents) VALUES($1,$2,$3,$4,$5,$6,$7,'EFFECT_UNKNOWN',$8::jsonb)`,[applied.attempt,applied.project,applied.candidate,applied.operation,`aut02-recovery-attempt:${applied.attempt}`,applied.base,applied.phase,JSON.stringify([applied.base,applied.phase])]);
    await requestIntegrationRecovery(applied.project,applied.candidate,'v2-applied-unrecorded','MERGE_TIMEOUT');await assertCanonicalRecovery(applied);
    assert.equal((await pool.query(`SELECT merge_sha FROM integration_attempts WHERE id=$1`,[applied.attempt])).rows[0].merge_sha,appliedMerge.mergeSha);
    assert.equal((await finalizeAut02IntegratedCandidate(applied.candidate,applied.attempt,appliedMerge.mergeSha)).replayed,true);
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[applied.dependent])).rows[0].state,'DISPATCHED');

    const retried=await seed(AUT02_PIPELINE_VERSION,'v2-retry');t.after(retried.cleanup);
    await pool.query(`INSERT INTO integration_attempts(id,project_id,candidate_id,operation_id,idempotency_key,integration_before_sha,candidate_sha,state,expected_parents) VALUES($1,$2,$3,$4,$5,$6,$7,'FAILED',$8::jsonb)`,[retried.attempt,retried.project,retried.candidate,retried.operation,`aut02-recovery-attempt:${retried.attempt}`,retried.base,retried.phase,JSON.stringify([retried.base,retried.phase])]);
    await requestIntegrationRecovery(retried.project,retried.candidate,'v2-no-effect-retry','MERGE_TIMEOUT');await assertCanonicalRecovery(retried);

    const legacy=await seed(AUT02_V1_PIPELINE_VERSION,'v1-retry');t.after(legacy.cleanup);
    await pool.query(`INSERT INTO integration_attempts(id,project_id,candidate_id,operation_id,idempotency_key,integration_before_sha,candidate_sha,state,expected_parents) VALUES($1,$2,$3,$4,$5,$6,$7,'FAILED',$8::jsonb)`,[legacy.attempt,legacy.project,legacy.candidate,legacy.operation,`aut02-recovery-attempt:${legacy.attempt}`,legacy.base,legacy.phase,JSON.stringify([legacy.base,legacy.phase])]);
    await requestIntegrationRecovery(legacy.project,legacy.candidate,'v1-no-effect-retry','MERGE_TIMEOUT');await assertCanonicalRecovery(legacy);
    const legacyManifest=(await pool.query(`SELECT manifest FROM integration_candidates WHERE id=$1`,[legacy.candidate])).rows[0].manifest;
    assert.equal(legacyManifest.integration_cohort_policy_version,undefined);
  });
}
