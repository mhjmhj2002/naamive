import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
  const { prepareTechnologySelectionContext } = await import('./selection-context.js');
  const { createTechnologyBaselineDraft } = await import('./baseline-draft.js');
  const { submitTechnologyBaseline, decideTechnologyBaseline } = await import('./baseline-gate.js');
  const { materializeModule } = await import('./phase3.js');
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
  const expectWorkerFailure = async (repo: { root: string; sha: string }, revisionId: string, t: test.TestContext) => { const p = await project(repo, revisionId); t.after(() => cleanup(p.id, repo.root)); const accepted = await withTransaction(c => startTechnologyInventory(c, p.id, `failure:${p.id}`)); await runOnce(p.id); assert.equal((await pool.query(`SELECT status FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0].status, 'FAILED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE project_key=$1`, [p.id])).rows[0].n), 0); return p; };
  const cleanup = async (id: string, repo: string) => { for (const table of ['technology_inventory','technology_selection_contexts']) await pool.query(`DELETE FROM ${table} WHERE project_key=$1`, [id]); for (const table of ['events','artifacts','artifact_intents','jobs','operations','intake_revisions']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [id]); await pool.query('DELETE FROM projects WHERE id=$1', [id]); rmSync(repo, { recursive: true, force: true }); };
  test.after(async () => pool.end());

  test('F5-03-FIX-01 carries a realistic textual project id through context, inventory, baseline, gate, and QA persistence', async (t) => {
    const projectId = 'financas-familiares-test-1';
    const catalog: any = await publish();
    const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1' }, engines: { node: '22' } });
    t.after(() => rmSync(repo.root, { recursive: true, force: true }));
    const intake = randomUUID(), contextOperation = randomUUID(), contextJob = randomUUID(), correlation = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'Text project pipeline','owner','tester',$2,'local','main',$3,'PROJECT_DISCOVERY',3,'TECHNOLOGY_SELECTION_PREPARING','{}')`, [projectId, repo.root, repo.sha]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','tester')`, [intake, projectId, 'a'.repeat(64), 'b'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version)
      VALUES($1,$2,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','QUEUED',$3,$4,$5,'PROJECT_DISCOVERY',3)`, [contextOperation, projectId, `text-context:${projectId}`, correlation, intake]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key)
      VALUES($1,$2,$3,$4,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','PENDING',$5)`, [contextJob, contextOperation, projectId, intake, `text-context-job:${projectId}`]);

    assert.equal(await runOnce(projectId), true, 'the real worker claims the selection-context job');
    const context: any = (await pool.query(`SELECT * FROM technology_selection_contexts WHERE project_id=$1`, [projectId])).rows[0];
    assert.equal(context.status, 'READY');
    assert.equal(context.project_id, projectId);
    assert.equal(context.project_key, projectId);
    const contextCompletion: any = (await pool.query(`SELECT j.status,j.last_error,o.failure_code FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.id=$1`, [contextJob])).rows[0];
    assert.deepEqual(contextCompletion, { status: 'COMPLETED', last_error: null, failure_code: null });

    const inventoryOperation: any = await withTransaction(client => startTechnologyInventory(client, projectId, `text-inventory:${projectId}`));
    assert.equal(await runOnce(projectId), true, 'the real worker claims the inventory job');
    const inventoryJob: any = (await pool.query(`SELECT j.id,j.status,j.last_error,o.failure_code FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.operation_id=$1`, [inventoryOperation.operation_id])).rows[0];
    assert.deepEqual({ status: inventoryJob.status, last_error: inventoryJob.last_error, failure_code: inventoryJob.failure_code }, { status: 'COMPLETED', last_error: null, failure_code: null });
    const inventory: any = (await pool.query(`SELECT * FROM technology_inventory WHERE project_id=$1`, [projectId])).rows[0];
    assert.equal(inventory.project_id, projectId);
    assert.equal(inventory.project_key, projectId);

    const draft: any = await withTransaction(client => createTechnologyBaselineDraft(client, projectId));
    const submitted: any = await submitTechnologyBaseline(projectId, draft.revisionId, `text-submit:${projectId}`);
    await decideTechnologyBaseline(projectId, draft.revisionId, { gate_id: submitted.gate_id, version: 1, decision: 'APPROVED' }, `text-approve:${projectId}`);
    const [baseline, revision, gate, project] = await Promise.all([
      pool.query(`SELECT * FROM technology_baselines WHERE id=$1`, [draft.baselineId]),
      pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`, [draft.revisionId]),
      pool.query(`SELECT * FROM technology_baseline_gates WHERE id=$1`, [submitted.gate_id]),
      pool.query(`SELECT state FROM projects WHERE id=$1`, [projectId])
    ]);
    for (const row of [baseline.rows[0], revision.rows[0], gate.rows[0]]) {
      assert.equal(row.project_id, projectId);
      assert.equal(row.project_key, projectId);
    }
    assert.equal(revision.rows[0].status, 'APPROVED');
    assert.equal(gate.rows[0].status, 'APPROVED');
    assert.equal(project.rows[0].state, 'READY_FOR_MODULE_MATERIALIZATION');

    const materialized: any = await materializeModule(projectId, { module_key: 'text-project-module' }, `text-module:${projectId}`);
    const round = randomUUID(), workItem = randomUUID(), matrix = randomUUID();
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,2,'WORK_ITEMS_ACTIVE')`, [round, materialized.module_id, materialized.revision_id]);
    await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload) VALUES($1,$2,$3,$4,$5,'Text project work item','{}')`, [workItem, projectId, materialized.module_id, materialized.revision_id, round]);
    await pool.query(`INSERT INTO qa_matrices(id,project_id,project_key,work_item_id,technology_baseline_revision_id,payload,hash)
      VALUES($1,$2,$2,$3,$4,'{}',$5)`, [matrix, projectId, workItem, draft.revisionId, 'd'.repeat(64)]);
    const qa: any = (await pool.query(`SELECT project_id,project_key,technology_baseline_revision_id FROM qa_matrices WHERE id=$1`, [matrix])).rows[0];
    assert.deepEqual(qa, { project_id: projectId, project_key: projectId, technology_baseline_revision_id: draft.revisionId });

    const schema: any[] = (await pool.query(`SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS data_type
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid
      WHERE c.relname = ANY($1::text[]) AND a.attname IN ('project_id','project_key') AND a.attnum>0 AND NOT a.attisdropped
      ORDER BY c.relname,a.attname`, [['technology_inventory','technology_selection_contexts','technology_baselines','technology_baseline_revisions','technology_baseline_gates','qa_matrices']])).rows;
    assert.equal(schema.length, 12);
    assert.ok(schema.every(row => row.data_type === 'text'));
    const integrity: any[] = (await pool.query(`SELECT c.conname,c.contype,c.convalidated
      FROM pg_constraint c
      WHERE c.conname = ANY($1::text[])`, [[
        'technology_inventory_project_id_fkey','technology_inventory_project_identity_matches',
        'technology_selection_contexts_project_id_fkey','technology_selection_contexts_project_identity_matches',
        'technology_baselines_project_id_fkey','technology_baselines_project_identity_matches',
        'technology_baseline_revisions_project_id_fkey','technology_baseline_revisions_project_identity_matches',
        'technology_baseline_gates_project_id_fkey','technology_baseline_gates_project_identity_matches',
        'qa_matrices_project_id_fkey','qa_matrices_project_identity_matches'
      ]])).rows;
    assert.equal(integrity.length, 12);
    assert.ok(integrity.every(row => row.convalidated));
    const indexes: string[] = (await pool.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname = ANY($1::text[]) ORDER BY indexname`, [[
      'technology_baselines_project_id_key','technology_baselines_project_key_key',
      'technology_selection_contexts_supersedes_baseline_revision_idx',
      'one_active_draft_baseline_revision_per_baseline','one_open_baseline_gate_per_revision',
      'one_baseline_gate_decision_per_revision','one_qa_matrix_per_delivery'
    ]])).rows.map(row => row.indexname);
    assert.deepEqual(indexes, [
      'one_active_draft_baseline_revision_per_baseline','one_baseline_gate_decision_per_revision',
      'one_open_baseline_gate_per_revision','one_qa_matrix_per_delivery',
      'technology_baselines_project_id_key','technology_baselines_project_key_key',
      'technology_selection_contexts_supersedes_baseline_revision_idx'
    ]);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type IN ('TECHNOLOGY_SELECTION_CONTEXT_READY','TECHNOLOGY_INVENTORY_READY','TECHNOLOGY_BASELINE_APPROVED')`, [projectId])).rows[0].n), 3);
  });

  test('runs the reserved SHA through the worker, resolves facts, and writes an immutable sanitized snapshot', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1', microservices: '1', 'not-in-catalog': '1' }, engines: { node: '22' }, password: 'password=hidden', scripts: { postinstall: 'touch SHOULD_NOT_EXIST' } });
    const p = await project(repo, published.revisionId); t.after(() => rmSync(repo.root, { recursive: true, force: true }));
    const key = `inventory-idempotent:${p.id}`; const first = await withTransaction(c => startTechnologyInventory(c, p.id, key)); const second = await withTransaction(c => startTechnologyInventory(c, p.id, key));
    assert.equal(first.operation_id, second.operation_id); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM jobs WHERE operation_id=$1`, [first.operation_id])).rows[0].n), 1);
    writeFileSync(join(repo.root, 'package.json'), JSON.stringify({ dependencies: { 'only-in-head-b': '1' } })); git(repo.root, ['add', 'package.json']); git(repo.root, ['commit', '-m', 'B']);
    assert.equal(await runOnce(p.id), true);
    const rows = (await pool.query(`SELECT * FROM technology_inventory WHERE project_key=$1 ORDER BY value`, [p.id])).rows;
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE operation_id=$1`, [first.operation_id])).rows[0].status, 'COMPLETED'); assert.equal((await pool.query(`SELECT status FROM operations WHERE id=$1`, [first.operation_id])).rows[0].status, 'SUCCEEDED');
    const timeline = (await pool.query(`SELECT event_type,payload FROM events WHERE project_id=$1 AND event_type IN ('TECHNOLOGY_INVENTORY_STARTED','TECHNOLOGY_INVENTORY_READY') ORDER BY id`, [p.id])).rows;
    assert.deepEqual(timeline.map((event: any) => event.event_type), ['TECHNOLOGY_INVENTORY_STARTED', 'TECHNOLOGY_INVENTORY_READY']);
    assert.equal(timeline[1].payload.technology_catalog_revision_id, published.revisionId); assert.match(timeline[1].payload.evidence_hash, /^[a-f0-9]{64}$/); assert.ok(Number(timeline[1].payload.duration_ms) >= 0);
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

  test('rejects a SUPERSEDED context without creating an operation, job, or inventory', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { unknown: '1' } }); const p = await project(repo, published.revisionId, 'SUPERSEDED'); t.after(() => cleanup(p.id, repo.root));
    await assert.rejects(() => withTransaction(c => startTechnologyInventory(c, p.id, `superseded:${p.id}`)), /TECHNOLOGY_SELECTION_CONTEXT_INVALID/);
    for (const table of ['operations','jobs','technology_inventory']) assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM ${table} WHERE project_id::text=$1 OR project_key=$1`, [p.id]).catch(() => ({ rows: [{ n: 0 }] }))).rows[0].n), 0);
  });

  test('resolves a genuinely ambiguous published snapshot without assigning a catalog item', async (t) => {
    const repo = fixtureRepo({ dependencies: { ambiguous: '1' } }); const revisionId=randomUUID(), categoryA=randomUUID(), categoryB=randomUUID(), itemA=randomUUID(), itemB=randomUUID(), suffix=randomUUID().replaceAll('-','').slice(0,10).toUpperCase(), codeA=`AMBIG_A_${suffix}`,codeB=`AMBIG_B_${suffix}`;
    await pool.query(`INSERT INTO technology_categories(id,code,name,selection_mode,min_selections,max_selections,is_active,display_order) VALUES($1,$3,'A','MULTIPLE',0,NULL,true,900),($2,$4,'B','MULTIPLE',0,NULL,true,901)`,[categoryA,categoryB,codeA,codeB]);
    await pool.query(`INSERT INTO technology_catalog_items(id,category_id,code,name,is_active,display_order,metadata) VALUES($1,$3,'AMBIGUOUS','A',true,1,'{}'),($2,$4,'AMBIGUOUS','B',true,1,'{}')`,[itemA,itemB,categoryA,categoryB]);
    await pool.query(`INSERT INTO technology_catalog_revisions(id,revision_number,status,content_hash) VALUES($1,$2,'DRAFT',$3)`,[revisionId,Date.now()*1000+Math.floor(Math.random()*999),'d'.repeat(64)]);
    await pool.query(`INSERT INTO technology_catalog_revision_categories(revision_id,category_id,code,name,selection_mode,min_selections,max_selections,is_active,display_order) VALUES($1,$2,$4,'A','MULTIPLE',0,NULL,true,1),($1,$3,$5,'B','MULTIPLE',0,NULL,true,2)`,[revisionId,categoryA,categoryB,codeA,codeB]);
    await pool.query(`INSERT INTO technology_catalog_revision_items(revision_id,catalog_item_id,category_id,code,name,is_active,display_order,metadata) VALUES($1,$2,$4,'AMBIGUOUS','A',true,1,'{}'),($1,$3,$5,'AMBIGUOUS','B',true,1,'{}')`,[revisionId,itemA,itemB,categoryA,categoryB]); await pool.query(`UPDATE technology_catalog_revisions SET status='PUBLISHED',published_at=clock_timestamp(),published_by='inventory-tester' WHERE id=$1`,[revisionId]);
    const p=await project(repo,revisionId); t.after(() => rmSync(repo.root,{recursive:true,force:true})); await withTransaction(c=>startTechnologyInventory(c,p.id,`ambiguous:${p.id}`)); await runOnce(p.id);
    const row=(await pool.query(`SELECT resolution_result,catalog_item_id FROM technology_inventory WHERE project_key=$1`,[p.id])).rows[0]; assert.deepEqual(row,{resolution_result:'AMBIGUOUS_CATALOG_ITEM',catalog_item_id:null});
  });

  test('rejects committed Git symlinks and submodules before parsing repository content', async (t) => {
    const published:any=await publish(); const symlinkRepo=fixtureRepo({dependencies:{'modular-monolith':'1'}}); writeFileSync(join(symlinkRepo.root,'target'),'x'); symlinkSync('target',join(symlinkRepo.root,'tracked-link')); git(symlinkRepo.root,['add','tracked-link']); git(symlinkRepo.root,['commit','-m','symlink']); symlinkRepo.sha=git(symlinkRepo.root,['rev-parse','HEAD']); await expectWorkerFailure(symlinkRepo,published.revisionId,t);
    const module=fixtureRepo({}); const submoduleRepo=fixtureRepo({dependencies:{'modular-monolith':'1'}}); git(submoduleRepo.root,['-c','protocol.file.allow=always','submodule','add',module.root,'vendor/module']); git(submoduleRepo.root,['commit','-m','submodule']); submoduleRepo.sha=git(submoduleRepo.root,['rev-parse','HEAD']); t.after(()=>rmSync(module.root,{recursive:true,force:true})); await expectWorkerFailure(submoduleRepo,published.revisionId,t);
  });

  test('uses only package.json and rolls back all final persistence when its insert fails', async (t) => {
    const published:any=await publish(); const repo=fixtureRepo({dependencies:{'modular-monolith':'1'}}); writeFileSync(join(repo.root,'.env'),'secret=hidden'); writeFileSync(join(repo.root,'package-lock.json'),'{}'); mkdirSync(join(repo.root,'foo')); writeFileSync(join(repo.root,'foo','bar.json'),'{}'); git(repo.root,['add','.']); git(repo.root,['commit','-m','outside']); repo.sha=git(repo.root,['rev-parse','HEAD']); const p=await project(repo,published.revisionId); t.after(()=>cleanup(p.id,repo.root));
    const accepted=await withTransaction(c=>startTechnologyInventory(c,p.id,`rollback:${p.id}`)); await pool.query(`CREATE FUNCTION test_inventory_persist_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'inventory persistence failure'; END $$`); await pool.query(`CREATE TRIGGER test_inventory_persist_failure BEFORE INSERT ON technology_inventory FOR EACH ROW EXECUTE FUNCTION test_inventory_persist_failure()`);
    try { await runOnce(p.id); } finally { await pool.query(`DROP TRIGGER test_inventory_persist_failure ON technology_inventory`); await pool.query(`DROP FUNCTION test_inventory_persist_failure()`); }
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE project_key=$1`,[p.id])).rows[0].n),0); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='technology-inventory'`,[p.id])).rows[0].n),1); assert.equal((await pool.query(`SELECT status FROM jobs WHERE operation_id=$1`,[accepted.operation_id])).rows[0].status,'FAILED');
  });

  test('successfully inventories only package.json and never persists allowlist-external markers', async (t) => {
    const markers = ['ENV_ONLY_MARKER','LOCK_ONLY_MARKER','SECRET_ONLY_MARKER','NESTED_ONLY_MARKER'];
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1' } });
    writeFileSync(join(repo.root, '.env'), markers[0]); writeFileSync(join(repo.root, 'package-lock.json'), markers[1]); writeFileSync(join(repo.root, 'secret.json'), markers[2]); mkdirSync(join(repo.root, 'foo')); writeFileSync(join(repo.root, 'foo', 'bar.json'), markers[3]);
    git(repo.root, ['add', '.']); git(repo.root, ['commit', '-m', 'allowlist fixture']); repo.sha = git(repo.root, ['rev-parse', 'HEAD']);
    const p = await project(repo, published.revisionId); t.after(() => rmSync(repo.root, { recursive: true, force: true })); const accepted = await withTransaction(c => startTechnologyInventory(c, p.id, `allowlist:${p.id}`));
    assert.equal(await runOnce(p.id), true); assert.equal((await pool.query(`SELECT status FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0].status, 'COMPLETED'); assert.equal((await pool.query(`SELECT status FROM operations WHERE id=$1`, [accepted.operation_id])).rows[0].status, 'SUCCEEDED');
    const rows = (await pool.query(`SELECT source_path,value FROM technology_inventory WHERE project_key=$1`, [p.id])).rows; assert.ok(rows.length > 0); assert.ok(rows.every((row: any) => row.source_path === 'package.json')); assert.ok(rows.some((row: any) => row.value === 'MODULAR_MONOLITH'));
    const values = JSON.stringify(rows); const artifact: any = (await pool.query(`SELECT storage_uri FROM artifacts WHERE project_id=$1 AND artifact_type='technology-inventory' ORDER BY created_at DESC LIMIT 1`, [p.id])).rows[0]; const snapshot = readFileSync(new URL(artifact.storage_uri), 'utf8');
    for (const marker of markers) { assert.ok(!values.includes(marker)); assert.ok(!snapshot.includes(marker)); }
  });

  test('reserves operation, job and evidence before a malformed manifest fails without final inventory', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1' } }); writeFileSync(join(repo.root, 'package.json'), '{'); git(repo.root, ['add', 'package.json']); git(repo.root, ['commit', '-m', 'bad']); const badSha = git(repo.root, ['rev-parse', 'HEAD']); const p = await project({ ...repo, sha: badSha }, published.revisionId); t.after(() => cleanup(p.id, repo.root));
    const accepted = await withTransaction(c => startTechnologyInventory(c, p.id, `malformed:${p.id}`)); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='technology-inventory'`, [p.id])).rows[0].n), 1);
    await runOnce(p.id); const job = (await pool.query(`SELECT status,last_error FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0]; assert.equal(job.status, 'FAILED'); assert.equal(job.last_error, 'AGENT_EXECUTION_FAILED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE project_key=$1`, [p.id])).rows[0].n), 0);
  });

  test('retries safely both before inventory persistence and after its immutable snapshot was written', async (t) => {
    const published: any = await publish(); const repo = fixtureRepo({ dependencies: { 'modular-monolith': '1' } }); const p = await project(repo, published.revisionId); t.after(() => rmSync(repo.root, { recursive: true, force: true }));
    const accepted = await withTransaction(c => startTechnologyInventory(c, p.id, `retry:${p.id}`));
    await pool.query(`CREATE FUNCTION test_inventory_retry_before_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'retry before write'; END $$`);
    await pool.query(`CREATE TRIGGER test_inventory_retry_before_write BEFORE INSERT ON technology_inventory FOR EACH ROW EXECUTE FUNCTION test_inventory_retry_before_write()`);
    try { assert.equal(await runOnce(p.id), true); } finally { await pool.query(`DROP TRIGGER test_inventory_retry_before_write ON technology_inventory`); await pool.query(`DROP FUNCTION test_inventory_retry_before_write()`); }
    let job: any = (await pool.query(`SELECT id,status FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0]; assert.equal(job.status, 'FAILED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE job_id=$1`, [job.id])).rows[0].n), 0);
    await pool.query(`UPDATE jobs SET status='PENDING',attempts=0,available_at=clock_timestamp(),completed_at=NULL WHERE id=$1`, [job.id]); assert.equal(await runOnce(p.id), true);
    job = (await pool.query(`SELECT id,status FROM jobs WHERE operation_id=$1`, [accepted.operation_id])).rows[0]; assert.equal(job.status, 'COMPLETED'); const persisted = Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE job_id=$1`, [job.id])).rows[0].n); assert.ok(persisted > 0);

    await pool.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp(),completed_at=NULL WHERE id=$1`, [job.id]);
    assert.equal(await runOnce(p.id), true);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_inventory WHERE job_id=$1`, [job.id])).rows[0].n), persisted);
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE id=$1`, [job.id])).rows[0].status, 'COMPLETED');
  });

  test('parser enforces closed allowlist safety limits without inspecting secrets or scripts', () => {
    const root = mkdtempSync(join(tmpdir(), 'naamive-inventory-parser-')); try {
      const file = join(root, 'package.json'); writeFileSync(file, JSON.stringify({ dependencies: { 'safe-item': '1' }, secret: 'token=hidden', scripts: { test: 'exit 1' } })); assert.deepEqual(parsePackageInventoryFacts(file).map((f: any) => f.value), ['SAFE_ITEM']);
      writeFileSync(file, '{'); assert.throws(() => parsePackageInventoryFacts(file), /MALFORMED/); const target = join(root, 'target'); writeFileSync(target, '{}'); const link = join(root, 'link'); symlinkSync(target, link); assert.throws(() => parsePackageInventoryFacts(link), /UNSAFE/);
      writeFileSync(file, JSON.stringify({ a: { b: { c: { d: { e: { f: { g: { h: { i: {} } } } } } } } } })); assert.throws(() => parsePackageInventoryFacts(file), /DEPTH/); writeFileSync(file, ' '.repeat(128 * 1024 + 1)); assert.throws(() => parsePackageInventoryFacts(file), /UNSAFE/);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
}
