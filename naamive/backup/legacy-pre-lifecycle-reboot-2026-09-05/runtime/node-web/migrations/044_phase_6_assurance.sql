-- Phase 6 is strictly additive.  Existing executions keep their F4 lifecycle.
ALTER TABLE agent_execution DROP CONSTRAINT IF EXISTS agent_execution_state_check;
ALTER TABLE agent_execution ADD CONSTRAINT agent_execution_state_check CHECK (state IN ('PENDING','SELECTED','RUNNING','OUTPUT_SUBMITTED','SUCCEEDED','FAILED','BLOCKED_NO_EXECUTOR_AVAILABLE','CANCELLED','RECONCILIATION_REQUIRED'));

CREATE TABLE assurance_policies (
  id uuid NOT NULL, name text NOT NULL, version integer NOT NULL CHECK (version > 0),
  enabled boolean NOT NULL DEFAULT false, selectors jsonb NOT NULL, configuration jsonb NOT NULL,
  published_by text NOT NULL, published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (id, version), UNIQUE (name, version)
);
CREATE UNIQUE INDEX assurance_policy_one_enabled_name ON assurance_policies(name) WHERE enabled;

CREATE TABLE work_acceptances (
  id uuid PRIMARY KEY, execution_id uuid NOT NULL UNIQUE REFERENCES agent_execution(id), project_id text NOT NULL REFERENCES projects(id),
  correlation_id uuid NOT NULL, policy_id uuid NOT NULL, policy_version integer NOT NULL,
  producer_identity jsonb NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING_PRODUCE','PENDING_REVIEW','WAITING_FOR_INDEPENDENT_REVIEWER','ACCEPTED','REWORK_REQUIRED','BLOCKED','ESCALATED','CANCELLED')),
  output_reference jsonb, classification text NOT NULL CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (policy_id,policy_version) REFERENCES assurance_policies(id,version)
);
CREATE INDEX work_acceptances_project_state ON work_acceptances(project_id,state,created_at DESC);
CREATE INDEX work_acceptances_correlation ON work_acceptances(correlation_id);

CREATE TABLE assurance_reviews (
  id uuid PRIMARY KEY, acceptance_id uuid NOT NULL REFERENCES work_acceptances(id), version integer NOT NULL,
  dispatch_execution_id uuid REFERENCES agent_execution(id), reviewer_agent_id text NOT NULL, reviewer_agent_version text NOT NULL,
  reviewer_runtime_id uuid, reviewer_configuration_version integer, reviewer_policy_id uuid, reviewer_policy_version integer,
  execution_context_hash text NOT NULL, independence_check jsonb NOT NULL, state text NOT NULL CHECK (state IN ('PENDING','DISPATCHED','DECIDED','CANCELLED')),
  review_package jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), decided_at timestamptz,
  UNIQUE(acceptance_id,version)
);
CREATE UNIQUE INDEX one_active_review_per_acceptance ON assurance_reviews(acceptance_id) WHERE state IN ('PENDING','DISPATCHED');

CREATE TABLE review_decisions (
  id uuid PRIMARY KEY, review_id uuid NOT NULL REFERENCES assurance_reviews(id), decision text NOT NULL CHECK (decision IN ('ACCEPT','REWORK','BLOCK','ESCALATE')),
  evidence jsonb NOT NULL, idempotency_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(review_id)
);

CREATE TABLE work_blocks (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), acceptance_id uuid REFERENCES work_acceptances(id), execution_id uuid REFERENCES agent_execution(id),
  source_type text NOT NULL, source_id text NOT NULL, block_code text NOT NULL, category text NOT NULL CHECK (category IN ('TECHNICAL','REQUIREMENT_AMBIGUITY','ARCHITECTURE_CONFLICT','DEPENDENCY','ENVIRONMENT','EXTERNAL_SERVICE','TEST_FAILURE','SECURITY','POLICY','MISSING_INFORMATION')),
  severity text NOT NULL CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')), state text NOT NULL CHECK (state IN ('OPEN','DIAGNOSING','SOLUTION_PROPOSED','RESOLUTION_SELECTED','RESOLVING','RESOLVED','ESCALATED','PAUSED','CANCELLED')),
  evidence jsonb NOT NULL DEFAULT '{}', resolution jsonb, previous_block_id uuid REFERENCES work_blocks(id), correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX one_open_work_block ON work_blocks(source_type,source_id,block_code) WHERE state NOT IN ('RESOLVED','CANCELLED');
CREATE INDEX work_blocks_project_state ON work_blocks(project_id,state,created_at DESC);

CREATE TABLE assistance_proposals (
  id uuid PRIMARY KEY, block_id uuid NOT NULL REFERENCES work_blocks(id), alternatives jsonb NOT NULL, recommendation jsonb NOT NULL, confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  routing_role text NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE assurance_human_gates (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), block_id uuid REFERENCES work_blocks(id), gate_type text NOT NULL CHECK (gate_type IN ('INDEPENDENCE_EXCEPTION','SCOPE_ARCHITECTURE_POLICY','ACCEPTED_RISK','ESCALATED_CLOSURE')),
  actor_id text NOT NULL, decision text NOT NULL CHECK (decision IN ('APPROVED','REJECTED')), reason text NOT NULL, evidence jsonb NOT NULL, expires_at timestamptz, correlation_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE findings ADD COLUMN IF NOT EXISTS agent_execution_id uuid REFERENCES agent_execution(id);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS work_acceptance_id uuid REFERENCES work_acceptances(id);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS review_id uuid REFERENCES assurance_reviews(id);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS dispatch_id uuid REFERENCES agent_execution(id);
ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_origin_check;
ALTER TABLE findings ADD CONSTRAINT findings_origin_check CHECK (origin IN ('DELIVERY_QA','CANDIDATE_VALIDATION','ASSURANCE_REVIEW'));
CREATE INDEX findings_assurance_review ON findings(review_id) WHERE review_id IS NOT NULL;

CREATE INDEX agent_execution_assurance_state ON agent_execution(project_key,state) WHERE state='OUTPUT_SUBMITTED';
INSERT INTO retention_policies(resource_type,retention_days,tombstone_strategy) VALUES ('assurance_history',365,'AUDIT_ONLY') ON CONFLICT(resource_type) DO NOTHING;
