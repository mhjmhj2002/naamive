-- AUT-01: durable, auditable scheduling decisions.  A decision is deliberately
-- separate from the worker's physical worktree/Git effects.
CREATE TABLE IF NOT EXISTS work_item_scheduling_decisions (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  trigger_code text NOT NULL,
  decision_code text NOT NULL CHECK(decision_code IN (
    'BLOCKED_EXTERNAL_INPUT','WAITING_DEPENDENCIES','WAITING_CAPACITY',
    'ACTIVE_ATTEMPT_EXISTS','PAUSED','NOT_ELIGIBLE','ELIGIBLE','DISPATCHED'
  )),
  predicate_version text NOT NULL,
  dispatch_key text,
  operation_id uuid REFERENCES operations(id),
  delivery_id uuid REFERENCES deliveries(id),
  job_id uuid REFERENCES jobs(id),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS work_item_scheduling_decisions_item_time
  ON work_item_scheduling_decisions(work_item_id,created_at DESC,id DESC);

-- The unique key is the durable identity of an automatic dispatch. It includes
-- the plan revision and work-item version, rather than an attempt counter.
CREATE UNIQUE INDEX IF NOT EXISTS work_item_scheduling_dispatch_identity
  ON work_item_scheduling_decisions(work_item_id,dispatch_key)
  WHERE decision_code='DISPATCHED';
