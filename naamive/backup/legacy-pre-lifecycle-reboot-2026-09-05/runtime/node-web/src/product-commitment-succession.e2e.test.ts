import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

if(!process.env.DATABASE_URL){
  test('LR-02A succession requires PostgreSQL',{skip:'set DATABASE_URL'},()=>{});
}else{
  const {pool,withTransaction}=await import('./db.js');
  const {createProductCommitmentRevision,decideProductCommitmentGate}=await import('./product-commitment.js');

  const fixture=async(label:string)=>{
    const projectId=randomUUID(),intakeId=randomUUID(),requirementsId=randomUUID(),reviewId=randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,$2,'owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',4,'DEFINITION','{}')`,[projectId,label]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,$5,'tester')`,[intakeId,projectId,'c'.repeat(64),'d'.repeat(64),`file:///tmp/${intakeId}`]);
    await pool.query(`INSERT INTO artifacts(id,project_id,artifact_type,storage_uri,storage_key,sha256,schema_version) VALUES
      ($1,$3,'product-requirements',$4,$5,$6,1),
      ($2,$3,'product-commitment-review',$7,$8,$9,1)`,[requirementsId,reviewId,projectId,`file:///tmp/${requirementsId}`,`lr02a-fix/${projectId}/${requirementsId}`,'a'.repeat(64),`file:///tmp/${reviewId}`,`lr02a-fix/${projectId}/${reviewId}`,'b'.repeat(64)]);
    return {projectId,requirementsId,source:{source_intake_revision_id:intakeId,source_requirements_artifact_id:requirementsId,source_review_artifact_id:reviewId}};
  };
  const proposal=(requirementsId:string,objective:string)=>({
    contract_version:'PRODUCT_COMMITMENT_MODULES:v1',
    candidate_modules:[
      {module_key:'commitment-core',name:'Compromisso central',objective,scope:['Contrato'],out_of_scope:['Materialização'],dependencies:[],acceptance_criteria:['Snapshot aprovado'],source_evidence:{requirement_refs:['REQ-1'],artifact_refs:[{artifact_id:requirementsId,sha256:'a'.repeat(64)}]}}
    ],
    investment_and_risks:{investment:['Incremental'],risks:['Evolução rejeitada']}
  });
  const create=async(f:any,key:string,objective:string)=>withTransaction(client=>createProductCommitmentRevision(client,f.projectId,proposal(f.requirementsId,objective),f.source,key));
  const decide=(revision:any,decision:'APPROVE'|'REWORK',key:string)=>decideProductCommitmentGate(revision.project_id,revision.gate_record_id,{version:1,decision,reason:decision==='APPROVE'?'Compromisso aceito.':'Compromisso requer correção.',evidence:decision==='APPROVE'?{acknowledged:true}:{feedback:'Revisar proposta.'},actor_id:'lr02a-fix-business-owner',actor_role:'BUSINESS_OWNER',idempotency_key:key});
  const statuses=async(projectId:string)=>(await pool.query(`SELECT id,status,supersedes_revision_id,revision_number,logical_round FROM product_commitment_revisions WHERE project_id=$1 ORDER BY revision_number`,[projectId])).rows;
  const assertOneApproved=async(projectId:string)=>assert.equal((await pool.query(`SELECT count(*)::int AS count FROM product_commitment_revisions WHERE project_id=$1 AND status='APPROVED'`,[projectId])).rows[0].count,1);
  const immutableSnapshot=async(revisionId:string)=>(await pool.query(`SELECT r.canonical_sha256,r.source_intake_revision_id,r.source_requirements_artifact_id,r.source_requirements_sha256,r.source_review_artifact_id,r.source_review_sha256,r.gate_record_id,r.creation_idempotency_key,r.created_at,r.created_by,r.approved_at,
    (SELECT jsonb_agg(jsonb_build_object('module_key',m.module_key,'ordinal',m.ordinal,'payload',m.payload,'source_evidence',m.source_evidence) ORDER BY m.ordinal) FROM product_commitment_modules m WHERE m.product_commitment_revision_id=r.id) AS modules
    FROM product_commitment_revisions r WHERE r.id=$1`,[revisionId])).rows[0];

  test('LR-02A atomically evolves approved commitments across rejection, replay, concurrency and rollback',async t=>{
    t.after(async()=>{
      await pool.query('DROP TRIGGER IF EXISTS lr02a_fix_fail_successor_approval ON product_commitment_revisions');
      await pool.query('DROP FUNCTION IF EXISTS lr02a_fix_fail_successor_approval()');
      await pool.end();
    });

    const evolution=await fixture('LR-02A approved evolution');
    const r1:any=await create(evolution,`r1:${evolution.projectId}`,'Primeira geração');
    await decide(r1,'APPROVE',`approve-r1:${evolution.projectId}`);
    await assertOneApproved(evolution.projectId);
    const r1Snapshot=await immutableSnapshot(r1.id);

    const r2:any=await create(evolution,`r2:${evolution.projectId}`,'Evolução rejeitada');
    assert.equal(r2.supersedes_revision_id,r1.id);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['APPROVED','PENDING_APPROVAL']);
    await assertOneApproved(evolution.projectId);
    await decide(r2,'REWORK',`reject-r2:${evolution.projectId}`);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['APPROVED','REJECTED']);
    await assertOneApproved(evolution.projectId);

    const r3:any=await create(evolution,`r3:${evolution.projectId}`,'Correção da evolução');
    assert.equal(r3.supersedes_revision_id,r2.id);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['APPROVED','SUPERSEDED','PENDING_APPROVAL']);
    await decide(r3,'APPROVE',`approve-r3:${evolution.projectId}`);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['SUPERSEDED','SUPERSEDED','APPROVED']);
    await assertOneApproved(evolution.projectId);
    assert.deepEqual(await immutableSnapshot(r1.id),r1Snapshot);

    const r4:any=await create(evolution,`r4:${evolution.projectId}`,'Quarta geração');
    assert.equal(r4.supersedes_revision_id,r3.id);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['SUPERSEDED','SUPERSEDED','APPROVED','PENDING_APPROVAL']);
    await decide(r4,'APPROVE',`approve-r4:${evolution.projectId}`);
    assert.deepEqual((await statuses(evolution.projectId)).map((row:any)=>row.status),['SUPERSEDED','SUPERSEDED','SUPERSEDED','APPROVED']);
    await assertOneApproved(evolution.projectId);

    const generations=await fixture('LR-02A multiple approved generations');
    const generationsRows=[];
    for(let round=1;round<=3;round++){
      const revision:any=await create(generations,`generation-${round}:${generations.projectId}`,`Geração ${round}`);
      generationsRows.push(revision);
      if(round>1) assert.deepEqual((await statuses(generations.projectId)).slice(-2).map((row:any)=>row.status),['APPROVED','PENDING_APPROVAL']);
      await decide(revision,'APPROVE',`approve-generation-${round}:${generations.projectId}`);
      await assertOneApproved(generations.projectId);
    }
    assert.deepEqual((await statuses(generations.projectId)).map((row:any)=>row.status),['SUPERSEDED','SUPERSEDED','APPROVED']);
    assert.equal(generationsRows[1].supersedes_revision_id,generationsRows[0].id);
    assert.equal(generationsRows[2].supersedes_revision_id,generationsRows[1].id);

    const creationRace=await fixture('LR-02A successor creation race');
    const creationRaceR1:any=await create(creationRace,`r1:${creationRace.projectId}`,'Base aprovada');
    await decide(creationRaceR1,'APPROVE',`approve-r1:${creationRace.projectId}`);
    const raced=await Promise.allSettled([
      create(creationRace,`successor-a:${creationRace.projectId}`,'Successor A'),
      create(creationRace,`successor-b:${creationRace.projectId}`,'Successor B')
    ]);
    assert.equal(raced.filter(result=>result.status==='fulfilled').length,1);
    assert.equal(raced.filter(result=>result.status==='rejected').length,1);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM product_commitment_revisions WHERE project_id=$1 AND status='PENDING_APPROVAL'`,[creationRace.projectId])).rows[0].count,1);
    await assertOneApproved(creationRace.projectId);

    const replay=await fixture('LR-02A successor technical replay');
    const replayR1:any=await create(replay,`r1:${replay.projectId}`,'Base de replay');
    await decide(replayR1,'APPROVE',`approve-r1:${replay.projectId}`);
    const replayKey=`successor:${replay.projectId}`;
    const replayed=await Promise.all([create(replay,replayKey,'Evolução replay'),create(replay,replayKey,'Payload ignorado no replay')]);
    assert.equal(replayed[0].id,replayed[1].id);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM product_commitment_revisions WHERE project_id=$1`,[replay.projectId])).rows[0].count,2);

    const approvalRace=await fixture('LR-02A successor approval replay');
    const approvalRaceR1:any=await create(approvalRace,`r1:${approvalRace.projectId}`,'Base de approval replay');
    await decide(approvalRaceR1,'APPROVE',`approve-r1:${approvalRace.projectId}`);
    const approvalRaceR2:any=await create(approvalRace,`r2:${approvalRace.projectId}`,'Successor concorrente');
    const approvalKey=`approve-r2:${approvalRace.projectId}`;
    const approvals=await Promise.all([decide(approvalRaceR2,'APPROVE',approvalKey),decide(approvalRaceR2,'APPROVE',approvalKey)]);
    assert.equal(approvals[0].id,approvalRaceR2.id);assert.equal(approvals[1].id,approvalRaceR2.id);
    assert.deepEqual((await statuses(approvalRace.projectId)).map((row:any)=>row.status),['SUPERSEDED','APPROVED']);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM gate_decisions WHERE gate_id=$1`,[approvalRaceR2.gate_record_id])).rows[0].count,1);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM events WHERE project_id=$1 AND event_type='PRODUCT_COMMITMENT_SUPERSEDED' AND payload->>'successor_revision_id'=$2`,[approvalRace.projectId,approvalRaceR2.id])).rows[0].count,1);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM events WHERE project_id=$1 AND event_type='PRODUCT_COMMITMENT_APPROVED' AND payload->>'revision_id'=$2`,[approvalRace.projectId,approvalRaceR2.id])).rows[0].count,1);
    await assertOneApproved(approvalRace.projectId);

    const rollback=await fixture('LR-02A successor rollback');
    const rollbackR1:any=await create(rollback,`r1:${rollback.projectId}`,'Base de rollback');
    await decide(rollbackR1,'APPROVE',`approve-r1:${rollback.projectId}`);
    const rollbackR2:any=await create(rollback,`r2:${rollback.projectId}`,'Successor com falha');
    await pool.query(`CREATE FUNCTION lr02a_fix_fail_successor_approval() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.id='${rollbackR2.id}'::uuid AND NEW.status='APPROVED' THEN RAISE EXCEPTION 'LR02A_CONTROLLED_SUCCESSOR_FAILURE' USING ERRCODE='23514'; END IF; RETURN NEW; END $$`);
    await pool.query(`CREATE TRIGGER lr02a_fix_fail_successor_approval BEFORE UPDATE ON product_commitment_revisions FOR EACH ROW EXECUTE FUNCTION lr02a_fix_fail_successor_approval()`);
    await assert.rejects(decide(rollbackR2,'APPROVE',`approve-r2-fail:${rollback.projectId}`),(error:any)=>error.code==='23514');
    assert.deepEqual((await statuses(rollback.projectId)).map((row:any)=>row.status),['APPROVED','PENDING_APPROVAL']);
    const rollbackGate=(await pool.query(`SELECT status,decision_id FROM gate_records WHERE id=$1`,[rollbackR2.gate_record_id])).rows[0];
    assert.equal(rollbackGate.status,'OPEN');assert.equal(rollbackGate.decision_id,null);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM gate_decisions WHERE gate_id=$1`,[rollbackR2.gate_record_id])).rows[0].count,0);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM events WHERE project_id=$1 AND ((event_type='PRODUCT_COMMITMENT_SUPERSEDED' AND payload->>'successor_revision_id'=$2) OR (event_type='PRODUCT_COMMITMENT_APPROVED' AND payload->>'revision_id'=$2))`,[rollback.projectId,rollbackR2.id])).rows[0].count,0);
    await assertOneApproved(rollback.projectId);
    await pool.query('DROP TRIGGER lr02a_fix_fail_successor_approval ON product_commitment_revisions');
    await pool.query('DROP FUNCTION lr02a_fix_fail_successor_approval()');

    await assert.rejects(pool.query(`UPDATE product_commitment_revisions SET status='SUPERSEDED' WHERE id=$1`,[rollbackR1.id]),(error:any)=>error.code==='23514');
    assert.equal((await pool.query(`SELECT status FROM product_commitment_revisions WHERE id=$1`,[rollbackR1.id])).rows[0].status,'APPROVED');
  });
}
