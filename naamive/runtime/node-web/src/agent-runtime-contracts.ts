import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ErrorObject, ValidateFunction } from 'ajv';
import { sanitizeStructured } from './agent-runtime-redaction.js';

export type AdapterType = 'CODEX_CLI' | 'OPENAI_COMPATIBLE_HTTP';
export type Classification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
export type AttemptState = 'PLANNED' | 'DISPATCHED' | 'SUCCEEDED' | 'FAILED' | 'TIMED_OUT' | 'RATE_LIMITED' | 'QUOTA_EXHAUSTED' | 'AUTHENTICATION_FAILED' | 'INVALID_OUTPUT' | 'POLICY_BLOCKED' | 'CANCELLED' | 'RECONCILIATION_REQUIRED';
export type ExecutionState = 'PENDING' | 'SELECTED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'BLOCKED_NO_EXECUTOR_AVAILABLE' | 'CANCELLED' | 'RECONCILIATION_REQUIRED';
export type AttemptKind = 'PRIMARY' | 'RETRY' | 'FALLBACK';
export type RuntimeValidationState = 'READY' | 'DISABLED' | 'MISCONFIGURED' | 'AUTHENTICATION_REQUIRED' | 'UNAVAILABLE' | 'QUOTA_EXHAUSTED' | 'UNKNOWN';
export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';
export type AuthType = 'API_KEY' | 'BEARER_TOKEN' | 'CLI_SESSION' | 'NONE';

export type ArtifactReference = { artifactId: string; sha256: string; schemaVersion: number };
export type RepositoryReference = { remote: string; commitSha: string; relativePath: string };
export type SanitizedError = { code: string; providerCode?: string; retryAfterSeconds?: number; nextAction: string };
export type UsageRecord = { inputTokens?: number; outputTokens?: number; totalTokens?: number; estimatedCost?: number; currency?: string };

export type AgentExecutionRequest = {
  executionId: string;
  operationId: string;
  jobId: string;
  projectId: string;
  phaseId?: string;
  moduleId?: string;
  workItemId?: string;
  agentId: string;
  agentVersion: string;
  taskType: string;
  classification: Classification;
  contextReference: ArtifactReference;
  outputSchemaReference: ArtifactReference;
  repositoryReference?: RepositoryReference;
  workingDirectory?: string;
  timeoutSeconds: number;
  idempotencyKey: string;
  policyName: string;
  policyVersion: number;
  fallbackAllowed?: boolean;
};

export type AgentExecutionAttemptResult = {
  attemptId: string;
  executionId: string;
  runtimeId: string;
  adapterType: AdapterType;
  status: Exclude<AttemptState, 'PLANNED' | 'DISPATCHED'>;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  structuredOutputReference?: ArtifactReference;
  sanitizedError?: SanitizedError;
  usage?: UsageRecord;
  retryable: boolean;
  fallbackEligible: boolean;
};

export type RuntimeRecord = {
  id: string;
  name: string;
  environment: string;
  enabled: boolean;
  current_configuration_version: number;
};

export type RuntimeConfigurationRecord = {
  runtime_id: string;
  version: number;
  adapter_type: AdapterType;
  endpoint: string | null;
  model: string;
  quality_tier: QualityTier;
  timeout_seconds: number;
  auth_type: AuthType;
  secret_reference: string | null;
  configuration: Record<string, unknown>;
  created_by: string;
  change_reason: string;
  created_at?: string;
};

export type RuntimePolicyRecord = {
  id: string;
  name: string;
  version: number;
  selectors: Record<string, unknown>;
  primary_runtime_id: string;
  fallback_runtime_id: string | null;
  fallback_allowed: boolean;
  provider_retry_limit: number;
  published_at: string;
  published_by: string;
};

export type AdapterExecutionOutcome = {
  status: Exclude<AttemptState, 'PLANNED' | 'DISPATCHED'>;
  structuredOutput?: Record<string, unknown>;
  sanitizedError?: SanitizedError;
  usage?: UsageRecord;
  retryable: boolean;
  fallbackEligible: boolean;
  providerReference?: Record<string, unknown>;
};

export type AdapterExecutionContext = {
  request: AgentExecutionRequest;
  runtime: RuntimeRecord;
  configuration: RuntimeConfigurationRecord;
  contextPayload: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  resolvedSecret?: string;
};

export type ReconciliationResolution = 'FOUND' | 'NOT_FOUND' | 'AMBIGUOUS';
export type AdapterReconciliationOutcome = { resolution: ReconciliationResolution; outcome?: AdapterExecutionOutcome };
export type AdapterReconciliationContext = { executionId: string; attemptId: string; runtime: RuntimeRecord; configuration: RuntimeConfigurationRecord; evidenceReference: Record<string, unknown> | null; resolvedSecret?: string };

export interface AgentRuntimeAdapter {
  readonly adapterType: AdapterType;
  execute(context: AdapterExecutionContext): Promise<AdapterExecutionOutcome>;
  reconcile?(context: AdapterReconciliationContext): Promise<AdapterReconciliationOutcome>;
}

const contractRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'orchestration', 'demand-intake', 'node-web-orchestration-platform', 'phase-4-contracts');
let validatorsPromise: Promise<{
  validateRequest: ValidateFunction;
  validateResult: ValidateFunction;
  ajv: unknown;
}> | undefined;

const loadValidators = async () => {
  const [ajvModule, formatsModule] = await Promise.all([
    import('ajv/dist/2020.js'),
    import('ajv-formats')
  ]);
  const Ajv2020Ctor = (ajvModule as any).default ?? ajvModule;
  const addFormatsFn = (formatsModule as any).default ?? formatsModule;
  const ajv = new Ajv2020Ctor({ allErrors: true, strict: false });
  addFormatsFn(ajv);
  const [common, request, result] = await Promise.all([
    readFile(join(contractRoot, 'common.schema.json'), 'utf8'),
    readFile(join(contractRoot, 'agent-execution-request.schema.json'), 'utf8'),
    readFile(join(contractRoot, 'agent-execution-attempt-result.schema.json'), 'utf8')
  ]);
  ajv.addSchema(JSON.parse(common));
  ajv.addSchema(JSON.parse(request));
  ajv.addSchema(JSON.parse(result));
  return {
    validateRequest: ajv.getSchema('naamive://agent-runtime/v1/agent-execution-request')!,
    validateResult: ajv.getSchema('naamive://agent-runtime/v1/agent-execution-attempt-result')!,
    ajv
  };
};

const validators = async () => {
  validatorsPromise ??= loadValidators();
  return validatorsPromise;
};

const validationMessage = (errors: ErrorObject[] | null | undefined) => (errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'invalid'}`).join('; ');

export class ContractValidationError extends Error {
  constructor(readonly code: string, readonly details: string) {
    super(details);
  }
}

export const validateAgentExecutionRequest = async (value: unknown): Promise<AgentExecutionRequest> => {
  const { validateRequest } = await validators();
  if (!validateRequest(value)) throw new ContractValidationError('AGENT_EXECUTION_REQUEST_INVALID', validationMessage(validateRequest.errors));
  return sanitizeStructured(value) as AgentExecutionRequest;
};

export const validateAgentExecutionAttemptResult = async (value: unknown): Promise<AgentExecutionAttemptResult> => {
  const { validateResult } = await validators();
  if (!validateResult(value)) throw new ContractValidationError('AGENT_EXECUTION_ATTEMPT_RESULT_INVALID', validationMessage(validateResult.errors));
  return sanitizeStructured(value) as AgentExecutionAttemptResult;
};
