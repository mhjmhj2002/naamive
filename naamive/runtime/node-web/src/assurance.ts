import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type pg from 'pg';
import { withTransaction, pool } from './db.js';
import { sanitizeStructured } from './agent-runtime-redaction.js';
import { persistDiscoveryAgentOutcome } from './discovery-agent-jobs.js';
import type { AgentResult } from './agent.js';
import { config } from './config.js';
import { gateDefinition } from './gate-catalog.js';

export const assuranceDecisions = ['ACCEPT', 'REWORK', 'BLOCK', 'ESCALATE'] as const;
export const acceptanceStates = ['PENDING_PRODUCE','PENDING_REVIEW','WAITING_FOR_INDEPENDENT_REVIEWER','ACCEPTED','REWORK_REQUIRED','BLOCKED','ESCALATED','CANCELLED'] as const;
export const blockStates = ['OPEN','DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','RESOLVED','ESCALATED','PAUSED','CANCELLED'] as const;
export const blockCategories = ['TECHNICAL','REQUIREMENT_AMBIGUITY','ARCHITECTURE_CONFLICT','DEPENDENCY','ENVIRONMENT','EXTERNAL_SERVICE','TEST_FAILURE','SECURITY','POLICY','MISSING_INFORMATION'] as const;
export type AssuranceDecision = typeof assuranceDecisions[number];
export type Identity = { agentId: string; agentVersion: string; runtimeId?: string | null; configurationVersion?: number | null; policyId?: string | null; policyVersion?: number | null; executionContextHash: string };
const prohibited = /(?:prompt|payload|stdout|stderr|secret|token|password|api[_-]?key|working_?directory|repository_?path|path)$/i;
const classificationOrder = ['PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED'];
const legalBlockTransitions: Record<string, string[]> = {
  OPEN:['DIAGNOSING','PAUSED','CANCELLED','ESCALATED'], DIAGNOSING:['SOLUTION_PROPOSED','PAUSED','CANCELLED','ESCALATED'],
  SOLUTION_PROPOSED:['RESOLUTION_SELECTED','PAUSED','CANCELLED','ESCALATED'], RESOLUTION_SELECTED:['RESOLVING','PAUSED','CANCELLED'],
  RESOLVING:['RESOLVED','PAUSED','CANCELLED','ESCALATED'], PAUSED:['OPEN','DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','CANCELLED','ESCALATED'],
  ESCALATED:['RESOLUTION_SELECTED','CANCELLED'], RESOLVED:['OPEN'], CANCELLED:[]
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
  const selectorKeys=new Set(['agentPolicyNames','taskTypes','classifications']), configKeys=new Set(['schema_version','max_rework_rounds','minimum_progress_delta','reviewer_runtime_ids','runtime_exception_classifications','blockable_failure_codes']);
  for(const key of Object.keys(selected))if(!selectorKeys.has(key))throw new AssuranceError('ASSURANCE_POLICY_SELECTOR_UNKNOWN');
  for(const key of Object.keys(configured))if(!configKeys.has(key))throw new AssuranceError('ASSURANCE_POLICY_CONFIGURATION_UNKNOWN');
  for(const key of selectorKeys)if(selected[key]!==undefined&&(!Array.isArray(selected[key])||!(selected[key] as unknown[]).every(v=>typeof v==='string')))throw new AssuranceError('ASSURANCE_POLICY_SELECTOR_INVALID');
  if(configured.schema_version!==1)throw new AssuranceError('ASSURANCE_POLICY_VERSION_INVALID');
  if(configured.max_rework_rounds!==undefined&&(!Number.isInteger(configured.max_rework_rounds)||Number(configured.max_rework_rounds)<0||Number(configured.max_rework_rounds)>2))throw new AssuranceError('ASSURANCE_POLICY_REWORK_LIMIT_INVALID');
  if(configured.minimum_progress_delta!==undefined&&(typeof configured.minimum_progress_delta!=='number'||configured.minimum_progress_delta<0||configured.minimum_progress_delta>1))throw new AssuranceError('ASSURANCE_POLICY_PROGRESS_INVALID');
  for(const key of ['reviewer_runtime_ids','runtime_exception_classifications','blockable_failure_codes'] as const)if(configured[key]!==undefined&&(!Array.isArray(configured[key])||!configured[key].every((value)=>typeof value==='string')))throw new AssuranceError('ASSURANCE_POLICY_CONFIGURATION_INVALID');
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if(Array.isArray(configured.reviewer_runtime_ids)&&(!configured.reviewer_runtime_ids.length||!configured.reviewer_runtime_ids.every((value)=>uuid.test(String(value)))||new Set(configured.reviewer_runtime_ids).size!==configured.reviewer_runtime_ids.length))throw new AssuranceError('ASSURANCE_POLICY_REVIEWER_RUNTIMES_INVALID');
  return {selectors:safeEvidence(selected),configuration:safeEvidence(configured)};
};

