import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Discover tests from the source tree so stale ignored files in dist cannot be
// executed after a branch switch. Each source test is compiled by `npm run build`.
const files = readdirSync('src')
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => file.replace(/\.ts$/, '.js'))
  .sort();
// Forward Node's test filters (for example `npm test -- --test-name-pattern=F5-24`)
// so a focused acceptance run does not start unrelated E2E fixtures.
const testArgs = process.argv.slice(2);
for (const file of files) execFileSync(process.execPath, ['--env-file-if-exists=.env', '--test', '--test-concurrency=1', ...testArgs, join('dist', file)], { stdio: 'inherit' });
