/**
 * Contratos neutros do Technology Catalog e da Technology Baseline (F5-01).
 *
 * Este módulo é a fonte canônica das constantes genéricas e dos tipos neutros do
 * domínio da Fase 5. A engine conhece somente enums genéricos de ciclo de vida,
 * classificação, selection_mode, relationship_type, severity e resultado de
 * resolução. Nenhum nome, fornecedor, linguagem, framework, banco ou versão
 * concreta aparece em tipo, schema, API ou validação.
 *
 * Os validators carregam os JSON Schemas Draft 2020-12 versionados de
 * `phase-5-contracts/` e rejeitam propriedades extras, referências sem conteúdo
 * e campos de tecnologia em texto livre (`technology_name`, `ecosystem`,
 * `technology_version`, `framework`).
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ErrorObject, ValidateFunction } from 'ajv';

// ---------------------------------------------------------------------------
// Constantes canônicas (fonte única de verdade, sem duplicação divergente)
// ---------------------------------------------------------------------------

export const CLASSIFICATIONS = ['REQUIRED', 'ALLOWED', 'PREFERRED', 'PROHIBITED'] as const;
export type Classification = (typeof CLASSIFICATIONS)[number];

export const SELECTION_MODES = ['SINGLE', 'MULTIPLE'] as const;
export type SelectionMode = (typeof SELECTION_MODES)[number];

export const RELATIONSHIP_TYPES = ['REQUIRES', 'CONFLICTS_WITH', 'RECOMMENDS'] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const SEVERITIES = ['ERROR', 'WARNING', 'INFO'] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CATALOG_REVISION_STATUSES = ['DRAFT', 'PUBLISHED', 'SUPERSEDED'] as const;
export type CatalogRevisionStatus = (typeof CATALOG_REVISION_STATUSES)[number];

export const BASELINE_REVISION_STATUSES = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED'] as const;
export type BaselineRevisionStatus = (typeof BASELINE_REVISION_STATUSES)[number];

export const RESOLUTION_RESULTS = ['RESOLVED_ACTIVE', 'RESOLVED_INACTIVE', 'UNKNOWN_CATALOG_ITEM', 'AMBIGUOUS_CATALOG_ITEM'] as const;
export type ResolutionResult = (typeof RESOLUTION_RESULTS)[number];

export const VERSION_GOVERNANCE_MODES = ['REQUIRED', 'UNMANAGED'] as const;
export type VersionGovernance = (typeof VERSION_GOVERNANCE_MODES)[number];

export const SELECTION_CONTEXT_STATUSES = ['PREPARING', 'READY', 'SUPERSEDED'] as const;
export type SelectionContextStatus = (typeof SELECTION_CONTEXT_STATUSES)[number];

export const DEFER_DECISION_TYPE = 'DEFER_TO_MODULE_ARCHITECTURE' as const;
export type DeferDecisionType = typeof DEFER_DECISION_TYPE;

export const CATALOG_SCHEMA_VERSION = 'technology-catalog/v1' as const;
export const BASELINE_SCHEMA_VERSION = 'technology-baseline/v1' as const;

export const FREE_TECHNOLOGY_FIELDS = ['technology_name', 'ecosystem', 'technology_version', 'framework'] as const;

// ---------------------------------------------------------------------------
// Tipos neutros do domínio
// ---------------------------------------------------------------------------

export interface TechnologyCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  selection_mode: SelectionMode;
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  display_order: number;
}

export interface TechnologyCatalogItem {
  id: string;
  category_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  metadata: Record<string, unknown>;
}

export interface TechnologyCatalogRevision {
  id: string;
  revision_number: number;
  status: CatalogRevisionStatus;
  description?: string | null;
  content_hash: string;
  published_at: string | null;
  published_by: string | null;
}

export interface TechnologyProfile {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface TechnologyProfileItem {
  profile_id: string;
  catalog_item_id: string;
  classification: Classification;
  version_constraint: string | null;
  justification?: string | null;
  display_order: number;
}

export interface TechnologyCompatibilityRule {
  id: string;
  source_item_id: string;
  relationship_type: RelationshipType;
  target_item_id: string;
  constraint_expression?: string | null;
  severity: Severity;
  message: string;
  is_active: boolean;
}

export interface TechnologySelectionContext {
  id: string;
  project_id: string;
  technology_catalog_revision_id: string;
  technology_profile_id: string;
  status: SelectionContextStatus;
  hash?: string;
}

export interface TechnologyInventoryFact {
  source_path: string;
  detector_code: string;
  confidence: number;
  resolution_result: ResolutionResult;
  catalog_item_id?: string;
}

export interface TechnologyInventory {
  project_id: string;
  repository_sha: string;
  technology_catalog_revision_id: string;
  facts: TechnologyInventoryFact[];
  content_hash: string;
}

export interface TechnologyBaseline {
  id: string;
  project_id: string;
}

export interface TechnologyBaselineItem {
  catalog_item_id: string;
  classification: Classification;
  version_constraint?: string | null;
  reason: string;
  technology_profile_id?: string;
  technology_compatibility_rule_id?: string;
}

export interface TechnologyDeferredDecision {
  decision_type: DeferDecisionType;
  category_id: string;
  question: string;
  justification: string;
}

export interface TechnologyBaselineRevision {
  id: string;
  baseline_id: string;
  project_id: string;
  revision_number: number;
  technology_catalog_revision_id: string;
  selection_context_id?: string;
  inventory_id?: string;
  status: BaselineRevisionStatus;
  supersedes_revision_id?: string;
  items: TechnologyBaselineItem[];
  deferred_decisions: TechnologyDeferredDecision[];
}

export interface TechnologyBaselineRevisionPayload {
  technology_catalog_revision_id: string;
  items: TechnologyBaselineItem[];
  deferred_decisions?: TechnologyDeferredDecision[];
}

// ---------------------------------------------------------------------------
// Tipos de seed versionados (mesmo envelope comum)
// ---------------------------------------------------------------------------

export interface CategorySeed {
  code: string;
  name: string;
  description?: string | null;
  selection_mode: SelectionMode;
  min_selections: number;
  max_selections: number | null;
  is_active: boolean;
  display_order: number;
}

export interface CatalogItemSeed {
  category_code: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  display_order: number;
  metadata: Record<string, unknown>;
}

export interface ProfileSeed {
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
}

export interface ProfileItemSeed {
  profile_code: string;
  catalog_item_code: string;
  classification: Classification;
  version_constraint: string | null;
  justification?: string | null;
  display_order: number;
}

export interface CompatibilityRuleSeed {
  source_item_code: string;
  relationship_type: RelationshipType;
  target_item_code: string;
  constraint_expression?: string | null;
  severity: Severity;
  message: string;
  is_active: boolean;
}

export interface CatalogRevisionSeed {
  catalog_revision: number;
  description: string | null;
  content_hash: string;
  published_by?: string;
}

export interface SeedEnvelope<T> {
  schema_version: typeof CATALOG_SCHEMA_VERSION;
  catalog_revision: number;
  records: T[];
}

export type CategoriesSeed = SeedEnvelope<CategorySeed>;
export type CatalogItemsSeed = SeedEnvelope<CatalogItemSeed>;
export type ProfilesSeed = SeedEnvelope<ProfileSeed>;
export type ProfileItemsSeed = SeedEnvelope<ProfileItemSeed>;
export type CompatibilityRulesSeed = SeedEnvelope<CompatibilityRuleSeed>;
export type CatalogRevisionSeedFile = SeedEnvelope<CatalogRevisionSeed>;

// ---------------------------------------------------------------------------
// Carregamento dos schemas e validators
// ---------------------------------------------------------------------------

const contractRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'orchestration', 'demand-intake', 'node-web-orchestration-platform', 'phase-5-contracts');

type LoadedValidators = {
  validateCategory: ValidateFunction;
  validateCatalogItem: ValidateFunction;
  validateCatalogRevision: ValidateFunction;
  validateProfile: ValidateFunction;
  validateProfileItem: ValidateFunction;
  validateCompatibilityRule: ValidateFunction;
  validateSelectionContext: ValidateFunction;
  validateInventory: ValidateFunction;
  validateBaseline: ValidateFunction;
  validateBaselineItem: ValidateFunction;
  validateDeferredDecision: ValidateFunction;
  validateBaselineRevision: ValidateFunction;
  validateBaselineRevisionPayload: ValidateFunction;
  validateCategoriesSeed: ValidateFunction;
  validateCatalogItemsSeed: ValidateFunction;
  validateProfilesSeed: ValidateFunction;
  validateProfileItemsSeed: ValidateFunction;
  validateCompatibilityRulesSeed: ValidateFunction;
  validateCatalogRevisionSeedFile: ValidateFunction;
  ajv: unknown;
};

let validatorsPromise: Promise<LoadedValidators> | undefined;

const compileRef = (ajv: any, ref: string): ValidateFunction => {
  const existing = ajv.getSchema(ref);
  if (existing) return existing;
  const fn = ajv.compile({ $ref: ref });
  if (typeof fn !== 'function') throw new Error(`Unable to compile schema ref: ${ref}`);
  return fn;
};

const loadValidators = async (): Promise<LoadedValidators> => {
  const [ajvModule, formatsModule] = await Promise.all([
    import('ajv/dist/2020.js'),
    import('ajv-formats')
  ]);
  const Ajv2020Ctor = (ajvModule as any).default ?? ajvModule;
  const addFormatsFn = (formatsModule as any).default ?? formatsModule;
  const ajv = new Ajv2020Ctor({ allErrors: true, strict: false });
  addFormatsFn(ajv);
  const [common, catalog, baseline] = await Promise.all([
    readFile(join(contractRoot, 'common.schema.json'), 'utf8'),
    readFile(join(contractRoot, 'technology-catalog.schema.json'), 'utf8'),
    readFile(join(contractRoot, 'technology-baseline.schema.json'), 'utf8')
  ]);
  ajv.addSchema(JSON.parse(common));
  ajv.addSchema(JSON.parse(catalog));
  ajv.addSchema(JSON.parse(baseline));
  const catalogNs = 'naamive://technology-catalog/v1/technology-catalog';
  const baselineNs = 'naamive://technology-baseline/v1/technology-baseline';
  return {
    validateCategory: compileRef(ajv, `${catalogNs}#/$defs/category`),
    validateCatalogItem: compileRef(ajv, `${catalogNs}#/$defs/catalogItem`),
    validateCatalogRevision: compileRef(ajv, `${catalogNs}#/$defs/catalogRevision`),
    validateProfile: compileRef(ajv, `${catalogNs}#/$defs/profile`),
    validateProfileItem: compileRef(ajv, `${catalogNs}#/$defs/profileItem`),
    validateCompatibilityRule: compileRef(ajv, `${catalogNs}#/$defs/compatibilityRule`),
    validateSelectionContext: compileRef(ajv, `${catalogNs}#/$defs/selectionContext`),
    validateInventory: compileRef(ajv, `${catalogNs}#/$defs/inventory`),
    validateBaseline: compileRef(ajv, `${baselineNs}#/$defs/baseline`),
    validateBaselineItem: compileRef(ajv, `${baselineNs}#/$defs/baselineItem`),
    validateDeferredDecision: compileRef(ajv, `${baselineNs}#/$defs/deferredDecision`),
    validateBaselineRevision: compileRef(ajv, `${baselineNs}#/$defs/baselineRevision`),
    validateBaselineRevisionPayload: compileRef(ajv, `${baselineNs}#/$defs/baselineRevisionPayload`),
    validateCategoriesSeed: compileRef(ajv, `${catalogNs}#/$defs/categoriesSeed`),
    validateCatalogItemsSeed: compileRef(ajv, `${catalogNs}#/$defs/catalogItemsSeed`),
    validateProfilesSeed: compileRef(ajv, `${catalogNs}#/$defs/profilesSeed`),
    validateProfileItemsSeed: compileRef(ajv, `${catalogNs}#/$defs/profileItemsSeed`),
    validateCompatibilityRulesSeed: compileRef(ajv, `${catalogNs}#/$defs/compatibilityRulesSeed`),
    validateCatalogRevisionSeedFile: compileRef(ajv, `${catalogNs}#/$defs/catalogRevisionSeedFile`),
    ajv
  };
};

const validators = async (): Promise<LoadedValidators> => {
  validatorsPromise ??= loadValidators();
  return validatorsPromise;
};

const validationMessage = (errors: ErrorObject[] | null | undefined) => (errors ?? []).map((error) => `${error.instancePath || '/'} ${error.message ?? 'invalid'}`).join('; ');

export class ContractValidationError extends Error {
  constructor(readonly code: string, readonly details: string) {
    super(details);
  }
}

// ---------------------------------------------------------------------------
// Validação semântica: ausência de tecnologia em texto livre
// ---------------------------------------------------------------------------

/**
 * Rejeita qualquer chave de campo de tecnologia em texto livre
 * (`technology_name`, `ecosystem`, `technology_version`, `framework`) presente
 * em tipo, schema, API ou validação. `reason`/`justification`/`question`
 * permanecem texto explicativo legítimo e não são varridos por valor.
 */
