import { Pool } from 'pg';
import { bootstrap } from './bootstrap.js';
import { migrate, migratorConnectionString } from './migrate.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for the real PostgreSQL integration bootstrap');
await bootstrap(connectionString);
const pool = new Pool({ connectionString });
try {
  const version = await pool.query<{ version: string }>('SELECT version()');
  const roles = await pool.query<{ rolname: string }>("SELECT rolname FROM pg_roles WHERE rolname IN ('naamive_migrator', 'naamive_web', 'naamive_worker', 'naamive_observer') ORDER BY rolname");
  const schema = await pool.query<{ schema_name: string }>("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'platform'");
  const metadata = await pool.query<{ table_schema: string; table_name: string }>("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'platform' AND table_name IN ('kysely_migration', 'kysely_migration_lock') ORDER BY table_name");
  if (!version.rows[0]?.version.includes('PostgreSQL 18.6')) throw new Error(`Expected PostgreSQL 18.6, got ${version.rows[0]?.version}`);
  if (roles.rows.length !== 4 || schema.rows.length !== 1) throw new Error('Database roles or platform schema were not created');
  if (metadata.rows.length !== 2) throw new Error('Kysely migration metadata is not located in platform');

  const migratorUrl = migratorConnectionString(connectionString);
  if (!migratorUrl) throw new Error('Migrator connection string is unavailable');
  let releaseFirst!: () => void;
  const firstLockAcquired = new Promise<void>((resolve) => { releaseFirst = resolve; });
  let firstHasLock!: () => void;
  const firstIsHoldingLock = new Promise<void>((resolve) => { firstHasLock = resolve; });
  const first = migrate(migratorUrl, { onLockAcquired: async () => { firstHasLock(); await firstLockAcquired; } });
  await firstIsHoldingLock;
  let secondAcquired = false;
  const second = migrate(migratorUrl, { onLockAcquired: () => { secondAcquired = true; } });
  await new Promise((resolve) => setTimeout(resolve, 100));
  if (secondAcquired) throw new Error('Concurrent migration acquired the advisory lock');
  releaseFirst();
  await Promise.all([first, second]);

  for (const runtimeRole of ['naamive_web', 'naamive_worker']) {
    const runtimeUrl = new URL(connectionString);
    runtimeUrl.username = runtimeRole;
    runtimeUrl.password = '';
    const runtimePool = new Pool({ connectionString: runtimeUrl.toString() });
    try {
      await runtimePool.query('SELECT * FROM platform.foundation_migration_probe');
      await runtimePool.query('CREATE TABLE platform.runtime_ddl_probe (id integer)');
      throw new Error(`${runtimeRole} unexpectedly performed DDL`);
    } catch (error) {
      if (!(error instanceof Error) || !/permission denied/i.test(error.message)) throw error;
    } finally {
      await runtimePool.end();
    }
  }
  process.stdout.write(JSON.stringify({ integration: 'passed', version: version.rows[0].version, roles: roles.rows.map((row) => row.rolname), migration_metadata_schema: 'platform', advisory_lock: 'serialized', runtime_ddl: 'denied' }) + '\n');
} finally {
  await pool.end();
}
