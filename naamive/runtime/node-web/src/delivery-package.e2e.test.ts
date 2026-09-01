import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) {
  test('GAT-02 delivery package PostgreSQL proof requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { decideDeliveryAcceptance, materializeDeliveryPackage, openDeliveryAcceptanceGate, persistDeliveryPreparationOutputs, prepareDeliveryPackage, reconcileDeliveryLifecycle } = await import('./delivery-lifecycle.js');

  type Fixture={project:string; module:string; extra:string; cleanup:()=>Promise<void>};
  const outputs={release_evidence:[{hash:'release-evidence'}],operation_evidence:[{hash:'operation-evidence'}],handover_evidence:[{hash:'handover-evidence'}],artifact_references:[{hash:'final-artifact'}]};
  const fixture=async():Promise<Fixture>=>{
    const project=`gat02-package-${randomUUID().slice(0,12)}`, intake=randomUUID(), commitment=randomUUID(), requirements=randomUUID(), review=randomUUID(), module=randomUUID(), extra=randomUUID(), revision=randomUUID(), extraRevision=randomUUID(), obligation=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'GAT-02 package','owner','test','/tmp','local','main','000','PROJECT_DISCOVERY',4,'DELIVERY','{}')`,[project]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','test')`,[intake,project,'a'.repeat(64),'b'.repeat(64)]);
    await pool.query(`INSERT INTO artifacts(id,project_id,artifact_type,storage_uri,storage_key,sha256,schema_version) VALUES
      ($1::uuid,$3,'product-requirements','file:///tmp/requirements',$1,$4,1),($2::uuid,$3,'product-commitment-review','file:///tmp/review',$2,$5,1)`,[requirements,review,project,'c'.repeat(64),'d'.repeat(64)]);
    await pool.query(`INSERT INTO product_commitment_revisions(id,project_id,revision_number,logical_round,contract_version,status,source_intake_revision_id,source_requirements_artifact_id,source_requirements_sha256,source_review_artifact_id,source_review_sha256,canonical_sha256,creation_idempotency_key,approved_at,created_by)
      VALUES($1,$2,1,1,'PRODUCT_COMMITMENT_MODULES:v1','APPROVED',$3,$4,$5,$6,$7,$8,$9,clock_timestamp(),'test')`,[commitment,project,intake,requirements,'c'.repeat(64),review,'d'.repeat(64),'e'.repeat(64),`commitment:${project}`]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'delivery-module',1,'{}','APPROVED'),($3,$2,'non-participant',1,'{}','APPROVED')`,[revision,project,extraRevision]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'delivery-module',$3,'READY_FOR_DELIVERY','MODULE_DELIVERY',2),($4,$2,'non-participant',$5,'READY_FOR_DELIVERY','MODULE_DELIVERY',2)`,[module,project,revision,extra,extraRevision]);
    await pool.query(`INSERT INTO committed_module_obligations(id,project_id,module_key,generation,required,materialized_module_id,materialized_module_revision_id,introduced_by_revision_id,last_present_revision_id) VALUES($1,$2,'delivery-module',1,true,$3,$4,$5,$5)`,[obligation,project,module,revision,commitment]);
    // AUT-03 deliberately makes dispatch snapshots non-deletable audit
    // evidence. Focused integration rows therefore remain in the disposable
    // PostgreSQL test database, like the existing AUT-03 acceptance proofs.
    const cleanup=async()=>{};
    return {project,module,extra,cleanup};
  };
  const prepared=async(f:Fixture)=>{const snapshot:any=await prepareDeliveryPackage(f.project,`prepare:${f.project}`);const persisted:any=await persistDeliveryPreparationOutputs(snapshot.id,outputs);const pkg:any=await materializeDeliveryPackage(snapshot.id);return {snapshot,persisted,pkg};};
  const technical=async(pkg:any)=>{const id=randomUUID();await pool.query(`INSERT INTO delivery_technical_acceptances(id,package_id,content_hash,delivery_revision,normative_generation,state,acceptance_key) VALUES($1,$2,$3,$4,$5,'ACCEPTED',$6)`,[id,pkg.id,pkg.content_hash,pkg.delivery_revision,pkg.normative_generation,`test-technical:${pkg.id}`]);return id;};

  test('GAT-02 persists frozen preparation, outputs and a deterministic immutable package',async t=>{
    const f=await fixture();t.after(f.cleanup);
    const first=await prepared(f), replay:any=await prepareDeliveryPackage(f.project,`prepare:${f.project}`);
    assert.equal(replay.id,first.snapshot.id);assert.match(first.snapshot.preparation_key,/^delivery-preparation:v1:/);assert.match(first.snapshot.normative_generation,/^[a-f0-9]{64}$/);assert.match(first.snapshot.input_hash,/^[a-f0-9]{64}$/);
    assert.equal((await pool.query(`SELECT subject_kind,subject_id,idempotency_key FROM delivery_lifecycle_intents WHERE project_id=$1 AND kind='PREPARE_DELIVERY_PACKAGE'`,[f.project])).rows[0].subject_kind,'DeliveryPreparationSnapshot:v1');
    assert.equal((await persistDeliveryPreparationOutputs(first.snapshot.id,{...outputs,release_evidence:[{hash:'release-evidence'}]})).id,first.persisted.id);
    await assert.rejects(persistDeliveryPreparationOutputs(first.snapshot.id,{...outputs,handover_evidence:[{hash:'different'}]}),(error:any)=>error.code==='DELIVERY_OUTPUT_DIVERGENCE');
    assert.equal((await materializeDeliveryPackage(first.snapshot.id)).id,first.pkg.id);
    assert.equal(first.pkg.preparation_snapshot_id,first.snapshot.id);assert.match(first.pkg.content_hash,/^[a-f0-9]{64}$/);assert.equal(first.pkg.assurance_snapshot_id,undefined);assert.equal(first.pkg.acceptance_id,undefined);
    await assert.rejects(pool.query(`UPDATE delivery_packages SET content_hash=$2 WHERE id=$1`,[first.pkg.id,'f'.repeat(64)]),(error:any)=>error.code==='23514');
  });

  test('GAT-02 opens only the exact technical acceptance and APPROVE commits every delivery consequence once',async t=>{
    const f=await fixture();t.after(f.cleanup);const {pkg}=await prepared(f);const acceptance=await technical(pkg);const gate:any=await openDeliveryAcceptanceGate(pkg.id);
    assert.equal(gate.evidence.package_id,pkg.id);assert.equal(gate.evidence.content_hash,pkg.content_hash);assert.equal(gate.evidence.acceptance_id,acceptance);
    const input={version:Number(gate.version),decision:'APPROVE' as const,reason:'business accepted',evidence:{handover:'verified'},actor_id:'business-owner',actor_role:'BUSINESS_OWNER',idempotency_key:`approve:${pkg.id}`};
    const result:any=await decideDeliveryAcceptance(f.project,gate.id,input), replay:any=await decideDeliveryAcceptance(f.project,gate.id,input);
    assert.equal(result.operation_id,replay.operation_id);assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[f.project])).rows[0].state,'DELIVERED');assert.equal((await pool.query(`SELECT state FROM modules WHERE id=$1`,[f.module])).rows[0].state,'DELIVERED');assert.equal((await pool.query(`SELECT state FROM modules WHERE id=$1`,[f.extra])).rows[0].state,'READY_FOR_DELIVERY');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM committed_module_obligations WHERE project_id=$1 AND delivery_package_id=$2 AND delivered_at IS NOT NULL`,[f.project,pkg.id])).rows[0].n),1);assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM operations WHERE project_id=$1 AND kind='DELIVERY_TRANSITION'`,[f.project])).rows[0].n),1);assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM gate_decisions WHERE gate_id=$1`,[gate.id])).rows[0].n),1);
  });

  test('GAT-02 fences a frozen package after authoritative required-set change and reconciles outputs exactly once',async t=>{
    const f=await fixture();t.after(f.cleanup);const snapshot:any=await prepareDeliveryPackage(f.project,`prepare:${f.project}`);await persistDeliveryPreparationOutputs(snapshot.id,outputs);await reconcileDeliveryLifecycle();const pkg=(await pool.query(`SELECT * FROM delivery_packages WHERE preparation_snapshot_id=$1`,[snapshot.id])).rows[0];assert.ok(pkg);await reconcileDeliveryLifecycle();assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM delivery_packages WHERE preparation_snapshot_id=$1`,[snapshot.id])).rows[0].n),1);
    await technical(pkg);await pool.query(`UPDATE delivery_packages SET stale_at=clock_timestamp(),stale_reason='TEST_AUTHORITATIVE_REVISION_CHANGED' WHERE id=$1`,[pkg.id]);
    await assert.rejects(openDeliveryAcceptanceGate(pkg.id),(error:any)=>error.code==='STALE_DELIVERY_PACKAGE');assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[f.project])).rows[0].state,'DELIVERY');
  });

  test('GAT-02 REWORK preserves history, rejects empty findings, and prevents old package delivery',async t=>{
    const f=await fixture();t.after(f.cleanup);const {pkg}=await prepared(f);await technical(pkg);const gate:any=await openDeliveryAcceptanceGate(pkg.id);
    const empty={version:Number(gate.version),decision:'REWORK' as const,reason:'needs work',evidence:{},actor_id:'business-owner',actor_role:'BUSINESS_OWNER',idempotency_key:`rework-empty:${pkg.id}`};await assert.rejects(decideDeliveryAcceptance(f.project,gate.id,empty),(error:any)=>error.code==='DELIVERY_REWORK_FINDING_REQUIRED');
    const input={...empty,evidence:{finding:'handover incomplete'},idempotency_key:`rework:${pkg.id}`};assert.equal((await decideDeliveryAcceptance(f.project,gate.id,input)).state,'VALIDATION');assert.equal((await decideDeliveryAcceptance(f.project,gate.id,input)).state,'VALIDATION');assert.equal((await pool.query(`SELECT stale_reason FROM delivery_packages WHERE id=$1`,[pkg.id])).rows[0].stale_reason,'DELIVERY_REWORK');assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`,[f.project])).rows[0].state,'VALIDATION');assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM gate_decisions WHERE gate_id=$1`,[gate.id])).rows[0].n),1);
    await assert.rejects(decideDeliveryAcceptance(f.project,gate.id,{...input,decision:'APPROVE',idempotency_key:`approve-old:${pkg.id}`}),(error:any)=>error.code==='DELIVERY_TRANSITION_NOT_ALLOWED'||error.code==='GATE_VERSION_CONFLICT');
  });
}
