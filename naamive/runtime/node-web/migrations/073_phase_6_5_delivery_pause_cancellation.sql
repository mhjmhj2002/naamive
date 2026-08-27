-- GAT-02 / DELIVERY_PAUSE_CANCELLATION:v1.  This migration is additive: it
-- deliberately does not reinterpret archived or historical instances.

CREATE TABLE delivery_preparation_snapshots (
  id uuid PRIMARY KEY,
  schema_version text NOT NULL DEFAULT 'DeliveryPreparationSnapshot:v1' CHECK(schema_version='DeliveryPreparationSnapshot:v1'),
  preparation_key text NOT NULL UNIQUE,
  project_id text NOT NULL REFERENCES projects(id),
  delivery_revision integer NOT NULL CHECK(delivery_revision>0),
  normative_generation text NOT NULL CHECK(normative_generation ~ '^[a-f0-9]{64}$'),
  workflow_code text NOT NULL, workflow_version integer NOT NULL,
  product_commitment_revision_id uuid NOT NULL REFERENCES product_commitment_revisions(id),
  effective_required_module_set_hash text NOT NULL CHECK(effective_required_module_set_hash ~ '^[a-f0-9]{64}$'),
  committed_module_set jsonb NOT NULL CHECK(jsonb_typeof(committed_module_set)='array'),
  participants jsonb NOT NULL CHECK(jsonb_typeof(participants)='array'),
  artifact_input_references jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(artifact_input_references)='array'),
  validation_integration_lineage jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(validation_integration_lineage)='array'),
  policy_id text NOT NULL, policy_version text NOT NULL, policy_hash text NOT NULL CHECK(policy_hash ~ '^[a-f0-9]{64}$'),
  input_hash text NOT NULL CHECK(input_hash ~ '^[a-f0-9]{64}$'),
  source_operation_id uuid REFERENCES operations(id), correlation_id uuid NOT NULL,
  stale_at timestamptz, stale_reason text, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(project_id,delivery_revision,normative_generation)
);

