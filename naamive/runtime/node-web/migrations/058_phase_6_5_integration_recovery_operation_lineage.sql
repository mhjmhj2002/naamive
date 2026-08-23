-- REC-01: retain the operation that authorized an integration side effect so
-- reconciliation can close that original operation without inventing a new
-- business effect or relying on ephemeral logs.
ALTER TABLE integration_attempts
  ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES operations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS integration_attempts_operation_id_idx
  ON integration_attempts(operation_id) WHERE operation_id IS NOT NULL;
