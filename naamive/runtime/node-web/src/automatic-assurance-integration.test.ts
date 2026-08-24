import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalJson, deterministicHash, integrationCandidateEligibleMembers, validateQaSnapshotContract } from './automatic-assurance-integration.js';

const eligible=(id:string)=>({id,delivery_candidate_id:`delivery-${id}`,qa_result:'PASS',acceptance_state:'ACCEPTED',decision:'ACCEPT',merge_result_id:`merge-${id}`,phase_after_sha:`sha-${id}`,state:'ACCEPTED',open_finding:false,active_rework:false,active_recovery:false,active_external_blocker:false,active_block:false});

test('AUT-02 canonical manifest hashing is independent of object insertion order and sensitive to membership',()=>{
  const left={policy:'v1',members:[{work_item_id:'a',evidence:{qa:'1',merge:'2'}},{work_item_id:'b',evidence:{qa:'3',merge:'4'}}]};
  const right={members:[{evidence:{merge:'2',qa:'1'},work_item_id:'a'},{evidence:{merge:'4',qa:'3'},work_item_id:'b'}],policy:'v1'};
  assert.equal(canonicalJson(left),canonicalJson(right));assert.equal(deterministicHash(left),deterministicHash(right));
  assert.notEqual(deterministicHash(left),deterministicHash({...left,members:left.members.slice(0,1)}));
});

test('RequiredWorkItemSet eligibility is universal, never N-1 or heuristic',()=>{
  const members=[eligible('a'),eligible('b'),eligible('c')];
  assert.equal(integrationCandidateEligibleMembers(3,members.slice(0,1)),false);
  assert.equal(integrationCandidateEligibleMembers(3,members.slice(0,2)),false);
  assert.equal(integrationCandidateEligibleMembers(3,members),true);
  for(const field of ['open_finding','active_rework','active_recovery','active_external_blocker','active_block'] as const)assert.equal(integrationCandidateEligibleMembers(3,members.map((member,index)=>index===1?{...member,[field]:true}:member)),false,field);
  for(const state of ['CANCELLED','REWORK_REQUIRED','BLOCKED','WAITING_FOR_ESCALATION'])assert.equal(integrationCandidateEligibleMembers(3,members.map((member,index)=>index===1?{...member,state}:member)),false,state);
  for(const state of ['QA_IN_PROGRESS','INDEPENDENT_REVIEW','READY_FOR_INTEGRATION','INTEGRATING','INTEGRATED'])assert.equal(integrationCandidateEligibleMembers(3,members.map((member,index)=>index===1?{...member,state}:member)),false,state);
  assert.equal(integrationCandidateEligibleMembers(3,members.map((member,index)=>index===1?{...member,qa_result:'FAIL'}:member)),false);
  assert.equal(integrationCandidateEligibleMembers(3,members.map((member,index)=>index===1?{...member,decision:'REWORK'}:member)),false);
});

test('frozen QA contract fails closed for missing evidence, invalid matrix, and tampered hashes',()=>{
  const candidate:any={pipeline_version:'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1',policy_version:'AUT-02:v1',project_id:'p',module_id:'m',module_revision_id:'r',module_round_id:'round',module_plan_revision_id:'plan',work_item_id:'wi',work_item_revision_id:'wir',delivery_id:'d',job_id:'j',worktree_id:'wt',base_sha:'base',head_sha:'head',branch_ref:'work-items/wi',changed_paths_hash:deterministicHash([]),patch_hash:deterministicHash(''),commits:['head'],output_evidence_refs:['artifact:e'],producer_identity:{kind:'DEVELOPMENT_WORKER'},qa_matrix_id:null,qa_matrix:[{command:'true',cwd:'.',timeout_seconds:10}],acceptance_criteria:['accepted'],source_operation_id:'op',source_event_id:null,correlation_id:'correlation',lineage:{}};
  candidate.qa_matrix_hash=deterministicHash(candidate.qa_matrix);candidate.acceptance_criteria_hash=deterministicHash(candidate.acceptance_criteria);
  candidate.snapshot_hash=deterministicHash(candidate);
  assert.equal(validateQaSnapshotContract(candidate).length,1);
  assert.throws(()=>validateQaSnapshotContract({...candidate,output_evidence_refs:[]}),/AUT02_OUTPUT_EVIDENCE_MISSING/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,qa_matrix:[{command:'true',cwd:'../escape',timeout_seconds:10}]}),/AUT02_QA_MATRIX_INVALID/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,qa_matrix_hash:'0'.repeat(64)}),/AUT02_QA_MATRIX_TAMPERED/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,acceptance_criteria_hash:'0'.repeat(64)}),/AUT02_ACCEPTANCE_CRITERIA_TAMPERED/);
  assert.throws(()=>validateQaSnapshotContract({...candidate,snapshot_hash:'0'.repeat(64)}),/AUT02_SNAPSHOT_TAMPERED/);
});
