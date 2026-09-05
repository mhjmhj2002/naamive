-- A reservation is not an execution.  Keep the single-active-attempt invariant
-- at the delivery/work-item boundary, while allowing independent work items in
-- the same project to own separate worktrees.
ALTER TABLE deliveries ALTER COLUMN state SET DEFAULT 'RESERVED';
DROP INDEX IF EXISTS one_active_worktree_per_project;
CREATE UNIQUE INDEX one_active_worktree_per_work_item ON worktrees(work_item_id)
  WHERE state IN ('RESERVED','PREPARED','ACTIVE');
CREATE UNIQUE INDEX one_active_delivery_per_work_item ON deliveries(work_item_id)
  WHERE state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS');
