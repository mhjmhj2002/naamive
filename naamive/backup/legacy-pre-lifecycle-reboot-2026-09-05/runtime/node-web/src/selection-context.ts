import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import { putArtifact } from './artifacts.js';
import { config } from './config.js';
import { transitionTarget } from './workflow.js';

/** Prepares a context solely from the published, frozen catalog revision. */
export const prepareTechnologySelectionContext = async (client: pg.PoolClient, job: any) => {
  const correlationId = (await client.query(`SELECT correlation_id FROM operations WHERE id=$1`, [job.operation_id])).rows[0]?.correlation_id;
  if (!correlationId) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_CORRELATION_REQUIRED');
  const project = (await client.query(`SELECT * FROM projects WHERE id=$1 FOR UPDATE`, [job.project_id])).rows[0];
  if (!project || project.archived_at || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3 || project.state !== 'TECHNOLOGY_SELECTION_PREPARING') throw new Error('TECHNOLOGY_SELECTION_CONTEXT_STATE_INVALID');
  const predecessorId = job.technology_baseline_revision_id ?? null;
  if (predecessorId) {
    const predecessor = (await client.query(`SELECT id FROM technology_baseline_revisions WHERE id=$1 AND project_id=$2 AND status IN ('APPROVED','REJECTED') FOR SHARE`, [predecessorId, project.id])).rows[0];
    if (!predecessor) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_PREDECESSOR_INVALID');
  }
  // A selectable publication must contain a frozen active profile; malformed
  // historical publications are never silently used as a baseline snapshot.
  const revision = (await client.query(`SELECT r.id,r.revision_number,r.content_hash FROM technology_catalog_revisions r
    WHERE r.status='PUBLISHED' AND EXISTS (SELECT 1 FROM technology_catalog_revision_profiles p WHERE p.revision_id=r.id AND p.is_active)
    ORDER BY r.revision_number DESC LIMIT 1 FOR SHARE`)).rows[0];
  if (!revision) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_PUBLISHED_REVISION_REQUIRED');
  const profiles = (await client.query(`SELECT profile_id,code FROM technology_catalog_revision_profiles WHERE revision_id=$1 AND is_active ORDER BY code`, [revision.id])).rows;
  if (profiles.length !== 1) throw new Error(profiles.length ? 'TECHNOLOGY_SELECTION_CONTEXT_PROFILE_AMBIGUOUS' : 'TECHNOLOGY_SELECTION_CONTEXT_ACTIVE_PROFILE_REQUIRED');
  const profile = profiles[0];
  const items = (await client.query(`SELECT pi.catalog_item_id,pi.classification,pi.version_constraint,pi.justification,pi.display_order,i.code
    FROM technology_catalog_revision_profile_items pi
    JOIN technology_catalog_revision_items i ON i.revision_id=pi.revision_id AND i.catalog_item_id=pi.catalog_item_id
    JOIN technology_catalog_revision_categories c ON c.revision_id=i.revision_id AND c.category_id=i.category_id
    WHERE pi.revision_id=$1 AND pi.profile_id=$2 AND i.is_active AND c.is_active ORDER BY pi.display_order,i.code`, [revision.id, profile.profile_id])).rows;
  const total = await client.query(`SELECT count(*)::int AS n FROM technology_catalog_revision_profile_items WHERE revision_id=$1 AND profile_id=$2`, [revision.id, profile.profile_id]);
  if (!items.length || items.length !== total.rows[0].n) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_PROFILE_ITEM_INVALID');
  const rules = (await client.query(`SELECT r.compatibility_rule_id,r.source_item_id,r.relationship_type,r.target_item_id,r.constraint_expression,r.severity,r.message
    FROM technology_catalog_revision_compatibility_rules r
    JOIN technology_catalog_revision_items source ON source.revision_id=r.revision_id AND source.catalog_item_id=r.source_item_id
    JOIN technology_catalog_revision_items target ON target.revision_id=r.revision_id AND target.catalog_item_id=r.target_item_id
    WHERE r.revision_id=$1 AND r.is_active AND source.is_active AND target.is_active AND r.source_item_id<>r.target_item_id
    ORDER BY r.compatibility_rule_id`, [revision.id])).rows;
  const ruleTotal = await client.query(`SELECT count(*)::int AS n FROM technology_catalog_revision_compatibility_rules WHERE revision_id=$1 AND is_active`, [revision.id]);
  if (rules.length !== ruleTotal.rows[0].n) throw new Error('TECHNOLOGY_SELECTION_CONTEXT_COMPATIBILITY_RULE_INVALID');
  const snapshot = { schema_version: 1, project_id: project.id, technology_catalog_revision_id: revision.id, technology_catalog_revision_number: revision.revision_number, technology_profile_id: profile.profile_id, profile_items: items, compatibility_rules: rules, actor: config().operatorId, correlation_id: correlationId };
  const hash = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  const contextId = randomUUID();
  await client.query(`UPDATE technology_selection_contexts SET status='SUPERSEDED',updated_at=clock_timestamp() WHERE project_key=$1 AND status='READY'`, [project.id]);
  await client.query(`INSERT INTO technology_selection_contexts(id,project_id,project_key,technology_catalog_revision_id,technology_profile_id,hash,status,actor,correlation_id,supersedes_baseline_revision_id)
    VALUES($1,$2,$3,$4,$5,$6,'PREPARING',$7,$8,$9)`, [contextId, project.id, project.id, revision.id, profile.profile_id, hash, config().operatorId, correlationId, predecessorId]);
  const artifact = await putArtifact(client, project.id, 'technology-selection-context', JSON.stringify({ ...snapshot, selection_context_id: contextId, hash }), job.id);
  const target = await transitionTarget(client, project.id, 'PREPARE_TECHNOLOGY_SELECTION_CONTEXT');
  await client.query(`UPDATE technology_selection_contexts SET status='READY',updated_at=clock_timestamp() WHERE id=$1`, [contextId]);
  await client.query(`UPDATE projects SET state=$2,updated_at=clock_timestamp() WHERE id=$1`, [project.id, target]);
  await client.query(`INSERT INTO events(project_id,event_type,correlation_id,operation_id,job_id,payload,actor_id,workflow_code,workflow_version)
    VALUES($1,'TECHNOLOGY_SELECTION_CONTEXT_READY',$2,$3,$4,$5,$6,$7,$8)`, [project.id, correlationId, job.operation_id, job.id, { summary: 'Contexto de seleção tecnológica preparado.', selection_context_id: contextId, technology_catalog_revision_id: revision.id, evidence_hash: artifact.hash, next_action: 'Solicitar o inventário tecnológico.' }, config().operatorId, project.workflow_code, project.workflow_version]);
  return { contextId, revisionId: revision.id };
};
