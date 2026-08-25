import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, deriveObservedRequiredWorkItemSet, deriveRequiredWorkItemSet, deterministicHash, integrationCandidateEligibleMembers, requiredWorkItemSetFingerprint, requiredWorkItemSetMatches, validateQaSnapshotContract } from './automatic-assurance-integration.js';

const eligible=(id:string)=>({id:`runtime-${id}`,plan_work_item_id:id,delivery_candidate_id:`delivery-${id}`,qa_result:'PASS',acceptance_state:'ACCEPTED',decision:'ACCEPT',merge_result_id:`merge-${id}`,phase_after_sha:`sha-${id}`,state:'ACCEPTED',open_finding:false,active_rework:false,active_recovery:false,active_external_blocker:false,active_block:false});
const plan=(...work_item_ids:string[])=>({payload:{work_items:work_item_ids.map(work_item_id=>({work_item_id}))}});

test('AUT-02 canonical manifest hashing is independent of object insertion order and sensitive to membership',()=>{
  const left={policy:'v1',members:[{work_item_id:'a',evidence:{qa:'1',merge:'2'}},{work_item_id:'b',evidence:{qa:'3',merge:'4'}}]};
  const right={members:[{evidence:{merge:'2',qa:'1'},work_item_id:'a'},{evidence:{merge:'4',qa:'3'},work_item_id:'b'}],policy:'v1'};
  assert.equal(canonicalJson(left),canonicalJson(right));assert.equal(deterministicHash(left),deterministicHash(right));
  assert.notEqual(deterministicHash(left),deterministicHash({...left,members:left.members.slice(0,1)}));
});

test('RequiredWorkItemSet:v1 compares exact canonical identities and fails closed for duplicates',()=>{
  const expected=deriveRequiredWorkItemSet(plan('a','b','c'));
  assert.deepEqual(expected,['a','b','c']);
  assert.equal(requiredWorkItemSetMatches(expected,deriveObservedRequiredWorkItemSet([eligible('a'),eligible('b'),eligible('c')])),true,'happy set');
  assert.equal(requiredWorkItemSetMatches(expected,deriveObservedRequiredWorkItemSet([eligible('a'),eligible('b'),eligible('x')])),false,'same count, wrong member');
  assert.equal(requiredWorkItemSetMatches(expected,deriveObservedRequiredWorkItemSet([eligible('a'),eligible('b')])),false,'missing member');
  assert.equal(requiredWorkItemSetMatches(deriveRequiredWorkItemSet(plan('a','b')),deriveObservedRequiredWorkItemSet([eligible('a'),eligible('b'),eligible('c')])),false,'extra member');
  assert.equal(deriveRequiredWorkItemSet(plan('a','a','b')),null,'duplicate plan identity');
  assert.equal(deriveObservedRequiredWorkItemSet([eligible('a'),eligible('a'),eligible('b')]),null,'duplicate observed identity');
  assert.equal(requiredWorkItemSetMatches(deriveRequiredWorkItemSet(plan('c','a','b')),deriveObservedRequiredWorkItemSet([eligible('b'),eligible('c'),eligible('a')])),true,'same set in different order');
  assert.deepEqual(deriveObservedRequiredWorkItemSet([{plan_work_item_id:'a',payload:{work_item_id:'a'}},{plan_work_item_id:'b',payload:{work_item_id:'b'}},{plan_work_item_id:'x',payload:{work_item_id:'c'}}]),['a','b','x'],'payload masquerade cannot redefine immutable identity');
});

