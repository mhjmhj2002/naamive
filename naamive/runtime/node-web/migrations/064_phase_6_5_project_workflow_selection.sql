-- LR-02-FIX-01: PROJECT_INTAKE remains the active workflow until registration,
-- while the discovery workflow that will follow it is selected exactly once at
-- project creation. Rollout changes never rebind an existing project.

ALTER TABLE projects
  ADD COLUMN selected_discovery_workflow_code text,
  ADD COLUMN selected_discovery_workflow_version integer;

UPDATE projects
SET selected_discovery_workflow_code='PROJECT_DISCOVERY',
    selected_discovery_workflow_version=CASE
      WHEN workflow_code='PROJECT_DISCOVERY' THEN workflow_version
      ELSE 3
    END;

ALTER TABLE projects
  ALTER COLUMN selected_discovery_workflow_code SET NOT NULL,
  ALTER COLUMN selected_discovery_workflow_version SET NOT NULL,
  ADD CONSTRAINT projects_selected_discovery_workflow_code_check
    CHECK(selected_discovery_workflow_code='PROJECT_DISCOVERY'),
  ADD CONSTRAINT projects_selected_discovery_workflow_fk
    FOREIGN KEY(selected_discovery_workflow_code,selected_discovery_workflow_version)
    REFERENCES workflow_definitions(code,version);

CREATE OR REPLACE FUNCTION guard_project_discovery_workflow_selection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP='INSERT' AND NEW.selected_discovery_workflow_code IS NULL
    AND NEW.selected_discovery_workflow_version IS NULL THEN
    NEW.selected_discovery_workflow_code:='PROJECT_DISCOVERY';
    NEW.selected_discovery_workflow_version:=CASE
      WHEN NEW.workflow_code='PROJECT_DISCOVERY' THEN NEW.workflow_version
      ELSE 3
    END;
  ELSIF (NEW.selected_discovery_workflow_code IS NULL)
    <> (NEW.selected_discovery_workflow_version IS NULL) THEN
    RAISE EXCEPTION 'PROJECT_DISCOVERY_WORKFLOW_SELECTION_INCOMPLETE'
      USING ERRCODE='23514';
  END IF;

  IF TG_OP='UPDATE' AND (
    NEW.selected_discovery_workflow_code IS DISTINCT FROM OLD.selected_discovery_workflow_code
    OR NEW.selected_discovery_workflow_version IS DISTINCT FROM OLD.selected_discovery_workflow_version
  ) THEN
    RAISE EXCEPTION 'PROJECT_DISCOVERY_WORKFLOW_SELECTION_IMMUTABLE'
      USING ERRCODE='23514';
  END IF;

  IF NEW.workflow_code='PROJECT_DISCOVERY' AND (
    NEW.workflow_code IS DISTINCT FROM NEW.selected_discovery_workflow_code
    OR NEW.workflow_version IS DISTINCT FROM NEW.selected_discovery_workflow_version
  ) THEN
    RAISE EXCEPTION 'PROJECT_DISCOVERY_WORKFLOW_SELECTION_MISMATCH'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER project_discovery_workflow_selection_guard
BEFORE INSERT OR UPDATE OF workflow_code,workflow_version,
  selected_discovery_workflow_code,selected_discovery_workflow_version
ON projects FOR EACH ROW
EXECUTE FUNCTION guard_project_discovery_workflow_selection();
