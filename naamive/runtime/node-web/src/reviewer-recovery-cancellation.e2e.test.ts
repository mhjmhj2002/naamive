import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

/* REC-02 cancellation cases use only legacy fixtures, so each committed
 * PostgreSQL scenario can be deleted normally.  No immutable AUT-03 snapshot
 * is created or deleted by these tests. */
if (!process.env.DATABASE_URL) {
  test('REC-02 reviewer recovery cancellation requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_OPERATOR_ID ??= 'rec02-cancellation-e2e';
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-rec02-cancellation-artifacts';
  const { pool, withTransaction } = await import('./db.js');
  const { cancelAcceptance, createAcceptance, recoverReviewerAcceptance, reconcileReviewerRecovery, submitOutputForReview } = await import('./assurance.js');
  const { decideCatalogGate } = await import('./gate-catalog.js');
  const { runOnce } = await import('./worker.js');

  const createFixture = async (gateAllowed = false, sameRuntimeCandidate = false) => withTransaction(async client => {
    const project = randomUUID(), operation = randomUUID(), job = randomUUID(), execution = randomUUID();
    const runtime = randomUUID(), executionPolicy = randomUUID(), assurancePolicy = randomUUID(), correlation = randomUUID();
    const policyName = `rec02-cancel-execution-${executionPolicy.slice(0, 8)}`;
    await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft)
      VALUES($1,'REC-02 cancellation E2E','owner','test','/tmp','local','main','000','REGISTERED','{}')`, [project]);
    await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`, [runtime, `rec02-cancel-${runtime.slice(0, 8)}`]);
    await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason)
      VALUES($1,1,'CODEX_CLI','controlled','HIGH',30,'NONE','{}','test','REC-02 cancellation E2E')`, [runtime]);
    await client.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by)
      VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`, [executionPolicy, policyName, runtime]);
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,policy_hash,published_by)
      VALUES($1,$2,1,false,$3,$4,$5,'test')`, [assurancePolicy, `rec02-cancel-frozen-${assurancePolicy.slice(0, 8)}`,
      { agentPolicyNames: [policyName], taskTypes: ['ASSURANCE_TEST'], classifications: ['INTERNAL'] },
      { schema_version: 1, reviewer_runtime_ids: sameRuntimeCandidate ? [runtime] : [], runtime_exception_classifications: gateAllowed ? ['INTERNAL'] : [], blockable_failure_codes: [] }, 'a'.repeat(64)]);
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id)
      VALUES($1,$2,'ASSURANCE_TEST','QUEUED',$3,$4)`, [operation, project, `rec02-cancel-op:${operation}`, correlation]);
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,kind,status,idempotency_key)
      VALUES($1,$2,$3,'ASSURANCE_TEST','PENDING',$4)`, [job, operation, project, `rec02-cancel-job:${job}`]);
    await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selection_reason)
      VALUES($1,$2,$3,$4,$5,'ASSURANCE_TEST',$6,'producer','1','ASSURANCE_TEST','INTERNAL',$7,$8,1,'SELECTED',$9,1,'{}')`,
      [execution, job, operation, project, project, `rec02-cancel-execution:${execution}`, executionPolicy, policyName, runtime]);
    const acceptance = await createAcceptance(client, { id: execution, project_key: project, policy_name: policyName, task_type: 'ASSURANCE_TEST', classification: 'INTERNAL', agent_id: 'producer', agent_version: '1', selected_runtime_id: runtime, selected_configuration_version: 1, policy_id: executionPolicy, policy_version: 1 }, correlation, undefined, { id: assurancePolicy, version: 1 });
    assert.ok(acceptance);
    await submitOutputForReview(client, execution, { artifact_id: randomUUID(), artifact_hash: 'b'.repeat(64), schema_version: 1, validated: true });
    // This fixture begins after producer output has already been handed to
    // Assurance; do not let the generic worker lease the synthetic producer
    // job while the test is specifically exercising REC-02 continuations.
    await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id=$1`, [job]);
    await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=$1`, [operation]);
    return { project, operation, job, execution, runtime, executionPolicy, assurancePolicy, acceptanceId: acceptance.id };
  });

  const counts = async (fixture: any) => {
    const row = (await pool.query(`SELECT
      (SELECT state FROM work_acceptances WHERE id=$1) AS acceptance_state,
      (SELECT current_stage::int FROM reviewer_recovery_strategies WHERE acceptance_id=$1) AS current_stage,
      (SELECT count(*)::int FROM reviewer_recovery_strategies WHERE acceptance_id=$1) AS recovery_cases,
      (SELECT count(*)::int FROM reviewer_recovery_idempotency WHERE recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)) AS recovery_keys,
      (SELECT count(*)::int FROM assistance_proposals p JOIN work_blocks b ON b.id=p.block_id WHERE b.acceptance_id=$1) AS assistance,
      (SELECT count(*)::int FROM reviewer_recovery_routing_decisions WHERE recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)) AS routing,
      (SELECT count(*)::int FROM reviewer_recovery_specialist_recommendations WHERE recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)) AS specialist,
      (SELECT count(*)::int FROM gate_records WHERE project_id=$2 AND gate_code='INDEPENDENCE_EXCEPTION') AS gates,
      (SELECT count(*)::int FROM assurance_reviews WHERE acceptance_id=$1) AS reviews,
      (SELECT count(*)::int FROM agent_execution e JOIN assurance_reviews r ON r.dispatch_execution_id=e.id WHERE r.acceptance_id=$1) AS reviewer_executions,
      (SELECT count(*)::int FROM jobs j JOIN reviewer_recovery_specialist_recommendations r ON r.job_id=j.id WHERE r.recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)) AS recovery_jobs,
      (SELECT count(*)::int FROM operations o JOIN jobs j ON j.operation_id=o.id JOIN reviewer_recovery_specialist_recommendations r ON r.job_id=j.id WHERE r.recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)) AS recovery_operations`, [fixture.acceptanceId, fixture.project])).rows[0];
    return { ...row, current_stage: Number(row.current_stage), recovery_cases: Number(row.recovery_cases), recovery_keys: Number(row.recovery_keys), assistance: Number(row.assistance), routing: Number(row.routing), specialist: Number(row.specialist), gates: Number(row.gates), reviews: Number(row.reviews), reviewer_executions: Number(row.reviewer_executions), recovery_jobs: Number(row.recovery_jobs), recovery_operations: Number(row.recovery_operations) };
  };

  const cleanup = async (fixture: any) => {
    await pool.query(`DELETE FROM reviewer_recovery_strategies WHERE acceptance_id=$1`, [fixture.acceptanceId]);
    await pool.query(`UPDATE gate_records SET decision_id=NULL WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM gate_decisions WHERE gate_id IN (SELECT id FROM gate_records WHERE project_id=$1)`, [fixture.project]);
    await pool.query(`DELETE FROM gate_records WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM assistance_proposals WHERE block_id IN (SELECT id FROM work_blocks WHERE project_id=$1)`, [fixture.project]);
    await pool.query(`DELETE FROM review_decisions WHERE review_id IN (SELECT id FROM assurance_reviews WHERE acceptance_id=$1)`, [fixture.acceptanceId]);
    await pool.query(`DELETE FROM assurance_reviews WHERE acceptance_id=$1`, [fixture.acceptanceId]);
    await pool.query(`DELETE FROM assurance_command_idempotency WHERE resource_id=$1::text OR result_id=$1::text`, [fixture.acceptanceId]);
    await pool.query(`DELETE FROM assurance_human_gates WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM work_blocks WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM work_acceptances WHERE id=$1`, [fixture.acceptanceId]);
    await pool.query(`DELETE FROM agent_execution WHERE project_key=$1`, [fixture.project]);
    await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM operations WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM events WHERE project_id=$1`, [fixture.project]);
    await pool.query(`DELETE FROM assurance_policies WHERE id=$1`, [fixture.assurancePolicy]);
    await pool.query(`DELETE FROM agent_execution_policy WHERE id=$1`, [fixture.executionPolicy]);
    await withTransaction(async client => {
      await client.query(`DELETE FROM ai_runtime_configuration WHERE runtime_id=$1`, [fixture.runtime]);
      await client.query(`DELETE FROM ai_runtime WHERE id=$1`, [fixture.runtime]);
    });
    await pool.query(`DELETE FROM projects WHERE id=$1`, [fixture.project]);
  };

  const cancelAndReconcile = async (fixture: any) => {
    await cancelAcceptance(fixture.acceptanceId, { reason: 'REC-02 cancellation E2E', evidence: { reference: 'cancelled' } }, `rec02-cancel:${fixture.acceptanceId}`);
    await reconcileReviewerRecovery();
    await runOnce(fixture.project);
  };

  test('REC-02 cancellation after assistance preserves history and prevents later recovery resources', async () => {
    const fixture = await createFixture();
    try {
      const before = await counts(fixture);
      assert.deepEqual({ stage: before.current_stage, assistance: before.assistance, specialist: before.specialist, gates: before.gates, reviews: before.reviews }, { stage: 5, assistance: 1, specialist: 0, gates: 0, reviews: 0 });
      const proposal = (await pool.query(`SELECT p.id FROM assistance_proposals p JOIN work_blocks b ON b.id=p.block_id WHERE b.acceptance_id=$1`, [fixture.acceptanceId])).rows[0];
      await cancelAndReconcile(fixture);
      const after = await counts(fixture);
      assert.equal(after.acceptance_state, 'CANCELLED');
      assert.deepEqual(after, { ...before, acceptance_state: 'CANCELLED' });
      assert.equal((await pool.query(`SELECT id FROM assistance_proposals WHERE id=$1`, [proposal.id])).rows[0].id, proposal.id);
    } finally { await cleanup(fixture); }
  });

  test('REC-02 cancellation during specialist wait preserves the specialist and cancels its dispatch', async () => {
    const fixture = await createFixture();
    try {
      await recoverReviewerAcceptance(fixture.acceptanceId, 'advance-to-specialist');
      const before = await counts(fixture);
      const specialist = (await pool.query(`SELECT r.id,r.job_id,j.status,o.status AS operation_status FROM reviewer_recovery_specialist_recommendations r JOIN jobs j ON j.id=r.job_id JOIN operations o ON o.id=j.operation_id WHERE r.recovery_key=(SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id=$1)`, [fixture.acceptanceId])).rows[0];
      assert.deepEqual({ stage: before.current_stage, assistance: before.assistance, specialist: before.specialist, gates: before.gates }, { stage: 6, assistance: 1, specialist: 1, gates: 0 });
      assert.equal(specialist.status, 'PENDING');
      await cancelAndReconcile(fixture);
      const after = await counts(fixture);
      assert.equal(after.acceptance_state, 'CANCELLED');
      assert.deepEqual(after, { ...before, acceptance_state: 'CANCELLED' });
      assert.deepEqual((await pool.query(`SELECT j.status,o.status AS operation_status FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.id=$1`, [specialist.job_id])).rows[0], { status: 'CANCELLED', operation_status: 'CANCELLED' });
      assert.equal((await pool.query(`SELECT id FROM reviewer_recovery_specialist_recommendations WHERE id=$1`, [specialist.id])).rows[0].id, specialist.id);
    } finally { await cleanup(fixture); }
  });

  test('REC-02 cancellation during gate wait prevents a late gate decision from reviving recovery', async () => {
    const fixture = await createFixture(true);
    try {
      await recoverReviewerAcceptance(fixture.acceptanceId, 'advance-to-specialist');
      const specialist = (await pool.query(`SELECT r.job_id FROM reviewer_recovery_specialist_recommendations r JOIN reviewer_recovery_strategies s ON s.recovery_key=r.recovery_key WHERE s.acceptance_id=$1`, [fixture.acceptanceId])).rows[0];
      await pool.query(`UPDATE jobs SET available_at=clock_timestamp() WHERE id=$1`, [specialist.job_id]);
      assert.equal(await runOnce(fixture.project), true, 'worker completes the advisory specialist before gate wait');
      await recoverReviewerAcceptance(fixture.acceptanceId, 'advance-to-gate');
      const before = await counts(fixture);
      const gate = (await pool.query(`SELECT * FROM gate_records WHERE project_id=$1 AND gate_code='INDEPENDENCE_EXCEPTION'`, [fixture.project])).rows[0];
      assert.deepEqual({ stage: before.current_stage, assistance: before.assistance, specialist: before.specialist, gates: before.gates, reviews: before.reviews }, { stage: 7, assistance: 1, specialist: 1, gates: 1, reviews: 0 });
      await cancelAcceptance(fixture.acceptanceId, { reason: 'REC-02 gate wait cancellation', evidence: { reference: 'cancelled-gate' } }, `rec02-gate-cancel:${fixture.acceptanceId}`);
      // Gate decisions remain historical catalog facts, but their late arrival
      // has no continuation path into the cancelled recovery.
      await withTransaction(client => decideCatalogGate(client, fixture.project, gate.id, { version: Number(gate.version), decision: 'APPROVE', reason: 'late decision', evidence: { reference: 'late-gate' }, actor_id: 'late-approver', actor_role: 'TECH_LEAD', idempotency_key: `late-gate:${gate.id}` }));
      await reconcileReviewerRecovery();
      await runOnce(fixture.project);
      const after = await counts(fixture);
      assert.equal(after.acceptance_state, 'CANCELLED');
      assert.deepEqual(after, { ...before, acceptance_state: 'CANCELLED' });
      assert.deepEqual((await pool.query(`SELECT status,decision FROM gate_records WHERE id=$1`, [gate.id])).rows[0], { status: 'DECIDED', decision: 'APPROVE' });
    } finally { await cleanup(fixture); }
  });

  test('REC-02 GAT-01 approval resumes the same recovery key and dispatches a distinct reviewer', async () => {
    const fixture = await createFixture(true, true);
    try {
      await recoverReviewerAcceptance(fixture.acceptanceId, 'advance-to-specialist');
      const specialist=(await pool.query(`SELECT r.job_id FROM reviewer_recovery_specialist_recommendations r JOIN reviewer_recovery_strategies s ON s.recovery_key=r.recovery_key WHERE s.acceptance_id=$1`,[fixture.acceptanceId])).rows[0];
      await pool.query(`UPDATE jobs SET available_at=clock_timestamp() WHERE id=$1`,[specialist.job_id]);
      assert.equal(await runOnce(fixture.project),true);
      await recoverReviewerAcceptance(fixture.acceptanceId,'open-independence-gate');
      const before=(await pool.query(`SELECT recovery_key,current_stage,recovery_state,gate_reference FROM reviewer_recovery_strategies WHERE acceptance_id=$1`,[fixture.acceptanceId])).rows[0];
      const gate=(await pool.query(`SELECT * FROM gate_records WHERE id=$1`,[before.gate_reference])).rows[0];
      assert.deepEqual({stage:Number(before.current_stage),state:before.recovery_state},{stage:7,state:'WAITING_FOR_GATE'});
      await withTransaction(client=>decideCatalogGate(client,fixture.project,gate.id,{version:Number(gate.version),decision:'APPROVE',reason:'bounded capacity exception',evidence:{reference:'rec02-positive-gate'},actor_id:'tech-lead',actor_role:'TECH_LEAD',idempotency_key:`rec02-positive-approve:${gate.id}`}));
      const after=(await pool.query(`SELECT recovery_key,current_stage,recovery_state,gate_reference,selected_candidate FROM reviewer_recovery_strategies WHERE acceptance_id=$1`,[fixture.acceptanceId])).rows[0];
      const review=(await pool.query(`SELECT r.*,e.selected_runtime_id FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id WHERE r.acceptance_id=$1`,[fixture.acceptanceId])).rows[0];
      assert.equal(after.recovery_key,before.recovery_key); assert.equal(after.gate_reference,before.gate_reference);
      assert.equal(after.recovery_state,'ACTIVE'); assert.ok([2,3,4].includes(Number(after.current_stage)));
      assert.equal(review.state,'DISPATCHED'); assert.equal(review.reviewer_agent_id==='producer',false); assert.equal(review.selected_runtime_id,fixture.runtime);
      assert.equal(review.independence_check.exception_used,true); assert.equal(review.independence_check.gate_id,gate.id);
      assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM gate_records WHERE project_id=$1 AND gate_code='INDEPENDENCE_EXCEPTION'`,[fixture.project])).rows[0].n),1);
      assert.equal((await pool.query(`SELECT state FROM work_acceptances WHERE id=$1`,[fixture.acceptanceId])).rows[0].state,'WAITING_FOR_INDEPENDENT_REVIEWER');
    } finally { await cleanup(fixture); }
  });

  test.after(async () => pool.end());
}