test('RequiredWorkItemSet eligibility is universal after exact membership is proven',()=>{
  const members=[eligible('a'),eligible('b'),eligible('c')];
  const expected=deriveRequiredWorkItemSet(plan('a','b','c'));
  assert.equal(integrationCandidateEligibleMembers(expected,members.slice(0,1)),false);
  assert.equal(integrationCandidateEligibleMembers(expected,members.slice(0,2)),false);
  assert.equal(integrationCandidateEligibleMembers(expected,members),true);
  assert.equal(integrationCandidateEligibleMembers(expected,[eligible('a'),eligible('b'),eligible('x')]),false,'cardinality cannot substitute identity');
  assert.equal(integrationCandidateEligibleMembers(expected,[eligible('a'),eligible('b'),{...eligible('x'),payload:{work_item_id:'c'}}]),false,'payload masquerade cannot make A/B/X eligible as A/B/C');
  for(const field of ['open_finding','active_rework','active_recovery','active_external_blocker','active_block'] as const)assert.equal(integrationCandidateEligibleMembers(expected,members.map((member,index)=>index===1?{...member,[field]:true}:member)),false,field);
  for(const state of ['CANCELLED','REWORK_REQUIRED','BLOCKED','WAITING_FOR_ESCALATION'])assert.equal(integrationCandidateEligibleMembers(expected,members.map((member,index)=>index===1?{...member,state}:member)),false,state);
  for(const state of ['QA_IN_PROGRESS','INDEPENDENT_REVIEW','READY_FOR_INTEGRATION','INTEGRATING','INTEGRATED'])assert.equal(integrationCandidateEligibleMembers(expected,members.map((member,index)=>index===1?{...member,state}:member)),false,state);
  assert.equal(integrationCandidateEligibleMembers(expected,members.map((member,index)=>index===1?{...member,qa_result:'FAIL'}:member)),false);
  assert.equal(integrationCandidateEligibleMembers(expected,members.map((member,index)=>index===1?{...member,decision:'REWORK'}:member)),false);
});

test('RequiredWorkItemSetFingerprint:v1 binds canonical members and plan/revision/round lineage',()=>{
  const scope={module_plan_revision_id:'plan',module_revision_id:'revision',module_round_id:'round'},members=['a','b','c'];
  const fingerprint=requiredWorkItemSetFingerprint(scope,members);
  assert.match(fingerprint,/^[a-f0-9]{64}$/);
  assert.equal(requiredWorkItemSetFingerprint(scope,[...members]),fingerprint);
  assert.notEqual(requiredWorkItemSetFingerprint({...scope,module_plan_revision_id:'other-plan'},members),fingerprint);
  assert.notEqual(requiredWorkItemSetFingerprint({...scope,module_revision_id:'other-revision'},members),fingerprint);
  assert.notEqual(requiredWorkItemSetFingerprint({...scope,module_round_id:'other-round'},members),fingerprint);
  assert.notEqual(requiredWorkItemSetFingerprint(scope,['a','b','x']),fingerprint);
});

test('frozen QA contract fails closed for missing evidence, invalid matrix, and tampered hashes',()=>{
  const candidate:any={pipeline_version:'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1',policy_version:'AUT-02:v1',project_id:'p',module_id:'m',module_revision_id:'r',module_round_id:'round',module_plan_revision_id:'plan',plan_work_item_id:'plan-wi',work_item_id:'wi',work_item_revision_id:'wir',delivery_id:'d',job_id:'j',worktree_id:'wt',base_sha:'base',head_sha:'head',branch_ref:'work-items/wi',changed_paths_hash:deterministicHash([]),patch_hash:deterministicHash(''),commits:['head'],output_evidence_refs:['artifact:e'],producer_identity:{kind:'DEVELOPMENT_WORKER'},qa_matrix_id:null,qa_matrix:[{command:'true',cwd:'.',timeout_seconds:10}],acceptance_criteria:['accepted'],source_operation_id:'op',source_event_id:null,correlation_id:'correlation',lineage:{}};
  candidate.qa_matrix_hash=deterministicHash(candidate.qa_matrix);candidate.acceptance_criteria_hash=deterministicHash(candidate.acceptance_criteria);
  candidate.snapshot_hash=deterministicHash(candidate);
  assert.equal(validateQaSnapshotContract(candidate).length,1);
  assert.throws(()=>validateQaSnapshotContract({...candidate,output_evidence_refs:[]}),/AUT02_OUTPUT_EVIDENCE_MISSING/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,qa_matrix:[{command:'true',cwd:'../escape',timeout_seconds:10}]}),/AUT02_QA_MATRIX_INVALID/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,qa_matrix_hash:'0'.repeat(64)}),/AUT02_QA_MATRIX_TAMPERED/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,acceptance_criteria_hash:'0'.repeat(64)}),/AUT02_ACCEPTANCE_CRITERIA_TAMPERED/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,snapshot_hash:'0'.repeat(64)}),/AUT02_SNAPSHOT_TAMPERED/);
});
