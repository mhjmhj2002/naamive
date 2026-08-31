import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';

/** TST-01 selects v2 only for newly published plan revisions.  V1 rows remain
 * historical data and are never upgraded or resumed as a v2 execution. */
export const AUT02_PIPELINE_VERSION='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2';
export const AUT02_POLICY_VERSION='AUT-02:v2';
export const AUT02_V1_PIPELINE_VERSION='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1';
export const AUT02_V1_POLICY_VERSION='AUT-02:v1';

const canonicalJson=(value:unknown):string=>{
  const normalize=(item:any):any=>Array.isArray(item)?item.map(normalize):item&&typeof item==='object'?Object.fromEntries(Object.keys(item).sort().map(key=>[key,normalize(item[key])])):item;
  return JSON.stringify(normalize(value));
};
const aut03CandidateFingerprint=(candidate:any)=>createHash('sha256').update(canonicalJson({delivery_candidate_id:candidate.id,work_item_revision_id:candidate.work_item_revision_id,module_plan_revision_id:candidate.module_plan_revision_id,plan_work_item_id:candidate.plan_work_item_id,module_revision_id:candidate.module_revision_id,module_round_id:candidate.module_round_id,base_sha:candidate.base_sha,head_sha:candidate.head_sha,snapshot_hash:candidate.snapshot_hash})).digest('hex');

export type Aut02IntentKind='RUN_DELIVERY_QA'|'START_INDEPENDENT_REVIEW'|'MERGE_WORK_ITEM'|'REASSESS_INTEGRATION_CANDIDATE'|'VALIDATE_INTEGRATION_CANDIDATE'|'INTEGRATE_CANDIDATE'|'SCHEDULE_REWORK'|'MACRO_REEVALUATE';

const destinations:Record<Aut02IntentKind,string>={
  RUN_DELIVERY_QA:'DELIVERY_QA',START_INDEPENDENT_REVIEW:'ASSURANCE',MERGE_WORK_ITEM:'GIT_PHASE',
  REASSESS_INTEGRATION_CANDIDATE:'INTEGRATION_CANDIDATE',VALIDATE_INTEGRATION_CANDIDATE:'INTEGRATION_CANDIDATE',
  INTEGRATE_CANDIDATE:'GIT_INTEGRATION',SCHEDULE_REWORK:'AUT01',MACRO_REEVALUATE:'LR02'
};

export const enqueueAut02Intent=async(client:PoolClient,input:{
  projectId:string;kind:Aut02IntentKind;idempotencyKey:string;correlationId:string;
  deliveryCandidateId?:string|null;workItemId?:string|null;moduleId?:string|null;
  moduleRevisionId?:string|null;moduleRoundId?:string|null;integrationCandidateId?:string|null;
  payload?:Record<string,unknown>;evidenceRefs?:string[];
})=>{
  const id=randomUUID();
  await client.query(`INSERT INTO assurance_integration_intents(
    id,project_id,destination,kind,delivery_candidate_id,work_item_id,module_id,module_revision_id,module_round_id,
    integration_candidate_id,payload,evidence_refs,correlation_id,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)
    ON CONFLICT(idempotency_key) DO NOTHING`,[
    id,input.projectId,destinations[input.kind],input.kind,input.deliveryCandidateId??null,input.workItemId??null,
    input.moduleId??null,input.moduleRevisionId??null,input.moduleRoundId??null,input.integrationCandidateId??null,
    input.payload??{},JSON.stringify(input.evidenceRefs??[]),input.correlationId,input.idempotencyKey
  ]);
  return (await client.query(`SELECT * FROM assurance_integration_intents WHERE idempotency_key=$1`,[input.idempotencyKey])).rows[0];
};

/**
 * Bridges the existing Assurance authority to AUT-02 without changing legacy
 * acceptances.  The review decision and this handoff share one transaction.
 */
