import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('F5-17 uses the single canonical projection and generic action renderer', () => {
  assert.match(page, /\/api\/projects\/\$\{encodeURIComponent\(projectId\)\}\/projection/);
  assert.match(page, /renderProjection\(projection\)/);
  assert.match(page, /renderActions\(projection\)/);
  assert.match(page, /descriptor\.command\.href/);
  assert.match(page, /projection\.resources\.technology_baseline/);
  assert.doesNotMatch(page, /f517OpenProject/);
  assert.doesNotMatch(page, /f517RenderPanel/);
  assert.doesNotMatch(page, /materialization-options/);
});

test('F5-17 keeps baseline display allowlisted and has no baseline-specific renderer', () => {
  assert.match(page, /Technology Baseline · \$\{baseline\.revision_status\}/);
  assert.match(page, /Revisão \$\{baseline\.revision_number\}/);
  assert.doesNotMatch(page, /technology-baseline\/materialization-options/);
  assert.doesNotMatch(page, /source_path:/);
  assert.doesNotMatch(page, /confiança\/incerteza:/);
  assert.doesNotMatch(page, /TYPESCRIPT|NODEJS|POSTGRESQL/);
});
