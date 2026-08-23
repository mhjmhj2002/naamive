-- Keep test/project archival cleanup compatible with immutable scheduling audit:
-- deleting a work item as part of an already-authorized project purge removes
-- only its dependent decisions, never a live decision independently.
ALTER TABLE work_item_scheduling_decisions
  DROP CONSTRAINT IF EXISTS work_item_scheduling_decisions_work_item_id_fkey;
ALTER TABLE work_item_scheduling_decisions
  ADD CONSTRAINT work_item_scheduling_decisions_work_item_id_fkey
  FOREIGN KEY(work_item_id) REFERENCES work_items(id) ON DELETE CASCADE;
