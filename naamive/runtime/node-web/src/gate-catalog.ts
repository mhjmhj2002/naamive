import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { ApiError } from './service.js';
import { pool } from './db.js';

export const GATE_CATALOG_VERSION = 2;

type DecisionEffect = { consequence: string; next_state: string; continuation: string };
export type GateDefinition = {
  code: string;
  type: 'ORDINARY'|'CONDITIONAL';
  scopes: string[];
  condition_code: string;
  required_evidence: string[];
  authority_roles: string[];
  decisions: Record<string, DecisionEffect>;
};

const definition = (code: string, type: GateDefinition['type'], scopes: string[], condition_code: string, required_evidence: string[], authority_roles: string[], decisions: GateDefinition['decisions']): GateDefinition => ({ code,type,scopes,condition_code,required_evidence,authority_roles,decisions });

/** This is the versioned, closed server-side policy. Its published copies and
 * hashes are persisted by migrations 049/051; callers never infer a gate from a
 * state name, a free-text flag, or an advisory recommendation. */
const catalog: GateDefinition[] = [
  definition('REGISTER_PROJECT','ORDINARY',['PROJECT'],'INTAKE_VALIDATED',['intake_revision_id','reviewed_evidence','rationale'],['BUSINESS_INTAKE_AUTHORITY'],{
    APPROVE:{consequence:'Registra a necessidade como projeto.',next_state:'ANALYSIS',continuation:'Despacho de descoberta conforme lifecycle.'},
    REWORK:{consequence:'Preserva a necessidade e registra ajustes solicitados.',next_state:'DRAFT',continuation:'Corrigir e reenviar o intake.'},
    REJECT:{consequence:'Recusa o registro sem apagar a evidência.',next_state:'REJECTED',continuation:'Consulta histórica ou novo intake.'}
  }),
  definition('PRODUCT_COMMITMENT','ORDINARY',['PROJECT'],'TRACEABLE_REQUIREMENTS_AND_MODULES',['requirements_revision_id','candidate_modules','investment_and_risks'],['BUSINESS_OWNER'],{
    APPROVE:{consequence:'Fecha o compromisso de produto.',next_state:'ARCHITECTURE',continuation:'Arquitetura e integrações seguem por revisão independente.'},
    REWORK:{consequence:'Registra feedback obrigatório para a definição.',next_state:'DEFINITION',continuation:'Nova revisão de requisitos.'}
  }),
  definition('MODULE_PLAN_APPROVAL','ORDINARY',['MODULE'],'VALID_VERSIONED_PLAN',['plan_revision_id','json_hash','markdown_hash','context_hash','validation_hash'],['MODULE_PRODUCT_OWNER'],{
    APPROVE:{consequence:'Aprova uma única revisão completa do plano.',next_state:'PLANNED',continuation:'Materialização e elegibilidade são automáticas.'},
    REWORK:{consequence:'Registra feedback obrigatório na revisão do plano.',next_state:'PLANNING_IN_PROGRESS',continuation:'Produzir uma nova revisão imutável.'}
  }),
  definition('DELIVERY_ACCEPTANCE','ORDINARY',['PROJECT'],'DELIVERY_OPERATION_HANDOVER_EVIDENCE',['release_evidence','operation_evidence','handover_evidence'],['BUSINESS_OWNER'],{
    APPROVE:{consequence:'Aceita a entrega de negócio.',next_state:'DELIVERED',continuation:'Execução funcional pertence a GAT-02.'},
    REWORK:{consequence:'Registra achados de entrega.',next_state:'VALIDATION',continuation:'Nova validação antes de novo aceite.'}
  }),
  definition('MATERIAL_ARCHITECTURE','CONDITIONAL',['PROJECT','MODULE'],'MATERIALITY_POLICY_MATCHED',['policy_id','policy_version','material_impacts','alternatives','affected_boundaries'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE:{consequence:'Fecha a decisão arquitetural material.',next_state:'PLANNING',continuation:'Projeto segue para planejamento; módulo segue para ARCHITECTED.'},
    REWORK:{consequence:'Registra achados arquiteturais.',next_state:'ARCHITECTURE',continuation:'Retorna para revisão arquitetural.'}
  }),
  definition('MATERIAL_RISK','CONDITIONAL',['PROJECT'],'MATERIAL_RISK_POLICY_MATCHED',['policy_id','policy_version','residual_risk','impact','mitigations'],['TECH_LEAD','REPOSITORY_OWNER'],{
    ACCEPT_RISK:{consequence:'Aceita explicitamente o risco residual.',next_state:'DELIVERY',continuation:'Preparar aceite final de entrega.'},
    REWORK:{consequence:'Registra achados e não aceita o risco.',next_state:'IMPLEMENTATION',continuation:'Novo ciclo de implementação e validação.'}
  }),
  definition('SECURITY_COMPLIANCE','CONDITIONAL',['PROJECT','MODULE','WORK_ITEM','EXECUTION'],'SECURITY_OR_COMPLIANCE_POLICY_MATCHED',['policy_id','policy_version','applicability','findings','mitigations'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE_EXCEPTION:{consequence:'Aceita a exceção de segurança/compliance explicitamente.',next_state:'RESUME_POLICY_PATH',continuation:'Retoma exclusivamente o caminho previsto pela política.'},
    REWORK:{consequence:'Registra achados de segurança/compliance.',next_state:'REWORK_REQUIRED',continuation:'Corrigir e revalidar independentemente.'}
  }),
  definition('INDEPENDENCE_EXCEPTION','CONDITIONAL',['EXECUTION'],'INDEPENDENCE_EXCEPTION_POLICY_MATCHED',['acceptance_id','policy_id','policy_version','expires_at','unavailable_reviewer_evidence'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE:{consequence:'Autoriza somente a exceção delimitada e expirável.',next_state:'INDEPENDENT_REVIEW',continuation:'Selecionar reviewer ainda distinto do produtor.'},
    REJECT:{consequence:'Mantém a exigência de independência.',next_state:'WAITING_FOR_INDEPENDENT_REVIEWER',continuation:'Routing, fallback ou nova tentativa.'}
  }),
  definition('SCOPE_ARCHITECTURE_POLICY','CONDITIONAL',['EXECUTION'],'MATERIALITY_POLICY_MATCHED',['policy_id','policy_version','material_impacts','alternatives','affected_boundaries'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE:{consequence:'Aceita a decisão material delimitada.',next_state:'RESUME_POLICY_PATH',continuation:'Retoma somente a transição publicada.'},
    REJECT:{consequence:'Recusa a decisão material.',next_state:'REWORK_REQUIRED',continuation:'Retornar a rework ou routing conforme o finding.'}
  }),
  definition('ACCEPTED_RISK','CONDITIONAL',['EXECUTION'],'MATERIAL_RISK_POLICY_MATCHED',['policy_id','policy_version','residual_risk','impact','mitigations'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE:{consequence:'Aceita o risco residual explicitamente.',next_state:'RESUME_POLICY_PATH',continuation:'Prosseguir somente dentro do escopo aceito.'},
    REJECT:{consequence:'Não aceita o risco residual.',next_state:'REWORK_REQUIRED',continuation:'Corrigir e revalidar.'}
  }),
  definition('REWORK_ESCALATION','CONDITIONAL',['WORK_ITEM','EXECUTION'],'REWORK_LIMIT_OR_MATERIALITY_MATCHED',['rework_decision_id','finding_ids','rework_round','limit','escalation_reason'],['TECH_LEAD','REPOSITORY_OWNER'],{
    AUTHORIZE_REWORK:{consequence:'Autoriza ciclo corretivo delimitado.',next_state:'REWORK_REQUIRED',continuation:'Despacho corretivo e re-review obrigatório.'},
    ACCEPT_RISK:{consequence:'Aceita risco explicitamente.',next_state:'READY_FOR_INTEGRATION',continuation:'Seguir somente a política de risco aplicável.'},
    CHANGE_SCOPE:{consequence:'Registra mudança material de escopo.',next_state:'REWORK_REQUIRED',continuation:'Novo planejamento/rework rastreável.'},
    CHANGE_ARCHITECTURE:{consequence:'Registra mudança arquitetural material.',next_state:'REWORK_REQUIRED',continuation:'Nova arquitetura e rework rastreável.'},
    CLOSE:{consequence:'Fecha a escalada sem promover aceite técnico.',next_state:'CLOSED',continuation:'Nenhum avanço; preservar evidência.'}
  }),
  definition('ESCALATED_CLOSURE','CONDITIONAL',['EXECUTION'],'ESCALATED_CLOSURE_POLICY_MATCHED',['block_id','attempts','escalation_reason','resolution_evidence'],['TECH_LEAD','REPOSITORY_OWNER'],{
    APPROVE:{consequence:'Aprova o fechamento escalado.',next_state:'CLOSED',continuation:'Encerrar somente o block correlato, sem aceite implícito.'},
    REJECT:{consequence:'Recusa o fechamento escalado.',next_state:'BLOCKED',continuation:'Retornar a routing, retry ou rework conforme causa.'}
  })
];