export const assertNoFreeTechnologyFields = (value: unknown, path = ''): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoFreeTechnologyFields(item, `${path}/${index}`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const instancePath = `${path}/${key}`;
    if ((FREE_TECHNOLOGY_FIELDS as readonly string[]).includes(key)) {
      throw new ContractValidationError('FREE_TECHNOLOGY_FIELD_FORBIDDEN', `${instancePath} is a free-technology field and is not allowed`);
    }
    assertNoFreeTechnologyFields(child, instancePath);
  }
};

// ---------------------------------------------------------------------------
// Validação semântica: governança de versão e resolução de referências
// ---------------------------------------------------------------------------

/**
 * Exige `version_constraint` presente e não vazia para itens cujo
 * `metadata.version_governance` no snapshot catalogado seja `REQUIRED`.
 * Itens `UNMANAGED` não exigem restrição.
 */
export const validateBaselineVersionGovernance = (
  payload: TechnologyBaselineRevisionPayload,
  versionGovernanceByItemId: ReadonlyMap<string, VersionGovernance>
): void => {
  for (const item of payload.items) {
    const governance = versionGovernanceByItemId.get(item.catalog_item_id);
    if (governance === 'REQUIRED' && (item.version_constraint == null || item.version_constraint.trim() === '')) {
      throw new ContractValidationError(
        'BASELINE_VERSION_CONSTRAINT_REQUIRED',
        `catalog_item_id ${item.catalog_item_id} requires version_constraint because version_governance=REQUIRED`
      );
    }
  }
};

