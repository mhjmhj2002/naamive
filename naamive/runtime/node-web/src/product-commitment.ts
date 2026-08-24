import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { pool, withTransaction } from './db.js';
import { decideCatalogGate, openCatalogGate, type GateDecision } from './gate-catalog.js';
import { ApiError } from './service.js';

export const PRODUCT_COMMITMENT_CONTRACT_VERSION = 'PRODUCT_COMMITMENT_MODULES:v1';
const moduleKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const compareText = (left:string,right:string) => left<right?-1:left>right?1:0;

export type ProductCommitmentArtifactReference = { artifact_id:string; sha256:string };
export type ProductCommitmentSourceEvidence = { requirement_refs:string[]; artifact_refs:ProductCommitmentArtifactReference[] };
export type CanonicalCandidateModule = {
  module_key:string;
  name:string;
  objective:string;
  scope:string[];
  out_of_scope:string[];
  dependencies:string[];
  acceptance_criteria:string[];
  source_evidence:ProductCommitmentSourceEvidence;
};
export type ProductCommitmentProposal = {
  contract_version:typeof PRODUCT_COMMITMENT_CONTRACT_VERSION;
  candidate_modules:CanonicalCandidateModule[];
  investment_and_risks:Record<string,unknown>;
};
export type ProductCommitmentSources = {
  source_intake_revision_id:string;
  source_requirements_artifact_id:string;
  source_review_artifact_id:string;
};

const fail = (code:string):never => { throw new ApiError(422,code); };
const object = (value:unknown, code:string):Record<string,unknown> => {
  if(!value || typeof value!=='object' || Array.isArray(value)) return fail(code);
  return value as Record<string,unknown>;
};
const exactKeys = (value:Record<string,unknown>, allowed:string[], code:string) => {
  if(Object.keys(value).some(key=>!allowed.includes(key))) fail(code);
};
const normalizedString = (value:unknown, code:string, max:number):string => {
  if(typeof value!=='string') return fail(code);
  const result=value.normalize('NFC').replace(/\r\n?/g,'\n').trim();
  if(!result || result.length>max) return fail(code);
  return result;
};
const stringArray = (value:unknown, code:string, maxItems:number, itemMax=2_000):string[] => {
  if(!Array.isArray(value) || value.length>maxItems) return fail(code);
  return value.map(item=>normalizedString(item,code,itemMax));
};
const uniqueSet = <T>(items:T[], fingerprint:(item:T)=>string, code:string):T[] => {
  const seen=new Set<string>();
  for(const item of items){const key=fingerprint(item);if(seen.has(key))fail(code);seen.add(key);}
  return items;
};
const jsonClone = (value:Record<string,unknown>):Record<string,unknown> => {
  let encoded:string;
  try { encoded=JSON.stringify(value); } catch { return fail('PRODUCT_COMMITMENT_INVESTMENT_AND_RISKS_INVALID'); }
  if(encoded.length>100_000) fail('PRODUCT_COMMITMENT_INVESTMENT_AND_RISKS_INVALID');
  return JSON.parse(encoded) as Record<string,unknown>;
};

const normalizeSourceEvidence = (value:unknown):ProductCommitmentSourceEvidence => {
  const raw=object(value,'PRODUCT_COMMITMENT_SOURCE_EVIDENCE_INVALID');
  exactKeys(raw,['requirement_refs','artifact_refs'],'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED');
  const requirementRefs=uniqueSet(stringArray(raw.requirement_refs,'PRODUCT_COMMITMENT_REQUIREMENT_REFS_INVALID',100,200),item=>item,'PRODUCT_COMMITMENT_SOURCE_REFERENCE_DUPLICATE').sort();
  const rawArtifactRefs=raw.artifact_refs;
  if(!Array.isArray(rawArtifactRefs)||rawArtifactRefs.length>100) fail('PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID');
  const artifactRefs=(rawArtifactRefs as unknown[]).map((value:unknown):ProductCommitmentArtifactReference=>{
    const reference=object(value,'PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID');
    exactKeys(reference,['artifact_id','sha256'],'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED');
    const artifactId=normalizedString(reference.artifact_id,'PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID',36).toLowerCase();
    const sha256=normalizedString(reference.sha256,'PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID',64);
    if(!uuidPattern.test(artifactId)||!sha256Pattern.test(sha256)) fail('PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID');
    return {artifact_id:artifactId,sha256};
  });
  uniqueSet(artifactRefs,item=>`${item.artifact_id}:${item.sha256}`,'PRODUCT_COMMITMENT_SOURCE_REFERENCE_DUPLICATE');
  artifactRefs.sort((left,right)=>compareText(left.artifact_id,right.artifact_id)||compareText(left.sha256,right.sha256));
  return {requirement_refs:requirementRefs,artifact_refs:artifactRefs};
};

