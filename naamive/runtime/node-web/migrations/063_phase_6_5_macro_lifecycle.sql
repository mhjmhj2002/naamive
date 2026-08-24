-- LR-02: durable macro-lifecycle reconciliation, committed-module obligations
-- and immutable Product Commitment evolution lineage. Historical instances and
-- published workflow definitions remain untouched.

ALTER TABLE module_revisions
  ADD COLUMN predecessor_revision_id uuid,
  ADD COLUMN source_product_commitment_revision_id uuid,
  ADD COLUMN source_product_commitment_module_id uuid,
  ADD COLUMN evolution_operation_id uuid,
  ADD COLUMN evolution_policy_version text,
  ADD COLUMN candidate_fingerprint text;

ALTER TABLE module_revisions
  ADD CONSTRAINT module_revisions_id_project_key_revision_unique
    UNIQUE(id,project_id,module_key,revision),
  ADD CONSTRAINT module_revisions_predecessor_lineage_fk
    FOREIGN KEY(predecessor_revision_id,project_id,module_key)
    REFERENCES module_revisions(id,project_id,module_key),
  ADD CONSTRAINT module_revisions_commitment_source_fk
    FOREIGN KEY(source_product_commitment_revision_id,project_id)
    REFERENCES product_commitment_revisions(id,project_id),
  ADD CONSTRAINT module_revisions_candidate_source_fk
    FOREIGN KEY(source_product_commitment_module_id,project_id,source_product_commitment_revision_id,module_key)
    REFERENCES product_commitment_modules(id,project_id,product_commitment_revision_id,module_key),
  ADD CONSTRAINT module_revisions_evolution_operation_fk
    FOREIGN KEY(evolution_operation_id,project_id)
    REFERENCES operations(id,project_id),
  ADD CONSTRAINT module_revisions_evolution_lineage_complete CHECK (
    (predecessor_revision_id IS NULL
      AND source_product_commitment_revision_id IS NULL
      AND source_product_commitment_module_id IS NULL
      AND evolution_operation_id IS NULL
      AND evolution_policy_version IS NULL
      AND candidate_fingerprint IS NULL)
    OR
    (source_product_commitment_revision_id IS NOT NULL
      AND source_product_commitment_module_id IS NOT NULL
      AND evolution_operation_id IS NOT NULL
      AND evolution_policy_version='COMMITTED_MODULE_EVOLUTION_POLICY:v1'
      AND candidate_fingerprint ~ '^[a-f0-9]{64}$')
  );

ALTER TABLE modules ADD CONSTRAINT modules_current_revision_project_key_fk
  FOREIGN KEY(current_revision_id,project_id,module_key)
  REFERENCES module_revisions(id,project_id,module_key) NOT VALID;
ALTER TABLE modules VALIDATE CONSTRAINT modules_current_revision_project_key_fk;

CREATE OR REPLACE FUNCTION guard_lr02_module_revision_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predecessor module_revisions%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND (
    OLD.predecessor_revision_id IS DISTINCT FROM NEW.predecessor_revision_id
    OR OLD.source_product_commitment_revision_id IS DISTINCT FROM NEW.source_product_commitment_revision_id
    OR OLD.source_product_commitment_module_id IS DISTINCT FROM NEW.source_product_commitment_module_id
    OR OLD.evolution_operation_id IS DISTINCT FROM NEW.evolution_operation_id
    OR OLD.evolution_policy_version IS DISTINCT FROM NEW.evolution_policy_version
    OR OLD.candidate_fingerprint IS DISTINCT FROM NEW.candidate_fingerprint
  ) THEN
    RAISE EXCEPTION 'MODULE_REVISION_EVOLUTION_LINEAGE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF NEW.predecessor_revision_id IS NOT NULL THEN
    SELECT * INTO predecessor FROM module_revisions
    WHERE id=NEW.predecessor_revision_id AND project_id=NEW.project_id AND module_key=NEW.module_key;
    IF NOT FOUND OR NEW.revision<>predecessor.revision+1 THEN
      RAISE EXCEPTION 'MODULE_REVISION_PREDECESSOR_INVALID' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.source_product_commitment_revision_id IS NOT NULL AND NEW.revision<>1 THEN
    RAISE EXCEPTION 'MODULE_REVISION_INITIAL_NUMBER_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER module_revision_lr02_lineage_guard
BEFORE INSERT OR UPDATE OF predecessor_revision_id,source_product_commitment_revision_id,
  source_product_commitment_module_id,evolution_operation_id,evolution_policy_version,candidate_fingerprint,
  revision,project_id,module_key
ON module_revisions FOR EACH ROW EXECUTE FUNCTION guard_lr02_module_revision_lineage();

