import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { check, violationsFor } from './architecture-guardrails.mjs';

test('repository source passes the guardrails', () => {
  assert.doesNotThrow(() => check());
});

test('private imports are rejected', () => {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const fixture = join(directory, 'private-import.ts');
  writeFileSync(fixture, "import { entity } from '@naamive/modules/need/internal/entity';\nvoid entity;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
