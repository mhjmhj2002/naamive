-- GAT-01: additive, versioned policy. Historical gate tables remain readable;
-- only records created through this catalog carry its authority contract.
CREATE TABLE IF NOT EXISTS gate_catalog_publications (
  version integer PRIMARY KEY CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('PUBLISHED','RETIRED')),
  catalog jsonb NOT NULL CHECK (jsonb_typeof(catalog)='array'),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(content_hash)
);

CREATE TABLE IF NOT EXISTS gate_records (
  id uuid PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects(id),
  gate_code text NOT NULL,
  catalog_version integer NOT NULL REFERENCES gate_catalog_publications(version),
  scope_type text NOT NULL CHECK (scope_type IN ('PROJECT','MODULE','WORK_ITEM','EXECUTION')),
  scope_id text NOT NULL,
  condition_code text NOT NULL,
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='object'),
  reason text NOT NULL CHECK (length(btrim(reason))>0),
  authority_roles jsonb NOT NULL CHECK (jsonb_typeof(authority_roles)='array'),
  allowed_decisions jsonb NOT NULL CHECK (jsonb_typeof(allowed_decisions)='array'),
  decision_effects jsonb NOT NULL CHECK (jsonb_typeof(decision_effects)='object'),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','DECIDED','CANCELLED')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  decision text,
  decision_id uuid,
  correlation_id uuid NOT NULL,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  decided_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS gate_records_open_scope
  ON gate_records(project_id,gate_code,scope_type,scope_id) WHERE status='OPEN';
