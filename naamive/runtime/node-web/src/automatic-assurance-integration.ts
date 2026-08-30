import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, normalize } from 'node:path';
import type { PoolClient } from 'pg';
import { pool, withTransaction } from './db.js';
import { config } from './config.js';
import { putArtifact } from './artifacts.js';
import { ApiError } from './service.js';
import { assertAuditableCommits, gitValue, mergeAndPushDetached, mergeWorkItem, reconcileIntegration } from './git-delivery.js';
import { createAcceptance, openBlock, submitOutputForReview } from './assurance.js';
import { reconcileWaitingDependencies, scheduleEligibleWorkItems, scheduleWorkItem } from './eligibility-scheduler.js';
import { requestAut02MergeRecovery, requestIntegrationRecovery, requestWorkItemRecovery } from './recovery.js';
import { AUT02_PIPELINE_VERSION, AUT02_POLICY_VERSION, enqueueAut02Intent, type Aut02IntentKind } from './aut02-ledger.js';
import { reserveAssuranceDispatch } from './assurance-expansion.js';

export const DELIVERY_QA_POLICY_VERSION='DELIVERY_QA_POLICY:v1';
export const CANDIDATE_VALIDATION_POLICY_VERSION='INTEGRATION_CANDIDATE_VALIDATION:v1';
export const REQUIRED_WORK_ITEM_SET_POLICY_VERSION='RequiredWorkItemSet:v1';
const leaseSeconds=120;
const intentBackoffs=[5,15,30];
const maxIntentAttempts=()=>Math.max(Number(config().agentMaxRetries)||0,0)+1;

export const canonicalJson=(value:unknown):string=>{
  const normalizeValue=(item:any):any=>Array.isArray(item)?item.map(normalizeValue):item&&typeof item==='object'
    ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,normalizeValue(item[key])])):item;
  return JSON.stringify(normalizeValue(value));
};
export const deterministicHash=(value:unknown)=>createHash('sha256').update(typeof value==='string'?value:canonicalJson(value)).digest('hex');
const array=(value:unknown):any[]=>Array.isArray(value)?value:[];
const canonicalWorkItemIdentity=(value:unknown)=>typeof value==='string'&&/^[a-z][a-z0-9_-]{0,99}$/.test(value)?value:null;
const canonicalIdentitySet=(values:unknown[]):string[]|null=>{
  const identities=values.map(canonicalWorkItemIdentity);
  if(!identities.length||identities.some(identity=>identity===null))return null;
  const sorted=(identities as string[]).sort();
  return sorted.some((identity,index)=>index>0&&identity===sorted[index-1])?null:sorted;
};
export const deriveRequiredWorkItemSet=(planRevision:any):string[]|null=>canonicalIdentitySet(array(planRevision?.payload?.work_items).map(item=>item?.work_item_id));
export const deriveObservedRequiredWorkItemSet=(members:any[]):string[]|null=>canonicalIdentitySet(array(members).map(member=>member?.plan_work_item_id));
export const requiredWorkItemSetMatches=(expected:readonly string[]|null,observed:readonly string[]|null)=>{
  const canonicalExpected=expected?canonicalIdentitySet([...expected]):null,canonicalObserved=observed?canonicalIdentitySet([...observed]):null;
  return Boolean(canonicalExpected&&canonicalObserved&&canonicalExpected.length===canonicalObserved.length&&canonicalExpected.every((identity,index)=>identity===canonicalObserved[index]));
};
export const requiredWorkItemSetFingerprint=(scope:{module_plan_revision_id:string;module_revision_id:string;module_round_id:string},members:readonly string[])=>deterministicHash({policy_version:REQUIRED_WORK_ITEM_SET_POLICY_VERSION,module_plan_revision_id:scope.module_plan_revision_id,module_revision_id:scope.module_revision_id,module_round_id:scope.module_round_id,members});
const shaList=(value:string)=>value.split(/\s+/).map(item=>item.trim()).filter(Boolean);
const redact=(value:unknown)=>String(value??'').replace(/(?:token|password|secret|api[_-]?key)\s*[=:]\s*\S+/gi,'$1=[REDACTED]').slice(0,32768);
const event=async(client:PoolClient,projectId:string,type:string,correlationId:string,payload:Record<string,unknown>,operationId?:string|null)=>
  (await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,$2,$3,$4,$5,'system:aut02','WORK_ITEM_DELIVERY',2) RETURNING id`,[projectId,type,correlationId,operationId??null,payload])).rows[0]?.id as number;
const operation=async(client:PoolClient,projectId:string,kind:string,key:string,correlationId:string,status='SUCCEEDED')=>{
  const id=randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(idempotency_key) DO NOTHING`,[id,projectId,kind,status,key,correlationId]);
  return (await client.query(`SELECT id FROM operations WHERE idempotency_key=$1`,[key])).rows[0].id as string;
};
const artifact=async(client:PoolClient,projectId:string,type:string,value:unknown,executionId:string)=>putArtifact(client,projectId,type,canonicalJson(value),executionId);

export const freezeWorkItemDeliveryCandidate=async(client:PoolClient,input:{deliveryId:string;headSha:string;sourceOperationId:string;correlationId:string;sourceEventId?:number|null})=>{
  const row=(await client.query(`SELECT d.*,w.module_id,w.round_id,w.payload,w.workflow_code,w.workflow_version,w.technology_baseline_revision_id,w.module_plan_revision_id AS plan_revision_id,w.plan_work_item_id,
      m.current_revision_id,t.branch,j.id AS authoritative_job_id,p.repository_path,
      q.id AS qa_matrix_id,q.payload AS qa_matrix_payload,q.hash AS persisted_qa_matrix_hash
    FROM deliveries d JOIN work_items w ON w.id=d.work_item_id JOIN modules m ON m.id=w.module_id
    JOIN worktrees t ON t.id=d.worktree_id LEFT JOIN jobs j ON j.id=d.job_id
    LEFT JOIN qa_matrices q ON q.delivery_id=d.id
    JOIN projects p ON p.id=d.project_id WHERE d.id=$1 FOR UPDATE OF d,w,m,t`,[input.deliveryId])).rows[0];
  if(!row||row.workflow_code!=='WORK_ITEM_DELIVERY'||Number(row.workflow_version)!==2)return null;
  if(row.current_revision_id!==row.revision_id)throw new ApiError(409,'AUT02_STALE_DELIVERY');
  // WORK_ITEM_DELIVERY:v2 rows materialized before AUT-02 have no frozen plan
  // lineage. They remain on their historical path and are never retrofitted.
  if(!row.plan_revision_id||!row.plan_work_item_id)return null;
  const existing=(await client.query(`SELECT * FROM work_item_delivery_candidates WHERE delivery_id=$1 AND head_sha=$2 AND pipeline_version=$3`,[input.deliveryId,input.headSha,AUT02_PIPELINE_VERSION])).rows[0];
  if(existing)return existing;
  const commits=assertAuditableCommits(row.path??(await client.query(`SELECT path FROM worktrees WHERE id=$1`,[row.worktree_id])).rows[0].path,row.base_sha,row.work_item_id,input.headSha);
  const repositoryPath=(await client.query(`SELECT repository_path FROM projects WHERE id=$1`,[row.project_id])).rows[0].repository_path;
  const changedPaths=shaList(gitValue(repositoryPath,'diff','--name-only',row.base_sha,input.headSha)).sort();
  const patch=gitValue(repositoryPath,'diff','--binary',row.base_sha,input.headSha);
  const matrix=row.qa_matrix_payload??row.qa_matrix;
  const qaMatrixHash=row.persisted_qa_matrix_hash??deterministicHash(matrix);
  const criteria=array(row.payload?.acceptance_criteria);
  const workItemRevisionId=deterministicHash({contract:'work-item-revision:v1',module_plan_revision_id:row.plan_revision_id,plan_work_item_id:row.plan_work_item_id,work_item_id:row.work_item_id,payload:row.payload});
  const evidenceRefs=(await client.query(`SELECT 'artifact:'||id::text AS ref FROM artifacts WHERE project_id=$1 AND execution_id=$2 ORDER BY created_at,id`,[row.project_id,input.sourceOperationId])).rows.map((item:any)=>item.ref);
  const frozen={pipeline_version:AUT02_PIPELINE_VERSION,policy_version:AUT02_POLICY_VERSION,project_id:row.project_id,module_id:row.module_id,module_revision_id:row.revision_id,module_round_id:row.round_id,module_plan_revision_id:row.plan_revision_id,plan_work_item_id:row.plan_work_item_id,work_item_id:row.work_item_id,work_item_revision_id:workItemRevisionId,delivery_id:row.id,job_id:row.authoritative_job_id,worktree_id:row.worktree_id,base_sha:row.base_sha,head_sha:input.headSha,branch_ref:row.branch,changed_paths_hash:deterministicHash(changedPaths),patch_hash:deterministicHash(patch),commits,output_evidence_refs:evidenceRefs,producer_identity:{kind:'DEVELOPMENT_WORKER',job_id:row.authoritative_job_id,build_id:config().buildId},qa_matrix_id:row.qa_matrix_id??null,qa_matrix:matrix,qa_matrix_hash:qaMatrixHash,acceptance_criteria:criteria,acceptance_criteria_hash:deterministicHash(criteria),source_operation_id:input.sourceOperationId,source_event_id:input.sourceEventId??null,correlation_id:input.correlationId,lineage:{technology_baseline_revision_id:row.technology_baseline_revision_id??null,origin_delivery_id:row.origin_delivery_id??null,recovery_decision_id:row.recovery_decision_id??null}};
  const id=randomUUID(),snapshotHash=deterministicHash(frozen),key=`delivery-candidate:v1:${row.id}:${input.headSha}`;
  await client.query(`INSERT INTO work_item_delivery_candidates(id,pipeline_version,policy_version,project_id,module_id,module_revision_id,module_round_id,module_plan_revision_id,plan_work_item_id,work_item_id,work_item_revision_id,delivery_id,job_id,worktree_id,base_sha,head_sha,branch_ref,changed_paths_hash,patch_hash,commits,output_evidence_refs,producer_identity,qa_matrix_id,qa_matrix,qa_matrix_hash,acceptance_criteria,acceptance_criteria_hash,source_operation_id,source_event_id,correlation_id,idempotency_key,snapshot_hash,lineage)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22::jsonb,$23,$24::jsonb,$25,$26::jsonb,$27,$28,$29,$30,$31,$32,$33::jsonb)`,[id,AUT02_PIPELINE_VERSION,AUT02_POLICY_VERSION,row.project_id,row.module_id,row.revision_id,row.round_id,row.plan_revision_id,row.plan_work_item_id,row.work_item_id,workItemRevisionId,row.id,row.authoritative_job_id,row.worktree_id,row.base_sha,input.headSha,row.branch,deterministicHash(changedPaths),deterministicHash(patch),JSON.stringify(commits),JSON.stringify(evidenceRefs),JSON.stringify(frozen.producer_identity),row.qa_matrix_id??null,JSON.stringify(matrix),qaMatrixHash,JSON.stringify(criteria),deterministicHash(criteria),input.sourceOperationId,input.sourceEventId??null,input.correlationId,key,snapshotHash,JSON.stringify(frozen.lineage)]);
  await enqueueAut02Intent(client,{projectId:row.project_id,kind:'RUN_DELIVERY_QA',idempotencyKey:`qa:v1:${id}`,correlationId:input.correlationId,deliveryCandidateId:id,workItemId:row.work_item_id,moduleId:row.module_id,moduleRevisionId:row.revision_id,moduleRoundId:row.round_id,evidenceRefs:[`delivery_candidate:${id}`]});
  await event(client,row.project_id,'WORK_ITEM_DELIVERY_CANDIDATE_FROZEN',input.correlationId,{delivery_candidate_id:id,delivery_id:row.id,work_item_id:row.work_item_id,snapshot_hash:snapshotHash,qa_matrix_hash:qaMatrixHash},input.sourceOperationId);
  return (await client.query(`SELECT * FROM work_item_delivery_candidates WHERE id=$1`,[id])).rows[0];
};

