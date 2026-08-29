/**
 * STATE_ACTION_PROJECTION:v1 — canonical read-only projection of lifecycle state,
 * cause, next action and the allowed_actions for one authenticated principal.
 *
 * Governed by UI-01-PREVALIDATION-01 (see
 * orchestration/.../phase-6-5-implementation-tasks/UI-01-single-state-action-projection-prevalidation.md).
 *
 * Design rules enforced here:
 *  - The whole projection is assembled inside ONE consistent read-only DB
 *    snapshot (withReadOnlySnapshot) and every temporal decision (lease expiry,
 *    grant expiry, pause fence) uses the single snapshotNow captured at start.
 *  - Resource states are preserved independently: we never do
 *    `module.state ?? project.state` or similar. journey_status is only a
 *    derived summary.
 *  - The public DTO is constructed field-by-field (allowlist). Internal
 *    aggregates are never passed through publicValue() as the primary builder.
 *  - Allowed_actions are derived from persisted facts + resolveCapability; no
 *    action is ever inferred from a state name, status text or last event.
 *  - Legacy workflows are fail-closed: a versioned legacy adapter publishes
 *    only the actions it explicitly declares; unknown workflows are
 *    LEGACY_READ_ONLY with an empty allowed_actions.
 */
import type pg from 'pg';
import { withReadOnlySnapshot } from './db.js';
import { resolveCapability, type AuthenticatedPrincipal } from './auth.js';
import { ApiError } from './service.js';
import { publicValue } from './projection.js';

export const STATE_ACTION_PROJECTION_SCHEMA = 'STATE_ACTION_PROJECTION:v1';

/* ------------------------------------------------------------------ *
 * Public DTO types (allowlist)
 * ------------------------------------------------------------------ */

export type ResourceKind = 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'EXECUTION' | 'GATE' | 'ACCEPTANCE' | 'BLOCK' | 'PAUSE' | null;
export type ActivityState = 'IDLE' | 'QUEUED' | 'RUNNING' | 'RETRYABLE' | 'WAITING_RECONCILIATION' | 'PAUSED' | 'CANCELLED' | 'UNKNOWN';
export type ActivityItemState = 'QUEUED' | 'RUNNING' | 'RETRYABLE' | 'WAITING_RECONCILIATION' | 'UNKNOWN';

export type ModuleProjection = {
  id: string;
  module_key: string;
  lifecycle_state: string;
  canonical_state: string;
  workflow_code: string;
  workflow_version: number;
  legacy: boolean;
  version: number;
};

export type WorkItemProjection = {
  id: string;
  module_id: string;
  title: string;
  lifecycle_state: string;
  canonical_state: string;
  workflow_code: string;
  workflow_version: number;
  legacy: boolean;
  version: number;
};

export type GateProjection = {
  id: string;
  gate_code: string;
  status: string;
  version: number;
  scope_type: string;
  scope_id: string;
  condition_code: string;
  authority_roles: string[];
  allowed_decisions: string[];
  decision: string | null;
  decided_at: string | null;
  created_at: string;
  evidence_reference: unknown;
};

export type StopRecordSummary = {
  id: string;
  resource_kind: 'PROJECT' | 'MODULE';
  resource_id: string;
  reason: string;
  version: number;
  fence: string;
  previous_active_state: string | null;
  created_at: string;
};

export type ActivityProjection = {
  job_id: string | null;
  resource_kind: 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'EXECUTION';
  resource_id: string;
  kind: string;
  state: ActivityItemState;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  execution_or_attempt_id: string | null;
};

export type RecoverySummary = {
  id: string;
  cause: string;
  effect_certainty: string;
  selected_action: string;
  reason: string;
  resource_kind: 'WORK_ITEM' | 'EXECUTION';
  resource_id: string;
  execution_state: string;
  evidence_refs: unknown;
  finding_refs: unknown;
  created_at: string;
  executed_at: string | null;
};

export type AssuranceSummary = {
  acceptance_id: string;
  state: string;
  classification: string;
  version: number;
  created_at: string;
  updated_at: string;
  subject: unknown;
};

export type ActionInputSchema = {
  type: 'object';
  properties: Record<string, { type: string; enum?: string[]; description?: string }>;
  required: string[];
};

export type ActionDescriptor = {
  code: string;
  target: { resource_kind: 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'GATE' | 'ACCEPTANCE' | 'BLOCK' | 'PAUSE'; resource_id: string };
  command: { method: 'POST'; href: string; idempotency_required: boolean };
  expected: { resource_version?: number; gate_version?: number; pause_version?: number; fence?: string; as_of_event_id: number };
  confirmation: { required: boolean };
  input: { schema: ActionInputSchema | null; required_fields: string[] };
};

export type StateActionProjection = {
  schema_version: string;
  project_id: string;
  as_of_event_id: number;
  project: {
    lifecycle_state: string;
    canonical_state: string;
    workflow_code: string | null;
    workflow_version: number | null;
    legacy: boolean;
    journey_status: string;
    focus_resource_kind: ResourceKind;
    focus_resource_id: string | null;
  };
  resources: {
    modules: ModuleProjection[];
    work_items: WorkItemProjection[];
    gates: GateProjection[];
    delivery: unknown;
    recovery: RecoverySummary[];
    assurance: AssuranceSummary[];
  };
  activity: {
    state: ActivityState;
    running_count: number;
    queued_count: number;
    retryable_count: number;
    reconciliation_count: number;
    items: ActivityProjection[];
  };
  stop: {
    paused: StopRecordSummary | null;
    cancelled: StopRecordSummary | null;
    archived: boolean;
    reconciliation_required: boolean;
  };
  cause: { code: string | null; resource_kind: ResourceKind; resource_id: string | null };
  next_action: { text: string; descriptor_code?: string } | null;
  allowed_actions: ActionDescriptor[];
};

/* ------------------------------------------------------------------ *
 * Workflow adapters
 *
 * Selection is exclusively by the persisted (workflow_code, workflow_version)
 * pair of the resource. Never by state-name similarity, status text or last
 * event.
 * ------------------------------------------------------------------ */

/** Published, conformant lifecycle workflows (migration 048). Resources bound
 * to these resolve capabilities normally. */
const CURRENT_WORKFLOWS = new Set<string>([
  'PROJECT_DISCOVERY:4',
  'MODULE_DELIVERY:2',
  'WORK_ITEM_DELIVERY:2',
  'ORCHESTRATION_EXECUTION:1',
]);

/** Explicitly declared legacy workflow/version adapters. Each may publish only
 * the actions it declares; anything else stays read-only fail-closed. */
type LegacyActionCode = 'PRODUCT_COMMITMENT_DECISION' | 'APPLY_REVIEW_ADJUSTMENTS' | 'RETRY_DISCOVERY' | 'RESOLVE_EXTERNAL_BLOCKER' | 'AUTHORIZE_REWORK';

type LegacyAdapter = {
  /** Human-readable journey summary for this historical workflow. */
  journey_status: string;
  /** Explicitly published action codes, keyed by the exact persisted state(s)
   * that make the action applicable. An empty array means read-only. */
  publishes: Partial<Record<string, LegacyActionCode[]>>;
};

