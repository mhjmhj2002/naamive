import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTINUITY_PATH, continuityViolation } from './project-continuity-guard.mjs';

const projectStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/STATUS.md';
const moduleStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/STATUS.md';
const viStatus = 'project/naamive/projects/PRJ-001-naamive-mvp/modules/MOD-001-project-context/value-increments/VI-001-authenticated-project-context/STATUS.md';
const roadmap = 'project/naamive/projects/PRJ-001-naamive-mvp/ROADMAP.md';
const activityLog = 'project/naamive/projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md';

test('requires continuity when a Project index fact may have changed', () => {
  assert.equal(continuityViolation([projectStatus]), true);
});

test('does not require continuity for an isolated Module status', () => {
  assert.equal(continuityViolation([moduleStatus]), false);
});

test('does not require continuity for an isolated Value Increment status', () => {
  assert.equal(continuityViolation([viStatus]), false);
});

test('does not require continuity for an isolated roadmap', () => {
  assert.equal(continuityViolation([roadmap]), false);
});

test('does not require continuity for an isolated activity log', () => {
  assert.equal(continuityViolation([activityLog]), false);
});

test('requires continuity for a newly recorded Project status', () => {
  assert.equal(
    continuityViolation(['project/naamive/projects/PRJ-002-next-project/STATUS.md']),
    true
  );
});

test('accepts a changed Project status with continuity', () => {
  assert.equal(continuityViolation([projectStatus, CONTINUITY_PATH]), false);
});

test('accepts continuity-only changes', () => {
  assert.equal(continuityViolation([CONTINUITY_PATH]), false);
});

test('accepts unrelated technical changes', () => {
  assert.equal(continuityViolation(['packages/kernel/src/index.ts', 'packages/database/migrations/001.sql']), false);
});

test('accepts multiple changed projections with continuity', () => {
  assert.equal(continuityViolation([projectStatus, moduleStatus, viStatus, roadmap, activityLog, CONTINUITY_PATH]), false);
});
