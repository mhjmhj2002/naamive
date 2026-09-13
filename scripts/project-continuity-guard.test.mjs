import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTINUITY_PATH, continuityViolation } from './project-continuity-guard.mjs';

const currentState = 'project/naamive/projects/PRJ-001-naamive-mvp/CURRENT_STATE.md';
const executionBoard = 'project/naamive/projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md';
const roadmap = 'project/naamive/projects/PRJ-001-naamive-mvp/ROADMAP.md';
const activityLog = 'project/naamive/projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md';

test('rejects a changed current-state projection without continuity', () => {
  assert.equal(continuityViolation([currentState]), true);
});

test('rejects a changed execution board without continuity', () => {
  assert.equal(continuityViolation([executionBoard]), true);
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
  assert.equal(continuityViolation([currentState, executionBoard, roadmap, activityLog, CONTINUITY_PATH]), false);
});
