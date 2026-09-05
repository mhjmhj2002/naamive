import { randomUUID } from 'node:crypto';
import { withTransaction } from './db.js';
import { config } from './config.js';
import type { CodexOperationalEvent } from './codex-events.js';

// Development has the same deliberately small JSONL contract as planning.  In
// particular, this module never receives a prompt, an agent message, tool
// arguments, stderr, or a source-file payload.
const emit = (c:any, job:any, type:string, payload:object) => c.query(
  `INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id)
   VALUES($1,$2,$3,$4,$5,$6,$7)`,
  [job.project_id,type,randomUUID(),job.operation_id,job.id,payload,config().operatorId]);

export const developmentHealth = (job:any) => {
  if(job.status !== 'LEASED') return 'QUEUED';
  const signal=Date.parse(job.last_signal_at ?? ''), age=Number.isFinite(signal) ? Date.now()-signal : Infinity;
  return age > config().agentTimeoutSeconds*1000 ? 'DEGRADED' : age > config().agentHeartbeatSeconds*2000 ? 'ALIVE_NO_PROGRESS' : 'ALIVE';
};

export const createDevelopmentTelemetrySink = (job:any) => {
  let sequence=0;
  const operational = async (event:CodexOperationalEvent) => withTransaction(async c=>{
    sequence++;
    await c.query(`UPDATE jobs SET last_signal_at=clock_timestamp(),last_operational_event_at=clock_timestamp(),operational_event_count=operational_event_count+1 WHERE id=$1 AND status='LEASED'`,[job.id]);
    await emit(c,job,'DEVELOPMENT_TELEMETRY_EVENT',{delivery_id:job.delivery_id,sequence,event_type:event.type});
  });
  const discarded = async (reason:string) => withTransaction(async c=>{
    await c.query(`UPDATE jobs SET discarded_event_count=discarded_event_count+1 WHERE id=$1 AND status='LEASED'`,[job.id]);
    await emit(c,job,'DEVELOPMENT_TELEMETRY_DISCARDED',{delivery_id:job.delivery_id,reason:String(reason).replace(/[\x00-\x1f\x7f]/g,' ').slice(0,100)});
  });
  const heartbeat = async () => withTransaction(async c=>{
    await c.query(`UPDATE jobs SET heartbeat_at=clock_timestamp(),last_signal_at=clock_timestamp() WHERE id=$1 AND status='LEASED'`,[job.id]);
    await emit(c,job,'DEVELOPMENT_TELEMETRY_HEARTBEAT',{delivery_id:job.delivery_id});
  });
  return { operational, discarded, heartbeat };
};

export const persistDevelopmentFailureEvidence = async (c:any, job:any, code:string) => {
  const delivery=(await c.query(`SELECT d.id,d.base_sha,d.head_sha,t.state AS worktree_state FROM deliveries d LEFT JOIN worktrees t ON t.id=d.worktree_id WHERE d.id=$1`,[job.delivery_id])).rows[0] ?? {};
  const report={schema_version:1,job_id:job.id,operation_id:job.operation_id,delivery_id:job.delivery_id,code:String(code).slice(0,120),last_signal_at:job.last_signal_at??null,worktree_state:delivery.worktree_state??'UNKNOWN',base_sha:delivery.base_sha??null,head_sha:delivery.head_sha??null,attempt:Number(job.attempts),next_action:'RETRY_DEVELOP_WORK_ITEM'};
  const { putArtifact } = await import('./artifacts.js');
  const json=JSON.stringify(report), artifact=await putArtifact(c,job.project_id,'development-failure-report',json,job.operation_id);
  await putArtifact(c,job.project_id,'development-failure-report-markdown',`# development-failure-report\n\n\`\`\`json\n${JSON.stringify(report,null,2)}\n\`\`\`\n`,job.operation_id);
  await emit(c,job,'DEVELOPMENT_FAILED',{delivery_id:job.delivery_id,code:report.code,evidence_hash:artifact.hash,next_action:report.next_action});
};
