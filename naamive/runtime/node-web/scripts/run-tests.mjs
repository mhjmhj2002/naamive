import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { runCommand, withDisposableTestDatabase } from './disposable-test-database.mjs';

// Discover tests from the source tree so stale ignored files in dist cannot be
// executed after a branch switch. Each source test is compiled by `npm run build`.
const sourceFiles = readdirSync('src').filter((file) => file.endsWith('.test.ts')).sort();
const reachesPostgres = (sourcePath, visited = new Set()) => {
  if (visited.has(sourcePath)) return false;
  visited.add(sourcePath);
  if (sourcePath.endsWith('/db.ts')) return true;
  const source = readFileSync(sourcePath, 'utf8');
  if (source.includes('new pg.Pool') || source.includes('@postgresql-test')) return true;
  for (const match of source.matchAll(/['"](\.\/[^'"]+\.js)['"]/g)) {
    const importedSource = resolve(dirname(sourcePath), match[1].replace(/\.js$/, '.ts'));
    if (existsSync(importedSource) && reachesPostgres(importedSource, visited)) return true;
  }
  return false;
};
const usesPostgres = (file) => reachesPostgres(join('src', file));
const unitFiles = sourceFiles.filter((file) => !usesPostgres(file)).map((file) => file.replace(/\.ts$/, '.js'));
const postgresFiles = sourceFiles.filter(usesPostgres).map((file) => file.replace(/\.ts$/, '.js'));
// Forward Node's test filters (for example `npm test -- --test-name-pattern=F5-24`)
// so a focused acceptance run does not start unrelated E2E fixtures.
const testArgs = process.argv.slice(2);
const runTestFile = (file, env) => runCommand(process.execPath, [
  '--env-file-if-exists=.env', '--test', '--test-concurrency=1', ...testArgs, join('dist', file),
], env);

// Pure unit tests remain independent of PostgreSQL. Tests that access the
// database share one fresh migrated database for this invocation only.
for (const file of unitFiles) await runTestFile(file, process.env);
if (postgresFiles.length > 0) {
  await withDisposableTestDatabase({
    kind: 'test',
    run: async ({ env }) => {
      const testEnv = { ...env, NAAMIVE_AGENT_ADAPTER: 'controlled', NAAMIVE_DEVELOPMENT_EXECUTOR: 'controlled' };
      await runCommand(process.execPath, ['dist/migrate.js'], testEnv);
      for (const file of postgresFiles) await runTestFile(file, testEnv);
    },
  });
}
