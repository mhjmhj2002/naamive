-- F5-03-FIX-01: projects.id is the canonical textual project identity.  The
-- F5 tables originally duplicated it as project_id uuid plus project_key
-- text; this migration keeps the compatible duplicate columns, but makes
-- both direct, referentially-integral representations of projects(id).
--
-- UUID-shaped legacy project ids are preserved byte-for-byte by the explicit
-- uuid -> text conversion.  The checks/FKs are validated in this transaction,
-- so an inconsistent historical row rolls back rather than weakening the
-- project boundary.

ALTER TABLE technology_inventory
  ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE technology_selection_contexts
  ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE technology_baselines
  ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE technology_baseline_revisions
  ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE technology_baseline_gates
  ALTER COLUMN project_id TYPE text USING project_id::text;
ALTER TABLE qa_matrices
  ALTER COLUMN project_id TYPE text USING project_id::text;

ALTER TABLE technology_inventory
  ADD CONSTRAINT technology_inventory_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT technology_inventory_project_identity_matches CHECK (project_id = project_key) NOT VALID;
ALTER TABLE technology_selection_contexts
  ADD CONSTRAINT technology_selection_contexts_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT technology_selection_contexts_project_identity_matches CHECK (project_id = project_key) NOT VALID;
ALTER TABLE technology_baselines
  ADD CONSTRAINT technology_baselines_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT technology_baselines_project_identity_matches CHECK (project_id = project_key) NOT VALID;
ALTER TABLE technology_baseline_revisions
  ADD CONSTRAINT technology_baseline_revisions_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT technology_baseline_revisions_project_identity_matches CHECK (project_id = project_key) NOT VALID;
ALTER TABLE technology_baseline_gates
  ADD CONSTRAINT technology_baseline_gates_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT technology_baseline_gates_project_identity_matches CHECK (project_id = project_key) NOT VALID;
ALTER TABLE qa_matrices
  ADD CONSTRAINT qa_matrices_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) NOT VALID,
  ADD CONSTRAINT qa_matrices_project_identity_matches CHECK (project_id = project_key) NOT VALID;

ALTER TABLE technology_inventory VALIDATE CONSTRAINT technology_inventory_project_id_fkey;
ALTER TABLE technology_inventory VALIDATE CONSTRAINT technology_inventory_project_identity_matches;
ALTER TABLE technology_selection_contexts VALIDATE CONSTRAINT technology_selection_contexts_project_id_fkey;
ALTER TABLE technology_selection_contexts VALIDATE CONSTRAINT technology_selection_contexts_project_identity_matches;
ALTER TABLE technology_baselines VALIDATE CONSTRAINT technology_baselines_project_id_fkey;
ALTER TABLE technology_baselines VALIDATE CONSTRAINT technology_baselines_project_identity_matches;
ALTER TABLE technology_baseline_revisions VALIDATE CONSTRAINT technology_baseline_revisions_project_id_fkey;
ALTER TABLE technology_baseline_revisions VALIDATE CONSTRAINT technology_baseline_revisions_project_identity_matches;
ALTER TABLE technology_baseline_gates VALIDATE CONSTRAINT technology_baseline_gates_project_id_fkey;
ALTER TABLE technology_baseline_gates VALIDATE CONSTRAINT technology_baseline_gates_project_identity_matches;
ALTER TABLE qa_matrices VALIDATE CONSTRAINT qa_matrices_project_id_fkey;
ALTER TABLE qa_matrices VALIDATE CONSTRAINT qa_matrices_project_identity_matches;

-- This is the live definition installed by 034.  Its old uuid local would
-- otherwise coerce every textual baseline project id back to uuid on module,
-- work-item, delivery, finding, and QA propagation guards.
CREATE OR REPLACE FUNCTION require_approved_project_baseline_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_workflow text; project_workflow_version integer; baseline_project text; baseline_status text;
BEGIN
  SELECT workflow_code, workflow_version INTO project_workflow, project_workflow_version FROM projects WHERE id = NEW.project_id;
  IF project_workflow = 'PROJECT_DISCOVERY' AND project_workflow_version = 3 THEN
    IF NEW.technology_baseline_revision_id IS NULL THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_APPROVAL_REQUIRED: % requires an approved technology baseline revision for project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation'; END IF;
    SELECT project_id, status INTO baseline_project, baseline_status FROM technology_baseline_revisions WHERE id = NEW.technology_baseline_revision_id;
    IF baseline_project IS DISTINCT FROM NEW.project_id THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_PROJECT_MISMATCH: % baseline revision must belong to project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation'; END IF;
    IF baseline_status IS DISTINCT FROM 'APPROVED' THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_REVISION_NOT_APPROVED: % requires an approved technology baseline revision', TG_TABLE_NAME USING ERRCODE = 'check_violation'; END IF;
  ELSIF NEW.technology_baseline_revision_id IS NOT NULL THEN RAISE EXCEPTION 'BASELINE_NOT_REQUIRED_LEGACY: legacy implementation contracts must not carry a technology baseline revision' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;

COMMENT ON COLUMN technology_inventory.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN technology_inventory.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
COMMENT ON COLUMN technology_selection_contexts.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN technology_selection_contexts.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
COMMENT ON COLUMN technology_baselines.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN technology_baselines.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
COMMENT ON COLUMN technology_baseline_revisions.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN technology_baseline_revisions.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
COMMENT ON COLUMN technology_baseline_gates.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN technology_baseline_gates.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
COMMENT ON COLUMN qa_matrices.project_id IS 'Canonical projects.id in text form; retained alongside project_key for historical compatibility.';
COMMENT ON COLUMN qa_matrices.project_key IS 'Historical alias of canonical projects.id; constrained equal to project_id.';
