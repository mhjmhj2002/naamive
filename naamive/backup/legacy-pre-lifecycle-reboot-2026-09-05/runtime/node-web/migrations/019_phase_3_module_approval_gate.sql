-- The module approval is a material human gate, distinct from the later
-- architecture decision.  Existing Phase 3 tables are preserved unchanged.
ALTER TABLE module_gates DROP CONSTRAINT IF EXISTS module_gates_module_id_kind_version_key;
ALTER TABLE module_gates ADD CONSTRAINT module_gates_module_kind_revision_version_key UNIQUE(module_id, kind, revision_id, version);
