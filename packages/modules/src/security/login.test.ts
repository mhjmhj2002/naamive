import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import test from 'node:test';
import {
  createLoginAuthenticator,
  hashPassword,
  passwordHashParameters,
  type LoginAuthenticationRepository,
  type PasswordCredential
} from './login.js';

class MemoryLoginRepository implements LoginAuthenticationRepository {
  credential?: PasswordCredential & { principalStatus: 'ACTIVE' | 'SUSPENDED' };
  failures = 0;
  resetCalls = 0;

  async findCredentialByUsername() { return this.credential; }
  async checkRateLimit() { return this.failures >= 5 ? { rateLimited: true as const, retryAfterSeconds: 900 } : { rateLimited: false as const }; }
  async recordFailure() {
    if (this.failures >= 5) return { accepted: false as const, retryAfterSeconds: 900 };
    this.failures += 1;
    return { accepted: true as const, delaySeconds: this.failures <= 2 ? 0 : this.failures === 3 ? 1 : this.failures === 4 ? 2 : 4 };
  }
  async resetUsernameIpRateLimit() { this.failures = 0; this.resetCalls += 1; }
}

const hmac = (value: string) => createHmac('sha256', 'test-key').update(value).digest();
const login = (repository: MemoryLoginRepository) => createLoginAuthenticator(repository, { hmac });

test('password hashing follows the governed Argon2id parameters', async () => {
  const hashed = await hashPassword('correct horse battery staple');
  assert.equal(hashed.algorithm, 'argon2id');
  assert.equal(hashed.hashFormatVersion, 1);
  assert.equal(hashed.memoryKib, passwordHashParameters.memoryKib);
  assert.equal(hashed.iterations, passwordHashParameters.iterations);
  assert.equal(hashed.parallelism, passwordHashParameters.parallelism);
  assert.equal(hashed.salt.length, 16);
  assert.equal(hashed.hash.length, 32);
});

test('valid credentials produce only the ephemeral AuthenticatedPrincipal', async () => {
  const repository = new MemoryLoginRepository();
  repository.credential = {
    principalId: randomUUID(), credentialVersion: 7n, principalStatus: 'ACTIVE', ...await hashPassword('correct-password')
  };
  const result = await login(repository).authenticate({
    username: 'alpha_01', password: 'correct-password', clientIp: '203.0.113.10', correlationId: 'corr-1', now: new Date('2026-09-14T20:00:00Z')
  });
  assert.equal(result.kind, 'SUCCESS');
  assert.deepEqual(result.kind === 'SUCCESS' && result.authenticatedPrincipal, {
    principalId: repository.credential.principalId,
    authenticatedAt: new Date('2026-09-14T20:00:00Z'),
    credentialVersion: 7n,
    correlationId: 'corr-1'
  });
  assert.equal(repository.resetCalls, 1);
});

test('unknown username and invalid password share the public authentication result and progressive delay', async () => {
  const unknown = new MemoryLoginRepository();
  const invalid = new MemoryLoginRepository();
  invalid.credential = {
    principalId: randomUUID(), credentialVersion: 1n, principalStatus: 'ACTIVE', ...await hashPassword('correct-password')
  };
  const input = { username: 'alpha_01', password: 'wrong-password', clientIp: '203.0.113.10', correlationId: 'corr' };
  assert.deepEqual(await login(unknown).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 0 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 0 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 0 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 1 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 2 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'AUTHENTICATION_FAILED', delaySeconds: 4 });
  assert.deepEqual(await login(invalid).authenticate(input), { kind: 'RATE_LIMITED', retryAfterSeconds: 900 });
});
