import { checkAgentReadiness, executeAgent, type AgentResult, AgentConfigurationError, AgentExecutionError, AgentReadinessError } from '../agent.js';
import type { AdapterExecutionContext, AdapterExecutionOutcome, AgentRuntimeAdapter, SanitizedError } from '../agent-runtime-contracts.js';
import { sanitizeStructured } from '../agent-runtime-redaction.js';
import { nextScenario } from '../adapter-scenarios.js';

const taskKind = (taskType: string) => {
  if (taskType === 'ANALYZE_PRODUCT_NEED' || taskType === 'DEFINE_PRODUCT_REQUIREMENTS' || taskType === 'REVIEW_PRODUCT_COMMITMENT') return taskType;
  throw new AgentExecutionError('CODEX_TASK_NOT_SUPPORTED');
};

const scenarioOutcome = (scenario: string): AdapterExecutionOutcome => {
  const error = (code: string, nextAction: string, retryAfterSeconds?: number): SanitizedError => ({ code, nextAction, retryAfterSeconds });
  if (scenario === 'RATE_LIMITED') return { status: 'RATE_LIMITED', sanitizedError: error('CODEX_RATE_LIMITED', 'Aguardar o retry do executor.', 7), retryable: true, fallbackEligible: true };
  if (scenario === 'QUOTA_EXHAUSTED') return { status: 'QUOTA_EXHAUSTED', sanitizedError: error('CODEX_QUOTA_EXHAUSTED', 'Usar o contingente autorizado ou reabastecer o runtime.'), retryable: false, fallbackEligible: true };
  if (scenario === 'AUTHENTICATION_FAILED') return { status: 'AUTHENTICATION_FAILED', sanitizedError: error('CODEX_AUTHENTICATION_FAILED', 'Renove a sessão CLI do Codex.'), retryable: false, fallbackEligible: false };
  if (scenario === 'TIMED_OUT') return { status: 'TIMED_OUT', sanitizedError: error('CODEX_TIMEOUT', 'Reconcilie o dispatch antes de uma nova tentativa.'), retryable: false, fallbackEligible: false };
  if (scenario === 'INVALID_OUTPUT') return { status: 'INVALID_OUTPUT', sanitizedError: error('CODEX_INVALID_EVIDENCE', 'Corrija o contrato de saída do executor.'), retryable: false, fallbackEligible: true };
  throw new AgentExecutionError('CODEX_PROCESS_FAILED');
};

export class CodexCliAdapter implements AgentRuntimeAdapter {
  readonly adapterType = 'CODEX_CLI' as const;

  async readiness() {
    return checkAgentReadiness(true);
  }

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionOutcome> {
    const scenario = nextScenario('NAAMIVE_CODEX_SCENARIOS');
    if (scenario && scenario !== 'SUCCESS') return scenarioOutcome(scenario);
    const result = await executeAgent(taskKind(context.request.taskType), sanitizeStructured(context.contextPayload) as Record<string, unknown>);
    return { status: 'SUCCEEDED', structuredOutput: sanitizeStructured({ result: result.result, evidence: result.evidence }) as Record<string, unknown>, retryable: false, fallbackEligible: false };
  }
}

export const mapCodexErrorToSanitized = (error: unknown): AdapterExecutionOutcome => {
  const nextAction = (code: string): SanitizedError => ({ code, nextAction: code === 'CODEX_AUTHENTICATION_FAILED' ? 'Renove a sessão CLI do Codex.' : code === 'CODEX_TIMEOUT' ? 'Reconcilie o dispatch antes de nova tentativa.' : 'Corrija a configuração do runtime e tente novamente.' });
  if (error instanceof AgentReadinessError || error instanceof AgentConfigurationError) return { status: 'FAILED', sanitizedError: nextAction(error.code), retryable: false, fallbackEligible: false };
  if (error instanceof AgentExecutionError) {
    if (error.code === 'CODEX_TIMEOUT') return { status: 'TIMED_OUT', sanitizedError: nextAction(error.code), retryable: false, fallbackEligible: false };
    if (error.code === 'CODEX_AUTHENTICATION_FAILED') return { status: 'AUTHENTICATION_FAILED', sanitizedError: nextAction(error.code), retryable: false, fallbackEligible: false };
    if (error.code === 'CODEX_INVALID_EVIDENCE') return { status: 'INVALID_OUTPUT', sanitizedError: nextAction(error.code), retryable: false, fallbackEligible: true };
    return { status: 'FAILED', sanitizedError: nextAction(error.code), retryable: false, fallbackEligible: true };
  }
  return { status: 'FAILED', sanitizedError: nextAction('CODEX_PROCESS_FAILED'), retryable: false, fallbackEligible: true };
};

export const decodeCodexStructuredOutput = (value: Record<string, unknown>): AgentResult => {
  const result = value.result;
  const evidence = value.evidence;
  if ((result !== 'READY_FOR_GATE' && result !== 'REQUIRES_ADJUSTMENT') || !evidence || typeof evidence !== 'object' || Array.isArray(evidence)) throw new AgentExecutionError('CODEX_INVALID_EVIDENCE');
  return { result, evidence: evidence as Record<string, unknown> };
};
