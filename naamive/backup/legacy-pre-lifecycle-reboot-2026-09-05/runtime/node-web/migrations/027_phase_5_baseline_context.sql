-- ============================================================================
-- F5-03 — Persistência do contexto de seleção, baseline e propagação de
-- referência (Fase 5).
--
-- Migration aditiva: as únicas alterações em tabelas pré-existentes são a
-- coluna aditiva technology_baseline_revision_id nos contratos de
-- implementação da Fase 3 e o cumprimento do contrato retroativo de 026,
-- que acrescenta as FKs de profile_id das tabelas congeladas de perfil à
-- nova identidade corrente technology_profiles. O schema é neutro:
-- a engine conhece somente enums genéricos de ciclo de vida, classificação e
-- estado de gate; nenhum nome, fornecedor, linguagem, framework, banco ou
-- versão concreta aparece em tabela, coluna, constraint ou trigger. Não há
-- ON DELETE CASCADE em dados publicados ou referenciados: exclusão física é
-- vedada e revisões terminais (APPROVED/SUPERSEDED) são imutáveis.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) technology_profiles — identidade corrente dos perfis tecnológicos.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_profiles (
  id uuid PRIMARY KEY,
  code varchar NOT NULL UNIQUE,
  name varchar NOT NULL,
  description text,
  is_active boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

-- ---------------------------------------------------------------------------
-- 2) technology_profile_items — composição corrente dos perfis. A tabela
--    corrente só é criada nesta migration. Aproveitando a criação da
--    identidade corrente, cumpre-se o contrato retroativo de 026: as FKs de
--    profile_id das tabelas congeladas de perfil (revision_profiles e
--    revision_profile_items de 026) passam a referenciar technology_profiles,
--    tornando auditável a origem do perfil congelado em cada snapshot.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_profile_items (
  profile_id uuid NOT NULL REFERENCES technology_profiles(id),
  catalog_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  classification varchar NOT NULL CHECK (classification IN ('REQUIRED','PREFERRED','ALLOWED','PROHIBITED')),
  version_constraint varchar,
  justification text,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (profile_id, catalog_item_id)
);
DO $$ BEGIN
  ALTER TABLE technology_catalog_revision_profiles ADD CONSTRAINT technology_catalog_revision_profiles_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES technology_profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE technology_catalog_revision_profile_items ADD CONSTRAINT technology_catalog_revision_profile_items_profile_id_fkey
    FOREIGN KEY (profile_id) REFERENCES technology_profiles(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3) technology_selection_contexts — contexto imutável de seleção. Fixa a
--    revisão PUBLISHED do catálogo, o perfil ativo do snapshot, hash, ator,
--    correlação e estado. O contexto referencia exclusivamente uma revisão
--    PUBLISHED (guarda 10c) e o perfil corrente por id auditável; o estado
--    ativo/congelado do perfil é o do snapshot da revisão de catálogo.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_selection_contexts (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  technology_catalog_revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  technology_profile_id uuid REFERENCES technology_profiles(id),
  hash varchar NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
  status varchar NOT NULL CHECK (status IN ('PREPARING','READY','SUPERSEDED')),
  actor varchar,
  correlation_id varchar,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
COMMENT ON TABLE technology_selection_contexts IS 'Contexto imutável de seleção tecnológica de um projeto: fixa a revisão PUBLISHED do catálogo e o perfil ativo do snapshot, com hash, ator, correlação e estado. O contexto não possui cascata destrutiva; linhas publicadas são preservadas como histórico e apenas o estado avança (PREPARING -> READY -> SUPERSEDED).';

-- ---------------------------------------------------------------------------
-- 4) technology_baselines — raiz estável do contrato tecnológico do projeto.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_baselines (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (project_key),
  UNIQUE (project_id)
);

