import { describe, expect, it } from 'vitest';
import { buildWebApp } from './app.js';

describe('web health endpoints', () => {
  it('reports liveness', async () => {
    const app = buildWebApp();
    const response = await app.inject({ method: 'GET', url: '/health/live' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'live', service: 'web' });
    await app.close();
  });

  it('reports readiness', async () => {
    const app = buildWebApp();
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ready', service: 'web' });
    await app.close();
  });
});