const claimIntents=async(limit:number,owner:string)=>withTransaction(async client=>{
  const rows=(await client.query(`SELECT id FROM assurance_integration_intents WHERE
    ((status='PENDING' OR (status='FAILED' AND effect_state='NO_EFFECT' AND attempts<$2)) AND available_at<=clock_timestamp()) OR (status='LEASED' AND effect_state='NO_EFFECT' AND lease_expires_at<clock_timestamp())
    ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT $1`,[limit,maxIntentAttempts()])).rows;
  const claims:any[]=[];
  for(const row of rows){const token=randomUUID();const claimed=(await client.query(`UPDATE assurance_integration_intents SET status='LEASED',attempts=attempts+1,lease_owner=$2,lease_token=$3,lease_expires_at=clock_timestamp()+($4*interval '1 second'),execution_generation=execution_generation+1,updated_at=clock_timestamp(),completed_at=NULL WHERE id=$1 RETURNING *`,[row.id,owner,token,leaseSeconds])).rows[0];claims.push(claimed);}
  return claims;
});
const lockIntent=async(client:PoolClient,intent:any)=>{
  const row=(await client.query(`SELECT * FROM assurance_integration_intents WHERE id=$1 AND status='LEASED' AND lease_token=$2 AND execution_generation=$3 AND lease_expires_at>clock_timestamp() FOR UPDATE`,[intent.id,intent.lease_token,intent.execution_generation])).rows[0];
  if(!row)throw new ApiError(409,'AUT02_EXECUTION_FENCED');return row;
};
const completeIntent=(client:PoolClient,intent:any,status:'COMPLETED'|'SUPERSEDED',operationId?:string|null)=>client.query(`UPDATE assurance_integration_intents SET status=$4,effect_state=CASE WHEN effect_state='PRE_EFFECT' THEN 'EFFECT_RECORDED' ELSE effect_state END,operation_id=coalesce($5,operation_id),lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp(),completed_at=clock_timestamp() WHERE id=$1 AND lease_token=$2 AND execution_generation=$3`,[intent.id,intent.lease_token,intent.execution_generation,status,operationId??null]);