const audit=(client:pg.PoolClient,projectId:string,eventType:string,correlationId:string,payload:unknown)=>client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,$2,$3,$4,$5)`,[projectId,eventType,correlationId,safeEvidence(payload),'system:assurance']);
const replayCommand=async(client:pg.PoolClient,key:string|undefined,type:string,resourceId:string)=>{
  if(!key)return null;
  const prior=(await client.query(`SELECT command_type,resource_id,result_id FROM assurance_command_idempotency WHERE idempotency_key=$1`,[key])).rows[0];
  if(!prior)return null;
  if(prior.command_type!==type||prior.resource_id!==resourceId)throw new AssuranceError('ASSURANCE_IDEMPOTENCY_CONFLICT',409);
  return prior.result_id;
};
const rememberCommand=(client:pg.PoolClient,key:string|undefined,type:string,resourceId:string,resultId:string)=>key?client.query(`INSERT INTO assurance_command_idempotency(idempotency_key,command_type,resource_id,result_id) VALUES($1,$2,$3,$4) ON CONFLICT(idempotency_key) DO NOTHING`,[key,type,resourceId,resultId]):Promise.resolve();

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
  if (row.state === 'PENDING_REVIEW') {
    await ensureAutomaticReview(client, row, outputReference);
    return (await client.query(`SELECT * FROM work_acceptances WHERE id=$1`,[row.id])).rows[0];
  }
  const rereview=row.state==='REWORK_REQUIRED';
  if (row.state !== 'PENDING_PRODUCE' && !rereview) throw new AssuranceError('ACCEPTANCE_STATE_INVALID', 409);
  if(rereview) {
    const unresolved=await client.query(`SELECT 1 FROM findings WHERE work_acceptance_id=$1 AND state<>'CLOSED' LIMIT 1`,[row.id]);
    if(unresolved.rowCount) throw new AssuranceError('ASSURANCE_REVALIDATION_REQUIRED',409);
  }
  await client.query(`UPDATE agent_execution SET state='OUTPUT_SUBMITTED',completed_at=clock_timestamp(),next_action='Aguardando review independente.' WHERE id=$1 AND state <> 'CANCELLED'`,[executionId]);
  await client.query(`UPDATE work_acceptances SET state='PENDING_REVIEW',output_reference=$2,version=version+CASE WHEN $3 THEN 1 ELSE 0 END,updated_at=clock_timestamp() WHERE id=$1`,[row.id,safeEvidence(outputReference),rereview]);
  await audit(client,row.project_id,rereview?'ASSURANCE_OUTPUT_RESUBMITTED':'ASSURANCE_OUTPUT_SUBMITTED',row.correlation_id,{acceptance_id:row.id,execution_id:executionId,acceptance_version:Number(row.version)+(rereview?1:0)});
  await ensureAutomaticReview(client, {...row,state:'PENDING_REVIEW',version:Number(row.version)+(rereview?1:0),output_reference:safeEvidence(outputReference)}, outputReference);
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

const readStructuredOutput = async (client: pg.PoolClient | typeof pool, reference: any): Promise<AgentResult | undefined> => {
  if(!reference?.artifact_id || !reference?.artifact_hash) return undefined;
  const artifact=(await client.query(`SELECT storage_key,sha256 FROM artifacts WHERE id=$1 AND artifact_type='assurance-structured-output'`,[reference.artifact_id])).rows[0];
  if(!artifact || artifact.sha256!==reference.artifact_hash) throw new AssuranceError('ASSURANCE_OUTPUT_REFERENCE_INVALID',409);
  const content=await readFile(join(config().artifactRoot,artifact.storage_key),'utf8');
  if(createHash('sha256').update(content).digest('hex')!==artifact.sha256) throw new AssuranceError('ASSURANCE_OUTPUT_HASH_MISMATCH',409);
  const parsed=JSON.parse(content) as AgentResult;
  if(!parsed||!['READY_FOR_GATE','REQUIRES_ADJUSTMENT'].includes(parsed.result)||!parsed.evidence||typeof parsed.evidence!=='object') throw new AssuranceError('ASSURANCE_OUTPUT_INVALID',409);
  return parsed;
};

/**
 * F3 remains the owner of corrective work.  This records the assurance
 * finding as an F3 decision in the *same* transaction as the review outcome,
 * so an API retry cannot leave a finding without its governing decision (or
 * create a second corrective loop).  Starting the actual correction is still
 * the normal F3 authorised development command.
 */
const registerF3Rework = async (client: pg.PoolClient, input: { projectId:string; findingId:string; workItemId:string; deliveryId:string; headSha:string; justification:string; correlationId:string }) => {
  const workItem=(await client.query(`SELECT id,revision_id,state,rework_rounds FROM work_items WHERE id=$1 AND project_id=$2 FOR UPDATE`,[input.workItemId,input.projectId])).rows[0];
  if(!workItem) return {registered:false,reason:'WORK_ITEM_NOT_FOUND'};
  const active=(await client.query(`SELECT id,rework_round,delivery_id,head_sha FROM rework_decisions WHERE work_item_id=$1 AND revision_id=$2 AND status='ACTIVE' FOR UPDATE`,[workItem.id,workItem.revision_id])).rows[0];
  if(active) {
    if(active.delivery_id!==input.deliveryId || active.head_sha!==input.headSha) return {registered:false,reason:'ACTIVE_REWORK_GUARD'};
    await client.query(`UPDATE rework_decisions SET finding_ids=(SELECT to_jsonb(ARRAY(SELECT DISTINCT value FROM jsonb_array_elements_text(finding_ids || to_jsonb($2::text)) value ORDER BY value))) WHERE id=$1`,[active.id,input.findingId]);
    return {registered:true,reused:true,decisionId:active.id,round:Number(active.rework_round)};
  }
  const round=Number(workItem.rework_rounds)+1;
  if(round>2) return {registered:false,reason:'REWORK_LIMIT'};
  const decisionId=randomUUID();
  await client.query(`INSERT INTO rework_decisions(id,project_id,work_item_id,revision_id,delivery_id,head_sha,finding_ids,justification,rework_round,status)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,'ACTIVE')`,[decisionId,input.projectId,workItem.id,workItem.revision_id,input.deliveryId,input.headSha,JSON.stringify([input.findingId]),input.justification,round]);
  await client.query(`UPDATE work_items SET state='REWORK_ELIGIBLE',rework_rounds=$2,version=version+1 WHERE id=$1 AND state NOT IN ('MERGED_TO_PHASE','WAITING_FOR_ESCALATION')`,[workItem.id,round]);
  await audit(client,input.projectId,'ASSURANCE_REWORK_REGISTERED',input.correlationId,{finding_id:input.findingId,work_item_id:workItem.id,decision_id:decisionId,round});
  return {registered:true,reused:false,decisionId,round};
};

const reviewerAgents = new Set([
  'governance-assurance',
  'quality-assurance',
  'security-assurance',
  'requirements-engineering',
  'solution-architecture',
  'integration-engineering',
]);

const sameIdentity = (left: Identity, right: Identity) =>
  left.agentId === right.agentId &&
  left.agentVersion === right.agentVersion &&
  left.runtimeId === right.runtimeId &&
  left.configurationVersion === right.configurationVersion &&
  left.policyId === right.policyId &&
  left.policyVersion === right.policyVersion &&
  left.executionContextHash === right.executionContextHash;

const frozenProducerIdentity = (acceptance: any): Identity => {
  const frozen = acceptance.producer_identity as Record<string, unknown>;
  return {
    agentId: String(frozen.agent_id),
    agentVersion: String(frozen.agent_version),
    runtimeId: frozen.runtime_id as string | null,
    configurationVersion: frozen.configuration_version as number | null,
    policyId: frozen.policy_id as string | null,
    policyVersion: frozen.policy_version as number | null,
    executionContextHash: String(frozen.execution_context_hash),
  };
};

const reviewerRuntime = async (client: pg.PoolClient, candidate: Identity) => {
  if (!candidate.runtimeId || !candidate.configurationVersion || !reviewerAgents.has(candidate.agentId)) return null;
  return (await client.query(`SELECT r.name,c.adapter_type
    FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=$2
    WHERE r.id=$1 AND r.enabled=true AND r.current_configuration_version=$2`,
    [candidate.runtimeId,candidate.configurationVersion])).rows[0] ?? null;
};

const buildReviewPackage = (acceptance: any, sourceExecution: any, outputReference: unknown) => ({
  contract: { schema_version:'review-package/v1', dispatch_execution_id:sourceExecution.id },
  authorized_activity: { mode:'REVIEW', task_type:sourceExecution.task_type },
  input_artifacts: { references:[] },
  expected_outputs: { decisions:[...assuranceDecisions] },
  required_evidence: { structured:true, traceable:true },
  completion_criteria: { criteria:['Compare authorized work, expected outputs and submitted evidence.'] },
  output_reference: safeEvidence(outputReference),
  evidence: { producer_execution_id:sourceExecution.id, acceptance_id:acceptance.id },
  classification: acceptance.classification,
});

const dispatchIndependentReview = async (client: pg.PoolClient, acceptance: any, candidate: Identity, reviewPackage: unknown, gate: any = null) => {
  const frozenProducer=frozenProducerIdentity(acceptance);
  const runtime=await reviewerRuntime(client,candidate);
  const check=independenceCheck(frozenProducer,candidate,Boolean(gate));
  if(!runtime || !check.eligible) {
    await client.query(`UPDATE work_acceptances SET state='WAITING_FOR_INDEPENDENT_REVIEWER',updated_at=clock_timestamp() WHERE id=$1`,[acceptance.id]);
    const block=await openBlock(client,{projectId:acceptance.project_id,acceptanceId:acceptance.id,executionId:acceptance.execution_id,sourceType:'WORK_ACCEPTANCE',sourceId:acceptance.id,code:'NO_INDEPENDENT_REVIEWER',category:'ENVIRONMENT',severity:'HIGH',correlationId:acceptance.correlation_id,evidence:{...check,runtime_available:Boolean(runtime)}});
    await audit(client,acceptance.project_id,'ASSURANCE_REVIEWER_UNAVAILABLE',acceptance.correlation_id,{acceptance_id:acceptance.id,block_id:block.id,independence:check});
    return { acceptance_id: acceptance.id, state: 'WAITING_FOR_INDEPENDENT_REVIEWER', block_id: block.id };
  }
  const existing=(await client.query(`SELECT * FROM assurance_reviews WHERE acceptance_id=$1 AND state IN ('PENDING','DISPATCHED')`,[acceptance.id])).rows[0];
  if(existing) return existing;
  const version=Number((await client.query(`SELECT COALESCE(max(version),0)+1 AS version FROM assurance_reviews WHERE acceptance_id=$1`,[acceptance.id])).rows[0].version);
  const reviewId=randomUUID(), operationId=randomUUID(), jobId=randomUUID(), dispatchId=randomUUID();
  const packageForReviewer=validateReviewPackage(reviewPackage);
  const sourceExecution=(await client.query(`SELECT * FROM agent_execution WHERE id=$1`,[acceptance.execution_id])).rows[0];
  if(!sourceExecution) throw new AssuranceError('ASSURANCE_PRODUCER_EXECUTION_NOT_FOUND',409);
  const dispatchKey=`assurance-review:${acceptance.id}:${version}`;
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id)
    VALUES($1,$2,'REVIEW','QUEUED',$3,$4,$5) ON CONFLICT(idempotency_key) DO NOTHING`,[operationId,acceptance.project_id,dispatchKey,acceptance.correlation_id,sourceExecution.revision_id??null]);
  const operation=(await client.query(`SELECT id FROM operations WHERE idempotency_key=$1`,[dispatchKey])).rows[0];
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key,metadata)
    VALUES($1,$2,$3,$4,'REVIEW',$5,$6) ON CONFLICT(idempotency_key) DO NOTHING`,[jobId,operation.id,acceptance.project_id,sourceExecution.revision_id??null,`${dispatchKey}:job`,safeEvidence({review_id:reviewId,classification:acceptance.classification})]);
  const job=(await client.query(`SELECT id FROM jobs WHERE idempotency_key=$1`,[`${dispatchKey}:job`])).rows[0];
  await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,revision_id,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selected_runtime_name,selected_adapter_type,selection_reason,next_action)
    VALUES($1,$2,$3,$4,$5,$6,'REVIEW',$7,$8,$9,'REVIEW',$10,$11,$12,$13,'SELECTED',$14,$15,$16,$17,$18,'Reviewer independente aguardando worker.')
    ON CONFLICT(job_id,idempotency_key) DO NOTHING`,[dispatchId,job.id,operation.id,acceptance.project_id,acceptance.project_id,sourceExecution.revision_id??null,`${dispatchKey}:execution`,candidate.agentId,candidate.agentVersion,acceptance.classification,sourceExecution.policy_id,sourceExecution.policy_name,sourceExecution.policy_version,candidate.runtimeId,candidate.configurationVersion,runtime.name,runtime.adapter_type,safeEvidence({review_id:reviewId,classification:acceptance.classification})]);
  const dispatch=(await client.query(`SELECT id FROM agent_execution WHERE job_id=$1 AND idempotency_key=$2`,[job.id,`${dispatchKey}:execution`])).rows[0];
  const inserted=await client.query(`INSERT INTO assurance_reviews(id,acceptance_id,version,dispatch_execution_id,reviewer_agent_id,reviewer_agent_version,reviewer_runtime_id,reviewer_configuration_version,reviewer_policy_id,reviewer_policy_version,execution_context_hash,independence_check,state,review_package)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'DISPATCHED',$13) RETURNING *`,[reviewId,acceptance.id,version,dispatch.id,candidate.agentId,candidate.agentVersion,candidate.runtimeId,candidate.configurationVersion,candidate.policyId,candidate.policyVersion,candidate.executionContextHash,{...check,gate_id:gate?.id??null},packageForReviewer]);
  await audit(client,acceptance.project_id,'ASSURANCE_REVIEW_DISPATCHED',acceptance.correlation_id,{acceptance_id:acceptance.id,review_id:inserted.rows[0].id,independence:check});
  return inserted.rows[0];
};

