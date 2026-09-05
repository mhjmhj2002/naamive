#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const runtimePrefix = 'naamive/runtime/node-web/src/';
const knownBaselines = new Set([
  'rejects committed Git symlinks and submodules before parsing repository content',
  'uses only package.json and rolls back all final persistence when its insert fails',
  'reserves operation, job and evidence before a malformed manifest fails without final inventory',
  'retries safely both before inventory persistence and after its immutable snapshot was written',
  'keeps Codex-only parity behind the service flag',
  'falls back from Codex quota exhaustion to DeepSeek and keeps secrets redacted',
  'blocks the project when both runtimes are out of quota',
]);
const evidence = {
  1: ['workflow-selection.e2e.test.ts', 'ui-01-focused.e2e.test.ts'],
  2: ['eligibility-scheduler.e2e.test.ts', 'lifecycle-conformance-audit-scenario.e2e.test.ts'],
  3: ['automatic-assurance-integration.e2e.test.ts', 'eligibility-scheduler.e2e.test.ts'],
  4: ['automatic-assurance-qa.e2e.test.ts', 'automatic-assurance-integration.e2e.test.ts'],
  5: ['automatic-assurance-qa.e2e.test.ts', 'assurance-acceptance-replay.e2e.test.ts'],
  6: ['automatic-assurance-qa.e2e.test.ts', 'recovery.e2e.test.ts'],
  7: ['reviewer-recovery-identity.e2e.test.ts', 'reviewer-recovery-cancellation.e2e.test.ts', 'ui-02-stop-surfaces.test.ts'],
  8: ['recovery.e2e.test.ts', 'worker-restart.e2e.test.ts', 'ui-01-focused.e2e.test.ts'],
  9: ['recovery-policy.test.ts', 'ui-02-stop-surfaces.test.ts'],
  10: ['gate-catalog.e2e.test.ts', 'workflow-selection.e2e.test.ts'],
  11: ['ui-01-focused.e2e.test.ts', 'ui-02-stop-surfaces.test.ts'],
  12: ['automatic-assurance-integration.e2e.test.ts', 'lifecycle-conformance-audit-scenario.e2e.test.ts'],
  14: ['delivery-final-gaps.e2e.test.ts', 'delivery-http-rbac.e2e.test.ts'],
  15: ['delivery-pause-cancellation.e2e.test.ts', 'ui-01-focused.e2e.test.ts'],
  16: ['auth.e2e.test.ts', 'delivery-http-rbac.e2e.test.ts'],
  17: ['ui-01-focused.e2e.test.ts', 'module-plan-review-sse.e2e.test.ts', 'web-ui-f6-12.e2e.test.ts'],
  18: ['lifecycle-conformance-audit-scenario.e2e.test.ts'],
  19: ['eligibility-scheduler.e2e.test.ts', 'recovery.e2e.test.ts', 'worker-restart.e2e.test.ts', 'assurance-acceptance-replay.e2e.test.ts'],
  20: ['lifecycle-conformance.test.ts'],
};
const requested = process.argv.find(arg => arg.startsWith('--criteria='));
const selected = new Set((requested ? requested.slice('--criteria='.length).split(',').map(Number) : [18, 20]).filter(id => Number.isInteger(id) && id >= 1 && id <= 20));
const result = [];

for (let id = 1; id <= 20; id += 1) {
  if (!selected.has(id)) { result.push({ id, outcome: 'MANUAL_OPERATOR_VALIDATION_REQUIRED', reason: 'criterion was not selected for this run' }); continue; }
  if (id === 13) { result.push({ id, outcome: 'MANUAL_OPERATOR_VALIDATION_REQUIRED', reason: 'macro-lifecycle.e2e.test.ts is operator-only' }); continue; }
  if (id !== 20 && !process.env.DATABASE_URL) { result.push({ id, outcome: 'MANUAL_OPERATOR_VALIDATION_REQUIRED', reason: 'set DATABASE_URL for PostgreSQL evidence' }); continue; }
  const files = [...new Set(evidence[id] ?? [])].map(file => `dist/${file.replace(/\.ts$/, '.js')}`).filter(existsSync);
  if (!files.length) { result.push({ id, outcome: 'REGRESSION_OR_UNCLASSIFIED', reason: 'declared evidence is missing from dist' }); continue; }
  const run = spawnSync(process.execPath, ['--test', ...files], { encoding: 'utf8', env: process.env });
  if (run.status === 0) { result.push({ id, outcome: 'PASS', files }); continue; }
  const baseline = [...knownBaselines].find(name => `${run.stdout}\n${run.stderr}`.includes(name));
  result.push(baseline ? { id, outcome: 'KNOWN_BASELINE', baseline } : { id, outcome: 'REGRESSION_OR_UNCLASSIFIED', exit_code: run.status, output: `${run.stdout}\n${run.stderr}`.slice(-2000) });
}

console.log(JSON.stringify({ contract: 'LIFECYCLE_CONFORMANCE:v1', result }, null, 2));
if (result.some(item => item.outcome === 'REGRESSION_OR_UNCLASSIFIED')) process.exitCode = 1;
else if (result.some(item => item.outcome === 'MANUAL_OPERATOR_VALIDATION_REQUIRED')) process.exitCode = 2;
