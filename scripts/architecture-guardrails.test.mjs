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

test('dynamic private imports are rejected', () => {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const fixture = join(directory, 'dynamic-private-import.ts');
  writeFileSync(fixture, "await import('@naamive/modules/need/internal/entity');\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixturePath(...parts) {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`, ...parts.slice(0, -1));
  mkdirSync(directory, { recursive: true });
  return join(directory, parts.at(-1));
}

test('relative imports cannot bypass package public exports', () => {
  const fixture = fixturePath('packages', 'kernel', 'src', 'relative-deep-import.ts');
  writeFileSync(fixture, "import { createDatabase } from '../../database/src/index.ts';\nvoid createDatabase;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['cross-package source access via relative import']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});

test('dynamic imports cannot bypass package public exports', () => {
  const fixture = fixturePath('packages', 'kernel', 'src', 'dynamic-relative-deep-import.ts');
  writeFileSync(fixture, "await import('../../database/src/index.ts');\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['cross-package source access via relative import']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});

test('relative private imports are rejected', () => {
  const fixture = fixturePath('packages', 'kernel', 'src', 'relative-private-import.ts');
  writeFileSync(fixture, "import { entity } from '../../database/src/internal/entity.ts';\nvoid entity;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import', 'cross-package source access via relative import']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});

test('dynamic relative private imports are rejected', () => {
  const fixture = fixturePath('packages', 'kernel', 'src', 'dynamic-relative-private-import.ts');
  writeFileSync(fixture, "await import('../../database/src/internal/entity.ts');\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import', 'cross-package source access via relative import']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});

test('dynamic deep package imports are rejected', () => {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const fixture = join(directory, 'dynamic-deep-package-import.ts');
  writeFileSync(fixture, "await import('@naamive/database/src/index.ts');\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('static deep package imports are rejected', () => {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const fixture = join(directory, 'static-deep-package-import.ts');
  writeFileSync(fixture, "import { createDatabase } from '@naamive/database/src/index.ts';\nvoid createDatabase;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['private module/internal import']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('dynamic public package imports remain accepted', () => {
  const directory = join(tmpdir(), `naamive-guardrail-${process.pid}`);
  mkdirSync(directory, { recursive: true });
  const fixture = join(directory, 'dynamic-public-package-import.ts');
  writeFileSync(fixture, "await import('@naamive/database');\n");
  try {
    assert.deepEqual(violationsFor(fixture), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('relative frontend persistence access is rejected', () => {
  const fixture = fixturePath('apps', 'web', 'src', 'client', 'relative-database-import.ts');
  writeFileSync(fixture, "import { createDatabase } from '../../../../../packages/database/src/index.ts';\nvoid createDatabase;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['frontend persistence access']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});

test('relative imports from packages to composition roots are rejected', () => {
  const fixture = fixturePath('packages', 'kernel', 'src', 'composition-root-import.ts');
  writeFileSync(fixture, "import { app } from '../../../apps/web/src/server/app.ts';\nvoid app;\n");
  try {
    assert.deepEqual(violationsFor(fixture), ['package-to-composition-root dependency']);
  } finally {
    rmSync(join(tmpdir(), `naamive-guardrail-${process.pid}`), { recursive: true, force: true });
  }
});
