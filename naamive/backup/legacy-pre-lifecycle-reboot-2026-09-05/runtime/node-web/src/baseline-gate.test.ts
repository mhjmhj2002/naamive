import assert from 'node:assert/strict';
import test from 'node:test';
import { baselineRevisionHash, validateBaselineGateDecision } from './baseline-gate.js';

const gate = { id: 'gate-1', version: 1 };

test('accepts a versioned approval and preserves optional feedback', () => {
  assert.deepEqual(validateBaselineGateDecision({ gate_id: gate.id, version: 1, decision: 'APPROVED', feedback: 'ok' }, gate), { approved: true, feedback: 'ok' });
});

test('rejects adjustments without feedback, an invalid decision, and a stale gate version', () => {
  assert.throws(() => validateBaselineGateDecision({ gate_id: gate.id, version: 1, decision: 'REJECTED' }, gate), /GATE_FEEDBACK_REQUIRED/);
  assert.throws(() => validateBaselineGateDecision({ gate_id: gate.id, version: 1, decision: 'MAYBE' }, gate), /GATE_DECISION_INVALID/);
  assert.throws(() => validateBaselineGateDecision({ gate_id: gate.id, version: 2, decision: 'APPROVED' }, gate), /GATE_VERSION_CONFLICT/);
});

test('hashes the frozen revision payload deterministically', () => {
  const payload = { technology_catalog_revision_id: 'catalog-1', items: [], deferred_decisions: [] };
  assert.equal(baselineRevisionHash(payload), baselineRevisionHash(payload));
  assert.match(baselineRevisionHash(payload), /^[a-f0-9]{64}$/);
});
