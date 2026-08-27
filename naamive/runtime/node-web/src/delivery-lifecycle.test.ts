import test from 'node:test';
import assert from 'node:assert/strict';
import { cancellationKey, deliveryPackageManifest, deliveryPreparationIdentity, deliveryTransitionKey, pauseKey, preparationJobKey, resumeKey } from './delivery-lifecycle.js';

const snapshot={id:'snapshot-1',project_id:'project-1',delivery_revision:1,workflow_code:'PROJECT_DISCOVERY',workflow_version:4,product_commitment_revision_id:'revision-1',effective_required_module_set_hash:'a'.repeat(64),committed_module_set:[{module_key:'api',module_id:'module-1',state:'READY_FOR_DELIVERY'}],participants:[{module_key:'api',module_id:'module-1',state:'READY_FOR_DELIVERY'}],artifact_input_references:[],validation_integration_lineage:[],policy_id:'DELIVERY_PAUSE_CANCELLATION:v1',policy_version:'1',policy_hash:'b'.repeat(64),preparation_key:'delivery-preparation:v1:project-1:1:generation',input_hash:'c'.repeat(64),normative_generation:'d'.repeat(64)};
const outputs={release_evidence:[{hash:'release'}],operation_evidence:[{hash:'operation'}],handover_evidence:[{hash:'handover'}],artifact_references:[{hash:'artifact'}]};

test('GAT-02 preparation identity is deterministic, stable and input-bound',()=>{
  const first=deliveryPreparationIdentity(snapshot),reordered=deliveryPreparationIdentity({...snapshot,participants:[...snapshot.participants]}),changed=deliveryPreparationIdentity({...snapshot,participants:[{...snapshot.participants[0],state:'VALIDATING'}]});
  assert.deepEqual(first,reordered);assert.notEqual(first.normative_generation,changed.normative_generation);assert.equal(preparationJobKey(first.preparation_key),`prepare-delivery-package:v1:${first.preparation_key}`);
});

test('GAT-02 final package is deterministic and evidence changes are immutable content changes',()=>{
  const first=deliveryPackageManifest(snapshot,outputs),replay=deliveryPackageManifest(snapshot,{...outputs,release_evidence:[{hash:'release'}]}),changed=deliveryPackageManifest(snapshot,{...outputs,handover_evidence:[{hash:'another'}]});
  assert.deepEqual(first,replay);assert.equal(first.delivery_package_key,deliveryPackageManifest(snapshot,outputs).delivery_package_key);assert.notEqual(first.content_hash,changed.content_hash);assert.equal(deliveryTransitionKey('project-1','package-1',first.content_hash),`delivery-transition:v1:project-1:package-1:${first.content_hash}`);
});

test('GAT-02 idempotency keys bind version/fence payloads and reject divergent canonical payloads in persistence',()=>{
  const payload={reason:'maintenance',evidence:{ticket:'OPS-1'}};
  assert.equal(pauseKey('PROJECT','project-1',3,payload),pauseKey('PROJECT','project-1',3,{evidence:{ticket:'OPS-1'},reason:'maintenance'}));
  assert.notEqual(pauseKey('PROJECT','project-1',3,payload),pauseKey('PROJECT','project-1',4,payload));
  assert.equal(resumeKey('pause-1',1,payload),resumeKey('pause-1',1,{evidence:{ticket:'OPS-1'},reason:'maintenance'}));
  assert.notEqual(cancellationKey('MODULE','module-1',payload),cancellationKey('MODULE','module-1',{reason:'different',evidence:{ticket:'OPS-1'}}));
});
