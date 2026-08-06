/** Public read model helpers. Canonical execution data must never cross this boundary. */
const forbidden = /(?:^|_)(?:path|worktree|prompt|secret|token|password|stdout|stderr|output|command|cwd|branch|authorization|header|environment|signed_url|api_key)(?:$|_)/i;

export const publicValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(publicValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([name]) => !forbidden.test(name))
    .map(([name, item]) => [name, publicValue(item)]));
};

export const publicEvent = (row: Record<string, unknown>) => ({ id: row.id, event_type: row.event_type, occurred_at: row.occurred_at, payload: publicValue(row.payload) });

export const nextAction = (state: string, blocked?: string | null) => {
  if (blocked) return `Resolver bloqueio: ${blocked}.`;
  if (state.includes('WAITING_FOR') || state.includes('ELIGIBLE')) return 'Decisão ou autorização do operador necessária.';
  if (state.includes('DEVELOPMENT') || state.includes('QA') || state.includes('INTEGRATION')) return 'Acompanhar a execução em andamento.';
  if (state === 'READY_FOR_PHASE_MERGE') return 'Incorporar o item à fase.';
  if (state === 'MERGED_TO_PHASE') return 'Criar ou validar a candidata de integração.';
  return 'Acompanhar a próxima atualização.';
};
