-- Rework is a durable decision, rather than an implicit state change on a work item.
CREATE TABLE rework_decisions (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id), revision_id uuid NOT NULL REFERENCES module_revisions(id),
  delivery_id uuid NOT NULL REFERENCES deliveries(id), head_sha text NOT NULL,
  finding_ids jsonb NOT NULL, justification text NOT NULL, rework_round integer NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  resolved_at timestamptz,
  CHECK (jsonb_typeof(finding_ids)='array'),
  CHECK (status IN ('ACTIVE','RESOLVED','ESCALATED','RISK_ACCEPTED','CLOSED'))
);
CREATE UNIQUE INDEX one_active_rework_per_work_item_revision
  ON rework_decisions(work_item_id,revision_id) WHERE status='ACTIVE';

CREATE TABLE rework_gates (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id),
  work_item_id uuid NOT NULL REFERENCES work_items(id), revision_id uuid NOT NULL REFERENCES module_revisions(id),
  decision_id uuid NOT NULL REFERENCES rework_decisions(id), reason text NOT NULL,
  version integer NOT NULL DEFAULT 1, status text NOT NULL DEFAULT 'OPEN', decision text,
  feedback text, evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  opened_at timestamptz NOT NULL DEFAULT clock_timestamp(), decided_at timestamptz,
  CHECK (status IN ('OPEN','DECIDED')),
  CHECK (decision IS NULL OR decision IN ('AUTHORIZE_REWORK','ACCEPT_RISK','CHANGE_SCOPE','CHANGE_ARCHITECTURE','CLOSE'))
);
CREATE UNIQUE INDEX one_open_rework_gate_per_work_item ON rework_gates(work_item_id) WHERE status='OPEN';
