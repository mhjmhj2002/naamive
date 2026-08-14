CREATE TABLE module_plan_revisions (
  id uuid PRIMARY KEY, project_id text NOT NULL REFERENCES projects(id), module_id uuid NOT NULL REFERENCES modules(id),
  revision_number integer NOT NULL, supersedes_revision_id uuid REFERENCES module_plan_revisions(id),
  module_revision_id uuid NOT NULL REFERENCES module_revisions(id), technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id),
  payload jsonb NOT NULL, payload_hash text NOT NULL, json_artifact_hash text NOT NULL, markdown_artifact_hash text NOT NULL,
  feedback text, author_id text NOT NULL, status text NOT NULL DEFAULT 'PLAN_PROPOSED', created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(module_id,revision_number)
);
CREATE UNIQUE INDEX one_open_module_plan_revision ON module_plan_revisions(module_id) WHERE status='PLAN_PROPOSED';
ALTER TABLE module_gates ADD COLUMN IF NOT EXISTS plan_revision_id uuid REFERENCES module_plan_revisions(id);
CREATE UNIQUE INDEX one_open_module_plan_gate ON module_gates(module_id) WHERE kind='MODULE_PLAN_APPROVAL' AND status='OPEN';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES modules(id);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS plan_revision_id uuid REFERENCES module_plan_revisions(id);

-- Legacy modules that stopped after architecture approval get exactly one deterministic job.
INSERT INTO operations(id,project_id,kind,status,idempotency_key,correlation_id,revision_id)
SELECT gen_random_uuid(),m.project_id,'PLAN_MODULE_WORK_ITEMS','QUEUED','plan-module:'||m.id||':initial',gen_random_uuid(),NULL
FROM modules m
WHERE m.state='PLANNING_IN_PROGRESS'
  AND NOT EXISTS (SELECT 1 FROM module_plan_revisions p WHERE p.module_id=m.id AND p.status='PLAN_PROPOSED')
  AND NOT EXISTS (SELECT 1 FROM operations o WHERE o.idempotency_key='plan-module:'||m.id||':initial');
INSERT INTO jobs(id,operation_id,project_id,revision_id,module_id,kind,idempotency_key,technology_baseline_revision_id)
SELECT gen_random_uuid(),o.id,o.project_id,NULL,m.id,'PLAN_MODULE_WORK_ITEMS','plan-job:'||o.id,m.technology_baseline_revision_id
FROM operations o JOIN modules m ON m.project_id=o.project_id
WHERE o.kind='PLAN_MODULE_WORK_ITEMS' AND o.idempotency_key='plan-module:'||m.id||':initial'
  AND NOT EXISTS (SELECT 1 FROM jobs j WHERE j.operation_id=o.id);
