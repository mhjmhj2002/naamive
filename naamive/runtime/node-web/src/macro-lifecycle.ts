import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool, withTransaction } from './db.js';
import { config } from './config.js';

export const MACRO_AGGREGATION_POLICY='MACRO_AGGREGATION:PROJECT_DISCOVERY:4:MODULE_DELIVERY:2:v1';
export const COMMITTED_MODULE_EVOLUTION_POLICY='COMMITTED_MODULE_EVOLUTION_POLICY:v1';

export type MacroDecisionType='FORWARD_TRANSITION'|'REOPEN_TRANSITION'|'NO_CHANGE'|'INVALID';
export type MacroDecision={
  type:MacroDecisionType;
  targetState?:string;
  trigger?:string;
  reason:string;
  reopeningReason?:string;
  evidenceRefs:string[];
};
export type WorkItemFacts={
  workflowCode:string;
  workflowVersion:number;
  required:boolean;
  acceptanceAccepted:boolean;
  integrationAccepted:boolean;
  validAttempt:boolean;
  openFinding:boolean;
  activeRecovery:boolean;
  activeRework:boolean;
  activeBlocker:boolean;
};
export type ModuleFacts={
  kind:'MODULE'; workflowCode:string; workflowVersion:number; state:string;
  definitionAccepted:boolean; architectureAccepted:boolean; planningStarted:boolean;
  planProposed:boolean; planAccepted:boolean; workItems:WorkItemFacts[];
  integrationComplete:boolean; validationComplete:boolean; projectDelivered:boolean;
  explicitReopening?:'PRODUCT_COMMITMENT_EVOLUTION'|'PERTINENT_FINDING'|'RECOVERY_REWORK';
  evidenceRefs:string[];
};
export type RequiredModuleFacts={
  moduleKey:string; required:boolean; materialized:boolean; scopeChangePending:boolean;
  implementationStarted:boolean; integrationComplete:boolean; validationComplete:boolean;
};
export type ProjectFacts={
  kind:'PROJECT'; workflowCode:string; workflowVersion:number; state:string;
  analysisAccepted:boolean; commitmentReady:boolean; commitmentApproved:boolean;
  architectureAccepted:boolean; projectPlanAccepted:boolean; deliveryAccepted:boolean;
  commitmentMaterializationComplete:boolean; obligationProjectionPending:boolean;
  requiredModules:RequiredModuleFacts[];
  explicitReopening?:'PRODUCT_COMMITMENT_EVOLUTION'|'PERTINENT_FINDING'|'RECOVERY_REWORK';
  evidenceRefs:string[];
};

const decision=(type:MacroDecisionType,reason:string,evidenceRefs:string[],targetState?:string,trigger?:string,reopeningReason?:string):MacroDecision=>
  ({type,reason,evidenceRefs,targetState,trigger,reopeningReason});

export const workItemNormativelySatisfied=(facts:WorkItemFacts)=>facts.required
  &&facts.workflowCode==='WORK_ITEM_DELIVERY'&&facts.workflowVersion===2
  &&facts.acceptanceAccepted&&facts.integrationAccepted
  &&!facts.openFinding&&!facts.activeRecovery&&!facts.activeRework&&!facts.activeBlocker;

export const moduleImplementationStarted=(facts:ModuleFacts)=>facts.workItems.some(item=>item.required&&item.validAttempt);
export const moduleImplementationComplete=(facts:ModuleFacts)=>{
  const required=facts.workItems.filter(item=>item.required);
  return required.length>0&&required.every(workItemNormativelySatisfied);
};
export const moduleIntegrationComplete=(facts:ModuleFacts)=>facts.integrationComplete&&moduleImplementationComplete(facts);
export const moduleValidationComplete=(facts:ModuleFacts)=>facts.validationComplete&&moduleIntegrationComplete(facts);
export const projectImplementationStarted=(facts:ProjectFacts)=>facts.requiredModules.some(module=>module.required&&module.materialized&&module.implementationStarted);
export const projectImplementationComplete=(facts:ProjectFacts)=>{
  const required=facts.requiredModules.filter(module=>module.required);
  return !facts.obligationProjectionPending&&required.length>0
    &&required.every(module=>module.materialized&&!module.scopeChangePending&&module.integrationComplete);
};
export const projectValidationComplete=(facts:ProjectFacts)=>{
  const required=facts.requiredModules.filter(module=>module.required);
  return projectImplementationComplete(facts)&&required.every(module=>module.validationComplete);
};
export const projectReadyForDelivery=(facts:ProjectFacts)=>projectValidationComplete(facts)
  &&facts.requiredModules.filter(module=>module.required).every(module=>module.materialized&&!module.scopeChangePending);

export const aggregateMacroLifecycle=(facts:ModuleFacts|ProjectFacts):MacroDecision=>{
  if(facts.kind==='MODULE'){
    if(facts.workflowCode!=='MODULE_DELIVERY'||facts.workflowVersion!==2) return decision('INVALID','INCOMPATIBLE_WORKFLOW_VERSION',facts.evidenceRefs);
    if(facts.explicitReopening==='PRODUCT_COMMITMENT_EVOLUTION'&&facts.state!=='IDENTIFIED')
      return decision('REOPEN_TRANSITION','PRODUCT_COMMITMENT_EVOLUTION',facts.evidenceRefs,'IDENTIFIED','PRODUCT_COMMITMENT_EVOLUTION',facts.explicitReopening);
    if((facts.explicitReopening==='PERTINENT_FINDING'||facts.explicitReopening==='RECOVERY_REWORK')&&['INTEGRATING','VALIDATING','READY_FOR_DELIVERY'].includes(facts.state))
      return decision('REOPEN_TRANSITION',facts.explicitReopening,facts.evidenceRefs,'IMPLEMENTING',facts.state==='INTEGRATING'?'MODULE_INTEGRATION_REWORK':facts.state==='VALIDATING'?'MODULE_VALIDATION_REWORK':'MODULE_REWORK_REQUIRED',facts.explicitReopening);
    const forward:Record<string,[boolean,string,string]>= {
      IDENTIFIED:[facts.definitionAccepted,'DEFINED','MODULE_DEFINITION_ACCEPTED'],
      DEFINED:[facts.architectureAccepted,'ARCHITECTED','MODULE_ARCHITECTURE_ACCEPTED'],
      ARCHITECTED:[facts.planningStarted,'PLANNING_IN_PROGRESS','START_MODULE_PLANNING'],
      PLANNING_IN_PROGRESS:[facts.planProposed,'WAITING_FOR_MODULE_PLAN_APPROVAL','MODULE_PLAN_PROPOSED'],
      WAITING_FOR_MODULE_PLAN_APPROVAL:[facts.planAccepted,'PLANNED','MODULE_PLAN_APPROVED'],
      PLANNED:[moduleImplementationStarted(facts),'IMPLEMENTING','ELIGIBLE_WORK_ITEMS_AVAILABLE'],
      IMPLEMENTING:[moduleImplementationComplete(facts),'INTEGRATING','MODULE_IMPLEMENTATION_ACCEPTED'],
      INTEGRATING:[facts.integrationComplete&&moduleImplementationComplete(facts),'VALIDATING','MODULE_INTEGRATION_ACCEPTED'],
      VALIDATING:[facts.validationComplete&&facts.integrationComplete,'READY_FOR_DELIVERY','MODULE_VALIDATION_ACCEPTED'],
      READY_FOR_DELIVERY:[facts.projectDelivered,'DELIVERED','PROJECT_DELIVERY_ACCEPTED']
    };
    const next=forward[facts.state];
    if(!next) return decision(['DELIVERED','PAUSED','CANCELLED','EVOLVING'].includes(facts.state)?'NO_CHANGE':'INVALID','STATE_NOT_AGGREGATABLE',facts.evidenceRefs);
    return next[0]?decision('FORWARD_TRANSITION','SEMANTIC_PREDICATE_SATISFIED',facts.evidenceRefs,next[1],next[2]):decision('NO_CHANGE','SEMANTIC_PREDICATE_NOT_SATISFIED',facts.evidenceRefs);
  }
  if(facts.workflowCode!=='PROJECT_DISCOVERY'||facts.workflowVersion!==4) return decision('INVALID','INCOMPATIBLE_WORKFLOW_VERSION',facts.evidenceRefs);
  if(facts.explicitReopening==='PRODUCT_COMMITMENT_EVOLUTION'&&['PLANNING','IMPLEMENTATION','VALIDATION','DELIVERY','DELIVERED'].includes(facts.state))
    return decision('REOPEN_TRANSITION','PRODUCT_COMMITMENT_EVOLUTION',facts.evidenceRefs,'ARCHITECTURE','PRODUCT_COMMITMENT_EVOLUTION',facts.explicitReopening);
  if((facts.explicitReopening==='PERTINENT_FINDING'||facts.explicitReopening==='RECOVERY_REWORK')&&['VALIDATION','DELIVERY'].includes(facts.state))
    return decision('REOPEN_TRANSITION',facts.explicitReopening,facts.evidenceRefs,'IMPLEMENTATION',facts.state==='VALIDATION'?'VALIDATION_REWORK_REQUIRED':'DELIVERY_REWORK_REQUIRED',facts.explicitReopening);
  const forward:Record<string,[boolean,string,string]>= {
    ANALYSIS:[facts.analysisAccepted,'DEFINITION','ANALYSIS_ACCEPTED'],
    DEFINITION:[facts.commitmentReady,'WAITING_FOR_PRODUCT_COMMITMENT','PRODUCT_COMMITMENT_READY'],
    WAITING_FOR_PRODUCT_COMMITMENT:[facts.commitmentApproved,'ARCHITECTURE','PRODUCT_COMMITMENT_APPROVED'],
    ARCHITECTURE:[facts.architectureAccepted&&facts.commitmentMaterializationComplete&&!facts.obligationProjectionPending,'PLANNING','ARCHITECTURE_ACCEPTED'],
    PLANNING:[facts.projectPlanAccepted&&projectImplementationStarted(facts),'IMPLEMENTATION','PROJECT_PLAN_ACCEPTED'],
    IMPLEMENTATION:[projectImplementationComplete(facts),'VALIDATION','IMPLEMENTATION_INTEGRATED'],
    VALIDATION:[projectReadyForDelivery(facts),'DELIVERY','VALIDATION_ACCEPTED'],
    DELIVERY:[facts.deliveryAccepted,'DELIVERED','DELIVERY_ACCEPTED']
  };
  const next=forward[facts.state];
  if(!next) return decision(['DELIVERED','PAUSED','CANCELLED','EVOLUTION'].includes(facts.state)?'NO_CHANGE':'INVALID','STATE_NOT_AGGREGATABLE',facts.evidenceRefs);
  return next[0]?decision('FORWARD_TRANSITION','SEMANTIC_PREDICATE_SATISFIED',facts.evidenceRefs,next[1],next[2]):decision('NO_CHANGE','SEMANTIC_PREDICATE_NOT_SATISFIED',facts.evidenceRefs);
};

