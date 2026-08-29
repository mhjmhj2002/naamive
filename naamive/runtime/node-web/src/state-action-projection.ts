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
import { materializationBaselineOptionsForClient, type MaterializationBaselineOptions } from './phase3.js';

export const STATE_ACTION_PROJECTION_SCHEMA = 'STATE_ACTION_PROJECTION:v1';
export const STOP_SURFACE_PROJECTION_SCHEMA = 'STOP_SURFACE_PROJECTION:v1';

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

/** Safe, allowlisted facts for the currently applicable v3 Technology
 * Baseline revision. This deliberately excludes the revision payload, catalog
 * item details, feedback, and decision artifacts. */
export type TechnologyBaselineSummary = {
  revision_id: string;
  revision_number: number;
  revision_status: string;
  technology_catalog_revision_id: string;
  gate_id: string;
  gate_status: string;
  gate_version: number;
  opened_at: string;
};

export type ActionInputSchema = {
  type: 'object';
  properties: Record<string, { type: string; enum?: string[]; enum_labels?: Record<string, string>; description?: string }>;
  required: string[];
};

export type ActionDescriptor = {
  /** Stable only within one projection response.  UI-02 deliberately binds a
   * stop to this id, never to an action code or a client-composed target. */
  descriptor_id: string;
  code: string;
  target: { resource_kind: 'PROJECT' | 'MODULE' | 'WORK_ITEM' | 'GATE' | 'ACCEPTANCE' | 'BLOCK' | 'PAUSE'; resource_id: string };
  command: { method: 'POST'; href: string; idempotency_required: boolean };
  expected: { resource_version?: number; gate_version?: number; pause_version?: number; fence?: string; as_of_event_id: number };
  confirmation: { required: boolean };
  input: { schema: ActionInputSchema | null; required_fields: string[] };
  presentation: { kind: 'HUMAN_DECISION' | 'HUMAN_OPERATION' | 'TECHNICAL_OPERATION' | 'ADMINISTRATIVE' | 'LEGACY'; label: string; description: string };
  input_binding: {
    fields: Array<{ name: string; source: 'HUMAN_INPUT' | 'SERVER_BOUND' | 'SERVER_DERIVED'; schema?: { type: string; enum?: string[]; enum_labels?: Record<string, string>; description?: string }; value?: unknown; send: boolean; editable: boolean }>;
    decision_options: Array<{ code: string; label: string; consequence: string }> | null;
  };
};

