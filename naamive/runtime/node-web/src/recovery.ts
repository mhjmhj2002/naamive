import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { config } from './config.js';
import { pool, withTransaction } from './db.js';
import { ApiError } from './service.js';
import { assertAuditableCommits, assertIncrementalPaths, discardDeliveryBranch, discardWorktree, gitValue, mergeAndPushDetached, reconcileIntegration, reconcileWorktree } from './git-delivery.js';
import { reconcileWaitingDependencies, scheduleEligibleWorkItems, scheduleWorkItem } from './eligibility-scheduler.js';
import { RecoveryClassifier, RECOVERY_POLICY_VERSION, type RecoveryAction, type RecoveryCause, type RecoverySignals, type WorktreeObservation } from './recovery-policy.js';
import { AUT02_PIPELINE_VERSION, AUT02_V1_PIPELINE_VERSION } from './aut02-ledger.js';
import { reconcileTerminalJobInconsistencies } from './inconsistency-recovery.js';

const classifier=new RecoveryClassifier();
const delays=[5,15,30];
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const arrays=(value:unknown):string[]=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'):[];
const reservationGraceSeconds=()=>Math.max(Number(config().developmentReservationGraceSeconds)||0,1);
type Aut02RecoveryPipeline=typeof AUT02_V1_PIPELINE_VERSION|typeof AUT02_PIPELINE_VERSION;
const aut02RecoveryPipeline=(value:unknown):Aut02RecoveryPipeline=>{
  if(value===AUT02_V1_PIPELINE_VERSION||value===AUT02_PIPELINE_VERSION)return value;
  throw new ApiError(409,'AUT02_PIPELINE_VERSION_UNSUPPORTED');
};
const finalizeRecoveredAut02Candidate=async(row:any,decision:RecoveryExecutionClaim,remoteSha:string,details:Record<string,unknown>)=>{
  const {finalizeAut02IntegratedCandidate}=await import('./automatic-assurance-integration.js');
  await finalizeAut02IntegratedCandidate(row.candidate_id,row.id,remoteSha,'RECOVERY',decision);
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);await transitionClaim(c,decision,'COMPLETED',{...details,collective_finalization:true});});
  await reconcileWaitingDependencies('AUT02_RECOVERY_INTEGRATION_COMPLETED',row.project_id);
  await scheduleEligibleWorkItems('AUT02_RECOVERY_INTEGRATION_COMPLETED');
};

export type PersistedRecoveryDecision={
  id:string;project_id:string;policy_version:typeof RECOVERY_POLICY_VERSION;cause:RecoveryCause;effect_certainty:'NO_EFFECT'|'EFFECT_PRESENT'|'EFFECT_UNKNOWN';evidence_footprint:string[];selected_action:RecoveryAction;reason:string;
  work_item_id:string|null;attempt_id:string|null;job_id:string|null;delivery_id:string|null;worktree_id:string|null;integration_candidate_id:string|null;integration_attempt_id:string|null;
  evidence_refs:string[];finding_refs:string[];source_state:string;source_version:number;classification_key:string;classification_fingerprint:string;idempotency_key:string;operation_id:string;
  predecessor_decision_id:string|null;execution_state:string;execution_attempts:number;execution_result:Record<string,unknown>;created_at:string;executed_at:string|null;
  execution_lease_expires_at:string|null;execution_claim_id:string|null;execution_generation:number;
  assurance_integration_intent_id:string|null;
};

export type RecoveryExecutionClaim=PersistedRecoveryDecision&{
  execution_claim_id:string;execution_generation:number;
};

const observeWorktree=(row:any,workItemId:string)=>{
  let observation:WorktreeObservation='NOT_APPLICABLE',conclusive=true,noEffect=false,commits:string[]=[];
  if(!row?.worktree_id)return {observation:'NOT_APPLICABLE' as WorktreeObservation,conclusive:true,noEffect:true,commits};
  try {
    const result=reconcileWorktree(row.repository_path,row.worktree_path,row.branch,row.base_sha);
    if(result==='DIRTY')return {observation:'DIRTY' as WorktreeObservation,conclusive:true,noEffect:false,commits};
    if(result==='DIVERGED')return {observation:'DIVERGED' as WorktreeObservation,conclusive:true,noEffect:false,commits};
    if(result==='MISSING'){
      const branch=gitValue(row.repository_path,'for-each-ref','--format=%(refname:short)',`refs/heads/${row.branch}`);
      if(!branch)return {observation:'MISSING' as WorktreeObservation,conclusive:true,noEffect:true,commits};
      const head=gitValue(row.repository_path,'rev-parse',row.branch);
      if(head===row.base_sha)return {observation:'MISSING' as WorktreeObservation,conclusive:true,noEffect:true,commits};
      commits=assertAuditableCommits(row.repository_path,row.base_sha,workItemId,row.branch);
      return {observation:'ACTIVE_COMMIT' as WorktreeObservation,conclusive:true,noEffect:false,commits};
    }
    const head=gitValue(row.worktree_path,'rev-parse','HEAD');
    if(head===row.base_sha){observation='ACTIVE_BASE';noEffect=true;}
    else {commits=assertAuditableCommits(row.worktree_path,row.base_sha,workItemId,head);assertIncrementalPaths(row.worktree_path,row.base_sha,row.payload?.allowlist??[],row.payload?.denylist??[]);observation='ACTIVE_COMMIT';}
  } catch { observation='UNAVAILABLE';conclusive=false;noEffect=false; }
  return {observation,conclusive,noEffect,commits};
};

