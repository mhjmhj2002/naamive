-- v2+ gate records are self-contained historical facts: a later publication
-- cannot change the authority or effect used by an already opened gate.
CREATE OR REPLACE FUNCTION enforce_gate_catalog_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE published_hash text;
BEGIN
  IF NEW.catalog_version >= 2 THEN
    SELECT content_hash INTO published_hash FROM gate_catalog_publications WHERE version=NEW.catalog_version;
    IF published_hash IS NULL OR NEW.catalog_hash IS NULL OR NEW.catalog_hash<>published_hash
      OR NEW.catalog_contract IS NULL OR jsonb_typeof(NEW.catalog_contract)<>'object' THEN
      RAISE EXCEPTION 'GATE_CATALOG_SNAPSHOT_REQUIRED' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gate_records_catalog_snapshot_guard ON gate_records;
CREATE TRIGGER gate_records_catalog_snapshot_guard
BEFORE INSERT OR UPDATE OF catalog_version,catalog_hash,catalog_contract ON gate_records
FOR EACH ROW EXECUTE FUNCTION enforce_gate_catalog_snapshot();
