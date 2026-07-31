import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) test('product discovery acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-discovery-e2e-artifacts';
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp'; process.env.NAAMIVE_OPERATOR_ID ??= 'discovery-test-operator'; process.env.NAAMIVE_AGENT_ADAPTER='controlled';
  const { pool }=await import('./db.js'); const { startProductDiscovery,projectDetail }=await import('./service.js'); const { runOnce }=await import('./worker.js');
  const projectId=`discovery-e2e-${randomUUID().slice(0,8)}`,revisionId=randomUUID();
  const payload={title:'Descoberta',business_owner:'Operações',business_problem:'Processo manual',desired_outcome:'Processo visível',success_metrics:['Acompanhar'],stakeholders:['Operações'],known_constraints:['Nenhuma'],evidence_sources:['Teste'],assumptions:['Uso diário'],open_questions:['Nenhuma']};
  const cleanup=async()=>{for(const table of ['events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[projectId]);await pool.query('DELETE FROM projects WHERE id=$1',[projectId]);await pool.end();};
  test('controlled discovery reaches commitment and returns to requirements on adjustment',async t=>{
    t.after(cleanup);
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','000','REGISTERED',$4)`,[projectId,payload.title,payload.business_owner,payload]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`,[revisionId,projectId,payload,'a'.repeat(64),'b'.repeat(64)]);
    const accepted=await startProductDiscovery(projectId,`discovery-${projectId}`); assert.equal(accepted.status,'ACCEPTED');
    let detail:any; let jobs:any[]=[];
    for(let i=0;i<60;i++) { await runOnce(); detail=await projectDetail(projectId); jobs=(await pool.query(`SELECT kind,status,last_error FROM jobs WHERE project_id=$1 ORDER BY available_at`,[projectId])).rows; if(detail.state==='WAITING_FOR_PRODUCT_COMMITMENT') break; if(jobs.some(job=>job.status==='FAILED')) break; }
    assert.equal(detail.state,'WAITING_FOR_PRODUCT_COMMITMENT',JSON.stringify(jobs)); assert.equal(detail.gate.kind,'PRODUCT_COMMITMENT');
    assert.equal(detail.artifacts.filter((a:any)=>a.artifact_type.startsWith('product-')&&!a.artifact_type.endsWith('-markdown')).length,3); assert.equal(detail.artifacts.filter((a:any)=>a.artifact_type.endsWith('-markdown')).length,3);
    const { createApiServer }=await import('./server.js'); const server=createApiServer(); await new Promise<void>(ok=>server.listen(0,'127.0.0.1',ok)); const address=server.address() as import('node:net').AddressInfo;
    const response=await fetch(`http://127.0.0.1:${address.port}/api/projects/${projectId}/decision`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({decision:'REJECTED',gate_id:detail.gate.id,version:detail.gate.version,feedback:'Detalhar restrições'})}); server.close(); assert.equal(response.status,200);
    detail=await projectDetail(projectId); assert.equal(detail.state,'REQUIREMENTS_IN_PROGRESS');
  });
}
