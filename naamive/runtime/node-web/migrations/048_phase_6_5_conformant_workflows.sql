-- LR-01 publishes additive, immutable lifecycle contracts. Historical
-- definitions and instances are classified but never promoted or rewritten.
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS control_type text;
ALTER TABLE workflow_transitions ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS workflow_publications (
  workflow_id uuid PRIMARY KEY REFERENCES workflow_definitions(id),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  manifest jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(content_hash)
);

CREATE TABLE IF NOT EXISTS workflow_rollouts (
  workflow_code text NOT NULL,
  workflow_version integer NOT NULL,
  selection_enabled boolean NOT NULL DEFAULT false,
  selection_scope text NOT NULL,
  reason text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(workflow_code,workflow_version),
  FOREIGN KEY(workflow_code,workflow_version) REFERENCES workflow_definitions(code,version)
);

ALTER TABLE modules ADD COLUMN IF NOT EXISTS workflow_code text NOT NULL DEFAULT 'MODULE_DELIVERY';
ALTER TABLE modules ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS workflow_code text NOT NULL DEFAULT 'WORK_ITEM_DELIVERY';
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;
ALTER TABLE agent_execution ADD COLUMN IF NOT EXISTS workflow_code text;
ALTER TABLE agent_execution ADD COLUMN IF NOT EXISTS workflow_version integer;
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS work_item_workflow_code text NOT NULL DEFAULT 'WORK_ITEM_DELIVERY';
ALTER TABLE module_plan_revisions ADD COLUMN IF NOT EXISTS work_item_workflow_version integer NOT NULL DEFAULT 1;

CREATE OR REPLACE VIEW agent_execution_view AS
SELECT e.id,e.job_id,e.operation_id,e.project_key,e.job_kind,e.agent_id,e.task_type,e.classification,e.policy_name,e.policy_version,e.state,e.selected_runtime_id,e.selected_runtime_name,e.selected_adapter_type,e.selection_reason,e.next_action,e.created_at,e.completed_at,e.workflow_code,e.workflow_version
FROM agent_execution e;

DO $$ BEGIN
  ALTER TABLE module_plan_revisions ADD CONSTRAINT module_plan_revisions_work_item_workflow_fk
    FOREIGN KEY(work_item_workflow_code,work_item_workflow_version) REFERENCES workflow_definitions(code,version) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE modules ADD CONSTRAINT modules_workflow_definition_fk
    FOREIGN KEY(workflow_code,workflow_version) REFERENCES workflow_definitions(code,version) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE work_items ADD CONSTRAINT work_items_workflow_definition_fk
    FOREIGN KEY(workflow_code,workflow_version) REFERENCES workflow_definitions(code,version) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE agent_execution ADD CONSTRAINT agent_execution_workflow_definition_fk
    FOREIGN KEY(workflow_code,workflow_version) REFERENCES workflow_definitions(code,version) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE agent_execution ADD CONSTRAINT agent_execution_workflow_selection_pair
    CHECK ((workflow_code IS NULL) = (workflow_version IS NULL)) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS work_item_external_blockers (
  id uuid PRIMARY KEY,
  work_item_id uuid NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  dependency_id text NOT NULL,
  justification text NOT NULL,
  state text NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RESOLVED','CANCELLED')),
  resolution jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz,
  resolved_by text,
  UNIQUE(work_item_id,dependency_id)
);
CREATE INDEX IF NOT EXISTS work_item_external_blockers_active
  ON work_item_external_blockers(work_item_id,state) WHERE state='ACTIVE';

CREATE TEMP TABLE lr01_workflow_manifests(manifest jsonb NOT NULL) ON COMMIT DROP;

