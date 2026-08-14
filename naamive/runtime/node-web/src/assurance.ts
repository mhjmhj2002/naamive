import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { withTransaction, pool } from './db.js';
import { sanitizeStructured } from './agent-runtime-redaction.js';

export const assuranceDecisions = ['ACCEPT', 'REWORK', 'BLOCK', 'ESCALATE'] as const;
export const acceptanceStates = ['PENDING_PRODUCE','PENDING_REVIEW','WAITING_FOR_INDEPENDENT_REVIEWER','ACCEPTED','REWORK_REQUIRED','BLOCKED','ESCALATED','CANCELLED'] as const;
export const blockStates = ['OPEN','DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','RESOLVED','ESCALATED','PAUSED','CANCELLED'] as const;
export type AssuranceDecision = typeof assuranceDecisions[number];
export type Identity = { agentId: string; agentVersion: string; runtimeId?: string | null; configurationVersion?: number | null; policyId?: string | null; policyVersion?: number | null; executionContextHash: string };
const prohibited = /(?:prompt|payload|stdout|stderr|secret|token|password|api[_-]?key|working_?directory|repository_?path|path)$/i;
const classificationOrder = ['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'];
const legalBlockTransitions: Record<string, string[]> = {
  OPEN:['DIAGNOSING','PAUSED','CANCELLED','ESCALATED'], DIAGNOSING:['SOLUTION_PROPOSED','PAUSED','CANCELLED','ESCALATED'],
  SOLUTION_PROPOSED:['RESOLUTION_SELECTED','PAUSED','CANCELLED','ESCALATED'], RESOLUTION_SELECTED:['RESOLVING','PAUSED','CANCELLED'],
  RESOLVING:['RESOLVED','PAUSED','CANCELLED','ESCALATED'], PAUSED:['OPEN','DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','CANCELLED','ESCALATED'],
  ESCALATED:['RESOLUTION_SELECTED','CANCELLED'], RESOLVED:[], CANCELLED:[]
};