const canonical = (value: unknown): string => JSON.stringify(value);
export const gateCatalogHash = createHash('sha256').update(canonical({version:GATE_CATALOG_VERSION,gates:catalog})).digest('hex');
export const gateCatalog = (): readonly GateDefinition[] => catalog;
export const publishedGateCatalog = async () => {
  const publication=await pool.query(`SELECT content_hash,published_at,catalog FROM gate_catalog_publications WHERE version=$1 AND status='PUBLISHED'`,[GATE_CATALOG_VERSION]);
  if(!publication.rowCount) throw new ApiError(409,'GATE_CATALOG_NOT_PUBLISHED');
  return {version:GATE_CATALOG_VERSION,content_hash:publication.rows[0].content_hash,published_at:publication.rows[0].published_at,gates:publication.rows[0].catalog};
};
export const gateDefinition = (code: string): GateDefinition => {
  const item=catalog.find(candidate=>candidate.code===code);
  if(!item) throw new ApiError(422,'GATE_NOT_CATALOGED');
  return item;
};

const object = (value: unknown, code: string): Record<string, unknown> => {
  if(!value || Array.isArray(value) || typeof value!=='object') throw new ApiError(422,code);
  return value as Record<string,unknown>;
};
const present = (value: unknown) => value!==undefined && value!==null && value!=='' && (!Array.isArray(value) || value.length>0);

