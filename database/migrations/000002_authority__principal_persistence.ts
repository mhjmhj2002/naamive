import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE authority.principal (
      principal_id uuid PRIMARY KEY,
      username text NOT NULL UNIQUE CHECK (username ~ '^[a-z][a-z0-9_-]{2,31}$'),
      status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
      version bigint NOT NULL CHECK (version >= 1),
      current_history_event_id uuid NOT NULL
    )
  `.execute(db);
  await sql`
    CREATE TABLE authority.principal_history (
      history_event_id uuid PRIMARY KEY,
      principal_id uuid NOT NULL REFERENCES authority.principal(principal_id) ON DELETE RESTRICT,
      version bigint NOT NULL CHECK (version >= 1),
      username text NOT NULL CHECK (username ~ '^[a-z][a-z0-9_-]{2,31}$'),
      status text NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
      event_type text NOT NULL CHECK (event_type IN ('PRINCIPAL_CREATED', 'USERNAME_CHANGED', 'STATUS_CHANGED')),
      occurred_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (principal_id, version),
      UNIQUE (principal_id, history_event_id)
    )
  `.execute(db);
  await sql`
    ALTER TABLE authority.principal
      ADD CONSTRAINT principal_current_history_matches_principal_fk
      FOREIGN KEY (principal_id, current_history_event_id)
      REFERENCES authority.principal_history(principal_id, history_event_id)
      DEFERRABLE INITIALLY DEFERRED
  `.execute(db);
  await sql`
    CREATE FUNCTION authority.assert_principal_current_history_consistency()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM authority.principal_history history
        WHERE history.principal_id = NEW.principal_id
          AND history.history_event_id = NEW.current_history_event_id
          AND history.version = NEW.version
          AND history.username = NEW.username
          AND history.status = NEW.status
      ) THEN
        RAISE EXCEPTION 'principal current history pointer must match principal snapshot';
      END IF;
      RETURN NULL;
    END;
    $$
  `.execute(db);
  await sql`
    CREATE CONSTRAINT TRIGGER principal_current_history_consistency
    AFTER INSERT OR UPDATE ON authority.principal
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION authority.assert_principal_current_history_consistency()
  `.execute(db);
  await sql`GRANT SELECT, INSERT, UPDATE ON authority.principal TO naamive_web, naamive_worker`.execute(db);
  await sql`GRANT SELECT, INSERT ON authority.principal_history TO naamive_web, naamive_worker`.execute(db);
}

export async function down(): Promise<void> {
  throw new Error('Principal persistence migrations are forward-only');
}
