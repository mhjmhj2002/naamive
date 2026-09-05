import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';
import { promisify } from 'node:util';
import { TEST_DATABASE_SAFETY_GUARD, assertSafeTestDatabaseUrl } from './test-database-safety.js';

const execFileAsync = promisify(execFile);

test('TST-02 rejects the persistent runtime database before fixtures can be created', () => {
  assert.throws(
    () => assertSafeTestDatabaseUrl('postgres://tester:secret@127.0.0.1:5432/naamive'),
    (error: unknown) => error instanceof Error && error.message.includes(TEST_DATABASE_SAFETY_GUARD) && error.message.includes('runtime database "naamive"'),
  );
});

test('TST-02 accepts only a disposable PostgreSQL database name', () => {
  assert.equal(assertSafeTestDatabaseUrl('postgres://tester:secret@127.0.0.1:5432/naamive_test_20260902_ab12'), 'naamive_test_20260902_ab12');
  assert.throws(() => assertSafeTestDatabaseUrl('postgres://tester:secret@127.0.0.1:5432/postgres'), new RegExp(TEST_DATABASE_SAFETY_GUARD));
});

/** @postgresql-test */
test('TST-02 provisions, migrates, cleans up, keeps explicitly, and isolates concurrent databases', async () => {
  await execFileAsync(process.execPath, ['scripts/disposable-test-database.test.mjs'], {
    cwd: process.cwd(),
    env: process.env,
  });
});
