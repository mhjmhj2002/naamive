import test from 'node:test';
import assert from 'node:assert/strict';
import { assuranceExpansionMatrix, assurancePolicyHash, validateAssuranceExpansionPolicy } from './assurance-expansion.js';

test('AUT-03 has a closed real-work matrix',()=>{
  assert.equal(assuranceExpansionMatrix('PLAN_MODULE_WORK_ITEMS')?.acceptance,'OWN');
  assert.equal(assuranceExpansionMatrix('DEVELOP_WORK_ITEM')?.acceptance,'AUT02_SHARED');
  for(const kind of ['RUN_DELIVERY_QA','MERGE_WORK_ITEM','REASSESS_INTEGRATION_CANDIDATE','VALIDATE_INTEGRATION_CANDIDATE']) assert.equal(assuranceExpansionMatrix(kind)?.selectable,false);
  assert.equal(assuranceExpansionMatrix('PREPARE_DELIVERY_PACKAGE')?.runtime,false);
  assert.equal(assuranceExpansionMatrix('SECURITY_SCAN'),null);
});

test('AUT-03 policy permits only planning and AUT-02 shared development',()=>{
  const planning=validateAssuranceExpansionPolicy({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{schema_version:1,rollout_id:'canary'});
  assert.equal(planning.extension,true);
  const development=validateAssuranceExpansionPolicy({jobKinds:['DEVELOP_WORK_ITEM'],subjectKinds:['WorkItemDeliveryCandidate:v1']},{schema_version:1,aut02_shared_acceptance:true});
  assert.equal(development.extension,true);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['DEVELOP_WORK_ITEM'],subjectKinds:['WorkItemDeliveryCandidate:v1']},{schema_version:1}),/ASSURANCE_AUT02_SHARED_ACCEPTANCE_REQUIRED/);
  for(const kind of ['RUN_DELIVERY_QA','MERGE_WORK_ITEM','REASSESS_INTEGRATION_CANDIDATE','VALIDATE_INTEGRATION_CANDIDATE']) assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:[kind],subjectKinds:['WorkItemDeliveryCandidate:v1']},{schema_version:1}),/ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE/);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['PREPARE_DELIVERY_PACKAGE'],subjectKinds:['DeliveryPackage:v1']},{schema_version:1}),/ASSURANCE_RELEASE_JOB_NOT_PUBLISHED/);
  assert.throws(()=>validateAssuranceExpansionPolicy({jobKinds:['SECURITY_SCAN'],subjectKinds:['SecurityReport:v1']},{schema_version:1}),/ASSURANCE_JOB_NOT_IN_NORMATIVE_MATRIX/);
});

test('AUT-03 policy hash is canonical and includes selectors and configuration',()=>{
  const first=assurancePolicyHash({subjectKinds:['ModulePlanProposal:v1'],jobKinds:['PLAN_MODULE_WORK_ITEMS']},{schema_version:1,rollout_id:'a'});
  const reordered=assurancePolicyHash({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{rollout_id:'a',schema_version:1});
  const changed=assurancePolicyHash({jobKinds:['PLAN_MODULE_WORK_ITEMS'],subjectKinds:['ModulePlanProposal:v1']},{rollout_id:'b',schema_version:1});
  assert.equal(first,reordered);assert.notEqual(first,changed);
});
