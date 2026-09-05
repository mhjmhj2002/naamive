-- Repair the invalid pairing produced by an early Phase 2 build.  These rows
-- are currently following the intake gate, so retain the intake workflow.
UPDATE projects
SET workflow_code = 'PROJECT_INTAKE', workflow_version = 1, updated_at = now()
WHERE workflow_code = 'PROJECT_DISCOVERY'
  AND state IN ('DRAFT', 'WAITING_FOR_REGISTRATION');

-- A project may only use a state published by its selected workflow.  This
-- protects administrative operations (including global archiving) from an
-- impossible workflow/state combination while allowing new workflow versions.
CREATE OR REPLACE FUNCTION enforce_project_workflow_state()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM workflow_definitions definition
    JOIN workflow_states state ON state.workflow_id = definition.id
    WHERE definition.code = NEW.workflow_code
      AND definition.version = NEW.workflow_version
      AND definition.status = 'PUBLISHED'
      AND state.code = NEW.state
  ) THEN
    RAISE EXCEPTION 'PROJECT_WORKFLOW_STATE_INVALID'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_workflow_state_integrity ON projects;
CREATE TRIGGER projects_workflow_state_integrity
BEFORE INSERT OR UPDATE OF workflow_code, workflow_version, state ON projects
FOR EACH ROW EXECUTE FUNCTION enforce_project_workflow_state();
