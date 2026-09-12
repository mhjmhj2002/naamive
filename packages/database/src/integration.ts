import { Pool } from 'pg';
import { bootstrap } from './bootstrap.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required for the real PostgreSQL integration bootstrap');
await bootstrap(connectionString);
const pool = new Pool({ connectionString });
try {
  const version = await pool.query<{ version: string }>('SELECT version()');
  const roles = await pool.query<{ rolname: string }>("SELECT rolname FROM pg_roles WHERE rolname IN ('naamive_migrator', 'naamive_web', 'naamive_worker', 'naamive_observer') ORDER BY rolname");
  const schema = await pool.query<{ schema_name: string }>("SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'platform'");
  if (!version.rows[0]?.version.includes('PostgreSQL 18.6')) throw new Error(`Expected PostgreSQL 18.6, got ${version.rows[0]?.version}`);
  if (roles.rows.length !== 4 || schema.rows.length !== 1) throw new Error('Database roles or platform schema were not created');
  process.stdout.write(JSON.stringify({ integration: 'passed', version: version.rows[0].version, roles: roles.rows.map((row) => row.rolname) }) + '\n');
} finally {
  await pool.end();
}