-- ---------------------------------------------------------------------------
-- 5) technology_baseline_revisions — revisões imutáveis e numeradas de forma
--    monotônica por baseline. Cada revisão fixa o technology_catalog_
--    revision_id do seu contexto e referencia inventário, contexto, perfil
--    (origem auditável), ator, correlação, payload e schema_version. Uma
--    revisão
--    terminal (APPROVED/SUPERSEDED) é imutável (guarda 10a); no máximo um
--    DRAFT ativo por baseline (índice parcial abaixo).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_baseline_revisions (
  id uuid PRIMARY KEY,
  baseline_id uuid NOT NULL REFERENCES technology_baselines(id),
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  technology_catalog_revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  selection_context_id uuid REFERENCES technology_selection_contexts(id),
  inventory_id uuid REFERENCES technology_inventory(id),
  revision_number bigint NOT NULL,
  status varchar NOT NULL CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','SUPERSEDED')),
  payload jsonb NOT NULL,
  schema_version varchar NOT NULL,
  supersedes_revision_id uuid REFERENCES technology_baseline_revisions(id),
  actor varchar,
  correlation_id varchar,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (revision_number >= 1),
  CHECK (supersedes_revision_id IS NULL OR supersedes_revision_id <> id),
  CHECK (jsonb_typeof(payload) = 'object'),
  CHECK (schema_version <> ''),
  UNIQUE (baseline_id, revision_number),
  UNIQUE (id, technology_catalog_revision_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_draft_baseline_revision_per_baseline ON technology_baseline_revisions(baseline_id) WHERE status='DRAFT';

-- ---------------------------------------------------------------------------
-- 6) technology_baseline_revision_items — itens da revisão. Referenciam
--    somente catalog_item_id e technology_catalog_revision_id, com
--    classificação, restrição de versão e reason (única justificativa
--    textual; não é identidade tecnológica em texto livre). A coluna
--    denormalizada technology_catalog_revision_id + a FK composta
--    (baseline_revision_id, technology_catalog_revision_id) ->
--    technology_baseline_revisions(id, technology_catalog_revision_id)
--    garantem que cada item pertence à MESMA revisão de catálogo do
--    seu pai; a segunda FK composta (technology_catalog_revision_id,
--    catalog_item_id) -> technology_catalog_revision_items(revision_id,
--    catalog_item_id) garante que o item existe no snapshot congelado.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_baseline_revision_items (
  id uuid PRIMARY KEY,
  baseline_revision_id uuid NOT NULL REFERENCES technology_baseline_revisions(id),
  technology_catalog_revision_id uuid NOT NULL,
  catalog_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  classification varchar NOT NULL CHECK (classification IN ('REQUIRED','PREFERRED','ALLOWED','PROHIBITED')),
  version_constraint varchar,
  reason text NOT NULL,
  source_profile_id uuid REFERENCES technology_profiles(id),
  compatibility_rule_id uuid REFERENCES technology_compatibility_rules(id),
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (baseline_revision_id, catalog_item_id),
  FOREIGN KEY (baseline_revision_id, technology_catalog_revision_id) REFERENCES technology_baseline_revisions(id, technology_catalog_revision_id),
  FOREIGN KEY (technology_catalog_revision_id, catalog_item_id) REFERENCES technology_catalog_revision_items(revision_id, catalog_item_id)
);
COMMENT ON TABLE technology_baseline_revision_items IS 'Itens da revisão de baseline: somente referências catalogadas (catalog_item_id/technology_catalog_revision_id) com classificação, restrição de versão e reason. reason é a única justificativa textual e não identifica, cria, renomeia nem versiona tecnologia em texto livre.';

-- ---------------------------------------------------------------------------
-- 7) technology_baseline_gates — gate versionado de aprovação da revisão.
--    No máximo um gate OPEN por revisão (índice parcial abaixo); gates de
--    revisão terminal não podem ser mutados (guarda 10c).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_baseline_gates (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  baseline_revision_id uuid NOT NULL REFERENCES technology_baseline_revisions(id),
  version integer NOT NULL DEFAULT 1,
  status varchar NOT NULL CHECK (status IN ('OPEN','APPROVED','REJECTED','SUPERSEDED')),
  decision text,
  feedback text,
  supersedes_gate_id uuid REFERENCES technology_baseline_gates(id),
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (baseline_revision_id, version)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_open_baseline_gate_per_revision ON technology_baseline_gates(baseline_revision_id) WHERE status='OPEN';

-- ---------------------------------------------------------------------------
-- 8) Propagação da referência aos contratos de implementação da Fase 3.
--    Cada entidade recebe a coluna aditiva technology_baseline_revision_id
--    (idempotente, seguindo o estilo de 021/023). A igualdade da referência
--    entre pais e filhos persistidos é garantida pela guarda 10f. O manifesto
--    de candidata (integration_candidates.manifest) passa a incluir o ID por
--    work item apenas como conteúdo/referência verificável; a estrutura da
--    tabela integration_candidates permanece inalterada.
-- ---------------------------------------------------------------------------
ALTER TABLE modules ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE module_revisions ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE module_gates ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE work_items ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE findings ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id);

