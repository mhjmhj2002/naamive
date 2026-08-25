-- AUT-02-FIX-02 anchors the logical PlanWorkItem identity outside the mutable
-- work_items payload. Legacy/v1 work items and v2 rows without plan lineage are
-- intentionally preserved with NULL lineage.
ALTER TABLE work_items
  ADD COLUMN module_plan_revision_id uuid REFERENCES module_plan_revisions(id),
  ADD COLUMN plan_work_item_id text;

-- One-time, fail-closed backfill. payload is migration evidence only: the
-- approved plan, project/module/revision and round must all agree, and the
-- logical identity must occur exactly once in the plan.
UPDATE work_items w
SET module_plan_revision_id=pr.id,
    plan_work_item_id=w.payload->>'work_item_id'
FROM module_plan_revisions pr, module_rounds r
WHERE w.workflow_code='WORK_ITEM_DELIVERY'
  AND w.workflow_version=2
  AND w.payload->>'plan_revision_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND pr.id=(w.payload->>'plan_revision_id')::uuid
  AND pr.status='APPROVED'
  AND pr.project_id=w.project_id
  AND pr.module_id=w.module_id
  AND pr.module_revision_id=w.revision_id
  AND pr.work_item_workflow_code='WORK_ITEM_DELIVERY'
  AND pr.work_item_workflow_version=2
  AND r.id=w.round_id
  AND r.module_id=w.module_id
  AND r.revision_id=w.revision_id
  AND (
    SELECT count(*)
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(pr.payload->'work_items')='array'
        THEN pr.payload->'work_items' ELSE '[]'::jsonb END
    ) member
    WHERE member->>'work_item_id'=w.payload->>'work_item_id'
  )=1;

DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM work_items w
    WHERE w.workflow_code='WORK_ITEM_DELIVERY'
      AND w.workflow_version=2
      AND w.payload ? 'plan_revision_id'
      AND (w.module_plan_revision_id IS NULL OR w.plan_work_item_id IS NULL)
  ) THEN
    RAISE EXCEPTION 'AUT02_PLAN_WORK_ITEM_BACKFILL_AMBIGUOUS' USING ERRCODE='23514';
  END IF;
END $$;

ALTER TABLE work_items
  ADD CONSTRAINT work_items_plan_lineage_pair CHECK (
    (module_plan_revision_id IS NULL)=(plan_work_item_id IS NULL)
  ),
  ADD CONSTRAINT work_items_plan_work_item_id_shape CHECK (
    plan_work_item_id IS NULL OR plan_work_item_id ~ '^[a-z][a-z0-9_-]{0,99}$'
  ),
  ADD CONSTRAINT work_items_v2_claimed_plan_lineage CHECK (
    workflow_code<>'WORK_ITEM_DELIVERY' OR workflow_version<>2 OR
    NOT (payload ? 'plan_revision_id') OR
    (module_plan_revision_id IS NOT NULL AND plan_work_item_id IS NOT NULL)
  );

CREATE UNIQUE INDEX work_items_plan_work_item_generation_unique
  ON work_items(module_plan_revision_id,revision_id,round_id,plan_work_item_id)
  WHERE module_plan_revision_id IS NOT NULL;