const matrixEntries=(matrix:any)=>Array.isArray(matrix)?matrix:Array.isArray(matrix?.entries)?matrix.entries:[];
export const validateQaEntry=(entry:any)=>{
  if(!entry||typeof entry.command!=='string'||!entry.command.trim()||typeof entry.cwd!=='string'||entry.cwd.startsWith('/')||normalize(entry.cwd).split('/').includes('..')||!Number.isInteger(entry.timeout_seconds)||entry.timeout_seconds<1||entry.timeout_seconds>3600)throw new ApiError(422,'AUT02_QA_MATRIX_INVALID');
  return {command:entry.command.trim(),cwd:normalize(entry.cwd),timeout_seconds:entry.timeout_seconds};
};
export const validateQaSnapshotContract=(candidate:any,persistedQaMatrixHash?:string|null)=>{
  const entries=matrixEntries(candidate.qa_matrix).map(validateQaEntry);
  if(!entries.length)throw new ApiError(422,'AUT02_QA_MATRIX_INVALID');
  if(persistedQaMatrixHash!==undefined){if(!persistedQaMatrixHash||persistedQaMatrixHash!==candidate.qa_matrix_hash)throw new ApiError(409,'AUT02_QA_MATRIX_TAMPERED');}
  else if(deterministicHash(candidate.qa_matrix)!==candidate.qa_matrix_hash)throw new ApiError(409,'AUT02_QA_MATRIX_TAMPERED');
  if(deterministicHash(array(candidate.acceptance_criteria))!==candidate.acceptance_criteria_hash)throw new ApiError(409,'AUT02_ACCEPTANCE_CRITERIA_TAMPERED');
  if(!array(candidate.output_evidence_refs).length)throw new ApiError(409,'AUT02_OUTPUT_EVIDENCE_MISSING');
  const frozen={pipeline_version:candidate.pipeline_version,policy_version:candidate.policy_version,project_id:candidate.project_id,module_id:candidate.module_id,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,module_plan_revision_id:candidate.module_plan_revision_id,plan_work_item_id:candidate.plan_work_item_id,work_item_id:candidate.work_item_id,work_item_revision_id:candidate.work_item_revision_id,delivery_id:candidate.delivery_id,job_id:candidate.job_id,worktree_id:candidate.worktree_id,base_sha:candidate.base_sha,head_sha:candidate.head_sha,branch_ref:candidate.branch_ref,changed_paths_hash:candidate.changed_paths_hash,patch_hash:candidate.patch_hash,commits:candidate.commits,output_evidence_refs:candidate.output_evidence_refs,producer_identity:candidate.producer_identity,qa_matrix_id:candidate.qa_matrix_id??null,qa_matrix:candidate.qa_matrix,qa_matrix_hash:candidate.qa_matrix_hash,acceptance_criteria:candidate.acceptance_criteria,acceptance_criteria_hash:candidate.acceptance_criteria_hash,source_operation_id:candidate.source_operation_id,source_event_id:candidate.source_event_id??null,correlation_id:candidate.correlation_id,lineage:candidate.lineage};
  if(deterministicHash(frozen)!==candidate.snapshot_hash)throw new ApiError(409,'AUT02_SNAPSHOT_TAMPERED');
  return entries;
};
const executeQa=async(intent:any)=>{
  const candidate=(await pool.query(`SELECT dc.*,p.repository_path,w.state AS work_item_state,w.rework_rounds,m.current_revision_id,t.branch FROM work_item_delivery_candidates dc JOIN projects p ON p.id=dc.project_id JOIN work_items w ON w.id=dc.work_item_id JOIN modules m ON m.id=dc.module_id JOIN worktrees t ON t.id=dc.worktree_id WHERE dc.id=$1`,[intent.delivery_candidate_id])).rows[0];
  if(!candidate)return withTransaction(client=>completeIntent(client,intent,'SUPERSEDED'));
  if(candidate.current_revision_id!==candidate.module_revision_id||candidate.state!=='ACTIVE'||candidate.work_item_state==='CANCELLED')return withTransaction(async client=>{await lockIntent(client,intent);await client.query(`UPDATE work_item_delivery_candidates SET state='SUPERSEDED' WHERE id=$1 AND state='ACTIVE'`,[candidate.id]);await completeIntent(client,intent,'SUPERSEDED');});
  if((await pool.query(`SELECT 1 FROM delivery_qa_reports WHERE delivery_candidate_id=$1`,[candidate.id])).rowCount)return withTransaction(async client=>{await lockIntent(client,intent);await completeIntent(client,intent,'COMPLETED');});
  const persistedMatrixHash=candidate.qa_matrix_id?(await pool.query(`SELECT hash FROM qa_matrices WHERE id=$1`,[candidate.qa_matrix_id])).rows[0]?.hash:undefined;
  let entries:any[]=[],contractFailure:string|null=null;
  try{entries=validateQaSnapshotContract(candidate,persistedMatrixHash);}catch(error:any){if(error instanceof ApiError&&['AUT02_QA_MATRIX_INVALID','AUT02_QA_MATRIX_TAMPERED','AUT02_ACCEPTANCE_CRITERIA_TAMPERED','AUT02_OUTPUT_EVIDENCE_MISSING','AUT02_SNAPSHOT_TAMPERED'].includes(error.message))contractFailure=error.message;else throw error;}
  const results:any[]=contractFailure?[{index:0,command_hash:deterministicHash(contractFailure),cwd:'.',timeout_seconds:0,exit_code:1,signal:null,timed_out:false,duration_ms:0,stdout:'',stderr:contractFailure,result:'FAIL',failure_code:contractFailure}]:[];
  if(!contractFailure){const tree=mkdtempSync(join(tmpdir(),'naamive-aut02-qa-'));
    try{
      execFileSync('git',['-C',candidate.repository_path,'worktree','add','--detach',tree,candidate.head_sha],{stdio:'pipe'});
      if(gitValue(tree,'rev-parse','HEAD')!==candidate.head_sha)throw new ApiError(409,'AUT02_SNAPSHOT_TAMPERED');
      for(let index=0;index<entries.length;index++){
        const entry=entries[index],started=Date.now();let exitCode=0,signal:null|string=null,stdout='',stderr='',timedOut=false;
        try{stdout=execFileSync('sh',['-lc',entry.command],{cwd:join(tree,entry.cwd),encoding:'utf8',timeout:entry.timeout_seconds*1000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});}
        catch(error:any){exitCode=Number.isInteger(error?.status)?Number(error.status):1;signal=typeof error?.signal==='string'?error.signal:null;stdout=String(error?.stdout??'');stderr=String(error?.stderr??error?.message??'');timedOut=Boolean(error?.killed||signal==='SIGTERM');}
        results.push({index,command_hash:deterministicHash(entry.command),cwd:entry.cwd,timeout_seconds:entry.timeout_seconds,exit_code:exitCode,signal,timed_out:timedOut,duration_ms:Date.now()-started,stdout:redact(stdout),stderr:redact(stderr),result:exitCode===0&&!timedOut?'PASS':'FAIL'});
      }
    }finally{try{execFileSync('git',['-C',candidate.repository_path,'worktree','remove','--force',tree],{stdio:'ignore'});}catch{}rmSync(tree,{recursive:true,force:true});}}
  const passed=results.every(item=>item.result==='PASS');
  return withTransaction(async client=>{
    await lockIntent(client,intent);
    const report={schema_version:'QAReport:v1',delivery_candidate_id:candidate.id,head_sha:candidate.head_sha,qa_matrix_hash:candidate.qa_matrix_hash,policy_version:DELIVERY_QA_POLICY_VERSION,executor_version:config().buildId,environment_version:process.version,results};
    const reportHash=deterministicHash(report),op=await operation(client,candidate.project_id,'RUN_DELIVERY_QA',`qa-operation:v1:${candidate.id}`,candidate.correlation_id),evidence=await artifact(client,candidate.project_id,'aut02-delivery-qa-report',report,op),reportId=randomUUID();
    await client.query(`INSERT INTO delivery_qa_reports(id,project_id,delivery_candidate_id,policy_version,executor_version,environment_version,head_sha,qa_matrix_hash,result,report,report_hash,evidence_refs) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb) ON CONFLICT(delivery_candidate_id) DO NOTHING`,[reportId,candidate.project_id,candidate.id,DELIVERY_QA_POLICY_VERSION,config().buildId,process.version,candidate.head_sha,candidate.qa_matrix_hash,passed?'PASS':'FAIL',report,reportHash,JSON.stringify([`artifact:${evidence.id}`])]);
    let qaOutcome=passed?'DELIVERY_QA_ACCEPTED':'DELIVERY_QA_REWORK_REQUIRED';
    if(passed){await client.query(`UPDATE deliveries SET state='QA_APPROVED' WHERE id=$1`,[candidate.delivery_id]);await client.query(`UPDATE rework_decisions SET status='RESOLVED',resolved_at=clock_timestamp() WHERE work_item_id=$1 AND revision_id=$2 AND status='ACTIVE'`,[candidate.work_item_id,candidate.module_revision_id]);await client.query(`UPDATE findings SET state='CLOSED',revalidation_delivery_id=$2 WHERE state='FIXED_PENDING_REVALIDATION' AND id IN (SELECT finding_id FROM finding_work_items WHERE work_item_id=$1)`,[candidate.work_item_id,candidate.delivery_id]);await client.query(`UPDATE work_items SET state='INDEPENDENT_REVIEW',version=version+1 WHERE id=$1 AND state='QA_IN_PROGRESS'`,[candidate.work_item_id]);await enqueueAut02Intent(client,{projectId:candidate.project_id,kind:'START_INDEPENDENT_REVIEW',idempotencyKey:`review-start:v1:${candidate.id}`,correlationId:candidate.correlation_id,deliveryCandidateId:candidate.id,workItemId:candidate.work_item_id,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id,evidenceRefs:[`delivery_qa_report:${reportId}`]});}
    else{
      const failed=results.filter(item=>item.result==='FAIL'),fingerprint=deterministicHash({candidate:candidate.id,failed:failed.map(item=>({command_hash:item.command_hash,exit_code:item.exit_code,timed_out:item.timed_out}))}),findingId=randomUUID();
      await client.query(`INSERT INTO findings(id,project_id,delivery_id,origin,severity,state,rule_code,fingerprint,description,evidence) VALUES($1,$2,$3,'DELIVERY_QA','HIGH','OPEN','AUT02_DELIVERY_QA_FAILED',$4,$5,$6) ON CONFLICT(origin,delivery_id,rule_code,fingerprint) WHERE delivery_id IS NOT NULL DO NOTHING`,[findingId,candidate.project_id,candidate.delivery_id,fingerprint,'Deterministic delivery QA failed',{delivery_candidate_id:candidate.id,qa_report_id:reportId,report_hash:reportHash}]);
      const canonicalFinding=(await client.query(`SELECT id FROM findings WHERE delivery_id=$1 AND origin='DELIVERY_QA' AND rule_code='AUT02_DELIVERY_QA_FAILED' AND fingerprint=$2`,[candidate.delivery_id,fingerprint])).rows[0];
      await client.query(`INSERT INTO finding_work_items(finding_id,work_item_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,[canonicalFinding.id,candidate.work_item_id]);
      const active=(await client.query(`SELECT id FROM rework_decisions WHERE work_item_id=$1 AND revision_id=$2 AND status='ACTIVE'`,[candidate.work_item_id,candidate.module_revision_id])).rows[0],nextRound=Number(candidate.rework_rounds)+1,withinLimit=nextRound<=2;
      if(withinLimit&&!active)await client.query(`INSERT INTO rework_decisions(id,project_id,work_item_id,revision_id,delivery_id,head_sha,finding_ids,justification,rework_round,status) VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6::jsonb,'AUT-02 deterministic QA failure',$7,'ACTIVE')`,[candidate.project_id,candidate.work_item_id,candidate.module_revision_id,candidate.delivery_id,candidate.head_sha,JSON.stringify([canonicalFinding.id]),nextRound]);
      await client.query(`UPDATE deliveries SET state='QA_REJECTED' WHERE id=$1`,[candidate.delivery_id]);await client.query(`UPDATE worktrees SET state='RELEASED',lease_expires_at=NULL WHERE id=$1`,[candidate.worktree_id]);await client.query(`UPDATE work_items SET state=$2,rework_rounds=greatest(rework_rounds,$3),version=version+1 WHERE id=$1`,[candidate.work_item_id,withinLimit?'REWORK_REQUIRED':'WAITING_FOR_ESCALATION',nextRound]);
      if(withinLimit)await enqueueAut02Intent(client,{projectId:candidate.project_id,kind:'SCHEDULE_REWORK',idempotencyKey:`schedule-rework:v1:${candidate.id}:qa`,correlationId:candidate.correlation_id,deliveryCandidateId:candidate.id,workItemId:candidate.work_item_id,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id,evidenceRefs:[`finding:${canonicalFinding.id}`,`delivery_qa_report:${reportId}`]});else qaOutcome='DELIVERY_QA_ESCALATION_REQUIRED';
    }
    await event(client,candidate.project_id,qaOutcome,candidate.correlation_id,{delivery_candidate_id:candidate.id,work_item_id:candidate.work_item_id,qa_report_id:reportId,report_hash:reportHash,result:passed?'PASS':'FAIL'},op);
    await completeIntent(client,intent,'COMPLETED',op);return{passed,reportId};
  });
};

const executeReviewHandoff=async(intent:any)=>withTransaction(async client=>{
  await lockIntent(client,intent);
  const candidate=(await client.query(`SELECT dc.*,w.state AS work_item_state,m.current_revision_id,qr.id AS qa_report_id,qr.result AS qa_result,qr.report_hash,j.operation_id AS producer_operation_id
    FROM work_item_delivery_candidates dc JOIN work_items w ON w.id=dc.work_item_id JOIN modules m ON m.id=dc.module_id
    JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id LEFT JOIN jobs j ON j.id=dc.job_id
    WHERE dc.id=$1 FOR UPDATE OF w,m`,[intent.delivery_candidate_id])).rows[0];
  if(!candidate||candidate.state!=='ACTIVE'||candidate.current_revision_id!==candidate.module_revision_id||candidate.work_item_state==='CANCELLED'){
    if(candidate?.id)await client.query(`UPDATE work_item_delivery_candidates SET state='SUPERSEDED' WHERE id=$1 AND state='ACTIVE'`,[candidate.id]);
    await completeIntent(client,intent,'SUPERSEDED');return;
  }
  if(candidate.qa_result!=='PASS')throw new ApiError(409,'AUT02_REVIEW_WITHOUT_QA_PASS');
  const existing=(await client.query(`SELECT * FROM work_acceptances WHERE delivery_candidate_id=$1`,[candidate.id])).rows[0];
  if(existing){await client.query(`UPDATE work_items SET state=$2,version=version+CASE WHEN state<>$2 THEN 1 ELSE 0 END WHERE id=$1`,[candidate.work_item_id,existing.state==='WAITING_FOR_INDEPENDENT_REVIEWER'?'WAITING_FOR_INDEPENDENT_REVIEWER':'INDEPENDENT_REVIEW']);await completeIntent(client,intent,'COMPLETED');return existing;}
  const executionPolicy=(await client.query(`SELECT p.*,r.current_configuration_version FROM agent_execution_policy p JOIN ai_runtime r ON r.id=p.primary_runtime_id WHERE r.enabled=true ORDER BY p.published_at DESC,p.version DESC LIMIT 1`)).rows[0];
  const legacyAssurancePolicy=(await client.query(`SELECT * FROM assurance_policies WHERE enabled=true
    AND NOT (selectors ? 'jobKinds' OR selectors ? 'subjectKinds')
    AND (selectors->'agentPolicyNames' IS NULL OR selectors->'agentPolicyNames' ? $1)
    AND (selectors->'taskTypes' IS NULL OR selectors->'taskTypes' ? 'DEVELOP_WORK_ITEM')
    AND (selectors->'classifications' IS NULL OR selectors->'classifications' ? 'INTERNAL')
    ORDER BY published_at DESC LIMIT 1`,[executionPolicy?.name??''])).rows[0];
  if(!executionPolicy){
    await client.query(`UPDATE work_items SET state='BLOCKED',version=version+1 WHERE id=$1`,[candidate.work_item_id]);
    await openBlock(client,{projectId:candidate.project_id,sourceType:'DELIVERY_CANDIDATE',sourceId:candidate.id,code:'ASSURANCE_POLICY_NOT_SELECTED',category:'POLICY',severity:'HIGH',correlationId:candidate.correlation_id,evidence:{delivery_candidate_id:candidate.id,stop_reason:'AUT-03_POLICY_EXPANSION_REQUIRED'}});
    await event(client,candidate.project_id,'AUT02_ASSURANCE_POLICY_MISSING',candidate.correlation_id,{delivery_candidate_id:candidate.id,work_item_id:candidate.work_item_id,stop_reason:'AUT-03_POLICY_EXPANSION_REQUIRED'});
    await completeIntent(client,intent,'COMPLETED');return;
  }
  const executionId=randomUUID(),executionKey=`aut02-producer:v1:${candidate.id}`;
  await client.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selected_runtime_id,selected_configuration_version,selection_reason)
    VALUES($1,$2,$3,$4,$13,'DEVELOP_WORK_ITEM',$5,'development-agent',$6,'DEVELOP_WORK_ITEM','INTERNAL',$7,$8,$9,'SUCCEEDED',$11,$12,$10)
    ON CONFLICT(job_id,idempotency_key) DO NOTHING`,[executionId,candidate.job_id,candidate.producer_operation_id,candidate.project_id,executionKey,config().buildId,executionPolicy.id,executionPolicy.name,executionPolicy.version,{delivery_candidate_id:candidate.id,server_derived:true},executionPolicy.primary_runtime_id,executionPolicy.current_configuration_version,candidate.project_id]);
  const execution=(await client.query(`SELECT * FROM agent_execution WHERE job_id=$1 AND idempotency_key=$2`,[candidate.job_id,executionKey])).rows[0];
  const dispatch=await reserveAssuranceDispatch(client,{jobId:candidate.job_id,operationId:candidate.producer_operation_id,projectId:candidate.project_id,correlationId:candidate.correlation_id,jobKind:'DEVELOP_WORK_ITEM',subjectKind:'WorkItemDeliveryCandidate:v1',subjectId:candidate.id,normativeGeneration:candidate.id,classification:'INTERNAL',lineageFingerprint:deterministicHash({delivery_candidate_id:candidate.id,work_item_revision_id:candidate.work_item_revision_id,module_plan_revision_id:candidate.module_plan_revision_id,plan_work_item_id:candidate.plan_work_item_id,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,base_sha:candidate.base_sha,head_sha:candidate.head_sha,snapshot_hash:candidate.snapshot_hash}),producerExecutionId:execution.id,moduleId:candidate.module_id,workItemId:candidate.work_item_id,modulePlanRevisionId:candidate.module_plan_revision_id,planWorkItemId:candidate.plan_work_item_id,agentPolicyName:execution.policy_name,legacyPolicy:legacyAssurancePolicy?{id:legacyAssurancePolicy.id,version:Number(legacyAssurancePolicy.version)}:null});
  const frozenLegacyPolicy=dispatch.selection_result==='NOT_SELECTED'&&dispatch.legacy_policy_id?{id:String(dispatch.legacy_policy_id),version:Number(dispatch.legacy_policy_version)}:undefined;
  const acceptance=await createAcceptance(client,{id:execution.id,project_key:candidate.project_id,policy_name:execution.policy_name,task_type:'DEVELOP_WORK_ITEM',classification:'INTERNAL',agent_id:execution.agent_id,agent_version:execution.agent_version,selected_runtime_id:execution.selected_runtime_id,selected_configuration_version:execution.selected_configuration_version,policy_id:execution.policy_id,policy_version:execution.policy_version},candidate.correlation_id,dispatch.selection_result==='SELECTED'?dispatch:undefined,frozenLegacyPolicy);
  if(!acceptance){
    await client.query(`UPDATE work_items SET state='BLOCKED',version=version+1 WHERE id=$1`,[candidate.work_item_id]);
    await openBlock(client,{projectId:candidate.project_id,sourceType:'DELIVERY_CANDIDATE',sourceId:candidate.id,code:'ASSURANCE_POLICY_NOT_SELECTED',category:'POLICY',severity:'HIGH',correlationId:candidate.correlation_id,evidence:{delivery_candidate_id:candidate.id,dispatch_snapshot_id:dispatch.id,selection_result:dispatch.selection_result}});
    await completeIntent(client,intent,'COMPLETED');return;
  }
  await client.query(`UPDATE work_acceptances SET delivery_candidate_id=$2 WHERE id=$1`,[acceptance.id,candidate.id]);
  const submitted=await submitOutputForReview(client,execution.id,{delivery_candidate_id:candidate.id,snapshot_hash:candidate.snapshot_hash,qa_report_id:candidate.qa_report_id,qa_report_hash:candidate.report_hash,head_sha:candidate.head_sha});
  const target=submitted?.state==='WAITING_FOR_INDEPENDENT_REVIEWER'?'WAITING_FOR_INDEPENDENT_REVIEWER':'INDEPENDENT_REVIEW';
  await client.query(`UPDATE work_items SET state=$2,version=version+CASE WHEN state<>$2 THEN 1 ELSE 0 END WHERE id=$1`,[candidate.work_item_id,target]);
  await event(client,candidate.project_id,'AUT02_INDEPENDENT_REVIEW_STARTED',candidate.correlation_id,{delivery_candidate_id:candidate.id,work_item_id:candidate.work_item_id,acceptance_id:acceptance.id,state:submitted?.state});
  await completeIntent(client,intent,'COMPLETED');return acceptance;
});

const eligibleForMerge=async(client:PoolClient,candidateId:string)=>{
  const row=(await client.query(`SELECT dc.*,w.state AS work_item_state,w.workflow_code,w.workflow_version,m.current_revision_id,
      qr.result AS qa_result,a.id AS acceptance_id,a.state AS acceptance_state,r.id AS review_id,rd.id AS review_decision_id,rd.decision,
      EXISTS(SELECT 1 FROM findings f LEFT JOIN finding_work_items fw ON fw.finding_id=f.id WHERE (f.delivery_id=dc.delivery_id OR fw.work_item_id=dc.work_item_id) AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION')) AS open_finding,
      EXISTS(SELECT 1 FROM rework_decisions rw WHERE rw.work_item_id=dc.work_item_id AND rw.revision_id=dc.module_revision_id AND rw.status='ACTIVE') AS active_rework,
      EXISTS(SELECT 1 FROM recovery_decisions rc WHERE rc.work_item_id=dc.work_item_id AND rc.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION')) AS active_recovery,
      EXISTS(SELECT 1 FROM work_blocks b WHERE b.acceptance_id=a.id AND b.state NOT IN ('RESOLVED','CANCELLED')) AS active_block
    FROM work_item_delivery_candidates dc JOIN work_items w ON w.id=dc.work_item_id JOIN modules m ON m.id=dc.module_id
    JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id JOIN work_acceptances a ON a.delivery_candidate_id=dc.id
    JOIN assurance_reviews r ON r.acceptance_id=a.id JOIN review_decisions rd ON rd.review_id=r.id
    WHERE dc.id=$1 ORDER BY r.version DESC LIMIT 1 FOR UPDATE OF w,m`,[candidateId])).rows[0];
  if(!row)return null;
  row.eligible=row.state==='ACTIVE'&&row.workflow_code==='WORK_ITEM_DELIVERY'&&Number(row.workflow_version)===2&&row.current_revision_id===row.module_revision_id&&row.work_item_state==='ACCEPTED'&&row.qa_result==='PASS'&&row.acceptance_state==='ACCEPTED'&&row.decision==='ACCEPT'&&!row.open_finding&&!row.active_rework&&!row.active_recovery&&!row.active_block;
  return row;
};

const recordMerge=async(client:PoolClient,intent:any,row:any,resultRow:any,phaseAfter:string,parents:string[])=>{
  const evidence={schema_version:'WorkItemMergeEvidence:v1',delivery_candidate_id:row.id,work_item_id:row.work_item_id,target_ref:'phases/3',phase_before_sha:resultRow.phase_before_sha,delivery_head_sha:row.head_sha,phase_after_sha:phaseAfter,parents};
  const evidenceHash=deterministicHash(evidence),op=await operation(client,row.project_id,'MERGE_WORK_ITEM',`merge-operation:v1:${row.id}`,row.correlation_id);
  await client.query(`UPDATE work_item_merge_results SET phase_after_sha=$2,observed_parents=$3::jsonb,state='MERGE_RECORDED',evidence=$4,evidence_hash=$5,recorded_at=clock_timestamp() WHERE id=$1 AND state IN ('PRE_EFFECT','EFFECT_UNKNOWN','NOT_APPLIED')`,[resultRow.id,phaseAfter,JSON.stringify(parents),evidence,evidenceHash]);
  await client.query(`UPDATE deliveries SET phase_before_sha=$2,phase_head_sha=$3 WHERE id=$1`,[row.delivery_id,resultRow.phase_before_sha,phaseAfter]);
  await client.query(`UPDATE worktrees SET state='RELEASED',lease_expires_at=NULL WHERE id=$1`,[row.worktree_id]);
  await enqueueAut02Intent(client,{projectId:row.project_id,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-reassess:v1:${row.module_revision_id}:${row.module_round_id}:${row.id}`,correlationId:row.correlation_id,deliveryCandidateId:row.id,workItemId:row.work_item_id,moduleId:row.module_id,moduleRevisionId:row.module_revision_id,moduleRoundId:row.module_round_id,evidenceRefs:[`merge_result:${resultRow.id}`]});
  await event(client,row.project_id,'MERGE_RECORDED',row.correlation_id,{delivery_candidate_id:row.id,work_item_id:row.work_item_id,module_revision_id:row.module_revision_id,module_round_id:row.module_round_id,phase_before_sha:resultRow.phase_before_sha,phase_after_sha:phaseAfter,evidence_hash:evidenceHash},op);
  await completeIntent(client,intent,'COMPLETED',op);
};

export const recordAut02MergeAfterRecovery=async(intentId:string,recoveryClaim:{id:string;execution_claim_id:string;execution_generation:number})=>{
  const context=(await pool.query(`SELECT i.*,mr.id AS merge_result_id,mr.phase_before_sha,mr.delivery_head_sha,mr.state AS merge_state,dc.*,p.repository_path
    FROM assurance_integration_intents i JOIN work_item_merge_results mr ON mr.intent_id=i.id JOIN work_item_delivery_candidates dc ON dc.id=mr.delivery_candidate_id JOIN projects p ON p.id=i.project_id WHERE i.id=$1`,[intentId])).rows[0];
  if(!context)throw new ApiError(409,'AUT02_MERGE_RECOVERY_CONTEXT_NOT_FOUND');
  const mergeSha=shaList(gitValue(context.repository_path,'rev-list','--merges','phases/3')).find(sha=>{const parents=shaList(gitValue(context.repository_path,'show','-s','--format=%P',sha));return parents.length===2&&parents[0]===context.phase_before_sha&&parents[1]===context.delivery_head_sha;});
  if(!mergeSha)throw new ApiError(409,'AUT02_MERGE_RECOVERY_EFFECT_NOT_FOUND');
  const parents=shaList(gitValue(context.repository_path,'show','-s','--format=%P',mergeSha));
  return withTransaction(async client=>{
    const owned=await client.query(`SELECT 1 FROM recovery_decisions WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='EXECUTING' AND execution_lease_expires_at>clock_timestamp() FOR UPDATE`,[recoveryClaim.id,recoveryClaim.execution_claim_id,recoveryClaim.execution_generation]);if(!owned.rowCount)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
    const intent=(await client.query(`SELECT * FROM assurance_integration_intents WHERE id=$1 FOR UPDATE`,[intentId])).rows[0],result=(await client.query(`SELECT * FROM work_item_merge_results WHERE intent_id=$1 FOR UPDATE`,[intentId])).rows[0];
    if(result?.state==='MERGE_RECORDED')return result.phase_after_sha as string;
    const candidate=(await client.query(`SELECT * FROM work_item_delivery_candidates WHERE id=$1`,[intent.delivery_candidate_id])).rows[0];await client.query(`SELECT id FROM work_items WHERE id=$1 FOR UPDATE`,[candidate.work_item_id]);await client.query(`SELECT id FROM modules WHERE id=$1 FOR UPDATE`,[candidate.module_id]);
    const evidence={schema_version:'WorkItemMergeEvidence:v1',delivery_candidate_id:candidate.id,work_item_id:candidate.work_item_id,target_ref:'phases/3',phase_before_sha:result.phase_before_sha,delivery_head_sha:candidate.head_sha,phase_after_sha:mergeSha,parents,recovery_decision_id:recoveryClaim.id};const evidenceHash=deterministicHash(evidence),op=await operation(client,candidate.project_id,'MERGE_WORK_ITEM',`merge-operation:v1:${candidate.id}`,candidate.correlation_id);
    await client.query(`UPDATE work_item_merge_results SET phase_after_sha=$2,observed_parents=$3::jsonb,state='MERGE_RECORDED',evidence=$4,evidence_hash=$5,recorded_at=clock_timestamp() WHERE id=$1`,[result.id,mergeSha,JSON.stringify(parents),evidence,evidenceHash]);await client.query(`UPDATE deliveries SET phase_before_sha=$2,phase_head_sha=$3 WHERE id=$1`,[candidate.delivery_id,result.phase_before_sha,mergeSha]);await client.query(`UPDATE worktrees SET state='RELEASED',lease_expires_at=NULL WHERE id=$1`,[candidate.worktree_id]);
    await enqueueAut02Intent(client,{projectId:candidate.project_id,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-reassess:v1:${candidate.module_revision_id}:${candidate.module_round_id}:${candidate.id}`,correlationId:candidate.correlation_id,deliveryCandidateId:candidate.id,workItemId:candidate.work_item_id,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id,evidenceRefs:[`merge_result:${result.id}`,`recovery_decision:${recoveryClaim.id}`]});await event(client,candidate.project_id,'MERGE_RECORDED',candidate.correlation_id,{delivery_candidate_id:candidate.id,work_item_id:candidate.work_item_id,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,phase_before_sha:result.phase_before_sha,phase_after_sha:mergeSha,evidence_hash:evidenceHash,recovery_decision_id:recoveryClaim.id},op);
    await client.query(`UPDATE assurance_integration_intents SET status='COMPLETED',effect_state='EFFECT_RECORDED',operation_id=$2,recovery_decision_id=$3,lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp(),completed_at=clock_timestamp() WHERE id=$1`,[intent.id,op,recoveryClaim.id]);return mergeSha;
  });
};

