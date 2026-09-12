import { Pool } from 'pg';
import { migrate } from './migrate.js';

const schemas = ['platform', 'need', 'project', 'business_module', 'value_delivery', 'work_item', 'execution', 'governance', 'authority', 'security', 'delivery', 'audit', 'evidence', 'projection', 'ops'];
const roles = ['naamive_migrator', 'naamive_web', 'naamive_worker', 'naamive_observer'];

export async function bootstrap(connectionString = process.env.DATABASE_URL): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL is required for database bootstrap');
  const pool = new Pool({ connectionString });
  try {
    for (const role of roles) await pool.query(`DO $$ BEGIN CREATE ROLE ${role}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    for (const schema of schemas) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    for (const role of ['naamive_web', 'naamive_worker']) {
      for (const schema of schemas) await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    }
    for (const schema of schemas) await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO naamive_migrator`);
    await pool.query('GRANT CONNECT ON DATABASE naamive TO naamive_migrator, naamive_web, naamive_worker, naamive_observer');
  } finally {
    await pool.end();
  }
  await migrate(connectionString);
}

if (import.meta.url === new URL(process.argv[1]!, 'file:').href) await bootstrap();