const LEGACY_ADAPTERS: Record<string, LegacyAdapter> = {
  'PROJECT_INTAKE:1': {
    journey_status: 'LEGACY',
    publishes: {},
  },
  'PROJECT_DISCOVERY:1': {
    journey_status: 'LEGACY',
    publishes: {
      WAITING_FOR_PRODUCT_COMMITMENT: ['PRODUCT_COMMITMENT_DECISION'],
    },
  },
  'PROJECT_DISCOVERY:2': {
    journey_status: 'LEGACY',
    publishes: {
      WAITING_FOR_PRODUCT_COMMITMENT: ['PRODUCT_COMMITMENT_DECISION'],
      WAITING_FOR_REVIEW_ADJUSTMENT: ['APPLY_REVIEW_ADJUSTMENTS'],
      DISCOVERY_FAILED: ['RETRY_DISCOVERY'],
    },
  },
  'PROJECT_DISCOVERY:3': {
    journey_status: 'LEGACY',
    publishes: {
      WAITING_FOR_PRODUCT_COMMITMENT: ['PRODUCT_COMMITMENT_DECISION'],
      WAITING_FOR_REVIEW_ADJUSTMENT: ['APPLY_REVIEW_ADJUSTMENTS'],
      DISCOVERY_FAILED: ['RETRY_DISCOVERY'],
    },
  },
  'PROJECT_ARCHIVING:1': {
    journey_status: 'LEGACY',
    publishes: {},
  },
  'MODULE_DELIVERY:1': {
    journey_status: 'LEGACY',
    publishes: {},
  },
  'WORK_ITEM_DELIVERY:1': {
    journey_status: 'LEGACY',
    publishes: {
      REWORK_ELIGIBLE: ['AUTHORIZE_REWORK'],
    },
  },
  'INTEGRATION_CANDIDATE:1': {
    journey_status: 'LEGACY',
    publishes: {},
  },
};

type WorkflowKind = { current: boolean; legacy: boolean; unknown: boolean; journey_status: string };

export const workflowKind = (code: string | null | undefined, version: number | null | undefined, published: string | null | undefined): WorkflowKind => {
  const key = code && version != null ? `${code}:${version}` : null;
  if (key && CURRENT_WORKFLOWS.has(key) && published === 'PUBLISHED') return { current: true, legacy: false, unknown: false, journey_status: 'ACTIVE' };
  if (key && LEGACY_ADAPTERS[key]) return { current: false, legacy: true, unknown: false, journey_status: LEGACY_ADAPTERS[key].journey_status };
  return { current: false, legacy: true, unknown: true, journey_status: 'LEGACY_READ_ONLY' };
};

/* ------------------------------------------------------------------ *
 * Fact readers — every query uses the shared snapshot client.
 * ------------------------------------------------------------------ */

type ProjectFacts = {
  id: string;
  workflow_code: string | null;
  workflow_version: number | null;
  state: string;
  workflow_status: string | null;
  canonical_state: string;
  archived: boolean;
  failure_stage: string | null;
  failure_code: string | null;
};

const readProjectFacts = async (client: pg.PoolClient, projectId: string): Promise<ProjectFacts> => {
  const row = (await client.query(
    `SELECT p.id,p.workflow_code,p.workflow_version,p.state,p.archived_at,p.failure_stage,p.failure_code,
       wd.status AS workflow_status,
       coalesce(ws.metadata->>'canonical_state', p.state) AS canonical_state
     FROM projects p
     LEFT JOIN workflow_definitions wd ON wd.code=p.workflow_code AND wd.version=p.workflow_version
     LEFT JOIN workflow_states ws ON ws.workflow_id=wd.id AND ws.code=p.state
     WHERE p.id=$1`, [projectId])).rows[0];
  if (!row) throw new ApiError(404, 'PROJECT_NOT_FOUND');
  return {
    id: String(row.id),
    workflow_code: row.workflow_code ?? null,
    workflow_version: row.workflow_version != null ? Number(row.workflow_version) : null,
    state: String(row.state),
    workflow_status: row.workflow_status ?? null,
    canonical_state: String(row.canonical_state ?? row.state),
    archived: Boolean(row.archived_at),
    failure_stage: row.failure_stage ?? null,
    failure_code: row.failure_code ?? null,
  };
};

const readModuleFacts = async (client: pg.PoolClient, projectId: string) => {
  const rows = (await client.query(
    `SELECT m.id,m.module_key,m.workflow_code,m.workflow_version,m.state,m.version,
       wd.status AS workflow_status,
       coalesce(ws.metadata->>'canonical_state', m.state) AS canonical_state
     FROM modules m
     LEFT JOIN workflow_definitions wd ON wd.code=m.workflow_code AND wd.version=m.workflow_version
     LEFT JOIN workflow_states ws ON ws.workflow_id=wd.id AND ws.code=m.state
     WHERE m.project_id=$1 ORDER BY m.created_at, m.id`, [projectId])).rows;
  return rows.map((row) => ({
    id: String(row.id),
    module_key: String(row.module_key),
    workflow_code: String(row.workflow_code),
    workflow_version: Number(row.workflow_version),
    state: String(row.state),
    workflow_status: row.workflow_status ?? null,
    canonical_state: String(row.canonical_state ?? row.state),
    version: Number(row.version),
  }));
};

const readWorkItemFacts = async (client: pg.PoolClient, projectId: string) => {
  const rows = (await client.query(
    `SELECT w.id,w.module_id,w.title,w.workflow_code,w.workflow_version,w.state,w.version,
       wd.status AS workflow_status,
       coalesce(ws.metadata->>'canonical_state', w.state) AS canonical_state,
       (SELECT count(*)::int FROM work_item_external_blockers b WHERE b.work_item_id=w.id AND b.state='ACTIVE') AS active_external_blocker_count
     FROM work_items w
     LEFT JOIN workflow_definitions wd ON wd.code=w.workflow_code AND wd.version=w.workflow_version
     LEFT JOIN workflow_states ws ON ws.workflow_id=wd.id AND ws.code=w.state
     WHERE w.project_id=$1 ORDER BY w.created_at, w.id`, [projectId])).rows;
  return rows.map((row) => ({
    id: String(row.id),
    module_id: String(row.module_id),
    title: String(row.title),
    workflow_code: String(row.workflow_code),
    workflow_version: Number(row.workflow_version),
    state: String(row.state),
    workflow_status: row.workflow_status ?? null,
    canonical_state: String(row.canonical_state ?? row.state),
    version: Number(row.version),
    active_external_blocker_count: Number(row.active_external_blocker_count ?? 0),
  }));
};

