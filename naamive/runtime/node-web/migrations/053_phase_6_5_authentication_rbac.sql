-- GAT-03: autenticação local, sessões opacas e grants por ação/escopo.
CREATE TABLE IF NOT EXISTS auth_roles (
  code text PRIMARY KEY,
  description text NOT NULL
);

INSERT INTO auth_roles(code,description) VALUES
 ('OPERATOR','Opera comandos ordinários de projeto.'),
 ('BUSINESS_INTAKE_AUTHORITY','Decide o gate REGISTER_PROJECT.'),
 ('BUSINESS_OWNER','Decide gates ordinários de negócio.'),
 ('MODULE_PRODUCT_OWNER','Decide MODULE_PLAN_APPROVAL.'),
 ('TECH_LEAD','Decide gates técnicos condicionais catalogados.'),
 ('REPOSITORY_OWNER','Decide gates técnicos condicionais catalogados.'),
 ('ON_CALL_OWNER','Executa recovery e ações operacionais publicadas.'),
 ('ASSURANCE_REVIEWER','Registra decisão de review independente.'),
 ('CONFIGURATION_ADMIN','Administra principals, grants e credenciais.'),
 ('WORKER_SERVICE','Executa somente ações técnicas de worker.'),
 ('AGENT_SERVICE','Executa somente ações automatizadas de agente.')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS auth_principals (
  id uuid PRIMARY KEY,
  principal_type text NOT NULL CHECK(principal_type IN ('HUMAN','SERVICE')),
  username text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth_principals(id),
  CHECK((status='ACTIVE' AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS auth_credentials (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES auth_principals(id),
  credential_type text NOT NULL CHECK(credential_type IN ('PASSWORD','SERVICE_SECRET')),
  secret_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth_principals(id),
  rotated_from_id uuid REFERENCES auth_credentials(id),
  CHECK((status='ACTIVE' AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS auth_one_active_credential_per_type ON auth_credentials(principal_id,credential_type) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS auth_role_grants (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES auth_principals(id),
  role_code text NOT NULL REFERENCES auth_roles(code),
  action_code text NOT NULL CHECK(action_code ~ '^[A-Z][A-Z0-9_]{2,79}$'),
  project_id text,
  resource_type text,
  resource_id text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REVOKED')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth_principals(id),
  CHECK((resource_type IS NULL AND resource_id IS NULL) OR (resource_type IS NOT NULL AND resource_id IS NOT NULL)),
  CHECK((status='ACTIVE' AND revoked_at IS NULL) OR (status='REVOKED' AND revoked_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS auth_role_grants_lookup ON auth_role_grants(principal_id,action_code,project_id) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY,
  principal_id uuid NOT NULL REFERENCES auth_principals(id),
  session_hash text NOT NULL UNIQUE,
  csrf_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES auth_principals(id),
  CHECK(expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS auth_sessions_active_lookup ON auth_sessions(session_hash,expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS auth_audit_records (
  id uuid PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  principal_id uuid REFERENCES auth_principals(id),
  principal_type text,
  action_code text NOT NULL,
  project_id text,
  resource_type text,
  resource_id text,
  role_code text,
  grant_id uuid REFERENCES auth_role_grants(id),
  outcome text NOT NULL CHECK(outcome IN ('ALLOWED','DENIED','AUTHENTICATED','LOGOUT','BOOTSTRAP','ROTATED','REVOKED')),
  reason_code text NOT NULL
);
CREATE INDEX IF NOT EXISTS auth_audit_principal_time ON auth_audit_records(principal_id,occurred_at DESC);
