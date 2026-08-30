import { spawnSync } from 'node:child_process';
import { LIFECYCLE_CONFORMANCE_CRITERIA } from '../dist/lifecycle-conformance-manifest.js';

const run = file => spawnSync(process.execPath, ['--test', file], { stdio: 'inherit', env: process.env });
const staticResult = run('dist/lifecycle-conformance.test.js');
const databaseAvailable = Boolean(process.env.DATABASE_URL);
const scenarioResult = databaseAvailable ? run('dist/lifecycle-conformance-audit-scenario.e2e.test.js') : null;
const results = LIFECYCLE_CONFORMANCE_CRITERIA.map(criterion => ({
  criterion: criterion.id,
  outcome: criterion.id === 20
    ? (staticResult.status === 0 ? 'PASS' : 'REGRESSION_OR_UNCLASSIFIED')
    : 'MANUAL_OPERATOR_VALIDATION_REQUIRED',
}));
console.log(JSON.stringify({ contract: 'LIFECYCLE_CONFORMANCE:v1', results }, null, 2));
if (staticResult.status !== 0 || (databaseAvailable && scenarioResult?.status !== 0)) process.exitCode = 1;
else if (!databaseAvailable || results.some(result => result.outcome === 'MANUAL_OPERATOR_VALIDATION_REQUIRED')) process.exitCode = 2;