export class AssuranceError extends Error { constructor(readonly code: string, readonly status=422) { super(code); } }
export const safeEvidence = (value: unknown): Record<string, unknown> => {
  const inspect = (item: unknown): void => {
    if (!item || typeof item !== 'object') return;
    for (const [key, nested] of Object.entries(item as Record<string, unknown>)) { if (prohibited.test(key)) throw new AssuranceError('ASSURANCE_PROHIBITED_DATA'); inspect(nested); }
  };
  inspect(value); return sanitizeStructured(value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
};
export const maximumClassification = (...values: string[]) => {
  const indexes = values.map((value) => classificationOrder.indexOf(value));
  if (indexes.some((index) => index < 0)) throw new AssuranceError('ASSURANCE_CLASSIFICATION_INVALID');
  return classificationOrder[Math.max(0, ...indexes)];
};
export const contextHash = (value: unknown) => createHash('sha256').update(JSON.stringify(safeEvidence(value))).digest('hex');
export const independenceCheck = (producer: Identity, candidate: Identity, exceptionAllowed=false) => {
  const differentAgent = producer.agentId !== candidate.agentId;
  const differentContext = producer.executionContextHash !== candidate.executionContextHash;
  const differentRuntime = producer.runtimeId !== candidate.runtimeId || producer.configurationVersion !== candidate.configurationVersion;
  return { eligible: differentAgent && differentContext && (differentRuntime || exceptionAllowed), different_agent: differentAgent, different_context: differentContext, different_runtime: differentRuntime, exception_used: !differentRuntime && exceptionAllowed };
};

/** Routing is advisory-only.  Keeping it here (rather than in a client) makes
 * the role assignment versionable and prevents a proposal from changing work. */
export const routingRoleForCategory = (category: string) => ({
  REQUIREMENT_AMBIGUITY: 'requirements-engineering',
  ARCHITECTURE_CONFLICT: 'solution-architecture',
  DEPENDENCY: 'integration-engineering',
  EXTERNAL_SERVICE: 'integration-engineering',
  SECURITY: 'security-assurance',
  TECHNICAL: 'engineering-operations',
  ENVIRONMENT: 'engineering-operations',
  TEST_FAILURE: 'engineering-operations',
  POLICY: 'governance-assurance',
  MISSING_INFORMATION: 'requirements-engineering'
} as Record<string, string>)[category] ?? 'engineering-operations';

/** The published policy is intentionally closed: policy publication cannot add
 * an unreviewed authority or a hidden rollout selector. */
export const validateAssurancePolicy = (selectors: unknown, configuration: unknown) => {
  const asObject=(value:unknown,code:string)=>{if(!value||Array.isArray(value)||typeof value!=='object')throw new AssuranceError(code);return value as Record<string,unknown>;};
  const selected=asObject(selectors,'ASSURANCE_POLICY_SELECTORS_INVALID'), configured=asObject(configuration,'ASSURANCE_POLICY_CONFIGURATION_INVALID');
  const selectorKeys=new Set(['agentPolicyNames','taskTypes','classifications']), configKeys=new Set(['schema_version','max_rework_rounds','minimum_progress_delta','runtime_exception_classifications','blockable_failure_codes']);
  for(const key of Object.keys(selected))if(!selectorKeys.has(key))throw new AssuranceError('ASSURANCE_POLICY_SELECTOR_UNKNOWN');
  for(const key of Object.keys(configured))if(!configKeys.has(key))throw new AssuranceError('ASSURANCE_POLICY_CONFIGURATION_UNKNOWN');
  for(const key of selectorKeys)if(selected[key]!==undefined&&(!Array.isArray(selected[key])||!(selected[key] as unknown[]).every(v=>typeof v==='string')))throw new AssuranceError('ASSURANCE_POLICY_SELECTOR_INVALID');
  if(configured.schema_version!==1)throw new AssuranceError('ASSURANCE_POLICY_VERSION_INVALID');
  if(configured.max_rework_rounds!==undefined&&(!Number.isInteger(configured.max_rework_rounds)||Number(configured.max_rework_rounds)<0||Number(configured.max_rework_rounds)>2))throw new AssuranceError('ASSURANCE_POLICY_REWORK_LIMIT_INVALID');
  if(configured.minimum_progress_delta!==undefined&&(typeof configured.minimum_progress_delta!=='number'||configured.minimum_progress_delta<0||configured.minimum_progress_delta>1))throw new AssuranceError('ASSURANCE_POLICY_PROGRESS_INVALID');
  for(const key of ['runtime_exception_classifications','blockable_failure_codes'] as const)if(configured[key]!==undefined&&(!Array.isArray(configured[key])||!configured[key].every((value)=>typeof value==='string')))throw new AssuranceError('ASSURANCE_POLICY_CONFIGURATION_INVALID');
  return {selectors:safeEvidence(selected),configuration:safeEvidence(configured)};
};

const audit=(client:pg.PoolClient,projectId:string,eventType:string,correlationId:string,payload:unknown)=>client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`,[projectId,eventType,correlationId,safeEvidence(payload),'system:assurance']);

export const createAcceptance = async (client: pg.PoolClient, execution: { id:string; project_key:string; policy_name:string; task_type:string; classification:string; agent_id:string; agent_version:string; selected_runtime_id?:string|null; selected_configuration_version?:number|null; policy_id:string; policy_version:number }, correlationId: string) => {
  const policy = await client.query(`SELECT * FROM assurance_policies WHERE enabled=true AND (selectors->'agentPolicyNames' IS NULL OR selectors->'agentPolicyNames' ? $1) AND (selectors->'taskTypes' IS NULL OR selectors->'taskTypes' ? $2) AND (selectors->'classifications' IS NULL OR selectors->'classifications' ? $3) ORDER BY published_at DESC LIMIT 1`, [execution.policy_name,execution.task_type,execution.classification]);
  if (!policy.rowCount) return null;
  const id = randomUUID();
  const assurancePolicy=policy.rows[0]; const producerIdentity = safeEvidence({ agent_id: execution.agent_id, agent_version: execution.agent_version, runtime_id: execution.selected_runtime_id, configuration_version: execution.selected_configuration_version, policy_id: execution.policy_id, policy_version: execution.policy_version, execution_context_hash: contextHash({ execution_id: execution.id, task_type: execution.task_type, classification: execution.classification }) }); const inserted = await client.query(`INSERT INTO work_acceptances(id,execution_id,project_id,correlation_id,policy_id,policy_version,producer_identity,state,classification)
    VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING_PRODUCE',$8) ON CONFLICT(execution_id) DO UPDATE SET execution_id=EXCLUDED.execution_id RETURNING *`, [id,execution.id,execution.project_key,correlationId,assurancePolicy.id,assurancePolicy.version,producerIdentity,execution.classification]);
  return inserted.rows[0];
};

