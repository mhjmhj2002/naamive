import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/agent.ts', import.meta.url), 'utf8');

test('F5-23 sends a valid typed, closed module-plan schema to Codex', () => {
  assert.match(source, /schema_version:\{type:'string',const:'module-plan\/v1'\}/);
  assert.match(source, /work_items:\{type:'array',items:workItem\}/);
  assert.match(source, /qa_matrix:\{type:'array',items:qa\}/);
  assert.match(source, /additionalProperties:false/);
});
