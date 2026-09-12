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
    const secrets = ['top-level-password', 'request-password', 'body-password', 'authorization-value', 'cookie-value', 'token-value', 'access-token-value', 'refresh-token-value'];
    logger.info({
      password: secrets[0],
      request: { password: secrets[1] },
      body: { password: secrets[2] },
      headers: { authorization: secrets[3], cookie: secrets[4] },
      token: secrets[5],
      access_token: secrets[6],
      refresh_token: secrets[7]
    }, 'foundation');
    const output = writes.join('');
    expect(output).toContain('[REDACTED]');
    for (const secret of secrets) expect(output).not.toContain(secret);
    expect(output).toContain('"service":"worker"');
  });
});