export const submitOutputForReview = async (client: pg.PoolClient, executionId: string, outputReference: unknown) => {
  const acceptance = await client.query(`SELECT * FROM work_acceptances WHERE execution_id=$1 FOR UPDATE`, [executionId]);
  if (!acceptance.rowCount) return null;
  const row=acceptance.rows[0];
  if (row.state === 'CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED', 409);
  // A reconciler can observe the provider result after the original worker
  // committed this handoff.  Treat that as a read of the already committed
  // handoff, rather than turning a safe retry into a terminal failure.
  if (row.state === 'PENDING_REVIEW') return row;
  if (row.state !== 'PENDING_PRODUCE') throw new AssuranceError('ACCEPTANCE_STATE_INVALID', 409);
  await client.query(`UPDATE agent_execution SET state='OUTPUT_SUBMITTED',completed_at=clock_timestamp(),next_action='Aguardando review independente.' WHERE id=$1 AND state <> 'CANCELLED'`,[executionId]);
  await client.query(`UPDATE work_acceptances SET state='PENDING_REVIEW',output_reference=$2,updated_at=clock_timestamp() WHERE id=$1 AND state='PENDING_PRODUCE'`,[row.id,safeEvidence(outputReference)]);
  await audit(client,row.project_id,'ASSURANCE_OUTPUT_SUBMITTED',row.correlation_id,{acceptance_id:row.id,execution_id:executionId});
  return (await client.query(`SELECT * FROM work_acceptances WHERE id=$1`,[row.id])).rows[0];
};

