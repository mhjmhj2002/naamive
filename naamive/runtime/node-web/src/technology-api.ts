import { randomUUID } from 'node:crypto';
import { withTransaction } from './db.js';
import { startTechnologyInventory } from './inventory.js';
import { createTechnologyBaselineDraft } from './baseline-draft.js';
import { ApiError } from './service.js';
import { assertNoFreeTechnologyFields, ContractValidationError, validateTechnologyBaselineRevisionPayload } from './technology-contracts.js';

const published = `SELECT id,revision_number,description,content_hash,published_at,published_by
  FROM technology_catalog_revisions WHERE status='PUBLISHED' ORDER BY published_at DESC,revision_number DESC LIMIT 1`;

const requireProject = async (client: any, projectId: string) => {
  const project = (await client.query('SELECT id FROM projects WHERE id=$1 FOR SHARE', [projectId])).rows[0];
  if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND');
};

export const listTechnologyCategories = async () => {
  const revision = (await (await import('./db.js')).pool.query(published)).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_CATALOG_PUBLISHED_REVISION_NOT_FOUND');
  const { pool } = await import('./db.js');
  const items = (await pool.query(`SELECT category_id AS id,code,name,selection_mode,min_selections,max_selections,is_active,display_order
    FROM technology_catalog_revision_categories WHERE revision_id=$1 AND is_active ORDER BY display_order,code`, [revision.id])).rows;
  return { catalog_revision: revision, items };
};

export const listTechnologyCatalogItems = async (categoryId: string | null, status: string | null) => {
  if (status && status !== 'ACTIVE') throw new ApiError(422, 'TECHNOLOGY_CATALOG_STATUS_INVALID');
  const { pool } = await import('./db.js'); const revision = (await pool.query(published)).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_CATALOG_PUBLISHED_REVISION_NOT_FOUND');
  const values: unknown[] = [revision.id]; let where = 'WHERE i.revision_id=$1';
  if (categoryId) { values.push(categoryId); where += ` AND i.category_id=$${values.length}`; }
  where += ' AND i.is_active AND c.is_active';
  const items = (await pool.query(`SELECT i.catalog_item_id AS id,i.category_id,i.code,i.name,i.description,i.is_active,i.display_order,i.metadata
    FROM technology_catalog_revision_items i JOIN technology_catalog_revision_categories c ON c.revision_id=i.revision_id AND c.category_id=i.category_id
    ${where} ORDER BY c.display_order,i.display_order,i.code`, values)).rows;
  return { catalog_revision: revision, items };
};

export const technologyCatalogRevision = async (revisionId: string) => {
  const { pool } = await import('./db.js');
  const revision = (await pool.query(`SELECT id,revision_number,status,description,content_hash,published_at,published_by FROM technology_catalog_revisions WHERE id=$1 AND status='PUBLISHED'`, [revisionId])).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_CATALOG_REVISION_NOT_FOUND');
  const [categories, items, profiles, profileItems, rules] = await Promise.all([
    pool.query('SELECT category_id AS id,code,name,selection_mode,min_selections,max_selections,is_active,display_order FROM technology_catalog_revision_categories WHERE revision_id=$1 ORDER BY display_order,code', [revisionId]),
    pool.query('SELECT catalog_item_id AS id,category_id,code,name,description,is_active,display_order,metadata FROM technology_catalog_revision_items WHERE revision_id=$1 ORDER BY display_order,code', [revisionId]),
    pool.query('SELECT profile_id AS id,code,name,description,is_active FROM technology_catalog_revision_profiles WHERE revision_id=$1 ORDER BY code', [revisionId]),
    pool.query('SELECT profile_id,catalog_item_id,classification,version_constraint,justification,display_order FROM technology_catalog_revision_profile_items WHERE revision_id=$1 ORDER BY profile_id,display_order', [revisionId]),
    pool.query('SELECT compatibility_rule_id AS id,source_item_id,relationship_type,target_item_id,constraint_expression,severity,message,is_active FROM technology_catalog_revision_compatibility_rules WHERE revision_id=$1 ORDER BY id', [revisionId])
  ]);
  return { ...revision, categories: categories.rows, catalog_items: items.rows, profiles: profiles.rows, profile_items: profileItems.rows, compatibility_rules: rules.rows };
};

