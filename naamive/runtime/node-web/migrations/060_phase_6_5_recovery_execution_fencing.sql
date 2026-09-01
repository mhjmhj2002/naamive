-- REC-01 audit fix: every executor acquisition receives a durable, unique
-- ownership identity and a monotonic fencing generation. The lease determines
-- when takeover is allowed; these columns determine which executor may mutate.
ALTER TABLE recovery_decisions
  ADD COLUMN IF NOT EXISTS execution_claim_id uuid,
  ADD COLUMN IF NOT EXISTS execution_generation bigint NOT NULL DEFAULT 0;

ALTER TABLE recovery_decisions
  DROP CONSTRAINT IF EXISTS recovery_decisions_execution_generation_check;
ALTER TABLE recovery_decisions
  ADD CONSTRAINT recovery_decisions_execution_generation_check
  CHECK (execution_generation >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS recovery_decisions_execution_claim_id_idx
  ON recovery_decisions(execution_claim_id)
  WHERE execution_claim_id IS NOT NULL;
