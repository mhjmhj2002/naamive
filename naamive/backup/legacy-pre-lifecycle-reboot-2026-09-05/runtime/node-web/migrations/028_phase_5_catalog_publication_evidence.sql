-- Evidência global de publicação do Catálogo. Não pertence a um projeto,
-- portanto não usa a tabela de artifacts, cujo vínculo project_id é obrigatório.
CREATE TABLE IF NOT EXISTS technology_catalog_publication_evidence (
  revision_id uuid PRIMARY KEY REFERENCES technology_catalog_revisions(id),
  actor varchar NOT NULL,
  correlation_id varchar NOT NULL,
  package_hash varchar NOT NULL CHECK (package_hash ~ '^[a-f0-9]{64}$'),
  storage_key text NOT NULL UNIQUE,
  storage_uri text NOT NULL,
  sha256 varchar NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (jsonb_typeof(evidence) = 'object')
);
