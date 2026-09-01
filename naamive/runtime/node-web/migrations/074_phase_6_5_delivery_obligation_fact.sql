-- GAT-02: delivery is a durable obligation fact, not merely a module-state
-- projection. Existing commitment snapshots remain untouched.
ALTER TABLE committed_module_obligations
  ADD COLUMN delivery_package_id uuid REFERENCES delivery_packages(id),
  ADD COLUMN delivered_at timestamptz;

CREATE UNIQUE INDEX committed_module_obligations_delivery_package_module
  ON committed_module_obligations(delivery_package_id, materialized_module_id)
  WHERE delivery_package_id IS NOT NULL;
