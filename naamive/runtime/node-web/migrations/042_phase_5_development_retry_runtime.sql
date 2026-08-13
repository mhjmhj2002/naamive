-- A delivery may have historical terminal jobs and one current retry job.
-- Preserve the former for audit while prohibiting concurrent executable jobs.
DROP INDEX IF EXISTS one_development_job_per_delivery;
CREATE UNIQUE INDEX one_active_development_job_per_delivery ON jobs(delivery_id)
  WHERE kind='DEVELOP_WORK_ITEM' AND status IN ('PENDING','RETRYABLE','LEASED');