const assertDag = (modules:CanonicalCandidateModule[]) => {
  const keys=new Set(modules.map(module=>module.module_key));
  for(const module of modules){
    if(module.dependencies.some(dependency=>dependency===module.module_key)) fail('PRODUCT_COMMITMENT_SELF_DEPENDENCY');
    if(module.dependencies.some(dependency=>!keys.has(dependency))) fail('PRODUCT_COMMITMENT_DEPENDENCY_NOT_FOUND');
  }
  const state=new Map<string,0|1|2>();
  const byKey=new Map(modules.map(module=>[module.module_key,module]));
  const visit=(key:string) => {
    if(state.get(key)===1) fail('PRODUCT_COMMITMENT_DEPENDENCY_CYCLE');
    if(state.get(key)===2) return;
    state.set(key,1);
    for(const dependency of byKey.get(key)!.dependencies) visit(dependency);
    state.set(key,2);
  };
  for(const module of modules) visit(module.module_key);
};

export const validateProductCommitmentProposal = (value:unknown):ProductCommitmentProposal => {
  const raw=object(value,'PRODUCT_COMMITMENT_PROPOSAL_INVALID');
  exactKeys(raw,['contract_version','candidate_modules','investment_and_risks'],'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED');
  if(raw.contract_version!==PRODUCT_COMMITMENT_CONTRACT_VERSION) fail('PRODUCT_COMMITMENT_CONTRACT_VERSION_INVALID');
  const rawModules=raw.candidate_modules;
  if(!Array.isArray(rawModules)||!rawModules.length||rawModules.length>100) fail('PRODUCT_COMMITMENT_CANDIDATE_MODULES_INVALID');
  const modules=(rawModules as unknown[]).map((value:unknown):CanonicalCandidateModule=>{
    const module=object(value,'PRODUCT_COMMITMENT_MODULE_INVALID');
    exactKeys(module,['module_key','name','objective','scope','out_of_scope','dependencies','acceptance_criteria','source_evidence'],'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED');
    const moduleKey=normalizedString(module.module_key,'PRODUCT_COMMITMENT_MODULE_KEY_INVALID',100);
    if(!moduleKeyPattern.test(moduleKey)) fail('PRODUCT_COMMITMENT_MODULE_KEY_INVALID');
    const dependencies=uniqueSet(stringArray(module.dependencies,'PRODUCT_COMMITMENT_DEPENDENCIES_INVALID',30,100),item=>item,'PRODUCT_COMMITMENT_DEPENDENCY_DUPLICATE').sort();
    if(dependencies.some(key=>!moduleKeyPattern.test(key))) fail('PRODUCT_COMMITMENT_DEPENDENCIES_INVALID');
    return {
      module_key:moduleKey,
      name:normalizedString(module.name,'PRODUCT_COMMITMENT_NAME_INVALID',500),
      objective:normalizedString(module.objective,'PRODUCT_COMMITMENT_OBJECTIVE_INVALID',2_000),
      scope:stringArray(module.scope,'PRODUCT_COMMITMENT_SCOPE_INVALID',100),
      out_of_scope:stringArray(module.out_of_scope,'PRODUCT_COMMITMENT_OUT_OF_SCOPE_INVALID',100),
      dependencies,
      acceptance_criteria:stringArray(module.acceptance_criteria,'PRODUCT_COMMITMENT_ACCEPTANCE_CRITERIA_INVALID',100),
      source_evidence:normalizeSourceEvidence(module.source_evidence)
    };
  });
  uniqueSet(modules,module=>module.module_key,'PRODUCT_COMMITMENT_MODULE_KEY_DUPLICATE');
  assertDag(modules);
  const investmentAndRisks=object(raw.investment_and_risks,'PRODUCT_COMMITMENT_INVESTMENT_AND_RISKS_INVALID');
  if(!Object.keys(investmentAndRisks).length) fail('PRODUCT_COMMITMENT_INVESTMENT_AND_RISKS_INVALID');
  return {contract_version:PRODUCT_COMMITMENT_CONTRACT_VERSION,candidate_modules:modules.sort((left,right)=>compareText(left.module_key,right.module_key)),investment_and_risks:jsonClone(investmentAndRisks)};
};

