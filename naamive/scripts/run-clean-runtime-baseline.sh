#!/usr/bin/env bash
# Opt-in deterministic baseline from a clean Git revision.
set -euo pipefail

if [[ "${1:-}" != "--run" ]] || [[ -n "${3:-}" ]] || {
  [[ -n "${2:-}" ]] && [[ "${2:-}" != "--allow-dirty-snapshot" ]]
}; then
  echo "usage: $0 --run [--allow-dirty-snapshot]" >&2
  exit 64
fi

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
report_dir="$source_root/naamive/orchestration/baseline-reports"
timestamp="$(date -u +%Y%m%d%H%M%S)"
report="$report_dir/runtime-baseline-$timestamp.md"
started_at="$(date -u --iso-8601=seconds)"
revision="$(git -C "$source_root" rev-parse HEAD)"
allow_dirty_snapshot=false
source_dirty=false
tested_revision="$revision"
dependency_source=""

if [[ "${2:-}" == "--allow-dirty-snapshot" ]]; then
  allow_dirty_snapshot=true
fi

if [[ -n "$(git -C "$source_root" status --porcelain)" ]]; then
  source_dirty=true
  if [[ "$allow_dirty_snapshot" != true ]]; then
    echo "refusing baseline: source worktree has uncommitted or untracked changes" >&2
    echo "commit the intended changes first, or explicitly use --allow-dirty-snapshot" >&2
    exit 1
  fi
fi

worktree="$(mktemp -d "${TMPDIR:-/tmp}/naamive-runtime-baseline.XXXXXX")"

cleanup() {
  status=$?
  mkdir -p "$report_dir"
  {
    echo "# Runtime deterministic baseline — $timestamp"
    echo
    echo "- Status: $([[ $status -eq 0 ]] && echo SUCCESS || echo FAILED)"
    echo "- Started (UTC): $started_at"
    echo "- Finished (UTC): $(date -u --iso-8601=seconds)"
    echo "- Source revision: \`$revision\`"
    echo "- Tested revision: \`$tested_revision\`"
    echo "- Source worktree was dirty: \`$source_dirty\`"
    echo "- Dependency source: \`$dependency_source\`"
    echo "- Worktree: \`$worktree\`"
    echo
    echo "## Command and result"
    echo
    echo '```text'
    cat "$worktree/test.log" 2>/dev/null || true
    echo '```'
  } > "$report"
  git -C "$source_root" worktree remove --force "$worktree" 2>/dev/null || rm -rf "$worktree"
  echo "baseline report: $report"
  exit "$status"
}
trap cleanup EXIT

if [[ "$source_dirty" == true ]]; then
  rmdir "$worktree"
  git clone --quiet --no-local "$source_root" "$worktree"
  rsync -a --delete --exclude=.git --exclude=.venv --exclude=__pycache__ \
    "$source_root/" "$worktree/"
  git -C "$worktree" config user.email baseline@naamive.invalid
  git -C "$worktree" config user.name naamive-baseline
  git -C "$worktree" add --all
  git -C "$worktree" commit --quiet -m "Baseline snapshot"
  tested_revision="$(git -C "$worktree" rev-parse HEAD)"
else
  rmdir "$worktree"
  git -C "$source_root" worktree add --detach "$worktree" "$revision" >/dev/null
fi

dependency_source="$(find "$source_root/.venv/lib" -type d -path '*/site-packages' -print -quit 2>/dev/null || true)"
if [[ -z "$dependency_source" ]]; then
  echo "missing local dependency environment at $source_root/.venv" >&2
  exit 1
fi

python3 -m venv --system-site-packages "$worktree/.venv"
baseline_site_packages="$(find "$worktree/.venv/lib" -type d -path '*/site-packages' -print -quit)"
printf '%s\n' "$dependency_source" > "$baseline_site_packages/naamive-baseline-dependencies.pth"

{
  echo "+ $worktree/.venv/bin/python -m pytest -q naamive/tests/runtime_python"
  cd "$worktree"
  PYTHONPATH="$worktree/naamive/runtime/python/src" \
    "$worktree/.venv/bin/python" -m pytest -q naamive/tests/runtime_python
} 2>&1 | tee "$worktree/test.log"