-- ---------------------------------------------------------------------------
-- 9) qa_matrices — matriz de QA congelada vinculada à revisão de baseline.
--    Substitui a matriz congelada somente-em-payload (023). Segue o padrão de
--    findings: exatamente um vínculo por linha entre work_item e delivery.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS qa_matrices (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  work_item_id uuid REFERENCES work_items(id),
  delivery_id uuid REFERENCES deliveries(id),
  technology_baseline_revision_id uuid NOT NULL REFERENCES technology_baseline_revisions(id),
  payload jsonb NOT NULL,
  hash varchar NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((work_item_id IS NULL) <> (delivery_id IS NULL)),
  CHECK (jsonb_typeof(payload) = 'object')
);
CREATE UNIQUE INDEX IF NOT EXISTS one_qa_matrix_per_delivery ON qa_matrices(delivery_id) WHERE delivery_id IS NOT NULL;
COMMENT ON TABLE qa_matrices IS 'Matriz de QA congelada, vinculada obrigatoriamente a uma revisão de baseline (technology_baseline_revision_id NOT NULL) e à sua delivery ou work item, com hash do conteúdo. Substitui a matriz congelada somente-em-payload.';

-- ---------------------------------------------------------------------------
-- 10a) Guarda de imutabilidade da revisão terminal da baseline. Revisões
--      APPROVED/SUPERSEDED não podem ser atualizadas nem removidas; a
--      supersessão é expressa por uma revisão nova com o campo
--      supersedes_revision_id, preservando a revisão aprovada para os
--      módulos existentes.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION block_terminal_baseline_revision_mutations() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('APPROVED','SUPERSEDED') THEN
    RAISE EXCEPTION 'TERMINAL_BASELINE_REVISION_IMMUTABLE: baseline revision % is terminal (APPROVED/SUPERSEDED) and cannot be updated or deleted', OLD.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS baseline_revisions_terminal_guard ON technology_baseline_revisions;
CREATE TRIGGER baseline_revisions_terminal_guard BEFORE UPDATE OR DELETE ON technology_baseline_revisions FOR EACH ROW EXECUTE FUNCTION block_terminal_baseline_revision_mutations();

-- ---------------------------------------------------------------------------
-- 10b) Guarda de imutabilidade dos filhos (itens e gates) de uma revisão
--      terminal. Nenhum item/gate de revisão APPROVED/SUPERSEDED pode ser
--      inserido, atualizado ou removido. A decisão do gate deve ser gravada
--      antes da transição terminal da revisão na mesma transação, para que o
--      gate guard encontre a revisão ainda PENDING_APPROVAL.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION block_terminal_baseline_revision_children_mutations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_id uuid;
  rev_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    parent_id := OLD.baseline_revision_id;
  ELSE
    parent_id := NEW.baseline_revision_id;
  END IF;
  SELECT status INTO rev_status FROM technology_baseline_revisions WHERE id = parent_id;
  IF rev_status IN ('APPROVED','SUPERSEDED') THEN
    RAISE EXCEPTION 'TERMINAL_BASELINE_REVISION_CHILDREN_IMMUTABLE: items/gates of a terminal baseline revision cannot be inserted, updated or deleted' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS baseline_revision_items_terminal_guard ON technology_baseline_revision_items;
