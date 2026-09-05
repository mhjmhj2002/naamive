import assert from 'node:assert/strict';
import test from 'node:test';
import { CompatibilityEvaluationError, canonicalizeCompatibilityRule, evaluateCompatibility, versionConstraintsCompatible } from './compatibility-evaluator.js';

const rule = (relationship_type: 'REQUIRES' | 'CONFLICTS_WITH' | 'RECOMMENDS', source_item_id = 'a', target_item_id = 'b', severity: 'ERROR' | 'WARNING' | 'INFO' = 'ERROR', constraint_expression: string | null = null) => ({ id: `${relationship_type}-${source_item_id}-${target_item_id}`, source_item_id, target_item_id, relationship_type, severity, constraint_expression, message: 'governed relation', is_active: true });

test('evaluates directional requires by scope and version constraint', () => {
  const missing = evaluateCompatibility([{ catalog_item_id: 'a', scope: 'baseline' }], [rule('REQUIRES', 'a', 'b')]);
  assert.equal(missing.blocking, true);
  assert.equal(missing.findings[0].code, 'COMPATIBILITY_REQUIRED_MISSING');
  const wrongScope = evaluateCompatibility([{ catalog_item_id: 'a', scope: 'baseline' }, { catalog_item_id: 'b', scope: 'module' }], [rule('REQUIRES', 'a', 'b')]);
  assert.equal(wrongScope.blocking, true);
  const versioned = evaluateCompatibility([{ catalog_item_id: 'a' }, { catalog_item_id: 'b', version_constraint: '>=2 <3' }], [rule('REQUIRES', 'a', 'b', 'ERROR', '>=2 <3')]);
  assert.equal(versioned.blocking, false);
  assert.equal(versionConstraintsCompatible('>=2 <3', '>=3 <4'), false);
  const openRange = evaluateCompatibility([{ catalog_item_id: 'a' }, { catalog_item_id: 'b', version_constraint: '>2 <4' }], [rule('REQUIRES', 'a', 'b', 'ERROR', '>2 <4')]);
  assert.deepEqual(openRange, { blocking: false, findings: [] });
});

test('calculates version-range intersections with inclusive and exclusive bounds', () => {
  assert.equal(versionConstraintsCompatible('>2 <4', '>2 <4'), true);
  assert.equal(versionConstraintsCompatible('>2 <5', '>3 <6'), true);
  assert.equal(versionConstraintsCompatible('>2 <3', '>=3 <4'), false);
  assert.equal(versionConstraintsCompatible('>=2 <=3', '>=3 <4'), true);
  assert.equal(versionConstraintsCompatible('>=2 <3', '>=3 <4'), false);
  assert.equal(versionConstraintsCompatible('3', '>2 <4'), true);
  assert.equal(versionConstraintsCompatible('4', '>2 <4'), false);
  assert.equal(versionConstraintsCompatible('=3', '>=3 <4'), true);
  assert.equal(versionConstraintsCompatible('>=1 <2', '>=3 <4'), false);
  assert.equal(versionConstraintsCompatible('>=2 <10', '>=4 <5'), true);
  assert.equal(versionConstraintsCompatible('>2.1.0 <2.1.2', '=2.1.1'), true);
  assert.equal(versionConstraintsCompatible('^2', '>=2 <3'), false);
  assert.equal(versionConstraintsCompatible('', '>=2 <3'), false);
  assert.equal(versionConstraintsCompatible('>=2 <3', ''), false);
});

test('canonicalizes and symmetrically evaluates conflicts', () => {
  const normalized = canonicalizeCompatibilityRule(rule('CONFLICTS_WITH', 'z', 'a'));
  assert.deepEqual([normalized.source_item_id, normalized.target_item_id], ['a', 'z']);
  const evaluation = evaluateCompatibility([{ catalog_item_id: 'z' }, { catalog_item_id: 'a' }], [rule('CONFLICTS_WITH', 'z', 'a')]);
  assert.equal(evaluation.blocking, true);
  assert.ok(evaluation.findings.some((finding) => finding.code === 'COMPATIBILITY_CONFLICT'));
  assert.throws(() => canonicalizeCompatibilityRule(rule('CONFLICTS_WITH', 'a', 'a')), (error: any) => error instanceof CompatibilityEvaluationError && error.code === 'COMPATIBILITY_SELF_REFERENCE');
});

test('recommendations require an auditable source justification when requested but warnings do not block', () => {
  const evaluation = evaluateCompatibility([{ catalog_item_id: 'a' }], [rule('RECOMMENDS', 'a', 'b', 'WARNING')], { requireRecommendationJustification: true });
  assert.equal(evaluation.blocking, false);
  assert.equal(evaluation.findings[0].code, 'COMPATIBILITY_RECOMMENDATION_JUSTIFICATION_REQUIRED');
  assert.equal(evaluateCompatibility([{ catalog_item_id: 'b' }], [rule('REQUIRES', 'a', 'b')]).findings.length, 0);
});