const normalizeString=(value:unknown)=>String(value??'').replace(/\r\n?/g,'\n').normalize('NFC').trim();
const canonicalJson=(value:unknown):string=>{
  if(Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if(value&&typeof value==='object') return `{${Object.keys(value as object).sort().map(key=>`${JSON.stringify(key)}:${canonicalJson((value as Record<string,unknown>)[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const normalizedSet=(value:unknown)=>[...new Set((Array.isArray(value)?value:[]).map(normalizeString))].sort();
export const candidateModuleFingerprint=(candidate:{module_key:string;payload:Record<string,unknown>;source_evidence:Record<string,unknown>})=>{
  const artifacts=(Array.isArray(candidate.source_evidence.artifact_refs)?candidate.source_evidence.artifact_refs:[]).map((ref:any)=>({artifact_id:normalizeString(ref?.artifact_id).toLowerCase(),sha256:normalizeString(ref?.sha256)})).sort((a,b)=>a.artifact_id.localeCompare(b.artifact_id)||a.sha256.localeCompare(b.sha256));
  const document={
    policy_version:COMMITTED_MODULE_EVOLUTION_POLICY,
    module_key:normalizeString(candidate.module_key),
    name:normalizeString(candidate.payload.name),
    objective:normalizeString(candidate.payload.objective),
    scope:(Array.isArray(candidate.payload.scope)?candidate.payload.scope:[]).map(normalizeString),
    out_of_scope:(Array.isArray(candidate.payload.out_of_scope)?candidate.payload.out_of_scope:[]).map(normalizeString),
    dependencies:normalizedSet(candidate.payload.dependencies),
    acceptance_criteria:(Array.isArray(candidate.payload.acceptance_criteria)?candidate.payload.acceptance_criteria:[]).map(normalizeString),
    source_evidence:{requirement_refs:normalizedSet(candidate.source_evidence.requirement_refs),artifact_refs:artifacts}
  };
  return createHash('sha256').update(canonicalJson(document)).digest('hex');
};

export type MaterializationResolution={moduleKey:string;resolution:'SAME'|'CHANGED'|'ADDED';complete:boolean};
export const commitmentMaterializationComplete=(status:string,resolutions:MaterializationResolution[],candidateKeys:string[])=>status==='APPROVED'
  &&candidateKeys.length>0&&candidateKeys.every(key=>resolutions.some(resolution=>resolution.moduleKey===key&&resolution.complete));
export const nextObligationGeneration=(existingGenerations:number[])=>existingGenerations.length===0?1:Math.max(...existingGenerations)+1;

const insertIntent=async(client:pg.PoolClient,input:{projectId:string;destination:string;kind:string;aggregateType:string;aggregateId:string;idempotencyKey:string;payload?:object;evidenceRefs?:string[]})=>{
  const result=await client.query(`INSERT INTO macro_lifecycle_intents(id,project_id,destination,kind,aggregate_type,aggregate_id,idempotency_key,payload,evidence_refs)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,[randomUUID(),input.projectId,input.destination,input.kind,input.aggregateType,input.aggregateId,input.idempotencyKey,input.payload??{},JSON.stringify(input.evidenceRefs??[])]);
  return result.rows[0]?.id??(await client.query(`SELECT id FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[input.idempotencyKey])).rows[0].id;
};

export const activateV4DiscoveryAfterRegistration=async(client:pg.PoolClient,projectId:string,intakeRevisionId:string)=>{
  const project=(await client.query(`SELECT workflow_code,workflow_version,state,selected_discovery_workflow_code,selected_discovery_workflow_version FROM projects WHERE id=$1 FOR UPDATE`,[projectId])).rows[0];
  if(!project||project.selected_discovery_workflow_code!=='PROJECT_DISCOVERY'||Number(project.selected_discovery_workflow_version)!==4) return null;
  if(project.workflow_code==='PROJECT_INTAKE'&&project.workflow_version===1&&project.state==='REGISTERED')
    await client.query(`UPDATE projects SET workflow_code=selected_discovery_workflow_code,workflow_version=selected_discovery_workflow_version,state='ANALYSIS',updated_at=clock_timestamp() WHERE id=$1`,[projectId]);
  else if(!(project.workflow_code==='PROJECT_DISCOVERY'&&Number(project.workflow_version)===4&&project.state==='ANALYSIS')) return null;
  const key=`discovery:${projectId}:${intakeRevisionId}:v4`,correlation=randomUUID();
  const existing=(await client.query(`SELECT id FROM macro_lifecycle_intents WHERE idempotency_key=$1`,[key])).rows[0];
  const intentId=await insertIntent(client,{projectId,destination:'DISCOVERY',kind:'DISCOVERY',aggregateType:'PROJECT',aggregateId:projectId,idempotencyKey:key,payload:{intake_revision_id:intakeRevisionId,workflow_code:'PROJECT_DISCOVERY',workflow_version:4},evidenceRefs:[`intake_revision:${intakeRevisionId}`]});
  if(!existing)await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,revision_id,actor_id,workflow_code,workflow_version)
    VALUES($1,'MACRO_DISCOVERY_REQUESTED',$2,$3,$4,$5,'PROJECT_DISCOVERY',4)`,[projectId,correlation,{intent_id:intentId,idempotency_key:key,intake_revision_id:intakeRevisionId},intakeRevisionId,config().operatorId]);
  return {state:'ANALYSIS',intentId};
};

const auditEvent=(client:pg.PoolClient,projectId:string,type:string,correlationId:string,payload:object,operationId?:string)=>client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,operation_id,actor_id,workflow_code,workflow_version)
  SELECT id,$2,$3,$4,$5,$6,workflow_code,workflow_version FROM projects WHERE id=$1`,[projectId,type,correlationId,payload,operationId??null,config().operatorId]);

const persistTransition=async(client:pg.PoolClient,input:{projectId:string;aggregateType:'PROJECT'|'MODULE';aggregateId:string;workflowCode:string;workflowVersion:number;sourceState:string;targetState:string;trigger:string;reason:string;reopeningReason?:string;intentId?:string;operationId?:string;evidenceRefs:string[];idempotencyKey:string})=>{
  const type=input.reopeningReason?'REOPEN_TRANSITION':'FORWARD_TRANSITION',correlation=randomUUID();
  if(type==='FORWARD_TRANSITION'&&!(await client.query(`SELECT 1 FROM workflow_definitions d JOIN workflow_transitions t ON t.workflow_id=d.id WHERE d.code=$1 AND d.version=$2 AND d.status='PUBLISHED' AND t.from_state=$3 AND t.to_state=$4 AND t.trigger_code=$5`,[input.workflowCode,input.workflowVersion,input.sourceState,input.targetState,input.trigger])).rowCount)
    throw new Error('MACRO_FORWARD_TRANSITION_NOT_PUBLISHED');
  const inserted=await client.query(`INSERT INTO macro_lifecycle_transitions(id,project_id,aggregate_type,aggregate_id,workflow_code,workflow_version,transition_type,source_state,target_state,trigger_code,reason,reopening_reason,evidence_refs,source_intent_id,operation_id,correlation_id,idempotency_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) ON CONFLICT(idempotency_key) DO NOTHING RETURNING id`,[randomUUID(),input.projectId,input.aggregateType,input.aggregateId,input.workflowCode,input.workflowVersion,type,input.sourceState,input.targetState,input.trigger,input.reason,input.reopeningReason??null,JSON.stringify(input.evidenceRefs),input.intentId??null,input.operationId??null,correlation,input.idempotencyKey]);
  if(!inserted.rowCount) return false;
  if(input.aggregateType==='PROJECT') await client.query(`UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1`,[input.projectId,input.targetState]);
  else await client.query(`UPDATE modules SET state=$2,version=version+1 WHERE id=$1 AND project_id=$3`,[input.aggregateId,input.targetState,input.projectId]);
  await auditEvent(client,input.projectId,input.aggregateType==='PROJECT'?'PROJECT_MACRO_TRANSITIONED':'MODULE_MACRO_TRANSITIONED',correlation,{aggregate_type:input.aggregateType,aggregate_id:input.aggregateId,transition_type:type,source_state:input.sourceState,target_state:input.targetState,trigger:input.trigger,reason:input.reason,reopening_reason:input.reopeningReason??null,evidence_refs:input.evidenceRefs,intent_id:input.intentId??null},input.operationId);
  return true;
};

const rebuildObligations=async(client:pg.PoolClient,projectId:string,currentRevisionId:string)=>{
  const historicalKeys=(await client.query(`SELECT DISTINCT m.module_key FROM product_commitment_revisions r JOIN product_commitment_modules m ON m.product_commitment_revision_id=r.id WHERE r.project_id=$1 AND r.approved_at IS NOT NULL AND r.status IN ('APPROVED','SUPERSEDED') ORDER BY m.module_key`,[projectId])).rows.map((row:any)=>row.module_key);
  for(const moduleKey of historicalKeys){
    const active=(await client.query(`SELECT id FROM committed_module_obligations WHERE project_id=$1 AND module_key=$2 AND required FOR UPDATE`,[projectId,moduleKey])).rows[0];
    if(active)continue;
    const generations=(await client.query(`SELECT generation,required,updated_at FROM committed_module_obligations WHERE project_id=$1 AND module_key=$2 ORDER BY generation FOR UPDATE`,[projectId,moduleKey])).rows;
    const lastResolved=generations.at(-1)??null;
    const introduction=(await client.query(`SELECT r.id FROM product_commitment_revisions r JOIN product_commitment_modules m ON m.product_commitment_revision_id=r.id AND m.module_key=$2
      WHERE r.project_id=$1 AND r.approved_at IS NOT NULL AND r.status IN ('APPROVED','SUPERSEDED') AND ($3::timestamptz IS NULL OR r.approved_at>$3)
      ORDER BY r.revision_number LIMIT 1`,[projectId,moduleKey,lastResolved?.updated_at??null])).rows[0];
    if(!introduction)continue;
    const generation=nextObligationGeneration(generations.map((row:any)=>Number(row.generation)));
    await client.query(`INSERT INTO committed_module_obligations(id,project_id,module_key,generation,introduced_by_revision_id,last_present_revision_id,present_in_current_commitment,scope_change_pending)
      VALUES($1,$2,$3,$4,$5,$5,true,false)`,[randomUUID(),projectId,moduleKey,generation,introduction.id]);
  }
  const currentKeys=(await client.query(`SELECT module_key FROM product_commitment_modules WHERE product_commitment_revision_id=$1 ORDER BY module_key`,[currentRevisionId])).rows.map((row:any)=>row.module_key);
  const activeObligations=(await client.query(`SELECT o.id,o.module_key,introduced.revision_number AS introduced_revision_number FROM committed_module_obligations o JOIN product_commitment_revisions introduced ON introduced.id=o.introduced_by_revision_id WHERE o.project_id=$1 AND o.required ORDER BY o.module_key FOR UPDATE OF o`,[projectId])).rows;
  for(const obligation of activeObligations){
    const latest=(await client.query(`SELECT r.id FROM product_commitment_revisions r JOIN product_commitment_modules m ON m.product_commitment_revision_id=r.id AND m.module_key=$2 WHERE r.project_id=$1 AND r.approved_at IS NOT NULL AND r.status IN ('APPROVED','SUPERSEDED') AND r.revision_number>=$3 ORDER BY r.revision_number DESC LIMIT 1`,[projectId,obligation.module_key,obligation.introduced_revision_number])).rows[0];
    if(latest)await client.query(`UPDATE committed_module_obligations SET last_present_revision_id=$2 WHERE id=$1 AND last_present_revision_id IS DISTINCT FROM $2`,[obligation.id,latest.id]);
  }
  await client.query(`UPDATE committed_module_obligations SET present_in_current_commitment=true,scope_change_pending=false,removed_by_revision_id=NULL
    WHERE project_id=$1 AND required AND module_key=ANY($2::text[]) AND (NOT present_in_current_commitment OR scope_change_pending OR removed_by_revision_id IS NOT NULL)`,[projectId,currentKeys]);
  await client.query(`UPDATE committed_module_obligations SET present_in_current_commitment=false,scope_change_pending=true,removed_by_revision_id=$2
    WHERE project_id=$1 AND required AND NOT(module_key=ANY($3::text[])) AND (present_in_current_commitment OR NOT scope_change_pending OR removed_by_revision_id IS DISTINCT FROM $2)`,[projectId,currentRevisionId,currentKeys]);
  return currentKeys;
};

const baselineMaterialization=async(client:pg.PoolClient,projectId:string,revisionId:string,moduleKey:string)=>
  (await client.query(`WITH RECURSIVE ancestry AS (
      SELECT id,supersedes_revision_id,revision_number FROM product_commitment_revisions WHERE id=$2 AND project_id=$1
      UNION ALL SELECT p.id,p.supersedes_revision_id,p.revision_number FROM product_commitment_revisions p JOIN ancestry a ON a.supersedes_revision_id=p.id WHERE p.project_id=$1
    ) SELECT mat.module_id,mat.module_revision_id,r.candidate_fingerprint,ancestry.revision_number
    FROM ancestry JOIN product_commitment_module_materializations mat ON mat.product_commitment_revision_id=ancestry.id AND mat.project_id=$1 AND mat.module_key=$3
    JOIN module_revisions r ON r.id=mat.module_revision_id ORDER BY ancestry.revision_number DESC LIMIT 1`,[projectId,revisionId,moduleKey])).rows[0]??null;

export const synchronizeApprovedCommitment=async(client:pg.PoolClient,projectId:string,revisionId:string)=>{
  const project=(await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`,[projectId])).rows[0];
  if(!project||project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4) return {synchronized:false};
  const revision=(await client.query(`SELECT * FROM product_commitment_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`,[revisionId,projectId])).rows[0];
  if(!revision||revision.status!=='APPROVED') return {synchronized:false};
  const currentKeys=await rebuildObligations(client,projectId,revisionId);
  const candidates=(await client.query(`SELECT * FROM product_commitment_modules WHERE product_commitment_revision_id=$1 ORDER BY module_key FOR SHARE`,[revisionId])).rows;
  await client.query(`UPDATE macro_lifecycle_intents SET status='SUPERSEDED',completed_at=clock_timestamp(),lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
    WHERE project_id=$1 AND destination='COMMITMENT_MATERIALIZATION' AND status IN ('PENDING','FAILED','LEASED') AND payload->>'product_commitment_revision_id'<>$2`,[projectId,revisionId]);
  for(const candidate of candidates){
    const fingerprint=candidateModuleFingerprint(candidate),baseline=await baselineMaterialization(client,projectId,revisionId,candidate.module_key);
    const kind=baseline?(baseline.candidate_fingerprint===fingerprint?'SAME_LINEAGE':'EVOLVE_MODULE'):'ADD_MODULE';
    const obligation=(await client.query(`SELECT id,generation FROM committed_module_obligations WHERE project_id=$1 AND module_key=$2 AND required FOR UPDATE`,[projectId,candidate.module_key])).rows[0];
    const intentKey=`committed-module-evolution:v1:${projectId}:${revisionId}:${candidate.module_key}:${kind}`;
    await insertIntent(client,{projectId,destination:'COMMITMENT_MATERIALIZATION',kind,aggregateType:'PRODUCT_COMMITMENT',aggregateId:revisionId,idempotencyKey:intentKey,payload:{product_commitment_revision_id:revisionId,product_commitment_module_id:candidate.id,module_key:candidate.module_key,candidate_fingerprint:fingerprint,previous_fingerprint:baseline?.candidate_fingerprint??null,obligation_id:obligation.id,obligation_generation:obligation.generation},evidenceRefs:[`product_commitment_revision:${revisionId}`,`product_commitment_module:${candidate.id}`,`obligation:${obligation.id}`]});
  }
  const removed=(await client.query(`SELECT * FROM committed_module_obligations WHERE project_id=$1 AND required AND NOT present_in_current_commitment ORDER BY module_key FOR UPDATE`,[projectId])).rows;
  for(const obligation of removed) await insertIntent(client,{projectId,destination:'COMMITMENT_MATERIALIZATION',kind:'SCOPE_DIVERGENCE',aggregateType:'PRODUCT_COMMITMENT',aggregateId:revisionId,idempotencyKey:`scope-divergence:v1:${projectId}:${revisionId}:${obligation.module_key}`,payload:{product_commitment_revision_id:revisionId,module_key:obligation.module_key,obligation_id:obligation.id},evidenceRefs:[`product_commitment_revision:${revisionId}`,`obligation:${obligation.id}`]});
  await insertIntent(client,{projectId,destination:'MACRO_LIFECYCLE',kind:'MACRO_REEVALUATE',aggregateType:'PROJECT',aggregateId:projectId,idempotencyKey:`macro-reevaluate:v1:${projectId}:commitment:${revisionId}`,payload:{trigger:'PRODUCT_COMMITMENT_APPROVED',product_commitment_revision_id:revisionId},evidenceRefs:[`product_commitment_revision:${revisionId}`]});
  if(project.state==='WAITING_FOR_PRODUCT_COMMITMENT') await persistTransition(client,{projectId,aggregateType:'PROJECT',aggregateId:projectId,workflowCode:'PROJECT_DISCOVERY',workflowVersion:4,sourceState:project.state,targetState:'ARCHITECTURE',trigger:'PRODUCT_COMMITMENT_APPROVED',reason:'APPROVED_PRODUCT_COMMITMENT',evidenceRefs:[`product_commitment_revision:${revisionId}`,`gate_record:${revision.gate_record_id}`],idempotencyKey:`macro:project:${projectId}:commitment-approved:${revisionId}`});
  const resolved=Number((await client.query(`SELECT count(*)::int AS n FROM product_commitment_module_materializations WHERE product_commitment_revision_id=$1`,[revisionId])).rows[0].n);
  await client.query(`INSERT INTO commitment_materialization_checkpoints(product_commitment_revision_id,project_id,candidate_count,resolved_count,complete)
    VALUES($1,$2,$3::integer,$4::integer,($3::integer=$4::integer)) ON CONFLICT(product_commitment_revision_id) DO UPDATE SET candidate_count=EXCLUDED.candidate_count,resolved_count=EXCLUDED.resolved_count,complete=EXCLUDED.complete,updated_at=clock_timestamp()
    WHERE (commitment_materialization_checkpoints.candidate_count,commitment_materialization_checkpoints.resolved_count,commitment_materialization_checkpoints.complete) IS DISTINCT FROM (EXCLUDED.candidate_count,EXCLUDED.resolved_count,EXCLUDED.complete)`,[revisionId,projectId,currentKeys.length,resolved]);
  return {synchronized:true,candidates:candidates.length,removed:removed.length};
};

const operationForIntent=async(client:pg.PoolClient,intent:any,kind:string)=>{
  const existing=(await client.query(`SELECT id FROM operations WHERE idempotency_key=$1`,[intent.idempotency_key])).rows[0];
  if(existing) return existing.id as string;
  const id=randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,workflow_code,workflow_version) VALUES($1,$2,$3,'SUCCEEDED',$4,$5,'PROJECT_DISCOVERY',4)`,[id,intent.project_id,kind,intent.idempotency_key,randomUUID()]);
  return id;
};

const completeIntent=async(client:pg.PoolClient,intentId:string,leaseToken:string,status:'COMPLETED'|'SUPERSEDED',operationId?:string)=>client.query(`UPDATE macro_lifecycle_intents SET status=$3,operation_id=coalesce($4,operation_id),completed_at=clock_timestamp(),lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp(),last_error=NULL WHERE id=$1 AND lease_token=$2`,[intentId,leaseToken,status,operationId??null]);
const lockOwnedIntent=async(client:pg.PoolClient,intentId:string,leaseToken:string)=>{
  if(!(await client.query(`SELECT 1 FROM macro_lifecycle_intents WHERE id=$1 AND status='LEASED' AND lease_token=$2 AND lease_expires_at>clock_timestamp() FOR UPDATE`,[intentId,leaseToken])).rowCount) throw new Error('MACRO_INTENT_LEASE_FENCED');
};

const processDiscovery=async(client:pg.PoolClient,intent:any,leaseToken:string)=>{
  const project=(await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`,[intent.project_id])).rows[0];
  if(!project||project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4||project.state!=='ANALYSIS') return completeIntent(client,intent.id,leaseToken,'SUPERSEDED');
  const revisionId=intent.payload.intake_revision_id;
  if(!(await client.query(`SELECT 1 FROM intake_revisions WHERE id=$1 AND project_id=$2 FOR SHARE`,[revisionId,intent.project_id])).rowCount) return completeIntent(client,intent.id,leaseToken,'SUPERSEDED');
  await lockOwnedIntent(client,intent.id,leaseToken);
  const operationId=await operationForIntent(client,intent,'PRODUCT_DISCOVERY'),jobKey=`analysis:${intent.project_id}:${revisionId}:v4`;
  await client.query(`UPDATE operations SET status='QUEUED',revision_id=$2 WHERE id=$1`,[operationId,revisionId]);
  const jobId=randomUUID();
  await client.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,kind,idempotency_key) VALUES($1,$2,$3,$4,'ANALYZE_PRODUCT_NEED',$5) ON CONFLICT(idempotency_key) DO NOTHING`,[jobId,operationId,intent.project_id,revisionId,jobKey]);
  const persistedJob=(await client.query(`SELECT id FROM jobs WHERE idempotency_key=$1`,[jobKey])).rows[0].id;
  await auditEvent(client,intent.project_id,'PRODUCT_DISCOVERY_STARTED',randomUUID(),{stage:'ANALYZE_PRODUCT_NEED',intent_id:intent.id,workflow_version:4},operationId);
  await client.query(`UPDATE macro_lifecycle_intents SET payload=payload||$2::jsonb WHERE id=$1`,[intent.id,JSON.stringify({job_id:persistedJob})]);
  await completeIntent(client,intent.id,leaseToken,'COMPLETED',operationId);
};

const createOrEvolveModule=async(client:pg.PoolClient,intent:any,leaseToken:string)=>{
  const project=(await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`,[intent.project_id])).rows[0];
  const revision=(await client.query(`SELECT * FROM product_commitment_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`,[intent.payload.product_commitment_revision_id,intent.project_id])).rows[0];
  if(!project||project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4||!revision||revision.status!=='APPROVED') return completeIntent(client,intent.id,leaseToken,'SUPERSEDED');
  const obligation=(await client.query(`SELECT * FROM committed_module_obligations WHERE id=$1 AND project_id=$2 AND module_key=$3 FOR UPDATE`,[intent.payload.obligation_id,intent.project_id,intent.payload.module_key])).rows[0];
  const candidate=(await client.query(`SELECT * FROM product_commitment_modules WHERE id=$1 AND product_commitment_revision_id=$2 AND module_key=$3 FOR SHARE`,[intent.payload.product_commitment_module_id,revision.id,intent.payload.module_key])).rows[0];
  if(!candidate||!obligation?.required||!obligation.present_in_current_commitment) return completeIntent(client,intent.id,leaseToken,'SUPERSEDED');
  const existingLineage=(await client.query(`SELECT module_id,module_revision_id FROM product_commitment_module_materializations WHERE product_commitment_module_id=$1 FOR SHARE`,[candidate.id])).rows[0];
  if(existingLineage){await completeIntent(client,intent.id,leaseToken,'COMPLETED');return;}
  const fingerprint=candidateModuleFingerprint(candidate);
  if(fingerprint!==intent.payload.candidate_fingerprint) throw new Error('CANDIDATE_FINGERPRINT_MISMATCH');
  let module=(await client.query(`SELECT * FROM modules WHERE project_id=$1 AND module_key=$2 FOR UPDATE`,[intent.project_id,candidate.module_key])).rows[0]??null;
  let current=module?(await client.query(`SELECT * FROM module_revisions WHERE id=$1 FOR UPDATE`,[module.current_revision_id])).rows[0]:null;
  await lockOwnedIntent(client,intent.id,leaseToken);
  const actualKind=!module?'ADDED':current.candidate_fingerprint===fingerprint?'SAME':'CHANGED';
  const operationId=await operationForIntent(client,intent,actualKind==='CHANGED'?'EVOLVE_COMMITTED_MODULE':actualKind==='ADDED'?'ADD_COMMITTED_MODULE':'LINK_SAME_COMMITTED_MODULE');
  let moduleId:string,moduleRevisionId:string;
  if(actualKind==='ADDED'){
    moduleId=randomUUID();moduleRevisionId=randomUUID();const roundId=randomUUID();
    const payload={schema_version:1,module_key:candidate.module_key,...candidate.payload,source_evidence:candidate.source_evidence};
    const criteria=(Array.isArray(candidate.payload.acceptance_criteria)?candidate.payload.acceptance_criteria:[]).map((value:any,index:number)=>({criterion_id:`criterion-${index+1}`,text:String(value)}));
    await client.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status,criteria,source_product_commitment_revision_id,source_product_commitment_module_id,evolution_operation_id,evolution_policy_version,candidate_fingerprint)
      VALUES($1,$2,$3,1,$4,'APPROVED',$5,$6,$7,$8,$9,$10)`,[moduleRevisionId,intent.project_id,candidate.module_key,payload,JSON.stringify(criteria),revision.id,candidate.id,operationId,COMMITTED_MODULE_EVOLUTION_POLICY,fingerprint]);
    await client.query(`INSERT INTO modules(id,project_id,module_key,current_revision_id,state,workflow_code,workflow_version) VALUES($1,$2,$3,$4,'IDENTIFIED','MODULE_DELIVERY',2)`,[moduleId,intent.project_id,candidate.module_key,moduleRevisionId]);
    await client.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,1,'IDENTIFIED')`,[roundId,moduleId,moduleRevisionId]);
    await auditEvent(client,intent.project_id,'COMMITTED_MODULE_ADDED',randomUUID(),{module_id:moduleId,module_revision_id:moduleRevisionId,module_key:candidate.module_key,product_commitment_revision_id:revision.id,candidate_fingerprint:fingerprint,intent_id:intent.id},operationId);
  }else if(actualKind==='SAME'){
    moduleId=module.id;moduleRevisionId=current.id;
    await auditEvent(client,intent.project_id,'COMMITTED_MODULE_SAME_LINKED',randomUUID(),{module_id:moduleId,module_revision_id:moduleRevisionId,module_key:candidate.module_key,product_commitment_revision_id:revision.id,candidate_fingerprint:fingerprint,intent_id:intent.id},operationId);
  }else{
    moduleId=module.id;moduleRevisionId=randomUUID();const roundId=randomUUID(),nextRevision=Number(current.revision)+1;
    const nextRound=Number((await client.query(`SELECT coalesce(max(round_number),0)+1 AS n FROM module_rounds WHERE module_id=$1`,[moduleId])).rows[0].n);
    const payload={schema_version:1,module_key:candidate.module_key,...candidate.payload,source_evidence:candidate.source_evidence};
    const criteria=(Array.isArray(candidate.payload.acceptance_criteria)?candidate.payload.acceptance_criteria:[]).map((value:any,index:number)=>({criterion_id:`criterion-${index+1}`,text:String(value)}));
    await client.query(`INSERT INTO module_revisions(id,project_id,module_key,revision,payload,status,criteria,predecessor_revision_id,source_product_commitment_revision_id,source_product_commitment_module_id,evolution_operation_id,evolution_policy_version,candidate_fingerprint)
      VALUES($1,$2,$3,$4,$5,'APPROVED',$6,$7,$8,$9,$10,$11,$12)`,[moduleRevisionId,intent.project_id,candidate.module_key,nextRevision,payload,JSON.stringify(criteria),current.id,revision.id,candidate.id,operationId,COMMITTED_MODULE_EVOLUTION_POLICY,fingerprint]);
    await client.query(`INSERT INTO module_rounds(id,module_id,revision_id,round_number,state) VALUES($1,$2,$3,$4,'IDENTIFIED')`,[roundId,moduleId,moduleRevisionId,nextRound]);
    await client.query(`UPDATE modules SET current_revision_id=$2,version=version+1 WHERE id=$1`,[moduleId,moduleRevisionId]);
    if(module.state!=='IDENTIFIED') await persistTransition(client,{projectId:intent.project_id,aggregateType:'MODULE',aggregateId:moduleId,workflowCode:'MODULE_DELIVERY',workflowVersion:2,sourceState:module.state,targetState:'IDENTIFIED',trigger:'PRODUCT_COMMITMENT_EVOLUTION',reason:'PRODUCT_COMMITMENT_EVOLUTION',reopeningReason:'PRODUCT_COMMITMENT_EVOLUTION',intentId:intent.id,operationId,evidenceRefs:[`product_commitment_revision:${revision.id}`,`product_commitment_module:${candidate.id}`,`module_revision:${current.id}`,`module_revision:${moduleRevisionId}`],idempotencyKey:`macro:module:${moduleId}:revision:${moduleRevisionId}:reopen`});
    await auditEvent(client,intent.project_id,'COMMITTED_MODULE_CHANGED',randomUUID(),{module_id:moduleId,module_revision_id:moduleRevisionId,predecessor_revision_id:current.id,module_key:candidate.module_key,product_commitment_revision_id:revision.id,previous_fingerprint:current.candidate_fingerprint,new_fingerprint:fingerprint,intent_id:intent.id},operationId);
  }
  await client.query(`UPDATE operations SET module_revision_id=$2 WHERE id=$1`,[operationId,moduleRevisionId]);
  await client.query(`INSERT INTO product_commitment_module_materializations(product_commitment_module_id,project_id,product_commitment_revision_id,module_key,module_id,module_revision_id,materialization_operation_id)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[candidate.id,intent.project_id,revision.id,candidate.module_key,moduleId,moduleRevisionId,operationId]);
  await client.query(`UPDATE committed_module_obligations SET materialized_module_id=$2,materialized_module_revision_id=$3 WHERE id=$1 AND (materialized_module_id IS DISTINCT FROM $2 OR materialized_module_revision_id IS DISTINCT FROM $3)`,[obligation.id,moduleId,moduleRevisionId]);
  if(actualKind!=='SAME'&&['PLANNING','IMPLEMENTATION','VALIDATION','DELIVERY','DELIVERED'].includes(project.state)) await persistTransition(client,{projectId:intent.project_id,aggregateType:'PROJECT',aggregateId:intent.project_id,workflowCode:'PROJECT_DISCOVERY',workflowVersion:4,sourceState:project.state,targetState:'ARCHITECTURE',trigger:'PRODUCT_COMMITMENT_EVOLUTION',reason:'PRODUCT_COMMITMENT_EVOLUTION',reopeningReason:'PRODUCT_COMMITMENT_EVOLUTION',intentId:intent.id,operationId,evidenceRefs:[`product_commitment_revision:${revision.id}`,`product_commitment_module:${candidate.id}`,`obligation:${obligation.id}`],idempotencyKey:`macro:project:${intent.project_id}:commitment:${revision.id}:reopen`});
  const count=Number((await client.query(`SELECT count(*)::int AS n FROM product_commitment_module_materializations WHERE product_commitment_revision_id=$1`,[revision.id])).rows[0].n);
  const total=Number((await client.query(`SELECT count(*)::int AS n FROM product_commitment_modules WHERE product_commitment_revision_id=$1`,[revision.id])).rows[0].n);
  await client.query(`INSERT INTO commitment_materialization_checkpoints(product_commitment_revision_id,project_id,candidate_count,resolved_count,complete) VALUES($1,$2,$3::integer,$4::integer,($3::integer=$4::integer))
    ON CONFLICT(product_commitment_revision_id) DO UPDATE SET candidate_count=EXCLUDED.candidate_count,resolved_count=EXCLUDED.resolved_count,complete=EXCLUDED.complete,updated_at=clock_timestamp()`,[revision.id,intent.project_id,total,count]);
  await completeIntent(client,intent.id,leaseToken,'COMPLETED',operationId);
};

const moduleFactsFromDatabase=async(client:pg.PoolClient,moduleId:string):Promise<ModuleFacts>=>{
  const module=(await client.query(`SELECT m.*,r.id AS revision_id,r.created_at AS revision_created_at FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1 FOR UPDATE OF m`,[moduleId])).rows[0];
  const plans=(await client.query(`SELECT status,id FROM module_plan_revisions WHERE module_id=$1 AND module_revision_id=$2 ORDER BY revision_number DESC`,[moduleId,module.revision_id])).rows;
  const workItems=(await client.query(`SELECT w.*,
      EXISTS(SELECT 1 FROM work_item_external_blockers b WHERE b.work_item_id=w.id AND b.state='ACTIVE') AS active_blocker,
      EXISTS(SELECT 1 FROM finding_work_items fw JOIN findings f ON f.id=fw.finding_id WHERE fw.work_item_id=w.id AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION')) AS open_finding,
      EXISTS(SELECT 1 FROM rework_decisions rw WHERE rw.work_item_id=w.id AND rw.revision_id=w.revision_id AND rw.status='ACTIVE') AS active_rework,
      EXISTS(SELECT 1 FROM recovery_decisions rd WHERE rd.work_item_id=w.id AND rd.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION')) AS active_recovery,
      EXISTS(SELECT 1 FROM deliveries d JOIN jobs j ON j.delivery_id=d.id JOIN agent_execution ae ON ae.job_id=j.id JOIN work_acceptances a ON a.execution_id=ae.id WHERE d.work_item_id=w.id AND a.state='ACCEPTED') AS acceptance_accepted,
      EXISTS(SELECT 1 FROM integration_candidates ic CROSS JOIN LATERAL jsonb_array_elements(coalesce(ic.manifest->'work_items','[]'::jsonb)) item WHERE ic.project_id=w.project_id AND ic.state='INTEGRATED' AND item->>'work_item_id'=w.id::text) AS integration_accepted,
      EXISTS(SELECT 1 FROM deliveries d WHERE d.work_item_id=w.id AND d.state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS','EVIDENCE_REVIEW','QA_IN_PROGRESS','QA_APPROVED')) AS valid_attempt,
      ARRAY(SELECT a.id::text FROM deliveries d JOIN jobs j ON j.delivery_id=d.id JOIN agent_execution ae ON ae.job_id=j.id JOIN work_acceptances a ON a.execution_id=ae.id WHERE d.work_item_id=w.id AND a.state='ACCEPTED' ORDER BY a.id) AS acceptance_ids,
      ARRAY(SELECT ic.id::text FROM integration_candidates ic CROSS JOIN LATERAL jsonb_array_elements(coalesce(ic.manifest->'work_items','[]'::jsonb)) item WHERE ic.project_id=w.project_id AND ic.state='INTEGRATED' AND item->>'work_item_id'=w.id::text ORDER BY ic.id) AS integration_candidate_ids,
      ARRAY(SELECT f.id::text FROM finding_work_items fw JOIN findings f ON f.id=fw.finding_id WHERE fw.work_item_id=w.id AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION') ORDER BY f.id) AS finding_ids,
      ARRAY(SELECT rw.id::text FROM rework_decisions rw WHERE rw.work_item_id=w.id AND rw.revision_id=w.revision_id AND rw.status='ACTIVE' ORDER BY rw.id) AS rework_ids,
      ARRAY(SELECT rd.id::text FROM recovery_decisions rd WHERE rd.work_item_id=w.id AND rd.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION') ORDER BY rd.id) AS recovery_ids,
      ARRAY(SELECT b.id::text FROM work_item_external_blockers b WHERE b.work_item_id=w.id AND b.state='ACTIVE' ORDER BY b.id) AS blocker_ids
    FROM work_items w WHERE w.module_id=$1 AND w.revision_id=$2 ORDER BY w.created_at,w.id`,[moduleId,module.revision_id])).rows;
  const facts:WorkItemFacts[]=workItems.map((row:any)=>({workflowCode:row.workflow_code,workflowVersion:Number(row.workflow_version),required:true,acceptanceAccepted:row.acceptance_accepted,integrationAccepted:row.integration_accepted||row.state==='INTEGRATED',validAttempt:row.valid_attempt||['DISPATCHED','DEVELOPING','QA_IN_PROGRESS','INDEPENDENT_REVIEW','READY_FOR_PHASE_MERGE','MERGED_TO_PHASE','INTEGRATING','INTEGRATED'].includes(row.state),openFinding:row.open_finding,activeRecovery:row.active_recovery,activeRework:row.active_rework,activeBlocker:row.active_blocker}));
  const eventRows=(await client.query(`SELECT id,event_type,payload FROM events
    WHERE project_id=$1 AND (
      payload->>'module_revision_id'=$3
      OR (payload->>'module_revision_id' IS NULL AND payload->>'module_id'=$2 AND created_at>=$4)
    ) ORDER BY id`,[module.project_id,moduleId,module.revision_id,module.revision_created_at])).rows;
  const eventTypes=new Set(eventRows.map((row:any)=>row.event_type));
  const openFinding=facts.some(item=>item.openFinding||item.activeRework);
  const activeRecovery=facts.some(item=>item.activeRecovery);
  const integrationComplete=facts.length>0&&facts.every(workItemNormativelySatisfied);
  const workEvidence=workItems.flatMap((row:any)=>[
    `work_item:${row.id}`,
    ...row.acceptance_ids.map((id:string)=>`work_acceptance:${id}`),
    ...row.integration_candidate_ids.map((id:string)=>`integration_candidate:${id}`),
    ...row.finding_ids.map((id:string)=>`finding:${id}`),
    ...row.rework_ids.map((id:string)=>`rework_decision:${id}`),
    ...row.recovery_ids.map((id:string)=>`recovery_decision:${id}`),
    ...row.blocker_ids.map((id:string)=>`external_blocker:${id}`)
  ]);
  return {kind:'MODULE',workflowCode:module.workflow_code,workflowVersion:Number(module.workflow_version),state:module.state,definitionAccepted:eventTypes.has('MODULE_DEFINITION_ACCEPTED'),architectureAccepted:eventTypes.has('MODULE_ARCHITECTURE_ACCEPTED')||eventTypes.has('ARCHITECTURE_APPROVED'),planningStarted:plans.length>0||eventTypes.has('MODULE_PLANNING_STARTED'),planProposed:plans.length>0,planAccepted:plans.some((row:any)=>row.status==='APPROVED'),workItems:facts,integrationComplete,validationComplete:integrationComplete&&eventTypes.has('MODULE_VALIDATION_ACCEPTED'),projectDelivered:eventTypes.has('PROJECT_DELIVERY_ACCEPTED'),explicitReopening:openFinding?'PERTINENT_FINDING':activeRecovery&&eventTypes.has('RECOVERY_REWORK_REQUIRED')?'RECOVERY_REWORK':undefined,evidenceRefs:[`module_revision:${module.revision_id}`,...eventRows.map((row:any)=>`event:${row.id}`),...plans.map((row:any)=>`module_plan_revision:${row.id}`),...workEvidence]};
};

const reevaluateMacroProject=async(client:pg.PoolClient,intent:any,leaseToken:string)=>{
  const project=(await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`,[intent.project_id])).rows[0];
  if(!project||project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4) return;
  const modules=(await client.query(`SELECT id FROM modules WHERE project_id=$1 AND workflow_code='MODULE_DELIVERY' AND workflow_version=2 ORDER BY module_key FOR UPDATE`,[intent.project_id])).rows;
  await lockOwnedIntent(client,intent.id,leaseToken);
  const moduleFacts=new Map<string,ModuleFacts>();
  for(const module of modules){
    for(let step=0;step<10;step++){
      const facts=await moduleFactsFromDatabase(client,module.id);moduleFacts.set(module.id,facts);
      const next=aggregateMacroLifecycle(facts);
      if(!['FORWARD_TRANSITION','REOPEN_TRANSITION'].includes(next.type)||!next.targetState||!next.trigger)break;
      const changed=await persistTransition(client,{projectId:intent.project_id,aggregateType:'MODULE',aggregateId:module.id,workflowCode:facts.workflowCode,workflowVersion:facts.workflowVersion,sourceState:facts.state,targetState:next.targetState,trigger:next.trigger,reason:next.reason,reopeningReason:next.reopeningReason,intentId:intent.id,evidenceRefs:next.evidenceRefs,idempotencyKey:`macro:v1:module:${module.id}:${facts.state}:${next.targetState}:${intent.idempotency_key}`});
      if(!changed)break;
    }
  }
  for(let step=0;step<8;step++){
    const current=(await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`,[intent.project_id])).rows[0];
    const approved=(await client.query(`SELECT r.id,r.approved_at,c.complete FROM product_commitment_revisions r LEFT JOIN commitment_materialization_checkpoints c ON c.product_commitment_revision_id=r.id WHERE r.project_id=$1 AND r.status='APPROVED'`,[intent.project_id])).rows[0]??null;
    const obligations=(await client.query(`SELECT * FROM committed_module_obligations WHERE project_id=$1 AND required ORDER BY module_key FOR SHARE`,[intent.project_id])).rows;
    const requiredModules:RequiredModuleFacts[]=[];
    for(const obligation of obligations){const facts=obligation.materialized_module_id?moduleFacts.get(obligation.materialized_module_id)??await moduleFactsFromDatabase(client,obligation.materialized_module_id):null;requiredModules.push({moduleKey:obligation.module_key,required:true,materialized:Boolean(facts),scopeChangePending:obligation.scope_change_pending,implementationStarted:facts?moduleImplementationStarted(facts):false,integrationComplete:facts?moduleIntegrationComplete(facts):false,validationComplete:facts?moduleValidationComplete(facts):false});}
    const events=(await client.query(`SELECT id,event_type,created_at FROM events WHERE project_id=$1 ORDER BY id`,[intent.project_id])).rows,eventTypes=new Set(events.map((row:any)=>row.event_type));
    const currentRevisionEvents=approved?events.filter((row:any)=>new Date(row.created_at).getTime()>=new Date(approved.approved_at).getTime()):events;
    const currentRevisionEventTypes=new Set(currentRevisionEvents.map((row:any)=>row.event_type));
    const expectedCandidates=approved?Number((await client.query(`SELECT count(*)::int AS n FROM product_commitment_modules WHERE product_commitment_revision_id=$1`,[approved.id])).rows[0].n):0;
    const facts:ProjectFacts={kind:'PROJECT',workflowCode:current.workflow_code,workflowVersion:Number(current.workflow_version),state:current.state,analysisAccepted:eventTypes.has('ANALYSIS_ACCEPTED'),commitmentReady:Boolean(approved)||eventTypes.has('PRODUCT_COMMITMENT_READY'),commitmentApproved:Boolean(approved),architectureAccepted:currentRevisionEventTypes.has('ARCHITECTURE_ACCEPTED'),projectPlanAccepted:requiredModules.length>0&&requiredModules.every(module=>{if(!module.materialized)return false;const record=obligations.find((row:any)=>row.module_key===module.moduleKey);const mf=record?.materialized_module_id?moduleFacts.get(record.materialized_module_id):null;return Boolean(mf?.planAccepted);}),deliveryAccepted:currentRevisionEventTypes.has('DELIVERY_ACCEPTED'),commitmentMaterializationComplete:Boolean(approved?.complete),obligationProjectionPending:Boolean(approved)&&obligations.filter((row:any)=>row.present_in_current_commitment).length!==expectedCandidates,requiredModules,explicitReopening:currentRevisionEventTypes.has('PROJECT_REWORK_REQUIRED')?'PERTINENT_FINDING':undefined,evidenceRefs:[...currentRevisionEvents.map((row:any)=>`event:${row.id}`),...(approved?[`product_commitment_revision:${approved.id}`]:[]),...obligations.map((row:any)=>`obligation:${row.id}`)]};
    const next=aggregateMacroLifecycle(facts);
    if(!['FORWARD_TRANSITION','REOPEN_TRANSITION'].includes(next.type)||!next.targetState||!next.trigger)break;
    const changed=await persistTransition(client,{projectId:intent.project_id,aggregateType:'PROJECT',aggregateId:intent.project_id,workflowCode:facts.workflowCode,workflowVersion:facts.workflowVersion,sourceState:facts.state,targetState:next.targetState,trigger:next.trigger,reason:next.reason,reopeningReason:next.reopeningReason,intentId:intent.id,evidenceRefs:next.evidenceRefs,idempotencyKey:`macro:v1:project:${intent.project_id}:${facts.state}:${next.targetState}:${intent.idempotency_key}`});
    if(!changed)break;
  }
};

