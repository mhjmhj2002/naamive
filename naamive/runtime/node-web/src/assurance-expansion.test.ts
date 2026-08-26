import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { assuranceExpansionMatrix, assurancePolicyHash, sameLegacyPolicyIdentity, validateAssuranceExpansionPolicy } from './assurance-expansion.js';

test('AUT-03 has a closed real-work matrix',()=>{
  assert.equal(assuranceExpansionMatrix('PLAN_MODULE_WORK_ITEMS')?.acceptance,'OWN');
  assert.equal(assuranceExpansionMatrix('DEVELOP_WORK_ITEM')?.acceptance,'AUT02_SHARED');
  assert.equal(assuranceExpansionMatrix('RUN_DELIVERY_QA')?.subject,'WorkItemDeliveryCandidate:v1');
  for(const kind of ['MERGE_WORK_ITEM','REASSESS_INTEGRATION_CANDIDATE','VALIDATE_INTEGRATION_CANDIDATE']) {
    assert.equal(assuranceExpansionMatrix(kind)?.subject,'IntegrationCandidate:v1');
    assert.equal(assuranceExpansionMatrix(kind)?.selectable,false);
  }
  assert.equal(assuranceExpansionMatrix('PREPARE_DELIVERY_PACKAGE')?.runtime,false);
  assert.equal(assuranceExpansionMatrix('SECURITY_SCAN'),null);
});

test('AUT-03 policy permits only planning and AUT-02 shared development',()=>{
  const planning=validateAssuranceExpansionPolicy({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{schema_version:1,rollout_id:'canary'});
  assert.equal(planning.extension,true);
  const development=validateAssuranceExpansionPolicy({jobKinds:['DEVELOP_WORK_ITEM'],subjectKinds:['WorkItemDeliveryCandidate:v1']},{schema_version:1,aut02_shared_acceptance:true});
  assert.equal(development.extension,true);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['DEVELOP_WORK_ITEM'],subjectKinds:['WorkItemDeliveryCandidate:v1']},{schema_version:1}),/ASSURANCE_AUT02_SHARED_ACCEPTANCE_REQUIRED/);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1','WorkItemDeliveryCandidate:v1']},{schema_version:1}),/ASSURANCE_EXPANSION_SUBJECT_MISMATCH/);
  // Each non-selectable internal job is rejected with its own normative subject.
  // Asserting the subject against the matrix first makes this prove the real
  // matrix rather than passing by coincidence (the selectable check throws
  // before the subject-mismatch check).
  const internalJobs:Record<string,string>={RUN_DELIVERY_QA:'WorkItemDeliveryCandidate:v1',MERGE_WORK_ITEM:'IntegrationCandidate:v1',REASSESS_INTEGRATION_CANDIDATE:'IntegrationCandidate:v1',VALIDATE_INTEGRATION_CANDIDATE:'IntegrationCandidate:v1'};
  for(const [kind,subject] of Object.entries(internalJobs)){
    assert.equal(assuranceExpansionMatrix(kind)?.subject,subject);
    assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:[kind],subjectKinds:[subject]},{schema_version:1}),/ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE/);
  }
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['PREPARE_DELIVERY_PACKAGE'],subjectKinds:['DeliveryPackage:v1']},{schema_version:1}),/ASSURANCE_RELEASE_JOB_NOT_PUBLISHED/);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['SECURITY_SCAN'],subjectKinds:['SecurityReport:v1']},{schema_version:1}),/ASSURANCE_JOB_NOT_IN_NORMATIVE_MATRIX/);
});

test('AUT-03 policy hash is canonical and includes selectors and configuration',()=>{
  const first=assurancePolicyHash({subjectKinds:['ModulePlanProposal:v1'],jobKinds:['PLAN_MODULE_WORK_ITEMS']},{schema_version:1,rollout_id:'a'});
  const reordered=assurancePolicyHash({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{rollout_id:'a',schema_version:1});
  const changed=assurancePolicyHash({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{rollout_id:'b',schema_version:1});
  assert.equal(first,reordered);assert.notEqual(first,changed);
});

test('FINDING-03 legacy policy identity replay is null-safe and exact on (id,version)',()=>{
  const policyId='11111111-1111-4111-8111-111111111111';
  // 1. both null -> valid replay
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:null,legacy_policy_version:null},{legacyPolicy:null}),true);
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:null,legacy_policy_version:null},{}),true);
  // 2. same id AND same version -> valid replay
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:policyId,legacy_policy_version:1},{legacyPolicy:{id:policyId,version:1}}),true);
  // 3. same id but different version -> conflict
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:policyId,legacy_policy_version:1},{legacyPolicy:{id:policyId,version:2}}),false);
  // 4. different id -> conflict
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:policyId,legacy_policy_version:1},{legacyPolicy:{id:'22222222-2222-4222-8222-222222222222',version:1}}),false);
  // 5. one side null and the other not -> conflict
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:null,legacy_policy_version:null},{legacyPolicy:{id:policyId,version:1}}),false);
  assert.equal(sameLegacyPolicyIdentity({legacy_policy_id:policyId,legacy_policy_version:1},{legacyPolicy:null}),false);
});

