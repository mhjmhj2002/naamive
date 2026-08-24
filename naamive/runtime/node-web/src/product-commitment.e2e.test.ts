import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('LR-02A requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  const {pool,withTransaction}=await import('./db.js');
  const {createProductCommitmentRevision,decideProductCommitmentGate}=await import('./product-commitment.js');
  const {createApiServer}=await import('./server.js');
  const {testAuthenticatedHeaders}=await import('./test-auth.js');
  const {persistDiscoveryAgentOutcome}=await import('./discovery-agent-jobs.js');

  const fixture=async(label:string)=>{
    const projectId=randomUUID(),intakeId=randomUUID(),requirementsId=randomUUID(),reviewId=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,'owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',4,'DEFINITION','{}')`,[projectId,label]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,$5,'tester')`,[intakeId,projectId,randomUUID().replaceAll('-','').padEnd(64,'0').slice(0,64),randomUUID().replaceAll('-','').padEnd(64,'1').slice(0,64),`file:///tmp/${intakeId}`]);
    const artifact=async(id:string,type:string,hash:string)=>pool.query(`INSERT INTO artifacts(id,project_id,artifact_type,storage_uri,storage_key,sha256,schema_version)
      VALUES($1,$2,$3,$4,$5,$6,1)`,[id,projectId,type,`file:///tmp/${id}`,`lr02a/${projectId}/${id}`,hash]);
    await artifact(requirementsId,'product-requirements','a'.repeat(64));
    await artifact(reviewId,'product-commitment-review','b'.repeat(64));
    return {projectId,intakeId,requirementsId,reviewId,source:{source_intake_revision_id:intakeId,source_requirements_artifact_id:requirementsId,source_review_artifact_id:reviewId}};
  };
  const proposal=(requirementsId:string,objective='Persistir solicitações')=>({
    contract_version:'PRODUCT_COMMITMENT_MODULES:v1',
    candidate_modules:[
      {module_key:'request-api',name:'API de solicitações',objective:'Publicar o contrato de solicitações',scope:['API'],out_of_scope:['Interface'],dependencies:['request-store'],acceptance_criteria:['Contrato validado'],source_evidence:{requirement_refs:['REQ-API'],artifact_refs:[]}},
      {module_key:'request-store',name:'Persistência de solicitações',objective,scope:['Schema','Repositório'],out_of_scope:[],dependencies:[],acceptance_criteria:['Constraints persistidas'],source_evidence:{requirement_refs:['REQ-STORE'],artifact_refs:[{artifact_id:requirementsId,sha256:'a'.repeat(64)}]}}
    ],
    investment_and_risks:{investment:['Entrega incremental'],risks:['Migração de dados']}
  });

  test('LR-02A persists immutable revisions, binds authorized gates and enforces lineage/concurrency in PostgreSQL',async t=>{
    const main=await fixture('LR-02A main'), concurrent=await fixture('LR-02A concurrent'), supersession=await fixture('LR-02A supersession'), other=await fixture('LR-02A other'), discovery=await fixture('LR-02A discovery');
    const first:any=await withTransaction(client=>createProductCommitmentRevision(client,main.projectId,proposal(main.requirementsId),main.source,`create:${main.projectId}`));
    assert.equal(first.status,'PENDING_APPROVAL');
    assert.equal(first.revision_number,'1');
    assert.equal(first.logical_round,'1');
    assert.equal(first.contract_version,'PRODUCT_COMMITMENT_MODULES:v1');
    assert.deepEqual(first.candidate_modules.map((module:any)=>module.module_key),['request-api','request-store']);
    const gate=(await pool.query(`SELECT * FROM gate_records WHERE id=$1`,[first.gate_record_id])).rows[0];
    assert.equal(gate.gate_code,'PRODUCT_COMMITMENT');
    assert.equal(gate.scope_type,'PROJECT');
    assert.equal(gate.scope_id,main.projectId);
    assert.equal(gate.evidence.product_commitment_revision_id,first.id);
    assert.equal(gate.evidence.canonical_sha256,first.canonical_sha256);
    assert.equal(gate.evidence.contract_version,'PRODUCT_COMMITMENT_MODULES:v1');
    assert.equal(gate.evidence.source_requirements_artifact_id,main.requirementsId);
    assert.equal(gate.evidence.source_requirements_sha256,'a'.repeat(64));
    assert.equal(gate.evidence.source_review_artifact_id,main.reviewId);
    assert.equal(gate.evidence.source_review_sha256,'b'.repeat(64));
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM gates WHERE project_id=$1`,[main.projectId])).rows[0].n,0);

    const replay:any=await withTransaction(client=>createProductCommitmentRevision(client,main.projectId,{tampered:true},main.source,`create:${main.projectId}`));
    assert.equal(replay.id,first.id);
    assert.equal(replay.canonical_sha256,first.canonical_sha256);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM product_commitment_revisions WHERE project_id=$1`,[main.projectId])).rows[0].n,1);

    const sameKeyResults=await Promise.all([
      withTransaction(client=>createProductCommitmentRevision(client,concurrent.projectId,proposal(concurrent.requirementsId),concurrent.source,`same:${concurrent.projectId}`)),
      withTransaction(client=>createProductCommitmentRevision(client,concurrent.projectId,proposal(concurrent.requirementsId),concurrent.source,`same:${concurrent.projectId}`))
    ]);
    assert.equal(sameKeyResults[0].id,sameKeyResults[1].id);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM product_commitment_revisions WHERE project_id=$1`,[concurrent.projectId])).rows[0].n,1);
    await assert.rejects(()=>withTransaction(client=>createProductCommitmentRevision(client,concurrent.projectId,proposal(concurrent.requirementsId,'Outro conteúdo'),concurrent.source,`different:${concurrent.projectId}`)),/PRODUCT_COMMITMENT_APPROVAL_PENDING/);
    const crossProjectEvidence=proposal(other.requirementsId);crossProjectEvidence.candidate_modules[1].source_evidence.artifact_refs=[{artifact_id:main.requirementsId,sha256:'a'.repeat(64)}];
    await assert.rejects(()=>withTransaction(client=>createProductCommitmentRevision(client,other.projectId,crossProjectEvidence,other.source,`cross-project:${other.projectId}`)),/PRODUCT_COMMITMENT_SOURCE_EVIDENCE_INVALID/);

    const supersededInitial:any=await withTransaction(client=>createProductCommitmentRevision(client,supersession.projectId,proposal(supersession.requirementsId),supersession.source,`initial:${supersession.projectId}`));
    await decideProductCommitmentGate(supersession.projectId,supersededInitial.gate_record_id,{version:1,decision:'REWORK',reason:'Nova rodada necessária.',evidence:{feedback:'Revisar.'},actor_id:'test-business-owner',actor_role:'BUSINESS_OWNER',idempotency_key:`reject:${supersession.projectId}`});
    const successorRace=await Promise.allSettled([
      withTransaction(client=>createProductCommitmentRevision(client,supersession.projectId,proposal(supersession.requirementsId,'Conteúdo A'),supersession.source,`successor-a:${supersession.projectId}`)),
      withTransaction(client=>createProductCommitmentRevision(client,supersession.projectId,proposal(supersession.requirementsId,'Conteúdo B'),supersession.source,`successor-b:${supersession.projectId}`))
    ]);
    assert.equal(successorRace.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(successorRace.filter(result=>result.status==='rejected').length,1);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM product_commitment_revisions WHERE project_id=$1 AND status='PENDING_APPROVAL'`,[supersession.projectId])).rows[0].n,1);
    assert.equal((await pool.query(`SELECT status FROM product_commitment_revisions WHERE id=$1`,[supersededInitial.id])).rows[0].status,'SUPERSEDED');

    const discoveryOperation=randomUUID(),requirementsJob=randomUUID(),reviewJob=randomUUID();
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,'PRODUCT_DISCOVERY','RUNNING',$3,$4,$5,'PROJECT_DISCOVERY',4)`,[discoveryOperation,discovery.projectId,`discovery:${discovery.projectId}`,randomUUID(),discovery.intakeId]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'DEFINE_PRODUCT_REQUIREMENTS','COMPLETED',$5)`,[requirementsJob,discoveryOperation,discovery.projectId,discovery.intakeId,`requirements:${discovery.projectId}`]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'REVIEW_PRODUCT_COMMITMENT','LEASED',$5)`,[reviewJob,discoveryOperation,discovery.projectId,discovery.intakeId,`review:${discovery.projectId}`]);
    await pool.query(`UPDATE artifacts SET execution_id=$2 WHERE id=$1`,[discovery.requirementsId,requirementsJob]);
    await withTransaction(client=>persistDiscoveryAgentOutcome(client,{id:reviewJob,kind:'REVIEW_PRODUCT_COMMITMENT',project_id:discovery.projectId,operation_id:discoveryOperation,revision_id:discovery.intakeId},{result:'READY_FOR_GATE',evidence:{product_commitment:proposal(discovery.requirementsId)}}));
    const discovered=(await pool.query(`SELECT r.status,r.canonical_sha256,r.gate_record_id,p.state FROM product_commitment_revisions r JOIN projects p ON p.id=r.project_id WHERE r.project_id=$1`,[discovery.projectId])).rows[0];
    assert.equal(discovered.status,'PENDING_APPROVAL');
    assert.equal(discovered.state,'WAITING_FOR_PRODUCT_COMMITMENT');
    assert.ok(discovered.gate_record_id);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM gates WHERE project_id=$1`,[discovery.projectId])).rows[0].n,0);

    const session=await testAuthenticatedHeaders(main.projectId,[
      {role_code:'OPERATOR',action_code:'READ_PROJECT',project_id:main.projectId},
      {role_code:'BUSINESS_OWNER',action_code:'DECIDE_CATALOG_GATE',project_id:main.projectId,resource_type:'PROJECT',resource_id:main.projectId},
      {role_code:'OPERATOR',action_code:'READ_PROJECT',project_id:concurrent.projectId},
      {role_code:'BUSINESS_OWNER',action_code:'DECIDE_CATALOG_GATE',project_id:concurrent.projectId,resource_type:'PROJECT',resource_id:concurrent.projectId}
    ]);
    const server=createApiServer();await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    const address=server.address() as import('node:net').AddressInfo;
    const request=async(path:string,init:RequestInit={})=>fetch(`http://127.0.0.1:${address.port}${path}`,{...init,headers:{...session.headers,...(init.headers??{})}});
    t.after(async()=>{server.close();await session.cleanup();await pool.end();});

    const unauthorized=await fetch(`http://127.0.0.1:${address.port}/api/projects/${main.projectId}/product-commitments`);
    assert.equal(unauthorized.status,401);
    const projectionResponse=await request(`/api/projects/${main.projectId}/product-commitments`);
    assert.equal(projectionResponse.status,200);
    const projection:any=await projectionResponse.json();
    assert.equal(projection.items[0].id,first.id);
    assert.equal(projection.items[0].candidate_modules.length,2);

    const operatorOnly=await testAuthenticatedHeaders(main.projectId,[{role_code:'OPERATOR',action_code:'READ_PROJECT'}]);
    const forbidden=await fetch(`http://127.0.0.1:${address.port}/api/projects/${main.projectId}/catalog-gates/${first.gate_record_id}/decision`,{method:'POST',headers:{...operatorOnly.headers,'content-type':'application/json','idempotency-key':`forbidden:${main.projectId}`},body:JSON.stringify({version:1,decision:'APPROVE',reason:'Sem grant.',evidence:{acknowledged:true}})});
    assert.equal(forbidden.status,403);
    await operatorOnly.cleanup();

    const stale=await request(`/api/projects/${main.projectId}/catalog-gates/${first.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`stale:${main.projectId}`},body:JSON.stringify({version:2,decision:'REWORK',reason:'Ajustar escopo.',evidence:{feedback:'Detalhar escopo.'}})});
    assert.equal(stale.status,409);
    const tampered=await request(`/api/projects/${main.projectId}/catalog-gates/${first.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`tampered:${main.projectId}`},body:JSON.stringify({version:1,decision:'REWORK',reason:'Ajustar escopo.',evidence:{candidate_modules:[]}})});
    assert.equal(tampered.status,422);
    assert.equal((await pool.query(`SELECT status FROM product_commitment_revisions WHERE id=$1`,[first.id])).rows[0].status,'PENDING_APPROVAL');

    const rejectedResponse=await request(`/api/projects/${main.projectId}/catalog-gates/${first.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`reject:${main.projectId}`},body:JSON.stringify({version:1,decision:'REWORK',reason:'Ajustar escopo.',evidence:{feedback:'Detalhar escopo.'}})});
    assert.equal(rejectedResponse.status,202);
    const rejected:any=await rejectedResponse.json();assert.equal(rejected.status,'REJECTED');
    const second:any=await withTransaction(client=>createProductCommitmentRevision(client,main.projectId,proposal(main.requirementsId),main.source,`rework:${main.projectId}`));
    assert.equal(second.revision_number,'2');
    assert.equal(second.logical_round,'2');
    assert.equal(second.canonical_sha256,first.canonical_sha256);
    assert.equal(second.supersedes_revision_id,first.id);
    assert.equal((await pool.query(`SELECT status FROM product_commitment_revisions WHERE id=$1`,[first.id])).rows[0].status,'SUPERSEDED');

    const approvedResponse=await request(`/api/projects/${main.projectId}/catalog-gates/${second.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`approve:${main.projectId}`},body:JSON.stringify({version:1,decision:'APPROVE',reason:'Escopo e riscos aceitos.',evidence:{acknowledged:true}})});
    assert.equal(approvedResponse.status,202);
    const approved:any=await approvedResponse.json();assert.equal(approved.status,'APPROVED');assert.ok(approved.approved_at);
    const approvalReplay=await request(`/api/projects/${main.projectId}/catalog-gates/${second.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`approve:${main.projectId}`},body:JSON.stringify({version:1,decision:'APPROVE',reason:'Escopo e riscos aceitos.',evidence:{acknowledged:true}})});
    assert.equal(approvalReplay.status,202);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM gate_decisions WHERE gate_id=$1`,[second.gate_record_id])).rows[0].n,1);
    await assert.rejects(pool.query(`UPDATE product_commitment_revisions SET canonical_sha256=$2 WHERE id=$1`,[second.id,'f'.repeat(64)]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE product_commitment_modules SET payload=jsonb_set(payload,'{name}','\"Alterado\"') WHERE product_commitment_revision_id=$1`,[second.id]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE gate_records SET evidence=jsonb_set(evidence,'{canonical_sha256}','\"${'f'.repeat(64)}\"') WHERE id=$1`,[second.gate_record_id]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE gate_records SET gate_code='REGISTER_PROJECT' WHERE id=$1`,[second.gate_record_id]),(error:any)=>error.code==='23514');

    const concurrentRevision=sameKeyResults[0];
    const competing=await Promise.all([
      request(`/api/projects/${concurrent.projectId}/catalog-gates/${concurrentRevision.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`decision-a:${concurrent.projectId}`},body:JSON.stringify({version:1,decision:'APPROVE',reason:'Aprovar.',evidence:{acknowledged:true}})}),
      request(`/api/projects/${concurrent.projectId}/catalog-gates/${concurrentRevision.gate_record_id}/decision`,{method:'POST',headers:{'content-type':'application/json','idempotency-key':`decision-b:${concurrent.projectId}`},body:JSON.stringify({version:1,decision:'REWORK',reason:'Revisar.',evidence:{feedback:'Ajustar.'}})})
    ]);
    assert.deepEqual(competing.map(response=>response.status).sort(),[202,409]);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM gate_decisions WHERE gate_id=$1`,[concurrentRevision.gate_record_id])).rows[0].n,1);

    const candidate=(await pool.query(`SELECT id,module_key FROM product_commitment_modules WHERE product_commitment_revision_id=$1 AND module_key='request-store'`,[second.id])).rows[0];
    const moduleRevisionId=randomUUID(),moduleId=randomUUID(),operationId=randomUUID();
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,$3,1,'{}','DRAFT')`,[moduleRevisionId,main.projectId,candidate.module_key]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id) VALUES($1,$2,$3,$4)`,[moduleId,main.projectId,candidate.module_key,moduleRevisionId]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'MODULE_MATERIALIZATION','COMPLETED',$3,$4)`,[operationId,main.projectId,`lineage:${main.projectId}`,randomUUID()]);
    const lineageValues=[candidate.id,main.projectId,second.id,candidate.module_key,moduleId,moduleRevisionId,operationId];
    await pool.query(`INSERT INTO product_commitment_module_materializations(product_commitment_module_id,project_id,product_commitment_revision_id,module_key,module_id,module_revision_id,materialization_operation_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,lineageValues);
    await pool.query(`INSERT INTO product_commitment_module_materializations(product_commitment_module_id,project_id,product_commitment_revision_id,module_key,module_id,module_revision_id,materialization_operation_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(product_commitment_module_id) DO NOTHING`,lineageValues);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM product_commitment_module_materializations WHERE product_commitment_module_id=$1`,[candidate.id])).rows[0].n,1);
    await assert.rejects(pool.query(`INSERT INTO product_commitment_module_materializations(product_commitment_module_id,project_id,product_commitment_revision_id,module_key,module_id,module_revision_id,materialization_operation_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,[candidate.id,other.projectId,second.id,candidate.module_key,moduleId,moduleRevisionId,operationId]),(error:any)=>error.code==='23505'||error.code==='23503'||error.code==='23514');
    const otherCandidate=(await pool.query(`SELECT id,module_key,product_commitment_revision_id FROM product_commitment_modules WHERE product_commitment_revision_id=$1 ORDER BY module_key LIMIT 1`,[concurrentRevision.id])).rows[0];
    await assert.rejects(pool.query(`INSERT INTO product_commitment_module_materializations(product_commitment_module_id,project_id,product_commitment_revision_id,module_key,module_id,module_revision_id,materialization_operation_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,[otherCandidate.id,concurrent.projectId,second.id,otherCandidate.module_key,moduleId,moduleRevisionId,operationId]),(error:any)=>error.code==='23503'||error.code==='23514');

    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM modules WHERE project_id=$1`,[main.projectId])).rows[0].n,1,'only the explicit lineage constraint fixture exists; LR-02A created no module');
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM events WHERE project_id=$1 AND event_type IN ('PRODUCT_COMMITMENT_REVISION_CREATED','PRODUCT_COMMITMENT_READY_FOR_APPROVAL','PRODUCT_COMMITMENT_APPROVED','PRODUCT_COMMITMENT_REJECTED','PRODUCT_COMMITMENT_SUPERSEDED')`,[main.projectId])).rows[0].n,7);
  });
}