const processIntent=async(intentId:string,leaseToken:string)=>withTransaction(async client=>{
  const intent=(await client.query(`SELECT * FROM macro_lifecycle_intents WHERE id=$1 AND status='LEASED' AND lease_token=$2`,[intentId,leaseToken])).rows[0];
  if(!intent) return;
  if(intent.kind==='DISCOVERY') return processDiscovery(client,intent,leaseToken);
  if(intent.kind==='SCOPE_DIVERGENCE'){
    const project=(await client.query(`SELECT workflow_code,workflow_version FROM projects WHERE id=$1 FOR UPDATE`,[intent.project_id])).rows[0];
    const revision=(await client.query(`SELECT status FROM product_commitment_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`,[intent.payload.product_commitment_revision_id,intent.project_id])).rows[0];
    const obligation=(await client.query(`SELECT * FROM committed_module_obligations WHERE id=$1 AND project_id=$2 FOR UPDATE`,[intent.payload.obligation_id,intent.project_id])).rows[0];
    if(!project||project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4||!revision||revision.status!=='APPROVED'||!obligation?.required||obligation.present_in_current_commitment) return completeIntent(client,intent.id,leaseToken,'SUPERSEDED');
    await lockOwnedIntent(client,intent.id,leaseToken);
    const operationId=await operationForIntent(client,intent,'RECORD_SCOPE_DIVERGENCE');
    await auditEvent(client,intent.project_id,'COMMITTED_MODULE_SCOPE_DIVERGENCE',randomUUID(),{module_key:obligation.module_key,obligation_id:obligation.id,materialized:obligation.materialized_module_id!==null,present_in_current_commitment:false,scope_change_pending:true,product_commitment_revision_id:intent.payload.product_commitment_revision_id,intent_id:intent.id},operationId);
    return completeIntent(client,intent.id,leaseToken,'COMPLETED',operationId);
  }
  if(['SAME_LINEAGE','EVOLVE_MODULE','ADD_MODULE'].includes(intent.kind)) return createOrEvolveModule(client,intent,leaseToken);
  if(intent.kind==='MACRO_REEVALUATE') await reevaluateMacroProject(client,intent,leaseToken);
  return completeIntent(client,intent.id,leaseToken,'COMPLETED');
});

