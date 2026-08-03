import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if (!process.env.DATABASE_URL) test('archive acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-archive-e2e-artifacts'; process.env.NAAMIVE_REPOSITORY_ROOTS ??= '/tmp'; process.env.NAAMIVE_OPERATOR_ID ??= 'archive-test-operator';
  const { pool }=await import('./db.js'); const { archiveProject,listProjects }=await import('./service.js');
  const make=async(state:string,gate=false,workflow='PROJECT_DISCOVERY')=>{const projectId=`archive-e2e-${randomUUID().slice(0,8)}`,revisionId=randomUUID(),operationId=randomUUID(),jobId=randomUUID(); const draft={title:'Arquivar',business_owner:'Operações'};
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,$2,$3,'test','/tmp','test://origin','main','000',$4,1,$5,$6)`,[projectId,draft.title,draft.business_owner,workflow,state,draft]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,$3,$4,$5,'file:///tmp/intake','test')`,[revisionId,projectId,draft,'a'.repeat(64),'b'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'PRODUCT_DISCOVERY','RUNNING',$3,$4,$5)`,[operationId,projectId,`archive-op-${operationId}`,randomUUID(),revisionId]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key) VALUES($1,$2,$3,$4,'ANALYZE_PRODUCT_NEED','LEASED',$5)`,[jobId,operationId,projectId,revisionId,`archive-job-${jobId}`]);
    if(gate) await pool.query(`INSERT INTO gates(id,project_id,kind,revision_id) VALUES($1,$2,'PRODUCT_COMMITMENT',$3)`,[randomUUID(),projectId,revisionId]); return {projectId,revisionId,operationId,jobId};};
  const cleanup=async(id:string)=>{for(const table of ['events','artifacts','artifact_intents','gates','jobs','operations','intake_revisions'])await pool.query(`DELETE FROM ${table} WHERE project_id=$1`,[id]);await pool.query('DELETE FROM projects WHERE id=$1',[id]);};
  test('archives during a job, a gate and intake registration with immutable audit evidence',async t=>{const job=await make('ANALYSIS_IN_PROGRESS');const gate=await make('WAITING_FOR_PRODUCT_COMMITMENT',true);const intakeGate=await make('WAITING_FOR_REGISTRATION',false,'PROJECT_INTAKE');t.after(async()=>{await cleanup(job.projectId);await cleanup(gate.projectId);await cleanup(intakeGate.projectId);await pool.end();});
    for(const item of [job,gate,intakeGate]){const result=await archiveProject(item.projectId,{confirmed:true,reason:'Projeto de teste encerrado'});assert.equal(result.state,'ARCHIVED');const p=await pool.query('SELECT state,archived_by,archive_reason,archived_from_state FROM projects WHERE id=$1',[item.projectId]);assert.equal(p.rows[0].state,'ARCHIVED');assert.equal(p.rows[0].archived_by,process.env.NAAMIVE_OPERATOR_ID);const j=await pool.query('SELECT status FROM jobs WHERE id=$1',[item.jobId]);assert.equal(j.rows[0].status,'FAILED');const events=await pool.query('SELECT event_type FROM events WHERE project_id=$1 ORDER BY id',[item.projectId]);assert.deepEqual(events.rows.map(x=>x.event_type),['PROJECT_ARCHIVING','PROJECT_ARCHIVED']);const a=await pool.query(`SELECT storage_key FROM artifacts WHERE project_id=$1 AND artifact_type='archive-record'`,[item.projectId]);assert.equal(a.rows[0].storage_key,`archive/projects/${item.projectId}/archive-record.json`);}
    assert.ok(!(await listProjects()).some(p=>p.id===job.projectId)); assert.ok((await listProjects(true)).some(p=>p.id===job.projectId));
  });
}
