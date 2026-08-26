import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { AssuranceError, safeEvidence } from './assurance.js';

export const ASSURANCE_EXPANSION_CONTRACT='ASSURANCE_EXPANSION_TO_REAL_WORK:v1';
export const ASSURANCE_DISPATCH_SNAPSHOT_VERSION='AssuranceDispatchSnapshot:v1';

export type ExpansionSubjectKind='ModulePlanProposal:v1'|'WorkItemDeliveryCandidate:v1'|'IntegrationCandidate:v1'|'DeliveryPackage:v1';
export type ExpansionJobKind='PLAN_MODULE_WORK_ITEMS'|'DEVELOP_WORK_ITEM'|'RUN_DELIVERY_QA'|'MERGE_WORK_ITEM'|'REASSESS_INTEGRATION_CANDIDATE'|'VALIDATE_INTEGRATION_CANDIDATE'|'PREPARE_DELIVERY_PACKAGE';

const canonical=(value:unknown):string=>{
  const normalize=(item:any):any=>Array.isArray(item)?item.map(normalize):item&&typeof item==='object'
    ?Object.fromEntries(Object.keys(item).sort().map(key=>[key,normalize(item[key])])):item;
  return JSON.stringify(normalize(value));
};
export const assurancePolicyHash=(selectors:unknown,configuration:unknown)=>createHash('sha256').update(canonical({selectors,configuration})).digest('hex');
export const assuranceLineageFingerprint=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');

const matrix:Record<ExpansionJobKind,{subject:ExpansionSubjectKind; selectable:boolean; acceptance:'OWN'|'AUT02_SHARED'|'NONE'; runtime:boolean}>={
  PLAN_MODULE_WORK_ITEMS:{subject:'ModulePlanProposal:v1',selectable:true,acceptance:'OWN',runtime:true},
  DEVELOP_WORK_ITEM:{subject:'WorkItemDeliveryCandidate:v1',selectable:true,acceptance:'AUT02_SHARED',runtime:true},
  RUN_DELIVERY_QA:{subject:'WorkItemDeliveryCandidate:v1',selectable:false,acceptance:'NONE',runtime:true},
  MERGE_WORK_ITEM:{subject:'IntegrationCandidate:v1',selectable:false,acceptance:'NONE',runtime:true},
  REASSESS_INTEGRATION_CANDIDATE:{subject:'IntegrationCandidate:v1',selectable:false,acceptance:'NONE',runtime:true},
  VALIDATE_INTEGRATION_CANDIDATE:{subject:'IntegrationCandidate:v1',selectable:false,acceptance:'NONE',runtime:true},
  PREPARE_DELIVERY_PACKAGE:{subject:'DeliveryPackage:v1',selectable:false,acceptance:'OWN',runtime:false}
};
export const assuranceExpansionMatrix=(kind:string)=>matrix[kind as ExpansionJobKind]??null;

/** Validates only the AUT-03 extension.  Legacy F6 policies stay valid and
 * cannot accidentally select a new real-work dispatch. */
