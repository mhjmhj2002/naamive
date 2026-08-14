import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool, withTransaction } from './db.js';
import { config } from './config.js';
import { putArtifact } from './artifacts.js';
import { stableUuidFromText } from './phase4-ids.js';
import { EnvironmentSecretResolver, SecretResolutionError } from './secret-resolver.js';
import { validateAgentExecutionAttemptResult, validateAgentExecutionRequest, type AgentExecutionRequest, type AdapterExecutionOutcome, type AdapterType, type AttemptKind, type AttemptState, type Classification, type RuntimeConfigurationRecord, type RuntimePolicyRecord, type RuntimeRecord, type SanitizedError, type UsageRecord, ContractValidationError } from './agent-runtime-contracts.js';
import { sanitizeStructured, deepseekExecutionLimitUsd, deepseekMonthlyLimitUsd } from './agent-runtime-redaction.js';
import { CodexCliAdapter, decodeCodexStructuredOutput, mapCodexErrorToSanitized } from './adapters/codex-cli-adapter.js';
import { OpenAiCompatibleHttpAdapter } from './adapters/openai-compatible-http-adapter.js';
import { persistDiscoveryAgentOutcome } from './discovery-agent-jobs.js';
import { transitionTarget } from './workflow.js';
import { log } from './log.js';
import { createAcceptance, submitOutputForReview } from './assurance.js';

const agentJobKinds = new Set(['ANALYZE_PRODUCT_NEED', 'DEFINE_PRODUCT_REQUIREMENTS', 'REVIEW_PRODUCT_COMMITMENT']);
const terminalAttemptStates = new Set(['SUCCEEDED', 'FAILED', 'TIMED_OUT', 'RATE_LIMITED', 'QUOTA_EXHAUSTED', 'AUTHENTICATION_FAILED', 'INVALID_OUTPUT', 'POLICY_BLOCKED', 'CANCELLED', 'RECONCILIATION_REQUIRED']);
const executionTerminalStates = new Set(['SUCCEEDED', 'FAILED', 'BLOCKED_NO_EXECUTOR_AVAILABLE', 'CANCELLED']);
const resolver = new EnvironmentSecretResolver();
const adapters = new Map<AdapterType, any>([
  ['CODEX_CLI', new CodexCliAdapter()],
  ['OPENAI_COMPATIBLE_HTTP', new OpenAiCompatibleHttpAdapter()]
]);

