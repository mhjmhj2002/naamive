import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required for e2e');
  process.exit(1);
}

const sourceFiles = new Set((await readdir(new URL('../src/', import.meta.url)))
  .filter((file) => file.endsWith('.e2e.test.ts'))
  .map((file) => file.replace(/\.ts$/, '.js')));

// Ignore compiled E2E files left by a previous branch switch. Every executed
// scenario must have a current source counterpart compiled by `npm run build`.
const testFiles = (await readdir(new URL('../dist/', import.meta.url)))
  .filter((file) => sourceFiles.has(file))
  .map((file) => `dist/${file}`);

if (testFiles.length === 0) {
  console.error('E2E acceptance is incomplete: no compiled E2E scenarios were found');
  process.exit(1);
}

const child = spawn(process.execPath, [
  '--env-file-if-exists=.env',
  '--test',
  '--test-concurrency=1',
  ...testFiles
], {
  env: {
    ...process.env,
    NAAMIVE_ARTIFACT_STORE_URI: 'file:///tmp/naamive-e2e-artifacts',
    NAAMIVE_AGENT_ADAPTER: 'controlled'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let report = '';
for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    const text = chunk.toString();
    report += text;
    process[stream === child.stdout ? 'stdout' : 'stderr'].write(text);
  });
}

const result = await new Promise((resolve, reject) => {
  child.once('error', reject);
  child.once('close', (code, signal) => resolve({ code, signal }));
});

if (result.code !== 0 || result.signal) process.exit(result.code ?? 1);
const skipped = report.match(/\bskipped\s+(\d+)\b/i);
if (!skipped || Number(skipped[1]) !== 0) {
  console.error('E2E acceptance is incomplete: required scenarios were skipped or no skip summary was emitted');
  process.exit(1);
}
