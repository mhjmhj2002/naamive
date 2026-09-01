-- Complete the non-F3 corrective-loop and scoped-query invariants without
-- changing any historical finding or acceptance.
CREATE UNIQUE INDEX IF NOT EXISTS findings_assurance_project_fingerprint
  ON findings(origin,target_project_id,rule_code,fingerprint)
  WHERE origin='ASSURANCE_REVIEW' AND target_project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS findings_assurance_work_item_target
  ON findings(target_work_item_id,state,created_at DESC)
  WHERE origin='ASSURANCE_REVIEW' AND target_work_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS work_blocks_correlation_history
  ON work_blocks(project_id,correlation_id,created_at DESC);

CREATE TABLE IF NOT EXISTS assurance_command_idempotency (
  idempotency_key text PRIMARY KEY,
  command_type text NOT NULL,
  resource_id text NOT NULL,
  result_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
