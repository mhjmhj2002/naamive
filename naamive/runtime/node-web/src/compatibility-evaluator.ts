import type { RelationshipType, Severity } from './technology-contracts.js';

/** A generic catalog reference. Scope isolates baseline and module decisions. */
export interface CompatibilityReference {
  catalog_item_id: string;
  scope?: string;
  version_constraint?: string | null;
  justification?: string | null;
}

export interface CompatibilityRuleInput {
  id: string;
  source_item_id: string;
  relationship_type: RelationshipType;
  target_item_id: string;
  constraint_expression?: string | null;
  severity: Severity;
  message: string;
  is_active: boolean;
}

export interface CompatibilityFinding {
  rule_id: string;
  relationship_type: RelationshipType;
  severity: Severity;
  code: 'COMPATIBILITY_REQUIRED_MISSING' | 'COMPATIBILITY_CONFLICT' | 'COMPATIBILITY_RECOMMENDATION_MISSING' | 'COMPATIBILITY_RECOMMENDATION_JUSTIFICATION_REQUIRED' | 'COMPATIBILITY_VERSION_CONSTRAINT_UNSATISFIED' | 'COMPATIBILITY_SELF_REFERENCE' | 'COMPATIBILITY_CONFLICT_NOT_CANONICAL';
  message: string;
  blocking: boolean;
}

export interface CompatibilityEvaluation { findings: CompatibilityFinding[]; blocking: boolean; }

export class CompatibilityEvaluationError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

const scopeOf = (reference: CompatibilityReference) => reference.scope ?? 'BASELINE';
const canonicalPair = (a: string, b: string) => a < b ? [a, b] : [b, a];

// A deliberately small, data-only range evaluator. An unknown expression never
// gains acceptance by accident: callers may provide an exact constraint or a
// space-separated sequence of >=, >, <=, < and = comparisons.
const versionParts = (value: string) => {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
};
const compare = (a: number[], b: number[]) => {
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
};
type VersionBound = { value: number[]; inclusive: boolean };
type VersionRange = { lower?: VersionBound; upper?: VersionBound };

const tighterLower = (current: VersionBound | undefined, candidate: VersionBound): VersionBound => {
  if (!current) return candidate;
  const order = compare(current.value, candidate.value);
  if (order < 0) return candidate;
  if (order > 0) return current;
  return { value: current.value, inclusive: current.inclusive && candidate.inclusive };
};
const tighterUpper = (current: VersionBound | undefined, candidate: VersionBound): VersionBound => {
  if (!current) return candidate;
  const order = compare(current.value, candidate.value);
  if (order < 0) return current;
  if (order > 0) return candidate;
  return { value: current.value, inclusive: current.inclusive && candidate.inclusive };
};

const parseVersionRange = (expression: string): VersionRange | null => {
  if (expression.trim() === '') return null;
  const range: VersionRange = {};
  for (const term of expression.trim().split(/\s+/)) {
    const match = term.match(/^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/);
    if (!match) return null;
    const value = versionParts(match[2]);
    if (!value) return null;
    switch (match[1] ?? '=') {
      case '>': range.lower = tighterLower(range.lower, { value, inclusive: false }); break;
      case '>=': range.lower = tighterLower(range.lower, { value, inclusive: true }); break;
      case '<': range.upper = tighterUpper(range.upper, { value, inclusive: false }); break;
      case '<=': range.upper = tighterUpper(range.upper, { value, inclusive: true }); break;
      default:
        range.lower = tighterLower(range.lower, { value, inclusive: true });
        range.upper = tighterUpper(range.upper, { value, inclusive: true });
    }
  }
  return range;
};

