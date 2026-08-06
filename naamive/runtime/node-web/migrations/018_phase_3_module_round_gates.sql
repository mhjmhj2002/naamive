-- Entity-specific gates avoid changing the published project gate contract.
CREATE TABLE module_gates (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), module_id uuid NOT NULL REFERENCES modules(id),
  revision_id uuid NOT NULL REFERENCES module_revisions(id), round_id uuid NOT NULL REFERENCES module_rounds(id),
  kind text NOT NULL, version integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'OPEN', evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  decision text, feedback text, opened_at timestamptz NOT NULL DEFAULT clock_timestamp(), decided_at timestamptz,
  UNIQUE(module_id, kind, version)
);
CREATE UNIQUE INDEX one_open_module_gate ON module_gates(module_id) WHERE status='OPEN';
ALTER TABLE module_rounds ADD COLUMN definition_artifact_id uuid;
ALTER TABLE module_rounds ADD COLUMN architecture_artifact_id uuid;
ALTER TABLE module_rounds ADD COLUMN plan_artifact_id uuid;
ALTER TABLE module_rounds ADD COLUMN completed_at timestamptz;
CREATE INDEX module_rounds_revision_idx ON module_rounds(revision_id,round_number);
