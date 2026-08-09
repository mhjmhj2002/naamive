import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// Discover tests from the source tree so stale ignored files in dist cannot be
// executed after a branch switch. Each source test is compiled by `npm run build`.
const files = readdirSync('src')
  .filter((file) => file.endsWith('.test.ts'))
  .map((file) => file.replace(/\.ts$/, '.js'))
  .sort();
for (const file of files) execFileSync(process.execPath, ['--env-file-if-exists=.env', '--test', '--test-concurrency=1', join('dist', file)], { stdio: 'inherit' });
