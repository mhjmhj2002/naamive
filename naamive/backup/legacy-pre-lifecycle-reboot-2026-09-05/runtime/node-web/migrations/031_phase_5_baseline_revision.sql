-- F5-13: a selection context records the immutable baseline revision it
-- replaces, so an asynchronous preparation cannot lose the revision lineage.
ALTER TABLE technology_selection_contexts
  ADD COLUMN IF NOT EXISTS supersedes_baseline_revision_id uuid
    REFERENCES technology_baseline_revisions(id);

CREATE INDEX IF NOT EXISTS technology_selection_contexts_supersedes_baseline_revision_idx
  ON technology_selection_contexts(supersedes_baseline_revision_id)
  WHERE supersedes_baseline_revision_id IS NOT NULL;

-- A rejected revision is also a valid predecessor for a new preparation.
INSERT INTO workflow_transitions(workflow_id,from_state,trigger_code,to_state,authority,guard_code,effect_code) VALUES
 ('00000000-0000-0000-0000-000000000203','TECHNOLOGY_BASELINE_IN_REVIEW','START_TECHNOLOGY_BASELINE_REVISION','TECHNOLOGY_SELECTION_PREPARING','OPERATOR','TERMINAL_TECHNOLOGY_BASELINE','PREPARE_TECHNOLOGY_SELECTION_CONTEXT')
ON CONFLICT DO NOTHING;
