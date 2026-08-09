import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { config } from './config.js';
import { evaluateBaselineCardinality } from './cardinality-validator.js';
import { evaluateCompatibility } from './compatibility-evaluator.js';
import { validateTechnologyBaselineRevisionPayload } from './technology-contracts.js';

/** Creates the immutable, profile-expanded first draft for a v3 project. */
export const createTechnologyBaselineDraft = async (client: pg.PoolClient, projectId: string) => {
  const project = (await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`, [projectId])).rows[0];
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  if (project.archived_at || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3 || project.state !== 'TECHNOLOGY_BASELINE_IN_REVIEW') throw new Error('TECHNOLOGY_BASELINE_DRAFT_STATE_INVALID');
  const context = (await client.query(`SELECT * FROM technology_selection_contexts WHERE project_key=$1 AND status='READY' ORDER BY created_at DESC LIMIT 1 FOR SHARE`, [projectId])).rows[0];
  if (!context) throw new Error('TECHNOLOGY_BASELINE_DRAFT_SELECTION_CONTEXT_REQUIRED');
  const catalog = (await client.query(`SELECT id FROM technology_catalog_revisions WHERE id=$1 AND status='PUBLISHED' FOR SHARE`, [context.technology_catalog_revision_id])).rows[0];
  if (!catalog) throw new Error('TECHNOLOGY_BASELINE_DRAFT_PUBLISHED_CATALOG_REQUIRED');
  const profile = (await client.query(`SELECT profile_id FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND profile_id=$2 AND is_active FOR SHARE`, [context.technology_catalog_revision_id, context.technology_profile_id])).rows[0];
  if (!profile) throw new Error('TECHNOLOGY_BASELINE_DRAFT_PROFILE_INVALID');
  const inventoryJob = (await client.query(`SELECT j.id FROM jobs j JOIN operations o ON o.id=j.operation_id WHERE j.project_id=$1 AND j.kind='START_TECHNOLOGY_INVENTORY' AND j.status='COMPLETED' AND o.status='SUCCEEDED' ORDER BY j.completed_at DESC LIMIT 1 FOR SHARE`, [projectId])).rows[0];
  if (!inventoryJob) throw new Error('TECHNOLOGY_BASELINE_DRAFT_INVENTORY_REQUIRED');
  const inventory = (await client.query(`SELECT id FROM technology_inventory WHERE project_key=$1 AND job_id=$2 AND technology_catalog_revision_id=$3 ORDER BY created_at DESC LIMIT 1`, [projectId, inventoryJob.id, context.technology_catalog_revision_id])).rows[0];
  const rows = (await client.query(`SELECT pi.catalog_item_id,pi.classification,pi.version_constraint,pi.justification,pi.display_order,
      i.category_id,i.is_active,i.metadata,c.is_active AS category_active
    FROM technology_catalog_revision_profile_items pi
    JOIN technology_catalog_revision_items i ON i.revision_id=pi.revision_id AND i.catalog_item_id=pi.catalog_item_id
    JOIN technology_catalog_revision_categories c ON c.revision_id=i.revision_id AND c.category_id=i.category_id
    WHERE pi.revision_id=$1 AND pi.profile_id=$2 ORDER BY pi.display_order,pi.catalog_item_id`, [context.technology_catalog_revision_id, context.technology_profile_id])).rows;
  if (!rows.length || rows.some((row: any) => !row.is_active || !row.category_active)) throw new Error('TECHNOLOGY_BASELINE_DRAFT_PROFILE_ITEM_INVALID');
  const items = rows.map((row: any) => ({ catalog_item_id: row.catalog_item_id, classification: row.classification, version_constraint: row.version_constraint, reason: row.justification?.trim() || 'Expanded from the approved technology profile.', technology_profile_id: context.technology_profile_id }));
  if (rows.some((row: any) => row.metadata?.version_governance === 'REQUIRED' && !row.version_constraint)) throw new Error('TECHNOLOGY_BASELINE_DRAFT_VERSION_CONSTRAINT_REQUIRED');
  if (rows.some((row: any) => row.metadata?.version_governance !== 'REQUIRED' && row.metadata?.version_governance !== 'UNMANAGED')) throw new Error('TECHNOLOGY_BASELINE_DRAFT_VERSION_GOVERNANCE_INVALID');
  const payload = await validateTechnologyBaselineRevisionPayload({ technology_catalog_revision_id: context.technology_catalog_revision_id, items, deferred_decisions: [] });
  const categories = (await client.query(`SELECT category_id AS id,code,name,selection_mode,min_selections,max_selections,is_active,display_order FROM technology_catalog_revision_categories WHERE revision_id=$1 AND is_active`, [context.technology_catalog_revision_id])).rows;
  const cardinality = evaluateBaselineCardinality(payload, categories, rows.map((row: any) => ({ id: row.catalog_item_id, category_id: row.category_id })));
  if (!cardinality.valid) throw new Error(`TECHNOLOGY_BASELINE_DRAFT_CARDINALITY_INVALID:${cardinality.findings[0].code}`);
  const rules = (await client.query(`SELECT compatibility_rule_id AS id,source_item_id,relationship_type,target_item_id,constraint_expression,severity,message,is_active FROM technology_catalog_revision_compatibility_rules WHERE revision_id=$1 AND is_active`, [context.technology_catalog_revision_id])).rows;
  const compatibility = evaluateCompatibility(items, rules);
  if (compatibility.blocking) throw new Error(`TECHNOLOGY_BASELINE_DRAFT_COMPATIBILITY_INVALID:${compatibility.findings.find(x => x.blocking)?.code}`);
  const existing = await client.query(`SELECT id FROM technology_baselines WHERE project_key=$1 FOR UPDATE`, [projectId]);
  if (existing.rowCount) throw new Error('TECHNOLOGY_BASELINE_DRAFT_ALREADY_EXISTS');
  const baselineId = randomUUID(), revisionId = randomUUID(), correlationId = randomUUID();
  await client.query(`INSERT INTO technology_baselines(id,project_id,project_key) VALUES($1,$2,$3)`, [baselineId, projectId, projectId]);
  await client.query(`INSERT INTO technology_baseline_revisions(id,baseline_id,project_id,project_key,technology_catalog_revision_id,selection_context_id,inventory_id,revision_number,status,payload,schema_version,actor,correlation_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,1,'DRAFT',$8,'technology-baseline/v1',$9,$10)`, [revisionId, baselineId, projectId, projectId, context.technology_catalog_revision_id, context.id, inventory?.id ?? null, payload, config().operatorId, correlationId]);
  for (const [index, item] of items.entries()) await client.query(`INSERT INTO technology_baseline_revision_items(id,baseline_revision_id,technology_catalog_revision_id,catalog_item_id,classification,version_constraint,reason,source_profile_id,display_order)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [randomUUID(), revisionId, context.technology_catalog_revision_id, item.catalog_item_id, item.classification, item.version_constraint ?? null, item.reason, context.technology_profile_id, index]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,revision_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TECHNOLOGY_BASELINE_DRAFT_CREATED',$2,$3,$4,$5,$6,$7)`, [projectId, correlationId, revisionId, { baseline_id: baselineId, technology_catalog_revision_id: context.technology_catalog_revision_id, selection_context_id: context.id }, config().operatorId, project.workflow_code, project.workflow_version]);
  return { baselineId, revisionId, technologyCatalogRevisionId: context.technology_catalog_revision_id };
};
