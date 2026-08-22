import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const snapshot=JSON.parse(readFileSync(new URL('../src/fixtures/lr01-real-project-snapshot.json',import.meta.url),'utf8'));

test('LR-01 real-project fixture is a closed, fail-closed compatibility snapshot',()=>{
  assert.equal(snapshot.schema_version,'lr01-real-project-snapshot/v1');
  assert.equal(snapshot.project.id,'728901f8-17fe-4fc9-bdc4-0b2fabc2ce08');
  assert.equal(snapshot.project.workflow_version,3);
  assert.equal(snapshot.module.workflow_version,1);
  assert.deepEqual(snapshot.work_items.map((item:any)=>item.id).sort(),[
    '4c556479-1f08-4af0-887c-a574cf226b6d',
    '813d56f5-3402-4090-8283-d84858486133',
    'fcf9e503-5714-4d6d-8a53-32e4974645e0'
  ]);
  for(const subject of [snapshot.project,snapshot.module,...snapshot.work_items])assert.equal(subject.expected_decision,'PRESERVE_LEGACY');
  assert.deepEqual(snapshot.invariants,{mutate_source_project:false,promote_workflow_version:false,infer_acceptance:false,preserve_evidence_lineage:true});
});
