import Fastify from 'fastify';
import { Type } from 'typebox';

const healthResponse = Type.Object({
  status: Type.Union([Type.Literal('live'), Type.Literal('ready')]),
  service: Type.Literal('web')
});

export function buildWebApp() {
  const app = Fastify({ logger: false });

  app.get('/health/live', { schema: { response: { 200: healthResponse } } }, async () => ({
    status: 'live' as const,
    service: 'web' as const
  }));

  app.get('/health/ready', { schema: { response: { 200: healthResponse } } }, async () => ({
    status: 'ready' as const,
    service: 'web' as const
  }));

  return app;
}
