-- Development is not an HTTP side effect.  Its worker lease is attached to the
-- delivery rather than to an intake revision (which belongs only to discovery).
ALTER TABLE jobs ALTER COLUMN revision_id DROP NOT NULL;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivery_id uuid REFERENCES deliveries(id);
CREATE UNIQUE INDEX IF NOT EXISTS one_development_job_per_delivery ON jobs(delivery_id) WHERE kind='DEVELOP_WORK_ITEM';

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS job_id uuid REFERENCES jobs(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS changed_paths jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS phase_before_sha text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS phase_head_sha text;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rework_diff jsonb NOT NULL DEFAULT '[]'::jsonb;
