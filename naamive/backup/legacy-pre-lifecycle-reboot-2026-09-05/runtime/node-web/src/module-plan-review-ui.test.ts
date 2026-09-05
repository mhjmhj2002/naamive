import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
test('F5-24 review UI is retired in favour of the single canonical state-action projection',()=>{
  assert.doesNotMatch(page,/f524Controller|f524Refresh=|f524Render=/);
  assert.doesNotMatch(page,/module_plan_review/);
  assert.doesNotMatch(page,/\?phase3=true/);
  assert.match(page,/function renderProjection\(projection\)/);
  assert.match(page,/function renderStopSurfaces\(projection\)/);
  assert.match(page,/function renderActions\(projection\)/);
  assert.match(page,/stream\.onmessage = invalidate/);
  assert.doesNotMatch(page,/innerHTML/);
});