CREATE OR REPLACE FUNCTION enforce_work_item_plan_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE matching_members integer;
BEGIN
  IF NEW.module_plan_revision_id IS NULL AND NEW.plan_work_item_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.module_plan_revision_id IS NULL OR NEW.plan_work_item_id IS NULL OR
     NEW.workflow_code<>'WORK_ITEM_DELIVERY' OR NEW.workflow_version<>2 THEN
    RAISE EXCEPTION 'WORK_ITEM_PLAN_LINEAGE_INVALID' USING ERRCODE='23514';
  END IF;

  SELECT count(*) INTO matching_members
  FROM module_plan_revisions pr
  JOIN module_rounds r
    ON r.id=NEW.round_id AND r.module_id=NEW.module_id AND r.revision_id=NEW.revision_id
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(pr.payload->'work_items')='array'
      THEN pr.payload->'work_items' ELSE '[]'::jsonb END
  ) member
  WHERE pr.id=NEW.module_plan_revision_id
    AND pr.status='APPROVED'
    AND pr.project_id=NEW.project_id
    AND pr.module_id=NEW.module_id
    AND pr.module_revision_id=NEW.revision_id
    AND pr.work_item_workflow_code='WORK_ITEM_DELIVERY'
    AND pr.work_item_workflow_version=2
    AND member->>'work_item_id'=NEW.plan_work_item_id;

  IF matching_members<>1 THEN
    RAISE EXCEPTION 'WORK_ITEM_PLAN_LINEAGE_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION prevent_work_item_plan_lineage_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.module_plan_revision_id IS NOT NULL OR OLD.plan_work_item_id IS NOT NULL THEN
    IF ROW(NEW.project_id,NEW.module_id,NEW.revision_id,NEW.round_id,
           NEW.module_plan_revision_id,NEW.plan_work_item_id,NEW.workflow_code,NEW.workflow_version)
       IS DISTINCT FROM
       ROW(OLD.project_id,OLD.module_id,OLD.revision_id,OLD.round_id,
           OLD.module_plan_revision_id,OLD.plan_work_item_id,OLD.workflow_code,OLD.workflow_version) THEN
      RAISE EXCEPTION 'WORK_ITEM_PLAN_LINEAGE_IMMUTABLE' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER work_items_plan_lineage_guard
  BEFORE INSERT OR UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION enforce_work_item_plan_lineage();
CREATE TRIGGER work_items_plan_lineage_immutable
  BEFORE UPDATE ON work_items
  FOR EACH ROW EXECUTE FUNCTION prevent_work_item_plan_lineage_mutation();

-- Delivery candidates are AUT-02-only records, so every historical row must be
-- backfilled and the frozen logical identity is mandatory from now on.
ALTER TABLE work_item_delivery_candidates ADD COLUMN plan_work_item_id text;
DROP TRIGGER work_item_delivery_candidates_immutable ON work_item_delivery_candidates;
UPDATE work_item_delivery_candidates dc
SET plan_work_item_id=w.plan_work_item_id
FROM work_items w
WHERE w.id=dc.work_item_id
  AND w.project_id=dc.project_id
  AND w.module_id=dc.module_id
  AND w.revision_id=dc.module_revision_id
  AND w.round_id=dc.module_round_id
  AND w.module_plan_revision_id=dc.module_plan_revision_id;

DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM work_item_delivery_candidates WHERE plan_work_item_id IS NULL) THEN
    RAISE EXCEPTION 'AUT02_DELIVERY_CANDIDATE_IDENTITY_BACKFILL_FAILED' USING ERRCODE='23514';
  END IF;
END $$;

ALTER TABLE work_item_delivery_candidates
  ALTER COLUMN plan_work_item_id SET NOT NULL,
  ADD CONSTRAINT work_item_delivery_candidates_plan_work_item_id_shape
    CHECK (plan_work_item_id ~ '^[a-z][a-z0-9_-]{0,99}$');

CREATE OR REPLACE FUNCTION enforce_delivery_candidate_plan_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS(
    SELECT 1 FROM work_items w
    WHERE w.id=NEW.work_item_id
      AND w.project_id=NEW.project_id
      AND w.module_id=NEW.module_id
      AND w.revision_id=NEW.module_revision_id
      AND w.round_id=NEW.module_round_id
      AND w.module_plan_revision_id=NEW.module_plan_revision_id
      AND w.plan_work_item_id=NEW.plan_work_item_id
  ) THEN
    RAISE EXCEPTION 'AUT02_DELIVERY_CANDIDATE_PLAN_IDENTITY_INVALID' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER work_item_delivery_candidates_plan_identity_guard
  BEFORE INSERT ON work_item_delivery_candidates
  FOR EACH ROW EXECUTE FUNCTION enforce_delivery_candidate_plan_identity();
CREATE TRIGGER work_item_delivery_candidates_immutable
  BEFORE UPDATE OR DELETE ON work_item_delivery_candidates
  FOR EACH ROW EXECUTE FUNCTION prevent_delivery_candidate_snapshot_mutation();
