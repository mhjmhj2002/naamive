-- ============================================================================
-- F5-02 — Persistência versionada do Catálogo Tecnológico e do Inventário
-- read-only (Fase 5).
--
-- Migration puramente aditiva: nenhuma tabela pré-existente é alterada.
-- O schema é neutro: a engine conhece somente enums genéricos de ciclo de
-- vida, classificação, selection_mode, relationship_type, severity e
-- resultado de resolução. Nenhum nome, fornecedor, linguagem, framework,
-- banco ou versão concreta aparece em tabela, coluna, constraint ou trigger.
-- Não há ON DELETE CASCADE em dados publicados ou referenciados: exclusão
-- física é vedada e a inativação apenas bloqueia seleção futura.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) technology_categories — identidade corrente das categorias.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_categories (
  id uuid PRIMARY KEY,
  code varchar NOT NULL UNIQUE,
  name varchar NOT NULL,
  description text,
  selection_mode varchar NOT NULL CHECK (selection_mode IN ('SINGLE','MULTIPLE')),
  min_selections integer NOT NULL CHECK (min_selections >= 0),
  max_selections integer CHECK (max_selections IS NULL OR max_selections >= min_selections),
  is_active boolean NOT NULL,
  display_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (selection_mode <> 'SINGLE' OR max_selections = 1),
  CHECK (code ~ '^[A-Z][A-Z0-9_]{2,127}$')
);

-- ---------------------------------------------------------------------------
-- 2) technology_catalog_items — identidade corrente dos itens catalogados.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_catalog_items (
  id uuid PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES technology_categories(id),
  code varchar NOT NULL,
  name varchar NOT NULL,
  description text,
  is_active boolean NOT NULL,
  display_order integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (category_id, code),
  CHECK (code ~ '^[A-Z][A-Z0-9_]{2,127}$')
);

-- ---------------------------------------------------------------------------
-- 3) technology_catalog_revisions — publicação global e imutável do catálogo.
--    Ciclo permitido: DRAFT -> PUBLISHED -> SUPERSEDED (transições tratadas
--    pela task F5-05, não por triggers desta migration).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_catalog_revisions (
  id uuid PRIMARY KEY,
  revision_number bigint NOT NULL UNIQUE,
  status varchar NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','SUPERSEDED')),
  description text,
  content_hash varchar NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  published_at timestamptz,
  published_by varchar,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (status = 'DRAFT' OR (published_at IS NOT NULL AND published_by IS NOT NULL))
);

-- ---------------------------------------------------------------------------
-- 4) technology_compatibility_rules — regras ativas da identidade corrente.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_compatibility_rules (
  id uuid PRIMARY KEY,
  source_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  relationship_type varchar NOT NULL CHECK (relationship_type IN ('REQUIRES','CONFLICTS_WITH','RECOMMENDS')),
  target_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  constraint_expression varchar,
  severity varchar NOT NULL CHECK (severity IN ('ERROR','WARNING','INFO')),
  message text NOT NULL,
  is_active boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (source_item_id <> target_item_id),
  UNIQUE NULLS NOT DISTINCT (source_item_id, relationship_type, target_item_id, constraint_expression)
);

-- ---------------------------------------------------------------------------
-- 5) Associações congeladas por revisão. Cada associação guarda revision_id,
--    a FK para a identidade corrente e os valores copiados que impedem que
--    uma atualização posterior da tabela corrente reinterprete a revisão já
--    publicada. FKs compostas vinculam filhos congelados ao pai congelado NA
--    MESMA REVISÃO.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS technology_catalog_revision_categories (
  revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  category_id uuid NOT NULL REFERENCES technology_categories(id),
  code varchar NOT NULL,
  name varchar NOT NULL,
  selection_mode varchar NOT NULL CHECK (selection_mode IN ('SINGLE','MULTIPLE')),
  min_selections integer NOT NULL CHECK (min_selections >= 0),
  max_selections integer CHECK (max_selections IS NULL OR max_selections >= min_selections),
  is_active boolean NOT NULL,
  display_order integer NOT NULL,
  PRIMARY KEY (revision_id, category_id),
  CHECK (selection_mode <> 'SINGLE' OR max_selections = 1)
);

CREATE TABLE IF NOT EXISTS technology_catalog_revision_items (
  revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  catalog_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  category_id uuid NOT NULL REFERENCES technology_categories(id),
  code varchar NOT NULL,
  name varchar NOT NULL,
  description text,
  is_active boolean NOT NULL,
  display_order integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (revision_id, catalog_item_id),
  FOREIGN KEY (revision_id, category_id) REFERENCES technology_catalog_revision_categories(revision_id, category_id)
);

