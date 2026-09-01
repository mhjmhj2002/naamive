import { randomUUID } from 'node:crypto';
import { withTransaction } from './db.js';
import { putArtifact } from './artifacts.js';
import { MODULE_PLAN_SCHEMA_VERSION, MODULE_PLAN_VALIDATOR_VERSION, MODULE_PLAN_QA_MATRIX, canonicalHash, capabilities, buildPlanContext } from './module-planning.js';

export type SeededPlanQa = { command: string; cwd: string; timeout_seconds: number; kind?: string };
export type SeededPlanWorkItem = {
  logical_id?: string;
  title: string;
  allowlist: string[];
  denylist: string[];
  output?: string;
  acceptance_criteria?: string[];
  inputs?: string[];
  qa_matrix: SeededPlanQa[];
  depends_on_ids?: string[];
};

export type SeededPlan = { plan_revision_id: string; gate_id: string; version: number };

/**
 * Seeds a valid, persisted module-plan/v1 revision (plus its MODULE_PLAN_APPROVAL
 * gate and the legacy module-plan evidence artifact) for the F5-23 two-step
 * approval flow, then returns the identifiers needed to call approveModulePlan.
 *
 * Used only by tests. It replaces the raw `work_items` approval with the
 * agent-proposal → operator-approval contract, but allows each test to keep its
 * exact work-item shape (allowlist, QA commands, rework path) which the
 * deterministic controlled fixture cannot express. No agent or worker call
 * happens here, so no real Codex invocation can ever occur.
 */