/**
 * Exige que cada `catalog_item_id` do payload resolva para um item presente no
 * snapshot publicado do catálogo (conjunto de IDs disponíveis). Referências sem
 * conteúdo são rejeitadas.
 */
export const validateBaselineReferencesResolve = (
  payload: TechnologyBaselineRevisionPayload,
  availableItemIds: ReadonlySet<string>
): void => {
  for (const item of payload.items) {
    if (!availableItemIds.has(item.catalog_item_id)) {
      throw new ContractValidationError(
        'BASELINE_CATALOG_ITEM_UNRESOLVED',
        `catalog_item_id ${item.catalog_item_id} is not present in the published catalog snapshot`
      );
    }
  }
};

// ---------------------------------------------------------------------------
// Validators estruturais
// ---------------------------------------------------------------------------

export const validateTechnologyCategory = async (value: unknown): Promise<TechnologyCategory> => {
  const { validateCategory } = await validators();
  if (!validateCategory(value)) throw new ContractValidationError('TECHNOLOGY_CATEGORY_INVALID', validationMessage(validateCategory.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyCategory;
};

export const validateTechnologyCatalogItem = async (value: unknown): Promise<TechnologyCatalogItem> => {
  const { validateCatalogItem } = await validators();
  if (!validateCatalogItem(value)) throw new ContractValidationError('TECHNOLOGY_CATALOG_ITEM_INVALID', validationMessage(validateCatalogItem.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyCatalogItem;
};

export const validateTechnologyCatalogRevision = async (value: unknown): Promise<TechnologyCatalogRevision> => {
  const { validateCatalogRevision } = await validators();
  if (!validateCatalogRevision(value)) throw new ContractValidationError('TECHNOLOGY_CATALOG_REVISION_INVALID', validationMessage(validateCatalogRevision.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyCatalogRevision;
};

export const validateTechnologyProfile = async (value: unknown): Promise<TechnologyProfile> => {
  const { validateProfile } = await validators();
  if (!validateProfile(value)) throw new ContractValidationError('TECHNOLOGY_PROFILE_INVALID', validationMessage(validateProfile.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyProfile;
};

export const validateTechnologyProfileItem = async (value: unknown): Promise<TechnologyProfileItem> => {
  const { validateProfileItem } = await validators();
  if (!validateProfileItem(value)) throw new ContractValidationError('TECHNOLOGY_PROFILE_ITEM_INVALID', validationMessage(validateProfileItem.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyProfileItem;
};

export const validateTechnologyCompatibilityRule = async (value: unknown): Promise<TechnologyCompatibilityRule> => {
  const { validateCompatibilityRule } = await validators();
  if (!validateCompatibilityRule(value)) throw new ContractValidationError('TECHNOLOGY_COMPATIBILITY_RULE_INVALID', validationMessage(validateCompatibilityRule.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyCompatibilityRule;
};

export const validateTechnologySelectionContext = async (value: unknown): Promise<TechnologySelectionContext> => {
  const { validateSelectionContext } = await validators();
  if (!validateSelectionContext(value)) throw new ContractValidationError('TECHNOLOGY_SELECTION_CONTEXT_INVALID', validationMessage(validateSelectionContext.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologySelectionContext;
};

export const validateTechnologyInventory = async (value: unknown): Promise<TechnologyInventory> => {
  const { validateInventory } = await validators();
  if (!validateInventory(value)) throw new ContractValidationError('TECHNOLOGY_INVENTORY_INVALID', validationMessage(validateInventory.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyInventory;
};

export const validateTechnologyBaseline = async (value: unknown): Promise<TechnologyBaseline> => {
  const { validateBaseline } = await validators();
  if (!validateBaseline(value)) throw new ContractValidationError('TECHNOLOGY_BASELINE_INVALID', validationMessage(validateBaseline.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyBaseline;
};

export const validateTechnologyBaselineItem = async (value: unknown): Promise<TechnologyBaselineItem> => {
  const { validateBaselineItem } = await validators();
  if (!validateBaselineItem(value)) throw new ContractValidationError('TECHNOLOGY_BASELINE_ITEM_INVALID', validationMessage(validateBaselineItem.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyBaselineItem;
};

export const validateTechnologyDeferredDecision = async (value: unknown): Promise<TechnologyDeferredDecision> => {
  const { validateDeferredDecision } = await validators();
  if (!validateDeferredDecision(value)) throw new ContractValidationError('TECHNOLOGY_DEFERRED_DECISION_INVALID', validationMessage(validateDeferredDecision.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyDeferredDecision;
};

export const validateTechnologyBaselineRevision = async (value: unknown): Promise<TechnologyBaselineRevision> => {
  const { validateBaselineRevision } = await validators();
  if (!validateBaselineRevision(value)) throw new ContractValidationError('TECHNOLOGY_BASELINE_REVISION_INVALID', validationMessage(validateBaselineRevision.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyBaselineRevision;
};

/**
 * Valida o payload aceito para criar, complementar ou submeter uma revisão de
 * baseline. Exige `technology_catalog_revision_id` e itens com `catalog_item_id`,
 * `classification` e `reason`; rejeita propriedades extras, referências sem
 * conteúdo e campos de tecnologia em texto livre.
 */
export const validateTechnologyBaselineRevisionPayload = async (value: unknown): Promise<TechnologyBaselineRevisionPayload> => {
  const { validateBaselineRevisionPayload } = await validators();
  if (!validateBaselineRevisionPayload(value)) throw new ContractValidationError('TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID', validationMessage(validateBaselineRevisionPayload.errors));
  assertNoFreeTechnologyFields(value);
  return value as TechnologyBaselineRevisionPayload;
};

// ---------------------------------------------------------------------------
// Validators de seed (envelope comum `technology-catalog/v1`)
// ---------------------------------------------------------------------------

export const validateCategoriesSeed = async (value: unknown): Promise<CategoriesSeed> => {
  const { validateCategoriesSeed } = await validators();
  if (!validateCategoriesSeed(value)) throw new ContractValidationError('CATEGORIES_SEED_INVALID', validationMessage(validateCategoriesSeed.errors));
  assertNoFreeTechnologyFields(value);
  return value as CategoriesSeed;
};

export const validateCatalogItemsSeed = async (value: unknown): Promise<CatalogItemsSeed> => {
  const { validateCatalogItemsSeed } = await validators();
  if (!validateCatalogItemsSeed(value)) throw new ContractValidationError('CATALOG_ITEMS_SEED_INVALID', validationMessage(validateCatalogItemsSeed.errors));
  assertNoFreeTechnologyFields(value);
  return value as CatalogItemsSeed;
};

export const validateProfilesSeed = async (value: unknown): Promise<ProfilesSeed> => {
  const { validateProfilesSeed } = await validators();
  if (!validateProfilesSeed(value)) throw new ContractValidationError('PROFILES_SEED_INVALID', validationMessage(validateProfilesSeed.errors));
  assertNoFreeTechnologyFields(value);
  return value as ProfilesSeed;
};

export const validateProfileItemsSeed = async (value: unknown): Promise<ProfileItemsSeed> => {
  const { validateProfileItemsSeed } = await validators();
  if (!validateProfileItemsSeed(value)) throw new ContractValidationError('PROFILE_ITEMS_SEED_INVALID', validationMessage(validateProfileItemsSeed.errors));
  assertNoFreeTechnologyFields(value);
  return value as ProfileItemsSeed;
};

export const validateCompatibilityRulesSeed = async (value: unknown): Promise<CompatibilityRulesSeed> => {
  const { validateCompatibilityRulesSeed } = await validators();
  if (!validateCompatibilityRulesSeed(value)) throw new ContractValidationError('COMPATIBILITY_RULES_SEED_INVALID', validationMessage(validateCompatibilityRulesSeed.errors));
  assertNoFreeTechnologyFields(value);
  return value as CompatibilityRulesSeed;
};

export const validateCatalogRevisionSeedFile = async (value: unknown): Promise<CatalogRevisionSeedFile> => {
  const { validateCatalogRevisionSeedFile } = await validators();
  if (!validateCatalogRevisionSeedFile(value)) throw new ContractValidationError('CATALOG_REVISION_SEED_INVALID', validationMessage(validateCatalogRevisionSeedFile.errors));
  assertNoFreeTechnologyFields(value);
  return value as CatalogRevisionSeedFile;
};
