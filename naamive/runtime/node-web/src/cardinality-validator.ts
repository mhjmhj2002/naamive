import { versionConstraintsCompatible } from './compatibility-evaluator.js';
import type {
  Classification,
  TechnologyBaselineItem,
  TechnologyBaselineRevisionPayload,
  TechnologyCategory,
  TechnologyCatalogItem,
  TechnologyDeferredDecision
} from './technology-contracts.js';

/** A snapshot item is enough to connect a baseline decision to its category. */
export type CardinalityCatalogItem = Pick<TechnologyCatalogItem, 'id' | 'category_id'>;

/**
 * Data supplied by the published category policy. The eligibility set is
 * deliberately external to the engine: the category snapshot remains the
 * source of cardinality and the caller supplies only its published defer
 * policy, rather than encoding category names here.
 */
export interface CardinalityValidationOptions {
  deferEligibleCategoryIds?: ReadonlySet<string>;
}

export type CardinalityFindingCode =
  | 'BASELINE_CATALOG_ITEM_CATEGORY_UNRESOLVED'
  | 'BASELINE_CATEGORY_MIN_SELECTIONS_UNSATISFIED'
  | 'BASELINE_CATEGORY_MAX_SELECTIONS_EXCEEDED'
  | 'BASELINE_CATEGORY_SINGLE_SELECTION_EXCEEDED'
  | 'BASELINE_DEFERRED_DECISION_DUPLICATE'
  | 'BASELINE_DEFERRED_DECISION_CATEGORY_UNRESOLVED'
  | 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE'
  | 'BASELINE_DEFERRED_DECISION_CONFLICTS_WITH_ITEM'
  | 'BASELINE_CLASSIFICATION_DUPLICATE'
  | 'BASELINE_CLASSIFICATION_PROHIBITED_CONFLICT'
  | 'BASELINE_REQUIRED_VERSION_CONSTRAINT_UNSATISFIED'
  | 'BASELINE_PROHIBITED_ITEM_SELECTED'
  | 'BASELINE_REQUIRED_ITEM_MISSING';

export interface CardinalityFinding {
  code: CardinalityFindingCode;
  category_id?: string;
  catalog_item_id?: string;
  message: string;
}

export interface CardinalityValidationResult {
  findings: CardinalityFinding[];
  valid: boolean;
}

export class CardinalityValidationError extends Error {
  constructor(readonly findings: CardinalityFinding[]) {
    super(findings.map((finding) => finding.message).join('; '));
  }
}

const classificationRank: Record<Classification, number> = {
  ALLOWED: 1,
  PREFERRED: 2,
  REQUIRED: 3,
  PROHIBITED: 4
};

const isDeferredDecisionWellFormed = (decision: TechnologyDeferredDecision) =>
  decision.decision_type === 'DEFER_TO_MODULE_ARCHITECTURE' && decision.question.trim() !== '' && decision.justification.trim() !== '';

const result = (findings: CardinalityFinding[]): CardinalityValidationResult => ({ findings, valid: findings.length === 0 });

/**
 * Validates category cardinality from a catalog snapshot. Deferred decisions
 * fulfil a category minimum, but never add an item or consume its maximum.
 */
export const evaluateBaselineCardinality = (
  payload: Pick<TechnologyBaselineRevisionPayload, 'items' | 'deferred_decisions'>,
  categories: readonly TechnologyCategory[],
  catalogItems: readonly CardinalityCatalogItem[],
  options: CardinalityValidationOptions = {}
): CardinalityValidationResult => {
  const findings: CardinalityFinding[] = [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const categoryByItemId = new Map(catalogItems.map((item) => [item.id, item.category_id]));
  const itemCountByCategory = new Map<string, number>();
  const itemCategoryIds = new Set<string>();

  for (const item of payload.items) {
    const categoryId = categoryByItemId.get(item.catalog_item_id);
    if (!categoryId || !categoryById.has(categoryId)) {
      findings.push({ code: 'BASELINE_CATALOG_ITEM_CATEGORY_UNRESOLVED', catalog_item_id: item.catalog_item_id, message: `catalog_item_id ${item.catalog_item_id} does not resolve to a category in the catalog snapshot` });
      continue;
    }
    itemCategoryIds.add(categoryId);
    itemCountByCategory.set(categoryId, (itemCountByCategory.get(categoryId) ?? 0) + 1);
  }

  const deferredByCategory = new Set<string>();
  for (const decision of payload.deferred_decisions ?? []) {
    const category = categoryById.get(decision.category_id);
    if (!category) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_CATEGORY_UNRESOLVED', category_id: decision.category_id, message: `deferred decision category_id ${decision.category_id} is not in the catalog snapshot` });
      continue;
    }
    if (!isDeferredDecisionWellFormed(decision)) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE', category_id: category.id, message: `deferred decision for category_id ${category.id} must be an auditable DEFER_TO_MODULE_ARCHITECTURE decision` });
    }
    if (deferredByCategory.has(category.id)) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_DUPLICATE', category_id: category.id, message: `category_id ${category.id} has more than one deferred decision` });
    }
    deferredByCategory.add(category.id);
    if (!options.deferEligibleCategoryIds?.has(category.id)) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE', category_id: category.id, message: `category_id ${category.id} is not eligible for DEFER_TO_MODULE_ARCHITECTURE` });
    }
    if (category.min_selections !== 1) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE', category_id: category.id, message: `category_id ${category.id} cannot defer because min_selections is not 1` });
    }
    if (itemCategoryIds.has(category.id)) {
      findings.push({ code: 'BASELINE_DEFERRED_DECISION_CONFLICTS_WITH_ITEM', category_id: category.id, message: `category_id ${category.id} cannot contain both a deferred decision and a technology classification` });
    }
  }

  for (const category of categories) {
    const count = itemCountByCategory.get(category.id) ?? 0;
    const deferred = deferredByCategory.has(category.id);
    if (category.selection_mode === 'SINGLE' && count > 1) {
      findings.push({ code: 'BASELINE_CATEGORY_SINGLE_SELECTION_EXCEEDED', category_id: category.id, message: `category_id ${category.id} has ${count} selected items but selection_mode=SINGLE` });
    }
    if (category.max_selections != null && count > category.max_selections) {
      findings.push({ code: 'BASELINE_CATEGORY_MAX_SELECTIONS_EXCEEDED', category_id: category.id, message: `category_id ${category.id} has ${count} selected items but max_selections=${category.max_selections}` });
    }
    if (count < category.min_selections && !deferred) {
      findings.push({ code: 'BASELINE_CATEGORY_MIN_SELECTIONS_UNSATISFIED', category_id: category.id, message: `category_id ${category.id} has ${count} selected items but min_selections=${category.min_selections}` });
    }
  }
  return result(findings);
};

