-- project_id is uuid on baseline tables and text on Phase 3 tables.
CREATE OR REPLACE FUNCTION require_approved_project_baseline_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE project_workflow text; project_workflow_version integer; baseline_project uuid; baseline_status text;
BEGIN
  SELECT workflow_code, workflow_version INTO project_workflow, project_workflow_version FROM projects WHERE id = NEW.project_id::text;
  IF project_workflow = 'PROJECT_DISCOVERY' AND project_workflow_version = 3 THEN
    IF NEW.technology_baseline_revision_id IS NULL THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_APPROVAL_REQUIRED: % requires an approved technology baseline revision for project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation'; END IF;
    SELECT project_id, status INTO baseline_project, baseline_status FROM technology_baseline_revisions WHERE id = NEW.technology_baseline_revision_id;
    IF baseline_project::text IS DISTINCT FROM NEW.project_id::text THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_PROJECT_MISMATCH: % baseline revision must belong to project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation'; END IF;
    IF baseline_status IS DISTINCT FROM 'APPROVED' THEN RAISE EXCEPTION 'TECHNOLOGY_BASELINE_REVISION_NOT_APPROVED: % requires an approved technology baseline revision', TG_TABLE_NAME USING ERRCODE = 'check_violation'; END IF;
  ELSIF NEW.technology_baseline_revision_id IS NOT NULL THEN RAISE EXCEPTION 'BASELINE_NOT_REQUIRED_LEGACY: legacy implementation contracts must not carry a technology baseline revision' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END $$;
