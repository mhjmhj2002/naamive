import { pool } from './db.js';
const report=await pool.query(`SELECT subject_type,subject_id,rule_code,details,reported_at FROM runtime_legacy_report ORDER BY id`);
if(report.rowCount){console.error(JSON.stringify({runtime_legacy_report:report.rows}));await pool.end();process.exitCode=1;}else{for(const name of ['jobs_development_delivery_required','deliveries_worktree_required','artifacts_metadata_runtime_contract'])await pool.query(`ALTER TABLE ${name.startsWith('jobs_')?'jobs':name.startsWith('deliveries_')?'deliveries':'artifacts'} VALIDATE CONSTRAINT ${name}`);await pool.end();}