export const seedPlanRevision = async (projectId: string, moduleId: string, items: SeededPlanWorkItem[], workItemWorkflowVersion = 2): Promise<SeededPlan> =>
  withTransaction(async (c) => {
    const m = (await c.query(`SELECT m.*, r.payload revision_payload, r.criteria revision_criteria FROM modules m JOIN module_revisions r ON r.id=m.current_revision_id WHERE m.id=$1 AND m.project_id=$2 FOR UPDATE`, [moduleId, projectId])).rows[0];
    if (!m) throw new Error('MODULE_NOT_FOUND');
    if (m.state !== 'PLANNING_IN_PROGRESS') throw new Error(`SEED_PLAN_WRONG_MODULE_STATE:${m.state}`);
    const criteria = Array.isArray(m.revision_criteria) && m.revision_criteria.length
      ? m.revision_criteria
      : (m.revision_payload.acceptance_criteria ?? []).map((x: any, i: number) => typeof x === 'string' ? { criterion_id: `criterion-${i + 1}`, text: x } : x);
    const criterionIds: string[] = criteria.map((x: any) => x.criterion_id);

    // Discard any PLAN_MODULE_WORK_ITEMS job that decideArchitecture enqueued;
    // the seeded revision replaces it so a later runOnce cannot reprocess it.
    const pending = (await c.query(`SELECT j.id job_id, j.operation_id FROM jobs j WHERE j.module_id=$1 AND j.kind='PLAN_MODULE_WORK_ITEMS' AND j.status IN ('PENDING','RETRYABLE','LEASED')`, [moduleId])).rows;
    for (const p of pending) {
      await c.query(`DELETE FROM module_plan_job_context WHERE operation_id=$1`, [p.operation_id]);
      await c.query(`DELETE FROM events WHERE operation_id=$1 OR job_id=$2`, [p.operation_id, p.job_id]);
      await c.query(`DELETE FROM jobs WHERE id=$1`, [p.job_id]);
      await c.query(`DELETE FROM operations WHERE id=$1`, [p.operation_id]);
    }
    // Drop any previously persisted open plan revision/gate for this module.
    const existing = (await c.query(`SELECT id FROM module_plan_revisions WHERE module_id=$1 AND status='PLAN_PROPOSED'`, [moduleId])).rows;
    for (const r of existing) {
      await c.query(`DELETE FROM module_gates WHERE plan_revision_id=$1`, [r.id]);
      await c.query(`DELETE FROM module_plan_revisions WHERE id=$1`, [r.id]);
    }

    // module-plan validator forbids '.', './', 'src', 'src/' as QA cwd. The
    // delivery tests need QA commands to run at the worktree root, which is
    // expressed as empty string (path.join(root, '') === root, and safePath('')
    // passes). Map the legacy cwd values the tests used onto that safe form.
    const safeCwd = (cwd: string): string => (['.', './', 'src', 'src/'].includes(cwd) ? '' : cwd);
    const workItems = items.map((item) => {
      const objective = item.title;
      const description = `${item.title} ${objective} ${item.output ?? ''} ${(item.acceptance_criteria ?? []).join(' ')}`;
      const caps = capabilities(description);
      const kind = item.qa_matrix[0]?.kind ?? caps.map((cap: string) => MODULE_PLAN_QA_MATRIX[cap]?.required_kinds?.[0]).find((k: string | undefined) => k) ?? 'unit';
      const qa_matrix = item.qa_matrix.map((q) => ({
        command: q.command,
        cwd: safeCwd(q.cwd),
        timeout_seconds: q.timeout_seconds,
        environment: 'isolated',
        criterion_ids: criterionIds,
        kind: q.kind ?? kind
      }));
      return {
        work_item_id: item.logical_id ?? `wi-${randomUUID().slice(0, 8)}`,
        title: item.title,
        objective,
        inputs: item.inputs ?? ['approved module definition'],
        output: item.output ?? `Verifiable ${item.title} delivered`,
        acceptance_criteria: item.acceptance_criteria ?? criterionIds.map((criterion_id: string) => `Criterion ${criterion_id} is demonstrably satisfied`),
        allowlist: item.allowlist,
        denylist: item.denylist,
        depends_on_ids: item.depends_on_ids ?? [],
        criterion_ids: criterionIds,
        qa_matrix,
        risks: ['Validate integration'],
        capabilities: caps
      };
    });

    const plan = {
      schema_version: MODULE_PLAN_SCHEMA_VERSION,
      work_items: workItems,
      criterion_coverage: criterionIds.map((criterion_id: string) => ({ criterion_id, work_item_ids: workItems.map((w: any) => w.work_item_id) })),
      business_dependency_coverage: [],
      risks: ['Controlled deterministic test fixture'],
      gaps: []
    };
    // F5-23 pendency 8: the persisted proposal carries a real, persisted context snapshot
    // (built exactly like the worker builds it) so approveModulePlan can revalidate the
    // proposal against the round's context_hash/context_payload without reconstructing it.
    const context = buildPlanContext({ payload: m.revision_payload, criteria: m.revision_criteria }, {}, {}, null);
    const contextSchema = context.context_schema_version;
    const contextHash = context.context_hash;
    const payload = {
      ...plan,
      context_schema_version: contextSchema,
      context_hash: contextHash,
      validator_version: MODULE_PLAN_VALIDATOR_VERSION,
      validation_hash: canonicalHash({ plan, context_hash: contextHash, validator: MODULE_PLAN_VALIDATOR_VERSION })
    };
    const id = randomUUID();
    const round = (await c.query(`SELECT id FROM module_rounds WHERE module_id=$1 ORDER BY round_number DESC LIMIT 1`, [moduleId])).rows[0];
    if (!round) throw new Error('MODULE_ROUND_NOT_FOUND');
    const gateId = randomUUID();
    const jsonHash = canonicalHash(payload);
    await c.query(`INSERT INTO module_plan_revisions(id,project_id,module_id,revision_number,module_revision_id,technology_baseline_revision_id,payload,payload_hash,json_artifact_hash,markdown_artifact_hash,author_id,context_schema_version,context_hash,validator_version,validation_hash,status,context_payload,work_item_workflow_code,work_item_workflow_version)
      VALUES($1,$2,$3,1,$4,$5,$6,$7,$8,$9,'test-operator',$10,$11,$12,$13,'PLAN_PROPOSED',$14,'WORK_ITEM_DELIVERY',$15)`,
      [id, projectId, moduleId, m.current_revision_id, m.technology_baseline_revision_id, payload, jsonHash, jsonHash, `md-${jsonHash}`, contextSchema, contextHash, MODULE_PLAN_VALIDATOR_VERSION, payload.validation_hash, context, workItemWorkflowVersion]);
    await c.query(`INSERT INTO module_gates(id,project_id,module_id,revision_id,round_id,kind,plan_revision_id,evidence,technology_baseline_revision_id)
      VALUES($1,$2,$3,$4,$5,'MODULE_PLAN_APPROVAL',$6,$7,$8)`,
      [gateId, projectId, moduleId, m.current_revision_id, round.id, id, { json_hash: jsonHash }, m.technology_baseline_revision_id]);
    // Preserve the legacy module-plan evidence artifact so phase3 acceptance can
    // still assert the immutable plan evidence trail (module-plan + markdown).
    const opId = randomUUID();
    await putArtifact(c, projectId, 'module-plan', JSON.stringify({ schema_version: 1, module_id: moduleId, revision_id: m.current_revision_id, round_id: round.id, plan_revision_id: id, work_items: workItems, correlation_id: opId }), opId);
    await putArtifact(c, projectId, 'module-plan-markdown', `# module-plan\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`, opId);
    return { plan_revision_id: id, gate_id: gateId, version: 1 };
  });

/** Convenience: seed a plan revision and immediately approve it, returning the approveModulePlan result. */
export const seedAndApprovePlan = async (projectId: string, moduleId: string, items: SeededPlanWorkItem[], approveModulePlan: (projectId: string, moduleId: string, body: Record<string, unknown>, idempotencyKey: string) => Promise<any>, idempotencyKey: string, workItemWorkflowVersion = 2) => {
  const seeded = await seedPlanRevision(projectId, moduleId, items, workItemWorkflowVersion);
  return approveModulePlan(projectId, moduleId, { plan_revision_id: seeded.plan_revision_id, version: seeded.version }, idempotencyKey);
};