export const canonicalProductCommitment = (proposal:ProductCommitmentProposal, source:Pick<ProductCommitmentSources,'source_intake_revision_id'|'source_requirements_artifact_id'> & {source_requirements_sha256:string}) => {
  const document={
    contract_version:proposal.contract_version,
    source_intake_revision_id:source.source_intake_revision_id,
    source_requirements_artifact_id:source.source_requirements_artifact_id,
    source_requirements_sha256:source.source_requirements_sha256,
    candidate_modules:proposal.candidate_modules
  };
  const canonical_json=JSON.stringify(document);
  return {document,canonical_json,canonical_sha256:createHash('sha256').update(canonical_json).digest('hex')};
};

const auditEvent = (client:pg.PoolClient, projectId:string, eventType:string, correlationId:string, payload:object, actorId:string) =>
  client.query(`INSERT INTO events(project_id,event_type,correlation_id,payload,actor_id,workflow_code,workflow_version)
    SELECT id,$2,$3,$4,$5,workflow_code,workflow_version FROM projects WHERE id=$1`,[projectId,eventType,correlationId,payload,actorId]);

const revisionProjection = async (client:pg.PoolClient, revisionId:string) => {
  const revision=(await client.query(`SELECT * FROM product_commitment_revisions WHERE id=$1`,[revisionId])).rows[0];
  if(!revision) throw new ApiError(404,'PRODUCT_COMMITMENT_REVISION_NOT_FOUND');
  const modules=(await client.query(`SELECT id,module_key,ordinal,payload,source_evidence FROM product_commitment_modules WHERE product_commitment_revision_id=$1 ORDER BY ordinal`,[revisionId])).rows;
  return {...revision,candidate_modules:modules.map(module=>({id:module.id,module_key:module.module_key,ordinal:module.ordinal,...module.payload,source_evidence:module.source_evidence}))};
};