const discoverMissingWork=async()=>{
  const approvals=(await pool.query(`SELECT id,project_id FROM product_commitment_revisions WHERE status='APPROVED' ORDER BY approved_at,id`)).rows;
  for(const row of approvals) await withTransaction(client=>synchronizeApprovedCommitment(client,row.project_id,row.id));
  await withTransaction(async client=>{
    await client.query(`INSERT INTO macro_lifecycle_intents(id,project_id,destination,kind,aggregate_type,aggregate_id,idempotency_key,payload,evidence_refs)
      SELECT gen_random_uuid(),e.project_id,'MACRO_LIFECYCLE','MACRO_REEVALUATE','PROJECT',e.project_id,'macro-event:v1:'||e.id,jsonb_build_object('event_id',e.id,'event_type',e.event_type),jsonb_build_array('event:'||e.id)
      FROM events e JOIN projects p ON p.id=e.project_id AND p.workflow_code='PROJECT_DISCOVERY' AND p.workflow_version=4
      WHERE e.event_type IN ('ANALYSIS_ACCEPTED','PRODUCT_COMMITMENT_READY','ARCHITECTURE_ACCEPTED','DELIVERY_ACCEPTED','PROJECT_REWORK_REQUIRED','MODULE_DEFINITION_ACCEPTED','MODULE_ARCHITECTURE_ACCEPTED','MODULE_PLANNING_STARTED','MODULE_PLAN_PROPOSED','MODULE_PLAN_APPROVED','WORK_ITEM_SCHEDULED','DEVELOPMENT_STARTED','ASSURANCE_REVIEW_DECIDED','INTEGRATION_COMPLETED','RECOVERY_DECISION_RECORDED','RECOVERY_EXECUTION_COMPLETED','RECOVERY_REWORK_REQUIRED','MODULE_VALIDATION_ACCEPTED','PROJECT_DELIVERY_ACCEPTED')
      ON CONFLICT(idempotency_key) DO NOTHING`);
  });
};

