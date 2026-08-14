import test from 'node:test';
import assert from 'node:assert/strict';
import { AssuranceError, contextHash, independenceCheck, maximumClassification, routingRoleForCategory, safeEvidence, validateAssurancePolicy } from './assurance.js';

const producer={agentId:'producer',agentVersion:'1',runtimeId:'runtime-a',configurationVersion:1,policyId:'policy-a',policyVersion:1,executionContextHash:'produce-context'};

test('F6 assurance keeps the reviewer independent and only allows a runtime exception',()=>{
  assert.equal(independenceCheck(producer,{...producer,agentId:'reviewer',executionContextHash:'review-context',runtimeId:'runtime-b'}).eligible,true);
  assert.equal(independenceCheck(producer,{...producer,agentId:'reviewer',executionContextHash:'review-context'}).eligible,false);
  assert.equal(independenceCheck(producer,{...producer,agentId:'reviewer',executionContextHash:'review-context'},true).eligible,true);
  assert.equal(independenceCheck(producer,{...producer,executionContextHash:'review-context'},true).eligible,false);
});

test('F6 assurance rejects prohibited data and closed policy extensions',()=>{
  assert.throws(()=>safeEvidence({stdout:'unsafe'}),AssuranceError);
  assert.throws(()=>validateAssurancePolicy({unexpected:true},{}),AssuranceError);
  assert.deepEqual(validateAssurancePolicy({taskTypes:['ANALYZE_PRODUCT_NEED']},{schema_version:1}).configuration,{schema_version:1});
  assert.throws(()=>validateAssurancePolicy({},{}),AssuranceError);
  assert.equal(maximumClassification('PUBLIC','RESTRICTED','INTERNAL'),'RESTRICTED');
  assert.equal(contextHash({evidence:'safe'}),contextHash({evidence:'safe'}));
});

test('F6 routing is deterministic and advisory categories do not create authority',()=>{
  assert.equal(routingRoleForCategory('REQUIREMENT_AMBIGUITY'),'requirements-engineering');
  assert.equal(routingRoleForCategory('ARCHITECTURE_CONFLICT'),'solution-architecture');
  assert.equal(routingRoleForCategory('DEPENDENCY'),'integration-engineering');
  assert.equal(routingRoleForCategory('SECURITY'),'security-assurance');
  assert.equal(routingRoleForCategory('unknown'),'engineering-operations');
});