CREATE UNIQUE INDEX IF NOT EXISTS gate_records_idempotency
  ON gate_records(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS gate_records_project_open
  ON gate_records(project_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS gate_decisions (
  id uuid PRIMARY KEY,
  gate_id uuid NOT NULL REFERENCES gate_records(id),
  catalog_version integer NOT NULL REFERENCES gate_catalog_publications(version),
  gate_version integer NOT NULL CHECK (gate_version > 0),
  decision text NOT NULL,
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  reason text NOT NULL CHECK (length(btrim(reason))>0),
  evidence jsonb NOT NULL CHECK (jsonb_typeof(evidence)='object'),
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX IF NOT EXISTS gate_decisions_idempotency
  ON gate_decisions(idempotency_key) WHERE idempotency_key IS NOT NULL;
DO $$ BEGIN
  ALTER TABLE gate_records ADD CONSTRAINT gate_records_decision_fk
    FOREIGN KEY(decision_id) REFERENCES gate_decisions(id) DEFERRABLE INITIALLY DEFERRED;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION prevent_gate_catalog_publication_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='PUBLISHED' AND (NEW.catalog IS DISTINCT FROM OLD.catalog OR NEW.content_hash IS DISTINCT FROM OLD.content_hash) THEN
    RAISE EXCEPTION 'GATE_CATALOG_PUBLICATION_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS gate_catalog_publication_immutable ON gate_catalog_publications;
CREATE TRIGGER gate_catalog_publication_immutable BEFORE UPDATE ON gate_catalog_publications
FOR EACH ROW EXECUTE FUNCTION prevent_gate_catalog_publication_mutation();

WITH raw(catalog) AS (VALUES ($catalog$
[
  {"code":"REGISTER_PROJECT","type":"ORDINARY","scopes":["PROJECT"],"condition_code":"INTAKE_VALIDATED","required_evidence":["intake_revision_id","reviewed_evidence","rationale"],"authority_roles":["BUSINESS_INTAKE_AUTHORITY"],"decisions":{"APPROVE":{"next_state":"ANALYSIS"},"REWORK":{"next_state":"DRAFT"},"REJECT":{"next_state":"REJECTED"}}},
  {"code":"PRODUCT_COMMITMENT","type":"ORDINARY","scopes":["PROJECT"],"condition_code":"TRACEABLE_REQUIREMENTS_AND_MODULES","required_evidence":["requirements_revision_id","candidate_modules","investment_and_risks"],"authority_roles":["BUSINESS_OWNER"],"decisions":{"APPROVE":{"next_state":"ARCHITECTURE"},"REWORK":{"next_state":"DEFINITION"}}},
  {"code":"MODULE_PLAN_APPROVAL","type":"ORDINARY","scopes":["MODULE"],"condition_code":"VALID_VERSIONED_PLAN","required_evidence":["plan_revision_id","json_hash","markdown_hash","context_hash","validation_hash"],"authority_roles":["MODULE_PRODUCT_OWNER"],"decisions":{"APPROVE":{"next_state":"PLANNED"},"REWORK":{"next_state":"PLANNING_IN_PROGRESS"}}},
  {"code":"DELIVERY_ACCEPTANCE","type":"ORDINARY","scopes":["PROJECT"],"condition_code":"DELIVERY_OPERATION_HANDOVER_EVIDENCE","required_evidence":["release_evidence","operation_evidence","handover_evidence"],"authority_roles":["BUSINESS_OWNER"],"decisions":{"APPROVE":{"next_state":"DELIVERED"},"REWORK":{"next_state":"VALIDATION"}}},
  {"code":"MATERIAL_ARCHITECTURE","type":"CONDITIONAL","scopes":["PROJECT","MODULE"],"condition_code":"MATERIALITY_POLICY_MATCHED","required_evidence":["policy_id","policy_version","material_impacts","alternatives","affected_boundaries"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE":{"next_state":"PLANNING"},"REWORK":{"next_state":"ARCHITECTURE"}}},
  {"code":"MATERIAL_RISK","type":"CONDITIONAL","scopes":["PROJECT"],"condition_code":"MATERIAL_RISK_POLICY_MATCHED","required_evidence":["policy_id","policy_version","residual_risk","impact","mitigations"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"ACCEPT_RISK":{"next_state":"DELIVERY"},"REWORK":{"next_state":"IMPLEMENTATION"}}},
  {"code":"SECURITY_COMPLIANCE","type":"CONDITIONAL","scopes":["PROJECT","MODULE","WORK_ITEM","EXECUTION"],"condition_code":"SECURITY_OR_COMPLIANCE_POLICY_MATCHED","required_evidence":["policy_id","policy_version","applicability","findings","mitigations"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE_EXCEPTION":{"next_state":"RESUME_POLICY_PATH"},"REWORK":{"next_state":"REWORK_REQUIRED"}}},
  {"code":"INDEPENDENCE_EXCEPTION","type":"CONDITIONAL","scopes":["EXECUTION"],"condition_code":"INDEPENDENCE_EXCEPTION_POLICY_MATCHED","required_evidence":["acceptance_id","policy_id","policy_version","expires_at","unavailable_reviewer_evidence"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE":{"next_state":"INDEPENDENT_REVIEW"},"REJECT":{"next_state":"WAITING_FOR_INDEPENDENT_REVIEWER"}}},
  {"code":"SCOPE_ARCHITECTURE_POLICY","type":"CONDITIONAL","scopes":["EXECUTION"],"condition_code":"MATERIALITY_POLICY_MATCHED","required_evidence":["policy_id","policy_version","material_impacts","alternatives","affected_boundaries"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE":{"next_state":"RESUME_POLICY_PATH"},"REJECT":{"next_state":"REWORK_REQUIRED"}}},
  {"code":"ACCEPTED_RISK","type":"CONDITIONAL","scopes":["EXECUTION"],"condition_code":"MATERIAL_RISK_POLICY_MATCHED","required_evidence":["policy_id","policy_version","residual_risk","impact","mitigations"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE":{"next_state":"RESUME_POLICY_PATH"},"REJECT":{"next_state":"REWORK_REQUIRED"}}},
  {"code":"REWORK_ESCALATION","type":"CONDITIONAL","scopes":["WORK_ITEM","EXECUTION"],"condition_code":"REWORK_LIMIT_OR_MATERIALITY_MATCHED","required_evidence":["rework_decision_id","finding_ids","rework_round","limit","escalation_reason"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"AUTHORIZE_REWORK":{"next_state":"REWORK_REQUIRED"},"ACCEPT_RISK":{"next_state":"READY_FOR_INTEGRATION"},"CHANGE_SCOPE":{"next_state":"REWORK_REQUIRED"},"CHANGE_ARCHITECTURE":{"next_state":"REWORK_REQUIRED"},"CLOSE":{"next_state":"CLOSED"}}},
  {"code":"ESCALATED_CLOSURE","type":"CONDITIONAL","scopes":["EXECUTION"],"condition_code":"ESCALATED_CLOSURE_POLICY_MATCHED","required_evidence":["block_id","attempts","escalation_reason","resolution_evidence"],"authority_roles":["TECH_LEAD","REPOSITORY_OWNER"],"decisions":{"APPROVE":{"next_state":"CLOSED"},"REJECT":{"next_state":"BLOCKED"}}}
]
$catalog$::jsonb)),
source(catalog) AS (
  SELECT jsonb_agg(jsonb_set(item,'{decisions}',(
    SELECT jsonb_object_agg(decision.key,decision.value || jsonb_build_object(
      'consequence',format('Registra a decisão %s.',decision.key),
      'continuation',format('Continua para %s conforme o workflow publicado.',decision.value->>'next_state')
    )) FROM jsonb_each(item->'decisions') AS decision(key,value)
  )) ORDER BY item->>'code')
  FROM raw CROSS JOIN LATERAL jsonb_array_elements(raw.catalog) item
)
INSERT INTO gate_catalog_publications(version,status,catalog,content_hash)
SELECT 1,'PUBLISHED',catalog,encode(sha256(convert_to(catalog::text,'UTF8')),'hex') FROM source
ON CONFLICT(version) DO NOTHING;
