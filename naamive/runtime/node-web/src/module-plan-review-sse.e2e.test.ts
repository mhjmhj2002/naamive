import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('F5-24 uses the canonical SSE invalidation boundary after the legacy review controller was retired', async () => {
  const page=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
  assert.match(page,/projectionState\.stream\?\.close\(\)/);
  assert.match(page,/stream\.onmessage = invalidate/);
  assert.match(page,/refreshPending = true/);
  assert.match(page,/if \(projectionState\.inFlight\)/);
  assert.match(page,/renderProjection\(projection\)/);
  assert.doesNotMatch(page,/\?phase3=true/);
  assert.doesNotMatch(page,/module_plan_review/);
});