export const createProductCommitmentRevision = async (
  client:pg.PoolClient,
  projectId:string,
  proposalValue:unknown,
  source:ProductCommitmentSources,
  creationIdempotencyKey:string,
  createdBy='system:discovery-agent'
) => {
  if(!creationIdempotencyKey.trim()) throw new ApiError(422,'IDEMPOTENCY_KEY_REQUIRED');
  const project=(await client.query(`SELECT id,workflow_code,workflow_version FROM projects WHERE id=$1 FOR UPDATE`,[projectId])).rows[0];
  if(!project) throw new ApiError(404,'PROJECT_NOT_FOUND');
  const replay=(await client.query(`SELECT id FROM product_commitment_revisions WHERE project_id=$1 AND creation_idempotency_key=$2`,[projectId,creationIdempotencyKey])).rows[0];
  if(replay) return revisionProjection(client,replay.id);
  if(project.workflow_code!=='PROJECT_DISCOVERY'||Number(project.workflow_version)!==4) throw new ApiError(409,'PRODUCT_COMMITMENT_WORKFLOW_NOT_SELECTED');
  const proposal=validateProductCommitmentProposal(proposalValue);
  const lineage=(await client.query(`SELECT ir.id AS intake_id,ra.id AS requirements_id,ra.sha256 AS requirements_sha256,rv.id AS review_id,rv.sha256 AS review_sha256
    FROM intake_revisions ir
    JOIN artifacts ra ON ra.id=$3 AND ra.project_id=ir.project_id AND ra.artifact_type='product-requirements'
    JOIN artifacts rv ON rv.id=$4 AND rv.project_id=ir.project_id AND rv.artifact_type='product-commitment-review'
    WHERE ir.id=$2 AND ir.project_id=$1`,[projectId,source.source_intake_revision_id,source.source_requirements_artifact_id,source.source_review_artifact_id])).rows[0];
  if(!lineage) throw new ApiError(422,'PRODUCT_COMMITMENT_SOURCE_LINEAGE_INVALID');
  const artifactRefs=proposal.candidate_modules.flatMap(module=>module.source_evidence.artifact_refs);
  if(artifactRefs.length){
    const ids=[...new Set(artifactRefs.map(reference=>reference.artifact_id))];
    const persisted=(await client.query(`SELECT id::text,sha256 FROM artifacts WHERE project_id=$1 AND id=ANY($2::uuid[])`,[projectId,ids])).rows;
    const hashes=new Map(persisted.map(row=>[String(row.id),String(row.sha256)]));
    if(artifactRefs.some(reference=>hashes.get(reference.artifact_id)!==reference.sha256)) throw new ApiError(422,'PRODUCT_COMMITMENT_SOURCE_EVIDENCE_INVALID');
  }
  const pending=(await client.query(`SELECT id FROM product_commitment_revisions WHERE project_id=$1 AND status='PENDING_APPROVAL' ORDER BY revision_number DESC LIMIT 1`,[projectId])).rows[0];
  if(pending) throw new ApiError(409,'PRODUCT_COMMITMENT_APPROVAL_PENDING');
  const predecessor=(await client.query(`SELECT id,status,revision_number,logical_round FROM product_commitment_revisions WHERE project_id=$1 ORDER BY revision_number DESC LIMIT 1`,[projectId])).rows[0];
  if(predecessor&&!['APPROVED','REJECTED'].includes(predecessor.status)) throw new ApiError(409,'PRODUCT_COMMITMENT_SUCCESSOR_NOT_ALLOWED');
  const revisionNumber=(BigInt(predecessor?.revision_number??0)+1n).toString();
  const logicalRound=(BigInt(predecessor?.logical_round??0)+1n).toString();
  const canonical=canonicalProductCommitment(proposal,{source_intake_revision_id:lineage.intake_id,source_requirements_artifact_id:lineage.requirements_id,source_requirements_sha256:lineage.requirements_sha256});
  const revisionId=randomUUID(), correlationId=randomUUID();
  await client.query(`INSERT INTO product_commitment_revisions(id,project_id,revision_number,logical_round,contract_version,status,source_intake_revision_id,source_requirements_artifact_id,source_requirements_sha256,source_review_artifact_id,source_review_sha256,canonical_sha256,supersedes_revision_id,creation_idempotency_key,created_by)
    VALUES($1,$2,$3,$4,$5,'DRAFT',$6,$7,$8,$9,$10,$11,$12,$13,$14)`,[revisionId,projectId,revisionNumber,logicalRound,PRODUCT_COMMITMENT_CONTRACT_VERSION,lineage.intake_id,lineage.requirements_id,lineage.requirements_sha256,lineage.review_id,lineage.review_sha256,canonical.canonical_sha256,predecessor?.id??null,creationIdempotencyKey,createdBy]);
  for(const [index,module] of proposal.candidate_modules.entries()){
    const {module_key,source_evidence,...payload}=module;
    await client.query(`INSERT INTO product_commitment_modules(id,project_id,product_commitment_revision_id,module_key,ordinal,payload,source_evidence) VALUES($1,$2,$3,$4,$5,$6,$7)`,[randomUUID(),projectId,revisionId,module_key,index+1,payload,source_evidence]);
  }
  if(predecessor?.status==='REJECTED'){
    await client.query(`UPDATE product_commitment_revisions SET status='SUPERSEDED' WHERE id=$1`,[predecessor.id]);
    await auditEvent(client,projectId,'PRODUCT_COMMITMENT_SUPERSEDED',correlationId,{revision_id:predecessor.id,successor_revision_id:revisionId,canonical_sha256:canonical.canonical_sha256},createdBy);
  }
  await auditEvent(client,projectId,'PRODUCT_COMMITMENT_REVISION_CREATED',correlationId,{revision_id:revisionId,revision_number:revisionNumber,logical_round:logicalRound,contract_version:PRODUCT_COMMITMENT_CONTRACT_VERSION,canonical_sha256:canonical.canonical_sha256,source_intake_revision_id:lineage.intake_id,source_requirements_artifact_id:lineage.requirements_id,source_review_artifact_id:lineage.review_id,supersedes_revision_id:predecessor?.id??null},createdBy);
  const gate=await openCatalogGate(client,projectId,{
    gate_code:'PRODUCT_COMMITMENT',scope_type:'PROJECT',scope_id:projectId,condition_code:'TRACEABLE_REQUIREMENTS_AND_MODULES',
    reason:'Aprovação humana do snapshot canônico e versionado do compromisso de produto.',
    evidence:{requirements_revision_id:lineage.intake_id,source_requirements_artifact_id:lineage.requirements_id,source_requirements_sha256:lineage.requirements_sha256,source_review_artifact_id:lineage.review_id,source_review_sha256:lineage.review_sha256,product_commitment_revision_id:revisionId,canonical_sha256:canonical.canonical_sha256,contract_version:PRODUCT_COMMITMENT_CONTRACT_VERSION,candidate_modules:proposal.candidate_modules,investment_and_risks:proposal.investment_and_risks},
    correlation_id:correlationId,idempotency_key:`product-commitment-gate:${projectId}:${revisionId}`
  });
  await client.query(`UPDATE product_commitment_revisions SET status='PENDING_APPROVAL',gate_record_id=$2 WHERE id=$1`,[revisionId,gate.id]);
  await auditEvent(client,projectId,'PRODUCT_COMMITMENT_READY_FOR_APPROVAL',correlationId,{revision_id:revisionId,gate_record_id:gate.id,canonical_sha256:canonical.canonical_sha256,contract_version:PRODUCT_COMMITMENT_CONTRACT_VERSION},createdBy);
  return revisionProjection(client,revisionId);
};

