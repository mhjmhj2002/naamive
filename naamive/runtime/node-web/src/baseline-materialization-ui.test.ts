import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('F5-14 UI blocks v3 materialization before baseline approval and exposes only approved choices', () => {
  assert.match(page, /technology-baseline\/materialization-options/);
  assert.match(page, /options\.baseline_required&&!approved\.length/);
  assert.match(page, /Technology Baseline precisa ser aprovada antes da materialização/);
  assert.match(page, /approved\.length>1/);
  assert.match(page, /technology_baseline_revision_id:select\.value/);
  assert.match(page, /module_key:key\.value\.trim/);
});

test('F5-14 UI preserves materialization for legacy projects', () => {
  assert.match(page, /if\(options\.baseline_required&&!approved\.length\)/);
  assert.match(page, /section\.append\(form\);box\.append\(section\)/);
});
