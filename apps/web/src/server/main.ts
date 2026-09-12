import { buildWebApp } from './app.js';

const app = buildWebApp();
const port = Number(process.env.PORT ?? '3000');

await app.listen({ host: '0.0.0.0', port });
