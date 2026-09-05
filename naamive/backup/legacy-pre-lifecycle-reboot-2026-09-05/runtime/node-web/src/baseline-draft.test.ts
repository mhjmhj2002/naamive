import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createTechnologyBaselineDraft } from './baseline-draft.js';

const id = () => randomUUID();
const projectId = id(), revisionId = id(), profileId = id(), contextId = id(), inventoryId = id(), jobId = id(), itemId = id(), categoryId = id();
const response = (rows: any[] = []) => ({ rows, rowCount: rows.length });
const client = (...responses: any[]) => { const result = { calls: [] as string[], query: async (sql: string) => { result.calls.push(sql); return responses.shift() ?? response(); } }; return result; };
let mock: any;
const validRows = [{ catalog_item_id: itemId, classification: 'REQUIRED', version_constraint: null, justification: 'Required by the approved profile.', display_order: 1, category_id: categoryId, is_active: true, category_active: true, metadata: { version_governance: 'UNMANAGED' } }];
const base = () => [response([{ id: projectId, workflow_code: 'PROJECT_DISCOVERY', workflow_version: 3, state: 'TECHNOLOGY_BASELINE_IN_REVIEW' }]), response([{ id: contextId, technology_catalog_revision_id: revisionId, technology_profile_id: profileId }]), response([{ id: revisionId }]), response([{ profile_id: profileId }]), response([{ id: jobId }]), response([{ id: inventoryId }])];
const happy = (rows = validRows, rules: any[] = []) => [...base(), response(rows), response([{ id: categoryId, code: 'CATEGORY', name: 'Category', selection_mode: 'SINGLE', min_selections: 0, max_selections: 1, is_active: true, display_order: 1 }]), response(rules), response(), response(), response(), response(), response()];
const run = async (responses: any[]) => { mock = client(...responses); return createTechnologyBaselineDraft(mock, projectId); };

test('creates and persists the profile-expanded baseline draft with its inventory snapshot and event', async () => {
  const result = await run(happy());
  assert.equal(result.technologyCatalogRevisionId, revisionId);
  assert.equal(mock.calls.filter((sql: string) => sql.startsWith('INSERT INTO technology_baseline')).length, 3);
  assert.ok(mock.calls.some((sql: string) => sql.includes('TECHNOLOGY_BASELINE_DRAFT_CREATED')));
});

for (const [name, responses, code] of [
  ['project outside v3 state', [response([{ id: projectId, workflow_code: 'PROJECT_DISCOVERY', workflow_version: 2, state: 'TECHNOLOGY_BASELINE_IN_REVIEW' }])], 'TECHNOLOGY_BASELINE_DRAFT_STATE_INVALID'],
  ['missing READY context', [...base().slice(0, 1), response()], 'TECHNOLOGY_BASELINE_DRAFT_SELECTION_CONTEXT_REQUIRED'],
  ['unpublished catalog', [...base().slice(0, 2), response()], 'TECHNOLOGY_BASELINE_DRAFT_PUBLISHED_CATALOG_REQUIRED'],
  ['invalid profile', [...base().slice(0, 3), response()], 'TECHNOLOGY_BASELINE_DRAFT_PROFILE_INVALID'],
  ['missing inventory job', [...base().slice(0, 4), response()], 'TECHNOLOGY_BASELINE_DRAFT_INVENTORY_REQUIRED'],
  ['inactive item', [...base(), response([{ ...validRows[0], is_active: false }])], 'TECHNOLOGY_BASELINE_DRAFT_PROFILE_ITEM_INVALID'],
  ['inactive category', [...base(), response([{ ...validRows[0], category_active: false }])], 'TECHNOLOGY_BASELINE_DRAFT_PROFILE_ITEM_INVALID'],
  ['required version missing', [...base(), response([{ ...validRows[0], metadata: { version_governance: 'REQUIRED' } }])], 'TECHNOLOGY_BASELINE_DRAFT_VERSION_CONSTRAINT_REQUIRED'],
  ['invalid cardinality', [...base(), response(validRows), response([{ id: categoryId, code: 'CATEGORY', name: 'Category', selection_mode: 'SINGLE', min_selections: 2, max_selections: 2, is_active: true, display_order: 1 }])], 'TECHNOLOGY_BASELINE_DRAFT_CARDINALITY_INVALID'],
  ['blocking compatibility', [...happy().slice(0, 8), response([{ id: id(), source_item_id: itemId, relationship_type: 'REQUIRES', target_item_id: id(), severity: 'ERROR', message: 'required', is_active: true }])], 'TECHNOLOGY_BASELINE_DRAFT_COMPATIBILITY_INVALID'],
  ['existing baseline', [...happy().slice(0, 9), response([{ id: id() }])], 'TECHNOLOGY_BASELINE_DRAFT_ALREADY_EXISTS']
] as const) test(`rejects ${name}`, async () => await assert.rejects(() => run([...responses]), new RegExp(code)));

test('creates a draft after a completed inventory with zero facts', async () => {
  const responses = happy();
  responses[5] = response();
  await assert.doesNotReject(() => run(responses));
});

test('does not treat a PROHIBITED profile item as present for compatibility', async () => {
  const prohibited = { ...validRows[0], catalog_item_id: id(), classification: 'PROHIBITED' };
  const conflict = { id: id(), source_item_id: prohibited.catalog_item_id, relationship_type: 'REQUIRES', target_item_id: id(), severity: 'ERROR', message: 'must not evaluate', is_active: true };
  await assert.doesNotReject(() => run(happy([prohibited], [conflict])));
});

test('creates the monotonic successor draft from the context predecessor', async () => {
  const predecessorId = id(), baselineId = id();
  const responses = happy();
  responses[1] = response([{ id: contextId, technology_catalog_revision_id: revisionId, technology_profile_id: profileId, supersedes_baseline_revision_id: predecessorId }]);
  responses[9] = response([{ id: baselineId }]);
  responses.splice(10, 0, response([{ id: predecessorId, baseline_id: baselineId, revision_number: 4, status: 'REJECTED', payload: { items: [] } }]));
  responses.splice(11, 0, response([{ revision_number: 6 }]));
  const result = await run(responses);
  assert.equal(result.baselineId, baselineId);
  assert.ok(mock.calls.some((sql: string) => sql.includes('supersedes_revision_id')));
  assert.ok(mock.calls.some((sql: string) => sql.includes('MAX(revision_number)')));
  assert.ok(mock.calls.filter((sql: string) => sql.startsWith('INSERT INTO events')).length >= 2);
});
