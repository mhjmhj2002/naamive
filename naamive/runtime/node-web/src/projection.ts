/** Public read model helpers. Canonical execution data must never cross this boundary. */
const forbidden = /(?:^|_)(?:path|worktree|prompt|secret|token|password|stdout|stderr|output|command|cwd|branch|authorization|header|environment|signed_url|api_key|configuration|config|content)(?:$|_)/i;
const credentialUrl = /:\/\/[^/\s:@]+:[^@\s/]+@/;

export const publicValue = (value: unknown): unknown => {
  if (typeof value === 'string' && credentialUrl.test(value)) return undefined;
  if (Array.isArray(value)) return value.map(publicValue).filter(item => item !== undefined);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .filter(([name]) => !forbidden.test(name))
    .map(([name, item]) => [name, publicValue(item)]).filter(([, item]) => item !== undefined));
};

export const publicEvent = (row: Record<string, unknown>) => ({
  id: row.id,
  event_type: row.event_type,
  occurred_at: row.occurred_at,
  ...('workflow_code' in row ? { workflow_code: row.workflow_code } : {}),
  ...('workflow_version' in row ? { workflow_version: row.workflow_version } : {}),
  ...('state' in row ? { state: row.state } : {}),
  payload: publicValue(row.payload)
});

export const allowedActions = (workflowCode: string | null | undefined, workflowVersion: number | null | undefined, state: string, activeExternalBlockers = 0) => {
  if (workflowCode === 'WORK_ITEM_DELIVERY' && Number(workflowVersion) === 2) {
    if (state === 'WAITING_FOR_EXTERNAL_INPUT' && activeExternalBlockers > 0) return ['RESOLVE_EXTERNAL_BLOCKER'];
    return [];
  }
  if (state === 'WAITING_FOR_WORK_ITEM_AUTHORIZATION') return ['START_DEVELOPMENT'];
  if (state === 'REWORK_ELIGIBLE') return ['AUTHORIZE_REWORK'];
  return [];
};

export const nextAction = (state: string, blocked?: string | null, workflowCode?: string | null, workflowVersion?: number | null) => {
  if (blocked) return `Resolver bloqueio: ${blocked}.`;
  if (workflowCode === 'WORK_ITEM_DELIVERY' && Number(workflowVersion) === 2) {
    if (state === 'WAITING_FOR_EXTERNAL_INPUT') return 'Fornecer ou registrar a resolução da dependência externa.';
    if (state === 'WAITING_FOR_DEPENDENCIES') return 'Aguardar dependências técnicas; nenhuma ação humana é necessária.';
    if (state === 'ELIGIBLE_FOR_DISPATCH') return 'Elegível para despacho automático pela AUT-01; nenhuma ação humana é necessária.';
    if (state === 'PAUSED') return 'Retomar ou cancelar com motivo e evidência.';
  }
  if (state.includes('WAITING_FOR') || state.includes('ELIGIBLE')) return 'Decisão ou autorização do operador necessária.';
  if (state.includes('DEVELOPMENT') || state.includes('QA') || state.includes('INTEGRATION')) return 'Acompanhar a execução em andamento.';
  if (state === 'READY_FOR_PHASE_MERGE') return 'Incorporar o item à fase.';
  if (state === 'MERGED_TO_PHASE') return 'Criar ou validar a candidata de integração.';
  return 'Acompanhar a próxima atualização.';
};

export const recoveryNextAction=(decision:{selected_action?:string;execution_state?:string;reason?:string}|null|undefined)=>{
  if(!decision)return null;
  if(decision.execution_state==='WAITING_RECONCILIATION')return 'Recovery automático aguarda reconciliação conclusiva; nenhum efeito será repetido.';
  if(decision.execution_state==='COMPLETED'&&decision.selected_action==='INTEGRATION_RECOVERY')return `Recuperação específica de Git/integração necessária. ${decision.reason??''}`.trim();
  if(['PENDING','EXECUTING'].includes(String(decision.execution_state)))return `Recovery automático em andamento: ${decision.selected_action}.`;
  return decision.reason??null;
};
