-- Gates opened after this publication keep the exact catalog hash and contract;
-- nullable columns preserve any short-lived rows created while 049 was rolling out.
ALTER TABLE gate_records
  ADD COLUMN IF NOT EXISTS catalog_hash text,
  ADD COLUMN IF NOT EXISTS catalog_contract jsonb;

DO $$ BEGIN
  ALTER TABLE gate_records ADD CONSTRAINT gate_records_catalog_hash_format CHECK (catalog_hash IS NULL OR catalog_hash ~ '^[a-f0-9]{64}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE gate_records ADD CONSTRAINT gate_records_catalog_contract_object CHECK (catalog_contract IS NULL OR jsonb_typeof(catalog_contract)='object');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
