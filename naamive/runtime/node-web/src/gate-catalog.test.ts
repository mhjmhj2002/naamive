import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
const { gateCatalog, gateCatalogHash, gateDefinition, validateGateOpening } = await import('./gate-catalog.js');

const materialEvidence={policy_id:'architecture/materiality',policy_version:1,material_impacts:['public API'],alternatives:['compatible change'],affected_boundaries:['module:billing']};

test('GAT-01 publishes a closed, versioned catalog with every normative gate and no legacy universal gate', () => {
  const codes=gateCatalog().map(item=>item.code);
  for(const code of ['REGISTER_PROJECT','PRODUCT_COMMITMENT','MODULE_PLAN_APPROVAL','DELIVERY_ACCEPTANCE','MATERIAL_ARCHITECTURE','MATERIAL_RISK','SECURITY_COMPLIANCE','INDEPENDENCE_EXCEPTION','REWORK_ESCALATION','ESCALATED_CLOSURE']) assert.ok(codes.includes(code),code);
  assert.ok(!codes.includes('MODULE_APPROVAL'));
  assert.ok(!codes.includes('ARCHITECTURE_DECISION'));
  assert.match(gateCatalogHash,/^[a-f0-9]{64}$/);
  for(const entry of gateCatalog()) {
    assert.ok(entry.condition_code);
    assert.ok(entry.required_evidence.length);
    assert.ok(entry.authority_roles.length);
    assert.ok(Object.keys(entry.decisions).length);
    for(const effect of Object.values(entry.decisions)) assert.ok(effect.consequence && effect.next_state && effect.continuation);
  }
});

test('GAT-01 opens material architecture only with its published condition and complete proof', () => {
  assert.doesNotThrow(()=>validateGateOpening({gate_code:'MATERIAL_ARCHITECTURE',scope_type:'MODULE',scope_id:'module-1',condition_code:'MATERIALITY_POLICY_MATCHED',evidence:materialEvidence,reason:'Interface pública afetada.'}));
  assert.throws(()=>validateGateOpening({gate_code:'MATERIAL_ARCHITECTURE',scope_type:'MODULE',scope_id:'module-1',condition_code:'MATERIALITY_POLICY_MATCHED',evidence:{...materialEvidence,alternatives:[]},reason:'Interface pública afetada.'}),/GATE_EVIDENCE_INCOMPLETE/);
  assert.throws(()=>validateGateOpening({gate_code:'MATERIAL_ARCHITECTURE',scope_type:'MODULE',scope_id:'module-1',condition_code:'needs_human',evidence:materialEvidence,reason:'texto livre'}),/GATE_CONDITION_NOT_PUBLISHED/);
});

test('GAT-01 tests presence and absence for every conditional gate', () => {
  for(const entry of gateCatalog().filter(item=>item.type==='CONDITIONAL')) {
    const evidence=Object.fromEntries(entry.required_evidence.map(key=>[key,key==='finding_ids'||key==='material_impacts'||key==='alternatives'||key==='affected_boundaries'||key==='mitigations'||key==='attempts'?['evidence']:'evidence']));
    const input={gate_code:entry.code,scope_type:entry.scopes[0],scope_id:'scope-1',condition_code:entry.condition_code,evidence,reason:'Condição normativa comprovada.'};
    assert.doesNotThrow(()=>validateGateOpening(input),entry.code);
    const missing={...evidence}; delete missing[entry.required_evidence[0]];
    assert.throws(()=>validateGateOpening({...input,evidence:missing}),/GATE_EVIDENCE_INCOMPLETE/,entry.code);
  }
});

test('GAT-01 does not turn technical control states into a human gate', () => {
  for(const technical of ['WAITING_FOR_DEPENDENCIES','ELIGIBLE_FOR_DISPATCH','QA_IN_PROGRESS','INDEPENDENT_REVIEW','OUTPUT_SUBMITTED','EVIDENCE_REVIEW','INTEGRATING']) {
    assert.throws(()=>gateDefinition(technical),/GATE_NOT_CATALOGED/,technical);
  }
});

test('GAT-01 publishes complete operational exits for every escalation decision', () => {
  for(const code of ['REWORK_ESCALATION','ESCALATED_CLOSURE']) {
    const entry=gateDefinition(code);
    assert.equal(entry.type,'CONDITIONAL');
    assert.ok(entry.required_evidence.includes('escalation_reason'));
    for(const effect of Object.values(entry.decisions)) {
      assert.ok(effect.consequence);
      assert.ok(effect.next_state);
      assert.ok(effect.continuation);
    }
  }
});
