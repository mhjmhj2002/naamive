-- Some early F6 rollout databases already contained the assurance tables.
-- Keep the migration additive so those installations receive the immutable
-- producer/reviewer linkage required by the durable dispatch implementation.
ALTER TABLE work_acceptances
  ADD COLUMN IF NOT EXISTS producer_identity jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE assurance_reviews
  ADD COLUMN IF NOT EXISTS dispatch_execution_id uuid REFERENCES agent_execution(id);

CREATE INDEX IF NOT EXISTS assurance_reviews_dispatch_execution
  ON assurance_reviews(dispatch_execution_id) WHERE dispatch_execution_id IS NOT NULL;
