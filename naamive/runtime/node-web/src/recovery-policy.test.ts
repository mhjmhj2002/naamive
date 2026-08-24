import test from 'node:test';
import assert from 'node:assert/strict';
import { RecoveryClassifier, type RecoveryCause, type RecoverySignals } from './recovery-policy.js';

const classifier=new RecoveryClassifier();
const signals=(observedCause:RecoveryCause,overrides:Partial<RecoverySignals>={}):RecoverySignals=>({
  observedCause,projectId:'project',sourceState:'RECOVERY_REQUIRED',sourceVersion:7,
  workItemId:'00000000-0000-4000-8000-000000000001',attemptId:'00000000-0000-4000-8000-000000000002',jobId:'00000000-0000-4000-8000-000000000003',
  deliveryId:'00000000-0000-4000-8000-000000000004',worktreeId:'00000000-0000-4000-8000-000000000005',deliveryPresent:true,
  worktreeObservation:'ACTIVE_BASE',integrationObservation:'NOT_APPLICABLE',requiredAuthoritiesConclusive:true,noEffectVerified:true,...overrides
});

test('RECOVERY_POLICY:v1 maps proven pre-effect transient failures to bounded retry',()=>{
  for(const cause of ['TIMEOUT_PRE_EFFECT','QUOTA_LIMIT','RATE_LIMIT','INFRA_TRANSIENT'] as RecoveryCause[]){
    const decision=classifier.classify(signals(cause));
    assert.equal(decision.effectCertainty,'NO_EFFECT');assert.equal(decision.selectedAction,'RETRY');assert.ok(decision.evidenceFootprint.includes('NO_EFFECT'));
  }
});

test('RECOVERY_POLICY:v1 maps terminal processes without effect to restart',()=>{
  for(const cause of ['WORKER_DEAD_NO_OUTPUT','JOB_NOT_CONSUMED','WORKTREE_MISSING_NO_EVIDENCE'] as RecoveryCause[]){
    const decision=classifier.classify(signals(cause,{worktreeObservation:'MISSING'}));
    assert.equal(decision.effectCertainty,'NO_EFFECT');assert.equal(decision.selectedAction,'RESTART');
  }
});

test('unknown effect always reconciles before retry or restart',()=>{
  for(const cause of ['LEASE_LOST','HANDOFF_CRASH','NO_TERMINAL_CONFIRMATION','DIRTY_WORKTREE','OPERATION_UNRECORDED','MERGE_TIMEOUT','PUSH_TIMEOUT'] as RecoveryCause[]){
    const decision=classifier.classify(signals(cause,{worktreeObservation:cause==='DIRTY_WORKTREE'?'DIRTY':'ACTIVE_BASE'}));
    assert.equal(decision.effectCertainty,'EFFECT_UNKNOWN');assert.equal(decision.selectedAction,'RECONCILE');
    assert.notEqual(decision.selectedAction,'RETRY');assert.notEqual(decision.selectedAction,'RESTART');
  }
});

test('fenced AUT-02 recovery generations have distinct classification fingerprints',()=>{
  const first=classifier.classify(signals('MERGE_TIMEOUT',{recoveryScopeKey:'intent:1'}));
  const takeover=classifier.classify(signals('MERGE_TIMEOUT',{recoveryScopeKey:'intent:2'}));
  assert.notEqual(first.classificationFingerprint,takeover.classificationFingerprint);
  assert.equal(takeover.selectedAction,'RECONCILE');
});

test('absence of evidence never becomes NO_EFFECT while an authority is inconclusive',()=>{
  const decision=classifier.classify(signals('JOB_NOT_CONSUMED',{requiredAuthoritiesConclusive:false,noEffectVerified:false,worktreeObservation:'UNAVAILABLE'}));
  assert.equal(decision.effectCertainty,'EFFECT_UNKNOWN');assert.equal(decision.selectedAction,'RECONCILE');
});

test('DELIVERY_PRESENT is a signal rather than automatic effect evidence',()=>{
  const reserved=classifier.classify(signals('JOB_NOT_CONSUMED',{deliveryState:'RESERVED'}));
  assert.equal(reserved.effectCertainty,'NO_EFFECT');assert.equal(reserved.selectedAction,'RESTART');assert.ok(reserved.evidenceFootprint.includes('DELIVERY_PRESENT'));
  const inconclusive=classifier.classify(signals('DELIVERY_PRESENT',{deliveryState:'RESERVED',requiredAuthoritiesConclusive:false,noEffectVerified:false}));
  assert.equal(inconclusive.effectCertainty,'EFFECT_UNKNOWN');assert.equal(inconclusive.selectedAction,'RECONCILE');
});

test('execution evidence, commits and findings preserve the correct lineage action',()=>{
  assert.equal(classifier.classify(signals('EXECUTION_EVIDENCE_PRESENT',{executionEvidenceRefs:['artifact']})).selectedAction,'RESUME');
  assert.equal(classifier.classify(signals('COMMIT_PRESENT',{commitRefs:['sha']})).selectedAction,'RESUME');
  const rework=classifier.classify(signals('QA_FINDING_PRESENT',{commitRefs:['sha'],findingRefs:['finding']}));
  assert.equal(rework.effectCertainty,'EFFECT_PRESENT');assert.equal(rework.selectedAction,'REWORK');assert.deepEqual(rework.evidenceFootprint.sort(),['COMMIT_PRESENT','DELIVERY_PRESENT','QA_FINDING']);
});

test('Git applied-unrecorded and divergence never use blind retry',()=>{
  const applied=classifier.classify(signals('MERGE_APPLIED_UNRECORDED',{workItemId:null,integrationCandidateId:'00000000-0000-4000-8000-000000000006',integrationObservation:'APPLIED_UNRECORDED'}));
  assert.equal(applied.selectedAction,'RECORD_AND_CONTINUE');
  const diverged=classifier.classify(signals('GIT_DIVERGED',{workItemId:null,integrationCandidateId:'00000000-0000-4000-8000-000000000006',integrationObservation:'DIVERGED'}));
  assert.equal(diverged.selectedAction,'INTEGRATION_RECOVERY');
});

test('retry exhaustion becomes a new AUT-01 restart decision',()=>{
  const decision=classifier.classify(signals('INFRA_TRANSIENT',{retryExhausted:true}));
  assert.equal(decision.cause,'RETRY_EXHAUSTED');assert.equal(decision.effectCertainty,'NO_EFFECT');assert.equal(decision.selectedAction,'RESTART');
});
