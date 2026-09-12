import { Pool } from 'pg';
import { migrate, migratorConnectionString } from './migrate.js';

const schemas = ['platform', 'need', 'project', 'business_module', 'value_delivery', 'work_item', 'execution', 'governance', 'authority', 'security', 'delivery', 'audit', 'evidence', 'projection', 'ops'];
const roles = ['naamive_migrator', 'naamive_web', 'naamive_worker', 'naamive_observer'];

export async function bootstrap(connectionString = process.env.DATABASE_URL): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL is required for database bootstrap');
  const pool = new Pool({ connectionString });
  try {
    for (const role of roles) await pool.query(`DO $$ BEGIN CREATE ROLE ${role} LOGIN; EXCEPTION WHEN duplicate_object THEN ALTER ROLE ${role} LOGIN; END $$;`);
    for (const schema of schemas) await pool.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
    await pool.query('REVOKE CREATE ON DATABASE naamive FROM PUBLIC');
    await pool.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    for (const role of ['naamive_web', 'naamive_worker']) {
      for (const schema of schemas) await pool.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    }
    await pool.query('GRANT USAGE, CREATE ON SCHEMA platform TO naamive_migrator');
    await pool.query('ALTER DEFAULT PRIVILEGES FOR ROLE naamive_migrator IN SCHEMA platform GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO naamive_web, naamive_worker');
    await pool.query('GRANT CONNECT ON DATABASE naamive TO naamive_migrator, naamive_web, naamive_worker, naamive_observer');
  } finally {
    await pool.end();
  }
  const migratorUrl = migratorConnectionString(connectionString);
  if (!migratorUrl) throw new Error('A migrator connection string is required for the explicit migration step');
  await migrate(migratorUrl);
}

if (import.meta.url === new URL(process.argv[1]!, 'file:').href) await bootstrap();
