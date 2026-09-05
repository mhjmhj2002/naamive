export const TEST_DATABASE_SAFETY_GUARD = 'TEST_DATABASE_SAFETY_GUARD';

const disposableDatabasePattern = /^naamive_(?:test|e2e|fix)_[a-z0-9_]+$/;

export class TestDatabaseSafetyError extends Error {
  constructor(message: string) {
    super(`${TEST_DATABASE_SAFETY_GUARD}\n\n${message}`);
    this.name = 'TestDatabaseSafetyError';
  }
}

export const testDatabaseName = (databaseUrl: string): string => {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new TestDatabaseSafetyError('DATABASE_URL must be a valid PostgreSQL connection URL for automated PostgreSQL tests.');
  }
  const name = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!name || name.includes('/')) throw new TestDatabaseSafetyError('DATABASE_URL must name one disposable PostgreSQL database.');
  return name;
};

/** Validates both the configured target and the server-reported target. */
export const assertSafeTestDatabaseUrl = (databaseUrl: string): string => {
  const name = testDatabaseName(databaseUrl);
  if (name === 'naamive') {
    throw new TestDatabaseSafetyError('Refusing to run automated tests against runtime database "naamive". Use a disposable test database.');
  }
  if (!disposableDatabasePattern.test(name)) {
    throw new TestDatabaseSafetyError(`Refusing non-disposable test database "${name}". Use a database named naamive_test_<id>, naamive_e2e_<id>, or naamive_fix_<id>.`);
  }
  return name;
};

export const assertSafeConnectedTestDatabase = async (
  query: (sql: string) => Promise<{ rows: Array<{ database_name: string }> }>,
  expectedName: string,
): Promise<void> => {
  const result = await query('SELECT current_database() AS database_name');
  const actualName = result.rows[0]?.database_name;
  if (actualName !== expectedName) {
    throw new TestDatabaseSafetyError(`Connected PostgreSQL database "${actualName ?? 'unknown'}" does not match disposable target "${expectedName}".`);
  }
  // Keep the server-reported name behind exactly the same fail-closed policy.
  assertSafeTestDatabaseUrl(`postgresql://test@localhost/${encodeURIComponent(actualName)}`);
};

export const requiresTestDatabaseSafetyGuard = (): boolean =>
  process.env.NAAMIVE_TEST_DATABASE === '1' || process.env.NODE_TEST_CONTEXT !== undefined;
