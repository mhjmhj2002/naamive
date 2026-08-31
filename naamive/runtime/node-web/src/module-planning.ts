import { createHash, randomUUID } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { config } from './config.js';
import { putArtifact } from './artifacts.js';
import { ApiError } from './service.js';
import { selectedWorkflow } from './workflow.js';
import { createAcceptance, submitOutputForReview } from './assurance.js';
import { assuranceLineageFingerprint, reserveAssuranceDispatch } from './assurance-expansion.js';
import { stableUuidFromText } from './phase4-ids.js';

export const MODULE_PLAN_SCHEMA_VERSION='module-plan/v1';
export const MODULE_PLAN_VALIDATOR_VERSION='module-plan-validator/v1';
export const MODULE_PLAN_QA_MATRIX_VERSION='module-plan-qa/v1';
export const MODULE_PLAN_SANITIZER_VERSION='module-plan-sanitizer/v1';
export type QaMatrixEntry={command:string;cwd:string;timeout_seconds:number;environment:string;required_kinds:string[];kind_pattern?:RegExp};
/** Declarative, versioned capability→QA matrix (aligned with MODULE_PLAN_QA_MATRIX_VERSION). Every capability records the canonical command, relative cwd, timeout, environment and the minimum QA kinds a plan WI must exercise. */
export const MODULE_PLAN_QA_MATRIX:Record<string,QaMatrixEntry>={
  persistence:{command:'npm run test:integration:db',cwd:'test',timeout_seconds:180,environment:'isolated-postgres',required_kinds:['database integration'],kind_pattern:/integration.*(?:db|database)|database.*integration/i},
  api:{command:'npm run test:http:integration',cwd:'test',timeout_seconds:120,environment:'isolated',required_kinds:['http integration','e2e'],kind_pattern:/http.*integration|e2e/i},
  ui:{command:'npm run test:ui',cwd:'test',timeout_seconds:120,environment:'browser-isolated',required_kinds:['interface','e2e'],kind_pattern:/e2e|interface/i},
  metric:{command:'npm run test:unit',cwd:'test',timeout_seconds:60,environment:'isolated',required_kinds:['unit']},
  domain:{command:'npm run test:unit',cwd:'test',timeout_seconds:60,environment:'isolated',required_kinds:['unit']}
};
export const qaMatrixForPrompt=()=>JSON.stringify({version:MODULE_PLAN_QA_MATRIX_VERSION,capabilities:Object.entries(MODULE_PLAN_QA_MATRIX).map(([capability,e])=>({capability,command:e.command,cwd:e.cwd,timeout_seconds:e.timeout_seconds,environment:e.environment,required_kinds:e.required_kinds}))});
export const qaDefaultsFor=(capability:string)=>{const e=MODULE_PLAN_QA_MATRIX[capability];return {command:e?.command??'npm test',cwd:e?.cwd??'test',timeout_seconds:e?.timeout_seconds??60,environment:e?.environment??'isolated'};};
const canonicalStringify=(v:unknown):string=>{if(Array.isArray(v))return `[${v.map(canonicalStringify).join(',')}]`;if(v&&typeof v==='object'){const keys=Object.keys(v as Record<string,unknown>).sort();return `{${keys.map(k=>`${JSON.stringify(k)}:${canonicalStringify((v as Record<string,unknown>)[k])}`).join(',')}}`;}return JSON.stringify(v);};
/** PostgreSQL jsonb reorders object keys, so payload hashes must be canonical (sorted keys) to survive the DB round-trip and pass the approveModulePlan revalidation. */
export const canonicalHash=(v:unknown)=>createHash('sha256').update(canonicalStringify(v)).digest('hex');
const hash=canonicalHash;
const clean=(v:unknown,max=2000)=>typeof v==='string'?v.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,max):'';
const strings=(v:unknown,max=30)=>Array.isArray(v)?v.slice(0,max).map(x=>clean(x,500)).filter(Boolean):[];
const object=(v:unknown)=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:{};
const hasOnly=(v:any,keys:string[])=>Object.keys(object(v)).every(k=>keys.includes(k));
const id=(v:any)=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,99}$/.test(v);
const safePath=(v:any)=>typeof v==='string'&&v.length<=256&&!v.startsWith('/')&&!v.includes('\\')&&!v.includes('*')&&!v.includes('?')&&!v.split('/').includes('..')&&!['.','src','./','src/'].includes(v);
export const capabilities=(text:string)=>{const l=text.toLowerCase();const found:string[]=[];if(/persist|banco|database|modelo|armazen/.test(l))found.push('persistence');if(/hist[oó]ric|status/.test(l))found.push('history/status');if(/api|rest|http|endpoint/.test(l))found.push('api');if(/interface|ui|tela|frontend/.test(l))found.push('ui');if(/m[eé]tric|tempo.*resposta|indicador/.test(l))found.push('metric');return found;};
/** Criterion IDs are versioned data persisted at module-revision creation (module_revisions.criteria). The persisted array is authoritative; legacy revisions without the column fall back to a deterministic positional derivation. */
export const moduleCriteria=(revision:any)=>{const p=object(revision?.payload),persisted=Array.isArray(revision?.criteria)?revision.criteria.filter((x:any)=>id(x.criterion_id)):[];if(persisted.length)return persisted;return Array.isArray(p.acceptance_criteria)?p.acceptance_criteria.map((x:any,i:number)=>typeof x==='string'?{criterion_id:`criterion-${i+1}`,text:x}:x).filter((x:any)=>id(x.criterion_id)):[];};

/**
 * F5-23 pendency 9: the SAME versioned sanitization policy and limits used for the
 * context apply to the agent response and to ALL published evidence (JSON/Markdown):
 * strip control chars, cap fields/lists, reject invalid content, never persist
 * untrusted text unprocessed.
 */
