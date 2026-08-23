-- REC-01: a recovery action is classified and persisted before it is executed.
-- The classification key is a server-derived fingerprint of the resource,
-- source state/version and authoritative evidence; clients never supply it.
CREATE TABLE IF NOT EXISTS recovery_decisions (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  policy_version text NOT NULL CHECK (policy_version='RECOVERY_POLICY:v1'),
  cause text NOT NULL CHECK (cause IN (
    'TIMEOUT_PRE_EFFECT','QUOTA_LIMIT','RATE_LIMIT','INFRA_TRANSIENT',
    'WORKER_DEAD_NO_OUTPUT','JOB_NOT_CONSUMED','WORKTREE_MISSING_NO_EVIDENCE',
    'LEASE_LOST','HANDOFF_CRASH','NO_TERMINAL_CONFIRMATION','DIRTY_WORKTREE',
    'OPERATION_UNRECORDED','COMMIT_PRESENT','EXECUTION_EVIDENCE_PRESENT',
    'DELIVERY_PRESENT','QA_FINDING_PRESENT','MERGE_TIMEOUT','PUSH_TIMEOUT',
    'MERGE_APPLIED_UNRECORDED','PUSH_APPLIED_UNRECORDED','GIT_DIVERGED',
    'INTEGRATION_DEFECT','RETRY_EXHAUSTED'
  )),
  effect_certainty text NOT NULL CHECK (effect_certainty IN ('NO_EFFECT','EFFECT_PRESENT','EFFECT_UNKNOWN')),
  evidence_footprint jsonb NOT NULL CHECK (jsonb_typeof(evidence_footprint)='array'),
  selected_action text NOT NULL CHECK (selected_action IN (
    'RETRY','RESTART','RESUME','RECONCILE','REWORK','RECORD_AND_CONTINUE','INTEGRATION_RECOVERY'
  )),
  reason text NOT NULL,
  work_item_id uuid REFERENCES work_items(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES operations(id),
  job_id uuid REFERENCES jobs(id),
  delivery_id uuid REFERENCES deliveries(id),
  worktree_id uuid REFERENCES worktrees(id),
  integration_candidate_id uuid REFERENCES integration_candidates(id) ON DELETE CASCADE,
  integration_attempt_id uuid REFERENCES integration_attempts(id),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_refs)='array'),
  finding_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(finding_refs)='array'),
  source_state text NOT NULL,
  source_version integer NOT NULL,
  classification_key text NOT NULL UNIQUE,
  classification_fingerprint text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  operation_id uuid NOT NULL UNIQUE REFERENCES operations(id),
  predecessor_decision_id uuid REFERENCES recovery_decisions(id),
  execution_state text NOT NULL DEFAULT 'PENDING' CHECK (execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION','COMPLETED','SUPERSEDED','FAILED')),
  execution_attempts integer NOT NULL DEFAULT 0,
  execution_result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(execution_result)='object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  executed_at timestamptz,
  CHECK (work_item_id IS NOT NULL OR integration_candidate_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS recovery_decisions_work_item_time
  ON recovery_decisions(work_item_id,created_at DESC,id DESC) WHERE work_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS recovery_decisions_candidate_time
  ON recovery_decisions(integration_candidate_id,created_at DESC,id DESC) WHERE integration_candidate_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS recovery_decisions_pending
  ON recovery_decisions(execution_state,created_at,id)
  WHERE execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION');

-- Explicit lineage from every recovery-created execution back to its durable
-- decision. These columns are additive and do not reinterpret historical rows.
ALTER TABLE operations ADD COLUMN IF NOT EXISTS recovery_decision_id uuid REFERENCES recovery_decisions(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS recovery_decision_id uuid REFERENCES recovery_decisions(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS recovery_decision_id uuid REFERENCES recovery_decisions(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS origin_delivery_id uuid REFERENCES deliveries(id);
CREATE INDEX IF NOT EXISTS operations_recovery_decision_id_idx ON operations(recovery_decision_id);
CREATE INDEX IF NOT EXISTS jobs_recovery_decision_id_idx ON jobs(recovery_decision_id);
CREATE INDEX IF NOT EXISTS deliveries_recovery_decision_id_idx ON deliveries(recovery_decision_id);