export const validateAssuranceExpansionPolicy=(selectors:Record<string,unknown>,configuration:Record<string,unknown>)=>{
  const jobKinds=selectors.jobKinds,subjectKinds=selectors.subjectKinds;
  const extensionPresent=jobKinds!==undefined||subjectKinds!==undefined||configuration.aut02_shared_acceptance!==undefined||configuration.rollout_id!==undefined;
  if(!extensionPresent)return {extension:false};
  if(!Array.isArray(jobKinds)||!jobKinds.length||!jobKinds.every(value=>typeof value==='string'))throw new AssuranceError('ASSURANCE_EXPANSION_JOB_KINDS_REQUIRED');
  if(!Array.isArray(subjectKinds)||!subjectKinds.length||!subjectKinds.every(value=>typeof value==='string'))throw new AssuranceError('ASSURANCE_EXPANSION_SUBJECT_KINDS_REQUIRED');
  const uniqueJobs=[...new Set(jobKinds)] as string[];
  if(uniqueJobs.length!==jobKinds.length)throw new AssuranceError('ASSURANCE_EXPANSION_JOB_KINDS_INVALID');
  for(const jobKind of uniqueJobs){
    const line=assuranceExpansionMatrix(jobKind);
    if(!line){ if(jobKind==='PREPARE_DELIVERY_PACKAGE')throw new AssuranceError('ASSURANCE_RELEASE_JOB_NOT_PUBLISHED'); throw new AssuranceError('ASSURANCE_JOB_NOT_IN_NORMATIVE_MATRIX'); }
    if(jobKind==='PREPARE_DELIVERY_PACKAGE')throw new AssuranceError('ASSURANCE_RELEASE_JOB_NOT_PUBLISHED');
    if(!line.selectable)throw new AssuranceError('ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE');
    if(!subjectKinds.includes(line.subject))throw new AssuranceError('ASSURANCE_EXPANSION_SUBJECT_MISMATCH');
  }
  for(const subjectKind of subjectKinds)if(!(['ModulePlanProposal:v1','WorkItemDeliveryCandidate:v1'] as string[]).includes(subjectKind))throw new AssuranceError('ASSURANCE_SUBJECT_NOT_IN_NORMATIVE_MATRIX');
  // Selectors are a closed declaration, not a permissive filter.  A policy
  // may name both published lines, but it cannot smuggle in an extra subject
  // alongside one valid job kind.
  const expectedSubjects=[...new Set(uniqueJobs.map(jobKind=>assuranceExpansionMatrix(jobKind)!.subject))];
  if(subjectKinds.length!==expectedSubjects.length||expectedSubjects.some(subjectKind=>!subjectKinds.includes(subjectKind)))throw new AssuranceError('ASSURANCE_EXPANSION_SUBJECT_MISMATCH');
  if(uniqueJobs.includes('DEVELOP_WORK_ITEM')&&configuration.aut02_shared_acceptance!==true)throw new AssuranceError('ASSURANCE_AUT02_SHARED_ACCEPTANCE_REQUIRED');
  if(configuration.aut02_shared_acceptance!==undefined&&typeof configuration.aut02_shared_acceptance!=='boolean')throw new AssuranceError('ASSURANCE_AUT02_SHARED_ACCEPTANCE_INVALID');
  if(configuration.rollout_id!==undefined&&(typeof configuration.rollout_id!=='string'||!configuration.rollout_id.trim()))throw new AssuranceError('ASSURANCE_EXPANSION_ROLLOUT_INVALID');
  return {extension:true,jobKinds:uniqueJobs,subjectKinds:[...new Set(subjectKinds)]};
};

type DispatchInput={jobId:string;operationId:string;projectId:string;correlationId:string;jobKind:string;subjectKind:ExpansionSubjectKind;subjectId:string;normativeGeneration:string;classification:string;lineageFingerprint:string;producerExecutionId?:string|null;moduleId?:string|null;workItemId?:string|null;modulePlanRevisionId?:string|null;planWorkItemId?:string|null;agentPolicyName?:string|null;legacyPolicy?:{id:string;version:number}|null};

/** Frozen identity of a legacy-policy replay is a single nullable pair
 * (legacy_policy_id, legacy_policy_version).  A replay is valid only when the
 * input pair is null-safe exactly equal to the stored pair: both null, or both
 * equal id AND equal version.  One null and one set — or a version change on
 * the same id — is a conflict. */
export const sameLegacyPolicyIdentity=(prior:{legacy_policy_id:string|null;legacy_policy_version:number|null},input:{legacyPolicy?:{id:string;version:number}|null}):boolean=>{
  const priorId=prior.legacy_policy_id??null,priorVersion=prior.legacy_policy_version??null;
  const inputId=input.legacyPolicy?.id??null,inputVersion=input.legacyPolicy?.version??null;
  const priorPresent=priorId!==null,inputPresent=inputId!==null;
  if(priorPresent!==inputPresent)return false;
  if(!priorPresent)return true;
  return priorId===inputId&&Number(priorVersion)===Number(inputVersion);
};
const selectorMatches=(policy:any,input:DispatchInput)=>{
  const s=policy.selectors??{};
  const includes=(key:string,value:string)=>!Array.isArray(s[key])||s[key].includes(value);
  return includes('jobKinds',input.jobKind)&&includes('subjectKinds',input.subjectKind)&&includes('taskTypes',input.jobKind)&&includes('classifications',input.classification)&&(!input.agentPolicyName||includes('agentPolicyNames',input.agentPolicyName));
};

/** Reserves the normative decision in the producer transaction.  The unique
 * dispatch key wins every replay, so a later policy can never reinterpret it. */
