-- A delivery is intentionally retained as immutable audit history after its
-- queue row is pruned.  The job reference is optional and must not make normal
-- operational cleanup destructive or impossible.
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_job_id_fkey;
ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL;