CREATE TABLE IF NOT EXISTS technology_catalog_revision_profiles (
  revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  -- Observação: a FK de profile_id para technology_profiles será adicionada
  -- quando a tabela corrente for criada por uma migration posterior da Fase 5
  -- (task F5-03); até lá profile_id permanece uuid livre sem FK.
  profile_id uuid NOT NULL,
  code varchar NOT NULL,
  name varchar NOT NULL,
  description text,
  is_active boolean NOT NULL,
  PRIMARY KEY (revision_id, profile_id)
);

CREATE TABLE IF NOT EXISTS technology_catalog_revision_profile_items (
  revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  -- Observação: profile_id não possui FK para technology_profiles (inexistente
  -- ainda); será adicionada quando a tabela corrente for criada na Fase 5.
  profile_id uuid NOT NULL,
  catalog_item_id uuid NOT NULL REFERENCES technology_catalog_items(id),
  classification varchar NOT NULL CHECK (classification IN ('REQUIRED','PREFERRED','ALLOWED','PROHIBITED')),
  version_constraint varchar,
  justification text,
  display_order integer NOT NULL,
  PRIMARY KEY (revision_id, profile_id, catalog_item_id),
  FOREIGN KEY (revision_id, profile_id) REFERENCES technology_catalog_revision_profiles(revision_id, profile_id),
  FOREIGN KEY (revision_id, catalog_item_id) REFERENCES technology_catalog_revision_items(revision_id, catalog_item_id)
);

CREATE TABLE IF NOT EXISTS technology_catalog_revision_compatibility_rules (
  revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  compatibility_rule_id uuid NOT NULL REFERENCES technology_compatibility_rules(id),
  source_item_id uuid NOT NULL,
  relationship_type varchar NOT NULL CHECK (relationship_type IN ('REQUIRES','CONFLICTS_WITH','RECOMMENDS')),
  target_item_id uuid NOT NULL,
  constraint_expression varchar,
  severity varchar NOT NULL CHECK (severity IN ('ERROR','WARNING','INFO')),
  message text NOT NULL,
  is_active boolean NOT NULL,
  PRIMARY KEY (revision_id, compatibility_rule_id),
  FOREIGN KEY (revision_id, source_item_id) REFERENCES technology_catalog_revision_items(revision_id, catalog_item_id),
  FOREIGN KEY (revision_id, target_item_id) REFERENCES technology_catalog_revision_items(revision_id, catalog_item_id)
);

-- ---------------------------------------------------------------------------
-- 6) technology_inventory — snapshot read-only e sanitizado do inventário.
--    Única fonte persistente do inventário; a task F5-08 apenas o popula e
--    não inventa DDL. project_id é uuid (formato do contrato F5-01) e,
--    seguindo o padrão de 025_phase_4_agent_runtime.sql, a integridade
--    referencial ao projeto é garantida por project_key text REFERENCES
--    projects(id), pois projects.id é text no schema pré-existente.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technology_inventory (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  project_key text NOT NULL REFERENCES projects(id),
  repository_sha varchar NOT NULL,
  job_id uuid REFERENCES jobs(id),
  technology_catalog_revision_id uuid NOT NULL REFERENCES technology_catalog_revisions(id),
  source_path text NOT NULL,
  detector_code varchar NOT NULL,
  confidence numeric NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  value text,
  resolution_result varchar NOT NULL CHECK (resolution_result IN ('RESOLVED_ACTIVE','RESOLVED_INACTIVE','UNKNOWN_CATALOG_ITEM','AMBIGUOUS_CATALOG_ITEM')),
  catalog_item_id uuid REFERENCES technology_catalog_items(id),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
COMMENT ON TABLE technology_inventory IS 'Snapshot read-only e sanitizado do inventário tecnológico, ligado ao projeto, ao SHA do repositório no momento da detecção, à execução/job que o produziu e à revisão de catálogo usada na resolução (deve referenciar uma revisão PUBLISHED em uso). Não possui cascata destrutiva nem colunas de conteúdo integral, credencial ou segredo: value é somente o valor resumido e sanitizado.';
COMMENT ON COLUMN technology_inventory.technology_catalog_revision_id IS 'Revisão global do catálogo usada na resolução; em uso deve referenciar uma revisão PUBLISHED.';

-- ---------------------------------------------------------------------------
-- 7a) Guarda de imutabilidade da identidade corrente após publicação.
--     Bloqueia UPDATE de code (categorias/items) ou category_id (items)
--     quando a linha é referenciada por uma revisão PUBLISHED/SUPERSEDED.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION block_published_catalog_identity_updates() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  identity_changed boolean;
  referenced boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'technology_categories' THEN
      identity_changed := NEW.code IS DISTINCT FROM OLD.code;
      IF identity_changed THEN
        SELECT EXISTS (
          SELECT 1
          FROM technology_catalog_revision_categories rc
          JOIN technology_catalog_revisions r ON r.id = rc.revision_id
          WHERE rc.category_id = OLD.id AND r.status IN ('PUBLISHED','SUPERSEDED')
        ) INTO referenced;
        IF referenced THEN
          RAISE EXCEPTION 'PUBLISHED_CATALOG_IDENTITY_IMMUTABLE' USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    ELSIF TG_TABLE_NAME = 'technology_catalog_items' THEN
      identity_changed := NEW.code IS DISTINCT FROM OLD.code OR NEW.category_id IS DISTINCT FROM OLD.category_id;
      IF identity_changed THEN
        SELECT EXISTS (
          SELECT 1
          FROM technology_catalog_revision_items ri
          JOIN technology_catalog_revisions r ON r.id = ri.revision_id
          WHERE ri.catalog_item_id = OLD.id AND r.status IN ('PUBLISHED','SUPERSEDED')
        ) INTO referenced;
        IF referenced THEN
          RAISE EXCEPTION 'PUBLISHED_CATALOG_IDENTITY_IMMUTABLE' USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS technology_categories_published_identity_guard ON technology_categories;
