-- AUT-02 is additive and applies only to WORK_ITEM_DELIVERY:v2.  Historical
-- Phase 3 candidates, attempts, deliveries and workflows retain their schema
-- and semantics.
CREATE TABLE work_item_delivery_candidates (
  id uuid PRIMARY KEY,
  pipeline_version text NOT NULL CHECK (pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1'),
  policy_version text NOT NULL CHECK (policy_version='AUT-02:v1'),
  project_id text NOT NULL REFERENCES projects(id),
  module_id uuid NOT NULL REFERENCES modules(id),
  module_revision_id uuid NOT NULL REFERENCES module_revisions(id),
  module_round_id uuid NOT NULL REFERENCES module_rounds(id),
  module_plan_revision_id uuid NOT NULL REFERENCES module_plan_revisions(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  work_item_revision_id text NOT NULL CHECK (work_item_revision_id ~ '^[a-f0-9]{64}$'),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  job_id uuid REFERENCES jobs(id),
  producer_execution_id uuid REFERENCES agent_execution(id),
  worktree_id uuid NOT NULL REFERENCES worktrees(id),
  base_sha text NOT NULL,
  head_sha text NOT NULL,
  branch_ref text NOT NULL,
  changed_paths_hash text NOT NULL CHECK (changed_paths_hash ~ '^[a-f0-9]{64}$'),
  patch_hash text NOT NULL CHECK (patch_hash ~ '^[a-f0-9]{64}$'),
  commits jsonb NOT NULL CHECK (jsonb_typeof(commits)='array'),
  output_evidence_refs jsonb NOT NULL CHECK (jsonb_typeof(output_evidence_refs)='array'),
  producer_identity jsonb NOT NULL CHECK (jsonb_typeof(producer_identity)='object'),
  qa_matrix_id uuid REFERENCES qa_matrices(id),
  qa_matrix jsonb NOT NULL CHECK (jsonb_typeof(qa_matrix) IN ('array','object')),
  qa_matrix_hash text NOT NULL CHECK (qa_matrix_hash ~ '^[a-f0-9]{64}$'),
  acceptance_criteria jsonb NOT NULL CHECK (jsonb_typeof(acceptance_criteria)='array'),
  acceptance_criteria_hash text NOT NULL CHECK (acceptance_criteria_hash ~ '^[a-f0-9]{64}$'),
  source_operation_id uuid REFERENCES operations(id),
  source_event_id bigint REFERENCES events(id),
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  snapshot_hash text NOT NULL CHECK (snapshot_hash ~ '^[a-f0-9]{64}$'),
  lineage jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(lineage)='object'),
  state text NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(delivery_id,head_sha,pipeline_version),
  UNIQUE(id,project_id),
  UNIQUE(id,work_item_id)
);
CREATE INDEX work_item_delivery_candidates_item_time ON work_item_delivery_candidates(work_item_id,created_at DESC,id DESC);

CREATE TABLE delivery_qa_reports (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  delivery_candidate_id uuid NOT NULL UNIQUE REFERENCES work_item_delivery_candidates(id),
  policy_version text NOT NULL CHECK (policy_version='DELIVERY_QA_POLICY:v1'),
  executor_version text NOT NULL,
  environment_version text NOT NULL,
  head_sha text NOT NULL,
  qa_matrix_hash text NOT NULL CHECK (qa_matrix_hash ~ '^[a-f0-9]{64}$'),
  result text NOT NULL CHECK (result IN ('PASS','FAIL')),
  report jsonb NOT NULL CHECK (jsonb_typeof(report)='object'),
  report_hash text NOT NULL CHECK (report_hash ~ '^[a-f0-9]{64}$'),
  evidence_refs jsonb NOT NULL CHECK (jsonb_typeof(evidence_refs)='array'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(id,project_id)
);

CREATE TABLE assurance_integration_intents (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  destination text NOT NULL CHECK (destination IN ('DELIVERY_QA','ASSURANCE','GIT_PHASE','INTEGRATION_CANDIDATE','GIT_INTEGRATION','AUT01','LR02')),
  kind text NOT NULL CHECK (kind IN ('RUN_DELIVERY_QA','START_INDEPENDENT_REVIEW','MERGE_WORK_ITEM','REASSESS_INTEGRATION_CANDIDATE','VALIDATE_INTEGRATION_CANDIDATE','INTEGRATE_CANDIDATE','SCHEDULE_REWORK','MACRO_REEVALUATE')),
  delivery_candidate_id uuid REFERENCES work_item_delivery_candidates(id),
  work_item_id uuid REFERENCES work_items(id),
  module_id uuid REFERENCES modules(id),
  module_revision_id uuid REFERENCES module_revisions(id),
  module_round_id uuid REFERENCES module_rounds(id),
  integration_candidate_id uuid REFERENCES integration_candidates(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload)='object'),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(evidence_refs)='array'),
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','LEASED','COMPLETED','FAILED','SUPERSEDED')),
  effect_state text NOT NULL DEFAULT 'NO_EFFECT' CHECK (effect_state IN ('NO_EFFECT','PRE_EFFECT','EFFECT_UNKNOWN','EFFECT_RECORDED')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts>=0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  execution_generation bigint NOT NULL DEFAULT 0 CHECK (execution_generation>=0),
  operation_id uuid REFERENCES operations(id),
  recovery_decision_id uuid REFERENCES recovery_decisions(id),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CHECK ((status='LEASED')=(lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL))
);
CREATE INDEX assurance_integration_intents_claim ON assurance_integration_intents(available_at,created_at,id) WHERE status IN ('PENDING','FAILED','LEASED');
CREATE INDEX assurance_integration_intents_candidate ON assurance_integration_intents(integration_candidate_id,created_at DESC) WHERE integration_candidate_id IS NOT NULL;

CREATE TABLE work_item_merge_results (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  delivery_candidate_id uuid NOT NULL UNIQUE REFERENCES work_item_delivery_candidates(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  intent_id uuid NOT NULL UNIQUE REFERENCES assurance_integration_intents(id),
  target_ref text NOT NULL,
  phase_before_sha text NOT NULL,
  delivery_head_sha text NOT NULL,
  phase_after_sha text,
  expected_parents jsonb NOT NULL CHECK (jsonb_typeof(expected_parents)='array'),
  observed_parents jsonb CHECK (observed_parents IS NULL OR jsonb_typeof(observed_parents)='array'),
  state text NOT NULL CHECK (state IN ('PRE_EFFECT','EFFECT_UNKNOWN','NOT_APPLIED','MERGE_RECORDED','DIVERGED')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(evidence)='object'),
  evidence_hash text CHECK (evidence_hash IS NULL OR evidence_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  recorded_at timestamptz,
  UNIQUE(id,project_id)
);

ALTER TABLE work_acceptances ADD COLUMN delivery_candidate_id uuid REFERENCES work_item_delivery_candidates(id);
CREATE UNIQUE INDEX work_acceptances_delivery_candidate_unique ON work_acceptances(delivery_candidate_id) WHERE delivery_candidate_id IS NOT NULL;

ALTER TABLE integration_candidates
  ADD COLUMN pipeline_version text,
  ADD COLUMN policy_version text,
  ADD COLUMN module_id uuid REFERENCES modules(id),
  ADD COLUMN module_revision_id uuid REFERENCES module_revisions(id),
  ADD COLUMN module_round_id uuid REFERENCES module_rounds(id),
  ADD COLUMN generation integer,
  ADD COLUMN manifest_hash text,
  ADD COLUMN idempotency_key text,
  ADD COLUMN correlation_id uuid,
  ADD COLUMN validation_report_id uuid,
  ADD COLUMN superseded_reason text;
-- The Phase 3 identity is retained for legacy candidates only.  AUT-02 uses
-- revision + round + immutable manifest hash and may legitimately preserve
-- more than one historical generation at the same phase SHA.
ALTER TABLE integration_candidates DROP CONSTRAINT integration_candidates_project_id_phase_sha_key;
CREATE UNIQUE INDEX integration_candidates_legacy_project_phase ON integration_candidates(project_id,phase_sha) WHERE pipeline_version IS NULL;
ALTER TABLE integration_candidates ADD CONSTRAINT integration_candidates_aut02_shape CHECK (
  pipeline_version IS NULL OR (
    pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1' AND
    policy_version='AUT-02:v1' AND module_id IS NOT NULL AND module_revision_id IS NOT NULL AND
    module_round_id IS NOT NULL AND generation>0 AND manifest_hash ~ '^[a-f0-9]{64}$' AND
    idempotency_key IS NOT NULL AND correlation_id IS NOT NULL
  )
);
CREATE UNIQUE INDEX integration_candidates_aut02_identity ON integration_candidates(module_revision_id,module_round_id,manifest_hash) WHERE pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1';
CREATE UNIQUE INDEX integration_candidates_aut02_key ON integration_candidates(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX integration_candidates_aut02_round ON integration_candidates(module_revision_id,module_round_id,generation DESC) WHERE pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1';

CREATE TABLE integration_candidate_members (
  candidate_id uuid NOT NULL REFERENCES integration_candidates(id),
  project_id text NOT NULL REFERENCES projects(id),
  member_index integer NOT NULL CHECK (member_index>=0),
  work_item_id uuid NOT NULL REFERENCES work_items(id),
  work_item_revision_id text NOT NULL CHECK (work_item_revision_id ~ '^[a-f0-9]{64}$'),
  delivery_candidate_id uuid NOT NULL REFERENCES work_item_delivery_candidates(id),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  qa_report_id uuid NOT NULL REFERENCES delivery_qa_reports(id),
  work_acceptance_id uuid NOT NULL REFERENCES work_acceptances(id),
  assurance_review_id uuid NOT NULL REFERENCES assurance_reviews(id),
  review_decision_id uuid NOT NULL REFERENCES review_decisions(id),
  merge_result_id uuid NOT NULL REFERENCES work_item_merge_results(id),
  merged_sha text NOT NULL,
  member_manifest jsonb NOT NULL CHECK (jsonb_typeof(member_manifest)='object'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(candidate_id,work_item_id),
  UNIQUE(candidate_id,member_index),
  UNIQUE(candidate_id,delivery_candidate_id)
);
CREATE INDEX integration_candidate_members_work_item ON integration_candidate_members(work_item_id,candidate_id);

CREATE TABLE integration_candidate_validation_reports (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  candidate_id uuid NOT NULL UNIQUE REFERENCES integration_candidates(id),
  policy_version text NOT NULL CHECK (policy_version='INTEGRATION_CANDIDATE_VALIDATION:v1'),
  result text NOT NULL CHECK (result IN ('PASS','FAIL')),
  report jsonb NOT NULL CHECK (jsonb_typeof(report)='object'),
  report_hash text NOT NULL CHECK (report_hash ~ '^[a-f0-9]{64}$'),
  evidence_refs jsonb NOT NULL CHECK (jsonb_typeof(evidence_refs)='array'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE integration_candidates ADD CONSTRAINT integration_candidates_validation_report_fk FOREIGN KEY(validation_report_id) REFERENCES integration_candidate_validation_reports(id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE integration_attempts
  ADD COLUMN intent_id uuid REFERENCES assurance_integration_intents(id),
  ADD COLUMN expected_parents jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN execution_claim_id uuid,
  ADD COLUMN execution_generation bigint NOT NULL DEFAULT 0,
  ADD COLUMN execution_lease_expires_at timestamptz;
CREATE UNIQUE INDEX integration_attempts_aut02_candidate ON integration_attempts(candidate_id) WHERE intent_id IS NOT NULL;
CREATE UNIQUE INDEX integration_attempts_execution_claim ON integration_attempts(execution_claim_id) WHERE execution_claim_id IS NOT NULL;

ALTER TABLE recovery_decisions ADD COLUMN assurance_integration_intent_id uuid REFERENCES assurance_integration_intents(id);
CREATE INDEX recovery_decisions_assurance_intent ON recovery_decisions(assurance_integration_intent_id) WHERE assurance_integration_intent_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_aut02_immutable_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AUT02_IMMUTABLE_RECORD' USING ERRCODE='23514'; END IF;
  IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN RAISE EXCEPTION 'AUT02_IMMUTABLE_RECORD' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER work_item_delivery_candidates_immutable BEFORE UPDATE OR DELETE ON work_item_delivery_candidates FOR EACH ROW EXECUTE FUNCTION prevent_aut02_immutable_update();
CREATE TRIGGER delivery_qa_reports_immutable BEFORE UPDATE OR DELETE ON delivery_qa_reports FOR EACH ROW EXECUTE FUNCTION prevent_aut02_immutable_update();
CREATE TRIGGER integration_candidate_members_immutable BEFORE UPDATE OR DELETE ON integration_candidate_members FOR EACH ROW EXECUTE FUNCTION prevent_aut02_immutable_update();
CREATE TRIGGER integration_candidate_validation_reports_immutable BEFORE UPDATE OR DELETE ON integration_candidate_validation_reports FOR EACH ROW EXECUTE FUNCTION prevent_aut02_immutable_update();

CREATE OR REPLACE FUNCTION prevent_delivery_candidate_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'AUT02_IMMUTABLE_RECORD' USING ERRCODE='23514'; END IF;
  IF NEW.state='SUPERSEDED' AND OLD.state='ACTIVE' THEN
    NEW.created_at:=OLD.created_at;
    IF (to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') THEN RAISE EXCEPTION 'AUT02_DELIVERY_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514'; END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.*) IS DISTINCT FROM ROW(OLD.*) THEN RAISE EXCEPTION 'AUT02_DELIVERY_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER work_item_delivery_candidates_immutable ON work_item_delivery_candidates;
CREATE TRIGGER work_item_delivery_candidates_immutable BEFORE UPDATE OR DELETE ON work_item_delivery_candidates FOR EACH ROW EXECUTE FUNCTION prevent_delivery_candidate_snapshot_mutation();

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
    SELECT EXISTS(SELECT 1 FROM integration_candidates c WHERE c.id=NEW.candidate_id AND c.project_id=NEW.project_id AND c.pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1') INTO valid_lineage;
  ELSE
    RETURN NEW;
  END IF;
  IF valid_lineage IS DISTINCT FROM true THEN RAISE EXCEPTION 'AUT02_CROSS_PROJECT_LINEAGE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER work_item_delivery_candidates_project_guard BEFORE INSERT ON work_item_delivery_candidates FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER delivery_qa_reports_project_guard BEFORE INSERT ON delivery_qa_reports FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER assurance_integration_intents_project_guard BEFORE INSERT ON assurance_integration_intents FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER integration_candidates_project_guard BEFORE INSERT ON integration_candidates FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER integration_candidate_members_project_guard BEFORE INSERT ON integration_candidate_members FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER work_item_merge_results_project_guard BEFORE INSERT ON work_item_merge_results FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();
CREATE TRIGGER integration_candidate_validation_reports_project_guard BEFORE INSERT ON integration_candidate_validation_reports FOR EACH ROW EXECUTE FUNCTION enforce_aut02_project_lineage();

CREATE OR REPLACE FUNCTION prevent_aut02_candidate_manifest_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.pipeline_version='AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1' AND (
    NEW.manifest IS DISTINCT FROM OLD.manifest OR NEW.manifest_hash IS DISTINCT FROM OLD.manifest_hash OR
    NEW.module_id IS DISTINCT FROM OLD.module_id OR NEW.module_revision_id IS DISTINCT FROM OLD.module_revision_id OR
    NEW.module_round_id IS DISTINCT FROM OLD.module_round_id OR NEW.generation IS DISTINCT FROM OLD.generation OR
    NEW.phase_sha IS DISTINCT FROM OLD.phase_sha OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
  ) THEN RAISE EXCEPTION 'AUT02_CANDIDATE_MANIFEST_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER integration_candidates_aut02_manifest_immutable BEFORE UPDATE ON integration_candidates FOR EACH ROW EXECUTE FUNCTION prevent_aut02_candidate_manifest_mutation();
