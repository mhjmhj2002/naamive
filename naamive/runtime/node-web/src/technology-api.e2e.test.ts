import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-f5-15-api-artifacts';
process.env.NAAMIVE_OPERATOR_ID ??= 'f5-15-api-tester';

if (process.env.DATABASE_URL.includes('unused')) test('F5-15 API integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const { loadCatalogSeedPackage, catalogPackageHash, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { testAuthenticatedHeaders } = await import('./test-auth.js');
  const publish = async () => { const seed: any = structuredClone(await loadCatalogSeedPackage()), n = Date.now() * 100 + Math.floor(Math.random() * 99); for (const key of ['categories','catalogItems','profiles','profileItems','compatibilityRules','catalogRevision']) seed[key].catalog_revision = n; seed.catalogRevision.records[0].catalog_revision = n; seed.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed)); return publishTechnologyCatalog(seed, 'f5-15-api-tester', randomUUID()); };
  const fixture = async () => {
    const catalog: any = await publish(), project = randomUUID(), context = randomUUID(), intake = randomUUID(), inventoryOperation = randomUUID(), job = randomUUID();
    const profile = (await pool.query(`SELECT profile_id FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND is_active LIMIT 1`, [catalog.revisionId])).rows[0].profile_id;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'F5-15','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',3,'TECHNOLOGY_BASELINE_IN_REVIEW','{}')`, [project]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','tester')`, [intake,project,'a'.repeat(64),'b'.repeat(64)]);
    await pool.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,technology_profile_id,hash,status) VALUES($1,$2::uuid,$2,$3,$4,$5,'READY')`, [context,project,catalog.revisionId,profile,'c'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'TECHNOLOGY_INVENTORY','SUCCEEDED',$3,$4,$5)`, [inventoryOperation,project,`f5-15-inventory:${project}`,randomUUID(),intake]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key,completed_at) VALUES($1,$2,$3,$4,'START_TECHNOLOGY_INVENTORY','COMPLETED',$5,clock_timestamp())`, [job,inventoryOperation,project,intake,`f5-15-job:${project}`]);
    await pool.query(`INSERT INTO technology_inventory(id,project_id,project_key,repository_sha,job_id,technology_catalog_revision_id,source_path,detector_code,confidence,value,resolution_result) VALUES($1,$2::uuid,$2,'000',$3,$4,'package.json','TEST',1,'TEST','UNKNOWN_CATALOG_ITEM')`, [randomUUID(),project,job,catalog.revisionId]);
    const profileItems = (await pool.query(`SELECT catalog_item_id,classification,version_constraint,justification FROM technology_catalog_revision_profile_items WHERE revision_id=$1 AND profile_id=$2 ORDER BY display_order`, [catalog.revisionId,profile])).rows;
    return { catalog, project, context, profile, payload: { selection_context_id: context, technology_catalog_revision_id: catalog.revisionId, items: profileItems.map((item: any) => ({ catalog_item_id: item.catalog_item_id, classification: item.classification, version_constraint: item.version_constraint, reason: item.justification || 'F5-15 API baseline.', technology_profile_id: profile })) } };
  };
  test.after(() => pool.end());
  test('F5-15 exposes only selectable catalog data and creates an idempotent baseline without an intake revision FK violation', async t => {
    const f = await fixture(), server = createApiServer(); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve)); const base = `http://127.0.0.1:${(server.address() as any).port}`;
    const session=await testAuthenticatedHeaders(f.project,[{role_code:'OPERATOR',action_code:'READ_PROJECT'},{role_code:'OPERATOR',action_code:'OPERATE_PROJECT'}]);t.after(session.cleanup);
    t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
    const get = async (path: string, expected = 200) => { const response = await fetch(`${base}${path}`,{headers:session.headers}), body = await response.text(); assert.equal(response.status, expected, body); return JSON.parse(body) as any; };
    const post = async (path: string, body: any, key: string = randomUUID(), expected = 201) => { const response = await fetch(`${base}${path}`, { method: 'POST', headers: { ...session.headers,'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) }), responseBody = await response.text(); assert.equal(response.status, expected, responseBody); return JSON.parse(responseBody) as any; };
    const categories = await get('/api/technology/categories'); assert.ok(categories.items.every((item: any) => item.is_active));
    const items = await get('/api/technology/catalog-items'); assert.ok(items.items.length > 0 && items.items.every((item: any) => item.is_active));
    const profiles = await get('/api/technology/profiles'); assert.ok(profiles.items.length > 0 && profiles.items.every((profile: any) => profile.is_active));
    const expanded = await get(`/api/technology/profiles/${f.profile}`); assert.ok(expanded.items.every((item: any) => item.catalog_item_id));
    await get(`/api/technology/catalog-revisions/${f.catalog.revisionId}`);
    const draft = randomUUID(); await pool.query(`INSERT INTO technology_catalog_revisions(id,revision_number,status,content_hash) VALUES($1,$2,'DRAFT',$3)`, [draft, Date.now(), 'd'.repeat(64)]); await get(`/api/technology/catalog-revisions/${draft}`, 404);
    const superseded = randomUUID(); await pool.query(`INSERT INTO technology_catalog_revisions(id,revision_number,status,content_hash,published_at,published_by) VALUES($1,$2,'SUPERSEDED',$3,clock_timestamp(),'tester')`, [superseded, Date.now() + 1, 'e'.repeat(64)]); await get(`/api/technology/catalog-revisions/${superseded}`, 404);
    await get(`/api/projects/${f.project}/technology-baseline`); await get(`/api/projects/${f.project}/technology-baseline/selection-context`);
    const inventoryKey = `f5-15-http-inventory:${f.project}`, inventory = await post(`/api/projects/${f.project}/technology-baseline/inventory`, {}, inventoryKey, 202), repeatedInventory = await post(`/api/projects/${f.project}/technology-baseline/inventory`, {}, inventoryKey, 202); assert.equal(inventory.operation_id, repeatedInventory.operation_id);
    const key = `f5-15-create:${f.project}`, created = await post(`/api/projects/${f.project}/technology-baseline/revisions`, f.payload, key), repeated = await post(`/api/projects/${f.project}/technology-baseline/revisions`, f.payload, key);
    assert.equal(created.operation_id, repeated.operation_id); assert.equal((await pool.query('SELECT revision_id FROM operations WHERE id=$1', [created.operation_id])).rows[0].revision_id, null);
    for (const field of ['technology_name','ecosystem','technology_version','framework']) await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, [field]: 'forbidden' }, randomUUID(), 422);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, unknown: true }, randomUUID(), 422);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, selection_context_id: undefined }, randomUUID(), 422);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, technology_catalog_revision_id: randomUUID() }, randomUUID(), 422);
    await post(`/api/projects/${randomUUID()}/technology-baseline/revisions`, f.payload, randomUUID(), 403);
    const inactiveContext = randomUUID(); await pool.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,technology_profile_id,hash,status) VALUES($1,$2::uuid,$2,$3,$4,$5,'SUPERSEDED')`, [inactiveContext,f.project,f.catalog.revisionId,f.profile,'f'.repeat(64)]);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, selection_context_id: inactiveContext }, randomUUID(), 409);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, items: [{ ...f.payload.items[0], catalog_item_id: randomUUID() }] }, randomUUID(), 422);
    const inactiveItem = (await pool.query(`SELECT catalog_item_id FROM technology_catalog_revision_items WHERE revision_id=$1 AND NOT is_active LIMIT 1`, [f.catalog.revisionId])).rows[0].catalog_item_id;
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, items: [{ ...f.payload.items[0], catalog_item_id: inactiveItem }] }, randomUUID(), 422);
    await post(`/api/projects/${f.project}/technology-baseline/revisions`, { ...f.payload, items: [{ ...f.payload.items[0], classification: 'ALLOWED' }, ...f.payload.items.slice(1)] }, randomUUID(), 422);
  });
}
