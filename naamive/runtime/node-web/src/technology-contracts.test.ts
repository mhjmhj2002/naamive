import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.phase5-contract-tests`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'phase5-contract-tester';

const {
  validateTechnologyCategory,
  validateTechnologyCatalogItem,
  validateTechnologyCatalogRevision,
  validateTechnologyProfile,
  validateTechnologyProfileItem,
  validateTechnologyCompatibilityRule,
  validateTechnologySelectionContext,
  validateTechnologyInventory,
  validateTechnologyBaseline,
  validateTechnologyBaselineItem,
  validateTechnologyDeferredDecision,
  validateTechnologyBaselineRevision,
  validateTechnologyBaselineRevisionPayload,
  validateCategoriesSeed,
  validateCatalogItemsSeed,
  validateProfilesSeed,
  validateProfileItemsSeed,
  validateCompatibilityRulesSeed,
  validateCatalogRevisionSeedFile,
  ContractValidationError,
  validateBaselineVersionGovernance,
  validateBaselineReferencesResolve,
  assertNoFreeTechnologyFields,
  CLASSIFICATIONS,
  SELECTION_MODES,
  RELATIONSHIP_TYPES,
  SEVERITIES,
  CATALOG_REVISION_STATUSES,
  BASELINE_REVISION_STATUSES,
  RESOLUTION_RESULTS,
  VERSION_GOVERNANCE_MODES,
  DEFER_DECISION_TYPE
} = await import('./technology-contracts.js');

const uuid = (seed: number) => `${seed.toString(16).padStart(8, '0').slice(-8)}-0000-4000-8000-000000000000`;
const HASH = 'a'.repeat(64);

const itemId = uuid(1);
const categoryId = uuid(2);
const profileId = uuid(3);
const revisionId = uuid(4);
const projectId = uuid(5);
const baselineId = uuid(6);
const contextId = uuid(7);
const ruleId = uuid(8);

const validCategory = {
  id: categoryId,
  code: 'LANGUAGE',
  name: 'Linguagem',
  selection_mode: 'SINGLE',
  min_selections: 1,
  max_selections: 1,
  is_active: true,
  display_order: 30
};

const validCatalogItem = {
  id: itemId,
  category_id: categoryId,
  code: 'TYPESCRIPT',
  name: 'TypeScript',
  is_active: true,
  display_order: 30,
  metadata: { version_governance: 'UNMANAGED' }
};

const validCatalogRevision = {
  id: revisionId,
  revision_number: 1,
  status: 'PUBLISHED',
  description: 'Publicação inicial',
  content_hash: HASH,
  published_at: new Date().toISOString(),
  published_by: 'seed-publisher'
};

const validProfile = {
  id: profileId,
  code: 'TYPESCRIPT_MODULAR_MONOLITH',
  name: 'TypeScript Modular Monolith',
  is_active: true
};

const validProfileItem = {
  profile_id: profileId,
  catalog_item_id: itemId,
  classification: 'REQUIRED',
  version_constraint: null,
  justification: 'Escolha aprovada',
  display_order: 10
};

const validCompatibilityRule = {
  id: ruleId,
  source_item_id: itemId,
  relationship_type: 'REQUIRES',
  target_item_id: uuid(9),
  severity: 'ERROR',
  message: 'Regra genérica',
  is_active: true
};

const validSelectionContext = {
  id: contextId,
  project_id: projectId,
  technology_catalog_revision_id: revisionId,
  technology_profile_id: profileId,
  status: 'READY',
  hash: HASH
};

const validInventoryFact = {
  source_path: 'package.json',
  detector_code: 'package-json',
  confidence: 0.9,
  resolution_result: 'RESOLVED_ACTIVE',
  catalog_item_id: itemId
};

const validInventory = {
  project_id: projectId,
  repository_sha: 'a'.repeat(40),
  technology_catalog_revision_id: revisionId,
  facts: [validInventoryFact],
  content_hash: HASH
};

const validBaseline = {
  id: baselineId,
  project_id: projectId
};

const validBaselineItem = {
  catalog_item_id: itemId,
  classification: 'REQUIRED',
  version_constraint: '>=22 <23',
  reason: 'Compatibilidade com a plataforma do projeto'
};

const validDeferredDecision = {
  decision_type: DEFER_DECISION_TYPE,
  category_id: categoryId,
  question: 'Qual estratégia de observabilidade será adotada?',
  justification: 'Decisão deixada para a arquitetura do módulo'
};

const validBaselineRevision = {
  id: uuid(10),
  baseline_id: baselineId,
  project_id: projectId,
  revision_number: 1,
  technology_catalog_revision_id: revisionId,
  status: 'DRAFT',
  items: [validBaselineItem],
  deferred_decisions: [validDeferredDecision]
};

const validBaselineRevisionPayload = {
  technology_catalog_revision_id: revisionId,
  items: [validBaselineItem],
  deferred_decisions: [validDeferredDecision]
};

// ---------------------------------------------------------------------------
// Tipos e constantes canônicas
// ---------------------------------------------------------------------------

test('declares canonical neutral constants without free technology values', () => {
  assert.deepEqual(CLASSIFICATIONS, ['REQUIRED', 'ALLOWED', 'PREFERRED', 'PROHIBITED']);
  assert.deepEqual(SELECTION_MODES, ['SINGLE', 'MULTIPLE']);
  assert.deepEqual(RELATIONSHIP_TYPES, ['REQUIRES', 'CONFLICTS_WITH', 'RECOMMENDS']);
  assert.deepEqual(SEVERITIES, ['ERROR', 'WARNING', 'INFO']);
  assert.deepEqual(CATALOG_REVISION_STATUSES, ['DRAFT', 'PUBLISHED', 'SUPERSEDED']);
  assert.deepEqual(BASELINE_REVISION_STATUSES, ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED']);
  assert.deepEqual(RESOLUTION_RESULTS, ['RESOLVED_ACTIVE', 'RESOLVED_INACTIVE', 'UNKNOWN_CATALOG_ITEM', 'AMBIGUOUS_CATALOG_ITEM']);
  assert.deepEqual(VERSION_GOVERNANCE_MODES, ['REQUIRED', 'UNMANAGED']);
  assert.equal(DEFER_DECISION_TYPE, 'DEFER_TO_MODULE_ARCHITECTURE');
});

// ---------------------------------------------------------------------------
// Payloads válidos
// ---------------------------------------------------------------------------

test('validates canonical catalog, profile, rule, context and inventory records', async () => {
  assert.equal((await validateTechnologyCategory(validCategory)).code, 'LANGUAGE');
  assert.equal((await validateTechnologyCatalogItem(validCatalogItem)).code, 'TYPESCRIPT');
  assert.equal((await validateTechnologyCatalogRevision(validCatalogRevision)).status, 'PUBLISHED');
  assert.equal((await validateTechnologyProfile(validProfile)).code, 'TYPESCRIPT_MODULAR_MONOLITH');
  assert.equal((await validateTechnologyProfileItem(validProfileItem)).classification, 'REQUIRED');
  assert.equal((await validateTechnologyCompatibilityRule(validCompatibilityRule)).relationship_type, 'REQUIRES');
  assert.equal((await validateTechnologySelectionContext(validSelectionContext)).status, 'READY');
  assert.equal((await validateTechnologyInventory(validInventory)).facts.length, 1);
});

test('validates baseline, item, deferred decision, revision and payload', async () => {
  assert.equal((await validateTechnologyBaseline(validBaseline)).project_id, projectId);
  const item = await validateTechnologyBaselineItem(validBaselineItem);
  assert.equal(item.classification, 'REQUIRED');
  assert.equal(item.version_constraint, '>=22 <23');
  const decision = await validateTechnologyDeferredDecision(validDeferredDecision);
  assert.equal(decision.decision_type, 'DEFER_TO_MODULE_ARCHITECTURE');
  assert.equal((await validateTechnologyBaselineRevision(validBaselineRevision)).status, 'DRAFT');
  const payload = await validateTechnologyBaselineRevisionPayload(validBaselineRevisionPayload);
  assert.equal(payload.technology_catalog_revision_id, revisionId);
  assert.equal(payload.items.length, 1);
});

// ---------------------------------------------------------------------------
// Propriedades extras e referências sem conteúdo
// ---------------------------------------------------------------------------

test('rejects extra properties and non-reference content in baseline payload', async () => {
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [validBaselineItem],
      unexpected: true
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [{ ...validBaselineItem, content: 'forbidden' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
});

test('rejects missing required reference fields in baseline item', async () => {
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [{ classification: 'REQUIRED', reason: 'sem referência' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [{ catalog_item_id: itemId, reason: 'sem classificação' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
});

test('rejects baseline payload without technology_catalog_revision_id', async () => {
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({ items: [validBaselineItem] }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
});

test('rejects empty reason in baseline item', async () => {
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [{ catalog_item_id: itemId, classification: 'REQUIRED', reason: '' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
});

// ---------------------------------------------------------------------------
// Versão obrigatória quando version_governance = REQUIRED
// ---------------------------------------------------------------------------

test('requires version_constraint when version_governance is REQUIRED', () => {
  const governance = new Map<string, 'REQUIRED' | 'UNMANAGED'>([[itemId, 'REQUIRED']]);
  assert.throws(
    () => validateBaselineVersionGovernance({ technology_catalog_revision_id: revisionId, items: [{ catalog_item_id: itemId, classification: 'REQUIRED', reason: 'justificativa' }] }, governance),
    (error: any) => error instanceof ContractValidationError && error.code === 'BASELINE_VERSION_CONSTRAINT_REQUIRED'
  );
  assert.doesNotThrow(() => validateBaselineVersionGovernance({
    technology_catalog_revision_id: revisionId,
    items: [{ catalog_item_id: itemId, classification: 'REQUIRED', version_constraint: '>=22 <23', reason: 'justificativa' }]
  }, governance));
});

test('does not require version_constraint when version_governance is UNMANAGED', () => {
  const governance = new Map<string, 'REQUIRED' | 'UNMANAGED'>([[itemId, 'UNMANAGED']]);
  assert.doesNotThrow(() => validateBaselineVersionGovernance({
    technology_catalog_revision_id: revisionId,
    items: [{ catalog_item_id: itemId, classification: 'REQUIRED', reason: 'justificativa' }]
  }, governance));
});

// ---------------------------------------------------------------------------
// Referências sem conteúdo (resolução contra o snapshot publicado)
// ---------------------------------------------------------------------------

test('rejects catalog_item_id that does not resolve in the published snapshot', () => {
  const available = new Set<string>([itemId]);
  assert.throws(
    () => validateBaselineReferencesResolve({
      technology_catalog_revision_id: revisionId,
      items: [{ catalog_item_id: uuid(99), classification: 'ALLOWED', reason: 'fora do snapshot' }]
    }, available),
    (error: any) => error instanceof ContractValidationError && error.code === 'BASELINE_CATALOG_ITEM_UNRESOLVED'
  );
  assert.doesNotThrow(() => validateBaselineReferencesResolve({
    technology_catalog_revision_id: revisionId,
    items: [{ catalog_item_id: itemId, classification: 'ALLOWED', reason: 'presente' }]
  }, available));
});

// ---------------------------------------------------------------------------
// Decisão aberta explícita
// ---------------------------------------------------------------------------

test('validates explicit open deferred decision with question and justification', async () => {
  const decision = await validateTechnologyDeferredDecision(validDeferredDecision);
  assert.equal(decision.decision_type, 'DEFER_TO_MODULE_ARCHITECTURE');
  assert.ok(decision.question.length > 0);
  assert.ok(decision.justification.length > 0);
});

test('rejects deferred decision with empty question or justification', async () => {
  await assert.rejects(
    () => validateTechnologyDeferredDecision({ ...validDeferredDecision, question: '' }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_DEFERRED_DECISION_INVALID'
  );
  await assert.rejects(
    () => validateTechnologyDeferredDecision({ ...validDeferredDecision, justification: '' }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_DEFERRED_DECISION_INVALID'
  );
});

// ---------------------------------------------------------------------------
// Ausência de texto tecnológico livre em tipo, schema e validação
// ---------------------------------------------------------------------------

test('rejects free-technology fields in any payload', async () => {
  // O schema rejeita estruturalmente o campo de tecnologia em texto livre
  // (additionalProperties: false) antes da validação semântica; a rejeição
  // semântica dedicada FREE_TECHNOLOGY_FIELD_FORBIDDEN é coberta pelo teste
  // direto de assertNoFreeTechnologyFields.
  await assert.rejects(
    () => validateTechnologyBaselineRevisionPayload({
      technology_catalog_revision_id: revisionId,
      items: [{ catalog_item_id: itemId, classification: 'REQUIRED', reason: 'x', technology_name: 'PostgreSQL' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID'
  );
});

test('assertNoFreeTechnologyFields rejects each forbidden field name', () => {
  for (const field of ['technology_name', 'ecosystem', 'technology_version', 'framework']) {
    assert.throws(
      () => assertNoFreeTechnologyFields({ items: [{ [field]: 'value' }] }),
      (error: any) => error instanceof ContractValidationError && error.code === 'FREE_TECHNOLOGY_FIELD_FORBIDDEN'
    );
  }
});

test('assertNoFreeTechnologyFields allows reason text as non-identity', () => {
  assert.doesNotThrow(() => assertNoFreeTechnologyFields({ items: [{ catalog_item_id: itemId, reason: 'Texto explicativo sem identidade tecnológica' }] }));
});

// ---------------------------------------------------------------------------
// Seeds: envelope comum e schemas versionados
// ---------------------------------------------------------------------------

test('validates category seed with common envelope', async () => {
  const seed = await validateCategoriesSeed({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ code: 'LANGUAGE', name: 'Linguagem', selection_mode: 'SINGLE', min_selections: 1, max_selections: 1, is_active: true, display_order: 30 }]
  });
  assert.equal(seed.schema_version, 'technology-catalog/v1');
  assert.equal(seed.records.length, 1);
});

test('rejects seed with divergent schema_version', async () => {
  await assert.rejects(
    () => validateCategoriesSeed({
      schema_version: 'technology-catalog/v9',
      catalog_revision: 1,
      records: []
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'CATEGORIES_SEED_INVALID'
  );
});

test('rejects category seed with invalid selection_mode', async () => {
  await assert.rejects(
    () => validateCategoriesSeed({
      schema_version: 'technology-catalog/v1',
      catalog_revision: 1,
      records: [{ code: 'LANGUAGE', name: 'Linguagem', selection_mode: 'WEIRD', min_selections: 1, max_selections: 1, is_active: true, display_order: 30 }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'CATEGORIES_SEED_INVALID'
  );
});

test('validates catalog items, profiles, profile items, compatibility rules and revision seeds', async () => {
  const itemsSeed = await validateCatalogItemsSeed({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ category_code: 'LANGUAGE', code: 'TYPESCRIPT', name: 'TypeScript', is_active: true, display_order: 30, metadata: { version_governance: 'UNMANAGED' } }]
  });
  assert.equal(itemsSeed.records[0].code, 'TYPESCRIPT');

  const profilesSeed = await validateProfilesSeed({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ code: 'TYPESCRIPT_MODULAR_MONOLITH', name: 'TypeScript Modular Monolith', is_active: true }]
  });
  assert.equal(profilesSeed.records[0].is_active, true);

  const profileItemsSeed = await validateProfileItemsSeed({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ profile_code: 'TYPESCRIPT_MODULAR_MONOLITH', catalog_item_code: 'TYPESCRIPT', classification: 'REQUIRED', version_constraint: null, display_order: 30 }]
  });
  assert.equal(profileItemsSeed.records[0].classification, 'REQUIRED');

  const rulesSeed = await validateCompatibilityRulesSeed({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ source_item_code: 'MODULAR_MONOLITH', relationship_type: 'REQUIRES', target_item_code: 'IN_PROCESS_MODULE_CALL', severity: 'ERROR', message: 'Monólito modular requer comunicação interna em processo.', is_active: true }]
  });
  assert.equal(rulesSeed.records[0].relationship_type, 'REQUIRES');

  const revisionSeed = await validateCatalogRevisionSeedFile({
    schema_version: 'technology-catalog/v1',
    catalog_revision: 1,
    records: [{ catalog_revision: 1, description: 'Publicação inicial', content_hash: HASH }]
  });
  assert.equal(revisionSeed.records[0].catalog_revision, 1);
});

test('rejects seed record with free-technology field', async () => {
  // O schema rejeita estruturalmente o campo de tecnologia em texto livre
  // (additionalProperties: false) antes da validação semântica; a rejeição
  // semântica dedicada FREE_TECHNOLOGY_FIELD_FORBIDDEN é coberta pelo teste
  // direto de assertNoFreeTechnologyFields.
  await assert.rejects(
    () => validateCatalogItemsSeed({
      schema_version: 'technology-catalog/v1',
      catalog_revision: 1,
      records: [{ category_code: 'LANGUAGE', code: 'TYPESCRIPT', name: 'TypeScript', is_active: true, display_order: 30, metadata: { version_governance: 'UNMANAGED' }, framework: 'NestJS' }]
    }),
    (error: any) => error instanceof ContractValidationError && error.code === 'CATALOG_ITEMS_SEED_INVALID'
  );
});