const ensureAutomaticReview = async (client: pg.PoolClient, acceptance: any, outputReference: unknown) => {
  const sourceExecution=(await client.query(`SELECT * FROM agent_execution WHERE id=$1`,[acceptance.execution_id])).rows[0];
  if(!sourceExecution) throw new AssuranceError('ASSURANCE_PRODUCER_EXECUTION_NOT_FOUND',409);
  const producer=frozenProducerIdentity(acceptance);
  const assurancePolicy=(await client.query(`SELECT configuration FROM assurance_policies WHERE id=$1 AND version=$2`,[acceptance.policy_id,acceptance.policy_version])).rows[0];
  const reviewerRuntimeIds=Array.isArray(assurancePolicy?.configuration?.reviewer_runtime_ids)
    ? assurancePolicy.configuration.reviewer_runtime_ids.map(String) : [];
  const selected=(await client.query(`SELECT r.id,c.version
    FROM ai_runtime r JOIN ai_runtime_configuration c ON c.runtime_id=r.id AND c.version=r.current_configuration_version
    WHERE r.enabled=true AND r.id=ANY($3::uuid[]) AND (r.id<>$1::uuid OR c.version<>$2::integer)
    ORDER BY CASE c.quality_tier WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,r.name LIMIT 1`,
    [producer.runtimeId,producer.configurationVersion,reviewerRuntimeIds])).rows[0];
  const candidate:Identity={
    agentId:producer.agentId==='governance-assurance'?'quality-assurance':'governance-assurance',
    agentVersion:'1',
    runtimeId:selected?.id??null,
    configurationVersion:selected?.version??null,
    policyId:producer.policyId,
    policyVersion:producer.policyVersion,
    executionContextHash:contextHash({acceptance_id:acceptance.id,mode:'REVIEW',runtime_id:selected?.id??null,configuration_version:selected?.version??null}),
  };
  return dispatchIndependentReview(client,acceptance,candidate,buildReviewPackage(acceptance,sourceExecution,outputReference));
};

export const createIndependentReview = async (acceptanceId:string, producer:Identity, candidate:Identity, reviewPackage:unknown, independenceGateId?: string) => withTransaction(async client => {
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0]; if(!acceptance) throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  if(!['PENDING_REVIEW','WAITING_FOR_INDEPENDENT_REVIEWER'].includes(acceptance.state)) throw new AssuranceError('ACCEPTANCE_NOT_PENDING_REVIEW',409);
  const policy=(await client.query(`SELECT configuration FROM assurance_policies WHERE id=$1 AND version=$2`,[acceptance.policy_id,acceptance.policy_version])).rows[0];
  const permitted=Array.isArray(policy?.configuration?.runtime_exception_classifications)&&policy.configuration.runtime_exception_classifications.includes(acceptance.classification);
  const gate = independenceGateId ? (await client.query(`SELECT * FROM assurance_human_gates WHERE id=$1 AND project_id=$2 AND gate_type='INDEPENDENCE_EXCEPTION' AND decision='APPROVED'
    AND scope->>'acceptance_id'=$3 AND policy_id=$4 AND policy_version=$5
    AND expires_at IS NOT NULL AND expires_at > clock_timestamp()`, [independenceGateId, acceptance.project_id,acceptance.id,acceptance.policy_id,acceptance.policy_version])).rows[0] : null;
  const frozenProducer=frozenProducerIdentity(acceptance);
  if (!sameIdentity(producer,frozenProducer)) throw new AssuranceError('PRODUCER_IDENTITY_MISMATCH',409);
  return dispatchIndependentReview(client,acceptance,candidate,reviewPackage,Boolean(gate)&&permitted?gate:null);
});

