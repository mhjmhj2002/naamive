import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { createLoginAuthenticator, hashPassword } from '@naamive/modules';
import { createDatabase, createPrincipal } from './index.js';
import { createLoginAuthenticationRepository } from './login.js';

const hmac = (value: string) => createHmac('sha256', 'integration-login-rate-limit-key').update(value).digest();

export async function verifyPasswordLoginPersistence(connectionString: string): Promise<void> {
  const runtimeUrl = new URL(connectionString);
  runtimeUrl.username = 'naamive_web';
  runtimeUrl.password = '';
  const principalId = randomUUID();
  const username = `login_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
  const password = 'correct-password';
  const runtime = createDatabase(runtimeUrl.toString());
  const administrator = new Pool({ connectionString });
  try {
    await createPrincipal(runtime, { principalId, username });
    const hashed = await hashPassword(password);
    await administrator.query(
      `INSERT INTO security.human_password_credential (
        credential_id, principal_id, credential_version, hash_format_version, algorithm,
        memory_kib, iterations, parallelism, salt, hash
      ) VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9)`,
      [randomUUID(), principalId, hashed.hashFormatVersion, hashed.algorithm, hashed.memoryKib,
        hashed.iterations, hashed.parallelism, hashed.salt, hashed.hash]
    );
    const service = createLoginAuthenticator(createLoginAuthenticationRepository(runtime), { hmac });
    const now = new Date('2026-09-14T20:00:00Z');
    const success = await service.authenticate({ username, password, clientIp: '203.0.113.9', correlationId: 'success', now });
    assert.equal(success.kind, 'SUCCESS');
    assert.equal(success.kind === 'SUCCESS' && success.authenticatedPrincipal.principalId, principalId);

    const invalidInput = { username, password: 'wrong-password', clientIp: '203.0.113.9', correlationId: 'invalid', now };
    assert.deepEqual(await service.authenticate(invalidInput), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 0 });
    assert.deepEqual(await service.authenticate(invalidInput), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 0 });
    assert.deepEqual(await service.authenticate(invalidInput), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 1 });
    await runtime.destroy();

    const restarted = createDatabase(runtimeUrl.toString());
    try {
      const afterRestart = createLoginAuthenticator(createLoginAuthenticationRepository(restarted), { hmac });
      assert.deepEqual(await afterRestart.authenticate(invalidInput), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 2 });
      assert.equal((await afterRestart.authenticate({ ...invalidInput, password, correlationId: 'reset' })).kind, 'SUCCESS');
    } finally {
      await restarted.destroy();
    }

    const concurrent = createDatabase(runtimeUrl.toString());
    try {
      const repository = createLoginAuthenticationRepository(concurrent);
      const ipSignal = hmac('ip\u0000198.51.100.1');
      const usernameIpSignal = hmac('username+ip\u0000concurrent_01\u0000198.51.100.1');
      const outcomes = await Promise.all(Array.from({ length: 6 }, () => repository.recordFailure({ ipSignal, usernameIpSignal, now })));
      assert.equal(outcomes.filter((outcome) => outcome.accepted).length, 5);
      assert.equal(outcomes.filter((outcome) => !outcome.accepted).length, 1);
      const limited = await repository.checkRateLimit({ ipSignal, usernameIpSignal, now });
      assert.deepEqual(limited, { rateLimited: true, retryAfterSeconds: 900 });
    } finally {
      await concurrent.destroy();
    }
  } finally {
    await administrator.end();
    await runtime.destroy().catch(() => undefined);
  }
}