export type StopSurfaceProjection = {
  schema_version: typeof STOP_SURFACE_PROJECTION_SCHEMA;
  id: string;
  resource_kind: Exclude<ResourceKind, null>;
  resource_id: string;
  category: 'RECOVERY' | 'REVIEWER_RECOVERY' | 'BLOCK' | 'ESCALATION' | 'GATE' | 'INTEGRATION' | 'PAUSE' | 'CANCELLATION' | 'DELIVERY' | 'LEGACY' | 'LIFECYCLE' | 'PROJECTION_DIAGNOSTIC';
  type: string;
  resource_state: string;
  lifecycle_state: string | null;
  canonical_state: string | null;
  subject: { kind: string; id: string; generation?: string | number } | null;
  cause: { code: string; message: string; reason: string | null };
  operational_message: string;
  waiting_for: string | null;
  continuation: { kind: 'AUTOMATIC' | 'HUMAN_ACTION' | 'EXTERNAL_WAIT' | 'RECONCILIATION' | 'TERMINAL' | 'LEGACY_READ_ONLY' | 'UNMAPPED'; expected: string; progress: { stage?: string; attempt?: number; exhausted?: boolean } | null };
  authority: { required_roles: string[]; scope_kind: string; scope_id: string } | null;
  decisions: Array<{ code: string; label: string; consequence: string }>;
  evidence: Array<{ reference: string; summary: string; classification: 'PUBLIC' | 'RESTRICTED' }>;
  action_descriptor_id: string | null;
  terminal: boolean;
  redaction: { classification: 'PUBLIC' | 'RESTRICTED'; redacted: boolean };
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
    technology_baseline: TechnologyBaselineSummary | null;
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
  stop_surfaces: StopSurfaceProjection[];
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
type LegacyActionCode = 'PRODUCT_COMMITMENT_DECISION' | 'APPLY_REVIEW_ADJUSTMENTS' | 'RETRY_DISCOVERY' | 'RESOLVE_EXTERNAL_BLOCKER' | 'AUTHORIZE_REWORK' | 'MATERIALIZE_MODULE' | 'DECIDE_TECHNOLOGY_BASELINE';

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
      PRODUCT_COMMITMENT: ['MATERIALIZE_MODULE'],
    },
  },
  'PROJECT_DISCOVERY:3': {
    journey_status: 'LEGACY',
    publishes: {
      WAITING_FOR_PRODUCT_COMMITMENT: ['PRODUCT_COMMITMENT_DECISION'],
      WAITING_FOR_REVIEW_ADJUSTMENT: ['APPLY_REVIEW_ADJUSTMENTS'],
      DISCOVERY_FAILED: ['RETRY_DISCOVERY'],
      WAITING_FOR_TECHNOLOGY_BASELINE: ['DECIDE_TECHNOLOGY_BASELINE'],
      READY_FOR_MODULE_MATERIALIZATION: ['MATERIALIZE_MODULE'],
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
    `SELECT id,gate_code,status,version,scope_type,scope_id,condition_code,authority_roles,allowed_decisions,decision_effects,
       evidence,reason,decision,decided_at,created_at
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
    decision_effects: row.decision_effects ?? {},
    evidence: row.evidence ?? {},
    reason: row.reason ? String(row.reason) : null,
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
    decision_effects: {},
    evidence: row.evidence ?? {},
    reason: null,
    decision: null,
    decided_at: row.decided_at ? new Date(row.decided_at).toISOString() : null,
    created_at: new Date(row.opened_at).toISOString(),
  }));
};

/** The v3 baseline gate predates gate_records and therefore has its own
 * persisted authority. Read only the decision facts the canonical UI needs,
 * through the same snapshot client as every other projection fact. */
const readTechnologyBaselineFacts = async (client: pg.PoolClient, projectId: string): Promise<TechnologyBaselineSummary | null> => {
  const row = (await client.query(
    `SELECT r.id AS revision_id,r.revision_number,r.status AS revision_status,r.technology_catalog_revision_id,
       g.id AS gate_id,g.status AS gate_status,g.version AS gate_version,g.opened_at
     FROM technology_baseline_gates g
     JOIN technology_baseline_revisions r ON r.id=g.baseline_revision_id
     WHERE g.project_key=$1 AND r.project_key=$1
     ORDER BY g.opened_at DESC,g.id DESC
     LIMIT 1`, [projectId])).rows[0];
  if (!row) return null;
  return {
    revision_id: String(row.revision_id),
    revision_number: Number(row.revision_number),
    revision_status: String(row.revision_status),
    technology_catalog_revision_id: String(row.technology_catalog_revision_id),
    gate_id: String(row.gate_id),
    gate_status: String(row.gate_status),
    gate_version: Number(row.gate_version),
    opened_at: new Date(row.opened_at).toISOString(),
  };
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
      `SELECT r.id AS resume_id,p.id,p.resource_kind,p.resource_id,p.reason,p.version,p.pause_fence,p.previous_active_state,p.created_at
       FROM resume_records r JOIN pause_records p ON p.id=r.pause_id
       WHERE p.project_id=$1 AND r.result='RESUME_RECONCILIATION_REQUIRED' ORDER BY r.created_at DESC`, [projectId]);
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
    external_effects: effects.rows.map((row) => ({ resource_kind: String(row.resource_kind), resource_id: String(row.resource_id), status: String(row.status) })),
    resume_reconciliations: resumeReconciliations.rows.map((row) => ({ resume_id: String(row.resume_id), ...toStopRecord(row) })),
    reconciliation_required: effects.rows.length > 0 || (resumeReconciliations.rowCount ?? 0) > 0 || (recoveryReconciliations.rowCount ?? 0) > 0,
  };
};

/** Delivery lifecycle summary (allowlisted) derived from the shared snapshot. */
const readDeliverySummary = async (client: pg.PoolClient, projectId: string) => {
  const project = await client.query(`SELECT state,workflow_code,workflow_version FROM projects WHERE id=$1`, [projectId]);
  const pkg = await client.query(
      `SELECT id,delivery_revision,content_hash,normative_generation,delivered_at FROM delivery_packages WHERE project_id=$1 ORDER BY delivery_revision DESC LIMIT 1`, [projectId]);
  const acceptance = await client.query(
      `SELECT a.id,a.state,a.content_hash,a.delivery_revision FROM delivery_technical_acceptances a JOIN delivery_packages p ON p.id=a.package_id WHERE p.project_id=$1 ORDER BY a.created_at DESC LIMIT 1`, [projectId]);
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
      id: String(acceptance.rows[0].id),
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
  const strategies = await client.query(
      `SELECT s.acceptance_id,s.current_stage,s.exhausted_stages,s.stage_attempts,s.recovery_state,s.gate_reference,s.updated_at
       FROM reviewer_recovery_strategies s JOIN work_acceptances a ON a.id=s.acceptance_id
       WHERE a.project_id=$1 ORDER BY s.updated_at DESC LIMIT 50`, [projectId]);
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
    strategies: strategies.rows.map((row) => ({
      acceptance_id: String(row.acceptance_id), current_stage: Number(row.current_stage),
      exhausted_stages: Array.isArray(row.exhausted_stages) ? row.exhausted_stages.map(Number) : [],
      stage_attempts: row.stage_attempts ?? {}, recovery_state: String(row.recovery_state),
      gate_reference: row.gate_reference ? String(row.gate_reference) : null,
      updated_at: new Date(row.updated_at).toISOString(),
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
  delivery: Awaited<ReturnType<typeof readDeliverySummary>>;
  assurance: Awaited<ReturnType<typeof readAssuranceFacts>>;
  technologyBaseline: TechnologyBaselineSummary | null;
  materializationBaseline: MaterializationBaselineOptions;
};

const jsonSchema = (properties: Record<string, { type: string; enum?: string[]; enum_labels?: Record<string, string>; description?: string }>, required: string[]): ActionInputSchema => ({ type: 'object', properties, required });

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
    decisionOptions?: Array<{ code: string; label: string; consequence: string }>;
  }
): ActionDescriptor => {
  const presentation = presentationFor(input.code);
  const boundValue = (name: string): unknown => name === 'version'
    ? (input.gateVersion ?? input.resourceVersion)
    : name === 'expected_pause_version' ? input.pauseVersion
      : name === 'fence' ? input.fence
        : name === 'gate_id' || name === 'block_id' ? input.resourceId : undefined;
  const technical = new Set(['finding_ids', 'delivery_id', 'head_sha', 'worktree_id', 'recovery_classification', 'effect_certainty', 'dependency_id']);
  const fields = input.schema ? Object.entries(input.schema.properties).map(([name, schema]) => {
    const value = boundValue(name);
    const source = value !== undefined ? 'SERVER_BOUND' as const : technical.has(name) ? 'SERVER_DERIVED' as const : 'HUMAN_INPUT' as const;
    return { name, source, ...(source === 'HUMAN_INPUT' ? { schema } : {}), ...(value !== undefined ? { value } : {}), send: source === 'SERVER_BOUND' || source === 'HUMAN_INPUT', editable: source === 'HUMAN_INPUT' };
  }) : [];
  return {
  descriptor_id: `action:${input.code}:${input.resourceKind}:${input.resourceId}:${input.href}`,
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
  presentation,
  input_binding: { fields, decision_options: input.decisionOptions ?? null },
};
};

const presentationFor = (code: string): ActionDescriptor['presentation'] => {
  if (code === 'DECIDE_REVIEW' || code === 'RECONCILE_ACCEPTANCE') return { kind: 'TECHNICAL_OPERATION', label: 'Operação técnica', description: 'Executada pelo runtime governado; não requer uma decisão humana nesta tela.' };
  if (code === 'TRANSITION_BLOCK' || code === 'RECORD_HUMAN_GATE') return { kind: 'ADMINISTRATIVE', label: 'Operação administrativa', description: 'Não é uma continuação humana ordinária publicada para esta superfície.' };
  if (code === 'AUTHORIZE_REWORK' || code === 'PRODUCT_COMMITMENT_DECISION' || code === 'APPLY_REVIEW_ADJUSTMENTS' || code === 'RETRY_DISCOVERY' || code === 'MATERIALIZE_MODULE' || code === 'DECIDE_TECHNOLOGY_BASELINE') return { kind: 'LEGACY', label: 'Capacidade legada', description: 'Capacidade explícita de adapter legado; o servidor continua a revalidar todos os fatos.' };
  if (code === 'DECIDE_GATE' || code === 'DECIDE_DELIVERY_ACCEPTANCE') return { kind: 'HUMAN_DECISION', label: 'Decisão governada', description: 'Decisão humana limitada às opções publicadas pelo catálogo.' };
  return { kind: 'HUMAN_OPERATION', label: 'Operação humana', description: 'Operação autorizada e revalidada pelo servidor.' };
};

/** Async capability helper bound to the projection principal + snapshot now. */
type Capability = { action: string; projectId?: string; resourceType?: string; resourceId?: string; roles?: string[] };
const capabilityResolver = (principal: AuthenticatedPrincipal, snapshotNow: Date, client: pg.PoolClient) =>
  async (requirement: Capability): Promise<boolean> => {
    const verdict = await resolveCapability(principal, requirement, snapshotNow, client);
    return verdict.allowed;
  };

const gateDecisionSchema = (gate: { allowed_decisions: string[] }) => jsonSchema(
  {
    version: { type: 'integer', description: 'Current gate version to decide against.' },
    decision: { type: 'string', enum: gate.allowed_decisions, description: 'Published decision for the gate.' },
    reason: { type: 'string', description: 'Feedback/justification (required for non-approval decisions).' },
    evidence: { type: 'object', description: 'Published evidence for the decision.' },
  },
  ['version', 'decision', 'evidence']
);
const gateDecisionOptions = (gate: { allowed_decisions: string[]; decision_effects: unknown }) => {
  const effects = gate.decision_effects && typeof gate.decision_effects === 'object' ? gate.decision_effects as Record<string, unknown> : {};
  return gate.allowed_decisions.map((code) => {
    const effect = effects[code] && typeof effects[code] === 'object' ? effects[code] as Record<string, unknown> : {};
    return { code, label: code, consequence: typeof effect.consequence === 'string' ? effect.consequence : 'Consequência publicada pelo catálogo.' };
  });
};
const technologyBaselineDecisionSchema = (gateId: string) => jsonSchema(
  {
    gate_id: { type: 'string', enum: [gateId], description: 'Open Technology Baseline gate being decided.' },
    version: { type: 'integer', description: 'Current Technology Baseline gate version.' },
    decision: { type: 'string', enum: ['APPROVED', 'REJECTED'], enum_labels: { APPROVED: 'Aprovar', REJECTED: 'Solicitar ajustes' }, description: 'Technology Baseline decision.' },
    feedback: { type: 'string', description: 'Required when requesting adjustments.' },
  },
  ['gate_id', 'version', 'decision']
);
const stopInputSchema = (withEvidence: boolean) => jsonSchema(
  {
    reason: { type: 'string', description: 'Reason for the stop operation.' },
    ...(withEvidence ? { evidence: { type: 'object', description: 'Evidence of the stop operation.' } } : {}),
  },
  withEvidence ? ['reason', 'evidence'] : ['reason']
);

/** Mirrors materializeModule's persisted payload contract.  Only module_key is
 * command-required today; the remaining proposal fields stay optional exactly
 * as the command accepts them. */
const materializationInputSchema = (baseline: MaterializationBaselineOptions) => jsonSchema(
  {
    module_key: { type: 'string', description: 'Lowercase kebab-case module identifier.' },
    name: { type: 'string', description: 'Human-readable module name.' },
    objective: { type: 'string', description: 'Business objective of the module.' },
    scope: { type: 'array', description: 'In-scope capabilities.' },
    out_of_scope: { type: 'array', description: 'Explicit exclusions.' },
    dependencies: { type: 'array', description: 'Module dependencies.' },
    acceptance_criteria: { type: 'array', description: 'Acceptance criteria.' },
    source_gate: { type: 'string', description: 'Optional source gate reference.' },
    ...(baseline.baseline_required ? {
      technology_baseline_revision_id: {
        type: 'string',
        enum: baseline.approved_revisions.map((revision) => revision.id),
        enum_labels: Object.fromEntries(baseline.approved_revisions.map((revision) => [revision.id, `Approved baseline #${revision.revision_number}`])),
        description: 'Approved Technology Baseline revision used for this module.',
      },
    } : {}),
  },
  ['module_key']
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
      schema: gateDecisionSchema(gate), decisionOptions: gateDecisionOptions(gate),
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
        gateVersion: openGate.version, confirmationRequired: true, schema: gateDecisionSchema(openGate), decisionOptions: gateDecisionOptions(openGate),
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
    } else if (code === 'MATERIALIZE_MODULE') {
      // This action is intentionally published only by declared legacy
      // adapters.  v3 additionally requires approved revisions from the same
      // projection snapshot; legacy v2 never gains that new requirement.
      if (project.archived) continue;
      if (ctx.materializationBaseline.baseline_required && !ctx.materializationBaseline.approved_revisions.length) continue;
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'MATERIALIZE_MODULE', resourceKind: 'PROJECT', resourceId: projectId,
        href: `/api/projects/${projectId}/modules`, idempotencyRequired: true,
        confirmationRequired: false, schema: materializationInputSchema(ctx.materializationBaseline),
      }));
    } else if (code === 'DECIDE_TECHNOLOGY_BASELINE') {
      const baseline = ctx.technologyBaseline;
      // This historical command is valid only for the exact persisted v3
      // state and its matching open pending gate; no state-name fallback.
      if (!baseline || project.archived || project.workflow_code !== 'PROJECT_DISCOVERY' || project.workflow_version !== 3 || project.state !== 'WAITING_FOR_TECHNOLOGY_BASELINE') continue;
      if (baseline.revision_status !== 'PENDING_APPROVAL' || baseline.gate_status !== 'OPEN') continue;
      if (!(await can({ action: 'OPERATE_PROJECT', projectId, roles: ['OPERATOR'] }))) continue;
      actions.push(descriptor(ctx, {
        code: 'DECIDE_TECHNOLOGY_BASELINE', resourceKind: 'GATE', resourceId: baseline.gate_id,
        href: `/api/projects/${projectId}/technology-baselines/${baseline.revision_id}/decision`, idempotencyRequired: true,
        gateVersion: baseline.gate_version, confirmationRequired: true, schema: technologyBaselineDecisionSchema(baseline.gate_id),
      }));
    }
  }
  return actions;
};

