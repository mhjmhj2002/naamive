-- REC-02 audit remediation: a human-gate wait is not terminal escalation.
-- Keep the historical stage number, but persist the operational state so a
-- decided GAT-01 gate can resume the same recovery identity safely.
ALTER TABLE reviewer_recovery_strategies
  ADD COLUMN recovery_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (recovery_state IN ('ACTIVE','WAITING_FOR_GATE','TERMINAL_ESCALATION'));

ALTER TABLE reviewer_recovery_strategies
  ADD CONSTRAINT reviewer_recovery_gate_reference_fk
  FOREIGN KEY (gate_reference) REFERENCES gate_records(id) ON DELETE RESTRICT;

CREATE INDEX reviewer_recovery_waiting_gate_idx
  ON reviewer_recovery_strategies(gate_reference)
  WHERE recovery_state='WAITING_FOR_GATE';

-- A REC-02 strategy may point only at its own GAT-01 independence gate.
-- The recovery_key is therefore part of the durable authority relationship.
CREATE OR REPLACE FUNCTION validate_reviewer_recovery_gate_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  valid_reference boolean;
BEGIN
  IF NEW.gate_reference IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS(
    SELECT 1
    FROM gate_records g
    JOIN work_acceptances a ON a.id=NEW.acceptance_id
    WHERE g.id=NEW.gate_reference
      AND g.project_id=a.project_id
      AND g.gate_code='INDEPENDENCE_EXCEPTION'
      AND g.scope_type='EXECUTION'
      AND g.scope_id=a.execution_id::text
      AND g.condition_code='INDEPENDENCE_EXCEPTION_POLICY_MATCHED'
      AND g.evidence->>'acceptance_id'=a.id::text
      AND g.evidence->>'recovery_key'=NEW.recovery_key
      AND g.evidence->>'policy_id'=NEW.policy_id::text
      AND g.evidence->>'policy_version'=NEW.policy_version::text
  ) INTO valid_reference;
  IF NOT valid_reference THEN
    RAISE EXCEPTION 'REVIEWER_RECOVERY_GATE_REFERENCE_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER reviewer_recovery_gate_reference_valid
  BEFORE INSERT OR UPDATE OF gate_reference ON reviewer_recovery_strategies
  FOR EACH ROW EXECUTE FUNCTION validate_reviewer_recovery_gate_reference();