export const MODULE_PLAN_LIMITS={
  work_items:40,criterion_coverage:60,business_dependency_coverage:30,risks:30,gaps:30,
  title:200,objective:2000,output:2000,strings:500,path:256,inputs:20,acceptance_criteria:20,
  allowlist:50,denylist:50,depends_on_ids:30,criterion_ids:30,qa_matrix:20,capabilities:10,id:100
} as const;
const MAX_TEXT=2000, MAX_ITEMS=100, MAX_DEPTH=12;
const sanitizeNode=(v:unknown,depth=0):any=>{
  if(depth>MAX_DEPTH)return undefined;
  if(typeof v==='string')return v.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,MAX_TEXT);
  if(typeof v==='number')return Number.isFinite(v)?v:undefined;
  if(typeof v==='boolean')return v;
  if(Array.isArray(v))return v.slice(0,MAX_ITEMS).map(x=>sanitizeNode(x,depth+1)).filter(x=>x!==undefined);
  if(v&&typeof v==='object'){const out:Record<string,any>={};for(const [k,x] of Object.entries(v as Record<string,any>)){const c=sanitizeNode(x,depth+1);if(c!==undefined)out[k]=c;}return out;}
  return undefined;
};
/** Clean the agent's module-plan/v1 response: strip control chars, truncate strings, cap lists. Invalid top-level content (non-object / wrong schema_version) is rejected closed. */
export const sanitizePlan=(plan:unknown):any=>{
  if(!plan||typeof plan!=='object'||Array.isArray(plan))throw new ApiError(422,'MODULE_PLAN_INVALID_RESPONSE');
  if((plan as Record<string,unknown>).schema_version!==MODULE_PLAN_SCHEMA_VERSION)throw new ApiError(422,'MODULE_PLAN_INVALID_RESPONSE');
  return sanitizeNode(plan);
};
/** Sanitize any evidence payload before it is persisted (JSON and derived Markdown). */
export const sanitizePlanEvidence=(value:unknown):any=>sanitizeNode(value)??{};

const artifact=async(c:any,project:string,type:string,value:any,op:string)=>{const json=JSON.stringify({schema_version:1,...sanitizePlanEvidence(value)}),a=await putArtifact(c,project,type,json,op),md=await putArtifact(c,project,`${type}-markdown`,`# ${type}\n\n\`\`\`json\n${json}\n\`\`\`\n`,op);return {a,md,json};};

/** Only explicitly-labelled reference data crosses the agent boundary. */
export const buildPlanContext=(revision:any,architecture:any,baseline:any,previous:any)=>{const p=object(revision?.payload), criteria=moduleCriteria(revision).map((x:any)=>({criterion_id:x.criterion_id,text:clean(x.text,500)}));const dependencies=(Array.isArray(p.dependencies)?p.dependencies:[]).slice(0,30).map((x:any,i:number)=>{const d=object(x);return {dependency_id:id(d.dependency_id)?d.dependency_id:`dependency-${i+1}`,description:clean(typeof x==='string'?x:d.description,500)};});const context={context_schema_version:'module-plan-context/v1',sanitizer_version:MODULE_PLAN_SANITIZER_VERSION,qa_matrix_version:MODULE_PLAN_QA_MATRIX_VERSION,module_definition:{module_key:clean(p.module_key,100),objective:clean(p.objective,1000),scope:strings(p.scope),out_of_scope:strings(p.out_of_scope),acceptance_criteria:criteria,business_dependencies:dependencies},approved_architecture:{alternatives:strings(architecture?.alternatives),consequences:strings(architecture?.consequences),risks:strings(architecture?.risks)},approved_technology_baseline:{revision_id:clean(baseline?.id,100),technology:strings(baseline?.payload?.technology??baseline?.payload?.items)},previous_round:{feedback:clean(previous?.feedback,1000),proposal:previous?.payload?{work_item_ids:strings(previous.payload.work_items?.map((w:any)=>w.work_item_id),30)}:null}};return {...context,context_hash:hash(context)};};

