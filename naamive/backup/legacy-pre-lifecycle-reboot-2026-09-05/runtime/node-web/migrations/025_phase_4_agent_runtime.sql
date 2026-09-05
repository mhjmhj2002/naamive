CREATE TABLE IF NOT EXISTS ai_runtime (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  environment text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  current_configuration_version integer NOT NULL CHECK (current_configuration_version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (environment, name)
);

CREATE TABLE IF NOT EXISTS ai_runtime_configuration (
  runtime_id uuid NOT NULL REFERENCES ai_runtime(id),
  version integer NOT NULL CHECK (version > 0),
  adapter_type text NOT NULL CHECK (adapter_type IN ('CODEX_CLI','OPENAI_COMPATIBLE_HTTP')),
  endpoint text,
  model text NOT NULL,
  quality_tier text NOT NULL CHECK (quality_tier IN ('LOW','MEDIUM','HIGH')),
  timeout_seconds integer NOT NULL CHECK (timeout_seconds BETWEEN 1 AND 3600),
  auth_type text NOT NULL CHECK (auth_type IN ('API_KEY','BEARER_TOKEN','CLI_SESSION','NONE')),
  secret_reference text,
  configuration jsonb NOT NULL,
  created_by text NOT NULL,
  change_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (runtime_id, version)
);

DO $$ BEGIN
  ALTER TABLE ai_runtime ADD CONSTRAINT ai_runtime_current_configuration_fk
    FOREIGN KEY (id, current_configuration_version)
    REFERENCES ai_runtime_configuration(runtime_id, version) DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS ai_runtime_validation (
  id uuid PRIMARY KEY,
  runtime_id uuid NOT NULL,
  configuration_version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('READY','DISABLED','MISCONFIGURED','AUTHENTICATION_REQUIRED','UNAVAILABLE','QUOTA_EXHAUSTED','UNKNOWN')),
  sanitized_result jsonb NOT NULL,
  source text NOT NULL,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (runtime_id, configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  UNIQUE (runtime_id, configuration_version, source)
);

CREATE TABLE IF NOT EXISTS agent_execution_policy (
  id uuid NOT NULL,
  name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  selectors jsonb NOT NULL,
  primary_runtime_id uuid NOT NULL REFERENCES ai_runtime(id),
  fallback_runtime_id uuid REFERENCES ai_runtime(id),
  fallback_allowed boolean NOT NULL DEFAULT false,
  provider_retry_limit integer NOT NULL DEFAULT 2 CHECK (provider_retry_limit BETWEEN 0 AND 2),
  published_at timestamptz NOT NULL,
  published_by text NOT NULL,
  PRIMARY KEY (id, version),
  UNIQUE (name, version),
  CHECK (NOT fallback_allowed OR fallback_runtime_id IS NOT NULL),
  CHECK (fallback_runtime_id IS NULL OR fallback_runtime_id <> primary_runtime_id)
);

CREATE TABLE IF NOT EXISTS agent_execution (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES jobs(id),
  operation_id uuid NOT NULL REFERENCES operations(id),
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  revision_id uuid REFERENCES intake_revisions(id),
  job_kind text NOT NULL,
  idempotency_key text NOT NULL,
  agent_id text NOT NULL,
  agent_version text NOT NULL,
  task_type text NOT NULL,
  classification text NOT NULL CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  policy_id uuid NOT NULL,
  policy_name text NOT NULL,
  policy_version integer NOT NULL,
  state text NOT NULL CHECK (state IN ('PENDING','SELECTED','RUNNING','SUCCEEDED','FAILED','BLOCKED_NO_EXECUTOR_AVAILABLE','CANCELLED','RECONCILIATION_REQUIRED')),
  selected_runtime_id uuid,
  selected_configuration_version integer,
  selected_runtime_name text,
  selected_adapter_type text,
  selection_reason jsonb NOT NULL,
  next_action text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  FOREIGN KEY (policy_id, policy_version) REFERENCES agent_execution_policy(id, version),
  FOREIGN KEY (selected_runtime_id, selected_configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  CHECK ((selected_runtime_id IS NULL) = (selected_configuration_version IS NULL)),
  UNIQUE (job_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS agent_execution_attempt (
  id uuid PRIMARY KEY,
  execution_id uuid NOT NULL REFERENCES agent_execution(id),
  sequence integer NOT NULL CHECK (sequence > 0),
  runtime_id uuid NOT NULL,
  configuration_version integer NOT NULL,
  adapter_type text NOT NULL,
  attempt_kind text NOT NULL CHECK (attempt_kind IN ('PRIMARY','RETRY','FALLBACK')),
  state text NOT NULL CHECK (state IN ('PLANNED','DISPATCHED','SUCCEEDED','FAILED','TIMED_OUT','RATE_LIMITED','QUOTA_EXHAUSTED','AUTHENTICATION_FAILED','INVALID_OUTPUT','POLICY_BLOCKED','CANCELLED','RECONCILIATION_REQUIRED')),
  failure_class text,
  retry_not_before timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  sanitized_error jsonb,
  evidence_reference jsonb,
  usage jsonb,
  FOREIGN KEY (runtime_id, configuration_version) REFERENCES ai_runtime_configuration(runtime_id, version),
  UNIQUE (execution_id, sequence)
);
CREATE UNIQUE INDEX IF NOT EXISTS agent_execution_one_dispatched ON agent_execution_attempt (execution_id) WHERE state = 'DISPATCHED';

CREATE TABLE IF NOT EXISTS agent_runtime_audit (
  id uuid PRIMARY KEY,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  actor_id text NOT NULL,
  reason text NOT NULL,
  before_value jsonb,
  after_value jsonb,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS retention_policies (
  resource_type text PRIMARY KEY,
  retention_days integer NOT NULL CHECK (retention_days >= 365),
  tombstone_strategy text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO retention_policies(resource_type, retention_days, tombstone_strategy)
VALUES ('agent_runtime_history', 365, 'AUDIT_ONLY')
ON CONFLICT (resource_type) DO UPDATE SET retention_days = GREATEST(retention_policies.retention_days, EXCLUDED.retention_days), tombstone_strategy = EXCLUDED.tombstone_strategy, updated_at = clock_timestamp();

CREATE OR REPLACE FUNCTION block_published_policy_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'PUBLISHED_POLICY_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS agent_execution_policy_immutable ON agent_execution_policy;
CREATE TRIGGER agent_execution_policy_immutable BEFORE UPDATE ON agent_execution_policy FOR EACH ROW EXECUTE FUNCTION block_published_policy_updates();

CREATE OR REPLACE FUNCTION block_used_runtime_configuration_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM agent_execution_attempt WHERE runtime_id = OLD.runtime_id AND configuration_version = OLD.version) THEN
    RAISE EXCEPTION 'USED_RUNTIME_CONFIGURATION_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS ai_runtime_configuration_used_immutable ON ai_runtime_configuration;
CREATE TRIGGER ai_runtime_configuration_used_immutable BEFORE UPDATE ON ai_runtime_configuration FOR EACH ROW EXECUTE FUNCTION block_used_runtime_configuration_updates();

CREATE OR REPLACE FUNCTION block_terminal_attempt_updates() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state IN ('SUCCEEDED','FAILED','TIMED_OUT','RATE_LIMITED','QUOTA_EXHAUSTED','AUTHENTICATION_FAILED','INVALID_OUTPUT','POLICY_BLOCKED','CANCELLED') AND ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN
    RAISE EXCEPTION 'TERMINAL_ATTEMPT_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS agent_execution_attempt_terminal_immutable ON agent_execution_attempt;
CREATE TRIGGER agent_execution_attempt_terminal_immutable BEFORE UPDATE ON agent_execution_attempt FOR EACH ROW EXECUTE FUNCTION block_terminal_attempt_updates();

CREATE OR REPLACE VIEW agent_execution_view AS
SELECT e.id,e.job_id,e.operation_id,e.project_key,e.job_kind,e.agent_id,e.task_type,e.classification,e.policy_name,e.policy_version,e.state,e.selected_runtime_id,e.selected_runtime_name,e.selected_adapter_type,e.selection_reason,e.next_action,e.created_at,e.completed_at
FROM agent_execution e;

CREATE OR REPLACE VIEW agent_execution_attempt_view AS
SELECT e.project_key,a.execution_id,a.id,a.sequence,a.attempt_kind,r.name AS runtime_name,a.adapter_type,a.state,a.failure_class,a.retry_not_before,a.dispatched_at,a.completed_at,a.sanitized_error,a.usage
FROM agent_execution_attempt a
JOIN agent_execution e ON e.id=a.execution_id
JOIN ai_runtime r ON r.id=a.runtime_id;
