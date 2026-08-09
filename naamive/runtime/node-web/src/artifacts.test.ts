import assert from 'node:assert/strict';
import test from 'node:test';
import { hasForbiddenTechnologyEvidence, sanitizeTechnologyEvidence } from './artifacts.js';

test('sanitizes sensitive values before technology evidence is persisted', () => {
  const evidence = { technology_catalog_revision_id: 'catalog', evidence_hash: 'a'.repeat(64), configuration: { content: 'private' }, stdout: 'private', nested: { api_key: 'private', url: 'https://user:password@example.invalid/value' } };
  assert.equal(hasForbiddenTechnologyEvidence(evidence), true);
  assert.deepEqual(sanitizeTechnologyEvidence(evidence), { technology_catalog_revision_id: 'catalog', evidence_hash: 'a'.repeat(64), nested: {} });
});
