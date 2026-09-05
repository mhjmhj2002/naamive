-- MIG-FIX-01: publication version is the historical identity. Equal immutable
-- catalogs may legitimately have equal content hashes across versions (the
-- current fresh 049/051 chain is exactly such a case), so content_hash is an
-- indexed content identity rather than a globally unique publication identity.
ALTER TABLE gate_catalog_publications
  DROP CONSTRAINT IF EXISTS gate_catalog_publications_content_hash_key;

CREATE INDEX IF NOT EXISTS gate_catalog_publications_content_hash
  ON gate_catalog_publications(content_hash);