const validateReviewPackage = (body: unknown) => {
  const value = safeEvidence(body); const allowed = new Set(['contract','authorized_activity','input_artifacts','expected_outputs','required_evidence','completion_criteria','output_reference','evidence','classification','prior_decisions']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new AssuranceError('REVIEW_PACKAGE_UNKNOWN_FIELD');
  for (const key of ['contract','authorized_activity','expected_outputs','required_evidence','completion_criteria','output_reference','classification']) if (!(key in value)) throw new AssuranceError('REVIEW_PACKAGE_REQUIRED_FIELD');
  if (typeof value.classification !== 'string' || !classificationOrder.includes(value.classification)) throw new AssuranceError('REVIEW_PACKAGE_CLASSIFICATION_INVALID');
  const components = [value.contract, value.authorized_activity, value.input_artifacts, value.expected_outputs, value.required_evidence, value.completion_criteria, value.output_reference, value.evidence]
    .filter((component): component is Record<string, unknown> => Boolean(component) && typeof component === 'object' && !Array.isArray(component));
  const componentClassifications = components.flatMap((component) => typeof component.classification === 'string' ? [component.classification] : []);
  if (componentClassifications.length && value.classification !== maximumClassification(...componentClassifications)) throw new AssuranceError('REVIEW_PACKAGE_CLASSIFICATION_NOT_MAXIMUM');
  return value;
};

const validateDecisionEvidence = (value: unknown) => {
  const evidence = safeEvidence(value);
  if (!Object.keys(evidence).length) throw new AssuranceError('REVIEW_DECISION_EVIDENCE_REQUIRED');
  return evidence;
};

export const createIndependentReview = async (acceptanceId:string, producer:Identity, candidate:Identity, reviewPackage:unknown, independenceGateId?: string) => withTransaction(async client => {
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0]; if(!acceptance) throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  if(acceptance.state!=='PENDING_REVIEW') throw new AssuranceError('ACCEPTANCE_NOT_PENDING_REVIEW',409);
  const policy=(await client.query(`SELECT configuration FROM assurance_policies WHERE id=$1 AND version=$2`,[acceptance.policy_id,acceptance.policy_version])).rows[0];
  const permitted=Array.isArray(policy?.configuration?.runtime_exception_classifications)&&policy.configuration.runtime_exception_classifications.includes(acceptance.classification);
  const gate = independenceGateId ? (await client.query(`SELECT * FROM assurance_human_gates WHERE id=$1 AND project_id=$2 AND gate_type='INDEPENDENCE_EXCEPTION' AND decision='APPROVED' AND (expires_at IS NULL OR expires_at > clock_timestamp())`, [independenceGateId, acceptance.project_id])).rows[0] : null;
  const frozen = acceptance.producer_identity as Record<string, unknown>;
  const frozenProducer: Identity = { agentId: String(frozen.agent_id), agentVersion: String(frozen.agent_version), runtimeId: frozen.runtime_id as string|null, configurationVersion: frozen.configuration_version as number|null, policyId: frozen.policy_id as string|null, policyVersion: frozen.policy_version as number|null, executionContextHash: String(frozen.execution_context_hash) };
  if (producer.agentId !== frozenProducer.agentId || producer.executionContextHash !== frozenProducer.executionContextHash) throw new AssuranceError('PRODUCER_IDENTITY_MISMATCH',409);
  const check=independenceCheck(frozenProducer,candidate,Boolean(gate)&&permitted);
  if(!check.eligible) {
    await client.query(`UPDATE work_acceptances SET state='WAITING_FOR_INDEPENDENT_REVIEWER',updated_at=clock_timestamp() WHERE id=$1`,[acceptanceId]);
    const block=await openBlock(client,{projectId:acceptance.project_id,acceptanceId,executionId:acceptance.execution_id,sourceType:'WORK_ACCEPTANCE',sourceId:acceptanceId,code:'NO_INDEPENDENT_REVIEWER',category:'ENVIRONMENT',severity:'HIGH',correlationId:acceptance.correlation_id,evidence:check});
    await audit(client,acceptance.project_id,'ASSURANCE_REVIEWER_UNAVAILABLE',acceptance.correlation_id,{acceptance_id:acceptanceId,block_id:block.id,independence:check});
    return { acceptance_id: acceptanceId, state: 'WAITING_FOR_INDEPENDENT_REVIEWER', block_id: block.id };
  }
  const version=Number((await client.query(`SELECT COALESCE(max(version),0)+1 AS version FROM assurance_reviews WHERE acceptance_id=$1`,[acceptanceId])).rows[0].version);
  const inserted=await client.query(`INSERT INTO assurance_reviews(id,acceptance_id,version,reviewer_agent_id,reviewer_agent_version,reviewer_runtime_id,reviewer_configuration_version,reviewer_policy_id,reviewer_policy_version,execution_context_hash,independence_check,state,review_package)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'DISPATCHED',$12) RETURNING *`,[randomUUID(),acceptanceId,version,candidate.agentId,candidate.agentVersion,candidate.runtimeId??null,candidate.configurationVersion??null,candidate.policyId??null,candidate.policyVersion??null,candidate.executionContextHash,{...check,gate_id:gate?.id??null},validateReviewPackage(reviewPackage)]);
  await audit(client,acceptance.project_id,'ASSURANCE_REVIEW_DISPATCHED',acceptance.correlation_id,{acceptance_id:acceptanceId,review_id:inserted.rows[0].id,independence:check});
  return inserted.rows[0];
});

export const openBlock = async (client: pg.PoolClient, input: { projectId:string; acceptanceId?:string; executionId?:string; sourceType:string; sourceId:string; code:string; category:string; severity:string; correlationId:string; evidence?:unknown }) => {
  const id=randomUUID(); const result=await client.query(`INSERT INTO work_blocks(id,project_id,acceptance_id,execution_id,source_type,source_id,block_code,category,severity,state,evidence,correlation_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN',$10,$11) ON CONFLICT DO NOTHING RETURNING *`,[id,input.projectId,input.acceptanceId??null,input.executionId??null,input.sourceType,input.sourceId,input.code,input.category,input.severity,safeEvidence(input.evidence),input.correlationId]);
  if(result.rowCount) return result.rows[0]; return (await client.query(`SELECT * FROM work_blocks WHERE source_type=$1 AND source_id=$2 AND block_code=$3 AND state NOT IN ('RESOLVED','CANCELLED')`,[input.sourceType,input.sourceId,input.code])).rows[0];
};

/**
 * Keeps a policy-selected dispatch inside the F6 micro-lifecycle when a
 * technical failure is explicitly blockable.  Callers remain responsible for
 * their legacy failure path when this returns false.
 */
