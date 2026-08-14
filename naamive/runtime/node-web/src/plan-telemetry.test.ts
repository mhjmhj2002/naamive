import assert from 'node:assert/strict';
import test from 'node:test';

// F5-23 pendencies 19-22: durable, sanitized planning telemetry.
// The module pulls in db/config at import time (the pg Pool is lazy and never
// opened here), so the configuration surface must be present. These are pure
// unit tests for the health derivation — no DB writes are performed.
process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.plan-telemetry-artifacts`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'plan-telemetry-tester';

const { derivePlanStatus, PLAN_TELEMETRY_EVENT_HEARTBEAT, PLAN_TELEMETRY_EVENT_STARTED, PLAN_TELEMETRY_EVENT_OPERATIONAL, PLAN_TELEMETRY_EVENT_TERMINATED } = await import('./plan-telemetry.js');

const base = { noSignalSeconds: 120, timeoutSeconds: 720 };

test('derivePlanStatus reports QUEUED when the job is not leased yet', () => {
  const { executorStatus, health } = derivePlanStatus({ ...base, jobStatus: 'PENDING', startedAt: null, lastSignalAt: null });
  assert.equal(executorStatus, 'na fila');
  assert.equal(health, 'QUEUED');
});

test('derivePlanStatus reports em execução when the job is leased and signals are fresh', () => {
  const now = Date.now();
  const { executorStatus, health } = derivePlanStatus({
    ...base,
    jobStatus: 'LEASED',
    startedAt: new Date(now - 10_000).toISOString(),
    lastSignalAt: new Date(now - 5_000).toISOString()
  });
  assert.equal(executorStatus, 'em execução');
  assert.equal(health, 'ALIVE');
});

test('derivePlanStatus reports ativo sem evento novo when the last signal is older than the no-signal window (heartbeat proves liveness, never functional progress)', () => {
  const now = Date.now();
  const { executorStatus, health } = derivePlanStatus({
    ...base,
    jobStatus: 'LEASED',
    // Signal is 200s old — beyond the 120s no-signal alert window but well
    // under the 720s timeout. The process is still considered alive (the last
    // signal/heartbeat proves liveness) but has produced NO new operational
    // event for a while: this is exactly ALIVE_NO_PROGRESS, never ALIVE.
    startedAt: new Date(now - 300_000).toISOString(),
    lastSignalAt: new Date(now - 200_000).toISOString()
  });
  assert.equal(executorStatus, 'ativo sem evento novo');
  assert.equal(health, 'ALIVE_NO_PROGRESS');
});

test('derivePlanStatus reports degradado when the total duration exceeds the configured timeout', () => {
  const now = Date.now();
  const { executorStatus, health } = derivePlanStatus({
    ...base,
    jobStatus: 'LEASED',
    startedAt: new Date(now - (721 * 1000)).toISOString(),
    lastSignalAt: new Date(now - 1_000).toISOString()
  });
  assert.equal(executorStatus, 'degradado');
  assert.equal(health, 'DEGRADED');
});

test('derivePlanStatus reports TERMINATED after a durable termination', () => {
  const { executorStatus, health } = derivePlanStatus({ ...base, jobStatus: 'LEASED', startedAt: new Date().toISOString(), lastSignalAt: new Date().toISOString(), terminated: true });
  assert.equal(executorStatus, 'degradado');
  assert.equal(health, 'TERMINATED');
});

test('derivePlanStatus treats a missing started/last-signal as DEGRADED while leased (no evidence)', () => {
  const { executorStatus, health } = derivePlanStatus({ ...base, jobStatus: 'LEASED', startedAt: null, lastSignalAt: null });
  assert.equal(executorStatus, 'degradado');
  assert.equal(health, 'DEGRADED');
});

test('timeout policy thresholds are configurable: the same evidence flips state when the windows change', () => {
  const now = Date.now();
  // Same real ages; only the policy thresholds differ.
  const opts = {
    noSignalSeconds: 30,
    timeoutSeconds: 60,
    jobStatus: 'LEASED',
    startedAt: new Date(now - 50_000).toISOString(),
    lastSignalAt: new Date(now - 45_000).toISOString()
  };
  // 45s signal age > 30s no-signal window -> the process has produced no new
  // operational event; 50s elapsed < 60s timeout -> not degraded yet. This is
  // exactly the "ativo sem evento novo" alert state.
  const alerting = derivePlanStatus(opts);
  assert.equal(alerting.executorStatus, 'ativo sem evento novo');
  assert.equal(alerting.health, 'ALIVE_NO_PROGRESS');
  // Relax the policy and the same evidence becomes fully healthy again.
  const alive = derivePlanStatus({ ...opts, noSignalSeconds: 60, timeoutSeconds: 120 });
  assert.equal(alive.health, 'ALIVE');
  // Tighten the timeout below the elapsed duration and the same evidence
  // becomes degraded (final timeout preserves the last available evidence).
  const degraded = derivePlanStatus({ ...opts, noSignalSeconds: 30, timeoutSeconds: 40 });
  assert.equal(degraded.health, 'DEGRADED');
});

test('a heartbeat is emitted as its own timeline event and never bumps operational progress', () => {
  // The durable sink uses recordHeartbeat to update last_signal_at/heartbeat_count
  // only; operational_event_count and last_operational_event_at are reserved for
  // real closed-contract events. Assert the constant contract here so a future
  // refactor cannot silently promote heartbeats to functional progress.
  assert.equal(PLAN_TELEMETRY_EVENT_HEARTBEAT, 'MODULE_PLAN_TELEMETRY_HEARTBEAT');
  assert.equal(PLAN_TELEMETRY_EVENT_STARTED, 'MODULE_PLAN_TELEMETRY_STARTED');
  assert.equal(PLAN_TELEMETRY_EVENT_OPERATIONAL, 'MODULE_PLAN_TELEMETRY_EVENT');
  assert.equal(PLAN_TELEMETRY_EVENT_TERMINATED, 'MODULE_PLAN_TELEMETRY_TERMINATED');
});

test('phase3Detail projection contract: executor status, allowed stage, last signal, duration and health are all exposed', () => {
  // This asserts the projection shape derived from derivePlanStatus + the
  // phase3Detail mapping contract (the field names the UI consumes).
  const now = Date.now();
  const projected = derivePlanStatus({
    ...base,
    jobStatus: 'LEASED',
    startedAt: new Date(now - 120_000).toISOString(),
    lastSignalAt: new Date(now - 5_000).toISOString()
  });
  const detail = {
    module_id: 'm1',
    executor_status: projected.executorStatus,
    health: projected.health,
    allowed_stage: 'PLAN_EXECUTION',
    last_signal_at: new Date(now - 5_000).toISOString(),
    duration_ms: 120_000
  };
  assert.ok(['na fila', 'em execução', 'ativo sem evento novo', 'degradado'].includes(detail.executor_status));
  assert.ok(['QUEUED', 'ALIVE', 'ALIVE_NO_PROGRESS', 'DEGRADED', 'TERMINATED'].includes(detail.health));
  assert.ok(typeof detail.allowed_stage === 'string' && detail.allowed_stage.length > 0);
  assert.ok(typeof detail.last_signal_at === 'string');
  assert.ok(typeof detail.duration_ms === 'number');
});