export const openBlock = async (client: pg.PoolClient, input: { projectId:string; acceptanceId?:string; executionId?:string; sourceType:string; sourceId:string; code:string; category:string; severity:string; correlationId:string; classification?:string; symptoms?:unknown[]; attempts?:unknown[]; suspectedCauses?:unknown[]; responsibleRole?:string; evidence?:unknown }) => {
  const classification=maximumClassification(input.classification??'INTERNAL');
  const id=randomUUID(); const result=await client.query(`INSERT INTO work_blocks(id,project_id,acceptance_id,execution_id,source_type,source_id,block_code,category,severity,state,evidence,correlation_id,classification,symptoms,attempts,suspected_causes,responsible_role)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN',$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING RETURNING *`,[id,input.projectId,input.acceptanceId??null,input.executionId??null,input.sourceType,input.sourceId,input.code,input.category,input.severity,safeEvidence(input.evidence),input.correlationId,classification,JSON.stringify(input.symptoms??[]),JSON.stringify(input.attempts??[]),JSON.stringify(input.suspectedCauses??[]),input.responsibleRole??routingRoleForCategory(input.category)]);
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

export const transitionBlock = async (blockId:string, state:string, resolution?:unknown,idempotencyKey?:string) => withTransaction(async client => {
  const replay=await replayCommand(client,idempotencyKey,`BLOCK_${state}`,blockId);
  if(replay) return (await client.query(`SELECT * FROM work_blocks WHERE id=$1`,[replay])).rows[0];
  const found=await client.query(`SELECT * FROM work_blocks WHERE id=$1 FOR UPDATE`,[blockId]); if(!found.rowCount) throw new AssuranceError('BLOCK_NOT_FOUND',404); const block=found.rows[0];
  if(!legalBlockTransitions[block.state]?.includes(state)) throw new AssuranceError('BLOCK_TRANSITION_INVALID',409);
  const commandEvidence=safeEvidence(resolution);
  if(typeof commandEvidence.reason!=='string'||!commandEvidence.reason.trim()||!commandEvidence.evidence) throw new AssuranceError('BLOCK_TRANSITION_EVIDENCE_REQUIRED');
  if(block.state==='ESCALATED' && state!=='CANCELLED') {
    const approved=await client.query(`SELECT 1 FROM assurance_human_gates WHERE block_id=$1 AND gate_type='ESCALATED_CLOSURE' AND decision='APPROVED' AND scope->>'block_id'=$1::text ORDER BY created_at DESC LIMIT 1`,[blockId]);
    if(!approved.rowCount) throw new AssuranceError('ASSURANCE_ESCALATED_CLOSURE_GATE_REQUIRED',409);
  }
  if(block.state==='RESOLVED'&&state==='OPEN') {
    const reopened=(await client.query(`INSERT INTO work_blocks(id,project_id,acceptance_id,execution_id,source_type,source_id,block_code,category,severity,state,evidence,previous_block_id,correlation_id,classification,cycle,symptoms,attempts,suspected_causes,responsible_role)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN',$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,[randomUUID(),block.project_id,block.acceptance_id,block.execution_id,block.source_type,block.source_id,block.block_code,block.category,block.severity,commandEvidence,block.id,block.correlation_id,block.classification,Number(block.cycle)+1,JSON.stringify(block.symptoms??[]),JSON.stringify(block.attempts??[]),JSON.stringify(block.suspected_causes??[]),block.responsible_role])).rows[0];
    await audit(client,block.project_id,'ASSURANCE_BLOCK_REOPENED',block.correlation_id,{block_id:reopened.id,previous_block_id:block.id,cycle:reopened.cycle,reason:commandEvidence.reason,evidence:commandEvidence.evidence});
    await rememberCommand(client,idempotencyKey,`BLOCK_${state}`,blockId,reopened.id);
    return reopened;
  }
  await client.query(`UPDATE work_blocks SET state=$2,resolution=COALESCE($3,resolution),updated_at=clock_timestamp() WHERE id=$1`,[blockId,state,state==='RESOLVED' ? commandEvidence : null]);
  if(block.acceptance_id&&block.execution_id&&['PAUSED','ESCALATED'].includes(state)) {
    const execution=(await client.query(`SELECT job_id,operation_id FROM agent_execution WHERE id=$1`,[block.execution_id])).rows[0];
    if(execution) {
      await client.query(`UPDATE jobs SET status='BLOCKED',lease_expires_at=NULL,last_error=$2 WHERE id=$1 AND status NOT IN ('COMPLETED','CANCELLED')`,[execution.job_id,state==='PAUSED'?'ASSURANCE_PAUSED':'ASSURANCE_ESCALATED']);
      await client.query(`UPDATE operations SET status='BLOCKED',completed_at=NULL,failure_code=$2 WHERE id=$1 AND status NOT IN ('SUCCEEDED','CANCELLED')`,[execution.operation_id,state==='PAUSED'?'ASSURANCE_PAUSED':'ASSURANCE_ESCALATED']);
      if(state==='ESCALATED') await client.query(`UPDATE work_acceptances SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1 AND state NOT IN ('ACCEPTED','CANCELLED')`,[block.acceptance_id]);
    }
  }
  // A blocked F6 dispatch is resumed only after an explicit, evidenced
  // resolution.  This requeues the existing job; it never manufactures a
  // second business operation or changes legacy rows without an acceptance.
  if (state === 'RESOLVED' && block.acceptance_id && block.execution_id) {
    const acceptance = (await client.query(`SELECT a.*,e.job_id,e.operation_id FROM work_acceptances a JOIN agent_execution e ON e.id=a.execution_id WHERE a.id=$1 FOR UPDATE`, [block.acceptance_id])).rows[0];
    if (acceptance && ['BLOCKED','ESCALATED'].includes(acceptance.state)) {
      await client.query(`UPDATE work_acceptances SET state='PENDING_PRODUCE',updated_at=clock_timestamp() WHERE id=$1`, [acceptance.id]);
      await client.query(`UPDATE agent_execution SET state='SELECTED',completed_at=NULL,next_action='Resolução autorizada; aguardando novo dispatch.' WHERE id=$1`, [block.execution_id]);
      await client.query(`UPDATE jobs SET status='RETRYABLE',available_at=clock_timestamp(),completed_at=NULL,lease_expires_at=NULL,last_error=NULL WHERE id=$1`, [acceptance.job_id]);
      await client.query(`UPDATE operations SET status='QUEUED',completed_at=NULL,failure_code=NULL WHERE id=$1`, [acceptance.operation_id]);
      await audit(client, block.project_id, 'ASSURANCE_BLOCK_RESOLVED_REQUEUED', block.correlation_id, { block_id: blockId, acceptance_id: acceptance.id });
    }
  }
  if(state==='CANCELLED'&&block.acceptance_id) await cancelAcceptanceInTransaction(client,block.acceptance_id,commandEvidence);
  await audit(client,block.project_id,'ASSURANCE_BLOCK_TRANSITION',block.correlation_id,{block_id:blockId,state,reason:commandEvidence.reason,evidence:commandEvidence.evidence});
  await rememberCommand(client,idempotencyKey,`BLOCK_${state}`,blockId,blockId);
  return (await client.query(`SELECT * FROM work_blocks WHERE id=$1`,[blockId])).rows[0];
});

const cancelAcceptanceInTransaction = async (client:pg.PoolClient,acceptanceId:string,reason:unknown) => {
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0]; if(!acceptance)throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='CANCELLED')return{id:acceptanceId,state:'CANCELLED'};
  if(acceptance.state==='ACCEPTED')throw new AssuranceError('ASSURANCE_ALREADY_ACCEPTED',409);
  await client.query(`UPDATE work_acceptances SET state='CANCELLED',updated_at=clock_timestamp() WHERE id=$1`,[acceptanceId]);
  await client.query(`UPDATE assurance_reviews SET state='CANCELLED' WHERE acceptance_id=$1 AND state IN ('PENDING','DISPATCHED')`,[acceptanceId]);
  await client.query(`UPDATE agent_execution SET state='CANCELLED',completed_at=clock_timestamp(),next_action='Review cancelado pelo operador.' WHERE id IN (SELECT dispatch_execution_id FROM assurance_reviews WHERE acceptance_id=$1) AND state NOT IN ('SUCCEEDED','CANCELLED')`,[acceptanceId]);
  await client.query(`UPDATE jobs SET status='CANCELLED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id IN (SELECT e.job_id FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id WHERE r.acceptance_id=$1) AND status NOT IN ('COMPLETED','CANCELLED')`,[acceptanceId]);
  await client.query(`UPDATE operations SET status='CANCELLED',completed_at=clock_timestamp() WHERE id IN (SELECT e.operation_id FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id WHERE r.acceptance_id=$1) AND status NOT IN ('SUCCEEDED','CANCELLED')`,[acceptanceId]);
  await client.query(`UPDATE agent_execution SET state='CANCELLED',completed_at=clock_timestamp(),next_action='Cancelado pelo operador.' WHERE id=$1 AND state NOT IN ('SUCCEEDED','CANCELLED')`,[acceptance.execution_id]);
  await client.query(`UPDATE jobs SET status='CANCELLED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1) AND status NOT IN ('COMPLETED','CANCELLED')`,[acceptance.execution_id]);
  await client.query(`UPDATE operations SET status='CANCELLED',completed_at=clock_timestamp() WHERE id=(SELECT operation_id FROM agent_execution WHERE id=$1) AND status NOT IN ('SUCCEEDED','CANCELLED')`,[acceptance.execution_id]);
  await client.query(`UPDATE work_blocks SET state='CANCELLED',updated_at=clock_timestamp() WHERE acceptance_id=$1 AND state NOT IN ('RESOLVED','CANCELLED')`,[acceptanceId]);
  await audit(client,acceptance.project_id,'ASSURANCE_CANCELLED',acceptance.correlation_id,{acceptance_id:acceptanceId,reason:safeEvidence(reason)});return {id:acceptanceId,state:'CANCELLED'};
};

/** Cancellation has precedence over every later review/reconciliation handoff. */
export const cancelAcceptance = async (acceptanceId:string, reason:unknown, idempotencyKey?:string) => withTransaction(async client => {
  const replay=await replayCommand(client,idempotencyKey,'CANCEL_ACCEPTANCE',acceptanceId);
  if(replay)return{id:replay,state:'CANCELLED'};
  const result=await cancelAcceptanceInTransaction(client,acceptanceId,reason);
  await rememberCommand(client,idempotencyKey,'CANCEL_ACCEPTANCE',acceptanceId,result.id);
  return result;
});

export const decideReview = async (reviewId:string, decision:AssuranceDecision, evidence:unknown, idempotencyKey:string) => withTransaction(async client => {
  if(!assuranceDecisions.includes(decision)) throw new AssuranceError('REVIEW_DECISION_INVALID');
  const review=(await client.query(`SELECT r.*,a.project_id,a.execution_id,a.output_reference,a.correlation_id,a.state AS acceptance_state,e.job_id,e.operation_id,e.revision_id,e.job_kind FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id JOIN agent_execution e ON e.id=a.execution_id WHERE r.id=$1 FOR UPDATE`,[reviewId])).rows[0];
  if(!review) throw new AssuranceError('REVIEW_NOT_FOUND',404); if(review.state==='CANCELLED'||review.acceptance_state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  if(review.state!=='DISPATCHED') throw new AssuranceError('REVIEW_NOT_DISPATCHED',409);
  const prior=await client.query(`SELECT * FROM review_decisions WHERE idempotency_key=$1 OR review_id=$2`,[idempotencyKey,reviewId]); if(prior.rowCount) return prior.rows[0];
  const decisionEvidence=validateDecisionEvidence(evidence);
  const result=(await client.query(`INSERT INTO review_decisions(id,review_id,decision,evidence,idempotency_key) VALUES($1,$2,$3,$4,$5) RETURNING *`,[randomUUID(),reviewId,decision,decisionEvidence,idempotencyKey])).rows[0];
  await client.query(`UPDATE assurance_reviews SET state='DECIDED',decided_at=clock_timestamp() WHERE id=$1`,[reviewId]);
  // A human/API decision may arrive before the leased reviewer starts. Close
  // that dormant dispatch; the worker-owned path deliberately keeps its lease
  // until completeJob commits it.
  if(!idempotencyKey.startsWith('reviewer-worker:') && review.dispatch_execution_id) {
    await client.query(`UPDATE agent_execution SET state='SUCCEEDED',completed_at=clock_timestamp(),next_action='Decisão de review registrada.' WHERE id=$1 AND state NOT IN ('SUCCEEDED','CANCELLED')`,[review.dispatch_execution_id]);
    await client.query(`UPDATE jobs SET status='COMPLETED',completed_at=clock_timestamp(),lease_expires_at=NULL WHERE id=(SELECT job_id FROM agent_execution WHERE id=$1) AND status IN ('PENDING','RETRYABLE')`,[review.dispatch_execution_id]);
    await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=(SELECT operation_id FROM agent_execution WHERE id=$1)`,[review.dispatch_execution_id]);
  }
  if(decision==='ACCEPT') {
    const submitted = await readStructuredOutput(client,review.output_reference);
    if (submitted && ['ANALYZE_PRODUCT_NEED','DEFINE_PRODUCT_REQUIREMENTS','REVIEW_PRODUCT_COMMITMENT'].includes(review.job_kind)) {
      await persistDiscoveryAgentOutcome(client,{id:review.job_id,kind:review.job_kind,project_id:review.project_id,operation_id:review.operation_id,revision_id:review.revision_id},submitted,review.output_reference?.artifact_hash);
    }
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
    const ev=decisionEvidence.evidence&&typeof decisionEvidence.evidence==='object'?decisionEvidence.evidence as Record<string,unknown>:decisionEvidence;
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
      if(canonicalFindingId && target.work_item_id) {
        await client.query(`INSERT INTO finding_work_items(finding_id,work_item_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[canonicalFindingId,target.work_item_id]);
        const delivery=(await client.query(`SELECT head_sha FROM deliveries WHERE id=$1 FOR UPDATE`,[target.delivery_id])).rows[0];
        const rework=await registerF3Rework(client,{projectId:review.project_id,findingId:canonicalFindingId,workItemId:target.work_item_id,deliveryId:target.delivery_id,headSha:String(delivery?.head_sha??''),justification:description,correlationId:review.correlation_id});
        if(rework.registered) await client.query(`UPDATE findings SET state='FIXED_PENDING_REVALIDATION' WHERE id=$1 AND state='OPEN'`,[canonicalFindingId]);
        if(!rework.registered) {
          await client.query(`UPDATE work_acceptances SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
          await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'ASSURANCE_REVIEW',sourceId:reviewId,code:rework.reason==='REWORK_LIMIT'?'REWORK_LIMIT_REACHED':'REWORK_TARGET_UNRESOLVED',category:'POLICY',severity:'HIGH',correlationId:review.correlation_id,evidence:{review_id:reviewId,reason:rework.reason}});
        }
      }
    } else {
      const fingerprint=createHash('sha256').update(`${description}:${String(ev.criterion??'')}`).digest('hex');
      const configuration=(await client.query(`SELECT p.configuration FROM work_acceptances a JOIN assurance_policies p ON p.id=a.policy_id AND p.version=a.policy_version WHERE a.id=$1`,[review.acceptance_id])).rows[0]?.configuration??{};
      const rounds=Number((await client.query(`SELECT count(*)::int AS count FROM review_decisions d JOIN assurance_reviews r ON r.id=d.review_id WHERE r.acceptance_id=$1 AND d.decision='REWORK'`,[review.acceptance_id])).rows[0].count);
      const prior=(await client.query(`SELECT d.evidence FROM review_decisions d JOIN assurance_reviews r ON r.id=d.review_id WHERE r.acceptance_id=$1 AND d.decision='REWORK' AND r.id<>$2 ORDER BY r.version DESC LIMIT 1`,[review.acceptance_id,reviewId])).rows[0];
      const priorDetail=prior?.evidence?.evidence&&typeof prior.evidence.evidence==='object'?prior.evidence.evidence:prior?.evidence;
      const progress=typeof ev.progress==='number'?ev.progress:0, priorProgress=prior?(typeof priorDetail?.progress==='number'?priorDetail.progress:0):null;
      const maxRounds=Number.isInteger(configuration.max_rework_rounds)?Number(configuration.max_rework_rounds):2;
      const minimumDelta=typeof configuration.minimum_progress_delta==='number'?configuration.minimum_progress_delta:0;
      const recurring=Boolean((await client.query(`SELECT 1 FROM findings WHERE origin='ASSURANCE_REVIEW' AND target_project_id=$1 AND fingerprint=$2`,[review.project_id,fingerprint])).rowCount);
      const noProgress=priorProgress!==null&&progress-priorProgress<minimumDelta;
      const finding=(await client.query(`INSERT INTO findings(id,project_id,target_project_id,agent_execution_id,work_acceptance_id,review_id,dispatch_id,origin,severity,rule_code,fingerprint,description,category,criterion,evidence,rework_action)
        VALUES($1,$2,$2,$3,$4,$5,$3,'ASSURANCE_REVIEW','HIGH','ASSURANCE_REWORK',$6,$7,$8,$9,$10,$11)
        ON CONFLICT (origin,target_project_id,rule_code,fingerprint) WHERE origin='ASSURANCE_REVIEW' AND target_project_id IS NOT NULL DO UPDATE SET review_id=EXCLUDED.review_id,evidence=EXCLUDED.evidence RETURNING id`,[findingId,review.project_id,review.execution_id,review.acceptance_id,reviewId,fingerprint,description,String(ev.category??'TECHNICAL'),String(ev.criterion??'COMPLETENESS'),decisionEvidence,String(ev.rework_action??'Correct the reviewed output and submit new evidence.')])).rows[0];
      if(rounds>maxRounds||(recurring&&noProgress)) {
        await client.query(`UPDATE work_acceptances SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
        const block=await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'WORK_ACCEPTANCE',sourceId:review.acceptance_id,code:rounds>maxRounds?'REWORK_LIMIT_REACHED':'REWORK_NO_PROGRESS',category:'POLICY',severity:'HIGH',correlationId:review.correlation_id,evidence:{finding_id:finding.id,rounds,max_rounds:maxRounds,progress,minimum_progress_delta:minimumDelta}});
        await client.query(`UPDATE work_blocks SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[block.id]);
      }
    }
    await client.query(`UPDATE jobs SET status='BLOCKED',lease_expires_at=NULL,last_error='ASSURANCE_REWORK_REQUIRED' WHERE id=$1 AND status NOT IN ('COMPLETED','CANCELLED')`,[review.job_id]);
    await client.query(`UPDATE operations SET status='BLOCKED',completed_at=NULL,failure_code='ASSURANCE_REWORK_REQUIRED' WHERE id=$1 AND status NOT IN ('SUCCEEDED','CANCELLED')`,[review.operation_id]);
  }
  else if(decision==='ESCALATE') {
    await client.query(`UPDATE work_acceptances SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
    const block=await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'ASSURANCE_REVIEW',sourceId:reviewId,code:'REVIEW_ESCALATION',category:'POLICY',severity:'HIGH',correlationId:review.correlation_id,evidence:decisionEvidence});
    await client.query(`UPDATE work_blocks SET state='ESCALATED',updated_at=clock_timestamp() WHERE id=$1`,[block.id]);
    await client.query(`UPDATE jobs SET status='BLOCKED',lease_expires_at=NULL,last_error='ASSURANCE_ESCALATED' WHERE id=$1 AND status NOT IN ('COMPLETED','CANCELLED')`,[review.job_id]);
    await client.query(`UPDATE operations SET status='BLOCKED',completed_at=NULL,failure_code='ASSURANCE_ESCALATED' WHERE id=$1 AND status NOT IN ('SUCCEEDED','CANCELLED')`,[review.operation_id]);
  }
  else {
    await client.query(`UPDATE work_acceptances SET state='BLOCKED',updated_at=clock_timestamp() WHERE id=$1`,[review.acceptance_id]);
    await openBlock(client,{projectId:review.project_id,acceptanceId:review.acceptance_id,executionId:review.execution_id,sourceType:'ASSURANCE_REVIEW',sourceId:reviewId,code:'REVIEW_BLOCK',category:'TECHNICAL',severity:'HIGH',correlationId:review.correlation_id,evidence:decisionEvidence});
    await client.query(`UPDATE jobs SET status='BLOCKED',lease_expires_at=NULL,last_error='ASSURANCE_REVIEW_BLOCK' WHERE id=$1 AND status NOT IN ('COMPLETED','CANCELLED')`,[review.job_id]);
    await client.query(`UPDATE operations SET status='BLOCKED',completed_at=NULL,failure_code='ASSURANCE_REVIEW_BLOCK' WHERE id=$1 AND status NOT IN ('SUCCEEDED','CANCELLED')`,[review.operation_id]);
  }
  await audit(client,review.project_id,'ASSURANCE_REVIEW_DECIDED',review.correlation_id,{review_id:reviewId,acceptance_id:review.acceptance_id,decision});
  return result;
});

/** Worker entry point. The reviewer receives only the validated, redacted
 * package and writes its terminal structured decision through decideReview. */
export const executeIndependentReview = async (job: { id:string; project_id:string }) => {
  const review=(await pool.query(`SELECT r.id,r.review_package,r.dispatch_execution_id,a.output_reference FROM assurance_reviews r JOIN agent_execution e ON e.id=r.dispatch_execution_id JOIN work_acceptances a ON a.id=r.acceptance_id WHERE e.job_id=$1 AND r.state='DISPATCHED'`,[job.id])).rows[0];
  if(!review) return false;
  await pool.query(`UPDATE agent_execution SET state='RUNNING',next_action='Reviewer independente em execução.' WHERE id=$1 AND state='SELECTED'`,[review.dispatch_execution_id]);
  const { executeAgent } = await import('./agent.js');
  const structuredOutput=await readStructuredOutput(pool,review.output_reference);
  const outcome=await executeAgent('INDEPENDENT_REVIEW',{project_id:job.project_id,review_package:{...review.review_package,structured_output:structuredOutput}});
  const decision: AssuranceDecision=assuranceDecisions.includes(outcome.result as AssuranceDecision)
    ? outcome.result as AssuranceDecision : outcome.result==='READY_FOR_GATE'?'ACCEPT':'REWORK';
  await decideReview(review.id,decision,{reviewer_result:outcome.result,evidence:outcome.evidence},`reviewer-worker:${review.id}`);
  await pool.query(`UPDATE agent_execution SET state='SUCCEEDED',completed_at=clock_timestamp(),next_action='Decisão do reviewer persistida.' WHERE id=$1`,[review.dispatch_execution_id]);
  return true;
};

export const createAssistanceProposal = async (blockId:string, body:unknown, actorId:string, idempotencyKey?:string) => withTransaction(async client => {
  const block=(await client.query(`SELECT * FROM work_blocks WHERE id=$1 FOR UPDATE`,[blockId])).rows[0]; if(!block)throw new AssuranceError('BLOCK_NOT_FOUND',404);
  if(idempotencyKey) { const replay=await client.query(`SELECT * FROM assistance_proposals WHERE idempotency_key=$1`,[idempotencyKey]); if(replay.rowCount)return replay.rows[0]; }
  const value=safeEvidence(body), alternatives=Array.isArray(value.alternatives)?value.alternatives:[];
  const routingRole=routingRoleForCategory(block.category);
  const completeAlternatives=alternatives.every(item=>item&&typeof item==='object'&&('impact' in item||'impacts' in item)&&('tradeoff' in item||'tradeoffs' in item));
  if(!alternatives.length||!completeAlternatives||typeof value.recommendation!=='object'||typeof value.confidence!=='number'||value.confidence<0||value.confidence>1||(value.routing_role !== undefined && value.routing_role!==routingRole))throw new AssuranceError('ASSISTANCE_PROPOSAL_INVALID');
  const row=(await client.query(`INSERT INTO assistance_proposals(id,block_id,alternatives,recommendation,confidence,routing_role,created_by,human_decision_required,specialist_role,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[randomUUID(),blockId,JSON.stringify(alternatives),JSON.stringify(value.recommendation),value.confidence,routingRole,actorId,value.human_decision_required===true,typeof value.specialist_role==='string'?value.specialist_role:routingRole,idempotencyKey??null])).rows[0];
  await audit(client,block.project_id,'ASSURANCE_ASSISTANCE_PROPOSED',block.correlation_id,{block_id:blockId,proposal_id:row.id,routing_role:value.routing_role}); return row;
});

export const recordHumanGate = async(projectId:string,body:unknown,actorId:string,actorRole?:string,idempotencyKey?:string)=>withTransaction(async client=>{
  const value=safeEvidence(body), type=String(value.gate_type??''), role=String(actorRole??'');
  let contract; try { contract=gateDefinition(type); } catch { throw new AssuranceError('ASSURANCE_GATE_NOT_CATALOGED'); }
  if(!contract.authority_roles.includes(role))throw new AssuranceError('ASSURANCE_GATE_UNAUTHORIZED',403);
  if(idempotencyKey) { const replay=await client.query(`SELECT * FROM assurance_human_gates WHERE idempotency_key=$1`,[idempotencyKey]); if(replay.rowCount)return replay.rows[0]; }
  if(!['APPROVED','REJECTED'].includes(String(value.decision))||typeof value.reason!=='string'||!value.reason.trim()||!value.evidence||!value.scope||typeof value.scope!=='object'||Array.isArray(value.scope)||!classificationOrder.includes(String(value.classification??'INTERNAL')))throw new AssuranceError('ASSURANCE_GATE_INVALID');
  const scope=value.scope as Record<string,unknown>;
  if(scope.project_id!==undefined&&scope.project_id!==projectId)throw new AssuranceError('ASSURANCE_GATE_PROJECT_SCOPE_INVALID',409);
  const block=value.block_id?(await client.query(`SELECT correlation_id,classification FROM work_blocks WHERE id=$1 AND project_id=$2`,[value.block_id,projectId])).rows[0]:null;
  if(value.block_id&&!block)throw new AssuranceError('ASSURANCE_GATE_BLOCK_SCOPE_INVALID',409);
  if(scope.block_id!==undefined&&scope.block_id!==value.block_id)throw new AssuranceError('ASSURANCE_GATE_BLOCK_SCOPE_INVALID',409);
  const scopedAcceptance=typeof scope.acceptance_id==='string'?(await client.query(`SELECT correlation_id,classification FROM work_acceptances WHERE id=$1 AND project_id=$2`,[scope.acceptance_id,projectId])).rows[0]:null;
  if(scope.acceptance_id!==undefined&&!scopedAcceptance)throw new AssuranceError('ASSURANCE_GATE_ACCEPTANCE_SCOPE_INVALID',409);
  if(type==='INDEPENDENCE_EXCEPTION'&&(!value.expires_at||!value.policy_id||!Number.isInteger(value.policy_version)||!Number.isFinite(Date.parse(String(value.expires_at)))||Date.parse(String(value.expires_at))<=Date.now()))throw new AssuranceError('ASSURANCE_GATE_INVALID');
  if(type==='INDEPENDENCE_EXCEPTION'&&!scopedAcceptance)throw new AssuranceError('ASSURANCE_GATE_ACCEPTANCE_SCOPE_INVALID',409);
  const correlationId=value.correlation_id??block?.correlation_id??scopedAcceptance?.correlation_id??randomUUID();
  const classification=maximumClassification(String(value.classification??'INTERNAL'),String(block?.classification??'PUBLIC'),String(scopedAcceptance?.classification??'PUBLIC'));
  const row=(await client.query(`INSERT INTO assurance_human_gates(id,project_id,block_id,gate_type,actor_id,decision,reason,evidence,expires_at,correlation_id,actor_role,scope,policy_id,policy_version,classification,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[randomUUID(),projectId,value.block_id??null,type,actorId,value.decision,value.reason,safeEvidence(value.evidence),value.expires_at??null,correlationId,role,safeEvidence(scope),value.policy_id??null,value.policy_version??null,classification,idempotencyKey??null])).rows[0];
  await audit(client,projectId,'ASSURANCE_HUMAN_GATE_RECORDED',row.correlation_id,{gate_id:row.id,gate_type:type,decision:value.decision});return row;
});

/** A manual reconciliation is deliberately unable to accept work: it can only
 * reproduce the normal PENDING_PRODUCE -> PENDING_REVIEW handoff. */
export const reconcileAcceptance = async (acceptanceId: string, body: unknown, actorId: string, idempotencyKey?:string) => withTransaction(async client => {
  const replay=await replayCommand(client,idempotencyKey,'RECONCILE_ACCEPTANCE',acceptanceId);
  if(replay) {
    const current=(await client.query(`SELECT state FROM work_acceptances WHERE id=$1`,[replay])).rows[0];
    if(!current)throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
    return{id:replay,state:current.state,reconciled:true};
  }
  const value=safeEvidence(body);
  if(typeof value.reason!=='string'||!value.reason.trim()||!value.evidence) throw new AssuranceError('ASSURANCE_RECONCILIATION_EVIDENCE_REQUIRED');
  const acceptance=(await client.query(`SELECT * FROM work_acceptances WHERE id=$1 FOR UPDATE`,[acceptanceId])).rows[0];
  if(!acceptance) throw new AssuranceError('ACCEPTANCE_NOT_FOUND',404);
  if(acceptance.state==='CANCELLED') throw new AssuranceError('ASSURANCE_CANCELLED',409);
  let result=acceptance;
  if(acceptance.state==='REWORK_REQUIRED') {
    if(!value.revalidation||typeof value.revalidation!=='object'||!value.output_reference) throw new AssuranceError('ASSURANCE_REVALIDATION_REQUIRED',409);
    const f3Pending=await client.query(`SELECT 1 FROM findings WHERE work_acceptance_id=$1 AND delivery_id IS NOT NULL AND state<>'CLOSED' LIMIT 1`,[acceptance.id]);
    if(f3Pending.rowCount) throw new AssuranceError('ASSURANCE_F3_QA_REVALIDATION_REQUIRED',409);
    await client.query(`UPDATE findings SET state='CLOSED',resolution='REVALIDATED',resolution_evidence=$2 WHERE work_acceptance_id=$1 AND target_project_id IS NOT NULL AND state<>'CLOSED'`,[acceptance.id,safeEvidence(value.revalidation)]);
    result=await submitOutputForReview(client,acceptance.execution_id,value.output_reference);
  } else if(acceptance.state==='PENDING_PRODUCE') {
    if(!value.output_reference) throw new AssuranceError('ASSURANCE_OUTPUT_REFERENCE_REQUIRED',409);
    result=await submitOutputForReview(client,acceptance.execution_id,value.output_reference);
  }
  await audit(client,acceptance.project_id,'ASSURANCE_MANUAL_RECONCILIATION',acceptance.correlation_id,{acceptance_id:acceptanceId,actor_id:actorId,reason:value.reason,evidence:value.evidence});
  await rememberCommand(client,idempotencyKey,'RECONCILE_ACCEPTANCE',acceptanceId,acceptanceId);
  return {id:acceptanceId,state:result?.state??acceptance.state,reconciled:true};
});

type AssuranceProjectionOptions={correlationId?:string|null;limit?:number;targetType?:'module'|'work_item';targetId?:string|null;actorRole?:string|null};
export const assuranceProjection = async (projectId:string,cursor?:string|null, state?:string|null, category?:string|null, options:AssuranceProjectionOptions={}) => {
  if(cursor!==undefined&&cursor!==null&&!/^\d+$/.test(cursor))throw new AssuranceError('ASSURANCE_CURSOR_INVALID');
  if(state&&!blockStates.includes(state as typeof blockStates[number]))throw new AssuranceError('ASSURANCE_BLOCK_STATE_INVALID');
  if(category&&!blockCategories.includes(category as typeof blockCategories[number]))throw new AssuranceError('ASSURANCE_BLOCK_CATEGORY_INVALID');
  const limit=Math.max(1,Math.min(200,Number.isInteger(options.limit)?Number(options.limit):100));
  let scopedAcceptanceIds:string[]|null=null;
  if(options.targetType&&options.targetId) {
    const scoped=await pool.query(`SELECT DISTINCT a.id FROM work_acceptances a JOIN agent_execution e ON e.id=a.execution_id LEFT JOIN jobs j ON j.id=e.job_id LEFT JOIN deliveries d ON d.id=j.delivery_id LEFT JOIN work_items w ON w.id=d.work_item_id
      WHERE a.project_id=$1 AND (($2='work_item' AND (w.id=$3::uuid OR EXISTS(SELECT 1 FROM findings f LEFT JOIN finding_work_items fw ON fw.finding_id=f.id WHERE f.work_acceptance_id=a.id AND COALESCE(f.target_work_item_id,fw.work_item_id)=$3::uuid)))
        OR ($2='module' AND (w.module_id=$3::uuid OR EXISTS(SELECT 1 FROM findings f LEFT JOIN finding_work_items fw ON fw.finding_id=f.id LEFT JOIN work_items tw ON tw.id=COALESCE(f.target_work_item_id,fw.work_item_id) WHERE f.work_acceptance_id=a.id AND COALESCE(f.target_module_id,tw.module_id)=$3::uuid))))`,[projectId,options.targetType,options.targetId]);
    scopedAcceptanceIds=scoped.rows.map(row=>String(row.id));
  }
  const scopeIds=scopedAcceptanceIds;
  const correlation=options.correlationId??null;
  const [acceptances,blocks,reviews,proposals,gates,findings,timeline,metrics]=await Promise.all([
    pool.query(`SELECT a.id,a.execution_id,a.correlation_id,a.state,a.classification,a.version,e.next_action,a.created_at,a.updated_at FROM work_acceptances a JOIN agent_execution e ON e.id=a.execution_id WHERE a.project_id=$1 AND ($2::uuid IS NULL OR a.correlation_id=$2) AND ($3::uuid[] IS NULL OR a.id=ANY($3)) ORDER BY a.created_at DESC,a.id DESC LIMIT $4`,[projectId,correlation,scopeIds,limit]),
    pool.query(`SELECT id,acceptance_id,source_type,source_id,block_code,category,severity,state,resolution,correlation_id,classification,cycle,previous_block_id,symptoms,attempts,suspected_causes,responsible_role,created_at,updated_at FROM work_blocks WHERE project_id=$1 AND ($2::text IS NULL OR state=$2) AND ($3::text IS NULL OR category=$3) AND ($4::uuid IS NULL OR correlation_id=$4) AND ($5::uuid[] IS NULL OR acceptance_id=ANY($5)) ORDER BY created_at DESC,id DESC LIMIT $6`,[projectId,state??null,category??null,correlation,scopeIds,limit]),
    pool.query(`SELECT r.id,r.acceptance_id,r.version,r.state,r.independence_check,d.decision,d.evidence,r.decided_at,r.created_at FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id LEFT JOIN review_decisions d ON d.review_id=r.id WHERE a.project_id=$1 AND ($2::uuid IS NULL OR a.correlation_id=$2) AND ($3::uuid[] IS NULL OR a.id=ANY($3)) ORDER BY r.created_at DESC,r.id DESC LIMIT $4`,[projectId,correlation,scopeIds,limit]),
    pool.query(`SELECT p.id,p.block_id,p.alternatives,p.recommendation,p.confidence,p.routing_role,p.human_decision_required,p.specialist_role,p.created_at FROM assistance_proposals p JOIN work_blocks b ON b.id=p.block_id WHERE b.project_id=$1 AND ($2::uuid IS NULL OR b.correlation_id=$2) AND ($3::uuid[] IS NULL OR b.acceptance_id=ANY($3)) ORDER BY p.created_at DESC,p.id DESC LIMIT $4`,[projectId,correlation,scopeIds,limit]),
    pool.query(`SELECT id,block_id,gate_type,actor_id,actor_role,decision,reason,evidence,expires_at,correlation_id,classification,created_at FROM assurance_human_gates WHERE project_id=$1 AND ($2::uuid IS NULL OR correlation_id=$2) AND ($3::uuid[] IS NULL OR block_id IN (SELECT id FROM work_blocks WHERE acceptance_id=ANY($3))) ORDER BY created_at DESC,id DESC LIMIT $4`,[projectId,correlation,scopeIds,limit]),
    pool.query(`SELECT f.id,f.delivery_id,f.target_project_id,f.target_module_id,f.target_work_item_id,f.work_acceptance_id,f.review_id,f.origin,f.severity,f.category,f.criterion,f.rule_code,f.fingerprint,f.description,f.rework_action,f.resolution,f.state,f.created_at FROM findings f LEFT JOIN work_acceptances a ON a.id=f.work_acceptance_id WHERE f.project_id=$1 AND f.origin='ASSURANCE_REVIEW' AND ($2::uuid IS NULL OR a.correlation_id=$2) AND ($3::uuid[] IS NULL OR f.work_acceptance_id=ANY($3)) ORDER BY f.created_at DESC,f.id DESC LIMIT $4`,[projectId,correlation,scopeIds,limit]),
    pool.query(`SELECT id,event_type,correlation_id,payload,created_at FROM events WHERE project_id=$1 AND event_type LIKE 'ASSURANCE_%' AND ($2::bigint IS NULL OR id>$2::bigint) AND ($3::uuid IS NULL OR correlation_id=$3) AND ($4::uuid[] IS NULL OR correlation_id IN (SELECT correlation_id FROM work_acceptances WHERE id=ANY($4))) ORDER BY id ASC LIMIT $5`,[projectId,cursor??null,correlation,scopeIds,limit]),
    pool.query(`SELECT
      count(*) FILTER (WHERE a.state='WAITING_FOR_INDEPENDENT_REVIEWER')::int AS reviewer_unavailable,
      count(*) FILTER (WHERE a.state='REWORK_REQUIRED')::int AS rework_required,
      count(*) FILTER (WHERE a.state='BLOCKED')::int AS blocked,
      count(*) FILTER (WHERE a.state='ESCALATED')::int AS escalated,
      count(*) FILTER (WHERE a.state='ACCEPTED')::int AS accepted,
      coalesce((count(*) FILTER (WHERE a.state='REWORK_REQUIRED'))::numeric/nullif(count(*),0),0) AS rework_rate,
      coalesce((count(*) FILTER (WHERE a.state='ESCALATED'))::numeric/nullif(count(*),0),0) AS escalation_rate,
      coalesce(avg(extract(epoch FROM (r.created_at-a.updated_at))) FILTER (WHERE r.created_at>=a.created_at),0)::bigint AS seconds_to_review,
      coalesce(avg(extract(epoch FROM (a.updated_at-a.created_at))) FILTER (WHERE a.state='ACCEPTED'),0)::bigint AS seconds_to_accept,
      (SELECT coalesce(jsonb_object_agg(category,total),'{}'::jsonb) FROM (SELECT category,count(*)::int total FROM work_blocks WHERE project_id=$1 AND ($2::uuid IS NULL OR correlation_id=$2) AND ($3::uuid[] IS NULL OR acceptance_id=ANY($3)) GROUP BY category) categories) AS blocks_by_category,
      (SELECT count(*)::int FROM events e WHERE e.project_id=$1 AND e.event_type IN ('ASSURANCE_FAILURE_BLOCKED','ASSURANCE_REVIEWER_UNAVAILABLE') AND ($2::uuid IS NULL OR e.correlation_id=$2) AND ($3::uuid[] IS NULL OR e.correlation_id IN (SELECT correlation_id FROM work_acceptances WHERE id=ANY($3)))) AS handoff_failures
      FROM work_acceptances a LEFT JOIN LATERAL (SELECT created_at FROM assurance_reviews WHERE acceptance_id=a.id ORDER BY created_at LIMIT 1) r ON true WHERE a.project_id=$1 AND ($2::uuid IS NULL OR a.correlation_id=$2) AND ($3::uuid[] IS NULL OR a.id=ANY($3))`,[projectId,correlation,scopeIds])]);
  const allowedActions=options.actorRole==='ON_CALL_OWNER'?['TRANSITION_BLOCK','CANCEL_ACCEPTANCE','RECONCILE_ACCEPTANCE']:options.actorRole==='ASSURANCE_REVIEWER'?['DECIDE_REVIEW']:['TECH_LEAD','REPOSITORY_OWNER'].includes(String(options.actorRole))?['RECORD_HUMAN_GATE']:[];
  return {version:1,stream_contract:'assurance-sse/v1',scope:{project_id:projectId,target_type:options.targetType??null,target_id:options.targetId??null,correlation_id:correlation},page:{limit,order:'created_at_desc_id_desc'},allowed_actions:allowedActions,acceptances:acceptances.rows,reviews:reviews.rows,blocks:blocks.rows,proposals:proposals.rows,gates:gates.rows,findings:findings.rows,timeline:timeline.rows,metrics:metrics.rows[0],next_cursor:timeline.rows.at(-1)?.id?.toString()??cursor??null};
};
