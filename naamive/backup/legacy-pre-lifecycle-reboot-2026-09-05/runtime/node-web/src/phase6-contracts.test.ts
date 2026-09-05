import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import Ajv2020Module from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'orchestration', 'demand-intake', 'node-web-orchestration-platform', 'phase-6-contracts');
const names = ['assurance-policy','work-acceptance','review-package','review-decision','work-block','assistance-proposal','human-gate-decision'];
const id = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const correlationId = '33333333-3333-4333-8333-333333333333';
const artifact = { artifactId:id, sha256:'a'.repeat(64), schemaVersion:1 };

const fixtures: Record<string,Record<string,unknown>> = {
  'assurance-policy': { schemaVersion:1,policyId:id,name:'critical',version:1,enabled:true,selectors:{taskTypes:['ANALYZE_PRODUCT_NEED'],classifications:['INTERNAL']},configuration:{schema_version:1,max_rework_rounds:2,reviewer_runtime_ids:[otherId]},idempotencyKey:'publish-assurance-0001' },
  'work-acceptance': { schemaVersion:1,acceptanceId:id,executionId:otherId,projectId:'project-1',correlationId,policyId:id,policyVersion:1,version:1,classification:'INTERNAL',state:'PENDING_REVIEW',mode:'PRODUCE',outputReference:artifact,idempotencyKey:'acceptance-create-0001' },
  'review-package': { schemaVersion:1,reviewId:id,acceptanceId:otherId,correlationId,version:1,classification:'INTERNAL',contract:{schema_version:1},authorizedActivity:{mode:'REVIEW'},inputArtifacts:[artifact],expectedOutputs:{decision:'structured'},requiredEvidence:{traceable:true},completionCriteria:{complete:true},outputReference:artifact },
  'review-decision': { schemaVersion:1,decisionId:id,reviewId:otherId,reviewVersion:1,correlationId,classification:'INTERNAL',decision:'ACCEPT',evidence:{hash:'a'.repeat(64)},idempotencyKey:'review-decision-0001' },
  'work-block': { schemaVersion:1,blockId:id,projectId:'project-1',sourceType:'WORK_ACCEPTANCE',sourceId:'acceptance-1',blockCode:'NO_REVIEWER',category:'ENVIRONMENT',severity:'HIGH',state:'OPEN',cycle:1,correlationId,classification:'INTERNAL',symptoms:[{code:'NO_CAPACITY'}],attempts:[],suspectedCauses:[{code:'RUNTIME_UNAVAILABLE'}],responsibleRole:'engineering-operations',evidence:{reason:'unavailable'},idempotencyKey:'work-block-open-0001' },
  'assistance-proposal': { schemaVersion:1,proposalId:id,blockId:otherId,correlationId,classification:'INTERNAL',alternatives:[{impact:'low',tradeoff:'time'}],recommendation:{option:1},confidence:0.8,routingRole:'engineering-operations',humanDecisionRequired:true,idempotencyKey:'assistance-proposal-1' },
  'human-gate-decision': { schemaVersion:1,gateId:id,projectId:'project-1',gateType:'INDEPENDENCE_EXCEPTION',actorId:'lead-1',actorRole:'TECH_LEAD',decision:'APPROVED',reason:'runtime exception',evidence:{reference:'incident-1'},scope:{acceptance_id:otherId},correlationId,classification:'INTERNAL',idempotencyKey:'human-gate-decision-1' },
};

test('F6 publishes closed versioned contracts without prohibited execution data', async () => {
  const Ajv2020 = (Ajv2020Module as any).default ?? Ajv2020Module;
  const addFormats = (addFormatsModule as any).default ?? addFormatsModule;
  const ajv = new Ajv2020({ allErrors:true,strict:false });
  addFormats(ajv);
  ajv.addSchema(JSON.parse(await readFile(join(root,'common.schema.json'),'utf8')));
  for (const name of names) ajv.addSchema(JSON.parse(await readFile(join(root,`${name}.schema.json`),'utf8')));
  for (const name of names) {
    const validate = ajv.getSchema(`naamive://assurance/v1/${name}`)!;
    assert.equal(validate(fixtures[name]),true,`${name}: ${ajv.errorsText(validate.errors)}`);
    assert.equal(validate({...fixtures[name],unexpected:true}),false,`${name} must reject extra properties`);
  }
  const decision = ajv.getSchema('naamive://assurance/v1/review-decision')!;
  assert.equal(decision({...fixtures['review-decision'],evidence:{stdout:'forbidden'}}),false);
});
