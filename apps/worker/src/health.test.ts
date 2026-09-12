import { describe, expect, it } from 'vitest';
import { workerHealth } from './health.js';

describe('worker health', () => {
  it('is machine-readable and ready', () => {
    expect(workerHealth()).toEqual({ status: 'ready', service: 'worker' });
  });
});
