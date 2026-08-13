import assert from 'node:assert/strict';
import test from 'node:test';
import { modulePlanReview } from './module-plan-review.js';

const module={id:'module-1',module_key:'console',objective:'Review plans',state:'PLANNING_IN_PROGRESS'};
const plan=(number:number,status='PLAN_PROPOSED')=>({id:`plan-${number}`,module_id:module.id,revision_number:number,status,payload:{work_items:[{work_item_id:'wi-a',title:'A\x00',objective:'First',inputs:['input'],output:'out',acceptance_criteria:['ok'],criterion_ids:['criterion-1'],allowlist:['src/a'],denylist:['.env'],depends_on_ids:[],qa_matrix:[{command:'npm test',cwd:'test',timeout_seconds:60,environment:'isolated',criterion_ids:['criterion-1'],kind:'unit'}],risks:['risk'],capabilities:['ui']}],criterion_coverage:[{criterion_id:'criterion-1',work_item_ids:['wi-a']}],business_dependency_coverage:[{dependency_id:'external',classification:'EXTERNAL_BLOCKER',work_item_ids:[],blocked_work_item_ids:['wi-a'],justification:'Waiting'}],gaps:['legacy gap'],secret:'must-not-leak'},author_id:'operator',json_artifact_hash:'a'.repeat(64),markdown_artifact_hash:'b'.repeat(64),created_at:'2026-01-01T00:00:00Z',supersedes_revision_id:null,feedback:'feedback'});

test('module plan review is closed, sanitized and derives coverage and eligibility',()=>{
  const [review]=modulePlanReview([module],[plan(2)],[{id:'gate',module_id:module.id,plan_revision_id:'plan-2',kind:'MODULE_PLAN_APPROVAL',version:3,status:'OPEN'}]); assert.ok(review);
  assert.equal(review.schema_version,'module-plan-review/v1');
  assert.equal(review.work_items[0].title,'A');
  assert.equal(review.work_items[0].eligible,false);
  assert.equal(review.work_items[0].blocked_reason,'Waiting');
  assert.deepEqual(review.summary,{work_item_count:1,eligible_count:0,blocked_count:1,criterion_count:1,covered_criterion_count:1});
  assert.equal(JSON.stringify(review).includes('must-not-leak'),false);
});

test('legacy review gets read-only alert and history is newest-first and bounded',()=>{
  const plans=Array.from({length:21},(_,index)=>plan(index+1,index===21?'REWORK_REQUIRED':'APPROVED'));
  const [review]=modulePlanReview([module],plans,[]); assert.ok(review);
  assert.equal(review.revision_history.length,20);
  assert.equal(review.revision_history[0].number,21);
  assert.equal(review.history_truncated,true);
  assert.equal(review.alerts[0].code,'LEGACY_PLAN_GAP');
});