const deriveWorkItemCause=(row:any,observed:RecoveryCause|undefined,worktree:ReturnType<typeof observeWorktree>,evidenceRefs:string[],findingRefs:string[],afterReconcile:boolean):RecoveryCause=>{
  if(!afterReconcile&&observed&&['LEASE_LOST','HANDOFF_CRASH','NO_TERMINAL_CONFIRMATION','DIRTY_WORKTREE','OPERATION_UNRECORDED'].includes(observed))return observed;
  if(findingRefs.length)return 'QA_FINDING_PRESENT';
  if(worktree.commits.length||arrays(row.commits).length||row.head_sha)return 'COMMIT_PRESENT';
  if(evidenceRefs.length)return 'EXECUTION_EVIDENCE_PRESENT';
  if(worktree.observation==='DIRTY')return afterReconcile?'GIT_DIVERGED':'DIRTY_WORKTREE';
  if(worktree.observation==='DIVERGED')return 'GIT_DIVERGED';
  if(!afterReconcile&&observed)return observed;
  if(row.job_status==='PENDING'&&Number(row.job_attempts)===0&&row.available_at&&Date.now()-Date.parse(row.available_at)>config().developmentReservationGraceSeconds*1000)return 'JOB_NOT_CONSUMED';
  if(worktree.observation==='MISSING')return 'WORKTREE_MISSING_NO_EVIDENCE';
  if(['FAILED','COMPLETED'].includes(row.job_status))return 'WORKER_DEAD_NO_OUTPUT';
  if(row.job_status==='LEASED')return afterReconcile?'WORKER_DEAD_NO_OUTPUT':'LEASE_LOST';
  return observed??'DELIVERY_PRESENT';
};

export const collectWorkItemRecoverySignals=async(projectId:string,workItemId:string,observedCause?:RecoveryCause,afterReconcile=false):Promise<RecoverySignals>=>{
  const row=(await pool.query(`SELECT w.id work_item_id,w.state source_state,w.version source_version,w.workflow_code,w.workflow_version,w.payload,
    d.id delivery_id,d.state delivery_state,d.head_sha,d.commits,d.base_sha,d.created_at delivery_created_at,
    t.id worktree_id,t.path worktree_path,t.branch,t.state worktree_state,
    j.id job_id,j.operation_id attempt_id,j.status job_status,j.attempts job_attempts,j.available_at,j.started_at,j.last_error,j.lease_expires_at,
    p.repository_path
    FROM work_items w JOIN projects p ON p.id=w.project_id
    LEFT JOIN LATERAL (SELECT * FROM deliveries WHERE work_item_id=w.id ORDER BY created_at DESC,id DESC LIMIT 1) d ON true
    LEFT JOIN worktrees t ON t.id=d.worktree_id LEFT JOIN jobs j ON j.id=d.job_id
    WHERE w.id=$1 AND w.project_id=$2`,[workItemId,projectId])).rows[0];
  if(!row)throw new ApiError(404,'WORK_ITEM_NOT_FOUND');
  if(row.workflow_code!=='WORK_ITEM_DELIVERY'||Number(row.workflow_version)!==2)throw new ApiError(409,'RECOVERY_POLICY_NOT_APPLICABLE');
  const evidenceRefs=row.attempt_id?(await pool.query(`SELECT id FROM artifacts WHERE project_id=$1 AND execution_id=$2 AND artifact_type IN ('development-execution-evidence','development-retry-reconciliation') ORDER BY created_at,id`,[projectId,row.attempt_id])).rows.map((item:any)=>String(item.id)):[];
  const findingRefs=(await pool.query(`SELECT f.id FROM findings f JOIN finding_work_items fw ON fw.finding_id=f.id WHERE fw.work_item_id=$1 AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION') ORDER BY f.created_at,f.id`,[workItemId])).rows.map((item:any)=>String(item.id));
  const worktree=observeWorktree(row,workItemId);
  const cause=deriveWorkItemCause(row,observedCause,worktree,evidenceRefs,findingRefs,afterReconcile);
  const persistedCommits=arrays(row.commits);const commitRefs=worktree.observation==='ACTIVE_COMMIT'?[...new Set([...persistedCommits,...worktree.commits,row.head_sha].filter(Boolean))]:[];
  const noEvidence=!evidenceRefs.length&&!findingRefs.length&&!commitRefs.length&&!persistedCommits.length&&!row.head_sha;
  const authoritiesConclusive=worktree.conclusive;
  const noEffectVerified=authoritiesConclusive&&worktree.noEffect&&noEvidence&&(
    row.job_status==='PENDING'&&Number(row.job_attempts)===0||['FAILED','COMPLETED','LEASED','RETRYABLE'].includes(row.job_status)
  );
  const retryExhausted=Number(row.job_attempts)>config().agentMaxRetries;
  return {observedCause:retryExhausted&&['TIMEOUT_PRE_EFFECT','QUOTA_LIMIT','RATE_LIMIT','INFRA_TRANSIENT'].includes(cause)?'RETRY_EXHAUSTED':cause,projectId,sourceState:row.source_state,sourceVersion:Number(row.source_version),workItemId,
    attemptId:row.attempt_id??null,jobId:row.job_id??null,deliveryId:row.delivery_id??null,worktreeId:row.worktree_id??null,jobStatus:row.job_status??null,jobAttempts:Number(row.job_attempts??0),deliveryState:row.delivery_state??null,
    deliveryPresent:Boolean(row.delivery_id),executionEvidenceRefs:evidenceRefs,commitRefs,findingRefs,worktreeObservation:worktree.observation,integrationObservation:'NOT_APPLICABLE',requiredAuthoritiesConclusive:authoritiesConclusive,noEffectVerified,retryExhausted};
};

export const collectIntegrationRecoverySignals=async(projectId:string,candidateId:string,observedCause?:RecoveryCause,afterReconcile=false):Promise<RecoverySignals>=>{
  const row=(await pool.query(`SELECT c.*,a.id integration_attempt_id,a.operation_id integration_operation_id,a.integration_before_sha,a.candidate_sha,a.state attempt_state,p.repository_path
    FROM integration_candidates c JOIN projects p ON p.id=c.project_id LEFT JOIN LATERAL (SELECT * FROM integration_attempts WHERE candidate_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) a ON true
    WHERE c.id=$1 AND c.project_id=$2`,[candidateId,projectId])).rows[0];
  if(!row)throw new ApiError(404,'CANDIDATE_NOT_FOUND');
  let observation:'NOT_APPLIED'|'APPLIED_UNRECORDED'|'DIVERGED'|'UNAVAILABLE'|'NOT_APPLICABLE'=row.integration_attempt_id?'UNAVAILABLE':'NOT_APPLICABLE';
  if(row.integration_attempt_id)try{observation=reconcileIntegration(row.repository_path,'integration',row.integration_before_sha,row.candidate_sha);}catch{observation='UNAVAILABLE';}
  let cause=observedCause??(row.blocked_kind==='GIT_DIVERGED'?'GIT_DIVERGED':row.blocked_kind==='VALIDATION_CODE_DEFECT'?'INTEGRATION_DEFECT':'MERGE_TIMEOUT');
  if(afterReconcile){if(observation==='APPLIED_UNRECORDED')cause=observedCause==='PUSH_TIMEOUT'?'PUSH_APPLIED_UNRECORDED':'MERGE_APPLIED_UNRECORDED';else if(observation==='DIVERGED')cause='GIT_DIVERGED';else if(observation==='NOT_APPLIED')cause='INFRA_TRANSIENT';}
  return {observedCause:cause,projectId,sourceState:row.state,sourceVersion:Number(row.version),attemptId:row.integration_operation_id??null,integrationCandidateId:candidateId,integrationAttemptId:row.integration_attempt_id??null,
    integrationObservation:observation,worktreeObservation:'NOT_APPLICABLE',requiredAuthoritiesConclusive:observation!=='UNAVAILABLE',noEffectVerified:observation==='NOT_APPLIED'};
};

