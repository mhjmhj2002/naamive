-- A rework operation reuses the prior analysis; a commitment must snapshot the
-- latest artifact for each required evidence type, even when they span jobs.
UPDATE gates g
SET evidence=jsonb_build_object('evidence',COALESCE((
  SELECT jsonb_agg(jsonb_build_object('artifact_type',latest.artifact_type,'sha256',latest.sha256,'metadata',latest.metadata) ORDER BY latest.created_at)
  FROM (
    SELECT DISTINCT ON (a.artifact_type) a.artifact_type,a.sha256,a.metadata,a.created_at
    FROM artifacts a
    WHERE a.project_id=g.project_id
      AND a.artifact_type IN ('product-need-analysis','product-requirements','product-commitment-review')
    ORDER BY a.artifact_type,a.created_at DESC
  ) latest
),'[]'::jsonb))
WHERE g.kind='PRODUCT_COMMITMENT';
