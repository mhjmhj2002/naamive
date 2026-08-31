import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';
import { LIFECYCLE_CONFORMANCE_CRITERIA, LIFECYCLE_CONFORMANCE_VERSION } from './lifecycle-conformance-manifest.js';

const repositoryRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../..');
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), 'utf8');

test('TST-01 manifest is closed, complete, and evidence-bearing', () => {
  assert.equal(LIFECYCLE_CONFORMANCE_VERSION, 'LIFECYCLE_CONFORMANCE:v1');
  assert.equal(LIFECYCLE_CONFORMANCE_CRITERIA.length, 20, 'the certification matrix is exactly twenty criteria');
  const ids = LIFECYCLE_CONFORMANCE_CRITERIA.map(criterion => criterion.id);
  assert.deepEqual(ids, Array.from({ length: 20 }, (_, index) => index + 1), 'no criterion may be absent, unknown, or duplicated');
  for (const criterion of LIFECYCLE_CONFORMANCE_CRITERIA) {
    assert.ok(criterion.scenario.trim(), `criterion ${criterion.id} has a scenario`);
    assert.ok(criterion.layers.length, `criterion ${criterion.id} has a layer`);
    assert.ok(criterion.proofType.length, `criterion ${criterion.id} has a proof type`);
    assert.ok(criterion.evidence.length, `criterion ${criterion.id} has evidence`);
    assert.ok(criterion.negativeAssertions.length, `criterion ${criterion.id} has a negative assertion`);
    assert.ok(criterion.expectedEvidence.length, `criterion ${criterion.id} declares expected evidence`);
    for (const path of criterion.evidence) assert.ok(existsSync(resolve(repositoryRoot, path)), `criterion ${criterion.id} references an existing path: ${path}`);
  }
});

test('criterion 20 rejects documentary and workflow drift fail-closed', () => {
  const required = [
    'naamive/orchestration/LIFECYCLE_COMPASS.md',
    'naamive/orchestration/ORCHESTRATION_PROTOCOL.md',
    'naamive/governance/GATE_POLICY.md',
    'naamive/orchestration/demand-intake/node-web-orchestration-platform/16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md',
    'naamive/orchestration/audits/2026-08-22-lifecycle-conformance-audit.md',
    'naamive/runtime/node-web/migrations/048_phase_6_5_conformant_workflows.sql',
    'naamive/runtime/node-web/migrations/075_phase_6_5_tst01_integration_cohort_v2.sql',
  ];
  for (const path of required) assert.ok(existsSync(resolve(repositoryRoot, path)), `normative reference is required: ${path}`);
  const migration = read('naamive/runtime/node-web/migrations/048_phase_6_5_conformant_workflows.sql');
  for (const [code, version] of [['PROJECT_DISCOVERY', '4'], ['MODULE_DELIVERY', '2'], ['WORK_ITEM_DELIVERY', '2'], ['ORCHESTRATION_EXECUTION', '1']] as const) {
    assert.match(migration, new RegExp(`"code":"${code}","version":${version}`), `${code}:v${version} remains published`);
  }
  assert.doesNotMatch(migration, /"trigger":"AUTHORIZE_WORK_ITEM"/, 'v2 never publishes individual authorization');
  const compass = read('naamive/orchestration/LIFECYCLE_COMPASS.md');
  const protocol = read('naamive/orchestration/ORCHESTRATION_PROTOCOL.md');
  const policy = read('naamive/governance/GATE_POLICY.md');
  assert.match(compass, /EXECUTION_SUCCEEDED != WORK_ACCEPTED/);
  assert.match(protocol, /nunca implica automaticamente aceite/i);
  assert.match(policy, /não para converter cada etapa em uma fila de aprovação/i);
  const scheduler = read('naamive/runtime/node-web/src/eligibility-scheduler.ts');
  assert.match(scheduler, /workflow_version\)!==2/);
  assert.match(scheduler, /rows\.every\(\(row:any\)=>row\.state==='INTEGRATED'\)/);
  assert.match(scheduler, /reconcileWaitingDependencies/, 'integration and blocker facts re-evaluate waiting dependencies with the scheduler predicate');
  const aut02 = read('naamive/runtime/node-web/src/automatic-assurance-integration.ts');
  assert.match(aut02, /IntegrationCohort:v1/);
  assert.match(aut02, /candidate:\$\{pipelineKey\(pipeline\)\}:/, 'candidate identity is versioned from the explicitly selected pipeline');
  assert.match(aut02, /candidate-reassess:\$\{pipelineKey\(row\.pipeline_version\)\}:/, 'merge reassessment preserves the selected v1 or v2 lineage');
  assert.match(aut02, /integration_candidate_member_reservations/);
  const migration75 = read('naamive/runtime/node-web/migrations/075_phase_6_5_tst01_integration_cohort_v2.sql');
  assert.match(migration75, /integration_pipeline_version/);
  assert.match(migration75, /integration_candidate_member_active_reservation/);
  const tst = read('naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/TST-01-lifecycle-conformance-suite.md');
  const cohort = read('naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/AUT-02-v2-integration-cohort-prevalidation.md');
  assert.match(tst, /AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2/);
  assert.match(cohort, /ownership: TST-01/);
  assert.doesNotMatch(cohort, /task: AUT-02/);
});