const collectAut02MergeRecoverySignals=async(intentId:string,afterReconcile=false):Promise<RecoverySignals>=>{
  const row=(await pool.query(`SELECT i.project_id,i.work_item_id,i.execution_generation,mr.id AS merge_result_id,mr.phase_before_sha,mr.delivery_head_sha,w.state,w.version,dc.delivery_id,dc.worktree_id,p.repository_path
    FROM assurance_integration_intents i JOIN work_item_merge_results mr ON mr.intent_id=i.id JOIN work_item_delivery_candidates dc ON dc.id=mr.delivery_candidate_id
    JOIN work_items w ON w.id=i.work_item_id JOIN projects p ON p.id=i.project_id WHERE i.id=$1`,[intentId])).rows[0];
  if(!row)throw new ApiError(409,'AUT02_MERGE_RECOVERY_CONTEXT_NOT_FOUND');
  let observation:'NOT_APPLIED'|'APPLIED_UNRECORDED'|'DIVERGED'|'UNAVAILABLE'=afterReconcile?'UNAVAILABLE':'UNAVAILABLE';
  if(afterReconcile)try{
    const current=gitValue(row.repository_path,'rev-parse','phases/3'),parents=gitValue(row.repository_path,'show','-s','--format=%P',current).split(/\s+/).filter(Boolean);
    observation=current===row.phase_before_sha?'NOT_APPLIED':parents.length===2&&parents[0]===row.phase_before_sha&&parents[1]===row.delivery_head_sha?'APPLIED_UNRECORDED':'DIVERGED';
  }catch{observation='UNAVAILABLE';}
  const observedCause:RecoveryCause=!afterReconcile?'MERGE_TIMEOUT':observation==='NOT_APPLIED'?'INFRA_TRANSIENT':observation==='APPLIED_UNRECORDED'?'MERGE_APPLIED_UNRECORDED':observation==='DIVERGED'?'GIT_DIVERGED':'MERGE_TIMEOUT';
  return{observedCause,projectId:row.project_id,sourceState:row.state,sourceVersion:Number(row.version),workItemId:row.work_item_id,deliveryId:row.delivery_id,worktreeId:row.worktree_id,recoveryScopeKey:`${intentId}:${row.execution_generation}`,
    integrationObservation:observation,worktreeObservation:'NOT_APPLICABLE',requiredAuthoritiesConclusive:observation!=='UNAVAILABLE',noEffectVerified:observation==='NOT_APPLIED'};
};

const persistDecisionInTransaction=async(c:PoolClient,signals:RecoverySignals,idempotencyKey:string,predecessorDecisionId?:string|null):Promise<PersistedRecoveryDecision>=>{
  const classification=classifier.classify(signals);
  const resource=signals.workItemId??signals.integrationCandidateId!;
  const classificationKey=hash(`${classification.policyVersion}|${signals.projectId}|${resource}|${signals.sourceState}|${signals.sourceVersion}|${classification.classificationFingerprint}`);
  const scopedIdempotencyKey=hash(`${signals.projectId}|${resource}|${idempotencyKey}`);
  await c.query(`SELECT pg_advisory_xact_lock(hashtext($1))`,[`recovery:${classificationKey}`]);
  const existing=(await c.query(`SELECT * FROM recovery_decisions WHERE classification_key=$1 OR idempotency_key=$2 ORDER BY created_at LIMIT 1`,[classificationKey,scopedIdempotencyKey])).rows[0];
  if(existing)return existing;
  const id=randomUUID(),operationId=randomUUID(),correlation=randomUUID(),operationKey=`recovery-operation:${classificationKey}`;
  await c.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,$3,'QUEUED',$4,$5)`,[operationId,signals.projectId,`RECOVERY_${classification.selectedAction}`,operationKey,correlation]);
  const inserted=(await c.query(`INSERT INTO recovery_decisions(id,project_id,policy_version,cause,effect_certainty,evidence_footprint,selected_action,reason,
      work_item_id,attempt_id,job_id,delivery_id,worktree_id,integration_candidate_id,integration_attempt_id,evidence_refs,finding_refs,source_state,source_version,
      classification_key,classification_fingerprint,idempotency_key,operation_id,predecessor_decision_id)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19,$20,$21,$22,$23,$24) RETURNING *`,[
      id,signals.projectId,classification.policyVersion,classification.cause,classification.effectCertainty,JSON.stringify(classification.evidenceFootprint),classification.selectedAction,classification.reason,
      signals.workItemId??null,signals.attemptId??null,signals.jobId??null,signals.deliveryId??null,signals.worktreeId??null,signals.integrationCandidateId??null,signals.integrationAttemptId??null,
      JSON.stringify([...(signals.executionEvidenceRefs??[]),...(signals.commitRefs??[])]),JSON.stringify(signals.findingRefs??[]),signals.sourceState,signals.sourceVersion,classificationKey,classification.classificationFingerprint,scopedIdempotencyKey,operationId,predecessorDecisionId??null
  ])).rows[0];
  await c.query(`UPDATE operations SET recovery_decision_id=$2 WHERE id=$1`,[operationId,id]);
  await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,payload,actor_id) VALUES($1,'RECOVERY_DECISION_RECORDED',$2,$3,$4,$5)`,[signals.projectId,correlation,operationId,{recovery_decision_id:id,policy_version:classification.policyVersion,cause:classification.cause,effect_certainty:classification.effectCertainty,evidence_footprint:classification.evidenceFootprint,selected_action:classification.selectedAction,reason:classification.reason,work_item_id:signals.workItemId??null,integration_candidate_id:signals.integrationCandidateId??null},config().operatorId]);
  return inserted;
};

