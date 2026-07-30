import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, withTransaction } from './db.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
for (const file of (await readdir(root)).filter((name) => name.endsWith('.sql')).sort()) {
  await withTransaction(async (client) => {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    if ((await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file])).rowCount) return;
    await client.query(await readFile(join(root, file), 'utf8'));
    await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
  });
}
await pool.end();
