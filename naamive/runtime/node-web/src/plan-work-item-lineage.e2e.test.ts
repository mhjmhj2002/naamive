import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('PlanWorkItem lineage requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  const {pool}=await import('./db.js');
  const cleanup=async(project:string)=>{
    await pool.query(`DELETE FROM events WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM artifacts WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM work_item_scheduling_decisions WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM jobs WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM deliveries WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM worktrees WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM operations WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM work_items WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM module_plan_revisions WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)`,[project]);
    await pool.query(`DELETE FROM modules WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM module_revisions WHERE project_id=$1`,[project]);
    await pool.query(`DELETE FROM projects WHERE id=$1`,[project]);
  };

  for(const row of (await pool.query(`SELECT id FROM projects WHERE title='Plan lineage E2E'`)).rows)await cleanup(row.id);

  test('PlanWorkItem materialization is validated, immutable, unique and concurrency-safe while legacy remains compatible',async t=>{
    const project=randomUUID(),revision=randomUUID(),otherRevision=randomUUID(),module=randomUUID(),round=randomUUID(),otherRound=randomUUID(),plan=randomUUID(),otherPlan=randomUUID();
    t.after(async()=>{await cleanup(project);await pool.end();});
    const hash=(seed:string)=>seed.padEnd(64,seed[0]??'a').slice(0,64).replace(/[^a-f0-9]/g,'a');
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'Plan lineage E2E','owner','test','/tmp','local','main','base','{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`,[project]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'lineage',1,'{}','APPROVED'),($3,$2,'lineage',2,'{}','APPROVED')`,[revision,project,otherRevision]);
    await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'lineage',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`,[module,project,revision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE'),($4,$2,$5,2,'WORK_ITEMS_ACTIVE')`,[round,module,revision,otherRound,otherRevision]);
    await pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES
      ($1,$2,$3,1,$4,$5,$6,$6,$6,'test','APPROVED','WORK_ITEM_DELIVERY',2),
      ($7,$2,$3,2,$4,$8,$9,$9,$9,'test','APPROVED','WORK_ITEM_DELIVERY',2)`,[plan,project,module,revision,{work_items:[{work_item_id:'a'},{work_item_id:'b'},{work_item_id:'c'}]},hash('a'),otherPlan,{work_items:[{work_item_id:'x'}]},hash('b')]);

    const insert=(id:string,logical:string,linkedPlan=plan,linkedRevision=revision,linkedRound=round,version=2)=>pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'WORK_ITEM_DELIVERY',$9,$10,$11)`,[id,project,module,linkedRevision,linkedRound,`WI ${logical}`,{work_item_id:logical,plan_revision_id:linkedPlan},version===2?'ELIGIBLE_FOR_DISPATCH':'WAITING_FOR_WORK_ITEM_AUTHORIZATION',version,version===2?linkedPlan:null,version===2?logical:null]);

    const a=randomUUID();await insert(a,'a');
    await assert.rejects(pool.query(`UPDATE work_items SET plan_work_item_id='c' WHERE id=$1`,[a]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE work_items SET module_plan_revision_id=$2 WHERE id=$1`,[a,otherPlan]),(error:any)=>error.code==='23514');
    await assert.rejects(pool.query(`UPDATE work_items SET revision_id=$2,round_id=$3 WHERE id=$1`,[a,otherRevision,otherRound]),(error:any)=>error.code==='23514');
    await pool.query(`UPDATE work_items SET payload=jsonb_set(payload,'{work_item_id}','"x"'::jsonb) WHERE id=$1`,[a]);
    assert.deepEqual((await pool.query(`SELECT plan_work_item_id,payload->>'work_item_id' payload_id FROM work_items WHERE id=$1`,[a])).rows[0],{plan_work_item_id:'a',payload_id:'x'});

    await assert.rejects(insert(randomUUID(),'x'),(error:any)=>error.code==='23514','identity absent from linked plan');
    await assert.rejects(insert(randomUUID(),'a',otherPlan),(error:any)=>error.code==='23514','identity exists only in another plan');
    await assert.rejects(insert(randomUUID(),'a',plan,otherRevision,otherRound),(error:any)=>error.code==='23514','wrong module revision');
    await assert.rejects(insert(randomUUID(),'a',plan,revision,otherRound),(error:any)=>error.code==='23514','wrong round lineage');

    const concurrent=await Promise.allSettled([insert(randomUUID(),'b'),insert(randomUUID(),'b')]);
    assert.equal(concurrent.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(concurrent.filter(result=>result.status==='rejected'&&(result.reason as any).code==='23505').length,1);
    await assert.rejects(insert(randomUUID(),'b'),(error:any)=>error.code==='23505','duplicate materialization');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_items WHERE module_plan_revision_id=$1 AND revision_id=$2 AND round_id=$3 AND plan_work_item_id='b'`,[plan,revision,round])).rows[0].n),1);

    const legacy=randomUUID();await insert(legacy,'legacy',plan,revision,round,1);
    assert.deepEqual((await pool.query(`SELECT module_plan_revision_id,plan_work_item_id FROM work_items WHERE id=$1`,[legacy])).rows[0],{module_plan_revision_id:null,plan_work_item_id:null});
  });
}
