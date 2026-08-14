import assert from 'node:assert/strict';
import test from 'node:test';

// The module-planning module pulls in db/config/service at import time, so the
// configuration surface must be present. These are pure unit tests and never
// open a real connection (the pg Pool is lazy).
process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.module-planning-artifacts`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'module-planning-tester';

const {
  MODULE_PLAN_SCHEMA_VERSION,
  MODULE_PLAN_QA_MATRIX_VERSION,
  MODULE_PLAN_QA_MATRIX,
  MODULE_PLAN_SANITIZER_VERSION,
  qaMatrixForPrompt,
  capabilities,
  moduleCriteria,
  buildPlanContext,
  validatePlan,
  controlledPlanFixture,
  canonicalHash,
  sanitizePlan,
  sanitizePlanEvidence,
  revalidatePlanApproval,
  resolvePlanOrigin,
  eligiblePlanOrigin
} = await import('./module-planning.js');

/** A single-capability work item that satisfies every semantic rule. */
const persistenceItem = () => ({
  work_item_id: 'wi-persistence',
  title: 'Persist requests',
  objective: 'Persist requests durably',
  inputs: ['approved module definition'],
  output: 'A persisted, verifiable record of requests',
  acceptance_criteria: ['Criterion c-1 is demonstrably satisfied'],
  allowlist: ['src/persistence'],
  denylist: ['.env'],
  depends_on_ids: [],
  criterion_ids: ['c-1'],
  qa_matrix: [{ command: 'npm run test:integration:db', cwd: 'test', timeout_seconds: 180, environment: 'isolated-postgres', criterion_ids: ['c-1'], kind: 'database integration' }],
  risks: ['Validate integration'],
  capabilities: ['persistence']
});

const basePlan = (workItems: any[], coverage: any[] = [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }], bd: any[] = []) => ({
  schema_version: MODULE_PLAN_SCHEMA_VERSION,
  work_items: workItems,
  criterion_coverage: coverage,
  business_dependency_coverage: bd,
  risks: ['Controlled deterministic test fixture'],
  gaps: []
});

const baseContext = (criteria = [{ criterion_id: 'c-1', text: 'Requests are traceable' }], deps: any[] = []) => ({
  module_definition: { acceptance_criteria: criteria, business_dependencies: deps }
});

test('moduleCriteria treats the persisted module_revisions.criteria array as authoritative (F5-23 versioned IDs)', () => {
  const persisted = [{ criterion_id: 'crit-abc', text: 'Persisted stable id' }];
  const revision = { payload: { acceptance_criteria: ['A', 'B'] }, criteria: persisted };
  assert.deepEqual(moduleCriteria(revision), persisted);
  // Legacy revisions without the column fall back to deterministic positional ids.
  assert.deepEqual(moduleCriteria({ payload: { acceptance_criteria: ['A', 'B'] }, criteria: null }), [
    { criterion_id: 'criterion-1', text: 'A' },
    { criterion_id: 'criterion-2', text: 'B' }
  ]);
});

test('buildPlanContext returns a versioned, hashed, sanitized snapshot (F5-23)', () => {
  const revision = { payload: { module_key: 'requests', objective: 'Track requests\n\x00control', scope: ['request'], out_of_scope: [], dependencies: ['Identity provider'], acceptance_criteria: ['A request can be tracked'], secret_token: 'should-not-leak', file_contents: 'raw' }, criteria: [{ criterion_id: 'c-1', text: 'A request can be tracked' }] };
  const context = buildPlanContext(revision, { alternatives: ['single workflow'] }, { id: 'baseline-1', payload: { technology: ['node'] } }, null);
  assert.equal(context.context_schema_version, 'module-plan-context/v1');
  assert.equal(context.sanitizer_version, 'module-plan-sanitizer/v1');
  assert.equal(context.qa_matrix_version, MODULE_PLAN_QA_MATRIX_VERSION);
  assert.ok(typeof context.context_hash === 'string' && context.context_hash.length === 64);
  // Sanitizer removes control characters and truncates; only labelled reference
  // data crosses the boundary, so secrets and raw file content never appear.
  assert.ok(!context.module_definition.objective.includes('\x00'));
  assert.ok(!('secret_token' in context.module_definition));
  assert.ok(!('file_contents' in context.module_definition));
  assert.equal(context.module_definition.business_dependencies[0].dependency_id, 'dependency-1');
  // Same input yields the same deterministic hash.
  assert.equal(context.context_hash, buildPlanContext(revision, { alternatives: ['single workflow'] }, { id: 'baseline-1', payload: { technology: ['node'] } }, null).context_hash);
  // The hash covers the sanitized payload, so tampering changes it.
  const tampered = buildPlanContext({ ...revision, payload: { ...revision.payload, objective: 'Track requests differently' } }, { alternatives: ['single workflow'] }, { id: 'baseline-1', payload: { technology: ['node'] } }, null);
  assert.notEqual(tampered.context_hash, context.context_hash);
});

test('validatePlan rejects unknown/extra schema fields (closed schema)', () => {
  const plan: any = basePlan([persistenceItem()]);
  plan.bogus = true;
  assert.throws(() => validatePlan(plan, baseContext()), /SCHEMA_CLOSED/);
});

test('validatePlan enforces full criterion coverage', () => {
  const item = persistenceItem();
  const context = baseContext([{ criterion_id: 'c-1', text: 'one' }, { criterion_id: 'c-2', text: 'two' }]);
  // c-2 is never covered nor referenced.
  assert.throws(() => validatePlan(basePlan([item]), context), /CRITERION_COVERAGE_MISSING/);
  // Unknown criterion id in a work item is rejected.
  const unknown = basePlan([{ ...item, criterion_ids: ['c-1', 'c-9'] }]);
  assert.throws(() => validatePlan(unknown, context), /CRITERION_UNKNOWN/);
  // Coverage entry referencing an unknown work item id is rejected.
  const divergent = basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-nope'] }]);
  assert.throws(() => validatePlan(divergent, baseContext()), /CRITERION_COVERAGE_INVALID/);
});

test('validatePlan enforces business dependency classification matrix', () => {
  const item = persistenceItem();
  const deps = [{ dependency_id: 'dependency-1', description: 'Identity provider' }];
  const context = baseContext([{ criterion_id: 'c-1', text: 'one' }], deps);
  const valid = basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }],
    [{ dependency_id: 'dependency-1', classification: 'EXTERNAL_BLOCKER', work_item_ids: [], blocked_work_item_ids: ['wi-persistence'], justification: 'Needs external SLA' }]);
  assert.equal(validatePlan(valid, context), valid);
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }],
    [{ dependency_id: 'dependency-1', classification: 'COVERED_BY_WORK_ITEMS', work_item_ids: [], blocked_work_item_ids: [], justification: 'bad' }]), context), /BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID/);
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }],
    [{ dependency_id: 'dependency-1', classification: 'NOT_APPLICABLE', work_item_ids: ['wi-persistence'], blocked_work_item_ids: [], justification: 'bad' }]), context), /BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID/);
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }],
    [{ dependency_id: 'dependency-1', classification: 'EXTERNAL_BLOCKER', work_item_ids: ['wi-persistence'], blocked_work_item_ids: [], justification: 'bad' }]), context), /BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID/);
  // A module dependency not present in coverage is missing.
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }], []), context), /BUSINESS_DEPENDENCY_MISSING/);
});

test('validatePlan enforces the versioned QA matrix per capability', () => {
  const item = persistenceItem();
  // persistence demands a database-integration QA kind; a plain unit kind fails closed.
  const wrongQa = basePlan([{ ...item, qa_matrix: [{ command: 'npm test', cwd: 'test', timeout_seconds: 60, environment: 'isolated', criterion_ids: ['c-1'], kind: 'unit' }] }]);
  assert.throws(() => validatePlan(wrongQa, baseContext()), /QA_PERSISTENCE_REQUIRED/);
  // api capability requires http integration or e2e.
  const api = { ...persistenceItem(), work_item_id: 'wi-api', title: 'Expose REST endpoint', objective: 'Expose REST API', output: 'A REST endpoint', allowlist: ['src/api'], capabilities: ['api'], qa_matrix: [{ command: 'npm run test:http:integration', cwd: 'test', timeout_seconds: 120, environment: 'isolated', criterion_ids: ['c-1'], kind: 'unit' }] };
  const plan = basePlan([api], [{ criterion_id: 'c-1', work_item_ids: ['wi-api'] }]);
  assert.throws(() => validatePlan(plan, baseContext()), /QA_API_REQUIRED/);
  // Critical flows must exercise e2e.
  const critical = { ...persistenceItem(), work_item_id: 'wi-critical', title: 'Critical order flow', objective: 'Critical order flow', output: 'A critical flow', allowlist: ['src/critical'], capabilities: [], qa_matrix: [{ command: 'npm test', cwd: 'test', timeout_seconds: 60, environment: 'isolated', criterion_ids: ['c-1'], kind: 'unit' }] };
  assert.throws(() => validatePlan(basePlan([critical], [{ criterion_id: 'c-1', work_item_ids: ['wi-critical'] }]), baseContext()), /QA_CRITICAL_E2E_REQUIRED/);
  // Isolated domain rule requires a unit kind.
  const rule = { ...persistenceItem(), work_item_id: 'wi-rule', title: 'Rule for calculation', objective: 'Rule for calculation', output: 'A rule', allowlist: ['src/rule'], capabilities: [], qa_matrix: [{ command: 'npm test', cwd: 'test', timeout_seconds: 60, environment: 'isolated', criterion_ids: ['c-1'], kind: 'e2e' }] };
  assert.throws(() => validatePlan(basePlan([rule], [{ criterion_id: 'c-1', work_item_ids: ['wi-rule'] }]), baseContext()), /QA_UNIT_REQUIRED/);
});

test('validatePlan rejects broad allowlist roots and non-verifiable outputs', () => {
  const item = persistenceItem();
  assert.throws(() => validatePlan(basePlan([{ ...item, allowlist: ['src'] }]), baseContext()), /WORK_ITEM_POLICY_INVALID/);
  assert.throws(() => validatePlan(basePlan([{ ...item, allowlist: ['.'] }]), baseContext()), /WORK_ITEM_POLICY_INVALID/);
  assert.throws(() => validatePlan(basePlan([{ ...item, output: 'Módulo implementado' }]), baseContext()), /WORK_ITEM_NOT_VERIFIABLE/);
  // An allowlist exception without justification and risk is invalid.
  assert.throws(() => validatePlan(basePlan([{ ...item, allowlist_exception: { justification: '' } }]), baseContext()), /ALLOWLIST_EXCEPTION_INVALID/);
});

test('validatePlan detects dependency cycles and enforces cohesion for multi-capability work items', () => {
  const a = { ...persistenceItem(), work_item_id: 'wi-a', depends_on_ids: ['wi-b'] };
  const b = { ...persistenceItem(), work_item_id: 'wi-b', depends_on_ids: ['wi-a'] };
  const plan = { ...basePlan([a, b], [{ criterion_id: 'c-1', work_item_ids: ['wi-a', 'wi-b'] }]), work_items: [a, b] };
  assert.throws(() => validatePlan(plan, baseContext()), /DEPENDENCY_CYCLE/);
  // A single work item mixing two independent capabilities is rejected.
  const mixed = { ...persistenceItem(), work_item_id: 'wi-mixed', title: 'Persist and expose via REST API', objective: 'Persist and expose via REST API', output: 'A persisted REST endpoint', allowlist: ['src/mixed'], capabilities: ['persistence', 'api'], qa_matrix: [{ command: 'npm run test:integration:db', cwd: 'test', timeout_seconds: 180, environment: 'isolated-postgres', criterion_ids: ['c-1'], kind: 'database integration' }] };
  assert.throws(() => validatePlan(basePlan([mixed], [{ criterion_id: 'c-1', work_item_ids: ['wi-mixed'] }]), baseContext()), /SINGLE_ITEM_MULTI_CAPABILITY/);
  // A multi-item plan with an explicitly-justified multi-capability work item is accepted
  // only when its QA matrix also satisfies every declared capability (api → http/e2e).
  const justified = { ...mixed, work_item_id: 'wi-justified', title: 'Persist and expose via REST API', objective: 'Persist and expose via REST API', output: 'A persisted REST endpoint', allowlist: ['src/justified'], cohesion_justification: 'Request storage and retrieval are one cohesive boundary', qa_matrix: [
    { command: 'npm run test:integration:db', cwd: 'test', timeout_seconds: 180, environment: 'isolated-postgres', criterion_ids: ['c-1'], kind: 'database integration' },
    { command: 'npm run test:http:integration', cwd: 'test', timeout_seconds: 120, environment: 'isolated', criterion_ids: ['c-1'], kind: 'http integration' }
  ] };
  const multi = [justified, { ...persistenceItem(), work_item_id: 'wi-other', criterion_ids: ['c-1'], allowlist: ['src/other'], objective: 'Persist requests', title: 'Persist requests' }];
  const multiPlan = { ...basePlan(multi, [{ criterion_id: 'c-1', work_item_ids: ['wi-justified', 'wi-other'] }]), work_items: multi };
  assert.equal(validatePlan(multiPlan, baseContext()), multiPlan);
});

test('controlledPlanFixture performs deterministic capability-based decomposition (F5-23)', () => {
  const context = buildPlanContext({ payload: { module_key: 'requests', objective: 'Persist requests and expose a REST API', scope: ['request'], out_of_scope: [], dependencies: [], acceptance_criteria: ['A request can be tracked'] }, criteria: [{ criterion_id: 'c-1', text: 'A request can be tracked' }] }, {}, {}, null);
  const first = controlledPlanFixture(context);
  const second = controlledPlanFixture(context);
  assert.deepEqual(first, second);
  assert.equal(first.schema_version, MODULE_PLAN_SCHEMA_VERSION);
  assert.ok(first.work_items.length >= 2, 'capability-based decomposition splits persistence + api');
  const caps = first.work_items.map((w: any) => w.capabilities[0]);
  assert.ok(caps.includes('persistence') && caps.includes('api'));
  // The deterministic fixture must itself pass the closed semantic validator.
  assert.equal(validatePlan(first, context), first);
});

test('MODULE_PLAN_QA_MATRIX_VERSION is declarative with per-capability command/cwd/timeout/env (F5-23)', () => {
  assert.equal(MODULE_PLAN_QA_MATRIX_VERSION, 'module-plan-qa/v1');
  const persistence = MODULE_PLAN_QA_MATRIX['persistence'];
  assert.equal(persistence.command, 'npm run test:integration:db');
  assert.equal(persistence.cwd, 'test');
  assert.equal(persistence.timeout_seconds, 180);
  assert.equal(persistence.environment, 'isolated-postgres');
  assert.ok(persistence.required_kinds.includes('database integration'));
  const prompt = JSON.parse(qaMatrixForPrompt());
  assert.equal(prompt.version, MODULE_PLAN_QA_MATRIX_VERSION);
  assert.ok(prompt.capabilities.some((c: any) => c.capability === 'api' && c.required_kinds.includes('e2e')));
});

test('canonicalHash is stable across object key ordering (survives jsonb round-trip)', () => {
  const a = { work_items: [{ work_item_id: 'wi-1', title: 'x' }], criterion_coverage: [] };
  const b = { criterion_coverage: [], work_items: [{ title: 'x', work_item_id: 'wi-1' }] };
  assert.equal(canonicalHash(a), canonicalHash(b));
});

test('capabilities derivation is versioned and deterministic', () => {
  assert.deepEqual(capabilities('persist data with a REST endpoint and a first-response metric'), ['persistence', 'api', 'metric']);
  assert.deepEqual(capabilities('plain descriptive text'), []);
});

// ---- F5-23 audit pendencies 8, 9, 14 ----

test('sanitizePlan strips control chars, truncates and caps lists on the agent response (pendency 9)', () => {
  const dirty = {
    schema_version: MODULE_PLAN_SCHEMA_VERSION,
    work_items: [{ work_item_id: 'wi-1', title: 'Tit\x00le\x1f', objective: 'x'.repeat(5000), output: 'ok', inputs: ['a', 'b'], acceptance_criteria: ['c'], allowlist: ['src/a'], denylist: ['.env'], depends_on_ids: [], criterion_ids: ['c-1'], qa_matrix: [{ command: 'npm test', cwd: 'test', timeout_seconds: 60, environment: 'isolated', criterion_ids: ['c-1'], kind: 'unit' }], risks: ['r'], capabilities: ['persistence'] }],
    criterion_coverage: [{ criterion_id: 'c-1', work_item_ids: ['wi-1'] }],
    business_dependency_coverage: [],
    risks: ['risk\x07'],
    gaps: []
  };
  const clean = sanitizePlan(dirty);
  assert.ok(!clean.work_items[0].title.includes('\x00'));
  assert.ok(!clean.work_items[0].title.includes('\x1f'));
  assert.equal(clean.work_items[0].objective.length, 2000);
  assert.equal(clean.risks[0], 'risk');
  // Rejects non-object / wrong schema_version closed.
  assert.throws(() => sanitizePlan([]), /MODULE_PLAN_INVALID_RESPONSE/);
  assert.throws(() => sanitizePlan({ schema_version: 'module-plan/v2', work_items: [] }), /MODULE_PLAN_INVALID_RESPONSE/);
});

test('sanitizePlanEvidence never persists untrusted text unprocessed (pendency 9)', () => {
  const out = sanitizePlanEvidence({ module_id: 'm-1', code: 'SCHEMA_CLOSED\x00', control: '\x07secret', list: ['a\x1f', 'b', 'c', 'd', 'e'] });
  assert.ok(!out.code.includes('\x00'));
  assert.ok(!out.control.includes('\x07'));
  assert.ok(out.list.length <= 100);
});

test('validatePlan rejects extra nested fields, wrong types and exceeded limits at every level (pendency 14)', () => {
  const item = persistenceItem();
  // Extra field deep inside a work item.
  assert.throws(() => validatePlan(basePlan([{ ...item, bogus: 1 }]), baseContext()), /WORK_ITEM_FIELDS_CLOSED/);
  // Extra field inside a QA entry.
  assert.throws(() => validatePlan(basePlan([{ ...item, qa_matrix: [{ ...item.qa_matrix[0], bogus: 1 }] }]), baseContext()), /QA_INVALID/);
  // Wrong type for risks.
  assert.throws(() => validatePlan({ ...basePlan([item]), risks: [1] }, baseContext()), /RISKS_INVALID/);
  // Wrong type for gaps.
  assert.throws(() => validatePlan({ ...basePlan([item]), gaps: [{}] }, baseContext()), /GAPS_INVALID/);
  // Non-object work item.
  assert.throws(() => validatePlan(basePlan(['not-an-object']), baseContext()), /WORK_ITEM_TYPE_INVALID/);
  // Exceeded limits on lists.
  const tooMany = { ...item, inputs: Array.from({ length: 50 }, (_, i) => `in-${i}`) };
  assert.throws(() => validatePlan(basePlan([tooMany]), baseContext()), /WORK_ITEM_INPUTS_INVALID/);
  // QA entry with non-integer timeout.
  assert.throws(() => validatePlan(basePlan([{ ...item, qa_matrix: [{ ...item.qa_matrix[0], timeout_seconds: 1.5 }] }]), baseContext()), /QA_INVALID/);
  // Business dependency coverage with extra field.
  const deps = [{ dependency_id: 'dependency-1', description: 'Identity' }];
  const ctx = baseContext([{ criterion_id: 'c-1', text: 'one' }], deps);
  const bd = [{ dependency_id: 'dependency-1', classification: 'NOT_APPLICABLE', work_item_ids: [], blocked_work_item_ids: [], justification: 'none', extra: true }];
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'] }], bd), ctx), /BUSINESS_DEPENDENCY_INVALID/);
  // Criterion coverage with extra field.
  assert.throws(() => validatePlan(basePlan([item], [{ criterion_id: 'c-1', work_item_ids: ['wi-persistence'], extra: true }]), baseContext()), /CRITERION_COVERAGE_INVALID/);
});

test('revalidatePlanApproval confirms schema/payload/context/validation hashes and validator_version against the persisted snapshot (pendency 8)', () => {
  const plan = basePlan([persistenceItem()]);
  const context = buildPlanContext({ payload: { module_key: 'requests', objective: 'Persist requests', scope: ['request'], out_of_scope: [], dependencies: [], acceptance_criteria: ['A request can be tracked'] }, criteria: [{ criterion_id: 'c-1', text: 'A request can be tracked' }] }, {}, {}, null);
  const payload = { ...plan, context_schema_version: context.context_schema_version, context_hash: context.context_hash, validator_version: 'module-plan-validator/v1', validation_hash: canonicalHash({ plan, context_hash: context.context_hash, validator: 'module-plan-validator/v1' }) };
  const revision = { payload, payload_hash: canonicalHash(payload), context_schema_version: context.context_schema_version, context_hash: context.context_hash, validator_version: 'module-plan-validator/v1', validation_hash: payload.validation_hash, context_payload: context };
  // A fully consistent revision passes.
  revalidatePlanApproval(revision);
  // Tampered payload fails on payload hash.
  assert.throws(() => revalidatePlanApproval({ ...revision, payload: { ...payload, work_items: [{ ...payload.work_items[0], title: 'Tampered' }] } }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:PAYLOAD_HASH_MISMATCH/);
  // Divergent context hash fails.
  assert.throws(() => revalidatePlanApproval({ ...revision, context_hash: 'deadbeef'.repeat(8) }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:CONTEXT_HASH_MISMATCH/);
  // Divergent validator version fails.
  assert.throws(() => revalidatePlanApproval({ ...revision, validator_version: 'module-plan-validator/v2' }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:VALIDATOR_VERSION_MISMATCH/);
  // Missing persisted snapshot fails closed.
  assert.throws(() => revalidatePlanApproval({ ...revision, context_payload: null }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:CONTEXT_SNAPSHOT_MISSING/);
});

const planApprovalRevision = () => {
  const plan = basePlan([persistenceItem()]);
  const context = buildPlanContext({ payload: { module_key: 'requests', objective: 'Persist requests', scope: ['request'], out_of_scope: [], dependencies: [], acceptance_criteria: ['A request can be tracked'] }, criteria: [{ criterion_id: 'c-1', text: 'A request can be tracked' }] }, {}, {}, null);
  const payload = { ...plan, context_schema_version: context.context_schema_version, context_hash: context.context_hash, validator_version: 'module-plan-validator/v1', validation_hash: canonicalHash({ plan, context_hash: context.context_hash, validator: 'module-plan-validator/v1' }) };
  const revision = { payload, payload_hash: canonicalHash(payload), context_schema_version: context.context_schema_version, context_hash: context.context_hash, validator_version: 'module-plan-validator/v1', validation_hash: payload.validation_hash, context_payload: context };
  return { revision, context };
};

test('revalidatePlanApproval accepts a consistent revision whose snapshot recomputes to the registered context_hash (pendency 15)', () => {
  const { revision } = planApprovalRevision();
  // A valid revision/snapshot still passes: the recomputed canonical hash (excluding context_hash)
  // matches both the registered p.context_hash and the nested snapshot.context_hash.
  assert.doesNotThrow(() => revalidatePlanApproval(revision));
});

test('revalidatePlanApproval rejects joint tampering of snapshot content AND its recomputed nested context_hash (pendency 15)', () => {
  const { revision } = planApprovalRevision();
  // Attacker modifies snapshot CONTENT (architecture + feedback) and updates the nested
  // context_hash to the recomputed hash of the tampered content. Because the registered
  // p.context_hash is untouched and immutable, it no longer matches the recomputed hash.
  const tampered: Record<string, any> = { ...revision.context_payload };
  delete tampered.context_hash;
  tampered.approved_architecture = { ...tampered.approved_architecture, alternatives: ['Tampered architecture'] };
  tampered.previous_round = { ...tampered.previous_round, feedback: 'Tampered feedback' };
  tampered.context_hash = canonicalHash(tampered);
  assert.throws(() => revalidatePlanApproval({ ...revision, context_payload: tampered }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:CONTEXT_HASH_MISMATCH/);
});

test('revalidatePlanApproval rejects tampering of ONLY the nested snapshot.context_hash field (pendency 15)', () => {
  const { revision } = planApprovalRevision();
  // The registered p.context_hash is untouched, but the nested snapshot.context_hash is altered.
  // The recomputed hash of the (unchanged) snapshot content no longer matches the nested field.
  assert.throws(() => revalidatePlanApproval({ ...revision, context_payload: { ...revision.context_payload, context_hash: 'deadbeef'.repeat(8) } }), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED:CONTEXT_HASH_MISMATCH/);
});

// ---- F5-23 pendency 23: chained retry with correct lineage ----

/** In-memory query stub for the pure origin helpers (no real connection needed). */
const stubQuery = (rows: any[] | (() => any)) => async () => (typeof rows === 'function' ? rows() : { rows });

test('resolvePlanOrigin walks the retry_of_operation_id chain back to the FIRST planning operation (pendency 23)', async () => {
  const revisionId = 'rev-first', baselineId = 'baseline-first';
  const opById: Record<string, any> = {
    'op-first': { id: 'op-first', project_id: 'p1', kind: 'PLAN_MODULE_WORK_ITEMS', status: 'FAILED', module_revision_id: revisionId, retry_of_operation_id: null, origin_operation_id: null },
    'op-retry-1': { id: 'op-retry-1', project_id: 'p1', kind: 'RETRY_MODULE_PLAN', status: 'FAILED', module_revision_id: 'rev-broken', retry_of_operation_id: 'op-first', origin_operation_id: null },
    'op-retry-2': { id: 'op-retry-2', project_id: 'p1', kind: 'RETRY_MODULE_PLAN', status: 'FAILED', module_revision_id: 'rev-broken', retry_of_operation_id: 'op-retry-1', origin_operation_id: null }
  };
  const snapById: Record<string, any> = {
    'op-first': { module_revision_id: revisionId, technology_baseline_revision_id: baselineId, context_hash: 'hash-first' }
  };
  const callCount = { first: 0, second: 0 };
  const c: any = {
    // Query 1: walk chain (SELECT ops). Query 2: SELECT module_plan_job_context.
    // Query 3: SELECT jobs technology_baseline_revision_id.
    query: async (sql: string, params: any[] = []) => {
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('module_plan_job_context')) return { rows: snapById[params[0]] ? [snapById[params[0]]] : [] };
      if (sqlLower.includes('select technology_baseline_revision_id from jobs')) return { rows: [{ technology_baseline_revision_id: baselineId }] };
      const target = params[0];
      return { rows: opById[target] ? [opById[target]] : [] };
    }
  };
  // Retrying the SECOND failed retry must resolve back to the FIRST planning operation.
  const origin = await resolvePlanOrigin(c, 'm1', opById['op-retry-2']);
  assert.ok(origin, 'origin resolved');
  const resolved = origin as NonNullable<typeof origin>;
  assert.equal(resolved.originOperationId, 'op-first');
  assert.equal(origin.sourceRevisionId, revisionId);
  assert.equal(origin.sourceBaselineId, baselineId);
  assert.equal(origin.snapshot.context_hash, 'hash-first');
  // The retry operation's own corrupt revision is never used.
  assert.notEqual(origin.sourceRevisionId, 'rev-broken');
});

test('resolvePlanOrigin honours a persisted origin_operation_id and reuses the root snapshot (pendency 23)', async () => {
  const revisionId = 'rev-root', baselineId = 'baseline-root';
  const rootOp = { id: 'op-root', project_id: 'p1', kind: 'PLAN_MODULE_WORK_ITEMS', status: 'FAILED', module_revision_id: revisionId, retry_of_operation_id: null, origin_operation_id: null };
  const retry = { id: 'op-retry', project_id: 'p1', kind: 'RETRY_MODULE_PLAN', status: 'FAILED', module_revision_id: 'rev-broken', retry_of_operation_id: 'op-root', origin_operation_id: 'op-root' };
  const snapById: Record<string, any> = { 'op-root': { module_revision_id: revisionId, technology_baseline_revision_id: baselineId, context_hash: 'hash-root' } };
  const c: any = {
    query: async (sql: string, params: any[] = []) => {
      const sqlLower = sql.toLowerCase();
      if (sqlLower.includes('module_plan_job_context')) return { rows: snapById[params[0]] ? [snapById[params[0]]] : [] };
      if (sqlLower.includes('select technology_baseline_revision_id from jobs')) return { rows: [{ technology_baseline_revision_id: baselineId }] };
      return params[0] === 'op-root' ? { rows: [rootOp] } : { rows: [] };
    }
  };
  const origin = await resolvePlanOrigin(c, 'm1', retry);
  assert.ok(origin, 'origin resolved');
  const resolved = origin as NonNullable<typeof origin>;
  assert.equal(resolved.originOperationId, 'op-root');
  assert.equal(resolved.sourceRevisionId, revisionId);
  assert.equal(resolved.sourceBaselineId, baselineId);
  assert.equal(resolved.snapshot.context_hash, 'hash-root');
});

test('eligiblePlanOrigin accepts a failed RETRY_MODULE_PLAN and rejects ineligible/corrupt origins (pendency 23)', async () => {
  const ok = { id: 'op-1', project_id: 'p1', kind: 'RETRY_MODULE_PLAN', status: 'FAILED' };
  const initial = { id: 'op-2', project_id: 'p1', kind: 'PLAN_MODULE_WORK_ITEMS', status: 'FAILED' };
  const nonTerminal = { id: 'op-3', project_id: 'p1', kind: 'RETRY_MODULE_PLAN', status: 'SUCCEEDED' };
  const notPlanning = { id: 'op-4', project_id: 'p1', kind: 'REQUEST_PLAN_ADJUSTMENT', status: 'FAILED' };
  // A fully eligible origin: has a job, no prior retry, no active job, no open gate.
  const eligible: any = { query: async (sql: string) => {
    if (sql.includes('WHERE retry_of_operation_id')) return { rowCount: 0, rows: [] };
    if (sql.includes("status IN ('PENDING','RETRYABLE','LEASED')")) return { rowCount: 0, rows: [] };
    if (sql.includes('status=' + "'OPEN'")) return { rowCount: 0, rows: [] };
    if (sql.includes('WHERE operation_id=$1 AND module_id=$2')) return { rowCount: 1, rows: [] };
    return { rowCount: 1, rows: [] };
  } };
  assert.equal(await eligiblePlanOrigin(eligible, 'm1', ok), true);
  assert.equal(await eligiblePlanOrigin(eligible, 'm1', initial), true);
  assert.equal(await eligiblePlanOrigin(eligible, 'm1', nonTerminal), false);
  assert.equal(await eligiblePlanOrigin(eligible, 'm1', notPlanning), false);
  // An origin already retried is rejected (unique retry per source).
  const alreadyRetried: any = { query: async (sql: string) => {
    if (sql.includes('WHERE retry_of_operation_id')) return { rowCount: 1, rows: [] };
    if (sql.includes("status IN ('PENDING','RETRYABLE','LEASED')")) return { rowCount: 0, rows: [] };
    if (sql.includes('status=' + "'OPEN'")) return { rowCount: 0, rows: [] };
    return { rowCount: 1, rows: [] };
  } };
  assert.equal(await eligiblePlanOrigin(alreadyRetried, 'm1', ok), false);
  // An origin with a pending/active planning job is rejected.
  const activeJob: any = { query: async (sql: string) => {
    if (sql.includes("status IN ('PENDING','RETRYABLE','LEASED')")) return { rowCount: 1, rows: [] };
    return { rowCount: 0, rows: [] };
  } };
  assert.equal(await eligiblePlanOrigin(activeJob, 'm1', ok), false);
  // An origin with an open approval gate is rejected.
  const openGate: any = { query: async (sql: string) => {
    if (sql.includes('status=' + "'OPEN'")) return { rowCount: 1, rows: [] };
    return { rowCount: 0, rows: [] };
  } };
  assert.equal(await eligiblePlanOrigin(openGate, 'm1', ok), false);
  // Null / missing origin is rejected.
  assert.equal(await eligiblePlanOrigin(eligible, 'm1', null), false);
});
