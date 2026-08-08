import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { config } from './config.js';
import { withTransaction } from './db.js';
import { ContractValidationError, type TechnologyCatalogSeedPackage, type ValidatedTechnologyCatalogSeedPackage, validateTechnologyCatalogSeedPackage } from './technology-contracts.js';
import { evaluateCompatibility, type CompatibilityRuleInput } from './compatibility-evaluator.js';

export class CatalogPublicationError extends Error { constructor(readonly code: string, details: string) { super(details); } }
export type CatalogPublication = { revisionId: string; revisionNumber: number; contentHash: string; packageHash: string; published: boolean };

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).sort().join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
const sha256 = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');

const putPublicationEvidence = async (revisionNumber: number, packageHash: string, content: string) => {
  const storageKey = `catalog/revisions/${revisionNumber}/publication-${packageHash}.json`;
  const path = join(config().artifactRoot, storageKey);
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { encoding: 'utf8', flag: 'wx' });
  try { await rename(temporary, path); } catch (error: any) { if (error?.code !== 'EEXIST') throw error; }
  return { storageKey, storageUri: new URL(`file://${path}`).toString(), hash: createHash('sha256').update(content).digest('hex') };
};

export const catalogPackageHash = (seeds: ValidatedTechnologyCatalogSeedPackage): string => sha256({
  schema_version: seeds.categories.schema_version, catalog_revision: seeds.categories.catalog_revision,
  categories: seeds.categories.records, catalog_items: seeds.catalogItems.records, profiles: seeds.profiles.records,
  profile_items: seeds.profileItems.records, compatibility_rules: seeds.compatibilityRules.records,
  revision: seeds.catalogRevision.records.map(({ content_hash: _hash, published_by: _actor, ...record }) => record)
});

const semantic = (actual: Record<string, unknown>, expected: Record<string, unknown>, fields: string[]) => fields.every((field) => canonical(actual[field] ?? null) === canonical(expected[field] ?? null));
const one = <T>(items: T[], predicate: (item: T) => boolean, code: string, message: string): T => { const found = items.filter(predicate); if (found.length !== 1) throw new CatalogPublicationError(code, message); return found[0]; };

const validateSemantics = (s: ValidatedTechnologyCatalogSeedPackage): void => {
  const duplicate = (values: string[], label: string) => { if (new Set(values).size !== values.length) throw new CatalogPublicationError('SEED_DUPLICATE_CODE', `Duplicate ${label}`); };
  duplicate(s.categories.records.map((x) => x.code), 'category code'); duplicate(s.profiles.records.map((x) => x.code), 'profile code');
  duplicate(s.catalogItems.records.map((x) => `${x.category_code}/${x.code}`), 'catalog item code');
  for (const item of s.catalogItems.records) one(s.categories.records, (category) => category.code === item.category_code, 'CATEGORY_REFERENCE_UNRESOLVED', `Unknown category ${item.category_code}`);
  for (const profileItem of s.profileItems.records) {
    const profile = one(s.profiles.records, (x) => x.code === profileItem.profile_code, 'PROFILE_REFERENCE_UNRESOLVED', `Unknown profile ${profileItem.profile_code}`);
    const item = one(s.catalogItems.records, (x) => x.code === profileItem.catalog_item_code, 'ITEM_REFERENCE_UNRESOLVED', `Unknown catalog item ${profileItem.catalog_item_code}`);
    if (!item.is_active) throw new CatalogPublicationError('PROFILE_ITEM_INACTIVE', `Profile ${profile.code} references inactive item ${item.code}`);
    if ((item.metadata as any).version_governance === 'REQUIRED' && !profileItem.version_constraint) throw new CatalogPublicationError('PROFILE_VERSION_CONSTRAINT_REQUIRED', `Profile item ${item.code} requires a version constraint`);
  }
  duplicate(s.profileItems.records.map((x) => `${x.profile_code}/${x.catalog_item_code}`), 'profile item');
  for (const profile of s.profiles.records.filter((x) => x.is_active)) {
    const counts = new Map<string, number>();
    for (const item of s.profileItems.records.filter((x) => x.profile_code === profile.code)) {
      const catalog = one(s.catalogItems.records, (x) => x.code === item.catalog_item_code, 'ITEM_REFERENCE_UNRESOLVED', `Unknown catalog item ${item.catalog_item_code}`);
      counts.set(catalog.category_code, (counts.get(catalog.category_code) ?? 0) + 1);
    }
    for (const category of s.categories.records) { const count = counts.get(category.code) ?? 0; if (count < category.min_selections || (category.max_selections !== null && count > category.max_selections)) throw new CatalogPublicationError('PROFILE_CARDINALITY_INVALID', `Profile ${profile.code} violates cardinality for ${category.code}`); }
  }
  const normalizedRules = s.compatibilityRules.records.map((rule) => rule.relationship_type === 'CONFLICTS_WITH' && rule.source_item_code > rule.target_item_code ? { ...rule, source_item_code: rule.target_item_code, target_item_code: rule.source_item_code } : rule);
  duplicate(normalizedRules.map((x) => `${x.source_item_code}/${x.relationship_type}/${x.target_item_code}/${x.constraint_expression ?? ''}`), 'compatibility rule');
  for (const rule of s.compatibilityRules.records) { if (rule.source_item_code === rule.target_item_code) throw new CatalogPublicationError('COMPATIBILITY_SELF_REFERENCE', 'Compatibility rules require distinct items'); one(s.catalogItems.records, (x) => x.code === rule.source_item_code, 'RULE_SOURCE_UNRESOLVED', `Unknown source ${rule.source_item_code}`); one(s.catalogItems.records, (x) => x.code === rule.target_item_code, 'RULE_TARGET_UNRESOLVED', `Unknown target ${rule.target_item_code}`); }
  for (const profile of s.profiles.records.filter((x) => x.is_active)) {
    const selected = new Set(s.profileItems.records.filter((x) => x.profile_code === profile.code).map((x) => x.catalog_item_code));
    const codeToId = new Map(s.catalogItems.records.map((item, index) => [item.code, String(index)]));
    const evaluation = evaluateCompatibility([...selected].map((code) => ({ catalog_item_id: codeToId.get(code)! })), s.compatibilityRules.records.map((rule, index) => ({ ...rule, id: String(index), source_item_id: codeToId.get(rule.source_item_code)!, target_item_id: codeToId.get(rule.target_item_code)! } satisfies CompatibilityRuleInput)));
    const finding = evaluation.findings.find((item) => item.blocking);
    if (finding) throw new CatalogPublicationError('PROFILE_COMPATIBILITY_ERROR', finding.message);
  }
};

