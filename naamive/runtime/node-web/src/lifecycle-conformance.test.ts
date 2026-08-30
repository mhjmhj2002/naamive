import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import test from 'node:test';
import { classifyLifecycleConformanceFailure, LIFECYCLE_CONFORMANCE_CRITERIA, LIFECYCLE_CONFORMANCE_KNOWN_BASELINES, LIFECYCLE_CONFORMANCE_VERSION } from './lifecycle-conformance-manifest.js';

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
    const names = criterion.evidence.join(' ').toLowerCase();
    for (const proof of criterion.proofType) {
      const compatible = proof === 'STATIC' ||
        (proof === 'POSTGRES_E2E' && criterion.evidence.some(path => path.endsWith('.e2e.test.ts'))) ||
        (proof === 'GIT' && /git|automatic-assurance-integration|lifecycle-conformance-audit/.test(names)) ||
        (proof === 'HTTP' && /http/.test(names)) ||
        (proof === 'SSE' && /sse/.test(names)) ||
        (proof === 'BROWSER' && /ui|web-ui/.test(names));
      assert.ok(compatible, `criterion ${criterion.id} declares ${proof} without compatible evidence`);
    }
    if (criterion.requiresPostgres) assert.ok(criterion.proofType.includes('POSTGRES_E2E'), `criterion ${criterion.id} requires an executable PostgreSQL proof`);
  }
});

test('certification classifies only the seven exact authorized baselines', () => {
  assert.equal(LIFECYCLE_CONFORMANCE_KNOWN_BASELINES.length, 7);
  assert.equal(new Set(LIFECYCLE_CONFORMANCE_KNOWN_BASELINES.map(item => item.name)).size, 7);
  for (const baseline of LIFECYCLE_CONFORMANCE_KNOWN_BASELINES) assert.equal(classifyLifecycleConformanceFailure(baseline.name, baseline.fingerprint), 'KNOWN_BASELINE');
  assert.equal(classifyLifecycleConformanceFailure('unknown failure', 'same words'), 'REGRESSION_OR_UNCLASSIFIED');
  assert.equal(classifyLifecycleConformanceFailure(LIFECYCLE_CONFORMANCE_KNOWN_BASELINES[0].name, 'different fingerprint'), 'REGRESSION_OR_UNCLASSIFIED');
});

test('criterion 20 rejects documentary and workflow drift fail-closed', () => {
  const required = [
    'naamive/orchestration/LIFECYCLE_COMPASS.md',
    'naamive/orchestration/ORCHESTRATION_PROTOCOL.md',
    'naamive/governance/GATE_POLICY.md',
    'naamive/orchestration/demand-intake/node-web-orchestration-platform/16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md',
    'naamive/orchestration/audits/2026-08-22-lifecycle-conformance-audit.md',
    'naamive/runtime/node-web/migrations/048_phase_6_5_conformant_workflows.sql',
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
});
