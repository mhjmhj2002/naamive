-- F5-14 — A baseline aprovada é obrigatória para contratos de implementação v3.
-- Mantém projetos legados (qualquer workflow diferente de PROJECT_DISCOVERY/v3)
-- sem referência, preservando integralmente a cadeia de entrega da Fase 3.

CREATE OR REPLACE FUNCTION require_approved_project_baseline_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  project_workflow text;
  project_workflow_version integer;
  baseline_project uuid;
  baseline_status text;
BEGIN
  SELECT workflow_code, workflow_version INTO project_workflow, project_workflow_version
    FROM projects WHERE id = NEW.project_id::text;
  IF project_workflow = 'PROJECT_DISCOVERY' AND project_workflow_version = 3 THEN
    IF NEW.technology_baseline_revision_id IS NULL THEN
      RAISE EXCEPTION 'TECHNOLOGY_BASELINE_APPROVAL_REQUIRED: % requires an approved technology baseline revision for project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation';
    END IF;
    SELECT project_id, status INTO baseline_project, baseline_status
      FROM technology_baseline_revisions WHERE id = NEW.technology_baseline_revision_id;
    IF baseline_project::text IS DISTINCT FROM NEW.project_id::text THEN
      RAISE EXCEPTION 'TECHNOLOGY_BASELINE_PROJECT_MISMATCH: % baseline revision must belong to project %', TG_TABLE_NAME, NEW.project_id USING ERRCODE = 'check_violation';
    END IF;
    IF baseline_status IS DISTINCT FROM 'APPROVED' THEN
      RAISE EXCEPTION 'TECHNOLOGY_BASELINE_REVISION_NOT_APPROVED: % requires an approved technology baseline revision', TG_TABLE_NAME USING ERRCODE = 'check_violation';
    END IF;
  ELSIF NEW.technology_baseline_revision_id IS NOT NULL THEN
    RAISE EXCEPTION 'BASELINE_NOT_REQUIRED_LEGACY: legacy implementation contracts must not carry a technology baseline revision' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS module_revisions_approved_baseline_guard ON module_revisions;
CREATE TRIGGER module_revisions_approved_baseline_guard BEFORE INSERT OR UPDATE ON module_revisions FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS modules_approved_baseline_guard ON modules;
CREATE TRIGGER modules_approved_baseline_guard BEFORE INSERT OR UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS module_gates_approved_baseline_guard ON module_gates;
CREATE TRIGGER module_gates_approved_baseline_guard BEFORE INSERT OR UPDATE ON module_gates FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS work_items_approved_baseline_guard ON work_items;
CREATE TRIGGER work_items_approved_baseline_guard BEFORE INSERT OR UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS deliveries_approved_baseline_guard ON deliveries;
CREATE TRIGGER deliveries_approved_baseline_guard BEFORE INSERT OR UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS findings_approved_baseline_guard ON findings;
CREATE TRIGGER findings_approved_baseline_guard BEFORE INSERT OR UPDATE ON findings FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS qa_matrices_approved_baseline_guard ON qa_matrices;
CREATE TRIGGER qa_matrices_approved_baseline_guard BEFORE INSERT OR UPDATE ON qa_matrices FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference();
DROP TRIGGER IF EXISTS jobs_approved_baseline_guard ON jobs;
CREATE TRIGGER jobs_approved_baseline_guard BEFORE INSERT OR UPDATE ON jobs FOR EACH ROW WHEN (NEW.delivery_id IS NOT NULL) EXECUTE FUNCTION require_approved_project_baseline_reference();

CREATE OR REPLACE FUNCTION enforce_candidate_manifest_baseline_references() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  project_workflow text;
  project_workflow_version integer;
  entry jsonb;
  persisted_baseline uuid;
BEGIN
  SELECT workflow_code, workflow_version INTO project_workflow, project_workflow_version FROM projects WHERE id = NEW.project_id;
  FOR entry IN SELECT value FROM jsonb_array_elements(COALESCE(NEW.manifest->'work_items', '[]'::jsonb)) LOOP
    SELECT technology_baseline_revision_id INTO persisted_baseline FROM work_items
      WHERE id = (entry->>'work_item_id')::uuid AND project_id = NEW.project_id;
    IF persisted_baseline IS NULL AND project_workflow = 'PROJECT_DISCOVERY' AND project_workflow_version = 3 THEN
      RAISE EXCEPTION 'TECHNOLOGY_BASELINE_APPROVAL_REQUIRED: candidate manifest work item requires an approved baseline' USING ERRCODE = 'check_violation';
    END IF;
    IF entry->>'technology_baseline_revision_id' IS DISTINCT FROM persisted_baseline::text THEN
      RAISE EXCEPTION 'BASELINE_REFERENCE_MISMATCH: candidate manifest must inherit technology_baseline_revision_id from its work item' USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS integration_candidates_baseline_manifest_guard ON integration_candidates;
CREATE TRIGGER integration_candidates_baseline_manifest_guard BEFORE INSERT OR UPDATE ON integration_candidates FOR EACH ROW EXECUTE FUNCTION enforce_candidate_manifest_baseline_references();
