import type { AdapterExecutionContext, AdapterExecutionOutcome, AdapterReconciliationContext, AdapterReconciliationOutcome, AgentRuntimeAdapter, SanitizedError } from '../agent-runtime-contracts.js';
import { sanitizeErrorMessage, sanitizeStructured } from '../agent-runtime-redaction.js';
import { nextScenario } from '../adapter-scenarios.js';

const allowlistedEndpoint = (endpoint: string) => {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.hostname !== 'api.deepseek.com' || (url.port && url.port !== '443') || url.username || url.password || url.pathname !== '/') throw new Error('DEEPSEEK_ENDPOINT_NOT_ALLOWED');
  return url;
};

const scenarioError = (code: string, nextAction: string, retryAfterSeconds?: number): SanitizedError => ({ code, nextAction, retryAfterSeconds });
const scenarioOutcome = (scenario: string): AdapterExecutionOutcome => {
  if (scenario === 'RATE_LIMITED') return { status: 'RATE_LIMITED', sanitizedError: scenarioError('DEEPSEEK_RATE_LIMITED', 'Aguarde o retry-after oficial antes de uma nova tentativa.', 11), retryable: true, fallbackEligible: true };
  if (scenario === 'QUOTA_EXHAUSTED') return { status: 'QUOTA_EXHAUSTED', sanitizedError: scenarioError('DEEPSEEK_QUOTA_EXHAUSTED', 'Recupere quota ou use o runtime de contingência autorizado.'), retryable: false, fallbackEligible: true };
  if (scenario === 'AUTHENTICATION_FAILED') return { status: 'AUTHENTICATION_FAILED', sanitizedError: scenarioError('DEEPSEEK_AUTHENTICATION_FAILED', 'Corrija a credencial aprovada do DeepSeek.'), retryable: false, fallbackEligible: false };
  if (scenario === 'TIMED_OUT') return { status: 'TIMED_OUT', sanitizedError: scenarioError('DEEPSEEK_TIMEOUT', 'Reconcilie a tentativa em voo antes de repetir.'), retryable: false, fallbackEligible: false };
  if (scenario === 'INVALID_OUTPUT') return { status: 'INVALID_OUTPUT', sanitizedError: scenarioError('DEEPSEEK_INVALID_OUTPUT', 'Valide a saída estruturada do runtime.'), retryable: false, fallbackEligible: true };
  return { status: 'SUCCEEDED', structuredOutput: { result: 'READY_FOR_GATE', evidence: { provider: 'deepseek', recommendation: 'Pacote pronto para decisão', findings: [] } }, usage: { inputTokens: 15, outputTokens: 20, totalTokens: 35, estimatedCost: 0.24, currency: 'USD' }, retryable: false, fallbackEligible: false };
};

const classifyResponse = async (response: Response): Promise<AdapterExecutionOutcome> => {
  const retryAfter = Number(response.headers.get('retry-after') ?? '0') || undefined;
  let body: any = {};
  try { body = await response.json(); } catch { body = {}; }
  const providerCode = typeof body?.error?.code === 'string' ? body.error.code : undefined;
  const message = sanitizeErrorMessage(typeof body?.error?.message === 'string' ? body.error.message : undefined);
  const nextAction = (code: string, fallbackEligible: boolean, retryable: boolean): AdapterExecutionOutcome => ({
    status: code === 'RATE_LIMITED' ? 'RATE_LIMITED' : code === 'QUOTA_EXHAUSTED' ? 'QUOTA_EXHAUSTED' : code === 'AUTHENTICATION_FAILED' ? 'AUTHENTICATION_FAILED' : 'FAILED',
    sanitizedError: { code: `DEEPSEEK_${code}`, providerCode, retryAfterSeconds: retryAfter, nextAction: message ?? 'Consulte a disponibilidade sanitizada do runtime.' },
    retryable,
    fallbackEligible
  });
  if (response.status === 429) return nextAction('RATE_LIMITED', true, true);
  if (response.status === 401 || response.status === 403) return nextAction('AUTHENTICATION_FAILED', false, false);
  if (providerCode === 'quota_exceeded' || providerCode === 'billing_limit_reached' || providerCode === 'credits_exhausted') return nextAction('QUOTA_EXHAUSTED', true, false);
  return nextAction('FAILED', true, false);
};

