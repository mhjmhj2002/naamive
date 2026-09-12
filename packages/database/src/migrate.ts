import { FileMigrationProvider, Migrator } from 'kysely/migration';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './index.js';

export async function migrate(connectionString = process.env.DATABASE_URL): Promise<void> {
  if (!connectionString) throw new Error('DATABASE_URL is required for the explicit migration step');
  const database = createDatabase(connectionString);
  const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database/migrations');
  const migrator = new Migrator({
    db: database,
    provider: new FileMigrationProvider({ fs, path, migrationFolder: migrationsFolder })
  });
  const { error, results } = await migrator.migrateToLatest();
  results?.forEach((result: { migrationName: string; status: string }) => process.stdout.write(`${result.migrationName}: ${result.status}\n`));
  await database.destroy();
  if (error) throw error;
}

if (import.meta.url === new URL(process.argv[1]!, 'file:').href) await migrate();
