import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTINUITY_PATH, continuityViolation } from './project-continuity-guard.mjs';

const projectStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/STATUS.md';
const moduleStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/STATUS.md';
const viStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/value-increments/VI-001-authenticated-project-context/STATUS.md';
const roadmap = 'project/naamive/projects/PRJ-001-naamive-mvp/ROADMAP.md';
const activityLog = 'project/naamive/projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md';

test('rejects a changed Project status without continuity', () => {
  assert.equal(continuityViolation([projectStatus]), true);
});

test('rejects a changed descendant status without continuity', () => {
  assert.equal(continuityViolation([moduleStatus, viStatus]), true);
});

test('accepts a changed activity log with continuity', () => {
  assert.equal(continuityViolation([activityLog, CONTINUITY_PATH]), false);
});

test('accepts a changed roadmap with continuity', () => {
  assert.equal(continuityViolation([roadmap, CONTINUITY_PATH]), false);
});

test('accepts continuity-only changes', () => {
  assert.equal(continuityViolation([CONTINUITY_PATH]), false);
});

test('accepts unrelated technical changes', () => {
  assert.equal(continuityViolation(['packages/kernel/src/index.ts', 'packages/database/migrations/001.sql']), false);
});

test('accepts multiple changed living projections with continuity', () => {
  assert.equal(continuityViolation([projectStatus, moduleStatus, viStatus, roadmap, activityLog, CONTINUITY_PATH]), false);
});