const event = async (client: pg.PoolClient, projectId: string, type: string, operationId: string | null, jobId: string | null, revisionId: string | null, payload: object = {}) =>
  client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    SELECT $1,$2,$3,$4,$5,$6,$7,$8,workflow_code,workflow_version FROM projects WHERE id=$1`, [projectId, type, randomUUID(), operationId, jobId, revisionId, sanitizeStructured(payload), config().operatorId]);

const loadContext = async (job: any) => {
  const [projectRow, intakeRow, adjustmentRow] = await Promise.all([
    pool.query('SELECT id,title,draft,repository_path,repository_origin,initial_sha,base_branch FROM projects WHERE id=$1', [job.project_id]),
    pool.query('SELECT payload FROM intake_revisions WHERE id=$1', [job.revision_id]),
    pool.query(`SELECT payload->>'feedback' AS feedback FROM events WHERE project_id=$1 AND event_type='REVIEW_ADJUSTMENTS_APPLIED' ORDER BY id DESC LIMIT 1`, [job.project_id])
  ]);
  const project = projectRow.rows[0];
  return {
    project,
    contextPayload: sanitizeStructured({ intake: intakeRow.rows[0]?.payload ?? {}, project_id: job.project_id, review_adjustment_feedback: adjustmentRow.rows[0]?.feedback ?? null }) as Record<string, unknown>,
    classification: (typeof project?.draft?.classification === 'string' ? project.draft.classification : 'INTERNAL') as Classification,
    policyName: typeof project?.draft?.policy_name === 'string' ? project.draft.policy_name : ((typeof project?.draft?.classification === 'string' && project.draft.classification === 'PUBLIC') ? 'standard-implementation' : 'critical-implementation')
  };
};

const outputSchemaForTask = (taskType: string) => ({
  schema_version: 1,
  type: 'object',
  required: ['result', 'evidence'],
  additionalProperties: false,
  properties: {
    result: { type: 'string', enum: ['READY_FOR_GATE', 'REQUIRES_ADJUSTMENT'] },
    evidence: { type: 'object' }
  },
  task_type: taskType
});

const classifyKnownFailure = (code: string, nextAction = 'Corrija o problema e tente novamente.'): SanitizedError => ({ code, nextAction });

const selectedRuntime = async (client: pg.PoolClient, runtimeId: string | null) => {
  if (!runtimeId) return null;
  const runtime = await client.query(`SELECT r.*, c.runtime_id, c.version, c.adapter_type, c.endpoint, c.model, c.quality_tier, c.timeout_seconds, c.auth_type, c.secret_reference, c.configuration, c.created_by, c.change_reason
    FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=r.current_configuration_version WHERE r.id=$1`, [runtimeId]);
  return runtime.rows[0] as (RuntimeRecord & RuntimeConfigurationRecord & Record<string, unknown>) | null;
};

const runtimeConfiguration = async (client: pg.PoolClient, runtimeId: string | null, version: number | null) => {
  if (!runtimeId || !version) return null;
  const runtime = await client.query(`SELECT r.*, c.runtime_id, c.version, c.adapter_type, c.endpoint, c.model, c.quality_tier, c.timeout_seconds, c.auth_type, c.secret_reference, c.configuration, c.created_by, c.change_reason
    FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=$2 WHERE r.id=$1`, [runtimeId, version]);
  return runtime.rows[0] as (RuntimeRecord & RuntimeConfigurationRecord & Record<string, unknown>) | null;
};

const policyMatches = (policy: RuntimePolicyRecord, taskType: string, classification: Classification) => {
  const selectors = (policy.selectors ?? {}) as Record<string, unknown>;
  const taskTypes = Array.isArray(selectors.taskTypes) ? selectors.taskTypes.map(String) : [];
  const classifications = Array.isArray(selectors.classifications) ? selectors.classifications.map(String) : [];
  if (taskTypes.length && !taskTypes.includes(taskType)) return false;
  if (classifications.length && !classifications.includes(classification)) return false;
  return true;
};

const loadPolicy = async (client: pg.PoolClient, policyName: string, taskType: string, classification: Classification) => {
  const rows = (await client.query(`SELECT * FROM agent_execution_policy WHERE name=$1 ORDER BY version DESC`, [policyName])).rows as RuntimePolicyRecord[];
  const policy = rows.find((row) => policyMatches(row, taskType, classification));
  if (!policy) throw new ContractValidationError('AGENT_EXECUTION_POLICY_MISSING', `Policy ${policyName} not published for ${taskType}/${classification}`);
  return policy;
};

const runtimeAllowsClassification = (runtime: RuntimeConfigurationRecord & Record<string, unknown>, classification: Classification) => {
  const list = Array.isArray(runtime.configuration?.allowedClassifications) ? runtime.configuration.allowedClassifications.map(String) : undefined;
  if (classification === 'RESTRICTED') return false;
  if (!list?.length) return runtime.adapter_type === 'OPENAI_COMPATIBLE_HTTP' ? classification === 'PUBLIC' : true;
  return list.includes(classification);
};

const runtimeAllowsPath = (runtime: RuntimeConfigurationRecord & Record<string, unknown>, repositoryPath: string | null) => {
  const prefixes = Array.isArray(runtime.configuration?.allowedRepositoryPathPrefixes) ? runtime.configuration.allowedRepositoryPathPrefixes.map(String) : [];
  if (!prefixes.length || !repositoryPath) return true;
  return prefixes.some((prefix) => repositoryPath === prefix || repositoryPath.startsWith(`${prefix}/`));
};

const deepseekEnabledForClassification = (classification: Classification) => classification === 'PUBLIC' ? config().deepseekPublicEnabled : classification === 'INTERNAL' ? config().deepseekInternalEnabled : false;

const runtimeAvailableForExecution = async (client: pg.PoolClient, runtime: (RuntimeRecord & RuntimeConfigurationRecord & Record<string, unknown>) | null, classification: Classification, repositoryPath: string | null) => {
  if (!runtime || !runtime.enabled) return { allowed: false, reason: 'RUNTIME_DISABLED' };
  if (!runtimeAllowsClassification(runtime, classification)) return { allowed: false, reason: 'CLASSIFICATION_BLOCKED' };
  if (!runtimeAllowsPath(runtime, repositoryPath)) return { allowed: false, reason: 'PATH_BLOCKED' };
  if (runtime.adapter_type === 'OPENAI_COMPATIBLE_HTTP' && !deepseekEnabledForClassification(classification)) return { allowed: false, reason: 'DEEPSEEK_CLASSIFICATION_DISABLED' };
  const validation = await client.query(`SELECT state FROM ai_runtime_validation WHERE runtime_id=$1 AND configuration_version=$2 ORDER BY created_at DESC LIMIT 1`, [runtime.id, runtime.version]);
  const state = validation.rows[0]?.state as string | undefined;
  if (state && !['READY', 'UNKNOWN'].includes(state)) return { allowed: false, reason: state };
  if (runtime.adapter_type === 'OPENAI_COMPATIBLE_HTTP') {
    const usage = await client.query(`SELECT COALESCE(sum((usage->>'estimatedCost')::numeric),0) AS monthly_cost FROM agent_execution_attempt
      WHERE runtime_id=$1 AND completed_at >= date_trunc('month', clock_timestamp()) AND usage ? 'estimatedCost'`, [runtime.id]);
    const monthly = Number(usage.rows[0]?.monthly_cost ?? 0);
    if (monthly >= deepseekMonthlyLimitUsd) return { allowed: false, reason: 'DEEPSEEK_MONTHLY_QUOTA_EXHAUSTED' };
  }
  return { allowed: true as const };
};

const retryDelaySeconds = (attemptsOnRuntime: number, retryAfterSeconds?: number) => retryAfterSeconds ?? (attemptsOnRuntime <= 1 ? 5 : 15);

const markJobCompleted = async (client: pg.PoolClient, job: any) => {
  await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id=$1`, [job.id]);
  const pending = await client.query(`SELECT 1 FROM jobs WHERE operation_id=$1 AND status IN('PENDING','RETRYABLE','LEASED')`, [job.operation_id]);
  if (!pending.rowCount) await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp(),failure_code=NULL WHERE id=$1`, [job.operation_id]);
};

const markPermanentFailure = async (client: pg.PoolClient, job: any, code: string, nextAction: string, executionId?: string, executionState: 'FAILED' | 'BLOCKED_NO_EXECUTOR_AVAILABLE' = 'FAILED') => {
  await client.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp(),lease_expires_at=NULL,last_error=$2 WHERE id=$1`, [job.id, code]);
  await client.query(`UPDATE operations SET status='FAILED',failure_code=$2,completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id, code]);
  let target: string;
  try { target = await transitionTarget(client, job.project_id, 'AGENT_EXECUTION_FAILED'); }
  catch { target = 'DISCOVERY_FAILED'; }
  await client.query(`UPDATE projects SET state=$2,failure_stage=$3,failure_code=$4,updated_at=clock_timestamp() WHERE id=$1`, [job.project_id, target, job.kind, code]);
  if (executionId) await client.query(`UPDATE agent_execution SET state=$2,completed_at=clock_timestamp(),next_action=$3 WHERE id=$1`, [executionId, executionState, nextAction]);
  await event(client, job.project_id, 'AGENT_EXECUTION_FAILED', job.operation_id, job.id, job.revision_id, { code, stage: job.kind, next_action: nextAction });
};

const insertExecutionArtifacts = async (client: pg.PoolClient, job: any, classification: Classification, outputSchema: Record<string, unknown>) => {
  const contextArtifact = await putArtifact(client, job.project_id, 'agent-execution-context-reference', JSON.stringify({
    schema_version: 1,
    execution_context: 'stored-in-authoritative-records',
    classification,
    revision_id: job.revision_id ?? null
  }), job.id);
  const schemaArtifact = await putArtifact(client, job.project_id, 'agent-execution-output-schema', JSON.stringify(outputSchema), job.id);
  return {
    contextReference: { artifactId: contextArtifact.id, sha256: contextArtifact.hash, schemaVersion: 1 },
    outputSchemaReference: { artifactId: schemaArtifact.id, sha256: schemaArtifact.hash, schemaVersion: 1 },
    contextArtifactHash: contextArtifact.hash,
    schemaArtifactHash: schemaArtifact.hash
  };
};

const persistAttemptOutcome = async (client: pg.PoolClient, job: any, execution: any, attempt: any, runtime: any, outcome: AdapterExecutionOutcome, startedAt: string, finishedAt: string) => {
  const durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
  let decoded;
  if (outcome.structuredOutput) {
    decoded = runtime.adapter_type === 'CODEX_CLI' ? decodeCodexStructuredOutput(outcome.structuredOutput) : decodeCodexStructuredOutput(outcome.structuredOutput);
  }
  const result = await validateAgentExecutionAttemptResult({
    attemptId: attempt.id,
    executionId: execution.id,
    runtimeId: runtime.id,
    adapterType: runtime.adapter_type,
    status: outcome.status,
    startedAt,
    finishedAt,
    durationMs,
    sanitizedError: outcome.sanitizedError,
    usage: outcome.usage,
    retryable: outcome.retryable,
    fallbackEligible: outcome.fallbackEligible
  });
  await client.query(`UPDATE agent_execution_attempt SET state=$2,failure_class=$3,completed_at=$4,sanitized_error=$5,evidence_reference=$6,usage=$7 WHERE id=$1`, [attempt.id, result.status, outcome.status, finishedAt, outcome.sanitizedError ?? null, sanitizeStructured({ provider_completion_id: outcome.providerReference?.completion_id ?? null, structured_output_validated: Boolean(decoded) }), outcome.usage ?? null]);
  await event(client, job.project_id, 'AGENT_ATTEMPT_COMPLETED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, attempt_id: attempt.id, status: result.status, runtime_name: runtime.name, adapter_type: runtime.adapter_type, usage: outcome.usage ?? null });
  return { result, decoded };
};

const scheduleProviderRetry = async (client: pg.PoolClient, job: any, executionId: string, runtimeName: string, attemptsOnRuntime: number, retryAfterSeconds?: number) => {
  const delay = retryDelaySeconds(attemptsOnRuntime, retryAfterSeconds);
  await client.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp()+($2||' seconds')::interval,lease_expires_at=NULL,last_error='PROVIDER_RETRY' WHERE id=$1`, [job.id, String(delay)]);
  await client.query(`UPDATE operations SET status='QUEUED',completed_at=NULL WHERE id=$1`, [job.operation_id]);
  await client.query(`UPDATE agent_execution SET state='SELECTED',next_action=$2 WHERE id=$1`, [executionId, `Aguardar retry do runtime ${runtimeName}.`]);
  await event(client, job.project_id, 'AGENT_ATTEMPT_RETRY_SCHEDULED', job.operation_id, job.id, job.revision_id, { execution_id: executionId, retry_in_seconds: delay, runtime_name: runtimeName });
};