/** Throws the findings when a caller needs the validator form rather than a report. */
export const validateBaselineCardinality = (...args: Parameters<typeof evaluateBaselineCardinality>): void => {
  const evaluation = evaluateBaselineCardinality(...args);
  if (!evaluation.valid) throw new CardinalityValidationError(evaluation.findings);
};

/** A module choice is interpreted against the baseline classifications only. */
export interface ClassifiedSelection {
  catalog_item_id: string;
  version_constraint?: string | null;
}

/**
 * Applies classification precedence to module choices. PROHIBITED always
 * rejects, REQUIRED then demands a compatible choice, PREFERRED is advisory,
 * and ALLOWED permits. Duplicate baseline classifications are contradictions.
 */
export const evaluateClassificationPrecedence = (
  baselineItems: readonly TechnologyBaselineItem[],
  selectedItems: readonly ClassifiedSelection[] = []
): CardinalityValidationResult => {
  const findings: CardinalityFinding[] = [];
  const decisionsByItem = new Map<string, TechnologyBaselineItem[]>();
  for (const item of baselineItems) decisionsByItem.set(item.catalog_item_id, [...(decisionsByItem.get(item.catalog_item_id) ?? []), item]);

  for (const [catalogItemId, decisions] of decisionsByItem) {
    if (decisions.length > 1) {
      const highest = decisions.reduce((current, item) => classificationRank[item.classification] > classificationRank[current.classification] ? item : current);
      findings.push({
        code: highest.classification === 'PROHIBITED' ? 'BASELINE_CLASSIFICATION_PROHIBITED_CONFLICT' : 'BASELINE_CLASSIFICATION_DUPLICATE',
        catalog_item_id: catalogItemId,
        message: `catalog_item_id ${catalogItemId} has contradictory classifications; ${highest.classification} takes precedence`
      });
    }
  }

  for (const decision of baselineItems) {
    const selected = selectedItems.filter((item) => item.catalog_item_id === decision.catalog_item_id);
    if (decision.classification === 'PROHIBITED' && selected.length > 0) {
      findings.push({ code: 'BASELINE_PROHIBITED_ITEM_SELECTED', catalog_item_id: decision.catalog_item_id, message: `catalog_item_id ${decision.catalog_item_id} is PROHIBITED and cannot be selected` });
    }
    const prohibited = decisionsByItem.get(decision.catalog_item_id)?.some((item) => item.classification === 'PROHIBITED') ?? false;
    if (decision.classification === 'REQUIRED' && !prohibited) {
      const compatible = selected.some((item) => versionConstraintsCompatible(item.version_constraint, decision.version_constraint));
      if (!compatible) {
        findings.push({
          code: selected.length === 0 ? 'BASELINE_REQUIRED_ITEM_MISSING' : 'BASELINE_REQUIRED_VERSION_CONSTRAINT_UNSATISFIED',
          catalog_item_id: decision.catalog_item_id,
          message: selected.length === 0
            ? `catalog_item_id ${decision.catalog_item_id} is REQUIRED but is not selected`
            : `catalog_item_id ${decision.catalog_item_id} does not satisfy the REQUIRED version constraint`
        });
      }
    }
  }
  return result(findings);
};

export const validateClassificationPrecedence = (...args: Parameters<typeof evaluateClassificationPrecedence>): void => {
  const evaluation = evaluateClassificationPrecedence(...args);
  if (!evaluation.valid) throw new CardinalityValidationError(evaluation.findings);
};
