import { randomUUID } from 'node:crypto';
import { withTransaction, pool } from './db.js';
import { config } from './config.js';
import { EnvironmentSecretResolver, SecretResolutionError } from './secret-resolver.js';
import { CodexCliAdapter } from './adapters/codex-cli-adapter.js';
import type { AdapterType, AuthType, Classification, RuntimeConfigurationRecord, RuntimeValidationState } from './agent-runtime-contracts.js';
import { sanitizeStructured } from './agent-runtime-redaction.js';

export class AgentRuntimeAdminError extends Error {
  constructor(readonly status: number, readonly code: string, message = code) { super(message); }
}

const resolver = new EnvironmentSecretResolver();
const codex = new CodexCliAdapter();

const ensureAdapterConfiguration = (body: Record<string, unknown>) => {
  const adapterType = String(body.adapter_type ?? '') as AdapterType;
  const authType = String(body.auth_type ?? '') as AuthType;
  const model = String(body.model ?? '');
  const endpoint = body.endpoint == null ? null : String(body.endpoint);
  if (adapterType === 'CODEX_CLI') {
    if (authType !== 'CLI_SESSION') throw new AgentRuntimeAdminError(422, 'RUNTIME_AUTH_INVALID', 'Codex requer CLI_SESSION.');
    if (endpoint) throw new AgentRuntimeAdminError(422, 'RUNTIME_ENDPOINT_NOT_ALLOWED', 'Codex não usa endpoint HTTP.');
  } else if (adapterType === 'OPENAI_COMPATIBLE_HTTP') {
    if (authType !== 'BEARER_TOKEN') throw new AgentRuntimeAdminError(422, 'RUNTIME_AUTH_INVALID', 'DeepSeek requer BEARER_TOKEN.');
    if (endpoint !== 'https://api.deepseek.com') throw new AgentRuntimeAdminError(422, 'RUNTIME_ENDPOINT_NOT_ALLOWED', 'Use somente o endpoint aprovado do DeepSeek.');
    if (model !== 'deepseek-v4-flash') throw new AgentRuntimeAdminError(422, 'RUNTIME_MODEL_NOT_ALLOWED', 'Use somente o modelo DeepSeek aprovado.');
  } else throw new AgentRuntimeAdminError(422, 'RUNTIME_ADAPTER_INVALID');
  return { adapterType, authType, endpoint, model };
};

const sanitizeAuditValues = (value: Record<string, unknown>) => sanitizeStructured(value) as Record<string, unknown>;

