-- Projects that exhausted retries before DISCOVERY_FAILED existed retain their
-- evidence and become explicitly recoverable instead of appearing active.
WITH exhausted AS (
  SELECT DISTINCT ON (p.id) p.id, j.kind, j.last_error, o.failure_code
  FROM projects p
  JOIN jobs j ON j.project_id = p.id
  JOIN operations o ON o.id = j.operation_id
  WHERE p.workflow_code = 'PROJECT_DISCOVERY'
    AND p.state IN ('ANALYSIS_IN_PROGRESS','REQUIREMENTS_IN_PROGRESS','REVIEW_IN_PROGRESS')
    AND j.status = 'FAILED'
    AND j.kind IN ('ANALYZE_PRODUCT_NEED','DEFINE_PRODUCT_REQUIREMENTS','REVIEW_PRODUCT_COMMITMENT')
    AND NOT EXISTS (
      SELECT 1 FROM operations active
      WHERE active.project_id = p.id AND active.status IN ('ACCEPTED','QUEUED','RUNNING')
    )
  ORDER BY p.id, j.completed_at DESC NULLS LAST
)
UPDATE projects p
SET state = 'DISCOVERY_FAILED', failure_stage = exhausted.kind,
    failure_code = COALESCE(exhausted.last_error, exhausted.failure_code, 'AGENT_EXECUTION_FAILED'), updated_at = now()
FROM exhausted
WHERE p.id = exhausted.id;
