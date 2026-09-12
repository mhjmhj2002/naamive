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
    logger.info({ password: 'do-not-log' }, 'foundation');
    expect(writes.join('')).toContain('[REDACTED]');
    expect(writes.join('')).not.toContain('do-not-log');
    expect(writes.join('')).toContain('"service":"worker"');
  });
});
