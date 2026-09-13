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
  const runtimeUrl = new URL(connectionString);
  runtimeUrl.username = 'naamive_web';
  runtimeUrl.password = '';
  const first = createDatabase(runtimeUrl.toString());
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

  const runtime = new Pool({ connectionString: runtimeUrl.toString() });
  try {
    const hostilePrincipalId = randomUUID();
    const hostileHistoryId = randomUUID();
    await assert.rejects(
      () => runtime.query(
        `INSERT INTO authority.principal_history (history_event_id, principal_id, version, username, status, event_type)
         VALUES ($1, $2, 7, 'hostile_01', 'ACTIVE', 'USERNAME_CHANGED')`,
        [hostileHistoryId, principalId]
      ),
      /permission denied/i
    );
    await assert.rejects(
      () => runtime.query('UPDATE authority.principal SET version = 7 WHERE principal_id = $1', [principalId]),
      /permission denied/i
    );
    await assert.rejects(
      () => runtime.query('UPDATE authority.principal SET current_history_event_id = $1 WHERE principal_id = $2', [hostileHistoryId, principalId]),
      /permission denied/i
    );
    await assert.rejects(
      () => runtime.query("UPDATE authority.principal SET username = 'hostile_02', status = 'SUSPENDED' WHERE principal_id = $1", [principalId]),
      /permission denied/i
    );
    await assert.rejects(
      () => runtime.query(
        `INSERT INTO authority.principal (principal_id, username, status, version, current_history_event_id)
         VALUES ($1, 'hostile_03', 'ACTIVE', 7, $2)`,
        [hostilePrincipalId, hostileHistoryId]
      ),
      /permission denied/i
    );
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

  const concurrentPrincipalId = randomUUID();
  const concurrentFirst = createDatabase(runtimeUrl.toString());
  const concurrentSecond = createDatabase(runtimeUrl.toString());
  try {
    const created = await createPrincipal(concurrentFirst, { principalId: concurrentPrincipalId, username: 'delta_04' });
    const historyBefore = await getPrincipalHistory(concurrentFirst, concurrentPrincipalId);
    const outcomes = await Promise.allSettled([
      changePrincipalUsername(concurrentFirst, { principalId: concurrentPrincipalId, expectedVersion: created.version, username: 'echo_005' }),
      changePrincipalUsername(concurrentSecond, { principalId: concurrentPrincipalId, expectedVersion: created.version, username: 'foxtrot_06' })
    ]);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    assert.ok(rejected?.status === 'rejected' && rejected.reason instanceof PrincipalVersionConflictError);
    const current = await getPrincipal(concurrentFirst, concurrentPrincipalId);
    const historyAfter = await getPrincipalHistory(concurrentFirst, concurrentPrincipalId);
    assert.equal(current?.version, created.version + 1n);
    assert.equal(historyAfter.length, historyBefore.length + 1);
    assert.equal(historyAfter.at(-1)?.historyEventId, current?.currentHistoryEventId);
  } finally {
    await concurrentFirst.destroy();
    await concurrentSecond.destroy();
  }
}
