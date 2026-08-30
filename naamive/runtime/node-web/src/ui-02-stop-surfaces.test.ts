import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('UI-02 keeps stop surfaces in the canonical projection and binds controls by descriptor id', async () => {
  const source = await readFile(new URL('src/state-action-projection.ts', root), 'utf8');
  const page = await readFile(new URL('web/index.html', root), 'utf8');
  assert.match(source, /STOP_SURFACE_PROJECTION:v1/);
  assert.match(source, /stop_surfaces: StopSurfaceProjection\[\]/);
  assert.match(source, /descriptor_id: string/);
  assert.match(source, /UNMAPPED_STOP_SURFACE/);
  assert.match(source, /LEGACY_READ_ONLY/);
  assert.match(source, /TECHNICAL_OPERATION/);
  assert.match(source, /RECONCILE BEFORE RETRY/);
  assert.match(source, /AUTHORIZE_REWORK would/);
  assert.match(page, /function renderStopSurfaces\(projection\)/);
  assert.match(page, /descriptors\.get\(surface\.action_descriptor_id\)/);
  assert.match(page, /\['HUMAN_DECISION', 'HUMAN_OPERATION', 'LEGACY'\]/);
  assert.doesNotMatch(page, /innerHTML/);
  assert.doesNotMatch(page, /property === 'version'/);
  assert.doesNotMatch(page, /property === 'expected_pause_version'/);
});
