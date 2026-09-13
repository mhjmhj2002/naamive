import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  PrincipalStateTransitionError,
  PrincipalValidationError,
  assertValidUsername
} from '@naamive/modules';
import {
  PrincipalVersionConflictError,
  changePrincipalStatus,
  changePrincipalUsername,
  createDatabase,
  createPrincipal,
  getPrincipal,
  getPrincipalHistory,
  isPrincipalActive
} from './index.js';

export async function verifyPrincipalPersistence(connectionString: string): Promise<void> {
  const principalId = randomUUID();
  const first = createDatabase(connectionString);
  try {
    const created = await createPrincipal(first, { principalId, username: 'alpha_01' });
    assert.equal(created.principalId, principalId);
    assert.equal(created.status, 'ACTIVE');
    assert.equal(created.version, 1n);
    assert.equal(await isPrincipalActive(first, principalId), true);

    for (const username of ['ab', 'Alpha_01', 'alpha.01', '1alpha', 'alpha 01']) {
      assert.throws(() => assertValidUsername(username), PrincipalValidationError);
    }

    const renamed = await changePrincipalUsername(first, {
      principalId,
      expectedVersion: created.version,
      username: 'bravo_02'
    });
    assert.equal(renamed.principalId, principalId);
    assert.equal(renamed.version, 2n);
    assert.notEqual(renamed.currentHistoryEventId, created.currentHistoryEventId);

    const reused = await createPrincipal(first, { username: 'alpha_01' });
    assert.notEqual(reused.principalId, principalId);
    await assert.rejects(() => createPrincipal(first, { username: 'bravo_02' }));

    const suspended = await changePrincipalStatus(first, {
      principalId,
      expectedVersion: renamed.version,
      status: 'SUSPENDED'
    });
    assert.equal(suspended.version, 3n);
    assert.equal(await isPrincipalActive(first, principalId), false);
    await assert.rejects(
      () => changePrincipalStatus(first, { principalId, expectedVersion: suspended.version, status: 'SUSPENDED' }),
      PrincipalStateTransitionError
    );
    const reactivated = await changePrincipalStatus(first, {
      principalId,
      expectedVersion: suspended.version,
      status: 'ACTIVE'
    });
    assert.equal(reactivated.version, 4n);
    assert.equal(await isPrincipalActive(first, principalId), true);

    const historyBeforeStale = await getPrincipalHistory(first, principalId);
    await assert.rejects(
      () => changePrincipalUsername(first, { principalId, expectedVersion: 1n, username: 'charlie_03' }),
      PrincipalVersionConflictError
    );
    const afterStale = await getPrincipal(first, principalId);
    const historyAfterStale = await getPrincipalHistory(first, principalId);
    assert.deepEqual(afterStale, reactivated);
    assert.equal(historyAfterStale.length, historyBeforeStale.length);
    assert.deepEqual(historyAfterStale.map((event) => event.eventType), [
      'PRINCIPAL_CREATED',
      'USERNAME_CHANGED',
      'STATUS_CHANGED',
      'STATUS_CHANGED'
    ]);
    assert.equal(historyAfterStale[0]?.username, 'alpha_01');
    assert.equal(historyAfterStale.at(-1)?.historyEventId, reactivated.currentHistoryEventId);
    assert.equal(historyAfterStale.at(-1)?.version, reactivated.version);
  } finally {
    await first.destroy();
  }

  const reconnected = createDatabase(connectionString);
  try {
    const recovered = await getPrincipal(reconnected, principalId);
    const recoveredHistory = await getPrincipalHistory(reconnected, principalId);
    assert.equal(recovered?.principalId, principalId);
    assert.equal(recovered?.username, 'bravo_02');
    assert.equal(recovered?.status, 'ACTIVE');
    assert.equal(recovered?.version, 4n);
    assert.equal(recovered?.currentHistoryEventId, recoveredHistory.at(-1)?.historyEventId);
    assert.equal(recoveredHistory.length, 4);
  } finally {
    await reconnected.destroy();
  }

  const administrator = new Pool({ connectionString });
  try {
    await assert.rejects(
      () => administrator.query(
        `INSERT INTO authority.principal (principal_id, username, status, version, current_history_event_id)
         VALUES ($1, 'INVALID', 'ACTIVE', 1, $2)`,
        [randomUUID(), randomUUID()]
      )
    );
  } finally {
    await administrator.end();
  }

  const runtimeUrl = new URL(connectionString);
  runtimeUrl.username = 'naamive_web';
  runtimeUrl.password = '';
  const runtime = new Pool({ connectionString: runtimeUrl.toString() });
  try {
    await assert.rejects(
      () => runtime.query('UPDATE authority.principal_history SET username = username'),
      /permission denied/i
    );
    await assert.rejects(
      () => runtime.query('DELETE FROM authority.principal_history'),
      /permission denied/i
    );
  } finally {
    await runtime.end();
  }
}