export const blockAssuranceFailure = async (client: pg.PoolClient, executionId: string, code: string, evidence: unknown) => {
  const acceptance = (await client.query(`SELECT a.*, e.job_id,e.operation_id,p.configuration
    FROM work_acceptances a
    JOIN agent_execution e ON e.id=a.execution_id
    JOIN assurance_policies p ON p.id=a.policy_id AND p.version=a.policy_version
    WHERE a.execution_id=$1 FOR UPDATE`, [executionId])).rows[0];
  if (!acceptance || ['ACCEPTED','CANCELLED'].includes(acceptance.state)) return false;
  const blockable = Array.isArray(acceptance.configuration?.blockable_failure_codes)
    ? acceptance.configuration.blockable_failure_codes.map(String) : [];
  if (!blockable.includes(code)) return false;
  await client.query(`UPDATE work_acceptances SET state='BLOCKED',updated_at=clock_timestamp() WHERE id=$1`, [acceptance.id]);
  await client.query(`UPDATE agent_execution SET state='BLOCKED_NO_EXECUTOR_AVAILABLE',completed_at=clock_timestamp(),next_action='Falha bloqueável aguardando resolução autorizada.' WHERE id=$1`, [executionId]);
  await client.query(`UPDATE jobs SET status='BLOCKED',lease_expires_at=NULL,last_error=$2 WHERE id=$1`, [acceptance.job_id, code]);
  await client.query(`UPDATE operations SET status='BLOCKED',failure_code=$2,completed_at=NULL WHERE id=$1`, [acceptance.operation_id, code]);
  const block = await openBlock(client, { projectId: acceptance.project_id, acceptanceId: acceptance.id, executionId,
    sourceType: 'AGENT_EXECUTION', sourceId: executionId, code, category: 'ENVIRONMENT', severity: 'HIGH',
    correlationId: acceptance.correlation_id, evidence });
  await audit(client, acceptance.project_id, 'ASSURANCE_FAILURE_BLOCKED', acceptance.correlation_id,
    { acceptance_id: acceptance.id, execution_id: executionId, block_id: block.id, code });
  return true;
};

