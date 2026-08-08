import { spawn } from 'node:child_process';

const run = (command, args, env = process.env) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: 'inherit', env });
  child.once('error', reject);
  child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
});

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://naamive:naamive@127.0.0.1:5432/naamive',
  NAAMIVE_ARTIFACT_STORE_URI: process.env.NAAMIVE_ARTIFACT_STORE_URI ?? `file://${process.cwd()}/.catalog-publisher-integration-artifacts`,
  NAAMIVE_REPOSITORY_ROOTS: process.env.NAAMIVE_REPOSITORY_ROOTS ?? process.cwd(),
  NAAMIVE_OPERATOR_ID: process.env.NAAMIVE_OPERATOR_ID ?? 'catalog-publisher-integration',
  NAAMIVE_REQUIRE_CATALOG_PUBLISHER_DATABASE: 'true'
};

await run('docker', ['compose', 'up', '-d', 'postgres'], env);
let migrated = false;
for (let attempt = 0; attempt < 30 && !migrated; attempt++) {
  try { await run('npm', ['run', 'migrate'], env); migrated = true; }
  catch (error) { if (attempt === 29) throw error; await new Promise((resolve) => setTimeout(resolve, 1000)); }
}
await run('npm', ['run', 'build'], env);
await run('node', ['--test', '--test-concurrency=1', 'dist/catalog-publisher.test.js'], env);