const profiles = async (profileId?: string, status?: string | null) => {
  if (status && status !== 'ACTIVE') throw new ApiError(422, 'TECHNOLOGY_PROFILE_STATUS_INVALID');
  const { pool } = await import('./db.js'); const revision = (await pool.query(published)).rows[0];
  if (!revision) throw new ApiError(404, 'TECHNOLOGY_CATALOG_PUBLISHED_REVISION_NOT_FOUND');
  const params: unknown[] = [revision.id]; let where = 'WHERE p.revision_id=$1';
  if (profileId) { params.push(profileId); where += ` AND p.profile_id=$${params.length}`; }
  where += ' AND p.is_active';
  const result = await pool.query(`SELECT p.profile_id AS id,p.code,p.name,p.description,p.is_active FROM technology_catalog_revision_profiles p ${where} ORDER BY p.code`, params);
  const expanded = await Promise.all(result.rows.map(async profile => ({ ...profile,
    items: (await pool.query(`SELECT pi.catalog_item_id,pi.classification,pi.version_constraint,pi.justification,pi.display_order,
      i.category_id,i.code,i.name,i.description,i.is_active,i.metadata
      FROM technology_catalog_revision_profile_items pi JOIN technology_catalog_revision_items i ON i.revision_id=pi.revision_id AND i.catalog_item_id=pi.catalog_item_id
      WHERE pi.revision_id=$1 AND pi.profile_id=$2 ORDER BY pi.display_order,i.code`, [revision.id, profile.id])).rows,
    compatibility_rules: (await pool.query(`SELECT r.compatibility_rule_id AS id,r.source_item_id,r.relationship_type,r.target_item_id,r.constraint_expression,r.severity,r.message,r.is_active
      FROM technology_catalog_revision_compatibility_rules r WHERE r.revision_id=$1 AND r.is_active AND (r.source_item_id IN (SELECT catalog_item_id FROM technology_catalog_revision_profile_items WHERE revision_id=$1 AND profile_id=$2) OR r.target_item_id IN (SELECT catalog_item_id FROM technology_catalog_revision_profile_items WHERE revision_id=$1 AND profile_id=$2))`, [revision.id, profile.id])).rows
  })));
  if (profileId && !expanded[0]) throw new ApiError(404, 'TECHNOLOGY_PROFILE_NOT_FOUND');
  return profileId ? { catalog_revision: revision, ...expanded[0] } : { catalog_revision: revision, items: expanded };
};
export const listTechnologyProfiles = (status: string | null) => profiles(undefined, status);
export const technologyProfile = (profileId: string) => profiles(profileId);

export const technologyBaseline = async (projectId: string) => withTransaction(async client => {
  await requireProject(client, projectId);
  const baseline = (await client.query('SELECT * FROM technology_baselines WHERE project_key=$1', [projectId])).rows[0];
  const context = (await client.query(`SELECT * FROM technology_selection_contexts WHERE project_key=$1 ORDER BY created_at DESC LIMIT 1`, [projectId])).rows[0] ?? null;
  if (!baseline) return { baseline: null, selection_context: context, revisions: [], inventory: [] };
  const revisions = (await client.query(`SELECT r.*,COALESCE(json_agg(json_build_object('catalog_item_id',i.catalog_item_id,'classification',i.classification,'version_constraint',i.version_constraint,'reason',i.reason,'technology_profile_id',i.source_profile_id,'technology_compatibility_rule_id',i.compatibility_rule_id,'display_order',i.display_order) ORDER BY i.display_order) FILTER (WHERE i.id IS NOT NULL),'[]') AS items
    FROM technology_baseline_revisions r LEFT JOIN technology_baseline_revision_items i ON i.baseline_revision_id=r.id WHERE r.baseline_id=$1 GROUP BY r.id ORDER BY r.revision_number DESC`, [baseline.id])).rows;
  const inventory = (await client.query(`SELECT id,repository_sha,technology_catalog_revision_id,source_path,detector_code,confidence,resolution_result,catalog_item_id,created_at FROM technology_inventory WHERE project_key=$1 ORDER BY created_at DESC`, [projectId])).rows;
  const gates = (await client.query(`SELECT id,baseline_revision_id,status,version,decision,feedback,opened_at,decided_at
    FROM technology_baseline_gates WHERE project_key=$1 ORDER BY opened_at DESC`, [projectId])).rows;
  return { baseline, selection_context: context, revisions, inventory, gates };
});
export const technologySelectionContext = async (projectId: string) => withTransaction(async client => { await requireProject(client, projectId); const context = (await client.query(`SELECT * FROM technology_selection_contexts WHERE project_key=$1 ORDER BY created_at DESC LIMIT 1`, [projectId])).rows[0]; if (!context) throw new ApiError(404, 'TECHNOLOGY_SELECTION_CONTEXT_NOT_FOUND'); return context; });
export const requestTechnologyInventory = (projectId: string, key: string) => withTransaction(async client => { await requireProject(client, projectId); return startTechnologyInventory(client, projectId, key); });