export const registerRuntime = async (body: Record<string, unknown>, idempotencyKey: string) => {
  const name = String(body.name ?? '').trim();
  const environment = String(body.environment ?? config().runtimeEnvironment).trim();
  const enabled = body.enabled === true;
  const qualityTier = String(body.quality_tier ?? 'LOW');
  const timeoutSeconds = Number(body.timeout_seconds ?? config().agentTimeoutSeconds);
  const secretReference = body.secret_reference == null ? null : String(body.secret_reference);
  const changeReason = String(body.change_reason ?? '').trim();
  if (!name || !changeReason) throw new AgentRuntimeAdminError(422, 'RUNTIME_FIELDS_REQUIRED');
  const { adapterType, authType, endpoint, model } = ensureAdapterConfiguration(body);
  const configuration = sanitizeAuditValues(typeof body.configuration === 'object' && body.configuration ? body.configuration as Record<string, unknown> : {});
  return withTransaction(async (client) => {
    const replay = await client.query(`SELECT after_value FROM agent_runtime_audit WHERE idempotency_key=$1 AND action='UPSERT_RUNTIME'`, [idempotencyKey]);
    if (replay.rowCount) return replay.rows[0].after_value;
    let runtime = await client.query(`SELECT * FROM ai_runtime WHERE environment=$1 AND name=$2 FOR UPDATE`, [environment, name]);
    if (!runtime.rowCount) {
      const runtimeId = randomUUID();
      await client.query(`INSERT INTO ai_runtime(id,name,environment,enabled,current_configuration_version) VALUES($1,$2,$3,$4,1)`, [runtimeId, name, environment, enabled]);
      runtime = await client.query(`SELECT * FROM ai_runtime WHERE id=$1 FOR UPDATE`, [runtimeId]);
    }
    const current = runtime.rows[0];
    const version = Number(current.current_configuration_version ?? 0) + (current.current_configuration_version ? 1 : 0);
    const nextVersion = version || 1;
    await client.query(`INSERT INTO ai_runtime_configuration(runtime_id,version,adapter_type,endpoint,model,quality_tier,timeout_seconds,auth_type,secret_reference,configuration,created_by,change_reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [current.id, nextVersion, adapterType, endpoint, model, qualityTier, timeoutSeconds, authType, secretReference, configuration, config().operatorId, changeReason]);
    await client.query(`UPDATE ai_runtime SET enabled=$2,current_configuration_version=$3,updated_at=clock_timestamp() WHERE id=$1`, [current.id, enabled, nextVersion]);
    const afterValue = { runtime_id: current.id, name, environment, enabled, configuration_version: nextVersion, adapter_type: adapterType, endpoint, model, quality_tier: qualityTier, timeout_seconds: timeoutSeconds, auth_type: authType, secret_reference: secretReference, configuration };
    await client.query(`INSERT INTO agent_runtime_audit(id,entity_type,entity_id,action,actor_id,reason,before_value,after_value,idempotency_key)
      VALUES($1,'AI_RUNTIME',$2,'UPSERT_RUNTIME',$3,$4,$5,$6,$7)`, [randomUUID(), current.id, config().operatorId, changeReason, null, afterValue, idempotencyKey]);
    return afterValue;
  });
};

export const publishAgentExecutionPolicy = async (body: Record<string, unknown>, idempotencyKey: string) => {
  const name = String(body.name ?? '').trim();
  const reason = String(body.change_reason ?? '').trim();
  if (!name || !reason) throw new AgentRuntimeAdminError(422, 'POLICY_FIELDS_REQUIRED');
  const selectors = sanitizeAuditValues(typeof body.selectors === 'object' && body.selectors ? body.selectors as Record<string, unknown> : {});
  const primaryRuntimeId = String(body.primary_runtime_id ?? '');
  const fallbackRuntimeId = body.fallback_runtime_id == null ? null : String(body.fallback_runtime_id);
  const fallbackAllowed = body.fallback_allowed === true;
  const providerRetryLimit = Number(body.provider_retry_limit ?? 2);
  return withTransaction(async (client) => {
    const replay = await client.query(`SELECT after_value FROM agent_runtime_audit WHERE idempotency_key=$1 AND action='PUBLISH_POLICY'`, [idempotencyKey]);
    if (replay.rowCount) return replay.rows[0].after_value;
    const version = Number((await client.query(`SELECT COALESCE(max(version),0) AS version FROM agent_execution_policy WHERE name=$1`, [name])).rows[0].version) + 1;
    const id = randomUUID();
    await client.query(`INSERT INTO agent_execution_policy(id,name,version,selectors,primary_runtime_id,fallback_runtime_id,fallback_allowed,provider_retry_limit,published_at,published_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp(),$9)`, [id, name, version, selectors, primaryRuntimeId, fallbackRuntimeId, fallbackAllowed, providerRetryLimit, config().operatorId]);
    const afterValue = { policy_id: id, name, version, selectors, primary_runtime_id: primaryRuntimeId, fallback_runtime_id: fallbackRuntimeId, fallback_allowed: fallbackAllowed, provider_retry_limit: providerRetryLimit };
    await client.query(`INSERT INTO agent_runtime_audit(id,entity_type,entity_id,action,actor_id,reason,before_value,after_value,idempotency_key)
      VALUES($1,'AGENT_EXECUTION_POLICY',$2,'PUBLISH_POLICY',$3,$4,$5,$6,$7)`, [randomUUID(), id, config().operatorId, reason, null, afterValue, idempotencyKey]);
    return afterValue;
  });
};

const validationRow = async (runtimeId: string) => {
  const runtime = (await pool.query(`SELECT r.*, c.adapter_type, c.endpoint, c.model, c.quality_tier, c.timeout_seconds, c.auth_type, c.secret_reference, c.configuration, c.created_by, c.change_reason
    FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=r.current_configuration_version WHERE r.id=$1`, [runtimeId])).rows[0] as (Record<string, unknown> & RuntimeConfigurationRecord) | undefined;
  if (!runtime) throw new AgentRuntimeAdminError(404, 'RUNTIME_NOT_FOUND');
  return runtime;
};

export const validateRuntime = async (runtimeId: string) => {
  const runtime = await validationRow(runtimeId);
  let state: RuntimeValidationState = 'READY';
  let result: Record<string, unknown> = { adapter_type: runtime.adapter_type, model: runtime.model };
  try {
    if (runtime.adapter_type === 'CODEX_CLI') {
      const readiness = await codex.readiness();
      result = { ...result, checked_at: readiness.checked_at, duration_ms: readiness.duration_ms, codex_version: readiness.codex_version };
    } else {
      try {
        resolver.resolve(String(runtime.secret_reference ?? ''), String(runtime.environment), runtime.adapter_type, runtime.auth_type);
      } catch (error) {
        if (error instanceof SecretResolutionError) { state = 'AUTHENTICATION_REQUIRED'; result = { ...result, code: error.code, next_action: error.nextAction }; }
        else throw error;
      }
    }
  } catch (error) {
    state = 'MISCONFIGURED';
    result = { ...result, code: error instanceof Error ? error.message : 'VALIDATION_FAILED' };
  }
  const inserted = await pool.query(`INSERT INTO ai_runtime_validation(id,runtime_id,configuration_version,state,sanitized_result,source,valid_until)
    SELECT $1,$2,current_configuration_version,$3,$4,'ADMIN_VALIDATE',clock_timestamp()+interval '15 minutes' FROM ai_runtime WHERE id=$2 RETURNING id, state, sanitized_result`, [randomUUID(), runtimeId, state, sanitizeStructured(result)]);
  return inserted.rows[0];
};

export const listProjectExecutionData = async (projectId: string) => {
  const executions = await pool.query(`SELECT id,job_id,job_kind,state,agent_id,task_type,classification,policy_name,policy_version,selected_runtime_name,selected_adapter_type,selection_reason,next_action,created_at,completed_at
    FROM agent_execution_view WHERE project_key=$1 ORDER BY created_at DESC`, [projectId]);
  const attempts = await pool.query(`SELECT execution_id,id,sequence,attempt_kind,runtime_name,adapter_type,state,failure_class,retry_not_before,dispatched_at,completed_at,sanitized_error,usage
    FROM agent_execution_attempt_view WHERE project_key=$1 ORDER BY sequence DESC`, [projectId]);
  return { executions: executions.rows, attempts: attempts.rows };
};

export const listRuntimeCatalogue = async () => (await pool.query(`SELECT r.id,r.name,r.environment,r.enabled,r.current_configuration_version,c.adapter_type,c.endpoint,c.model,c.quality_tier,c.timeout_seconds,c.auth_type,c.secret_reference,c.configuration
  FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=r.current_configuration_version ORDER BY r.environment,r.name`)).rows;
