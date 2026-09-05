import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file:///tmp/naamive-terminal-job-recovery-artifacts-${process.pid}`;
process.env.NAAMIVE_OPERATOR_ID ??= 'terminal-job-recovery-tester';

if (process.env.DATABASE_URL.includes('unused')) test('terminal job recovery integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool } = await import('./db.js');
  const { loadCatalogSeedPackage, catalogPackageHash, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { reconcileTerminalJobInconsistencies } = await import('./inconsistency-recovery.js');
  const { createApiServer } = await import('./server.js');
  const { runOnce } = await import('./worker.js');
  const { testAuthenticatedHeaders } = await import('./test-auth.js');
  const base: any = await loadCatalogSeedPackage(); let revisionNumber = Date.now() * 1000;
  const publish = async () => {
    const seed = structuredClone(base); seed.catalog_revision = ++revisionNumber;
    for (const key of ['categories','catalogItems','profiles','profileItems','compatibilityRules','catalogRevision']) seed[key].catalog_revision = seed.catalog_revision;
    seed.catalogRevision.records[0].catalog_revision = seed.catalog_revision;
    seed.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed));
    return publishTechnologyCatalog(seed, 'terminal-job-recovery-tester', randomUUID());
  };
  const fixture = async (workflowVersion = 3, operationWorkflowVersion = workflowVersion) => {
    const project = `rec01-terminal-${randomUUID().slice(0, 12)}`, revision = randomUUID(), operation = randomUUID(), job = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft)
      VALUES($1,'REC-01 terminal recovery','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',$2,'TECHNOLOGY_SELECTION_PREPARING','{}')`, [project, workflowVersion]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/rec01-intake','tester')`, [revision, project, 'a'.repeat(64), 'b'.repeat(64)]);
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version,failure_code)
      VALUES($1,$2,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','FAILED',$3,$4,$5,'PROJECT_DISCOVERY',$6,'AGENT_EXECUTION_FAILED')`, [operation, project, `rec01-source-op:${project}`, randomUUID(), revision, operationWorkflowVersion]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,attempts,last_error,completed_at,idempotency_key)
      VALUES($1,$2,$3,$4,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','FAILED',3,'AGENT_EXECUTION_FAILED',clock_timestamp(),$5)`, [job, operation, project, revision, `rec01-source-job:${project}`]);
    const cleanup = async () => {
      await pool.query(`DELETE FROM auth_audit_records WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM auth_role_grants WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM inconsistency_cases WHERE project_id=$1`, [project]);
      for (const table of ['technology_inventory','technology_selection_contexts']) await pool.query(`DELETE FROM ${table} WHERE project_key=$1`, [project]);
      await pool.query(`DELETE FROM events WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM artifacts WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM operations WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM intake_revisions WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM projects WHERE id=$1`, [project]);
    };
    return { project, revision, operation, job, cleanup };
  };
  test.after(async () => pool.end());

  test('REC-01 discovers historical terminal jobs, provides an authorized descriptor, fences concurrent recovery, and resolves through the normal worker', async t => {
    await publish();
    const f = await fixture();
    assert.deepEqual(await reconcileTerminalJobInconsistencies(), { materialized: 1, waiting_reconciliation: 0, resolved_from_effect: 0 });
    assert.equal((await reconcileTerminalJobInconsistencies()).materialized, 0, 'historical detection is idempotent');
    const source = (await pool.query(`SELECT j.status,j.attempts,j.last_error,o.status AS operation_status FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.id=$1`, [f.job])).rows[0];
    assert.deepEqual({ status: source.status, attempts: Number(source.attempts), last_error: source.last_error, operation_status: source.operation_status }, { status: 'FAILED', attempts: 3, last_error: 'AGENT_EXECUTION_FAILED', operation_status: 'FAILED' });
    const caseRow: any = (await pool.query(`SELECT * FROM inconsistency_cases WHERE source_job_id=$1`, [f.job])).rows[0];
    assert.equal(caseRow.status, 'OPEN'); assert.equal(caseRow.generation, 1); assert.equal(caseRow.source_operation_id, f.operation);
    const authorized = await testAuthenticatedHeaders(f.project, [{ role_code:'OPERATOR', action_code:'READ_PROJECT' }, { role_code:'OPERATOR', action_code:'OPERATE_PROJECT' }]);
    const observer = await testAuthenticatedHeaders(f.project, [{ role_code:'OPERATOR', action_code:'READ_PROJECT' }]);
    t.after(async()=>{await authorized.cleanup();await observer.cleanup();});
    t.after(f.cleanup);
    const server = createApiServer(); let listening = false;
    t.after(async () => { if (listening) { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); } });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); listening = true;
    const port = (server.address() as { port:number }).port;
    const projection = await fetch(`http://127.0.0.1:${port}/api/projects/${f.project}/projection`, { headers: authorized.headers });
    assert.equal(projection.status, 200); const body: any = await projection.json();
    assert.equal(body.resources.inconsistencies[0].id, caseRow.id);
    const descriptor = body.allowed_actions.find((item: any) => item.code === 'RECOVER_FAILED_OPERATION');
    assert.ok(descriptor); assert.equal(descriptor.input_binding.fields.find((field: any) => field.name === 'expected_generation').value, 1);
    assert.ok(body.stop_surfaces.some((surface: any) => surface.subject?.id === caseRow.id && surface.action_descriptor_id === descriptor.descriptor_id));
    const observerProjection: any = await (await fetch(`http://127.0.0.1:${port}/api/projects/${f.project}/projection`, { headers: observer.headers })).json();
    assert.equal(observerProjection.allowed_actions.some((item: any) => item.code === 'RECOVER_FAILED_OPERATION'), false, 'READ_PROJECT alone never receives recovery authority');
    const recover = () => fetch(`http://127.0.0.1:${port}${descriptor.command.href}`, { method:'POST', headers:{ ...authorized.headers, 'content-type':'application/json', 'idempotency-key':randomUUID() }, body:JSON.stringify({ expected_generation:1 }) });
    const [a,b] = await Promise.all([recover(),recover()]);
    assert.equal(a.status, 202, await a.text()); assert.equal(b.status, 202, await b.text());
    const chain = (await pool.query(`SELECT o.id operation_id,o.predecessor_operation_id,j.id job_id,j.predecessor_job_id,j.inconsistency_case_id FROM operations o JOIN jobs j ON j.operation_id=o.id WHERE o.inconsistency_case_id=$1`, [caseRow.id])).rows;
    assert.equal(chain.length, 1); assert.equal(chain[0].predecessor_operation_id, f.operation); assert.equal(chain[0].predecessor_job_id, f.job); assert.equal(chain[0].inconsistency_case_id, caseRow.id);
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE project_id=$1 AND kind='PREPARE_TECHNOLOGY_SELECTION_CONTEXT'`, [f.project])).rows[0].n, 2);
    assert.equal(await runOnce(f.project), true);
    assert.equal((await pool.query(`SELECT status,attempts FROM jobs WHERE id=$1`, [f.job])).rows[0].status, 'FAILED', 'source is never resurrected');
    assert.equal(Number((await pool.query(`SELECT attempts FROM jobs WHERE id=$1`, [f.job])).rows[0].attempts), 3, 'source attempt history is immutable');
    assert.equal((await pool.query(`SELECT status FROM technology_selection_contexts WHERE project_key=$1 ORDER BY created_at DESC LIMIT 1`, [f.project])).rows[0].status, 'READY');
    assert.equal((await pool.query(`SELECT state FROM projects WHERE id=$1`, [f.project])).rows[0].state, 'TECHNOLOGY_BASELINE_IN_REVIEW');
    assert.equal((await pool.query(`SELECT status FROM inconsistency_cases WHERE id=$1`, [caseRow.id])).rows[0].status, 'RESOLVED');
    const stale = await recover(); const staleBody: any = await stale.json(); assert.equal(stale.status, 409); assert.equal(staleBody.code, 'INCONSISTENCY_ALREADY_RESOLVED');
  });

  test('REC-01 fails closed for unknown workflow and a conflicting equivalent operation', async t => {
    const unsupported = await fixture(3,999); t.after(unsupported.cleanup);
    assert.equal((await reconcileTerminalJobInconsistencies()).materialized, 0, 'unknown workflow/version is not inferred into a strategy');
    const supported = await fixture(); t.after(supported.cleanup);
    await reconcileTerminalJobInconsistencies();
    const caseRow: any = (await pool.query(`SELECT * FROM inconsistency_cases WHERE source_job_id=$1`, [supported.job])).rows[0];
    const operation = randomUUID(), job = randomUUID();
    await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,workflow_code,workflow_version) VALUES($1,$2,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT','QUEUED',$3,$4,$5,'PROJECT_DISCOVERY',3)`, [operation,supported.project,`rec01-conflict-op:${supported.project}`,randomUUID(),supported.revision]);
    await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'PREPARE_TECHNOLOGY_SELECTION_CONTEXT',$5)`, [job,operation,supported.project,supported.revision,`rec01-conflict-job:${supported.project}`]);
    const { requestTerminalJobRecovery } = await import('./inconsistency-recovery.js');
    await assert.rejects(() => requestTerminalJobRecovery(supported.project,caseRow.id,1), /INCONSISTENCY_EQUIVALENT_OPERATION_ACTIVE/);
  });

  test('REC-01 preserves a failed recovery chain, advances its generation, and never auto-loops', async t => {
    await publish(); const f = await fixture(); t.after(f.cleanup);
    await reconcileTerminalJobInconsistencies();
    const current: any = (await pool.query(`SELECT * FROM inconsistency_cases WHERE source_job_id=$1`, [f.job])).rows[0];
    const { requestTerminalJobRecovery } = await import('./inconsistency-recovery.js');
    const accepted: any = await requestTerminalJobRecovery(f.project,current.id,1);
    await pool.query(`UPDATE jobs SET attempts=99 WHERE id=$1`, [accepted.resolution_job_id]);
    await pool.query(`CREATE FUNCTION rec01_recovery_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.event_type='TECHNOLOGY_SELECTION_CONTEXT_READY' THEN RAISE EXCEPTION 'REC01 expected recovery failure'; END IF; RETURN NEW; END $$`);
    await pool.query(`CREATE TRIGGER rec01_recovery_failure BEFORE INSERT ON events FOR EACH ROW EXECUTE FUNCTION rec01_recovery_failure()`);
    try { assert.equal(await runOnce(f.project), true); }
    finally { await pool.query(`DROP TRIGGER rec01_recovery_failure ON events`); await pool.query(`DROP FUNCTION rec01_recovery_failure()`); }
    const failedRecovery: any = (await pool.query(`SELECT status,generation,recovery_attempts,resolution_job_id FROM inconsistency_cases WHERE id=$1`, [current.id])).rows[0];
    assert.deepEqual({ status:failedRecovery.status, generation:Number(failedRecovery.generation), recovery_attempts:Number(failedRecovery.recovery_attempts) }, { status:'OPEN', generation:2, recovery_attempts:1 });
    assert.equal((await pool.query(`SELECT status FROM jobs WHERE id=$1`, [f.job])).rows[0].status, 'FAILED');
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM jobs WHERE project_id=$1 AND kind='PREPARE_TECHNOLOGY_SELECTION_CONTEXT'`, [f.project])).rows[0].n, 2, 'terminal recovery does not create a third job automatically');
    assert.equal(await runOnce(f.project), false, 'reconciliation does not retry an OPEN human-governed case');
  });

  test('REC-01 moves an expired recovery lease to WAITING_RECONCILIATION until its effect is known', async t => {
    const f = await fixture(); t.after(f.cleanup);
    await reconcileTerminalJobInconsistencies(); const current: any = (await pool.query(`SELECT * FROM inconsistency_cases WHERE source_job_id=$1`, [f.job])).rows[0];
    const { requestTerminalJobRecovery } = await import('./inconsistency-recovery.js'); const accepted: any = await requestTerminalJobRecovery(f.project,current.id,1);
    await pool.query(`UPDATE jobs SET status='LEASED',lease_expires_at=clock_timestamp()-interval '1 second' WHERE id=$1`, [accepted.resolution_job_id]);
    await pool.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`, [accepted.resolution_operation_id]);
    await pool.query(`UPDATE inconsistency_cases SET status='RECOVERY_RUNNING' WHERE id=$1`, [current.id]);
    assert.equal((await reconcileTerminalJobInconsistencies()).waiting_reconciliation, 1);
    assert.equal((await pool.query(`SELECT status FROM inconsistency_cases WHERE id=$1`, [current.id])).rows[0].status, 'WAITING_RECONCILIATION');
  });
}
