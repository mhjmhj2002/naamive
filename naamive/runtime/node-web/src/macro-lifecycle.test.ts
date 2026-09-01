import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregateMacroLifecycle, candidateModuleFingerprint, commitmentMaterializationComplete, nextObligationGeneration, projectImplementationComplete, workItemNormativelySatisfied, type ModuleFacts, type ProjectFacts, type WorkItemFacts } from './macro-lifecycle.js';

const accepted:WorkItemFacts={workflowCode:'WORK_ITEM_DELIVERY',workflowVersion:2,required:true,acceptanceAccepted:true,integrationAccepted:true,validAttempt:true,openFinding:false,activeRecovery:false,activeRework:false,activeBlocker:false};

test('work-item satisfaction requires acceptance, integration and no normative impediment',()=>{
  assert.equal(workItemNormativelySatisfied(accepted),true);
  for(const patch of [{acceptanceAccepted:false},{integrationAccepted:false},{openFinding:true},{activeRecovery:true},{activeRework:true},{activeBlocker:true},{workflowVersion:1}])
    assert.equal(workItemNormativelySatisfied({...accepted,...patch}),false);
  assert.equal(workItemNormativelySatisfied({...accepted,acceptanceAccepted:false,validAttempt:true}),false,'completed execution is not acceptance');
  assert.equal(workItemNormativelySatisfied({...accepted,acceptanceAccepted:false,integrationAccepted:false,validAttempt:true}),false,'isolated QA/execution evidence is not acceptance');
});

test('missing evidence and active recovery never advance a module',()=>{
  const facts:ModuleFacts={kind:'MODULE',workflowCode:'MODULE_DELIVERY',workflowVersion:2,state:'IDENTIFIED',definitionAccepted:false,architectureAccepted:false,planningStarted:false,planProposed:false,planAccepted:false,workItems:[],integrationComplete:false,validationComplete:false,projectDelivered:false,evidenceRefs:[]};
  assert.equal(aggregateMacroLifecycle(facts).type,'NO_CHANGE');
  assert.equal(aggregateMacroLifecycle({...facts,workflowVersion:1}).type,'INVALID');
  assert.equal(workItemNormativelySatisfied({...accepted,activeRecovery:true}),false);
});

test('candidateModuleFingerprint:v1 is deterministic and treats source evidence as normative',()=>{
  const candidate={module_key:'billing',payload:{name:'Cobrança',objective:'Emitir cobranças',scope:['API','Persistência'],out_of_scope:[],dependencies:['accounts','accounts'],acceptance_criteria:['Emite fatura']},source_evidence:{requirement_refs:['REQ-2','REQ-1','REQ-1'],artifact_refs:[{artifact_id:'00000000-0000-4000-8000-000000000002',sha256:'b'.repeat(64)},{artifact_id:'00000000-0000-4000-8000-000000000001',sha256:'a'.repeat(64)}]}};
  const reordered={...candidate,payload:{...candidate.payload,dependencies:['accounts']},source_evidence:{requirement_refs:['REQ-1','REQ-2'],artifact_refs:[...candidate.source_evidence.artifact_refs].reverse()}};
  assert.equal(candidateModuleFingerprint(candidate),candidateModuleFingerprint(reordered));
  assert.notEqual(candidateModuleFingerprint(candidate),candidateModuleFingerprint({...reordered,source_evidence:{...reordered.source_evidence,requirement_refs:['REQ-1','REQ-3']}}));
});

test('macro aggregator advances only semantic predicates and reopens only explicit facts',()=>{
  const base:ProjectFacts={kind:'PROJECT',workflowCode:'PROJECT_DISCOVERY',workflowVersion:4,state:'IMPLEMENTATION',analysisAccepted:true,commitmentReady:true,commitmentApproved:true,architectureAccepted:true,projectPlanAccepted:true,deliveryAccepted:false,commitmentMaterializationComplete:true,obligationProjectionPending:false,requiredModules:[{moduleKey:'a',required:true,materialized:true,scopeChangePending:false,implementationStarted:true,integrationComplete:true,validationComplete:false}],evidenceRefs:['module:a']};
  assert.deepEqual(aggregateMacroLifecycle(base).targetState,'VALIDATION');
  assert.equal(projectImplementationComplete({...base,requiredModules:[{...base.requiredModules[0],materialized:false}]}),false);
  assert.equal(projectImplementationComplete({...base,requiredModules:[{...base.requiredModules[0],scopeChangePending:true}]}),false);
  assert.equal(aggregateMacroLifecycle({...base,workflowVersion:3}).type,'INVALID');
  const reopen=aggregateMacroLifecycle({...base,state:'DELIVERY',explicitReopening:'PRODUCT_COMMITMENT_EVOLUTION'});
  assert.equal(reopen.type,'REOPEN_TRANSITION');assert.equal(reopen.targetState,'ARCHITECTURE');
  assert.equal(aggregateMacroLifecycle({...base,state:'DELIVERY',requiredModules:[{...base.requiredModules[0],integrationComplete:false}]}).type,'NO_CHANGE');
});

test('commitment materialization completion is revision-scoped and fail-closed',()=>{
  assert.equal(commitmentMaterializationComplete('APPROVED',[{moduleKey:'a',resolution:'SAME',complete:true},{moduleKey:'b',resolution:'CHANGED',complete:true}],['a','b']),true);
  assert.equal(commitmentMaterializationComplete('APPROVED',[{moduleKey:'a',resolution:'SAME',complete:true}],['a','b']),false);
  assert.equal(commitmentMaterializationComplete('SUPERSEDED',[{moduleKey:'a',resolution:'SAME',complete:true}],['a']),false);
});

test('obligation generations advance only after a resolved generation',()=>{
  assert.equal(nextObligationGeneration([]),1);
  assert.equal(nextObligationGeneration([1]),2);
  assert.equal(nextObligationGeneration([3,1,2]),4);
});
