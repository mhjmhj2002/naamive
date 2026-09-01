-- REC-02 / REVIEWER_AND_BLOCK_RECOVERY:v1.  This is deliberately additive:
-- it records the recovery policy applied to a historical acceptance instead of
-- deriving a new policy from whatever happens to be enabled today.
ALTER TABLE assurance_reviews DROP CONSTRAINT IF EXISTS assurance_reviews_state_check;
ALTER TABLE assurance_reviews ADD CONSTRAINT assurance_reviews_state_check
  CHECK (state IN ('PENDING','DISPATCHED','DECIDED','FAILED','CANCELLED'));

CREATE TABLE reviewer_recovery_strategies (
  recovery_key text PRIMARY KEY,
  schema_version text NOT NULL DEFAULT 'RecoveryStrategySnapshot:v1'
    CHECK (schema_version='RecoveryStrategySnapshot:v1'),
  acceptance_id uuid NOT NULL UNIQUE REFERENCES work_acceptances(id) ON DELETE CASCADE,
  assurance_dispatch_snapshot_id uuid REFERENCES assurance_dispatch_snapshots(id),
  legacy boolean NOT NULL DEFAULT false,
  subject_kind text,
  subject_id text,
  normative_generation text,
  policy_id uuid NOT NULL,
  policy_version integer NOT NULL,
  current_stage integer NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),
  exhausted_stages jsonb NOT NULL DEFAULT '[]'::jsonb,
  reviewer_failure_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  candidate_set jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_candidate jsonb,
  stage_attempts jsonb NOT NULL DEFAULT '{}'::jsonb,
  assistance_reference uuid REFERENCES assistance_proposals(id) ON DELETE SET NULL,
  routing_reference uuid,
  specialist_reference uuid,
  gate_reference uuid,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (policy_id,policy_version) REFERENCES assurance_policies(id,version),
  CHECK ((legacy AND assurance_dispatch_snapshot_id IS NULL AND subject_kind IS NULL AND subject_id IS NULL AND normative_generation IS NULL)
      OR (NOT legacy AND assurance_dispatch_snapshot_id IS NOT NULL AND subject_kind IS NOT NULL AND subject_id IS NOT NULL AND normative_generation IS NOT NULL))
);
CREATE UNIQUE INDEX reviewer_recovery_strategy_snapshot ON reviewer_recovery_strategies(assurance_dispatch_snapshot_id) WHERE assurance_dispatch_snapshot_id IS NOT NULL;

CREATE TABLE reviewer_recovery_idempotency (
  idempotency_key text PRIMARY KEY,
  recovery_key text NOT NULL REFERENCES reviewer_recovery_strategies(recovery_key) ON DELETE CASCADE,
  action text NOT NULL,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  result_reference text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE reviewer_recovery_routing_decisions (
  id uuid PRIMARY KEY,
  recovery_key text NOT NULL REFERENCES reviewer_recovery_strategies(recovery_key) ON DELETE CASCADE,
  schema_version text NOT NULL CHECK (schema_version='RoutingDecision:v1'),
  category text NOT NULL,
  routing_role text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE reviewer_recovery_specialist_recommendations (
  id uuid PRIMARY KEY,
  recovery_key text NOT NULL REFERENCES reviewer_recovery_strategies(recovery_key) ON DELETE CASCADE,
  job_id uuid NOT NULL UNIQUE REFERENCES jobs(id),
  schema_version text NOT NULL CHECK (schema_version='SpecialistRecommendation:v1'),
  specialist_role text NOT NULL,
  recommendation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE OR REPLACE FUNCTION prevent_reviewer_recovery_identity_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.recovery_key IS DISTINCT FROM OLD.recovery_key OR
     NEW.acceptance_id IS DISTINCT FROM OLD.acceptance_id OR
     NEW.assurance_dispatch_snapshot_id IS DISTINCT FROM OLD.assurance_dispatch_snapshot_id OR
     NEW.legacy IS DISTINCT FROM OLD.legacy OR NEW.subject_kind IS DISTINCT FROM OLD.subject_kind OR
     NEW.subject_id IS DISTINCT FROM OLD.subject_id OR NEW.normative_generation IS DISTINCT FROM OLD.normative_generation OR
     NEW.policy_id IS DISTINCT FROM OLD.policy_id OR NEW.policy_version IS DISTINCT FROM OLD.policy_version
  THEN RAISE EXCEPTION 'REVIEWER_RECOVERY_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER reviewer_recovery_identity_immutable BEFORE UPDATE ON reviewer_recovery_strategies
FOR EACH ROW EXECUTE FUNCTION prevent_reviewer_recovery_identity_mutation();
