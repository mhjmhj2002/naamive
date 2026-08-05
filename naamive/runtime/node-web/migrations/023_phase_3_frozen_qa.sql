-- QA must be replayable against the contract that initiated a delivery, not a
-- subsequently edited work-item payload.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS qa_matrix jsonb NOT NULL DEFAULT '[]'::jsonb;
