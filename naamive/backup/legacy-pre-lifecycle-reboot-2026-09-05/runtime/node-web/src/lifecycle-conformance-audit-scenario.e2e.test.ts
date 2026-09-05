import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { AuthenticatedPrincipal } from './auth.js';

if (!process.env.DATABASE_URL) {
  test('TST-01 audit scenario requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-tst01-artifacts';
  process.env.NAAMIVE_OPERATOR_ID ??= 'tst01-fixture-operator';
  const { pool, withTransaction } = await import('./db.js');
  const { scheduleWorkItem } = await import('./eligibility-scheduler.js');
  const { prepareDevelopmentJob, finalizeDevelopmentJob, resolveExternalBlocker } = await import('./phase3.js');
  const { reconcileAutomaticAssuranceIntegration } = await import('./automatic-assurance-integration.js');
  const { decideReview } = await import('./assurance.js');
  const { buildStateActionProjection } = await import('./state-action-projection.js');
  const { botCommit, commitMessage } = await import('./git-delivery.js');

  const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  const makePrincipal = (): AuthenticatedPrincipal => ({ id: randomUUID(), type: 'HUMAN', username: `tst01-${randomUUID().slice(0, 12)}` });
  const repository = () => {
    const root = mkdtempSync(join(tmpdir(), 'naamive-tst01-audit-')), origin = mkdtempSync(join(tmpdir(), 'naamive-tst01-origin-'));
    git(origin, 'init', '--bare');
    git(root, 'init'); git(root, 'config', 'user.name', 'naamive-bot'); git(root, 'config', 'user.email', 'naamive-bot@localhost');
    writeFileSync(join(root, 'README.md'), 'base\n'); git(root, 'add', 'README.md'); git(root, 'commit', '-m', 'fixture base');
    const base = git(root, 'rev-parse', 'HEAD'); git(root, 'branch', 'integration', base); git(root, 'branch', 'phases/3', base); git(root, 'remote', 'add', 'origin', origin); git(root, 'push', 'origin', 'phases/3', 'integration');
    return { root, origin, base };
  };

  test('TST-01 drives Persistence → Metric → Interface through AUT-01 and AUT-02', async t => {
    const repo = repository(), project = randomUUID(), module = randomUUID(), revision = randomUUID();
    const deliveryRound = randomUUID(), deliveryPlan = randomUUID();
    const persistence = randomUUID(), metric = randomUUID(), interfaceItem = randomUUID(), human = makePrincipal();
    const producerRuntime = randomUUID(), reviewerRuntime = randomUUID(), executionPolicy = randomUUID(), assurancePolicy = randomUUID();
    const previousCapacity = process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY;
    process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY = '1024';
    t.after(async () => {
      // AUT-02 evidence is immutable; this follows the established E2E pattern
      // of retaining isolated facts rather than bypassing database guards.
      await pool.query(`UPDATE assurance_policies SET enabled=false WHERE id=$1`, [assurancePolicy]);
      rmSync(repo.root, { recursive: true, force: true }); rmSync(repo.origin, { recursive: true, force: true });
      if (previousCapacity === undefined) delete process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY; else process.env.NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY = previousCapacity;
      await pool.end();
    });

    // SQL only establishes independently approved fixture facts before dispatch.
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'TST-01 audit fixture','owner','test',$2,'local','main',$3,'{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`, [project, repo.root, repo.base]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'audit',1,'{}','APPROVED')`, [revision, project]); await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'audit',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`, [module, project, revision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`, [deliveryRound, module, revision]);
    await pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version,integration_pipeline_version) VALUES($1,$2,$3,1,$4,$5,$6,$6,$6,'test','APPROVED','WORK_ITEM_DELIVERY',2,'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2')`, [deliveryPlan, project, module, revision, { work_items: [{ work_item_id: 'persistence' }, { work_item_id: 'metric' }, { work_item_id: 'interface' }] }, 'a'.repeat(64)]);
    const workItem = (id: string, title: string, state: string, key: string, dependsOn: string[]) => pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id,integration_pipeline_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'WORK_ITEM_DELIVERY',2,$9,$10,'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2')`, [id, project, module, revision, deliveryRound, title, { work_item_id: key, plan_revision_id: deliveryPlan, acceptance_criteria: ['accepted'], allowlist: ['persistence.txt'], denylist: ['.env'], qa_matrix: [{ command: 'test -f persistence.txt', cwd: '.', timeout_seconds: 10 }], depends_on_ids: dependsOn }, state, deliveryPlan, key]);
    await workItem(persistence, 'Persistência', 'ELIGIBLE_FOR_DISPATCH', 'persistence', []); await workItem(metric, 'Métrica', 'WAITING_FOR_DEPENDENCIES', 'metric', ['persistence']); await workItem(interfaceItem, 'Interface', 'WAITING_FOR_EXTERNAL_INPUT', 'interface', ['persistence']);
    await pool.query(`INSERT INTO work_item_external_blockers(id,work_item_id,dependency_id,justification) VALUES($1,$2,'priority-group','priority group must be confirmed')`, [randomUUID(), interfaceItem]);
    await withTransaction(async client => { for (const [id, name] of [[producerRuntime, 'producer'], [reviewerRuntime, 'reviewer']] as const) { await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`, [id, `tst01-${name}-${project}`]); await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','TST-01')`, [id]); } });
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`, [executionPolicy, `tst01-policy-${project}`, producerRuntime]); await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`, [assurancePolicy, `tst01-assurance-${project}`, { taskTypes: ['DEVELOP_WORK_ITEM'], classifications: ['INTERNAL'], jobKinds: ['DEVELOP_WORK_ITEM'], subjectKinds: ['WorkItemDeliveryCandidate:v1'] }, { schema_version: 1, reviewer_runtime_ids: [reviewerRuntime], aut02_shared_acceptance: true }]);
    await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`, [human.id, human.username]); await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id) VALUES($1,$2,'OPERATOR','READ_PROJECT',$3,NULL,NULL),($4,$2,'OPERATOR','OPERATE_PROJECT',$3,'WORK_ITEM',$5)`, [randomUUID(), human.id, project, randomUUID(), interfaceItem]);

    const dispatch = await scheduleWorkItem(project, persistence, 'MODULE_PLAN_APPROVED'); assert.equal(dispatch.reason, 'DISPATCHED');
    const job = (await pool.query(`SELECT * FROM jobs WHERE id=$1`, [dispatch.job_id])).rows[0]; await prepareDevelopmentJob(job);
    const delivery = (await pool.query(`SELECT d.*,t.path FROM deliveries d JOIN worktrees t ON t.id=d.worktree_id WHERE d.id=$1`, [dispatch.delivery_id])).rows[0]; writeFileSync(join(delivery.path, 'persistence.txt'), 'verified\n'); botCommit(delivery.path, ['persistence.txt'], commitMessage('feat', persistence, 'persist audit evidence', { project, phase: '3', execution: job.id })); await finalizeDevelopmentJob(job);
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [persistence])).rows[0].state, 'QA_IN_PROGRESS'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 0); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [metric])).rows[0].state, 'WAITING_FOR_DEPENDENCIES'); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [interfaceItem])).rows[0].state, 'WAITING_FOR_EXTERNAL_INPUT');

    await reconcileAutomaticAssuranceIntegration(10, 'tst01-qa', project); const qa = (await pool.query(`SELECT * FROM delivery_qa_reports WHERE project_id=$1`, [project])).rows[0]; assert.equal(qa.result, 'PASS'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 0);
    await reconcileAutomaticAssuranceIntegration(10, 'tst01-review', project); const acceptance = (await pool.query(`SELECT * FROM work_acceptances WHERE project_id=$1`, [project])).rows[0], review = (await pool.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1`, [acceptance.id])).rows[0]; assert.equal(acceptance.state, 'PENDING_REVIEW'); assert.equal(review.reviewer_runtime_id, reviewerRuntime); assert.notEqual(review.reviewer_runtime_id, producerRuntime); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_merge_results WHERE project_id=$1`, [project])).rows[0].n), 0);
    await decideReview(review.id, 'ACCEPT', { qa_report_id: qa.id, qa_report_hash: qa.report_hash, delivery_candidate_id: acceptance.delivery_candidate_id }, `tst01-accept:${review.id}`);
    assert.equal((await pool.query(`SELECT state FROM work_acceptances WHERE id=$1`, [acceptance.id])).rows[0].state, 'ACCEPTED');
    for (const stage of ['merge', 'candidate', 'validate', 'integrate', 'drain-1', 'drain-2']) await reconcileAutomaticAssuranceIntegration(10, `tst01-${stage}`, project);
    const candidate = (await pool.query(`SELECT * FROM integration_candidates WHERE project_id=$1`, [project])).rows[0]; assert.ok(candidate); assert.equal(candidate.state, 'INTEGRATED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_merge_results WHERE project_id=$1 AND state='MERGE_RECORDED'`, [project])).rows[0].n), 1); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_attempts WHERE project_id=$1 AND state='INTEGRATED'`, [project])).rows[0].n), 1);
    assert.equal(candidate.pipeline_version, 'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2'); assert.equal(candidate.manifest.integration_cohort_policy_version, 'IntegrationCohort:v1'); assert.deepEqual(candidate.manifest.observed_work_item_set, ['persistence']); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [metric])).rows[0].state, 'DISPATCHED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`, [metric])).rows[0].n), 1);
    const projection = await buildStateActionProjection(project, human), blocker = projection.allowed_actions.find(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER'); assert.ok(blocker); assert.equal(blocker.input_binding.fields.find(field => field.name === 'dependency_id')?.source, 'SERVER_BOUND'); assert.ok(projection.stop_surfaces.some(surface => surface.action_descriptor_id === blocker.descriptor_id)); assert.ok(projection.as_of_event_id > 0);
    await resolveExternalBlocker(project, interfaceItem, { dependency_id: 'priority-group', justification: 'priority group confirmed' }, `tst01:blocker:${interfaceItem}`); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [interfaceItem])).rows[0].state, 'DISPATCHED'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`, [interfaceItem])).rows[0].n), 1);
    await reconcileAutomaticAssuranceIntegration(10, 'tst01-replay', project); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 1); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1`, [project])).rows[0].n), 1);
  });
}