const executeMerge=async(intent:any)=>{
  const prepared=await withTransaction(async client=>{
    await lockIntent(client,intent);const row=await eligibleForMerge(client,intent.delivery_candidate_id);
    if(!row?.eligible){if(row&&(row.current_revision_id!==row.module_revision_id||row.state!=='ACTIVE'))await client.query(`UPDATE work_item_delivery_candidates SET state='SUPERSEDED' WHERE id=$1 AND state='ACTIVE'`,[row.id]);await completeIntent(client,intent,'SUPERSEDED');return null;}
    const prior=(await client.query(`SELECT * FROM work_item_merge_results WHERE delivery_candidate_id=$1 FOR UPDATE`,[row.id])).rows[0];
    if(prior?.state==='MERGE_RECORDED'){await completeIntent(client,intent,'COMPLETED');return null;}
    const repository=(await client.query(`SELECT repository_path FROM projects WHERE id=$1`,[row.project_id])).rows[0].repository_path;
    if(gitValue(repository,'rev-parse',row.branch_ref)!==row.head_sha)throw new ApiError(409,'AUT02_MERGE_HEAD_CHANGED');
    if(prior?.state==='EFFECT_UNKNOWN'){
      const current=gitValue(repository,'rev-parse','phases/3'),parents=shaList(gitValue(repository,'show','-s','--format=%P',current));
      if(current===prior.phase_before_sha){await client.query(`UPDATE work_item_merge_results SET state='NOT_APPLIED' WHERE id=$1`,[prior.id]);}
      else if(parents.length===2&&parents[0]===prior.phase_before_sha&&parents[1]===row.head_sha){await recordMerge(client,intent,row,prior,current,parents);return null;}
      else{await client.query(`UPDATE work_item_merge_results SET state='DIVERGED' WHERE id=$1`,[prior.id]);await completeIntent(client,intent,'SUPERSEDED');return {recovery:{projectId:row.project_id,workItemId:row.work_item_id,intentId:intent.id,key:`merge-recovery:v1:${prior.id}:diverged`}};}
    }
    const before=gitValue(repository,'rev-parse','phases/3'),resultId=prior?.id??randomUUID();
    if(!prior)await client.query(`INSERT INTO work_item_merge_results(id,project_id,delivery_candidate_id,work_item_id,intent_id,target_ref,phase_before_sha,delivery_head_sha,expected_parents,state) VALUES($1,$2,$3,$4,$5,'phases/3',$6,$7,$8::jsonb,'PRE_EFFECT')`,[resultId,row.project_id,row.id,row.work_item_id,intent.id,before,row.head_sha,JSON.stringify([before,row.head_sha])]);
    await client.query(`UPDATE assurance_integration_intents SET effect_state='PRE_EFFECT' WHERE id=$1`,[intent.id]);
    return{row,repository,result:{id:resultId,phase_before_sha:before}};
  });
  if(!prepared)return;
  if(prepared.recovery)return requestAut02MergeRecovery(prepared.recovery.projectId,prepared.recovery.workItemId,prepared.recovery.intentId,prepared.recovery.key);
  try{
    const phaseAfter=mergeWorkItem(prepared.repository,'phases/3',prepared.row.branch_ref,prepared.row.head_sha);
    const parents=shaList(gitValue(prepared.repository,'show','-s','--format=%P',phaseAfter));
    if(parents.length!==2||parents[0]!==prepared.result.phase_before_sha||parents[1]!==prepared.row.head_sha)throw new ApiError(409,'AUT02_MERGE_PARENT_MISMATCH');
    await withTransaction(async client=>{await lockIntent(client,intent);await recordMerge(client,intent,prepared.row,prepared.result,phaseAfter,parents);});
  }catch(error){
    await withTransaction(async client=>{
      const owned=await client.query(`SELECT 1 FROM assurance_integration_intents WHERE id=$1 AND lease_token=$2 AND execution_generation=$3 FOR UPDATE`,[intent.id,intent.lease_token,intent.execution_generation]);
      if(!owned.rowCount)return;
      await client.query(`UPDATE work_item_merge_results SET state='EFFECT_UNKNOWN' WHERE id=$1 AND state IN ('PRE_EFFECT','NOT_APPLIED')`,[prepared.result.id]);
      await client.query(`UPDATE assurance_integration_intents SET status='FAILED',effect_state='EFFECT_UNKNOWN',last_error=$4,available_at=clock_timestamp()+interval '1 second',lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE id=$1 AND lease_token=$2 AND execution_generation=$3`,[intent.id,intent.lease_token,intent.execution_generation,String((error as any)?.code??'MERGE_TIMEOUT')]);
    });
    await requestAut02MergeRecovery(prepared.row.project_id,prepared.row.work_item_id,intent.id,`merge-recovery:v1:${prepared.result.id}:unknown:${intent.execution_generation}`);
  }
};

