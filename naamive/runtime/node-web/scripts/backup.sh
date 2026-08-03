#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?usage: backup.sh OUTPUT_FILE}"
pg_dump --format=custom --file="$1" "$DATABASE_URL"
pg_restore --list "$1" >/dev/null
sha256sum "$1" > "$1.sha256"
printf 'schema=%s\ncreated_at=%s\n' "${NAAMIVE_SCHEMA_VERSION:-unknown}" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$1.meta"
