import test from 'node:test';
import assert from 'node:assert/strict';
import { cancellationKey, canonicalDeliveryOutputs, deliveryPackageManifest, deliveryPreparationExecutionContext, deliveryPreparationIdentity, deliveryTransitionKey, pauseKey, preparationJobKey, resumeKey } from './delivery-lifecycle.js';

const snapshot={id:'snapshot-1',project_id:'project-1',delivery_revision:1,workflow_code:'PROJECT_DISCOVERY',workflow_version:4,product_commitment_revision_id:'revision-1',effective_required_module_set_hash:'a'.repeat(64),committed_module_set:[{module_key:'api',module_id:'module-1',state:'READY_FOR_DELIVERY'}],participants:[{module_key:'api',module_id:'module-1',state:'READY_FOR_DELIVERY'}],artifact_input_references:[],validation_integration_lineage:[],policy_id:'DELIVERY_PAUSE_CANCELLATION:v1',policy_version:'1',policy_hash:'b'.repeat(64),preparation_key:'delivery-preparation:v1:project-1:1:generation',input_hash:'c'.repeat(64),normative_generation:'d'.repeat(64)};
const outputs={release_evidence:[{hash:'release'}],operation_evidence:[{hash:'operation'}],handover_evidence:[{hash:'handover'}],artifact_references:[{hash:'artifact'}]};

test('GAT-02 preparation identity is deterministic, stable and input-bound',()=>{
  const expanded={...snapshot,committed_module_set:[{module_key:'z',module_id:'z',state:'READY_FOR_DELIVERY'},...snapshot.committed_module_set],participants:[{module_key:'z',module_id:'z',state:'READY_FOR_DELIVERY'},...snapshot.participants],artifact_input_references:[{hash:'z'},{hash:'a'}],validation_integration_lineage:[{hash:'z'},{hash:'a'}]};
  const first=deliveryPreparationIdentity(expanded),reordered=deliveryPreparationIdentity({...expanded,committed_module_set:[...expanded.committed_module_set].reverse(),participants:[...expanded.participants].reverse(),artifact_input_references:[...expanded.artifact_input_references].reverse(),validation_integration_lineage:[...expanded.validation_integration_lineage].reverse()}),changed=deliveryPreparationIdentity({...expanded,participants:[{...expanded.participants[0],state:'VALIDATING'},expanded.participants[1]]});
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

test('GAT-02 preparation execution context is frozen, minimal and contains no conversational carry-over',()=>{
  const context=deliveryPreparationExecutionContext(snapshot);
  assert.equal(context.preparation_snapshot_id,'snapshot-1');
  assert.equal(context.input_hash,snapshot.input_hash);
  assert.deepEqual(context.participants,snapshot.participants);
  for(const forbidden of ['intake','conversation','thread','session','history','previous_response_id','provider_state'])assert.equal(forbidden in context,false);
});

test('GAT-02 package canonicalization sorts participant and artifact arrays before hashing',()=>{
  const unordered={...snapshot,committed_module_set:[{module_key:'z',module_id:'z'},{module_key:'a',module_id:'a'}],participants:[{module_key:'z',module_id:'z'},{module_key:'a',module_id:'a'}]};
  const unorderedOutputs={...outputs,artifact_references:[{hash:'z'},{hash:'a'}],release_evidence:[{hash:'z'},{hash:'a'}]};
  const ordered={...unordered,committed_module_set:[...unordered.committed_module_set].reverse(),participants:[...unordered.participants].reverse()};
  const orderedOutputs={...unorderedOutputs,artifact_references:[...unorderedOutputs.artifact_references].reverse(),release_evidence:[...unorderedOutputs.release_evidence].reverse()};
  assert.deepEqual(deliveryPackageManifest(unordered,unorderedOutputs),deliveryPackageManifest(ordered,orderedOutputs));
});

test('GAT-02 canonical output payload converges under replay and rejects missing required evidence',()=>{
  const first=canonicalDeliveryOutputs({...outputs,release_evidence:[{hash:'z'},{hash:'a'}]}),replay=canonicalDeliveryOutputs({...outputs,release_evidence:[{hash:'a'},{hash:'z'}]});
  assert.deepEqual(first,replay);
  assert.throws(()=>canonicalDeliveryOutputs({...outputs,release_evidence:null as any}),/DELIVERY_RELEASE_EVIDENCE_REQUIRED/);
});

test('GAT-02 package identity deliberately excludes post-package Assurance and gate identifiers',()=>{
  const packageWithPostPackageFacts=deliveryPackageManifest(snapshot,{...outputs,assurance_snapshot_id:'assurance-a',acceptance_id:'acceptance-a'});
  const replayWithOtherFacts=deliveryPackageManifest(snapshot,{...outputs,assurance_snapshot_id:'assurance-b',acceptance_id:'acceptance-b'});
  assert.equal(packageWithPostPackageFacts.content_hash,replayWithOtherFacts.content_hash);
  assert.equal('assurance_snapshot_id' in packageWithPostPackageFacts.manifest,false);
  assert.equal('acceptance_id' in packageWithPostPackageFacts.manifest,false);
});

test('GAT-02 preparation and transition keys are exact replay identities',()=>{
  const identity=deliveryPreparationIdentity(snapshot);
  assert.equal(identity.preparation_key,`delivery-preparation:v1:project-1:1:${identity.normative_generation}`);
  assert.equal(preparationJobKey(identity.preparation_key),`prepare-delivery-package:v1:${identity.preparation_key}`);
  const manifest=deliveryPackageManifest(snapshot,outputs);
  assert.notEqual(deliveryTransitionKey('project-1','package-1',manifest.content_hash),deliveryTransitionKey('project-1','package-2',manifest.content_hash));
});
