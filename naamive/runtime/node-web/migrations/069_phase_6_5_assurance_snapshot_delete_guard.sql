-- AUT-03 audit follow-up: a dispatch snapshot is normative historical evidence.
-- Migration 068 already guards UPDATE; this migration closes ordinary DELETE
-- without altering the applied historical migration.
CREATE OR REPLACE FUNCTION prevent_assurance_expansion_snapshot_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ASSURANCE_DISPATCH_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514';
END $$;

CREATE TRIGGER assurance_dispatch_snapshot_no_delete
BEFORE DELETE ON assurance_dispatch_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_assurance_expansion_snapshot_delete();
