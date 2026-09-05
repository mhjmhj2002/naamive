-- v1 may have been published during a rolling deployment before its complete
-- decision consequences were materialized. Publish v2 instead of rewriting it.
WITH source(catalog) AS (
  SELECT jsonb_agg(jsonb_set(item,'{decisions}',(
    SELECT jsonb_object_agg(decision.key,decision.value || jsonb_build_object(
      'consequence',coalesce(decision.value->>'consequence',format('Registra a decisão %s.',decision.key)),
      'continuation',coalesce(decision.value->>'continuation',format('Continua para %s conforme o workflow publicado.',decision.value->>'next_state'))
    )) FROM jsonb_each(item->'decisions') AS decision(key,value)
  )) ORDER BY item->>'code')
  FROM gate_catalog_publications p CROSS JOIN LATERAL jsonb_array_elements(p.catalog) item
  WHERE p.version=1 AND p.status='PUBLISHED'
)
INSERT INTO gate_catalog_publications(version,status,catalog,content_hash)
SELECT 2,'PUBLISHED',catalog,encode(sha256(convert_to(catalog::text,'UTF8')),'hex') FROM source
ON CONFLICT(version) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM gate_catalog_publications WHERE version=2 AND status='PUBLISHED') THEN
    RAISE EXCEPTION 'GATE_CATALOG_V2_PUBLICATION_MISSING';
  END IF;
END $$;
