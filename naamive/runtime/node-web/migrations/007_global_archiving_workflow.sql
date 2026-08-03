-- A separate published workflow keeps previous definitions immutable while
-- governing the one global administrative transition.
CREATE TABLE IF NOT EXISTS workflow_global_policies (
  policy_code text NOT NULL, source_workflow_code text NOT NULL, source_state text NOT NULL,
  target_workflow_code text NOT NULL, target_workflow_version integer NOT NULL,
  PRIMARY KEY(policy_code,source_workflow_code,source_state)
);
INSERT INTO workflow_definitions(id,code,version,scope,status,published_at)
VALUES ('00000000-0000-0000-0000-000000000701','PROJECT_ARCHIVING',1,'PROJECT','PUBLISHED',now()) ON CONFLICT DO NOTHING;
INSERT INTO workflow_states(workflow_id,code,display_name,terminal,position) VALUES
 ('00000000-0000-0000-0000-000000000701','ARCHIVING','Arquivando',false,1),
 ('00000000-0000-0000-0000-000000000701','ARCHIVED','Arquivado',true,2) ON CONFLICT DO NOTHING;
INSERT INTO workflow_transitions(workflow_id,from_state,trigger_code,to_state,authority,guard_code,effect_code)
VALUES ('00000000-0000-0000-0000-000000000701','ARCHIVING','ARCHIVING_COMPLETED','ARCHIVED','SYSTEM','ARCHIVE_RECORD_COMPLETE','NONE') ON CONFLICT DO NOTHING;
INSERT INTO workflow_global_policies(policy_code,source_workflow_code,source_state,target_workflow_code,target_workflow_version)
SELECT 'ARCHIVE_PROJECT',code,state,'PROJECT_ARCHIVING',1 FROM (VALUES
 ('PROJECT_INTAKE','DRAFT'),('PROJECT_INTAKE','WAITING_FOR_REGISTRATION'),('PROJECT_INTAKE','REGISTERED'),
 ('PROJECT_DISCOVERY','REGISTERED'),('PROJECT_DISCOVERY','ANALYSIS_IN_PROGRESS'),('PROJECT_DISCOVERY','REQUIREMENTS_IN_PROGRESS'),('PROJECT_DISCOVERY','REVIEW_IN_PROGRESS'),('PROJECT_DISCOVERY','WAITING_FOR_PRODUCT_COMMITMENT'),('PROJECT_DISCOVERY','PRODUCT_COMMITMENT')
) AS allowed(code,state) ON CONFLICT DO NOTHING;
