ALTER TABLE artifact_intents ADD COLUMN IF NOT EXISTS gate_id uuid;
ALTER TABLE artifact_intents ADD COLUMN IF NOT EXISTS storage_uri text;
ALTER TABLE artifact_intents ADD COLUMN IF NOT EXISTS schema_version integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS artifact_intents_reconciliation ON artifact_intents(status, created_at) WHERE status = 'RESERVED';
