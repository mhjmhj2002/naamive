import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  test('Phase 3 HTTP acceptance requires PostgreSQL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= 'file:///tmp/naamive-phase3-http-artifacts';
  process.env.NAAMIVE_OPERATOR_ID ??= 'phase-three-http-operator';
  // F5-23 removed the legacy manual plan approval: POST /modules/:id/plan now
  // requires a plan_revision_id produced by the agent. The controlled adapter
  // is the deterministic non-production fixture, so no real Codex call occurs.
  process.env.NAAMIVE_AGENT_ADAPTER = 'controlled';
  process.env.NAAMIVE_RUNTIME_ENVIRONMENT = 'test';

  const { pool } = await import('./db.js');
  const { createApiServer } = await import('./server.js');
  const { runOnce } = await import('./worker.js');
  const { seedPlanRevision } = await import('./test-plan-helper.js');

  type DisposableRepo = { root: string; path: string; sha: string };
  const git = (cwd: string, ...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' }).trim();
  const isAncestor = (cwd: string, ancestor: string, descendant: string) => {
    try { git(cwd, 'merge-base', '--is-ancestor', ancestor, descendant); return true; } catch { return false; }
  };
  const createRepository = (): DisposableRepo => {
    // Keep the disposable clone below NAAMIVE_REPOSITORY_ROOTS in .env.  The
    // production guard must remain enabled in this HTTP acceptance test.
    const root = mkdtempSync(join(process.cwd(), '.phase3-http-'));
    const remote = join(root, 'remote.git');
    const path = join(root, 'repo');
    execFileSync('git', ['init', '--bare', remote], { stdio: 'ignore' });
    execFileSync('git', ['clone', remote, path], { stdio: 'ignore' });
    git(path, 'config', 'user.email', 'test@localhost');
    git(path, 'config', 'user.name', 'test');
    writeFileSync(join(path, 'README.md'), 'initial\n');
    git(path, 'add', 'README.md');
    git(path, 'commit', '-m', 'initial');
    git(path, 'branch', '-M', 'integration');
    git(path, 'push', 'origin', 'integration');
    git(path, 'checkout', '-b', 'phases/3');
    git(path, 'push', 'origin', 'phases/3');
    git(path, 'checkout', 'integration');
    writeFileSync(join(path, '.git', 'info', 'exclude'), '.naamive-worktrees/\n.naamive-candidates/\n', { flag: 'a' });
    return { root, path, sha: git(path, 'rev-parse', 'HEAD') };
  };
  const cleanupProject = async (projectId: string) => {
    for (const sql of [
      'DELETE FROM events WHERE project_id=$1', 'DELETE FROM artifacts WHERE project_id=$1',
      'DELETE FROM artifact_intents WHERE project_id=$1', 'DELETE FROM integration_attempts WHERE project_id=$1',
      'DELETE FROM rework_gates WHERE project_id=$1', 'DELETE FROM rework_decisions WHERE project_id=$1',
      'DELETE FROM finding_work_items WHERE finding_id IN (SELECT id FROM findings WHERE project_id=$1)',
      'DELETE FROM findings WHERE project_id=$1', 'DELETE FROM integration_candidates WHERE project_id=$1', 'DELETE FROM jobs WHERE project_id=$1',
      'DELETE FROM deliveries WHERE project_id=$1', 'DELETE FROM worktrees WHERE project_id=$1',
      'DELETE FROM work_items WHERE project_id=$1', 'DELETE FROM module_gates WHERE project_id=$1',
      'DELETE FROM module_rounds WHERE module_id IN (SELECT id FROM modules WHERE project_id=$1)',
      'DELETE FROM module_plan_revisions WHERE project_id=$1', 'DELETE FROM module_plan_job_context WHERE project_id=$1',
      'DELETE FROM modules WHERE project_id=$1', 'DELETE FROM module_revisions WHERE project_id=$1',
      'DELETE FROM operations WHERE project_id=$1', 'DELETE FROM projects WHERE id=$1'
    ]) await pool.query(sql, [projectId]);
  };
  const commit = (tree: string, item: string, execution: string, text: string) => {
    writeFileSync(join(tree, 'README.md'), text, { flag: 'a' });
    git(tree, 'add', 'README.md');
    git(tree, '-c', 'user.name=naamive-bot', '-c', 'user.email=naamive-bot@localhost', 'commit', '-m', `feat(${item}): delivery\n\nNaamive-Project: acceptance\nNaamive-Phase: 3\nNaamive-Execution: ${execution}\nNaamive-Work-Item: ${item}`);
    return git(tree, 'rev-parse', 'HEAD');
  };

  test('drives Phase 3 Git delivery, reconciliation and rework through HTTP', async (t) => {
    const repo = createRepository();
    const projectId = `phase3-http-${randomUUID().slice(0, 8)}`;
    const server = createApiServer();
    let serverListening = false;
    t.after(async () => {
      try { if (serverListening) await new Promise<void>((resolve) => server.close(() => resolve())); await cleanupProject(projectId); }
      finally { rmSync(repo.root, { recursive: true, force: true }); }
    });
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,'HTTP','Ops','test',$2,'test://origin','integration',$3,'{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [projectId, repo.path, repo.sha]);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    serverListening = true;
    const address = server.address() as { port: number };
    const base = `http://127.0.0.1:${address.port}`;
    const post = async (path: string, body: Record<string, unknown> = {}, expected = 202) => {
      const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify(body) });
      const responseBody = await response.text();
      assert.equal(response.status, expected, responseBody);
      return JSON.parse(responseBody) as Record<string, any>;
    };

    const module = await post(`/api/projects/${projectId}/modules`, { module_key: 'http-module', name: 'HTTP module', objective: 'prove runtime', scope: ['runtime'], out_of_scope: [], dependencies: [], acceptance_criteria: ['passes'] });
    const moduleId = module.module_id;
    // The initial module gate must give the web client the complete business
    // proposal.  This is deliberately checked before the approval changes the
    // module state, because this is the operator's informed-decision screen.
    const proposal = await (await fetch(`${base}/api/projects/${projectId}?phase3=true`)).json() as { modules: Array<Record<string, unknown>>; gates: Array<Record<string, unknown>> };
    assert.deepEqual(proposal.modules[0] && {
      module_key: proposal.modules[0].module_key, name: proposal.modules[0].name, objective: proposal.modules[0].objective,
      scope: proposal.modules[0].scope, out_of_scope: proposal.modules[0].out_of_scope,
      dependencies: proposal.modules[0].dependencies, acceptance_criteria: proposal.modules[0].acceptance_criteria
    }, {
      module_key: 'http-module', name: 'HTTP module', objective: 'prove runtime',
      scope: ['runtime'], out_of_scope: [], dependencies: [], acceptance_criteria: ['passes']
    });
    assert.ok(proposal.gates.some(gate => gate.kind === 'MODULE_APPROVAL' && gate.status === 'OPEN' && gate.module_id === moduleId));
    const page = await (await fetch(base)).text();
    for (const copy of ['Revise a proposta antes de aprovar', 'O que faz parte', 'O que não faz parte', 'Dependências', 'Como saberemos que deu certo?', 'não aprova uma entrega de software, não faz deploy']) assert.match(page, new RegExp(copy));
    const approval = (await pool.query('SELECT version FROM module_gates WHERE id=$1', [module.gate_id])).rows[0];
    await post(`/api/projects/${projectId}/modules/${moduleId}/decision`, { decision: 'APPROVED', version: approval.version });
    await post(`/api/projects/${projectId}/modules/${moduleId}/definition`);
    const architecture = (await pool.query("SELECT version FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'", [moduleId])).rows[0];
    await post(`/api/projects/${projectId}/modules/${moduleId}/architecture`, { decision: 'APPROVED', version: architecture.version });
    // F5-23 two-step approval: the agent generates a plan revision (seeded
    // deterministically through the controlled adapter contract), then the
    // operator approves that exact revision over HTTP. Raw work_items are no
    // longer accepted by POST /modules/:id/plan.
    const seeded = await seedPlanRevision(projectId, moduleId, [
      { title: 'Approved HTTP item', inputs: ['contract'], allowlist: ['README.md'], denylist: ['.env'], output: 'evidence', acceptance_criteria: ['passes'], qa_matrix: [{ command: 'true', cwd: '.', timeout_seconds: 10 }] },
      { title: 'Reworked but pending HTTP item', inputs: ['contract'], allowlist: ['README.md'], denylist: ['.env'], output: 'evidence', acceptance_criteria: ['passes'], qa_matrix: [{ command: 'grep -q reworked README.md', cwd: '.', timeout_seconds: 10 }] }
    ]);
    const plan = await post(`/api/projects/${projectId}/modules/${moduleId}/plan`, { plan_revision_id: seeded.plan_revision_id, version: seeded.version });
    const [item, rejectedItem] = plan.work_item_ids;

    await post(`/api/projects/${projectId}/work-items/${item}/development`); await runOnce(projectId);
    const firstTree = (await pool.query("SELECT path,lease_expires_at FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'", [item])).rows[0];
    const originalLease = firstTree.lease_expires_at;
    const reconciliation = await post(`/api/projects/${projectId}/work-items/${item}/reconcile`);
    assert.equal(reconciliation.result, 'ACTIVE');
    const renewedLease = (await pool.query("SELECT lease_expires_at FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'", [item])).rows[0].lease_expires_at;
    assert.ok(renewedLease > originalLease);

    writeFileSync(join(firstTree.path, 'outside.txt'), 'forbidden\n');
    const rejectedQa = await post(`/api/projects/${projectId}/work-items/${item}/qa`, { sha: 'untrusted', worktree_path: '/untrusted', results: ['untrusted'], commits: ['untrusted'] }, 409);
    assert.equal(rejectedQa.code, 'GIT_DIVERGED');
    assert.equal((await pool.query('SELECT state FROM work_items WHERE id=$1', [item])).rows[0].state, 'DEVELOPMENT_IN_PROGRESS');
    rmSync(join(firstTree.path, 'outside.txt'));

    const firstCommit = commit(firstTree.path, item, 'execution-one', 'first delivery\n');
    const approved = await post(`/api/projects/${projectId}/work-items/${item}/qa`, { results: ['ignored'] });
    assert.equal(approved.approved, true);
    await post(`/api/projects/${projectId}/work-items/${item}/merge`, { head_sha: 'untrusted' });
    const firstMessage = git(repo.path, 'show', '-s', '--format=%B', firstCommit);
    assert.match(firstMessage, new RegExp(`Naamive-Execution: execution-one\\nNaamive-Work-Item: ${item}`));
    assert.equal(git(repo.path, 'merge-base', '--is-ancestor', firstCommit, 'phases/3'), '');

    // The second item follows the governed finding → rework decision → new
    // delivery → revalidation path, but is deliberately not merged to phase.
    await post(`/api/projects/${projectId}/work-items/${rejectedItem}/development`); await runOnce(projectId);
    const rejectedTree = (await pool.query("SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'", [rejectedItem])).rows[0];
    commit(rejectedTree.path, rejectedItem, 'execution-rejected', 'pending delivery\n');
    const rejectedDeliveryQa = await post(`/api/projects/${projectId}/work-items/${rejectedItem}/qa`);
    assert.equal(rejectedDeliveryQa.approved, false);
    const rejectedDelivery = (await pool.query("SELECT id,head_sha FROM deliveries WHERE work_item_id=$1 AND state='QA_REJECTED'", [rejectedItem])).rows[0];
    const finding = (await pool.query("SELECT id FROM findings WHERE delivery_id=$1 AND state='OPEN'", [rejectedDelivery.id])).rows[0];
    const rework = await post(`/api/projects/${projectId}/work-items/${rejectedItem}/rework`, { finding_ids: [finding.id], delivery_id: rejectedDelivery.id, head_sha: rejectedDelivery.head_sha, justification: 'Correct the missing acceptance marker.' });
    assert.equal(rework.escalated, false);
    assert.equal((await pool.query('SELECT state FROM work_items WHERE id=$1', [rejectedItem])).rows[0].state, 'REWORK_ELIGIBLE');
    await post(`/api/projects/${projectId}/work-items/${rejectedItem}/development`); await runOnce(projectId);
    const reworkTree = (await pool.query("SELECT path FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE' ORDER BY created_at DESC LIMIT 1", [rejectedItem])).rows[0];
    assert.notEqual(reworkTree.path, rejectedTree.path);
    const reworkCommit = commit(reworkTree.path, rejectedItem, 'execution-rework', 'reworked delivery\n');
    assert.equal((await post(`/api/projects/${projectId}/work-items/${rejectedItem}/qa`)).approved, true);
    assert.equal((await pool.query('SELECT state FROM findings WHERE id=$1', [finding.id])).rows[0].state, 'CLOSED');
    assert.equal((await pool.query('SELECT state FROM work_items WHERE id=$1', [rejectedItem])).rows[0].state, 'READY_FOR_PHASE_MERGE');

    const candidate = await post(`/api/projects/${projectId}/integration-candidates`, { phase_sha: 'untrusted' });
    const frozen = (await pool.query('SELECT phase_sha,manifest FROM integration_candidates WHERE id=$1', [candidate.candidate_id])).rows[0];
    assert.equal(frozen.manifest.work_items.length, 1);
    assert.equal(frozen.manifest.work_items[0].work_item_id, item);
    assert.equal(isAncestor(repo.path, reworkCommit, frozen.phase_sha), false);
    await post(`/api/projects/${projectId}/integration-candidates/${candidate.candidate_id}/validate`, { qa_result: 'untrusted' });
    const integrationBefore = git(repo.path, 'rev-parse', 'integration');
    const integration = await post(`/api/projects/${projectId}/integration-candidates/${candidate.candidate_id}/integrate`, { sha: 'untrusted' });
    assert.equal(git(repo.path, 'merge-base', '--is-ancestor', firstCommit, 'integration'), '');
    assert.deepEqual(git(repo.path, 'show', '-s', '--format=%P', integration.merge_sha).split(' '), [integrationBefore, frozen.phase_sha]);
    assert.deepEqual(git(repo.path, 'rev-list', '--reverse', `${integrationBefore}..${integration.merge_sha}`).split('\n').filter(commit => commit && commit !== integration.merge_sha), git(repo.path, 'rev-list', '--reverse', `${integrationBefore}..${frozen.phase_sha}`).split('\n').filter(Boolean));
    assert.equal(isAncestor(repo.path, reworkCommit, 'integration'), false);

  });

  for (const expected of ['DIRTY', 'DIVERGED', 'MISSING'] as const) test(`reconcile blocks a ${expected.toLowerCase()} worktree through HTTP`, async (t) => {
    const repo = createRepository(); const projectId = `phase3-reconcile-${randomUUID().slice(0, 8)}`; const server = createApiServer(); let serverListening = false;
    t.after(async () => { try { if (serverListening) await new Promise<void>((resolve) => server.close(() => resolve())); await cleanupProject(projectId); } finally { rmSync(repo.root, { recursive: true, force: true }); } });
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state) VALUES($1,'Reconcile','Ops','test',$2,'test://origin','integration',$3,'{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`, [projectId, repo.path, repo.sha]);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); serverListening = true; const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
    const post = async (path: string, body: Record<string, unknown> = {}) => {
      const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID() }, body: JSON.stringify(body) });
      const responseBody = await response.text();
      assert.equal(response.status, 202, responseBody);
      return JSON.parse(responseBody) as Record<string, any>;
    };
    const module = await post(`/api/projects/${projectId}/modules`, { module_key: `reconcile-${expected.toLowerCase()}`, name: 'Reconcile', objective: 'prove', scope: ['runtime'], out_of_scope: [], dependencies: [], acceptance_criteria: ['passes'] }); const moduleId = module.module_id;
    const gate = (await pool.query('SELECT version FROM module_gates WHERE id=$1', [module.gate_id])).rows[0]; await post(`/api/projects/${projectId}/modules/${moduleId}/decision`, { decision: 'APPROVED', version: gate.version }); await post(`/api/projects/${projectId}/modules/${moduleId}/definition`);
    const architecture = (await pool.query("SELECT version FROM module_gates WHERE module_id=$1 AND kind='ARCHITECTURE_DECISION'", [moduleId])).rows[0]; await post(`/api/projects/${projectId}/modules/${moduleId}/architecture`, { decision: 'APPROVED', version: architecture.version });
    const seeded = await seedPlanRevision(projectId, moduleId, [{ title: 'Reconcile item', inputs: ['contract'], allowlist: ['README.md'], denylist: ['.env'], output: 'evidence', acceptance_criteria: ['passes'], qa_matrix: [{ command: 'true', cwd: '.', timeout_seconds: 10 }] }]); const plan = await post(`/api/projects/${projectId}/modules/${moduleId}/plan`, { plan_revision_id: seeded.plan_revision_id, version: seeded.version }); const item = plan.work_item_ids[0]; await post(`/api/projects/${projectId}/work-items/${item}/development`); await runOnce(projectId);
    const tree = (await pool.query("SELECT path,branch FROM worktrees WHERE work_item_id=$1 AND state='ACTIVE'", [item])).rows[0];
    if (expected === 'DIRTY') writeFileSync(join(tree.path, 'README.md'), 'dirty\n', { flag: 'a' });
    if (expected === 'DIVERGED') {
      const orphan = git(repo.path, 'commit-tree', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '-m', 'unrelated history');
      git(repo.path, 'update-ref', `refs/heads/${tree.branch}`, orphan);
      git(tree.path, 'reset', '--hard', orphan);
    }
    if (expected === 'MISSING') rmSync(tree.path, { recursive: true, force: true });
    const result = await post(`/api/projects/${projectId}/work-items/${item}/reconcile`);
    assert.equal(result.result, expected);
    assert.equal((await pool.query('SELECT state FROM work_items WHERE id=$1', [item])).rows[0].state, 'WAITING_FOR_ESCALATION');
    assert.equal((await pool.query('SELECT state FROM worktrees WHERE work_item_id=$1', [item])).rows[0].state, 'BLOCKED');
    if (expected === 'MISSING') assert.equal(existsSync(tree.path), false);
  });

  test('replays sanitized F3 SSE updates for approved and rejected work items without duplicates', async (t) => {
    const projectId=`phase3-sse-${randomUUID().slice(0,8)}`, approved=randomUUID(), rejected=randomUUID(), server=createApiServer();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,draft,workflow_code,workflow_version,state)
      VALUES($1,'SSE','Ops','test','/not-exposed','test://origin','integration','safe-sha','{}','PROJECT_DISCOVERY',2,'PRODUCT_COMMITMENT')`,[projectId]);
    const correlation=randomUUID();
    const first=(await pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload) VALUES($1,'QA_APPROVED',$2,$3) RETURNING id`,[projectId,correlation,{work_item_id:approved,head_sha:'approved-sha',worktree_path:'/host/private',stdout:'raw'}])).rows[0].id;
    await pool.query(`INSERT INTO events(project_id,event_type,correlation_id,payload) VALUES($1,'QA_REJECTED',$2,$3),($1,'REWORK_ESCALATED',$2,$4),($1,'INTEGRATION_ARCHIVED',$2,$5)`,[projectId,correlation,{work_item_id:rejected,head_sha:'rejected-sha',command:'private'},{work_item_id:rejected,prompt:'private',reason:'timeout'},{candidate_id:randomUUID(),path:'/host/private'}]);
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve)); const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    t.after(async()=>{await new Promise<void>(resolve=>server.close(()=>resolve()));await cleanupProject(projectId);});
    const read=async(after:number)=>{const response=await fetch(`${base}/api/projects/${projectId}/events?after=${after}`);const reader=response.body!.getReader(),chunk=await reader.read();await reader.cancel();return new TextDecoder().decode(chunk.value);};
    const replay=await read(0), ids=[...replay.matchAll(/^id: (\d+)$/gm)].map(match=>Number(match[1]));
    assert.deepEqual(ids,[...new Set(ids)]); assert.equal(ids.length,4); assert.match(replay,/approved-sha/); assert.doesNotMatch(replay,/host\/private|raw|private/);
    const resumed=await read(Number(first)); assert.doesNotMatch(resumed,/event: QA_APPROVED/); assert.match(resumed,/event: QA_REJECTED/); assert.match(await (await fetch(base)).text(),/INTEGRATION_ARCHIVED/);
  });
  after(() => assert.deepEqual(readdirSync(process.cwd()).filter(name => name.startsWith('.phase3-http-')), [], 'HTTP acceptance left temporary repositories behind'));
}
