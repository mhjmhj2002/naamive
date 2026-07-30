# DEPRECATED: legacy Python runtime retained only for Node migration reference.
from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer

from .intake import IntakeError, initialize_request, materialize_project, parse_request, reject_request_document, request_path, validate_request, write_request
from .project import cancel_project, migrate_project_status, permanently_delete_project, project_directory, read_project_status, render_project_status
from .codex_executor import codex_preflight, run_codex_agent
from .orchestration import audit_timeline, cancel_module, create_work_item, dispatch_module_implementation, open_human_gate, orchestrate_module_architecture_planning, orchestrate_until_blocked, pause_or_resume_scope, recover_interrupted_execution, register_module_consumption, resolve_human_gate, resolve_module_architecture_gate, resolve_product_commitment, return_to_implementation_for_finding, start_evolution


app = typer.Typer(add_completion=False, no_args_is_help=True, help="NAAMIVE orchestration runtime")


def resolve_agent_runner():
    """Return the production adapter; tests may replace this narrow seam."""
    return run_codex_agent


def repository_root(path: Optional[Path]) -> Path:
    root = (path or Path.cwd()).resolve()
    if not (root / "naamive").is_dir() or not (root / "projects").is_dir():
        raise IntakeError("repository root must contain naamive/ and projects/")
    return root


def emit(payload: dict[str, object]) -> None:
    typer.echo(json.dumps(payload, ensure_ascii=False, sort_keys=True))


def fail(error: Exception) -> None:
    typer.echo(f"ERROR: {error}", err=True)
    raise typer.Exit(code=1)