export const reconcileMacroLifecycle=async(limit=25,leaseOwner=`macro-reconciler:${process.pid}`)=>{
  await discoverMissingWork();
  const claimed=await withTransaction(async client=>{
    const rows=(await client.query(`SELECT id FROM macro_lifecycle_intents
      WHERE (status IN ('PENDING','FAILED') AND available_at<=clock_timestamp()) OR (status='LEASED' AND lease_expires_at<clock_timestamp())
      ORDER BY available_at,created_at,id FOR UPDATE SKIP LOCKED LIMIT $1`,[limit])).rows;
    const claims=[];
    for(const row of rows){const token=randomUUID();await client.query(`UPDATE macro_lifecycle_intents SET status='LEASED',attempts=attempts+1,lease_owner=$2,lease_token=$3,lease_expires_at=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp(),completed_at=NULL WHERE id=$1`,[row.id,leaseOwner,token]);claims.push({id:row.id,token});}
    return claims;
  });
  const results=[];
  for(const claim of claimed){
    try{await processIntent(claim.id,claim.token);results.push({id:claim.id,status:'COMPLETED'});}
    catch(error){const message=error instanceof Error?error.message:String(error);await pool.query(`UPDATE macro_lifecycle_intents SET status='FAILED',last_error=$3,available_at=clock_timestamp()+least(attempts,10)*interval '1 second',lease_owner=NULL,lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp(),completed_at=NULL WHERE id=$1 AND lease_token=$2`,[claim.id,claim.token,message.slice(0,1000)]);results.push({id:claim.id,status:'FAILED',error:message});}
  }
  return results;
};

