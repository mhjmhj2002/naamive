import assert from 'node:assert/strict';
import pg from 'pg';
import { readdir } from 'node:fs/promises';
import { databaseExists, dropDisposableDatabase, runCommand, withDisposableTestDatabase } from './disposable-test-database.mjs';

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) throw new Error('DATABASE_URL is required for disposable PostgreSQL runner tests.');

const migrationCount = (await readdir('migrations')).filter((file) => file.endsWith('.sql')).length;
const verifyMigratedDatabase = async ({ databaseName, databaseUrl, env }) => {
  await runCommand(process.execPath, ['dist/migrate.js'], env);
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const current = await client.query('SELECT current_database() AS database_name');
    assert.equal(current.rows[0].database_name, databaseName);
    const migrations = await client.query('SELECT count(*)::int AS count FROM schema_migrations');
    assert.equal(migrations.rows[0].count, migrationCount);
  } finally {
    await client.end();
  }
};

let successfulName;
await withDisposableTestDatabase({
  baseUrl,
  kind: 'test',
  run: async (database) => {
    successfulName = database.databaseName;
    await verifyMigratedDatabase(database);
  },
});
assert.equal(await databaseExists(baseUrl, successfulName), false, 'successful suite must remove its database');

let failedName;
await assert.rejects(() => withDisposableTestDatabase({
  baseUrl,
  kind: 'test',
  run: async (database) => {
    failedName = database.databaseName;
    throw new Error('intentional disposable database failure');
  },
}), /intentional disposable database failure/);
assert.equal(await databaseExists(baseUrl, failedName), false, 'failed suite must remove its database');

const keptLogs = [];
let keptName;
await withDisposableTestDatabase({
  baseUrl,
  kind: 'test',
  keep: true,
  logger: { log: (message) => keptLogs.push(message) },
  run: async (database) => { keptName = database.databaseName; },
});
assert.equal(await databaseExists(baseUrl, keptName), true, 'explicit keep must preserve only the disposable database');
assert.ok(keptLogs.some((message) => message.includes(`Keeping disposable PostgreSQL database: ${keptName}`)));
await dropDisposableDatabase(baseUrl, keptName);

const concurrent = await Promise.all([
  withDisposableTestDatabase({ baseUrl, kind: 'test', keep: true, logger: { log() {} }, run: async (database) => database.databaseName }),
  withDisposableTestDatabase({ baseUrl, kind: 'test', keep: true, logger: { log() {} }, run: async (database) => database.databaseName }),
]);
assert.notEqual(concurrent[0], concurrent[1], 'concurrent executions must receive different database names');
try {
  assert.equal(await databaseExists(baseUrl, concurrent[0]), true);
  assert.equal(await databaseExists(baseUrl, concurrent[1]), true);
} finally {
  await Promise.all(concurrent.map((databaseName) => dropDisposableDatabase(baseUrl, databaseName)));
}

console.log('disposable PostgreSQL runner safety, migration, cleanup, keep, and concurrency checks passed');