const readGateFacts = async (client: pg.PoolClient, projectId: string) => {
  const rows = (await client.query(
    `SELECT id,gate_code,status,version,scope_type,scope_id,condition_code,authority_roles,allowed_decisions,
       evidence,decision,decided_at,created_at
     FROM gate_records WHERE project_id=$1 ORDER BY created_at DESC, id DESC`, [projectId])).rows;
  return rows.map((row) => ({
    id: String(row.id),
    gate_code: String(row.gate_code),
    status: String(row.status),
    version: Number(row.version),
    scope_type: String(row.scope_type),
    scope_id: String(row.scope_id),
    condition_code: String(row.condition_code),
    authority_roles: Array.isArray(row.authority_roles) ? row.authority_roles.map(String) : [],
    allowed_decisions: Array.isArray(row.allowed_decisions) ? row.allowed_decisions.map(String) : [],
    evidence: row.evidence ?? {},
    decision: row.decision ?? null,
    decided_at: row.decided_at ? new Date(row.decided_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
  }));
};

/** Legacy `gates` table (REGISTER_PROJECT / PRODUCT_COMMITMENT before GAT-01). */
const readLegacyGateFacts = async (client: pg.PoolClient, projectId: string) => {
  const rows = (await client.query(
    `SELECT id,kind,version,status,opened_at,decided_at,evidence FROM gates WHERE project_id=$1 ORDER BY opened_at DESC, id DESC`, [projectId])).rows;
  return rows.map((row) => ({
    id: String(row.id),
    gate_code: String(row.kind),
    status: String(row.status),
    version: Number(row.version),
    scope_type: 'PROJECT',
    scope_id: projectId,
    condition_code: 'LEGACY',
    authority_roles: [],
    allowed_decisions: [],
    evidence: row.evidence ?? {},
    decision: null,
    decided_at: row.decided_at ? new Date(row.decided_at).toISOString() : null,
    created_at: new Date(row.opened_at).toISOString(),
  }));
};

const readStopFacts = async (client: pg.PoolClient, projectId: string) => {
  const pauses = await client.query(
      `SELECT id,resource_kind,resource_id,reason,version,pause_fence,previous_active_state,created_at
       FROM pause_records WHERE project_id=$1 AND status='ACTIVE' ORDER BY created_at DESC`, [projectId]);
  const cancellations = await client.query(
      `SELECT id,resource_kind,resource_id,reason,version,cancellation_fence,created_at
       FROM cancellation_records WHERE project_id=$1 ORDER BY created_at DESC, id DESC`, [projectId]);
  const effects = await client.query(
      `SELECT resource_kind,resource_id,status FROM external_effect_records WHERE project_id=$1 AND status IN ('EFFECT_UNKNOWN','RECONCILE_REQUIRED') ORDER BY updated_at DESC`, [projectId]);
  const resumeReconciliations = await client.query(
      `SELECT 1 FROM resume_records r JOIN pause_records p ON p.id=r.pause_id WHERE p.project_id=$1 AND r.result='RESUME_RECONCILIATION_REQUIRED' LIMIT 1`, [projectId]);
  const recoveryReconciliations = await client.query(
      `SELECT 1 FROM recovery_decisions WHERE project_id=$1 AND execution_state='WAITING_RECONCILIATION' LIMIT 1`, [projectId]);
  const projectPause = pauses.rows.find((row) => row.resource_kind === 'PROJECT');
  const projectCancellation = cancellations.rows.find((row) => row.resource_kind === 'PROJECT');
  const toStopRecord = (row: { id: string; resource_kind: 'PROJECT' | 'MODULE'; resource_id: string; reason: string; version: string | number; pause_fence?: string | number | bigint; cancellation_fence?: string | number | bigint; previous_active_state?: string | null; created_at: string | Date }): StopRecordSummary => ({
    id: String(row.id),
    resource_kind: row.resource_kind,
    resource_id: String(row.resource_id),
    reason: String(row.reason),
    version: Number(row.version),
    fence: String(row.pause_fence ?? row.cancellation_fence ?? '0'),
    previous_active_state: row.previous_active_state ?? null,
    created_at: new Date(row.created_at).toISOString(),
  });
  return {
    pauses: pauses.rows.map(toStopRecord),
    projectPause: projectPause ? toStopRecord(projectPause) : null,
    cancellations: cancellations.rows.map(toStopRecord),
    projectCancellation: projectCancellation ? toStopRecord(projectCancellation) : null,
    reconciliation_required: effects.rows.length > 0 || (resumeReconciliations.rowCount ?? 0) > 0 || (recoveryReconciliations.rowCount ?? 0) > 0,
  };
};

/** Delivery lifecycle summary (allowlisted) derived from the shared snapshot. */
const readDeliverySummary = async (client: pg.PoolClient, projectId: string) => {
  const project = await client.query(`SELECT state,workflow_code,workflow_version FROM projects WHERE id=$1`, [projectId]);
  const pkg = await client.query(
      `SELECT id,delivery_revision,content_hash,normative_generation,delivered_at FROM delivery_packages WHERE project_id=$1 ORDER BY delivery_revision DESC LIMIT 1`, [projectId]);
  const acceptance = await client.query(
      `SELECT a.state,a.content_hash,a.delivery_revision FROM delivery_technical_acceptances a JOIN delivery_packages p ON p.id=a.package_id WHERE p.project_id=$1 ORDER BY a.created_at DESC LIMIT 1`, [projectId]);
  const deliveryGate = await client.query(
      `SELECT id,status,version,decision FROM gate_records WHERE project_id=$1 AND gate_code='DELIVERY_ACCEPTANCE' ORDER BY created_at DESC LIMIT 1`, [projectId]);
  if (!project.rowCount) return null;
  const deliveryGateRow = deliveryGate.rows[0];
  return {
    lifecycle_state: String(project.rows[0].state),
    workflow_code: project.rows[0].workflow_code ?? null,
    workflow_version: project.rows[0].workflow_version != null ? Number(project.rows[0].workflow_version) : null,
    delivery_package: pkg.rows[0] ? {
      id: String(pkg.rows[0].id),
      delivery_revision: Number(pkg.rows[0].delivery_revision),
      content_hash: String(pkg.rows[0].content_hash),
      normative_generation: String(pkg.rows[0].normative_generation),
      delivered_at: pkg.rows[0].delivered_at ? new Date(pkg.rows[0].delivered_at).toISOString() : null,
    } : null,
    technical_acceptance: acceptance.rows[0] ? {
      state: String(acceptance.rows[0].state),
      content_hash: String(acceptance.rows[0].content_hash),
      delivery_revision: Number(acceptance.rows[0].delivery_revision),
    } : null,
    delivery_gate: deliveryGateRow ? {
      id: String(deliveryGateRow.id),
      status: String(deliveryGateRow.status),
      version: Number(deliveryGateRow.version),
      decision: deliveryGateRow.decision ?? null,
    } : null,
  };
};

const readRecoveryFacts = async (client: pg.PoolClient, projectId: string) => {
  const rows = (await client.query(
    `SELECT id,cause,effect_certainty,selected_action,reason,work_item_id,integration_candidate_id,execution_state,
       evidence_refs,finding_refs,created_at,executed_at
     FROM recovery_decisions WHERE project_id=$1 ORDER BY created_at DESC, id DESC LIMIT 50`, [projectId])).rows;
  return rows.map((row) => ({
    id: String(row.id),
    cause: String(row.cause),
    effect_certainty: String(row.effect_certainty),
    selected_action: String(row.selected_action),
    reason: String(row.reason),
    resource_kind: row.work_item_id ? ('WORK_ITEM' as const) : ('EXECUTION' as const),
    resource_id: row.work_item_id ? String(row.work_item_id) : String(row.integration_candidate_id),
    execution_state: String(row.execution_state),
    evidence_refs: publicValue(row.evidence_refs),
    finding_refs: publicValue(row.finding_refs),
    created_at: new Date(row.created_at).toISOString(),
    executed_at: row.executed_at ? new Date(row.executed_at).toISOString() : null,
  }));
};

const readAssuranceFacts = async (client: pg.PoolClient, projectId: string) => {
  const acceptances = await client.query(
      `SELECT a.id,a.state,a.classification,a.version,a.created_at,a.updated_at,
         s.subject_kind,s.subject_id,s.normative_generation
       FROM work_acceptances a
       LEFT JOIN assurance_dispatch_snapshots s ON s.id=a.assurance_dispatch_snapshot_id
       WHERE a.project_id=$1 ORDER BY a.created_at DESC, a.id DESC LIMIT 50`, [projectId]);
  const blocks = await client.query(
      `SELECT id,acceptance_id,block_code,category,severity,state,created_at FROM work_blocks WHERE project_id=$1 ORDER BY created_at DESC, id DESC LIMIT 50`, [projectId]);
  const reviews = await client.query(
      `SELECT r.id,r.acceptance_id,r.version,r.state,r.created_at FROM assurance_reviews r JOIN work_acceptances a ON a.id=r.acceptance_id WHERE a.project_id=$1 ORDER BY r.created_at DESC, r.id DESC LIMIT 50`, [projectId]);
  return {
    acceptances: acceptances.rows.map((row) => ({
      id: String(row.id),
      state: String(row.state),
      classification: String(row.classification),
      version: Number(row.version),
      created_at: new Date(row.created_at).toISOString(),
      updated_at: new Date(row.updated_at).toISOString(),
      subject: row.subject_kind ? { subject_kind: String(row.subject_kind), subject_id: String(row.subject_id), normative_generation: String(row.normative_generation) } : null,
    })),
    blocks: blocks.rows.map((row) => ({
      id: String(row.id),
      acceptance_id: row.acceptance_id ? String(row.acceptance_id) : null,
      block_code: String(row.block_code),
      category: String(row.category),
      severity: String(row.severity),
      state: String(row.state),
      created_at: new Date(row.created_at).toISOString(),
    })),
    reviews: reviews.rows.map((row) => ({
      id: String(row.id),
      acceptance_id: String(row.acceptance_id),
      version: Number(row.version),
      state: String(row.state),
      created_at: new Date(row.created_at).toISOString(),
    })),
  };
};

type ActivityFact = {
  job_id: string | null;
  resource_kind: 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'EXECUTION';
  resource_id: string;
  kind: string;
  state: ActivityItemState;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  execution_or_attempt_id: string | null;
};

const readActivityFacts = async (client: pg.PoolClient, projectId: string, snapshotNow: Date) => {
  const jobs = (await client.query(
    `SELECT j.id AS job_id,j.kind,j.status,j.lease_expires_at,j.heartbeat_at,j.delivery_id,j.module_id,
       (SELECT e.id FROM agent_execution e WHERE e.job_id=j.id ORDER BY e.created_at DESC, e.id DESC LIMIT 1) AS execution_id,
       w.id AS work_item_id,
       w.module_id AS work_item_module_id
     FROM jobs j
     LEFT JOIN deliveries d ON d.id=j.delivery_id
     LEFT JOIN work_items w ON w.id=d.work_item_id
     WHERE j.project_id=$1 AND j.status IN ('PENDING','RETRYABLE','LEASED')`, [projectId])).rows;

  const intents = (await client.query(
    `SELECT id,kind,status,lease_expires_at,aggregate_type,aggregate_id
     FROM macro_lifecycle_intents WHERE project_id=$1 AND status IN ('PENDING','LEASED','FAILED')`, [projectId])).rows;

  const recovery = (await client.query(
    `SELECT id,cause,selected_action,execution_state,execution_lease_expires_at,work_item_id,integration_candidate_id
     FROM recovery_decisions WHERE project_id=$1 AND execution_state IN ('PENDING','EXECUTING','WAITING_RECONCILIATION')`, [projectId])).rows;

  const integrationAttempts = (await client.query(
    `SELECT id,state,candidate_id FROM integration_attempts WHERE project_id=$1 AND state='RESERVED'`, [projectId])).rows;

  const deliveryIntents = (await client.query(
    `SELECT id,kind,status,subject_kind,subject_id FROM delivery_lifecycle_intents WHERE project_id=$1 AND status='PENDING'`, [projectId])).rows;

  const facts: ActivityFact[] = [];

  for (const row of jobs) {
    const leased = row.status === 'LEASED';
    const validLease = leased && row.lease_expires_at && new Date(row.lease_expires_at) > snapshotNow;
    const moduleId = row.module_id ? String(row.module_id) : row.work_item_module_id ? String(row.work_item_module_id) : null;
    const workItemId = row.work_item_id ? String(row.work_item_id) : null;
    const isAgentExecution = Boolean(row.execution_id);
    const resourceKind: ActivityFact['resource_kind'] = workItemId ? 'WORK_ITEM' : (isAgentExecution ? 'EXECUTION' : (moduleId ? 'MODULE' : 'PROJECT'));
    const resourceId = workItemId ?? (isAgentExecution ? String(row.execution_id) : (moduleId ?? projectId));
    let state: ActivityItemState;
    if (validLease) state = 'RUNNING';
    else if (row.status === 'LEASED') state = 'UNKNOWN'; // expired lease is not running
    else if (row.status === 'RETRYABLE') state = 'RETRYABLE';
    else state = 'QUEUED';
    facts.push({
      job_id: String(row.job_id),
      resource_kind: resourceKind,
      resource_id: resourceId,
      kind: String(row.kind),
      state,
      lease_expires_at: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : null,
      heartbeat_at: row.heartbeat_at ? new Date(row.heartbeat_at).toISOString() : null,
      execution_or_attempt_id: row.execution_id ? String(row.execution_id) : null,
    });
  }

  for (const row of intents) {
    const leased = row.status === 'LEASED';
    const validLease = leased && row.lease_expires_at && new Date(row.lease_expires_at) > snapshotNow;
    const resourceKind: ActivityFact['resource_kind'] = row.aggregate_type === 'MODULE' ? 'MODULE' : row.aggregate_type === 'PROJECT' ? 'PROJECT' : 'PROJECT';
    let state: ActivityItemState;
    if (validLease) state = 'RUNNING';
    else if (row.status === 'LEASED') state = 'UNKNOWN';
    else if (row.status === 'FAILED') state = 'RETRYABLE';
    else state = 'QUEUED';
    facts.push({
      job_id: null,
      resource_kind: resourceKind,
      resource_id: String(row.aggregate_id ?? projectId),
      kind: `MACRO_${String(row.kind)}`,
      state,
      lease_expires_at: row.lease_expires_at ? new Date(row.lease_expires_at).toISOString() : null,
      heartbeat_at: null,
      execution_or_attempt_id: null,
    });
  }

  for (const row of recovery) {
    const executing = row.execution_state === 'EXECUTING';
    const validLease = executing && row.execution_lease_expires_at && new Date(row.execution_lease_expires_at) > snapshotNow;
    const workItemId = row.work_item_id ? String(row.work_item_id) : null;
    const resourceKind: ActivityFact['resource_kind'] = workItemId ? 'WORK_ITEM' : 'EXECUTION';
    const resourceId = workItemId ?? String(row.integration_candidate_id);
    let state: ActivityItemState;
    if (validLease) state = 'RUNNING';
    else if (executing) state = 'UNKNOWN';
    else if (row.execution_state === 'WAITING_RECONCILIATION') state = 'WAITING_RECONCILIATION';
    else state = 'QUEUED';
    facts.push({
      job_id: null,
      resource_kind: resourceKind,
      resource_id: resourceId,
      kind: `RECOVERY_${String(row.selected_action)}`,
      state,
      lease_expires_at: row.execution_lease_expires_at ? new Date(row.execution_lease_expires_at).toISOString() : null,
      heartbeat_at: null,
      execution_or_attempt_id: null,
    });
  }

  for (const row of integrationAttempts) {
    facts.push({
      job_id: null,
      resource_kind: 'EXECUTION',
      resource_id: String(row.candidate_id),
      kind: 'INTEGRATION_ATTEMPT',
      state: 'QUEUED',
      lease_expires_at: null,
      heartbeat_at: null,
      execution_or_attempt_id: String(row.id),
    });
  }

  for (const row of deliveryIntents) {
    const resourceKind: ActivityFact['resource_kind'] = row.subject_kind === 'PauseRecord:v1' ? 'PROJECT' : row.subject_kind === 'ModulePlanProposal:v1' ? 'MODULE' : 'PROJECT';
    facts.push({
      job_id: null,
      resource_kind: resourceKind,
      resource_id: String(row.subject_id ?? projectId),
      kind: `DELIVERY_${String(row.kind)}`,
      state: 'QUEUED',
      lease_expires_at: null,
      heartbeat_at: null,
      execution_or_attempt_id: null,
    });
  }

  return facts;
};

const activityAggregate = (facts: ActivityFact[], stop: { projectCancellation: StopRecordSummary | null; projectPause: StopRecordSummary | null }) => {
  let runningCount = 0, queuedCount = 0, retryableCount = 0, reconciliationCount = 0;
  const items: ActivityProjection[] = facts.map((fact) => {
    if (fact.state === 'RUNNING') runningCount += 1;
    else if (fact.state === 'QUEUED') queuedCount += 1;
    else if (fact.state === 'RETRYABLE') retryableCount += 1;
    else if (fact.state === 'WAITING_RECONCILIATION') reconciliationCount += 1;
    // Build the allowlisted item explicitly — the internal `status` field
    // must never cross the public boundary.
    return {
      job_id: fact.job_id,
      resource_kind: fact.resource_kind,
      resource_id: fact.resource_id,
      kind: fact.kind,
      state: fact.state,
      lease_expires_at: fact.lease_expires_at,
      heartbeat_at: fact.heartbeat_at,
      execution_or_attempt_id: fact.execution_or_attempt_id,
    };
  });
  // Aggregate precedence affects ONLY the summary state, never resource states.
  let state: ActivityState;
  if (stop.projectCancellation) state = 'CANCELLED';
  else if (stop.projectPause) state = 'PAUSED';
  else if (reconciliationCount > 0) state = 'WAITING_RECONCILIATION';
  else if (runningCount > 0) state = 'RUNNING';
  else if (retryableCount > 0) state = 'RETRYABLE';
  else if (queuedCount > 0) state = 'QUEUED';
  else if (facts.some((fact) => fact.state === 'UNKNOWN')) state = 'UNKNOWN';
  else state = 'IDLE';
  return { state, running_count: runningCount, queued_count: queuedCount, retryable_count: retryableCount, reconciliation_count: reconciliationCount, items };
};

/* ------------------------------------------------------------------ *
 * Action descriptor builder
 * ------------------------------------------------------------------ */

type DescriptorContext = {
  projectId: string;
  asOfEventId: number;
  project: ProjectFacts;
  modules: Awaited<ReturnType<typeof readModuleFacts>>;
  workItems: Awaited<ReturnType<typeof readWorkItemFacts>>;
  gates: Awaited<ReturnType<typeof readGateFacts>>;
  legacyGates: Awaited<ReturnType<typeof readLegacyGateFacts>>;
  stop: Awaited<ReturnType<typeof readStopFacts>>;
  recovery: RecoverySummary[];
  assurance: Awaited<ReturnType<typeof readAssuranceFacts>>;
};

const jsonSchema = (properties: Record<string, { type: string; enum?: string[]; description?: string }>, required: string[]): ActionInputSchema => ({ type: 'object', properties, required });

const descriptor = (
  ctx: DescriptorContext,
  input: {
    code: string;
    resourceKind: 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'GATE' | 'ACCEPTANCE' | 'BLOCK' | 'PAUSE';
    resourceId: string;
    href: string;
    idempotencyRequired: boolean;
    resourceVersion?: number;
    gateVersion?: number;
    pauseVersion?: number;
    fence?: string;
    confirmationRequired: boolean;
    schema: ActionInputSchema | null;
  }
): ActionDescriptor => ({
  code: input.code,
  target: { resource_kind: input.resourceKind, resource_id: input.resourceId },
  command: { method: 'POST', href: input.href, idempotency_required: input.idempotencyRequired },
  expected: {
    ...(input.resourceVersion !== undefined ? { resource_version: input.resourceVersion } : {}),
    ...(input.gateVersion !== undefined ? { gate_version: input.gateVersion } : {}),
    ...(input.pauseVersion !== undefined ? { pause_version: input.pauseVersion } : {}),
    ...(input.fence !== undefined ? { fence: input.fence } : {}),
    as_of_event_id: ctx.asOfEventId,
  },
  confirmation: { required: input.confirmationRequired },
  input: { schema: input.schema, required_fields: input.schema ? input.schema.required : [] },
});

/** Async capability helper bound to the projection principal + snapshot now. */
type Capability = { action: string; projectId?: string; resourceType?: string; resourceId?: string; roles?: string[] };
const capabilityResolver = (principal: AuthenticatedPrincipal, snapshotNow: Date, client: pg.PoolClient) =>
  async (requirement: Capability): Promise<boolean> => {
    const verdict = await resolveCapability(principal, requirement, snapshotNow, client);
    return verdict.allowed;
  };

const gateDecisionSchema = jsonSchema(
  {
    version: { type: 'integer', description: 'Current gate version to decide against.' },
    decision: { type: 'string', description: 'Published decision for the gate.' },
    reason: { type: 'string', description: 'Feedback/justification (required for non-approval decisions).' },
    evidence: { type: 'object', description: 'Published evidence for the decision.' },
  },
  ['version', 'decision', 'evidence']
);
const stopInputSchema = (withEvidence: boolean) => jsonSchema(
  {
    reason: { type: 'string', description: 'Reason for the stop operation.' },
    ...(withEvidence ? { evidence: { type: 'object', description: 'Evidence of the stop operation.' } } : {}),
  },
  withEvidence ? ['reason', 'evidence'] : ['reason']
);

const buildCurrentProjectActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>) => {
  const actions: ActionDescriptor[] = [];
  const { projectId, project, gates, stop, asOfEventId } = ctx;

  // Catalog gate decisions (GAT-01) — DECIDE_CATALOG_GATE capability.
  for (const gate of gates) {
    if (gate.status !== 'OPEN') continue;
    const canDecide = await can({ action: 'DECIDE_CATALOG_GATE', projectId, resourceType: gate.scope_type, resourceId: gate.scope_id, roles: gate.authority_roles });
    if (!canDecide) continue;
    const isDeliveryAcceptance = gate.gate_code === 'DELIVERY_ACCEPTANCE';
    actions.push(descriptor(ctx, {
      code: isDeliveryAcceptance ? 'DECIDE_DELIVERY_ACCEPTANCE' : 'DECIDE_GATE',
      resourceKind: 'GATE',
      resourceId: gate.id,
      href: isDeliveryAcceptance ? `/api/projects/${projectId}/delivery/gates/${gate.id}/decision` : `/api/projects/${projectId}/catalog-gates/${gate.id}/decision`,
      idempotencyRequired: true,
      gateVersion: gate.version,
      confirmationRequired: true,
      schema: gateDecisionSchema,
    }));
  }

  // GAT-02 delivery lifecycle pause / resume / cancel.
  const projectTerminal = ['CANCELLED', 'DELIVERED', 'ARCHIVED'].includes(project.state);
  if (!projectTerminal && !stop.projectPause && !stop.projectCancellation) {
    if (await can({ action: 'DELIVERY_PAUSE_RESUME', projectId, resourceType: 'PROJECT', resourceId: projectId, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'PAUSE_PROJECT', resourceKind: 'PROJECT', resourceId: projectId,
        href: `/api/projects/${projectId}/delivery/pause`, idempotencyRequired: true,
        fence: stop.cancellations.find((c) => c.resource_kind === 'PROJECT')?.fence,
        confirmationRequired: true, schema: stopInputSchema(true),
      }));
    }
    if (await can({ action: 'DELIVERY_CANCEL', projectId, resourceType: 'PROJECT', resourceId: projectId, roles: ['BUSINESS_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'CANCEL_PROJECT', resourceKind: 'PROJECT', resourceId: projectId,
        href: `/api/projects/${projectId}/delivery/cancel`, idempotencyRequired: true,
        fence: stop.cancellations.find((c) => c.resource_kind === 'PROJECT')?.fence,
        confirmationRequired: true, schema: stopInputSchema(true),
      }));
    }
  }
  if (stop.projectPause) {
    if (await can({ action: 'DELIVERY_PAUSE_RESUME', projectId, resourceType: 'PROJECT', resourceId: projectId, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'RESUME_PROJECT', resourceKind: 'PAUSE', resourceId: stop.projectPause.id,
        href: `/api/projects/${projectId}/delivery/pauses/${stop.projectPause.id}/resume`, idempotencyRequired: true,
        pauseVersion: stop.projectPause.version, fence: stop.projectPause.fence,
        confirmationRequired: true,
        schema: jsonSchema(
          { expected_pause_version: { type: 'integer', description: 'Version of the pause record being resumed.' }, evidence: { type: 'object', description: 'Evidence that the impediment was removed.' } },
          ['expected_pause_version', 'evidence']
        ),
      }));
    }
  }
  void asOfEventId;
  return actions;
};

const buildModuleActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>, module: Awaited<ReturnType<typeof readModuleFacts>>[number]) => {
  const actions: ActionDescriptor[] = [];
  const { projectId, stop, asOfEventId } = ctx;
  const modulePause = stop.pauses.find((pause) => pause.resource_kind === 'MODULE' && pause.resource_id === module.id);
  const moduleCancellation = stop.cancellations.find((c) => c.resource_kind === 'MODULE' && c.resource_id === module.id);
  const moduleTerminal = ['CANCELLED', 'DELIVERED', 'ARCHIVED'].includes(module.state);
  if (!moduleTerminal && !modulePause && !moduleCancellation && !stop.projectPause && !stop.projectCancellation) {
    if (await can({ action: 'DELIVERY_PAUSE_RESUME', projectId, resourceType: 'MODULE', resourceId: module.id, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'PAUSE_MODULE', resourceKind: 'MODULE', resourceId: module.id,
        href: `/api/projects/${projectId}/modules/${module.id}/lifecycle/pause`, idempotencyRequired: true,
        resourceVersion: module.version,
        confirmationRequired: true, schema: stopInputSchema(true),
      }));
    }
    if (await can({ action: 'DELIVERY_CANCEL', projectId, resourceType: 'MODULE', resourceId: module.id, roles: ['BUSINESS_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'CANCEL_MODULE', resourceKind: 'MODULE', resourceId: module.id,
        href: `/api/projects/${projectId}/modules/${module.id}/lifecycle/cancel`, idempotencyRequired: true,
        resourceVersion: module.version,
        confirmationRequired: true,
        schema: jsonSchema(
          { reason: { type: 'string' }, evidence: { type: 'object' }, obligation_resolution: { type: 'object', description: 'Required when the module has a committed obligation.' } },
          ['reason', 'evidence']
        ),
      }));
    }
  }
  if (modulePause) {
    if (await can({ action: 'DELIVERY_PAUSE_RESUME', projectId, resourceType: 'MODULE', resourceId: module.id, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'RESUME_MODULE', resourceKind: 'PAUSE', resourceId: modulePause.id,
        href: `/api/projects/${projectId}/delivery/pauses/${modulePause.id}/resume`, idempotencyRequired: true,
        pauseVersion: modulePause.version, fence: modulePause.fence,
        confirmationRequired: true,
        schema: jsonSchema(
          { expected_pause_version: { type: 'integer' }, evidence: { type: 'object' } },
          ['expected_pause_version', 'evidence']
        ),
      }));
    }
  }
  void asOfEventId;
  return actions;
};

const buildWorkItemActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>, item: Awaited<ReturnType<typeof readWorkItemFacts>>[number]) => {
  const actions: ActionDescriptor[] = [];
  const { projectId, asOfEventId } = ctx;
  if (item.active_external_blocker_count > 0 && item.state === 'WAITING_FOR_EXTERNAL_INPUT') {
    if (await can({ action: 'OPERATE_PROJECT', projectId, resourceType: 'WORK_ITEM', resourceId: item.id, roles: ['OPERATOR'] })) {
      actions.push(descriptor(ctx, {
        code: 'RESOLVE_EXTERNAL_BLOCKER', resourceKind: 'WORK_ITEM', resourceId: item.id,
        href: `/api/projects/${projectId}/work-items/${item.id}/resolve-external-blocker`, idempotencyRequired: true,
        resourceVersion: item.version, confirmationRequired: true,
        schema: jsonSchema(
          { justification: { type: 'string', description: 'Justification of the external blocker resolution.' }, dependency_id: { type: 'string', description: 'Optional dependency id when multiple blockers are active.' } },
          ['justification']
        ),
      }));
    }
  }
  void asOfEventId;
  return actions;
};

const buildLegacyProjectActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>, project: ProjectFacts, adapter: LegacyAdapter) => {
  const actions: ActionDescriptor[] = [];
  const { projectId } = ctx;
  const declared = adapter.publishes[project.state] ?? [];
  for (const code of declared) {
    if (code === 'PRODUCT_COMMITMENT_DECISION') {
      // Legacy product commitment gate decided via POST /api/projects/:id/decision.
      const openGate = ctx.legacyGates.find((gate) => gate.gate_code === 'PRODUCT_COMMITMENT' && gate.status === 'OPEN');
      if (!openGate) continue;
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'PRODUCT_COMMITMENT_DECISION', resourceKind: 'GATE', resourceId: openGate.id,
        href: `/api/projects/${projectId}/decision`, idempotencyRequired: true,
        gateVersion: openGate.version, confirmationRequired: true, schema: gateDecisionSchema,
      }));
    } else if (code === 'APPLY_REVIEW_ADJUSTMENTS') {
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'APPLY_REVIEW_ADJUSTMENTS', resourceKind: 'PROJECT', resourceId: projectId,
        href: `/api/projects/${projectId}/apply-review-adjustments`, idempotencyRequired: true,
        confirmationRequired: true,
        schema: jsonSchema({ feedback: { type: 'string', description: 'Required feedback/notes for the review adjustments.' } }, ['feedback']),
      }));
    } else if (code === 'RETRY_DISCOVERY') {
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'RETRY_DISCOVERY', resourceKind: 'PROJECT', resourceId: projectId,
        href: `/api/projects/${projectId}/retry-discovery`, idempotencyRequired: true,
        confirmationRequired: true, schema: null,
      }));
    }
  }
  return actions;
};

const buildLegacyWorkItemActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>, item: Awaited<ReturnType<typeof readWorkItemFacts>>[number], adapter: LegacyAdapter) => {
  const actions: ActionDescriptor[] = [];
  const { projectId } = ctx;
  const declared = adapter.publishes[item.state] ?? [];
  for (const code of declared) {
    if (code === 'AUTHORIZE_REWORK') {
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, resourceType: 'WORK_ITEM', resourceId: item.id, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'AUTHORIZE_REWORK', resourceKind: 'WORK_ITEM', resourceId: item.id,
        href: `/api/projects/${projectId}/work-items/${item.id}/rework`, idempotencyRequired: true,
        resourceVersion: item.version, confirmationRequired: true,
        schema: jsonSchema(
          { finding_ids: { type: 'array', description: 'Finding ids being reworked.' }, delivery_id: { type: 'string' }, head_sha: { type: 'string' }, justification: { type: 'string' } },
          ['finding_ids', 'delivery_id', 'head_sha', 'justification']
        ),
      }));
    }
  }
  return actions;
};

const buildAssuranceActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>) => {
  const actions: ActionDescriptor[] = [];
  const { projectId, assurance, asOfEventId } = ctx;
  const openBlocks = assurance.blocks.filter((block) => ['OPEN', 'DIAGNOSING', 'SOLUTION_PROPOSED', 'RESOLUTION_SELECTED', 'RESOLVING', 'PAUSED'].includes(block.state));
  for (const block of openBlocks) {
    if (await can({ action: 'ASSURANCE_ON_CALL', projectId, resourceType: 'BLOCK', resourceId: block.id, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'TRANSITION_BLOCK', resourceKind: 'BLOCK', resourceId: block.id,
        href: `/api/projects/${projectId}/assurance/blocks/${block.id}`, idempotencyRequired: true,
        confirmationRequired: true,
        schema: jsonSchema(
          { state: { type: 'string', description: 'Target block state transition.' }, resolution: { type: 'object', description: 'Optional resolution evidence.' } },
          ['state']
        ),
      }));
    }
  }
  // An ESCALATED block cannot leave ESCALATED (to RESOLUTION_SELECTED) without an
  // approved ESCALATED_CLOSURE human gate (see transitionBlock in assurance.ts).
  // Publish RECORD_HUMAN_GATE for such blocks so the closure gate is actionable.
  // Only ESCALATED requires this gate per the assurance contract, so the
  // descriptor is scoped to that state alone and the TRANSITION_BLOCK filter
  // above stays unchanged.
  for (const block of assurance.blocks.filter((b) => b.state === 'ESCALATED')) {
    if (await can({ action: 'ASSURANCE_GATE', projectId, resourceType: 'BLOCK', resourceId: block.id, roles: ['TECH_LEAD', 'REPOSITORY_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'RECORD_HUMAN_GATE', resourceKind: 'BLOCK', resourceId: block.id,
        href: `/api/projects/${projectId}/assurance/gates`, idempotencyRequired: true,
        confirmationRequired: true,
        schema: jsonSchema(
          { block_id: { type: 'string' }, gate_type: { type: 'string' }, decision: { type: 'string' }, reason: { type: 'string' }, evidence: { type: 'object' } },
          ['block_id', 'gate_type', 'decision', 'reason']
        ),
      }));
    }
  }
  const openReviews = assurance.reviews.filter((review) => ['PENDING', 'DISPATCHED'].includes(review.state));
  for (const review of openReviews) {
    if (await can({ action: 'ASSURANCE_REVIEW', projectId, resourceType: 'ACCEPTANCE', resourceId: review.acceptance_id, roles: ['ASSURANCE_REVIEWER'] })) {
      actions.push(descriptor(ctx, {
        code: 'DECIDE_REVIEW', resourceKind: 'ACCEPTANCE', resourceId: review.acceptance_id,
        href: `/api/projects/${projectId}/assurance/reviews/${review.id}/decision`, idempotencyRequired: true,
        resourceVersion: review.version, confirmationRequired: true,
        schema: jsonSchema(
          { decision: { type: 'string', enum: ['ACCEPT', 'REWORK', 'BLOCK', 'ESCALATE'] }, evidence: { type: 'object' } },
          ['decision', 'evidence']
        ),
      }));
    }
  }
  const cancellableAcceptances = assurance.acceptances.filter((acceptance) => ['PENDING_PRODUCE', 'PENDING_REVIEW', 'WAITING_FOR_INDEPENDENT_REVIEWER', 'BLOCKED', 'ESCALATED', 'REWORK_REQUIRED'].includes(acceptance.state));
  for (const acceptance of cancellableAcceptances) {
    if (await can({ action: 'ASSURANCE_ON_CALL', projectId, resourceType: 'ACCEPTANCE', resourceId: acceptance.id, roles: ['ON_CALL_OWNER'] })) {
      actions.push(descriptor(ctx, {
        code: 'CANCEL_ACCEPTANCE', resourceKind: 'ACCEPTANCE', resourceId: acceptance.id,
        href: `/api/projects/${projectId}/assurance/acceptances/${acceptance.id}/cancel`, idempotencyRequired: true,
        resourceVersion: acceptance.version, confirmationRequired: true,
        schema: jsonSchema({ reason: { type: 'object', description: 'Cancellation reason.' } }, ['reason']),
      }));
      actions.push(descriptor(ctx, {
        code: 'RECONCILE_ACCEPTANCE', resourceKind: 'ACCEPTANCE', resourceId: acceptance.id,
        href: `/api/projects/${projectId}/assurance/acceptances/${acceptance.id}/reconcile`, idempotencyRequired: true,
        resourceVersion: acceptance.version, confirmationRequired: true,
        schema: null,
      }));
    }
  }
  void asOfEventId;
  return actions;
};