/** Returns whether two declarative version ranges have at least one common value. */
export const versionConstraintsCompatible = (selected: string | null | undefined, required: string | null | undefined): boolean => {
  if (required == null) return true;
  if (selected == null) return false;
  const selectedRange = parseVersionRange(selected);
  const requiredRange = parseVersionRange(required);
  if (!selectedRange || !requiredRange) return false;
  const lower = selectedRange.lower && requiredRange.lower ? tighterLower(selectedRange.lower, requiredRange.lower) : selectedRange.lower ?? requiredRange.lower;
  const upper = selectedRange.upper && requiredRange.upper ? tighterUpper(selectedRange.upper, requiredRange.upper) : selectedRange.upper ?? requiredRange.upper;
  if (!lower || !upper) return true;
  const order = compare(lower.value, upper.value);
  return order < 0 || (order === 0 && lower.inclusive && upper.inclusive);
};

export const canonicalizeCompatibilityRule = <T extends CompatibilityRuleInput>(rule: T): T => {
  if (rule.source_item_id === rule.target_item_id) throw new CompatibilityEvaluationError('COMPATIBILITY_SELF_REFERENCE', 'Compatibility rules require distinct items');
  if (rule.relationship_type !== 'CONFLICTS_WITH') return rule;
  const [source_item_id, target_item_id] = canonicalPair(rule.source_item_id, rule.target_item_id);
  return { ...rule, source_item_id, target_item_id };
};

export const evaluateCompatibility = (references: CompatibilityReference[], rules: CompatibilityRuleInput[], options: { requireRecommendationJustification?: boolean } = {}): CompatibilityEvaluation => {
  const findings: CompatibilityFinding[] = [];
  const activeRules = rules.filter((rule) => rule.is_active);
  for (const inputRule of activeRules) {
    if (inputRule.source_item_id === inputRule.target_item_id) {
      findings.push({ rule_id: inputRule.id, relationship_type: inputRule.relationship_type, severity: inputRule.severity, code: 'COMPATIBILITY_SELF_REFERENCE', message: inputRule.message, blocking: true });
      continue;
    }
    const rule = canonicalizeCompatibilityRule(inputRule);
    if (inputRule.relationship_type === 'CONFLICTS_WITH' && (rule.source_item_id !== inputRule.source_item_id || rule.target_item_id !== inputRule.target_item_id)) findings.push({ rule_id: rule.id, relationship_type: rule.relationship_type, severity: rule.severity, code: 'COMPATIBILITY_CONFLICT_NOT_CANONICAL', message: rule.message, blocking: false });
    const sources = references.filter((reference) => reference.catalog_item_id === rule.source_item_id);
    for (const source of sources) {
      const target = references.find((reference) => reference.catalog_item_id === rule.target_item_id && scopeOf(reference) === scopeOf(source));
      const targetVersionMatches = target && versionConstraintsCompatible(target.version_constraint, rule.constraint_expression);
      if (rule.relationship_type === 'CONFLICTS_WITH' && target && targetVersionMatches) findings.push({ rule_id: rule.id, relationship_type: rule.relationship_type, severity: rule.severity, code: 'COMPATIBILITY_CONFLICT', message: rule.message, blocking: rule.severity === 'ERROR' });
      if (rule.relationship_type === 'REQUIRES' && !targetVersionMatches) findings.push({ rule_id: rule.id, relationship_type: rule.relationship_type, severity: rule.severity, code: target ? 'COMPATIBILITY_VERSION_CONSTRAINT_UNSATISFIED' : 'COMPATIBILITY_REQUIRED_MISSING', message: rule.message, blocking: rule.severity === 'ERROR' });
      if (rule.relationship_type === 'RECOMMENDS' && !targetVersionMatches) {
        const needsJustification = options.requireRecommendationJustification && !source.justification?.trim();
        findings.push({ rule_id: rule.id, relationship_type: rule.relationship_type, severity: rule.severity, code: needsJustification ? 'COMPATIBILITY_RECOMMENDATION_JUSTIFICATION_REQUIRED' : 'COMPATIBILITY_RECOMMENDATION_MISSING', message: rule.message, blocking: rule.severity === 'ERROR' });
      }
    }
  }
  return { findings, blocking: findings.some((finding) => finding.blocking) };
};
