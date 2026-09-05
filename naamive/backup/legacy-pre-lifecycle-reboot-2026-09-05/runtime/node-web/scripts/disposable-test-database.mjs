import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import pg from 'pg';

const disposablePattern = /^naamive_(?:test|e2e|fix)_[a-z0-9_]+$/;

const quoteIdentifier = (value) => `"${value.replaceAll('"', '""')}"`;

export const disposableDatabaseName = (kind = 'test', entropy = randomBytes(6).toString('hex')) => {
  if (!['test', 'e2e', 'fix'].includes(kind)) throw new Error(`Unsupported disposable database kind: ${kind}`);
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14).toLowerCase();
  return `naamive_${kind}_${timestamp}_${process.pid}_${entropy}`;
};

export const disposableDatabaseUrl = (baseUrl, databaseName) => {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
};

const administrativeUrl = (baseUrl) => {
  const url = new URL(baseUrl);
  url.pathname = '/postgres';
  return url.toString();
};

const validateDisposableName = (databaseName) => {
  if (!disposablePattern.test(databaseName)) throw new Error(`Refusing to manage non-disposable database "${databaseName}".`);
};

const adminClient = async (baseUrl) => {
  const client = new pg.Client({ connectionString: administrativeUrl(baseUrl) });
  await client.connect();
  return client;
};

export const databaseExists = async (baseUrl, databaseName) => {
  const client = await adminClient(baseUrl);
  try {
    return (await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName])).rowCount === 1;
  } finally {
    await client.end();
  }
};

export const createDisposableDatabase = async (baseUrl, kind = 'test') => {
  const databaseName = disposableDatabaseName(kind);
  validateDisposableName(databaseName);
  const client = await adminClient(baseUrl);
  try {
    await client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
  return { databaseName, databaseUrl: disposableDatabaseUrl(baseUrl, databaseName) };
};

export const dropDisposableDatabase = async (baseUrl, databaseName) => {
  validateDisposableName(databaseName);
  const client = await adminClient(baseUrl);
  try {
    await client.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [databaseName]);
    await client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)}`);
  } finally {
    await client.end();
  }
};

export const runCommand = (command, args, env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.once('error', reject);
  child.once('close', (code, signal) => {
    if (code === 0 && !signal) resolve();
    else reject(new Error(`${command} ${args.join(' ')} exited with ${signal ?? code}`));
  });
});

/** Creates one database owned by this runner and always drops only that database. */
export const withDisposableTestDatabase = async ({ baseUrl = process.env.DATABASE_URL, kind = 'test', keep = process.env.NAAMIVE_KEEP_TEST_DATABASE === '1', logger = console, run }) => {
  if (!baseUrl) throw new Error('DATABASE_URL is required to derive an administrative PostgreSQL connection.');
  const database = await createDisposableDatabase(baseUrl, kind);
  const env = { ...process.env, DATABASE_URL: database.databaseUrl, NAAMIVE_TEST_DATABASE: '1', NAAMIVE_TEST_DATABASE_NAME: database.databaseName };
  logger.log(`Disposable PostgreSQL database: ${database.databaseName}`);
  try {
    return await run({ ...database, env });
  } finally {
    if (keep) logger.log(`Keeping disposable PostgreSQL database: ${database.databaseName}`);
    else {
      await dropDisposableDatabase(baseUrl, database.databaseName);
      logger.log(`Removed disposable PostgreSQL database: ${database.databaseName}`);
    }
  }
};