@app.command("init-project-request")
def init_project_request(
    request_id: str = typer.Option(..., "--request-id"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Create a new project intake request from the canonical template."""
    try:
        path = initialize_request(repository_root(root), request_id)
    except IntakeError as error:
        fail(error)
    emit({"request_id": request_id, "request_path": str(path), "state": "DRAFT"})


@app.command("preflight")
def preflight() -> None:
    """Verify the stable Codex CLI configuration before starting a dispatch."""
    try:
        emit(codex_preflight())
    except IntakeError as error:
        fail(error)


@app.command()
def orchestrate(
    project: Optional[str] = typer.Option(None, "--project"),
    request: Optional[str] = typer.Option(None, "--request"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Validate an intake request or inspect a materialized project."""
    try:
        repo = repository_root(root)
        if not project and not request:
            raise IntakeError("no project context found; run: naamive init-project-request --request-id <request-id>")
        if project and request:
            raise IntakeError("provide only one of --project or --request")
        if project:
            agent_runner = resolve_agent_runner()
            if agent_runner is run_codex_agent:
                codex_preflight()
            emit(orchestrate_until_blocked(repo, project, agent_runner=agent_runner))
            return

        path = request_path(repo, request or "")
        try:
            parsed = parse_request(path)
        except IntakeError as error:
            reject_request_document(path)
            emit({"request_id": request, "state": "REJECTED", "errors": [str(error)]})
            raise typer.Exit(code=1)
        if parsed.metadata.status in {"WAITING_FOR_REGISTRATION", "REGISTERED", "CANCELLED"}:
            emit({"request_id": parsed.metadata.request_id, "state": parsed.metadata.status})
            return
        errors = validate_request(parsed, repo)
        if errors:
            write_request(parsed, "REJECTED")
            emit({"request_id": parsed.metadata.request_id, "state": "REJECTED", "errors": errors})
            raise typer.Exit(code=1)
        write_request(parsed, "WAITING_FOR_REGISTRATION")
        emit({"request_id": parsed.metadata.request_id, "state": "WAITING_FOR_REGISTRATION", "gate_id": "REGISTER_PROJECT"})
    except IntakeError as error:
        fail(error)


@app.command("start")
def start(
    project: Optional[str] = typer.Option(None, "--project"),
    request: Optional[str] = typer.Option(None, "--request"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Start or continue a project until a human gate or a real stop condition."""
    orchestrate(project=project, request=request, root=root)


@app.command()
def cancel(
    project: str = typer.Option(..., "--project"),
    reason: str = typer.Option(..., "--reason"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Cancel an active project through a human decision with preserved evidence."""
    try:
        evidence_path = cancel_project(repository_root(root), project, reason)
    except IntakeError as error:
        fail(error)
    emit({"project_id": project, "state": "CANCELLED", "evidence_path": str(evidence_path)})


@app.command()
def status(
    project: str = typer.Option(..., "--project"),
    migrate: bool = typer.Option(False, "--migrate"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Show a project status summary or upgrade a legacy status record."""
    try:
        project_path = project_directory(repository_root(root), project)
        if not project_path.is_dir():
            raise IntakeError(f"project not found: {project_path}")
        status_record = migrate_project_status(project_path) if migrate else read_project_status(project_path)
    except IntakeError as error:
        fail(error)
    emit({"project_id": project, "current_state": status_record["current_state"], "state_category": status_record.get("state_category", "legacy"), "status_path": str(project_path / "STATUS.md"), "history_path": str(project_path / "STATUS_HISTORY.md")})


@app.command("audit-timeline")
def show_audit_timeline(
    project: str = typer.Option(..., "--project"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Show the chronological, human-readable projection of project audit records."""
    try:
        emit({"project_id": project, "timeline": audit_timeline(repository_root(root), project)})
    except IntakeError as error:
        fail(error)


@app.command("delete-project")
def delete_project(
    project: str = typer.Option(..., "--project"),
    confirm: str = typer.Option(..., "--confirm"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Permanently delete a cancelled project and its intake references."""
    if confirm != project:
        fail(IntakeError("confirmation must exactly match --project"))
    try:
        deleted_paths = permanently_delete_project(repository_root(root), project)
    except IntakeError as error:
        fail(error)
    proof_path = repository_root(root) / "naamive" / "registries" / "deletion-proofs" / f"{project}.yaml"
    emit({"project_id": project, "state": "DELETED", "deleted_paths": [str(path) for path in deleted_paths], "deletion_proof_path": str(proof_path)})


@app.command()
def decide(
    request: Optional[str] = typer.Option(None, "--request"),
    project: Optional[str] = typer.Option(None, "--project"),
    gate: str = typer.Option(..., "--gate"),
    decision: str = typer.Option(..., "--decision"),
    module: Optional[str] = typer.Option(None, "--module"),
    module_title: Optional[str] = typer.Option(None, "--module-title"),
    module_candidate: list[str] = typer.Option([], "--module-candidate", help="JSON candidate: module_id, title, justification and owner; repeat for each module."),
    reason: str = typer.Option("Human gate decision.", "--reason"),
    feedback: Optional[str] = typer.Option(None, "--feedback", help="Project-relative completed GATE_FEEDBACK.md for rejection or rework."),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Apply a human decision to a waiting project intake request."""
    try:
        repo = repository_root(root)
        if bool(request) == bool(project):
            raise IntakeError("provide exactly one of --request or --project")
        if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"}:
            raise IntakeError("decision must be APPROVED, REJECTED, or REWORK_REQUIRED")
        if project:
            if gate == "MATERIAL_MODULE_ARCHITECTURE_DECISION":
                if not module:
                    raise IntakeError("module is required for MATERIAL_MODULE_ARCHITECTURE_DECISION")
                emit(resolve_module_architecture_gate(repo, project, module, decision, "human-cli", reason))
                return
            if gate == "PRODUCT_COMMITMENT":
                candidates: list[dict[str, str]] = []
                for raw_candidate in module_candidate:
                    try:
                        candidate = json.loads(raw_candidate)
                    except json.JSONDecodeError as error:
                        raise IntakeError("module-candidate must be a JSON object") from error
                    if not isinstance(candidate, dict):
                        raise IntakeError("module-candidate must be a JSON object")
                    candidates.append(candidate)
                emit(resolve_product_commitment(repo, project, decision, "human-cli", reason, module, module_title, candidates, feedback))
                return
            emit(resolve_human_gate(repo, project, gate, decision, "human-cli", reason, feedback))
            return
        if gate != "REGISTER_PROJECT":
            raise IntakeError("only REGISTER_PROJECT is implemented for requests")
        parsed = parse_request(request_path(repo, request))
        if parsed.metadata.status != "WAITING_FOR_REGISTRATION":
            raise IntakeError("request must be WAITING_FOR_REGISTRATION")
        if decision == "APPROVED":
            project = materialize_project(parsed, repo)
            write_request(parsed, "REGISTERED")
            emit({"request_id": request, "project_path": str(project), "state": "REGISTERED"})
            return
        write_request(parsed, "REJECTED")
        emit({"request_id": request, "state": "REJECTED", "decision": decision})
    except IntakeError as error:
        fail(error)


@app.command("record-finding")
def record_finding(
    project: str = typer.Option(..., "--project"),
    module: str = typer.Option(..., "--module"),
    work_item: str = typer.Option(..., "--work-item"),
    severity: str = typer.Option(..., "--severity"),
    evidence: list[str] = typer.Option(..., "--evidence"),
    reproduction: str = typer.Option(..., "--reproduction"),
    resolution: str = typer.Option(..., "--resolution"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Record a validation finding and return blocking work to implementation."""
    try:
        emit(return_to_implementation_for_finding(repository_root(root), project, module, work_item, severity, evidence, reproduction, resolution))
    except IntakeError as error:
        fail(error)


@app.command("register-module-consumption")
def register_consumption(
    consumer_project: str = typer.Option(..., "--consumer-project"),
    consumer_module: str = typer.Option(..., "--consumer-module"),
    provider_project: str = typer.Option(..., "--provider-project"),
    provider_module: str = typer.Option(..., "--provider-module"),
    contract_reference: str = typer.Option(..., "--contract-reference"),
    compatible_version: str = typer.Option(..., "--compatible-version"),
    business_purpose: str = typer.Option(..., "--business-purpose"),
    integration_owner: str = typer.Option(..., "--integration-owner"),
    impact_and_risk: str = typer.Option(..., "--impact-and-risk"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Register consumer-owned use of a provider module contract."""
    try:
        path = register_module_consumption(repository_root(root), consumer_project, consumer_module, provider_project, provider_module, contract_reference, compatible_version, business_purpose, integration_owner, impact_and_risk)
    except IntakeError as error:
        fail(error)
    emit({"consumer_project_id": consumer_project, "consumer_module_id": consumer_module, "consumption_path": str(path)})


@app.command("pause")
def pause(
    project: str = typer.Option(..., "--project"),
    module: Optional[str] = typer.Option(None, "--module"),
    reason: str = typer.Option(..., "--reason"),
    evidence: list[str] = typer.Option(..., "--evidence"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Pause a project or one module through an auditable human decision."""
    try:
        emit(pause_or_resume_scope(repository_root(root), project, scope_type="module" if module else "project", module_id=module, reason=reason, evidence=evidence))
    except IntakeError as error:
        fail(error)


@app.command("resume")
def resume(
    project: str = typer.Option(..., "--project"),
    module: Optional[str] = typer.Option(None, "--module"),
    reason: str = typer.Option(..., "--reason"),
    evidence: list[str] = typer.Option(..., "--evidence"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Resume a paused project or module to its recorded active state."""
    try:
        emit(pause_or_resume_scope(repository_root(root), project, scope_type="module" if module else "project", module_id=module, reason=reason, evidence=evidence, resume=True))
    except IntakeError as error:
        fail(error)


@app.command("cancel-module")
def cancel_one_module(
    project: str = typer.Option(..., "--project"), module: str = typer.Option(..., "--module"), reason: str = typer.Option(..., "--reason"), evidence: list[str] = typer.Option(..., "--evidence"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Cancel one module while preserving its state history and decision."""
    try:
        emit(cancel_module(repository_root(root), project, module, reason, evidence))
    except IntakeError as error:
        fail(error)


@app.command("start-evolution")
def evolve(
    project: str = typer.Option(..., "--project"), module: list[str] = typer.Option(..., "--module"), reason: str = typer.Option(..., "--reason"), evidence: list[str] = typer.Option(..., "--evidence"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Record a change request and begin a new planned cycle for affected modules."""
    try:
        emit(start_evolution(repository_root(root), project, module, reason, evidence))
    except IntakeError as error:
        fail(error)


@app.command("request-gate")
def request_gate(
    project: str = typer.Option(..., "--project"),
    gate: str = typer.Option(..., "--gate"),
    to_state: str = typer.Option(..., "--to-state"),
    reason: str = typer.Option(..., "--reason"),
    evidence: list[str] = typer.Option(..., "--evidence"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Open a conditional human gate for a valid project transition."""
    try:
        path = open_human_gate(repository_root(root), project, gate, to_state, reason, evidence)
    except IntakeError as error:
        fail(error)
    emit({"project_id": project, "gate_id": gate, "state": "WAITING_FOR_GATE", "transition_request": str(path)})


@app.command("recover-execution")
def recover_execution(
    project: str = typer.Option(..., "--project"),
    execution: str = typer.Option(..., "--execution"),
    reason: str = typer.Option(..., "--reason"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Mark an interrupted orchestration execution for audited rework."""
    try:
        path = recover_interrupted_execution(repository_root(root), project, execution, reason)
    except IntakeError as error:
        fail(error)
    emit({"project_id": project, "execution_id": execution, "state": "REWORK_REQUIRED", "event_path": str(path)})


if __name__ == "__main__":
    app()
