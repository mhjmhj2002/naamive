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
    const root = mkdtempSync(join(tmpdir(), 'naamive-tst01-audit-'));
    git(root, 'init'); git(root, 'config', 'user.name', 'TST-01 Fixture'); git(root, 'config', 'user.email', 'tst01@example.invalid');
    writeFileSync(join(root, 'README.md'), 'base\n'); git(root, 'add', 'README.md'); git(root, 'commit', '-m', 'fixture base');
    const base = git(root, 'rev-parse', 'HEAD'); git(root, 'branch', 'integration', base); git(root, 'branch', 'phases/3', base);
    return { root, base };
  };

  test('TST-01 drives Persistence → Metric → Interface through AUT-01 and AUT-02', async t => {
    const repo = repository(), project = `tst01-audit-${randomUUID().slice(0, 12)}`, module = randomUUID(), revision = randomUUID();
    const round = randomUUID(), planId = randomUUID();
    const persistence = randomUUID(), metric = randomUUID(), interfaceItem = randomUUID(), human = makePrincipal();
    const producerRuntime = randomUUID(), reviewerRuntime = randomUUID(), executionPolicy = randomUUID(), assurancePolicy = randomUUID();
    t.after(async () => {
      // Every query is restricted to the isolated fixture; remove dependents first.
      await pool.query(`DELETE FROM auth_audit_records WHERE principal_id=$1`, [human.id]); await pool.query(`DELETE FROM auth_sessions WHERE principal_id=$1`, [human.id]); await pool.query(`DELETE FROM auth_role_grants WHERE principal_id=$1`, [human.id]); await pool.query(`DELETE FROM auth_credentials WHERE principal_id=$1`, [human.id]); await pool.query(`DELETE FROM auth_principals WHERE id=$1`, [human.id]);
      await pool.query(`DELETE FROM events WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM artifact_intents WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM artifacts WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM macro_lifecycle_intents WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM assurance_integration_intents WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM integration_attempts WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM integration_candidate_validation_reports WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM integration_candidate_members WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM integration_candidates WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM work_item_merge_results WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM review_decisions WHERE review_id IN (SELECT id FROM assurance_reviews WHERE acceptance_id IN (SELECT id FROM work_acceptances WHERE project_id=$1))`, [project]); await pool.query(`DELETE FROM assurance_reviews WHERE acceptance_id IN (SELECT id FROM work_acceptances WHERE project_id=$1)`, [project]); await pool.query(`DELETE FROM work_acceptances WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM assurance_dispatch_snapshots WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM agent_execution WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM work_item_scheduling_decisions WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM jobs WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM deliveries WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM worktrees WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM operations WHERE project_id=$1`, [project]);
      await pool.query(`DELETE FROM work_item_external_blockers WHERE work_item_id IN ($1,$2,$3)`, [persistence, metric, interfaceItem]); await pool.query(`DELETE FROM work_items WHERE project_id=$1`, [project]); await pool.query(`DELETE FROM module_plan_revisions WHERE id=$1`, [planId]); await pool.query(`DELETE FROM module_rounds WHERE id=$1`, [round]); await pool.query(`DELETE FROM modules WHERE id=$1`, [module]); await pool.query(`DELETE FROM module_revisions WHERE id=$1`, [revision]); await pool.query(`DELETE FROM projects WHERE id=$1`, [project]);
      await pool.query(`DELETE FROM assurance_policies WHERE id=$1`, [assurancePolicy]); await pool.query(`DELETE FROM agent_execution_policy WHERE id=$1`, [executionPolicy]); await pool.query(`DELETE FROM ai_runtime_configuration WHERE runtime_id IN ($1,$2)`, [producerRuntime, reviewerRuntime]); await pool.query(`DELETE FROM ai_runtime WHERE id IN ($1,$2)`, [producerRuntime, reviewerRuntime]); rmSync(repo.root, { recursive: true, force: true });
    });

    // SQL only establishes independently approved fixture facts before dispatch.
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'TST-01 audit fixture','owner','test',$2,'local','main',$3,'{}','PROJECT_DISCOVERY',4,'IMPLEMENTATION')`, [project, repo.root, repo.base]);
    await pool.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status) VALUES($1,$2,'audit',1,'{}','APPROVED')`, [revision, project]); await pool.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,'audit',$3,'IMPLEMENTING','MODULE_DELIVERY',2)`, [module, project, revision]);
    await pool.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'WORK_ITEMS_ACTIVE')`, [round, module, revision]);
    const plan = (id: string, number: number, payload: unknown) => pool.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,status,work_item_workflow_code,work_item_workflow_version) VALUES($1,$2,$3,$4,$5,$6,$7,$7,$7,'test','APPROVED','WORK_ITEM_DELIVERY',2)`, [id, project, module, number, revision, payload, 'a'.repeat(64)]);
    await plan(planId, 1, { work_items: [{ work_item_id: 'persistence' }, { work_item_id: 'metric' }, { work_item_id: 'interface' }] });
    const workItem = (id: string, title: string, state: string, round: string, planId: string, key: string, dependsOn: string[]) => pool.query(`INSERT INTO work_items(id,project_id,module_id,revision_id,round_id,title,payload,state,workflow_code,workflow_version,module_plan_revision_id,plan_work_item_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'WORK_ITEM_DELIVERY',2,$9,$10)`, [id, project, module, revision, round, title, { work_item_id: key, plan_revision_id: planId, acceptance_criteria: ['accepted'], allowlist: ['persistence.txt'], denylist: ['.env'], qa_matrix: [{ command: 'test -f persistence.txt', cwd: '.', timeout_seconds: 10 }], depends_on_ids: dependsOn }, state, planId, key]);
    await workItem(persistence, 'Persistência', 'ELIGIBLE_FOR_DISPATCH', round, planId, 'persistence', []); await workItem(metric, 'Métrica', 'WAITING_FOR_DEPENDENCIES', round, planId, 'metric', ['persistence']); await workItem(interfaceItem, 'Interface', 'WAITING_FOR_EXTERNAL_INPUT', round, planId, 'interface', ['persistence']);
    await pool.query(`INSERT INTO work_item_external_blockers(id,work_item_id,dependency_id,justification) VALUES($1,$2,'priority-group','priority group must be confirmed')`, [randomUUID(), interfaceItem]);
    await withTransaction(async client => { for (const [id, name] of [[producerRuntime, 'producer'], [reviewerRuntime, 'reviewer']] as const) { await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,'test',true,1)`, [id, `tst01-${name}-${project}`]); await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,model,quality_tier,timeout_seconds,auth_type,configuration,created_by,change_reason) VALUES($1,1,'CODEX_CLI','controlled','HIGH',60,'NONE','{}','test','TST-01')`, [id]); } });
    await pool.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,published_at,published_by) VALUES($1,$2,1,'{}',$3,clock_timestamp(),'test')`, [executionPolicy, `tst01-policy-${project}`, producerRuntime]); await pool.query(`INSERT INTO assurance_policies(id,name,version,enabled,selectors,configuration,published_by) VALUES($1,$2,1,true,$3,$4,'test')`, [assurancePolicy, `tst01-assurance-${project}`, { agentPolicyNames: [`tst01-policy-${project}`], taskTypes: ['DEVELOP_WORK_ITEM'], classifications: ['INTERNAL'] }, { schema_version: 1, reviewer_runtime_ids: [reviewerRuntime] }]);
    await pool.query(`INSERT INTO auth_principals(id,principal_type,username) VALUES($1,'HUMAN',$2)`, [human.id, human.username]); await pool.query(`INSERT INTO auth_role_grants(id,principal_id,role_code,action_code,project_id,resource_type,resource_id) VALUES($1,$2,'OPERATOR','READ_PROJECT',$3,NULL,NULL),($4,$2,'OPERATOR','OPERATE_PROJECT',$3,'WORK_ITEM',$5)`, [randomUUID(), human.id, project, randomUUID(), interfaceItem]);

    const dispatch = await scheduleWorkItem(project, persistence, 'MODULE_PLAN_APPROVED'); assert.equal(dispatch.reason, 'DISPATCHED');
    const job = (await pool.query(`SELECT * FROM jobs WHERE id=$1`, [dispatch.job_id])).rows[0]; await prepareDevelopmentJob(job);
    const delivery = (await pool.query(`SELECT d.*,t.path FROM deliveries d JOIN worktrees t ON t.id=d.worktree_id WHERE d.id=$1`, [dispatch.delivery_id])).rows[0]; writeFileSync(join(delivery.path, 'persistence.txt'), 'verified\n'); botCommit(delivery.path, ['persistence.txt'], commitMessage('feat', persistence, 'persistence', { project, phase: '3', execution: job.id })); await finalizeDevelopmentJob(job);
    assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [persistence])).rows[0].state, 'QA_IN_PROGRESS'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 0); assert.equal((await scheduleWorkItem(project, metric, 'EXECUTION_SUCCEEDED')).reason, 'WAITING_DEPENDENCIES'); assert.equal((await scheduleWorkItem(project, interfaceItem, 'EXECUTION_SUCCEEDED')).reason, 'BLOCKED_EXTERNAL_INPUT');

    await reconcileAutomaticAssuranceIntegration(10, 'tst01-qa'); const qa = (await pool.query(`SELECT * FROM delivery_qa_reports WHERE project_id=$1`, [project])).rows[0]; assert.equal(qa.result, 'PASS'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 0);
    await reconcileAutomaticAssuranceIntegration(10, 'tst01-review'); const acceptance = (await pool.query(`SELECT * FROM work_acceptances WHERE project_id=$1`, [project])).rows[0], review = (await pool.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1`, [acceptance.id])).rows[0]; assert.equal(acceptance.state, 'PENDING_REVIEW'); assert.equal(review.reviewer_runtime_id, reviewerRuntime); assert.notEqual(review.reviewer_runtime_id, producerRuntime); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_merge_results WHERE project_id=$1`, [project])).rows[0].n), 0);
    await decideReview(review.id, 'ACCEPT', { qa_report_id: qa.id, qa_report_hash: qa.report_hash, delivery_candidate_id: acceptance.delivery_candidate_id }, `tst01-accept:${review.id}`);
    assert.equal((await pool.query(`SELECT state FROM work_acceptances WHERE id=$1`, [acceptance.id])).rows[0].state, 'ACCEPTED');
    for (const stage of ['merge', 'candidate']) await reconcileAutomaticAssuranceIntegration(10, `tst01-${stage}`);
    // AUT-02's RequiredWorkItemSet:v1 is collective: a single approved plan
    // cannot create a candidate/integration while Metric and Interface remain
    // unfinished. This is deliberately observed, not bypassed with a second
    // simultaneously-approved plan or a manual scheduler dispatch.
    assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_merge_results WHERE project_id=$1 AND state='MERGE_RECORDED'`, [project])).rows[0].n), 1); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1`, [project])).rows[0].n), 0); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [metric])).rows[0].state, 'WAITING_FOR_DEPENDENCIES'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`, [metric])).rows[0].n), 0);
    const projection = await buildStateActionProjection(project, human), blocker = projection.allowed_actions.find(action => action.code === 'RESOLVE_EXTERNAL_BLOCKER'); assert.ok(blocker); assert.equal(blocker.input_binding.fields.find(field => field.name === 'dependency_id')?.source, 'SERVER_BOUND'); assert.ok(projection.stop_surfaces.some(surface => surface.action_descriptor_id === blocker.descriptor_id)); assert.ok(projection.as_of_event_id > 0);
    await resolveExternalBlocker(project, interfaceItem, { dependency_id: 'priority-group', justification: 'priority group confirmed' }, `tst01:blocker:${interfaceItem}`); assert.equal((await pool.query(`SELECT state FROM work_items WHERE id=$1`, [interfaceItem])).rows[0].state, 'WAITING_FOR_DEPENDENCIES'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_item_external_blockers WHERE work_item_id=$1 AND state='ACTIVE'`, [interfaceItem])).rows[0].n), 0); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM deliveries WHERE work_item_id=$1`, [interfaceItem])).rows[0].n), 0);
    await reconcileAutomaticAssuranceIntegration(10, 'tst01-replay'); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM work_acceptances WHERE project_id=$1`, [project])).rows[0].n), 1); assert.equal(Number((await pool.query(`SELECT count(*)::int n FROM integration_candidates WHERE project_id=$1`, [project])).rows[0].n), 0);
  });
}
