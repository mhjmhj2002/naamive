import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

if (!process.env.DATABASE_URL) {
  test('Phase 4 acceptance requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.phase4-e2e-artifacts`;
  process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
  process.env.NAAMIVE_OPERATOR_ID ??= 'phase4-test-operator';
  process.env.NAAMIVE_AGENT_ADAPTER = 'controlled';
  process.env.NAAMIVE_AGENT_EXECUTION_SERVICE_ENABLED = 'true';
  process.env.NAAMIVE_AGENT_EXECUTION_ATTEMPTS_ENABLED = 'true';
  process.env.NAAMIVE_AGENT_RUNTIME_PROJECTION_ENABLED = 'true';
  process.env.NAAMIVE_DEEPSEEK_PUBLIC_ENABLED = 'true';
  process.env.NAAMIVE_DEEPSEEK_INTERNAL_ENABLED = 'false';
  process.env.NAAMIVE_SECRET_DEEPSEEK_API_KEY = 'PHASE4_SECRET_SENTINEL';
  const { pool } = await import('./db.js');
  const { runOnce } = await import('./worker.js');
  const { startProductDiscovery, projectDetail } = await import('./service.js');
  const { registerRuntime, publishAgentExecutionPolicy } = await import('./agent-execution-admin.js');
  const { resetScenarioQueue } = await import('./adapter-scenarios.js');

  const payload = { title: 'Fase 4', business_owner: 'Operações', business_problem: 'Processo manual', desired_outcome: 'Processo auditável', success_metrics: ['Visibilidade'], stakeholders: ['Operações'], known_constraints: ['Nenhuma'], evidence_sources: ['Teste'], assumptions: ['Uso diário'], open_questions: ['Nenhuma'], classification: 'PUBLIC' };
  const migrationRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');

  const ensurePhase4Schema = async () => {
    await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    if ((await pool.query(`SELECT 1 FROM schema_migrations WHERE version='025_phase_4_agent_runtime.sql'`)).rowCount) return;
    await pool.query(await readFile(join(migrationRoot, '025_phase_4_agent_runtime.sql'), 'utf8'));
    await pool.query(`INSERT INTO schema_migrations(version) VALUES('025_phase_4_agent_runtime.sql') ON CONFLICT (version) DO NOTHING`);
  };

  const cleanupProject = async (projectId: string) => {
    await pool.query(`DELETE FROM agent_execution_attempt WHERE execution_id IN (SELECT id FROM agent_execution WHERE project_key=$1)`, [projectId]);
    await pool.query(`DELETE FROM agent_execution WHERE project_key=$1`, [projectId]);
    for (const table of ['events', 'artifacts', 'artifact_intents', 'gates', 'jobs', 'operations', 'intake_revisions']) await pool.query(`DELETE FROM ${table} WHERE project_id=$1`, [projectId]);
    await pool.query('DELETE FROM projects WHERE id=$1', [projectId]);
  };

  const cleanupRuntime = async () => {
    await pool.query(`TRUNCATE agent_execution_attempt, agent_execution, agent_runtime_audit, ai_runtime_validation, agent_execution_policy, ai_runtime_configuration, ai_runtime RESTART IDENTITY CASCADE`);
  };

  const registerDefaults = async () => {
    const codex = await registerRuntime({
      name: `codex-${randomUUID().slice(0, 8)}`,
      environment: 'development',
      enabled: true,
      adapter_type: 'CODEX_CLI',
      auth_type: 'CLI_SESSION',
      model: 'gpt-5.6-terra',
      quality_tier: 'HIGH',
      timeout_seconds: 30,
      change_reason: 'phase4 test codex',
      configuration: { allowedClassifications: ['PUBLIC', 'INTERNAL'], allowedRepositoryPathPrefixes: [process.cwd()] }
    }, `runtime-codex-${randomUUID()}`) as any;
    const deepseek = await registerRuntime({
      name: `deepseek-${randomUUID().slice(0, 8)}`,
      environment: 'development',
      enabled: true,
      adapter_type: 'OPENAI_COMPATIBLE_HTTP',
      auth_type: 'BEARER_TOKEN',
      endpoint: 'https://api.deepseek.com',
      model: 'deepseek-v4-flash',
      quality_tier: 'LOW',
      timeout_seconds: 30,
      secret_reference: 'env:NAAMIVE_SECRET_DEEPSEEK_API_KEY',
      change_reason: 'phase4 test deepseek',
      configuration: { allowedClassifications: ['PUBLIC'], allowedRepositoryPathPrefixes: [process.cwd()] }
    }, `runtime-deepseek-${randomUUID()}`) as any;
    await publishAgentExecutionPolicy({
      name: 'critical-implementation',
      change_reason: 'phase4 test critical policy',
      selectors: { taskTypes: ['ANALYZE_PRODUCT_NEED', 'DEFINE_PRODUCT_REQUIREMENTS', 'REVIEW_PRODUCT_COMMITMENT'], classifications: ['INTERNAL', 'CONFIDENTIAL'] },
      primary_runtime_id: codex.runtime_id,
      fallback_allowed: false,
      provider_retry_limit: 2
    }, `policy-critical-${randomUUID()}`);
    await publishAgentExecutionPolicy({
      name: 'standard-implementation',
      change_reason: 'phase4 test standard policy',
      selectors: { taskTypes: ['ANALYZE_PRODUCT_NEED', 'DEFINE_PRODUCT_REQUIREMENTS', 'REVIEW_PRODUCT_COMMITMENT'], classifications: ['PUBLIC'] },
      primary_runtime_id: codex.runtime_id,
      fallback_runtime_id: deepseek.runtime_id,
      fallback_allowed: true,
      provider_retry_limit: 2
    }, `policy-standard-${randomUUID()}`);
  };

  const insertProject = async (projectId: string, classification: 'PUBLIC' | 'INTERNAL') => {
    const revisionId = randomUUID();
    await pool.query(`INSERT INTO projects(id,title,business_owner,submitted_by,repository_path,repository_origin,base_branch,initial_sha,state,draft)
      VALUES($1,$2,$3,'test',$4,'https://example.invalid/repo','main','0000000000000000000000000000000000000000','REGISTERED',$5)`, [projectId, payload.title, payload.business_owner, process.cwd(), { ...payload, classification }]);
    await pool.query(`INSERT INTO intake_revisions(id,project_id,schema_version,payload,structured_sha256,markdown_sha256,artifact_uri,submitted_by)
      VALUES($1,$2,1,$3,$4,$5,$6,'test')`, [revisionId, projectId, payload, 'a'.repeat(64), 'b'.repeat(64), `file://${process.cwd()}/phase4-intake.json`]);
    return revisionId;
  };

  const driveDiscovery = async (projectId: string, maxIterations = 30) => {
    for (let index = 0; index < maxIterations; index++) {
      await runOnce(projectId);
      const detail: any = await projectDetail(projectId);
      if (detail.state === 'WAITING_FOR_PRODUCT_COMMITMENT' || detail.state === 'DISCOVERY_FAILED') return detail;
    }
    return projectDetail(projectId) as any;
  };

  test.after(async () => pool.end());

  test('keeps Codex-only parity behind the service flag', async (t) => {
    await ensurePhase4Schema();
    resetScenarioQueue('NAAMIVE_CODEX_SCENARIOS');
    resetScenarioQueue('NAAMIVE_DEEPSEEK_SCENARIOS');
    delete process.env.NAAMIVE_CODEX_SCENARIOS;
    delete process.env.NAAMIVE_DEEPSEEK_SCENARIOS;
    await cleanupRuntime();
    await registerDefaults();
    const projectId = `phase4-codex-${randomUUID().slice(0, 8)}`;
    t.after(async () => cleanupProject(projectId));
    await insertProject(projectId, 'INTERNAL');
    const accepted = await startProductDiscovery(projectId, `phase4-codex-${projectId}`);
    assert.equal(accepted.status, 'ACCEPTED');
    const detail: any = await driveDiscovery(projectId);
    assert.equal(detail.state, 'WAITING_FOR_PRODUCT_COMMITMENT');
    assert.equal(detail.gate.kind, 'PRODUCT_COMMITMENT');
    assert.equal(detail.artifacts.filter((artifact: any) => artifact.artifact_type.startsWith('product-') && !artifact.artifact_type.endsWith('-markdown')).length, 3);
    const executions = await pool.query(`SELECT state,policy_name,selected_adapter_type FROM agent_execution WHERE project_key=$1 ORDER BY created_at`, [projectId]);
    assert.equal(executions.rows.length, 3);
    assert.ok(executions.rows.every((row: any) => row.state === 'SUCCEEDED' && row.policy_name === 'critical-implementation' && row.selected_adapter_type === 'CODEX_CLI'));
  });

  test('falls back from Codex quota exhaustion to DeepSeek and keeps secrets redacted', async (t) => {
    await ensurePhase4Schema();
    await cleanupRuntime();
    await registerDefaults();
    const projectId = `phase4-fallback-${randomUUID().slice(0, 8)}`;
    t.after(async () => cleanupProject(projectId));
    await insertProject(projectId, 'PUBLIC');
    process.env.NAAMIVE_CODEX_SCENARIOS = 'QUOTA_EXHAUSTED';
    process.env.NAAMIVE_DEEPSEEK_SCENARIOS = 'SUCCESS';
    resetScenarioQueue('NAAMIVE_CODEX_SCENARIOS');
    resetScenarioQueue('NAAMIVE_DEEPSEEK_SCENARIOS');
    await startProductDiscovery(projectId, `phase4-fallback-${projectId}`);
    const detail: any = await driveDiscovery(projectId, 40);
    assert.equal(detail.state, 'WAITING_FOR_PRODUCT_COMMITMENT');
    const attempts = await pool.query(`SELECT attempt_kind,state,runtime_name FROM agent_execution_attempt_view WHERE project_key=$1 ORDER BY sequence`, [projectId]);
    assert.ok(attempts.rows.some((row: any) => row.attempt_kind === 'FALLBACK' && row.runtime_name.includes('deepseek')));
    const events = await pool.query(`SELECT event_type,payload::text AS payload FROM events WHERE project_id=$1 ORDER BY id`, [projectId]);
    assert.ok(events.rows.some((row: any) => row.event_type === 'AGENT_ATTEMPT_FALLBACK_SCHEDULED'));
    assert.ok(events.rows.every((row: any) => !row.payload.includes('PHASE4_SECRET_SENTINEL')));
    const persisted = await pool.query(`SELECT COALESCE(max(sanitized_error::text),'') AS error_text FROM agent_execution_attempt WHERE execution_id IN (SELECT id FROM agent_execution WHERE project_key=$1)`, [projectId]);
    assert.ok(!String(persisted.rows[0].error_text).includes('PHASE4_SECRET_SENTINEL'));
    delete process.env.NAAMIVE_CODEX_SCENARIOS;
    delete process.env.NAAMIVE_DEEPSEEK_SCENARIOS;
    resetScenarioQueue('NAAMIVE_CODEX_SCENARIOS');
    resetScenarioQueue('NAAMIVE_DEEPSEEK_SCENARIOS');
  });

  test('blocks the project when both runtimes are out of quota', async (t) => {
    await ensurePhase4Schema();
    await cleanupRuntime();
    await registerDefaults();
    const projectId = `phase4-blocked-${randomUUID().slice(0, 8)}`;
    t.after(async () => cleanupProject(projectId));
    await insertProject(projectId, 'PUBLIC');
    process.env.NAAMIVE_CODEX_SCENARIOS = 'QUOTA_EXHAUSTED';
    process.env.NAAMIVE_DEEPSEEK_SCENARIOS = 'QUOTA_EXHAUSTED';
    resetScenarioQueue('NAAMIVE_CODEX_SCENARIOS');
    resetScenarioQueue('NAAMIVE_DEEPSEEK_SCENARIOS');
    await startProductDiscovery(projectId, `phase4-blocked-${projectId}`);
    const detail: any = await driveDiscovery(projectId, 20);
    assert.equal(detail.state, 'DISCOVERY_FAILED');
    const execution = await pool.query(`SELECT state,next_action FROM agent_execution WHERE project_key=$1 ORDER BY created_at LIMIT 1`, [projectId]);
    assert.equal(execution.rows[0].state, 'BLOCKED_NO_EXECUTOR_AVAILABLE');
    const events = await pool.query(`SELECT event_type FROM events WHERE project_id=$1 ORDER BY id DESC LIMIT 3`, [projectId]);
    assert.ok(events.rows.some((row: any) => row.event_type === 'AGENT_EXECUTION_BLOCKED'));
    delete process.env.NAAMIVE_CODEX_SCENARIOS;
    delete process.env.NAAMIVE_DEEPSEEK_SCENARIOS;
    resetScenarioQueue('NAAMIVE_CODEX_SCENARIOS');
    resetScenarioQueue('NAAMIVE_DEEPSEEK_SCENARIOS');
  });
}