const assertCurrentSeedMatches = async (client: any, s: ValidatedTechnologyCatalogSeedPackage): Promise<void> => {
  for (const category of s.categories.records) { const row = (await client.query(`SELECT * FROM technology_categories WHERE code=$1`, [category.code])).rows[0]; if (!row || !semantic(row, category as any, ['code','name','description','selection_mode','min_selections','max_selections','is_active','display_order'])) throw new CatalogPublicationError('CATEGORY_SEMANTIC_CONFLICT', category.code); }
  for (const item of s.catalogItems.records) { const row = (await client.query(`SELECT i.* FROM technology_catalog_items i JOIN technology_categories c ON c.id=i.category_id WHERE c.code=$1 AND i.code=$2`, [item.category_code, item.code])).rows[0]; if (!row || !semantic(row, item as any, ['code','name','description','is_active','display_order','metadata'])) throw new CatalogPublicationError('CATALOG_ITEM_SEMANTIC_CONFLICT', item.code); }
  for (const profile of s.profiles.records) { const row = (await client.query(`SELECT * FROM technology_profiles WHERE code=$1`, [profile.code])).rows[0]; if (!row || !semantic(row, profile as any, ['code','name','description','is_active'])) throw new CatalogPublicationError('PROFILE_SEMANTIC_CONFLICT', profile.code); }
  for (const item of s.profileItems.records) { const row = (await client.query(`SELECT pi.* FROM technology_profile_items pi JOIN technology_profiles p ON p.id=pi.profile_id JOIN technology_catalog_items i ON i.id=pi.catalog_item_id WHERE p.code=$1 AND i.code=$2`, [item.profile_code, item.catalog_item_code])).rows[0]; if (!row || !semantic(row, item as any, ['classification','version_constraint','justification','display_order'])) throw new CatalogPublicationError('PROFILE_ITEM_SEMANTIC_CONFLICT', `${item.profile_code}/${item.catalog_item_code}`); }
};

export const loadCatalogSeedPackage = async (seedDirectory = join(process.cwd(), 'seeds', 'technology-catalog')): Promise<TechnologyCatalogSeedPackage> => {
  const load = async (name: string) => JSON.parse(await readFile(join(seedDirectory, name), 'utf8'));
  const [categories, catalogItems, profiles, profileItems, compatibilityRules, catalogRevision] = await Promise.all(['technology-categories.json','technology-catalog-items.json','technology-profiles.json','technology-profile-items.json','technology-compatibility-rules.json','technology-catalog-revision.json'].map(load));
  return { categories, catalogItems, profiles, profileItems, compatibilityRules, catalogRevision };
};

