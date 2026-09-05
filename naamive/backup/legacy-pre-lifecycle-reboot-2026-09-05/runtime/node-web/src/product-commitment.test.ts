import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalProductCommitment, validateProductCommitmentProposal } from './product-commitment.js';

const validProposal=()=>({
  contract_version:'PRODUCT_COMMITMENT_MODULES:v1',
  candidate_modules:[
    {module_key:'api',name:' API ',objective:'Publicar API',scope:['Contrato','Persistência'],out_of_scope:['Interface'],dependencies:['store'],acceptance_criteria:['Contrato validado','Dados persistidos'],source_evidence:{requirement_refs:['REQ-2','REQ-1'],artifact_refs:[{artifact_id:'00000000-0000-4000-8000-000000000002',sha256:'b'.repeat(64)},{artifact_id:'00000000-0000-4000-8000-000000000001',sha256:'a'.repeat(64)}]}},
    {module_key:'store',name:'Persistência',objective:'Persistir dados',scope:['Schema'],out_of_scope:[],dependencies:[],acceptance_criteria:['Constraints ativas'],source_evidence:{requirement_refs:[],artifact_refs:[]}}
  ],
  investment_and_risks:{investment:['Incremental'],risks:['Adoção']}
});
const source={source_intake_revision_id:'00000000-0000-4000-8000-000000000010',source_requirements_artifact_id:'00000000-0000-4000-8000-000000000011',source_requirements_sha256:'c'.repeat(64)};

test('PRODUCT_COMMITMENT_MODULES:v1 validates and canonicalizes the normative snapshot',()=>{
  const proposal=validateProductCommitmentProposal(validProposal());
  assert.deepEqual(proposal.candidate_modules.map(module=>module.module_key),['api','store']);
  assert.equal(proposal.candidate_modules[0].name,'API');
  assert.deepEqual(proposal.candidate_modules[0].dependencies,['store']);
  assert.deepEqual(proposal.candidate_modules[0].source_evidence.requirement_refs,['REQ-1','REQ-2']);
  assert.deepEqual(proposal.candidate_modules[0].source_evidence.artifact_refs.map(reference=>reference.artifact_id),['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002']);
});

test('PRODUCT_COMMITMENT_MODULES:v1 rejects malformed and authority-bearing proposals',()=>{
  const invalid:Array<[string,(proposal:any)=>void,string]>=[
    ['invalid contract version',proposal=>{proposal.contract_version='PRODUCT_COMMITMENT_MODULES:v2';},'PRODUCT_COMMITMENT_CONTRACT_VERSION_INVALID'],
    ['empty modules',proposal=>{proposal.candidate_modules=[];},'PRODUCT_COMMITMENT_CANDIDATE_MODULES_INVALID'],
    ['invalid key',proposal=>{proposal.candidate_modules[0].module_key='API';},'PRODUCT_COMMITMENT_MODULE_KEY_INVALID'],
    ['duplicate key',proposal=>{proposal.candidate_modules[1].module_key='api';},'PRODUCT_COMMITMENT_MODULE_KEY_DUPLICATE'],
    ['missing field',proposal=>{delete proposal.candidate_modules[0].objective;},'PRODUCT_COMMITMENT_OBJECTIVE_INVALID'],
    ['missing dependency',proposal=>{proposal.candidate_modules[0].dependencies=['missing'];},'PRODUCT_COMMITMENT_DEPENDENCY_NOT_FOUND'],
    ['self dependency',proposal=>{proposal.candidate_modules[0].dependencies=['api'];},'PRODUCT_COMMITMENT_SELF_DEPENDENCY'],
    ['cycle',proposal=>{proposal.candidate_modules[1].dependencies=['api'];},'PRODUCT_COMMITMENT_DEPENDENCY_CYCLE'],
    ['duplicate dependency',proposal=>{proposal.candidate_modules[0].dependencies=['store','store'];},'PRODUCT_COMMITMENT_DEPENDENCY_DUPLICATE'],
    ['missing source evidence',proposal=>{delete proposal.candidate_modules[0].source_evidence;},'PRODUCT_COMMITMENT_SOURCE_EVIDENCE_INVALID'],
    ['invalid artifact evidence',proposal=>{proposal.candidate_modules[0].source_evidence.artifact_refs[0].sha256='not-a-hash';},'PRODUCT_COMMITMENT_ARTIFACT_REFS_INVALID'],
    ['duplicate source evidence',proposal=>{proposal.candidate_modules[0].source_evidence.requirement_refs=['REQ-1','REQ-1'];},'PRODUCT_COMMITMENT_SOURCE_REFERENCE_DUPLICATE'],
    ['empty investment and risks',proposal=>{proposal.investment_and_risks={};},'PRODUCT_COMMITMENT_INVESTMENT_AND_RISKS_INVALID'],
    ['server state',proposal=>{proposal.candidate_modules[0].status='APPROVED';},'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED'],
    ['database id',proposal=>{proposal.candidate_modules[0].id='00000000-0000-4000-8000-000000000099';},'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED'],
    ['top-level timestamp',proposal=>{proposal.created_at=new Date().toISOString();},'PRODUCT_COMMITMENT_CRITICAL_FIELD_NOT_ALLOWED']
  ];
  for(const [name,mutate,code] of invalid){
    const proposal=validProposal();mutate(proposal);
    assert.throws(()=>validateProductCommitmentProposal(proposal),new RegExp(code),name);
  }
});

test('canonical hash is deterministic, set-order independent and normative-field sensitive',()=>{
  const original=validProposal();
  const reordered=validProposal();
  reordered.candidate_modules.reverse();
  reordered.candidate_modules[1].source_evidence.requirement_refs.reverse();
  reordered.candidate_modules[1].source_evidence.artifact_refs.reverse();
  const first=canonicalProductCommitment(validateProductCommitmentProposal(original),source);
  const second=canonicalProductCommitment(validateProductCommitmentProposal(reordered),source);
  assert.equal(first.canonical_sha256,second.canonical_sha256);
  assert.equal(first.canonical_json,second.canonical_json);

  const changed=validProposal();changed.candidate_modules[0].objective='Publicar outra API';
  assert.notEqual(first.canonical_sha256,canonicalProductCommitment(validateProductCommitmentProposal(changed),source).canonical_sha256);
  const orderedMeaning=validProposal();orderedMeaning.candidate_modules[0].scope.reverse();
  assert.notEqual(first.canonical_sha256,canonicalProductCommitment(validateProductCommitmentProposal(orderedMeaning),source).canonical_sha256);

  const investmentOnly=validProposal();investmentOnly.investment_and_risks={investment:['Outro valor'],risks:['Outro risco']};
  assert.equal(first.canonical_sha256,canonicalProductCommitment(validateProductCommitmentProposal(investmentOnly),source).canonical_sha256);
  assert.equal(Object.hasOwn(first.document,'created_at'),false);
  assert.equal(Object.hasOwn(first.document,'gate_record_id'),false);
});