export const transitionBlock = async (blockId:string, state:string, resolution?:unknown) => withTransaction(async client => {
  const found=await client.query(`SELECT * FROM work_blocks WHERE id=$1 FOR UPDATE`,[blockId]); if(!found.rowCount) throw new AssuranceError('BLOCK_NOT_FOUND',404); const block=found.rows[0];
  if(!legalBlockTransitions[block.state]?.includes(state)) throw new AssuranceError('BLOCK_TRANSITION_INVALID',409);
  if(state==='RESOLVED' && (!resolution || Object.keys(safeEvidence(resolution)).length===0)) throw new AssuranceError('BLOCK_RESOLUTION_EVIDENCE_REQUIRED');
  await client.query(`UPDATE work_blocks SET state=$2,resolution=COALESCE($3,resolution),updated_at=clock_timestamp() WHERE id=$1`,[blockId,state,resolution ? safeEvidence(resolution):null]);
  // A blocked F6 dispatch is resumed only after an explicit, evidenced
  // resolution.  This requeues the existing job; it never manufactures a
  // second business operation or changes legacy rows without an acceptance.
  if (state === 'RESOLVED' && block.acceptance_id && block.execution_id) {
    const acceptance = (await client.query(`SELECT a.*,e.job_id,e.operation_id FROM work_acceptances a JOIN agent_execution e ON e.id=a.execution_id WHERE a.id=$1 FOR UPDATE`, [block.acceptance_id])).rows[0];
    if (acceptance?.state === 'BLOCKED') {
      await client.query(`UPDATE work_acceptances SET state='PENDING_PRODUCE',updated_at=clock_timestamp() WHERE id=$1`, [acceptance.id]);
      await client.query(`UPDATE agent_execution SET state='SELECTED',completed_at=NULL,next_action='Resolução autorizada; aguardando novo dispatch.' WHERE id=$1`, [block.execution_id]);
      await client.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp(),completed_at=NULL,lease_expires_at=NULL,last_error=NULL WHERE id=$1`, [acceptance.job_id]);
      await client.query(`UPDATE operations SET status='QUEUED',completed_at=NULL,failure_code=NULL WHERE id=$1`, [acceptance.operation_id]);
      await audit(client, block.project_id, 'ASSURANCE_BLOCK_RESOLVED_REQUEUED', block.correlation_id, { block_id: blockId, acceptance_id: acceptance.id });
    }
  }
  await audit(client,block.project_id,'ASSURANCE_BLOCK_TRANSITION',block.correlation_id,{block_id:blockId,state});
  return (await client.query(`SELECT * FROM work_blocks WHERE id=$1`,[blockId])).rows[0];
});

/** Cancellation has precedence over every later review/reconciliation handoff. */
export const cancelAcceptance = async (acceptanceId:string, reason:unknown) => withTransaction(async client => {
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0]; if(!acceptance)throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='ACCEPTED')throw new AssuranceError('ASSURANCE_ALREADY_ACCEPTED',409);
  await client.query(`UPDATE work_acceptances SET state='CANCELLED',updated_at=clock_timestamp() WHERE id=$1`,[acceptanceId]);
  await client.query(`UPDATE assurance_reviews SET state='CANCELLED' WHERE acceptance_id=$1 AND state IN ('PENDING','DISPATCHED')`,[acceptanceId]);
  await client.query(`UPDATE agent_execution SET state='CANCELLED',completed_at=clock_timestamp(),next_action='Cancelado pelo operador.' WHERE id=$1 AND state NOT IN ('SUCCEEDED','CANCELLED')`,[acceptance.execution_id]);
  await client.query(`UPDATE work_blocks SET state='CANCELLED',updated_at=clock_timestamp() WHERE acceptance_id=$1 AND state NOT IN ('RESOLVED','CANCELLED')`,[acceptanceId]);
  await audit(client,acceptance.project_id,'ASSURANCE_CANCELLED',acceptance.correlation_id,{acceptance_id:acceptanceId,reason:safeEvidence(reason)});return {id:acceptanceId,state:'CANCELLED'};
});

export const decideReview = async (reviewId:string, decision:AssuranceDecision, evidence:unknown, idempotencyKey:string) => withTransaction(async client => {
  if(!assuranceDecisions.includes(decision)) throw new AssuranceError('REVIEW_DECISION_INVALID');
  const review=(await client.query(`SELECT r.*,a.project_id,a.execution_id,a.state AS acceptance_state,e.job_id,e.operation_id,e.revision_id,e.job_kind FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id JOIN agent_execution e ON e.id=a.execution_id WHERE r.id=$1 FOR UPDATE`,[reviewId])).rows[0];
  if(!review) throw new AssuranceError('REVIEW_NOT_FOUND',404); if(review.state==='CANCELLED'||review.acceptance_state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  if(review.state!=='DISPATCHED') throw new AssuranceError('REVIEW_NOT_DISPATCHED',409);
  const prior=await client.query(`SELECT * FROM review_decisions WHERE idempotency_key=$1 OR review_id=$2`,[idempotencyKey,reviewId]); if(prior.rowCount) return prior.rows[0];
  const decisionEvidence=validateDecisionEvidence(evidence);
  const result=(await client.query(`INSERT INTO review_decisions(id,review_id,decision,evidence,idempotency_key) VALUES($1,$2,$3,$4,$5) RETURNING *`,[randomUUID(),reviewId,decision,decisionEvidence,idempotencyKey])).rows[0];
  await client.query(`UPDATE assurance_reviews SET state='DECIDED',decided_at=clock_timestamp() WHERE id=$1`,[reviewId]);
  if(decision==='ACCEPT') {
    await client.query(`UPDATE work_acceptances SET state='ACCEPTED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
    await client.query(`UPDATE agent_execution SET state='SUCCEEDED',completed_at=clock_timestamp(),next_action='Trabalho aceito.' WHERE id=$1`,[review.execution_id]);
    if (review.job_id) {
      await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id=$1`,[review.job_id]);
      if (review.operation_id) {
        const pending = await client.query(`SELECT 1 FROM jobs WHERE operation_id=$1 AND status IN ('PENDING','RETRYABLE','LEASED')`, [review.operation_id]);
        if (!pending.rowCount) await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp(),failure_code=NULL WHERE id=$1`, [review.operation_id]);
      }
    }
  }
  else if(decision==='REWORK') {
    await client.query(`UPDATE work_acceptances SET state='REWORK_REQUIRED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
    const findingId=randomUUID();
    const ev=decisionEvidence;
    const description=typeof ev.description==='string'?ev.description.trim():'Assurance review rejected output';
    /* F3 owns corrective work.  An assurance review may create a canonical
     * finding only when its producing job has a concrete delivery target;
     * otherwise it remains a review fact and is routed as a block instead of
     * violating findings' exactly-one-target invariant. */
    const target=(await client.query(`SELECT j.delivery_id,d.work_item_id,d.technology_baseline_revision_id
      FROM jobs j LEFT JOIN deliveries d ON d.id=j.delivery_id WHERE j.id=$1`,[review.job_id])).rows[0];
    if(target?.delivery_id) {
      const inserted=await client.query(`INSERT INTO findings(id,project_id,delivery_id,agent_execution_id,work_acceptance_id,review_id,dispatch_id,origin,severity,rule_code,fingerprint,description,technology_baseline_revision_id)
        VALUES($1,$2,$3,$4,$5,$6,$4,'ASSURANCE_REVIEW','HIGH','ASSURANCE_REWORK',$7,$8,$9)
        ON CONFLICT (origin,delivery_id,rule_code,fingerprint) WHERE delivery_id IS NOT NULL DO NOTHING RETURNING id`,[findingId,review.project_id,target.delivery_id,review.execution_id,review.acceptance_id,reviewId,createHash('sha256').update(description).digest('hex'),description,target.technology_baseline_revision_id??null]);
      const canonicalFindingId=inserted.rows[0]?.id ?? (await client.query(`SELECT id FROM findings WHERE origin='ASSURANCE_REVIEW' AND delivery_id=$1 AND rule_code='ASSURANCE_REWORK' AND fingerprint=$2`,[target.delivery_id,createHash('sha256').update(description).digest('hex')])).rows[0]?.id;
      if(canonicalFindingId && target.work_item_id) await client.query(`INSERT INTO finding_work_items(finding_id,work_item_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[canonicalFindingId,target.work_item_id]);
    } else await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'ASSURANCE_REVIEW',sourceId:reviewId,code:'REWORK_TARGET_UNRESOLVED',category:'MISSING_INFORMATION',severity:'HIGH',correlationId:randomUUID(),evidence:{review_id:reviewId,reason:'F3 delivery target is required before corrective work can be authorized'}});
  }
  else if(decision==='ESCALATE') await client.query(`UPDATE work_acceptances SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
  else { await client.query(`UPDATE work_acceptances SET state='BLOCKED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]); await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'ASSURANCE_REVIEW',sourceId:reviewId,code:'REVIEW_BLOCK',category:'TECHNICAL',severity:'HIGH',correlationId:randomUUID(),evidence:decisionEvidence}); }
  await audit(client,review.project_id,'ASSURANCE_REVIEW_DECIDED',randomUUID(),{review_id:reviewId,acceptance_id:review.acceptance_id,decision});
  return result;
});

