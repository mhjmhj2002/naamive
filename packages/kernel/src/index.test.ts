import { describe, expect, it } from 'vitest';
import { createLogger } from './index.js';

describe('structured logging foundation', () => {
  it('includes required context and redacts sensitive values', () => {
    const writes: string[] = [];
    const logger = createLogger(
      { service: 'worker', environment: 'test', release_id: 'test', operation: 'bootstrap', outcome: 'ok' },
      { timestamp: false },
      { write: (value: string) => writes.push(value) } as never,
    );
    const secrets = [
      'top-level-password',
      'request-password',
      'body-password',
      'envelope-password',
      'deep-password',
      'array-password',
      'authorization-value',
      'nested-authorization-value',
      'cookie-value',
      'access-token-value',
      'refresh-token-value',
      'passwd-value'
    ];
    logger.info({
      password: secrets[0],
      request: {
        password: secrets[1],
        envelope: { body: { password: secrets[3] } },
        context: { headers: { authorization: secrets[7] } }
      },
      body: { password: secrets[2] },
      a: { b: { c: { d: { e: { password: secrets[4] } } } } },
      entries: [{ credentials: { password: secrets[5] } }],
      headers: { authorization: secrets[6], cookie: secrets[8] },
      credentials: { access_token: secrets[9] },
      session: { refresh_token: secrets[10] },
      passwd: secrets[11],
      request_id: 'request-123',
      attempt: 3
    }, 'foundation');
    const output = writes.join('');
    expect(output).toContain('[REDACTED]');
    expect(output).toContain('request-123');
    expect(output).toContain('"attempt":3');
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).toContain('"service":"worker"');
  });
});