const scheduleFallback = async (client: pg.PoolClient, job: any, executionId: string, runtimeName: string) => {
  await client.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp(),lease_expires_at=NULL,last_error='FALLBACK_SCHEDULED' WHERE id=$1`, [job.id]);
  await client.query(`UPDATE operations SET status='QUEUED',completed_at=NULL WHERE id=$1`, [job.operation_id]);
  await client.query(`UPDATE agent_execution SET state='SELECTED',next_action=$2 WHERE id=$1`, [executionId, `Usar runtime de contingência após falha em ${runtimeName}.`]);
  await event(client, job.project_id, 'AGENT_ATTEMPT_FALLBACK_SCHEDULED', job.operation_id, job.id, job.revision_id, { execution_id: executionId, runtime_name: runtimeName });
};

const enqueueReconciliation = async (client: pg.PoolClient, job: any, executionId: string, attemptId: string) => {
  await client.query(`UPDATE agent_execution SET state='RECONCILIATION_REQUIRED',next_action='Reconciliação necessária antes de repetir.' WHERE id=$1`, [executionId]);
  await client.query(`UPDATE agent_execution_attempt SET state='RECONCILIATION_REQUIRED',completed_at=clock_timestamp(),sanitized_error=$2 WHERE id=$1`, [attemptId, { code: 'RECONCILIATION_REQUIRED', nextAction: 'Reconcilie a tentativa antes de nova ação.' }]);
  await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL,last_error='RECONCILIATION_REQUIRED' WHERE id=$1`, [job.id]);
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key,status,available_at)
    VALUES($1,$2,$3,$4,'RECONCILE_AGENT_EXECUTION',$5,'PENDING',clock_timestamp()) ON CONFLICT (idempotency_key) DO NOTHING`, [randomUUID(), job.operation_id, job.project_id, job.revision_id, `reconcile:${attemptId}`]);
  await client.query(`UPDATE operations SET status='QUEUED',completed_at=NULL WHERE id=$1`, [job.operation_id]);
  await event(client, job.project_id, 'AGENT_EXECUTION_RECONCILIATION_REQUIRED', job.operation_id, job.id, job.revision_id, { execution_id: executionId, attempt_id: attemptId });
};

const attemptDecision = async (client: pg.PoolClient, execution: any, policy: RuntimePolicyRecord, runtime: any, outcome: AdapterExecutionOutcome, attemptIndexOnRuntime: number, fallbackUsed: boolean) => {
  if (outcome.status === 'TIMED_OUT' || outcome.status === 'CANCELLED' || outcome.status === 'RECONCILIATION_REQUIRED') return { action: 'RECONCILE' as const };
  if (outcome.status === 'SUCCEEDED') return { action: 'SUCCESS' as const };
  if (outcome.status === 'RATE_LIMITED' && attemptIndexOnRuntime <= policy.provider_retry_limit) return { action: 'RETRY' as const, retryAfterSeconds: outcome.sanitizedError?.retryAfterSeconds };
  if (outcome.status === 'FAILED' && outcome.retryable && attemptIndexOnRuntime <= policy.provider_retry_limit) return { action: 'RETRY' as const, retryAfterSeconds: outcome.sanitizedError?.retryAfterSeconds };
  if (!fallbackUsed && policy.fallback_allowed && policy.fallback_runtime_id && outcome.fallbackEligible) {
    const fallback = await selectedRuntime(client, policy.fallback_runtime_id);
    const availability = await runtimeAvailableForExecution(client, fallback, execution.classification, execution.repository_path);
    if (availability.allowed) return { action: 'FALLBACK' as const };
  }
  return { action: outcome.status === 'QUOTA_EXHAUSTED' ? 'BLOCKED' as const : 'FAIL' as const };
};

const chooseRuntime = async (client: pg.PoolClient, execution: { classification: Classification; repository_path: string | null }, policy: RuntimePolicyRecord, attemptHistory: any[]) => {
  const fallbackUsed = attemptHistory.some((attempt) => attempt.attempt_kind === 'FALLBACK');
  const last = attemptHistory[attemptHistory.length - 1];
  const primary = await selectedRuntime(client, policy.primary_runtime_id);
  const fallback = await selectedRuntime(client, policy.fallback_runtime_id);
  if (!last) {
    const availability = await runtimeAvailableForExecution(client, primary, execution.classification, execution.repository_path);
    if (availability.allowed) return { runtime: primary, configurationVersion: primary!.version, attemptKind: 'PRIMARY' as AttemptKind, fallbackUsed, reason: { policy: policy.name, primary_runtime: primary?.name, classification: execution.classification } };
    if (policy.fallback_allowed && fallback) {
      const fallbackAvailability = await runtimeAvailableForExecution(client, fallback, execution.classification, execution.repository_path);
      if (fallbackAvailability.allowed) return { runtime: fallback, configurationVersion: fallback.version, attemptKind: 'FALLBACK' as AttemptKind, fallbackUsed: true, reason: { policy: policy.name, primary_unavailable: availability.reason, fallback_runtime: fallback.name, classification: execution.classification } };
    }
    return { runtime: null, configurationVersion: null, attemptKind: 'PRIMARY' as AttemptKind, fallbackUsed, reason: { policy: policy.name, blocked: availability.reason ?? 'NO_RUNTIME' } };
  }
  const onSameRuntime = attemptHistory.filter((attempt) => attempt.runtime_id === last.runtime_id).length;
  const lastRuntime = await runtimeConfiguration(client, last.runtime_id, Number(last.configuration_version));
  const decision = await attemptDecision(client, execution as any, policy, lastRuntime, { status: last.state, sanitizedError: last.sanitized_error ?? undefined, retryable: last.state === 'RATE_LIMITED', fallbackEligible: ['FAILED', 'RATE_LIMITED', 'QUOTA_EXHAUSTED', 'INVALID_OUTPUT'].includes(last.state) }, onSameRuntime, fallbackUsed);
  if (decision.action === 'RETRY' && lastRuntime) return { runtime: lastRuntime, configurationVersion: lastRuntime.version, attemptKind: 'RETRY' as AttemptKind, fallbackUsed, reason: { policy: policy.name, retry_after_seconds: decision.retryAfterSeconds ?? null, retry_runtime: lastRuntime.name }, retryAfterSeconds: decision.retryAfterSeconds };
  if (decision.action === 'FALLBACK' && fallback) return { runtime: fallback, configurationVersion: fallback.version, attemptKind: 'FALLBACK' as AttemptKind, fallbackUsed: true, reason: { policy: policy.name, fallback_runtime: fallback.name, after_status: last.state } };
  return { runtime: null, configurationVersion: null, attemptKind: 'PRIMARY' as AttemptKind, fallbackUsed, reason: { policy: policy.name, blocked: decision.action === 'BLOCKED' ? 'BLOCKED_NO_EXECUTOR_AVAILABLE' : 'NO_ADDITIONAL_ATTEMPT' }, terminalDecision: decision.action };
};

const createAttempt = async (client: pg.PoolClient, execution: any, runtime: any, attemptKind: AttemptKind) => {
  const sequence = Number((await client.query(`SELECT COALESCE(max(sequence),0) AS sequence FROM agent_execution_attempt WHERE execution_id=$1`, [execution.id])).rows[0].sequence) + 1;
  const id = randomUUID();
  await client.query(`INSERT INTO agent_execution_attempt(id,execution_id,sequence,runtime_id,configuration_version,adapter_type,attempt_kind,state)
    VALUES($1,$2,$3,$4,$5,$6,$7,'PLANNED')`, [id, execution.id, sequence, runtime.id, runtime.version, runtime.adapter_type, attemptKind]);
  return { id, sequence, runtime_id: runtime.id, configuration_version: runtime.version, adapter_type: runtime.adapter_type, attempt_kind: attemptKind, state: 'PLANNED' };
};

const dispatchAttempt = async (client: pg.PoolClient, executionId: string, attemptId: string) => {
  await client.query(`UPDATE agent_execution_attempt SET state='DISPATCHED',dispatched_at=clock_timestamp() WHERE id=$1`, [attemptId]);
  await client.query(`UPDATE agent_execution SET state='RUNNING',next_action='Aguardando resultado do executor.' WHERE id=$1`, [executionId]);
};

const createOrLoadExecution = async (client: pg.PoolClient, job: any, request: AgentExecutionRequest, policy: RuntimePolicyRecord, selectionReason: Record<string, unknown>, selected: { runtime: any; configurationVersion: number | null }) => {
  const existing = await client.query(`SELECT * FROM agent_execution WHERE job_id=$1 AND idempotency_key=$2 FOR UPDATE`, [job.id, request.idempotencyKey]);
  if (existing.rowCount) return existing.rows[0];
  const inserted = await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,revision_id,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selected_runtime_name,selected_adapter_type,selection_reason,next_action)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22) RETURNING *`, [request.executionId, job.id, job.operation_id, request.projectId, job.project_id, job.revision_id, job.kind, request.idempotencyKey, request.agentId, request.agentVersion, request.taskType, request.classification, policy.id, policy.name, policy.version, selected.runtime ? 'SELECTED' : 'BLOCKED_NO_EXECUTOR_AVAILABLE', selected.runtime?.id ?? null, selected.configurationVersion, selected.runtime?.name ?? null, selected.runtime?.adapter_type ?? null, selectionReason, selected.runtime ? 'Planejando a primeira tentativa.' : 'Nenhum runtime elegível para esta execução.']);
  const execution=inserted.rows[0];
  await createAcceptance(client, execution, job.operation_id);
  return execution;
};

