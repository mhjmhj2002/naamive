from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

import yaml

from .intake import IntakeError, SLUG_PATTERN


ACTIVE_PROJECT_STATES = {
    "ANALYSIS",
    "DEFINITION",
    "ARCHITECTURE",
    "PLANNING",
    "IMPLEMENTATION",
    "VALIDATION",
    "DELIVERY",
    "EVOLUTION",
    "PAUSED",
}


def project_directory(repository_root: Path, project_id: str) -> Path:
    if not SLUG_PATTERN.fullmatch(project_id):
        raise IntakeError("project_id must use kebab-case")
    return repository_root / "projects" / project_id


def read_project_status(project_path: Path) -> dict[str, object]:
    status_path = project_path / "STATUS.md"
    if not status_path.is_file():
        raise IntakeError(f"project status not found: {status_path}")
    try:
        status = yaml.safe_load(status_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        raise IntakeError(f"invalid project status: {error}") from error
    if not isinstance(status, dict):
        raise IntakeError("project status must be a YAML mapping")
    if status.get("project_id") != project_path.name:
        raise IntakeError("project status project_id does not match the project directory")
    if not isinstance(status.get("current_state"), str):
        raise IntakeError("project status current_state is required")
    return status


def cancel_project(repository_root: Path, project_id: str, reason: str) -> Path:
    if not reason.strip():
        raise IntakeError("cancellation reason must not be empty")
    project_path = project_directory(repository_root, project_id)
    if not project_path.is_dir():
        raise IntakeError(f"project not found: {project_path}")
    status = read_project_status(project_path)
    current_state = str(status["current_state"])
    if current_state not in ACTIVE_PROJECT_STATES:
        raise IntakeError(f"project cannot be cancelled from state: {current_state}")

    evidence_path = project_path / "validation" / "evidence" / "CANCELLATION.md"
    if evidence_path.exists():
        raise IntakeError(f"cancellation evidence already exists: {evidence_path}")
    recorded_at = datetime.now(timezone.utc).isoformat()
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(
        "# Decisão de Cancelamento\n\n"
        f"**Project ID:** `{project_id}`\n"
        f"**Prior state:** `{current_state}`\n"
        f"**Decision:** `CANCELLED`\n"
        f"**Recorded at:** `{recorded_at}`\n\n"
        "## Justificativa\n\n"
        f"{reason.strip()}\n",
        encoding="utf-8",
    )

    status["current_state"] = "CANCELLED"
    status["last_transition"] = f"{current_state} → CANCELLED"
    status["last_transition_evidence"] = str(evidence_path.relative_to(project_path))
    status["pending_gate"] = "none"
    status["cancelled_at"] = recorded_at
    status_path = project_path / "STATUS.md"
    status_path.write_text(yaml.safe_dump(status, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return evidence_path
