-- Keep immutable recovery lineage compatible with an explicitly authorized
-- project purge. The decision owns its recovery operation; resource backrefs
-- are nullable historical pointers and must not create a deletion cycle.
ALTER TABLE operations DROP CONSTRAINT IF EXISTS operations_recovery_decision_id_fkey;
ALTER TABLE operations ADD CONSTRAINT operations_recovery_decision_id_fkey
  FOREIGN KEY(recovery_decision_id) REFERENCES recovery_decisions(id) ON DELETE SET NULL;
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_recovery_decision_id_fkey;
ALTER TABLE jobs ADD CONSTRAINT jobs_recovery_decision_id_fkey
  FOREIGN KEY(recovery_decision_id) REFERENCES recovery_decisions(id) ON DELETE SET NULL;
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_recovery_decision_id_fkey;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_recovery_decision_id_fkey
  FOREIGN KEY(recovery_decision_id) REFERENCES recovery_decisions(id) ON DELETE SET NULL;
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_origin_delivery_id_fkey;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_origin_delivery_id_fkey
  FOREIGN KEY(origin_delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_operation_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_operation_id_fkey
  FOREIGN KEY(operation_id) REFERENCES operations(id) ON DELETE CASCADE;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_attempt_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_attempt_id_fkey
  FOREIGN KEY(attempt_id) REFERENCES operations(id) ON DELETE SET NULL;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_job_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_job_id_fkey
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE SET NULL;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_delivery_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_delivery_id_fkey
  FOREIGN KEY(delivery_id) REFERENCES deliveries(id) ON DELETE SET NULL;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_worktree_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_worktree_id_fkey
  FOREIGN KEY(worktree_id) REFERENCES worktrees(id) ON DELETE SET NULL;
ALTER TABLE recovery_decisions DROP CONSTRAINT IF EXISTS recovery_decisions_integration_attempt_id_fkey;
ALTER TABLE recovery_decisions ADD CONSTRAINT recovery_decisions_integration_attempt_id_fkey
  FOREIGN KEY(integration_attempt_id) REFERENCES integration_attempts(id) ON DELETE SET NULL;
