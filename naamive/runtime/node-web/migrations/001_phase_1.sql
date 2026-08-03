CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS projects (
  id text PRIMARY KEY, title text NOT NULL, business_owner text NOT NULL, submitted_by text NOT NULL,
  repository_path text NOT NULL, repository_origin text NOT NULL, base_branch text NOT NULL, initial_sha text NOT NULL,
  workflow_code text NOT NULL DEFAULT 'PROJECT_INTAKE', workflow_version integer NOT NULL DEFAULT 1,
  state text NOT NULL DEFAULT 'DRAFT', draft jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS intake_revisions (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), schema_version integer NOT NULL,
  payload jsonb NOT NULL, structured_sha256 text NOT NULL, markdown_sha256 text NOT NULL,
  artifact_uri text NOT NULL, submitted_at timestamptz NOT NULL DEFAULT now(), submitted_by text NOT NULL,
  UNIQUE(project_id, structured_sha256)
);
CREATE TABLE IF NOT EXISTS operations (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), kind text NOT NULL, status text NOT NULL,
  idempotency_key text NOT NULL UNIQUE, correlation_id uuid NOT NULL, revision_id uuid REFERENCES intake_revisions(id),
  failure_code text, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY, operation_id uuid NOT NULL REFERENCES operations(id), project_id text NOT NULL REFERENCES projects(id),
  revision_id uuid NOT NULL REFERENCES intake_revisions(id), kind text NOT NULL, status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_expires_at timestamptz,
  idempotency_key text NOT NULL UNIQUE, last_error text, completed_at timestamptz
);
CREATE TABLE IF NOT EXISTS gates (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), kind text NOT NULL, version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'OPEN', revision_id uuid NOT NULL REFERENCES intake_revisions(id), opened_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_gate_per_project ON gates(project_id) WHERE status = 'OPEN';
CREATE TABLE IF NOT EXISTS artifacts (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), execution_id uuid, gate_id uuid,
  artifact_type text NOT NULL, storage_uri text NOT NULL, storage_key text NOT NULL, sha256 text NOT NULL,
  schema_version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(project_id, storage_key)
);
CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), event_type text NOT NULL,
  correlation_id uuid NOT NULL, causation_id uuid, operation_id uuid, job_id uuid, revision_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_project_id_id ON events(project_id, id);
