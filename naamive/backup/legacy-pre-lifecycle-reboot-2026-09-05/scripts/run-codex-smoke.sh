#!/usr/bin/env bash
# Controlled, opt-in production-adapter smoke. It never uses a product project.
set -euo pipefail

if [[ "${1:-}" != "--run" ]]; then
  echo "usage: $0 --run [--keep-workspace]" >&2
  exit 64
fi

keep_workspace=false
if [[ "${2:-}" == "--keep-workspace" ]]; then
  keep_workspace=true
elif [[ -n "${2:-}" ]]; then
  echo "unknown option: $2" >&2
  exit 64
fi

source_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
runtime_cli="${NAAMIVE_RUNTIME_CLI:-$source_root/.venv/bin/naamive}"
report_dir="$source_root/naamive/orchestration/smoke-reports"
timestamp="$(date -u +%Y%m%d%H%M%S)"
report="$report_dir/codex-smoke-$timestamp.md"
workspace="$(mktemp -d "${TMPDIR:-/tmp}/naamive-codex-smoke.XXXXXX")"
log="$workspace/smoke.log"
project_id="codex-smoke-$timestamp"

cleanup() {
  status=$?
  mkdir -p "$report_dir"
  {
    echo "# Codex production-adapter smoke — $timestamp"
    echo
    echo "- Status: $([[ $status -eq 0 ]] && echo SUCCESS || echo FAILED)"
    echo "- Started (UTC): $started_at"
    echo "- Finished (UTC): $(date -u --iso-8601=seconds)"
    printf '%s\n' "- Codex version: \`$codex_version\`"
    printf '%s\n' "- Disposable project: \`$project_id\`"
    printf '%s\n' "- Workspace: \`$workspace\`"
    echo
    echo "## Commands and output"
    echo
    echo '```text'
    cat "$log"
    echo '```'
    echo
    echo "## Audit identifiers and evidence hashes"
    echo
    if [[ -d "$workspace/naamive/registries/orchestration/$project_id" ]]; then
      find "$workspace/naamive/registries/orchestration/$project_id" -type f -name '*.yaml' -print | sort | while read -r record; do
        printf '%s\n' "- \`${record#"$workspace"/}\`: \`$(sha256sum "$record" | awk '{print $1}')\`"
      done
    fi
    if [[ -d "$workspace/projects/$project_id" ]]; then
      find "$workspace/projects/$project_id" -type f -name '*.md' -print | sort | while read -r evidence; do
        printf '%s\n' "- \`${evidence#"$workspace"/}\`: \`$(sha256sum "$evidence" | awk '{print $1}')\`"
      done
    fi
    echo
    echo "## Evidence content"
    echo
    if [[ -d "$workspace/projects/$project_id" ]]; then
      find "$workspace/projects/$project_id" -type f -name '*.md' -print | sort | while read -r evidence; do
        echo "### ${evidence#"$workspace"/}"
        echo
        echo '```markdown'
        cat "$evidence"
        echo '```'
        echo
      done
    fi
    echo
    echo "## Audit records"
    echo
    if [[ -d "$workspace/naamive/registries/orchestration/$project_id" ]]; then
      find "$workspace/naamive/registries/orchestration/$project_id" -type f -name '*.yaml' -print | sort | while read -r record; do
        echo "### ${record#"$workspace"/}"
        echo
        echo '```yaml'
        cat "$record"
        echo '```'
        echo
      done
    fi
  } > "$report"
  if [[ "$keep_workspace" != true ]]; then
    rm -rf "$workspace"
  fi
  exit "$status"
}
trap cleanup EXIT

started_at="$(date -u --iso-8601=seconds)"
codex_version=""
run() {
  echo "+ $*" | tee -a "$log"
  "$@" 2>&1 | tee -a "$log"
}

if [[ ! -x "$runtime_cli" ]]; then
  runtime_cli="$(command -v naamive || true)"
fi
[[ -n "$runtime_cli" && -x "$runtime_cli" ]] || { echo "missing runtime CLI; install naamive-runtime or provide .venv/bin/naamive" >&2; exit 1; }
command -v codex >/dev/null || { echo "Codex CLI not found on PATH" >&2; exit 1; }
codex_version="$(codex --version)"
run codex exec --help

mkdir -p "$workspace/naamive" "$workspace/projects"
cp -a "$source_root/naamive/agents" "$source_root/naamive/contracts" "$source_root/naamive/templates" "$workspace/naamive/"
mkdir -p "$workspace/naamive/registries"
git -C "$workspace" init -q
git -C "$workspace" config user.email smoke@naamive.invalid
git -C "$workspace" config user.name naamive-codex-smoke
git -C "$workspace" add naamive projects
git -C "$workspace" commit -qm "Initialize disposable Codex smoke workspace"

run "$runtime_cli" init-project-request --request-id "$project_id" --repository-root "$workspace"
request="$workspace/naamive/registries/project-intake/$project_id/PROJECT_REQUEST.md"
sed -i \
  -e "s/<project-id>/$project_id/g" \
  -e 's/<titulo-do-produto-ou-necessidade>/Smoke de adaptador Codex/g' \
  -e 's/<nome-ou-identidade>/smoke-owner/g' \
  -e 's/Descreva o problema real a ser resolvido, sem propor tecnologia ou solução./Equipes precisam confirmar que a automação produz evidência auditável./' \
  -e 's/Descreva o resultado observável esperado para o negócio./Uma análise rastreável é produzida em ambiente descartável./' \
  -e 's/- Métrica ou critério mensurável:/- Uma evidência de análise validada pelo runtime./' \
  -e 's/- Proprietário de negócio:/- Proprietário de negócio: smoke-owner/' \
  -e 's/- Partes afetadas:/- Partes afetadas: equipe de plataforma/' \
  -e 's/Registre fatos, regulações ou limites. Caso não existam restrições conhecidas, declare isso explicitamente./Nenhuma restrição adicional conhecida./' \
  -e 's/- Fonte ou evidência:/- Fonte ou evidência: roteiro de smoke controlado./' \
  -e 's/- Premissa a validar:/- Premissa a validar: o adaptador está autenticado./' \
  -e 's/- Questão ou lacuna a resolver:/- Questão ou lacuna a resolver: nenhuma./' \
  "$request"
run "$runtime_cli" orchestrate --request "$project_id" --repository-root "$workspace"
run "$runtime_cli" decide --request "$project_id" --gate REGISTER_PROJECT --decision APPROVED --repository-root "$workspace"
run "$runtime_cli" orchestrate --project "$project_id" --repository-root "$workspace"
run "$runtime_cli" status --project "$project_id" --repository-root "$workspace"
grep -q '"state": "COMPLETED"' "$log" || {
  echo "Smoke did not reach a COMPLETED orchestration result." >&2
  exit 1
}