const requiredMemberRows=async(client:PoolClient,intent:any)=>{
  const module=(await client.query(`SELECT m.*,p.repository_path FROM modules m JOIN projects p ON p.id=m.project_id WHERE m.id=$1 AND m.project_id=$2 FOR UPDATE OF m`,[intent.module_id,intent.project_id])).rows[0];
  if(!module||module.current_revision_id!==intent.module_revision_id)return{module,plan:null,round:null,members:[]};
  const round=(await client.query(`SELECT * FROM module_rounds WHERE id=$1 AND module_id=$2 AND revision_id=$3 FOR UPDATE`,[intent.module_round_id,intent.module_id,intent.module_revision_id])).rows[0];
  const plans=(await client.query(`SELECT * FROM module_plan_revisions WHERE module_id=$1 AND module_revision_id=$2 AND status='APPROVED' ORDER BY id FOR UPDATE`,[intent.module_id,intent.module_revision_id])).rows;
  if(!round||plans.length!==1)return{module,plan:null,round,members:[]};const plan=plans[0];
  const members=(await client.query(`SELECT w.*,dc.id AS delivery_candidate_id,dc.work_item_revision_id,dc.delivery_id,dc.head_sha AS delivery_head_sha,dc.snapshot_hash,dc.qa_matrix_hash,
      qr.id AS qa_report_id,qr.report_hash AS qa_report_hash,qr.result AS qa_result,
      a.id AS acceptance_id,a.state AS acceptance_state,r.id AS review_id,rd.id AS review_decision_id,rd.decision,
      mr.id AS merge_result_id,mr.phase_before_sha,mr.phase_after_sha,mr.evidence_hash AS merge_evidence_hash,mr.observed_parents,mr.recorded_at,
      EXISTS(SELECT 1 FROM findings f LEFT JOIN finding_work_items fw ON fw.finding_id=f.id WHERE (f.delivery_id=dc.delivery_id OR fw.work_item_id=w.id) AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION')) AS open_finding,
      EXISTS(SELECT 1 FROM rework_decisions rw WHERE rw.work_item_id=w.id AND rw.revision_id=w.revision_id AND rw.status='ACTIVE') AS active_rework,
      EXISTS(SELECT 1 FROM recovery_decisions rc WHERE rc.work_item_id=w.id AND rc.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION')) AS active_recovery,
      EXISTS(SELECT 1 FROM work_item_external_blockers b WHERE b.work_item_id=w.id AND b.state='ACTIVE') AS active_external_blocker,
      EXISTS(SELECT 1 FROM work_blocks b WHERE b.acceptance_id=a.id AND b.state NOT IN ('RESOLVED','CANCELLED')) AS active_block
    FROM work_items w
    LEFT JOIN LATERAL (SELECT * FROM work_item_delivery_candidates WHERE work_item_id=w.id AND module_revision_id=w.revision_id AND state='ACTIVE' ORDER BY created_at DESC,id DESC LIMIT 1) dc ON true
    LEFT JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id
    LEFT JOIN work_acceptances a ON a.delivery_candidate_id=dc.id
    LEFT JOIN LATERAL (SELECT r.* FROM assurance_reviews r JOIN review_decisions x ON x.review_id=r.id WHERE r.acceptance_id=a.id ORDER BY r.version DESC LIMIT 1) r ON true
    LEFT JOIN review_decisions rd ON rd.review_id=r.id
    LEFT JOIN work_item_merge_results mr ON mr.delivery_candidate_id=dc.id AND mr.state='MERGE_RECORDED'
    WHERE w.module_id=$1 AND w.revision_id=$2 AND w.round_id=$3 AND w.workflow_code='WORK_ITEM_DELIVERY' AND w.workflow_version=2 AND w.module_plan_revision_id=$4
    ORDER BY w.plan_work_item_id,w.id::text FOR UPDATE OF w`,[intent.module_id,intent.module_revision_id,intent.module_round_id,plan.id])).rows;
  return{module,plan,round,members};
};

export const integrationCandidateMemberEligible=(member:any)=>Boolean(member.state==='ACCEPTED'&&member.delivery_candidate_id&&member.qa_result==='PASS'&&member.acceptance_state==='ACCEPTED'&&member.decision==='ACCEPT'&&member.merge_result_id&&member.phase_after_sha&&!member.open_finding&&!member.active_rework&&!member.active_recovery&&!member.active_external_blocker&&!member.active_block);
export const integrationCandidateEligibleMembers=(expected:readonly string[]|null,members:any[])=>requiredWorkItemSetMatches(expected,deriveObservedRequiredWorkItemSet(members))&&members.every(integrationCandidateMemberEligible);

const executeCandidateReassessment=async(intent:any)=>withTransaction(async client=>{
  await lockIntent(client,intent);
  const {module,plan,round,members}=await requiredMemberRows(client,intent);
  const expected=deriveRequiredWorkItemSet(plan),observed=deriveObservedRequiredWorkItemSet(members);
  if(!module||!plan||!round||!integrationCandidateEligibleMembers(expected,members)){await completeIntent(client,intent,module?.current_revision_id!==intent.module_revision_id?'SUPERSEDED':'COMPLETED');return null;}
  const phaseSha=members.slice().sort((a:any,b:any)=>String(a.recorded_at).localeCompare(String(b.recorded_at))||String(a.id).localeCompare(String(b.id))).at(-1).phase_after_sha;
  if(gitValue(module.repository_path,'rev-parse','phases/3')!==phaseSha){await completeIntent(client,intent,'SUPERSEDED');return null;}
  const canonicalMembers=members.slice().sort((left:any,right:any)=>String(left.plan_work_item_id).localeCompare(String(right.plan_work_item_id))||String(left.id).localeCompare(String(right.id)));
  const manifestMembers=canonicalMembers.map((member:any,index:number)=>({member_index:index,plan_work_item_id:String(member.plan_work_item_id),work_item_id:String(member.id),work_item_revision_id:String(member.work_item_revision_id),delivery_candidate_id:String(member.delivery_candidate_id),delivery_id:String(member.delivery_id),delivery_head_sha:String(member.delivery_head_sha),snapshot_hash:String(member.snapshot_hash),qa_report_id:String(member.qa_report_id),qa_report_hash:String(member.qa_report_hash),qa_matrix_hash:String(member.qa_matrix_hash),work_acceptance_id:String(member.acceptance_id),assurance_review_id:String(member.review_id),review_decision_id:String(member.review_decision_id),merge_result_id:String(member.merge_result_id),merge_evidence_hash:String(member.merge_evidence_hash),phase_before_sha:String(member.phase_before_sha),merged_sha:String(member.phase_after_sha),merge_parents:member.observed_parents}));
  const setScope={module_plan_revision_id:String(plan.id),module_revision_id:String(intent.module_revision_id),module_round_id:String(intent.module_round_id)};
  const requiredSetFingerprint=requiredWorkItemSetFingerprint(setScope,expected!);
  const manifest={schema_version:'IntegrationCandidateManifest:v1',pipeline_version:AUT02_PIPELINE_VERSION,policy_version:AUT02_POLICY_VERSION,required_work_item_set_policy_version:REQUIRED_WORK_ITEM_SET_POLICY_VERSION,project_id:String(module.project_id),module_id:String(module.id),module_revision_id:String(intent.module_revision_id),module_round_id:String(intent.module_round_id),module_plan_revision_id:String(plan.id),required_work_item_set:expected,observed_work_item_set:observed,required_work_item_set_fingerprint:requiredSetFingerprint,phase_ref:'phases/3',phase_sha:String(phaseSha),integration_ref:'integration',members:manifestMembers};
  const manifestHash=deterministicHash(manifest),candidateKey=`candidate:v1:${intent.module_revision_id}:${intent.module_round_id}:${manifestHash}`;
  const old=(await client.query(`SELECT * FROM integration_candidates WHERE idempotency_key=$1`,[candidateKey])).rows[0];
  if(old){await completeIntent(client,intent,'COMPLETED');return old;}
  const generation=Number((await client.query(`SELECT coalesce(max(generation),0)+1 AS n FROM integration_candidates WHERE module_revision_id=$1 AND module_round_id=$2`,[intent.module_revision_id,intent.module_round_id])).rows[0].n),candidateId=randomUUID(),op=await operation(client,module.project_id,'CREATE_INTEGRATION_CANDIDATE',`candidate-operation:v1:${manifestHash}`,intent.correlation_id);
  await client.query(`INSERT INTO integration_candidates(id,project_id,phase_sha,manifest,state,pipeline_version,policy_version,module_id,module_revision_id,module_round_id,generation,manifest_hash,idempotency_key,correlation_id) VALUES($1,$2,$3,$4,'CANDIDATE_CREATED',$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[candidateId,module.project_id,phaseSha,manifest,AUT02_PIPELINE_VERSION,AUT02_POLICY_VERSION,module.id,intent.module_revision_id,intent.module_round_id,generation,manifestHash,candidateKey,intent.correlation_id]);
  for(const member of manifestMembers)await client.query(`INSERT INTO integration_candidate_members(candidate_id,project_id,member_index,work_item_id,work_item_revision_id,delivery_candidate_id,delivery_id,qa_report_id,work_acceptance_id,assurance_review_id,review_decision_id,merge_result_id,merged_sha,member_manifest) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[candidateId,module.project_id,member.member_index,member.work_item_id,member.work_item_revision_id,member.delivery_candidate_id,member.delivery_id,member.qa_report_id,member.work_acceptance_id,member.assurance_review_id,member.review_decision_id,member.merge_result_id,member.merged_sha,member]);
  const ids=manifestMembers.map(member=>member.work_item_id),promoted=await client.query(`UPDATE work_items SET state='READY_FOR_INTEGRATION',version=version+1 WHERE id=ANY($1::uuid[]) AND state='ACCEPTED'`,[ids]);
  if(promoted.rowCount!==ids.length)throw new ApiError(409,'AUT02_COLLECTIVE_READY_CONFLICT');
  const evidence=await artifact(client,module.project_id,'aut02-integration-candidate-manifest',{candidate_id:candidateId,manifest,manifest_hash:manifestHash},op);
  await enqueueAut02Intent(client,{projectId:module.project_id,kind:'VALIDATE_INTEGRATION_CANDIDATE',idempotencyKey:`validate:v1:${candidateId}`,correlationId:intent.correlation_id,moduleId:module.id,moduleRevisionId:intent.module_revision_id,moduleRoundId:intent.module_round_id,integrationCandidateId:candidateId,evidenceRefs:[`artifact:${evidence.id}`,...manifestMembers.map(member=>`work_item:${member.work_item_id}`)]});
  await event(client,module.project_id,'INTEGRATION_CANDIDATE_CREATED',intent.correlation_id,{candidate_id:candidateId,manifest_hash:manifestHash,module_revision_id:intent.module_revision_id,module_round_id:intent.module_round_id,member_count:ids.length,work_item_ids:ids},op);
  await completeIntent(client,intent,'COMPLETED',op);return{id:candidateId,manifestHash};
});

const candidateBlockers=async(client:PoolClient,candidateId:string,excludedRecoveryId?:string,allowedStates=['READY_FOR_INTEGRATION'])=>{
  const rows=(await client.query(`SELECT cm.work_item_id,w.state,w.revision_id,m.current_revision_id,
    EXISTS(SELECT 1 FROM findings f LEFT JOIN finding_work_items fw ON fw.finding_id=f.id WHERE (f.candidate_id=cm.candidate_id OR fw.work_item_id=cm.work_item_id) AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION')) AS finding,
    EXISTS(SELECT 1 FROM rework_decisions rw WHERE rw.work_item_id=cm.work_item_id AND rw.status='ACTIVE') AS rework,
    EXISTS(SELECT 1 FROM recovery_decisions rc WHERE (rc.work_item_id=cm.work_item_id OR rc.integration_candidate_id=cm.candidate_id) AND rc.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION') AND ($2::uuid IS NULL OR rc.id<>$2)) AS recovery,
    EXISTS(SELECT 1 FROM work_item_external_blockers b WHERE b.work_item_id=cm.work_item_id AND b.state='ACTIVE') AS blocker
    FROM integration_candidate_members cm JOIN work_items w ON w.id=cm.work_item_id JOIN modules m ON m.id=w.module_id WHERE cm.candidate_id=$1 ORDER BY cm.work_item_id::text FOR UPDATE OF w,m`,[candidateId,excludedRecoveryId??null])).rows;
  return rows.filter((row:any)=>row.revision_id!==row.current_revision_id||row.finding||row.rework||row.recovery||row.blocker||!allowedStates.includes(row.state));
};

export const retryAut02IntegrationAfterRecoveryReconciliation=async(row:any,recoveryClaim:{id:string;execution_claim_id:string;execution_generation:number})=>withTransaction(async client=>{
  const owned=await client.query(`SELECT 1 FROM recovery_decisions WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='EXECUTING' AND execution_lease_expires_at>clock_timestamp() FOR UPDATE`,[recoveryClaim.id,recoveryClaim.execution_claim_id,recoveryClaim.execution_generation]);
  if(!owned.rowCount)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
  const snapshot=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1`,[row.candidate_id])).rows[0];
  if(!snapshot||snapshot.pipeline_version!==AUT02_PIPELINE_VERSION)throw new ApiError(409,'AUT02_CANDIDATE_NOT_FOUND');
  await client.query(`SELECT id FROM projects WHERE id=$1 FOR UPDATE`,[snapshot.project_id]);
  const module=(await client.query(`SELECT * FROM modules WHERE id=$1 FOR UPDATE`,[snapshot.module_id])).rows[0];
  await client.query(`SELECT id FROM module_rounds WHERE id=$1 FOR UPDATE`,[snapshot.module_round_id]);
  await client.query(`SELECT id FROM module_plan_revisions WHERE id=$1 FOR UPDATE`,[snapshot.manifest.module_plan_revision_id]);
  const members=(await client.query(`SELECT work_item_id FROM integration_candidate_members WHERE candidate_id=$1 ORDER BY work_item_id::text`,[snapshot.id])).rows;
  for(const member of members)await client.query(`SELECT id FROM work_items WHERE id=$1 FOR UPDATE`,[member.work_item_id]);
  const candidate=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1 FOR UPDATE`,[snapshot.id])).rows[0];
  const blockers=await candidateBlockers(client,candidate.id,recoveryClaim.id,['INTEGRATING']);
  if(module.current_revision_id!==candidate.module_revision_id||blockers.length){
    await client.query(`UPDATE integration_candidates SET state='SUPERSEDED',blocked_kind=NULL,superseded_reason='RECOVERY_RETRY_STALE_OR_BLOCKED',version=version+1 WHERE id=$1`,[candidate.id]);
    await client.query(`UPDATE work_items SET state='READY_FOR_INTEGRATION',version=version+1 WHERE id=ANY($1::uuid[]) AND state='INTEGRATING'`,[members.map((member:any)=>member.work_item_id)]);
    await event(client,candidate.project_id,'AUT02_RECOVERY_RETRY_SUPERSEDED',candidate.correlation_id,{candidate_id:candidate.id,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,blocker_work_item_ids:blockers.map((blocker:any)=>blocker.work_item_id)});
    return null;
  }
  return mergeAndPushDetached(row.repository_path,'phases/3','integration',row.candidate_sha,row.integration_before_sha);
});

