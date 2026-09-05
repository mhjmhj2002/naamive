-- F5-23 pendencies 19-22: durable, sanitized operational telemetry for
-- PLAN_MODULE_WORK_ITEMS.
--
-- The closed event contract from `codex exec --json` is captured
-- incrementally, but ONLY operational events (thread.started, turn.started,
-- turn.completed) are persisted here. Prompts, chain of reasoning, tool
-- arguments, file contents, secrets and raw output are NEVER stored.
-- Unknown/unrecognized lines are dropped fail-closed and recorded only as a
-- sanitized DISCARDED row (reason + count) — the raw line is never persisted.

-- Per-event operational record (closed contract, sanitized payload only).
-- Telemetry is tied to the lifecycle of its job/operation: jobs/operations are
-- append-only in production and only ever removed by test/worktree cleanup, so
-- the evidence rows cascade away with their owner (same convention as
-- deliveries.job_id ON DELETE SET NULL in migration 022).
CREATE TABLE IF NOT EXISTS module_plan_operational_events (
  id bigserial PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  operation_id uuid REFERENCES operations(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  module_id uuid REFERENCES modules(id),
  sequence integer NOT NULL,
  event_type text NOT NULL,
  event_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS module_plan_operational_events_job_idx ON module_plan_operational_events(job_id, id);
CREATE INDEX IF NOT EXISTS module_plan_operational_events_operation_idx ON module_plan_operational_events(operation_id, id);

-- Durable, sanitized health/activity record per planning job/operation.
-- A heartbeat NEVER counts as functional progress: only
-- last_operational_event_at / operational_event_count reflect real events;
-- last_signal_at only proves the process is alive.
CREATE TABLE IF NOT EXISTS module_plan_telemetry (
  operation_id uuid PRIMARY KEY REFERENCES operations(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  project_id text NOT NULL REFERENCES projects(id),
  module_id uuid REFERENCES modules(id),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_operational_event_at timestamptz,
  last_signal_at timestamptz,
  heartbeat_count integer NOT NULL DEFAULT 0,
  operational_event_count integer NOT NULL DEFAULT 0,
  discarded_event_count integer NOT NULL DEFAULT 0,
  terminated_at timestamptz,
  interrupted_reason text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS module_plan_telemetry_job_idx ON module_plan_telemetry(job_id);

-- Activity/health telemetry columns on planning jobs mirror the durable table
-- so the lease/heartbeat path and the projection can read signals cheaply.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_operational_event_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS last_signal_at timestamptz;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS operational_event_count integer NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS discarded_event_count integer NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS interrupted_reason text;