const persistDecision=async(signals:RecoverySignals,idempotencyKey:string,predecessorDecisionId?:string|null):Promise<PersistedRecoveryDecision>=>withTransaction(c=>persistDecisionInTransaction(c,signals,idempotencyKey,predecessorDecisionId));

const assertExecutionClaim=async(c:PoolClient,claim:RecoveryExecutionClaim)=>{
  const current=(await c.query(`SELECT * FROM recovery_decisions
    WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3
      AND execution_state='EXECUTING' AND execution_lease_expires_at>clock_timestamp()
    FOR UPDATE`,[claim.id,claim.execution_claim_id,claim.execution_generation])).rows[0];
  if(!current)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
  return current as RecoveryExecutionClaim;
};

const assertCompletedClaim=async(claim:RecoveryExecutionClaim)=>{
  const current=(await pool.query(`SELECT 1 FROM recovery_decisions
    WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='COMPLETED'`,[claim.id,claim.execution_claim_id,claim.execution_generation])).rows[0];
  if(!current)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
};

const transitionClaim=async(c:PoolClient,claim:RecoveryExecutionClaim,state:string,result:Record<string,unknown>={})=>{
  const decision=await assertExecutionClaim(c,claim);
  const changed=await c.query(`UPDATE recovery_decisions
    SET execution_state=$4,execution_lease_expires_at=NULL,
      execution_result=execution_result||$5::jsonb,
      executed_at=CASE WHEN $4 IN ('COMPLETED','SUPERSEDED','FAILED') THEN clock_timestamp() ELSE executed_at END
    WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='EXECUTING'`,
    [claim.id,claim.execution_claim_id,claim.execution_generation,state,JSON.stringify(result)]);
  if(changed.rowCount!==1)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
  if(['COMPLETED','SUPERSEDED'].includes(state))await c.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=$1`,[decision.operation_id]);
  return decision;
};

export const markClaimedRecoveryDecision=async(claim:RecoveryExecutionClaim,state:string,result:Record<string,unknown>={})=>withTransaction(c=>transitionClaim(c,claim,state,result));

const withClaimedExternalEffect=async<T>(claim:RecoveryExecutionClaim,effect:()=>T):Promise<T>=>withTransaction(async c=>{
  await assertExecutionClaim(c,claim);
  return effect();
});

const supersedeWithDecision=async(claim:RecoveryExecutionClaim,signals:RecoverySignals,idempotencyKey:string,result:Record<string,unknown>={})=>withTransaction(async c=>{
  await assertExecutionClaim(c,claim);
  const next=await persistDecisionInTransaction(c,signals,idempotencyKey,claim.id);
  if(claim.assurance_integration_intent_id)await c.query(`UPDATE recovery_decisions SET assurance_integration_intent_id=$2 WHERE id=$1`,[next.id,claim.assurance_integration_intent_id]);
  await transitionClaim(c,claim,'SUPERSEDED',{...result,converged_to:next.id});
  return next;
});

export const claimRecoveryDecision=async(id:string):Promise<RecoveryExecutionClaim|null>=>withTransaction(async c=>{
  const row=(await c.query(`SELECT *,execution_lease_expires_at>clock_timestamp() AS execution_lease_is_live FROM recovery_decisions WHERE id=$1 FOR UPDATE`,[id])).rows[0];if(!row)throw new ApiError(404,'RECOVERY_DECISION_NOT_FOUND');
  if(['COMPLETED','SUPERSEDED'].includes(row.execution_state))return null;
  if(row.execution_state==='EXECUTING'&&row.execution_lease_is_live)return null;
  const claimId=randomUUID();
  const claimed=(await c.query(`UPDATE recovery_decisions
    SET execution_state='EXECUTING',execution_attempts=execution_attempts+1,
      execution_claim_id=$2,execution_generation=execution_generation+1,
      execution_lease_expires_at=clock_timestamp()+($3*interval '1 second')
    WHERE id=$1 RETURNING *`,[id,claimId,reservationGraceSeconds()])).rows[0] as RecoveryExecutionClaim;
  await c.query(`UPDATE operations SET status='RUNNING' WHERE id=$1`,[row.operation_id]);return claimed;
});

const scheduleAfterRelease=async(decision:RecoveryExecutionClaim,baseSha?:string|null)=>{
  if(!decision.work_item_id)return;
  await assertCompletedClaim(decision);
  await scheduleWorkItem(decision.project_id,decision.work_item_id,`RECOVERY_${decision.selected_action}`,undefined,{recoveryDecisionId:decision.id,baseSha:baseSha??undefined,originDeliveryId:decision.delivery_id??undefined,originOperationId:decision.attempt_id??undefined});
  await assertCompletedClaim(decision);
  await scheduleEligibleWorkItems('RECOVERY_CAPACITY_RELEASED');
};

const executeRetry=async(decision:RecoveryExecutionClaim)=>{
  if(decision.assurance_integration_intent_id){
    if(decision.effect_certainty!=='NO_EFFECT')throw new ApiError(409,'RECOVERY_RETRY_EFFECT_NOT_ABSENT');
    await withTransaction(async c=>{await assertExecutionClaim(c,decision);const intent=(await c.query(`SELECT * FROM assurance_integration_intents WHERE id=$1 FOR UPDATE`,[decision.assurance_integration_intent_id])).rows[0];if(!intent)throw new ApiError(409,'AUT02_MERGE_RECOVERY_CONTEXT_NOT_FOUND');await c.query(`UPDATE work_item_merge_results SET state='NOT_APPLIED' WHERE intent_id=$1 AND state='EFFECT_UNKNOWN'`,[intent.id]);await c.query(`UPDATE assurance_integration_intents SET status='PENDING',effect_state='NO_EFFECT',available_at=clock_timestamp(),lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,recovery_decision_id=$2,last_error=NULL,updated_at=clock_timestamp(),completed_at=NULL WHERE id=$1`,[intent.id,decision.id]);await transitionClaim(c,decision,'COMPLETED',{merge_retry_reemitted:true,intent_id:intent.id,reconciled_before_retry:true});});return;
  }
  if(decision.integration_candidate_id)return executeIntegrationRetry(decision);
  const delay=delays[Math.min(Math.max(Number((await pool.query(`SELECT attempts FROM jobs WHERE id=$1`,[decision.job_id])).rows[0]?.attempts??1)-1,0),2)];
  await withTransaction(async c=>{
    await assertExecutionClaim(c,decision);
    const current=(await c.query(`SELECT rd.execution_state,j.status,j.attempts,w.version FROM recovery_decisions rd JOIN jobs j ON j.id=rd.job_id JOIN work_items w ON w.id=rd.work_item_id WHERE rd.id=$1 FOR UPDATE OF rd,j,w`,[decision.id])).rows[0];
    if(!current||current.execution_state==='COMPLETED')return;
    if(decision.effect_certainty!=='NO_EFFECT'||Number(current.attempts)>config().agentMaxRetries)throw new ApiError(409,'RECOVERY_RETRY_GUARD_CHANGED');
    await c.query(`UPDATE jobs SET status='RETRYABLE',lease_expires_at=NULL,completed_at=NULL,available_at=clock_timestamp()+($2||' seconds')::interval WHERE id=$1`,[decision.job_id,String(delay)]);
    await c.query(`UPDATE operations SET status='QUEUED',failure_code=NULL,completed_at=NULL WHERE id=$1`,[decision.attempt_id]);
    await c.query(`UPDATE deliveries SET state='RESERVED' WHERE id=$1`,[decision.delivery_id]);await c.query(`UPDATE worktrees SET state='PREPARED',lease_expires_at=clock_timestamp()+interval '10 minutes' WHERE id=$1`,[decision.worktree_id]);
    await c.query(`UPDATE work_items SET state='DISPATCHED',version=version+1 WHERE id=$1`,[decision.work_item_id]);
    await transitionClaim(c,decision,'COMPLETED',{retry_in_seconds:delay,reused_job_id:decision.job_id,reused_delivery_id:decision.delivery_id});
  });
};

const terminalizeAttempt=async(decision:RecoveryExecutionClaim)=>withTransaction(async c=>{
  await assertExecutionClaim(c,decision);
  if(decision.job_id)await c.query(`UPDATE jobs SET status='FAILED',completed_at=coalesce(completed_at,clock_timestamp()),lease_expires_at=NULL,last_error=coalesce(last_error,$2) WHERE id=$1 AND status<>'COMPLETED'`,[decision.job_id,decision.cause]);
  if(decision.attempt_id)await c.query(`UPDATE operations SET status='FAILED',failure_code=coalesce(failure_code,$2),completed_at=coalesce(completed_at,clock_timestamp()) WHERE id=$1`,[decision.attempt_id,decision.cause]);
  if(decision.delivery_id)await c.query(`UPDATE deliveries SET state='FAILED' WHERE id=$1 AND state NOT IN ('QA_REJECTED','QA_APPROVED','EVIDENCE_REVIEW')`,[decision.delivery_id]);
  if(decision.worktree_id)await c.query(`UPDATE worktrees SET state='RELEASED',lease_expires_at=NULL WHERE id=$1 AND state IN ('RESERVED','PREPARED','ACTIVE','BLOCKED')`,[decision.worktree_id]);
  if(decision.work_item_id)await c.query(`UPDATE work_items SET state='RECOVERY_REQUIRED',version=version+1 WHERE id=$1`,[decision.work_item_id]);
});

const cleanupNoEffectWorktree=async(decision:RecoveryExecutionClaim)=>{
  if(!decision.worktree_id)return;
  const row=(await pool.query(`SELECT t.path,t.branch,p.repository_path FROM worktrees t JOIN projects p ON p.id=t.project_id WHERE t.id=$1`,[decision.worktree_id])).rows[0];if(!row)return;
  try{await withClaimedExternalEffect(decision,()=>{discardWorktree(row.repository_path,row.path);discardDeliveryBranch(row.repository_path,row.branch);});}catch(error){
    if(error instanceof ApiError&&error.code==='RECOVERY_EXECUTION_FENCED')throw error;
    const signals=await collectWorkItemRecoverySignals(decision.project_id,decision.work_item_id!,'OPERATION_UNRECORDED');
    const next=await supersedeWithDecision(decision,signals,`recovery-convergence:${decision.id}:cleanup`,{cleanup:'INCONCLUSIVE'});await executeRecoveryDecision(next.id);throw error;
  }
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);await c.query(`UPDATE worktrees SET state='REMOVED',lease_expires_at=NULL WHERE id=$1`,[decision.worktree_id]);});
};

const executeRestart=async(decision:RecoveryExecutionClaim)=>{
  if(decision.effect_certainty!=='NO_EFFECT')throw new ApiError(409,'RECOVERY_RESTART_EFFECT_NOT_ABSENT');
  await terminalizeAttempt(decision);await cleanupNoEffectWorktree(decision);
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);await c.query(`UPDATE work_items SET state='ELIGIBLE_FOR_DISPATCH',version=version+1 WHERE id=$1 AND state='RECOVERY_REQUIRED'`,[decision.work_item_id]);await transitionClaim(c,decision,'COMPLETED',{attempt_restarted:true,previous_attempt_id:decision.attempt_id});});
  await scheduleAfterRelease(decision);
};

const executeResume=async(decision:RecoveryExecutionClaim)=>{
  const signals=await collectWorkItemRecoverySignals(decision.project_id,decision.work_item_id!,undefined,true);
  const classified=classifier.classify(signals);
  if(classified.selectedAction!=='RESUME'){
    const next=await supersedeWithDecision(decision,signals,`recovery-convergence:${decision.id}:${signals.sourceVersion}`);return executeRecoveryDecision(next.id);
  }
  const head=(signals.commitRefs??[]).at(-1)??null;
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);if(decision.job_id)await c.query(`UPDATE jobs SET status='COMPLETED',completed_at=coalesce(completed_at,clock_timestamp()),lease_expires_at=NULL WHERE id=$1`,[decision.job_id]);if(decision.attempt_id)await c.query(`UPDATE operations SET status='SUCCEEDED',completed_at=coalesce(completed_at,clock_timestamp()) WHERE id=$1`,[decision.attempt_id]);if(decision.delivery_id)await c.query(`UPDATE deliveries SET state='EVIDENCE_REVIEW',head_sha=coalesce(head_sha,$2),commits=CASE WHEN commits='[]'::jsonb AND $3::jsonb<>'[]'::jsonb THEN $3::jsonb ELSE commits END WHERE id=$1`,[decision.delivery_id,head,JSON.stringify(signals.commitRefs??[])]);if(decision.worktree_id)await c.query(`UPDATE worktrees SET state='ACTIVE' WHERE id=$1`,[decision.worktree_id]);await c.query(`UPDATE work_items SET state='QA_IN_PROGRESS',version=version+1 WHERE id=$1`,[decision.work_item_id]);await transitionClaim(c,decision,'COMPLETED',{resumed_at:'QA_IN_PROGRESS',preserved_evidence_refs:decision.evidence_refs});});
};

const executeRework=async(decision:RecoveryExecutionClaim)=>{
  const head=(decision.evidence_refs??[]).find(value=>/^[0-9a-f]{40}$/i.test(value))??(await pool.query(`SELECT head_sha FROM deliveries WHERE id=$1`,[decision.delivery_id])).rows[0]?.head_sha;
  if(!head)throw new ApiError(409,'RECOVERY_REWORK_COMMIT_REQUIRED');
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);if(decision.worktree_id)await c.query(`UPDATE worktrees SET state='RELEASED',lease_expires_at=NULL WHERE id=$1`,[decision.worktree_id]);await c.query(`UPDATE work_items SET state='ELIGIBLE_FOR_DISPATCH',rework_rounds=rework_rounds+1,version=version+1 WHERE id=$1`,[decision.work_item_id]);await transitionClaim(c,decision,'COMPLETED',{rework_base_sha:head,finding_refs:decision.finding_refs});});
  await scheduleAfterRelease(decision,head);
};

const executeReconcile=async(decision:RecoveryExecutionClaim)=>{
  const signals=decision.assurance_integration_intent_id?await collectAut02MergeRecoverySignals(decision.assurance_integration_intent_id,true):decision.work_item_id?await collectWorkItemRecoverySignals(decision.project_id,decision.work_item_id,decision.cause,true):await collectIntegrationRecoverySignals(decision.project_id,decision.integration_candidate_id!,decision.cause,true);
  const classified=classifier.classify(signals);
  if(classified.selectedAction==='RECONCILE'&&classified.effectCertainty==='EFFECT_UNKNOWN'){
    await markClaimedRecoveryDecision(decision,'WAITING_RECONCILIATION',{last_observation:'INCONCLUSIVE',observed_at:new Date().toISOString()});return;
  }
  const next=await supersedeWithDecision(decision,signals,`recovery-convergence:${decision.id}:${classified.classificationFingerprint}`,{effect_certainty:classified.effectCertainty,selected_action:classified.selectedAction});
  await executeRecoveryDecision(next.id);
};

const executeRecordAndContinue=async(decision:RecoveryExecutionClaim)=>{
  if(decision.assurance_integration_intent_id){const {recordAut02MergeAfterRecovery}=await import('./automatic-assurance-integration.js');const mergeSha=await recordAut02MergeAfterRecovery(decision.assurance_integration_intent_id,decision);await withTransaction(async c=>{await assertExecutionClaim(c,decision);await transitionClaim(c,decision,'COMPLETED',{recorded_phase_sha:mergeSha,reapplied:false,merge_recorded:true});});return;}
  const row=(await pool.query(`SELECT a.id,a.candidate_id,c.pipeline_version,p.repository_path FROM integration_attempts a JOIN integration_candidates c ON c.id=a.candidate_id JOIN projects p ON p.id=a.project_id WHERE a.id=$1`,[decision.integration_attempt_id])).rows[0];if(!row)throw new ApiError(409,'INTEGRATION_ATTEMPT_NOT_FOUND');
  const remote=await withClaimedExternalEffect(decision,()=>gitValue(row.repository_path,'rev-parse','origin/integration'));
  switch(aut02RecoveryPipeline(row.pipeline_version)){
    case AUT02_V1_PIPELINE_VERSION:
    case AUT02_PIPELINE_VERSION:
      await finalizeRecoveredAut02Candidate(row,decision,remote,{recorded_remote_sha:remote,reapplied:false});
      return;
  }
};

const executeIntegrationRecovery=async(decision:RecoveryExecutionClaim)=>withTransaction(async c=>{
  await assertExecutionClaim(c,decision);
  if(decision.assurance_integration_intent_id){await c.query(`UPDATE work_item_merge_results SET state='DIVERGED' WHERE intent_id=$1`,[decision.assurance_integration_intent_id]);await c.query(`UPDATE assurance_integration_intents SET status='SUPERSEDED',recovery_decision_id=$2,updated_at=clock_timestamp(),completed_at=clock_timestamp() WHERE id=$1`,[decision.assurance_integration_intent_id,decision.id]);}
  if(decision.integration_candidate_id)await c.query(`UPDATE integration_candidates SET state='INTEGRATION_BLOCKED',blocked_kind='GIT_DIVERGED',version=version+1 WHERE id=$1`,[decision.integration_candidate_id]);
  if(decision.work_item_id)await c.query(`UPDATE work_items SET state='WAITING_FOR_ESCALATION',version=version+1 WHERE id=$1`,[decision.work_item_id]);
  if(decision.integration_candidate_id&&decision.attempt_id)await c.query(`UPDATE operations SET status='FAILED',failure_code=$2,completed_at=coalesce(completed_at,clock_timestamp()) WHERE id=$1`,[decision.attempt_id,decision.cause]);
  await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,payload,actor_id) VALUES($1,'RECOVERY_WAITING_FOR_ESCALATION',$2,$3,$4,$5)`,[decision.project_id,randomUUID(),decision.operation_id,{recovery_decision_id:decision.id,cause:decision.cause,reason:decision.reason,continuation:'INTEGRATION_RECOVERY',required_authority:'TECH_LEAD_OR_REPOSITORY_OWNER'},config().operatorId]);await transitionClaim(c,decision,'COMPLETED',{continuation:'INTEGRATION_RECOVERY',required_authority:'TECH_LEAD_OR_REPOSITORY_OWNER',automatic_retry:false});
});

