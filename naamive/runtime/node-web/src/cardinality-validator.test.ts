import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CardinalityValidationError,
  evaluateBaselineCardinality,
  evaluateClassificationPrecedence,
  validateBaselineCardinality
} from './cardinality-validator.js';
import type { TechnologyCategory } from './technology-contracts.js';

const category = (id: string, selection_mode: 'SINGLE' | 'MULTIPLE', min_selections: number, max_selections: number | null): TechnologyCategory => ({ id, code: id.toUpperCase(), name: id, selection_mode, min_selections, max_selections, is_active: true, display_order: 1 });
const item = (catalog_item_id: string, classification: 'REQUIRED' | 'ALLOWED' | 'PREFERRED' | 'PROHIBITED' = 'ALLOWED', version_constraint?: string) => ({ catalog_item_id, classification, reason: 'auditable reason', ...(version_constraint ? { version_constraint } : {}) });
const deferred = (category_id: string) => ({ decision_type: 'DEFER_TO_MODULE_ARCHITECTURE' as const, category_id, question: 'Which approved option should the module choose?', justification: 'The module architecture owns this decision.' });

const categories = [category('single', 'SINGLE', 1, 1), category('many', 'MULTIPLE', 1, null), category('optional', 'MULTIPLE', 0, 2)];
const catalogItems = [{ id: 'one', category_id: 'single' }, { id: 'two', category_id: 'single' }, { id: 'three', category_id: 'many' }, { id: 'four', category_id: 'many' }, { id: 'five', category_id: 'optional' }, { id: 'six', category_id: 'optional' }, { id: 'seven', category_id: 'optional' }];

test('validates SINGLE and MULTIPLE cardinality, including an unlimited maximum', () => {
  const valid = evaluateBaselineCardinality({ items: [item('one'), item('three'), item('four')], deferred_decisions: [] }, categories, catalogItems);
  assert.equal(valid.valid, true);
  const invalid = evaluateBaselineCardinality({ items: [item('one'), item('two'), item('three')], deferred_decisions: [] }, categories, catalogItems);
  assert.ok(invalid.findings.some((finding) => finding.code === 'BASELINE_CATEGORY_SINGLE_SELECTION_EXCEEDED'));
  assert.ok(invalid.findings.some((finding) => finding.code === 'BASELINE_CATEGORY_MAX_SELECTIONS_EXCEEDED'));
});

test('enforces min and finite max without treating null max as zero', () => {
  const missing = evaluateBaselineCardinality({ items: [item('one')], deferred_decisions: [] }, categories, catalogItems);
  assert.ok(missing.findings.some((finding) => finding.code === 'BASELINE_CATEGORY_MIN_SELECTIONS_UNSATISFIED' && finding.category_id === 'many'));
  const max = evaluateBaselineCardinality({ items: [item('one'), item('three'), item('five'), item('six'), item('seven')], deferred_decisions: [] }, categories, catalogItems);
  assert.ok(max.findings.some((finding) => finding.code === 'BASELINE_CATEGORY_MAX_SELECTIONS_EXCEEDED' && finding.category_id === 'optional'));
});

test('deferment is explicit, auditable, eligible, exclusive and does not consume a selection', () => {
  const valid = evaluateBaselineCardinality({ items: [item('one')], deferred_decisions: [deferred('many')] }, categories, catalogItems, { deferEligibleCategoryIds: new Set(['many']) });
  assert.equal(valid.valid, true);
  const invalid = evaluateBaselineCardinality({ items: [item('one'), item('three')], deferred_decisions: [deferred('many')] }, categories, catalogItems, { deferEligibleCategoryIds: new Set(['many']) });
  assert.ok(invalid.findings.some((finding) => finding.code === 'BASELINE_DEFERRED_DECISION_CONFLICTS_WITH_ITEM'));
  const denied = evaluateBaselineCardinality({ items: [item('one')], deferred_decisions: [deferred('many')] }, categories, catalogItems);
  assert.ok(denied.findings.some((finding) => finding.code === 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE'));
  const optional = evaluateBaselineCardinality({ items: [item('one'), item('three')], deferred_decisions: [deferred('optional')] }, categories, catalogItems, { deferEligibleCategoryIds: new Set(['optional']) });
  assert.ok(optional.findings.some((finding) => finding.code === 'BASELINE_DEFERRED_DECISION_NOT_ELIGIBLE'));
});

test('classification precedence denies prohibited choices and requires compatible required versions', () => {
  const prohibited = evaluateClassificationPrecedence([item('one', 'PROHIBITED')], [{ catalog_item_id: 'one' }]);
  assert.ok(prohibited.findings.some((finding) => finding.code === 'BASELINE_PROHIBITED_ITEM_SELECTED'));
  const required = evaluateClassificationPrecedence([item('three', 'REQUIRED', '>=2 <3')], [{ catalog_item_id: 'three', version_constraint: '>=3 <4' }]);
  assert.ok(required.findings.some((finding) => finding.code === 'BASELINE_REQUIRED_VERSION_CONSTRAINT_UNSATISFIED'));
  assert.equal(evaluateClassificationPrecedence([item('three', 'REQUIRED', '>=2 <3')], [{ catalog_item_id: 'three', version_constraint: '>=2 <3' }]).valid, true);
  const conflict = evaluateClassificationPrecedence([item('four', 'REQUIRED'), item('four', 'PROHIBITED')]);
  assert.ok(conflict.findings.some((finding) => finding.code === 'BASELINE_CLASSIFICATION_PROHIBITED_CONFLICT'));
  assert.ok(!conflict.findings.some((finding) => finding.code === 'BASELINE_REQUIRED_ITEM_MISSING'));
});

test('never creates NONE or DEFER technology items', () => {
  assert.throws(() => validateBaselineCardinality({ items: [item('NONE')], deferred_decisions: [] }, categories, catalogItems), (error: any) => error instanceof CardinalityValidationError && error.findings[0].code === 'BASELINE_CATALOG_ITEM_CATEGORY_UNRESOLVED');
});
