import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { config } from './config.js';
import { pool, withTransaction } from './db.js';

export const ELIGIBILITY_PREDICATE_VERSION='WORK_ITEM_DELIVERY:v2/eligibility/v1';
export type SchedulingReason='BLOCKED_EXTERNAL_INPUT'|'WAITING_DEPENDENCIES'|'WAITING_CAPACITY'|'ACTIVE_ATTEMPT_EXISTS'|'PAUSED'|'NOT_ELIGIBLE'|'ELIGIBLE'|'DISPATCHED';

const activeDelivery="d.state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS')";
const record=async(c:any, projectId:string, workItemId:string, trigger:string, decision:SchedulingReason, details:object={}, refs:{dispatchKey?:string;operationId?:string;deliveryId?:string;jobId?:string}={})=>{
  await c.query(`INSERT INTO work_item_scheduling_decisions(id,project_id,work_item_id,trigger_code,decision_code,predicate_version,dispatch_key,operation_id,delivery_id,job_id,details)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,[randomUUID(),projectId,workItemId,trigger,decision,ELIGIBILITY_PREDICATE_VERSION,refs.dispatchKey??null,refs.operationId??null,refs.deliveryId??null,refs.jobId??null,JSON.stringify(details)]);
};

const dependenciesSatisfied=async(c:any,item:any)=>{
  const refs=Array.isArray(item.payload?.depends_on_ids)?item.payload.depends_on_ids.filter((x:any)=>typeof x==='string'):[];
  if(!refs.length)return true;
  const rows=(await c.query(`SELECT id,state FROM work_items WHERE project_id=$1 AND module_id=$2
    AND (id::text=ANY($3::text[]) OR payload->>'work_item_id'=ANY($3::text[])) FOR SHARE`,[item.project_id,item.module_id,refs])).rows;
  // AUT-02 owns acceptance and integration.  Until it records the v2 terminal
  // integration evidence, even a successful legacy execution cannot release a dependent.
  return rows.length===refs.length&&rows.every((row:any)=>row.state==='INTEGRATED');
};

type ReservationHook=(client:any,refs:{operation_id:string;delivery_id:string;job_id:string})=>Promise<void>;

export const scheduleWorkItem=async(projectId:string,workItemId:string,trigger='RECONCILE',afterReservation?:ReservationHook)=>withTransaction(async c=>{
  const item=(await c.query(`SELECT w.*,p.repository_path,p.initial_sha FROM work_items w JOIN projects p ON p.id=w.project_id WHERE w.id=$1 AND w.project_id=$2 FOR UPDATE`,[workItemId,projectId])).rows[0];
  if(!item) return {reason:'NOT_ELIGIBLE' as SchedulingReason};
  if(item.workflow_code!=='WORK_ITEM_DELIVERY'||Number(item.workflow_version)!==2){
    await record(c,projectId,workItemId,trigger,item.state==='PAUSED'?'PAUSED':'NOT_ELIGIBLE',{state:item.state,workflow_code:item.workflow_code,workflow_version:item.workflow_version});
    return {reason:item.state==='PAUSED'?'PAUSED' as SchedulingReason:'NOT_ELIGIBLE' as SchedulingReason};
  }
  const blockers=(await c.query(`SELECT count(*)::int n FROM work_item_external_blockers WHERE work_item_id=$1 AND state='ACTIVE'`,[workItemId])).rows[0].n;
  if(blockers){await record(c,projectId,workItemId,trigger,'BLOCKED_EXTERNAL_INPUT',{active_blockers:blockers});return{reason:'BLOCKED_EXTERNAL_INPUT' as SchedulingReason};}
  if(item.state==='WAITING_FOR_DEPENDENCIES'){
    if(!await dependenciesSatisfied(c,item)){await record(c,projectId,workItemId,trigger,'WAITING_DEPENDENCIES');return{reason:'WAITING_DEPENDENCIES' as SchedulingReason};}
    await c.query(`UPDATE work_items SET state='ELIGIBLE_FOR_DISPATCH',version=version+1 WHERE id=$1`,[workItemId]);
    item.state='ELIGIBLE_FOR_DISPATCH';item.version=Number(item.version)+1;
    await record(c,projectId,workItemId,trigger,'ELIGIBLE',{dependencies_satisfied:true});
  }
  if(item.state!=='ELIGIBLE_FOR_DISPATCH'){
    await record(c,projectId,workItemId,trigger,item.state==='PAUSED'?'PAUSED':'NOT_ELIGIBLE',{state:item.state});
    return {reason:item.state==='PAUSED'?'PAUSED' as SchedulingReason:'NOT_ELIGIBLE' as SchedulingReason};
  }
  if(!await dependenciesSatisfied(c,item)){await record(c,projectId,workItemId,trigger,'WAITING_DEPENDENCIES');return{reason:'WAITING_DEPENDENCIES' as SchedulingReason};}
  const existing=(await c.query(`SELECT id FROM deliveries d WHERE d.work_item_id=$1 AND ${activeDelivery} FOR UPDATE`,[workItemId])).rows[0];
  if(existing){await record(c,projectId,workItemId,trigger,'ACTIVE_ATTEMPT_EXISTS',{delivery_id:existing.id});return{reason:'ACTIVE_ATTEMPT_EXISTS' as SchedulingReason};}
  // A transaction-scoped PostgreSQL lock is the authority for the global slot:
  // two rows can never both observe the final free slot and reserve it.
  await c.query(`SELECT pg_advisory_xact_lock(hashtext('naamive-development-capacity'))`);
  const capacity=config().developmentMaxConcurrency;
  const used=Number((await c.query(`SELECT count(*)::int n FROM deliveries d WHERE ${activeDelivery}`)).rows[0].n);
  if(used>=capacity){await record(c,projectId,workItemId,trigger,'WAITING_CAPACITY',{capacity,used});return{reason:'WAITING_CAPACITY' as SchedulingReason};}
  const dispatchKey=`${ELIGIBILITY_PREDICATE_VERSION}:${item.revision_id}:${item.version}`;
  const already=(await c.query(`SELECT operation_id,delivery_id,job_id FROM work_item_scheduling_decisions WHERE work_item_id=$1 AND dispatch_key=$2 AND decision_code='DISPATCHED'`,[workItemId,dispatchKey])).rows[0];
  if(already){await record(c,projectId,workItemId,trigger,'ACTIVE_ATTEMPT_EXISTS',{replayed_dispatch_key:dispatchKey}, {dispatchKey,operationId:already.operation_id,deliveryId:already.delivery_id,jobId:already.job_id});return{reason:'ACTIVE_ATTEMPT_EXISTS' as SchedulingReason};}
  const operationId=randomUUID(),deliveryId=randomUUID(),worktreeId=randomUUID(),jobId=randomUUID(),correlation=randomUUID();
  const worktree=join(item.repository_path,'.naamive-worktrees',worktreeId),branch=`work-items/${workItemId}`;
  await c.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id) VALUES($1,$2,'SCHEDULE_DEVELOPMENT','QUEUED',$3,$4)`,[operationId,projectId,`schedule:${workItemId}:${dispatchKey}`,correlation]);
  await c.query(`INSERT INTO worktrees(id,project_id,work_item_id,path,branch,base_sha,lease_expires_at,state) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()+interval '10 minutes','RESERVED')`,[worktreeId,projectId,workItemId,worktree,branch,item.initial_sha]);
  await c.query(`INSERT INTO deliveries(id,project_id,work_item_id,revision_id,worktree_id,base_sha,qa_matrix,technology_baseline_revision_id,state) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'RESERVED')`,[deliveryId,projectId,workItemId,item.revision_id,worktreeId,item.initial_sha,JSON.stringify(Array.isArray(item.payload?.qa_matrix)?item.payload.qa_matrix:[]),item.technology_baseline_revision_id]);
  await c.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,delivery_id,kind,idempotency_key,technology_baseline_revision_id,metadata) VALUES($1,$2,$3,NULL,$4,'DEVELOP_WORK_ITEM',$5,$6,'{}')`,[jobId,operationId,projectId,deliveryId,`development:${deliveryId}`,item.technology_baseline_revision_id]);
  await c.query(`UPDATE deliveries SET job_id=$2 WHERE id=$1`,[deliveryId,jobId]);
  await c.query(`UPDATE work_items SET state='DISPATCHED',version=version+1 WHERE id=$1`,[workItemId]);
  await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version) VALUES($1,'WORK_ITEM_SCHEDULED',$2,$3,$4,$5,$6,$7,$8)`,[projectId,correlation,operationId,jobId,{work_item_id:workItemId,delivery_id:deliveryId,job_id:jobId,dispatch_key:dispatchKey,predicate_version:ELIGIBILITY_PREDICATE_VERSION},config().operatorId,item.workflow_code,item.workflow_version]);
  await record(c,projectId,workItemId,trigger,'DISPATCHED',{capacity,used_before:used},{dispatchKey,operationId,deliveryId,jobId});
  await afterReservation?.(c,{operation_id:operationId,delivery_id:deliveryId,job_id:jobId});
  return {reason:'DISPATCHED' as SchedulingReason,operation_id:operationId,delivery_id:deliveryId,job_id:jobId};
});

export const scheduleEligibleWorkItems=async(trigger='RECONCILE',limit=100)=>{
  const candidates=(await pool.query(`SELECT id,project_id FROM work_items WHERE workflow_code='WORK_ITEM_DELIVERY' AND workflow_version=2 AND state='ELIGIBLE_FOR_DISPATCH' ORDER BY created_at,id LIMIT $1`,[limit])).rows;
  return Promise.all(candidates.map((row:any)=>scheduleWorkItem(row.project_id,row.id,trigger)));
};

/** Safety net only: events call scheduleWorkItem; recovery merely rediscovers
 * eligible rows left behind by a process crash or a lost event. */
export const reconcileEligibilityScheduler=()=>scheduleEligibleWorkItems('RECONCILE');
