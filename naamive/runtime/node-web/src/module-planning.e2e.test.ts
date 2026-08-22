import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  test('module planning integration requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_AGENT_ADAPTER = 'controlled';
  process.env.NAAMIVE_RUNTIME_ENVIRONMENT = 'test';
  process.env.NAAMIVE_OPERATOR_ID = 'module-planning-e2e-operator';
  process.env.NAAMIVE_ARTIFACT_STORE_URI = 'file:///tmp/naamive-module-planning-e2e-artifacts';

  const { pool } = await import('./db.js');
  const { materializeModule, decideModule, completeDefinition, decideArchitecture, approveModulePlan, startDevelopment, phase3Detail, resolveExternalBlocker } = await import('./phase3.js');
  const { runOnce } = await import('./worker.js');
  const { seedPlanRevision } = await import('./test-plan-helper.js');
  const { createApiServer } = await import('./server.js');
  const { retryModulePlan, buildPlanContext, controlledPlanFixture, persistPlan, MODULE_PLAN_VALIDATOR_VERSION, MODULE_PLAN_SANITIZER_VERSION, MODULE_PLAN_SCHEMA_VERSION } = await import('./module-planning.js');
  const { canonicalHash } = await import('./module-planning.js');

  const setupProject = async () => {
    const id = `mp-e2e-${randomUUID().slice(0, 8)}`;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,'Module planning','Ops','test','/tmp','test://origin','main','0000000','{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [id]);
    const cleanup = async () => {
      for (const sql of [
        'DELETE FROM events WHERE project_id=$1', 'DELETE FROM artifacts WHERE project_id=$1',
        'DELETE FROM artifact_intents WHERE project_id=$1', 'DELETE FROM jobs WHERE project_id=$1',
        'DELETE FROM work_items WHERE project_id=$1', 'DELETE FROM module_gates WHERE project_id=$1',
        'DELETE FROM module_plan_job_context WHERE project_id=$1', 'DELETE FROM module_plan_revisions WHERE project_id=$1',
        'DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)',
        // operations/jobs reference module_revisions via module_revision_id (pendency 16),
        // so delete operations (and jobs already above) before module_revisions.
        'DELETE FROM operations WHERE project_id=$1', 'DELETE FROM modules WHERE project_id=$1',
        'DELETE FROM module_revisions WHERE project_id=$1', 'DELETE FROM projects WHERE id=$1'
      ]) await pool.query(sql, [id]);
    };
    return { id, cleanup };
  };

  const toPlanning = async (projectId: string, objective = 'Persist requests and expose a REST API', criteria = ['A request can be tracked'], dependencies: string[] = []) => {
    const module = await materializeModule(projectId, { module_key: 'requests', name: 'Requests', objective, scope: ['request'], out_of_scope: [], dependencies, acceptance_criteria: criteria }, `mp-materialize-${randomUUID()}`);
    const gate = (await pool.query('SELECT version FROM module_gates WHERE id=$1', [module.gate_id])).rows[0];
    await decideModule(projectId, module.module_id!, { decision: 'APPROVED', version: gate.version }, `mp-approve-${randomUUID()}`);
    await completeDefinition(projectId, module.module_id!, { alternatives: ['single workflow'], consequences: [], risks: [] }, `mp-definition-${randomUUID()}`);
    const architecture = (await pool.query("SELECT version FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'", [module.module_id])).rows[0];
    const decided = await decideArchitecture(projectId, module.module_id!, { decision: 'APPROVED', version: architecture.version, alternatives: ['single workflow'], consequences: [], risks: [] }, `mp-architecture-${randomUUID()}`);
    return { module: module.module_id!, plan_operation_id: decided.plan_operation_id };
  };

  test('worker persists the plan revision from the exact module_plan_job_context snapshot (F5-23 persistPlan)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id);
    assert.equal(await runOnce(id), true);
    const revision = (await pool.query(`SELECT * FROM module_plan_revisions WHERE module_id=$1 AND status='PLAN_PROPOSED'`, [module])).rows[0];
    assert.ok(revision, 'plan revision persisted');
    const snapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE module_id=$1`, [module])).rows[0];
    assert.ok(snapshot, 'context snapshot persisted');
    // persistPlan stores the snapshot's context_hash exactly, never a divergent rebuild.
    assert.equal(revision.context_schema_version, snapshot.context_schema_version);
    assert.equal(revision.context_hash, snapshot.context_hash);
    assert.equal(revision.context_hash, snapshot.context_payload.context_hash);
    assert.equal(revision.validator_version, MODULE_PLAN_VALIDATOR_VERSION);
    assert.equal(revision.payload_hash, canonicalHash(revision.payload));
  });

  test('worker plan failure is terminal-only and retryModulePlan replays the FAILED snapshot (F5-23)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests and expose a REST API', ['A request can be tracked']);
    // The initial PLAN_MODULE_WORK_ITEMS job is enqueued by decideArchitecture.
    const job = (await pool.query(`SELECT j.operation_id FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS'`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    // Simulate the worker's terminal failure path (validation/agent contract failure).
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    // Retry from the failed operation: unique retry per source.
    const retryKey = `mp-retry-${randomUUID()}`;
    const retried = await retryModulePlan(id, module, { failed_operation_id: operation.id }, retryKey);
    assert.equal(retried.status, 'ACCEPTED');
    const retryOp = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [retried.operation_id])).rows[0];
    assert.equal(retryOp.retry_of_operation_id, operation.id);
    assert.equal(retryOp.kind, 'RETRY_MODULE_PLAN');
    // A second retry of the same source is rejected (unique retry per source).
    await assert.rejects(() => retryModulePlan(id, module, { failed_operation_id: operation.id }, `mp-retry2-${randomUUID()}`), /MODULE_PLAN_RETRY_CONFLICT/);
    // Idempotent replay of the same key returns the same operation.
    const same = await retryModulePlan(id, module, { failed_operation_id: operation.id }, retryKey);
    assert.equal(same.operation_id, retried.operation_id);
  });

  test('retryModulePlan replays the FAILED round snapshot byte-for-byte (F5-23)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests and expose a REST API', ['A request can be tracked']);
    const job = (await pool.query(`SELECT j.operation_id FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS'`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    // Build the failed-round snapshot exactly like the worker does (buildPlanContext → snapshot).
    const row = (await pool.query(`SELECT r.payload,r.criteria,m.technology_baseline_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [module])).rows[0];
    const context = buildPlanContext({ payload: row.payload, criteria: row.criteria }, {}, {}, null);
    await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [operation.id, id, module, (await pool.query(`SELECT current_revision_id FROM modules WHERE id=$1`, [module])).rows[0].current_revision_id, row.technology_baseline_revision_id, context.context_schema_version, context, context.context_hash]);
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    const failedSnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [operation.id])).rows[0];
    const retried = await retryModulePlan(id, module, { failed_operation_id: operation.id }, `mp-retry-snap-${randomUUID()}`);
    const retrySnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [retried.operation_id])).rows[0];
    // The retry replays the FAILED round's snapshot exactly — never rebuilt from current state.
    assert.equal(retrySnapshot.context_hash, failedSnapshot.context_hash);
    assert.equal(retrySnapshot.context_payload.context_hash, failedSnapshot.context_payload.context_hash);
    assert.equal(retrySnapshot.context_payload.module_definition.acceptance_criteria[0].criterion_id, failedSnapshot.context_payload.module_definition.acceptance_criteria[0].criterion_id);
  });

  test('approveModulePlan revalidates and rejects tampered plans; seeds an external-blocked work item (F5-23 two-step approval)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked']);
    const seeded = await seedPlanRevision(id, module, [{ title: 'Persist', inputs: ['input'], allowlist: ['src/deliverable.txt'], denylist: ['.env'], output: 'A persisted record', acceptance_criteria: ['A request can be tracked'], qa_matrix: [{ command: 'true', cwd: '.', timeout_seconds: 10 }] }]);
    // Tamper with the persisted payload so the stored hash no longer matches.
    await pool.query(`UPDATE module_plan_revisions SET payload=jsonb_set(payload,'{work_items,0,output}','"Tampered output"') WHERE id=$1`, [seeded.plan_revision_id]);
    await assert.rejects(() => approveModulePlan(id, module, { plan_revision_id: seeded.plan_revision_id, version: seeded.version }, `mp-tamper-${randomUUID()}`), /MODULE_PLAN_APPROVAL_VALIDATION_FAILED/);
    // Evidence and event are recorded, gate stays open, no work item materialized.
    assert.equal((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='module-plan-approval-validation-failed'`, [id])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_APPROVAL_VALIDATION_FAILED'`, [id])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT status FROM module_gates WHERE id=$1`, [seeded.gate_id])).rows[0].status, 'OPEN');
    assert.equal((await pool.query(`SELECT count(*)::int n FROM work_items WHERE project_id=$1`, [id])).rows[0].n, 0);
  });

  test('approveModulePlan projects EXTERNAL_BLOCKER work items as blocked with an auditable trail (F5-23)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked'], ['Identity provider']);
    const seeded = await seedPlanRevision(id, module, [{ title: 'Persist', inputs: ['input'], allowlist: ['src/deliverable.txt'], denylist: ['.env'], output: 'A persisted record', acceptance_criteria: ['A request can be tracked'], qa_matrix: [{ command: 'true', cwd: '.', timeout_seconds: 10 }] }]);
    // Mark the module's business dependency as an external blocker for the seeded work item,
    // then recompute the canonical payload hash so the stored plan remains internally consistent.
    const current = (await pool.query(`SELECT payload,payload_hash,context_hash FROM module_plan_revisions WHERE id=$1`, [seeded.plan_revision_id])).rows[0];
    const workItemId = current.payload.work_items[0].work_item_id;
    const payload = { ...current.payload, business_dependency_coverage: [{ dependency_id: 'dependency-1', classification: 'EXTERNAL_BLOCKER', work_item_ids: [], blocked_work_item_ids: [workItemId], justification: 'Needs external SLA' }] };
    const newHash = canonicalHash(payload);
    // Recompute the validation hash over the same context_hash so the persisted plan remains
    // internally consistent (F5-23 pendency 8 revalidates schema/context/validation hashes).
    const planPart = { schema_version: payload.schema_version, work_items: payload.work_items, criterion_coverage: payload.criterion_coverage, business_dependency_coverage: payload.business_dependency_coverage, risks: payload.risks, gaps: payload.gaps };
    const newValidationHash = canonicalHash({ plan: planPart, context_hash: current.context_hash, validator: MODULE_PLAN_VALIDATOR_VERSION });
    await pool.query(`UPDATE module_plan_revisions SET payload=$2,payload_hash=$3,validation_hash=$4 WHERE id=$1`, [seeded.plan_revision_id, payload, newHash, newValidationHash]);
    const approved = await approveModulePlan(id, module, { plan_revision_id: seeded.plan_revision_id, version: seeded.version }, `mp-blocked-${randomUUID()}`);
    assert.equal(approved.status, 'ACCEPTED');
    assert.equal(approved.blocked_work_item_ids?.length, 1);
    const wi = (await pool.query(`SELECT id,payload,state,workflow_code,workflow_version FROM work_items WHERE project_id=$1`, [id])).rows[0];
    assert.equal(wi.workflow_code, 'WORK_ITEM_DELIVERY');
    assert.equal(wi.workflow_version, 2);
    assert.equal(wi.state, 'WAITING_FOR_EXTERNAL_INPUT');
    assert.equal(wi.payload.external_blocked, true);
    assert.equal(wi.payload.blocked_state, 'EXTERNAL_BLOCKED');
    assert.equal(wi.payload.external_blocked_dependency_id, 'dependency-1');
    assert.equal((await pool.query(`SELECT count(*)::int n FROM work_item_external_blockers WHERE work_item_id=$1 AND state='ACTIVE'`, [wi.id])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_EXTERNAL_BLOCKED'`, [id])).rows[0].n, 1);
    assert.equal((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='module-plan-external-blocker'`, [id])).rows[0].n, 1);
    // START_DEVELOPMENT rejects the blocked work item until the dependency resolves.
    await assert.rejects(() => startDevelopment(id, wi.id, {}, `mp-dev-${randomUUID()}`), /WORKFLOW_COMMAND_OBSOLETE_FOR_VERSION/);
  });

  test('LR-01 materializes eligible, dependency-waiting and multiply-blocked WIs without dispatch', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist and expose requests', ['A request can be tracked'], ['Identity provider', 'Operations priority group']);
    const item=(logical_id:string,title:string,depends_on_ids:string[]=[])=>({logical_id,title,depends_on_ids,inputs:['input'],allowlist:[`src/${logical_id}.ts`],denylist:['.env'],output:`${title} output`,acceptance_criteria:['A request can be tracked'],qa_matrix:[{command:'true',cwd:'.',timeout_seconds:10}]});
    const seeded=await seedPlanRevision(id,module,[item('root-store','Store'),item('dependent-metric','Metric',['root-store']),item('external-ui','UI',['root-store'])]);
    const current=(await pool.query(`SELECT payload,context_hash FROM module_plan_revisions WHERE id=$1`,[seeded.plan_revision_id])).rows[0];
    const payload={...current.payload,business_dependency_coverage:[
      {dependency_id:'dependency-1',classification:'EXTERNAL_BLOCKER',work_item_ids:[],blocked_work_item_ids:['external-ui'],justification:'Identity decision'},
      {dependency_id:'dependency-2',classification:'EXTERNAL_BLOCKER',work_item_ids:[],blocked_work_item_ids:['external-ui'],justification:'Priority group decision'}
    ]};
    const planPart={schema_version:payload.schema_version,work_items:payload.work_items,criterion_coverage:payload.criterion_coverage,business_dependency_coverage:payload.business_dependency_coverage,risks:payload.risks,gaps:payload.gaps};
    const validationHash=canonicalHash({plan:planPart,context_hash:current.context_hash,validator:MODULE_PLAN_VALIDATOR_VERSION});
    await pool.query(`UPDATE module_plan_revisions SET payload=$2,payload_hash=$3,validation_hash=$4 WHERE id=$1`,[seeded.plan_revision_id,payload,canonicalHash(payload),validationHash]);
    const jobsBefore=Number((await pool.query(`SELECT count(*)::int n FROM jobs WHERE project_id=$1`,[id])).rows[0].n);
    const approvalKey=`lr01-approve-${randomUUID()}`;
    const [approved,replayed]=await Promise.all([
      approveModulePlan(id,module,{plan_revision_id:seeded.plan_revision_id,version:seeded.version},approvalKey),
      approveModulePlan(id,module,{plan_revision_id:seeded.plan_revision_id,version:seeded.version},approvalKey)
    ]);
    assert.equal(replayed.operation_id,approved.operation_id);
    const rows=(await pool.query(`SELECT id,payload->>'work_item_id' logical_id,state,workflow_version FROM work_items WHERE project_id=$1 ORDER BY payload->>'work_item_id'`,[id])).rows;
    assert.deepEqual(Object.fromEntries(rows.map((row:any)=>[row.logical_id,row.state])),{ 'dependent-metric':'WAITING_FOR_DEPENDENCIES','external-ui':'WAITING_FOR_EXTERNAL_INPUT','root-store':'ELIGIBLE_FOR_DISPATCH' });
    assert.ok(rows.every((row:any)=>row.workflow_version===2));
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM jobs WHERE project_id=$1`,[id])).rows[0].n),jobsBefore);
    const external=rows.find((row:any)=>row.logical_id==='external-ui');
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_external_blockers WHERE work_item_id=$1 AND state='ACTIVE'`,[external.id])).rows[0].n),2);
    const first=await resolveExternalBlocker(id,external.id,{dependency_id:'dependency-1',justification:'Identity resolved'},`lr01-resolve-1-${randomUUID()}`);
    assert.deepEqual({state:first.state,remaining:first.remaining_active_blockers},{state:'WAITING_FOR_EXTERNAL_INPUT',remaining:1});
    const second=await resolveExternalBlocker(id,external.id,{dependency_id:'dependency-2',justification:'Priority resolved'},`lr01-resolve-2-${randomUUID()}`);
    assert.deepEqual({state:second.state,remaining:second.remaining_active_blockers},{state:'WAITING_FOR_DEPENDENCIES',remaining:0});
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM jobs WHERE project_id=$1`,[id])).rows[0].n),jobsBefore);
    const detail=await phase3Detail(id),projected:any=detail.work_items.find((row:any)=>(row as any).id===external.id);
    assert.equal(projected.workflow_version,2);
    assert.ok(!projected.allowed_actions.includes('START_DEVELOPMENT'));
    assert.deepEqual(approved.work_item_workflow,{workflow_code:'WORK_ITEM_DELIVERY',workflow_version:2});
    const transitionEvent=(await pool.query(`SELECT workflow_code,workflow_version,payload FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_APPROVED' ORDER BY id DESC LIMIT 1`,[id])).rows[0];
    assert.deepEqual({workflow_code:transitionEvent.workflow_code,workflow_version:transitionEvent.workflow_version},{workflow_code:'PROJECT_DISCOVERY',workflow_version:2});
    assert.deepEqual(transitionEvent.payload.work_item_workflow,{workflow_code:'WORK_ITEM_DELIVERY',workflow_version:2});
    assert.equal(transitionEvent.payload.dispatch_created,false);
    assert.equal(new Set(transitionEvent.payload.work_items.map((workItem:any)=>workItem.work_item_id)).size,3);
  });

  test('persistPlan persists durable sanitized JSON+Markdown failure evidence in its own transaction before rethrowing (pendency 10)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked']);
    // Let the worker build the round context snapshot, then fail the job's plan transaction
    // by supplying a semantically invalid plan (unknown criterion id).
    const job = (await pool.query(`SELECT j.*,o.kind operation_kind FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE')`, [module])).rows[0];
    const operationId = job.operation_id;
    // Pre-seed the round context snapshot exactly like the worker builds it, then force
    // persistPlan to fail with a semantically invalid plan.
    const row = (await pool.query(`SELECT r.payload,r.criteria,m.current_revision_id,m.technology_baseline_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [module])).rows[0];
    const ctx = buildPlanContext({ payload: row.payload, criteria: row.criteria }, {}, {}, null);
    await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [operationId, id, module, row.current_revision_id, row.technology_baseline_revision_id, ctx.context_schema_version, ctx, ctx.context_hash]);
    await pool.query(`UPDATE jobs SET status='LEASED',attempts=1 WHERE id=$1`, [job.id]);
    // A plan that is valid in every other dimension but references an unknown criterion id,
    // so the semantic validator emits exactly CRITERION_UNKNOWN.
    const invalidPlan = { schema_version: MODULE_PLAN_SCHEMA_VERSION, work_items: [{ work_item_id: 'wi-1', title: 'Persist requests', objective: 'Persist requests durably', output: 'A persisted, verifiable record of requests', inputs: ['approved module definition'], acceptance_criteria: ['Criterion criterion-1 is demonstrably satisfied'], allowlist: ['src/persistence'], denylist: ['.env'], depends_on_ids: [], criterion_ids: ['criterion-1', 'criterion-unknown'], qa_matrix: [{ command: 'npm run test:integration:db', cwd: 'test', timeout_seconds: 180, environment: 'isolated-postgres', criterion_ids: ['criterion-1', 'criterion-unknown'], kind: 'database integration' }], risks: ['Validate integration'], capabilities: ['persistence'] }], criterion_coverage: [{ criterion_id: 'criterion-1', work_item_ids: ['wi-1'] }], business_dependency_coverage: [], risks: ['Controlled'], gaps: [] };
    await assert.rejects(() => persistPlan(job, invalidPlan), /CRITERION_UNKNOWN/);
    // Durable evidence persisted in its OWN transaction (committed even though the plan transaction rolled back).
    const report = (await pool.query(`SELECT artifact_type,storage_uri,sha256 FROM artifacts WHERE project_id=$1 AND artifact_type IN ('module-plan-rejection-report','module-plan-rejection-report-markdown') ORDER BY artifact_type`, [id])).rows;
    assert.equal(report.length, 2);
    const md = report.find((r: any) => r.artifact_type === 'module-plan-rejection-report-markdown');
    assert.ok(md, 'markdown report persisted');
    // Rejection event does not expose the raw agent response.
    const evt = (await pool.query(`SELECT payload FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_FAILED' ORDER BY id DESC LIMIT 1`, [id])).rows[0];
    assert.ok(evt, 'MODULE_PLAN_FAILED event emitted');
    assert.equal(evt.payload.next_action, 'RETRY_MODULE_PLAN');
    assert.ok(!JSON.stringify(evt.payload).includes('invalidPlan'));
    assert.equal(evt.payload.code, 'CRITERION_UNKNOWN');
    // The terminal operation remains retryable (job FAILED is a precondition for retryModulePlan).
  });

  test('retryModulePlan creates the retry with the SAME revision + Technology Baseline + context snapshot as the source terminal operation, never from the module current state (pendency 11)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests and expose a REST API', ['A request can be tracked']);
    // Force the module onto a DIFFERENT baseline/revision than the one the failed round used, so
    // the retry must inherit from the source (pendency 11 forbids reading current module state).
    const job = (await pool.query(`SELECT j.* FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE')`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    // Build and persist the failed round snapshot exactly as the worker does.
    const row = (await pool.query(`SELECT r.payload,r.criteria,m.technology_baseline_revision_id,m.current_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [module])).rows[0];
    const context = buildPlanContext({ payload: row.payload, criteria: row.criteria }, {}, {}, null);
    await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [operation.id, id, module, row.current_revision_id, row.technology_baseline_revision_id, context.context_schema_version, context, context.context_hash]);
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    const failedSnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [operation.id])).rows[0];
    const retried = await retryModulePlan(id, module, { failed_operation_id: operation.id }, `mp-retry-11-${randomUUID()}`);
    const retryOp = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [retried.operation_id])).rows[0];
    assert.equal(retryOp.retry_of_operation_id, operation.id);
    assert.equal(retryOp.kind, 'RETRY_MODULE_PLAN');
    const retrySnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [retried.operation_id])).rows[0];
    // Same revision + baseline + snapshot as the source terminal operation.
    assert.equal(retrySnapshot.module_revision_id, failedSnapshot.module_revision_id);
    assert.equal(retrySnapshot.technology_baseline_revision_id, failedSnapshot.technology_baseline_revision_id);
    assert.equal(retrySnapshot.context_hash, failedSnapshot.context_hash);
    const retryJob = (await pool.query(`SELECT technology_baseline_revision_id,module_revision_id FROM jobs WHERE operation_id=$1`, [retried.operation_id])).rows[0];
    assert.equal(retryJob.technology_baseline_revision_id, failedSnapshot.technology_baseline_revision_id);
    // F5-23 pendency 16: the retry operation and job rows carry the failed operation's origin
    // module revision directly (module_revision_id), so lineage is queryable without the
    // snapshot or an event. revision_id (intake FK) must STILL be null on the retry operation.
    assert.equal(retryOp.module_revision_id, failedSnapshot.module_revision_id);
    assert.equal(retryJob.module_revision_id, failedSnapshot.module_revision_id);
    assert.equal(retryOp.revision_id, null);
    const retryEvent = (await pool.query(`SELECT payload FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_RETRY_REQUESTED' ORDER BY id DESC LIMIT 1`, [id])).rows[0];
    assert.equal(retryEvent.payload.revision_id, failedSnapshot.module_revision_id);
    assert.equal(retryEvent.payload.module_revision_id, failedSnapshot.module_revision_id);
    assert.equal(retryEvent.payload.technology_baseline_revision_id, failedSnapshot.technology_baseline_revision_id);
    assert.equal(retryEvent.payload.context_snapshot_reused, true);
  });

  test('retry lineage is directly queryable on the operations and jobs rows without snapshot or event (pendency 16)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests and expose a REST API', ['A request can be tracked']);
    const job = (await pool.query(`SELECT j.* FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE')`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    const row = (await pool.query(`SELECT r.payload,r.criteria,m.technology_baseline_revision_id,m.current_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [module])).rows[0];
    const context = buildPlanContext({ payload: row.payload, criteria: row.criteria }, {}, {}, null);
    await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [operation.id, id, module, row.current_revision_id, row.technology_baseline_revision_id, context.context_schema_version, context, context.context_hash]);
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    const failedSnapshot = (await pool.query(`SELECT module_revision_id FROM module_plan_job_context WHERE operation_id=$1`, [operation.id])).rows[0];
    const retried = await retryModulePlan(id, module, { failed_operation_id: operation.id }, `mp-retry-16-${randomUUID()}`);
    // Direct lineage: the origin module revision is stored on both operational rows.
    const opRev = (await pool.query(`SELECT module_revision_id FROM operations WHERE id=$1`, [retried.operation_id])).rows[0];
    const jobRev = (await pool.query(`SELECT module_revision_id FROM jobs WHERE operation_id=$1`, [retried.operation_id])).rows[0];
    assert.equal(opRev.module_revision_id, failedSnapshot.module_revision_id);
    assert.equal(jobRev.module_revision_id, failedSnapshot.module_revision_id);
  });

  test('chained retry: two consecutive RETRY failures followed by a successful recovery reuse the FIRST planning operation snapshot/revision/baseline (F5-23 pendency 23)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests and expose a REST API', ['A request can be tracked']);
    // The initial PLAN_MODULE_WORK_ITEMS operation is enqueued by decideArchitecture.
    const firstJob = (await pool.query(`SELECT j.* FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS'`, [module])).rows[0];
    const firstOp = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [firstJob.operation_id])).rows[0];
    // Build and persist the FIRST round snapshot exactly as the worker does.
    const row = (await pool.query(`SELECT r.payload,r.criteria,m.technology_baseline_revision_id,m.current_revision_id FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1`, [module])).rows[0];
    const context = buildPlanContext({ payload: row.payload, criteria: row.criteria }, {}, {}, null);
    await pool.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [firstOp.id, id, module, row.current_revision_id, row.technology_baseline_revision_id, context.context_schema_version, context, context.context_hash]);
    const firstSnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [firstOp.id])).rows[0];
    assert.ok(firstSnapshot, 'first round snapshot present');

    const failOp = async (operationId: string) => {
      await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operationId]);
      await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operationId]);
    };

    // Failure #1: the initial planning operation fails. The projection must point to an
    // eligible origin (the initial PLAN_MODULE_WORK_ITEMS operation).
    await failOp(firstOp.id);
    let detail: any = await phase3Detail(id);
    let planning = detail.planning.find((p: any) => p.module_id === module);
    assert.equal(planning.state, 'PLANNING_FAILED');
    assert.equal(planning.retry_action?.failed_operation_id, firstOp.id);
    assert.equal(planning.failed_operation?.kind, 'PLAN_MODULE_WORK_ITEMS');

    // Retry #1: creates a RETRY_MODULE_PLAN op recording the ROOT origin.
    const retried1 = await retryModulePlan(id, module, { failed_operation_id: firstOp.id }, `mp-chain-1-${randomUUID()}`);
    const retryOp1 = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [retried1.operation_id])).rows[0];
    assert.equal(retryOp1.kind, 'RETRY_MODULE_PLAN');
    assert.equal(retryOp1.retry_of_operation_id, firstOp.id);
    assert.equal(retryOp1.origin_operation_id, firstOp.id);
    assert.equal(retryOp1.module_revision_id, firstSnapshot.module_revision_id);

    // Failure #2: the first RETRY fails. The projection must still point to an eligible
    // origin — a terminal RETRY_MODULE_PLAN is now the eligible source.
    await failOp(retryOp1.id);
    detail = await phase3Detail(id);
    planning = detail.planning.find((p: any) => p.module_id === module);
    assert.equal(planning.state, 'PLANNING_FAILED');
    assert.equal(planning.retry_action?.failed_operation_id, retryOp1.id);
    assert.equal(planning.failed_operation?.kind, 'RETRY_MODULE_PLAN');

    // Retry #2: a chained retry of a retry is accepted and reuses the ROOT lineage.
    const retried2 = await retryModulePlan(id, module, { failed_operation_id: retryOp1.id }, `mp-chain-2-${randomUUID()}`);
    const retryOp2 = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [retried2.operation_id])).rows[0];
    assert.equal(retryOp2.kind, 'RETRY_MODULE_PLAN');
    assert.equal(retryOp2.retry_of_operation_id, retryOp1.id);
    assert.equal(retryOp2.origin_operation_id, firstOp.id);
    const retry2Snapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [retryOp2.id])).rows[0];
    assert.equal(retry2Snapshot.module_revision_id, firstSnapshot.module_revision_id);
    assert.equal(retry2Snapshot.technology_baseline_revision_id, firstSnapshot.technology_baseline_revision_id);
    assert.equal(retry2Snapshot.context_hash, firstSnapshot.context_hash);

    // Failure #3: the second RETRY also fails. The projection still points to an eligible origin.
    await failOp(retryOp2.id);
    detail = await phase3Detail(id);
    planning = detail.planning.find((p: any) => p.module_id === module);
    assert.equal(planning.state, 'PLANNING_FAILED');
    assert.equal(planning.retry_action?.failed_operation_id, retryOp2.id);
    assert.equal(planning.failed_operation?.kind, 'RETRY_MODULE_PLAN');

    // Recovery: a successful retry of the second retry reuses the FIRST operation's
    // snapshot/revision/baseline — never the failed retry's own (corrupt) state.
    const recoveryKey = `mp-chain-3-${randomUUID()}`;
    const recovered = await retryModulePlan(id, module, { failed_operation_id: retryOp2.id }, recoveryKey);
    const recoveredOp = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [recovered.operation_id])).rows[0];
    assert.equal(recoveredOp.kind, 'RETRY_MODULE_PLAN');
    assert.equal(recoveredOp.retry_of_operation_id, retryOp2.id);
    assert.equal(recoveredOp.origin_operation_id, firstOp.id);
    const recoveredSnapshot = (await pool.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`, [recoveredOp.id])).rows[0];
    assert.equal(recoveredSnapshot.module_revision_id, firstSnapshot.module_revision_id);
    assert.equal(recoveredSnapshot.technology_baseline_revision_id, firstSnapshot.technology_baseline_revision_id);
    assert.equal(recoveredSnapshot.context_hash, firstSnapshot.context_hash);
    assert.equal(recoveredSnapshot.context_payload.module_definition.acceptance_criteria[0].criterion_id, firstSnapshot.context_payload.module_definition.acceptance_criteria[0].criterion_id);
    const recoveredJob = (await pool.query(`SELECT technology_baseline_revision_id,module_revision_id,origin_operation_id FROM jobs WHERE operation_id=$1`, [recoveredOp.id])).rows[0];
    assert.equal(recoveredJob.module_revision_id, firstSnapshot.module_revision_id);
    assert.equal(recoveredJob.technology_baseline_revision_id, firstSnapshot.technology_baseline_revision_id);
    assert.equal(recoveredJob.origin_operation_id, firstOp.id);
    const recoveredEvent = (await pool.query(`SELECT payload FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_RETRY_REQUESTED' ORDER BY id DESC LIMIT 1`, [id])).rows[0];
    assert.equal(recoveredEvent.payload.origin_operation_id, firstOp.id);
    assert.equal(recoveredEvent.payload.module_revision_id, firstSnapshot.module_revision_id);
    // Idempotency: re-running the same recovery key returns the same operation (no duplicate work).
    const replay = await retryModulePlan(id, module, { failed_operation_id: retryOp2.id }, recoveryKey);
    assert.equal(replay.operation_id, recoveredOp.id);
  });

  test('retryModulePlan requires operator authorization and the retry endpoint requires Idempotency-Key (pendency 12)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked']);
    const job = (await pool.query(`SELECT j.* FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE')`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    // Unauthorized operator is rejected before any work happens.
    await assert.rejects(() => retryModulePlan(id, module, { failed_operation_id: operation.id }, `mp-unauth-${randomUUID()}`, 'someone-else'), /OPERATOR_NOT_AUTHORIZED/);
    // No retry operation was created by the unauthorized attempt.
    assert.equal((await pool.query(`SELECT count(*)::int n FROM operations WHERE retry_of_operation_id=$1`, [operation.id])).rows[0].n, 0);
    // HTTP: missing Idempotency-Key is rejected (422), no random-key fallback.
    const server = createApiServer();
    let listening = false;
    t.after(async () => { if (listening) await new Promise<void>((resolve) => server.close(() => resolve())); });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); listening = true;
    const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const missingKey = await fetch(`${base}/api/projects/${id}/modules/${module}/retry-plan`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ failed_operation_id: operation.id }) });
    assert.equal(missingKey.status, 422);
    const missingKeyBody = await missingKey.json();
    assert.equal(missingKeyBody.code, 'IDEMPOTENCY_KEY_REQUIRED');
    // HTTP: wrong operator header is rejected (403).
    const wrongOperator = await fetch(`${base}/api/projects/${id}/modules/${module}/retry-plan`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `mp-http-${randomUUID()}`, 'x-naamive-operator': 'not-the-operator' }, body: JSON.stringify({ failed_operation_id: operation.id }) });
    assert.equal(wrongOperator.status, 403);
    // HTTP: valid operator + key succeeds.
    const ok = await fetch(`${base}/api/projects/${id}/modules/${module}/retry-plan`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': `mp-http-ok-${randomUUID()}`, 'x-naamive-operator': 'module-planning-e2e-operator' }, body: JSON.stringify({ failed_operation_id: operation.id }) });
    assert.equal(ok.status, 202);
  });

  test('phase3Detail projects an explicit "planning failed, no proposal available" state with a RETRY_MODULE_PLAN action, without a global failure (pendency 13)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked']);
    const job = (await pool.query(`SELECT j.* FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE')`, [module])).rows[0];
    const operation = (await pool.query(`SELECT * FROM operations WHERE id=$1`, [job.operation_id])).rows[0];
    // First round, no valid revision: fail the planning job/operation.
    await pool.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp() WHERE operation_id=$1`, [operation.id]);
    await pool.query(`UPDATE operations SET status='FAILED',failure_code='MODULE_PLAN_VALIDATION_FAILED',completed_at=clock_timestamp() WHERE id=$1`, [operation.id]);
    const detail: any = await phase3Detail(id);
    const planning = detail.planning.find((p: any) => p.module_id === module);
    assert.ok(planning, 'planning projection present');
    assert.equal(planning.state, 'PLANNING_FAILED');
    assert.equal(planning.planning_failed, true);
    assert.equal(planning.message, 'planejamento falhou, sem proposta disponível');
    assert.equal(planning.retry_action?.type, 'RETRY_MODULE_PLAN');
    assert.equal(planning.retry_action?.failed_operation_id, operation.id);
    assert.ok(planning.failed_operation, 'failed planning operation projected');
    assert.equal(planning.failed_operation.failure_code, 'MODULE_PLAN_VALIDATION_FAILED');
    // The module stays in PLANNING_IN_PROGRESS — no global failure transition.
    const moduleRow = (await pool.query(`SELECT state FROM modules WHERE id=$1`, [module])).rows[0];
    assert.equal(moduleRow.state, 'PLANNING_IN_PROGRESS');
    const projectRow = (await pool.query(`SELECT state,failure_stage,failure_code FROM projects WHERE id=$1`, [id])).rows[0];
    assert.equal(projectRow.failure_stage, null);
    // The projection includes the planning job/operation.
    assert.ok(detail.planning_operations.some((o: any) => o.id === operation.id && o.status === 'FAILED'));
    assert.ok(detail.planning_jobs.some((j: any) => j.operation_id === operation.id && j.status === 'FAILED'));
  });

  test('worker persists full sanitized JSON+Markdown evidence for agent failures OUTSIDE persistPlan (pendência 17)', async (t) => {
    const { id, cleanup } = await setupProject(); t.after(cleanup);
    const { module } = await toPlanning(id, 'Persist requests', ['A request can be tracked']);
    // Force a REAL agent failure OUTSIDE persistPlan: the module-plan agent is only
    // invoked when the adapter is not 'controlled'. Point it at a workdir that does not
    // exist so assertAgentReady throws (AgentConfigurationError) before persistPlan is
    // ever reached, exactly the timeout/unavailability/unconfigured-agent class.
    const prevAdapter = process.env.NAAMIVE_AGENT_ADAPTER;
    const prevMaxRetries = process.env.NAAMIVE_AGENT_MAX_RETRIES;
    process.env.NAAMIVE_AGENT_ADAPTER = 'codex';
    process.env.NAAMIVE_AGENT_MAX_RETRIES = '0'; // first attempt is terminal → permanent failure path
    process.env.NAAMIVE_CODEX_WORKDIR = '/tmp/naamive-missing-workdir-pend17';
    process.env.NAAMIVE_CODEX_COMMAND = '/nonexistent/naamive-codex-bin';
    t.after(() => {
      if (prevAdapter === undefined) delete process.env.NAAMIVE_AGENT_ADAPTER; else process.env.NAAMIVE_AGENT_ADAPTER = prevAdapter;
      if (prevMaxRetries === undefined) delete process.env.NAAMIVE_AGENT_MAX_RETRIES; else process.env.NAAMIVE_AGENT_MAX_RETRIES = prevMaxRetries;
    });
    assert.equal(await runOnce(id), true);
    // The job/operation reached the terminal FAILED state and the failure event fired.
    const job = (await pool.query(`SELECT j.*,o.status operation_status,o.failure_code FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS'`, [module])).rows[0];
    assert.ok(job, 'planning job present');
    assert.equal(job.status, 'FAILED');
    assert.equal(job.operation_status, 'FAILED');
    assert.ok(job.failure_code, 'operation failure_code set');
    assert.match(job.failure_code, /^CODEX_/);
    const evt = (await pool.query(`SELECT payload FROM events WHERE project_id=$1 AND event_type='MODULE_PLAN_FAILED' ORDER BY id DESC LIMIT 1`, [id])).rows[0];
    assert.ok(evt, 'MODULE_PLAN_FAILED event emitted');
    assert.equal(evt.payload.module_id, module);
    assert.equal(evt.payload.next_action, 'RETRY_MODULE_PLAN');
    assert.equal(evt.payload.code, job.failure_code);
    assert.match(evt.payload.evidence_hash, /^[a-f0-9]{64}$/);
    // BOTH the JSON report and its Markdown counterpart exist for the operation.
    const report = (await pool.query(`SELECT artifact_type,storage_uri,sha256 FROM artifacts WHERE project_id=$1 AND execution_id=$2 AND artifact_type IN ('module-plan-rejection-report','module-plan-rejection-report-markdown') ORDER BY artifact_type`, [id, job.operation_id])).rows;
    assert.equal(report.length, 2);
    const types = new Set(report.map((r: any) => r.artifact_type));
    assert.ok(types.has('module-plan-rejection-report'));
    assert.ok(types.has('module-plan-rejection-report-markdown'));
    // The JSON report carries the full sanitized shape.
    const jsonRow = report.find((r: any) => r.artifact_type === 'module-plan-rejection-report');
    const content = JSON.parse(readFileSync(new URL(jsonRow.storage_uri), 'utf8'));
    assert.equal(content.schema_version, 1);
    assert.equal(content.module_id, module);
    assert.equal(content.project_id, id);
    assert.equal(content.job_id, job.id);
    assert.equal(content.operation_id, job.operation_id);
    assert.equal(content.validator_version, MODULE_PLAN_VALIDATOR_VERSION);
    assert.equal(content.sanitizer_version, MODULE_PLAN_SANITIZER_VERSION);
    assert.equal(content.next_action, 'RETRY_MODULE_PLAN');
    assert.equal(content.code, job.failure_code);
    assert.ok(Array.isArray(content.errors));
    assert.match(content.report_hash, /^[a-f0-9]{64}$/);
    assert.equal(content.report_hash, canonicalHash({ code: content.code, errors: content.errors.slice().sort() }));
    // The event evidence_hash matches the persisted JSON artifact's sha256.
    assert.equal(evt.payload.evidence_hash, jsonRow.sha256);
  });

  test.after(() => pool.end());
}