export const macroLifecycleProjection=async(projectId:string)=>{
  const project=(await pool.query(`SELECT id,workflow_code,workflow_version,state FROM projects WHERE id=$1`,[projectId])).rows[0];
  if(!project) return null;
  const [commitment,obligations,intents,transitions,modules,recovery]=await Promise.all([
    pool.query(`SELECT r.id,r.revision_number,r.status,c.candidate_count,c.resolved_count,coalesce(c.complete,false) AS materialization_complete FROM product_commitment_revisions r LEFT JOIN commitment_materialization_checkpoints c ON c.product_commitment_revision_id=r.id WHERE r.project_id=$1 AND r.status='APPROVED'`,[projectId]),
    pool.query(`SELECT id,module_key,generation,required,materialized_module_id AS module_id,(materialized_module_id IS NOT NULL) AS materialized,present_in_current_commitment,scope_change_pending,introduced_by_revision_id AS source_commitment_revision_id,last_present_revision_id,removed_by_revision_id,version FROM committed_module_obligations WHERE project_id=$1 ORDER BY module_key,generation`,[projectId]),
    pool.query(`SELECT id,destination,kind,aggregate_type,aggregate_id,status,attempts,available_at,lease_expires_at,last_error,created_at,completed_at FROM macro_lifecycle_intents WHERE project_id=$1 AND status IN ('PENDING','LEASED','FAILED') ORDER BY created_at`,[projectId]),
    pool.query(`SELECT aggregate_type,aggregate_id,transition_type,source_state,target_state,trigger_code,reason,reopening_reason,evidence_refs,correlation_id,created_at FROM macro_lifecycle_transitions WHERE project_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,[projectId]),
    pool.query(`SELECT m.id,m.module_key,m.workflow_code,m.workflow_version,m.state,r.id AS revision_id,r.revision,r.predecessor_revision_id,r.source_product_commitment_revision_id,r.source_product_commitment_module_id,r.evolution_operation_id,r.candidate_fingerprint,
      EXISTS(SELECT 1 FROM work_items w JOIN recovery_decisions rd ON rd.work_item_id=w.id WHERE w.module_id=m.id AND w.revision_id=r.id AND rd.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION')) AS recovery_active,
      ARRAY(SELECT b.id FROM work_items w JOIN work_item_external_blockers b ON b.work_item_id=w.id WHERE w.module_id=m.id AND w.revision_id=r.id AND b.state='ACTIVE' ORDER BY b.id) AS active_external_blocker_ids,
      ARRAY(SELECT f.id FROM work_items w JOIN finding_work_items fw ON fw.work_item_id=w.id JOIN findings f ON f.id=fw.finding_id WHERE w.module_id=m.id AND w.revision_id=r.id AND f.state IN ('OPEN','FIXED_PENDING_REVALIDATION') ORDER BY f.id) AS open_finding_ids
      FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.project_id=$1 ORDER BY m.module_key`,[projectId]),
    pool.query(`SELECT rd.id,rd.work_item_id,w.module_id,rd.cause,rd.selected_action,rd.execution_state,rd.evidence_refs,rd.finding_refs,rd.operation_id,rd.created_at
      FROM recovery_decisions rd JOIN work_items w ON w.id=rd.work_item_id JOIN modules m ON m.id=w.module_id AND m.current_revision_id=w.revision_id
      WHERE rd.project_id=$1 AND rd.execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION') ORDER BY rd.created_at,rd.id`,[projectId])
  ]);
  return {project_macro_state:project.state,project_workflow:{code:project.workflow_code,version:Number(project.workflow_version)},commitment_current_revision:commitment.rows[0]??null,commitment_materialization_status:commitment.rows[0]?{complete:commitment.rows[0].materialization_complete,candidate_count:commitment.rows[0].candidate_count??0,resolved_count:commitment.rows[0].resolved_count??0}:null,effective_required_module_set:obligations.rows.filter((row:any)=>row.required),obligations:obligations.rows,pending_intents:intents.rows,module_macro_states:modules.rows,active_recovery:recovery.rows,macro_transitions:transitions.rows,blockers:{required_unmaterialized:obligations.rows.filter((row:any)=>row.required&&!row.materialized).map((row:any)=>row.module_key),scope_change_pending:obligations.rows.filter((row:any)=>row.required&&row.scope_change_pending).map((row:any)=>row.module_key),modules_with_active_recovery:modules.rows.filter((row:any)=>row.recovery_active).map((row:any)=>row.module_key),modules_with_external_blockers:modules.rows.filter((row:any)=>row.active_external_blocker_ids.length>0).map((row:any)=>row.module_key),modules_with_open_findings:modules.rows.filter((row:any)=>row.open_finding_ids.length>0).map((row:any)=>row.module_key)}};
};
