-- Rebuild empty gate snapshots created while artifacts were correlated by job id
-- but queried with the operation id.
WITH gate_operations AS (
  SELECT g.id AS gate_id,g.project_id,e.operation_id
  FROM gates g
  JOIN events e ON e.project_id=g.project_id
    AND e.event_type='GATE_OPENED'
    AND e.payload->>'gate_id'=g.id::text
  WHERE g.kind='PRODUCT_COMMITMENT'
)
UPDATE gates g
SET evidence=jsonb_build_object('evidence',COALESCE((
  SELECT jsonb_agg(jsonb_build_object('artifact_type',a.artifact_type,'sha256',a.sha256,'metadata',a.metadata) ORDER BY a.created_at)
  FROM artifacts a
  JOIN jobs j ON j.id=a.execution_id
  WHERE a.project_id=go.project_id
    AND j.operation_id=go.operation_id
    AND a.artifact_type IN ('product-need-analysis','product-requirements','product-commitment-review')
),'[]'::jsonb))
FROM gate_operations go
WHERE g.id=go.gate_id
  AND COALESCE(jsonb_array_length(g.evidence->'evidence'),0)=0;
