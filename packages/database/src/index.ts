import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';

export interface DatabaseSchema { platform: { foundation_migration_probe: { id: number } }; }

export function createDatabase(connectionString: string) {
  return new Kysely<DatabaseSchema>({ dialect: new PostgresDialect({ pool: new Pool({ connectionString }) }) });
}
