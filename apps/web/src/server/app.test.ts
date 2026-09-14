import { describe, expect, it } from 'vitest';
import { buildWebApp } from './app.js';
import type { LoginAuthenticator } from '@naamive/modules';

const authenticatedPrincipal = {
  principalId: '00000000-0000-0000-0000-000000000001',
  authenticatedAt: new Date('2026-09-14T20:00:00Z'),
  credentialVersion: 1n,
  correlationId: 'corr'
};

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

describe('POST /api/session/login', () => {
  it('returns 204 without a cookie or reusable token on success', async () => {
    const authenticator: LoginAuthenticator = { authenticate: async () => ({ kind: 'SUCCESS', authenticatedPrincipal }) };
    const app = buildWebApp({ loginAuthenticator: authenticator });
    const response = await app.inject({ method: 'POST', url: '/api/session/login', payload: { username: 'alpha_01', password: 'password' } });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(response.headers.authorization).toBeUndefined();
    await app.close();
  });

  it('returns the governed generic failure and applies the supplied progressive delay', async () => {
    let waited = 0;
    const authenticator: LoginAuthenticator = { authenticate: async () => ({ kind: 'AUTHENTICATION_FAILED', delaySeconds: 2 }) };
    const app = buildWebApp({ loginAuthenticator: authenticator, wait: async (milliseconds) => { waited = milliseconds; } });
    const response = await app.inject({ method: 'POST', url: '/api/session/login', payload: { username: 'alpha_01', password: 'password' } });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: 'AUTHENTICATION_FAILED', message: 'Invalid username or password.' });
    expect(waited).toBe(2_000);
    await app.close();
  });

  it('rejects malformed requests and emits a governed rate-limit response', async () => {
    const authenticator: LoginAuthenticator = { authenticate: async () => ({ kind: 'RATE_LIMITED', retryAfterSeconds: 42 }) };
    const app = buildWebApp({ loginAuthenticator: authenticator });
    const invalid = await app.inject({ method: 'POST', url: '/api/session/login', payload: { username: 'Alpha', password: '' } });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json()).toEqual({ code: 'VALIDATION_ERROR' });
    const limited = await app.inject({ method: 'POST', url: '/api/session/login', payload: { username: 'alpha_01', password: 'password' } });
    expect(limited.statusCode).toBe(429);
    expect(limited.json()).toEqual({ code: 'RATE_LIMITED' });
    expect(limited.headers['retry-after']).toBe('42');
    await app.close();
  });

  it('uses forwarded addresses only when the immediate peer is trusted', async () => {
    const ips: string[] = [];
    const authenticator: LoginAuthenticator = {
      authenticate: async (input) => {
        ips.push(input.clientIp);
        return { kind: 'SUCCESS', authenticatedPrincipal };
      }
    };
    const trusted = buildWebApp({ loginAuthenticator: authenticator, trustedProxies: ['10.0.0.0/8'] });
    await trusted.inject({
      method: 'POST', url: '/api/session/login', remoteAddress: '10.0.0.4',
      headers: { 'x-forwarded-for': '203.0.113.11, 10.0.0.3' }, payload: { username: 'alpha_01', password: 'password' }
    });
    const untrusted = buildWebApp({ loginAuthenticator: authenticator });
    await untrusted.inject({
      method: 'POST', url: '/api/session/login', remoteAddress: '198.51.100.12',
      headers: { 'x-forwarded-for': '203.0.113.12' }, payload: { username: 'alpha_01', password: 'password' }
    });
    expect(ips).toEqual(['203.0.113.11', '198.51.100.12']);
    await trusted.close();
    await untrusted.close();
  });
});
