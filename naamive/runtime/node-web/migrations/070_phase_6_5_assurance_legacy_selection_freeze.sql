-- A NOT_SELECTED AUT-03 snapshot still needs a frozen reference to the
-- applicable pre-existing AUT-02/F6 policy.  It prevents a later expansion
-- publication from being captured by crash/replay fallback.
ALTER TABLE assurance_dispatch_snapshots
  ADD COLUMN legacy_policy_id uuid,
  ADD COLUMN legacy_policy_version integer,
  ADD CONSTRAINT assurance_dispatch_snapshots_legacy_policy_pair
    CHECK ((legacy_policy_id IS NULL AND legacy_policy_version IS NULL) OR
           (legacy_policy_id IS NOT NULL AND legacy_policy_version IS NOT NULL)),
  ADD CONSTRAINT assurance_dispatch_snapshots_legacy_policy_fk
    FOREIGN KEY (legacy_policy_id,legacy_policy_version) REFERENCES assurance_policies(id,version);

CREATE OR REPLACE FUNCTION prevent_assurance_expansion_snapshot_legacy_policy_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.legacy_policy_id IS DISTINCT FROM OLD.legacy_policy_id OR
     NEW.legacy_policy_version IS DISTINCT FROM OLD.legacy_policy_version
  THEN RAISE EXCEPTION 'ASSURANCE_DISPATCH_SNAPSHOT_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assurance_dispatch_snapshot_legacy_policy_immutable
BEFORE UPDATE ON assurance_dispatch_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_assurance_expansion_snapshot_legacy_policy_mutation();
