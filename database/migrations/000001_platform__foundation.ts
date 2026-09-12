import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`CREATE TABLE IF NOT EXISTS platform.foundation_migration_probe (id integer PRIMARY KEY)`.execute(db);
}

export async function down(): Promise<void> {
  throw new Error('Foundation migrations are forward-only');
}