export type GateOpening = { gate_code:string; scope_type:string; scope_id:string; condition_code:string; evidence:unknown; reason:string; correlation_id?:string; idempotency_key?:string };
const validateGateOpeningFor = (entry: GateDefinition, input: GateOpening) => {
  const evidence=object(input.evidence,'GATE_EVIDENCE_INVALID');
  if(!entry.scopes.includes(input.scope_type)) throw new ApiError(422,'GATE_SCOPE_NOT_ALLOWED');
  if(entry.condition_code!==input.condition_code) throw new ApiError(422,'GATE_CONDITION_NOT_PUBLISHED');
  if(typeof input.scope_id!=='string'||!input.scope_id.trim()||typeof input.reason!=='string'||!input.reason.trim()) throw new ApiError(422,'GATE_OPENING_INVALID');
  if(entry.required_evidence.some(key=>!present(evidence[key]))) throw new ApiError(422,'GATE_EVIDENCE_INCOMPLETE');
  return {entry,evidence};
};
export const validateGateOpening = (input: GateOpening) => validateGateOpeningFor(gateDefinition(input.gate_code),input);
const publishedDefinition = (value: unknown, code: string): GateDefinition => {
  if(!Array.isArray(value)) throw new ApiError(409,'GATE_CATALOG_INVALID');
  const raw=value.find(item=>item&&typeof item==='object'&&!Array.isArray(item)&&(item as Record<string,unknown>).code===code);
  const entry=object(raw,'GATE_NOT_CATALOGED');
  const list=(field:string)=>Array.isArray(entry[field])&&(entry[field] as unknown[]).every(item=>typeof item==='string')?(entry[field] as string[]):null;
  const scopes=list('scopes'), evidence=list('required_evidence'), roles=list('authority_roles'), decisions=object(entry.decisions,'GATE_CATALOG_INVALID') as Record<string,DecisionEffect>;
  if((entry.type!=='ORDINARY'&&entry.type!=='CONDITIONAL')||typeof entry.condition_code!=='string'||!scopes||!evidence||!roles||!Object.keys(decisions).length||Object.values(decisions).some(effect=>!effect||typeof effect.next_state!=='string'||typeof effect.consequence!=='string'||typeof effect.continuation!=='string')) throw new ApiError(409,'GATE_CATALOG_INVALID');
  return {code,type:entry.type,scopes,condition_code:entry.condition_code,required_evidence:evidence,authority_roles:roles,decisions};
};

