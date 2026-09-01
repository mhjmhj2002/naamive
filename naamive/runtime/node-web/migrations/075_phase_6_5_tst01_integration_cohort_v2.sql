-- TST-01 corrective subwork: v2 adds incremental integration cohorts without
-- reinterpreting historical AUT-02 v1 records.
ALTER TABLE module_plan_revisions
  ADD COLUMN integration_pipeline_version text NOT NULL DEFAULT 'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1';
ALTER TABLE module_plan_revisions
  ADD CONSTRAINT module_plan_revisions_integration_pipeline_version CHECK (integration_pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2'));

ALTER TABLE work_items
  ADD COLUMN integration_pipeline_version text NOT NULL DEFAULT 'AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1';
ALTER TABLE work_items
  ADD CONSTRAINT work_items_integration_pipeline_version CHECK (integration_pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2'));
CREATE INDEX work_items_integration_pipeline_scope ON work_items(module_plan_revision_id,revision_id,round_id,integration_pipeline_version,state);

ALTER TABLE work_item_delivery_candidates DROP CONSTRAINT work_item_delivery_candidates_pipeline_version_check;
ALTER TABLE work_item_delivery_candidates DROP CONSTRAINT work_item_delivery_candidates_policy_version_check;
ALTER TABLE work_item_delivery_candidates ADD CONSTRAINT work_item_delivery_candidates_pipeline_version_check CHECK (pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2'));
ALTER TABLE work_item_delivery_candidates ADD CONSTRAINT work_item_delivery_candidates_policy_version_check CHECK ((pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1' AND policy_version='AUT-02:v1') OR (pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2' AND policy_version='AUT-02:v2'));

ALTER TABLE integration_candidates DROP CONSTRAINT integration_candidates_aut02_shape;
ALTER TABLE integration_candidates ADD CONSTRAINT integration_candidates_aut02_shape CHECK (
  pipeline_version IS NULL OR (
    pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2') AND
    ((pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1' AND policy_version='AUT-02:v1') OR (pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2' AND policy_version='AUT-02:v2')) AND
    module_id IS NOT NULL AND module_revision_id IS NOT NULL AND module_round_id IS NOT NULL AND generation>0 AND
    manifest_hash ~ '^[a-f0-9]{64}$' AND idempotency_key IS NOT NULL AND correlation_id IS NOT NULL
  )
);
CREATE UNIQUE INDEX integration_candidates_aut02_v2_identity ON integration_candidates(module_revision_id,module_round_id,manifest_hash) WHERE pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2';
CREATE INDEX integration_candidates_aut02_v2_round ON integration_candidates(module_revision_id,module_round_id,generation DESC) WHERE pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2';

ALTER TABLE integration_candidate_validation_reports DROP CONSTRAINT integration_candidate_validation_reports_policy_version_check;
ALTER TABLE integration_candidate_validation_reports ADD CONSTRAINT integration_candidate_validation_reports_policy_version_check CHECK (policy_version IN ('INTEGRATION_CANDIDATE_VALIDATION:v1','INTEGRATION_CANDIDATE_VALIDATION:v2'));

CREATE TABLE integration_candidate_member_reservations (
  candidate_id uuid NOT NULL REFERENCES integration_candidates(id),
  project_id text NOT NULL REFERENCES projects(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  state text NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','RELEASED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  released_at timestamptz,
  PRIMARY KEY(candidate_id,work_item_id)
);
CREATE UNIQUE INDEX integration_candidate_member_active_reservation ON integration_candidate_member_reservations(work_item_id) WHERE state='ACTIVE';

CREATE OR REPLACE FUNCTION release_v2_integration_candidate_reservations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2' AND NEW.state IN ('INTEGRATED','SUPERSEDED') AND OLD.state<>NEW.state THEN
    UPDATE integration_candidate_member_reservations SET state='RELEASED',released_at=clock_timestamp() WHERE candidate_id=NEW.id AND state='ACTIVE';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER integration_candidates_release_v2_reservations AFTER UPDATE OF state ON integration_candidates FOR EACH ROW EXECUTE FUNCTION release_v2_integration_candidate_reservations();

CREATE OR REPLACE FUNCTION prevent_aut02_candidate_manifest_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2') AND (
    NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash OR
    NEW.module_id IS DISTINCT FROM OLD.module_id OR NEW.module_revision_id IS DISTINCT FROM OLD.module_revision_id OR
    NEW.module_round_id IS DISTINCT FROM OLD.module_round_id OR NEW.generation IS DISTINCT FROM OLD.generation OR
    NEW.phase_sha IS DISTINCT FROM OLD.phase_sha OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
  ) THEN RAISE EXCEPTION 'AUT02_CANDIDATE_MANIFEST_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

-- 065's generic lineage guard intentionally recognizes only v1 validation
-- reports. Extend its function so every existing 065 trigger remains in place
-- and preserves its guard. Some historically migrated databases do not have
-- the validation-report trigger despite 065's published source; create only
-- that missing guard instead of dropping a guard that is already present.
CREATE OR REPLACE FUNCTION enforce_aut02_project_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid_lineage boolean;
BEGIN
  IF TG_TABLE_NAME='work_item_delivery_candidates' THEN
    SELECT EXISTS(
      SELECT 1 FROM work_items w
      JOIN modules m ON m.id=NEW.module_id AND m.project_id=w.project_id
      JOIN module_revisions mr ON mr.id=NEW.module_revision_id AND mr.project_id=w.project_id
      JOIN module_rounds r ON r.id=NEW.module_round_id AND r.module_id=m.id AND r.revision_id=mr.id
      JOIN module_plan_revisions pr ON pr.id=NEW.module_plan_revision_id AND pr.project_id=w.project_id AND pr.module_id=m.id AND pr.module_revision_id=mr.id
      JOIN deliveries d ON d.id=NEW.delivery_id AND d.project_id=w.project_id AND d.work_item_id=w.id AND d.revision_id=mr.id
      JOIN worktrees t ON t.id=NEW.worktree_id AND t.project_id=w.project_id AND t.work_item_id=w.id AND t.id=d.worktree_id
      WHERE w.id=NEW.work_item_id AND w.project_id=NEW.project_id AND w.module_id=m.id AND w.revision_id=mr.id AND w.round_id=r.id
        AND (NEW.job_id IS NULL OR EXISTS(SELECT 1 FROM jobs j WHERE j.id=NEW.job_id AND j.project_id=NEW.project_id AND j.delivery_id=d.id))
        AND (NEW.producer_execution_id IS NULL OR EXISTS(SELECT 1 FROM agent_execution e WHERE e.id=NEW.producer_execution_id AND e.project_id::text=NEW.project_id AND (NEW.job_id IS NULL OR e.job_id=NEW.job_id)))
        AND (NEW.qa_matrix_id IS NULL OR EXISTS(SELECT 1 FROM qa_matrices q WHERE q.id=NEW.qa_matrix_id AND q.project_id::text=NEW.project_id AND q.delivery_id=d.id))
        AND (NEW.source_operation_id IS NULL OR EXISTS(SELECT 1 FROM operations o WHERE o.id=NEW.source_operation_id AND o.project_id=NEW.project_id))
        AND (NEW.source_event_id IS NULL OR EXISTS(SELECT 1 FROM events e WHERE e.id=NEW.source_event_id AND e.project_id=NEW.project_id))
    ) INTO valid_lineage;
  ELSIF TG_TABLE_NAME='delivery_qa_reports' THEN
    SELECT EXISTS(SELECT 1 FROM work_item_delivery_candidates d WHERE d.id=NEW.delivery_candidate_id AND d.project_id=NEW.project_id AND d.head_sha=NEW.head_sha AND d.qa_matrix_hash=NEW.qa_matrix_hash) INTO valid_lineage;
  ELSIF TG_TABLE_NAME='assurance_integration_intents' THEN
    SELECT
      (NEW.delivery_candidate_id IS NULL OR EXISTS(SELECT 1 FROM work_item_delivery_candidates d WHERE d.id=NEW.delivery_candidate_id AND d.project_id=NEW.project_id)) AND
      (NEW.work_item_id IS NULL OR EXISTS(SELECT 1 FROM work_items w WHERE w.id=NEW.work_item_id AND w.project_id=NEW.project_id)) AND
      (NEW.module_id IS NULL OR EXISTS(SELECT 1 FROM modules m WHERE m.id=NEW.module_id AND m.project_id=NEW.project_id)) AND
      (NEW.module_revision_id IS NULL OR EXISTS(SELECT 1 FROM module_revisions r WHERE r.id=NEW.module_revision_id AND r.project_id=NEW.project_id)) AND
      (NEW.module_round_id IS NULL OR EXISTS(SELECT 1 FROM module_rounds r JOIN modules m ON m.id=r.module_id WHERE r.id=NEW.module_round_id AND m.project_id=NEW.project_id)) AND
      (NEW.integration_candidate_id IS NULL OR EXISTS(SELECT 1 FROM integration_candidates c WHERE c.id=NEW.integration_candidate_id AND c.project_id=NEW.project_id))
      INTO valid_lineage;
  ELSIF TG_TABLE_NAME='integration_candidates' THEN
    IF NEW.pipeline_version IS NULL THEN RETURN NEW; END IF;
    SELECT EXISTS(SELECT 1 FROM modules m JOIN module_revisions r ON r.id=NEW.module_revision_id AND r.project_id=m.project_id JOIN module_rounds x ON x.id=NEW.module_round_id AND x.module_id=m.id AND x.revision_id=r.id WHERE m.id=NEW.module_id AND m.project_id=NEW.project_id) INTO valid_lineage;
  ELSIF TG_TABLE_NAME='integration_candidate_members' THEN
    SELECT EXISTS(
      SELECT 1 FROM integration_candidates c
      JOIN work_items w ON w.id=NEW.work_item_id AND w.project_id=c.project_id
      JOIN work_item_delivery_candidates d ON d.id=NEW.delivery_candidate_id AND d.project_id=c.project_id AND d.work_item_id=w.id
      JOIN deliveries x ON x.id=NEW.delivery_id AND x.project_id=c.project_id AND x.work_item_id=w.id AND x.id=d.delivery_id
      JOIN delivery_qa_reports q ON q.id=NEW.qa_report_id AND q.project_id=c.project_id AND q.delivery_candidate_id=d.id
      JOIN work_acceptances a ON a.id=NEW.work_acceptance_id AND a.project_id=c.project_id AND a.delivery_candidate_id=d.id
      JOIN assurance_reviews ar ON ar.id=NEW.assurance_review_id AND ar.acceptance_id=a.id
      JOIN review_decisions rd ON rd.id=NEW.review_decision_id AND rd.review_id=ar.id
      JOIN work_item_merge_results mr ON mr.id=NEW.merge_result_id AND mr.project_id=c.project_id AND mr.delivery_candidate_id=d.id AND mr.work_item_id=w.id
      WHERE c.id=NEW.candidate_id AND c.project_id=NEW.project_id
    ) INTO valid_lineage;
  ELSIF TG_TABLE_NAME='work_item_merge_results' THEN
    SELECT EXISTS(SELECT 1 FROM work_item_delivery_candidates d JOIN assurance_integration_intents i ON i.id=NEW.intent_id WHERE d.id=NEW.delivery_candidate_id AND d.project_id=NEW.project_id AND d.work_item_id=NEW.work_item_id AND d.head_sha=NEW.delivery_head_sha AND i.project_id=NEW.project_id AND i.delivery_candidate_id=d.id AND i.work_item_id=d.work_item_id) INTO valid_lineage;
  ELSIF TG_TABLE_NAME='integration_candidate_validation_reports' THEN
    SELECT EXISTS(SELECT 1 FROM integration_candidates c WHERE c.id=NEW.candidate_id AND c.project_id=NEW.project_id AND c.pipeline_version IN ('AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1','AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2')) INTO valid_lineage;
  ELSE
    RETURN NEW;
  END IF;
  IF valid_lineage IS DISTINCT FROM true THEN RAISE EXCEPTION 'AUT02_CROSS_PROJECT_LINEAGE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid='integration_candidate_validation_reports'::regclass
      AND tgname='integration_candidate_validation_reports_project_guard'
      AND NOT tgisinternal
  ) THEN
    CREATE TRIGGER integration_candidate_validation_reports_project_guard
      BEFORE INSERT ON integration_candidate_validation_reports
      FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
  END IF;
END $$;
