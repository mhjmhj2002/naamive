import assert from 'node:assert/strict';
import test from 'node:test';
import { buildActionPayload } from '../web/action-payload.js';
import { recoveryAnchor } from './recovery-anchor.js';

test('module cancellation binding omits obligation resolution when none is required', () => {
  const payload = buildActionPayload(new Map([['reason', 'No longer needed'], ['evidence', 'OPS-41']]), [
    { name: 'reason', source: 'HUMAN_INPUT', send: true, serialize_as: 'VALUE' },
    { name: 'evidence', source: 'HUMAN_INPUT', send: true, serialize_as: 'EVIDENCE' },
  ]);
  assert.deepEqual(payload, { reason: 'No longer needed', evidence: { summary: 'OPS-41' } });
  assert.equal('obligation_resolution' in payload, false);
});

test('module cancellation binding constructs the exact public obligation-resolution shape', () => {
  const payload = buildActionPayload(new Map([
    ['reason', 'Retire module'], ['evidence', 'OPS-42'],
    ['obligation_resolution_reason', 'Scope was retired'], ['obligation_resolution_evidence', 'GATE-42'],
  ]), [
    { name: 'reason', source: 'HUMAN_INPUT', send: true, serialize_as: 'VALUE' },
    { name: 'evidence', source: 'HUMAN_INPUT', send: true, serialize_as: 'EVIDENCE' },
    { name: 'obligation_resolution_required', source: 'SERVER_BOUND', send: true, value: false, payload_path: ['obligation_resolution', 'required'] },
    { name: 'obligation_resolution_reason', source: 'HUMAN_INPUT', send: true, payload_path: ['obligation_resolution', 'reason'] },
    { name: 'obligation_resolution_evidence', source: 'HUMAN_INPUT', send: true, serialize_as: 'EVIDENCE', payload_path: ['obligation_resolution', 'evidence'] },
  ]);
  assert.deepEqual(payload, {
    reason: 'Retire module', evidence: { summary: 'OPS-42' },
    obligation_resolution: { required: false, reason: 'Scope was retired', evidence: { summary: 'GATE-42' } },
  });
});

test('bindings preserve server-published requiredness instead of forcing all human fields required', () => {
  const optional = { name: 'reason', source: 'HUMAN_INPUT', required: false, send: true, editable: true };
  const required = { name: 'obligation_resolution_reason', source: 'HUMAN_INPUT', required: true, send: true, editable: true };
  assert.equal(optional.required, false);
  assert.equal(required.required, true);
});

test('integration recovery never turns a candidate id into a fabricated execution resource', () => {
  const candidateId = 'candidate-1';
  assert.deepEqual(recoveryAnchor({ candidate_work_item_id: 'work-item-1', execution_id: 'execution-1' }), { resource_kind: 'WORK_ITEM', resource_id: 'work-item-1' });
  assert.deepEqual(recoveryAnchor({ execution_id: 'execution-1' }), { resource_kind: 'EXECUTION', resource_id: 'execution-1' });
  assert.deepEqual(recoveryAnchor({}), { resource_kind: null, resource_id: null });
  assert.notDeepEqual(recoveryAnchor({}), { resource_kind: 'EXECUTION', resource_id: candidateId });
});