/* ------------------------------------------------------------------ *
 * cause + next_action derivation (from persisted facts, never state-name
 * inference on unknown states)
 * ------------------------------------------------------------------ */

const deriveCause = (ctx: DescriptorContext): { code: string | null; resource_kind: ResourceKind; resource_id: string | null } => {
  const { project, stop, gates, recovery } = ctx;
  if (stop.projectCancellation) return { code: 'CANCELLED', resource_kind: 'PROJECT', resource_id: project.id };
  if (stop.projectPause) return { code: 'PAUSED', resource_kind: 'PROJECT', resource_id: project.id };
  const activeRecovery = recovery.find((r) => ['PENDING', 'EXECUTING', 'WAITING_RECONCILIATION'].includes(r.execution_state));
  if (activeRecovery) return { code: activeRecovery.cause, resource_kind: activeRecovery.resource_kind === 'EXECUTION' ? 'EXECUTION' : 'WORK_ITEM', resource_id: activeRecovery.resource_id };
  const openGate = gates.find((gate) => gate.status === 'OPEN');
  if (openGate) return { code: openGate.gate_code, resource_kind: 'GATE', resource_id: openGate.id };
  if (project.archived) return { code: 'ARCHIVED', resource_kind: 'PROJECT', resource_id: project.id };
  if (project.failure_code) return { code: project.failure_code, resource_kind: 'PROJECT', resource_id: project.id };
  return { code: null, resource_kind: null, resource_id: null };
};

const deriveNextAction = (ctx: DescriptorContext, allowed: ActionDescriptor[]): { text: string; descriptor_code?: string } | null => {
  const { stop, gates, recovery } = ctx;
  if (stop.projectCancellation) return { text: 'Projeto cancelado; nenhuma continuação pendente.' };
  if (stop.projectPause) {
    const resume = allowed.find((action) => action.code === 'RESUME_PROJECT');
    return resume ? { text: 'Projeto pausado. Retomar com evidência.', descriptor_code: 'RESUME_PROJECT' } : { text: 'Projeto pausado; retomada exige autoridade de on-call.' };
  }
  const openGate = gates.find((gate) => gate.status === 'OPEN');
  if (openGate) {
    const decide = allowed.find((action) => action.code === 'DECIDE_GATE' || action.code === 'DECIDE_DELIVERY_ACCEPTANCE');
    return { text: `Decisão pendente no gate ${openGate.gate_code}.`, ...(decide ? { descriptor_code: decide.code } : {}) };
  }
  const activeRecovery = recovery.find((r) => ['PENDING', 'EXECUTING', 'WAITING_RECONCILIATION'].includes(r.execution_state));
  if (activeRecovery) return { text: `Recovery em andamento: ${activeRecovery.selected_action} (${activeRecovery.cause}).` };
  return null;
};

/* ------------------------------------------------------------------ *
 * main builder
 * ------------------------------------------------------------------ */

