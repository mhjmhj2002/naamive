import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    CREATE TABLE security.human_password_credential (
      credential_id uuid PRIMARY KEY,
      principal_id uuid NOT NULL REFERENCES authority.principal(principal_id) ON DELETE RESTRICT,
      credential_version bigint NOT NULL CHECK (credential_version >= 1),
      hash_format_version integer NOT NULL CHECK (hash_format_version >= 1),
      algorithm text NOT NULL CHECK (algorithm = 'argon2id'),
      memory_kib integer NOT NULL CHECK (memory_kib = 65536),
      iterations integer NOT NULL CHECK (iterations = 3),
      parallelism integer NOT NULL CHECK (parallelism = 1),
      salt bytea NOT NULL CHECK (octet_length(salt) = 16),
      hash bytea NOT NULL CHECK (octet_length(hash) = 32),
      created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      revoked_at timestamptz,
      UNIQUE (principal_id, credential_version)
    )
  `.execute(db);
  await sql`
    CREATE UNIQUE INDEX human_password_credential_one_active_per_principal
    ON security.human_password_credential (principal_id)
    WHERE revoked_at IS NULL
  `.execute(db);
  await sql`
    CREATE TABLE security.login_rate_limit_signal (
      signal_kind text NOT NULL CHECK (signal_kind IN ('IP', 'USERNAME_IP')),
      signal_hash bytea NOT NULL CHECK (octet_length(signal_hash) = 32),
      last_failed_at timestamptz,
      PRIMARY KEY (signal_kind, signal_hash)
    )
  `.execute(db);
  await sql`
    CREATE TABLE security.login_rate_limit_failure (
      signal_kind text NOT NULL,
      signal_hash bytea NOT NULL,
      occurred_at timestamptz NOT NULL,
      FOREIGN KEY (signal_kind, signal_hash)
        REFERENCES security.login_rate_limit_signal(signal_kind, signal_hash)
        ON DELETE CASCADE
    )
  `.execute(db);
  await sql`
    CREATE INDEX login_rate_limit_failure_window
    ON security.login_rate_limit_failure (signal_kind, signal_hash, occurred_at)
  `.execute(db);
  await sql`
    REVOKE ALL ON security.human_password_credential, security.login_rate_limit_signal,
      security.login_rate_limit_failure FROM naamive_web, naamive_worker
  `.execute(db);
  await sql`
    GRANT SELECT ON security.human_password_credential TO naamive_web, naamive_worker
  `.execute(db);
  await sql`
    CREATE FUNCTION security.login_rate_limit_check(
      requested_ip_signal bytea,
      requested_username_ip_signal bytea,
      requested_at timestamptz
    ) RETURNS TABLE (rate_limited boolean, retry_after_seconds integer)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, security
    AS $$
    DECLARE ip_failures integer; username_failures integer; ip_retry_at timestamptz; username_retry_at timestamptz;
    BEGIN
      DELETE FROM security.login_rate_limit_failure
      WHERE ((signal_kind = 'IP' AND signal_hash = requested_ip_signal)
          OR (signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal))
        AND occurred_at <= requested_at - interval '15 minutes';
      SELECT count(*) INTO ip_failures FROM security.login_rate_limit_failure
      WHERE signal_kind = 'IP' AND signal_hash = requested_ip_signal
        AND occurred_at > requested_at - interval '15 minutes';
      SELECT count(*) INTO username_failures FROM security.login_rate_limit_failure
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal
        AND occurred_at > requested_at - interval '15 minutes';
      IF ip_failures >= 25 OR username_failures >= 5 THEN
        SELECT min(occurred_at) + interval '15 minutes' INTO ip_retry_at
        FROM security.login_rate_limit_failure
        WHERE signal_kind = 'IP' AND signal_hash = requested_ip_signal
          AND occurred_at > requested_at - interval '15 minutes';
        SELECT min(occurred_at) + interval '15 minutes' INTO username_retry_at
        FROM security.login_rate_limit_failure
        WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal
          AND occurred_at > requested_at - interval '15 minutes';
        RETURN QUERY SELECT true, greatest(1, ceil(extract(epoch FROM greatest(ip_retry_at, username_retry_at) - requested_at))::integer);
      ELSE
        RETURN QUERY SELECT false, NULL::integer;
      END IF;
    END;
    $$
  `.execute(db);
  await sql`
    CREATE FUNCTION security.login_rate_limit_record_failure(
      requested_ip_signal bytea,
      requested_username_ip_signal bytea,
      requested_at timestamptz
    ) RETURNS TABLE (accepted boolean, delay_seconds integer, retry_after_seconds integer)
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, security
    AS $$
    DECLARE ip_failures integer; username_failures integer; ip_retry_at timestamptz; username_retry_at timestamptz;
    BEGIN
      INSERT INTO security.login_rate_limit_signal (signal_kind, signal_hash)
      VALUES ('IP', requested_ip_signal), ('USERNAME_IP', requested_username_ip_signal)
      ON CONFLICT DO NOTHING;
      PERFORM 1 FROM security.login_rate_limit_signal
      WHERE signal_kind = 'IP' AND signal_hash = requested_ip_signal FOR UPDATE;
      PERFORM 1 FROM security.login_rate_limit_signal
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal FOR UPDATE;
      DELETE FROM security.login_rate_limit_failure
      WHERE ((signal_kind = 'IP' AND signal_hash = requested_ip_signal)
          OR (signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal))
        AND occurred_at <= requested_at - interval '15 minutes';
      SELECT count(*) INTO ip_failures FROM security.login_rate_limit_failure
      WHERE signal_kind = 'IP' AND signal_hash = requested_ip_signal
        AND occurred_at > requested_at - interval '15 minutes';
      SELECT count(*) INTO username_failures FROM security.login_rate_limit_failure
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal
        AND occurred_at > requested_at - interval '15 minutes';
      IF ip_failures >= 25 OR username_failures >= 5 THEN
        SELECT min(occurred_at) + interval '15 minutes' INTO ip_retry_at
        FROM security.login_rate_limit_failure
        WHERE signal_kind = 'IP' AND signal_hash = requested_ip_signal
          AND occurred_at > requested_at - interval '15 minutes';
        SELECT min(occurred_at) + interval '15 minutes' INTO username_retry_at
        FROM security.login_rate_limit_failure
        WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal
          AND occurred_at > requested_at - interval '15 minutes';
        RETURN QUERY SELECT false, NULL::integer,
          greatest(1, ceil(extract(epoch FROM greatest(ip_retry_at, username_retry_at) - requested_at))::integer);
        RETURN;
      END IF;
      INSERT INTO security.login_rate_limit_failure (signal_kind, signal_hash, occurred_at)
      VALUES ('IP', requested_ip_signal, requested_at), ('USERNAME_IP', requested_username_ip_signal, requested_at);
      UPDATE security.login_rate_limit_signal
      SET last_failed_at = requested_at
      WHERE (signal_kind = 'IP' AND signal_hash = requested_ip_signal)
         OR (signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal);
      username_failures := username_failures + 1;
      RETURN QUERY SELECT true,
        CASE WHEN username_failures <= 2 THEN 0
          WHEN username_failures = 3 THEN 1
          WHEN username_failures = 4 THEN 2 ELSE 4 END,
        NULL::integer;
    END;
    $$
  `.execute(db);
  await sql`
    CREATE FUNCTION security.login_rate_limit_reset_username_ip(
      requested_username_ip_signal bytea,
      requested_at timestamptz
    ) RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, security
    AS $$
    BEGIN
      PERFORM 1 FROM security.login_rate_limit_signal
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal FOR UPDATE;
      DELETE FROM security.login_rate_limit_failure
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal;
      DELETE FROM security.login_rate_limit_signal
      WHERE signal_kind = 'USERNAME_IP' AND signal_hash = requested_username_ip_signal;
      DELETE FROM security.login_rate_limit_signal signal
      WHERE signal.last_failed_at < requested_at - interval '30 minutes'
        AND NOT EXISTS (
          SELECT 1 FROM security.login_rate_limit_failure failure
          WHERE failure.signal_kind = signal.signal_kind AND failure.signal_hash = signal.signal_hash
        );
    END;
    $$
  `.execute(db);
  await sql`
    REVOKE ALL ON FUNCTION security.login_rate_limit_check(bytea, bytea, timestamptz),
      security.login_rate_limit_record_failure(bytea, bytea, timestamptz),
      security.login_rate_limit_reset_username_ip(bytea, timestamptz) FROM PUBLIC
  `.execute(db);
  await sql`
    GRANT EXECUTE ON FUNCTION security.login_rate_limit_check(bytea, bytea, timestamptz),
      security.login_rate_limit_record_failure(bytea, bytea, timestamptz),
      security.login_rate_limit_reset_username_ip(bytea, timestamptz) TO naamive_web, naamive_worker
  `.execute(db);
}

export async function down(): Promise<void> {
  throw new Error('Password login migrations are forward-only');
}
