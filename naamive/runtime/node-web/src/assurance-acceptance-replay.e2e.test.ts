import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

/* FINDING-04: createAcceptance must be replay identity-safe.
 *
 * - LEGITIMATE REPLAY: same execution_id AND same normative identity
 *   (policy id/version, dispatch snapshot, acceptance key, subject/generation)
 *   returns the existing acceptance without a new row or a silent update.
 * - DIVERGENT REPLAY: same execution_id but any change in normative identity
 *   fails closed with ASSURANCE_ACCEPTANCE_IDENTITY_CONFLICT (409) and the
 *   original acceptance row is left untouched.
 *
 * This is a real PostgreSQL proof (no mocks): the durable work_acceptances
 * row is created through the actual function and the frozen dispatch snapshot
 * is involved where the task requires it. */
if (!process.env.DATABASE_URL) {
  test('FINDING-04 acceptance replay requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool, withTransaction } = await import('./db.js');
  const { createAcceptance } = await import('./assurance.js');

  const sha = (hex: string) => hex.repeat(64);

  const executionArgs = (ctx: any) => ({
    id: ctx.execution,
    project_key: ctx.project,
    policy_name: ctx.executionPolicyName,
    task_type: 'DEVELOP_WORK_ITEM',
    classification: 'INTERNAL',
    agent_id: 'development-agent',
    agent_version: '1',
    selected_runtime_id: null,
    selected_configuration_version: null,
    policy_id: ctx.executionPolicy,
    policy_version: 1,
  });

  /** Seeds the minimal FK chain required by createAcceptance and, when
   * `snapshot` is given, an immutable SELECTED dispatch snapshot row.
   * Must be called inside an open transaction (the caller owns commit/rollback). */
  const seed = async (client: any, options: { snapshot?: boolean; policyVersions?: number[]; subjectId?: string; generation?: string } = {}) => {
    const project = randomUUID(), runtime = randomUUID(), executionPolicy = randomUUID(), assurancePolicy = randomUUID();
    const operation = randomUUID(), job = randomUUID(), execution = randomUUID();
    const executionPolicyName = `finding04-exec-${executionPolicy.slice(0, 8)}`;
    await client.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,'FINDING-04 replay','owner','test','/tmp','local','main','000','{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`, [project]);
    await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`, [runtime, `finding04-${runtime}`]);
    await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','FINDING-04 E2E')`, [runtime]);
    await client.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`, [executionPolicy, executionPolicyName, runtime]);
    const versions = options.policyVersions ?? [1];
    for (const version of versions) {
      // assurance_policies has one-enabled-per-name; give each version its own name.
      await client.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,$3,true,$4,$5,'test')`,
        [assurancePolicy, `finding04-assurance-${assurancePolicy.slice(0, 8)}-v${version}`, version, { agentPolicyNames: [executionPolicyName], taskTypes: ['DEVELOP_WORK_ITEM'], classifications: ['INTERNAL'] }, { schema_version: 1, aut02_shared_acceptance: true }]);
    }
    await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'SCHEDULE_DEVELOPMENT','SUCCEEDED',$3,$4)`, [operation, project, `finding04-op:${operation}`, randomUUID()]);
    // ASSURANCE_TEST (rather than DEVELOP_WORK_ITEM) avoids the
    // jobs_development_delivery_required FK chain while still exercising the
    // exact createAcceptance path used by the F6/AUT-02 producers.
    await client.query(`INSERT INTO jobs(id,operation_id,project_id,kind,status,idempotency_key) VALUES($1,$2,$3,'ASSURANCE_TEST','COMPLETED',$4)`, [job, operation, project, `finding04-job:${job}`]);
    // workflow_code/workflow_version are omitted (as assurance.e2e.test.ts does):
    // setting them would trip agent_execution_workflow_state_integrity unless the
    // state is a published EXECUTION-scoped workflow state, which this proof does
    // not need to exercise.
    await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selection_reason)
      VALUES($1,$2,$3,$4,$5,'ASSURANCE_TEST',$6,'development-agent','1','DEVELOP_WORK_ITEM','INTERNAL',$7,$8,1,'SUCCEEDED','{}')`,
      [execution, job, operation, project, project, `finding04-execution:${execution}`, executionPolicy, executionPolicyName]);
    const ctx: any = { project, runtime, executionPolicy, executionPolicyName, assurancePolicy, operation, job, execution, correlation: randomUUID() };
    if (options.snapshot) {
      const subjectId = options.subjectId ?? randomUUID();
      const generation = options.generation ?? subjectId;
      const snapshotId = randomUUID();
      await client.query(`INSERT INTO assurance_dispatch_snapshots(id,schema_version,assurance_dispatch_key,policy_id,policy_version,policy_hash,selection_result,subject_kind,subject_id,normative_generation,producer_execution_id,job_id,operation_id,correlation_id,project_id,classification,lineage_fingerprint)
        VALUES($1,'AssuranceDispatchSnapshot:v1',$2,$3,1,$4,'SELECTED','WorkItemDeliveryCandidate:v1',$5,$6,$7,$8,$9,$10,$11,'INTERNAL',$12)`,
        [snapshotId, `assurance-dispatch:v1:WorkItemDeliveryCandidate:v1:${subjectId}:${generation}`, assurancePolicy, sha('a'), subjectId, generation, execution, job, operation, ctx.correlation, project, sha('b')]);
      ctx.snapshot = { id: snapshotId, policy_id: assurancePolicy, policy_version: 1, selection_result: 'SELECTED', subject_kind: 'WorkItemDeliveryCandidate:v1', subject_id: subjectId, normative_generation: generation };
    }
    return ctx;
  };

  const acceptanceKeyFor = (snapshot: any) => `assurance-acceptance:v1:${snapshot.subject_kind}:${snapshot.subject_id}:${snapshot.normative_generation}:${snapshot.policy_id}:${snapshot.policy_version}`;

  const cleanup = async (ctx: any) => {
    await pool.query(`DELETE FROM work_acceptances WHERE project_id=$1`, [ctx.project]);
    await pool.query(`DELETE FROM agent_execution WHERE project_key=$1`, [ctx.project]);
    await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [ctx.project]);
    await pool.query(`DELETE FROM operations WHERE project_id=$1`, [ctx.project]);
    await pool.query(`DELETE FROM agent_execution_policy WHERE id=$1`, [ctx.executionPolicy]);
    await pool.query(`DELETE FROM assurance_policies WHERE id=$1`, [ctx.assurancePolicy]);
    // ai_runtime and ai_runtime_configuration hold circular FKs (configuration
    // -> runtime, plus the deferred runtime -> configuration), so both deletes
    // must commit in a single transaction (as assurance.e2e.test.ts does).
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM ai_runtime_configuration WHERE runtime_id=$1`, [ctx.runtime]);
      await client.query(`DELETE FROM ai_runtime WHERE id=$1`, [ctx.runtime]);
    });
    await pool.query(`DELETE FROM projects WHERE id=$1`, [ctx.project]);
  };

  test('FINDING-04 legitimate replay returns the same acceptance and creates exactly one row', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ctx = await seed(client, { snapshot: true });
      const args = executionArgs(ctx);
      const first = await createAcceptance(client, args, ctx.correlation, ctx.snapshot);
      assert.ok(first, 'first call must create an acceptance');
      const second = await createAcceptance(client, args, ctx.correlation, ctx.snapshot);
      assert.ok(second, 'legitimate replay must return the existing acceptance');
      assert.equal(second.id, first.id, 'legitimate replay must return the SAME acceptance');
      const rows = (await client.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1, 'legitimate replay must not create a duplicate row');
      assert.equal(rows[0].assurance_dispatch_snapshot_id, ctx.snapshot.id);
      assert.equal(rows[0].acceptance_key, acceptanceKeyFor(ctx.snapshot));
      assert.equal(rows[0].state, 'PENDING_PRODUCE');
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

  test('FINDING-04 divergent replay (different policy version) fails closed and leaves the row unchanged', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ctx = await seed(client, { policyVersions: [1, 2] });
      const first = await createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 1 });
      assert.ok(first);
      await assert.rejects(
        createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 2 }),
        (error: any) => error.code === 'ASSURANCE_ACCEPTANCE_IDENTITY_CONFLICT' && error.status === 409,
      );
      const rows = (await client.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1, 'divergent replay must not add a row');
      assert.equal(rows[0].policy_version, 1, 'divergent replay must not update the frozen policy version');
      assert.equal(rows[0].id, first.id);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

  test('FINDING-04 divergent replay (different dispatch snapshot) fails closed and leaves the row unchanged', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ctx = await seed(client, { snapshot: true });
      const args = executionArgs(ctx);
      const first = await createAcceptance(client, args, ctx.correlation, ctx.snapshot);
      assert.ok(first);
      const divergent = await seed(client, { snapshot: true });
      await assert.rejects(
        createAcceptance(client, args, ctx.correlation, divergent.snapshot),
        (error: any) => error.code === 'ASSURANCE_ACCEPTANCE_IDENTITY_CONFLICT' && error.status === 409,
      );
      const rows = (await client.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1, 'divergent replay must not add a row');
      assert.equal(rows[0].id, first.id);
      assert.equal(rows[0].assurance_dispatch_snapshot_id, ctx.snapshot.id, 'original snapshot binding must be untouched');
      assert.equal(rows[0].acceptance_key, acceptanceKeyFor(ctx.snapshot), 'original acceptance key must be untouched');
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

  test('FINDING-04 snapshot binding: same execution_id but a different snapshot subject/generation fails closed', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const ctx = await seed(client, { snapshot: true });
      const args = executionArgs(ctx);
      const first = await createAcceptance(client, args, ctx.correlation, ctx.snapshot);
      assert.ok(first);
      // Same execution, same policy, but a snapshot whose subject/generation differs.
      const divergent = await seed(client, { snapshot: true, subjectId: randomUUID(), generation: randomUUID() });
      await assert.rejects(
        createAcceptance(client, args, ctx.correlation, divergent.snapshot),
        (error: any) => error.code === 'ASSURANCE_ACCEPTANCE_IDENTITY_CONFLICT' && error.status === 409,
      );
      const rows = (await client.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1);
      assert.equal(rows[0].assurance_dispatch_snapshot_id, ctx.snapshot.id);
    } finally { await client.query('ROLLBACK'); client.release(); }
  });

  test('FINDING-04 race: concurrent identical calls converge on a single acceptance', async () => {
    const ctx = await withTransaction(async (client) => seed(client, {}));
    try {
      const [a, b] = await Promise.all([
        withTransaction((client) => createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 1 })),
        withTransaction((client) => createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 1 })),
      ]);
      assert.ok(a && b, 'both concurrent identical calls must return an acceptance');
      assert.equal(a.id, b.id, 'concurrent identical calls must converge to the same acceptance');
      const rows = (await pool.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1, 'concurrent identical calls must produce exactly one row');
      assert.equal(rows[0].id, a.id);
    } finally { await cleanup(ctx); }
  });

  test('FINDING-04 race: concurrent divergent calls create one row and the divergent call fails closed', async () => {
    const ctx = await withTransaction(async (client) => seed(client, { policyVersions: [1, 2] }));
    try {
      const settled = await Promise.allSettled([
        withTransaction((client) => createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 1 })),
        withTransaction((client) => createAcceptance(client, executionArgs(ctx), ctx.correlation, undefined, { id: ctx.assurancePolicy, version: 2 })),
      ]);
      const fulfilled = settled.filter((item) => item.status === 'fulfilled');
      const rejected = settled.filter((item) => item.status === 'rejected');
      assert.equal(fulfilled.length, 1, 'exactly one concurrent call must create the acceptance');
      assert.equal(rejected.length, 1, 'the divergent concurrent call must fail closed');
      const rejection = rejected[0] as PromiseRejectedResult;
      assert.equal((rejection.reason as any)?.code, 'ASSURANCE_ACCEPTANCE_IDENTITY_CONFLICT');
      const rows = (await pool.query(`SELECT * FROM work_acceptances WHERE execution_id=$1`, [ctx.execution])).rows;
      assert.equal(rows.length, 1, 'concurrent divergent calls must produce exactly one row');
      const version = Number(rows[0].policy_version);
      assert.ok(version === 1 || version === 2, 'the surviving row must be one of the two atomic candidates');
    } finally { await cleanup(ctx); }
  });

  test.after(async () => pool.end());
}
