import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  test('Phase 3 module workflow acceptance requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-phase3-e2e-artifacts';
  process.env.NAAMIVE_OPERATOR_ID ??= 'phase-three-test-operator';
  // F5-23 removed the legacy manual plan approval: plans must come from the
  // agent adapter. Tests use the controlled (deterministic, non-production)
  // adapter so no real Codex invocation can ever occur.
  process.env.NAAMIVE_AGENT_ADAPTER = 'controlled';
  process.env.NAAMIVE_RUNTIME_ENVIRONMENT = 'test';
  const { pool } = await import('./db.js');
  const { materializeModule, materializationBaselineOptions, decideModule, completeDefinition, decideArchitecture, approveModulePlan, startDevelopment, startModuleRevision, submitQa, authorizeRework, mergeWorkItemToPhase, createCandidate, validateCandidate, startIntegration } = await import('./phase3.js');
  const { seedAndApprovePlan } = await import('./test-plan-helper.js');
  const { runOnce } = await import('./worker.js');
  const projectId = `phase-three-e2e-${randomUUID().slice(0, 8)}`;
  const disposableRepository=()=>{const root=mkdtempSync(join(tmpdir(),'naamive-phase3-git-')),remote=join(root,'remote.git'),repo=join(root,'repo'),git=(cwd:string,args:string[])=>execFileSync('git',['-C',cwd,...args],{stdio:'ignore'});execFileSync('git',['init','--bare',remote],{stdio:'ignore'});execFileSync('git',['clone',remote,repo],{stdio:'ignore'});git(repo,['config','user.email','test@localhost']);git(repo,['config','user.name','test']);execFileSync('sh',['-lc','printf initial > README.md'],{cwd:repo});git(repo,['add','README.md']);git(repo,['commit','-m','initial']);git(repo,['branch','-M','integration']);git(repo,['push','origin','integration']);git(repo,['checkout','-b','phases/3']);git(repo,['push','origin','phases/3']);git(repo,['checkout','integration']);execFileSync('sh',['-lc',`printf '.naamive-worktrees/\\n.naamive-candidates/\\n' >> ${JSON.stringify(join(repo,'.git','info','exclude'))}`]);return{root,repo,sha:execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim()};};

  test('materializes an approved module through definition and architecture gate with immutable evidence', async (t) => {
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [projectId, 'Phase 3 acceptance', 'Operations', 'test', '/tmp', 'test://origin', 'main', '0000000', {}]);
    t.after(async () => {
      await pool.query('DELETE FROM events WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM artifacts WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM artifact_intents WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM module_gates WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM module_plan_revisions WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM module_plan_job_context WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM work_items WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)', [projectId]);
      await pool.query('DELETE FROM modules WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM module_revisions WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM operations WHERE project_id=$1', [projectId]);
      await pool.query('DELETE FROM projects WHERE id=$1', [projectId]);
    });
    const created = await materializeModule(projectId, { module_key: 'operator-console', name: 'Operator console', objective: 'Trace delivery', scope: ['module lifecycle'], out_of_scope: [], dependencies: [], acceptance_criteria: ['audit trail'] }, `phase3-materialize-${randomUUID()}`);
    assert.equal(created.status, 'ACCEPTED');
    if (!created.module_id || !created.gate_id) throw new Error('module materialization did not return its canonical identifiers');
    assert.deepEqual(await materializationBaselineOptions(projectId), { baseline_required: false, baseline_requirement: 'BASELINE_NOT_REQUIRED_LEGACY', approved_revisions: [] });
    assert.equal((await pool.query(`SELECT technology_baseline_revision_id FROM modules WHERE id=$1`, [created.module_id])).rows[0].technology_baseline_revision_id, null);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM technology_baselines WHERE project_key=$1`, [projectId])).rows[0].count, 0);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM events WHERE project_id=$1 AND event_type LIKE 'TECHNOLOGY_BASELINE_%'`, [projectId])).rows[0].count, 0);
    const gate = await pool.query(`SELECT * FROM module_gates WHERE id=$1`, [created.gate_id]);
    assert.equal(gate.rows[0].kind, 'MODULE_APPROVAL');
    await decideModule(projectId, created.module_id, { decision: 'APPROVED', version: gate.rows[0].version }, `phase3-approve-${randomUUID()}`);
    await completeDefinition(projectId, created.module_id, { objective: 'Trace delivery', scope: ['module lifecycle'], acceptance_criteria: ['audit trail'] }, `phase3-definition-${randomUUID()}`);
    const architectureGate = await pool.query(`SELECT * FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'`, [created.module_id]);
    assert.equal(architectureGate.rowCount, 1);
    await decideArchitecture(projectId, created.module_id, { decision: 'APPROVED', version: architectureGate.rows[0].version, alternatives: ['single workflow'], consequences: [], risks: [] }, `phase3-architecture-${randomUUID()}`);
    const module = await pool.query(`SELECT state FROM modules WHERE id=$1`, [created.module_id]);
    assert.equal(module.rows[0].state, 'PLANNING_IN_PROGRESS');
    const plan = await seedAndApprovePlan(projectId, created.module_id, [{
      title: 'Persist work-item contract', inputs: ['module-definition evidence'], allowlist: ['src/phase3.ts'], denylist: ['.env'],
      output: 'A persisted, immutable work item', acceptance_criteria: ['contract is traceable'],
      qa_matrix: [{ command: 'npm run build', cwd: '.', timeout_seconds: 60 }]
    }], approveModulePlan, `phase3-plan-${randomUUID()}`);
    assert.equal(plan.status, 'ACCEPTED');
    assert.equal(plan.work_item_ids?.length, 1);
    const item = await pool.query(`SELECT title,payload,state FROM work_items WHERE id=$1`, [plan.work_item_ids?.[0]]);
    assert.equal(item.rows[0].state, 'WAITING_FOR_WORK_ITEM_AUTHORIZATION');
    assert.equal(item.rows[0].payload.plan_artifact_hash, plan.evidence_hash);
    // F5-23 persists the plan revision's criterion coverage (criterion_ids),
    // not the legacy free-text acceptance_criteria on each QA entry.
    assert.equal(item.rows[0].payload.qa_matrix[0].command, 'npm run build');
    assert.deepEqual(item.rows[0].payload.qa_matrix[0].criterion_ids, ['criterion-1']);
    const artifacts = await pool.query(`SELECT artifact_type FROM artifacts WHERE project_id=$1 AND artifact_type LIKE 'module-%' ORDER BY artifact_type`, [projectId]);
    assert.deepEqual(artifacts.rows.map((row) => row.artifact_type), ['module-architecture', 'module-architecture-markdown', 'module-definition', 'module-definition', 'module-definition-markdown', 'module-definition-markdown', 'module-plan', 'module-plan-markdown']);
  });

  test('resubmits a rejected module proposal as a new revision and gate', async (t) => {
    const id=`phase-three-module-adjustments-${randomUUID().slice(0,8)}`;
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'Module adjustments','Ops','test','/tmp','test://origin','main','0000000','{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`,[id]);
    t.after(async()=>{for(const sql of [`DELETE FROM events WHERE project_id=$1`,`DELETE FROM artifacts WHERE project_id=$1`,`DELETE FROM artifact_intents WHERE project_id=$1`,`DELETE FROM module_gates WHERE project_id=$1`,`DELETE FROM module_plan_revisions WHERE project_id=$1`,`DELETE FROM module_plan_job_context WHERE project_id=$1`,`DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)`,`DELETE FROM modules WHERE project_id=$1`,`DELETE FROM module_revisions WHERE project_id=$1`,`DELETE FROM operations WHERE project_id=$1`,`DELETE FROM projects WHERE id=$1`])await pool.query(sql,[id]);});
    const created=await materializeModule(id,{module_key:'requests',name:'Requests',objective:'Register requests',scope:['register'],out_of_scope:[],dependencies:[],acceptance_criteria:[]},`materialize-${randomUUID()}`);
    const firstGate=(await pool.query(`SELECT version FROM module_gates WHERE id=$1`,[created.gate_id])).rows[0];
    await assert.rejects(()=>decideModule(id,created.module_id!,{decision:'REJECTED',version:firstGate.version,feedback:''},`missing-feedback-${randomUUID()}`),/GATE_FEEDBACK_REQUIRED/);
    await decideModule(id,created.module_id!,{decision:'REJECTED',version:firstGate.version,feedback:'Include exclusions, dependencies and acceptance criteria.'},`reject-${randomUUID()}`);
    assert.equal((await pool.query(`SELECT status FROM module_revisions WHERE id=(SELECT current_revision_id FROM modules WHERE id=$1)`,[created.module_id])).rows[0].status,'REJECTED');
    // F5-BUG-016 was first persisted with a rejected gate but a pending
    // revision. The resubmission route also recovers that historical state.
    await pool.query(`UPDATE module_revisions SET status='PENDING_APPROVAL' WHERE id=(SELECT current_revision_id FROM modules WHERE id=$1)`,[created.module_id]);
    const resubmitted=await startModuleRevision(id,created.module_id!,{out_of_scope:['Reporting'],dependencies:['Identity provider'],acceptance_criteria:['A request can be tracked']},`resubmit-${randomUUID()}`);
    const module=(await pool.query(`SELECT module_key,current_revision_id,state FROM modules WHERE id=$1`,[created.module_id])).rows[0], revision=(await pool.query(`SELECT revision,status,payload FROM module_revisions WHERE id=$1`,[module.current_revision_id])).rows[0], gates=(await pool.query(`SELECT id,status,revision_id FROM module_gates WHERE module_id=$1 AND kind='MODULE_APPROVAL' ORDER BY opened_at`,[created.module_id])).rows;
    assert.equal(module.module_key,'requests'); assert.equal(module.state,'WAITING_FOR_MODULE_APPROVAL'); assert.equal(revision.revision,2); assert.equal(revision.status,'PENDING_APPROVAL'); assert.deepEqual(revision.payload.out_of_scope,['Reporting']); assert.deepEqual(revision.payload.dependencies,['Identity provider']); assert.deepEqual(revision.payload.acceptance_criteria,['A request can be tracked']);
    assert.equal(gates.length,2); assert.equal(gates[0].status,'REJECTED'); assert.equal(gates[1].status,'OPEN'); assert.equal(gates[1].revision_id,module.current_revision_id); assert.equal(gates[1].id,resubmitted.gate_id);
    const events=(await pool.query(`SELECT event_type FROM events WHERE project_id=$1 ORDER BY id`,[id])).rows.map(row=>row.event_type); assert.ok(events.includes('MODULE_REJECTED')); assert.ok(events.includes('MODULE_REVISION_STARTED')); assert.ok(events.includes('MODULE_RESUBMITTED'));
    const latestGate=(await pool.query(`SELECT version FROM module_gates WHERE id=$1`,[resubmitted.gate_id])).rows[0]; await decideModule(id,created.module_id!,{decision:'APPROVED',version:latestGate.version},`approve-resubmission-${randomUUID()}`); assert.equal((await pool.query(`SELECT state FROM modules WHERE id=$1`,[created.module_id])).rows[0].state,'DEFINITION_IN_PROGRESS');
  });

  test('freezes QA, sanitizes timeout findings, revalidates and validates a frozen candidate', async (t) => {
    const id = `phase-three-delivery-${randomUUID().slice(0, 8)}`,git=disposableRepository();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'Delivery','Ops','test',$2,'test://origin','integration',$3,'{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [id,git.repo,git.sha]);
    t.after(async()=>{ for(const sql of [`DELETE FROM events WHERE project_id=$1`,`DELETE FROM artifacts WHERE project_id=$1`,`DELETE FROM artifact_intents WHERE project_id=$1`,`DELETE FROM rework_gates WHERE project_id=$1`,`DELETE FROM rework_decisions WHERE project_id=$1`,`DELETE FROM integration_attempts WHERE project_id=$1`,`DELETE FROM finding_work_items WHERE finding_id IN (SELECT id FROM findings WHERE project_id=$1)`,`DELETE FROM findings WHERE project_id=$1`,`DELETE FROM integration_candidates WHERE project_id=$1`,`DELETE FROM jobs WHERE project_id=$1`,`DELETE FROM deliveries WHERE project_id=$1`,`DELETE FROM worktrees WHERE project_id=$1`,`DELETE FROM work_items WHERE project_id=$1`,`DELETE FROM module_gates WHERE project_id=$1`,`DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)`,`DELETE FROM module_plan_revisions WHERE project_id=$1`,`DELETE FROM module_plan_job_context WHERE project_id=$1`,`DELETE FROM modules WHERE project_id=$1`,`DELETE FROM module_revisions WHERE project_id=$1`,`DELETE FROM operations WHERE project_id=$1`,`DELETE FROM projects WHERE id=$1`]) await pool.query(sql,[id]); rmSync(git.root,{recursive:true,force:true}); });
    const module=await materializeModule(id,{module_key:'delivery',name:'Delivery',objective:'Test',scope:['test'],out_of_scope:[],dependencies:[],acceptance_criteria:['works']},`m-${randomUUID()}`);
    const gate=(await pool.query(`SELECT version FROM module_gates WHERE id=$1`,[module.gate_id])).rows[0]; await decideModule(id,module.module_id!,{decision:'APPROVED',version:gate.version},`d-${randomUUID()}`); await completeDefinition(id,module.module_id!,{},`def-${randomUUID()}`);
    const architecture=(await pool.query(`SELECT version FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'`,[module.module_id])).rows[0]; await decideArchitecture(id,module.module_id!,{decision:'APPROVED',version:architecture.version},`a-${randomUUID()}`);
    const plan=await seedAndApprovePlan(id,module.module_id!,[{title:'Fix me',inputs:['input'],allowlist:['src/delivery.txt','src/reworked.txt'],denylist:['.env'],output:'output',acceptance_criteria:['works'],qa_matrix:[{command:"test -f src/reworked.txt",cwd:'.',timeout_seconds:1}]}],approveModulePlan,`p-${randomUUID()}`); const workItemId=plan.work_item_ids![0];
    // A corrupted v3 fixture without the mandatory inherited reference must fail
    // before Dev reserves a delivery. Restoring v2 proves the legacy path remains intact.
    await pool.query(`UPDATE projects SET workflow_version=3 WHERE id=$1`,[id]);
    await assert.rejects(() => startDevelopment(id,workItemId,{},`dev-v3-missing-baseline-${randomUUID()}`), /TECHNOLOGY_BASELINE_APPROVAL_REQUIRED/);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM deliveries WHERE work_item_id=$1`,[workItemId])).rows[0].count,0);
    await pool.query(`UPDATE projects SET workflow_version=2 WHERE id=$1`,[id]);
    await startDevelopment(id,workItemId,{},`dev-${randomUUID()}`); await runOnce(id); const firstTree=(await pool.query(`SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'`,[workItemId])).rows[0].path;execFileSync('mkdir',['-p','src'],{cwd:firstTree});execFileSync('sh',['-lc','printf first > src/delivery.txt'],{cwd:firstTree});execFileSync('git',['-C',firstTree,'add','src/delivery.txt']);execFileSync('git',['-C',firstTree,'-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',`feat(${workItemId}): delivery\n\nNaamive-Project: ${id}\nNaamive-Phase: 3\nNaamive-Execution: first\nNaamive-Work-Item: ${workItemId}`]); await submitQa(id,workItemId,{},`qa-${randomUUID()}`); const rejected=(await pool.query(`SELECT validations FROM deliveries WHERE work_item_id=$1 ORDER BY created_at LIMIT 1`,[workItemId])).rows[0].validations[0]; assert.equal(rejected.timed_out,false); assert.equal(rejected.severity,'HIGH'); assert.equal((await pool.query(`SELECT count(*),max(severity) severity FROM findings WHERE project_id=$1 AND origin='DELIVERY_QA'`,[id])).rows[0].count,'1'); assert.equal((await pool.query(`SELECT max(severity) severity FROM findings WHERE project_id=$1 AND origin='DELIVERY_QA'`,[id])).rows[0].severity,'HIGH');
    const rejectedDelivery=(await pool.query(`SELECT id,head_sha FROM deliveries WHERE work_item_id=$1 AND state='QA_REJECTED'`,[workItemId])).rows[0], openFinding=(await pool.query(`SELECT id FROM findings WHERE project_id=$1 AND state='OPEN'`,[id])).rows[0];
    await authorizeRework(id,workItemId,{justification:'Fix test',delivery_id:rejectedDelivery.id,head_sha:rejectedDelivery.head_sha,finding_ids:[openFinding.id]},`rw-${randomUUID()}`); await startDevelopment(id,workItemId,{},`dev2-${randomUUID()}`); await runOnce(id); const secondTree=(await pool.query(`SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE' ORDER BY created_at DESC LIMIT 1`,[workItemId])).rows[0].path;execFileSync('sh',['-lc','printf fixed > src/reworked.txt'],{cwd:secondTree});execFileSync('git',['-C',secondTree,'add','src/reworked.txt']);execFileSync('git',['-C',secondTree,'-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',`fix(${workItemId}): rework\n\nNaamive-Project: ${id}\nNaamive-Phase: 3\nNaamive-Execution: second\nNaamive-Work-Item: ${workItemId}`]); const accepted=await submitQa(id,workItemId,{},`qa2-${randomUUID()}`); assert.equal(accepted.approved,true);
    const finding=await pool.query(`SELECT state,revalidation_delivery_id FROM findings WHERE project_id=$1`,[id]); assert.equal(finding.rows[0].state,'CLOSED'); assert.ok(finding.rows[0].revalidation_delivery_id);
    await mergeWorkItemToPhase(id,workItemId,{phase_sha:'abcdef3'},`merge-${randomUUID()}`); const candidate=await createCandidate(id,{phase_sha:'abcdef3'},`candidate-${randomUUID()}`); const candidateId=(candidate as any).candidate_id; const validation=await validateCandidate(id,candidateId,{results:[{command:'npm test',result:'passed'}],findings:[]},`validate-${randomUUID()}`); assert.equal(validation.approved,true); const integration=await startIntegration(id,candidateId,{integration_before_sha:'abcdef0'},`integration-${randomUUID()}`); assert.ok((integration as any).attempt_id); const evidenceTypes=(await pool.query(`SELECT artifact_type FROM artifacts WHERE project_id=$1`,[id])).rows.map((row:any)=>row.artifact_type); assert.ok(evidenceTypes.includes('qa-report')); assert.ok(evidenceTypes.includes('qa-report-markdown')); assert.ok(evidenceTypes.includes('integration-candidate-validation')); assert.ok(evidenceTypes.includes('integration-candidate-validation-markdown'));
  });
}