/** Validate a module-plan/v1 proposal against the round context. Enforces a closed schema IN DEPTH (F5-23 pendency 14): types, allowed fields, limits and content at every nested level (work items, QA, risks, gaps, criterion coverage, business dependency coverage). */
export const validatePlan=(plan:any, context:any)=>{
  const errors:string[]=[];
  const p=object(plan);
  const criteria=(context?.module_definition?.acceptance_criteria??[]) as any[];
  const criterionIds=new Set(criteria.map((x:any)=>x.criterion_id));
  const deps=(context?.module_definition?.business_dependencies??[]) as any[];
  const depIds=new Set(deps.map((x:any)=>x.dependency_id));
  const L=MODULE_PLAN_LIMITS;
  const isString=(v:any,max:number)=>typeof v==='string'&&clean(v,max).length>0&&v.length<=max;
  const isOptionalStringList=(v:any,max:number,itemMax:number)=>Array.isArray(v)&&v.length<=max&&v.every((x:any)=>typeof x==='string'&&x.length<=itemMax&&clean(x,itemMax).length>0);
  const isRequiredStringList=(v:any,max:number,itemMax:number)=>isOptionalStringList(v,max,itemMax)&&Array.isArray(v)&&v.length>0;

  // ---- Top-level closed schema ----
  if(!hasOnly(p,['schema_version','work_items','criterion_coverage','business_dependency_coverage','risks','gaps'])||p.schema_version!==MODULE_PLAN_SCHEMA_VERSION)errors.push('SCHEMA_CLOSED');
  if(!Array.isArray(p.work_items)||!Array.isArray(p.criterion_coverage)||!Array.isArray(p.business_dependency_coverage)||!Array.isArray(p.risks)||!Array.isArray(p.gaps))errors.push('SCHEMA_CLOSED');
  if(Array.isArray(p.work_items)){if(p.work_items.length>L.work_items)errors.push('WORK_ITEMS_LIMIT_EXCEEDED');if(p.work_items.some((w:any)=>!w||typeof w!=='object'||Array.isArray(w)))errors.push('WORK_ITEM_TYPE_INVALID');}
  if(Array.isArray(p.criterion_coverage)&&p.criterion_coverage.length>L.criterion_coverage)errors.push('CRITERION_COVERAGE_LIMIT_EXCEEDED');
  if(Array.isArray(p.business_dependency_coverage)&&p.business_dependency_coverage.length>L.business_dependency_coverage)errors.push('BUSINESS_DEPENDENCY_LIMIT_EXCEEDED');
  if(Array.isArray(p.risks)&&(!p.risks.every((x:any)=>typeof x==='string'&&clean(x,500).length>0)||p.risks.length>L.risks))errors.push('RISKS_INVALID');
  if(Array.isArray(p.gaps)&&(!p.gaps.every((x:any)=>typeof x==='string'&&clean(x,500).length>0)||p.gaps.length>L.gaps))errors.push('GAPS_INVALID');

  // ---- Work item closed schema in depth ----
  const workItems=Array.isArray(p.work_items)?p.work_items:[];
  const ids=new Set<string>();
  for(const w of workItems){
    if(!w||typeof w!=='object'||Array.isArray(w)){continue;}
    const wi=object(w);
    const allowed=['work_item_id','title','objective','inputs','output','acceptance_criteria','allowlist','denylist','depends_on_ids','criterion_ids','qa_matrix','risks','capabilities','allowlist_exception','cohesion_justification'];
    if(!hasOnly(wi,allowed))errors.push('WORK_ITEM_FIELDS_CLOSED');
    if(!id(wi.work_item_id)||ids.has(wi.work_item_id))errors.push('WORK_ITEM_ID_INVALID');
    ids.add(wi.work_item_id);
    if(!isString(wi.title,L.title))errors.push('WORK_ITEM_TITLE_INVALID');
    if(!isString(wi.objective,L.objective))errors.push('WORK_ITEM_OBJECTIVE_INVALID');
    if(!isString(wi.output,L.output))errors.push('WORK_ITEM_OUTPUT_INVALID');
    if(wi.cohesion_justification!==undefined&&!isString(wi.cohesion_justification,L.output))errors.push('WORK_ITEM_COHESION_INVALID');
    if(!isOptionalStringList(wi.inputs,L.inputs,L.strings))errors.push('WORK_ITEM_INPUTS_INVALID');
    if(!isOptionalStringList(wi.acceptance_criteria,L.acceptance_criteria,L.strings))errors.push('WORK_ITEM_CRITERIA_INVALID');
    if(!Array.isArray(wi.allowlist)||!wi.allowlist.length||wi.allowlist.length>L.allowlist||!wi.allowlist.every(safePath))errors.push('WORK_ITEM_POLICY_INVALID');
    if(!Array.isArray(wi.denylist)||!wi.denylist.length||wi.denylist.length>L.denylist||!wi.denylist.every(safePath))errors.push('WORK_ITEM_POLICY_INVALID');
    if(Array.isArray(wi.allowlist)&&Array.isArray(wi.denylist)&&wi.allowlist.some((x:string)=>wi.denylist.includes(x)))errors.push('WORK_ITEM_POLICY_INVALID');
    if(!isOptionalStringList(wi.depends_on_ids,L.depends_on_ids,L.id))errors.push('WORK_ITEM_DEPENDENCIES_INVALID');
    if(!isRequiredStringList(wi.criterion_ids,L.criterion_ids,L.id))errors.push('WORK_ITEM_CRITERION_IDS_INVALID');
    if(!isOptionalStringList(wi.risks,L.risks,L.strings))errors.push('WORK_ITEM_RISKS_INVALID');
    if(wi.capabilities!==undefined&&(!Array.isArray(wi.capabilities)||wi.capabilities.length>L.capabilities||!wi.capabilities.every((x:any)=>typeof x==='string'&&clean(x,50).length>0)))errors.push('WORK_ITEM_CAPABILITIES_INVALID');
    if(wi.allowlist_exception!==undefined){const ae=object(wi.allowlist_exception);if(!hasOnly(ae,['justification','risk','approval'])||!isString(ae.justification,L.output)||!isOptionalStringList(ae.risk,L.risks,L.strings)||!isString(ae.approval??'',L.strings))errors.push('ALLOWLIST_EXCEPTION_INVALID');}
    if(!Array.isArray(wi.qa_matrix)||!wi.qa_matrix.length||wi.qa_matrix.length>L.qa_matrix){errors.push('QA_MATRIX_REQUIRED');}else{
      for(const q of wi.qa_matrix){if(!q||typeof q!=='object'||Array.isArray(q)){errors.push('QA_INVALID');continue;}const qo=object(q);if(!hasOnly(qo,['command','cwd','timeout_seconds','environment','criterion_ids','kind'])||!isString(qo.command,200)||!safePath(qo.cwd)||!Number.isInteger(qo.timeout_seconds)||qo.timeout_seconds<1||qo.timeout_seconds>3600||!isString(qo.environment,100)||!isString(qo.kind,100)||!isOptionalStringList(qo.criterion_ids,L.criterion_ids,L.id))errors.push('QA_INVALID');}
    }
    const description=`${wi.title??''} ${wi.objective??''} ${wi.output??''} ${strings(wi.acceptance_criteria).join(' ')}`;
    const derived=capabilities(description);
    const declared=Array.isArray(wi.capabilities)?wi.capabilities:[];
    if(derived.some(x=>!declared.includes(x))||declared.some((x:string)=>!derived.includes(x)))errors.push('CAPABILITY_DECLARATION_DIVERGES');
    const kinds=(wi.qa_matrix??[]).map((q:any)=>clean(q?.kind).toLowerCase());
    for(const capability of derived){const entry=MODULE_PLAN_QA_MATRIX[capability];if(entry&&!entry.required_kinds.some(required=>kinds.includes(required)))errors.push(`QA_${capability.toUpperCase().replace('/','_')}_REQUIRED`);}
    if(/critical|cr[ií]tic/.test(description)&&!kinds.includes('e2e'))errors.push('QA_CRITICAL_E2E_REQUIRED');
    if(/regra|c[aá]lcul|valida[cç][aã]o/.test(description)&&!kinds.includes('unit'))errors.push('QA_UNIT_REQUIRED');
    if(/m[oó]dulo implementado|funcionalidade entregue/i.test(`${wi.output} ${strings(wi.acceptance_criteria).join(' ')}`))errors.push('WORK_ITEM_NOT_VERIFIABLE');
    if(wi.allowlist_exception&&(!clean(wi.allowlist_exception.justification)||!strings(wi.risks).length))errors.push('ALLOWLIST_EXCEPTION_INVALID');
    const caps=Array.isArray(wi.capabilities)?wi.capabilities:capabilities(description);
    if(caps.length>1&&(!clean(wi.cohesion_justification)||!strings(wi.risks).length))errors.push('COHESION_INVALID');
    if(workItems.length===1&&caps.length>1)errors.push('SINGLE_ITEM_MULTI_CAPABILITY');
    for(const cid of wi.criterion_ids??[])if(!criterionIds.has(cid))errors.push('CRITERION_UNKNOWN');
    for(const q of wi.qa_matrix??[]){if(!hasOnly(object(q),['command','cwd','timeout_seconds','environment','criterion_ids','kind'])||!clean(q?.command)||!safePath(q?.cwd)||!Number.isInteger(q?.timeout_seconds)||q?.timeout_seconds<1||!Array.isArray(q?.criterion_ids))errors.push('QA_INVALID');}
    for(const capability of caps){const entry=MODULE_PLAN_QA_MATRIX[capability];if(entry?.kind_pattern&&!(wi.qa_matrix??[]).some((q:any)=>entry.kind_pattern!.test(clean(q?.kind))))errors.push(`QA_${capability.toUpperCase().replace('/','_')}_REQUIRED`);}
  }
  for(const w of workItems){for(const d of w?.depends_on_ids??[])if(!ids.has(d)||d===w.work_item_id)errors.push('DEPENDENCY_INVALID');}
  const visit=(n:string,seen:Set<string>,stack:Set<string>):boolean=>{if(stack.has(n))return true;if(seen.has(n))return false;seen.add(n);stack.add(n);const w=workItems.find((x:any)=>x.work_item_id===n);const bad=(w?.depends_on_ids??[]).some((d:string)=>visit(d,seen,stack));stack.delete(n);return bad;};
  if([...ids].some(n=>visit(n,new Set(),new Set())))errors.push('DEPENDENCY_CYCLE');
  const coverage=new Map<string,string[]>();
  for(const x of p.criterion_coverage??[]){const xo=object(x);if(!hasOnly(xo,['criterion_id','work_item_ids'])||!id(xo.criterion_id)||!criterionIds.has(xo.criterion_id)||!Array.isArray(xo.work_item_ids)||!xo.work_item_ids.length||xo.work_item_ids.length>L.work_items||xo.work_item_ids.some((w:any)=>typeof w!=='string'||!ids.has(w)||workItems.find((item:any)=>item.work_item_id===w)?.criterion_ids?.includes(xo.criterion_id)!==true))errors.push('CRITERION_COVERAGE_INVALID');else coverage.set(xo.criterion_id,xo.work_item_ids);}
  for(const cid of criterionIds){if(!coverage.has(cid)||!workItems.some((w:any)=>w.criterion_ids?.includes(cid)))errors.push('CRITERION_COVERAGE_MISSING');}
  const bd=new Map<string,any>();
  for(const x of p.business_dependency_coverage??[]){const xo=object(x);if(!hasOnly(xo,['dependency_id','classification','work_item_ids','blocked_work_item_ids','justification'])||!id(xo.dependency_id)||!depIds.has(xo.dependency_id)||bd.has(xo.dependency_id)||!['COVERED_BY_WORK_ITEMS','EXTERNAL_BLOCKER','NOT_APPLICABLE'].includes(xo.classification)||!isString(xo.justification,L.output)||!Array.isArray(xo.work_item_ids)||!Array.isArray(xo.blocked_work_item_ids)||![...(xo.work_item_ids??[]),...(xo.blocked_work_item_ids??[])].every((w:any)=>typeof w==='string'&&ids.has(w)))errors.push('BUSINESS_DEPENDENCY_INVALID');bd.set(xo.dependency_id,xo);if(xo.classification==='COVERED_BY_WORK_ITEMS'&&(!(xo.work_item_ids??[]).length||(xo.blocked_work_item_ids??[]).length))errors.push('BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID');if(xo.classification==='NOT_APPLICABLE'&&((xo.work_item_ids??[]).length||(xo.blocked_work_item_ids??[]).length))errors.push('BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID');if(xo.classification==='EXTERNAL_BLOCKER'&&((xo.work_item_ids??[]).length||!(xo.blocked_work_item_ids??[]).length))errors.push('BUSINESS_DEPENDENCY_CLASSIFICATION_INVALID');}
  for(const d of depIds)if(!bd.has(d))errors.push('BUSINESS_DEPENDENCY_MISSING');
  if(errors.length)throw new ApiError(422,[...new Set(errors)].join(','));
  return p;
};
export const controlledPlanFixture=(context:any)=>{const cs=context.module_definition.acceptance_criteria.map((x:any)=>x.criterion_id);const mk=(n:string,title:string,cap:string,criteria:string[])=>({work_item_id:n,title,objective:title,inputs:['approved module definition'],output:`Verifiable ${title} delivered`,acceptance_criteria:criteria.map(x=>`Criterion ${x} is demonstrably satisfied`),allowlist:[`src/${n}`],denylist:['.env'],depends_on_ids:[],criterion_ids:criteria,qa_matrix:[{command:'npm test',cwd:'test',timeout_seconds:60,environment:'isolated',criterion_ids:criteria,kind:cap==='persistence'?'database integration':cap==='api'?'http integration':cap==='ui'?'e2e':'unit'}],risks:['Validate integration'],capabilities:[cap]});const caps=capabilities(JSON.stringify(context.module_definition));const items=(caps.length?caps:['domain']).map((cap:string,i:number)=>{const slice=cs.filter((_:any,n:number)=>n%Math.max(caps.length,1)===i);return mk(`wi-${cap.replace(/[^a-z]/g,'-')}`,`Implement ${cap}`,cap,slice.length?slice:cs);});return {schema_version:MODULE_PLAN_SCHEMA_VERSION,work_items:items,criterion_coverage:cs.map((criterion_id:string)=>({criterion_id,work_item_ids:items.filter((x:any)=>x.criterion_ids.includes(criterion_id)).map((x:any)=>x.work_item_id)})),business_dependency_coverage:context.module_definition.business_dependencies.map((x:any)=>({dependency_id:x.dependency_id,classification:'NOT_APPLICABLE',work_item_ids:[],blocked_work_item_ids:[],justification:'No delivery dependency'})),risks:['Controlled deterministic test fixture'],gaps:[]};};

