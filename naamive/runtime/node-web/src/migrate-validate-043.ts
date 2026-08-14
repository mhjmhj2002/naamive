import { pool } from './db.js';
// Migration 043 deliberately does not repair legacy data.  Recompute its
// report here: validation must never succeed merely because the migration was
// applied before a later legacy import or manual data repair.
await pool.query(`INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'JOB',j.id,'DEVELOPMENT_DELIVERY_MISSING','{}'::jsonb FROM jobs j
 WHERE j.kind='DEVELOP_WORK_ITEM' AND j.delivery_id IS NULL ON CONFLICT DO NOTHING`);
await pool.query(`INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'DELIVERY',d.id,'ACTIVE_DELIVERY_WORKTREE_MISSING',jsonb_build_object('state',d.state) FROM deliveries d
 WHERE d.state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS','EVIDENCE_REVIEW','QA_IN_PROGRESS','QA_APPROVED','QA_REJECTED') AND d.worktree_id IS NULL ON CONFLICT DO NOTHING`);
await pool.query(`INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'JOB',j.id,'DEVELOPMENT_RELATION_CROSSED',jsonb_build_object('delivery_work_item_id',d.work_item_id) FROM jobs j JOIN deliveries d ON d.id=j.delivery_id
 WHERE j.kind='DEVELOP_WORK_ITEM' AND j.project_id<>d.project_id ON CONFLICT DO NOTHING`);
await pool.query(`INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'DELIVERY',d.id,'DELIVERY_WORKTREE_RELATION_CROSSED',jsonb_build_object('worktree_work_item_id',t.work_item_id)
 FROM deliveries d JOIN worktrees t ON t.id=d.worktree_id
 WHERE t.project_id<>d.project_id OR t.work_item_id<>d.work_item_id ON CONFLICT DO NOTHING`);
const report=await pool.query(`SELECT subject_type,subject_id,rule_code,details,reported_at FROM runtime_legacy_report ORDER BY id`);
if(report.rowCount){console.error(JSON.stringify({runtime_legacy_report:report.rows}));await pool.end();process.exitCode=1;}else{for(const name of ['jobs_development_delivery_required','deliveries_worktree_required','artifacts_metadata_runtime_contract'])await pool.query(`ALTER TABLE ${name.startsWith('jobs_')?'jobs':name.startsWith('deliveries_')?'deliveries':'artifacts'} VALIDATE CONSTRAINT ${name}`);await pool.end();}