const executeCandidateValidation=async(intent:any)=>withTransaction(async client=>{
  await lockIntent(client,intent);
  const candidate=(await client.query(`SELECT c.*,p.repository_path,m.current_revision_id FROM integration_candidates c JOIN projects p ON p.id=c.project_id JOIN modules m ON m.id=c.module_id WHERE c.id=$1 FOR UPDATE OF c,m`,[intent.integration_candidate_id])).rows[0];
  if(!candidate||candidate.pipeline_version!==AUT02_PIPELINE_VERSION){await completeIntent(client,intent,'SUPERSEDED');return;}
  const prior=(await client.query(`SELECT * FROM integration_candidate_validation_reports WHERE candidate_id=$1`,[candidate.id])).rows[0];if(prior){await completeIntent(client,intent,'COMPLETED');return prior;}
  const members=(await client.query(`SELECT cm.*,w.plan_work_item_id AS authoritative_plan_work_item_id,w.module_plan_revision_id AS authoritative_plan_revision_id,w.revision_id AS authoritative_module_revision_id,w.round_id AS authoritative_round_id,dc.plan_work_item_id AS frozen_plan_work_item_id FROM integration_candidate_members cm JOIN work_items w ON w.id=cm.work_item_id JOIN work_item_delivery_candidates dc ON dc.id=cm.delivery_candidate_id WHERE cm.candidate_id=$1 ORDER BY cm.member_index`,[candidate.id])).rows;
  const authoritativePlan=(await client.query(`SELECT * FROM module_plan_revisions WHERE id::text=$1 AND project_id=$2 AND module_id=$3 AND module_revision_id=$4 AND status='APPROVED'`,[String(candidate.manifest?.module_plan_revision_id??''),candidate.project_id,candidate.module_id,candidate.module_revision_id])).rows[0];
  const manifestMembers=array(candidate.manifest?.members),requiredSet=deriveRequiredWorkItemSet(authoritativePlan),observedSet=deriveObservedRequiredWorkItemSet(manifestMembers),persistedObservedSet=deriveObservedRequiredWorkItemSet(members.map((member:any)=>({plan_work_item_id:member.authoritative_plan_work_item_id})));
  const setScope={module_plan_revision_id:String(candidate.manifest?.module_plan_revision_id??''),module_revision_id:String(candidate.module_revision_id),module_round_id:String(candidate.module_round_id)};
  const checks:any[]=[];checks.push({code:'MANIFEST_HASH',pass:deterministicHash(candidate.manifest)===candidate.manifest_hash});checks.push({code:'MEMBERSHIP_CARDINALITY',pass:members.length>0&&members.length===manifestMembers.length});checks.push({code:'MEMBERSHIP_IDENTITY',pass:members.every((member:any,index:number)=>manifestMembers[index]?.plan_work_item_id===member.authoritative_plan_work_item_id&&member.member_manifest?.plan_work_item_id===member.authoritative_plan_work_item_id&&member.frozen_plan_work_item_id===member.authoritative_plan_work_item_id&&manifestMembers[index]?.work_item_id===String(member.work_item_id)&&manifestMembers[index]?.delivery_candidate_id===String(member.delivery_candidate_id)&&member.authoritative_plan_revision_id===candidate.manifest?.module_plan_revision_id&&member.authoritative_module_revision_id===candidate.module_revision_id&&member.authoritative_round_id===candidate.module_round_id)});checks.push({code:'REQUIRED_WORK_ITEM_SET_POLICY',pass:candidate.manifest?.required_work_item_set_policy_version===REQUIRED_WORK_ITEM_SET_POLICY_VERSION});checks.push({code:'REQUIRED_WORK_ITEM_SET_CANONICAL',pass:Boolean(requiredSet)&&canonicalJson(requiredSet)===canonicalJson(candidate.manifest?.required_work_item_set)});checks.push({code:'REQUIRED_WORK_ITEM_SET_EXACT',pass:requiredWorkItemSetMatches(requiredSet,observedSet)&&requiredWorkItemSetMatches(requiredSet,persistedObservedSet)&&canonicalJson(observedSet)===canonicalJson(candidate.manifest?.observed_work_item_set)});checks.push({code:'REQUIRED_WORK_ITEM_SET_FINGERPRINT',pass:Boolean(requiredSet)&&candidate.manifest?.required_work_item_set_fingerprint===requiredWorkItemSetFingerprint(setScope,requiredSet!)});checks.push({code:'REVISION_CURRENT',pass:candidate.current_revision_id===candidate.module_revision_id});
  let gitPass=true;try{gitPass=gitValue(candidate.repository_path,'rev-parse','phases/3')===candidate.phase_sha&&members.every((member:any)=>{try{gitValue(candidate.repository_path,'merge-base','--is-ancestor',member.merged_sha,candidate.phase_sha);return true;}catch{return false;}});}catch{gitPass=false;}checks.push({code:'GIT_STRUCTURE',pass:gitPass});
  const blockers=await candidateBlockers(client,candidate.id);checks.push({code:'MEMBERS_ELIGIBLE',pass:blockers.length===0});
  const passed=checks.every(check=>check.pass),report={schema_version:'IntegrationCandidateValidationReport:v1',candidate_id:candidate.id,manifest_hash:candidate.manifest_hash,policy_version:CANDIDATE_VALIDATION_POLICY_VERSION,checks};const reportHash=deterministicHash(report),op=await operation(client,candidate.project_id,'VALIDATE_INTEGRATION_CANDIDATE',`validate-operation:v1:${candidate.id}`,candidate.correlation_id),evidence=await artifact(client,candidate.project_id,'aut02-integration-candidate-validation',report,op),reportId=randomUUID();
  await client.query(`INSERT INTO integration_candidate_validation_reports(id,project_id,candidate_id,policy_version,result,report,report_hash,evidence_refs) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)`,[reportId,candidate.project_id,candidate.id,CANDIDATE_VALIDATION_POLICY_VERSION,passed?'PASS':'FAIL',report,reportHash,JSON.stringify([`artifact:${evidence.id}`])]);
  await client.query(`UPDATE integration_candidates SET validation_report_id=$2,state=$3,blocked_kind=$4,version=version+1 WHERE id=$1`,[candidate.id,reportId,passed?'INTEGRATION_PENDING':'INTEGRATION_BLOCKED',passed?null:'VALIDATION_CODE_DEFECT']);
  if(passed)await enqueueAut02Intent(client,{projectId:candidate.project_id,kind:'INTEGRATE_CANDIDATE',idempotencyKey:`integrate:v1:${candidate.id}`,correlationId:candidate.correlation_id,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id,integrationCandidateId:candidate.id,evidenceRefs:[`candidate_validation_report:${reportId}`]});
  else{const findingId=randomUUID(),fingerprint=deterministicHash(checks.filter(check=>!check.pass));await client.query(`INSERT INTO findings(id,project_id,candidate_id,origin,severity,state,rule_code,fingerprint,description,evidence) VALUES($1,$2,$3,'CANDIDATE_VALIDATION','HIGH','OPEN','AUT02_CANDIDATE_VALIDATION_FAILED',$4,'Integration candidate validation failed',$5) ON CONFLICT(origin,candidate_id,rule_code,fingerprint) WHERE candidate_id IS NOT NULL DO NOTHING`,[findingId,candidate.project_id,candidate.id,fingerprint,{report_id:reportId,report_hash:reportHash}]);}
  await event(client,candidate.project_id,passed?'CANDIDATE_VALIDATED':'CANDIDATE_VALIDATION_FAILED',candidate.correlation_id,{candidate_id:candidate.id,manifest_hash:candidate.manifest_hash,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,validation_report_id:reportId,report_hash:reportHash},op);await completeIntent(client,intent,'COMPLETED',op);return{passed,reportId};
});

const insertMacroReevaluation=async(client:PoolClient,candidate:any,evidenceRefs:string[])=>{
  const key=`macro-reevaluate:v1:${candidate.project_id}:aut02-candidate:${candidate.id}`;
  await client.query(`INSERT INTO macro_lifecycle_intents(id,project_id,destination,kind,aggregate_type,aggregate_id,idempotency_key,payload,evidence_refs)
    VALUES(gen_random_uuid(),$1,'MACRO_LIFECYCLE','MACRO_REEVALUATE','PROJECT',$1,$2,$3,$4::jsonb) ON CONFLICT(idempotency_key) DO NOTHING`,[candidate.project_id,key,{trigger:'AUT02_INTEGRATION_RECORDED',candidate_id:candidate.id,manifest_hash:candidate.manifest_hash,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id},JSON.stringify(evidenceRefs)]);
};

