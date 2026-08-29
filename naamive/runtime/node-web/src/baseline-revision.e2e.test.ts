import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.baseline-revision-artifacts`;
process.env.NAAMIVE_OPERATOR_ID ??= 'baseline-revision-tester';

if (process.env.DATABASE_URL.includes('unused')) test('baseline revision integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
else {
  const { pool, withTransaction } = await import('./db.js');
  const { loadCatalogSeedPackage, catalogPackageHash, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const { createTechnologyBaselineDraft } = await import('./baseline-draft.js');
  const { startTechnologyBaselineRevision } = await import('./baseline-revision.js');
  const { submitTechnologyBaseline, decideTechnologyBaseline } = await import('./baseline-gate.js');
  const { runOnce } = await import('./worker.js');
  const { materializeModule } = await import('./phase3.js');
  const { putArtifact } = await import('./artifacts.js');
  const { buildStateActionProjection } = await import('./state-action-projection.js');

  const publish = async (n = Date.now() * 100 + Math.floor(Math.random() * 99)) => { const seed: any = structuredClone(await loadCatalogSeedPackage()); for (const key of ['categories', 'catalogItems', 'profiles', 'profileItems', 'compatibilityRules', 'catalogRevision']) seed[key].catalog_revision = n; seed.catalogRevision.records[0].catalog_revision = n; seed.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(seed)); return publishTechnologyCatalog(seed, 'baseline-revision-tester', randomUUID()); };
  const inventory = async (project: string, catalogRevisionId: string) => { const intake = (await pool.query(`SELECT id FROM intake_revisions WHERE project_id=$1 LIMIT 1`, [project])).rows[0].id, operation = randomUUID(), job = randomUUID(); await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id) VALUES($1,$2,'TECHNOLOGY_INVENTORY','SUCCEEDED',$3,$4,$5)`, [operation, project, `revision-inventory:${operation}`, randomUUID(), intake]); await pool.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,status,idempotency_key,completed_at) VALUES($1,$2,$3,$4,'START_TECHNOLOGY_INVENTORY','COMPLETED',$5,clock_timestamp())`, [job, operation, project, intake, `revision-inventory-job:${job}`]); await pool.query(`INSERT INTO technology_inventory(id,project_id,project_key,repository_sha,job_id,technology_catalog_revision_id,source_path,detector_code,confidence,value,resolution_result) VALUES($1,$2::uuid,$2,'000',$3,$4,'package.json','TEST',1,'TEST','UNKNOWN_CATALOG_ITEM')`, [randomUUID(), project, job, catalogRevisionId]); await putArtifact(pool as any, project, 'technology-inventory', JSON.stringify({ technology_catalog_revision_id: catalogRevisionId, evidence_hash: 'a'.repeat(64) }), job); };
  const setup = async () => { const catalog: any = await publish(), project = randomUUID(), context = randomUUID(), intake = randomUUID(), profile = (await pool.query(`SELECT profile_id FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND is_active LIMIT 1`, [catalog.revisionId])).rows[0].profile_id; await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'baseline revision','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',3,'TECHNOLOGY_BASELINE_IN_REVIEW','{}')`, [project]); await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by) VALUES($1,$2,1,'{}',$3,$4,'file:///tmp/intake','tester')`, [intake, project, 'a'.repeat(64), 'b'.repeat(64)]); await pool.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,technology_profile_id,hash,status) VALUES($1,$2::uuid,$2,$3,$4,$5,'READY')`, [context, project, catalog.revisionId, profile, 'c'.repeat(64)]); await inventory(project, catalog.revisionId); const draft: any = await withTransaction(client => createTechnologyBaselineDraft(client, project)); return { project, baseline: draft.baselineId, context, first: draft.revisionId, catalog: catalog.revisionId }; };
  const approve = async (project: string, revision: string, key: string) => { const submitted: any = await submitTechnologyBaseline(project, revision, `submit:${key}`); await decideTechnologyBaseline(project, revision, { gate_id: submitted.gate_id, version: 1, decision: 'APPROVED' }, `approve:${key}`); };
  const createSuccessor = async (project: string, predecessor: string, key: string) => { const started: any = await startTechnologyBaselineRevision(project, predecessor, key); await runOnce(project); const context: any = (await pool.query(`SELECT * FROM technology_selection_contexts WHERE project_key=$1 ORDER BY created_at DESC LIMIT 1`, [project])).rows[0]; await inventory(project, context.technology_catalog_revision_id); const draft: any = await withTransaction(client => createTechnologyBaselineDraft(client, project)); return { started, context, draft }; };

  test.after(() => pool.end());
  test('UI-01 publishes materialization from the canonical projection only for eligible v3 and explicit legacy workflows', async t => {
    const principalId = randomUUID(), principal = { id: principalId, type: 'HUMAN' as const, username: `materialization-projection-${principalId.slice(0, 8)}` };
    const grants: string[] = [];
    const grant = async (projectId: string) => {
      const id = randomUUID(); grants.push(id);
      await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id) VALUES($1,$2,'OPERATOR',$3,$4)`, [id, principalId, 'READ_PROJECT', projectId]);
      const operate = randomUUID(); grants.push(operate);
      await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id) VALUES($1,$2,'OPERATOR',$3,$4)`, [operate, principalId, 'OPERATE_PROJECT', projectId]);
    };
    const transientProjects: string[] = [];
    t.after(async () => {
      for (const projectId of transientProjects) await pool.query(`DELETE FROM projects WHERE id=$1`, [projectId]);
      await pool.query(`DELETE FROM auth_role_grants WHERE id = ANY($1::uuid[])`, [grants]);
      await pool.query(`DELETE FROM auth_principals WHERE id=$1`, [principalId]);
    });
    await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`, [principalId, principal.username]);

    const noBaseline = await setup();
    await grant(noBaseline.project);
    await pool.query(`UPDATE projects SET state='READY_FOR_MODULE_MATERIALIZATION' WHERE id=$1`, [noBaseline.project]);
    assert.equal((await buildStateActionProjection(noBaseline.project, principal)).allowed_actions.some(action => action.code === 'MATERIALIZE_MODULE'), false, 'v3 fails closed before an approved baseline exists');

    const approved = await setup();
    await approve(approved.project, approved.first, `projection-approved:${approved.project}`);
    const first = (await pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`, [approved.first])).rows[0];
    const second = randomUUID(), rejected = randomUUID();
    await pool.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,revision_number,status,payload,schema_version) VALUES($1,$2,$3::uuid,$3,$4,$5,2,'APPROVED',$6,'technology-baseline/v1')`, [second, approved.baseline, approved.project, first.technology_catalog_revision_id, first.selection_context_id, first.payload]);
    await pool.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,revision_number,status,payload,schema_version) VALUES($1,$2,$3::uuid,$3,$4,$5,3,'REJECTED',$6,'technology-baseline/v1')`, [rejected, approved.baseline, approved.project, first.technology_catalog_revision_id, first.selection_context_id, first.payload]);
    await grant(approved.project);
    const descriptor = (await buildStateActionProjection(approved.project, principal)).allowed_actions.find(action => action.code === 'MATERIALIZE_MODULE');
    assert.ok(descriptor, 'approved v3 baseline publishes materialization');
    assert.deepEqual(descriptor.target, { resource_kind: 'PROJECT', resource_id: approved.project });
    assert.deepEqual(descriptor.command, { method: 'POST', href: `/api/projects/${approved.project}/modules`, idempotency_required: true });
    assert.deepEqual(descriptor.input.schema?.required, ['module_key']);
    assert.deepEqual(Object.keys(descriptor.input.schema?.properties ?? {}).sort(), ['acceptance_criteria', 'dependencies', 'module_key', 'name', 'objective', 'out_of_scope', 'scope', 'source_gate', 'technology_baseline_revision_id']);
    assert.deepEqual(descriptor.input.schema?.properties.technology_baseline_revision_id?.enum, [second, approved.first], 'only approved baseline revisions are selectable');
    assert.ok(!descriptor.input.schema?.properties.technology_baseline_revision_id?.enum?.includes(rejected));

    const legacy = randomUUID(); transientProjects.push(legacy);
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'legacy materialization','owner','tester','/tmp','local','main','000','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT','{}')`, [legacy]);
    await grant(legacy);
    const legacyDescriptor = (await buildStateActionProjection(legacy, principal)).allowed_actions.find(action => action.code === 'MATERIALIZE_MODULE');
    assert.ok(legacyDescriptor, 'the explicitly supported legacy v2 state remains materializable');
    assert.equal('technology_baseline_revision_id' in (legacyDescriptor.input.schema?.properties ?? {}), false);

    const unknown = randomUUID(); transientProjects.push(unknown);
    const unknownWorkflowId = randomUUID(), unknownWorkflowCode = `UNKNOWN_MATERIALIZATION_${unknown.slice(0, 8)}`;
    t.after(async () => {
      await pool.query(`DELETE FROM projects WHERE id=$1`, [unknown]);
      await pool.query(`UPDATE workflow_definitions SET status='RETIRED' WHERE id=$1`, [unknownWorkflowId]);
      await pool.query(`DELETE FROM workflow_states WHERE workflow_id=$1`, [unknownWorkflowId]);
      await pool.query(`DELETE FROM workflow_definitions WHERE id=$1`, [unknownWorkflowId]);
    });
    await pool.query(`INSERT INTO workflow_definitions(id,code,version,scope,status,published_at) VALUES($1,$2,99,'PROJECT','PUBLISHED',clock_timestamp())`, [unknownWorkflowId, unknownWorkflowCode]);
    await pool.query(`INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position) VALUES($1,'PRODUCT_COMMITMENT','Unknown materialization state',false,1)`, [unknownWorkflowId]);
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,workflow_code,workflow_version,state,draft) VALUES($1,'unknown materialization','owner','tester','/tmp','local','main','000',$2,99,'PRODUCT_COMMITMENT','{}')`, [unknown, unknownWorkflowCode]);
    await grant(unknown);
    const unknownProjection = await buildStateActionProjection(unknown, principal);
    assert.equal(unknownProjection.project.legacy, true); assert.equal(unknownProjection.project.journey_status, 'LEGACY_READ_ONLY');
    assert.deepEqual(unknownProjection.allowed_actions, []);

    const unauthorizedId = randomUUID(), unauthorized = { id: unauthorizedId, type: 'HUMAN' as const, username: `materialization-denied-${unauthorizedId.slice(0, 8)}` };
    t.after(async () => {
      await pool.query(`DELETE FROM auth_role_grants WHERE principal_id=$1`, [unauthorizedId]);
      await pool.query(`DELETE FROM auth_principals WHERE id=$1`, [unauthorizedId]);
    });
    await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`, [unauthorizedId, unauthorized.username]);
    const readGrant = randomUUID();
    await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id) VALUES($1,$2,'OPERATOR','READ_PROJECT',$3)`, [readGrant, unauthorizedId, approved.project]);
    assert.equal((await buildStateActionProjection(approved.project, unauthorized)).allowed_actions.some(action => action.code === 'MATERIALIZE_MODULE'), false, 'a missing OPERATE_PROJECT grant suppresses materialization');
  });
  test('F5-13 preserves terminal lineage, monotonic numbering, evidence, and approved-module coexistence', async () => {
    const f = await setup(); await approve(f.project, f.first, f.project);
    const first: any = (await pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`, [f.first])).rows[0], second = randomUUID();
    await pool.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,revision_number,status,payload,schema_version) VALUES($1,$2,$3::uuid,$3,$4,$5,2,'APPROVED',$6,'technology-baseline/v1')`, [second, f.baseline, f.project, first.technology_catalog_revision_id, first.selection_context_id, first.payload]);
    const successor = await createSuccessor(f.project, f.first, `start:${f.project}`); const again: any = await startTechnologyBaselineRevision(f.project, f.first, `start:${f.project}`); assert.equal(again.operation_id, successor.started.operation_id);
    const row: any = (await pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`, [successor.draft.revisionId])).rows[0];
    assert.equal(Number(row.revision_number), 3); assert.equal(row.supersedes_revision_id, f.first); assert.equal(row.baseline_id, f.baseline); assert.equal((await pool.query(`SELECT status FROM technology_baseline_revisions WHERE id=$1`, [f.first])).rows[0].status, 'APPROVED'); assert.equal(successor.context.supersedes_baseline_revision_id, f.first); assert.equal((await pool.query(`SELECT status FROM technology_selection_contexts WHERE id=$1`, [f.context])).rows[0].status, 'SUPERSEDED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM artifacts WHERE project_id=$1 AND artifact_type='technology-baseline-revision'`, [f.project])).rows[0].n), 1);
    const evidence = (await pool.query(`SELECT artifact_type,storage_uri,sha256 FROM artifacts WHERE project_id=$1 AND artifact_type IN ('technology-inventory','technology-baseline','technology-baseline-decision','technology-baseline-revision') ORDER BY artifact_type`, [f.project])).rows; assert.deepEqual([...new Set(evidence.map((item: any) => item.artifact_type))], ['technology-baseline','technology-baseline-decision','technology-baseline-revision','technology-inventory']); for (const item of evidence) { const content = readFileSync(new URL(item.storage_uri),'utf8'); assert.equal(createHash('sha256').update(content).digest('hex'), item.sha256); assert.doesNotMatch(content,/(token|password|secret|api[_ -]?key|authorization|configuration|stdout|stderr|prompt)/i); }
    const latest: any = await materializeModule(f.project, { module_key: `latest-${Date.now()}` }, `latest:${f.project}`), explicit: any = await materializeModule(f.project, { module_key: `explicit-${Date.now()}`, technology_baseline_revision_id: f.first }, `explicit:${f.project}`); assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM module_revisions WHERE id=$1`, [latest.revision_id])).rows[0].technology_baseline_revision_id, second); assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM module_revisions WHERE id=$1`, [explicit.revision_id])).rows[0].technology_baseline_revision_id, f.first); const blocked = [{ id: row.id, status: 'DRAFT', number: 3, key: 'draft' }, { id: randomUUID(), status: 'PENDING_APPROVAL', number: 4, key: 'pending' }, { id: randomUUID(), status: 'REJECTED', number: 5, key: 'rejected' }]; for (const entry of blocked) { if (entry.id !== row.id) await pool.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,revision_number,status,payload,schema_version) VALUES($1,$2,$3::uuid,$3,$4,$5,$6,$7,$8,'technology-baseline/v1')`, [entry.id, f.baseline, f.project, first.technology_catalog_revision_id, first.selection_context_id, entry.number, entry.status, first.payload]); await assert.rejects(() => materializeModule(f.project, { module_key: `${entry.key}-${Date.now()}`, technology_baseline_revision_id: entry.id }, `${entry.status}:${f.project}`), /TECHNOLOGY_BASELINE_REVISION_NOT_APPROVED/); }
  });
  test('F5-13 accepts rejected predecessors and rejects non-terminal or active predecessors', async () => { const rejected = await setup(), submitted: any = await submitTechnologyBaseline(rejected.project, rejected.first, `submit:${rejected.project}`); await decideTechnologyBaseline(rejected.project, rejected.first, { gate_id: submitted.gate_id, version: 1, decision: 'REJECTED', feedback: 'adjust' }, `reject:${rejected.project}`); const restarted: any = await startTechnologyBaselineRevision(rejected.project, rejected.first, `rejected:${rejected.project}`); await runOnce(rejected.project); assert.ok(restarted.job_id); const blocked = await setup(); await approve(blocked.project, blocked.first, blocked.project); const active = randomUUID(), initial: any = (await pool.query(`SELECT * FROM technology_baseline_revisions WHERE id=$1`, [blocked.first])).rows[0]; await pool.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,revision_number,status,payload,schema_version) VALUES($1,$2,$3::uuid,$3,$4,$5,2,'DRAFT',$6,'technology-baseline/v1')`, [active, blocked.baseline, blocked.project, initial.technology_catalog_revision_id, initial.selection_context_id, initial.payload]); await assert.rejects(() => startTechnologyBaselineRevision(blocked.project, blocked.first, `active:${blocked.project}`), /TECHNOLOGY_BASELINE_REVISION_ACTIVE_EXISTS/); await assert.rejects(() => startTechnologyBaselineRevision(blocked.project, active, `nonterminal:${blocked.project}`), /TECHNOLOGY_BASELINE_REVISION_NOT_TERMINAL/); });
  test('F5-19 keeps an approved module on its baseline while a later catalog context opens a new gate', async () => {
    const f = await setup();
    await assert.rejects(() => materializeModule(f.project, { module_key: `blocked-${Date.now()}` }, `blocked:${f.project}`), /TECHNOLOGY_BASELINE_APPROVAL_REQUIRED/);
    await approve(f.project, f.first, f.project);
    const firstModule: any = await materializeModule(f.project, { module_key: `first-${Date.now()}` }, `first:${f.project}`);
    assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM modules WHERE id=$1`, [firstModule.module_id])).rows[0].technology_baseline_revision_id, f.first);

    const catalogB: any = await publish(Date.now() * 1000 + 999);
    const successor = await createSuccessor(f.project, f.first, `later:${f.project}`);
    assert.equal(successor.context.technology_catalog_revision_id, catalogB.revisionId);
    assert.equal(successor.draft.baselineId, f.baseline);
    assert.equal((await pool.query(`SELECT technology_catalog_revision_id FROM technology_baseline_revisions WHERE id=$1`, [successor.draft.revisionId])).rows[0].technology_catalog_revision_id, catalogB.revisionId);
    const submitted: any = await submitTechnologyBaseline(f.project, successor.draft.revisionId, `submit-later:${f.project}`);
    assert.equal((await pool.query(`SELECT status FROM technology_baseline_gates WHERE id=$1`, [submitted.gate_id])).rows[0].status, 'OPEN');
    assert.equal((await pool.query(`SELECT status FROM technology_baseline_revisions WHERE id=$1`, [f.first])).rows[0].status, 'APPROVED');
    assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM modules WHERE id=$1`, [firstModule.module_id])).rows[0].technology_baseline_revision_id, f.first);

    await decideTechnologyBaseline(f.project, successor.draft.revisionId, { gate_id: submitted.gate_id, version: 1, decision: 'APPROVED' }, `approve-later:${f.project}`);
    const secondModule: any = await materializeModule(f.project, { module_key: `second-${Date.now()}` }, `second:${f.project}`);
    assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM modules WHERE id=$1`, [secondModule.module_id])).rows[0].technology_baseline_revision_id, successor.draft.revisionId);
  });
  test('F5-14 propagates an approved baseline through QA, Dev, findings and candidate manifest', async () => { const f = await setup(); await approve(f.project, f.first, f.project); const created: any = await materializeModule(f.project, { module_key: `propagation-${Date.now()}` }, `propagation:${f.project}`), module: any = (await pool.query(`SELECT * FROM modules WHERE id=$1`, [created.module_id])).rows[0], gate: any = (await pool.query(`SELECT * FROM module_gates WHERE id=$1`, [created.gate_id])).rows[0], round = randomUUID(), item = randomUUID(), delivery = randomUUID(), worktree = randomUUID(), operation = randomUUID(), job = randomUUID(), candidate = randomUUID(); assert.equal(module.technology_baseline_revision_id, f.first); assert.equal(gate.technology_baseline_revision_id, f.first); await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,2,'WORK_ITEMS_ACTIVE')`, [round, created.module_id, created.revision_id]); await pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload) VALUES($1,$2,$3,$4,$5,'propagation','{}')`, [item, f.project, created.module_id, created.revision_id, round]); await pool.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,state) VALUES($1,$2,$3,$4,$5,'000','RESERVED')`, [worktree, f.project, item, `/tmp/${worktree}`, `propagation-${worktree}`]); await pool.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,qa_matrix) VALUES($1,$2,$3,$4,$5,'000','[]')`, [delivery, f.project, item, created.revision_id, worktree]); await pool.query(`INSERT INTO qa_matrices(id,project_id,project_key,delivery_id,technology_baseline_revision_id,payload,hash) VALUES($1,$2::uuid,$2,$3,$4,'{}',$5)`, [randomUUID(), f.project, delivery, f.first, 'a'.repeat(64)]); await pool.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'TEST','SUCCEEDED',$3,$4)`, [operation, f.project, `propagation:${operation}`, randomUUID()]); await pool.query(`INSERT INTO jobs(id,operation_id,project_id,delivery_id,kind,status,completed_at,idempotency_key) VALUES($1,$2,$3,$4,'DEVELOP_WORK_ITEM','COMPLETED',clock_timestamp(),$5)`, [job, operation, f.project, delivery, `propagation:${job}`]); await pool.query(`INSERT INTO findings(id,project_id,delivery_id,origin,severity,rule_code,fingerprint,description) VALUES($1,$2,$3,'DELIVERY_QA','HIGH','PROPAGATION','propagation','propagation')`, [randomUUID(), f.project, delivery]); await pool.query(`INSERT INTO integration_candidates(id,project_id,phase_sha,manifest) VALUES($1,$2,'propagation',$3)`, [candidate, f.project, { phase_sha: 'propagation', work_items: [{ work_item_id: item, technology_baseline_revision_id: f.first, qa_matrix: [] }] }]); const refs = await pool.query(`SELECT technology_baseline_revision_id FROM work_items WHERE id=$1 UNION ALL SELECT technology_baseline_revision_id FROM deliveries WHERE id=$2 UNION ALL SELECT technology_baseline_revision_id FROM jobs WHERE id=$3 UNION ALL SELECT technology_baseline_revision_id FROM findings WHERE delivery_id=$2 UNION ALL SELECT technology_baseline_revision_id FROM qa_matrices WHERE delivery_id=$2`, [item, delivery, job]); assert.deepEqual(refs.rows.map((row: any) => row.technology_baseline_revision_id), Array(5).fill(f.first)); await pool.query(`UPDATE work_items SET technology_baseline_revision_id=NULL WHERE id=$1`, [item]); assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM work_items WHERE id=$1`, [item])).rows[0].technology_baseline_revision_id, f.first); await pool.query(`DELETE FROM jobs WHERE id=$1`, [job]); assert.deepEqual((await pool.query(`SELECT job_id,technology_baseline_revision_id FROM deliveries WHERE id=$1`, [delivery])).rows[0], { job_id: null, technology_baseline_revision_id: f.first }); });
}
