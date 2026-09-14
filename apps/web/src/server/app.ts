import Fastify from 'fastify';
import { Type } from 'typebox';
import { createHmac, randomUUID } from 'node:crypto';
import { LoginValidationError, type LoginAuthenticator } from '@naamive/modules';

const healthResponse = Type.Object({
  status: Type.Union([Type.Literal('live'), Type.Literal('ready')]),
  service: Type.Literal('web')
});

const loginRequest = Type.Object({
  username: Type.String({ pattern: '^[a-z][a-z0-9_-]{2,31}$' }),
  password: Type.String({ minLength: 1, maxLength: 1024 })
}, { additionalProperties: false });

type BuildWebAppOptions = {
  loginAuthenticator?: LoginAuthenticator;
  trustedProxies?: string[];
  wait?: (milliseconds: number) => Promise<void>;
};

export function buildWebApp(options: BuildWebAppOptions = {}) {
  const app = Fastify({ logger: false, trustProxy: options.trustedProxies ?? false });
  const wait = options.wait ?? ((milliseconds) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));

  app.setErrorHandler((error, _request, reply) => {
    if ((error as { validation?: unknown }).validation !== undefined || error instanceof LoginValidationError) {
      return reply.code(400).send({ code: 'VALIDATION_ERROR' });
    }
    throw error;
  });

  app.get('/health/live', { schema: { response: { 200: healthResponse } } }, async () => ({
    status: 'live' as const,
    service: 'web' as const
  }));

  app.get('/health/ready', { schema: { response: { 200: healthResponse } } }, async () => ({
    status: 'ready' as const,
    service: 'web' as const
  }));

  app.post('/api/session/login', {
    schema: {
      body: loginRequest,
      response: {
        204: Type.Null(),
        400: Type.Object({ code: Type.Literal('VALIDATION_ERROR') }),
        401: Type.Object({ code: Type.Literal('AUTHENTICATION_FAILED'), message: Type.Literal('Invalid username or password.') }),
        429: Type.Object({ code: Type.Literal('RATE_LIMITED') })
      }
    }
  }, async (request, reply) => {
    if (!options.loginAuthenticator) throw new Error('Login authenticator is not configured');
    const body = request.body as { username: string; password: string };
    const result = await options.loginAuthenticator.authenticate({
      username: body.username,
      password: body.password,
      clientIp: request.ip,
      correlationId: typeof request.headers['x-correlation-id'] === 'string'
        ? request.headers['x-correlation-id']
        : randomUUID()
    });
    if (result.kind === 'SUCCESS') return reply.code(204).send();
    if (result.kind === 'RATE_LIMITED') {
      return reply.header('Retry-After', result.retryAfterSeconds).code(429).send({ code: 'RATE_LIMITED' });
    }
    if (result.delaySeconds > 0) await wait(result.delaySeconds * 1_000);
    return reply.code(401).send({ code: 'AUTHENTICATION_FAILED', message: 'Invalid username or password.' });
  });

  return app;
}
