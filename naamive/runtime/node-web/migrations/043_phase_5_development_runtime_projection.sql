-- F5-25: additive, legacy-safe runtime projection support.  No legacy row is
-- repaired or inferred by this migration.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS runtime_legacy_report (
  id bigserial PRIMARY KEY, subject_type text NOT NULL CHECK(subject_type IN ('DELIVERY','JOB','ARTIFACT')),
  subject_id uuid NOT NULL, rule_code text NOT NULL, details jsonb NOT NULL DEFAULT '{}'::jsonb,
  reported_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(subject_type,subject_id,rule_code)
);
INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'JOB',j.id,'DEVELOPMENT_DELIVERY_MISSING','{}'::jsonb FROM jobs j
 WHERE j.kind='DEVELOP_WORK_ITEM' AND j.delivery_id IS NULL ON CONFLICT DO NOTHING;
INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'DELIVERY',d.id,'ACTIVE_DELIVERY_WORKTREE_MISSING',jsonb_build_object('state',d.state) FROM deliveries d
 WHERE d.state IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS','EVIDENCE_REVIEW','QA_IN_PROGRESS','QA_APPROVED','QA_REJECTED') AND d.worktree_id IS NULL ON CONFLICT DO NOTHING;
INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'JOB',j.id,'DEVELOPMENT_RELATION_CROSSED',jsonb_build_object('delivery_work_item_id',d.work_item_id) FROM jobs j JOIN deliveries d ON d.id=j.delivery_id
 WHERE j.kind='DEVELOP_WORK_ITEM' AND j.project_id<>d.project_id ON CONFLICT DO NOTHING;
INSERT INTO runtime_legacy_report(subject_type,subject_id,rule_code,details)
 SELECT 'DELIVERY',d.id,'DELIVERY_WORKTREE_RELATION_CROSSED',jsonb_build_object('worktree_work_item_id',t.work_item_id)
 FROM deliveries d JOIN worktrees t ON t.id=d.worktree_id
 WHERE t.project_id<>d.project_id OR t.work_item_id<>d.work_item_id ON CONFLICT DO NOTHING;

DO $$ BEGIN ALTER TABLE jobs ADD CONSTRAINT jobs_development_delivery_required CHECK(kind <> 'DEVELOP_WORK_ITEM' OR delivery_id IS NOT NULL) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE deliveries ADD CONSTRAINT deliveries_worktree_required CHECK(state NOT IN ('RESERVED','PREPARING','DISPATCHED','RUNNING','DEVELOPMENT_IN_PROGRESS','EVIDENCE_REVIEW','QA_IN_PROGRESS','QA_APPROVED','QA_REJECTED') OR worktree_id IS NOT NULL) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE artifacts ADD CONSTRAINT artifacts_metadata_runtime_contract CHECK(jsonb_typeof(metadata)='object' AND NOT (metadata ?| ARRAY['path','uri','prompt','command','stdout','stderr','content','secret','token'])) NOT VALID; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS runtime_processes (
 id uuid PRIMARY KEY, role text NOT NULL CHECK(role IN ('SERVER','WORKER')), instance_id uuid NOT NULL,
 build_id text NOT NULL CHECK(build_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'), schema_version text NOT NULL CHECK(schema_version='development-runtime/v1'),
 last_heartbeat_at timestamptz NOT NULL, started_at timestamptz NOT NULL DEFAULT clock_timestamp(), stopped_at timestamptz, UNIQUE(role,instance_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS one_live_runtime_process_per_role ON runtime_processes(role) WHERE stopped_at IS NULL;
CREATE TABLE IF NOT EXISTS runtime_diagnostics (
 id uuid PRIMARY KEY, work_item_id uuid NOT NULL REFERENCES work_items(id), fingerprint text NOT NULL, rule_code text NOT NULL,
 state_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(work_item_id,fingerprint)
);
