from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

import typer

from .intake import IntakeError, initialize_request, materialize_project, parse_request, reject_request_document, request_path, validate_request, write_request


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
            status_file = repo / "projects" / project / "STATUS.md"
            if not status_file.is_file():
                raise IntakeError(f"project status not found: {status_file}")
            emit({"project_id": project, "status_path": str(status_file), "state": "PROJECT_EXECUTION_PENDING"})
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
def decide(
    request: str = typer.Option(..., "--request"),
    gate: str = typer.Option(..., "--gate"),
    decision: str = typer.Option(..., "--decision"),
    root: Optional[Path] = typer.Option(None, "--repository-root", file_okay=False),
) -> None:
    """Apply a human decision to a waiting project intake request."""
    try:
        repo = repository_root(root)
        if gate != "REGISTER_PROJECT":
            raise IntakeError("only REGISTER_PROJECT is implemented")
        if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"}:
            raise IntakeError("decision must be APPROVED, REJECTED, or REWORK_REQUIRED")
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


if __name__ == "__main__":
    app()
