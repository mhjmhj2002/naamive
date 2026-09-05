import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) {
  test('GAT-01 gate catalog requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool, withTransaction } = await import('./db.js');
  const { catalogGateProjection, decideCatalogGate, openCatalogGate } = await import('./gate-catalog.js');
  const { testAuthenticatedHeaders } = await import('./test-auth.js');
  const projectId=randomUUID();
  const opening={gate_code:'MATERIAL_ARCHITECTURE',scope_type:'MODULE',scope_id:randomUUID(),condition_code:'MATERIALITY_POLICY_MATCHED',reason:'A alteração rompe contrato público.',evidence:{policy_id:'architecture/materiality',policy_version:1,material_impacts:['contrato público'],alternatives:['mudança compatível'],affected_boundaries:['module:catalog']}};

  const clean=async()=>{
    await pool.query(`UPDATE gate_records SET decision_id=NULL WHERE project_id=$1`,[projectId]);
    await pool.query(`DELETE FROM gate_decisions WHERE gate_id IN (SELECT id FROM gate_records WHERE project_id=$1)`,[projectId]);
    await pool.query(`DELETE FROM gate_records WHERE project_id=$1`,[projectId]);
    await pool.query(`DELETE FROM events WHERE project_id=$1`,[projectId]);
    await pool.query(`DELETE FROM projects WHERE id=$1`,[projectId]);
  };

  test('GAT-01 persists catalog contracts, rejects stale/unauthorized decisions, replays idempotently and exposes escalation exits', async t => {
    t.after(async()=>{await clean(); await pool.end();});
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,'GAT-01','owner','tester','/tmp','local','main','000','REGISTERED','{}')`,[projectId]);
    const session=await testAuthenticatedHeaders(projectId,[{role_code:'OPERATOR',action_code:'READ_PROJECT'},{role_code:'TECH_LEAD',action_code:'DECIDE_CATALOG_GATE',resource_type:'MODULE',resource_id:opening.scope_id}]);
    const originalFetch=globalThis.fetch;globalThis.fetch=(input:any,init:any={})=>originalFetch(input,{...init,headers:{...session.headers,...init.headers}});t.after(async()=>{globalThis.fetch=originalFetch;await session.cleanup();});
    const gate:any=await withTransaction(client=>openCatalogGate(client,projectId,{...opening,idempotency_key:`open-${projectId}`}));
    assert.equal(gate.status,'OPEN');
    assert.equal(gate.gate_code,'MATERIAL_ARCHITECTURE');
    assert.match(gate.catalog_hash,/^[a-f0-9]{64}$/);
    assert.equal(gate.catalog_contract.condition_code,'MATERIALITY_POLICY_MATCHED');
    assert.deepEqual(gate.authority_roles,['TECH_LEAD','REPOSITORY_OWNER']);
    const { createApiServer }=await import('./server.js');
    const server=createApiServer(); await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address=server.address() as import('node:net').AddressInfo;
    try {
      const published:any=await (await fetch(`http://127.0.0.1:${address.port}/api/gate-catalog`)).json();
      assert.equal(published.version,2);
      assert.equal(published.content_hash,gate.catalog_hash);
      assert.ok(published.gates.every((item:any)=>item.condition_code&&item.required_evidence?.length&&item.authority_roles?.length&&item.decisions&&Object.values(item.decisions).every((effect:any)=>effect.consequence&&effect.continuation)));
      const projected:any=await (await fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/catalog-gates`,{headers:{'x-actor-role':'TECH_LEAD'}})).json();
      assert.deepEqual(projected.gates[0].allowed_actions,['DECIDE_GATE']);
    } finally { server.close(); }
    await assert.rejects(()=>withTransaction(client=>decideCatalogGate(client,projectId,gate.id,{version:1,decision:'APPROVE',reason:'aprovar',evidence:{review:'ok'},actor_id:'actor-1',actor_role:'BUSINESS_OWNER',idempotency_key:`wrong-role-${projectId}`})),/GATE_AUTHORITY_NOT_ALLOWED/);
    assert.equal((await pool.query(`SELECT status,version FROM gate_records WHERE id=$1`,[gate.id])).rows[0].status,'OPEN');
    await assert.rejects(()=>withTransaction(client=>decideCatalogGate(client,projectId,gate.id,{version:2,decision:'APPROVE',reason:'aprovar',evidence:{review:'ok'},actor_id:'actor-1',actor_role:'TECH_LEAD',idempotency_key:`stale-${projectId}`})),/GATE_VERSION_CONFLICT/);
    const key=`decision-${projectId}`;
    const first:any=await withTransaction(client=>decideCatalogGate(client,projectId,gate.id,{version:1,decision:'APPROVE',reason:'Impacto revisado.',evidence:{review:'approved'},actor_id:'lead-1',actor_role:'TECH_LEAD',idempotency_key:key}));
    const replay:any=await withTransaction(client=>decideCatalogGate(client,projectId,gate.id,{version:1,decision:'APPROVE',reason:'Impacto revisado.',evidence:{review:'approved'},actor_id:'lead-1',actor_role:'TECH_LEAD',idempotency_key:key}));
    assert.equal(first.status,'DECIDED');
    assert.equal(replay.id,gate.id);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM gate_decisions WHERE gate_id=$1`,[gate.id])).rows[0].n),1);
    const projection:any=await catalogGateProjection(projectId,'TECH_LEAD');
    assert.equal(projection.catalog_version,2);
    assert.match(projection.catalog_hash,/^[a-f0-9]{64}$/);
    assert.equal(projection.gates[0].decision_effects.APPROVE.next_state,'PLANNING');
    assert.deepEqual(projection.gates[0].allowed_actions,[]);

    const concurrentScope=randomUUID();
    const attempts=await Promise.allSettled([
      withTransaction(client=>openCatalogGate(client,projectId,{...opening,scope_id:concurrentScope,idempotency_key:`concurrent-a-${projectId}`})),
      withTransaction(client=>openCatalogGate(client,projectId,{...opening,scope_id:concurrentScope,idempotency_key:`concurrent-b-${projectId}`}))
    ]);
    assert.equal(attempts.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(attempts.filter(result=>result.status==='rejected').length,1);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM gate_records WHERE project_id=$1 AND scope_id=$2 AND status='OPEN'`,[projectId,concurrentScope])).rows[0].n),1);
    await assert.rejects(pool.query(`UPDATE gate_catalog_publications SET catalog='[]'::jsonb WHERE version=2`),(error:any)=>error.code==='23514');
  });
}