export const finalizeAut02IntegratedCandidate=async(candidateId:string,attemptId:string,remoteSha:string,source:'EXECUTOR'|'RECOVERY'='EXECUTOR',recoveryClaim?:{id:string;execution_claim_id:string;execution_generation:number})=>withTransaction(async client=>{
  if(source==='RECOVERY'){
    const owned=await client.query(`SELECT 1 FROM recovery_decisions WHERE id=$1 AND execution_claim_id=$2 AND execution_generation=$3 AND execution_state='EXECUTING' AND execution_lease_expires_at>clock_timestamp() FOR UPDATE`,[recoveryClaim?.id,recoveryClaim?.execution_claim_id,recoveryClaim?.execution_generation]);
    if(!owned.rowCount)throw new ApiError(409,'RECOVERY_EXECUTION_FENCED');
  }
  const snapshot=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1`,[candidateId])).rows[0];if(!snapshot||snapshot.pipeline_version!==AUT02_PIPELINE_VERSION)throw new ApiError(409,'AUT02_CANDIDATE_NOT_FOUND');
  const members=(await client.query(`SELECT work_item_id FROM integration_candidate_members WHERE candidate_id=$1 ORDER BY work_item_id::text`,[candidateId])).rows;
  for(const member of members)await client.query(`SELECT id FROM work_items WHERE id=$1 FOR UPDATE`,[member.work_item_id]);
  const candidate=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1 FOR UPDATE`,[candidateId])).rows[0];
  const attempt=(await client.query(`SELECT * FROM integration_attempts WHERE id=$1 AND candidate_id=$2 FOR UPDATE`,[attemptId,candidateId])).rows[0];if(!attempt)throw new ApiError(409,'INTEGRATION_ATTEMPT_NOT_FOUND');
  if(candidate.state==='INTEGRATED')return{candidate_id:candidateId,attempt_id:attemptId,replayed:true};
  const parentList=shaList(gitValue((await client.query(`SELECT repository_path FROM projects WHERE id=$1`,[candidate.project_id])).rows[0].repository_path,'show','-s','--format=%P',remoteSha));
  if(parentList.length!==2||parentList[0]!==attempt.integration_before_sha||parentList[1]!==attempt.candidate_sha)throw new ApiError(409,'AUT02_INTEGRATION_PARENT_MISMATCH');
  const changed=await client.query(`UPDATE work_items SET state='INTEGRATED',version=version+1 WHERE id=ANY($1::uuid[]) AND state='INTEGRATING'`,[members.map((member:any)=>member.work_item_id)]);
  if(changed.rowCount!==members.length)throw new ApiError(409,'AUT02_COLLECTIVE_FINALIZATION_CONFLICT');
  await client.query(`UPDATE integration_attempts SET state='INTEGRATED',merge_sha=$2,push_sha=$2,evidence=$3 WHERE id=$1`,[attemptId,remoteSha,{source,remote_sha:remoteSha,parents:parentList,confirmed:true}]);
  await client.query(`UPDATE integration_candidates SET state='INTEGRATED',blocked_kind=NULL,version=version+1 WHERE id=$1`,[candidateId]);
  if(attempt.operation_id)await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp(),failure_code=NULL WHERE id=$1`,[attempt.operation_id]);
  const evidence=await artifact(client,candidate.project_id,'aut02-integration-evidence',{candidate_id:candidateId,attempt_id:attemptId,manifest_hash:candidate.manifest_hash,remote_sha:remoteSha,parents:parentList,source},attempt.operation_id??candidateId);
  const shared={candidate_id:candidateId,manifest_hash:candidate.manifest_hash,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,correlation_id:candidate.correlation_id,integration_attempt_id:attemptId,remote_sha:remoteSha,evidence_hash:evidence.hash};
  await event(client,candidate.project_id,'INTEGRATION_RECORDED',candidate.correlation_id,{...shared,work_item_ids:members.map((member:any)=>member.work_item_id)},attempt.operation_id);
  for(const member of members)await event(client,candidate.project_id,'WORK_ITEM_INTEGRATED',candidate.correlation_id,{...shared,work_item_id:member.work_item_id},attempt.operation_id);
  await insertMacroReevaluation(client,candidate,[`integration_candidate:${candidateId}`,`integration_attempt:${attemptId}`,`artifact:${evidence.id}`]);
  return{candidate_id:candidateId,attempt_id:attemptId,replayed:false,work_item_ids:members.map((member:any)=>member.work_item_id)};
});

const executeIntegration=async(intent:any)=>{
  const initial=(await pool.query(`SELECT c.*,p.repository_path FROM integration_candidates c JOIN projects p ON p.id=c.project_id WHERE c.id=$1`,[intent.integration_candidate_id])).rows[0];
  if(!initial)return withTransaction(client=>completeIntent(client,intent,'SUPERSEDED'));
  let before:string;try{gitValue(initial.repository_path,'fetch','origin','integration');before=gitValue(initial.repository_path,'rev-parse','origin/integration');}catch{before=gitValue(initial.repository_path,'rev-parse','integration');}
  const prepared=await withTransaction(async client=>{
    await client.query(`SELECT id FROM projects WHERE id=$1 FOR UPDATE`,[initial.project_id]);
    const module=(await client.query(`SELECT * FROM modules WHERE id=$1 FOR UPDATE`,[initial.module_id])).rows[0];
    await client.query(`SELECT id FROM module_rounds WHERE id=$1 FOR UPDATE`,[initial.module_round_id]);
    await client.query(`SELECT id FROM module_plan_revisions WHERE id=$1 FOR UPDATE`,[initial.manifest.module_plan_revision_id]);
    const memberRows=(await client.query(`SELECT cm.work_item_id FROM integration_candidate_members cm WHERE cm.candidate_id=$1 ORDER BY cm.work_item_id::text`,[initial.id])).rows;
    for(const member of memberRows)await client.query(`SELECT id FROM work_items WHERE id=$1 FOR UPDATE`,[member.work_item_id]);
    const candidate=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1 FOR UPDATE`,[initial.id])).rows[0];await lockIntent(client,intent);
    const validation=(await client.query(`SELECT result FROM integration_candidate_validation_reports WHERE id=$1 AND candidate_id=$2`,[candidate.validation_report_id,candidate.id])).rows[0];
    const blockers=await candidateBlockers(client,candidate.id);
    if(candidate.state!=='INTEGRATION_PENDING'||validation?.result!=='PASS'||module.current_revision_id!==candidate.module_revision_id||blockers.length){await client.query(`UPDATE integration_candidates SET state='SUPERSEDED',superseded_reason='PRE_EFFECT_ELIGIBILITY_CHANGED',version=version+1 WHERE id=$1 AND state<>'INTEGRATED'`,[candidate.id]);await completeIntent(client,intent,'SUPERSEDED');return null;}
    const attemptId=randomUUID(),op=await operation(client,candidate.project_id,'INTEGRATE_CANDIDATE',`integrate-operation:v1:${candidate.id}`,candidate.correlation_id,'RUNNING');
    await client.query(`INSERT INTO integration_attempts(id,project_id,candidate_id,operation_id,intent_id,idempotency_key,integration_before_sha,candidate_sha,state,expected_parents,execution_claim_id,execution_generation,execution_lease_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PRE_EFFECT',$9::jsonb,$10,$11,clock_timestamp()+($12*interval '1 second'))`,[attemptId,candidate.project_id,candidate.id,op,intent.id,`integrate:v1:${candidate.id}`,before,candidate.phase_sha,JSON.stringify([before,candidate.phase_sha]),intent.lease_token,intent.execution_generation,leaseSeconds]);
    await client.query(`UPDATE integration_candidates SET state='INTEGRATION_IN_PROGRESS',version=version+1 WHERE id=$1`,[candidate.id]);
    const changed=await client.query(`UPDATE work_items SET state='INTEGRATING',version=version+1 WHERE id=ANY($1::uuid[]) AND state='READY_FOR_INTEGRATION'`,[memberRows.map((member:any)=>member.work_item_id)]);if(changed.rowCount!==memberRows.length)throw new ApiError(409,'AUT02_COLLECTIVE_PRE_EFFECT_CONFLICT');
    await client.query(`UPDATE assurance_integration_intents SET effect_state='PRE_EFFECT',operation_id=$2 WHERE id=$1`,[intent.id,op]);
    await event(client,candidate.project_id,'INTEGRATION_PRE_EFFECT',candidate.correlation_id,{candidate_id:candidate.id,manifest_hash:candidate.manifest_hash,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,integration_attempt_id:attemptId,work_item_ids:memberRows.map((member:any)=>member.work_item_id),integration_before_sha:before,candidate_sha:candidate.phase_sha},op);
    return{candidate,attemptId,op};
  });
  if(!prepared)return;
  try{
    const result=mergeAndPushDetached(initial.repository_path,'phases/3','integration',prepared.candidate.phase_sha,before);
    if(reconcileIntegration(initial.repository_path,'integration',before,prepared.candidate.phase_sha)!=='APPLIED_UNRECORDED')throw new ApiError(409,'AUT02_INTEGRATION_NOT_CONFIRMED');
    await finalizeAut02IntegratedCandidate(prepared.candidate.id,prepared.attemptId,result.mergeSha);
    await withTransaction(async client=>{await lockIntent(client,intent);await completeIntent(client,intent,'COMPLETED',prepared.op);});
    await reconcileWaitingDependencies('AUT02_INTEGRATION_COMPLETED', initial.project_id);
    await scheduleEligibleWorkItems('AUT02_INTEGRATION_COMPLETED');
  }catch(error){
    await withTransaction(async client=>{const owned=await client.query(`SELECT 1 FROM assurance_integration_intents WHERE id=$1 AND lease_token=$2 AND execution_generation=$3 FOR UPDATE`,[intent.id,intent.lease_token,intent.execution_generation]);if(!owned.rowCount)return;await client.query(`UPDATE integration_attempts SET state='EFFECT_UNKNOWN' WHERE id=$1`,[prepared.attemptId]);await client.query(`UPDATE integration_candidates SET state='INTEGRATION_BLOCKED',blocked_kind='GIT_RECOVERABLE',version=version+1 WHERE id=$1 AND state='INTEGRATION_IN_PROGRESS'`,[prepared.candidate.id]);await client.query(`UPDATE assurance_integration_intents SET status='FAILED',effect_state='EFFECT_UNKNOWN',last_error=$4,available_at=clock_timestamp()+interval '1 second',lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE id=$1 AND lease_token=$2 AND execution_generation=$3`,[intent.id,intent.lease_token,intent.execution_generation,String((error as any)?.code??'PUSH_TIMEOUT')]);});
    await requestIntegrationRecovery(prepared.candidate.project_id,prepared.candidate.id,`aut02-integration-recovery:v1:${prepared.attemptId}`,(error as any)?.code==='GIT_DIVERGED'?'GIT_DIVERGED':'PUSH_TIMEOUT');
  }
};

const executeReworkSchedule=async(intent:any)=>{
  const prepared=await withTransaction(async client=>{await lockIntent(client,intent);const row=(await client.query(`SELECT w.*,dc.module_revision_id FROM work_items w JOIN work_item_delivery_candidates dc ON dc.work_item_id=w.id AND dc.id=$2 WHERE w.id=$1 FOR UPDATE`,[intent.work_item_id,intent.delivery_candidate_id])).rows[0];if(!row||row.revision_id!==row.module_revision_id||row.state==='CANCELLED'){await completeIntent(client,intent,'SUPERSEDED');return null;}if(row.state==='REWORK_REQUIRED'||row.state==='REWORK_ELIGIBLE')await client.query(`UPDATE work_items SET state='ELIGIBLE_FOR_DISPATCH',version=version+1 WHERE id=$1`,[row.id]);await completeIntent(client,intent,'COMPLETED');return row;});
  if(prepared)await scheduleWorkItem(prepared.project_id,prepared.id,'AUT02_REWORK');
};

const processIntent=async(intent:any)=>{
  if(intent.kind==='RUN_DELIVERY_QA')return executeQa(intent);
  if(intent.kind==='START_INDEPENDENT_REVIEW')return executeReviewHandoff(intent);
  if(intent.kind==='MERGE_WORK_ITEM')return executeMerge(intent);
  if(intent.kind==='REASSESS_INTEGRATION_CANDIDATE')return executeCandidateReassessment(intent);
  if(intent.kind==='VALIDATE_INTEGRATION_CANDIDATE')return executeCandidateValidation(intent);
  if(intent.kind==='INTEGRATE_CANDIDATE')return executeIntegration(intent);
  if(intent.kind==='SCHEDULE_REWORK')return executeReworkSchedule(intent);
  return withTransaction(async client=>{await lockIntent(client,intent);await completeIntent(client,intent,'SUPERSEDED');});
};

const discoverMissingIntents=()=>withTransaction(async client=>{
  await client.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,payload,evidence_refs,correlation_id,idempotency_key)
    SELECT gen_random_uuid(),dc.project_id,'DELIVERY_QA','RUN_DELIVERY_QA',dc.id,dc.work_item_id,dc.module_id,dc.module_revision_id,dc.module_round_id,'{}',jsonb_build_array('delivery_candidate:'||dc.id),dc.correlation_id,'qa:v1:'||dc.id FROM work_item_delivery_candidates dc LEFT JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id WHERE dc.state='ACTIVE' AND qr.id IS NULL ON CONFLICT(idempotency_key) DO NOTHING`);
  await client.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,payload,evidence_refs,correlation_id,idempotency_key)
    SELECT gen_random_uuid(),dc.project_id,'ASSURANCE','START_INDEPENDENT_REVIEW',dc.id,dc.work_item_id,dc.module_id,dc.module_revision_id,dc.module_round_id,'{}',jsonb_build_array('delivery_qa_report:'||qr.id),dc.correlation_id,'review-start:v1:'||dc.id FROM work_item_delivery_candidates dc JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id AND qr.result='PASS' LEFT JOIN work_acceptances a ON a.delivery_candidate_id=dc.id WHERE dc.state='ACTIVE' AND a.id IS NULL ON CONFLICT(idempotency_key) DO NOTHING`);
  await client.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,payload,evidence_refs,correlation_id,idempotency_key)
    SELECT gen_random_uuid(),dc.project_id,'GIT_PHASE','MERGE_WORK_ITEM',dc.id,dc.work_item_id,dc.module_id,dc.module_revision_id,dc.module_round_id,'{}',jsonb_build_array('work_acceptance:'||a.id),dc.correlation_id,'merge:v1:'||dc.id FROM work_item_delivery_candidates dc JOIN work_acceptances a ON a.delivery_candidate_id=dc.id AND a.state='ACCEPTED' LEFT JOIN work_item_merge_results mr ON mr.delivery_candidate_id=dc.id WHERE dc.state='ACTIVE' AND mr.id IS NULL ON CONFLICT(idempotency_key) DO NOTHING`);
  await client.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,module_id,module_revision_id,module_round_id,integration_candidate_id,payload,evidence_refs,correlation_id,idempotency_key)
    SELECT gen_random_uuid(),c.project_id,'INTEGRATION_CANDIDATE','VALIDATE_INTEGRATION_CANDIDATE',c.module_id,c.module_revision_id,c.module_round_id,c.id,'{}',jsonb_build_array('integration_candidate:'||c.id),c.correlation_id,'validate:v1:'||c.id FROM integration_candidates c LEFT JOIN integration_candidate_validation_reports r ON r.candidate_id=c.id WHERE c.pipeline_version=$1 AND c.state='CANDIDATE_CREATED' AND r.id IS NULL ON CONFLICT(idempotency_key) DO NOTHING`,[AUT02_PIPELINE_VERSION]);
  await client.query(`INSERT INTO assurance_integration_intents(id,project_id,destination,kind,module_id,module_revision_id,module_round_id,integration_candidate_id,payload,evidence_refs,correlation_id,idempotency_key)
    SELECT gen_random_uuid(),c.project_id,'GIT_INTEGRATION','INTEGRATE_CANDIDATE',c.module_id,c.module_revision_id,c.module_round_id,c.id,'{}',jsonb_build_array('candidate_validation_report:'||r.id),c.correlation_id,'integrate:v1:'||c.id FROM integration_candidates c JOIN integration_candidate_validation_reports r ON r.candidate_id=c.id AND r.result='PASS' LEFT JOIN integration_attempts a ON a.candidate_id=c.id AND a.intent_id IS NOT NULL WHERE c.pipeline_version=$1 AND c.state='INTEGRATION_PENDING' AND a.id IS NULL ON CONFLICT(idempotency_key) DO NOTHING`,[AUT02_PIPELINE_VERSION]);
});

