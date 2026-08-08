import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.inventory-artifacts`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= `/tmp,${process.cwd()}`;
process.env.NAAMIVE_OPERATOR_ID ??= 'inventory-tester';

if (process.env.DATABASE_URL.includes('unused')) test('inventory integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool, withTransaction } = await import('./db.js');
  const { publishTechnologyCatalog, loadCatalogSeedPackage, catalogPackageHash } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { startTechnologyInventory, parsePackageInventoryFacts } = await import('./inventory.js');
  const { runOnce } = await import('./worker.js');
  const git = (cwd: string, args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  const base = await loadCatalogSeedPackage(); let revision = Date.now() * 10;
  const fixtureRepo = (manifest: object) => { const root = mkdtempSync(join(process.cwd(), '.inventory-repo-')); git(root, ['init']); git(root, ['config', 'user.email', 'test@example.invalid']); git(root, ['config', 'user.name', 'test']); writeFileSync(join(root, 'package.json'), JSON.stringify(manifest)); git(root, ['add', 'package.json']); git(root, ['commit', '-m', 'A']); return { root, sha: git(root, ['rev-parse', 'HEAD']) }; };
  const publish = async () => { const seed: any = structuredClone(base); seed.catalog_revision = ++revision; for (const key of ['categories', 'catalogItems', 'profiles', 'profileItems', 'compatibilityRules', 'catalogRevision']) seed[key].catalog_revision = seed.catalog_revision; seed.catalogRevision.records[0].catalog_revision = seed.catalog_revision; seed.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed)); return publishTechnologyCatalog(seed, 'inventory-tester', randomUUID()); };
  const project = async (repo: { root: string; sha: string }, catalogRevisionId: string, status = 'READY') => {
    const id = randomUUID(), intake = randomUUID(), context = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,'inventory','owner','tester',$2,'local','main',$3,'REGISTERED','{}')`, [id, repo.root, repo.sha]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','tester')`, [intake, id, 'a'.repeat(64), 'b'.repeat(64)]);
    await pool.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,hash,status) VALUES($1,$2,$3,$4,$5,$6)`, [context, id, id, catalogRevisionId, 'c'.repeat(64), status]);
    return { id, context };
  };
  const cleanup = async (id: string, repo: string) => { for (const table of ['technology_inventory','technology_selection_contexts']) await pool.query(`DELETE FROM ${table} WHERE project_key=$1`, [id]); for (const table of ['events','artifacts','artifact_intents','jobs','operations','intake_revisions']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [id]); await pool.query('DELETE FROM projects WHERE id=$1', [id]); rmSync(repo, { recursive: true, force: true }); };
  test.after(async () => pool.end());

  test('runs the reserved SHA through the worker, resolves facts, and writes an immutable sanitized snapshot', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1', microservices: '1', 'not-in-catalog': '1' }, engines: { node: '22' }, password: 'password=hidden', scripts: { postinstall: 'touch SHOULD_NOT_EXIST' } });
    const p = await project(repo, published.revisionId); t.after(() => rmSync(repo.root, { recursive: true, force: true }));
    const key = `inventory-idempotent:${p.id}`; const first = await withTransaction(c => startTechnologyInventory(c, p.id, key)); const second = await withTransaction(c => startTechnologyInventory(c, p.id, key));
    assert.equal(first.operation_id, second.operation_id); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM jobs WHERE operation_id=$1`, [first.operation_id])).rows[0].n), 1);
    writeFileSync(join(repo.root, 'package.json'), JSON.stringify({ dependencies: { 'only-in-head-b': '1' } })); git(repo.root, ['add', 'package.json']); git(repo.root, ['commit', '-m', 'B']);
    assert.equal(await runOnce(p.id), true);
    const rows = (await pool.query(`SELECT * FROM technology_inventory WHERE project_key=$1 ORDER BY value`, [p.id])).rows;
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE operation_id=$1`, [first.operation_id])).rows[0].status, 'COMPLETED'); assert.equal((await pool.query(`SELECT status FROM operations WHERE id=$1`, [first.operation_id])).rows[0].status, 'SUCCEEDED');
    assert.ok(rows.some((r: any) => r.resolution_result === 'RESOLVED_ACTIVE' && r.catalog_item_id)); assert.ok(rows.some((r: any) => r.resolution_result === 'RESOLVED_INACTIVE' && r.catalog_item_id)); assert.ok(rows.some((r: any) => r.resolution_result === 'UNKNOWN_CATALOG_ITEM' && !r.catalog_item_id));
    assert.ok(rows.every((r: any) => r.repository_sha === repo.sha && r.project_id === p.id && r.project_key === p.id && r.technology_catalog_revision_id === published.revisionId)); assert.ok(!rows.some((r: any) => r.value === 'ONLY_IN_HEAD_B'));
    const artifact: any = (await pool.query(`SELECT storage_uri FROM artifacts WHERE project_id=$1 AND artifact_type='technology-inventory' ORDER BY created_at DESC LIMIT 1`, [p.id])).rows[0]; const snapshot = JSON.parse(readFileSync(new URL(artifact.storage_uri), 'utf8'));
    const { content_hash, ...body } = snapshot; assert.equal(content_hash, createHash('sha256').update(JSON.stringify(body)).digest('hex')); assert.equal(snapshot.requested_sha, repo.sha); assert.equal(snapshot.read_sha, repo.sha); assert.equal(snapshot.selection_context_id, p.context); assert.equal(snapshot.technology_catalog_revision_id, published.revisionId); assert.ok(!JSON.stringify(snapshot).includes('hidden')); assert.ok(!JSON.stringify(snapshot).includes('SHOULD_NOT_EXIST'));
    assert.equal(git(repo.root, ['rev-parse', 'HEAD']) === repo.sha, false); assert.equal(readFileSync(join(repo.root, 'package.json'), 'utf8').includes('only-in-head-b'), true);
  });

  test('rejects invalid contexts before a job is reserved and keeps the catalog read-only', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { unknown: '1' } }); const p = await project(repo, published.revisionId, 'PREPARING'); t.after(() => cleanup(p.id, repo.root));
    const before = await pool.query(`SELECT (SELECT count(*) FROM technology_catalog_items) items,(SELECT count(*) FROM technology_catalog_revisions) revisions`);
    await assert.rejects(() => withTransaction(c => startTechnologyInventory(c, p.id, 'invalid-context')), /TECHNOLOGY_SELECTION_CONTEXT_INVALID/);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM operations WHERE project_id=$1`, [p.id])).rows[0].n), 0); assert.deepEqual((await pool.query(`SELECT (SELECT count(*) FROM technology_catalog_items) items,(SELECT count(*) FROM technology_catalog_revisions) revisions`)).rows[0], before.rows[0]);
  });

  test('reserves operation, job and evidence before a malformed manifest fails without final inventory', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1' } }); writeFileSync(join(repo.root, 'package.json'), '{'); git(repo.root, ['add', 'package.json']); git(repo.root, ['commit', '-m', 'bad']); const badSha = git(repo.root, ['rev-parse', 'HEAD']); const p = await project({ ...repo, sha: badSha }, published.revisionId); t.after(() => cleanup(p.id, repo.root));
    const accepted = await withTransaction(c => startTechnologyInventory(c, p.id, `malformed:${p.id}`)); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='technology-inventory'`, [p.id])).rows[0].n), 1);
    await runOnce(p.id); const job = (await pool.query(`SELECT status,last_error FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0]; assert.equal(job.status, 'FAILED'); assert.equal(job.last_error, 'AGENT_EXECUTION_FAILED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE project_key=$1`, [p.id])).rows[0].n), 0);
  });

  test('parser enforces closed allowlist safety limits without inspecting secrets or scripts', () => {
    const root = mkdtempSync(join(tmpdir(), 'naamive-inventory-parser-')); try {
      const file = join(root, 'package.json'); writeFileSync(file, JSON.stringify({ dependencies: { 'safe-item': '1' }, secret: 'token=hidden', scripts: { test: 'exit 1' } })); assert.deepEqual(parsePackageInventoryFacts(file).map((f: any) => f.value), ['SAFE_ITEM']);
      writeFileSync(file, '{'); assert.throws(() => parsePackageInventoryFacts(file), /MALFORMED/); const target = join(root, 'target'); writeFileSync(target, '{}'); const link = join(root, 'link'); symlinkSync(target, link); assert.throws(() => parsePackageInventoryFacts(link), /UNSAFE/);
      writeFileSync(file, JSON.stringify({ a: { b: { c: { d: { e: { f: { g: { h: { i: {} } } } } } } } } })); assert.throws(() => parsePackageInventoryFacts(file), /DEPTH/); writeFileSync(file, ' '.repeat(128 * 1024 + 1)); assert.throws(() => parsePackageInventoryFacts(file), /UNSAFE/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