const executeIntegrationRetry=async(decision:RecoveryExecutionClaim)=>{
  if(decision.effect_certainty!=='NO_EFFECT')throw new ApiError(409,'RECOVERY_RETRY_EFFECT_NOT_ABSENT');
  const row=(await pool.query(`SELECT a.*,c.phase_sha,c.pipeline_version,p.repository_path FROM integration_attempts a JOIN integration_candidates c ON c.id=a.candidate_id JOIN projects p ON p.id=a.project_id WHERE a.id=$1`,[decision.integration_attempt_id])).rows[0];if(!row)throw new ApiError(409,'INTEGRATION_ATTEMPT_NOT_FOUND');
  const pipeline=aut02RecoveryPipeline(row.pipeline_version);
  await withTransaction(async c=>{await assertExecutionClaim(c,decision);await c.query(`UPDATE integration_attempts SET state='RESERVED' WHERE id=$1`,[row.id]);await c.query(`UPDATE integration_candidates SET state='INTEGRATION_IN_PROGRESS',blocked_kind=NULL,version=version+1 WHERE id=$1`,[decision.integration_candidate_id]);});
  try{
    let result:any;
    switch(pipeline){
      case AUT02_V1_PIPELINE_VERSION:
      case AUT02_PIPELINE_VERSION: {
        const {retryAut02IntegrationAfterRecoveryReconciliation}=await import('./automatic-assurance-integration.js');
        result=await retryAut02IntegrationAfterRecoveryReconciliation(row,decision);
        if(!result){await withTransaction(async c=>{await assertExecutionClaim(c,decision);await transitionClaim(c,decision,'COMPLETED',{reconciled_before_retry:true,retry_suppressed:'STALE_OR_BLOCKED'});});return;}
        await finalizeRecoveredAut02Candidate(row,decision,result.mergeSha,{merge_sha:result.mergeSha,reconciled_before_retry:true});
        return;
      }
    }
  }
  catch(error){if(error instanceof ApiError&&['RECOVERY_EXECUTION_FENCED','AUT02_PIPELINE_VERSION_UNSUPPORTED'].includes(error.code))throw error;const signals=await collectIntegrationRecoverySignals(decision.project_id,decision.integration_candidate_id!,'MERGE_TIMEOUT');const next=await supersedeWithDecision(decision,signals,`recovery-uncertain:${decision.id}`,{uncertain_external_result:true});await executeRecoveryDecision(next.id);}
};

