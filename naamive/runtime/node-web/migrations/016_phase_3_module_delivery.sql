-- Phase 3 is entirely additive. Published Phase 1/2 definitions are never changed.
CREATE TABLE module_revisions (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), module_key text NOT NULL,
  revision integer NOT NULL, payload jsonb NOT NULL, approved_gate_id uuid, status text NOT NULL DEFAULT 'DRAFT',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(project_id,module_key,revision)
);
CREATE TABLE modules (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), module_key text NOT NULL,
  current_revision_id uuid NOT NULL REFERENCES module_revisions(id), state text NOT NULL DEFAULT 'WAITING_FOR_MODULE_APPROVAL',
  version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(project_id,module_key)
);
CREATE TABLE module_rounds (id uuid PRIMARY KEY,module_id uuid NOT NULL REFERENCES modules(id),revision_id uuid NOT NULL REFERENCES module_revisions(id),round_number integer NOT NULL,state text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(module_id,round_number));
CREATE TABLE work_items (
  id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),module_id uuid NOT NULL REFERENCES modules(id),revision_id uuid NOT NULL REFERENCES module_revisions(id),round_id uuid NOT NULL REFERENCES module_rounds(id),
  title text NOT NULL,payload jsonb NOT NULL,state text NOT NULL DEFAULT 'WAITING_FOR_WORK_ITEM_AUTHORIZATION',version integer NOT NULL DEFAULT 1,rework_rounds integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE worktrees (id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),work_item_id uuid NOT NULL REFERENCES work_items(id),path text NOT NULL,branch text NOT NULL,base_sha text NOT NULL,lease_expires_at timestamptz,state text NOT NULL DEFAULT 'RESERVED',created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(path));
CREATE UNIQUE INDEX one_active_worktree_per_project ON worktrees(project_id) WHERE state IN ('RESERVED','ACTIVE');
CREATE TABLE deliveries (id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),work_item_id uuid NOT NULL REFERENCES work_items(id),revision_id uuid NOT NULL REFERENCES module_revisions(id),worktree_id uuid REFERENCES worktrees(id),base_sha text NOT NULL,head_sha text,commits jsonb NOT NULL DEFAULT '[]',validations jsonb NOT NULL DEFAULT '[]',state text NOT NULL DEFAULT 'DEVELOPMENT_IN_PROGRESS',created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE integration_candidates (id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),phase_sha text NOT NULL,manifest jsonb NOT NULL,state text NOT NULL DEFAULT 'CANDIDATE_CREATED',blocked_kind text,version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(project_id,phase_sha));
CREATE TABLE integration_attempts (id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),candidate_id uuid NOT NULL REFERENCES integration_candidates(id),idempotency_key text NOT NULL UNIQUE,integration_before_sha text NOT NULL,candidate_sha text NOT NULL,merge_sha text,push_sha text,state text NOT NULL DEFAULT 'RESERVED',created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE findings (id uuid PRIMARY KEY,project_id text NOT NULL REFERENCES projects(id),delivery_id uuid REFERENCES deliveries(id),candidate_id uuid REFERENCES integration_candidates(id),origin text NOT NULL,severity text NOT NULL,state text NOT NULL DEFAULT 'OPEN',rule_code text NOT NULL,fingerprint text NOT NULL,description text NOT NULL,revalidation_delivery_id uuid REFERENCES deliveries(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK ((delivery_id IS NULL) <> (candidate_id IS NULL)),CHECK (origin IN ('DELIVERY_QA','CANDIDATE_VALIDATION')),CHECK (severity IN ('CRITICAL','HIGH','MEDIUM','LOW')));
CREATE UNIQUE INDEX findings_delivery_dedupe ON findings(origin,delivery_id,rule_code,fingerprint) WHERE delivery_id IS NOT NULL;
CREATE UNIQUE INDEX findings_candidate_dedupe ON findings(origin,candidate_id,rule_code,fingerprint) WHERE candidate_id IS NOT NULL;
CREATE TABLE finding_work_items (finding_id uuid NOT NULL REFERENCES findings(id),work_item_id uuid NOT NULL REFERENCES work_items(id),PRIMARY KEY(finding_id,work_item_id));

INSERT INTO workflow_definitions(id,code,version,scope,status,published_at) VALUES
 ('00000000-0000-0000-0000-000000000301','MODULE_DELIVERY',1,'MODULE','PUBLISHED',clock_timestamp()),
 ('00000000-0000-0000-0000-000000000302','WORK_ITEM_DELIVERY',1,'WORK_ITEM','PUBLISHED',clock_timestamp()),
 ('00000000-0000-0000-0000-000000000303','INTEGRATION_CANDIDATE',1,'INTEGRATION','PUBLISHED',clock_timestamp()) ON CONFLICT DO NOTHING;
INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position) VALUES
 ('00000000-0000-0000-0000-000000000301','WAITING_FOR_MODULE_APPROVAL','Aguardando aprovação do módulo',false,1),('00000000-0000-0000-0000-000000000301','DEFINITION_IN_PROGRESS','Definição',false,2),('00000000-0000-0000-0000-000000000301','WAITING_FOR_ARCHITECTURE_DECISION','Aguardando arquitetura',false,3),('00000000-0000-0000-0000-000000000301','PLANNING_IN_PROGRESS','Planejamento',false,4),('00000000-0000-0000-0000-000000000301','WORK_ITEMS_ACTIVE','Itens ativos',false,5),('00000000-0000-0000-0000-000000000301','MODULE_COMPLETED','Módulo concluído',false,6),
 ('00000000-0000-0000-0000-000000000302','WAITING_FOR_WORK_ITEM_AUTHORIZATION','Aguardando autorização',false,1),('00000000-0000-0000-0000-000000000302','DEVELOPMENT_IN_PROGRESS','Desenvolvimento',false,2),('00000000-0000-0000-0000-000000000302','QA_IN_PROGRESS','QA',false,3),('00000000-0000-0000-0000-000000000302','READY_FOR_PHASE_MERGE','Pronto para merge',false,4),('00000000-0000-0000-0000-000000000302','MERGED_TO_PHASE','Incorporado à fase',false,5),('00000000-0000-0000-0000-000000000302','REWORK_ELIGIBLE','Correção elegível',false,6),('00000000-0000-0000-0000-000000000302','WAITING_FOR_ESCALATION','Aguardando escalonamento',false,7),
 ('00000000-0000-0000-0000-000000000303','CANDIDATE_CREATED','Candidata criada',false,1),('00000000-0000-0000-0000-000000000303','CANDIDATE_VALIDATION_IN_PROGRESS','Validando candidata',false,2),('00000000-0000-0000-0000-000000000303','INTEGRATION_PENDING','Integração pendente',false,3),('00000000-0000-0000-0000-000000000303','INTEGRATION_IN_PROGRESS','Integrando',false,4),('00000000-0000-0000-0000-000000000303','INTEGRATED','Integrada',true,5),('00000000-0000-0000-0000-000000000303','INTEGRATION_BLOCKED','Integração bloqueada',false,6),('00000000-0000-0000-0000-000000000303','SUPERSEDED','Substituída',true,7) ON CONFLICT DO NOTHING;
