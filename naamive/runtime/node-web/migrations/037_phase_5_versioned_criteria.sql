-- F5-23 correction 2: criterion IDs become stable, versioned data persisted at
-- module-revision creation instead of being derived positionally at plan time.
-- The module_revisions.criteria column is authoritative for plan decomposition;
-- legacy revisions are backfilled deterministically so they remain readable.
ALTER TABLE module_revisions ADD COLUMN IF NOT EXISTS criteria jsonb;

-- Backfill legacy revisions: derive a deterministic criterion_id for each
-- acceptance criterion that was previously assigned by position.
UPDATE module_revisions r
SET criteria = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'criterion_id', CASE WHEN jsonb_typeof(e.c)='object' AND e.c ? 'criterion_id' THEN e.c->>'criterion_id' ELSE 'criterion-'||e.n END,
    'text', CASE WHEN jsonb_typeof(e.c)='string' THEN e.c #>> '{}' ELSE COALESCE(e.c->>'text','') END
  ) ORDER BY e.n), '[]'::jsonb)
  FROM jsonb_array_elements(r.payload->'acceptance_criteria') WITH ORDINALITY AS e(c, n)
)
WHERE r.criteria IS NULL AND r.payload ? 'acceptance_criteria';