export const executeClaimedRecoveryDecision=async(decision:RecoveryExecutionClaim)=>{
  const id=decision.id;
  try{
    const current=decision.work_item_id?(await pool.query(`SELECT state,version FROM work_items WHERE id=$1`,[decision.work_item_id])).rows[0]:(await pool.query(`SELECT state,version FROM integration_candidates WHERE id=$1`,[decision.integration_candidate_id])).rows[0];
    if(!current)throw new ApiError(409,'RECOVERY_RESOURCE_NOT_FOUND');
    if(current.state!==decision.source_state||Number(current.version)!==Number(decision.source_version)){
      const signals=decision.work_item_id?await collectWorkItemRecoverySignals(decision.project_id,decision.work_item_id,undefined,true):await collectIntegrationRecoverySignals(decision.project_id,decision.integration_candidate_id!,undefined,true);
      const next=await supersedeWithDecision(decision,signals,`recovery-state-changed:${decision.id}:${signals.sourceVersion}`,{guard_revalidated:false});await executeRecoveryDecision(next.id);
      return (await pool.query(`SELECT * FROM recovery_decisions WHERE id=$1`,[id])).rows[0] as PersistedRecoveryDecision;
    }
    if(decision.selected_action==='RETRY')await executeRetry(decision);
    else if(decision.selected_action==='RESTART')await executeRestart(decision);
    else if(decision.selected_action==='RESUME')await executeResume(decision);
    else if(decision.selected_action==='RECONCILE')await executeReconcile(decision);
    else if(decision.selected_action==='REWORK')await executeRework(decision);
    else if(decision.selected_action==='RECORD_AND_CONTINUE')await executeRecordAndContinue(decision);
    else await executeIntegrationRecovery(decision);
  }catch(error){await pool.query(`UPDATE recovery_decisions SET execution_state='FAILED',execution_lease_expires_at=NULL,execution_result=execution_result||$4::jsonb
    WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='EXECUTING' AND execution_lease_expires_at>clock_timestamp()`,[id,decision.execution_claim_id,decision.execution_generation,JSON.stringify({error_code:error instanceof ApiError?error.code:'RECOVERY_EXECUTION_FAILED'})]);throw error;}
  return (await pool.query(`SELECT * FROM recovery_decisions WHERE id=$1`,[id])).rows[0] as PersistedRecoveryDecision;
};

