-- F5-23 pendency 16: a module-plan retry must record the failed operation's origin
-- module revision directly on BOTH the new operations row and the new jobs row, so
-- lineage is directly queryable in the operational records (not only in the event
-- payload or the copied module_plan_job_context row). The pre-existing revision_id
-- column on operations/jobs references intake_revisions(id) (discovery-only) and is
-- NOT the module-planning origin revision; module_revision_id is the dedicated FK to
-- module_revisions(id) and is populated on retry (kept NULL for initial plan jobs).
ALTER TABLE operations ADD COLUMN IF NOT EXISTS module_revision_id uuid REFERENCES module_revisions(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS module_revision_id uuid REFERENCES module_revisions(id);
CREATE INDEX IF NOT EXISTS operations_module_revision_id_idx ON operations(module_revision_id);
CREATE INDEX IF NOT EXISTS jobs_module_revision_id_idx ON jobs(module_revision_id);
