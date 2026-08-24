import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('AUT-02 QA requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  process.env.NAAMIVE_ARTIFACT_STORE_URI??='file:///tmp/naamive-aut02-qa-artifacts';
  process.env.NAAMIVE_OPERATOR_ID??='aut02-qa-test-operator';
  const {pool,withTransaction}=await import('./db.js');
  const {decideReview}=await import('./assurance.js');
  const {freezeWorkItemDeliveryCandidate,reconcileAutomaticAssuranceIntegration}=await import('./automatic-assurance-integration.js');
  const {requestAut02MergeRecovery}=await import('./recovery.js');

  const git=(cwd:string,...args:string[])=>execFileSync('git',['-C',cwd,...args],{encoding:'utf8'}).trim();

  test('AUT-02 runs frozen QA, dispatches independent review, and only Assurance ACCEPT enables merge',async t=>{
    const root=mkdtempSync(join(tmpdir(),'naamive-aut02-qa-')),project=randomUUID(),moduleRevision=randomUUID(),module=randomUUID(),round=randomUUID(),plan=randomUUID(),workItem=randomUUID(),worktree=randomUUID(),delivery=randomUUID(),operation=randomUUID(),job=randomUUID(),runtimeA=randomUUID(),runtimeB=randomUUID(),executionPolicy=randomUUID(),assurancePolicy=randomUUID(),correlation=randomUUID();
    t.after(async()=>{await pool.query(`UPDATE assurance_policies SET enabled=false WHERE id=$1`,[assurancePolicy]);await pool.end();});
    git(root,'init');git(root,'config','user.name','AUT-02 Test');git(root,'config','user.email','aut02@test.invalid');writeFileSync(join(root,'base.txt'),'base');git(root,'add','base.txt');git(root,'commit','-m','base');
    const base=git(root,'rev-parse','HEAD'),branch=`work-items/${workItem}`;git(root,'branch','phases/3',base);git(root,'checkout','-b',branch,base);writeFileSync(join(root,'result.txt'),'verified');git(root,'add','result.txt');
    git(root,'-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',`feat(${workItem}): verified output\n\nNaamive-Project: ${project}\nNaamive-Phase: 3\nNaamive-Execution: ${job}\nNaamive-Work-Item: ${workItem}`);const head=git(root,'rev-parse','HEAD');
    const policyName=`aut02-qa-policy-${project}`;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'AUT-02 QA E2E','owner','test',$2,'local','main',$3,'{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`,[project,root,base]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'aut02-qa',1,'{}','APPROVED')`,[moduleRevision,project]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'aut02-qa',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,moduleRevision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,moduleRevision]);
    await pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES($1,$2,$3,1,$4,$5,$6,$6,$6,'test','APPROVED','WORK_ITEM_DELIVERY',2)`,[plan,project,module,moduleRevision,{work_items:[{work_item_id:'qa-1'}]},'a'.repeat(64)]);
    await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version) VALUES($1,$2,$3,$4,$5,'QA WI',$6,'QA_IN_PROGRESS','WORK_ITEM_DELIVERY',2)`,[workItem,project,module,moduleRevision,round,{work_item_id:'qa-1',plan_revision_id:plan,acceptance_criteria:['QA and independent ACCEPT'],qa_matrix:[{command:'test -f result.txt',cwd:'.',timeout_seconds:10}],depends_on_ids:[]}]);
    await pool.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,$4,$5,$6,'ACTIVE')`,[worktree,project,workItem,root,branch,base]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'START_DEVELOPMENT','SUCCEEDED',$3,$4)`,[operation,project,`aut02-qa-operation:${operation}`,correlation]);
    await pool.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,head_sha,commits,qa_matrix,state,job_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,'EVIDENCE_REVIEW',NULL)`,[delivery,project,workItem,moduleRevision,worktree,base,head,JSON.stringify([head]),JSON.stringify([{command:'test -f result.txt',cwd:'.',timeout_seconds:10}])]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM','COMPLETED',$5)`,[job,operation,project,delivery,`aut02-qa-job:${job}`]);await pool.query(`UPDATE deliveries SET job_id=$2 WHERE id=$1`,[delivery,job]);
    await pool.query(`INSERT INTO artifacts(id,project_id,execution_id,artifact_type,storage_uri,storage_key,sha256,schema_version) VALUES(gen_random_uuid(),$1,$2,'development-execution-evidence','file:///tmp/aut02-qa-evidence',$3,$4,1)`,[project,operation,`aut02-qa-evidence/${operation}`,'e'.repeat(64)]);
    await withTransaction(async client=>{await client.query(`SET CONSTRAINTS ALL DEFERRED`);for(const [runtime,name] of [[runtimeA,'producer'],[runtimeB,'reviewer']] as const){await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`,[runtime,`aut02-${name}-${project}`]);await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','AUT-02 QA E2E')`,[runtime]);}});
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`,[executionPolicy,policyName,runtimeA]);
    await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`,[assurancePolicy,`aut02-qa-assurance-${project}`,{agentPolicyNames:[policyName],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},{schema_version:1,reviewer_runtime_ids:[runtimeB]}]);

    const frozen=await withTransaction(client=>freezeWorkItemDeliveryCandidate(client,{deliveryId:delivery,headSha:head,sourceOperationId:operation,correlationId:correlation}));assert.ok(frozen?.id);
    await reconcileAutomaticAssuranceIntegration(10,'aut02-qa-pass');
    const report=(await pool.query(`SELECT * FROM delivery_qa_reports WHERE delivery_candidate_id=$1`,[frozen.id])).rows[0];assert.equal(report.result,'PASS');assert.equal(report.head_sha,head);assert.equal(report.qa_matrix_hash,frozen.qa_matrix_hash);
    await assert.rejects(pool.query(`UPDATE delivery_qa_reports SET result='FAIL' WHERE id=$1`,[report.id]),(error:any)=>error.code==='23514');
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[workItem])).rows[0].state,'INDEPENDENT_REVIEW');
    await reconcileAutomaticAssuranceIntegration(10,'aut02-review-handoff');
    const handoffIntent=(await pool.query(`SELECT status,last_error FROM assurance_integration_intents WHERE delivery_candidate_id=$1 AND kind='START_INDEPENDENT_REVIEW'`,[frozen.id])).rows[0];assert.equal(handoffIntent.status,'COMPLETED',handoffIntent.last_error);
    const acceptance=(await pool.query(`SELECT * FROM work_acceptances WHERE delivery_candidate_id=$1`,[frozen.id])).rows[0],review=(await pool.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1`,[acceptance.id])).rows[0];
    assert.equal(acceptance.state,'PENDING_REVIEW');assert.equal(review.state,'DISPATCHED');assert.equal(review.reviewer_runtime_id,runtimeB);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM assurance_integration_intents WHERE delivery_candidate_id=$1 AND kind='MERGE_WORK_ITEM'`,[frozen.id])).rows[0].n),0);
    await decideReview(review.id,'ACCEPT',{qa_report_id:report.id,qa_report_hash:report.report_hash,delivery_candidate_id:frozen.id},`aut02-qa-accept:${review.id}`);
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`,[workItem])).rows[0].state,'ACCEPTED');assert.equal((await pool.query(`SELECT state FROM work_acceptances WHERE id=$1`,[acceptance.id])).rows[0].state,'ACCEPTED');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM assurance_integration_intents WHERE delivery_candidate_id=$1 AND kind='MERGE_WORK_ITEM'`,[frozen.id])).rows[0].n),1);
    const mergeIntent=(await pool.query(`SELECT * FROM assurance_integration_intents WHERE delivery_candidate_id=$1 AND kind='MERGE_WORK_ITEM'`,[frozen.id])).rows[0],mergeResult=randomUUID();await pool.query(`INSERT INTO work_item_merge_results(id,project_id,delivery_candidate_id,work_item_id,intent_id,target_ref,phase_before_sha,delivery_head_sha,expected_parents,state) VALUES($1,$2,$3,$4,$5,'phases/3',$6,$7,$8::jsonb,'EFFECT_UNKNOWN')`,[mergeResult,project,frozen.id,workItem,mergeIntent.id,base,head,JSON.stringify([base,head])]);await pool.query(`UPDATE assurance_integration_intents SET status='FAILED',effect_state='EFFECT_UNKNOWN' WHERE id=$1`,[mergeIntent.id]);
    await requestAut02MergeRecovery(project,workItem,mergeIntent.id,`aut02-merge-recovery-not-applied:${mergeResult}`);assert.equal(git(root,'rev-parse','phases/3'),base);assert.equal((await pool.query(`SELECT state FROM work_item_merge_results WHERE id=$1`,[mergeResult])).rows[0].state,'NOT_APPLIED');assert.equal((await pool.query(`SELECT status FROM assurance_integration_intents WHERE id=$1`,[mergeIntent.id])).rows[0].status,'PENDING');
    git(root,'checkout','phases/3');git(root,'merge','--no-ff','--no-edit',branch);const appliedSha=git(root,'rev-parse','HEAD');await pool.query(`UPDATE work_items SET version=version+1 WHERE id=$1`,[workItem]);await pool.query(`UPDATE work_item_merge_results SET state='EFFECT_UNKNOWN' WHERE id=$1`,[mergeResult]);await pool.query(`UPDATE assurance_integration_intents SET status='FAILED',effect_state='EFFECT_UNKNOWN' WHERE id=$1`,[mergeIntent.id]);
    await requestAut02MergeRecovery(project,workItem,mergeIntent.id,`aut02-merge-recovery-applied:${mergeResult}`);assert.equal((await pool.query(`SELECT state FROM work_item_merge_results WHERE id=$1`,[mergeResult])).rows[0].state,'MERGE_RECORDED');assert.equal((await pool.query(`SELECT phase_after_sha FROM work_item_merge_results WHERE id=$1`,[mergeResult])).rows[0].phase_after_sha,appliedSha);assert.equal((await pool.query(`SELECT status FROM assurance_integration_intents WHERE id=$1`,[mergeIntent.id])).rows[0].status,'COMPLETED');
    await reconcileAutomaticAssuranceIntegration(10,'aut02-candidate');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_merge_results WHERE delivery_candidate_id=$1 AND state='MERGE_RECORDED'`,[frozen.id])).rows[0].n),1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1 AND pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1'`,[project])).rows[0].n),1);
  });
}
