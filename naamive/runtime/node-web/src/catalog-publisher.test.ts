import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

process.env.DATABASE_URL ??= 'postgres://unused:unused@127.0.0.1:1/unused';
process.env.NAAMIVE_ARTIFACT_STORE_URI ??= `file://${process.cwd()}/.catalog-publisher-tests`;
process.env.NAAMIVE_REPOSITORY_ROOTS ??= process.cwd();
process.env.NAAMIVE_OPERATOR_ID ??= 'catalog-publisher-tester';

if (process.env.NAAMIVE_REQUIRE_CATALOG_PUBLISHER_DATABASE === 'true' && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('unused'))) {
  throw new Error('DATABASE_URL is required for catalog publisher integration tests');
}
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('unused')) {
  test('catalog publisher integration requires DATABASE_URL', { skip: 'set DATABASE_URL' }, () => {});
} else {
  const { pool } = await import('./db.js');
  const { CatalogPublicationError, catalogPackageHash, loadCatalogSeedPackage, publishTechnologyCatalog } = await import('./catalog-publisher.js');
  const { validateTechnologyCatalogSeedPackage } = await import('./technology-contracts.js');
  const base = await loadCatalogSeedPackage();
  let revision = BigInt(Date.now()) * 100n;

  const packageFor = async (mutate?: (value: any) => void) => {
    const value: any = structuredClone(base);
    value.catalog_revision = Number(++revision);
    for (const key of ['categories', 'catalogItems', 'profiles', 'profileItems', 'compatibilityRules', 'catalogRevision']) value[key].catalog_revision = value.catalog_revision;
    value.catalogRevision.records[0].catalog_revision = value.catalog_revision;
    mutate?.(value);
    value.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(value));
    return value;
  };
  const expects = async (code: string, work: () => Promise<unknown>) => await assert.rejects(work, (error: unknown) => error instanceof CatalogPublicationError && error.code === code);
  const count = async (table: string, id: string) => Number((await pool.query(`SELECT count(*)::int AS count FROM ${table} WHERE revision_id=$1`, [id])).rows[0].count);

  test.after(async () => pool.end());

  test('publishes the initial snapshot, records evidence, and is idempotent', async () => {
    const seed = await packageFor();
    const first = await publishTechnologyCatalog(seed, 'catalog-test-actor', 'catalog-test-correlation');
    assert.equal(first.published, true);
    const revisionRow = (await pool.query(`SELECT status,content_hash,published_by FROM technology_catalog_revisions WHERE id=$1`, [first.revisionId])).rows[0];
    assert.deepEqual(revisionRow, { status: 'PUBLISHED', content_hash: first.contentHash, published_by: 'catalog-test-actor' });
    assert.equal(await count('technology_catalog_revision_categories', first.revisionId), seed.categories.records.length);
    assert.equal(await count('technology_catalog_revision_items', first.revisionId), seed.catalogItems.records.length);
    assert.equal(await count('technology_catalog_revision_profiles', first.revisionId), seed.profiles.records.length);
    assert.equal(await count('technology_catalog_revision_profile_items', first.revisionId), seed.profileItems.records.length);
    assert.equal(await count('technology_catalog_revision_compatibility_rules', first.revisionId), seed.compatibilityRules.records.length);
    const evidence = (await pool.query(`SELECT actor,correlation_id,package_hash,storage_key,storage_uri,sha256,evidence FROM technology_catalog_publication_evidence WHERE revision_id=$1`, [first.revisionId])).rows[0];
    assert.equal(evidence.actor, 'catalog-test-actor'); assert.equal(evidence.correlation_id, 'catalog-test-correlation'); assert.equal(evidence.package_hash, first.packageHash);
    assert.match(evidence.storage_key, /^catalog\/revisions\//); assert.match(evidence.storage_uri, /^file:/); assert.match(evidence.sha256, /^[a-f0-9]{64}$/); assert.equal(evidence.evidence.package_hash, first.packageHash);
    const second = await publishTechnologyCatalog(seed, 'catalog-test-actor', 'catalog-test-correlation');
    assert.equal(second.published, false); assert.equal(second.revisionId, first.revisionId); assert.equal(second.contentHash, first.contentHash);
    assert.equal(await count('technology_catalog_revision_items', first.revisionId), seed.catalogItems.records.length);
  });

  test('rejects a bad declared content hash and an existing revision with a different hash', async () => {
    const invalid = await packageFor(); invalid.catalogRevision.records[0].content_hash = 'f'.repeat(64);
    await expects('CATALOG_CONTENT_HASH_MISMATCH', () => publishTechnologyCatalog(invalid, 'actor', randomUUID()));
    const seed = await packageFor(); await publishTechnologyCatalog(seed, 'actor', randomUUID());
    const conflict: any = structuredClone(seed); conflict.categories.records[0].name = `${conflict.categories.records[0].name} changed`;
    conflict.catalogRevision.records[0].content_hash = catalogPackageHash(await validateTechnologyCatalogSeedPackage(conflict));
    await expects('CATALOG_REVISION_CONFLICT', () => publishTechnologyCatalog(conflict, 'actor', randomUUID()));
  });

  test('rejects unresolved category/item, inactive profile item, and missing required version', async () => {
    const missingCategory = await packageFor((x) => { x.catalogItems.records[0].category_code = 'UNKNOWN_CATEGORY'; });
    await expects('CATEGORY_REFERENCE_UNRESOLVED', () => publishTechnologyCatalog(missingCategory, 'actor', randomUUID()));
    const missingItem = await packageFor((x) => { x.profileItems.records[0].catalog_item_code = 'UNKNOWN_ITEM'; });
    await expects('ITEM_REFERENCE_UNRESOLVED', () => publishTechnologyCatalog(missingItem, 'actor', randomUUID()));
    const inactive = await packageFor((x) => { const item = x.catalogItems.records.find((i: any) => i.code === 'NODEJS_22'); item.is_active = false; });
    await expects('PROFILE_ITEM_INACTIVE', () => publishTechnologyCatalog(inactive, 'actor', randomUUID()));
    const version = await packageFor((x) => { x.profileItems.records.find((i: any) => i.catalog_item_code === 'NODEJS_22').version_constraint = null; });
    await expects('PROFILE_VERSION_CONSTRAINT_REQUIRED', () => publishTechnologyCatalog(version, 'actor', randomUUID()));
  });

  test('rejects profile cardinality violations', async () => {
    const min = await packageFor((x) => { const category = x.categories.records.find((c: any) => c.code === 'DATABASE'); category.min_selections = 2; category.max_selections = 2; });
    await expects('PROFILE_CARDINALITY_INVALID', () => publishTechnologyCatalog(min, 'actor', randomUUID()));
    const max = await packageFor((x) => { const category = x.categories.records.find((c: any) => c.code === 'TEST_STRATEGY'); category.max_selections = 1; });
    await expects('PROFILE_CARDINALITY_INVALID', () => publishTechnologyCatalog(max, 'actor', randomUUID()));
  });

  test('rejects active ERROR requires and conflicts-with rules', async () => {
    const requires = await packageFor((x) => { const rule = x.compatibilityRules.records[0]; rule.target_item_code = 'MYSQL'; });
    await expects('PROFILE_COMPATIBILITY_ERROR', () => publishTechnologyCatalog(requires, 'actor', randomUUID()));
    const conflicts = await packageFor((x) => { const rule = x.compatibilityRules.records[0]; rule.relationship_type = 'CONFLICTS_WITH'; rule.target_item_code = 'LAYERED_MODULES'; });
    await expects('PROFILE_COMPATIBILITY_ERROR', () => publishTechnologyCatalog(conflicts, 'actor', randomUUID()));
  });

  test('rolls back every catalog write when a snapshot insert fails', async () => {
    let rollbackCategory = ''; let rollbackItem = '';
    const seed = await packageFor((value) => {
      rollbackCategory = `ROLLBACK_CATEGORY_${value.catalog_revision}`;
      rollbackItem = `ROLLBACK_ITEM_${value.catalog_revision}`;
      value.categories.records.push({ code: rollbackCategory, name: 'Rollback category', selection_mode: 'MULTIPLE', min_selections: 0, max_selections: null, is_active: true, display_order: 999 });
      value.catalogItems.records.push({ category_code: rollbackCategory, code: rollbackItem, name: 'Rollback item', is_active: true, display_order: 1, metadata: { version_governance: 'UNMANAGED' } });
    });
    await pool.query(`CREATE OR REPLACE FUNCTION test_catalog_snapshot_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test snapshot failure'; END $$`);
    await pool.query(`CREATE TRIGGER test_catalog_snapshot_failure BEFORE INSERT ON technology_catalog_revision_categories FOR EACH ROW EXECUTE FUNCTION test_catalog_snapshot_failure()`);
    try { await assert.rejects(() => publishTechnologyCatalog(seed, 'actor', randomUUID())); }
    finally { await pool.query(`DROP TRIGGER IF EXISTS test_catalog_snapshot_failure ON technology_catalog_revision_categories`); await pool.query(`DROP FUNCTION IF EXISTS test_catalog_snapshot_failure()`); }
    const revisionRows = await pool.query(`SELECT count(*)::int AS count FROM technology_catalog_revisions WHERE revision_number=$1`, [seed.catalog_revision]);
    assert.equal(revisionRows.rows[0].count, 0);
    for (const table of ['technology_catalog_revision_categories', 'technology_catalog_revision_items', 'technology_catalog_revision_profiles', 'technology_catalog_revision_profile_items', 'technology_catalog_revision_compatibility_rules']) {
      const rows = await pool.query(`SELECT count(*)::int AS count FROM ${table} snapshot JOIN technology_catalog_revisions revision ON revision.id=snapshot.revision_id WHERE revision.revision_number=$1`, [seed.catalog_revision]);
      assert.equal(rows.rows[0].count, 0, `${table} must not retain a snapshot`);
    }
    const evidence = await pool.query(`SELECT count(*)::int AS count FROM technology_catalog_publication_evidence WHERE evidence->>'revision_number'=$1`, [String(seed.catalog_revision)]);
    assert.equal(evidence.rows[0].count, 0);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM technology_categories WHERE code=$1`, [rollbackCategory])).rows[0].count, 0);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM technology_catalog_items WHERE code=$1`, [rollbackItem])).rows[0].count, 0);
  });
}