export const createTechnologyBaselineRevision = async (projectId: string, body: Record<string, unknown>, key: string) => withTransaction(async client => {
  const prior = (await client.query('SELECT id FROM operations WHERE idempotency_key=$1 FOR SHARE', [key])).rows[0];
  if (prior) return { operation_id: prior.id, status: 'ACCEPTED' };
  try { assertNoFreeTechnologyFields(body); } catch (error) { if (error instanceof ContractValidationError) throw new ApiError(422, error.code); throw error; }
  const allowed = new Set(['selection_context_id', 'technology_catalog_revision_id', 'items', 'deferred_decisions']);
  if (Object.keys(body).some(key => !allowed.has(key))) throw new ApiError(422, 'TECHNOLOGY_BASELINE_REVISION_PAYLOAD_INVALID');
  const selectionContextId = typeof body.selection_context_id === 'string' ? body.selection_context_id : '';
  if (!selectionContextId) throw new ApiError(422, 'TECHNOLOGY_SELECTION_CONTEXT_REQUIRED');
  let payload: any;
  try { payload = await validateTechnologyBaselineRevisionPayload({ technology_catalog_revision_id: body.technology_catalog_revision_id, items: body.items, deferred_decisions: body.deferred_decisions ?? [] }); }
  catch (error) { if (error instanceof ContractValidationError) throw new ApiError(422, error.code); throw error; }
  const context = (await client.query(`SELECT id,technology_catalog_revision_id,technology_profile_id,status FROM technology_selection_contexts WHERE id=$1 AND project_key=$2 FOR SHARE`, [selectionContextId, projectId])).rows[0];
  if (!context || context.status !== 'READY') throw new ApiError(409, 'TECHNOLOGY_SELECTION_CONTEXT_INVALID');
  if (context.technology_catalog_revision_id !== payload.technology_catalog_revision_id) throw new ApiError(422, 'TECHNOLOGY_BASELINE_CONTEXT_CATALOG_MISMATCH');
  const catalog = (await client.query(`SELECT 1 FROM technology_catalog_revisions WHERE id=$1 AND status='PUBLISHED' FOR SHARE`, [payload.technology_catalog_revision_id])).rows[0];
  if (!catalog) throw new ApiError(422, 'TECHNOLOGY_BASELINE_CATALOG_NOT_PUBLISHED');
  for (const item of payload.items) {
    if (item.technology_profile_id) {
      const profile = (await client.query(`SELECT 1 FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND profile_id=$2 AND is_active`, [payload.technology_catalog_revision_id, item.technology_profile_id])).rows[0];
      if (!profile) throw new ApiError(422, 'TECHNOLOGY_BASELINE_PROFILE_INVALID');
    }
    if (item.technology_compatibility_rule_id) {
      const rule = (await client.query(`SELECT 1 FROM technology_catalog_revision_compatibility_rules WHERE revision_id=$1 AND compatibility_rule_id=$2 AND is_active AND ($3::uuid IN (source_item_id,target_item_id))`, [payload.technology_catalog_revision_id, item.technology_compatibility_rule_id, item.catalog_item_id])).rows[0];
      if (!rule) throw new ApiError(422, 'TECHNOLOGY_BASELINE_COMPATIBILITY_RULE_INVALID');
    }
  }
  const operationId = randomUUID(), correlationId = randomUUID();
  await client.query(`INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,workflow_code,workflow_version)
    SELECT $1,$2,'CREATE_TECHNOLOGY_BASELINE_DRAFT','RUNNING',$3,$4,workflow_code,workflow_version FROM projects WHERE id=$2`, [operationId, projectId, key, correlationId]);
  try {
    const created = await createTechnologyBaselineDraft(client, projectId, payload, selectionContextId);
    await client.query(`UPDATE operations SET status='SUCCEEDED',completed_at=clock_timestamp() WHERE id=$1`, [operationId]);
    return { ...created, operation_id: operationId, status: 'ACCEPTED' };
  }
  catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(422, error instanceof Error ? error.message : 'TECHNOLOGY_BASELINE_DRAFT_INVALID'); }
});