INSERT INTO lr01_workflow_manifests(manifest) VALUES
($project$
{
  "id":"00000000-0000-0000-0000-000000000204","code":"PROJECT_DISCOVERY","version":4,"scope":"PROJECT",
  "states":[
    {"code":"ANALYSIS","display_name":"Análise","terminal":false,"position":1,"active":true,"metadata":{"canonical_state":"ANALYSIS","semantic_kind":"AUTOMATIC"}},
    {"code":"DEFINITION","display_name":"Definição","terminal":false,"position":2,"active":true,"metadata":{"canonical_state":"DEFINITION","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_PRODUCT_COMMITMENT","display_name":"Aguardando compromisso de produto","terminal":false,"position":3,"active":true,"metadata":{"canonical_state":"DEFINITION","semantic_kind":"HUMAN_GATE","gate_kind":"PRODUCT_COMMITMENT"}},
    {"code":"ARCHITECTURE","display_name":"Arquitetura","terminal":false,"position":4,"active":true,"metadata":{"canonical_state":"ARCHITECTURE","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","display_name":"Aguardando decisão arquitetural material","terminal":false,"position":5,"active":true,"metadata":{"canonical_state":"ARCHITECTURE","semantic_kind":"CONDITIONAL_HUMAN_GATE"}},
    {"code":"PLANNING","display_name":"Planejamento","terminal":false,"position":6,"active":true,"metadata":{"canonical_state":"PLANNING","semantic_kind":"AUTOMATIC"}},
    {"code":"IMPLEMENTATION","display_name":"Implementação","terminal":false,"position":7,"active":true,"metadata":{"canonical_state":"IMPLEMENTATION","semantic_kind":"AUTOMATIC"}},
    {"code":"VALIDATION","display_name":"Validação","terminal":false,"position":8,"active":true,"metadata":{"canonical_state":"VALIDATION","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_MATERIAL_RISK_DECISION","display_name":"Aguardando decisão de risco material","terminal":false,"position":9,"active":true,"metadata":{"canonical_state":"VALIDATION","semantic_kind":"CONDITIONAL_HUMAN_GATE"}},
    {"code":"DELIVERY","display_name":"Entrega","terminal":false,"position":10,"active":true,"metadata":{"canonical_state":"DELIVERY","semantic_kind":"HUMAN_GATE","gate_kind":"DELIVERY_ACCEPTANCE"}},
    {"code":"DELIVERED","display_name":"Entregue","terminal":false,"position":11,"active":false,"metadata":{"canonical_state":"DELIVERED","semantic_kind":"COMPLETED"}},
    {"code":"EVOLUTION","display_name":"Evolução","terminal":false,"position":12,"active":true,"metadata":{"canonical_state":"EVOLUTION","semantic_kind":"AUTOMATIC"}},
    {"code":"PAUSED","display_name":"Pausado","terminal":false,"position":13,"active":false,"metadata":{"canonical_state":"PAUSED","semantic_kind":"HUMAN_DECISION"}},
    {"code":"CANCELLED","display_name":"Cancelado","terminal":true,"position":14,"active":false,"metadata":{"canonical_state":"CANCELLED","semantic_kind":"TERMINAL"}}
  ],
  "transitions":[
    {"from":"ANALYSIS","trigger":"ANALYSIS_ACCEPTED","to":"DEFINITION","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"ACCEPTED_ANALYSIS_EVIDENCE","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"DEFINITION","trigger":"PRODUCT_COMMITMENT_READY","to":"WAITING_FOR_PRODUCT_COMMITMENT","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"TRACEABLE_REQUIREMENTS_AND_MODULES","effect":"OPEN_PRODUCT_COMMITMENT_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"WAITING_FOR_PRODUCT_COMMITMENT","trigger":"PRODUCT_COMMITMENT_APPROVED","to":"ARCHITECTURE","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_PRODUCT_COMMITMENT_GATE","effect":"CLOSE_GATE","metadata":{}},
    {"from":"WAITING_FOR_PRODUCT_COMMITMENT","trigger":"PRODUCT_COMMITMENT_REWORK","to":"DEFINITION","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FEEDBACK","effect":"RECORD_REWORK","metadata":{}},
    {"from":"ARCHITECTURE","trigger":"ARCHITECTURE_ACCEPTED","to":"PLANNING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"NO_MATERIAL_DECISION_PENDING","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"ARCHITECTURE","trigger":"MATERIAL_ARCHITECTURE_DECISION_REQUIRED","to":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"MATERIALITY_POLICY_MATCHED","effect":"OPEN_CONDITIONAL_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","trigger":"MATERIAL_ARCHITECTURE_APPROVED","to":"PLANNING","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_MATERIAL_GATE","effect":"CLOSE_GATE","metadata":{}},
    {"from":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","trigger":"MATERIAL_ARCHITECTURE_REWORK","to":"ARCHITECTURE","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FEEDBACK","effect":"RECORD_REWORK","metadata":{}},
    {"from":"PLANNING","trigger":"PROJECT_PLAN_ACCEPTED","to":"IMPLEMENTATION","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"AUTHORIZED_MODULE_PLANS","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"IMPLEMENTATION","trigger":"IMPLEMENTATION_INTEGRATED","to":"VALIDATION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"ACCEPTED_AND_INTEGRATED_OUTPUTS","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"VALIDATION","trigger":"VALIDATION_ACCEPTED","to":"DELIVERY","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"NO_MATERIAL_RISK_PENDING","effect":"PREPARE_DELIVERY_ACCEPTANCE","metadata":{"owner_task":"LR-02"}},
    {"from":"VALIDATION","trigger":"MATERIAL_RISK_DECISION_REQUIRED","to":"WAITING_FOR_MATERIAL_RISK_DECISION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"MATERIAL_RISK_POLICY_MATCHED","effect":"OPEN_CONDITIONAL_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"WAITING_FOR_MATERIAL_RISK_DECISION","trigger":"MATERIAL_RISK_ACCEPTED","to":"DELIVERY","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_MATERIAL_GATE","effect":"CLOSE_GATE","metadata":{}},
    {"from":"WAITING_FOR_MATERIAL_RISK_DECISION","trigger":"MATERIAL_RISK_REWORK","to":"IMPLEMENTATION","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FINDINGS","effect":"RECORD_REWORK","metadata":{}},
    {"from":"VALIDATION","trigger":"VALIDATION_REWORK_REQUIRED","to":"IMPLEMENTATION","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_REWORK","metadata":{}},
    {"from":"DELIVERY","trigger":"DELIVERY_ACCEPTED","to":"DELIVERED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"DELIVERY_OPERATION_HANDOVER_EVIDENCE","effect":"COMPLETE_DELIVERY","metadata":{"owner_task":"GAT-02"}},
    {"from":"DELIVERY","trigger":"DELIVERY_REWORK_REQUIRED","to":"VALIDATION","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FINDINGS","effect":"RECORD_REWORK","metadata":{"owner_task":"GAT-02"}},
    {"from":"DELIVERED","trigger":"EVOLUTION_REQUESTED","to":"EVOLUTION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"TRACEABLE_CHANGE","effect":"OPEN_EVOLUTION","metadata":{"owner_task":"LR-02"}},
    {"from":"EVOLUTION","trigger":"REDISCOVERY_REQUIRED","to":"ANALYSIS","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TRACEABLE_CHANGE","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"EVOLUTION","trigger":"REPLANNING_REQUIRED","to":"PLANNING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TRACEABLE_CHANGE","effect":"RECORD_PROJECT_TRANSITION","metadata":{"owner_task":"LR-02"}}
  ]
}
$project$::jsonb),
($module$
{
  "id":"00000000-0000-0000-0000-000000000304","code":"MODULE_DELIVERY","version":2,"scope":"MODULE",
  "states":[
    {"code":"IDENTIFIED","display_name":"Identificado","terminal":false,"position":1,"active":true,"metadata":{"canonical_state":"IDENTIFIED","semantic_kind":"AUTOMATIC"}},
    {"code":"DEFINED","display_name":"Definido","terminal":false,"position":2,"active":true,"metadata":{"canonical_state":"DEFINED","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","display_name":"Aguardando decisão arquitetural material","terminal":false,"position":3,"active":true,"metadata":{"canonical_state":"DEFINED","semantic_kind":"CONDITIONAL_HUMAN_GATE"}},
    {"code":"ARCHITECTED","display_name":"Arquitetado","terminal":false,"position":4,"active":true,"metadata":{"canonical_state":"ARCHITECTED","semantic_kind":"AUTOMATIC"}},
    {"code":"PLANNING_IN_PROGRESS","display_name":"Planejamento em andamento","terminal":false,"position":5,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_MODULE_PLAN_APPROVAL","display_name":"Aguardando aprovação do plano","terminal":false,"position":6,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"HUMAN_GATE","gate_kind":"MODULE_PLAN_APPROVAL"}},
    {"code":"PLANNED","display_name":"Planejado","terminal":false,"position":7,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"AUTOMATIC"}},
    {"code":"IMPLEMENTING","display_name":"Implementando","terminal":false,"position":8,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"AUTOMATIC"}},
    {"code":"INTEGRATING","display_name":"Integrando","terminal":false,"position":9,"active":true,"metadata":{"canonical_state":"INTEGRATING","semantic_kind":"AUTOMATIC"}},
    {"code":"VALIDATING","display_name":"Validando","terminal":false,"position":10,"active":true,"metadata":{"canonical_state":"VALIDATING","semantic_kind":"AUTOMATIC"}},
    {"code":"READY_FOR_DELIVERY","display_name":"Pronto para entrega","terminal":false,"position":11,"active":true,"metadata":{"canonical_state":"READY_FOR_DELIVERY","semantic_kind":"AUTOMATIC"}},
    {"code":"DELIVERED","display_name":"Entregue","terminal":false,"position":12,"active":false,"metadata":{"canonical_state":"DELIVERED","semantic_kind":"COMPLETED"}},
    {"code":"EVOLVING","display_name":"Evoluindo","terminal":false,"position":13,"active":true,"metadata":{"canonical_state":"EVOLVING","semantic_kind":"AUTOMATIC"}},
    {"code":"PAUSED","display_name":"Pausado","terminal":false,"position":14,"active":false,"metadata":{"canonical_state":"PAUSED","semantic_kind":"HUMAN_DECISION"}},
    {"code":"CANCELLED","display_name":"Cancelado","terminal":true,"position":15,"active":false,"metadata":{"canonical_state":"CANCELLED","semantic_kind":"TERMINAL"}}
  ],
  "transitions":[
    {"from":"IDENTIFIED","trigger":"MODULE_DEFINITION_ACCEPTED","to":"DEFINED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"DEFINED_CAPABILITY_BOUNDARY","effect":"RECORD_MODULE_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"DEFINED","trigger":"MODULE_ARCHITECTURE_ACCEPTED","to":"ARCHITECTED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"NO_MATERIAL_DECISION_PENDING","effect":"RECORD_MODULE_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"DEFINED","trigger":"MATERIAL_ARCHITECTURE_DECISION_REQUIRED","to":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"MATERIALITY_POLICY_MATCHED","effect":"OPEN_CONDITIONAL_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","trigger":"MATERIAL_ARCHITECTURE_APPROVED","to":"ARCHITECTED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_MATERIAL_GATE","effect":"CLOSE_GATE","metadata":{}},
    {"from":"WAITING_FOR_MATERIAL_ARCHITECTURE_DECISION","trigger":"MATERIAL_ARCHITECTURE_REWORK","to":"DEFINED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FEEDBACK","effect":"RECORD_REWORK","metadata":{}},
    {"from":"ARCHITECTED","trigger":"START_MODULE_PLANNING","to":"PLANNING_IN_PROGRESS","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"VALID_MODULE_CONTEXT","effect":"CREATE_MODULE_PLAN_JOB","metadata":{"owner_task":"LR-02"}},
    {"from":"PLANNING_IN_PROGRESS","trigger":"MODULE_PLAN_PROPOSED","to":"WAITING_FOR_MODULE_PLAN_APPROVAL","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"VALID_VERSIONED_PLAN","effect":"OPEN_MODULE_PLAN_GATE","metadata":{}},
    {"from":"WAITING_FOR_MODULE_PLAN_APPROVAL","trigger":"MODULE_PLAN_APPROVED","to":"PLANNED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_MODULE_PLAN_GATE","effect":"MATERIALIZE_WORK_ITEMS","metadata":{}},
    {"from":"WAITING_FOR_MODULE_PLAN_APPROVAL","trigger":"MODULE_PLAN_ADJUSTMENTS_REQUESTED","to":"PLANNING_IN_PROGRESS","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_GATE_WITH_FEEDBACK","effect":"CREATE_MODULE_PLAN_REVISION","metadata":{}},
    {"from":"PLANNED","trigger":"ELIGIBLE_WORK_ITEMS_AVAILABLE","to":"IMPLEMENTING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"PROJECT_IN_IMPLEMENTATION","effect":"DISPATCH_ELIGIBLE_WORK_ITEMS","metadata":{"owner_task":"AUT-01"}},
    {"from":"IMPLEMENTING","trigger":"MODULE_IMPLEMENTATION_ACCEPTED","to":"INTEGRATING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"REQUIRED_WORK_ACCEPTED","effect":"START_MODULE_INTEGRATION","metadata":{"owner_task":"AUT-02"}},
    {"from":"INTEGRATING","trigger":"MODULE_INTEGRATION_ACCEPTED","to":"VALIDATING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"INTEGRATED_CONTRACTS","effect":"START_MODULE_VALIDATION","metadata":{"owner_task":"AUT-02"}},
    {"from":"INTEGRATING","trigger":"MODULE_INTEGRATION_REWORK","to":"IMPLEMENTING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_REWORK","metadata":{}},
    {"from":"VALIDATING","trigger":"MODULE_VALIDATION_ACCEPTED","to":"READY_FOR_DELIVERY","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"QUALITY_SECURITY_ACCEPTED","effect":"RECORD_MODULE_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"VALIDATING","trigger":"MODULE_VALIDATION_REWORK","to":"IMPLEMENTING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_REWORK","metadata":{}},
    {"from":"READY_FOR_DELIVERY","trigger":"PROJECT_DELIVERY_ACCEPTED","to":"DELIVERED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"PROJECT_DELIVERED","effect":"COMPLETE_MODULE_DELIVERY","metadata":{"owner_task":"GAT-02"}},
    {"from":"READY_FOR_DELIVERY","trigger":"MODULE_REWORK_REQUIRED","to":"IMPLEMENTING","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_REWORK","metadata":{}},
    {"from":"DELIVERED","trigger":"MODULE_EVOLUTION_REQUESTED","to":"EVOLVING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"TRACEABLE_CHANGE","effect":"OPEN_EVOLUTION","metadata":{"owner_task":"LR-02"}},
    {"from":"EVOLVING","trigger":"MODULE_REDEFINE","to":"DEFINED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TRACEABLE_CHANGE","effect":"RECORD_MODULE_TRANSITION","metadata":{"owner_task":"LR-02"}},
    {"from":"EVOLVING","trigger":"MODULE_REPLAN","to":"PLANNED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TRACEABLE_CHANGE","effect":"RECORD_MODULE_TRANSITION","metadata":{"owner_task":"LR-02"}}
  ]
}
$module$::jsonb),
($workitem$
{
  "id":"00000000-0000-0000-0000-000000000305","code":"WORK_ITEM_DELIVERY","version":2,"scope":"WORK_ITEM",
  "states":[
    {"code":"PLANNED","display_name":"Planejado","terminal":false,"position":1,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"TRANSIENT"}},
    {"code":"WAITING_FOR_EXTERNAL_INPUT","display_name":"Aguardando informação externa","terminal":false,"position":2,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"EXTERNAL_BLOCKER","human_action_required":true}},
    {"code":"WAITING_FOR_DEPENDENCIES","display_name":"Aguardando dependências","terminal":false,"position":3,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"TECHNICAL_WAIT","human_action_required":false}},
    {"code":"ELIGIBLE_FOR_DISPATCH","display_name":"Elegível para dispatch","terminal":false,"position":4,"active":true,"metadata":{"canonical_state":"PLANNED","semantic_kind":"AUTOMATIC_QUEUE","human_action_required":false}},
    {"code":"DISPATCHED","display_name":"Despachado","terminal":false,"position":5,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"AUTOMATIC"}},
    {"code":"PRODUCING","display_name":"Produzindo","terminal":false,"position":6,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"AUTOMATIC"}},
    {"code":"OUTPUT_SUBMITTED","display_name":"Output submetido","terminal":false,"position":7,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"AUTOMATIC"}},
    {"code":"QA_IN_PROGRESS","display_name":"QA em andamento","terminal":false,"position":8,"active":true,"metadata":{"canonical_state":"VALIDATING","semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_INDEPENDENT_REVIEWER","display_name":"Aguardando reviewer independente","terminal":false,"position":9,"active":true,"metadata":{"canonical_state":"VALIDATING","semantic_kind":"CAPACITY_BLOCK"}},
    {"code":"INDEPENDENT_REVIEW","display_name":"Review independente","terminal":false,"position":10,"active":true,"metadata":{"canonical_state":"VALIDATING","semantic_kind":"AUTOMATIC"}},
    {"code":"ACCEPTED","display_name":"Aceito","terminal":false,"position":11,"active":false,"metadata":{"canonical_state":"VALIDATING","semantic_kind":"TECHNICAL_ACCEPTANCE"}},
    {"code":"READY_FOR_INTEGRATION","display_name":"Pronto para integração","terminal":false,"position":12,"active":true,"metadata":{"canonical_state":"INTEGRATING","semantic_kind":"AUTOMATIC_QUEUE"}},
    {"code":"INTEGRATING","display_name":"Integrando","terminal":false,"position":13,"active":true,"metadata":{"canonical_state":"INTEGRATING","semantic_kind":"AUTOMATIC"}},
    {"code":"INTEGRATED","display_name":"Integrado","terminal":false,"position":14,"active":false,"metadata":{"canonical_state":"INTEGRATING","semantic_kind":"COMPLETED"}},
    {"code":"REWORK_REQUIRED","display_name":"Retrabalho necessário","terminal":false,"position":15,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"REWORK"}},
    {"code":"BLOCKED","display_name":"Bloqueado","terminal":false,"position":16,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"BLOCK"}},
    {"code":"RECOVERY_REQUIRED","display_name":"Recuperação necessária","terminal":false,"position":17,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"RECOVERY"}},
    {"code":"WAITING_FOR_ESCALATION","display_name":"Aguardando escalada","terminal":false,"position":18,"active":true,"metadata":{"canonical_state":"IMPLEMENTING","semantic_kind":"CONDITIONAL_HUMAN_GATE"}},
    {"code":"PAUSED","display_name":"Pausado","terminal":false,"position":19,"active":false,"metadata":{"canonical_state":"PAUSED","semantic_kind":"HUMAN_DECISION"}},
    {"code":"CANCELLED","display_name":"Cancelado","terminal":true,"position":20,"active":false,"metadata":{"canonical_state":"CANCELLED","semantic_kind":"TERMINAL"}}
  ],
  "transitions":[
    {"from":"PLANNED","trigger":"EXTERNAL_BLOCKER_IDENTIFIED","to":"WAITING_FOR_EXTERNAL_INPUT","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"ACTIVE_EXTERNAL_BLOCKER","effect":"RECORD_EXTERNAL_BLOCKERS","metadata":{}},
    {"from":"PLANNED","trigger":"DEPENDENCIES_PENDING","to":"WAITING_FOR_DEPENDENCIES","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"DEPENDENCIES_NOT_INTEGRATED","effect":"NONE","metadata":{}},
    {"from":"PLANNED","trigger":"ELIGIBILITY_CONFIRMED","to":"ELIGIBLE_FOR_DISPATCH","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"NO_ACTIVE_BLOCKERS_OR_PENDING_DEPENDENCIES","effect":"NONE","metadata":{}},
    {"from":"WAITING_FOR_EXTERNAL_INPUT","trigger":"EXTERNAL_BLOCKER_RESOLVED_WITH_DEPENDENCIES","to":"WAITING_FOR_DEPENDENCIES","authority":"HUMAN","control":"HUMAN_DECISION","guard":"ALL_EXTERNAL_BLOCKERS_RESOLVED","effect":"RECORD_BLOCKER_RESOLUTION","metadata":{}},
    {"from":"WAITING_FOR_EXTERNAL_INPUT","trigger":"EXTERNAL_BLOCKER_RESOLVED_ELIGIBLE","to":"ELIGIBLE_FOR_DISPATCH","authority":"HUMAN","control":"HUMAN_DECISION","guard":"ALL_EXTERNAL_BLOCKERS_RESOLVED_AND_NO_DEPENDENCY_REFERENCES","effect":"RECORD_BLOCKER_RESOLUTION","metadata":{}},
    {"from":"WAITING_FOR_DEPENDENCIES","trigger":"DEPENDENCIES_SATISFIED","to":"ELIGIBLE_FOR_DISPATCH","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"DEPENDENCIES_ACCEPTED_AND_INTEGRATED","effect":"NONE","metadata":{"owner_task":"AUT-01"}},
    {"from":"ELIGIBLE_FOR_DISPATCH","trigger":"DISPATCH_WORK_ITEM","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"CAPACITY_AND_IDEMPOTENCY_AVAILABLE","effect":"CREATE_DEVELOPMENT_JOB","metadata":{"owner_task":"AUT-01"}},
    {"from":"DISPATCHED","trigger":"PRODUCTION_STARTED","to":"PRODUCING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"VALID_LEASE","effect":"START_EXECUTOR","metadata":{"owner_task":"AUT-01"}},
    {"from":"PRODUCING","trigger":"OUTPUT_SUBMITTED","to":"OUTPUT_SUBMITTED","authority":"AGENT","control":"AUTOMATED_EVIDENCE","guard":"BOUND_OUTPUT_EVIDENCE","effect":"CREATE_QA_HANDOFF","metadata":{"owner_task":"AUT-02"}},
    {"from":"PRODUCING","trigger":"PRODUCTION_BLOCKED","to":"BLOCKED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"TYPED_BLOCK","effect":"OPEN_WORK_BLOCK","metadata":{"owner_task":"REC-02"}},
    {"from":"PRODUCING","trigger":"RECOVERABLE_FAILURE","to":"RECOVERY_REQUIRED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"RECOVERABLE_CAUSE","effect":"RECORD_RECOVERY_CAUSE","metadata":{"owner_task":"REC-01"}},
    {"from":"OUTPUT_SUBMITTED","trigger":"START_QA","to":"QA_IN_PROGRESS","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"SUFFICIENT_BOUND_EVIDENCE","effect":"CREATE_QA_JOB","metadata":{"owner_task":"AUT-02"}},
    {"from":"QA_IN_PROGRESS","trigger":"QA_ACCEPTED","to":"INDEPENDENT_REVIEW","authority":"AUTOMATED_CONTROL","control":"AUTOMATED_EVIDENCE","guard":"QA_MATRIX_ACCEPTED","effect":"CREATE_REVIEW_HANDOFF","metadata":{"owner_task":"AUT-02"}},
    {"from":"QA_IN_PROGRESS","trigger":"QA_REWORK_REQUIRED","to":"REWORK_REQUIRED","authority":"AUTOMATED_CONTROL","control":"AUTOMATED_EVIDENCE","guard":"FINDINGS_PRESENT","effect":"RECORD_FINDINGS","metadata":{"owner_task":"AUT-02"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"REVIEWER_UNAVAILABLE","to":"WAITING_FOR_INDEPENDENT_REVIEWER","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"NO_INDEPENDENT_REVIEWER","effect":"OPEN_ASSURANCE_BLOCK","metadata":{"owner_task":"REC-02"}},
    {"from":"WAITING_FOR_INDEPENDENT_REVIEWER","trigger":"REVIEWER_SELECTED","to":"INDEPENDENT_REVIEW","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"INDEPENDENCE_VALID","effect":"CREATE_REVIEW_DISPATCH","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"ACCEPT","to":"ACCEPTED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TERMINAL_REVIEW_DECISION","effect":"RECORD_WORK_ACCEPTANCE","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"REWORK","to":"REWORK_REQUIRED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_FINDINGS","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"BLOCK","to":"BLOCKED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TYPED_BLOCK","effect":"OPEN_WORK_BLOCK","metadata":{"owner_task":"REC-02"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"ESCALATE","to":"WAITING_FOR_ESCALATION","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"MATERIALITY_OR_LIMIT","effect":"OPEN_CONDITIONAL_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"REWORK_REQUIRED","trigger":"DISPATCH_CORRECTIVE_WORK","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"REWORK_POLICY_ALLOWS","effect":"CREATE_CORRECTIVE_JOB","metadata":{"owner_task":"AUT-02"}},
    {"from":"BLOCKED","trigger":"BLOCK_RESOLVED","to":"ELIGIBLE_FOR_DISPATCH","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"RESOLUTION_EVIDENCE","effect":"REQUEST_ELIGIBILITY_REEVALUATION","metadata":{"owner_task":"REC-02"}},
    {"from":"RECOVERY_REQUIRED","trigger":"RECOVERY_SCHEDULED","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"CAUSE_SPECIFIC_RECOVERY","effect":"CREATE_RECOVERY_JOB","metadata":{"owner_task":"REC-01"}},
    {"from":"WAITING_FOR_ESCALATION","trigger":"REWORK_AUTHORIZED","to":"REWORK_REQUIRED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_CONDITIONAL_GATE","effect":"CLOSE_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"ACCEPTED","trigger":"QUEUE_INTEGRATION","to":"READY_FOR_INTEGRATION","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"CURRENT_WORK_ACCEPTANCE","effect":"CREATE_INTEGRATION_HANDOFF","metadata":{"owner_task":"AUT-02"}},
    {"from":"READY_FOR_INTEGRATION","trigger":"START_INTEGRATION","to":"INTEGRATING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"FROZEN_INTEGRATION_INPUT","effect":"CREATE_INTEGRATION_JOB","metadata":{"owner_task":"AUT-02"}},
    {"from":"INTEGRATING","trigger":"INTEGRATION_ACCEPTED","to":"INTEGRATED","authority":"AUTOMATED_CONTROL","control":"AUTOMATED_EVIDENCE","guard":"MERGE_PUSH_RECORDED","effect":"COMPLETE_WORK_ITEM_INTEGRATION","metadata":{"owner_task":"AUT-02"}},
    {"from":"INTEGRATING","trigger":"INTEGRATION_BLOCKED","to":"BLOCKED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"TYPED_INTEGRATION_CAUSE","effect":"OPEN_WORK_BLOCK","metadata":{"owner_task":"REC-01"}},
    {"from":"INTEGRATED","trigger":"INTEGRATED_FINDING_REOPENED","to":"REWORK_REQUIRED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"PERTINENT_FINDING","effect":"RECORD_FINDINGS","metadata":{"owner_task":"AUT-02"}}
  ]
}
$workitem$::jsonb),
($execution$
{
  "id":"00000000-0000-0000-0000-000000000601","code":"ORCHESTRATION_EXECUTION","version":1,"scope":"EXECUTION",
  "states":[
    {"code":"RECEIVED","display_name":"Recebido","terminal":false,"position":1,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"VALIDATING","display_name":"Validando","terminal":false,"position":2,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"DISPATCHED","display_name":"Despachado","terminal":false,"position":3,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"PRODUCING","display_name":"Produzindo","terminal":false,"position":4,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"OUTPUT_SUBMITTED","display_name":"Output submetido","terminal":false,"position":5,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"EVIDENCE_REVIEW","display_name":"Revisão de evidência","terminal":false,"position":6,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"WAITING_FOR_INDEPENDENT_REVIEWER","display_name":"Aguardando reviewer independente","terminal":false,"position":7,"active":true,"metadata":{"semantic_kind":"CAPACITY_BLOCK"}},
    {"code":"INDEPENDENT_REVIEW","display_name":"Review independente","terminal":false,"position":8,"active":true,"metadata":{"semantic_kind":"AUTOMATIC"}},
    {"code":"ACCEPTED","display_name":"Aceito","terminal":true,"position":9,"active":false,"metadata":{"semantic_kind":"TECHNICAL_ACCEPTANCE"}},
    {"code":"REWORK_REQUIRED","display_name":"Retrabalho necessário","terminal":false,"position":10,"active":true,"metadata":{"semantic_kind":"REWORK"}},
    {"code":"BLOCKED","display_name":"Bloqueado","terminal":false,"position":11,"active":true,"metadata":{"semantic_kind":"BLOCK"}},
    {"code":"RECOVERY_REQUIRED","display_name":"Recuperação necessária","terminal":false,"position":12,"active":true,"metadata":{"semantic_kind":"RECOVERY"}},
    {"code":"WAITING_FOR_GATE","display_name":"Aguardando gate","terminal":false,"position":13,"active":true,"metadata":{"semantic_kind":"CONDITIONAL_HUMAN_GATE"}},
    {"code":"FAILED","display_name":"Falhou","terminal":true,"position":14,"active":false,"metadata":{"semantic_kind":"TERMINAL_FAILURE"}},
    {"code":"REJECTED","display_name":"Rejeitado","terminal":true,"position":15,"active":false,"metadata":{"semantic_kind":"TERMINAL_REJECTION"}},
    {"code":"PAUSED","display_name":"Pausado","terminal":false,"position":16,"active":false,"metadata":{"semantic_kind":"HUMAN_DECISION"}},
    {"code":"CANCELLED","display_name":"Cancelado","terminal":true,"position":17,"active":false,"metadata":{"semantic_kind":"TERMINAL"}}
  ],
  "transitions":[
    {"from":"RECEIVED","trigger":"VALIDATE_EXECUTION","to":"VALIDATING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"REQUEST_PRESENT","effect":"NONE","metadata":{}},
    {"from":"RECEIVED","trigger":"REJECT_EXECUTION","to":"REJECTED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"INVALID_CONTEXT","effect":"RECORD_REJECTION","metadata":{}},
    {"from":"VALIDATING","trigger":"REJECT_EXECUTION","to":"REJECTED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"INVALID_CONTEXT_SCOPE_OR_TRANSITION","effect":"RECORD_REJECTION","metadata":{}},
    {"from":"VALIDATING","trigger":"DISPATCH_EXECUTION","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"VALID_CONTEXT_SCOPE_AND_TRANSITION","effect":"CREATE_DISPATCH","metadata":{}},
    {"from":"DISPATCHED","trigger":"START_PRODUCTION","to":"PRODUCING","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"VALID_LEASE_AND_RUNTIME","effect":"START_EXECUTOR","metadata":{}},
    {"from":"PRODUCING","trigger":"SUBMIT_OUTPUT","to":"OUTPUT_SUBMITTED","authority":"AGENT","control":"AUTOMATED_EVIDENCE","guard":"BOUND_OUTPUT","effect":"PERSIST_OUTPUT_REFERENCE","metadata":{"owner_task":"AUT-03"}},
    {"from":"OUTPUT_SUBMITTED","trigger":"VALIDATE_EVIDENCE","to":"EVIDENCE_REVIEW","authority":"AUTOMATED_CONTROL","control":"AUTOMATED_EVIDENCE","guard":"BOUND_EVIDENCE","effect":"NONE","metadata":{"owner_task":"AUT-03"}},
    {"from":"EVIDENCE_REVIEW","trigger":"START_INDEPENDENT_REVIEW","to":"INDEPENDENT_REVIEW","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"INDEPENDENT_REVIEWER_AVAILABLE","effect":"CREATE_REVIEW_DISPATCH","metadata":{"owner_task":"AUT-03"}},
    {"from":"EVIDENCE_REVIEW","trigger":"REVIEWER_UNAVAILABLE","to":"WAITING_FOR_INDEPENDENT_REVIEWER","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"NO_INDEPENDENT_REVIEWER","effect":"OPEN_ASSURANCE_BLOCK","metadata":{"owner_task":"REC-02"}},
    {"from":"WAITING_FOR_INDEPENDENT_REVIEWER","trigger":"REVIEWER_SELECTED","to":"INDEPENDENT_REVIEW","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"INDEPENDENCE_VALID","effect":"CREATE_REVIEW_DISPATCH","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"ACCEPT","to":"ACCEPTED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TERMINAL_REVIEW_DECISION","effect":"APPLY_BUSINESS_EFFECT_ONCE","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"REWORK","to":"REWORK_REQUIRED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"FINDINGS_PRESENT","effect":"RECORD_FINDINGS","metadata":{"owner_task":"AUT-03"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"BLOCK","to":"BLOCKED","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"TYPED_BLOCK","effect":"OPEN_WORK_BLOCK","metadata":{"owner_task":"REC-02"}},
    {"from":"INDEPENDENT_REVIEW","trigger":"ESCALATE","to":"WAITING_FOR_GATE","authority":"INDEPENDENT_REVIEWER","control":"INDEPENDENT_REVIEW","guard":"MATERIALITY_OR_LIMIT","effect":"OPEN_CONDITIONAL_GATE","metadata":{"owner_task":"GAT-01"}},
    {"from":"REWORK_REQUIRED","trigger":"DISPATCH_REWORK","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"REWORK_POLICY_ALLOWS","effect":"CREATE_CORRECTIVE_DISPATCH","metadata":{"owner_task":"AUT-03"}},
    {"from":"BLOCKED","trigger":"BLOCK_RESOLVED","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"RESOLUTION_EVIDENCE","effect":"CREATE_RETRY_DISPATCH","metadata":{"owner_task":"REC-02"}},
    {"from":"PRODUCING","trigger":"RECOVERABLE_FAILURE","to":"RECOVERY_REQUIRED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"RECOVERABLE_CAUSE","effect":"RECORD_RECOVERY_CAUSE","metadata":{"owner_task":"REC-01"}},
    {"from":"RECOVERY_REQUIRED","trigger":"RECOVERY_SCHEDULED","to":"DISPATCHED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"CAUSE_SPECIFIC_RECOVERY","effect":"CREATE_RECOVERY_DISPATCH","metadata":{"owner_task":"REC-01"}},
    {"from":"PRODUCING","trigger":"TERMINAL_FAILURE","to":"FAILED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"AUTOMATION_EXHAUSTED","effect":"RECORD_FAILURE","metadata":{}},
    {"from":"RECOVERY_REQUIRED","trigger":"TERMINAL_FAILURE","to":"FAILED","authority":"ORCHESTRATOR","control":"AUTOMATED_EVIDENCE","guard":"AUTOMATION_EXHAUSTED","effect":"RECORD_FAILURE","metadata":{}},
    {"from":"WAITING_FOR_GATE","trigger":"GATE_REWORK_APPROVED","to":"REWORK_REQUIRED","authority":"HUMAN","control":"HUMAN_DECISION","guard":"CURRENT_CONDITIONAL_GATE","effect":"CLOSE_GATE","metadata":{"owner_task":"GAT-01"}}
  ]
}
$execution$::jsonb);

-- Add normative pause/cancel rails and explicit resume-to-origin events to
-- every state marked active in the manifest. The trigger code encodes the
-- persisted origin; GAT-02 will implement the command and origin storage.
UPDATE lr01_workflow_manifests m
SET manifest=jsonb_set(manifest,'{transitions}',
  manifest->'transitions' ||
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'from',s->>'code','trigger',CASE manifest->>'scope' WHEN 'PROJECT' THEN 'PAUSE_PROJECT' WHEN 'MODULE' THEN 'PAUSE_MODULE' WHEN 'WORK_ITEM' THEN 'PAUSE_WORK_ITEM' ELSE 'PAUSE_EXECUTION' END,
    'to','PAUSED','authority','HUMAN','control','HUMAN_DECISION','guard','RECORDED_REASON_AND_EVIDENCE','effect','PERSIST_PAUSED_ORIGIN','metadata',jsonb_build_object('owner_task','GAT-02')) ORDER BY s->>'code')
    FROM jsonb_array_elements(manifest->'states') s WHERE (s->>'active')::boolean), '[]'::jsonb) ||
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'from',s->>'code','trigger',CASE manifest->>'scope' WHEN 'PROJECT' THEN 'CANCEL_PROJECT' WHEN 'MODULE' THEN 'CANCEL_MODULE' WHEN 'WORK_ITEM' THEN 'CANCEL_WORK_ITEM' ELSE 'CANCEL_EXECUTION' END,
    'to','CANCELLED','authority','HUMAN','control','HUMAN_DECISION','guard','RECORDED_REASON_AND_EVIDENCE','effect','PRESERVE_AND_CANCEL','metadata',jsonb_build_object('owner_task','GAT-02')) ORDER BY s->>'code')
    FROM jsonb_array_elements(manifest->'states') s WHERE (s->>'active')::boolean), '[]'::jsonb) ||
  COALESCE((SELECT jsonb_agg(jsonb_build_object(
    'from','PAUSED','trigger',(CASE manifest->>'scope' WHEN 'PROJECT' THEN 'RESUME_PROJECT_' WHEN 'MODULE' THEN 'RESUME_MODULE_' WHEN 'WORK_ITEM' THEN 'RESUME_WORK_ITEM_' ELSE 'RESUME_EXECUTION_' END)||(s->>'code'),
    'to',s->>'code','authority','HUMAN','control','HUMAN_DECISION','guard','MATCHES_PERSISTED_ORIGIN_AND_IMPEDIMENT_REMOVED','effect','CLEAR_PAUSED_ORIGIN','metadata',jsonb_build_object('owner_task','GAT-02')) ORDER BY s->>'code')
    FROM jsonb_array_elements(manifest->'states') s WHERE (s->>'active')::boolean), '[]'::jsonb)
);

-- PAUSED is intentionally not marked active, but cancellation must remain
-- available while paused. Resume is represented by one explicit event per
-- persisted origin so the transition contract stays deterministic.
UPDATE lr01_workflow_manifests
SET manifest=jsonb_set(manifest,'{transitions}',manifest->'transitions'||jsonb_build_array(jsonb_build_object(
  'from','PAUSED',
  'trigger',CASE manifest->>'scope' WHEN 'PROJECT' THEN 'CANCEL_PROJECT' WHEN 'MODULE' THEN 'CANCEL_MODULE' WHEN 'WORK_ITEM' THEN 'CANCEL_WORK_ITEM' ELSE 'CANCEL_EXECUTION' END,
  'to','CANCELLED','authority','HUMAN','control','HUMAN_DECISION',
  'guard','RECORDED_REASON_AND_EVIDENCE','effect','PRESERVE_AND_CANCEL',
  'metadata',jsonb_build_object('owner_task','GAT-02')
)));

INSERT INTO workflow_definitions(id,code,version,scope,status,published_at,content_hash)
SELECT (manifest->>'id')::uuid,manifest->>'code',(manifest->>'version')::integer,manifest->>'scope','DRAFT',NULL,NULL
FROM lr01_workflow_manifests
ON CONFLICT(code,version) DO NOTHING;

INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position,metadata)
SELECT d.id,s->>'code',s->>'display_name',(s->>'terminal')::boolean,(s->>'position')::integer,s->'metadata'
FROM lr01_workflow_manifests m
JOIN workflow_definitions d ON d.code=m.manifest->>'code' AND d.version=(m.manifest->>'version')::integer
CROSS JOIN LATERAL jsonb_array_elements(m.manifest->'states') s
LEFT JOIN workflow_publications p ON p.workflow_id=d.id
WHERE p.workflow_id IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO workflow_transitions(workflow_id,from_state,trigger_code,to_state,authority,guard_code,effect_code,control_type,metadata)
SELECT d.id,t->>'from',t->>'trigger',t->>'to',t->>'authority',t->>'guard',t->>'effect',t->>'control',t->'metadata'
FROM lr01_workflow_manifests m
JOIN workflow_definitions d ON d.code=m.manifest->>'code' AND d.version=(m.manifest->>'version')::integer
CROSS JOIN LATERAL jsonb_array_elements(m.manifest->'transitions') t
LEFT JOIN workflow_publications p ON p.workflow_id=d.id
WHERE p.workflow_id IS NULL
ON CONFLICT DO NOTHING;

DO $$
DECLARE item record; state_count integer; transition_count integer; expected_states integer; expected_transitions integer; hash text;
BEGIN
  FOR item IN SELECT m.manifest,d.id FROM lr01_workflow_manifests m JOIN workflow_definitions d ON d.code=m.manifest->>'code' AND d.version=(m.manifest->>'version')::integer LOOP
    SELECT count(*) INTO state_count FROM workflow_states WHERE workflow_id=item.id;
    SELECT count(*) INTO transition_count FROM workflow_transitions WHERE workflow_id=item.id;
    expected_states:=jsonb_array_length(item.manifest->'states');
    expected_transitions:=jsonb_array_length(item.manifest->'transitions');
    IF state_count<>expected_states OR transition_count<>expected_transitions THEN
      RAISE EXCEPTION 'LR01_WORKFLOW_PUBLICATION_INCOMPLETE:%:%/%:%/%',item.manifest->>'code',state_count,expected_states,transition_count,expected_transitions;
    END IF;
    hash:=encode(sha256(convert_to(item.manifest::text,'UTF8')),'hex');
    IF EXISTS(SELECT 1 FROM workflow_publications WHERE workflow_id=item.id) THEN
      IF (SELECT content_hash FROM workflow_publications WHERE workflow_id=item.id)<>hash THEN
        RAISE EXCEPTION 'LR01_WORKFLOW_PUBLICATION_HASH_CONFLICT:%',item.manifest->>'code';
      END IF;
      CONTINUE;
    END IF;
    UPDATE workflow_definitions SET status='PUBLISHED',published_at=COALESCE(published_at,clock_timestamp()),content_hash=hash
      WHERE id=item.id AND (content_hash IS NULL OR content_hash=hash);
    IF NOT FOUND THEN RAISE EXCEPTION 'LR01_WORKFLOW_HASH_CONFLICT:%',item.manifest->>'code'; END IF;
    INSERT INTO workflow_publications(workflow_id,content_hash,manifest)
      VALUES(item.id,hash,item.manifest) ON CONFLICT(workflow_id) DO NOTHING;
    IF (SELECT content_hash FROM workflow_publications WHERE workflow_id=item.id)<>hash THEN
      RAISE EXCEPTION 'LR01_WORKFLOW_PUBLICATION_HASH_CONFLICT:%',item.manifest->>'code';
    END IF;
  END LOOP;
END $$;

INSERT INTO workflow_rollouts(workflow_code,workflow_version,selection_enabled,selection_scope,reason) VALUES
 ('PROJECT_DISCOVERY',4,false,'NEW_PROJECTS','Activation belongs to LR-02 and GAT-01.'),
 ('MODULE_DELIVERY',2,false,'NEW_MODULES','Activation belongs to LR-02 and GAT-01.'),
 ('WORK_ITEM_DELIVERY',2,true,'NEW_PLAN_MATERIALIZATION','LR-01 selects only newly materialized work items; AUT-01 owns dispatch.'),
 ('ORCHESTRATION_EXECUTION',1,false,'NEW_SUPERVISED_EXECUTIONS','Activation for real work belongs to AUT-03.')
ON CONFLICT(workflow_code,workflow_version) DO NOTHING;

CREATE OR REPLACE FUNCTION enforce_scoped_workflow_state() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected_scope text:=TG_ARGV[0];
BEGIN
  IF NEW.workflow_code IS NULL AND NEW.workflow_version IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM workflow_definitions d JOIN workflow_states s ON s.workflow_id=d.id
    WHERE d.code=NEW.workflow_code AND d.version=NEW.workflow_version AND d.scope=expected_scope
      AND d.status='PUBLISHED' AND s.code=NEW.state
  ) THEN RAISE EXCEPTION 'SCOPED_WORKFLOW_STATE_INVALID' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION prevent_instance_workflow_rebinding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.workflow_code IS NOT NULL AND
    (NEW.workflow_code IS DISTINCT FROM OLD.workflow_code OR NEW.workflow_version IS DISTINCT FROM OLD.workflow_version)
  THEN RAISE EXCEPTION 'WORKFLOW_INSTANCE_BINDING_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION prevent_plan_work_item_workflow_rebinding() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.work_item_workflow_code IS DISTINCT FROM OLD.work_item_workflow_code
    OR NEW.work_item_workflow_version IS DISTINCT FROM OLD.work_item_workflow_version
  THEN RAISE EXCEPTION 'PLAN_WORK_ITEM_WORKFLOW_BINDING_IMMUTABLE' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS modules_workflow_state_integrity ON modules;
CREATE TRIGGER modules_workflow_state_integrity BEFORE INSERT OR UPDATE OF workflow_code,workflow_version,state ON modules
FOR EACH ROW EXECUTE FUNCTION enforce_scoped_workflow_state('MODULE');
DROP TRIGGER IF EXISTS work_items_workflow_state_integrity ON work_items;
CREATE TRIGGER work_items_workflow_state_integrity BEFORE INSERT OR UPDATE OF workflow_code,workflow_version,state ON work_items
FOR EACH ROW EXECUTE FUNCTION enforce_scoped_workflow_state('WORK_ITEM');
DROP TRIGGER IF EXISTS agent_execution_workflow_state_integrity ON agent_execution;
CREATE TRIGGER agent_execution_workflow_state_integrity BEFORE INSERT OR UPDATE OF workflow_code,workflow_version,state ON agent_execution
FOR EACH ROW EXECUTE FUNCTION enforce_scoped_workflow_state('EXECUTION');
DROP TRIGGER IF EXISTS modules_workflow_binding_immutable ON modules;
CREATE TRIGGER modules_workflow_binding_immutable BEFORE UPDATE OF workflow_code,workflow_version ON modules
FOR EACH ROW EXECUTE FUNCTION prevent_instance_workflow_rebinding();
DROP TRIGGER IF EXISTS work_items_workflow_binding_immutable ON work_items;
CREATE TRIGGER work_items_workflow_binding_immutable BEFORE UPDATE OF workflow_code,workflow_version ON work_items
FOR EACH ROW EXECUTE FUNCTION prevent_instance_workflow_rebinding();
DROP TRIGGER IF EXISTS agent_execution_workflow_binding_immutable ON agent_execution;
CREATE TRIGGER agent_execution_workflow_binding_immutable BEFORE UPDATE OF workflow_code,workflow_version ON agent_execution
FOR EACH ROW EXECUTE FUNCTION prevent_instance_workflow_rebinding();
DROP TRIGGER IF EXISTS module_plan_work_item_workflow_binding_immutable ON module_plan_revisions;
CREATE TRIGGER module_plan_work_item_workflow_binding_immutable BEFORE UPDATE OF work_item_workflow_code,work_item_workflow_version ON module_plan_revisions
FOR EACH ROW EXECUTE FUNCTION prevent_plan_work_item_workflow_rebinding();

ALTER TABLE modules VALIDATE CONSTRAINT modules_workflow_definition_fk;
ALTER TABLE work_items VALIDATE CONSTRAINT work_items_workflow_definition_fk;
ALTER TABLE agent_execution VALIDATE CONSTRAINT agent_execution_workflow_definition_fk;
ALTER TABLE agent_execution VALIDATE CONSTRAINT agent_execution_workflow_selection_pair;
ALTER TABLE module_plan_revisions VALIDATE CONSTRAINT module_plan_revisions_work_item_workflow_fk;

CREATE OR REPLACE FUNCTION prevent_lr01_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE selected_id uuid;
BEGIN
  selected_id:=COALESCE(
    (to_jsonb(NEW)->>'workflow_id')::uuid,
    (to_jsonb(OLD)->>'workflow_id')::uuid,
    (to_jsonb(NEW)->>'id')::uuid,
    (to_jsonb(OLD)->>'id')::uuid
  );
  IF EXISTS(SELECT 1 FROM workflow_publications WHERE workflow_id=selected_id) THEN
    RAISE EXCEPTION 'LR01_PUBLISHED_WORKFLOW_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS lr01_immutable_workflow_definitions ON workflow_definitions;
CREATE TRIGGER lr01_immutable_workflow_definitions BEFORE UPDATE OR DELETE ON workflow_definitions
FOR EACH ROW EXECUTE FUNCTION prevent_lr01_publication_mutation();
DROP TRIGGER IF EXISTS lr01_immutable_workflow_states ON workflow_states;
CREATE TRIGGER lr01_immutable_workflow_states BEFORE INSERT OR UPDATE OR DELETE ON workflow_states
FOR EACH ROW EXECUTE FUNCTION prevent_lr01_publication_mutation();
DROP TRIGGER IF EXISTS lr01_immutable_workflow_transitions ON workflow_transitions;
CREATE TRIGGER lr01_immutable_workflow_transitions BEFORE INSERT OR UPDATE OR DELETE ON workflow_transitions
FOR EACH ROW EXECUTE FUNCTION prevent_lr01_publication_mutation();
DROP TRIGGER IF EXISTS lr01_immutable_workflow_publications ON workflow_publications;
CREATE TRIGGER lr01_immutable_workflow_publications BEFORE UPDATE OR DELETE ON workflow_publications
FOR EACH ROW EXECUTE FUNCTION prevent_lr01_publication_mutation();

-- Dry-run classification is read-only and fail-closed. It never changes the
-- workflow, version or state of the classified subject.
CREATE OR REPLACE VIEW lifecycle_legacy_classification_v1 AS
SELECT 'PROJECT'::text subject_type,p.id::text subject_id,p.workflow_code,p.workflow_version,p.state,
  'PROJECT_MACRO_STATE_LEGACY'::text classification,'PRESERVE_LEGACY'::text decision,
  'LR-02 will aggregate macro evidence; no state is inferred by LR-01.'::text reason,true ambiguous
FROM projects p WHERE NOT(p.workflow_code='PROJECT_DISCOVERY' AND p.workflow_version=4)
UNION ALL
SELECT 'MODULE',m.id::text,m.workflow_code,m.workflow_version,m.state,
  CASE WHEN m.state IN ('WAITING_FOR_MODULE_APPROVAL','WAITING_FOR_ARCHITECTURE_DECISION') THEN 'LEGACY_UNIVERSAL_GATE' ELSE 'MODULE_MACRO_STATE_LEGACY' END,
  'PRESERVE_LEGACY','Module v1 history remains bound to its published semantics.',true
FROM modules m WHERE NOT(m.workflow_code='MODULE_DELIVERY' AND m.workflow_version=2)
UNION ALL
SELECT 'WORK_ITEM',w.id::text,w.workflow_code,w.workflow_version,w.state,
  CASE
    WHEN w.state='WAITING_FOR_WORK_ITEM_AUTHORIZATION' AND EXISTS(SELECT 1 FROM deliveries d WHERE d.work_item_id=w.id AND d.state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS','EVIDENCE_REVIEW','QA_IN_PROGRESS')) THEN 'WAITING_AUTH_WITH_ACTIVE_DELIVERY_AMBIGUOUS'
    WHEN w.state='WAITING_FOR_WORK_ITEM_AUTHORIZATION' AND coalesce((w.payload->>'external_blocked')::boolean,false) THEN 'WAITING_AUTH_EXTERNAL_BLOCKER'
    WHEN w.state='WAITING_FOR_WORK_ITEM_AUTHORIZATION' AND jsonb_array_length(coalesce(w.payload->'depends_on_ids','[]'::jsonb))>0 THEN 'WAITING_AUTH_DEPENDENCIES'
    WHEN w.state='WAITING_FOR_WORK_ITEM_AUTHORIZATION' THEN 'WAITING_AUTH_ELIGIBLE'
    WHEN w.state='QA_IN_PROGRESS' THEN 'QA_IN_PROGRESS_PRESERVE_EVIDENCE'
    WHEN w.state='REWORK_ELIGIBLE' THEN 'REWORK_ELIGIBLE_PRESERVE_FINDINGS'
    WHEN w.state='WAITING_FOR_ESCALATION' THEN 'WAITING_FOR_ESCALATION_PRESERVE_GATE'
    WHEN w.state IN ('MERGED_TO_PHASE','READY_FOR_PHASE_MERGE') THEN 'COMPLETED_OR_INTEGRATING_PRESERVE'
    ELSE 'WORK_ITEM_LEGACY_OTHER' END,
  'PRESERVE_LEGACY','No legacy work item is promoted without explicit evidence-aware migration.',
  w.state='WAITING_FOR_WORK_ITEM_AUTHORIZATION'
FROM work_items w WHERE NOT(w.workflow_code='WORK_ITEM_DELIVERY' AND w.workflow_version=2)
UNION ALL
SELECT 'EXECUTION',e.id::text,coalesce(e.workflow_code,'AGENT_EXECUTION_F4_F6'),coalesce(e.workflow_version,1),e.state,
  'EXECUTION_CONTRACT_LEGACY','PRESERVE_LEGACY','F4/F6 execution and acceptance semantics are not reinterpreted.',true
FROM agent_execution e WHERE e.workflow_code IS NULL
UNION ALL
SELECT 'WORK_ACCEPTANCE',a.id::text,'ASSURANCE_F6',a.policy_version,a.state,
  'F6_OPT_IN_ACCEPTANCE','PRESERVE_LEGACY','Acceptance, review, findings and blocks keep the selected F6 policy.',false
FROM work_acceptances a;