const recoverExpiredEffectIntents=async()=>{
  const expired=await withTransaction(async client=>{
    const rows=(await client.query(`SELECT * FROM assurance_integration_intents WHERE status='LEASED' AND effect_state IN ('PRE_EFFECT','EFFECT_UNKNOWN') AND lease_expires_at<clock_timestamp() ORDER BY lease_expires_at,id FOR UPDATE SKIP LOCKED LIMIT 100`)).rows;
    for(const row of rows){if(row.kind==='MERGE_WORK_ITEM')await client.query(`UPDATE work_item_merge_results SET state='EFFECT_UNKNOWN' WHERE intent_id=$1 AND state='PRE_EFFECT'`,[row.id]);if(row.kind==='INTEGRATE_CANDIDATE'){await client.query(`UPDATE integration_attempts SET state='EFFECT_UNKNOWN' WHERE intent_id=$1 AND state='PRE_EFFECT'`,[row.id]);await client.query(`UPDATE integration_candidates SET state='INTEGRATION_BLOCKED',blocked_kind='GIT_RECOVERABLE',version=version+1 WHERE id=$1 AND state='INTEGRATION_IN_PROGRESS'`,[row.integration_candidate_id]);}await client.query(`UPDATE assurance_integration_intents SET status='FAILED',effect_state='EFFECT_UNKNOWN',last_error='AUT02_EFFECT_LEASE_EXPIRED',lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE id=$1`,[row.id]);}
    return rows;
  });
  for(const row of expired)try{if(row.kind==='MERGE_WORK_ITEM')await requestAut02MergeRecovery(row.project_id,row.work_item_id,row.id,`merge-recovery:v1:${row.id}:lease-expired:${row.execution_generation}`);else if(row.kind==='INTEGRATE_CANDIDATE')await requestIntegrationRecovery(row.project_id,row.integration_candidate_id,`aut02-integration-recovery:v1:${row.id}:lease-expired:${row.execution_generation}`,'HANDOFF_CRASH');}catch{}
};

export const reconcileAutomaticAssuranceIntegration=async(limit=25,owner=`aut02-reconciler:${process.pid}`)=>{
  await recoverExpiredEffectIntents();await discoverMissingIntents();const claims=await claimIntents(limit,owner),results:any[]=[];
  for(const intent of claims)try{await processIntent(intent);results.push({id:intent.id,kind:intent.kind,status:'COMPLETED'});}catch(error){const message=error instanceof Error?error.message:String(error),exhausted=Number(intent.attempts)>=maxIntentAttempts(),backoff=intentBackoffs[Math.min(Math.max(Number(intent.attempts)-1,0),intentBackoffs.length-1)];await withTransaction(async client=>{const owned=await client.query(`SELECT * FROM assurance_integration_intents WHERE id=$1 AND lease_token=$2 AND execution_generation=$3 FOR UPDATE`,[intent.id,intent.lease_token,intent.execution_generation]);if(!owned.rowCount)return;await client.query(`UPDATE assurance_integration_intents SET status='FAILED',last_error=$2,available_at=clock_timestamp()+($3*interval '1 second'),lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp(),completed_at=CASE WHEN $4 THEN clock_timestamp() ELSE NULL END WHERE id=$1`,[intent.id,message.slice(0,1000),backoff,exhausted]);if(exhausted){if(intent.work_item_id)await client.query(`UPDATE work_items SET state='BLOCKED',version=version+1 WHERE id=$1 AND state NOT IN ('CANCELLED','INTEGRATED')`,[intent.work_item_id]);if(intent.integration_candidate_id)await client.query(`UPDATE integration_candidates SET state='INTEGRATION_BLOCKED',blocked_kind='AUT02_RETRY_EXHAUSTED',version=version+1 WHERE id=$1 AND state NOT IN ('INTEGRATED','SUPERSEDED')`,[intent.integration_candidate_id]);await event(client,intent.project_id,'AUT02_INTENT_RETRY_EXHAUSTED',intent.correlation_id,{intent_id:intent.id,kind:intent.kind,attempts:intent.attempts,error:message.slice(0,1000),backoff_seconds:backoff},intent.operation_id);}});results.push({id:intent.id,kind:intent.kind,status:'FAILED',error:message,exhausted});}
  return results;
};

export const reemitWorkItemAutomaticIntent=async(projectId:string,workItemId:string,kind:'QA'|'MERGE')=>withTransaction(async client=>{
  const candidate=(await client.query(`SELECT * FROM work_item_delivery_candidates WHERE project_id=$1 AND work_item_id=$2 ORDER BY created_at DESC LIMIT 1`,[projectId,workItemId])).rows[0];if(!candidate)throw new ApiError(409,'AUT02_DELIVERY_CANDIDATE_NOT_FOUND');const intentKind:Aut02IntentKind=kind==='QA'?'RUN_DELIVERY_QA':'MERGE_WORK_ITEM',key=kind==='QA'?`qa:v1:${candidate.id}`:`merge:v1:${candidate.id}`;const existing=(await client.query(`SELECT * FROM assurance_integration_intents WHERE idempotency_key=$1 FOR UPDATE`,[key])).rows[0];if(existing&&existing.status==='FAILED'&&existing.effect_state==='NO_EFFECT'&&Number(existing.attempts)<maxIntentAttempts())await client.query(`UPDATE assurance_integration_intents SET status='PENDING',available_at=clock_timestamp(),last_error=NULL,updated_at=clock_timestamp(),completed_at=NULL WHERE id=$1`,[existing.id]);else if(!existing)await enqueueAut02Intent(client,{projectId,kind:intentKind,idempotencyKey:key,correlationId:candidate.correlation_id,deliveryCandidateId:candidate.id,workItemId,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id});const qa=(await client.query(`SELECT result FROM delivery_qa_reports WHERE delivery_candidate_id=$1`,[candidate.id])).rows[0],merge=(await client.query(`SELECT phase_after_sha FROM work_item_merge_results WHERE delivery_candidate_id=$1 AND state='MERGE_RECORDED'`,[candidate.id])).rows[0];return{status:'ACCEPTED',intent_id:existing?.id??(await client.query(`SELECT id FROM assurance_integration_intents WHERE idempotency_key=$1`,[key])).rows[0].id,authority:AUT02_PIPELINE_VERSION,approved:kind==='QA'?(qa?qa.result==='PASS':undefined):undefined,phase_sha:kind==='MERGE'?merge?.phase_after_sha:undefined};
});

export const reemitCandidateAutomaticIntent=async(projectId:string,candidateId:string,kind:'VALIDATE'|'INTEGRATE')=>withTransaction(async client=>{
  const candidate=(await client.query(`SELECT * FROM integration_candidates WHERE id=$1 AND project_id=$2 AND pipeline_version=$3`,[candidateId,projectId,AUT02_PIPELINE_VERSION])).rows[0];if(!candidate)throw new ApiError(409,'AUT02_CANDIDATE_NOT_FOUND');const intentKind=kind==='VALIDATE'?'VALIDATE_INTEGRATION_CANDIDATE':'INTEGRATE_CANDIDATE',key=kind==='VALIDATE'?`validate:v1:${candidate.id}`:`integrate:v1:${candidate.id}`;const existing=(await client.query(`SELECT * FROM assurance_integration_intents WHERE idempotency_key=$1 FOR UPDATE`,[key])).rows[0];if(existing&&existing.status==='FAILED'&&existing.effect_state==='NO_EFFECT'&&Number(existing.attempts)<maxIntentAttempts())await client.query(`UPDATE assurance_integration_intents SET status='PENDING',available_at=clock_timestamp(),last_error=NULL,completed_at=NULL WHERE id=$1`,[existing.id]);else if(!existing)await enqueueAut02Intent(client,{projectId,kind:intentKind,idempotencyKey:key,correlationId:candidate.correlation_id,moduleId:candidate.module_id,moduleRevisionId:candidate.module_revision_id,moduleRoundId:candidate.module_round_id,integrationCandidateId:candidate.id});return{status:'ACCEPTED',intent_id:existing?.id??(await client.query(`SELECT id FROM assurance_integration_intents WHERE idempotency_key=$1`,[key])).rows[0].id,authority:AUT02_PIPELINE_VERSION};
});

export const reassessProjectAutomaticCandidates=async(projectId:string)=>withTransaction(async client=>{
  const rows=(await client.query(`SELECT DISTINCT dc.module_id,dc.module_revision_id,dc.module_round_id,dc.correlation_id FROM work_item_delivery_candidates dc JOIN work_item_merge_results mr ON mr.delivery_candidate_id=dc.id AND mr.state='MERGE_RECORDED' WHERE dc.project_id=$1 AND dc.state='ACTIVE'`,[projectId])).rows;const intents=[];
  for(const row of rows)intents.push(await enqueueAut02Intent(client,{projectId,kind:'REASSESS_INTEGRATION_CANDIDATE',idempotencyKey:`candidate-reassess-manual:v1:${row.module_revision_id}:${row.module_round_id}`,correlationId:row.correlation_id,moduleId:row.module_id,moduleRevisionId:row.module_revision_id,moduleRoundId:row.module_round_id}));
  return{status:'ACCEPTED',authority:AUT02_PIPELINE_VERSION,intent_ids:intents.map(intent=>intent.id)};
});

export const automaticAssuranceIntegrationProjection=async(projectId:string)=>{
  const [items,candidates]=await Promise.all([
    pool.query(`SELECT dc.work_item_id,dc.id AS delivery_candidate_id,dc.snapshot_hash,dc.head_sha,dc.qa_matrix_hash,dc.state AS snapshot_state,qr.id AS qa_report_id,qr.result AS qa_status,qr.report_hash AS qa_report_hash,a.id AS acceptance_id,a.state AS acceptance_state,r.id AS review_id,rd.decision,mr.id AS merge_result_id,mr.state AS merge_status,cm.candidate_id,ic.manifest_hash AS candidate_manifest_hash,cm.member_index,ic.state AS candidate_status,ia.state AS integration_status,latest.kind AS next_automatic_action,latest.status AS intent_status,latest.last_error AS stop_reason
      FROM work_item_delivery_candidates dc LEFT JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id LEFT JOIN work_acceptances a ON a.delivery_candidate_id=dc.id LEFT JOIN LATERAL (SELECT * FROM assurance_reviews WHERE acceptance_id=a.id ORDER BY version DESC LIMIT 1) r ON true LEFT JOIN review_decisions rd ON rd.review_id=r.id LEFT JOIN work_item_merge_results mr ON mr.delivery_candidate_id=dc.id LEFT JOIN integration_candidate_members cm ON cm.delivery_candidate_id=dc.id LEFT JOIN integration_candidates ic ON ic.id=cm.candidate_id LEFT JOIN integration_attempts ia ON ia.candidate_id=ic.id LEFT JOIN LATERAL (SELECT * FROM assurance_integration_intents WHERE delivery_candidate_id=dc.id OR integration_candidate_id=ic.id ORDER BY created_at DESC LIMIT 1) latest ON true WHERE dc.project_id=$1 ORDER BY dc.created_at,dc.work_item_id`,[projectId]),
    pool.query(`SELECT c.id,c.module_id,c.module_revision_id,c.module_round_id,c.generation,c.manifest_hash,c.state,c.blocked_kind,count(cm.*)::int AS member_count,count(*) FILTER(WHERE w.state IN ('READY_FOR_INTEGRATION','INTEGRATING','INTEGRATED'))::int AS ready_member_count,vr.result AS validation_status,ia.state AS integration_status FROM integration_candidates c LEFT JOIN integration_candidate_members cm ON cm.candidate_id=c.id LEFT JOIN work_items w ON w.id=cm.work_item_id LEFT JOIN integration_candidate_validation_reports vr ON vr.candidate_id=c.id LEFT JOIN integration_attempts ia ON ia.candidate_id=c.id WHERE c.project_id=$1 AND c.pipeline_version=$2 GROUP BY c.id,vr.result,ia.state ORDER BY c.created_at DESC`,[projectId,AUT02_PIPELINE_VERSION])
  ]);return{pipeline_version:AUT02_PIPELINE_VERSION,work_items:items.rows,candidates:candidates.rows};
};