CREATE TRIGGER baseline_revision_items_terminal_guard BEFORE INSERT OR UPDATE OR DELETE ON technology_baseline_revision_items FOR EACH ROW EXECUTE FUNCTION block_terminal_baseline_revision_children_mutations();
DROP TRIGGER IF EXISTS baseline_gates_terminal_guard ON technology_baseline_gates;
CREATE TRIGGER baseline_gates_terminal_guard BEFORE INSERT OR UPDATE OR DELETE ON technology_baseline_gates FOR EACH ROW EXECUTE FUNCTION block_terminal_baseline_revision_children_mutations();

-- ---------------------------------------------------------------------------
-- 10c) Guarda de revisão de catálogo PUBLISHED no contexto de seleção. O
--      contexto só aceita INSERT referenciando uma revisão de catálogo
--      PUBLISHED; DRAFT e SUPERSEDED são rejeitados (mesmo estilo da guarda
--      require_published_catalog_revision_for_inventory de 026). A guarda
--      apenas LÊ o status da revisão no momento do insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION require_published_catalog_revision_for_selection_context() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rev_status text;
BEGIN
  SELECT status INTO rev_status FROM technology_catalog_revisions WHERE id = NEW.technology_catalog_revision_id;
  IF rev_status = 'DRAFT' THEN
    RAISE EXCEPTION 'SELECTION_CONTEXT_REQUIRES_PUBLISHED_CATALOG_REVISION: catalog revision % is DRAFT; only PUBLISHED revisions may be referenced by technology_selection_contexts', NEW.technology_catalog_revision_id USING ERRCODE = 'check_violation';
  ELSIF rev_status = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'SELECTION_CONTEXT_REQUIRES_PUBLISHED_CATALOG_REVISION: catalog revision % is SUPERSEDED; only PUBLISHED revisions may be referenced by technology_selection_contexts', NEW.technology_catalog_revision_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS selection_contexts_published_revision_guard ON technology_selection_contexts;
CREATE TRIGGER selection_contexts_published_revision_guard BEFORE INSERT ON technology_selection_contexts FOR EACH ROW EXECUTE FUNCTION require_published_catalog_revision_for_selection_context();

-- ---------------------------------------------------------------------------
-- 10d) Guarda de revisão de catálogo PUBLISHED na revisão de baseline. A
--      revisão de baseline só aceita INSERT referenciando uma revisão de
--      catálogo PUBLISHED. Transições de status posteriores (DRAFT ->
--      PENDING_APPROVAL -> APPROVED) não revalidam a revisão de catálogo
--      congelada, pois ela pode ter sido SUPERSEDED depois da criação.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION require_published_catalog_revision_for_baseline_revision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rev_status text;
BEGIN
  SELECT status INTO rev_status FROM technology_catalog_revisions WHERE id = NEW.technology_catalog_revision_id;
  IF rev_status = 'DRAFT' THEN
    RAISE EXCEPTION 'BASELINE_REVISION_REQUIRES_PUBLISHED_CATALOG_REVISION: catalog revision % is DRAFT; only PUBLISHED revisions may be referenced by technology_baseline_revisions', NEW.technology_catalog_revision_id USING ERRCODE = 'check_violation';
  ELSIF rev_status = 'SUPERSEDED' THEN
    RAISE EXCEPTION 'BASELINE_REVISION_REQUIRES_PUBLISHED_CATALOG_REVISION: catalog revision % is SUPERSEDED; only PUBLISHED revisions may be referenced by technology_baseline_revisions', NEW.technology_catalog_revision_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS baseline_revisions_published_revision_guard ON technology_baseline_revisions;
CREATE TRIGGER baseline_revisions_published_revision_guard BEFORE INSERT ON technology_baseline_revisions FOR EACH ROW EXECUTE FUNCTION require_published_catalog_revision_for_baseline_revision();

