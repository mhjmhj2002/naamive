from __future__ import annotations

import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import yaml

from .intake import IntakeError, SLUG_PATTERN
from .intake import parse_request
from .audit_schema import validate_audit_record


STATUS_FRONT_MATTER = re.compile(r"\A---\s*\n(?P<meta>.*?)\n---\s*\n", re.DOTALL)
ACTIVE_PROJECT_STATES = {"ANALYSIS", "DEFINITION", "ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION", "PAUSED"}
TERMINAL_STATES = {"CANCELLED", "DELIVERED"}


def project_directory(repository_root: Path, project_id: str) -> Path:
    if not SLUG_PATTERN.fullmatch(project_id):
        raise IntakeError("project_id must use kebab-case")
    return repository_root / "projects" / project_id


def _load_status_document(status_path: Path) -> tuple[dict[str, object], bool]:
    if not status_path.is_file():
        raise IntakeError(f"project status not found: {status_path}")
    document = status_path.read_text(encoding="utf-8")
    match = STATUS_FRONT_MATTER.match(document)
    try:
        status = yaml.safe_load(match.group("meta") if match else document)
    except yaml.YAMLError as error:
        raise IntakeError(f"invalid project status: {error}") from error
    if not isinstance(status, dict):
        raise IntakeError("project status must be a YAML mapping")
    return status, match is None


def read_project_status(project_path: Path) -> dict[str, object]:
    status, _ = _load_status_document(project_path / "STATUS.md")
    if status.get("project_id") != project_path.name:
        raise IntakeError("project status project_id does not match the project directory")
    if not isinstance(status.get("current_state"), str):
        raise IntakeError("project status current_state is required")
    return status


def _state_category(state: str) -> str:
    if state in TERMINAL_STATES:
        return "terminal"
    if state == "PAUSED":
        return "paused"
    return "active"


def _next_action(state: str) -> str:
    if state == "CANCELLED":
        return "Nenhuma. O projeto foi encerrado e seus registros foram preservados."
    if state == "DELIVERED":
        return "Avaliar evolução somente a partir de uma nova necessidade rastreável."
    if state == "PAUSED":
        return "Remover o impedimento e obter a decisão humana aplicável antes de retomar."
    return "Executar a próxima rodada autorizada da orquestração para este projeto."


def render_project_status(status: dict[str, object]) -> str:
    current_state = str(status["current_state"])
    metadata = dict(status)
    metadata["format_version"] = 2
    metadata["state_category"] = str(metadata.get("state_category") or _state_category(current_state))
    serialized = yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False).strip()
    transition_from = str(metadata.get("last_transition_from") or "—")
    transition_to = str(metadata.get("last_transition_to") or current_state)
    transition_at = str(metadata.get("last_transition_at") or "—")
    transition_actor = str(metadata.get("last_transition_actor") or "—")
    transition_reason = str(metadata.get("last_transition_reason") or "—")
    evidence = str(metadata.get("last_transition_evidence") or "—")
    history_path = str(metadata.get("history_path") or "STATUS_HISTORY.md")
    return (
        f"---\n{serialized}\n---\n\n"
        f"# Status do Projeto — {metadata['project_id']}\n\n"
        "## Estado atual\n\n"
        f"**{current_state}** · {metadata['state_category']}\n\n"
        "## Próxima ação\n\n"
        f"{_next_action(current_state)}\n\n"
        "## Gate pendente\n\n"
        f"{'Nenhum' if metadata.get('pending_gate') in (None, '', 'none') else metadata['pending_gate']}\n\n"
        "## Última transição\n\n"
        "| Campo | Valor |\n| --- | --- |\n"
        f"| De | `{_safe_cell(transition_from)}` |\n| Para | `{_safe_cell(transition_to)}` |\n"
        f"| Quando (UTC) | `{_safe_cell(transition_at)}` |\n| Responsável | `{_safe_cell(transition_actor)}` |\n"
        f"| Justificativa | {_safe_cell(transition_reason)} |\n| Evidência | `{_safe_cell(evidence)}` |\n\n"
        "## Histórico e auditoria\n\n"
        f"Consulte [{history_path}]({history_path}) para a sequência cronológica completa de transições.\n"
    )


def _history_header(project_id: str) -> str:
    return (
        f"# Histórico de Transições — {project_id}\n\n"
        "Registro cronológico de transições de estado. Entradas existentes não são alteradas.\n\n"
        "| # | Quando (UTC) | De | Para | Tipo | Responsável | Justificativa | Evidência |\n"
        "| --- | --- | --- | --- | --- | --- | --- | --- |\n"
    )


