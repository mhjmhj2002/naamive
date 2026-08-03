import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) test('product discovery acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-discovery-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp'; process.env.NAAMIVE_OPERATOR_ID ??= 'discovery-test-operator'; process.env.NAAMIVE_AGENT_ADAPTER='controlled';
  const { pool }=await import('./db.js'); const { applyReviewAdjustments,retryProductDiscovery,startProductDiscovery,projectDetail }=await import('./service.js'); const { runOnce }=await import('./worker.js');
  const projectId=`discovery-e2e-${randomUUID().slice(0,8)}`,revisionId=randomUUID();
  const payload={title:'Descoberta',business_owner:'Operações',business_problem:'Processo manual',desired_outcome:'Processo visível',success_metrics:['Acompanhar'],stakeholders:['Operações'],known_constraints:['Nenhuma'],evidence_sources:['Teste'],assumptions:['Uso diário'],open_questions:['Nenhuma']};
  const cleanup=async()=>{for(const table of ['events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[projectId]);await pool.query('DELETE FROM projects WHERE id=$1',[projectId]);};
  test.after(async()=>pool.end());
  test('controlled discovery waits for an operator adjustment before restarting requirements',async t=>{
    t.after(cleanup);
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','REGISTERED',$4)`,[projectId,payload.title,payload.business_owner,payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`,[revisionId,projectId,payload,'a'.repeat(64),'b'.repeat(64)]);
    const accepted=await startProductDiscovery(projectId,`discovery-${projectId}`); assert.equal(accepted.status,'ACCEPTED');
    let detail:any; let jobs:any[]=[];
    for(let i=0;i<60;i++) { await runOnce(); detail=await projectDetail(projectId); jobs=(await pool.query(`SELECT kind,status,last_error FROM jobs WHERE project_id=$1 ORDER BY available_at`,[projectId])).rows; if(detail.state==='WAITING_FOR_PRODUCT_COMMITMENT') break; if(jobs.some(job=>job.status==='FAILED')) break; }
    assert.equal(detail.state,'WAITING_FOR_PRODUCT_COMMITMENT',JSON.stringify(jobs)); assert.equal(detail.gate.kind,'PRODUCT_COMMITMENT'); assert.equal(detail.gate.evidence.evidence.length,3);
    assert.equal(detail.artifacts.filter((a:any)=>a.artifact_type.startsWith('product-')&&!a.artifact_type.endsWith('-markdown')).length,3); assert.equal(detail.artifacts.filter((a:any)=>a.artifact_type.endsWith('-markdown')).length,3);
    const { createApiServer }=await import('./server.js'); const server=createApiServer(); await new Promise<void>(ok=>server.listen(0,'127.0.0.1',ok)); const address=server.address() as import('node:net').AddressInfo;
    const readiness=await fetch(`http://127.0.0.1:${address.port}/api/agent/readiness`,{method:'POST'}); assert.equal(readiness.status,200); assert.equal((await readiness.json()).ready,true);
    const response=await fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'REJECTED',gate_id:detail.gate.id,version:detail.gate.version,feedback:'Detalhar restrições'})}); server.close(); assert.equal(response.status,200);
    detail=await projectDetail(projectId); assert.equal(detail.state,'REQUIREMENTS_IN_PROGRESS');
    process.env.NAAMIVE_CONTROLLED_REVIEW_RESULT='REQUIRES_ADJUSTMENT'; await runOnce(); await runOnce(); delete process.env.NAAMIVE_CONTROLLED_REVIEW_RESULT;
    detail=await projectDetail(projectId); assert.equal(detail.state,'WAITING_FOR_REVIEW_ADJUSTMENT');
    let reworkJobs=await pool.query(`SELECT kind,status,idempotency_key FROM jobs WHERE project_id=$1 AND kind='DEFINE_PRODUCT_REQUIREMENTS' ORDER BY available_at`,[projectId]); assert.equal(reworkJobs.rows.length,2); assert.equal(reworkJobs.rows.filter((job:any)=>job.status==='COMPLETED').length,2);
    const rework=await applyReviewAdjustments(projectId,{feedback:'Detalhar grupo prioritário'},`operator-rework-${projectId}`); assert.equal(rework.status,'ACCEPTED'); detail=await projectDetail(projectId); assert.equal(detail.state,'REQUIREMENTS_IN_PROGRESS');
    reworkJobs=await pool.query(`SELECT kind,status,idempotency_key FROM jobs WHERE project_id=$1 AND kind='DEFINE_PRODUCT_REQUIREMENTS' ORDER BY available_at`,[projectId]); assert.equal(reworkJobs.rows.length,3); assert.equal(reworkJobs.rows.at(-1)?.status,'PENDING'); assert.equal(new Set(reworkJobs.rows.map((job:any)=>job.idempotency_key)).size,3); await runOnce(); await runOnce(); detail=await projectDetail(projectId); assert.equal(detail.state,'WAITING_FOR_PRODUCT_COMMITMENT'); assert.equal(detail.gate.evidence.evidence.length,3);
  });
  test('registration keeps intake workflow until discovery starts and rejects invalid workflow states',async t=>{
    const id=`registration-e2e-${randomUUID().slice(0,8)}`, revisionId=randomUUID(), gateId=randomUUID();
    t.after(async()=>{for(const table of ['events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[id]);await pool.query('DELETE FROM projects WHERE id=$1',[id]);});
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','PROJECT_INTAKE',1,'WAITING_FOR_REGISTRATION',$4)`,[id,payload.title,payload.business_owner,payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`,[revisionId,id,payload,'a'.repeat(64),'b'.repeat(64)]);
    await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'REGISTER_PROJECT',$3)`,[gateId,id,revisionId]);
    const { createApiServer }=await import('./server.js'); const server=createApiServer(); await new Promise<void>(ok=>server.listen(0,'127.0.0.1',ok)); const address=server.address() as import('node:net').AddressInfo;
    try { const response=await fetch(`http://127.0.0.1:${address.port}/api/projects/${id}/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'APPROVED',gate_id:gateId,version:1,feedback:''})}); assert.equal(response.status,200); const registered=await pool.query('SELECT workflow_code,state FROM projects WHERE id=$1',[id]); assert.deepEqual(registered.rows[0],{workflow_code:'PROJECT_INTAKE',state:'REGISTERED'}); await startProductDiscovery(id,`discovery-${id}`); const discovery=await pool.query('SELECT workflow_code,state FROM projects WHERE id=$1',[id]); assert.deepEqual(discovery.rows[0],{workflow_code:'PROJECT_DISCOVERY',state:'ANALYSIS_IN_PROGRESS'}); }
    finally { server.close(); }
    await assert.rejects(pool.query(`UPDATE projects SET state='WAITING_FOR_REGISTRATION' WHERE id=$1`,[id]),(error:any)=>error.code==='23514');
  });
  test('projects a configuration failure and retries discovery from its failed stage',async t=>{
    const id=`retry-e2e-${randomUUID().slice(0,8)}`,revisionId=randomUUID(),failedOperation=randomUUID(),failedJob=randomUUID();
    t.after(async()=>{for(const table of ['events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[id]);await pool.query('DELETE FROM projects WHERE id=$1',[id]);});
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','PROJECT_DISCOVERY',1,'REQUIREMENTS_IN_PROGRESS',$4)`,[id,payload.title,payload.business_owner,payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`,[revisionId,id,payload,'a'.repeat(64),'b'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','QUEUED',$3,$4,$5)`,[failedOperation,id,`failed-${id}`,randomUUID(),revisionId]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'DEFINE_PRODUCT_REQUIREMENTS',$5)`,[failedJob,failedOperation,id,revisionId,`failed-job-${id}`]);
    process.env.NAAMIVE_AGENT_ADAPTER='codex'; process.env.NAAMIVE_CODEX_WORKDIR=`/tmp/naamive-missing-${randomUUID()}`; for(let attempt=0;attempt<3;attempt++){await runOnce();await pool.query(`UPDATE jobs SET available_at=now() WHERE id=$1 AND status='RETRYABLE'`,[failedJob]);}
    const failed=await pool.query('SELECT state,failure_stage,failure_code FROM projects WHERE id=$1',[id]); assert.deepEqual(failed.rows[0],{state:'DISCOVERY_FAILED',failure_stage:'DEFINE_PRODUCT_REQUIREMENTS',failure_code:'CODEX_WORKDIR_NOT_READY'});
    process.env.NAAMIVE_AGENT_ADAPTER='controlled'; const accepted=await retryProductDiscovery(id,`retry-${id}`); assert.equal(accepted.status,'ACCEPTED'); const retried=await pool.query('SELECT state,failure_stage,failure_code FROM projects WHERE id=$1',[id]); assert.deepEqual(retried.rows[0],{state:'REQUIREMENTS_IN_PROGRESS',failure_stage:null,failure_code:null}); const retriedJob=await pool.query(`SELECT kind,status FROM jobs WHERE operation_id=$1`,[accepted.operation_id]); assert.deepEqual(retriedJob.rows[0],{kind:'DEFINE_PRODUCT_REQUIREMENTS',status:'PENDING'}); const audit=await pool.query(`SELECT event_type,payload->>'stage' stage FROM events WHERE project_id=$1 ORDER BY id DESC LIMIT 1`,[id]); assert.deepEqual(audit.rows[0],{event_type:'PRODUCT_DISCOVERY_RETRY_ACCEPTED',stage:'DEFINE_PRODUCT_REQUIREMENTS'});
  });
}