export const openCatalogGate = async (client: pg.PoolClient, projectId:string, input:GateOpening) => {
  const publication=await client.query(`SELECT content_hash FROM gate_catalog_publications WHERE version=$1 AND status='PUBLISHED' FOR SHARE`,[GATE_CATALOG_VERSION]);
  if(!publication.rowCount) throw new ApiError(409,'GATE_CATALOG_NOT_PUBLISHED');
  const manifest=await client.query(`SELECT catalog FROM gate_catalog_publications WHERE version=$1 AND status='PUBLISHED' FOR SHARE`,[GATE_CATALOG_VERSION]);
  const {entry,evidence}=validateGateOpeningFor(publishedDefinition(manifest.rows[0].catalog,input.gate_code),input);
  if(input.idempotency_key) {
    const replay=await client.query(`SELECT * FROM gate_records WHERE idempotency_key=$1`,[input.idempotency_key]);
    if(replay.rowCount) return replay.rows[0];
  }
  const existing=await client.query(`SELECT id FROM gate_records WHERE project_id=$1 AND gate_code=$2 AND scope_type=$3 AND scope_id=$4 AND status='OPEN' FOR UPDATE`,[projectId,entry.code,input.scope_type,input.scope_id]);
  if(existing.rowCount) throw new ApiError(409,'GATE_ALREADY_OPEN');
  const row=(await client.query(`INSERT INTO gate_records(id,project_id,gate_code,catalog_version,catalog_hash,catalog_contract,scope_type,scope_id,condition_code,evidence,reason,authority_roles,allowed_decisions,decision_effects,correlation_id,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[randomUUID(),projectId,entry.code,GATE_CATALOG_VERSION,publication.rows[0].content_hash,JSON.stringify(entry),input.scope_type,input.scope_id,input.condition_code,evidence,input.reason,JSON.stringify(entry.authority_roles),JSON.stringify(Object.keys(entry.decisions)),JSON.stringify(entry.decisions),input.correlation_id??randomUUID(),input.idempotency_key??null])).rows[0];
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'CATALOG_GATE_OPENED',$2,$3,'system:gate-catalog')`,[projectId,row.correlation_id,{gate_id:row.id,gate_code:entry.code,catalog_version:GATE_CATALOG_VERSION,condition_code:input.condition_code}]);
  return row;
};

export type GateDecision = { version: number; decision: string; reason: string; evidence: unknown; actor_id: string; actor_role: string; idempotency_key?: string };
export const decideCatalogGate = async (client:pg.PoolClient, projectId:string, gateId:string, input:GateDecision) => {
  const replay=input.idempotency_key ? await client.query(`SELECT g.* FROM gate_decisions d JOIN gate_records g ON g.id=d.gate_id WHERE d.idempotency_key=$1`,[input.idempotency_key]) : null;
  if(replay?.rowCount) return replay.rows[0];
  const gate=(await client.query(`SELECT * FROM gate_records WHERE id=$1 AND project_id=$2 FOR UPDATE`,[gateId,projectId])).rows[0];
  if(!gate) throw new ApiError(404,'GATE_NOT_FOUND');
  if(gate.status!=='OPEN'||Number(input.version)!==Number(gate.version)) throw new ApiError(409,'GATE_VERSION_CONFLICT');
  const contract=object(gate.catalog_contract,'GATE_CATALOG_SNAPSHOT_MISSING');
  if(String(contract.code)!==String(gate.gate_code)) throw new ApiError(409,'GATE_CATALOG_SNAPSHOT_MISMATCH');
  const roles=Array.isArray(gate.authority_roles)?gate.authority_roles.map(String):[];
  const decisions=Array.isArray(gate.allowed_decisions)?gate.allowed_decisions.map(String):[];
  const effects=object(gate.decision_effects,'GATE_CATALOG_SNAPSHOT_MISSING') as Record<string,DecisionEffect>;
  if(!roles.includes(input.actor_role)) throw new ApiError(403,'GATE_AUTHORITY_NOT_ALLOWED');
  if(!decisions.includes(input.decision)||!effects[input.decision]) throw new ApiError(422,'GATE_DECISION_NOT_ALLOWED');
  if(typeof input.actor_id!=='string'||!input.actor_id.trim()||typeof input.reason!=='string'||!input.reason.trim()) throw new ApiError(422,'GATE_DECISION_INVALID');
  const evidence=object(input.evidence,'GATE_DECISION_EVIDENCE_REQUIRED');
  if(!Object.keys(evidence).length) throw new ApiError(422,'GATE_DECISION_EVIDENCE_REQUIRED');
  const decisionId=randomUUID(), effect=effects[input.decision];
  await client.query(`INSERT INTO gate_decisions(id,gate_id,catalog_version,gate_version,decision,actor_id,actor_role,reason,evidence,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[decisionId,gate.id,GATE_CATALOG_VERSION,gate.version,input.decision,input.actor_id,input.actor_role,input.reason,evidence,input.idempotency_key??null]);
  const decided=(await client.query(`UPDATE gate_records SET status='DECIDED',decision=$2,decision_id=$3,decided_at=clock_timestamp(),version=version+1 WHERE id=$1 RETURNING *`,[gate.id,input.decision,decisionId])).rows[0];
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'CATALOG_GATE_DECIDED',$2,$3,$4)`,[projectId,gate.correlation_id,{gate_id:gate.id,gate_code:gate.gate_code,catalog_version:GATE_CATALOG_VERSION,decision:input.decision,effect},input.actor_id]);
  // REC-02 has a concrete, catalog-published continuation for this gate.  It
  // runs under the same transaction and locks the persisted recovery case,
  // making approval restart-safe and preventing a current_stage=7 wait from
  // becoming a terminal-stage limbo.
  if(gate.gate_code==='INDEPENDENCE_EXCEPTION'&&input.decision==='APPROVE') {
    const { resumeReviewerRecoveryForCatalogGate }=await import('./assurance.js');
    await resumeReviewerRecoveryForCatalogGate(client,decided);
  }
  return {...decided,effect};
};

export const catalogGateProjection = async (projectId:string, actorRole?:string) => {
  const [publication,result]=await Promise.all([
    pool.query(`SELECT content_hash FROM gate_catalog_publications WHERE version=$1 AND status='PUBLISHED'`,[GATE_CATALOG_VERSION]),
    pool.query(`SELECT id,gate_code,catalog_version,catalog_hash,scope_type,scope_id,status,version,condition_code,evidence,reason,authority_roles,allowed_decisions,decision_effects,decision,correlation_id,created_at,decided_at FROM gate_records WHERE project_id=$1 ORDER BY created_at DESC,id DESC`,[projectId])
  ]);
  if(!publication.rowCount) throw new ApiError(409,'GATE_CATALOG_NOT_PUBLISHED');
  return {catalog_version:GATE_CATALOG_VERSION,catalog_hash:publication.rows[0].content_hash,gates:result.rows.map(row=>({...row,allowed_actions:row.status==='OPEN'&&Array.isArray(row.authority_roles)&&row.authority_roles.includes(actorRole??'')?['DECIDE_GATE']:[]}))};
};
