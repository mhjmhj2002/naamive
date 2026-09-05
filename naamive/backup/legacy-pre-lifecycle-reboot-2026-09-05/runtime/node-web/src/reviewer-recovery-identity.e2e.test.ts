import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

/* REC-02 identity proofs use a single PostgreSQL transaction per fixture.
 * AUT-03 snapshots are immutable (including DELETE); rollback discards the
 * entire fixture without disabling or bypassing that production guard. */
if (!process.env.DATABASE_URL) {
  test('REC-02 reviewer recovery identity requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_OPERATOR_ID ??= 'rec02-identity-e2e';
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-rec02-identity-artifacts';
  const { pool } = await import('./db.js');
  const { createAcceptance, recoverReviewerAcceptanceInTransaction, recoverTerminalReviewerFailure, submitOutputForReview } = await import('./assurance.js');

  const hash = (character: string) => character.repeat(64);

  const seed = async (client: any, snapshotBacked: boolean) => {
    const project = randomUUID(), operation = randomUUID(), job = randomUUID(), execution = randomUUID();
    const producerRuntime = randomUUID(), frozenReviewerRuntime = randomUUID(), currentReviewerRuntime = randomUUID();
    const executionPolicy = randomUUID(), frozenPolicy = randomUUID(), currentPolicy = randomUUID();
    const correlation = randomUUID(), subjectId = randomUUID(), normativeGeneration = randomUUID();
    const executionPolicyName = `rec02-execution-${executionPolicy.slice(0, 8)}`;

    await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft)
      VALUES($1,'REC-02 identity E2E','owner','test','/tmp','local','main','000','REGISTERED','{}')`, [project]);
    for (const [id, name] of [[producerRuntime, 'producer'], [frozenReviewerRuntime, 'frozen-reviewer'], [currentReviewerRuntime, 'current-reviewer']]) {
      await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`, [id, `rec02-${name}-${id.slice(0, 8)}`]);
      await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason)
        VALUES($1,1,'CODEX_CLI','controlled','HIGH',30,'NONE','{}','test','REC-02 identity E2E')`, [id]);
    }
    await client.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by)
      VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`, [executionPolicy, executionPolicyName, producerRuntime]);
    const selectors = { agentPolicyNames: [executionPolicyName], taskTypes: ['ASSURANCE_TEST'], classifications: ['INTERNAL'] };
    const frozenConfiguration = { schema_version: 1, reviewer_runtime_ids: [frozenReviewerRuntime], runtime_exception_classifications: [], blockable_failure_codes: [] };
    const currentConfiguration = { schema_version: 1, reviewer_runtime_ids: [currentReviewerRuntime], runtime_exception_classifications: [], blockable_failure_codes: [] };
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,policy_hash,published_by)
      VALUES($1,$2,1,false,$3,$4,$5,'test')`, [frozenPolicy, `rec02-frozen-${frozenPolicy.slice(0, 8)}`, selectors, frozenConfiguration, hash('a')]);
    // This policy deliberately matches the producer and is enabled.  Recovery
    // must nevertheless use only the frozen policy identity below.
    await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,policy_hash,published_by)
      VALUES($1,$2,1,true,$3,$4,$5,'test')`, [currentPolicy, `rec02-current-${currentPolicy.slice(0, 8)}`, selectors, currentConfiguration, hash('b')]);
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id)
      VALUES($1,$2,'ASSURANCE_TEST','QUEUED',$3,$4)`, [operation, project, `rec02-op:${operation}`, correlation]);
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,kind,status,idempotency_key)
      VALUES($1,$2,$3,'ASSURANCE_TEST','PENDING',$4)`, [job, operation, project, `rec02-job:${job}`]);
    await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selection_reason)
      VALUES($1,$2,$3,$4,$5,'ASSURANCE_TEST',$6,'producer','1','ASSURANCE_TEST','INTERNAL',$7,$8,1,'SELECTED',$9,1,'{}')`,
      [execution, job, operation, project, project, `rec02-execution:${execution}`, executionPolicy, executionPolicyName, producerRuntime]);

    const context: any = { project, operation, job, execution, correlation, executionPolicyName, executionPolicy, frozenPolicy, currentPolicy, frozenReviewerRuntime, currentReviewerRuntime, subjectId, normativeGeneration };
    if (snapshotBacked) {
      const id = randomUUID();
      await client.query(`INSERT INTO assurance_dispatch_snapshots(id,schema_version,assurance_dispatch_key,policy_id,policy_version,policy_hash,selection_result,subject_kind,subject_id,normative_generation,producer_execution_id,job_id,operation_id,correlation_id,project_id,classification,lineage_fingerprint)
        VALUES($1,'AssuranceDispatchSnapshot:v1',$2,$3,1,$4,'SELECTED','WorkItemDeliveryCandidate:v1',$5,$6,$7,$8,$9,$10,$11,'INTERNAL',$12)`,
        [id, `assurance-dispatch:v1:WorkItemDeliveryCandidate:v1:${subjectId}:${normativeGeneration}`, frozenPolicy, hash('a'), subjectId, normativeGeneration, execution, job, operation, correlation, project, hash('c')]);
      context.snapshot = { id, policy_id: frozenPolicy, policy_version: 1, selection_result: 'SELECTED', subject_kind: 'WorkItemDeliveryCandidate:v1', subject_id: subjectId, normative_generation: normativeGeneration };
    }
    return context;
  };

  const executionInput = (ctx: any) => ({
    id: ctx.execution, project_key: ctx.project, policy_name: ctx.executionPolicyName,
    task_type: 'ASSURANCE_TEST', classification: 'INTERNAL', agent_id: 'producer', agent_version: '1',
    selected_runtime_id: null, selected_configuration_version: null, policy_id: ctx.executionPolicy, policy_version: 1,
  });

  test('REC-02 snapshot-backed AUT-03 recovery preserves the frozen identity through restart/reconcile', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ctx = await seed(client, true);
      const acceptance = await createAcceptance(client, executionInput(ctx), ctx.correlation, ctx.snapshot);
      assert.ok(acceptance);
      await submitOutputForReview(client, ctx.execution, { artifact_id: randomUUID(), artifact_hash: hash('d'), schema_version: 1, validated: true });

      const expectedKey = `reviewer-recovery:v1:${acceptance.id}:${ctx.normativeGeneration}`;
      let strategy = (await client.query(`SELECT * FROM reviewer_recovery_strategies WHERE acceptance_id=$1`, [acceptance.id])).rows[0];
      assert.equal(strategy.recovery_key, expectedKey);
      assert.doesNotMatch(strategy.recovery_key, /:legacy:/);
      assert.deepEqual({ snapshot: strategy.assurance_dispatch_snapshot_id, subjectKind: strategy.subject_kind, subjectId: strategy.subject_id, generation: strategy.normative_generation, policy: strategy.policy_id, version: Number(strategy.policy_version) }, {
        snapshot: ctx.snapshot.id, subjectKind: ctx.snapshot.subject_kind, subjectId: ctx.subjectId, generation: ctx.normativeGeneration, policy: ctx.frozenPolicy, version: 1,
      });

      const first = (await client.query(`SELECT r.id,e.job_id FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id WHERE r.acceptance_id=$1`, [acceptance.id])).rows[0];
      assert.ok(first);
      await recoverTerminalReviewerFailure(client, first.job_id, 'REC02_IDENTITY_E2E_TERMINAL', 1);
      // This is the same transaction-level recovery path invoked by restart and
      // reconciliation; it sees the active replacement and must only replay it.
      await recoverReviewerAcceptanceInTransaction(client, acceptance.id, 'restart-reconcile');

      strategy = (await client.query(`SELECT * FROM reviewer_recovery_strategies WHERE acceptance_id=$1`, [acceptance.id])).rows[0];
      assert.equal(strategy.recovery_key, expectedKey);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM reviewer_recovery_strategies WHERE acceptance_id=$1`, [acceptance.id])).rows[0].n), 1);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM reviewer_recovery_strategies WHERE recovery_key=$1`, [expectedKey])).rows[0].n), 1);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1`, [acceptance.id])).rows[0].n), 2);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM reviewer_recovery_idempotency WHERE recovery_key=$1 AND action='REVIEW_REPLACEMENT'`, [expectedKey])).rows[0].n), 2);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1 AND reviewer_runtime_id=$2`, [acceptance.id, ctx.currentReviewerRuntime])).rows[0].n), 0);
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1 AND reviewer_runtime_id=$2`, [acceptance.id, ctx.frozenReviewerRuntime])).rows[0].n), 2);
      assert.ok((strategy.candidate_set as any[]).every(candidate => candidate.runtime_id === ctx.frozenReviewerRuntime));

      const snapshot = (await client.query(`SELECT id,subject_kind,subject_id,normative_generation,policy_id,policy_version FROM assurance_dispatch_snapshots WHERE id=$1`, [ctx.snapshot.id])).rows[0];
      assert.deepEqual(snapshot, { id: ctx.snapshot.id, subject_kind: ctx.snapshot.subject_kind, subject_id: ctx.subjectId, normative_generation: ctx.normativeGeneration, policy_id: ctx.frozenPolicy, policy_version: 1 });
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  test('REC-02 legacy incomplete identity is structurally fail-closed and never falls back to current policy', async () => {
    const client = await pool.connect();
    try {
      const columns = (await client.query(`SELECT attname,attnotnull FROM pg_attribute WHERE attrelid='work_acceptances'::regclass AND attname IN ('policy_id','policy_version')`)).rows;
      assert.ok(columns.every((column: any) => column.attnotnull), 'legacy policy identity columns are mandatory');
      const policyForeignKey = (await client.query(`SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='work_acceptances'::regclass AND contype='f' AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (policy_id, policy_version)%'`)).rows[0];
      assert.ok(policyForeignKey, 'legacy policy pair must remain referentially constrained');
      assert.match(policyForeignKey.definition, /REFERENCES assurance_policies\(id, version\)/);

      // No invalid data is inserted here.  Under the live schema, an identity-
      // incomplete legacy acceptance cannot exist, so every REC-02 side-effect
      // relation reachable from that empty set is necessarily empty.
      const absent = (await client.query(`WITH incomplete AS (
        SELECT a.id FROM work_acceptances a
        LEFT JOIN assurance_dispatch_snapshots s ON s.id=a.assurance_dispatch_snapshot_id
        LEFT JOIN assurance_policies p ON p.id=a.policy_id AND p.version=a.policy_version
        WHERE s.id IS NULL AND (a.policy_id IS NULL OR a.policy_version IS NULL OR p.id IS NULL)
      ) SELECT
        (SELECT count(*)::int FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete)) AS recovery_case,
        (SELECT count(*)::int FROM reviewer_recovery_idempotency WHERE recovery_key IN (SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete))) AS recovery_key,
        (SELECT count(*)::int FROM assurance_reviews WHERE acceptance_id IN (SELECT id FROM incomplete)) AS review_replacement,
        (SELECT count(*)::int FROM agent_execution e JOIN assurance_reviews r ON r.dispatch_execution_id=e.id WHERE r.acceptance_id IN (SELECT id FROM incomplete)) AS reviewer_dispatch,
        (SELECT count(*)::int FROM assistance_proposals p JOIN work_blocks b ON b.id=p.block_id WHERE b.acceptance_id IN (SELECT id FROM incomplete)) AS assistance,
        (SELECT count(*)::int FROM reviewer_recovery_routing_decisions WHERE recovery_key IN (SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete))) AS routing,
        (SELECT count(*)::int FROM reviewer_recovery_specialist_recommendations WHERE recovery_key IN (SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete))) AS specialist,
        (SELECT count(*)::int FROM assurance_human_gates g JOIN work_blocks b ON b.id=g.block_id WHERE b.acceptance_id IN (SELECT id FROM incomplete)) AS gate,
        (SELECT count(*)::int FROM operations o JOIN jobs j ON j.operation_id=o.id JOIN reviewer_recovery_specialist_recommendations r ON r.job_id=j.id WHERE r.recovery_key IN (SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete))) AS recovery_operation,
        (SELECT count(*)::int FROM jobs j JOIN reviewer_recovery_specialist_recommendations r ON r.job_id=j.id WHERE r.recovery_key IN (SELECT recovery_key FROM reviewer_recovery_strategies WHERE acceptance_id IN (SELECT id FROM incomplete))) AS recovery_job,
        (SELECT count(*)::int FROM agent_execution e JOIN assurance_reviews r ON r.dispatch_execution_id=e.id WHERE r.acceptance_id IN (SELECT id FROM incomplete)) AS recovery_execution`)).rows[0];
      assert.deepEqual(absent, { recovery_case: 0, recovery_key: 0, review_replacement: 0, reviewer_dispatch: 0, assistance: 0, routing: 0, specialist: 0, gate: 0, recovery_operation: 0, recovery_job: 0, recovery_execution: 0 });

      await client.query('BEGIN');
      const ctx = await seed(client, false);
      const acceptance = await createAcceptance(client, executionInput(ctx), ctx.correlation, undefined, { id: ctx.frozenPolicy, version: 1 });
      assert.ok(acceptance);
      await submitOutputForReview(client, ctx.execution, { artifact_id: randomUUID(), artifact_hash: hash('e'), schema_version: 1, validated: true });
      const strategy = (await client.query(`SELECT * FROM reviewer_recovery_strategies WHERE acceptance_id=$1`, [acceptance.id])).rows[0];
      assert.equal(strategy.legacy, true);
      assert.equal(strategy.recovery_key, `reviewer-recovery:v1:${acceptance.id}:legacy:${ctx.frozenPolicy}:1`);
      assert.deepEqual({ snapshot: strategy.assurance_dispatch_snapshot_id, subjectKind: strategy.subject_kind, subjectId: strategy.subject_id, generation: strategy.normative_generation, policy: strategy.policy_id, version: Number(strategy.policy_version) }, {
        snapshot: null, subjectKind: null, subjectId: null, generation: null, policy: ctx.frozenPolicy, version: 1,
      });
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1 AND reviewer_runtime_id=$2`, [acceptance.id, ctx.currentReviewerRuntime])).rows[0].n), 0, 'enabled current policy was not used as a fallback');
      assert.equal(Number((await client.query(`SELECT count(*)::int n FROM assurance_reviews WHERE acceptance_id=$1 AND reviewer_runtime_id=$2`, [acceptance.id, ctx.frozenReviewerRuntime])).rows[0].n), 1);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  test.after(async () => pool.end());
}
