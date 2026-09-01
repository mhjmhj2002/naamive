-- LR-02A: canonical, immutable Product Commitment snapshots. This migration is
-- additive. Historical `gates` rows and already materialized modules are not
-- interpreted or backfilled.

ALTER TABLE intake_revisions ADD CONSTRAINT intake_revisions_id_project_unique UNIQUE(id,project_id);
ALTER TABLE artifacts ADD CONSTRAINT artifacts_id_project_unique UNIQUE(id,project_id);
ALTER TABLE gate_records ADD CONSTRAINT gate_records_id_project_unique UNIQUE(id,project_id);
ALTER TABLE modules ADD CONSTRAINT modules_id_project_key_unique UNIQUE(id,project_id,module_key);
ALTER TABLE module_revisions ADD CONSTRAINT module_revisions_id_project_key_unique UNIQUE(id,project_id,module_key);
ALTER TABLE operations ADD CONSTRAINT operations_id_project_unique UNIQUE(id,project_id);

CREATE TABLE product_commitment_revisions (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  revision_number bigint NOT NULL CHECK(revision_number > 0),
  logical_round bigint NOT NULL CHECK(logical_round > 0),
  contract_version text NOT NULL CHECK(contract_version='PRODUCT_COMMITMENT_MODULES:v1'),
  status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','SUPERSEDED')),
  source_intake_revision_id uuid NOT NULL,
  source_requirements_artifact_id uuid NOT NULL,
  source_requirements_sha256 text NOT NULL CHECK(source_requirements_sha256 ~ '^[a-f0-9]{64}$'),
  source_review_artifact_id uuid NOT NULL,
  source_review_sha256 text NOT NULL CHECK(source_review_sha256 ~ '^[a-f0-9]{64}$'),
  canonical_sha256 text NOT NULL CHECK(canonical_sha256 ~ '^[a-f0-9]{64}$'),
  supersedes_revision_id uuid,
  gate_record_id uuid,
  creation_idempotency_key text NOT NULL CHECK(length(btrim(creation_idempotency_key)) > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  approved_at timestamptz,
  created_by text NOT NULL CHECK(length(btrim(created_by)) > 0),
  UNIQUE(project_id,revision_number),
  UNIQUE(project_id,logical_round),
  UNIQUE(project_id,creation_idempotency_key),
  UNIQUE(id,project_id),
  UNIQUE(gate_record_id),
  CHECK(supersedes_revision_id IS NULL OR supersedes_revision_id<>id),
  CHECK((status='APPROVED' AND approved_at IS NOT NULL) OR (status<>'APPROVED' AND approved_at IS NULL)),
  FOREIGN KEY(source_intake_revision_id,project_id) REFERENCES intake_revisions(id,project_id),
  FOREIGN KEY(source_requirements_artifact_id,project_id) REFERENCES artifacts(id,project_id),
  FOREIGN KEY(source_review_artifact_id,project_id) REFERENCES artifacts(id,project_id),
  FOREIGN KEY(supersedes_revision_id,project_id) REFERENCES product_commitment_revisions(id,project_id),
  FOREIGN KEY(gate_record_id,project_id) REFERENCES gate_records(id,project_id) DEFERRABLE INITIALLY DEFERRED
);
CREATE UNIQUE INDEX product_commitment_one_approved_per_project
  ON product_commitment_revisions(project_id) WHERE status='APPROVED';
CREATE INDEX product_commitment_revisions_project_created
  ON product_commitment_revisions(project_id,revision_number DESC);

CREATE TABLE product_commitment_modules (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  product_commitment_revision_id uuid NOT NULL,
  module_key text NOT NULL CHECK(module_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  ordinal integer NOT NULL CHECK(ordinal > 0),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  source_evidence jsonb NOT NULL CHECK(jsonb_typeof(source_evidence)='object'),
  UNIQUE(product_commitment_revision_id,module_key),
  UNIQUE(product_commitment_revision_id,ordinal),
  UNIQUE(id,project_id,product_commitment_revision_id,module_key),
  FOREIGN KEY(product_commitment_revision_id,project_id)
    REFERENCES product_commitment_revisions(id,project_id) ON DELETE RESTRICT
);

CREATE TABLE product_commitment_module_materializations (
  product_commitment_module_id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  product_commitment_revision_id uuid NOT NULL,
  module_key text NOT NULL,
  module_id uuid NOT NULL,
  module_revision_id uuid NOT NULL,
  materialization_operation_id uuid NOT NULL,
  materialized_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(project_id,product_commitment_revision_id,module_key),
  FOREIGN KEY(product_commitment_module_id,project_id,product_commitment_revision_id,module_key)
    REFERENCES product_commitment_modules(id,project_id,product_commitment_revision_id,module_key),
  FOREIGN KEY(product_commitment_revision_id,project_id)
    REFERENCES product_commitment_revisions(id,project_id),
  FOREIGN KEY(module_id,project_id,module_key)
    REFERENCES modules(id,project_id,module_key),
  FOREIGN KEY(module_revision_id,project_id,module_key)
    REFERENCES module_revisions(id,project_id,module_key),
  FOREIGN KEY(materialization_operation_id,project_id)
    REFERENCES operations(id,project_id)
);

CREATE OR REPLACE FUNCTION validate_product_commitment_source_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE requirements_type text; requirements_hash text; review_type text; review_hash text;
BEGIN
  SELECT artifact_type,sha256 INTO requirements_type,requirements_hash
  FROM artifacts WHERE id=NEW.source_requirements_artifact_id AND project_id=NEW.project_id;
  SELECT artifact_type,sha256 INTO review_type,review_hash
  FROM artifacts WHERE id=NEW.source_review_artifact_id AND project_id=NEW.project_id;
  IF requirements_type IS DISTINCT FROM 'product-requirements'
    OR requirements_hash IS DISTINCT FROM NEW.source_requirements_sha256
    OR review_type IS DISTINCT FROM 'product-commitment-review'
    OR review_hash IS DISTINCT FROM NEW.source_review_sha256 THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_SOURCE_LINEAGE_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_source_lineage_guard
BEFORE INSERT OR UPDATE OF project_id,source_requirements_artifact_id,source_requirements_sha256,source_review_artifact_id,source_review_sha256
ON product_commitment_revisions FOR EACH ROW EXECUTE FUNCTION validate_product_commitment_source_lineage();

CREATE OR REPLACE FUNCTION guard_product_commitment_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.project_id IS DISTINCT FROM NEW.project_id
    OR OLD.revision_number IS DISTINCT FROM NEW.revision_number
    OR OLD.logical_round IS DISTINCT FROM NEW.logical_round
    OR OLD.contract_version IS DISTINCT FROM NEW.contract_version
    OR OLD.source_intake_revision_id IS DISTINCT FROM NEW.source_intake_revision_id
    OR OLD.source_requirements_artifact_id IS DISTINCT FROM NEW.source_requirements_artifact_id
    OR OLD.source_requirements_sha256 IS DISTINCT FROM NEW.source_requirements_sha256
    OR OLD.source_review_artifact_id IS DISTINCT FROM NEW.source_review_artifact_id
    OR OLD.source_review_sha256 IS DISTINCT FROM NEW.source_review_sha256
    OR OLD.canonical_sha256 IS DISTINCT FROM NEW.canonical_sha256
    OR OLD.supersedes_revision_id IS DISTINCT FROM NEW.supersedes_revision_id
    OR OLD.creation_idempotency_key IS DISTINCT FROM NEW.creation_idempotency_key
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
    OR OLD.created_by IS DISTINCT FROM NEW.created_by THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_REVISION_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF OLD.status='DRAFT' THEN
    IF NEW.status<>'PENDING_APPROVAL' OR OLD.gate_record_id IS NOT NULL OR NEW.gate_record_id IS NULL OR NEW.approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'PRODUCT_COMMITMENT_TRANSITION_INVALID' USING ERRCODE='23514';
    END IF;
  ELSIF OLD.status='PENDING_APPROVAL' THEN
    IF NEW.status NOT IN ('APPROVED','REJECTED') OR OLD.gate_record_id IS DISTINCT FROM NEW.gate_record_id
      OR (NEW.status='APPROVED' AND NEW.approved_at IS NULL)
      OR (NEW.status='REJECTED' AND NEW.approved_at IS NOT NULL) THEN
      RAISE EXCEPTION 'PRODUCT_COMMITMENT_TRANSITION_INVALID' USING ERRCODE='23514';
    END IF;
  ELSIF OLD.status IN ('APPROVED','REJECTED') THEN
    IF NEW.status<>'SUPERSEDED' OR OLD.gate_record_id IS DISTINCT FROM NEW.gate_record_id OR OLD.approved_at IS DISTINCT FROM NEW.approved_at THEN
      RAISE EXCEPTION 'PRODUCT_COMMITMENT_TRANSITION_INVALID' USING ERRCODE='23514';
    END IF;
  ELSE
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_REVISION_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_revision_mutation_guard
BEFORE UPDATE ON product_commitment_revisions FOR EACH ROW EXECUTE FUNCTION guard_product_commitment_revision_mutation();

CREATE OR REPLACE FUNCTION guard_product_commitment_revision_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'PRODUCT_COMMITMENT_REVISION_IMMUTABLE' USING ERRCODE='23514';
END $$;
CREATE TRIGGER product_commitment_revision_delete_guard
BEFORE DELETE ON product_commitment_revisions FOR EACH ROW EXECUTE FUNCTION guard_product_commitment_revision_delete();

CREATE OR REPLACE FUNCTION guard_product_commitment_module_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_status text;
BEGIN
  IF TG_OP='UPDATE' AND (
    OLD.id IS DISTINCT FROM NEW.id
    OR OLD.project_id IS DISTINCT FROM NEW.project_id
    OR OLD.product_commitment_revision_id IS DISTINCT FROM NEW.product_commitment_revision_id
    OR OLD.module_key IS DISTINCT FROM NEW.module_key
    OR OLD.ordinal IS DISTINCT FROM NEW.ordinal
  ) THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_MODULE_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  SELECT status INTO parent_status FROM product_commitment_revisions
  WHERE id=coalesce(NEW.product_commitment_revision_id,OLD.product_commitment_revision_id);
  IF parent_status IS DISTINCT FROM 'DRAFT' THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_MODULE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_module_mutation_guard
BEFORE INSERT OR UPDATE OR DELETE ON product_commitment_modules
FOR EACH ROW EXECUTE FUNCTION guard_product_commitment_module_mutation();

CREATE OR REPLACE FUNCTION validate_product_commitment_gate_record() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE revision_row product_commitment_revisions%ROWTYPE; persisted_modules jsonb;
BEGIN
  IF TG_OP='UPDATE' AND OLD.gate_code='PRODUCT_COMMITMENT' AND (
    OLD.project_id IS DISTINCT FROM NEW.project_id
    OR OLD.gate_code IS DISTINCT FROM NEW.gate_code
    OR OLD.scope_type IS DISTINCT FROM NEW.scope_type
    OR OLD.scope_id IS DISTINCT FROM NEW.scope_id
    OR OLD.evidence IS DISTINCT FROM NEW.evidence
  ) THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF NEW.gate_code<>'PRODUCT_COMMITMENT' THEN RETURN NEW; END IF;
  IF NEW.scope_type<>'PROJECT' OR NEW.scope_id<>NEW.project_id THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_SCOPE_INVALID' USING ERRCODE='23514';
  END IF;
  SELECT * INTO revision_row FROM product_commitment_revisions
  WHERE id=(NEW.evidence->>'product_commitment_revision_id')::uuid AND project_id=NEW.project_id;
  IF NOT FOUND
    OR NEW.evidence->>'canonical_sha256' IS DISTINCT FROM revision_row.canonical_sha256
    OR NEW.evidence->>'contract_version' IS DISTINCT FROM revision_row.contract_version
    OR NEW.evidence->>'requirements_revision_id' IS DISTINCT FROM revision_row.source_intake_revision_id::text
    OR NEW.evidence->>'source_requirements_artifact_id' IS DISTINCT FROM revision_row.source_requirements_artifact_id::text
    OR NEW.evidence->>'source_requirements_sha256' IS DISTINCT FROM revision_row.source_requirements_sha256
    OR NEW.evidence->>'source_review_artifact_id' IS DISTINCT FROM revision_row.source_review_artifact_id::text
    OR NEW.evidence->>'source_review_sha256' IS DISTINCT FROM revision_row.source_review_sha256 THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_EVIDENCE_INVALID' USING ERRCODE='23514';
  END IF;
  SELECT jsonb_agg(jsonb_build_object(
    'module_key',m.module_key,
    'name',m.payload->'name',
    'objective',m.payload->'objective',
    'scope',m.payload->'scope',
    'out_of_scope',m.payload->'out_of_scope',
    'dependencies',m.payload->'dependencies',
    'acceptance_criteria',m.payload->'acceptance_criteria',
    'source_evidence',m.source_evidence
  ) ORDER BY m.module_key) INTO persisted_modules
  FROM product_commitment_modules m WHERE m.product_commitment_revision_id=revision_row.id;
  IF NEW.evidence->'candidate_modules' IS DISTINCT FROM persisted_modules THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_MODULES_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
EXCEPTION WHEN invalid_text_representation THEN
  RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_EVIDENCE_INVALID' USING ERRCODE='23514';
END $$;
CREATE TRIGGER product_commitment_gate_record_guard
BEFORE INSERT OR UPDATE OF project_id,gate_code,scope_type,scope_id,evidence ON gate_records
FOR EACH ROW EXECUTE FUNCTION validate_product_commitment_gate_record();

CREATE OR REPLACE FUNCTION validate_product_commitment_revision_gate_binding() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE bound_gate gate_records%ROWTYPE;
BEGIN
  IF NEW.gate_record_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO bound_gate FROM gate_records WHERE id=NEW.gate_record_id AND project_id=NEW.project_id;
  IF NOT FOUND OR bound_gate.gate_code<>'PRODUCT_COMMITMENT' OR bound_gate.scope_type<>'PROJECT'
    OR bound_gate.scope_id<>NEW.project_id
    OR bound_gate.evidence->>'product_commitment_revision_id' IS DISTINCT FROM NEW.id::text
    OR bound_gate.evidence->>'canonical_sha256' IS DISTINCT FROM NEW.canonical_sha256
    OR bound_gate.evidence->>'contract_version' IS DISTINCT FROM NEW.contract_version THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_GATE_BINDING_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_revision_gate_binding_guard
BEFORE INSERT OR UPDATE OF gate_record_id,project_id,canonical_sha256,contract_version
ON product_commitment_revisions FOR EACH ROW EXECUTE FUNCTION validate_product_commitment_revision_gate_binding();

CREATE OR REPLACE FUNCTION enforce_approved_product_commitment_supersession() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM product_commitment_revisions successor
    WHERE successor.project_id=NEW.project_id
      AND successor.supersedes_revision_id=NEW.id
      AND successor.status='APPROVED'
  ) THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_APPROVED_SUPERSESSION_REQUIRES_APPROVED_SUCCESSOR' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER product_commitment_approved_supersession_guard
AFTER UPDATE ON product_commitment_revisions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD.status='APPROVED' AND NEW.status='SUPERSEDED')
EXECUTE FUNCTION enforce_approved_product_commitment_supersession();

CREATE OR REPLACE FUNCTION guard_product_commitment_materialization() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE commitment_status text;
BEGIN
  IF TG_OP<>'INSERT' THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_MATERIALIZATION_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  SELECT status INTO commitment_status FROM product_commitment_revisions
  WHERE id=NEW.product_commitment_revision_id AND project_id=NEW.project_id;
  IF commitment_status IS DISTINCT FROM 'APPROVED' THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_REVISION_NOT_APPROVED' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_materialization_guard
BEFORE INSERT OR UPDATE OR DELETE ON product_commitment_module_materializations
FOR EACH ROW EXECUTE FUNCTION guard_product_commitment_materialization();