export class AgentExecutionService {
  isEnabled() { return config().agentExecutionServiceEnabled; }
  handlesJob(kind: string) { return agentJobKinds.has(kind) || kind === 'RECONCILE_AGENT_EXECUTION'; }

  async executeLeasedJob(job: any) {
    if (job.kind === 'RECONCILE_AGENT_EXECUTION') return this.reconcileExecution(job);
    const { project, contextPayload, classification, policyName } = await loadContext(job);
    const outputSchema = outputSchemaForTask(job.kind);
    const requestArtifacts = await withTransaction((client) => insertExecutionArtifacts(client, job, classification, outputSchema));
    const request = await validateAgentExecutionRequest({
      executionId: stableUuidFromText('execution', `${job.id}:${job.idempotency_key}`),
      operationId: job.operation_id,
      jobId: job.id,
      projectId: stableUuidFromText('project', job.project_id),
      agentId: 'product-discovery',
      agentVersion: 'phase-4-v1',
      taskType: job.kind,
      classification,
      contextReference: requestArtifacts.contextReference,
      outputSchemaReference: requestArtifacts.outputSchemaReference,
      repositoryReference: project?.repository_origin ? { remote: project.repository_origin, commitSha: project.initial_sha, relativePath: '.' } : undefined,
      workingDirectory: project?.repository_path ?? undefined,
      timeoutSeconds: Math.min(config().agentTimeoutSeconds, 3600),
      idempotencyKey: job.idempotency_key.length >= 16 ? job.idempotency_key : `${job.idempotency_key}:${job.id}`,
      policyName,
      policyVersion: 1,
      fallbackAllowed: true
    });
    const { execution, policy, runtime, attempt, runtimeSecret } = await withTransaction(async (client) => {
      const policy = await loadPolicy(client, request.policyName, request.taskType, request.classification);
      const attempts = (await client.query(`SELECT * FROM agent_execution_attempt WHERE execution_id IN (SELECT id FROM agent_execution WHERE job_id=$1 AND idempotency_key=$2) ORDER BY sequence`, [job.id, request.idempotencyKey])).rows;
      const selected = await chooseRuntime(client, { classification, repository_path: project?.repository_path ?? null }, policy, attempts);
      const execution = await createOrLoadExecution(client, job, request, policy, selected.reason, selected);
      if (!selected.runtime) {
        await event(client, job.project_id, 'AGENT_EXECUTION_BLOCKED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, selection_reason: selected.reason, next_action: 'Habilite um runtime elegível ou ajuste a política.' });
        await markPermanentFailure(client, job, 'BLOCKED_NO_EXECUTOR_AVAILABLE', 'Habilite um runtime elegível ou ajuste a política.', execution.id);
        return { execution, policy, runtime: null, attempt: null, runtimeSecret: undefined };
      }
      const availability = await runtimeAvailableForExecution(client, selected.runtime, classification, project?.repository_path ?? null);
      if (!availability.allowed) {
        await client.query(`UPDATE agent_execution SET state='BLOCKED_NO_EXECUTOR_AVAILABLE',completed_at=clock_timestamp(),next_action=$2 WHERE id=$1`, [execution.id, `Runtime ${selected.runtime.name} indisponível: ${availability.reason}.`]);
        await event(client, job.project_id, 'AGENT_EXECUTION_BLOCKED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, selection_reason: { ...selected.reason, availability: availability.reason } });
        await markPermanentFailure(client, job, 'BLOCKED_NO_EXECUTOR_AVAILABLE', `Runtime indisponível: ${availability.reason}.`, execution.id);
        return { execution, policy, runtime: null, attempt: null, runtimeSecret: undefined };
      }
      let runtimeSecret: string | undefined;
      try { runtimeSecret = resolver.resolve(selected.runtime.secret_reference, selected.runtime.environment, selected.runtime.adapter_type, selected.runtime.auth_type); }
      catch (error) {
        if (error instanceof SecretResolutionError) {
          const attempt = await createAttempt(client, execution, selected.runtime, selected.attemptKind);
          await client.query(`UPDATE agent_execution_attempt SET state='AUTHENTICATION_FAILED',completed_at=clock_timestamp(),sanitized_error=$2 WHERE id=$1`, [attempt.id, { code: error.code, nextAction: error.nextAction }]);
          await markPermanentFailure(client, job, error.code, error.nextAction, execution.id);
          return { execution, policy, runtime: null, attempt: null, runtimeSecret: undefined };
        }
        throw error;
      }
      const attempt = await createAttempt(client, execution, selected.runtime, selected.attemptKind);
      await event(client, job.project_id, 'AGENT_ATTEMPT_PLANNED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, attempt_id: attempt.id, runtime_name: selected.runtime.name, adapter_type: selected.runtime.adapter_type, attempt_kind: selected.attemptKind, selection_reason: selected.reason });
      return { execution, policy, runtime: selected.runtime, attempt, runtimeSecret };
    });
    if (!runtime || !attempt || !execution || executionTerminalStates.has(execution.state)) return;
    await withTransaction(async (client) => {
      await dispatchAttempt(client, execution.id, attempt.id);
      await event(client, job.project_id, 'AGENT_ATTEMPT_DISPATCHED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, attempt_id: attempt.id, runtime_name: runtime.name, adapter_type: runtime.adapter_type });
    });
    const adapter = adapters.get(runtime.adapter_type);
    const runtimeRequest: AgentExecutionRequest = { ...request, timeoutSeconds: Math.min(Number(runtime.timeout_seconds), 3600) };
    const startedAt = new Date().toISOString();
    let outcome: AdapterExecutionOutcome;
    try {
      if (!adapter) throw new Error(`Adapter ${runtime.adapter_type} not implemented`);
      outcome = await adapter.execute({ request: runtimeRequest, runtime, configuration: runtime, contextPayload, outputSchema, resolvedSecret: runtimeSecret });
    } catch (error) {
      outcome = runtime.adapter_type === 'CODEX_CLI' ? mapCodexErrorToSanitized(error) : { status: 'FAILED', sanitizedError: classifyKnownFailure('OPENAI_COMPATIBLE_HTTP_FAILED'), retryable: false, fallbackEligible: true };
    }
    const finishedAt = new Date().toISOString();
    await withTransaction(async (client) => {
      const attempts = (await client.query(`SELECT * FROM agent_execution_attempt WHERE execution_id=$1 ORDER BY sequence`, [execution.id])).rows;
      const currentAttempt = attempts.find((row) => row.id === attempt.id) ?? attempt;
      const { result, decoded } = await persistAttemptOutcome(client, job, execution, currentAttempt, runtime, outcome, startedAt, finishedAt);
      const sameRuntimeCount = attempts.filter((row) => row.runtime_id === runtime.id).length;
      const fallbackUsed = attempts.some((row) => row.attempt_kind === 'FALLBACK');
      const decision = await attemptDecision(client, execution, policy, runtime, outcome, sameRuntimeCount, fallbackUsed);
      if (result.status === 'SUCCEEDED' && decoded) {
        const acceptance=await submitOutputForReview(client,execution.id,{artifact_hash:result.structuredOutputReference?.sha256 ?? null,validated:true});
        if(acceptance) { await event(client, job.project_id, 'ASSURANCE_OUTPUT_SUBMITTED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, acceptance_id: acceptance.id }); return; }
        await client.query(`UPDATE agent_execution SET state='SUCCEEDED',completed_at=clock_timestamp(),next_action='Aguardando a próxima etapa do workflow.' WHERE id=$1`, [execution.id]);
        await event(client, job.project_id, 'AGENT_EXECUTION_SUCCEEDED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, attempt_id: currentAttempt.id, runtime_name: runtime.name, adapter_type: runtime.adapter_type, usage: outcome.usage ?? null });
        await persistDiscoveryAgentOutcome(client, job, decoded, result.structuredOutputReference?.sha256);
        await markJobCompleted(client, job);
        return;
      }
      if (decision.action === 'RECONCILE') {
        await enqueueReconciliation(client, job, execution.id, currentAttempt.id);
        return;
      }
      if (decision.action === 'RETRY') {
        await scheduleProviderRetry(client, job, execution.id, runtime.name, sameRuntimeCount, decision.retryAfterSeconds);
        return;
      }
      if (decision.action === 'FALLBACK') {
        await scheduleFallback(client, job, execution.id, runtime.name);
        return;
      }
      if (decision.action === 'BLOCKED') {
        await client.query(`UPDATE agent_execution SET state='BLOCKED_NO_EXECUTOR_AVAILABLE',completed_at=clock_timestamp(),next_action='Ambos os runtimes elegíveis estão sem quota ou indisponíveis.' WHERE id=$1`, [execution.id]);
        await event(client, job.project_id, 'AGENT_EXECUTION_BLOCKED', job.operation_id, job.id, job.revision_id, { execution_id: execution.id, attempt_id: currentAttempt.id, runtime_name: runtime.name, status: result.status, next_action: 'Ajuste quota, credenciais ou política.' });
        await markPermanentFailure(client, job, 'BLOCKED_NO_EXECUTOR_AVAILABLE', 'Ajuste quota, credenciais ou política.', execution.id, 'BLOCKED_NO_EXECUTOR_AVAILABLE');
        return;
      }
      await markPermanentFailure(client, job, result.sanitizedError?.code ?? 'AGENT_EXECUTION_FAILED', result.sanitizedError?.nextAction ?? 'Corrija o problema e tente novamente.', execution.id);
    });
  }

  async reconcileExecution(job: any) {
    const idempotencyKey = String(job.idempotency_key ?? '');
    const attemptId = idempotencyKey.replace(/^reconcile:/, '');
    const attempt = (await pool.query(`SELECT a.*, e.project_key, e.task_type, e.classification, e.id AS execution_id, e.policy_id, e.policy_name, e.policy_version, e.job_kind, e.selected_runtime_id
      FROM agent_execution_attempt a JOIN agent_execution e ON e.id=a.execution_id WHERE a.id=$1`, [attemptId])).rows[0];
    if (!attempt) return;
    const runtime = await pool.query(`SELECT r.*, c.runtime_id, c.version, c.adapter_type, c.endpoint, c.model, c.quality_tier, c.timeout_seconds, c.auth_type, c.secret_reference, c.configuration, c.created_by, c.change_reason
      FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=a.configuration_version JOIN agent_execution_attempt a ON a.runtime_id=r.id WHERE a.id=$1`, [attemptId]);
    const runtimeRow = runtime.rows[0];
    if (!runtimeRow) return;
    const adapter = adapters.get(runtimeRow.adapter_type);
    if (!adapter?.reconcile) {
      await withTransaction(async (client) => {
        await client.query(`UPDATE agent_execution_attempt SET state='FAILED',completed_at=clock_timestamp(),sanitized_error=$2 WHERE id=$1`, [attemptId, { code: 'RECONCILIATION_NOT_SUPPORTED', nextAction: 'O adapter não suporta reconciliação; reprograme manualmente.' }]);
        await client.query(`UPDATE agent_execution SET state='FAILED',completed_at=clock_timestamp(),next_action='Reprograme manualmente a execução.' WHERE id=$1`, [attempt.execution_id]);
        await markPermanentFailure(client, job, 'RECONCILIATION_NOT_SUPPORTED', 'Reprograme manualmente a execução.', attempt.execution_id);
      });
      return;
    }
    let resolvedSecret: string | undefined;
    try { resolvedSecret = resolver.resolve(runtimeRow.secret_reference, runtimeRow.environment, runtimeRow.adapter_type, runtimeRow.auth_type); } catch { resolvedSecret = undefined; }
    const resolution = await adapter.reconcile({ executionId: attempt.execution_id, attemptId, runtime: runtimeRow, configuration: runtimeRow, evidenceReference: attempt.evidence_reference, resolvedSecret });
    await withTransaction(async (client) => {
      if (resolution.resolution === 'FOUND' && resolution.outcome) {
        const startedAt = attempt.dispatched_at ? new Date(attempt.dispatched_at).toISOString() : new Date().toISOString();
        const finishedAt = new Date().toISOString();
        const { decoded } = await persistAttemptOutcome(client, job, { id: attempt.execution_id }, attempt, runtimeRow, resolution.outcome, startedAt, finishedAt);
        if (decoded) { const acceptance=await submitOutputForReview(client,attempt.execution_id,{validated:true}); if(acceptance) { await event(client,attempt.project_key,'ASSURANCE_OUTPUT_SUBMITTED',job.operation_id,job.id,job.revision_id,{execution_id:attempt.execution_id,acceptance_id:acceptance.id}); return; } await persistDiscoveryAgentOutcome(client, { id: job.id, kind: attempt.job_kind, project_id: attempt.project_key, operation_id: job.operation_id, revision_id: job.revision_id }, decoded); }
        await client.query(`UPDATE agent_execution SET state='SUCCEEDED',completed_at=clock_timestamp(),next_action='Reconciliação concluída com sucesso.' WHERE id=$1`, [attempt.execution_id]);
        await event(client, attempt.project_key, 'AGENT_EXECUTION_RECONCILED', job.operation_id, job.id, job.revision_id, { execution_id: attempt.execution_id, attempt_id: attemptId, resolution: 'FOUND' });
        await markJobCompleted(client, job);
        return;
      }
      if (resolution.resolution === 'NOT_FOUND') {
        await client.query(`UPDATE agent_execution_attempt SET state='FAILED',completed_at=clock_timestamp(),sanitized_error=$2 WHERE id=$1`, [attemptId, { code: 'RECONCILIATION_NOT_FOUND', nextAction: 'Nenhum efeito foi encontrado; o serviço pode tentar novamente.' }]);
        await client.query(`UPDATE agent_execution SET state='SELECTED',next_action='Nenhum efeito encontrado; o job poderá repetir conforme a política.' WHERE id=$1`, [attempt.execution_id]);
        await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL,last_error='RECONCILIATION_NOT_FOUND' WHERE id=$1`, [job.id]);
        await client.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp(),lease_expires_at=NULL,last_error='RECONCILIATION_NOT_FOUND' WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1)`, [attempt.execution_id]);
        await event(client, attempt.project_key, 'AGENT_EXECUTION_RECONCILED', job.operation_id, job.id, job.revision_id, { execution_id: attempt.execution_id, attempt_id: attemptId, resolution: 'NOT_FOUND' });
        return;
      }
      await client.query(`UPDATE agent_execution SET state='RECONCILIATION_REQUIRED',next_action='Resultado ambíguo; intervenção operacional necessária.' WHERE id=$1`, [attempt.execution_id]);
      await client.query(`UPDATE jobs SET status='FAILED',completed_at=clock_timestamp(),lease_expires_at=NULL,last_error='RECONCILIATION_AMBIGUOUS' WHERE id=$1`, [job.id]);
      await client.query(`UPDATE operations SET status='FAILED',failure_code='RECONCILIATION_AMBIGUOUS',completed_at=clock_timestamp() WHERE id=$1`, [job.operation_id]);
      await event(client, attempt.project_key, 'AGENT_EXECUTION_RECONCILIATION_REQUIRED', job.operation_id, job.id, job.revision_id, { execution_id: attempt.execution_id, attempt_id: attemptId, resolution: 'AMBIGUOUS' });
    });
  }

  async recoverDispatchedAttempts() {
    if (!this.isEnabled()) return 0;
    return withTransaction(async (client) => {
      const rows = await client.query(`SELECT a.id AS attempt_id,e.id AS execution_id,e.operation_id,e.project_key,e.revision_id,e.job_kind,j.id AS job_id
        FROM agent_execution_attempt a
        JOIN agent_execution e ON e.id=a.execution_id
        JOIN jobs j ON j.id=e.job_id
        WHERE a.state='DISPATCHED' AND (j.lease_expires_at IS NULL OR j.lease_expires_at < clock_timestamp())
        FOR UPDATE SKIP LOCKED`);
      let recovered = 0;
      for (const row of rows.rows) {
        await client.query(`UPDATE agent_execution_attempt SET state='RECONCILIATION_REQUIRED',completed_at=clock_timestamp(),sanitized_error=$2 WHERE id=$1`, [row.attempt_id, { code: 'RECONCILIATION_REQUIRED', nextAction: 'Tentativa vencida em restart; reconcilie antes de repetir.' }]);
        await client.query(`UPDATE agent_execution SET state='RECONCILIATION_REQUIRED',next_action='Restart detectou tentativa em voo; reconcilie antes de repetir.' WHERE id=$1`, [row.execution_id]);
        await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL,last_error='RECONCILIATION_REQUIRED' WHERE id=$1`, [row.job_id]);
        await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key,status,available_at)
          VALUES($1,$2,$3,$4,'RECONCILE_AGENT_EXECUTION',$5,'PENDING',clock_timestamp()) ON CONFLICT (idempotency_key) DO NOTHING`, [randomUUID(), row.operation_id, row.project_key, row.revision_id, `reconcile:${row.attempt_id}`]);
        recovered++;
      }
      return recovered;
    });
  }
}

export const agentExecutionService = new AgentExecutionService();