-- ---------------------------------------------------------------------------
-- 10e) Guarda de igualdade da referência entre pais e filhos persistidos.
--      A herança é obrigatória: toda escrita de um contrato de implementação
--      herda technology_baseline_revision_id exclusivamente do seu pai
--      persistido e não pode divergir dele. Quando o filho já traz a
--      referência e ela difere da referência do pai, a escrita é rejeitada.
--      As igualdades garantidas são: modules = module_revisions (via
--      current_revision_id), module_gates = sua module_revision, work_items =
--      sua module_revision, deliveries = seu work_item, qa_matrices = sua
--      delivery/work_item, findings = sua delivery, jobs = sua delivery (a
--      origem normativa do job é a delivery; o branch jobs só atua quando
--      delivery_id IS NOT NULL). Projetos legados
--      (BASELINE_NOT_REQUIRED_LEGACY) permanecem com a referência nula.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_baseline_reference_equality() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  parent_ref uuid;
BEGIN
  IF TG_TABLE_NAME = 'modules' THEN
    SELECT technology_baseline_revision_id INTO parent_ref FROM module_revisions WHERE id = NEW.current_revision_id;
  ELSIF TG_TABLE_NAME IN ('module_gates','work_items') THEN
    SELECT technology_baseline_revision_id INTO parent_ref FROM module_revisions WHERE id = NEW.revision_id;
  ELSIF TG_TABLE_NAME = 'deliveries' THEN
    SELECT technology_baseline_revision_id INTO parent_ref FROM work_items WHERE id = NEW.work_item_id;
  ELSIF TG_TABLE_NAME = 'findings' THEN
    IF NEW.delivery_id IS NOT NULL THEN
      SELECT technology_baseline_revision_id INTO parent_ref FROM deliveries WHERE id = NEW.delivery_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'qa_matrices' THEN
    IF NEW.delivery_id IS NOT NULL THEN
      SELECT technology_baseline_revision_id INTO parent_ref FROM deliveries WHERE id = NEW.delivery_id;
    ELSIF NEW.work_item_id IS NOT NULL THEN
      SELECT technology_baseline_revision_id INTO parent_ref FROM work_items WHERE id = NEW.work_item_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'jobs' THEN
    IF NEW.delivery_id IS NOT NULL THEN
      SELECT technology_baseline_revision_id INTO parent_ref FROM deliveries WHERE id = NEW.delivery_id;
    END IF;
  END IF;
  IF NEW.technology_baseline_revision_id IS NULL AND parent_ref IS NOT NULL THEN
    NEW.technology_baseline_revision_id := parent_ref;
  ELSIF NEW.technology_baseline_revision_id IS NOT NULL AND parent_ref IS NOT NULL AND NEW.technology_baseline_revision_id IS DISTINCT FROM parent_ref THEN
    RAISE EXCEPTION 'BASELINE_REFERENCE_MISMATCH: % must inherit technology_baseline_revision_id % from its persisted parent, not %', TG_TABLE_NAME, parent_ref, NEW.technology_baseline_revision_id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS modules_baseline_reference_guard ON modules;
CREATE TRIGGER modules_baseline_reference_guard BEFORE INSERT OR UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS module_gates_baseline_reference_guard ON module_gates;
CREATE TRIGGER module_gates_baseline_reference_guard BEFORE INSERT OR UPDATE ON module_gates FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS work_items_baseline_reference_guard ON work_items;
CREATE TRIGGER work_items_baseline_reference_guard BEFORE INSERT OR UPDATE ON work_items FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS deliveries_baseline_reference_guard ON deliveries;
CREATE TRIGGER deliveries_baseline_reference_guard BEFORE INSERT OR UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS findings_baseline_reference_guard ON findings;
CREATE TRIGGER findings_baseline_reference_guard BEFORE INSERT OR UPDATE ON findings FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS qa_matrices_baseline_reference_guard ON qa_matrices;
CREATE TRIGGER qa_matrices_baseline_reference_guard BEFORE INSERT OR UPDATE ON qa_matrices FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();
DROP TRIGGER IF EXISTS jobs_baseline_reference_guard ON jobs;
CREATE TRIGGER jobs_baseline_reference_guard BEFORE INSERT OR UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION enforce_baseline_reference_equality();