export const buildStateActionProjection = async (projectId: string, principal: AuthenticatedPrincipal): Promise<StateActionProjection> => {
  return withReadOnlySnapshot(async (client, snapshotNow) => {
    // READ authority is required for this GET and is evaluated inside the same
    // snapshot (shared snapshotNow) as every capability resolution below, using
    // resolveCapability — never authorize — so no auth_audit_records are written.
    const readVerdict = await resolveCapability(principal, { action: 'READ_PROJECT', projectId }, snapshotNow, client);
    if (!readVerdict.allowed) throw new ApiError(403, 'READ_PROJECT_DENIED');
    const project = await readProjectFacts(client, projectId);
    const modules = await readModuleFacts(client, projectId);
    const workItems = await readWorkItemFacts(client, projectId);
    const gates = await readGateFacts(client, projectId);
    const legacyGates = await readLegacyGateFacts(client, projectId);
    const stop = await readStopFacts(client, projectId);
    const delivery = await readDeliverySummary(client, projectId);
    const recovery = await readRecoveryFacts(client, projectId);
    const assurance = await readAssuranceFacts(client, projectId);
    const activityFacts = await readActivityFacts(client, projectId, snapshotNow);
    const asOfEventRow = await client.query(`SELECT COALESCE(MAX(id),0)::bigint AS as_of_event_id FROM events WHERE project_id=$1`, [projectId]);
    const asOfEventId = Number(asOfEventRow.rows[0].as_of_event_id ?? 0);

    const ctx: DescriptorContext = { projectId, asOfEventId, project, modules, workItems, gates, legacyGates, stop, recovery, assurance };
    const can = capabilityResolver(principal, snapshotNow, client);

    // ----- resource projections (state separation preserved) -----
    const moduleProjections: ModuleProjection[] = modules.map((module) => {
      const kind = workflowKind(module.workflow_code, module.workflow_version, module.workflow_status);
      return {
        id: module.id,
        module_key: module.module_key,
        lifecycle_state: module.state,
        canonical_state: module.canonical_state,
        workflow_code: module.workflow_code,
        workflow_version: module.workflow_version,
        legacy: kind.legacy,
        version: module.version,
      };
    });

    const workItemProjections: WorkItemProjection[] = workItems.map((item) => {
      const kind = workflowKind(item.workflow_code, item.workflow_version, item.workflow_status);
      return {
        id: item.id,
        module_id: item.module_id,
        title: item.title,
        lifecycle_state: item.state,
        canonical_state: item.canonical_state,
        workflow_code: item.workflow_code,
        workflow_version: item.workflow_version,
        legacy: kind.legacy,
        version: item.version,
      };
    });

    const gateProjections: GateProjection[] = [...gates, ...legacyGates].map((gate) => ({
      id: gate.id,
      gate_code: gate.gate_code,
      status: gate.status,
      version: gate.version,
      scope_type: gate.scope_type,
      scope_id: gate.scope_id,
      condition_code: gate.condition_code,
      authority_roles: gate.authority_roles,
      allowed_decisions: gate.allowed_decisions,
      decision: gate.decision,
      decided_at: gate.decided_at,
      created_at: gate.created_at,
      evidence_reference: publicValue(gate.evidence),
    }));

    // ----- activity aggregation -----
    const activity = activityAggregate(activityFacts, stop);

    // ----- focus resource (explicit, never merges states) -----
    const focusModule = modules.find((m) => ['IMPLEMENTING', 'INTEGRATING', 'VALIDATING', 'WAITING_FOR_MODULE_PLAN_APPROVAL', 'WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION', 'PLANNING_IN_PROGRESS'].includes(m.state));
    const focusWorkItem = workItems.find((w) => ['DISPATCHED', 'PRODUCING', 'OUTPUT_SUBMITTED', 'QA_IN_PROGRESS', 'INDEPENDENT_REVIEW', 'WAITING_FOR_INDEPENDENT_REVIEWER', 'RECOVERY_REQUIRED', 'BLOCKED', 'WAITING_FOR_EXTERNAL_INPUT', 'WAITING_FOR_DEPENDENCIES'].includes(w.state));
    const focusRecovery = recovery.find((r) => ['PENDING', 'EXECUTING', 'WAITING_RECONCILIATION'].includes(r.execution_state));
    const focusGate = gates.find((gate) => gate.status === 'OPEN');
    let focusResourceKind: ResourceKind = 'PROJECT';
    let focusResourceId: string | null = project.id;
    if (focusRecovery) { focusResourceKind = focusRecovery.resource_kind === 'EXECUTION' ? 'EXECUTION' : 'WORK_ITEM'; focusResourceId = focusRecovery.resource_id; }
    else if (focusGate) { focusResourceKind = 'GATE'; focusResourceId = focusGate.id; }
    else if (focusWorkItem) { focusResourceKind = 'WORK_ITEM'; focusResourceId = focusWorkItem.id; }
    else if (focusModule) { focusResourceKind = 'MODULE'; focusResourceId = focusModule.id; }

    // ----- project presentation via adapter -----
    const projectKind = workflowKind(project.workflow_code, project.workflow_version, project.workflow_status);
    const projectAdapter = project.workflow_code && project.workflow_version != null ? LEGACY_ADAPTERS[`${project.workflow_code}:${project.workflow_version}`] : null;
    const journeyStatus = projectKind.unknown
      ? 'LEGACY_READ_ONLY'
      : stop.projectCancellation ? 'CANCELLED'
        : stop.projectPause ? 'PAUSED'
          : project.archived ? 'ARCHIVED'
            : projectKind.legacy ? (projectAdapter?.journey_status ?? 'LEGACY')
              : project.canonical_state;

    // ----- allowed_actions -----
    // Every resource contributes actions through its OWN workflow adapter,
    // selected by its persisted (workflow_code, workflow_version). Unknown or
    // incomplete workflows stay fail-closed read-only (no actions).
    const allowed: ActionDescriptor[] = [];
    // Project actions
    if (projectKind.current) {
      allowed.push(...await buildCurrentProjectActions(ctx, can));
    } else if (projectKind.legacy && !projectKind.unknown && projectAdapter) {
      allowed.push(...await buildLegacyProjectActions(ctx, can, project, projectAdapter));
    }
    // Module actions (per module adapter; legacy module adapters currently
    // publish no actions and remain read-only fail-closed)
    for (const module of modules) {
      const moduleKind = workflowKind(module.workflow_code, module.workflow_version, module.workflow_status);
      if (moduleKind.current) allowed.push(...await buildModuleActions(ctx, can, module));
    }
    // Work item actions (per work item adapter)
    for (const item of workItems) {
      const itemKind = workflowKind(item.workflow_code, item.workflow_version, item.workflow_status);
      if (itemKind.current) {
        allowed.push(...await buildWorkItemActions(ctx, can, item));
      } else if (itemKind.legacy && !itemKind.unknown) {
        const itemAdapter = item.workflow_code && item.workflow_version != null ? LEGACY_ADAPTERS[`${item.workflow_code}:${item.workflow_version}`] : null;
        if (itemAdapter) allowed.push(...await buildLegacyWorkItemActions(ctx, can, item, itemAdapter));
      }
    }
    // Assurance actions are part of the current lifecycle contract only.
    if (projectKind.current) allowed.push(...await buildAssuranceActions(ctx, can));

    const cause = deriveCause(ctx);
    const nextAction = deriveNextAction(ctx, allowed);

    const assuranceSummaries: AssuranceSummary[] = assurance.acceptances.map((acceptance) => ({
      acceptance_id: acceptance.id,
      state: acceptance.state,
      classification: acceptance.classification,
      version: acceptance.version,
      created_at: acceptance.created_at,
      updated_at: acceptance.updated_at,
      subject: acceptance.subject,
    }));

    return {
      schema_version: STATE_ACTION_PROJECTION_SCHEMA,
      project_id: projectId,
      as_of_event_id: asOfEventId,
      project: {
        lifecycle_state: project.state,
        canonical_state: project.canonical_state,
        workflow_code: project.workflow_code,
        workflow_version: project.workflow_version,
        legacy: projectKind.legacy,
        journey_status: journeyStatus,
        focus_resource_kind: focusResourceKind,
        focus_resource_id: focusResourceId,
      },
      resources: {
        modules: moduleProjections,
        work_items: workItemProjections,
        gates: gateProjections,
        delivery,
        recovery,
        assurance: assuranceSummaries,
      },
      activity,
      stop: {
        paused: stop.projectPause,
        cancelled: stop.projectCancellation,
        archived: project.archived,
        reconciliation_required: stop.reconciliation_required,
      },
      cause,
      next_action: nextAction,
      allowed_actions: allowed,
    };
  });
};