if(!process.env.DATABASE_URL) test('AUT-03 PostgreSQL snapshot proof requires DATABASE_URL',{skip:'set DATABASE_URL'},()=>{});
else test('AUT-03 freezes development NOT_SELECTED and blocks snapshot deletion across a later policy publication',async()=>{
  const { pool }=await import('./db.js');
  const { reserveAssuranceDispatch }=await import('./assurance-expansion.js');
  const client=await pool.connect();
  const project=`aut03-snapshot-${randomUUID().slice(0,8)}`,operation=randomUUID(),job=randomUUID(),legacyPolicy=randomUUID(),policy=randomUUID(),module=randomUUID(),revision=randomUUID(),round=randomUUID(),plan=randomUUID(),workItem=randomUUID(),worktree=randomUUID(),delivery=randomUUID(),candidate=randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'AUT-03 snapshot','test','test','/tmp','local','main','000','PROJECT_DISCOVERY',4,'IMPLEMENTATION','{}')`,[project]);
    await client.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'aut03',1,'{}','APPROVED')`,[revision,project]);
    await client.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'aut03',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,revision]);
    await client.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,revision]);
    await client.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,'test','APPROVED','WORK_ITEM_DELIVERY',2)`,[plan,project,module,revision,{work_items:[{work_item_id:'wi-1'}]},'a'.repeat(64),'b'.repeat(64),'c'.repeat(64)]);
    await client.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id) VALUES($1,$2,$3,$4,$5,'AUT-03 WI',$6,'ACCEPTED','WORK_ITEM_DELIVERY',2,$7,'wi-1')`,[workItem,project,module,revision,round,{work_item_id:'wi-1'},plan]);
    await client.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,'/tmp','work-items/aut03','base','RESERVED')`,[worktree,project,workItem]);
    await client.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,qa_matrix,state) VALUES($1,$2,$3,$4,$5,'base','[]','RESERVED')`,[delivery,project,workItem,revision,worktree]);
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'AUT03_TEST','QUEUED',$3,$4)`,[operation,project,`aut03-op:${operation}`,randomUUID()]);
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM',$5)`,[job,operation,project,delivery,`aut03-job:${job}`]);
    const legacySelectors={agentPolicyNames:['legacy'],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},legacyConfiguration={schema_version:1};
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`,[legacyPolicy,`aut03-legacy-${legacyPolicy.slice(0,8)}`,legacySelectors,legacyConfiguration]);
    const input={jobId:job,operationId:operation,projectId:project,correlationId:(await client.query(`SELECT correlation_id FROM operations WHERE id=$1`,[operation])).rows[0].correlation_id,jobKind:'DEVELOP_WORK_ITEM',subjectKind:'WorkItemDeliveryCandidate:v1' as const,subjectId:candidate,normativeGeneration:candidate,classification:'INTERNAL',lineageFingerprint:'a'.repeat(64),agentPolicyName:'legacy',legacyPolicy:{id:legacyPolicy,version:1}};
    const first=await reserveAssuranceDispatch(client,input);
    assert.equal(first.selection_result,'NOT_SELECTED');assert.equal(first.policy_id,null);assert.equal(first.legacy_policy_id,legacyPolicy);
    const selectors={jobKinds:['DEVELOP_WORK_ITEM'],subjectKinds:['WorkItemDeliveryCandidate:v1'],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},configuration={schema_version:1,aut02_shared_acceptance:true};
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,policy_hash,published_by) VALUES($1,$2,1,true,$3,$4,$5,'test')`,[policy,`aut03-later-${policy.slice(0,8)}`,selectors,configuration,assurancePolicyHash(selectors,configuration)]);
    const replay=await reserveAssuranceDispatch(client,input);
    assert.equal(replay.id,first.id);assert.equal(replay.selection_result,'NOT_SELECTED');assert.equal(replay.policy_id,null);assert.equal(replay.policy_hash,null);assert.equal(replay.legacy_policy_id,legacyPolicy);assert.equal(Number(replay.legacy_policy_version),1);
    await assert.rejects(reserveAssuranceDispatch(client,{...input,jobKind:'PREPARE_DELIVERY_PACKAGE',subjectKind:'DeliveryPackage:v1'} as any),(error:any)=>error.code==='ASSURANCE_RELEASE_JOB_NOT_PUBLISHED');
    await assert.rejects(client.query(`DELETE FROM assurance_dispatch_snapshots WHERE id=$1`,[first.id]),(error:any)=>error.code==='23514');
  } finally { await client.query('ROLLBACK');client.release();await pool.end(); }
});

