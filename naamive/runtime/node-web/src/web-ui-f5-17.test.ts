import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('F5-17 renders the baseline from published data and sends only catalog references', () => {
  assert.match(page, /\/api\/technology\/categories/);
  assert.match(page, /catalog-items\?category_id=/);
  assert.match(page, /\/api\/technology\/profiles\?status=ACTIVE/);
  assert.match(page, /selection_context_id:context\.id/);
  assert.match(page, /technology_catalog_revision_id:context\.technology_catalog_revision_id/);
  assert.match(page, /catalog_item_id:item\.catalog_item_id/);
  assert.doesNotMatch(page, /technology_name:/);
  assert.doesNotMatch(page, /ecosystem:/);
  assert.doesNotMatch(page, /technology_version:/);
});

test('F5-17 blocks and releases module creation according to the baseline, while legacy remains informative', () => {
  assert.match(page, /Revise as orientações técnicas antes de criar o primeiro módulo\./);
  assert.match(page, /Orientações técnicas aprovadas/);
  assert.match(page, /projeto legado: a Technology Baseline não é necessária/);
  assert.match(page, /blockedCreate\.disabled=true/);
  assert.match(page, /TECHNOLOGY_BASELINE_APPROVED/);
  assert.doesNotMatch(page, /TYPESCRIPT|NODEJS|POSTGRESQL/);
});