def _safe_cell(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ").strip() or "—"


def append_transition_history(project_path: Path, sequence: int, occurred_at: str, from_state: str, to_state: str, transition_type: str, actor: str, reason: str, evidence: str) -> Path:
    history_path = project_path / "STATUS_HISTORY.md"
    if not history_path.exists():
        history_path.write_text(_history_header(project_path.name), encoding="utf-8")
    row = "| {0} | {1} | {2} | {3} | {4} | {5} | {6} | `{7}` |\n".format(
        sequence, *[_safe_cell(value) for value in (occurred_at, from_state, to_state, transition_type, actor, reason, evidence)]
    )
    with history_path.open("a", encoding="utf-8") as history:
        history.write(row)
    return history_path


def _legacy_status_to_v2(project_path: Path, legacy: dict[str, object]) -> dict[str, object]:
    current_state = str(legacy["current_state"])
    transition = str(legacy.get("last_transition") or "")
    from_state, _, to_state = transition.partition(" → ")
    return {
        "format_version": 2,
        "scope_type": "project",
        "project_id": project_path.name,
        "current_state": current_state,
        "state_category": _state_category(current_state),
        "state_machine": legacy.get("state_machine", "naamive/orchestration/PROJECT_LIFECYCLE.md"),
        "transition_sequence": 1,
        "last_transition_id": "legacy-0001",
        "last_transition_from": from_state or "UNKNOWN",
        "last_transition_to": to_state or current_state,
        "last_transition_at": legacy.get("cancelled_at", "unknown"),
        "last_transition_actor": "legacy-runtime",
        "last_transition_reason": "Migrated from legacy status record.",
        "last_transition_evidence": legacy.get("last_transition_evidence", "—"),
        "pending_gate": legacy.get("pending_gate", "none"),
        "history_path": "STATUS_HISTORY.md",
    }


def migrate_project_status(project_path: Path) -> dict[str, object]:
    status_path = project_path / "STATUS.md"
    status, is_legacy = _load_status_document(status_path)
    if status.get("project_id") != project_path.name:
        raise IntakeError("project status project_id does not match the project directory")
    if not is_legacy:
        return status
    migrated = _legacy_status_to_v2(project_path, status)
    status_path.write_text(render_project_status(migrated), encoding="utf-8")
    append_transition_history(project_path, 1, str(migrated["last_transition_at"]), str(migrated["last_transition_from"]), str(migrated["last_transition_to"]), "MIGRATED", "legacy-runtime", "Migrated from legacy status record.", str(migrated["last_transition_evidence"]))
    return migrated


def cancel_project(repository_root: Path, project_id: str, reason: str) -> Path:
    if not reason.strip():
        raise IntakeError("cancellation reason must not be empty")
    project_path = project_directory(repository_root, project_id)
    if not project_path.is_dir():
        raise IntakeError(f"project not found: {project_path}")
    status = migrate_project_status(project_path)
    current_state = str(status["current_state"])
    if current_state not in ACTIVE_PROJECT_STATES:
        raise IntakeError(f"project cannot be cancelled from state: {current_state}")
    evidence_path = project_path / "validation" / "evidence" / "CANCELLATION.md"
    if evidence_path.exists():
        raise IntakeError(f"cancellation evidence already exists: {evidence_path}")
    recorded_at = datetime.now(timezone.utc).isoformat()
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(f"# Decisão de Cancelamento\n\n**Project ID:** `{project_id}`\n**Prior state:** `{current_state}`\n**Decision:** `CANCELLED`\n**Recorded at:** `{recorded_at}`\n\n## Justificativa\n\n{reason.strip()}\n", encoding="utf-8")
    evidence = str(evidence_path.relative_to(project_path))
    # Import lazily to avoid the project/orchestration module dependency cycle.
    from .orchestration import apply_state_transition

    apply_state_transition(
        repository_root,
        project_id,
        "CANCELLED",
        actor="human-cli",
        reason=reason.strip(),
        evidence=[evidence],
        control_type="HUMAN_DECISION",
        expected_state=current_state,
        idempotency_key=f"cancel-{project_id}",
    )
    return evidence_path


def _intake_references_for_project(repository_root: Path, project_id: str) -> list[Path]:
    intake_root = repository_root / "naamive" / "registries" / "project-intake"
    if not intake_root.is_dir():
        return []
    references: list[Path] = []
    for request_document in intake_root.glob("*/PROJECT_REQUEST.md"):
        try:
            request = parse_request(request_document)
        except IntakeError:
            if project_id in request_document.read_text(encoding="utf-8"):
                raise IntakeError(f"cannot safely remove malformed intake reference: {request_document}")
            continue
        if request.metadata.proposed_project_id == project_id:
            references.append(request_document.parent)
    return references


def permanently_delete_project(repository_root: Path, project_id: str) -> list[Path]:
    """Irreversibly remove a cancelled project and its records, retaining only proof."""
    project_path = project_directory(repository_root, project_id)
    if not project_path.is_dir() or project_path.is_symlink():
        raise IntakeError(f"project not found or unsafe to delete: {project_path}")
    status = read_project_status(project_path)
    if status["current_state"] != "CANCELLED":
        raise IntakeError("project must be CANCELLED before permanent deletion")

    intake_references = _intake_references_for_project(repository_root, project_id)
    unsafe_references = [path for path in intake_references if path.is_symlink() or not path.is_dir()]
    if unsafe_references:
        raise IntakeError(f"unsafe intake reference to delete: {unsafe_references[0]}")

    audit_path = repository_root / "naamive" / "registries" / "orchestration" / project_id
    if audit_path.exists() and (audit_path.is_symlink() or not audit_path.is_dir()):
        raise IntakeError(f"unsafe orchestration audit to delete: {audit_path}")

    deleted_paths = [project_path, *intake_references]
    if audit_path.exists():
        deleted_paths.append(audit_path)
    proof_path = repository_root / "naamive" / "registries" / "deletion-proofs" / f"{project_id}.yaml"
    if proof_path.exists():
        raise IntakeError(f"deletion proof already exists: {proof_path}")
    proof_path.parent.mkdir(parents=True, exist_ok=True)
    proof = validate_audit_record({
        "project_id": project_id,
        "prior_state": "CANCELLED",
        "authorization": "CLI exact project confirmation",
        "deleted_paths": [str(path.relative_to(repository_root)) for path in deleted_paths],
        "deleted_at": datetime.now(timezone.utc).isoformat(),
    }, "deletion_proof")
    proof_path.write_text(yaml.safe_dump(proof, allow_unicode=True, sort_keys=False), encoding="utf-8")
    for path in deleted_paths:
        shutil.rmtree(path)
    return deleted_paths
