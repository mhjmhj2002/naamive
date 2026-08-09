import test from 'node:test';
import assert from 'node:assert/strict';
import { publicEvent, publicValue } from './projection.js';

test('public projections retain operational facts but remove execution internals', () => {
  const value=publicValue({head_sha:'abc',worktree_path:'/host/tree',qa_command:'npm test',nested:{stdout:'raw',evidence_hash:'hash'},findings:[{description:'safe',secret_token:'no'}]});
  assert.deepEqual(value,{head_sha:'abc',nested:{evidence_hash:'hash'},findings:[{description:'safe'}]});
  assert.deepEqual(publicEvent({id:4,event_type:'QA_APPROVED',occurred_at:'now',payload:{worktree_path:'/host',head_sha:'abc'}}),{id:4,event_type:'QA_APPROVED',occurred_at:'now',payload:{head_sha:'abc'}});
});

test('public projections remove baseline configuration, content and credential-bearing URLs', () => {
  const value = publicValue({ technology_catalog_revision_id: 'catalog-revision', configuration: { body: 'private' }, content: 'private', evidence_url: 'https://user:password@example.invalid/evidence', evidence_hash: 'hash' });
  assert.deepEqual(value, { technology_catalog_revision_id: 'catalog-revision', evidence_hash: 'hash' });
});
