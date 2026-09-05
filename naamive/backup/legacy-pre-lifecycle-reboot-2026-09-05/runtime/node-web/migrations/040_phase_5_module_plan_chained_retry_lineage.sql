-- F5-23 pendency 23: chained retry with correct lineage.
--
-- A RETRY_MODULE_PLAN may itself fail and be retried again. Each retry must
-- inherit the FIRST planning operation's module revision, Technology Baseline
-- and context snapshot — never the failed retry's own (possibly corrupt) state.
--
-- origin_operation_id records the ROOT (first) operation of the retry chain
-- directly on both the new operations row and the new jobs row, so chained
-- lineage is queryable without a recursive walk over retry_of_operation_id.
-- On the initial PLAN_MODULE_WORK_ITEMS operation the column stays NULL
-- (the operation IS the origin). retry_of_operation_id (migration 036) still
-- records the immediate parent; origin_operation_id records the root ancestor.
ALTER TABLE operations ADD COLUMN IF NOT EXISTS origin_operation_id uuid REFERENCES operations(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS origin_operation_id uuid REFERENCES operations(id);
CREATE INDEX IF NOT EXISTS operations_origin_operation_id_idx ON operations(origin_operation_id);
CREATE INDEX IF NOT EXISTS jobs_origin_operation_id_idx ON jobs(origin_operation_id);