/**
 * F5-23 pendency 10: persist durable, sanitized JSON + Markdown failure evidence in its OWN
 * transaction (commits even when the surrounding plan transaction rolls back) BEFORE any retry
 * or return. The rejection event never exposes the raw agent response.
 */
export const persistPlanFailureEvidence=async(job:any,code:string,errors:string[]=[])=>withTransaction(async c=>{
  const report={schema_version:1,validator_version:MODULE_PLAN_VALIDATOR_VERSION,sanitizer_version:MODULE_PLAN_SANITIZER_VERSION,job_id:job.id,operation_id:job.operation_id,module_id:job.module_id,project_id:job.project_id,code,errors,next_action:'RETRY_MODULE_PLAN',report_hash:hash({code,errors:errors.slice().sort()})};
  const a=await artifact(c,job.project_id,'module-plan-rejection-report',report,job.operation_id);
  await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id) VALUES($1,'MODULE_PLAN_FAILED',$2,$3,$4,$5,$6)`,[job.project_id,randomUUID(),job.operation_id,job.id,{module_id:job.module_id,code,errors,next_action:'RETRY_MODULE_PLAN',evidence_hash:a.a.hash},config().operatorId]);
  return {json_hash:a.a.hash,markdown_hash:a.md.hash};
});

export const enqueuePlan=async(c:any,projectId:string,module:any,key:string,opKind='PLAN_MODULE_WORK_ITEMS',retryOf?:string,sourceBaselineId?:string|null,sourceModuleRevisionId?:string|null,originOperationId?:string|null)=>{const op=randomUUID(),job=randomUUID(),correlation=randomUUID();// F5-23 pendency 16: on retry the source module revision is recorded directly on both
// the new operations row and the new jobs row (module_revision_id) for queryable lineage;
// the initial plan path keeps it NULL. revision_id (intake FK) stays NULL on both rows.
// F5-23 pendency 23: origin_operation_id records the ROOT (first) planning operation of the
// retry chain directly on both rows, so chained lineage is queryable without a recursive walk.
if(retryOf)await c.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,retry_of_operation_id,module_revision_id,origin_operation_id) VALUES($1,$2,$3,'QUEUED',$4,$5,NULL,$6,$7,$8)`,[op,projectId,opKind,key,correlation,retryOf,sourceModuleRevisionId??null,originOperationId??null]);else await c.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id,module_revision_id,origin_operation_id) VALUES($1,$2,$3,'QUEUED',$4,$5,NULL,NULL,NULL)`,[op,projectId,opKind,key,correlation]);await c.query(`INSERT INTO jobs(id,operation_id,project_id,revision_id,module_id,kind,idempotency_key,technology_baseline_revision_id,module_revision_id,origin_operation_id) VALUES($1,$2,$3,NULL,$4,'PLAN_MODULE_WORK_ITEMS',$5,$6,$7,$8)`,[job,op,projectId,module.id,`plan-job:${key}`,sourceBaselineId??module.technology_baseline_revision_id,sourceModuleRevisionId??null,originOperationId??null]);await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id) VALUES($1,'MODULE_PLAN_QUEUED',$2,$3,$4,$5,$6)`,[projectId,correlation,op,job,{module_id:module.id,retry_of_operation_id:retryOf??null,origin_operation_id:originOperationId??null,source_module_revision_id:sourceModuleRevisionId??null,source_technology_baseline_revision_id:sourceBaselineId??module.technology_baseline_revision_id},config().operatorId]);return {op,job};};