const buildLegacyWorkItemActions = async (ctx: DescriptorContext, can: ReturnType<typeof capabilityResolver>, item: Awaited<ReturnType<typeof readWorkItemFacts>>[number], adapter: LegacyAdapter) => {
  const actions: ActionDescriptor[] = [];
  // The historical rework schema records a finding/delivery/SHA tuple, but
  // has no immutable resource-version plus applicable fence to prove the
  // single safe tuple required by UI-02.  Publishing AUTHORIZE_REWORK would
  // ask the operator to resolve that ambiguity with technical IDs, so this
  // adapter is deliberately read-only until a versioned legacy contract can
  // prove all required facts in the same snapshot.
  void ctx; void can; void item; void adapter;
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
 * STOP_SURFACE_PROJECTION:v1
 *
 * This is intentionally a pure, allowlisted adapter over the facts already
 * read for STATE_ACTION_PROJECTION.  It never performs card-by-card I/O and
 * it does not turn recovery mechanics into browser commands.
 * ------------------------------------------------------------------ */

const evidence = (reference: string, summary: string, classification: 'PUBLIC' | 'RESTRICTED' = 'PUBLIC') => [{ reference, summary, classification }];
const actionFor = (actions: ActionDescriptor[], code: string, kind: string, id: string) =>
  actions.find((action) => action.code === code && action.target.resource_kind === kind && action.target.resource_id === id && (action.presentation.kind === 'HUMAN_DECISION' || action.presentation.kind === 'HUMAN_OPERATION'))?.descriptor_id ?? null;

const buildStopSurfaces = (ctx: DescriptorContext, actions: ActionDescriptor[]): StopSurfaceProjection[] => {
  const surfaces: StopSurfaceProjection[] = [];
  const resource = (kind: Exclude<ResourceKind, null>, id: string) => {
    if (kind === 'PROJECT') return { state: ctx.project.state, canonical: ctx.project.canonical_state };
    if (kind === 'MODULE') { const item = ctx.modules.find((value) => value.id === id); return { state: item?.state ?? 'UNKNOWN', canonical: item?.canonical_state ?? null }; }
    if (kind === 'WORK_ITEM') { const item = ctx.workItems.find((value) => value.id === id); return { state: item?.state ?? 'UNKNOWN', canonical: item?.canonical_state ?? null }; }
    return { state: 'OPEN', canonical: null };
  };
  const add = (input: Omit<StopSurfaceProjection, 'schema_version' | 'id' | 'redaction'> & { id: string; restricted?: boolean }) => {
    surfaces.push({ schema_version: STOP_SURFACE_PROJECTION_SCHEMA, id: input.id, resource_kind: input.resource_kind, resource_id: input.resource_id,
      category: input.category, type: input.type, resource_state: input.resource_state, lifecycle_state: input.lifecycle_state,
      canonical_state: input.canonical_state, subject: input.subject, cause: input.cause, operational_message: input.operational_message,
      waiting_for: input.waiting_for, continuation: input.continuation, authority: input.authority, decisions: input.decisions,
      evidence: input.evidence, action_descriptor_id: input.action_descriptor_id, terminal: input.terminal,
      redaction: { classification: input.restricted ? 'RESTRICTED' : 'PUBLIC', redacted: Boolean(input.restricted) } });
  };
  const stopped = new Set<string>();
  const addPause = (record: StopRecordSummary, cancelled: boolean) => {
    const r = resource(record.resource_kind, record.resource_id); const isProject = record.resource_kind === 'PROJECT';
    const action = cancelled ? null : actionFor(actions, isProject ? 'RESUME_PROJECT' : 'RESUME_MODULE', 'PAUSE', record.id);
    add({ id: `${cancelled ? 'cancellation' : 'pause'}:${record.id}:${record.version}`, resource_kind: record.resource_kind, resource_id: record.resource_id,
      category: cancelled ? 'CANCELLATION' : 'PAUSE', type: cancelled ? 'CANCELLED' : 'PAUSED', resource_state: cancelled ? 'CANCELLED' : r.state,
      lifecycle_state: r.state, canonical_state: r.canonical, subject: null,
      cause: { code: cancelled ? 'CANCELLED' : 'PAUSED', message: cancelled ? 'Cancelamento terminal registrado.' : 'Pausa operacional registrada.', reason: record.reason },
      operational_message: cancelled ? 'Este recurso foi cancelado e não possui continuação operacional.' : 'O recurso está pausado; trabalho em voo não deve avançar.',
      waiting_for: cancelled ? null : 'Uma retomada autorizada ou a reconciliação exigida pelo servidor.',
      continuation: cancelled ? { kind: 'TERMINAL', expected: 'Preservar os fatos e evidências do cancelamento.', progress: null } : { kind: action ? 'HUMAN_ACTION' : 'EXTERNAL_WAIT', expected: 'Retomada pode exigir RESUME_RECONCILIATION_REQUIRED; não restaura estado cegamente.', progress: null },
      authority: cancelled ? { required_roles: ['BUSINESS_OWNER'], scope_kind: record.resource_kind, scope_id: record.resource_id } : { required_roles: ['ON_CALL_OWNER'], scope_kind: record.resource_kind, scope_id: record.resource_id },
      decisions: [], evidence: evidence(`stop_record:${record.id}`, 'Registro de pausa/cancelamento.'), action_descriptor_id: action, terminal: cancelled });
    stopped.add(`${record.resource_kind}:${record.resource_id}`);
  };
  ctx.stop.cancellations.forEach((record) => addPause(record, true));
  ctx.stop.pauses.forEach((record) => addPause(record, false));
  for (const record of ctx.stop.resume_reconciliations) {
    const r = resource(record.resource_kind, record.resource_id);
    add({ id: `resume-reconciliation:${record.resume_id}`, resource_kind: record.resource_kind, resource_id: record.resource_id, category: 'PAUSE', type: 'RESUME_RECONCILIATION_REQUIRED', resource_state: r.state,
      lifecycle_state: r.state, canonical_state: r.canonical, subject: { kind: 'PAUSE_RECORD', id: record.id }, cause: { code: 'RESUME_RECONCILIATION_REQUIRED', message: 'A retomada não pode restaurar o estado cegamente.', reason: record.reason },
      operational_message: 'O servidor detectou uma divergência durante a retomada.', waiting_for: 'Reconciliação técnica.', continuation: { kind: 'RECONCILIATION', expected: 'Reconciliação antes de qualquer nova continuação.', progress: null }, authority: null,
      decisions: [], evidence: evidence(`resume_record:${record.resume_id}`, 'Resultado de retomada publicado.'), action_descriptor_id: null, terminal: false });
    stopped.add(`${record.resource_kind}:${record.resource_id}`);
  }
  for (const effect of ctx.stop.external_effects.filter((value) => ['PROJECT', 'MODULE', 'WORK_ITEM', 'EXECUTION'].includes(value.resource_kind))) {
    const kind = effect.resource_kind as Exclude<ResourceKind, null>; const r = resource(kind, effect.resource_id);
    add({ id: `external-effect:${kind}:${effect.resource_id}:${effect.status}`, resource_kind: kind, resource_id: effect.resource_id, category: 'RECOVERY', type: effect.status, resource_state: effect.status,
      lifecycle_state: ['PROJECT', 'MODULE', 'WORK_ITEM'].includes(kind) ? r.state : null, canonical_state: ['PROJECT', 'MODULE', 'WORK_ITEM'].includes(kind) ? r.canonical : null, subject: null,
      cause: { code: effect.status, message: 'O efeito externo exige reconciliação.', reason: null }, operational_message: 'A certeza do efeito não permite repetição cega.', waiting_for: 'Reconciliação técnica da fonte externa.',
      continuation: { kind: 'RECONCILIATION', expected: 'RECONCILE BEFORE RETRY', progress: null }, authority: null, decisions: [], evidence: evidence(`external_effect:${kind}:${effect.resource_id}`, 'Referência de efeito externo.', 'RESTRICTED'), action_descriptor_id: null, terminal: false, restricted: true });
    stopped.add(`${kind}:${effect.resource_id}`);
  }

  for (const decision of ctx.recovery.filter((value) => ['PENDING', 'EXECUTING', 'WAITING_RECONCILIATION'].includes(value.execution_state))) {
    const r = resource(decision.resource_kind, decision.resource_id); const reconciling = decision.execution_state === 'WAITING_RECONCILIATION' || decision.effect_certainty === 'EFFECT_UNKNOWN';
    add({ id: `recovery:${decision.id}`, resource_kind: decision.resource_kind, resource_id: decision.resource_id, category: decision.selected_action === 'INTEGRATION_RECOVERY' ? 'INTEGRATION' : 'RECOVERY', type: decision.cause,
      resource_state: decision.execution_state, lifecycle_state: r.state === 'UNKNOWN' ? null : r.state, canonical_state: r.canonical,
      subject: null, cause: { code: decision.cause, message: 'Recovery técnico classificado pelo servidor.', reason: decision.reason },
      operational_message: reconciling ? 'O efeito anterior é incerto; o servidor reconcilia antes de qualquer repetição.' : 'A recuperação técnica está sob controle do runtime.',
      waiting_for: reconciling ? 'Reconciliação técnica da fonte de efeito.' : 'Conclusão do recovery automático.',
      continuation: { kind: reconciling ? 'RECONCILIATION' : 'AUTOMATIC', expected: reconciling ? 'RECONCILE BEFORE RETRY' : 'Ação técnica limitada pelo RECOVERY_POLICY:v1.', progress: { stage: decision.execution_state } },
      authority: null, decisions: [], evidence: evidence(`recovery:${decision.id}`, 'Decisão de recovery e referências permitidas.', 'RESTRICTED'), action_descriptor_id: null, terminal: false, restricted: true });
    stopped.add(`${decision.resource_kind}:${decision.resource_id}`);
  }

  for (const gate of ctx.gates.filter((value) => value.status === 'OPEN')) {
    const delivery = gate.gate_code === 'DELIVERY_ACCEPTANCE'; const descriptor = actionFor(actions, delivery ? 'DECIDE_DELIVERY_ACCEPTANCE' : 'DECIDE_GATE', 'GATE', gate.id);
    const effects = gateDecisionOptions(gate);
    add({ id: `gate:${gate.id}:${gate.version}`, resource_kind: 'GATE', resource_id: gate.id, category: delivery ? 'DELIVERY' : 'GATE', type: gate.gate_code,
      resource_state: gate.status, lifecycle_state: null, canonical_state: null,
      subject: delivery && (ctx.delivery as any)?.delivery_package ? { kind: 'DELIVERY_PACKAGE', id: String((ctx.delivery as any).delivery_package.id), generation: (ctx.delivery as any).delivery_package.normative_generation } : null,
      cause: { code: gate.condition_code, message: `Gate ${gate.gate_code} aberto.`, reason: gate.reason },
      operational_message: delivery ? 'A aceitação de negócio é distinta do aceite técnico e da entrega concluída.' : 'Uma decisão catalogada é necessária para esta condição.',
      waiting_for: descriptor ? 'Sua decisão governada.' : `Autoridade ${gate.authority_roles.join(', ') || 'catalogada'} no escopo publicado.`,
      continuation: { kind: 'HUMAN_ACTION', expected: 'Decisão exata do catálogo GAT-01.', progress: null },
      authority: { required_roles: gate.authority_roles, scope_kind: gate.scope_type, scope_id: gate.scope_id }, decisions: effects,
      evidence: evidence(`gate:${gate.id}`, 'Evidência pública permitida do gate.', 'RESTRICTED'), action_descriptor_id: descriptor, terminal: false, restricted: true });
    stopped.add(`GATE:${gate.id}`);
  }
  const delivery = ctx.delivery as any;
  const pkg = delivery?.delivery_package;
  if (pkg && !delivery?.technical_acceptance && !delivery?.delivery_gate) {
    add({ id: `delivery-preparation:${pkg.id}:${pkg.normative_generation}`, resource_kind: 'PROJECT', resource_id: ctx.project.id, category: 'DELIVERY', type: 'DELIVERY_PREPARATION', resource_state: ctx.project.state,
      lifecycle_state: ctx.project.state, canonical_state: ctx.project.canonical_state, subject: { kind: 'DELIVERY_PACKAGE', id: String(pkg.id), generation: pkg.normative_generation },
      cause: { code: 'DELIVERY_PREPARATION', message: 'Pacote de delivery em preparação.', reason: null }, operational_message: 'A preparação de delivery é automática e não constitui aceite nem entrega.', waiting_for: 'Materialização e assurance técnica do pacote.',
      continuation: { kind: 'AUTOMATIC', expected: 'Executar a preparação técnica governada.', progress: null }, authority: null, decisions: [], evidence: evidence(`delivery_package:${pkg.id}`, 'Referência pública do pacote.', 'RESTRICTED'), action_descriptor_id: null, terminal: false, restricted: true });
  }
  if (pkg && delivery?.technical_acceptance && !delivery?.delivery_gate) {
    const technical = delivery.technical_acceptance;
    add({ id: `delivery-assurance:${technical.id}:${technical.delivery_revision}`, resource_kind: 'ACCEPTANCE', resource_id: String(technical.id), category: 'DELIVERY', type: 'RELEASE_TECHNICAL_ACCEPTANCE', resource_state: String(technical.state),
      lifecycle_state: null, canonical_state: null, subject: { kind: 'DELIVERY_PACKAGE', id: String(pkg.id), generation: pkg.normative_generation },
      cause: { code: 'RELEASE_TECHNICAL_ACCEPTANCE', message: 'Assurance técnica de delivery publicada.', reason: null }, operational_message: 'Aceite técnico não equivale a DELIVERY_ACCEPTANCE nem a DELIVERED.', waiting_for: 'Conclusão técnica ou reconciliação do package.',
      continuation: { kind: String(technical.state).includes('RECONCIL') ? 'RECONCILIATION' : 'AUTOMATIC', expected: 'A assurance técnica é processada pelo runtime.', progress: null }, authority: null, decisions: [], evidence: evidence(`delivery_package:${pkg.id}`, 'Referência pública do pacote.', 'RESTRICTED'), action_descriptor_id: null, terminal: false, restricted: true });
  }
  if (pkg?.delivered_at || ctx.project.state === 'DELIVERED') {
    add({ id: `delivered:${ctx.project.id}:${pkg?.delivery_revision ?? 'lifecycle'}`, resource_kind: 'PROJECT', resource_id: ctx.project.id, category: 'DELIVERY', type: 'DELIVERED', resource_state: 'DELIVERED', lifecycle_state: ctx.project.state,
      canonical_state: ctx.project.canonical_state, subject: pkg ? { kind: 'DELIVERY_PACKAGE', id: String(pkg.id), generation: pkg.normative_generation } : null, cause: { code: 'DELIVERED', message: 'Entrega autoritativa concluída.', reason: null },
      operational_message: 'DELIVERED é terminal e não é inferido apenas por sucesso técnico ou aceite de negócio.', waiting_for: null, continuation: { kind: 'TERMINAL', expected: 'Preservar os fatos de entrega.', progress: null }, authority: null, decisions: [], evidence: pkg ? evidence(`delivery_package:${pkg.id}`, 'Referência pública da entrega.', 'RESTRICTED') : [], action_descriptor_id: null, terminal: true, restricted: Boolean(pkg) });
    stopped.add(`PROJECT:${ctx.project.id}`);
  }

  for (const acceptance of ctx.assurance.acceptances.filter((value) => !['ACCEPTED', 'CANCELLED'].includes(value.state))) {
    const strategy = ctx.assurance.strategies.find((value) => value.acceptance_id === acceptance.id); const stage = strategy?.current_stage;
    const automatic = !stage || stage <= 6; const cancelled = actionFor(actions, 'CANCEL_ACCEPTANCE', 'ACCEPTANCE', acceptance.id);
    add({ id: `acceptance:${acceptance.id}:${acceptance.version}`, resource_kind: 'ACCEPTANCE', resource_id: acceptance.id, category: 'REVIEWER_RECOVERY', type: acceptance.state,
      resource_state: acceptance.state, lifecycle_state: null, canonical_state: null,
      subject: acceptance.subject && typeof acceptance.subject === 'object' ? { kind: String((acceptance.subject as any).subject_kind), id: String((acceptance.subject as any).subject_id), generation: String((acceptance.subject as any).normative_generation) } : null,
      cause: { code: acceptance.state, message: 'Assurance/review independente em andamento ou aguardando recuperação.', reason: null },
      operational_message: automatic ? 'Os estágios 1–6 de recuperação de reviewer são automáticos.' : 'A recuperação chegou a gate ou escalada governada; consulte a superfície correspondente.',
      waiting_for: automatic ? 'Seleção, retry, routing ou specialist técnico.' : 'Gate catalogado ou continuação de block publicada.',
      continuation: { kind: automatic ? 'AUTOMATIC' : 'EXTERNAL_WAIT', expected: automatic ? 'REC-02 prossegue sem reexecutar o produtor.' : 'Apenas o gate/continuation publicado pode avançar.', progress: stage ? { stage: `REC-02 stage ${stage}`, attempt: Number((strategy?.stage_attempts as any)?.[stage] ?? 0), exhausted: strategy?.exhausted_stages.includes(stage) } : null },
      authority: null, decisions: [], evidence: evidence(`acceptance:${acceptance.id}`, 'Estado sanitizado da acceptance.', 'RESTRICTED'), action_descriptor_id: cancelled, terminal: false, restricted: true });
    stopped.add(`ACCEPTANCE:${acceptance.id}`);
  }
  for (const block of ctx.assurance.blocks.filter((value) => !['RESOLVED', 'CANCELLED'].includes(value.state))) {
    add({ id: `block:${block.id}:${block.state}`, resource_kind: 'BLOCK', resource_id: block.id, category: block.state === 'ESCALATED' ? 'ESCALATION' : 'BLOCK', type: block.block_code,
      resource_state: block.state, lifecycle_state: null, canonical_state: null, subject: block.acceptance_id ? { kind: 'ACCEPTANCE', id: block.acceptance_id } : null,
      cause: { code: block.block_code, message: 'Block de Assurance aberto.', reason: block.category }, operational_message: 'O block preserva a causa e aguarda somente a continuação publicada por REC-02/GAT-01.',
      waiting_for: block.state === 'ESCALATED' ? 'Gate catalogado ou autoridade de escalada.' : 'Continuação automática, externa ou gate correspondente.',
      continuation: { kind: block.state === 'ESCALATED' ? 'EXTERNAL_WAIT' : 'AUTOMATIC', expected: 'Resolver o block não reexecuta o produtor automaticamente.', progress: null }, authority: null, decisions: [],
      evidence: evidence(`block:${block.id}`, 'Block e categoria permitidos.', 'RESTRICTED'), action_descriptor_id: null, terminal: false, restricted: true });
    stopped.add(`BLOCK:${block.id}`);
  }

  const lifecycleStops = new Map<string, { category: StopSurfaceProjection['category']; continuation: StopSurfaceProjection['continuation']['kind']; expected: string; code: string }>([
    ['REWORK_ELIGIBLE', { category: 'RECOVERY', continuation: 'AUTOMATIC', expected: 'Rework/dispatch é escolhido pelo servidor.', code: 'REWORK_ELIGIBLE' }],
    ['WAITING_FOR_EXTERNAL_INPUT', { category: 'LIFECYCLE', continuation: 'EXTERNAL_WAIT', expected: 'Aguardar a resolução externa autorizada.', code: 'WAITING_FOR_EXTERNAL_INPUT' }],
    ['WAITING_FOR_DEPENDENCIES', { category: 'LIFECYCLE', continuation: 'AUTOMATIC', expected: 'Aguardar dependências técnicas.', code: 'WAITING_FOR_DEPENDENCIES' }],
    ['WAITING_FOR_ESCALATION', { category: 'ESCALATION', continuation: 'EXTERNAL_WAIT', expected: 'Gate de escalada catalogado, quando publicado.', code: 'WAITING_FOR_ESCALATION' }],
  ]);
  for (const item of ctx.workItems) {
    const mapped = lifecycleStops.get(item.state); if (!mapped || stopped.has(`WORK_ITEM:${item.id}`)) continue;
    const descriptor = item.state === 'WAITING_FOR_EXTERNAL_INPUT' ? actionFor(actions, 'RESOLVE_EXTERNAL_BLOCKER', 'WORK_ITEM', item.id) : null;
    add({ id: `lifecycle:WORK_ITEM:${item.id}:${item.version}:${mapped.code}`, resource_kind: 'WORK_ITEM', resource_id: item.id, category: mapped.category, type: mapped.code, resource_state: item.state,
      lifecycle_state: item.state, canonical_state: item.canonical_state, subject: null, cause: { code: mapped.code, message: 'Estado de lifecycle publicado.', reason: null }, operational_message: mapped.expected,
      waiting_for: descriptor ? 'Uma operação humana autorizada.' : mapped.expected, continuation: { kind: descriptor ? 'HUMAN_ACTION' : mapped.continuation, expected: mapped.expected, progress: null }, authority: descriptor ? { required_roles: ['OPERATOR'], scope_kind: 'WORK_ITEM', scope_id: item.id } : null,
      decisions: [], evidence: [], action_descriptor_id: descriptor, terminal: false });
    stopped.add(`WORK_ITEM:${item.id}`);
  }

  const legacyResources: Array<{ kind: 'PROJECT' | 'MODULE' | 'WORK_ITEM'; id: string; state: string; canonical: string; workflow: WorkflowKind }> = [
    { kind: 'PROJECT', id: ctx.project.id, state: ctx.project.state, canonical: ctx.project.canonical_state, workflow: workflowKind(ctx.project.workflow_code, ctx.project.workflow_version, ctx.project.workflow_status) },
    ...ctx.modules.map((value) => ({ kind: 'MODULE' as const, id: value.id, state: value.state, canonical: value.canonical_state, workflow: workflowKind(value.workflow_code, value.workflow_version, value.workflow_status) })),
    ...ctx.workItems.map((value) => ({ kind: 'WORK_ITEM' as const, id: value.id, state: value.state, canonical: value.canonical_state, workflow: workflowKind(value.workflow_code, value.workflow_version, value.workflow_status) })),
  ];
  for (const item of legacyResources.filter((value) => value.workflow.legacy && !stopped.has(`${value.kind}:${value.id}`))) {
    add({ id: `legacy:${item.kind}:${item.id}:${item.state}`, resource_kind: item.kind, resource_id: item.id, category: 'LEGACY', type: 'LEGACY_READ_ONLY', resource_state: item.state, lifecycle_state: item.state, canonical_state: item.canonical,
      subject: null, cause: { code: 'LEGACY_READ_ONLY', message: 'Workflow legado ou desconhecido sem capability comprovável.', reason: null }, operational_message: 'Consulta somente leitura; nenhuma ação é inferida.', waiting_for: 'Orientação do adapter explícito ou consulta histórica.',
      continuation: { kind: 'LEGACY_READ_ONLY', expected: 'Nenhuma capability é publicada sem adapter comprovado.', progress: null }, authority: null, decisions: [], evidence: [], action_descriptor_id: null, terminal: false });
  }
  // A current published workflow must never be silently downgraded to legacy
  // merely because UI-02 lacks an adapter for a normative stop.
  const normativeStops = new Set(['PAUSED', 'CANCELLED', 'ARCHIVED', 'RECOVERY_REQUIRED', 'WAITING_RECONCILIATION', 'BLOCKED', 'WAITING_FOR_INDEPENDENT_REVIEWER', 'REWORK_REQUIRED', 'WAITING_FOR_ESCALATION']);
  for (const item of legacyResources.filter((value) => value.workflow.current && normativeStops.has(value.state) && !surfaces.some((surface) => surface.resource_kind === value.kind && surface.resource_id === value.id))) {
    add({ id: `unmapped:${item.kind}:${item.id}:${item.state}`, resource_kind: item.kind, resource_id: item.id, category: 'PROJECTION_DIAGNOSTIC', type: 'UNMAPPED_STOP_SURFACE', resource_state: item.state,
      lifecycle_state: item.state, canonical_state: item.canonical, subject: null, cause: { code: 'UNMAPPED_STOP_SURFACE', message: 'Parada normativa atual sem mapper de apresentação.', reason: null },
      operational_message: 'A projeção preservou o estado real e bloqueou ações até que o mapper seja implementado.', waiting_for: 'Correção server-side da projeção.',
      continuation: { kind: 'UNMAPPED', expected: 'Nenhuma ação é publicada para uma parada sem mapper.', progress: null }, authority: null, decisions: [], evidence: [], action_descriptor_id: null, terminal: false });
  }
  return surfaces.sort((a, b) => Number(b.terminal) - Number(a.terminal) || a.resource_kind.localeCompare(b.resource_kind) || a.resource_id.localeCompare(b.resource_id) || a.id.localeCompare(b.id));
};

/* ------------------------------------------------------------------ *
 * cause + next_action derivation (from persisted facts, never state-name
 * inference on unknown states)
 * ------------------------------------------------------------------ */

const deriveCause = (ctx: DescriptorContext): { code: string | null; resource_kind: ResourceKind; resource_id: string | null } => {
  const { project, stop, gates, recovery, technologyBaseline } = ctx;
  if (stop.projectCancellation) return { code: 'CANCELLED', resource_kind: 'PROJECT', resource_id: project.id };
  if (stop.projectPause) return { code: 'PAUSED', resource_kind: 'PROJECT', resource_id: project.id };
  const activeRecovery = recovery.find((r) => ['PENDING', 'EXECUTING', 'WAITING_RECONCILIATION'].includes(r.execution_state));
  if (activeRecovery) return { code: activeRecovery.cause, resource_kind: activeRecovery.resource_kind === 'EXECUTION' ? 'EXECUTION' : 'WORK_ITEM', resource_id: activeRecovery.resource_id };
  const openGate = gates.find((gate) => gate.status === 'OPEN');
  if (openGate) return { code: openGate.gate_code, resource_kind: 'GATE', resource_id: openGate.id };
  if (technologyBaseline?.gate_status === 'OPEN') return { code: 'TECHNOLOGY_BASELINE', resource_kind: 'GATE', resource_id: technologyBaseline.gate_id };
  if (project.archived) return { code: 'ARCHIVED', resource_kind: 'PROJECT', resource_id: project.id };
  if (project.failure_code) return { code: project.failure_code, resource_kind: 'PROJECT', resource_id: project.id };
  return { code: null, resource_kind: null, resource_id: null };
};

const deriveNextAction = (ctx: DescriptorContext, allowed: ActionDescriptor[]): { text: string; descriptor_code?: string } | null => {
  const { stop, gates, recovery, technologyBaseline } = ctx;
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
  if (technologyBaseline?.gate_status === 'OPEN') {
    const decide = allowed.find((action) => action.code === 'DECIDE_TECHNOLOGY_BASELINE');
    return { text: 'Decisão pendente na Technology Baseline.', ...(decide ? { descriptor_code: decide.code } : {}) };
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
    const technologyBaseline = await readTechnologyBaselineFacts(client, projectId);
    const stop = await readStopFacts(client, projectId);
    const delivery = await readDeliverySummary(client, projectId);
    const recovery = await readRecoveryFacts(client, projectId);
    const assurance = await readAssuranceFacts(client, projectId);
    const materializationBaseline = await materializationBaselineOptionsForClient(client, projectId);
    const activityFacts = await readActivityFacts(client, projectId, snapshotNow);
    const asOfEventRow = await client.query(`SELECT COALESCE(MAX(id),0)::bigint AS as_of_event_id FROM events WHERE project_id=$1`, [projectId]);
    const asOfEventId = Number(asOfEventRow.rows[0].as_of_event_id ?? 0);

    const ctx: DescriptorContext = { projectId, asOfEventId, project, modules, workItems, gates, legacyGates, stop, recovery, delivery, assurance, technologyBaseline, materializationBaseline };
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

    // Descriptor ids are projection-local capabilities.  Collisions are made
    // explicit instead of letting a renderer accidentally select by code.
    const descriptorOccurrences = new Map<string, number>();
    for (const action of allowed) {
      const count = descriptorOccurrences.get(action.descriptor_id) ?? 0;
      descriptorOccurrences.set(action.descriptor_id, count + 1);
      if (count) action.descriptor_id = `${action.descriptor_id}:${count + 1}`;
    }

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
    const stopSurfaces = buildStopSurfaces(ctx, allowed);

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
        technology_baseline: technologyBaseline,
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
      stop_surfaces: stopSurfaces,
    };
  });
};