-- ---------------------------------------------------------------------------
-- 10f) Guarda reversa da herança de baseline de module_revisions. A cadeia
--      modules = module_revisions = module_gates passa a ser garantida nos
--      dois sentidos: 10e garante module <- module_revisions (via
--      current_revision_id) e module_gates <- module_revisions (via
--      revision_id); esta guarda garante module_revision -> module, ou seja,
--      uma module_revision não pode divergir do baseline do módulo que a
--      referencia (modules.current_revision_id = id da revisão). No INSERT o
--      módulo ainda não pode apontar para a nova revisão (o vínculo
--      current_revision_id, NOT NULL FK, é gravado depois da revisão), então
--      o INSERT é naturalmente tolerante; a exigência forte é aplicada no
--      UPDATE, quando o módulo já existe. Projetos legados
--      (BASELINE_NOT_REQUIRED_LEGACY) — módulo e revisão ambos com baseline
--      nulo — seguem permitidos, sem preenchimento forçado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_module_revision_baseline_inheritance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  module_ref uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    SELECT technology_baseline_revision_id INTO module_ref FROM modules WHERE current_revision_id IN (OLD.id, NEW.id) LIMIT 1;
  END IF;
  IF module_ref IS NOT NULL THEN
    IF NEW.technology_baseline_revision_id IS NULL THEN
      NEW.technology_baseline_revision_id := module_ref;
    ELSIF NEW.technology_baseline_revision_id IS DISTINCT FROM module_ref THEN
      RAISE EXCEPTION 'MODULE_REVISION_BASELINE_REFERENCE_MISMATCH: module_revision % must inherit technology_baseline_revision_id % from its module, not %', NEW.id, module_ref, NEW.technology_baseline_revision_id USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS module_revisions_baseline_reference_guard ON module_revisions;
CREATE TRIGGER module_revisions_baseline_reference_guard BEFORE INSERT OR UPDATE ON module_revisions FOR EACH ROW EXECUTE FUNCTION enforce_module_revision_baseline_inheritance();

-- ---------------------------------------------------------------------------
-- 10g) Guarda de numeração monotônica das revisões de baseline. A primeira
--      revisão de um baseline deve ser 1 e cada revisão seguinte deve ser
--      exatamente max(revision_number existente) + 1; saltos, regressões e
--      duplicatas são rejeitados. Quando NEW.revision_number é NULL, a guarda
--      o preenche automaticamente com o próximo número esperado (fill), de
--      modo que o NOT NULL e a UNIQUE (baseline_id, revision_number) nunca
--      sejam violados. Concorrência: a guarda toma um advisory
--      lock transacional chaveado pelo baseline_id
--      (pg_advisory_xact_lock) antes de computar o máximo, serializando
--      inserções concorrentes por baseline e liberando o lock
--      automaticamente no fim da transação (commit/rollback). (A opção B —
--      SELECT ... FOR UPDATE na linha da technology_baselines — também seria
--      segura, mas trava a linha do pai em vez de um lock dedicado à
--      sequência; a opção A foi escolhida por ser autossuficiente.) A UNIQUE
--      (baseline_id, revision_number) e o CHECK (revision_number >= 1)
--      continuam valendo como defesa em profundidade.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_baseline_revision_monotonic_number() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  expected_number bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('baseline_revision_seq:' || NEW.baseline_id::text));
  SELECT COALESCE(max(revision_number), 0) + 1 INTO expected_number FROM technology_baseline_revisions WHERE baseline_id = NEW.baseline_id;
  IF NEW.revision_number IS NULL THEN
    NEW.revision_number := expected_number;
  ELSIF NEW.revision_number <> expected_number THEN
    RAISE EXCEPTION 'BASELINE_REVISION_NUMBER_NOT_MONOTONIC: next baseline revision number for baseline % must be %, not %', NEW.baseline_id, expected_number, NEW.revision_number USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS baseline_revisions_monotonic_number_guard ON technology_baseline_revisions;
CREATE TRIGGER baseline_revisions_monotonic_number_guard BEFORE INSERT ON technology_baseline_revisions FOR EACH ROW EXECUTE FUNCTION enforce_baseline_revision_monotonic_number();
