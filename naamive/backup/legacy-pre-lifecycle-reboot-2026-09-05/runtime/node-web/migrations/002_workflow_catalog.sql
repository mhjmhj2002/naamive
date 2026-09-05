CREATE TABLE workflow_definitions (id uuid PRIMARY KEY, code text NOT NULL, version integer NOT NULL, status text NOT NULL, published_at timestamptz, UNIQUE(code, version));
CREATE TABLE workflow_states (workflow_id uuid NOT NULL REFERENCES workflow_definitions(id), code text NOT NULL, display_name text NOT NULL, terminal boolean NOT NULL DEFAULT false, position integer NOT NULL, PRIMARY KEY(workflow_id, code));
CREATE TABLE status_types (code text PRIMARY KEY, name text NOT NULL);
CREATE TABLE status_audiences (code text PRIMARY KEY, name text NOT NULL);
CREATE TABLE status_definitions (code text NOT NULL, version integer NOT NULL, label text NOT NULL, next_action text NOT NULL, PRIMARY KEY(code, version));
CREATE TABLE state_status_mappings (
  workflow_id uuid NOT NULL REFERENCES workflow_definitions(id), state_code text NOT NULL, event_code text,
  status_type_code text NOT NULL REFERENCES status_types(code), audience_code text NOT NULL REFERENCES status_audiences(code),
  status_code text NOT NULL, status_definition_version integer NOT NULL,
  PRIMARY KEY(workflow_id, state_code, event_code, status_type_code, audience_code),
  FOREIGN KEY(status_code, status_definition_version) REFERENCES status_definitions(code, version)
);