export const publishTechnologyCatalog = async (seedPackage: TechnologyCatalogSeedPackage, actor: string, correlationId: string): Promise<CatalogPublication> => {
  let seeds: ValidatedTechnologyCatalogSeedPackage;
  try { seeds = await validateTechnologyCatalogSeedPackage(seedPackage); } catch (error) { if (error instanceof ContractValidationError) throw new CatalogPublicationError(error.code, error.details); throw error; }
  validateSemantics(seeds);
  if (seeds.catalogRevision.records.length !== 1) throw new CatalogPublicationError('CATALOG_REVISION_SEED_INVALID', 'Exactly one catalog revision record is required');
  const revision = seeds.catalogRevision.records[0]; const packageHash = catalogPackageHash(seeds);
  if (revision.content_hash !== packageHash) throw new CatalogPublicationError('CATALOG_CONTENT_HASH_MISMATCH', 'Seed content_hash does not match canonical package content');
  return withTransaction(async (client) => {
    const existing = await client.query(`SELECT id,status,content_hash FROM technology_catalog_revisions WHERE revision_number=$1 FOR UPDATE`, [revision.catalog_revision]);
    if (existing.rowCount) { const row = existing.rows[0]; if (row.status === 'PUBLISHED' && row.content_hash === packageHash) { await assertCurrentSeedMatches(client, seeds); return { revisionId: row.id, revisionNumber: revision.catalog_revision, contentHash: packageHash, packageHash, published: false }; } throw new CatalogPublicationError('CATALOG_REVISION_CONFLICT', `Revision ${revision.catalog_revision} already exists with different hash or status`); }
    const categoryIds = new Map<string, string>(); const itemIds = new Map<string, string>(); const profileIds = new Map<string, string>();
    for (const category of seeds.categories.records) { const rows = await client.query(`SELECT * FROM technology_categories WHERE code=$1 FOR UPDATE`, [category.code]); if (rows.rowCount && !semantic(rows.rows[0], category as any, ['code','name','description','selection_mode','min_selections','max_selections','is_active','display_order'])) throw new CatalogPublicationError('CATEGORY_SEMANTIC_CONFLICT', category.code); const id = rows.rows[0]?.id ?? randomUUID(); if (!rows.rowCount) await client.query(`INSERT INTO technology_categories(id,code,name,description,selection_mode,min_selections,max_selections,is_active,display_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id,category.code,category.name,category.description ?? null,category.selection_mode,category.min_selections,category.max_selections,category.is_active,category.display_order]); categoryIds.set(category.code,id); }
    for (const item of seeds.catalogItems.records) { const categoryId = categoryIds.get(item.category_code)!; const rows = await client.query(`SELECT * FROM technology_catalog_items WHERE category_id=$1 AND code=$2 FOR UPDATE`, [categoryId,item.code]); if (rows.rowCount && !semantic(rows.rows[0], item as any, ['code','name','description','is_active','display_order','metadata'])) throw new CatalogPublicationError('CATALOG_ITEM_SEMANTIC_CONFLICT', item.code); const id=rows.rows[0]?.id ?? randomUUID(); if (!rows.rowCount) await client.query(`INSERT INTO technology_catalog_items(id,category_id,code,name,description,is_active,display_order,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,categoryId,item.code,item.name,item.description??null,item.is_active,item.display_order,item.metadata]); itemIds.set(item.code,id); }
    for (const profile of seeds.profiles.records) { const rows=await client.query(`SELECT * FROM technology_profiles WHERE code=$1 FOR UPDATE`,[profile.code]); if(rows.rowCount&&!semantic(rows.rows[0],profile as any,['code','name','description','is_active'])) throw new CatalogPublicationError('PROFILE_SEMANTIC_CONFLICT',profile.code); const id=rows.rows[0]?.id??randomUUID(); if(!rows.rowCount) await client.query(`INSERT INTO technology_profiles(id,code,name,description,is_active) VALUES($1,$2,$3,$4,$5)`,[id,profile.code,profile.name,profile.description??null,profile.is_active]); profileIds.set(profile.code,id); }
    for (const item of seeds.profileItems.records) { const profileId=profileIds.get(item.profile_code)!; const itemId=itemIds.get(item.catalog_item_code)!; const rows=await client.query(`SELECT * FROM technology_profile_items WHERE profile_id=$1 AND catalog_item_id=$2 FOR UPDATE`,[profileId,itemId]); if(rows.rowCount&&!semantic(rows.rows[0],item as any,['classification','version_constraint','justification','display_order'])) throw new CatalogPublicationError('PROFILE_ITEM_SEMANTIC_CONFLICT',`${item.profile_code}/${item.catalog_item_code}`); if(!rows.rowCount) await client.query(`INSERT INTO technology_profile_items(profile_id,catalog_item_id,classification,version_constraint,justification,display_order) VALUES($1,$2,$3,$4,$5,$6)`,[profileId,itemId,item.classification,item.version_constraint,item.justification??null,item.display_order]); }
    const ruleIds = new Map<string,string>(); for(const rule of seeds.compatibilityRules.records){const source=itemIds.get(rule.source_item_code)!;const target=itemIds.get(rule.target_item_code)!;const rows=await client.query(`SELECT * FROM technology_compatibility_rules WHERE source_item_id=$1 AND relationship_type=$2 AND target_item_id=$3 AND constraint_expression IS NOT DISTINCT FROM $4 FOR UPDATE`,[source,rule.relationship_type,target,rule.constraint_expression??null]);if(rows.rowCount&&!semantic(rows.rows[0],rule as any,['relationship_type','constraint_expression','severity','message','is_active']))throw new CatalogPublicationError('COMPATIBILITY_RULE_SEMANTIC_CONFLICT',rule.message);const id=rows.rows[0]?.id??randomUUID();if(!rows.rowCount)await client.query(`INSERT INTO technology_compatibility_rules(id,source_item_id,relationship_type,target_item_id,constraint_expression,severity,message,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,source,rule.relationship_type,target,rule.constraint_expression??null,rule.severity,rule.message,rule.is_active]);ruleIds.set(`${rule.source_item_code}/${rule.relationship_type}/${rule.target_item_code}/${rule.constraint_expression??''}`,id);}
    const revisionId=randomUUID(); await client.query(`INSERT INTO technology_catalog_revisions(id,revision_number,status,description,content_hash) VALUES($1,$2,'DRAFT',$3,$4)`,[revisionId,revision.catalog_revision,revision.description,packageHash]);
    for(const x of seeds.categories.records) await client.query(`INSERT INTO technology_catalog_revision_categories(revision_id,category_id,code,name,selection_mode,min_selections,max_selections,is_active,display_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[revisionId,categoryIds.get(x.code),x.code,x.name,x.selection_mode,x.min_selections,x.max_selections,x.is_active,x.display_order]);
    for(const x of seeds.catalogItems.records) await client.query(`INSERT INTO technology_catalog_revision_items(revision_id,catalog_item_id,category_id,code,name,description,is_active,display_order,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[revisionId,itemIds.get(x.code),categoryIds.get(x.category_code),x.code,x.name,x.description??null,x.is_active,x.display_order,x.metadata]);
    for(const x of seeds.profiles.records) await client.query(`INSERT INTO technology_catalog_revision_profiles(revision_id,profile_id,code,name,description,is_active) VALUES($1,$2,$3,$4,$5,$6)`,[revisionId,profileIds.get(x.code),x.code,x.name,x.description??null,x.is_active]);
    for(const x of seeds.profileItems.records) await client.query(`INSERT INTO technology_catalog_revision_profile_items(revision_id,profile_id,catalog_item_id,classification,version_constraint,justification,display_order) VALUES($1,$2,$3,$4,$5,$6,$7)`,[revisionId,profileIds.get(x.profile_code),itemIds.get(x.catalog_item_code),x.classification,x.version_constraint,x.justification??null,x.display_order]);
    for(const x of seeds.compatibilityRules.records) await client.query(`INSERT INTO technology_catalog_revision_compatibility_rules(revision_id,compatibility_rule_id,source_item_id,relationship_type,target_item_id,constraint_expression,severity,message,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[revisionId,ruleIds.get(`${x.source_item_code}/${x.relationship_type}/${x.target_item_code}/${x.constraint_expression??''}`),itemIds.get(x.source_item_code),x.relationship_type,itemIds.get(x.target_item_code),x.constraint_expression??null,x.severity,x.message,x.is_active]);
    const evidence={schema_version:seeds.categories.schema_version,revision_number:revision.catalog_revision,actor,correlation_id:correlationId,package_hash:packageHash,content_hash:packageHash}; const stored = await putPublicationEvidence(revision.catalog_revision, packageHash, JSON.stringify(evidence)); await client.query(`INSERT INTO technology_catalog_publication_evidence(revision_id,actor,correlation_id,package_hash,storage_key,storage_uri,sha256,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[revisionId,actor,correlationId,packageHash,stored.storageKey,stored.storageUri,stored.hash,evidence]); await client.query(`UPDATE technology_catalog_revisions SET status='PUBLISHED',published_at=clock_timestamp(),published_by=$2 WHERE id=$1`,[revisionId,actor]);
    return {revisionId,revisionNumber:revision.catalog_revision,contentHash:packageHash,packageHash,published:true};
  });
};