if(!process.env.DATABASE_URL) test('FINDING-03 PostgreSQL legacy identity proof requires DATABASE_URL',{skip:'set DATABASE_URL'},()=>{});
else test('FINDING-03 freezes the NOT_SELECTED legacy (id,version) pair and rejects same-id/different-version or null/set replays',async()=>{
  const { default: pg }=await import('pg');
  const { reserveAssuranceDispatch }=await import('./assurance-expansion.js');
  // Own pool instance: the AUT-03 proof above ends the shared db.js pool, so
  // reusing it here would race with test ordering.
  const pool=new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client=await pool.connect();
  const project=`aut03-finding03-${randomUUID().slice(0,8)}`,operation=randomUUID(),job=randomUUID(),legacyPolicy=randomUUID(),module=randomUUID(),revision=randomUUID(),round=randomUUID(),plan=randomUUID(),workItem=randomUUID(),worktree=randomUUID(),delivery=randomUUID(),candidate=randomUUID();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'AUT-03 FINDING-03','test','test','/tmp','local','main','000','PROJECT_DISCOVERY',4,'IMPLEMENTATION','{}')`,[project]);
    await client.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'aut03',1,'{}','APPROVED')`,[revision,project]);
    await client.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'aut03',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,revision]);
    await client.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`,[round,module,revision]);
    await client.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,'test','APPROVED','WORK_ITEM_DELIVERY',2)`,[plan,project,module,revision,{work_items:[{work_item_id:'wi-1'}]},'a'.repeat(64),'b'.repeat(64),'c'.repeat(64)]);
    await client.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id) VALUES($1,$2,$3,$4,$5,'AUT-03 FINDING-03 WI',$6,'ACCEPTED','WORK_ITEM_DELIVERY',2,$7,'wi-1')`,[workItem,project,module,revision,round,{work_item_id:'wi-1'},plan]);
    await client.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,'/tmp','work-items/aut03','base','RESERVED')`,[worktree,project,workItem]);
    await client.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,qa_matrix,state) VALUES($1,$2,$3,$4,$5,'base','[]','RESERVED')`,[delivery,project,workItem,revision,worktree]);
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'AUT03_FINDING03','QUEUED',$3,$4)`,[operation,project,`aut03-finding03-op:${operation}`,randomUUID()]);
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM',$5)`,[job,operation,project,delivery,`aut03-finding03-job:${job}`]);
    const legacySelectors={agentPolicyNames:['legacy'],taskTypes:['DEVELOP_WORK_ITEM'],classifications:['INTERNAL']},legacyConfiguration={schema_version:1};
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`,[legacyPolicy,`aut03-finding03-legacy-${legacyPolicy.slice(0,8)}`,legacySelectors,legacyConfiguration]);
    const baseInput={jobId:job,operationId:operation,projectId:project,correlationId:(await client.query(`SELECT correlation_id FROM operations WHERE id=$1`,[operation])).rows[0].correlation_id,jobKind:'DEVELOP_WORK_ITEM',subjectKind:'WorkItemDeliveryCandidate:v1' as const,subjectId:candidate,normativeGeneration:candidate,classification:'INTERNAL',lineageFingerprint:'a'.repeat(64),agentPolicyName:'legacy'};
    const input={...baseInput,legacyPolicy:{id:legacyPolicy,version:1}};
    const first=await reserveAssuranceDispatch(client,input);
    assert.equal(first.selection_result,'NOT_SELECTED');assert.equal(first.policy_id,null);assert.equal(first.legacy_policy_id,legacyPolicy);assert.equal(Number(first.legacy_policy_version),1);
    // (a) replay with the SAME legacy id AND version succeeds and returns the frozen snapshot
    const same=await reserveAssuranceDispatch(client,input);
    assert.equal(same.id,first.id);assert.equal(same.legacy_policy_id,legacyPolicy);assert.equal(Number(same.legacy_policy_version),1);
    // (b) replay with the SAME legacy id but a DIFFERENT version conflicts
    await assert.rejects(reserveAssuranceDispatch(client,{...baseInput,legacyPolicy:{id:legacyPolicy,version:2}}),(error:any)=>error.code==='ASSURANCE_DISPATCH_IDENTITY_CONFLICT');
    // (c) replay where the frozen snapshot has a legacy policy but the input is null conflicts
    await assert.rejects(reserveAssuranceDispatch(client,{...baseInput,legacyPolicy:null}),(error:any)=>error.code==='ASSURANCE_DISPATCH_IDENTITY_CONFLICT');
  } finally { await client.query('ROLLBACK');client.release();await pool.end(); }
});