export const createAssistanceProposal = async (blockId:string, body:unknown, actorId:string) => withTransaction(async client => {
  const block=(await client.query(`SELECT * FROM work_blocks WHERE id=$1 FOR UPDATE`,[blockId])).rows[0]; if(!block)throw new AssuranceError('BLOCK_NOT_FOUND',404);
  const value=safeEvidence(body), alternatives=Array.isArray(value.alternatives)?value.alternatives:[];
  const routingRole=routingRoleForCategory(block.category);
  if(!alternatives.length||typeof value.recommendation!=='object'||typeof value.confidence!=='number'||value.confidence<0||value.confidence>1||(value.routing_role !== undefined && value.routing_role!==routingRole))throw new AssuranceError('ASSISTANCE_PROPOSAL_INVALID');
  const row=(await client.query(`INSERT INTO assistance_proposals(id,block_id,alternatives,recommendation,confidence,routing_role,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[randomUUID(),blockId,alternatives,value.recommendation,value.confidence,routingRole,actorId])).rows[0];
  await audit(client,block.project_id,'ASSURANCE_ASSISTANCE_PROPOSED',block.correlation_id,{block_id:blockId,proposal_id:row.id,routing_role:value.routing_role}); return row;
});

const gateRoles:Record<string,string[]>={INDEPENDENCE_EXCEPTION:['TECH_LEAD','REPOSITORY_OWNER'],SCOPE_ARCHITECTURE_POLICY:['TECH_LEAD','REPOSITORY_OWNER'],ACCEPTED_RISK:['TECH_LEAD','REPOSITORY_OWNER'],ESCALATED_CLOSURE:['TECH_LEAD','REPOSITORY_OWNER']};
export const recordHumanGate = async(projectId:string,body:unknown,actorId:string)=>withTransaction(async client=>{
  const value=safeEvidence(body), type=String(value.gate_type??''), role=String(value.actor_role??'');
  if(!gateRoles[type]?.includes(role))throw new AssuranceError('ASSURANCE_GATE_UNAUTHORIZED',403);
  if(!['APPROVED','REJECTED'].includes(String(value.decision))||typeof value.reason!=='string'||!value.reason.trim())throw new AssuranceError('ASSURANCE_GATE_INVALID');
  const row=(await client.query(`INSERT INTO assurance_human_gates(id,project_id,block_id,gate_type,actor_id,decision,reason,evidence,expires_at,correlation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[randomUUID(),projectId,value.block_id??null,type,actorId,value.decision,value.reason,safeEvidence(value.evidence),value.expires_at??null,value.correlation_id??randomUUID()])).rows[0];
  await audit(client,projectId,'ASSURANCE_HUMAN_GATE_RECORDED',row.correlation_id,{gate_id:row.id,gate_type:type,decision:value.decision});return row;
});

/** A manual reconciliation is deliberately unable to accept work: it can only
 * reproduce the normal PENDING_PRODUCE -> PENDING_REVIEW handoff. */
export const reconcileAcceptance = async (acceptanceId: string, body: unknown, actorId: string) => withTransaction(async client => {
  const value=safeEvidence(body);
  if(typeof value.reason!=='string'||!value.reason.trim()||!value.evidence) throw new AssuranceError('ASSURANCE_RECONCILIATION_EVIDENCE_REQUIRED');
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0];
  if(!acceptance) throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  let result=acceptance;
  if(acceptance.state==='PENDING_PRODUCE') result=await submitOutputForReview(client,acceptance.execution_id,value.output_reference??{manual_reconciliation:true});
  await audit(client,acceptance.project_id,'ASSURANCE_MANUAL_RECONCILIATION',acceptance.correlation_id,{acceptance_id:acceptanceId,actor_id:actorId,reason:value.reason,evidence:value.evidence});
  return {id:acceptanceId,state:result?.state??acceptance.state,reconciled:true};
});

