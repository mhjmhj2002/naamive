import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = readdirSync('dist').filter((file) => file.endsWith('.test.js')).sort();
for (const file of files) execFileSync(process.execPath, ['--env-file-if-exists=.env', '--test', '--test-concurrency=1', join('dist', file)], { stdio: 'inherit' });