export const reserveAssuranceDispatch=async(client:pg.PoolClient,input:DispatchInput)=>{
  const line=assuranceExpansionMatrix(input.jobKind);
  if(!line)throw new AssuranceError('ASSURANCE_JOB_NOT_IN_NORMATIVE_MATRIX');
  if(input.jobKind==='PREPARE_DELIVERY_PACKAGE')throw new AssuranceError('ASSURANCE_RELEASE_JOB_NOT_PUBLISHED');
  if(line.subject!==input.subjectKind||!line.selectable)throw new AssuranceError('ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE');
  const key=`assurance-dispatch:v1:${input.subjectKind}:${input.subjectId}:${input.normativeGeneration}`;
  const prior=(await client.query(`SELECT * FROM assurance_dispatch_snapshots WHERE assurance_dispatch_key=$1 FOR UPDATE`,[key])).rows[0];
  if(prior){
    if(prior.lineage_fingerprint!==input.lineageFingerprint||prior.job_id!==input.jobId||prior.operation_id!==input.operationId||prior.project_id!==input.projectId||prior.correlation_id!==input.correlationId||prior.classification!==input.classification||!sameLegacyPolicyIdentity(prior,input))throw new AssuranceError('ASSURANCE_DISPATCH_IDENTITY_CONFLICT',409);
    return prior;
  }
  const policies=(await client.query(`SELECT * FROM assurance_policies WHERE enabled=true ORDER BY published_at DESC,id DESC`)).rows;
  const policy=policies.find(row=>selectorMatches(row,input)&&validateAssuranceExpansionPolicy(row.selectors??{},row.configuration??{}).extension)??null;
  const id=randomUUID(),selected=Boolean(policy),hash=policy?String(policy.policy_hash??assurancePolicyHash(policy.selectors,policy.configuration)):null;
  const inserted=await client.query(`INSERT INTO assurance_dispatch_snapshots(id,schema_version,assurance_dispatch_key,policy_id,policy_version,policy_hash,selection_result,subject_kind,subject_id,normative_generation,producer_execution_id,job_id,operation_id,correlation_id,project_id,module_id,work_item_id,module_plan_revision_id,plan_work_item_id,classification,lineage_fingerprint,legacy_policy_id,legacy_policy_version)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
    ON CONFLICT(assurance_dispatch_key) DO NOTHING RETURNING *`,
    [id,ASSURANCE_DISPATCH_SNAPSHOT_VERSION,key,policy?.id??null,policy?.version??null,hash,selected?'SELECTED':'NOT_SELECTED',input.subjectKind,input.subjectId,input.normativeGeneration,input.producerExecutionId??null,input.jobId,input.operationId,input.correlationId,input.projectId,input.moduleId??null,input.workItemId??null,input.modulePlanRevisionId??null,input.planWorkItemId??null,input.classification,input.lineageFingerprint,selected?null:input.legacyPolicy?.id??null,selected?null:input.legacyPolicy?.version??null]);
  if(inserted.rowCount)return inserted.rows[0];
  // A concurrent producer committed the same dispatch between our first read
  // and insert.  Re-read its immutable identity instead of exposing a 23505.
  const concurrent=(await client.query(`SELECT * FROM assurance_dispatch_snapshots WHERE assurance_dispatch_key=$1 FOR UPDATE`,[key])).rows[0];
  if(!concurrent||concurrent.lineage_fingerprint!==input.lineageFingerprint||concurrent.job_id!==input.jobId||concurrent.operation_id!==input.operationId||concurrent.project_id!==input.projectId||concurrent.correlation_id!==input.correlationId||concurrent.classification!==input.classification||!sameLegacyPolicyIdentity(concurrent,input))throw new AssuranceError('ASSURANCE_DISPATCH_IDENTITY_CONFLICT',409);
  return concurrent;
};

export const acceptanceKeyFor=(snapshot:any)=>`assurance-acceptance:v1:${snapshot.subject_kind}:${snapshot.subject_id}:${snapshot.normative_generation}:${snapshot.policy_id}:${snapshot.policy_version}`;
export const staleAssuranceSubject=async(client:pg.PoolClient,snapshot:any,evidence:unknown)=>{
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id) VALUES($1,'STALE_ASSURANCE_SUBJECT',$2,$3,'system:assurance')`,[snapshot.project_id,snapshot.correlation_id,safeEvidence({snapshot_id:snapshot.id,subject_kind:snapshot.subject_kind,subject_id:snapshot.subject_id,evidence})]);
  return {code:'STALE_ASSURANCE_SUBJECT'};
};
