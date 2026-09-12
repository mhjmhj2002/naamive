import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { createDatabase } from './index.js';

const migrationLockKey = 426_001_001;

export function migratorConnectionString(connectionString = process.env.DATABASE_URL): string | undefined {
  if (process.env.MIGRATOR_DATABASE_URL) return process.env.MIGRATOR_DATABASE_URL;
  if (!connectionString) return undefined;
  const url = new URL(connectionString);
  url.username = 'naamive_migrator';
  url.password = '';
  return url.toString();
}

export type MigrateOptions = {
  onLockAcquired?: () => Promise<void> | void;
};

export async function migrate(connectionString = migratorConnectionString(), options: MigrateOptions = {}): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL is required for the explicit migration step');
  const lockPool = new Pool({ connectionString });
  const lockClient = await lockPool.connect();
  const database = createDatabase(connectionString);
  try {
    await lockClient.query('SELECT pg_advisory_lock($1)', [migrationLockKey]);
    await options.onLockAcquired?.();
    const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database/migrations');
    const migrator = new Migrator({
      db: database,
      provider: new FileMigrationProvider({ fs, path, migrationFolder: migrationsFolder }),
      migrationTableSchema: 'platform'
    });
    const { error, results } = await migrator.migrateToLatest();
    results?.forEach((result: { migrationName: string; status: string }) => process.stdout.write(`${result.migrationName}: ${result.status}\n`));
    if (error) throw error;
  } finally {
    await database.destroy();
    try {
      await lockClient.query('SELECT pg_advisory_unlock($1)', [migrationLockKey]);
    } finally {
      lockClient.release();
      await lockPool.end();
    }
  }
}

if (import.meta.url === new URL(process.argv[1]!, 'file:').href) await migrate();
