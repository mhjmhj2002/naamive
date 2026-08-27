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
