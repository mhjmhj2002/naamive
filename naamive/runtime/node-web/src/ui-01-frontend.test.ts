import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const web = new URL('../web/', import.meta.url);

test('UI-01 frontend has one projection owner, generic SSE invalidation, and deterministic refresh fencing', async () => {
  const index = await readFile(new URL('index.html', web), 'utf8');
  for (const obsolete of [/renderProject\s*=/, /const prior\s*=\s*renderProject/, /projectEventTypes/, /MutationObserver/, /\?phase3=true/]) {
    assert.doesNotMatch(index, obsolete);
  }
  for (const canonical of ['/projection', 'refreshProjection', 'renderProjection', 'stream.onmessage = invalidate', 'appendEvent(event.data)']) {
    assert.ok(index.includes(canonical), `canonical UI-01 path missing: ${canonical}`);
  }
  assert.ok(index.includes("import { canApplyProjection } from './projection-refresh.js'"));

  const { canApplyProjection } = await import(new URL('projection-refresh.js', web).href) as { canApplyProjection: (input: Record<string, unknown>) => boolean };
  const boundary = {
    selectedProject: 'project-a', selectionGeneration: 4, refreshGeneration: 8,
    lastAppliedRefreshGeneration: 7, lastProjectionSeq: 41
  };
  const allowed = (overrides: Record<string, unknown> = {}) => canApplyProjection({
    projection: { project_id: 'project-a', as_of_event_id: 41, ...(overrides.projection as object ?? {}) },
    requestSelectionGeneration: 4, requestRefreshGeneration: 8, ...boundary, ...overrides
  });

  assert.equal(allowed(), true, 'the current response applies');
  assert.equal(allowed({ requestRefreshGeneration: 7 }), false, 'A is ignored after B becomes authoritative even at the same factual cursor');
  assert.equal(allowed({ requestSelectionGeneration: 3 }), false, 'responses from a previous selection are ignored');
  assert.equal(allowed({ projection: { project_id: 'project-a', as_of_event_id: 40 } }), false, 'a lower event cursor is ignored');
  assert.equal(allowed({ projection: { project_id: 'project-b', as_of_event_id: 42 } }), false, 'a response for another project is ignored');
});
