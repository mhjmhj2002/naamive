import { createHash, randomUUID } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { ApiError } from './service.js';
import { putArtifact } from './artifacts.js';

const VERSION='development-runtime/v1', forbidden=/(path|uri|secret|token|prompt|command|stdout|stderr|content)/i;
const errors:Record<string,[string,string]>={WORKER_FAILED:['WORKER_FAILED','Worker encerrou com falha.'],AGENT_TIMEOUT:['AGENT_TIMEOUT','Agente excedeu o tempo permitido.'],EVIDENCE_INVALID:['EVIDENCE_INVALID','Evidência não passou na validação.'],RUNTIME_INCONSISTENCY:['RUNTIME_INCONSISTENCY','Estados do runtime exigem reconciliação.'],NO_SIGNAL:['NO_SIGNAL','Worker sem sinal recente.']};
const matrix:Record<string,[string,string,string]>={
 'PENDING|RESERVED|RESERVED|WAITING_FOR_WORK_ITEM_AUTHORIZATION':['QUEUED','HEALTHY','WAIT_FOR_WORKER'],
 'LEASED|PREPARING|RESERVED|DEVELOPMENT_IN_PROGRESS':['PREPARING_WORKTREE','HEALTHY','WAIT_FOR_WORKER'],
 'LEASED|DISPATCHED|PREPARED|DEVELOPMENT_IN_PROGRESS':['DISPATCHING_AGENT','HEALTHY','WAIT_FOR_AGENT'],
 'LEASED|RUNNING|ACTIVE|DEVELOPMENT_IN_PROGRESS':['EXECUTING_AGENT','HEALTHY','WAIT_FOR_AGENT'],
 'COMPLETED|DEVELOPMENT_IN_PROGRESS|ACTIVE|DEVELOPMENT_IN_PROGRESS':['VALIDATING_EVIDENCE','DEGRADED','DIAGNOSE_RUNTIME_AND_RECONCILE'],
 'COMPLETED|EVIDENCE_REVIEW|ACTIVE|QA_IN_PROGRESS':['READY_FOR_QA','HEALTHY','SUBMIT_QA'],
 'RETRYABLE|RESERVED|PREPARED|WAITING_FOR_WORK_ITEM_AUTHORIZATION':['RETRY_SCHEDULED','DEGRADED','RETRY_GOVERNED_COMMAND'],
 'FAILED|FAILED|RELEASED|REWORK_ELIGIBLE':['FAILED','FAILED','RETRY_GOVERNED_COMMAND'],
 'COMPLETED|QA_APPROVED|ACTIVE|READY_FOR_PHASE_MERGE':['QA_APPROVED','HEALTHY','MERGE_TO_PHASE'],
 'COMPLETED|QA_REJECTED|RELEASED|REWORK_ELIGIBLE':['QA_REJECTED','DEGRADED','RETRY_GOVERNED_COMMAND']
};
const iso=(x:any)=>x?new Date(x).toISOString():null;
export const developmentRuntimeSanitize=(value:any):any=>{const walk=(v:any):void=>{if(typeof v==='string'&&v!==VERSION&&(/\//.test(v)||/\w+:\/\//.test(v)||forbidden.test(v)))throw new Error('RUNTIME_VALUE_FORBIDDEN');if(v&&typeof v==='object'){for(const [k,x] of Object.entries(v)){if(forbidden.test(k))throw new Error('RUNTIME_VALUE_FORBIDDEN');walk(x);}}};walk(value);return value;};
const inconsistency=(workItemId:string,row:any,rule:string)=>({rule_code:rule,stage:'INCONSISTENT_TERMINAL_STATE',health:'DEGRADED',next_action:'DIAGNOSE_RUNTIME_AND_RECONCILE',delivery_id:row?.delivery_id??null,worktree_id:row?.worktree_id??null,job_id:row?.job_id??null});
export const developmentRuntime=async(projectId:string,workItemId:string)=>{
 const wi=(await pool.query(`SELECT id,state FROM work_items WHERE id=$1 AND project_id=$2`,[workItemId,projectId])).rows[0];if(!wi)throw new ApiError(404,'WORK_ITEM_NOT_FOUND');
 const rows=(await pool.query(`SELECT d.id delivery_id,d.project_id delivery_project_id,d.worktree_id,d.state delivery_state,d.created_at delivery_created_at,t.state worktree_state,t.project_id worktree_project_id,t.work_item_id worktree_work_item_id,j.id job_id,j.project_id job_project_id,j.status job_status,j.available_at,j.completed_at,j.last_signal_at,j.last_error,j.metadata FROM deliveries d LEFT JOIN worktrees t ON t.id=d.worktree_id LEFT JOIN jobs j ON j.delivery_id=d.id AND j.kind='DEVELOP_WORK_ITEM' WHERE d.work_item_id=$1 ORDER BY d.created_at DESC,d.id DESC,j.available_at DESC,j.id DESC`,[workItemId])).rows;
 if(!rows.length)return {schema_version:VERSION,work_item_id:workItemId,attempt:null,inconsistency:null,history:[],diagnostic_id:null};
 const leases=rows.filter((r:any)=>r.job_status==='LEASED'); let selected=rows.find((r:any)=>!['FAILED','QA_APPROVED','QA_REJECTED','DISCARDED'].includes(r.delivery_state))??rows[0];
 const history=(await pool.query(`SELECT $1::uuid delivery_id,j.id job_id,j.status job_status,j.completed_at FROM jobs j WHERE j.delivery_id=$1 AND j.kind='DEVELOP_WORK_ITEM' AND j.status IN ('COMPLETED','FAILED') AND j.id<>$2 ORDER BY j.completed_at DESC,j.id DESC LIMIT 3`,[selected.delivery_id,selected.job_id??'00000000-0000-0000-0000-000000000000'])).rows.map((x:any)=>({...x,completed_at:iso(x.completed_at)}));
 let rule=leases.length>=2?'MULTIPLE_LEASED_JOBS':!selected.job_id?'DELIVERY_JOB_MISSING':!selected.worktree_id?'DELIVERY_WORKTREE_MISSING':selected.delivery_project_id!==projectId||selected.worktree_project_id!==projectId||selected.worktree_work_item_id!==workItemId||selected.job_project_id!==projectId?'CROSSED_RUNTIME_RELATION':null;
 const build=selected.metadata?.build_id??null; if(!rule&&['LEASED','COMPLETED','FAILED'].includes(selected.job_status)&&(!build||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(build)))rule='BUILD_ID_MISSING';
 const key=`${selected.job_status}|${selected.delivery_state}|${selected.worktree_state}|${wi.state}`; let stage:any,health:any,next:any,error:any=null;
 if(!rule&&selected.job_status==='LEASED'&&selected.delivery_state==='RUNNING'&&selected.worktree_state==='ACTIVE'&&wi.state==='DEVELOPMENT_IN_PROGRESS'){if(!selected.last_signal_at)rule='SIGNAL_MISSING';else if(Date.now()-Date.parse(selected.last_signal_at)>120000){stage='NO_RECENT_SIGNAL';health='DEGRADED';next='DIAGNOSE_RUNTIME_AND_RECONCILE';error={code:errors.NO_SIGNAL[0],message:errors.NO_SIGNAL[1]};}}
 if(!rule&&!stage){const m=matrix[key];if(!m)rule='UNLISTED_STATE_COMBINATION';else [stage,health,next]=m;}
 if(rule){stage='INCONSISTENT_TERMINAL_STATE';health='DEGRADED';next='DIAGNOSE_RUNTIME_AND_RECONCILE';error={code:errors.RUNTIME_INCONSISTENCY[0],message:errors.RUNTIME_INCONSISTENCY[1]};}
 else if(selected.job_status==='FAILED')error={code:errors.WORKER_FAILED[0],message:errors.WORKER_FAILED[1]};
 const attempt={delivery_id:selected.delivery_id,worktree_id:selected.worktree_id,job_id:selected.job_id,delivery_state:selected.delivery_state,worktree_state:selected.worktree_state,work_item_state:wi.state,job_status:selected.job_status,stage,health,next_action:next,created_at:iso(selected.delivery_created_at),last_signal_at:iso(selected.last_signal_at),error,build_id:build};
 const inc=rule?inconsistency(workItemId,selected,rule):null;
 // I01 must never publish a partial or malformed attempt.  M12 is the sole
 // exception: all three correlated IDs are known and its explicit purpose is
 // to surface the missing runtime signal for that attempt.
 const publicAttempt=inc&&rule!=='SIGNAL_MISSING'?null:attempt;
 const result:any={schema_version:VERSION,work_item_id:workItemId,attempt:publicAttempt,inconsistency:inc,history,diagnostic_id:null};
 if(inc){const fingerprint=createHash('sha256').update(`${VERSION}|${workItemId}|${inc.rule_code}|${inc.delivery_id??'null'}|${inc.job_id??'null'}|${publicAttempt?.delivery_state??'null'}|${publicAttempt?.worktree_state??'null'}|${publicAttempt?.work_item_state??'null'}|${publicAttempt?.job_status??'null'}`).digest('hex');const known=(await pool.query(`SELECT id FROM runtime_diagnostics WHERE work_item_id=$1 AND fingerprint=$2`,[workItemId,fingerprint])).rows[0];result.diagnostic_id=known?.id??randomUUID();}
 try{developmentRuntimeSanitize(result);}catch{result.attempt=null;result.inconsistency=inconsistency(workItemId,null,'SANITIZATION_REJECTED');result.diagnostic_id=randomUUID();}return result;
};
export const detectDevelopmentRuntimeInconsistencies=async()=>{const items=(await pool.query(`SELECT DISTINCT d.project_id,d.work_item_id FROM deliveries d`)).rows;for(const x of items){const r=await developmentRuntime(x.project_id,x.work_item_id);if(!r.inconsistency)continue;const i=r.inconsistency,a=r.attempt;const fingerprint=createHash('sha256').update(`${VERSION}|${x.work_item_id}|${i.rule_code}|${i.delivery_id??'null'}|${i.job_id??'null'}|${a?.delivery_state??'null'}|${a?.worktree_state??'null'}|${a?.work_item_state??'null'}|${a?.job_status??'null'}`).digest('hex'),id=randomUUID();await withTransaction(async c=>{const ins=await c.query(`INSERT INTO runtime_diagnostics(id,work_item_id,fingerprint,rule_code,state_version) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,[id,x.work_item_id,fingerprint,i.rule_code,VERSION]);if(!ins.rowCount)return;const artifact=await putArtifact(c,x.project_id,'development-runtime-diagnostic',JSON.stringify({contract:VERSION,fingerprint,diagnostic_id:id,work_item_id:x.work_item_id,rule_code:i.rule_code}));await c.query(`UPDATE artifacts SET metadata=$2::jsonb WHERE id=$1`,[artifact.id,JSON.stringify({contract:VERSION,fingerprint,diagnostic_id:id})]);await c.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'DEVELOPMENT_RUNTIME_INCONSISTENT',$2,$3,$4)`,[x.project_id,randomUUID(),{work_item_id:x.work_item_id,diagnostic_id:id,fingerprint,rule_code:i.rule_code},'runtime-detector']);});}};
