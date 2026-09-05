-- Completes the additive F6 audit contract without reinterpreting legacy rows.
ALTER TABLE work_blocks
  ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT 'INTERNAL'
    CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  ADD COLUMN IF NOT EXISTS cycle integer NOT NULL DEFAULT 1 CHECK (cycle > 0),
  ADD COLUMN IF NOT EXISTS symptoms jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suspected_causes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS responsible_role text;

ALTER TABLE assistance_proposals
  ADD COLUMN IF NOT EXISTS human_decision_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS specialist_role text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS assistance_proposals_idempotency
  ON assistance_proposals(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE assurance_human_gates
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS policy_id uuid,
  ADD COLUMN IF NOT EXISTS policy_version integer,
  ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT 'INTERNAL'
    CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
  ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS assurance_human_gates_idempotency
  ON assurance_human_gates(idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE findings
  ADD COLUMN IF NOT EXISTS target_project_id text REFERENCES projects(id),
  ADD COLUMN IF NOT EXISTS target_module_id uuid REFERENCES modules(id),
  ADD COLUMN IF NOT EXISTS target_work_item_id uuid REFERENCES work_items(id),
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS criterion text,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS rework_action text,
  ADD COLUMN IF NOT EXISTS resolution text,
  ADD COLUMN IF NOT EXISTS resolution_evidence jsonb;

DO $$
DECLARE constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid='findings'::regclass AND contype='c'
    AND pg_get_constraintdef(oid) LIKE '%delivery_id IS NULL%candidate_id IS NULL%'
  LIMIT 1;
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE findings DROP CONSTRAINT %I',constraint_name);
  END IF;
END $$;

ALTER TABLE findings DROP CONSTRAINT IF EXISTS findings_exactly_one_target;
ALTER TABLE findings ADD CONSTRAINT findings_exactly_one_target CHECK (
  num_nonnulls(delivery_id,candidate_id,target_project_id,target_module_id,target_work_item_id)=1
);
CREATE INDEX IF NOT EXISTS findings_assurance_target
  ON findings(target_project_id,target_module_id,target_work_item_id,state)
  WHERE origin='ASSURANCE_REVIEW';

CREATE INDEX IF NOT EXISTS assurance_reviews_acceptance_history
  ON assurance_reviews(acceptance_id,version DESC,created_at DESC);
CREATE INDEX IF NOT EXISTS assurance_gates_scope
  ON assurance_human_gates(project_id,gate_type,decision,created_at DESC);
