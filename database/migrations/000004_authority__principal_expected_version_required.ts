import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE OR REPLACE FUNCTION authority.change_principal_username(
      requested_principal_id uuid,
      expected_version bigint,
      requested_username text,
      requested_history_event_id uuid
    ) RETURNS TABLE (
      principal_id uuid,
      username text,
      status text,
      version bigint,
      current_history_event_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, authority
    AS $$
    DECLARE current_principal authority.principal%ROWTYPE;
    BEGIN
      IF expected_version IS NULL THEN RAISE EXCEPTION 'Principal expected version is required'; END IF;
      SELECT * INTO current_principal FROM authority.principal AS principal
      WHERE principal.principal_id = requested_principal_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Principal does not exist'; END IF;
      IF current_principal.version <> expected_version THEN RAISE EXCEPTION 'Principal expected version is stale'; END IF;
      IF current_principal.username = requested_username THEN RAISE EXCEPTION 'A username mutation must change the current username'; END IF;
      INSERT INTO authority.principal_history (history_event_id, principal_id, version, username, status, event_type)
      VALUES (requested_history_event_id, requested_principal_id, current_principal.version + 1,
        requested_username, current_principal.status, 'USERNAME_CHANGED');
      UPDATE authority.principal AS principal
      SET username = requested_username, version = current_principal.version + 1,
        current_history_event_id = requested_history_event_id
      WHERE principal.principal_id = requested_principal_id;
      RETURN QUERY
        SELECT principal.principal_id, principal.username, principal.status, principal.version,
          principal.current_history_event_id
        FROM authority.principal AS principal
        WHERE principal.principal_id = requested_principal_id;
    END;
    $$
  `.execute(db);
  await sql`
    CREATE OR REPLACE FUNCTION authority.change_principal_status(
      requested_principal_id uuid,
      expected_version bigint,
      requested_status text,
      requested_history_event_id uuid
    ) RETURNS TABLE (
      principal_id uuid,
      username text,
      status text,
      version bigint,
      current_history_event_id uuid
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, authority
    AS $$
    DECLARE current_principal authority.principal%ROWTYPE;
    BEGIN
      IF expected_version IS NULL THEN RAISE EXCEPTION 'Principal expected version is required'; END IF;
      SELECT * INTO current_principal FROM authority.principal AS principal
      WHERE principal.principal_id = requested_principal_id FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Principal does not exist'; END IF;
      IF current_principal.version <> expected_version THEN RAISE EXCEPTION 'Principal expected version is stale'; END IF;
      IF NOT ((current_principal.status = 'ACTIVE' AND requested_status = 'SUSPENDED')
        OR (current_principal.status = 'SUSPENDED' AND requested_status = 'ACTIVE')) THEN
        RAISE EXCEPTION 'Invalid Principal status transition';
      END IF;
      INSERT INTO authority.principal_history (history_event_id, principal_id, version, username, status, event_type)
      VALUES (requested_history_event_id, requested_principal_id, current_principal.version + 1,
        current_principal.username, requested_status, 'STATUS_CHANGED');
      UPDATE authority.principal AS principal
      SET status = requested_status, version = current_principal.version + 1,
        current_history_event_id = requested_history_event_id
      WHERE principal.principal_id = requested_principal_id;
      RETURN QUERY
        SELECT principal.principal_id, principal.username, principal.status, principal.version,
          principal.current_history_event_id
        FROM authority.principal AS principal
        WHERE principal.principal_id = requested_principal_id;
    END;
    $$
  `.execute(db);
}

export async function down(): Promise<void> {
  throw new Error('Principal command-boundary migrations are forward-only');
}
