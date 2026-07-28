from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer

from .intake import IntakeError, initialize_request, materialize_project, parse_request, reject_request_document, request_path, validate_request, write_request
from .project import cancel_project, migrate_project_status, permanently_delete_project, project_directory, read_project_status, render_project_status
from .codex_executor import run_codex_agent
from .orchestration import create_work_item, dispatch_module_implementation, open_human_gate, orchestrate_project, recover_interrupted_execution, register_module_consumption, resolve_human_gate, resolve_product_commitment


app = typer.Typer(add_completion=False, no_args_is_help=True, help="NAAMIVE orchestration runtime")


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
            emit(orchestrate_project(repo, project))
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
    emit({"project_id": project, "state": "DELETED", "deleted_paths": [str(path) for path in deleted_paths]})


@app.command("run-agent")
def run_agent(
    project: str = typer.Option(..., "--project"),
    agent: str = typer.Option(..., "--agent"),
    work_item: str = typer.Option(..., "--work-item"),
    target: str = typer.Option(..., "--target"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Explicitly dispatch one scoped Codex terra/low agent."""
    try:
        repo = repository_root(root)
        project_path = project_directory(repo, project)
        if not project_path.is_dir():
            raise IntakeError(f"project not found: {project_path}")
        target_path = (project_path / target).resolve()
        if not target_path.is_relative_to(project_path) or "modules" in target_path.relative_to(project_path).parts[:1]:
            raise IntakeError("target must be a project-owned path; module dispatch requires the module runtime")
        if not (repo / "naamive" / "agents" / agent / "AGENT.md").is_file():
            raise IntakeError(f"official agent not found: {agent}")
        target_path.mkdir(parents=True, exist_ok=True)
        result = run_codex_agent(repo, project, agent, work_item, target_path, [project_path / "need" / "BUSINESS_NEED.md"])
    except IntakeError as error:
        fail(error)
    emit(result)


@app.command()
def decide(
    request: Optional[str] = typer.Option(None, "--request"),
    project: Optional[str] = typer.Option(None, "--project"),
    gate: str = typer.Option(..., "--gate"),
    decision: str = typer.Option(..., "--decision"),
    module: Optional[str] = typer.Option(None, "--module"),
    module_title: Optional[str] = typer.Option(None, "--module-title"),
    reason: str = typer.Option("Human gate decision.", "--reason"),
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
            if gate == "PRODUCT_COMMITMENT":
                emit(resolve_product_commitment(repo, project, decision, "human-cli", reason, module, module_title))
                return
            emit(resolve_human_gate(repo, project, gate, decision, "human-cli", reason))
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


@app.command("create-work-item")
def create_module_work_item(
    project: str = typer.Option(..., "--project"),
    module: str = typer.Option(..., "--module"),
    work_item: str = typer.Option(..., "--work-item"),
    title: str = typer.Option(..., "--title"),
    objective: str = typer.Option(..., "--objective"),
    write_scope: list[str] = typer.Option(..., "--write-scope"),
    dependency: list[str] = typer.Option([], "--dependency"),
    priority: str = typer.Option(..., "--priority"),
    ready_criterion: list[str] = typer.Option(..., "--ready-criterion"),
    expected_evidence: list[str] = typer.Option(..., "--expected-evidence"),
    authorization: str = typer.Option(..., "--authorization"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Create an authorized work item owned by an existing module."""
    try:
        project_path = project_directory(repository_root(root), project)
        path = create_work_item(project_path, module, work_item, title, objective=objective, write_scope=write_scope, dependencies=dependency, priority=priority, definition_of_ready=ready_criterion, expected_evidence=expected_evidence, authorization_reference=authorization)
    except IntakeError as error:
        fail(error)
    emit({"project_id": project, "module_id": module, "work_item_id": work_item, "work_item_path": str(path), "state": "AUTHORIZED"})


@app.command("run-implementation")
def run_implementation(
    project: str = typer.Option(..., "--project"),
    module: str = typer.Option(..., "--module"),
    work_item: str = typer.Option(..., "--work-item"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Dispatch one authorized, dependency-ready module implementation item."""
    try:
        emit(dispatch_module_implementation(repository_root(root), project, module, work_item))
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
