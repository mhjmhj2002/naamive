import type pg from 'pg';
import { ApiError } from './service.js';

export type WorkflowTransition = {
  from_state: string;
  trigger_code: string;
  to_state: string;
  authority: string;
  control_type: string | null;
  guard_code: string | null;
  effect_code: string;
  metadata: Record<string, unknown>;
};

/** Resolves an exact published contract version without inferring from a
 * legacy state name. Consumers remain responsible for evaluating the named
 * guard and applying the declared effect. */
export const workflowTransition = async (
  client: pg.PoolClient,
  workflowCode: string,
  workflowVersion: number,
  fromState: string,
  trigger: string
) => {
  const result = await client.query<WorkflowTransition>(`SELECT wt.from_state,wt.trigger_code,wt.to_state,
      wt.authority,wt.control_type,wt.guard_code,wt.effect_code,wt.metadata
    FROM workflow_definitions wd
    JOIN workflow_transitions wt ON wt.workflow_id=wd.id
    WHERE wd.code=$1 AND wd.version=$2 AND wd.status='PUBLISHED'
      AND wt.from_state=$3 AND wt.trigger_code=$4`, [workflowCode, workflowVersion, fromState, trigger]);
  if (!result.rowCount) throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  return result.rows[0];
};

export const selectedWorkflow = async (client: pg.PoolClient, workflowCode: string, selectionScope: string) => {
  const result = await client.query<{ workflow_code: string; workflow_version: number }>(`SELECT r.workflow_code,r.workflow_version
    FROM workflow_rollouts r
    JOIN workflow_definitions d ON d.code=r.workflow_code AND d.version=r.workflow_version
    WHERE r.workflow_code=$1 AND r.selection_scope=$2 AND r.selection_enabled=true AND d.status='PUBLISHED'
    ORDER BY r.workflow_version DESC LIMIT 1`, [workflowCode, selectionScope]);
  return result.rows[0] ?? null;
};

/** Interprets only published workflow data; business state names are never the runtime authority. */
export const transitionTarget = async (client: pg.PoolClient, projectId: string, trigger: string) => {
  const result = await client.query(`SELECT wt.to_state FROM projects p
    JOIN workflow_definitions wd ON wd.code=p.workflow_code AND wd.version=p.workflow_version AND wd.status='PUBLISHED'
    JOIN workflow_transitions wt ON wt.workflow_id=wd.id AND wt.from_state=p.state AND wt.trigger_code=$2
    WHERE p.id=$1`, [projectId, trigger]);
  if (!result.rowCount) throw new ApiError(409, 'WORKFLOW_TRANSITION_NOT_ALLOWED');
  return result.rows[0].to_state as string;
};
