#!/usr/bin/env bash
# Run the opt-in smoke outside the IDE-managed Codex cache.
set -euo pipefail

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
compose_file="$source_root/naamive/tooling/codex-smoke/compose.yaml"

command -v docker >/dev/null || { echo "Docker is required for the isolated Codex smoke." >&2; exit 1; }

case "${1:---run}" in
  --login)
    exec docker compose -f "$compose_file" run --rm codex-login 'codex login'
    ;;
  --run)
    exec docker compose -f "$compose_file" run --rm codex-smoke 'naamive/scripts/run-codex-smoke.sh --run'
    ;;
  *)
    echo "usage: $0 [--login|--run]" >&2
    exit 64
    ;;
esac
