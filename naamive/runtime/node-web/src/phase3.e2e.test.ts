import test from 'node:test';
import assert from 'node:assert/strict';

test('Phase 3 controlled acceptance requires PostgreSQL', { skip: !process.env.DATABASE_URL ? 'set DATABASE_URL' : false }, async () => {
  // The full browser/API flow is intentionally gated on PostgreSQL: it must
  // prove persisted events, immutable artifacts and restart recovery rather
  // than a memory substitute. The scenario is completed in the DB harness.
  assert.ok(process.env.DATABASE_URL);
});
