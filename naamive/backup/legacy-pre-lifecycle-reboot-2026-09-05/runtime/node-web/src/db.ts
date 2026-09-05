import pg from 'pg';
import { config } from './config.js';
import { assertSafeConnectedTestDatabase, assertSafeTestDatabaseUrl, requiresTestDatabaseSafetyGuard } from './test-database-safety.js';

const databaseUrl = config().databaseUrl;

// A Node test process (including `node --test ...` used directly) cannot open
// the persistent manual/runtime database. The URL check fails before a fixture
// can be created; the second check proves what PostgreSQL actually selected.
if (requiresTestDatabaseSafetyGuard()) {
  const expectedName = assertSafeTestDatabaseUrl(databaseUrl);
  const guardClient = new pg.Client({ connectionString: databaseUrl });
  try {
    await guardClient.connect();
    await assertSafeConnectedTestDatabase((sql) => guardClient.query(sql), expectedName);
  } finally {
    await guardClient.end().catch(() => undefined);
  }
}

export const pool = new pg.Pool({ connectionString: databaseUrl });
export const withTransaction = async <T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
/** Opens a single consistent, read-only database snapshot. Every query inside
 * `work` observes exactly one MVCC snapshot. `snapshotNow` is captured once at
 * snapshot start and is the sole temporal boundary for all projection decisions
 * (lease expiry, grant expiry, credential/principal expiry, pause fences). */
export const withReadOnlySnapshot = async <T>(work: (client: pg.PoolClient, snapshotNow: Date) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const now = await client.query<{ snapshot_now: string }>('SELECT clock_timestamp() AS snapshot_now');
    const snapshotNow = new Date(now.rows[0].snapshot_now);
    const result = await work(client, snapshotNow);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
};
