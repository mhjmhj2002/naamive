-- TST-01/LR-02 corrective compatibility: an obligation always describes the
-- current revision of its materialized module. The 063 guard remains strict;
-- this migration repairs historical pointers and preserves the invariant when
-- any later module revision becomes current.

UPDATE committed_module_obligations AS obligation
SET materialized_module_revision_id=module.current_revision_id
FROM modules AS module
WHERE obligation.materialized_module_id=module.id
  AND obligation.materialized_module_revision_id IS DISTINCT FROM module.current_revision_id;

CREATE OR REPLACE FUNCTION synchronize_committed_obligation_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.current_revision_id IS DISTINCT FROM OLD.current_revision_id THEN
    UPDATE committed_module_obligations
    SET materialized_module_revision_id=NEW.current_revision_id
    WHERE materialized_module_id=NEW.id
      AND materialized_module_revision_id IS DISTINCT FROM NEW.current_revision_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER modules_committed_obligation_revision_sync
AFTER UPDATE OF current_revision_id ON modules
FOR EACH ROW
WHEN (OLD.current_revision_id IS DISTINCT FROM NEW.current_revision_id)
EXECUTE FUNCTION synchronize_committed_obligation_revision();
