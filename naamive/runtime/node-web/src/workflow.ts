import type pg from 'pg';
import { ApiError } from './service.js';

/** Interprets only published workflow data; business state names are never the runtime authority. */
export const transitionTarget = async (client: pg.PoolClient, projectId: string, trigger: string) => {
  const result = await client.query(`SELECT wt.to_state FROM projects p
    JOIN workflow_definitions wd ON wd.code=p.workflow_code AND wd.version=p.workflow_version AND wd.status='PUBLISHED'
    JOIN workflow_transitions wt ON wt.workflow_id=wd.id AND wt.from_state=p.state AND wt.trigger_code=$2
    WHERE p.id=$1`, [projectId, trigger]);
  if (!result.rowCount) throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  return result.rows[0].to_state as string;
};
