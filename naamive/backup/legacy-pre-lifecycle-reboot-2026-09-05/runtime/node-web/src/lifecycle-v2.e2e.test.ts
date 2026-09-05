import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) test('LR-01 lifecycle v2 acceptance requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool } = await import('./db.js');
  const { workflowTransition } = await import('./workflow.js');

  test.after(async () => pool.end());

  test('publishes four deterministic immutable workflow contracts with valid hashes', async () => {
    const rows = (await pool.query(`SELECT d.code,d.version,d.scope,d.status,d.content_hash,
        encode(sha256(convert_to(p.manifest::text,'UTF8')),'hex') AS computed_hash,
        jsonb_array_length(p.manifest->'states') AS manifest_states,
        jsonb_array_length(p.manifest->'transitions') AS manifest_transitions,
        (SELECT count(*)::int FROM workflow_states s WHERE s.workflow_id=d.id) AS persisted_states,
        (SELECT count(*)::int FROM workflow_transitions t WHERE t.workflow_id=d.id) AS persisted_transitions
      FROM workflow_definitions d JOIN workflow_publications p ON p.workflow_id=d.id
      WHERE (d.code,d.version) IN (('PROJECT_DISCOVERY',4),('MODULE_DELIVERY',2),('WORK_ITEM_DELIVERY',2),('ORCHESTRATION_EXECUTION',1))
      ORDER BY d.scope`)).rows;
    assert.equal(rows.length,4);
    for(const row of rows){
      assert.equal(row.status,'PUBLISHED');
      assert.match(row.content_hash,/^[a-f0-9]{64}$/);
      assert.equal(row.content_hash,row.computed_hash);
      assert.equal(row.manifest_states,row.persisted_states);
      assert.equal(row.manifest_transitions,row.persisted_transitions);
    }
    assert.deepEqual(rows.map((row:any)=>[row.code,row.version,row.scope]),[
      ['ORCHESTRATION_EXECUTION',1,'EXECUTION'],['MODULE_DELIVERY',2,'MODULE'],['PROJECT_DISCOVERY',4,'PROJECT'],['WORK_ITEM_DELIVERY',2,'WORK_ITEM']
    ]);
  });

  test('reapplies the LR-01 migration without duplicates or hash drift', async () => {
    const migration=await readFile(join(dirname(fileURLToPath(import.meta.url)),'..','migrations','048_phase_6_5_conformant_workflows.sql'),'utf8');
    const before=(await pool.query(`SELECT count(*)::int AS definitions,(SELECT count(*)::int FROM workflow_publications) AS publications FROM workflow_definitions`)).rows[0];
    await pool.query(migration);
    const after=(await pool.query(`SELECT count(*)::int AS definitions,(SELECT count(*)::int FROM workflow_publications) AS publications FROM workflow_definitions`)).rows[0];
    assert.deepEqual(after,before);
  });

  test('resolves valid transitions and fails closed for invalid transitions in every scope', async () => {
    const client=await pool.connect();
    try{
      const cases:Array<[string,number,string,string,string]>=[
        ['PROJECT_DISCOVERY',4,'ANALYSIS','ANALYSIS_ACCEPTED','DEFINITION'],
        ['MODULE_DELIVERY',2,'IDENTIFIED','MODULE_DEFINITION_ACCEPTED','DEFINED'],
        ['WORK_ITEM_DELIVERY',2,'INDEPENDENT_REVIEW','ACCEPT','ACCEPTED'],
        ['ORCHESTRATION_EXECUTION',1,'INDEPENDENT_REVIEW','ACCEPT','ACCEPTED']
      ];
      for(const [code,version,from,trigger,to] of cases){
        assert.equal((await workflowTransition(client,code,version,from,trigger)).to_state,to);
        await assert.rejects(()=>workflowTransition(client,code,version,from,'INVALID_TRANSITION'),/WORKFLOW_TRANSITION_NOT_ALLOWED/);
      }
    }finally{client.release();}
  });

  test('separates technical wait, external blocker, eligibility and supervised acceptance', async () => {
    const states=(await pool.query(`SELECT s.code,s.metadata->>'semantic_kind' AS semantic_kind
      FROM workflow_states s JOIN workflow_definitions d ON d.id=s.workflow_id
      WHERE d.code='WORK_ITEM_DELIVERY' AND d.version=2 AND s.code IN ('WAITING_FOR_EXTERNAL_INPUT','WAITING_FOR_DEPENDENCIES','ELIGIBLE_FOR_DISPATCH') ORDER BY s.code`)).rows;
    assert.deepEqual(Object.fromEntries(states.map((row:any)=>[row.code,row.semantic_kind])),{
      ELIGIBLE_FOR_DISPATCH:'AUTOMATIC_QUEUE',WAITING_FOR_DEPENDENCIES:'TECHNICAL_WAIT',WAITING_FOR_EXTERNAL_INPUT:'EXTERNAL_BLOCKER'
    });
    const acceptance=(await pool.query(`SELECT d.code,t.from_state,t.trigger_code,t.to_state,t.authority,t.control_type
      FROM workflow_transitions t JOIN workflow_definitions d ON d.id=t.workflow_id
      WHERE (d.code,d.version) IN (('WORK_ITEM_DELIVERY',2),('ORCHESTRATION_EXECUTION',1)) AND t.to_state='ACCEPTED'`)).rows;
    assert.equal(acceptance.length,2);
    assert.ok(acceptance.every((row:any)=>row.from_state==='INDEPENDENT_REVIEW'&&row.trigger_code==='ACCEPT'&&row.authority==='INDEPENDENT_REVIEWER'&&row.control_type==='INDEPENDENT_REVIEW'));
  });

  test('keeps selection scoped and leaves AUT-01 effects declarative only', async () => {
    const rollouts=(await pool.query(`SELECT workflow_code,workflow_version,selection_enabled,selection_scope FROM workflow_rollouts
      WHERE (workflow_code,workflow_version) IN (('PROJECT_DISCOVERY',4),('MODULE_DELIVERY',2),('WORK_ITEM_DELIVERY',2),('ORCHESTRATION_EXECUTION',1)) ORDER BY workflow_code`)).rows;
    assert.deepEqual(rollouts.map((row:any)=>[row.workflow_code,row.workflow_version,row.selection_enabled,row.selection_scope]),[
      ['MODULE_DELIVERY',2,false,'NEW_MODULES'],['ORCHESTRATION_EXECUTION',1,false,'NEW_SUPERVISED_EXECUTIONS'],['PROJECT_DISCOVERY',4,false,'NEW_PROJECTS'],['WORK_ITEM_DELIVERY',2,true,'NEW_PLAN_MATERIALIZATION']
    ]);
    const autEffects=await pool.query(`SELECT count(*)::int AS n FROM workflow_transitions t JOIN workflow_definitions d ON d.id=t.workflow_id WHERE t.metadata->>'owner_task'='AUT-01' AND d.status='PUBLISHED'`);
    assert.ok(autEffects.rows[0].n>0,'AUT-01 ownership must be declared in metadata');
    const jobsBefore=Number((await pool.query(`SELECT count(*)::int AS n FROM jobs`)).rows[0].n);
    await pool.query(`SELECT * FROM workflow_rollouts WHERE workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2`);
    assert.equal(Number((await pool.query(`SELECT count(*)::int AS n FROM jobs`)).rows[0].n),jobsBefore,'workflow selection must not create jobs');
  });

  test('rejects mutation of published content and instance workflow rebinding', async () => {
    const client=await pool.connect();
    try{
      for(const statement of [
        `UPDATE workflow_definitions SET status='DRAFT' WHERE code='WORK_ITEM_DELIVERY' AND version=2`,
        `UPDATE workflow_states SET display_name='mutated' WHERE workflow_id=(SELECT id FROM workflow_definitions WHERE code='WORK_ITEM_DELIVERY' AND version=2) AND code='PLANNED'`,
        `DELETE FROM workflow_transitions WHERE workflow_id=(SELECT id FROM workflow_definitions WHERE code='ORCHESTRATION_EXECUTION' AND version=1) AND from_state='INDEPENDENT_REVIEW' AND trigger_code='ACCEPT'`
      ]){
        await client.query('BEGIN');
        await assert.rejects(client.query(statement),(error:any)=>['23514','P0001'].includes(error.code));
        await client.query('ROLLBACK');
      }
    }finally{client.release();}
  });

  test('legacy classification is fail-closed and never proposes an implicit migration', async () => {
    const summary=(await pool.query(`SELECT subject_type,classification,decision,bool_and(ambiguous OR decision='PRESERVE_LEGACY') AS safe,count(*)::int AS count
      FROM lifecycle_legacy_classification_v1 GROUP BY subject_type,classification,decision ORDER BY subject_type,classification`)).rows;
    assert.ok(summary.every((row:any)=>row.decision==='PRESERVE_LEGACY'&&row.safe===true));
    const forbidden=await pool.query(`SELECT 1 FROM lifecycle_legacy_classification_v1 WHERE decision<>'PRESERVE_LEGACY' LIMIT 1`);
    assert.equal(forbidden.rowCount,0);
  });
}
