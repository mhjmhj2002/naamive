#!/usr/bin/env sh
set -eu
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${1:?usage: restore.sh BACKUP_FILE}"
if [ "${NAAMIVE_RESTORE_CONFIRM:-}" != "YES" ]; then
  echo 'set NAAMIVE_RESTORE_CONFIRM=YES to restore explicitly' >&2
  exit 2
fi
sha256sum -c "$1.sha256"
pg_restore --list "$1" >/dev/null
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$1"