export const executeRecoveryDecision=async(id:string)=>{
  const decision=await claimRecoveryDecision(id);if(!decision)return (await pool.query(`SELECT * FROM recovery_decisions WHERE id=$1`,[id])).rows[0] as PersistedRecoveryDecision;
  return executeClaimedRecoveryDecision(decision);
};

export const requestWorkItemRecovery=async(projectId:string,workItemId:string,idempotencyKey:string,observedCause?:RecoveryCause)=>{
  if(observedCause){const replay=(await pool.query(`SELECT rd.id FROM recovery_decisions rd LEFT JOIN deliveries d ON d.recovery_decision_id=rd.id LEFT JOIN jobs j ON j.id=d.job_id WHERE rd.work_item_id=$1 AND rd.cause=$2 AND (rd.execution_state IN ('PENDING','EXECUTING') OR rd.execution_state='COMPLETED' AND j.status='PENDING' AND j.attempts=0 AND j.available_at>clock_timestamp()-($3*interval '1 second')) ORDER BY rd.created_at DESC,rd.id DESC LIMIT 1`,[workItemId,observedCause,reservationGraceSeconds()])).rows[0];if(replay)return recoveryDecisionProjection(replay.id);}
  const signals=await collectWorkItemRecoverySignals(projectId,workItemId,observedCause);if(!observedCause&&signals.observedCause==='DELIVERY_PRESENT'&&signals.sourceState!=='RECOVERY_REQUIRED')throw new ApiError(409,'RECOVERY_NOT_REQUIRED');
  const decision=await persistDecision(signals,idempotencyKey);await executeRecoveryDecision(decision.id);return recoveryDecisionProjection(decision.id);
};
export const requestAut02MergeRecovery=async(projectId:string,workItemId:string,intentId:string,idempotencyKey:string)=>{
  const signals=await collectAut02MergeRecoverySignals(intentId,false);if(signals.projectId!==projectId||signals.workItemId!==workItemId)throw new ApiError(409,'AUT02_MERGE_RECOVERY_LINEAGE_MISMATCH');
  const decision=await persistDecision(signals,idempotencyKey);
  await withTransaction(async c=>{await c.query(`UPDATE recovery_decisions SET assurance_integration_intent_id=$2 WHERE id=$1`,[decision.id,intentId]);await c.query(`UPDATE assurance_integration_intents SET recovery_decision_id=$2 WHERE id=$1`,[intentId,decision.id]);});
  await executeRecoveryDecision(decision.id);return recoveryDecisionProjection(decision.id);
};
export const createWorkItemRecoveryDecision=async(projectId:string,workItemId:string,idempotencyKey:string,observedCause?:RecoveryCause)=>persistDecision(await collectWorkItemRecoverySignals(projectId,workItemId,observedCause),idempotencyKey);
export const createIntegrationRecoveryDecision=async(projectId:string,candidateId:string,idempotencyKey:string,observedCause?:RecoveryCause)=>persistDecision(await collectIntegrationRecoverySignals(projectId,candidateId,observedCause),idempotencyKey);
export const requestIntegrationRecovery=async(projectId:string,candidateId:string,idempotencyKey:string,observedCause?:RecoveryCause)=>{
  const decision=await persistDecision(await collectIntegrationRecoverySignals(projectId,candidateId,observedCause),idempotencyKey);await executeRecoveryDecision(decision.id);return recoveryDecisionProjection(decision.id);
};

