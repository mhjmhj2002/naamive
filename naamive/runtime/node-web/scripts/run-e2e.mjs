import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { runCommand, withDisposableTestDatabase } from './disposable-test-database.mjs';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to derive an administrative connection for e2e');
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

await withDisposableTestDatabase({
  kind: 'e2e',
  run: async ({ env }) => {
    await runCommand(process.execPath, ['dist/migrate.js'], env);
    const child = spawn(process.execPath, [
      '--env-file-if-exists=.env',
      '--test',
      '--test-concurrency=1',
      ...testFiles
    ], {
      env: {
        ...env,
        NAAMIVE_ARTIFACT_STORE_URI: 'file:///tmp/naamive-e2e-artifacts',
        NAAMIVE_AGENT_ADAPTER: 'controlled',
        NAAMIVE_DEVELOPMENT_EXECUTOR: 'controlled'
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

    if (result.code !== 0 || result.signal) throw new Error(`E2E suite exited with ${result.signal ?? result.code}`);
    const skipped = report.match(/\bskipped\s+(\d+)\b/i);
    if (!skipped || Number(skipped[1]) !== 0) {
      throw new Error('E2E acceptance is incomplete: required scenarios were skipped or no skip summary was emitted');
    }
  },
});