CREATE TABLE committed_module_obligations (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  module_key text NOT NULL CHECK(module_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  generation integer NOT NULL CHECK(generation>0),
  required boolean NOT NULL DEFAULT true,
  materialized_module_id uuid,
  materialized_module_revision_id uuid,
  introduced_by_revision_id uuid NOT NULL,
  last_present_revision_id uuid NOT NULL,
  removed_by_revision_id uuid,
  present_in_current_commitment boolean NOT NULL DEFAULT true,
  scope_change_pending boolean NOT NULL DEFAULT false,
  resolved_by_gate_decision_id uuid REFERENCES gate_decisions(id),
  version bigint NOT NULL DEFAULT 1 CHECK(version>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(project_id,module_key,generation),
  UNIQUE(id,project_id,module_key),
  FOREIGN KEY(introduced_by_revision_id,project_id) REFERENCES product_commitment_revisions(id,project_id),
  FOREIGN KEY(last_present_revision_id,project_id) REFERENCES product_commitment_revisions(id,project_id),
  FOREIGN KEY(removed_by_revision_id,project_id) REFERENCES product_commitment_revisions(id,project_id),
  FOREIGN KEY(materialized_module_id,project_id,module_key) REFERENCES modules(id,project_id,module_key),
  FOREIGN KEY(materialized_module_revision_id,project_id,module_key) REFERENCES module_revisions(id,project_id,module_key),
  CHECK((materialized_module_id IS NULL)=(materialized_module_revision_id IS NULL)),
  CHECK(required OR resolved_by_gate_decision_id IS NOT NULL),
  CHECK((present_in_current_commitment AND removed_by_revision_id IS NULL AND NOT scope_change_pending)
    OR (NOT present_in_current_commitment AND removed_by_revision_id IS NOT NULL AND scope_change_pending)),
  CHECK(required OR NOT scope_change_pending)
);
CREATE UNIQUE INDEX committed_module_one_required_generation
  ON committed_module_obligations(project_id,module_key) WHERE required;
CREATE INDEX committed_module_obligations_project_required
  ON committed_module_obligations(project_id,module_key,generation) WHERE required;

CREATE OR REPLACE FUNCTION guard_committed_module_obligation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND (
    OLD.id IS DISTINCT FROM NEW.id OR OLD.project_id IS DISTINCT FROM NEW.project_id
    OR OLD.module_key IS DISTINCT FROM NEW.module_key OR OLD.generation IS DISTINCT FROM NEW.generation
    OR OLD.introduced_by_revision_id IS DISTINCT FROM NEW.introduced_by_revision_id
    OR OLD.created_at IS DISTINCT FROM NEW.created_at
  ) THEN
    RAISE EXCEPTION 'COMMITTED_MODULE_OBLIGATION_IDENTITY_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF NEW.materialized_module_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM modules m JOIN module_revisions r ON r.id=NEW.materialized_module_revision_id
    WHERE m.id=NEW.materialized_module_id AND m.project_id=NEW.project_id AND m.module_key=NEW.module_key
      AND r.id=m.current_revision_id AND r.project_id=m.project_id AND r.module_key=m.module_key
  ) THEN
    RAISE EXCEPTION 'COMMITTED_MODULE_OBLIGATION_MATERIALIZATION_INVALID' USING ERRCODE='23514';
  END IF;
  NEW.updated_at:=clock_timestamp();
  IF TG_OP='UPDATE' THEN NEW.version:=OLD.version+1; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER committed_module_obligation_guard
BEFORE INSERT OR UPDATE ON committed_module_obligations
FOR EACH ROW EXECUTE FUNCTION guard_committed_module_obligation();

CREATE TABLE macro_lifecycle_intents (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  destination text NOT NULL CHECK(destination IN ('DISCOVERY','COMMITMENT_MATERIALIZATION','MACRO_LIFECYCLE')),
  kind text NOT NULL CHECK(kind IN ('DISCOVERY','SAME_LINEAGE','EVOLVE_MODULE','ADD_MODULE','SCOPE_DIVERGENCE','MACRO_REEVALUATE')),
  aggregate_type text NOT NULL CHECK(aggregate_type IN ('PROJECT','MODULE','PRODUCT_COMMITMENT')),
  aggregate_id text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(payload)='object'),
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(evidence_refs)='array'),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','LEASED','COMPLETED','FAILED','SUPERSEDED')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_owner text,
  lease_token uuid,
  lease_expires_at timestamptz,
  operation_id uuid,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  UNIQUE(id,project_id),
  FOREIGN KEY(operation_id,project_id) REFERENCES operations(id,project_id),
  CHECK((status='LEASED')=(lease_owner IS NOT NULL AND lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK((status IN ('COMPLETED','SUPERSEDED'))=(completed_at IS NOT NULL))
);
CREATE INDEX macro_lifecycle_intents_claim
  ON macro_lifecycle_intents(available_at,created_at,id)
  WHERE status IN ('PENDING','FAILED','LEASED');
CREATE INDEX macro_lifecycle_intents_project
  ON macro_lifecycle_intents(project_id,status,kind,created_at);

CREATE TABLE macro_lifecycle_transitions (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  aggregate_type text NOT NULL CHECK(aggregate_type IN ('PROJECT','MODULE')),
  aggregate_id text NOT NULL,
  workflow_code text NOT NULL,
  workflow_version integer NOT NULL,
  transition_type text NOT NULL CHECK(transition_type IN ('FORWARD_TRANSITION','REOPEN_TRANSITION')),
  source_state text NOT NULL,
  target_state text NOT NULL,
  trigger_code text NOT NULL,
  reason text NOT NULL,
  reopening_reason text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(evidence_refs)='array'),
  source_intent_id uuid,
  operation_id uuid,
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(workflow_code,workflow_version) REFERENCES workflow_definitions(code,version),
  FOREIGN KEY(source_intent_id,project_id) REFERENCES macro_lifecycle_intents(id,project_id),
  FOREIGN KEY(operation_id,project_id) REFERENCES operations(id,project_id),
  CHECK((transition_type='REOPEN_TRANSITION')=(reopening_reason IS NOT NULL))
);
CREATE INDEX macro_lifecycle_transitions_aggregate
  ON macro_lifecycle_transitions(project_id,aggregate_type,aggregate_id,created_at,id);

CREATE TABLE commitment_materialization_checkpoints (
  product_commitment_revision_id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  candidate_count integer NOT NULL CHECK(candidate_count>=0),
  resolved_count integer NOT NULL CHECK(resolved_count>=0 AND resolved_count<=candidate_count),
  complete boolean NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(product_commitment_revision_id,project_id),
  FOREIGN KEY(product_commitment_revision_id,project_id)
    REFERENCES product_commitment_revisions(id,project_id),
  CHECK(complete=(resolved_count=candidate_count))
);