const criticalDecisionEvidence=new Set([
  'candidate_modules','investment_and_risks','product_commitment_revision_id','canonical_sha256','contract_version',
  'requirements_revision_id','source_requirements_artifact_id','source_requirements_sha256','source_review_artifact_id','source_review_sha256'
]);

export const decideProductCommitmentGate = async (projectId:string, gateId:string, input:GateDecision) => withTransaction(async client=>{
  const project=(await client.query(`SELECT id FROM projects WHERE id=$1 FOR UPDATE`,[projectId])).rows[0];
  if(!project) throw new ApiError(404,'PROJECT_NOT_FOUND');
  const priorDecision=input.idempotency_key ? (await client.query(`SELECT d.gate_id,r.id AS revision_id FROM gate_decisions d LEFT JOIN product_commitment_revisions r ON r.gate_record_id=d.gate_id WHERE d.idempotency_key=$1`,[input.idempotency_key])).rows[0] : null;
  if(priorDecision){
    if(priorDecision.gate_id!==gateId||!priorDecision.revision_id) throw new ApiError(409,'IDEMPOTENCY_KEY_REUSED');
    return revisionProjection(client,priorDecision.revision_id);
  }
  const decisionEvidence=object(input.evidence,'GATE_DECISION_EVIDENCE_REQUIRED');
  if(Object.keys(decisionEvidence).some(key=>criticalDecisionEvidence.has(key))) throw new ApiError(422,'PRODUCT_COMMITMENT_DECISION_PAYLOAD_INVALID');
  const row=(await client.query(`SELECT r.*,g.gate_code,g.scope_type,g.scope_id,g.evidence AS gate_evidence,g.status AS gate_status,g.version AS gate_version
    FROM product_commitment_revisions r JOIN gate_records g ON g.id=r.gate_record_id AND g.project_id=r.project_id
    WHERE r.project_id=$1 AND g.id=$2 FOR UPDATE OF r,g`,[projectId,gateId])).rows[0];
  if(!row) throw new ApiError(404,'PRODUCT_COMMITMENT_GATE_NOT_FOUND');
  if(row.gate_code!=='PRODUCT_COMMITMENT'||row.scope_type!=='PROJECT'||row.scope_id!==projectId) throw new ApiError(409,'PRODUCT_COMMITMENT_GATE_BINDING_INVALID');
  if(row.status!=='PENDING_APPROVAL'||row.gate_status!=='OPEN') throw new ApiError(409,'PRODUCT_COMMITMENT_REVISION_NOT_PENDING');
  if(row.gate_evidence.product_commitment_revision_id!==row.id||row.gate_evidence.canonical_sha256!==row.canonical_sha256||row.gate_evidence.contract_version!==row.contract_version||row.gate_evidence.requirements_revision_id!==row.source_intake_revision_id||row.gate_evidence.source_requirements_artifact_id!==row.source_requirements_artifact_id||row.gate_evidence.source_requirements_sha256!==row.source_requirements_sha256||row.gate_evidence.source_review_artifact_id!==row.source_review_artifact_id||row.gate_evidence.source_review_sha256!==row.source_review_sha256) throw new ApiError(409,'PRODUCT_COMMITMENT_GATE_EVIDENCE_INVALID');
  const target=input.decision==='APPROVE'?'APPROVED':input.decision==='REWORK'?'REJECTED':null;
  if(!target) throw new ApiError(422,'GATE_DECISION_NOT_ALLOWED');
  const immediatePredecessor=row.supersedes_revision_id?(await client.query(`SELECT id,status,revision_number,logical_round FROM product_commitment_revisions WHERE id=$1 AND project_id=$2 FOR UPDATE`,[row.supersedes_revision_id,projectId])).rows[0]:null;
  if(row.supersedes_revision_id&&!immediatePredecessor) throw new ApiError(409,'PRODUCT_COMMITMENT_SUCCESSOR_LINEAGE_INVALID');
  const currentApproved=(await client.query(`SELECT id,revision_number,logical_round,canonical_sha256 FROM product_commitment_revisions WHERE project_id=$1 AND status='APPROVED' FOR UPDATE`,[projectId])).rows[0]??null;
  if(target==='APPROVED'&&currentApproved){
    const ancestor=(await client.query(`WITH RECURSIVE ancestry AS (
      SELECT id,supersedes_revision_id,revision_number,logical_round FROM product_commitment_revisions WHERE id=$1 AND project_id=$2
      UNION
      SELECT predecessor.id,predecessor.supersedes_revision_id,predecessor.revision_number,predecessor.logical_round
      FROM product_commitment_revisions predecessor JOIN ancestry successor ON successor.supersedes_revision_id=predecessor.id
      WHERE predecessor.project_id=$2
    ) SELECT 1 FROM ancestry WHERE id=$3 AND revision_number<$4 AND logical_round<$5`,[row.id,projectId,currentApproved.id,row.revision_number,row.logical_round])).rowCount;
    if(!ancestor) throw new ApiError(409,'PRODUCT_COMMITMENT_APPROVED_PREDECESSOR_MISMATCH');
  }
  const decided=await decideCatalogGate(client,projectId,gateId,input);
  if(target==='APPROVED'&&currentApproved){
    await client.query(`UPDATE product_commitment_revisions SET status='SUPERSEDED' WHERE id=$1`,[currentApproved.id]);
    await auditEvent(client,projectId,'PRODUCT_COMMITMENT_SUPERSEDED',decided.correlation_id,{revision_id:currentApproved.id,successor_revision_id:row.id,predecessor_canonical_sha256:currentApproved.canonical_sha256,successor_canonical_sha256:row.canonical_sha256},input.actor_id);
  }
  await client.query(`UPDATE product_commitment_revisions SET status=$2,approved_at=CASE WHEN $2='APPROVED' THEN clock_timestamp() ELSE NULL END WHERE id=$1`,[row.id,target]);
  await auditEvent(client,projectId,target==='APPROVED'?'PRODUCT_COMMITMENT_APPROVED':'PRODUCT_COMMITMENT_REJECTED',decided.correlation_id,{revision_id:row.id,gate_record_id:gateId,gate_decision_id:decided.decision_id,decision:input.decision,canonical_sha256:row.canonical_sha256,contract_version:row.contract_version,reason:input.reason},input.actor_id);
  return revisionProjection(client,row.id);
});

export const productCommitmentProjection = async (projectId:string) => {
  if(!(await pool.query(`SELECT 1 FROM projects WHERE id=$1`,[projectId])).rowCount) throw new ApiError(404,'PROJECT_NOT_FOUND');
  const revisions=(await pool.query(`SELECT id FROM product_commitment_revisions WHERE project_id=$1 ORDER BY revision_number DESC`,[projectId])).rows;
  const items=[];
  for(const revision of revisions) items.push(await revisionProjection(pool as unknown as pg.PoolClient,revision.id));
  return {contract_version:PRODUCT_COMMITMENT_CONTRACT_VERSION,approved_revision_id:items.find(item=>item.status==='APPROVED')?.id??null,items};
};
