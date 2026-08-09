-- F5-14 follow-up: PostgreSQL executes same-event triggers by name.  The
-- inheritance trigger must run before the v3 approved-reference validator.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['module_revisions','modules','module_gates','work_items','deliveries','findings','qa_matrices'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', table_name || '_approved_baseline_guard', table_name);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION require_approved_project_baseline_reference()', 'zz_' || table_name || '_approved_baseline_guard', table_name);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS jobs_approved_baseline_guard ON jobs;
CREATE TRIGGER zz_jobs_approved_baseline_guard BEFORE INSERT OR UPDATE ON jobs FOR EACH ROW WHEN (NEW.delivery_id IS NOT NULL) EXECUTE FUNCTION require_approved_project_baseline_reference();
