import type { PoolClient } from 'pg';

export const GATE_CATALOG_V2_MIGRATION='051_phase_6_5_gate_catalog_v2.sql';
export const GATE_CATALOG_COMPLETE_V1_HASH='732b7a49823abed5e1d512686e72c02a47ce0fa375125f1bcfa2cabf4ffadca7';

/**
 * Migration 049 has existed in two historical forms. The current file already
 * materializes the complete decision effects which 051 publishes as v2. On a
 * fresh chain both publications therefore have the certified hash above, while
 * 049's original UNIQUE(content_hash) prevents 051 from recording version 2.
 *
 * This compatibility is intentionally limited to 051, the exact migration
 * lineage, the known complete catalog hash, and proof that 051's transform is a
 * no-op. It changes only the over-strong cross-version uniqueness constraint;
 * 051 itself still executes and is tracked by the normal runner.
 */
export const prepareHistoricalMigrationCompatibility=async(client:Pick<PoolClient,'query'>,file:string):Promise<boolean>=>{
  if(file!==GATE_CATALOG_V2_MIGRATION)return false;
  const state=(await client.query(`WITH transformed(catalog) AS (
      SELECT jsonb_agg(jsonb_set(item,'{decisions}',(
        SELECT jsonb_object_agg(decision.key,decision.value || jsonb_build_object(
          'consequence',coalesce(decision.value->>'consequence',format('Registra a decisão %s.',decision.key)),
          'continuation',coalesce(decision.value->>'continuation',format('Continua para %s conforme o workflow publicado.',decision.value->>'next_state'))
        )) FROM jsonb_each(item->'decisions') AS decision(key,value)
      )) ORDER BY item->>'code')
      FROM gate_catalog_publications p CROSS JOIN LATERAL jsonb_array_elements(p.catalog) item
      WHERE p.version=1 AND p.status='PUBLISHED'
    )
    SELECT p.content_hash,
      p.content_hash=encode(sha256(convert_to(p.catalog::text,'UTF8')),'hex') AS hash_valid,
      transformed.catalog=p.catalog AS transform_is_noop,
      EXISTS(SELECT 1 FROM schema_migrations WHERE version='049_phase_6_5_gate_catalog.sql') AS has_049,
      EXISTS(SELECT 1 FROM schema_migrations WHERE version='050_phase_6_5_gate_catalog_snapshots.sql') AS has_050,
      NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version=$1) AS lacks_051,
      NOT EXISTS(SELECT 1 FROM gate_catalog_publications WHERE version=2) AS lacks_v2,
      EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='gate_catalog_publications'::regclass AND conname='gate_catalog_publications_content_hash_key' AND contype='u') AS has_legacy_unique
    FROM gate_catalog_publications p CROSS JOIN transformed WHERE p.version=1 AND p.status='PUBLISHED'`,[GATE_CATALOG_V2_MIGRATION])).rows[0];
  const certified=state?.content_hash===GATE_CATALOG_COMPLETE_V1_HASH&&state.hash_valid===true&&state.transform_is_noop===true&&state.has_049===true&&state.has_050===true&&state.lacks_051===true&&state.lacks_v2===true&&state.has_legacy_unique===true;
  if(!certified)return false;
  await client.query(`ALTER TABLE gate_catalog_publications DROP CONSTRAINT gate_catalog_publications_content_hash_key`);
  return true;
};
