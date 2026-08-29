import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../web/index.html', import.meta.url), 'utf8');

test('UI-01 renders materialization only from the canonical action descriptor', () => {
  assert.match(page, /renderProjection\(projection\)/);
  assert.match(page, /renderActions\(projection\)/);
  assert.match(page, /descriptor\.command\.href/);
  assert.match(page, /descriptor\.input\.schema\.properties/);
  assert.doesNotMatch(page, /technology-baseline\/materialization-options/);
  assert.doesNotMatch(page, /\?phase3=true/);
  assert.doesNotMatch(page, /baseline_required/);
});

test('UI-01 generic action renderer supports server-published enum choices without legacy baseline logic', () => {
  assert.match(page, /Array\.isArray\(schema\.enum\)/);
  assert.match(page, /element\('select', 'form-select form-select-sm'\)/);
  assert.match(page, /schema\.enum_labels\?\.\[value\] \|\| value/);
  assert.doesNotMatch(page, /renderProject\s*=/);
});
