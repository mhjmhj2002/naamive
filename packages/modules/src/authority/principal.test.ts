import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PrincipalStateTransitionError,
  PrincipalValidationError,
  assertPrincipalStatusTransition,
  assertValidUsername,
  isActivePrincipalStatus
} from './principal.js';

test('Principal accepts only the exact governed username language without normalization', () => {
  assert.doesNotThrow(() => assertValidUsername('a12'));
  assert.doesNotThrow(() => assertValidUsername(`a${'z'.repeat(31)}`));
  for (const username of ['ab', `a${'z'.repeat(32)}`, 'Alpha', 'a b', 'a.b', '1abc', 'ábcd']) {
    assert.throws(() => assertValidUsername(username), PrincipalValidationError);
  }
});

test('Principal allows only ACTIVE <-> SUSPENDED and identifies active use', () => {
  assert.doesNotThrow(() => assertPrincipalStatusTransition('ACTIVE', 'SUSPENDED'));
  assert.doesNotThrow(() => assertPrincipalStatusTransition('SUSPENDED', 'ACTIVE'));
  assert.throws(() => assertPrincipalStatusTransition('ACTIVE', 'ACTIVE'), PrincipalStateTransitionError);
  assert.equal(isActivePrincipalStatus('ACTIVE'), true);
  assert.equal(isActivePrincipalStatus('SUSPENDED'), false);
});