export const recoverDevelopmentFailure=async(job:any,error:unknown,step:string)=>{
  const raw=String((error as any)?.code??(error as any)?.message??'');
  const beforeEffect=!['dispatch_development_agent','persist_result'].includes(step);
  const cause:RecoveryCause=/quota/i.test(raw)?'QUOTA_LIMIT':/rate.?limit/i.test(raw)?'RATE_LIMIT':/timeout|ETIMEDOUT|AGENT_TIMEOUT/i.test(raw)&&beforeEffect?'TIMEOUT_PRE_EFFECT':beforeEffect?'INFRA_TRANSIENT':'NO_TERMINAL_CONFIRMATION';
  const row=(await pool.query(`SELECT work_item_id FROM deliveries WHERE id=$1`,[job.delivery_id])).rows[0];if(!row)throw new ApiError(409,'DELIVERY_NOT_FOUND');
  return requestWorkItemRecovery(job.project_id,row.work_item_id,`worker-recovery:${job.id}:${job.attempts}`,cause);
};

export const reconcileCauseAwareRecovery=async()=>{
  const terminalJobs=await reconcileTerminalJobInconsistencies();
  const pending=(await pool.query(`SELECT id FROM recovery_decisions WHERE execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION') ORDER BY created_at,id LIMIT 100`)).rows;
  for(const row of pending)try{await executeRecoveryDecision(row.id);}catch{}
  const stuckWork=(await pool.query(`SELECT DISTINCT w.project_id,w.id,j.status,j.attempts,j.lease_expires_at FROM work_items w JOIN deliveries d ON d.work_item_id=w.id JOIN jobs j ON j.id=d.job_id WHERE w.workflow_code='WORK_ITEM_DELIVERY' AND w.workflow_version=2 AND (w.state='RECOVERY_REQUIRED' OR j.status='PENDING' AND j.available_at<clock_timestamp()-($1*interval '1 second') OR j.status='LEASED' AND j.lease_expires_at<clock_timestamp()) LIMIT 100`,[config().developmentReservationGraceSeconds])).rows;
  for(const row of stuckWork)try{await requestWorkItemRecovery(row.project_id,row.id,`reconciler:${row.id}:${row.status}:${Number(row.attempts)}:${row.lease_expires_at??'none'}`,row.status==='PENDING'?'JOB_NOT_CONSUMED':row.status==='LEASED'?'LEASE_LOST':undefined);}catch{}
  const stuckIntegration=(await pool.query(`SELECT c.project_id,c.id,c.version,c.state,c.blocked_kind FROM integration_candidates c LEFT JOIN LATERAL (SELECT created_at FROM integration_attempts WHERE candidate_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) a ON true WHERE c.state='INTEGRATION_BLOCKED' AND c.blocked_kind IN ('GIT_RECOVERABLE','GIT_DIVERGED') OR c.state='INTEGRATION_IN_PROGRESS' AND a.created_at<clock_timestamp()-($1*interval '1 second') LIMIT 100`,[reservationGraceSeconds()])).rows;
  for(const row of stuckIntegration)try{await requestIntegrationRecovery(row.project_id,row.id,`integration-reconciler:${row.id}:${row.version}`,row.blocked_kind==='GIT_DIVERGED'?'GIT_DIVERGED':row.state==='INTEGRATION_BLOCKED'?'MERGE_TIMEOUT':'HANDOFF_CRASH');}catch{}
  return {replayed:pending.length,work_items:stuckWork.length,integration_candidates:stuckIntegration.length,terminal_jobs:terminalJobs};
};

export const recoveryDecisionProjection=async(id:string)=>{
  const row=(await pool.query(`SELECT id,policy_version,cause,effect_certainty,evidence_footprint,selected_action,reason,work_item_id,attempt_id,job_id,delivery_id,worktree_id,integration_candidate_id,integration_attempt_id,assurance_integration_intent_id,evidence_refs,finding_refs,source_state,source_version,operation_id,predecessor_decision_id,execution_state,execution_result,created_at,executed_at FROM recovery_decisions WHERE id=$1`,[id])).rows[0];if(!row)throw new ApiError(404,'RECOVERY_DECISION_NOT_FOUND');return row;
};
