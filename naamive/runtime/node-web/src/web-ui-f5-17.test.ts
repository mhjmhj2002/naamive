import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('F5-17 has one public-contract implementation driven by published catalog data', () => {
  assert.match(page, /const f517LoadData=/);
  assert.match(page, /const f517RenderPanel=/);
  assert.match(page, /const f517Refresh=/);
  assert.match(page, /const f517OpenProject=/);
  assert.match(page, /materialization-options/);
  assert.match(page, /options\.baseline_required/);
  assert.match(page, /\/api\/technology\/categories/);
  assert.match(page, /catalog-items\?category_id=/);
  assert.match(page, /\/api\/technology\/profiles\?status=ACTIVE/);
  assert.match(page, /\/api\/technology\/profiles\/\$\{encodeURIComponent\(profileSummary\.id\)\}/);
  assert.doesNotMatch(page, /f517RenderBaselineStable|f517RenderBaselineByOptions|renderF517Baseline/);
  assert.doesNotMatch(page, /workflow_code|workflow_version/);
});

test('F5-17 blocks and releases module creation according to the baseline, while legacy remains informative', () => {
  assert.match(page, /Revise as orientações técnicas antes de criar o primeiro módulo\./);
  assert.match(page, /Orientações técnicas aprovadas/);
  assert.match(page, /projeto legado: a Technology Baseline não é necessária/);
  assert.match(page, /create\.disabled=true/);
  assert.match(page, /TECHNOLOGY_BASELINE_APPROVED/);
  assert.match(page, /source_path:/);
  assert.match(page, /confiança\/incerteza:/);
  assert.doesNotMatch(page, /TYPESCRIPT|NODEJS|POSTGRESQL/);
});
