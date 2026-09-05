import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedActions, nextAction, publicEvent, publicValue, recoveryNextAction } from './projection.js';

test('public projections retain operational facts but remove execution internals', () => {
  const value=publicValue({head_sha:'abc',worktree_path:'/host/tree',qa_command:'npm test',nested:{stdout:'raw',evidence_hash:'hash'},findings:[{description:'safe',secret_token:'no'}]});
  assert.deepEqual(value,{head_sha:'abc',nested:{evidence_hash:'hash'},findings:[{description:'safe'}]});
  assert.deepEqual(publicEvent({id:4,event_type:'QA_APPROVED',occurred_at:'now',payload:{worktree_path:'/host',head_sha:'abc'}}),{id:4,event_type:'QA_APPROVED',occurred_at:'now',payload:{head_sha:'abc'}});
});

test('work-item v2 projections distinguish automatic waits from legitimate human exceptions', () => {
  assert.equal(nextAction('WAITING_FOR_DEPENDENCIES', null, 'WORK_ITEM_DELIVERY', 2), 'Aguardar dependências técnicas; nenhuma ação humana é necessária.');
  assert.equal(nextAction('ELIGIBLE_FOR_DISPATCH', null, 'WORK_ITEM_DELIVERY', 2), 'Elegível para despacho automático pela AUT-01; nenhuma ação humana é necessária.');
  assert.deepEqual(allowedActions('WORK_ITEM_DELIVERY', 2, 'WAITING_FOR_EXTERNAL_INPUT', 2), ['RESOLVE_EXTERNAL_BLOCKER']);
  assert.deepEqual(allowedActions('WORK_ITEM_DELIVERY', 2, 'ELIGIBLE_FOR_DISPATCH'), []);
  assert.ok(!allowedActions('WORK_ITEM_DELIVERY', 2, 'ELIGIBLE_FOR_DISPATCH').includes('START_DEVELOPMENT'));
});

test('REC-01 projection explains reconciliation and escalation without technical action buttons',()=>{
  assert.match(recoveryNextAction({selected_action:'RECONCILE',execution_state:'WAITING_RECONCILIATION',reason:'unknown'})!,/nenhum efeito será repetido/);
  assert.match(recoveryNextAction({selected_action:'INTEGRATION_RECOVERY',execution_state:'COMPLETED',reason:'Git diverged'})!,/Git\/integração/);
  assert.deepEqual(allowedActions('WORK_ITEM_DELIVERY',2,'RECOVERY_REQUIRED'),[]);
  assert.deepEqual(allowedActions('WORK_ITEM_DELIVERY',2,'WAITING_FOR_ESCALATION'),[]);
});

test('public projections remove baseline configuration, content and credential-bearing URLs', () => {
  const value = publicValue({ technology_catalog_revision_id: 'catalog-revision', configuration: { body: 'private' }, content: 'private', evidence_url: 'https://user:password@example.invalid/evidence', evidence_hash: 'hash' });
  assert.deepEqual(value, { technology_catalog_revision_id: 'catalog-revision', evidence_hash: 'hash' });
});
