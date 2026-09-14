import { buildWebApp } from './app.js';
import { createHmac } from 'node:crypto';
import { createDatabase, createLoginAuthenticationRepository } from '@naamive/database';
import { createLoginAuthenticator } from '@naamive/modules';

const connectionString = process.env.DATABASE_URL;
const rateLimitHmacKey = process.env.LOGIN_RATE_LIMIT_HMAC_KEY;
if (!connectionString || !rateLimitHmacKey) throw new Error('DATABASE_URL and LOGIN_RATE_LIMIT_HMAC_KEY are required');
const database = createDatabase(connectionString);
const app = buildWebApp({
  loginAuthenticator: createLoginAuthenticator(createLoginAuthenticationRepository(database), {
    hmac: (value) => createHmac('sha256', rateLimitHmacKey).update(value).digest()
  }),
  trustedProxies: process.env.TRUSTED_PROXY_CIDRS?.split(',').filter(Boolean)
});
app.addHook('onClose', async () => database.destroy());
const port = Number(process.env.PORT ?? '3000');

await app.listen({ host: '0.0.0.0', port });