CREATE TRIGGER technology_categories_published_identity_guard BEFORE UPDATE ON technology_categories FOR EACH ROW EXECUTE FUNCTION block_published_catalog_identity_updates();
DROP TRIGGER IF EXISTS technology_catalog_items_published_identity_guard ON technology_catalog_items;
CREATE TRIGGER technology_catalog_items_published_identity_guard BEFORE UPDATE ON technology_catalog_items FOR EACH ROW EXECUTE FUNCTION block_published_catalog_identity_updates();

-- ---------------------------------------------------------------------------
-- 7b) Guarda de imutabilidade das associações congeladas. Conteúdo congelado
--     de revisão PUBLISHED/SUPERSEDED não pode ser atualizado nem removido.
--     Todas as cinco tabelas congeladas possuem revision_id, então uma única
--     função genérica atende a todas; o mesmo trigger é anexado a cada uma.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION block_frozen_revision_association_mutations() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  rev_status text;
BEGIN
  SELECT status INTO rev_status FROM technology_catalog_revisions WHERE id = OLD.revision_id;
  IF rev_status IN ('PUBLISHED','SUPERSEDED') THEN
    RAISE EXCEPTION 'FROZEN_REVISION_ASSOCIATION_IMMUTABLE' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS revision_categories_frozen_guard ON technology_catalog_revision_categories;
CREATE TRIGGER revision_categories_frozen_guard BEFORE UPDATE OR DELETE ON technology_catalog_revision_categories FOR EACH ROW EXECUTE FUNCTION block_frozen_revision_association_mutations();
DROP TRIGGER IF EXISTS revision_items_frozen_guard ON technology_catalog_revision_items;
CREATE TRIGGER revision_items_frozen_guard BEFORE UPDATE OR DELETE ON technology_catalog_revision_items FOR EACH ROW EXECUTE FUNCTION block_frozen_revision_association_mutations();
DROP TRIGGER IF EXISTS revision_profiles_frozen_guard ON technology_catalog_revision_profiles;
CREATE TRIGGER revision_profiles_frozen_guard BEFORE UPDATE OR DELETE ON technology_catalog_revision_profiles FOR EACH ROW EXECUTE FUNCTION block_frozen_revision_association_mutations();
DROP TRIGGER IF EXISTS revision_profile_items_frozen_guard ON technology_catalog_revision_profile_items;
CREATE TRIGGER revision_profile_items_frozen_guard BEFORE UPDATE OR DELETE ON technology_catalog_revision_profile_items FOR EACH ROW EXECUTE FUNCTION block_frozen_revision_association_mutations();
DROP TRIGGER IF EXISTS revision_compatibility_rules_frozen_guard ON technology_catalog_revision_compatibility_rules;
CREATE TRIGGER revision_compatibility_rules_frozen_guard BEFORE UPDATE OR DELETE ON technology_catalog_revision_compatibility_rules FOR EACH ROW EXECUTE FUNCTION block_frozen_revision_association_mutations();
