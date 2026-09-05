-- F5-12: a gate decision permanently records the exact baseline revision
-- content it decided.  A revision is submitted once and can receive only one
-- final decision; a later correction must create a new revision and gate.
ALTER TABLE technology_baseline_gates
  ADD COLUMN IF NOT EXISTS revision_hash varchar,
  ADD COLUMN IF NOT EXISTS decision_artifact_hash varchar;

CREATE UNIQUE INDEX IF NOT EXISTS one_baseline_gate_decision_per_revision
  ON technology_baseline_gates(baseline_revision_id)
  WHERE decision IS NOT NULL;

ALTER TABLE technology_baseline_gates
  ADD CONSTRAINT technology_baseline_gates_decision_hash_required
  CHECK ((decision IS NULL AND revision_hash IS NULL AND decision_artifact_hash IS NULL)
    OR (decision IN ('APPROVED','REJECTED')
      AND revision_hash ~ '^[a-f0-9]{64}$'
      AND decision_artifact_hash ~ '^[a-f0-9]{64}$'));