export class OpenAiCompatibleHttpAdapter implements AgentRuntimeAdapter {
  readonly adapterType = 'OPENAI_COMPATIBLE_HTTP' as const;

  async execute(context: AdapterExecutionContext): Promise<AdapterExecutionOutcome> {
    allowlistedEndpoint(context.configuration.endpoint ?? '');
    if (context.configuration.model !== 'deepseek-v4-flash') return { status: 'FAILED', sanitizedError: { code: 'DEEPSEEK_MODEL_NOT_ALLOWED', nextAction: 'Use somente o modelo DeepSeek aprovado.' }, retryable: false, fallbackEligible: false };
    if (!context.resolvedSecret) return { status: 'AUTHENTICATION_FAILED', sanitizedError: { code: 'DEEPSEEK_SECRET_NOT_AVAILABLE', nextAction: 'Configure a credencial aprovada do DeepSeek.' }, retryable: false, fallbackEligible: false };
    const scenario = nextScenario('NAAMIVE_DEEPSEEK_SCENARIOS');
    if (scenario && scenario !== 'REAL') return scenarioOutcome(scenario);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), context.request.timeoutSeconds * 1000);
    try {
      const response = await fetch(new URL('/chat/completions', context.configuration.endpoint ?? '').toString(), {
        method: 'POST',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${context.resolvedSecret}`
        },
        body: JSON.stringify({
          model: context.configuration.model,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: JSON.stringify(sanitizeStructured(context.contextPayload)) }]
        })
      });
      if (!response.ok) return classifyResponse(response);
      const body: any = await response.json();
      const content = body?.choices?.[0]?.message?.content;
      if (typeof content !== 'string') return { status: 'INVALID_OUTPUT', sanitizedError: { code: 'DEEPSEEK_INVALID_OUTPUT', nextAction: 'A resposta oficial não trouxe conteúdo JSON estruturado.' }, retryable: false, fallbackEligible: true };
      let parsed: any;
      try { parsed = JSON.parse(content); } catch { return { status: 'INVALID_OUTPUT', sanitizedError: { code: 'DEEPSEEK_INVALID_OUTPUT', nextAction: 'A resposta oficial não continha JSON válido.' }, retryable: false, fallbackEligible: true }; }
      const usage = body?.usage && typeof body.usage === 'object' ? {
        inputTokens: Number(body.usage.prompt_tokens ?? 0),
        outputTokens: Number(body.usage.completion_tokens ?? 0),
        totalTokens: Number(body.usage.total_tokens ?? 0),
        estimatedCost: typeof body.usage.estimated_cost === 'number' ? body.usage.estimated_cost : undefined,
        currency: typeof body.usage.currency === 'string' ? body.usage.currency : undefined
      } : undefined;
      return { status: 'SUCCEEDED', structuredOutput: sanitizeStructured(parsed) as Record<string, unknown>, usage, retryable: false, fallbackEligible: false, providerReference: { completion_id: typeof body?.id === 'string' ? body.id : undefined } };
    } catch (error) {
      if ((error as Error).name === 'AbortError') return { status: 'TIMED_OUT', sanitizedError: { code: 'DEEPSEEK_TIMEOUT', nextAction: 'Reconcilie a tentativa HTTP em voo antes de repetir.' }, retryable: false, fallbackEligible: false };
      return { status: 'FAILED', sanitizedError: { code: 'DEEPSEEK_HTTP_FAILED', nextAction: sanitizeErrorMessage((error as Error).message) ?? 'Verifique a disponibilidade sanitizada do endpoint aprovado.' }, retryable: false, fallbackEligible: true };
    } finally {
      clearTimeout(timeout);
    }
  }

  async reconcile(context: AdapterReconciliationContext): Promise<AdapterReconciliationOutcome> {
    const id = String(context.evidenceReference?.provider_completion_id ?? '');
    if (!id) return { resolution: 'NOT_FOUND' };
    return { resolution: 'AMBIGUOUS' };
  }
}