CREATE TABLE delivery_preparation_outputs (
  id uuid PRIMARY KEY,
  preparation_snapshot_id uuid NOT NULL UNIQUE REFERENCES delivery_preparation_snapshots(id),
  output_hash text NOT NULL CHECK(output_hash ~ '^[a-f0-9]{64}$'),
  release_evidence jsonb NOT NULL CHECK(jsonb_typeof(release_evidence)='array'),
  operation_evidence jsonb NOT NULL CHECK(jsonb_typeof(operation_evidence)='array'),
  handover_evidence jsonb NOT NULL CHECK(jsonb_typeof(handover_evidence)='array'),
  artifact_references jsonb NOT NULL CHECK(jsonb_typeof(artifact_references)='array'),
  finding jsonb, persisted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION guard_gat02_preparation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['stale_at','stale_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['stale_at','stale_reason']) THEN
    RAISE EXCEPTION 'DELIVERY_PREPARATION_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER delivery_preparation_snapshot_immutable BEFORE UPDATE ON delivery_preparation_snapshots FOR EACH ROW EXECUTE FUNCTION guard_gat02_preparation_immutable();
CREATE OR REPLACE FUNCTION guard_gat02_outputs_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'DELIVERY_PREPARATION_OUTPUTS_IMMUTABLE' USING ERRCODE='23514'; END $$;
CREATE TRIGGER delivery_preparation_outputs_immutable BEFORE UPDATE OR DELETE ON delivery_preparation_outputs FOR EACH ROW EXECUTE FUNCTION guard_gat02_outputs_immutable();

CREATE TABLE delivery_packages (
  id uuid PRIMARY KEY,
  schema_version text NOT NULL DEFAULT 'DeliveryPackage:v1' CHECK(schema_version='DeliveryPackage:v1'),
  delivery_package_key text NOT NULL UNIQUE,
  project_id text NOT NULL REFERENCES projects(id), delivery_revision integer NOT NULL CHECK(delivery_revision>0),
  normative_generation text NOT NULL CHECK(normative_generation ~ '^[a-f0-9]{64}$'),
  preparation_snapshot_id uuid NOT NULL UNIQUE REFERENCES delivery_preparation_snapshots(id),
  workflow_code text NOT NULL, workflow_version integer NOT NULL,
  product_commitment_revision_id uuid NOT NULL REFERENCES product_commitment_revisions(id),
  effective_required_module_set_hash text NOT NULL CHECK(effective_required_module_set_hash ~ '^[a-f0-9]{64}$'),
  committed_module_set jsonb NOT NULL CHECK(jsonb_typeof(committed_module_set)='array'), participants jsonb NOT NULL CHECK(jsonb_typeof(participants)='array'),
  final_artifacts jsonb NOT NULL CHECK(jsonb_typeof(final_artifacts)='array'), release_evidence jsonb NOT NULL CHECK(jsonb_typeof(release_evidence)='array'),
  operation_evidence jsonb NOT NULL CHECK(jsonb_typeof(operation_evidence)='array'), handover_evidence jsonb NOT NULL CHECK(jsonb_typeof(handover_evidence)='array'),
  policy_id text NOT NULL, policy_version text NOT NULL, policy_hash text NOT NULL CHECK(policy_hash ~ '^[a-f0-9]{64}$'),
  output_hash text NOT NULL CHECK(output_hash ~ '^[a-f0-9]{64}$'), content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  lineage jsonb NOT NULL CHECK(jsonb_typeof(lineage)='object'), source_operation_id uuid REFERENCES operations(id), correlation_id uuid NOT NULL,
  stale_at timestamptz, stale_reason text, delivered_at timestamptz, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(project_id,delivery_revision)
);

CREATE TABLE delivery_technical_acceptances (
  id uuid PRIMARY KEY,
  package_id uuid NOT NULL UNIQUE REFERENCES delivery_packages(id), content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
  delivery_revision integer NOT NULL, normative_generation text NOT NULL CHECK(normative_generation ~ '^[a-f0-9]{64}$'),
  assurance_dispatch_snapshot_id uuid UNIQUE REFERENCES assurance_dispatch_snapshots(id),
  work_acceptance_id uuid UNIQUE REFERENCES work_acceptances(id), state text NOT NULL CHECK(state IN ('ACCEPTED','STALE','CANCELLED')),
  acceptance_key text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK((assurance_dispatch_snapshot_id IS NULL)=(work_acceptance_id IS NULL))
);

CREATE TABLE pause_records (
  id uuid PRIMARY KEY, schema_version text NOT NULL DEFAULT 'PauseRecord:v1' CHECK(schema_version='PauseRecord:v1'),
  resource_kind text NOT NULL CHECK(resource_kind IN ('PROJECT','MODULE')), resource_id text NOT NULL, project_id text NOT NULL REFERENCES projects(id),
  previous_active_state text NOT NULL, workflow_code text NOT NULL, workflow_version integer NOT NULL, normative_generation text NOT NULL,
  reason text NOT NULL, evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='object'), actor_id text NOT NULL, authority_role text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0), idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','RESUMED','SUPERSEDED')), pause_fence bigint NOT NULL CHECK(pause_fence>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX pause_records_one_active_resource ON pause_records(resource_kind,resource_id) WHERE status='ACTIVE';
CREATE INDEX pause_records_project_active ON pause_records(project_id,status);

CREATE TABLE resume_records (
  id uuid PRIMARY KEY, schema_version text NOT NULL DEFAULT 'ResumeRecord:v1' CHECK(schema_version='ResumeRecord:v1'),
  pause_id uuid NOT NULL REFERENCES pause_records(id), expected_pause_version integer NOT NULL, actor_id text NOT NULL, authority_role text NOT NULL,
  impediment_removed_evidence jsonb NOT NULL CHECK(jsonb_typeof(impediment_removed_evidence)='object'), idempotency_key text NOT NULL UNIQUE,
  result text NOT NULL CHECK(result IN ('RESTORED','RESUME_RECONCILIATION_REQUIRED','REJECTED')), resolved_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE cancellation_records (
  id uuid PRIMARY KEY, schema_version text NOT NULL DEFAULT 'CancellationRecord:v1' CHECK(schema_version='CancellationRecord:v1'),
  resource_kind text NOT NULL CHECK(resource_kind IN ('PROJECT','MODULE')), resource_id text NOT NULL, project_id text NOT NULL REFERENCES projects(id),
  reason text NOT NULL, evidence jsonb NOT NULL CHECK(jsonb_typeof(evidence)='object'), actor_id text NOT NULL, authority_role text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK(version>0), idempotency_key text NOT NULL UNIQUE, status text NOT NULL DEFAULT 'TERMINAL' CHECK(status='TERMINAL'),
  cancellation_fence bigint NOT NULL CHECK(cancellation_fence>0), parent_cancellation_id uuid REFERENCES cancellation_records(id), obligation_resolution jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(resource_kind,resource_id)
);

-- LR-02's original gate-only resolution field remains authoritative for its
-- historical path.  GAT-02 adds the separately audited business cancellation
-- resolution without rewriting a commitment snapshot.
ALTER TABLE committed_module_obligations ADD COLUMN cancellation_resolution_id uuid REFERENCES cancellation_records(id);
DO $$ DECLARE constraint_name text; BEGIN
  SELECT conname INTO constraint_name FROM pg_constraint
  WHERE conrelid='committed_module_obligations'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%required OR resolved_by_gate_decision_id%';
  IF constraint_name IS NOT NULL THEN EXECUTE format('ALTER TABLE committed_module_obligations DROP CONSTRAINT %I',constraint_name); END IF;
END $$;
-- The GAT-02 command verifies and records obligation_resolution atomically.
-- It cannot use LR-02's gate-only FK because cancellation is not a gate.

CREATE TABLE external_effect_records (
  id uuid PRIMARY KEY, schema_version text NOT NULL DEFAULT 'ExternalEffectRecord:v1' CHECK(schema_version='ExternalEffectRecord:v1'),
  project_id text NOT NULL REFERENCES projects(id), resource_kind text NOT NULL CHECK(resource_kind IN ('PROJECT','MODULE')), resource_id text NOT NULL,
  effect_key text NOT NULL UNIQUE, target jsonb NOT NULL CHECK(jsonb_typeof(target)='object'), fingerprint text NOT NULL CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
  status text NOT NULL CHECK(status IN ('NOT_STARTED','IN_FLIGHT','EFFECT_UNKNOWN','RECONCILE_REQUIRED','RECONCILED')),
  pause_fence bigint NOT NULL DEFAULT 0, cancellation_fence bigint NOT NULL DEFAULT 0, attempt integer NOT NULL DEFAULT 0 CHECK(attempt>=0),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(evidence)='object'), created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE delivery_lifecycle_intents (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), kind text NOT NULL CHECK(kind IN ('PREPARE_DELIVERY_PACKAGE','ASSURE_DELIVERY_PACKAGE','OPEN_DELIVERY_GATE','RESUME_RECONCILIATION')),
  subject_kind text NOT NULL, subject_id text NOT NULL, idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'), status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETED','SUPERSEDED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), completed_at timestamptz
);

CREATE OR REPLACE FUNCTION guard_gat02_immutable_manifest() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (to_jsonb(NEW)-ARRAY['stale_at','stale_reason','delivered_at']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['stale_at','stale_reason','delivered_at']) THEN
    RAISE EXCEPTION 'DELIVERY_PACKAGE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER delivery_package_immutable BEFORE UPDATE ON delivery_packages FOR EACH ROW EXECUTE FUNCTION guard_gat02_immutable_manifest();
