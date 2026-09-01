-- REC-01: database-backed executor claim. A live executor owns the decision
-- for the same bounded interval already used by development reservation
-- recovery; after process death the persisted claim expires and is replayable.
ALTER TABLE recovery_decisions
  ADD COLUMN IF NOT EXISTS execution_lease_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS recovery_decisions_execution_lease_idx
  ON recovery_decisions(execution_lease_expires_at)
  WHERE execution_state='EXECUTING';
