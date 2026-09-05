-- AUT-03 / ASSURANCE_EXPANSION_TO_REAL_WORK:v1.
-- This is deliberately additive: F4/F5/F6 records retain their historical
-- policy interpretation and never receive a synthetic dispatch snapshot.

ALTER TABLE assurance_policies ADD COLUMN IF NOT EXISTS policy_hash text;
ALTER TABLE assurance_policies ADD CONSTRAINT assurance_policies_hash_shape
  CHECK (policy_hash IS NULL OR policy_hash ~ '^[a-f0-9]{64}$');

CREATE TABLE assurance_dispatch_snapshots (
  id uuid PRIMARY KEY,
  schema_version text NOT NULL CHECK (schema_version='AssuranceDispatchSnapshot:v1'),
  assurance_dispatch_key text NOT NULL UNIQUE,
  policy_id uuid,
  policy_version integer,
  policy_hash text,
  selection_result text NOT NULL CHECK (selection_result IN ('SELECTED','NOT_SELECTED')),
  subject_kind text NOT NULL CHECK (subject_kind IN ('ModulePlanProposal:v1','WorkItemDeliveryCandidate:v1','DeliveryPackage:v1')),
  subject_id text NOT NULL,
  normative_generation text NOT NULL,
  producer_execution_id uuid REFERENCES agent_execution(id),
  job_id uuid NOT NULL REFERENCES jobs(id),
  operation_id uuid NOT NULL REFERENCES operations(id),
  correlation_id uuid NOT NULL,
  project_id text NOT NULL REFERENCES projects(id),
  module_id uuid REFERENCES modules(id),
  work_item_id uuid REFERENCES work_items(id),
  module_plan_revision_id uuid REFERENCES module_plan_revisions(id),
  plan_work_item_id text,
  classification text NOT NULL CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  lineage_fingerprint text NOT NULL CHECK (lineage_fingerprint ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((selection_result='NOT_SELECTED' AND policy_id IS NULL AND policy_version IS NULL AND policy_hash IS NULL) OR
         (selection_result='SELECTED' AND policy_id IS NOT NULL AND policy_version IS NOT NULL AND policy_hash ~ '^[a-f0-9]{64}$')),
  FOREIGN KEY (policy_id,policy_version) REFERENCES assurance_policies(id,version)
);
CREATE UNIQUE INDEX assurance_dispatch_snapshot_job ON assurance_dispatch_snapshots(job_id);
CREATE INDEX assurance_dispatch_snapshot_subject ON assurance_dispatch_snapshots(subject_kind,subject_id,normative_generation);

ALTER TABLE work_acceptances ADD COLUMN IF NOT EXISTS assurance_dispatch_snapshot_id uuid REFERENCES assurance_dispatch_snapshots(id);
ALTER TABLE work_acceptances ADD COLUMN IF NOT EXISTS acceptance_key text;
CREATE UNIQUE INDEX work_acceptances_acceptance_key ON work_acceptances(acceptance_key) WHERE acceptance_key IS NOT NULL;
CREATE UNIQUE INDEX work_acceptances_dispatch_snapshot ON work_acceptances(assurance_dispatch_snapshot_id) WHERE assurance_dispatch_snapshot_id IS NOT NULL;

CREATE OR REPLACE FUNCTION prevent_assurance_expansion_snapshot_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    NEW.assurance_dispatch_key IS DISTINCT FROM OLD.assurance_dispatch_key OR
    NEW.policy_id IS DISTINCT FROM OLD.policy_id OR NEW.policy_version IS DISTINCT FROM OLD.policy_version OR
    NEW.policy_hash IS DISTINCT FROM OLD.policy_hash OR NEW.selection_result IS DISTINCT FROM OLD.selection_result OR
    NEW.subject_kind IS DISTINCT FROM OLD.subject_kind OR NEW.subject_id IS DISTINCT FROM OLD.subject_id OR
    NEW.normative_generation IS DISTINCT FROM OLD.normative_generation OR NEW.producer_execution_id IS DISTINCT FROM OLD.producer_execution_id OR
    NEW.job_id IS DISTINCT FROM OLD.job_id OR NEW.operation_id IS DISTINCT FROM OLD.operation_id OR
    NEW.correlation_id IS DISTINCT FROM OLD.correlation_id OR NEW.project_id IS DISTINCT FROM OLD.project_id OR
    NEW.module_id IS DISTINCT FROM OLD.module_id OR NEW.work_item_id IS DISTINCT FROM OLD.work_item_id OR
    NEW.module_plan_revision_id IS DISTINCT FROM OLD.module_plan_revision_id OR NEW.plan_work_item_id IS DISTINCT FROM OLD.plan_work_item_id OR
    NEW.classification IS DISTINCT FROM OLD.classification OR NEW.lineage_fingerprint IS DISTINCT FROM OLD.lineage_fingerprint
  ) THEN RAISE EXCEPTION 'ASSURANCE_DISPATCH_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assurance_dispatch_snapshot_immutable BEFORE UPDATE ON assurance_dispatch_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_assurance_expansion_snapshot_mutation();

CREATE OR REPLACE FUNCTION prevent_assurance_policy_expansion_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.policy_hash IS NOT NULL AND (
    NEW.name IS DISTINCT FROM OLD.name OR NEW.version IS DISTINCT FROM OLD.version OR
    NEW.selectors IS DISTINCT FROM OLD.selectors OR NEW.configuration IS DISTINCT FROM OLD.configuration OR
    NEW.policy_hash IS DISTINCT FROM OLD.policy_hash
  ) THEN RAISE EXCEPTION 'ASSURANCE_POLICY_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assurance_policy_expansion_immutable BEFORE UPDATE ON assurance_policies
FOR EACH ROW EXECUTE FUNCTION prevent_assurance_policy_expansion_mutation();
