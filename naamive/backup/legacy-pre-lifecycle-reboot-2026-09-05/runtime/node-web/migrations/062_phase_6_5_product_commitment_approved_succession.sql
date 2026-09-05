-- LR-02A-FIX-01: make evolution of an approved Product Commitment possible
-- without weakening the single-current-approval invariant from migration 061.

CREATE UNIQUE INDEX product_commitment_one_pending_per_project
  ON product_commitment_revisions(project_id) WHERE status='PENDING_APPROVAL';

ALTER TABLE product_commitment_revisions
  DROP CONSTRAINT product_commitment_revisions_check1;
ALTER TABLE product_commitment_revisions
  ADD CONSTRAINT product_commitment_revisions_approved_at_status_check CHECK (
    (status='APPROVED' AND approved_at IS NOT NULL)
    OR (status IN ('DRAFT','PENDING_APPROVAL','REJECTED') AND approved_at IS NULL)
    OR status='SUPERSEDED'
  );

CREATE OR REPLACE FUNCTION validate_product_commitment_predecessor_order() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE predecessor product_commitment_revisions%ROWTYPE;
BEGIN
  IF NEW.supersedes_revision_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO predecessor FROM product_commitment_revisions
  WHERE id=NEW.supersedes_revision_id AND project_id=NEW.project_id;
  IF NOT FOUND
    OR predecessor.revision_number>=NEW.revision_number
    OR predecessor.logical_round>=NEW.logical_round THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_SUCCESSOR_LINEAGE_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_commitment_predecessor_order_guard
BEFORE INSERT OR UPDATE OF supersedes_revision_id,project_id,revision_number,logical_round
ON product_commitment_revisions FOR EACH ROW
EXECUTE FUNCTION validate_product_commitment_predecessor_order();

DROP TRIGGER product_commitment_approved_supersession_guard ON product_commitment_revisions;
DROP FUNCTION enforce_approved_product_commitment_supersession();

CREATE FUNCTION enforce_approved_product_commitment_supersession() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE valid_successor_count integer;
BEGIN
  WITH RECURSIVE descendants AS (
    SELECT candidate.id,candidate.supersedes_revision_id,candidate.revision_number,candidate.logical_round,
      candidate.status,candidate.gate_record_id,candidate.canonical_sha256,candidate.contract_version
    FROM product_commitment_revisions candidate
    WHERE candidate.project_id=NEW.project_id AND candidate.supersedes_revision_id=NEW.id
    UNION
    SELECT candidate.id,candidate.supersedes_revision_id,candidate.revision_number,candidate.logical_round,
      candidate.status,candidate.gate_record_id,candidate.canonical_sha256,candidate.contract_version
    FROM product_commitment_revisions candidate
    JOIN descendants predecessor ON predecessor.id=candidate.supersedes_revision_id
    WHERE candidate.project_id=NEW.project_id
  )
  SELECT count(*)::integer INTO valid_successor_count
  FROM descendants successor
  JOIN gate_records gate ON gate.id=successor.gate_record_id AND gate.project_id=NEW.project_id
  JOIN gate_decisions decision ON decision.id=gate.decision_id AND decision.gate_id=gate.id
  WHERE successor.status='APPROVED'
    AND successor.revision_number>NEW.revision_number
    AND successor.logical_round>NEW.logical_round
    AND gate.gate_code='PRODUCT_COMMITMENT'
    AND gate.scope_type='PROJECT'
    AND gate.scope_id=NEW.project_id
    AND gate.status='DECIDED'
    AND gate.decision='APPROVE'
    AND decision.decision='APPROVE'
    AND gate.evidence->>'product_commitment_revision_id'=successor.id::text
    AND gate.evidence->>'canonical_sha256'=successor.canonical_sha256
    AND gate.evidence->>'contract_version'=successor.contract_version;
  IF valid_successor_count<>1 THEN
    RAISE EXCEPTION 'PRODUCT_COMMITMENT_APPROVED_SUPERSESSION_REQUIRES_APPROVED_SUCCESSOR' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER product_commitment_approved_supersession_guard
AFTER UPDATE ON product_commitment_revisions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW WHEN (OLD.status='APPROVED' AND NEW.status='SUPERSEDED')
EXECUTE FUNCTION enforce_approved_product_commitment_supersession();
