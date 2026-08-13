ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS context_schema_version text;
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS context_hash text;
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS validator_version text;
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS validation_hash text;
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS context_payload jsonb;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS retry_of_operation_id uuid REFERENCES operations(id);
CREATE UNIQUE INDEX IF NOT EXISTS one_module_plan_retry_per_source ON operations(retry_of_operation_id) WHERE retry_of_operation_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS module_plan_job_context (
  operation_id uuid PRIMARY KEY REFERENCES operations(id), project_id text NOT NULL REFERENCES projects(id), module_id uuid NOT NULL REFERENCES modules(id),
  module_revision_id uuid NOT NULL REFERENCES module_revisions(id), technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id),
  context_schema_version text NOT NULL, context_payload jsonb NOT NULL, context_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
