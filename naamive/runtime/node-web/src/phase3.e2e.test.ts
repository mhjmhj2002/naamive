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
  const { pool } = await import('./db.js');
  const { materializeModule, decideModule, completeDefinition, decideArchitecture, approveModulePlan, startDevelopment, submitQa, authorizeRework, mergeWorkItemToPhase, createCandidate, validateCandidate, startIntegration } = await import('./phase3.js');
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
    const gate = await pool.query(`SELECT * FROM module_gates WHERE id=$1`, [created.gate_id]);
    assert.equal(gate.rows[0].kind, 'MODULE_APPROVAL');
    await decideModule(projectId, created.module_id, { decision: 'APPROVED', version: gate.rows[0].version }, `phase3-approve-${randomUUID()}`);
    await completeDefinition(projectId, created.module_id, { objective: 'Trace delivery', scope: ['module lifecycle'], acceptance_criteria: ['audit trail'] }, `phase3-definition-${randomUUID()}`);
    const architectureGate = await pool.query(`SELECT * FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'`, [created.module_id]);
    assert.equal(architectureGate.rowCount, 1);
    await decideArchitecture(projectId, created.module_id, { decision: 'APPROVED', version: architectureGate.rows[0].version, alternatives: ['single workflow'], consequences: [], risks: [] }, `phase3-architecture-${randomUUID()}`);
    const module = await pool.query(`SELECT state FROM modules WHERE id=$1`, [created.module_id]);
    assert.equal(module.rows[0].state, 'PLANNING_IN_PROGRESS');
    const plan = await approveModulePlan(projectId, created.module_id, { work_items: [{
      title: 'Persist work-item contract', inputs: ['module-definition evidence'], allowlist: ['src/phase3.ts'], denylist: ['.env'],
      output: 'A persisted, immutable work item', acceptance_criteria: ['contract is traceable'], dependencies: [],
      qa_matrix: [{ command: 'npm run build', cwd: '.', timeout_seconds: 60, acceptance_criteria: ['build succeeds'] }]
    }] }, `phase3-plan-${randomUUID()}`);
    assert.equal(plan.status, 'ACCEPTED');
    assert.equal(plan.work_item_ids?.length, 1);
    const item = await pool.query(`SELECT title,payload,state FROM work_items WHERE id=$1`, [plan.work_item_ids?.[0]]);
    assert.equal(item.rows[0].state, 'WAITING_FOR_WORK_ITEM_AUTHORIZATION');
    assert.equal(item.rows[0].payload.plan_artifact_hash, plan.evidence_hash);
    assert.deepEqual(item.rows[0].payload.qa_matrix[0].acceptance_criteria, ['build succeeds']);
    const artifacts = await pool.query(`SELECT artifact_type FROM artifacts WHERE project_id=$1 AND artifact_type LIKE 'module-%' ORDER BY artifact_type`, [projectId]);
    assert.deepEqual(artifacts.rows.map((row) => row.artifact_type), ['module-architecture', 'module-architecture-markdown', 'module-definition', 'module-definition', 'module-definition-markdown', 'module-definition-markdown', 'module-plan', 'module-plan-markdown']);
  });

  test('freezes QA, sanitizes timeout findings, revalidates and validates a frozen candidate', async (t) => {
    const id = `phase-three-delivery-${randomUUID().slice(0, 8)}`,git=disposableRepository();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'Delivery','Ops','test',$2,'test://origin','integration',$3,'{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [id,git.repo,git.sha]);
    t.after(async()=>{ for(const sql of [`DELETE FROM events WHERE project_id=$1`,`DELETE FROM artifacts WHERE project_id=$1`,`DELETE FROM artifact_intents WHERE project_id=$1`,`DELETE FROM rework_gates WHERE project_id=$1`,`DELETE FROM rework_decisions WHERE project_id=$1`,`DELETE FROM integration_attempts WHERE project_id=$1`,`DELETE FROM finding_work_items WHERE finding_id IN (SELECT id FROM findings WHERE project_id=$1)`,`DELETE FROM findings WHERE project_id=$1`,`DELETE FROM integration_candidates WHERE project_id=$1`,`DELETE FROM jobs WHERE project_id=$1`,`DELETE FROM deliveries WHERE project_id=$1`,`DELETE FROM worktrees WHERE project_id=$1`,`DELETE FROM work_items WHERE project_id=$1`,`DELETE FROM module_gates WHERE project_id=$1`,`DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)`,`DELETE FROM modules WHERE project_id=$1`,`DELETE FROM module_revisions WHERE project_id=$1`,`DELETE FROM operations WHERE project_id=$1`,`DELETE FROM projects WHERE id=$1`]) await pool.query(sql,[id]); rmSync(git.root,{recursive:true,force:true}); });
    const module=await materializeModule(id,{module_key:'delivery',name:'Delivery',objective:'Test',scope:['test'],out_of_scope:[],dependencies:[],acceptance_criteria:['works']},`m-${randomUUID()}`);
    const gate=(await pool.query(`SELECT version FROM module_gates WHERE id=$1`,[module.gate_id])).rows[0]; await decideModule(id,module.module_id!,{decision:'APPROVED',version:gate.version},`d-${randomUUID()}`); await completeDefinition(id,module.module_id!,{},`def-${randomUUID()}`);
    const architecture=(await pool.query(`SELECT version FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'`,[module.module_id])).rows[0]; await decideArchitecture(id,module.module_id!,{decision:'APPROVED',version:architecture.version},`a-${randomUUID()}`);
    const plan=await approveModulePlan(id,module.module_id!,{work_items:[{title:'Fix me',inputs:['input'],allowlist:['src/**'],denylist:['.env'],output:'output',acceptance_criteria:['works'],dependencies:[],qa_matrix:[{command:"test -f src/reworked.txt",cwd:'.',timeout_seconds:1,acceptance_criteria:['rework creates the fix'],severity:'HIGH'}]}]},`p-${randomUUID()}`); const workItemId=plan.work_item_ids![0];
    await startDevelopment(id,workItemId,{},`dev-${randomUUID()}`); await runOnce(id); const firstTree=(await pool.query(`SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'`,[workItemId])).rows[0].path;execFileSync('mkdir',['-p','src'],{cwd:firstTree});execFileSync('sh',['-lc','printf first > src/delivery.txt'],{cwd:firstTree});execFileSync('git',['-C',firstTree,'add','src/delivery.txt']);execFileSync('git',['-C',firstTree,'-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',`feat(${workItemId}): delivery\n\nNaamive-Project: ${id}\nNaamive-Phase: 3\nNaamive-Execution: first\nNaamive-Work-Item: ${workItemId}`]); await submitQa(id,workItemId,{},`qa-${randomUUID()}`); const rejected=(await pool.query(`SELECT validations FROM deliveries WHERE work_item_id=$1 ORDER BY created_at LIMIT 1`,[workItemId])).rows[0].validations[0]; assert.equal(rejected.timed_out,false); assert.equal(rejected.severity,'HIGH'); assert.equal((await pool.query(`SELECT count(*),max(severity) severity FROM findings WHERE project_id=$1 AND origin='DELIVERY_QA'`,[id])).rows[0].count,'1'); assert.equal((await pool.query(`SELECT max(severity) severity FROM findings WHERE project_id=$1 AND origin='DELIVERY_QA'`,[id])).rows[0].severity,'HIGH');
    const rejectedDelivery=(await pool.query(`SELECT id,head_sha FROM deliveries WHERE work_item_id=$1 AND state='QA_REJECTED'`,[workItemId])).rows[0], openFinding=(await pool.query(`SELECT id FROM findings WHERE project_id=$1 AND state='OPEN'`,[id])).rows[0];
    await authorizeRework(id,workItemId,{justification:'Fix test',delivery_id:rejectedDelivery.id,head_sha:rejectedDelivery.head_sha,finding_ids:[openFinding.id]},`rw-${randomUUID()}`); await startDevelopment(id,workItemId,{},`dev2-${randomUUID()}`); await runOnce(id); const secondTree=(await pool.query(`SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE' ORDER BY created_at DESC LIMIT 1`,[workItemId])).rows[0].path;execFileSync('sh',['-lc','printf fixed > src/reworked.txt'],{cwd:secondTree});execFileSync('git',['-C',secondTree,'add','src/reworked.txt']);execFileSync('git',['-C',secondTree,'-c','user.name=naamive-bot','-c','user.email=naamive-bot@localhost','commit','-m',`fix(${workItemId}): rework\n\nNaamive-Project: ${id}\nNaamive-Phase: 3\nNaamive-Execution: second\nNaamive-Work-Item: ${workItemId}`]); const accepted=await submitQa(id,workItemId,{},`qa2-${randomUUID()}`); assert.equal(accepted.approved,true);
    const finding=await pool.query(`SELECT state,revalidation_delivery_id FROM findings WHERE project_id=$1`,[id]); assert.equal(finding.rows[0].state,'CLOSED'); assert.ok(finding.rows[0].revalidation_delivery_id);
    await mergeWorkItemToPhase(id,workItemId,{phase_sha:'abcdef3'},`merge-${randomUUID()}`); const candidate=await createCandidate(id,{phase_sha:'abcdef3'},`candidate-${randomUUID()}`); const candidateId=(candidate as any).candidate_id; const validation=await validateCandidate(id,candidateId,{results:[{command:'npm test',result:'passed'}],findings:[]},`validate-${randomUUID()}`); assert.equal(validation.approved,true); const integration=await startIntegration(id,candidateId,{integration_before_sha:'abcdef0'},`integration-${randomUUID()}`); assert.ok((integration as any).attempt_id); const evidenceTypes=(await pool.query(`SELECT artifact_type FROM artifacts WHERE project_id=$1`,[id])).rows.map((row:any)=>row.artifact_type); assert.ok(evidenceTypes.includes('qa-report')); assert.ok(evidenceTypes.includes('qa-report-markdown')); assert.ok(evidenceTypes.includes('integration-candidate-validation')); assert.ok(evidenceTypes.includes('integration-candidate-validation-markdown'));
  });
}
