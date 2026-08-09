import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.selection-context-artifacts`;
process.env.NAAMIVE_OPERATOR_ID ??= 'selection-context-tester';

if (process.env.DATABASE_URL.includes('unused')) test('selection context integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool, withTransaction } = await import('./db.js');
  const { loadCatalogSeedPackage, catalogPackageHash, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { prepareTechnologySelectionContext } = await import('./selection-context.js');
  const { startTechnologyInventory } = await import('./inventory.js');
  const base: any = await loadCatalogSeedPackage(); let number = Date.now() * 100;
  const publish = async () => { const seed = structuredClone(base); seed.catalog_revision = ++number; for (const key of ['categories','catalogItems','profiles','profileItems','compatibilityRules','catalogRevision']) seed[key].catalog_revision=seed.catalog_revision; seed.catalogRevision.records[0].catalog_revision=seed.catalog_revision; seed.catalogRevision.records[0].content_hash=catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed)); return publishTechnologyCatalog(seed, 'selection-context-tester', randomUUID()); };
  const setup = async (state='TECHNOLOGY_SELECTION_PREPARING') => { const id=randomUUID(), revision=randomUUID(), operation=randomUUID(), job=randomUUID(), correlation=randomUUID(); await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'selection','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',3,$2,'{}')`,[id,state]); await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','tester')`,[revision,id,'a'.repeat(64),'b'.repeat(64)]); await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','RUNNING',$3,$4,$5,'PROJECT_DISCOVERY',3)`,[operation,id,`context:${id}`,correlation,revision]); await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','LEASED',$5)`,[job,operation,id,revision,`context:${id}`]); return { id, revision, operation, job, correlation }; };
  const cleanup=async(id:string)=>{for(const table of ['technology_inventory','technology_selection_contexts'])await pool.query(`DELETE FROM ${table} WHERE project_key=$1`,[id]);for(const table of ['events','artifacts','artifact_intents','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[id]);await pool.query(`DELETE FROM projects WHERE id=$1`,[id]);};
  test.after(async()=>pool.end());

  test('prepares an immutable published snapshot and provides the READY context consumed by F5-08', async t => {
    const catalog:any=await publish(), p=await setup(); t.after(()=>cleanup(p.id));
    const result:any=await withTransaction(c=>prepareTechnologySelectionContext(c,{id:p.job,operation_id:p.operation,project_id:p.id}));
    const context:any=(await pool.query(`SELECT * FROM technology_selection_contexts WHERE id=$1`,[result.contextId])).rows[0];
    assert.equal(context.status,'READY'); assert.equal(context.technology_catalog_revision_id,catalog.revisionId); assert.ok(context.actor); assert.equal(context.correlation_id,p.correlation);
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[p.id])).rows[0].state,'TECHNOLOGY_BASELINE_IN_REVIEW');
    const inventory=await withTransaction(c=>startTechnologyInventory(c,p.id,`f5-09-to-f5-08:${p.id}`));
    assert.equal(inventory.status,'ACCEPTED');
    const artifact:any=(await pool.query(`SELECT storage_uri FROM artifacts WHERE project_id=$1 AND artifact_type='technology-selection-context'`,[p.id])).rows[0]; const evidence=JSON.parse(readFileSync(new URL(artifact.storage_uri),'utf8')); assert.equal(evidence.selection_context_id,context.id); assert.equal(evidence.hash,context.hash); assert.equal(evidence.actor,context.actor); assert.ok(evidence.profile_items.length>0);
    const itemId=(await pool.query(`SELECT catalog_item_id FROM technology_catalog_revision_profile_items WHERE revision_id=$1 AND profile_id=$2 LIMIT 1`,[catalog.revisionId,context.technology_profile_id])).rows[0].catalog_item_id;
    t.after(async()=>{await pool.query(`UPDATE technology_profiles SET is_active=true WHERE id=$1`,[context.technology_profile_id]);await pool.query(`UPDATE technology_catalog_items SET is_active=true WHERE id=$1`,[itemId]);});
    await pool.query(`UPDATE technology_profiles SET is_active=false WHERE id=$1`,[context.technology_profile_id]); await pool.query(`UPDATE technology_catalog_items SET is_active=false WHERE id=$1`,[itemId]);
    assert.equal((await pool.query(`SELECT technology_catalog_revision_id,technology_profile_id,hash,status FROM technology_selection_contexts WHERE id=$1`,[context.id])).rows[0].hash,context.hash);
  });

  test('rejects invalid state and leaves no partial context', async t => {
    await publish(); const p=await setup('TECHNOLOGY_BASELINE_IN_REVIEW'); t.after(()=>cleanup(p.id));
    await assert.rejects(()=>withTransaction(c=>prepareTechnologySelectionContext(c,{operation_id:p.operation,project_id:p.id})),/TECHNOLOGY_SELECTION_CONTEXT_STATE_INVALID/);
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM technology_selection_contexts WHERE project_key=$1`,[p.id])).rows[0].n),0);
  });
}
