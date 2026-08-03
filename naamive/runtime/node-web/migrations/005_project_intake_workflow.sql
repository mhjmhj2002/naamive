CREATE TABLE IF NOT EXISTS workflow_transitions (
  workflow_id uuid NOT NULL REFERENCES workflow_definitions(id),
  from_state text NOT NULL, trigger_code text NOT NULL, to_state text NOT NULL,
  authority text NOT NULL, guard_code text, effect_code text NOT NULL DEFAULT 'NONE',
  PRIMARY KEY (workflow_id, from_state, trigger_code)
);

-- Default status mappings deliberately have no event. The original bootstrap
-- used event_code in its primary key, which made that contract impossible.
ALTER TABLE state_status_mappings DROP CONSTRAINT IF EXISTS state_status_mappings_pkey;
ALTER TABLE state_status_mappings ALTER COLUMN event_code DROP NOT NULL;
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'PROJECT';
ALTER TABLE workflow_states ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS workflow_code text NOT NULL DEFAULT 'PROJECT_INTAKE';
ALTER TABLE events ADD COLUMN IF NOT EXISTS workflow_version integer NOT NULL DEFAULT 1;

INSERT INTO workflow_definitions(id, code, version, scope, status, published_at)
VALUES ('00000000-0000-0000-0000-000000000101', 'PROJECT_INTAKE', 1, 'PROJECT', 'PUBLISHED', now())
ON CONFLICT (code, version) DO NOTHING;

INSERT INTO workflow_states(workflow_id, code, display_name, terminal, position)
VALUES
 ('00000000-0000-0000-0000-000000000101','DRAFT','Rascunho',false,1),
 ('00000000-0000-0000-0000-000000000101','WAITING_FOR_REGISTRATION','Aguardando registro',false,2),
 ('00000000-0000-0000-0000-000000000101','REGISTERED','Registrado',true,3)
ON CONFLICT DO NOTHING;

INSERT INTO workflow_transitions(workflow_id,from_state,trigger_code,to_state,authority,guard_code,effect_code)
VALUES
 ('00000000-0000-0000-0000-000000000101','DRAFT','SUBMIT_INTAKE','DRAFT','OPERATOR','INTAKE_VALID','CREATE_VALIDATION_JOB'),
 ('00000000-0000-0000-0000-000000000101','DRAFT','INTAKE_VALIDATED','WAITING_FOR_REGISTRATION','WORKER','VALID_LEASE','OPEN_REGISTER_GATE'),
 ('00000000-0000-0000-0000-000000000101','DRAFT','INTAKE_REQUIRES_ADJUSTMENT','DRAFT','WORKER','VALID_LEASE','NONE'),
 ('00000000-0000-0000-0000-000000000101','WAITING_FOR_REGISTRATION','REGISTER_PROJECT_APPROVED','REGISTERED','OPERATOR','CURRENT_GATE','CLOSE_GATE'),
 ('00000000-0000-0000-0000-000000000101','WAITING_FOR_REGISTRATION','REGISTER_PROJECT_REJECTED','DRAFT','OPERATOR','CURRENT_GATE','CLOSE_GATE')
ON CONFLICT DO NOTHING;

INSERT INTO status_types(code,name) VALUES ('JOURNEY','Jornada') ON CONFLICT DO NOTHING;
INSERT INTO status_audiences(code,name) VALUES ('OPERATOR','Operador') ON CONFLICT DO NOTHING;
INSERT INTO status_definitions(code,version,label,next_action) VALUES
 ('RASCUNHO',1,'Rascunho','Preencha e submeta a necessidade'),
 ('AJUSTES_NECESSARIOS',1,'Ajustes necessários','Revise os erros de validação'),
 ('AGUARDANDO_SUA_DECISAO',1,'Aguardando sua decisão','Aprove ou rejeite o registro'),
 ('EM_PREPARACAO',1,'Em preparação','Projeto registrado')
ON CONFLICT DO NOTHING;
INSERT INTO state_status_mappings(workflow_id,state_code,event_code,status_type_code,audience_code,status_code,status_definition_version) VALUES
 ('00000000-0000-0000-0000-000000000101','DRAFT',NULL,'JOURNEY','OPERATOR','RASCUNHO',1),
 ('00000000-0000-0000-0000-000000000101','DRAFT','INTAKE_REQUIRES_ADJUSTMENT','JOURNEY','OPERATOR','AJUSTES_NECESSARIOS',1),
 ('00000000-0000-0000-0000-000000000101','WAITING_FOR_REGISTRATION',NULL,'JOURNEY','OPERATOR','AGUARDANDO_SUA_DECISAO',1),
 ('00000000-0000-0000-0000-000000000101','REGISTERED',NULL,'JOURNEY','OPERATOR','EM_PREPARACAO',1)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION prevent_published_workflow_mutation() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM workflow_definitions WHERE id = COALESCE(NEW.workflow_id, OLD.workflow_id) AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'published workflow definitions are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS immutable_published_workflow_states ON workflow_states;
CREATE TRIGGER immutable_published_workflow_states BEFORE UPDATE OR DELETE ON workflow_states FOR EACH ROW EXECUTE FUNCTION prevent_published_workflow_mutation();
DROP TRIGGER IF EXISTS immutable_published_workflow_transitions ON workflow_transitions;
CREATE TRIGGER immutable_published_workflow_transitions BEFORE UPDATE OR DELETE ON workflow_transitions FOR EACH ROW EXECUTE FUNCTION prevent_published_workflow_mutation();