/** Persist the proposal only after sanitizing the response and enforcing the closed schema; on contract/sanitization/semantic failure persist durable evidence in its own transaction before rethrowing (F5-23 pendencies 9, 10, 14). */
export const persistPlan=async(job:any,plan:any)=>withTransaction(async c=>{
  const m=(await c.query(`SELECT m.*,r.payload revision_payload,r.criteria revision_criteria FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1 AND m.project_id=$2 FOR UPDATE`,[job.module_id,job.project_id])).rows[0];
  if(!m||m.state!=='PLANNING_IN_PROGRESS')throw new ApiError(409,'WORKFLOW_TRANSITION_NOT_ALLOWED');
  if((await c.query(`SELECT 1 FROM module_plan_revisions WHERE module_id=$1 AND status='PLAN_PROPOSED'`,[m.id])).rowCount)return;
  const previous=(await c.query(`SELECT * FROM module_plan_revisions WHERE module_id=$1 ORDER BY revision_number DESC LIMIT 1`,[m.id])).rows[0];
  const snapshot=(await c.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`,[job.operation_id])).rows[0];
  if(!snapshot)throw new ApiError(409,'MODULE_PLAN_CONTEXT_SNAPSHOT_MISSING');
  const context=snapshot.context_payload;let cleanPlan:any;
  try{cleanPlan=sanitizePlan(plan);validatePlan(cleanPlan,context);}catch(error){const code=error instanceof ApiError?error.code:'MODULE_PLAN_VALIDATION_FAILED';await persistPlanFailureEvidence(job,code,String(code).split(',').filter(Boolean));throw error instanceof ApiError?error:new ApiError(422,code);}
  const payload={...cleanPlan,context_schema_version:snapshot.context_schema_version,context_hash:snapshot.context_hash,validator_version:MODULE_PLAN_VALIDATOR_VERSION,validation_hash:hash({plan:cleanPlan,context_hash:snapshot.context_hash,validator:MODULE_PLAN_VALIDATOR_VERSION})};
  const a=await artifact(c,job.project_id,'module-plan-proposal',{module_id:m.id,...payload},job.operation_id),id=randomUUID();
  const workflow=(await selectedWorkflow(c,'WORK_ITEM_DELIVERY','NEW_PLAN_MATERIALIZATION'))??{workflow_code:'WORK_ITEM_DELIVERY',workflow_version:1};
  await c.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,supersedes_revision_id,module_revision_id,technology_baseline_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,context_schema_version,context_hash,validator_version,validation_hash,context_payload,work_item_workflow_code,work_item_workflow_version,integration_pipeline_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2')`,[id,job.project_id,m.id,Number(previous?.revision_number??0)+1,previous?.id??null,m.current_revision_id,m.technology_baseline_revision_id,payload,hash(payload),a.a.hash,a.md.hash,config().operatorId,snapshot.context_schema_version,snapshot.context_hash,MODULE_PLAN_VALIDATOR_VERSION,payload.validation_hash,context,workflow.workflow_code,workflow.workflow_version]);
  // A planning proposal becomes an AUT-03 subject only after its immutable
  // plan/context artifacts exist.  The snapshot freezes that exact proposal;
  // the following module gate remains the sole material approval authority.
  const expansionPolicy=(await c.query(`SELECT 1 FROM assurance_policies WHERE enabled=true AND selectors->'jobKinds' ? 'PLAN_MODULE_WORK_ITEMS' AND selectors->'subjectKinds' ? 'ModulePlanProposal:v1' LIMIT 1`)).rows[0];
  // Legacy planning remains untouched.  A selected expansion policy requires
  // a published producer execution policy as well; this preserves the existing
  // FK-backed runtime identity instead of manufacturing a service authority.
  if(expansionPolicy) {
    const producerPolicy=(await c.query(`SELECT * FROM agent_execution_policy ORDER BY published_at DESC,id DESC LIMIT 1`)).rows[0];
    if(!producerPolicy) throw new ApiError(409,'ASSURANCE_PLANNING_PRODUCER_POLICY_REQUIRED');
    const planningExecutionId=randomUUID(),operation=(await c.query(`SELECT correlation_id FROM operations WHERE id=$1`,[job.operation_id])).rows[0];
    await c.query(`INSERT INTO agent_execution(id,job_id,operation_id,project_id,project_key,job_kind,idempotency_key,agent_id,agent_version,task_type,classification,policy_id,policy_name,policy_version,state,selection_reason,next_action)
      VALUES($1,$2,$3,$4,$5,'PLAN_MODULE_WORK_ITEMS',$6,'module-planning-worker',$7,'PLAN_MODULE_WORK_ITEMS','INTERNAL',$8,$9,$10,'SUCCEEDED',$11,'Proposta técnica de plano persistida.')
      ON CONFLICT(job_id,idempotency_key) DO NOTHING`,[planningExecutionId,job.id,job.operation_id,stableUuidFromText('project',job.project_id),job.project_id,`aut03-plan-producer:v1:${id}`,config().buildId,producerPolicy.id,producerPolicy.name,producerPolicy.version,{module_plan_revision_id:id,context_hash:snapshot.context_hash,server_derived:true}]);
    const planningExecution=(await c.query(`SELECT * FROM agent_execution WHERE job_id=$1 AND idempotency_key=$2`,[job.id,`aut03-plan-producer:v1:${id}`])).rows[0];
    const generation=`${m.id}:${m.current_revision_id}:${job.operation_id}:${snapshot.context_hash}`;
    const dispatch=await reserveAssuranceDispatch(c,{jobId:job.id,operationId:job.operation_id,projectId:job.project_id,correlationId:operation.correlation_id,jobKind:'PLAN_MODULE_WORK_ITEMS',subjectKind:'ModulePlanProposal:v1',subjectId:id,normativeGeneration:generation,classification:'INTERNAL',lineageFingerprint:assuranceLineageFingerprint({module_id:m.id,module_revision_id:m.current_revision_id,plan_operation_id:job.operation_id,context_hash:snapshot.context_hash,module_plan_revision_id:id,payload_hash:hash(payload)}),producerExecutionId:planningExecution.id,moduleId:m.id,modulePlanRevisionId:id,agentPolicyName:planningExecution.policy_name});
    if(dispatch.selection_result==='SELECTED') {
      const acceptance=await createAcceptance(c,{id:planningExecution.id,project_key:job.project_id,policy_name:planningExecution.policy_name,task_type:'PLAN_MODULE_WORK_ITEMS',classification:'INTERNAL',agent_id:planningExecution.agent_id,agent_version:planningExecution.agent_version,policy_id:planningExecution.policy_id,policy_version:planningExecution.policy_version},operation.correlation_id,dispatch);
      if(acceptance) await submitOutputForReview(c,planningExecution.id,{module_plan_revision_id:id,proposal_artifact_id:a.a.id,proposal_artifact_hash:a.a.hash,context_hash:snapshot.context_hash});
    }
  }
  const gate=randomUUID();
  await c.query(`INSERT INTO module_gates(id,project_id,module_id,revision_id,round_id,kind,plan_revision_id,evidence,technology_baseline_revision_id) SELECT $1,$2,$3,$4,id,'MODULE_PLAN_APPROVAL',$5,$6,$7 FROM module_rounds WHERE module_id=$3 ORDER BY round_number DESC LIMIT 1`,[gate,job.project_id,m.id,m.current_revision_id,id,{json_hash:a.a.hash,markdown_hash:a.md.hash},m.technology_baseline_revision_id]);
  await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id) VALUES($1,'MODULE_PLAN_PROPOSED',$2,$3,$4,$5,$6)`,[job.project_id,randomUUID(),job.operation_id,job.id,{module_id:m.id,plan_revision_id:id,gate_id:gate,work_item_workflow:workflow},config().operatorId]);
});

/**
 * F5-23 pendency 8: revalidate the proposal against the PERSISTED context snapshot before any
 * materialization. Confirm schema_version, canonical payload hash, context_hash, validation_hash
 * and validator_version against the round's record; the approval never reconstructs the context
 * from current state. Any mismatch throws MODULE_PLAN_APPROVAL_VALIDATION_FAILED (fail closed).
 */
export const revalidatePlanApproval=(planRevision:any):void=>{
  const p=object(planRevision);
  const payload=object(p.payload);
  const snapshot=object(p.context_payload);
  if(!snapshot||Object.keys(snapshot).length===0)throw new ApiError(422,'MODULE_PLAN_APPROVAL_VALIDATION_FAILED:CONTEXT_SNAPSHOT_MISSING');
  const errors:string[]=[];
  if(payload.schema_version!==MODULE_PLAN_SCHEMA_VERSION)errors.push('SCHEMA_VERSION_MISMATCH');
  if(typeof p.payload_hash!=='string'||p.payload_hash!==canonicalHash(payload))errors.push('PAYLOAD_HASH_MISMATCH');
  // F5-23 pendency 15: recompute the canonical SHA-256 of the persisted snapshot content
  // EXCLUDING its own context_hash key and compare it against the registered context_hash
  // (p.context_hash, the authoritative revision column). This detects ANY joint payload+hash
  // alteration: an attacker who modifies snapshot content AND recomputes the nested
  // snapshot.context_hash still cannot match the immutable registered p.context_hash.
  // Verifying snapshot.context_hash against the same recomputed hash also catches tampering
  // of the nested field itself while the registered column stays intact.
  const snapshotContent={...snapshot};
  delete snapshotContent.context_hash;
  const recomputedContextHash=canonicalHash(snapshotContent);
  if(typeof p.context_hash!=='string'||p.context_hash!==recomputedContextHash||snapshot.context_hash!==recomputedContextHash)errors.push('CONTEXT_HASH_MISMATCH');
  if(typeof p.context_schema_version!=='string'||p.context_schema_version!==snapshot.context_schema_version)errors.push('CONTEXT_SCHEMA_VERSION_MISMATCH');
  if(p.validator_version!==MODULE_PLAN_VALIDATOR_VERSION)errors.push('VALIDATOR_VERSION_MISMATCH');
  const planPart={schema_version:payload.schema_version,work_items:payload.work_items,criterion_coverage:payload.criterion_coverage,business_dependency_coverage:payload.business_dependency_coverage,risks:payload.risks,gaps:payload.gaps};
  const expectedValidationHash=hash({plan:planPart,context_hash:p.context_hash,validator:p.validator_version});
  if(typeof p.validation_hash!=='string'||p.validation_hash!==expectedValidationHash)errors.push('VALIDATION_HASH_MISMATCH');
  if(errors.length)throw new ApiError(422,`MODULE_PLAN_APPROVAL_VALIDATION_FAILED:${errors.join(',')}`);
  // Re-run the closed semantic validator against the persisted snapshot (the envelope
  // columns are stripped so only the module-plan/v1 contract fields are validated).
  validatePlan(planPart,snapshot);
};
export const requestPlanAdjustment=async(projectId:string,moduleId:string,b:any,key:string)=>withTransaction(async c=>{if(typeof b.plan_revision_id!=='string'||!b.feedback?.trim())throw new ApiError(422,'PLAN_ADJUSTMENT_FEEDBACK_REQUIRED');const m=(await c.query(`SELECT * FROM modules WHERE id=$1 AND project_id=$2 FOR UPDATE`,[moduleId,projectId])).rows[0],p=(await c.query(`SELECT * FROM module_plan_revisions WHERE id=$1 AND module_id=$2 FOR UPDATE`,[b.plan_revision_id,moduleId])).rows[0],idempotencyKey=`plan-module:${moduleId}:rework:${p?.id??b.plan_revision_id}`;const old=(await c.query(`SELECT id FROM operations WHERE idempotency_key=$1`,[idempotencyKey])).rows[0];if(old)return {operation_id:old.id,status:'ACCEPTED'};const g=(await c.query(`SELECT * FROM module_gates WHERE module_id=$1 AND plan_revision_id=$2 AND kind='MODULE_PLAN_APPROVAL' AND status='OPEN' FOR UPDATE`,[moduleId,b.plan_revision_id])).rows[0];if(!m||m.state!=='PLANNING_IN_PROGRESS'||!p||!g||Number(b.version)!==g.version)throw new ApiError(409,'PLAN_REVISION_CONFLICT');await c.query(`UPDATE module_gates SET status='REWORK_REQUIRED',feedback=$2,decided_at=clock_timestamp() WHERE id=$1`,[g.id,clean(b.feedback,1000)]);await c.query(`UPDATE module_plan_revisions SET status='REWORK_REQUIRED',feedback=$2 WHERE id=$1`,[p.id,clean(b.feedback,1000)]);const r=await enqueuePlan(c,projectId,m,idempotencyKey,'REQUEST_PLAN_ADJUSTMENT');return {operation_id:r.op,status:'ACCEPTED',source_revision_id:p.id};});
export type PlanOrigin={operation:any;snapshot:any;sourceRevisionId:string|null;sourceBaselineId:string|null;originOperationId:string|null};
/**
 * F5-23 pendency 23: resolve the ORIGIN of a module-plan operation along the
 * retry chain. A retry of a retry must inherit the FIRST planning operation's
 * module revision, Technology Baseline and context snapshot — never the failed
 * retry's own (possibly corrupt) state. When the operation itself carries
 * origin_operation_id, that root id is authoritative; otherwise we walk
 * retry_of_operation_id back to the root and prefer the root's module_revision_id.
 */
export const resolvePlanOrigin=async(c:any,moduleId:string,op:any):Promise<PlanOrigin|null>=>{
  let rootOp:any=op;
  if(op?.origin_operation_id){
    const root=(await c.query(`SELECT * FROM operations WHERE id=$1 AND project_id=$2`,[op.origin_operation_id,op.project_id])).rows[0];
    if(root)rootOp=root;
  }else{
    let guard=0,cur=op;
    while(cur?.retry_of_operation_id&&guard++<64){const prev=(await c.query(`SELECT * FROM operations WHERE id=$1 AND project_id=$2`,[cur.retry_of_operation_id,cur.project_id])).rows[0];if(!prev)break;rootOp=prev;cur=prev;}
  }
  const rootSnapshot=(await c.query(`SELECT * FROM module_plan_job_context WHERE operation_id=$1`,[rootOp.id])).rows[0];
  if(rootSnapshot){
    const sourceRevisionId=rootSnapshot.module_revision_id??rootOp.revision_id??null;
    const sourceBaselineId=rootSnapshot.technology_baseline_revision_id??(await c.query(`SELECT technology_baseline_revision_id FROM jobs WHERE operation_id=$1`,[rootOp.id])).rows[0]?.technology_baseline_revision_id??null;
    return {operation:rootOp,snapshot:rootSnapshot,sourceRevisionId,sourceBaselineId,originOperationId:rootOp.id};
  }
  // No snapshot on the root: fall back to the operation's own recorded lineage
  // (the source module revision recorded directly on the operations row).
  const sourceRevisionId=rootOp.module_revision_id??rootOp.revision_id??null;
  const sourceBaselineId=(await c.query(`SELECT technology_baseline_revision_id FROM jobs WHERE operation_id=$1`,[rootOp.id])).rows[0]?.technology_baseline_revision_id??null;
  return {operation:rootOp,snapshot:null,sourceRevisionId,sourceBaselineId,originOperationId:rootOp.id};
};
/**
 * F5-23 pendency 23: an ELIGIBLE origin for a module-plan retry. The origin must be a
 * terminal (FAILED) planning operation of the SAME module, of kind PLAN_MODULE_WORK_ITEMS
 * or a prior RETRY_MODULE_PLAN, must not already have a retry (unique retry per source),
 * must not have a pending/active planning job and must not have an open approval gate.
 */
export const eligiblePlanOrigin=async(c:any,moduleId:string,op:any):Promise<boolean>=>{
  if(!op||op.status!=='FAILED'||op.kind!=='PLAN_MODULE_WORK_ITEMS'&&op.kind!=='RETRY_MODULE_PLAN')return false;
  if(!(await c.query(`SELECT 1 FROM jobs WHERE operation_id=$1 AND module_id=$2`,[op.id,moduleId])).rowCount)return false;
  if((await c.query(`SELECT 1 FROM operations WHERE retry_of_operation_id=$1`,[op.id])).rowCount)return false;
  if((await c.query(`SELECT 1 FROM jobs WHERE module_id=$1 AND kind='PLAN_MODULE_WORK_ITEMS' AND status IN ('PENDING','RETRYABLE','LEASED')`,[moduleId])).rowCount)return false;
  if((await c.query(`SELECT 1 FROM module_gates WHERE module_id=$1 AND kind='MODULE_PLAN_APPROVAL' AND status='OPEN'`,[moduleId])).rowCount)return false;
  return true;
};
export const retryModulePlan=async(projectId:string,moduleId:string,b:any,key:string,operatorId=config().operatorId)=>withTransaction(async c=>{if(!operatorId)throw new ApiError(403,'OPERATOR_NOT_AUTHORIZED');if(typeof b.failed_operation_id!=='string')throw new ApiError(422,'FAILED_OPERATION_ID_REQUIRED');const m=(await c.query(`SELECT * FROM modules WHERE id=$1 AND project_id=$2 FOR UPDATE`,[moduleId,projectId])).rows[0],op=(await c.query(`SELECT * FROM operations WHERE id=$1 AND project_id=$2 FOR UPDATE`,[b.failed_operation_id,projectId])).rows[0];const idempotencyKey=`retry-module-plan:${op?.id??b.failed_operation_id}:${key}`;const old=(await c.query(`SELECT id FROM operations WHERE idempotency_key=$1`,[idempotencyKey])).rows[0];if(old)return{operation_id:old.id,status:'ACCEPTED'};// F5-23 pendency 23: the retry source may be the original PLAN_MODULE_WORK_ITEMS OR a
// previous failed RETRY_MODULE_PLAN. Chained retries are allowed as long as the origin is
// eligible (terminal, same module, not already retried, no active job/gate).
if(!m||!op||!await eligiblePlanOrigin(c,moduleId,op))throw new ApiError(409,'MODULE_PLAN_RETRY_CONFLICT');// F5-23 pendency 11 + 23: the retry inherits revision + Technology Baseline + context
// snapshot from the ROOT (first) planning operation of the chain, never from the failed
// operation's own state nor the module's current state.
const origin=await resolvePlanOrigin(c,moduleId,op);if(!origin)throw new ApiError(409,'MODULE_PLAN_RETRY_CONFLICT');const failedSnapshot=origin.snapshot,sourceRevisionId=origin.sourceRevisionId,sourceBaselineId=origin.sourceBaselineId,originOperationId=origin.originOperationId;const r=await enqueuePlan(c,projectId,m,idempotencyKey,'RETRY_MODULE_PLAN',op.id,sourceBaselineId,sourceRevisionId,originOperationId);if(failedSnapshot)await c.query(`INSERT INTO module_plan_job_context(operation_id,project_id,module_id,module_revision_id,technology_baseline_revision_id,context_schema_version,context_payload,context_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (operation_id) DO NOTHING`,[r.op,failedSnapshot.project_id,failedSnapshot.module_id,failedSnapshot.module_revision_id,failedSnapshot.technology_baseline_revision_id,failedSnapshot.context_schema_version,failedSnapshot.context_payload,failedSnapshot.context_hash]);await c.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,payload,actor_id) VALUES($1,'MODULE_PLAN_RETRY_REQUESTED',$2,$3,$4,$5)`,[projectId,randomUUID(),r.op,{module_id:moduleId,failed_operation_id:op.id,revision_id:sourceRevisionId,module_revision_id:sourceRevisionId,technology_baseline_revision_id:sourceBaselineId,origin_operation_id:originOperationId,origin_kind:origin.operation.kind,context_snapshot_reused:Boolean(failedSnapshot),next_action:'MODULE_PLAN_QUEUED'},config().operatorId]);return{operation_id:r.op,status:'ACCEPTED'};});