export const recordAut02ReviewDecision=async(client:PoolClient,input:{
  acceptanceId:string;reviewId:string;reviewDecisionId:string;decision:'ACCEPT'|'REWORK'|'BLOCK'|'ESCALATE';correlationId:string;
})=>{
  const row=(await client.query(`SELECT dc.*,w.state AS work_item_state,m.current_revision_id,qr.result AS qa_result,
      s.id AS assurance_dispatch_snapshot_id,s.subject_kind,s.subject_id,s.normative_generation,s.lineage_fingerprint AS assurance_lineage_fingerprint,s.module_plan_revision_id AS assurance_plan_revision_id,s.plan_work_item_id AS assurance_plan_work_item_id,s.work_item_id AS assurance_work_item_id
    FROM work_acceptances a
    JOIN work_item_delivery_candidates dc ON dc.id=a.delivery_candidate_id
    JOIN work_items w ON w.id=dc.work_item_id
    JOIN modules m ON m.id=dc.module_id
    JOIN delivery_qa_reports qr ON qr.delivery_candidate_id=dc.id
    LEFT JOIN assurance_dispatch_snapshots s ON s.id=a.assurance_dispatch_snapshot_id
    WHERE a.id=$1 FOR UPDATE OF w,m`,[input.acceptanceId])).rows[0];
  if(!row)return null;
  if(row.current_revision_id!==row.module_revision_id||row.state!=='ACTIVE'){
    await client.query(`UPDATE work_item_delivery_candidates SET state='SUPERSEDED' WHERE id=$1 AND state='ACTIVE'`,[row.id]);
    return {superseded:true};
  }
  if(row.assurance_dispatch_snapshot_id) {
    const stale=row.subject_kind!=='WorkItemDeliveryCandidate:v1'||row.subject_id!==row.id||row.normative_generation!==row.id||
      row.assurance_work_item_id!==row.work_item_id||row.assurance_plan_revision_id!==row.module_plan_revision_id||row.assurance_plan_work_item_id!==row.plan_work_item_id||
      row.assurance_lineage_fingerprint!==aut03CandidateFingerprint(row);
    if(stale) {
      await client.query(`UPDATE work_item_delivery_candidates SET state='SUPERSEDED' WHERE id=$1 AND state='ACTIVE'`,[row.id]);
      await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'STALE_ASSURANCE_SUBJECT',$2,$3,'system:aut02')`,[row.project_id,input.correlationId,{acceptance_id:input.acceptanceId,snapshot_id:row.assurance_dispatch_snapshot_id,delivery_candidate_id:row.id}]);
      return {stale:true};
    }
  }
  const pipelineKey=row.pipeline_version===AUT02_V1_PIPELINE_VERSION?'v1':'v2';
  if(input.decision==='ACCEPT'){
    if(row.qa_result!=='PASS')throw new Error('AUT02_ACCEPT_WITHOUT_QA_PASS');
    await client.query(`UPDATE work_items SET state='ACCEPTED',version=version+1 WHERE id=$1 AND workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 AND state IN ('INDEPENDENT_REVIEW','WAITING_FOR_INDEPENDENT_REVIEWER')`,[row.work_item_id]);
    await enqueueAut02Intent(client,{projectId:row.project_id,kind:'MERGE_WORK_ITEM',idempotencyKey:`merge:${pipelineKey}:${row.id}`,correlationId:input.correlationId,deliveryCandidateId:row.id,workItemId:row.work_item_id,moduleId:row.module_id,moduleRevisionId:row.module_revision_id,moduleRoundId:row.module_round_id,evidenceRefs:[`qa_report:${row.id}`,`work_acceptance:${input.acceptanceId}`,`assurance_review:${input.reviewId}`,`review_decision:${input.reviewDecisionId}`]});
  }else if(input.decision==='REWORK'){
    await client.query(`UPDATE work_items SET state='REWORK_REQUIRED',version=version+1 WHERE id=$1 AND workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 AND state NOT IN ('CANCELLED','INTEGRATED')`,[row.work_item_id]);
    await enqueueAut02Intent(client,{projectId:row.project_id,kind:'SCHEDULE_REWORK',idempotencyKey:`schedule-rework:v1:${row.id}:${input.reviewDecisionId}`,correlationId:input.correlationId,deliveryCandidateId:row.id,workItemId:row.work_item_id,moduleId:row.module_id,moduleRevisionId:row.module_revision_id,moduleRoundId:row.module_round_id,evidenceRefs:[`review_decision:${input.reviewDecisionId}`]});
  }else if(input.decision==='BLOCK'){
    await client.query(`UPDATE work_items SET state='BLOCKED',version=version+1 WHERE id=$1 AND workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 AND state NOT IN ('CANCELLED','INTEGRATED')`,[row.work_item_id]);
  }else{
    await client.query(`UPDATE work_items SET state='WAITING_FOR_ESCALATION',version=version+1 WHERE id=$1 AND workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 AND state NOT IN ('CANCELLED','INTEGRATED')`,[row.work_item_id]);
  }
  return {workItemId:row.work_item_id,deliveryCandidateId:row.id};
};