export const assuranceProjection = async (projectId:string,cursor?:string|null, state?:string|null, category?:string|null) => {
  const [acceptances,blocks,reviews,proposals,gates,findings,timeline]=await Promise.all([
    pool.query(`SELECT id,execution_id,correlation_id,state,classification,version,created_at,updated_at FROM work_acceptances WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
    pool.query(`SELECT id,acceptance_id,source_type,source_id,block_code,category,severity,state,resolution,correlation_id,created_at,updated_at FROM work_blocks WHERE project_id=$1 AND ($2::text IS NULL OR state=$2) AND ($3::text IS NULL OR category=$3) ORDER BY created_at DESC`,[projectId,state??null,category??null]),
    pool.query(`SELECT r.id,r.acceptance_id,r.version,r.state,r.independence_check,r.decided_at,r.created_at FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id WHERE a.project_id=$1 ORDER BY r.created_at DESC`,[projectId]),
    pool.query(`SELECT p.id,p.block_id,p.alternatives,p.recommendation,p.confidence,p.routing_role,p.created_at FROM assistance_proposals p JOIN work_blocks b ON b.id=p.block_id WHERE b.project_id=$1 ORDER BY p.created_at DESC`,[projectId]),
    pool.query(`SELECT id,block_id,gate_type,actor_id,decision,reason,evidence,expires_at,correlation_id,created_at FROM assurance_human_gates WHERE project_id=$1 ORDER BY created_at DESC`,[projectId]),
    pool.query(`SELECT id,delivery_id,work_acceptance_id,review_id,origin,severity,rule_code,fingerprint,description,state,created_at FROM findings WHERE project_id=$1 AND origin='ASSURANCE_REVIEW' ORDER BY created_at DESC`,[projectId]),
    pool.query(`SELECT id,event_type,correlation_id,payload,created_at FROM events WHERE project_id=$1 AND event_type LIKE 'ASSURANCE_%' AND ($2::bigint IS NULL OR id>$2::bigint) ORDER BY id ASC LIMIT 200`,[projectId,cursor??null])]);
  return {version:1,acceptances:acceptances.rows,reviews:reviews.rows,blocks:blocks.rows,proposals:proposals.rows,gates:gates.rows,findings:findings.rows,timeline:timeline.rows,next_cursor:timeline.rows.at(-1)?.id?.toString()??cursor??null};
};
