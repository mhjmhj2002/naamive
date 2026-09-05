-- REC-01 (post-F6.5): a terminal project job is not a retryable job.  It is
-- an auditable operational inconsistency whose governed recovery creates a
-- distinct operation/job chain.  This table deliberately does not reuse
-- recovery_decisions, which is anchored exclusively to work_items or
-- integration_candidates and whose executor owns those aggregate transitions.
CREATE TABLE IF NOT EXISTS inconsistency_cases (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  resource_kind text NOT NULL CHECK (resource_kind IN ('PROJECT')),
  resource_id text NOT NULL,
  source_operation_id uuid NOT NULL REFERENCES operations(id) ON DELETE CASCADE,
  source_job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  source_job_kind text NOT NULL,
  cause_code text NOT NULL,
  classification text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status text NOT NULL CHECK (status IN ('OPEN','RECOVERY_PENDING','RECOVERY_RUNNING','WAITING_RECONCILIATION','RESOLVED','TERMINAL','SUPERSEDED')),
  generation integer NOT NULL DEFAULT 1 CHECK (generation > 0),
  recovery_attempts integer NOT NULL DEFAULT 0 CHECK (recovery_attempts >= 0),
  recoverability text NOT NULL,
  recommended_action text NOT NULL,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_refs)='array'),
  resolution_operation_id uuid REFERENCES operations(id) ON DELETE SET NULL,
  resolution_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(source_job_id),
  CHECK (resource_id = project_id),
  CHECK ((status='RESOLVED') = (resolved_at IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS inconsistency_cases_project_open_idx
  ON inconsistency_cases(project_id,status,updated_at DESC,id DESC)
  WHERE status IN ('OPEN','RECOVERY_PENDING','RECOVERY_RUNNING','WAITING_RECONCILIATION');
CREATE INDEX IF NOT EXISTS inconsistency_cases_recovery_job_idx
  ON inconsistency_cases(resolution_job_id) WHERE resolution_job_id IS NOT NULL;

-- The recovery execution carries direct predecessor/source lineage as well as
-- its durable case reference.  Existing rows remain untouched.
ALTER TABLE operations ADD COLUMN IF NOT EXISTS inconsistency_case_id uuid REFERENCES inconsistency_cases(id) ON DELETE SET NULL;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS predecessor_operation_id uuid REFERENCES operations(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS inconsistency_case_id uuid REFERENCES inconsistency_cases(id) ON DELETE SET NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS predecessor_job_id uuid REFERENCES jobs(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS operations_inconsistency_case_idx ON operations(inconsistency_case_id) WHERE inconsistency_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_inconsistency_case_idx ON jobs(inconsistency_case_id) WHERE inconsistency_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS jobs_predecessor_job_idx ON jobs(predecessor_job_id) WHERE predecessor_job_id IS NOT NULL;

COMMENT ON TABLE inconsistency_cases IS 'REC-01 governed queue for terminal recoverable jobs. Source jobs stay terminal; recovery always creates a new operation/job.';
