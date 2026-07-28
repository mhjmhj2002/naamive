from __future__ import annotations

import shutil
from pathlib import Path

from typer.testing import CliRunner

from naamive_runtime.cli import app


runner = CliRunner()


def create_repository(tmp_path: Path, source_root: Path) -> Path:
    shutil.copytree(source_root / "naamive" / "templates", tmp_path / "naamive" / "templates")
    (tmp_path / "naamive" / "registries").mkdir(parents=True)
    (tmp_path / "projects").mkdir()
    return tmp_path


def complete_request(path: Path) -> None:
    content = path.read_text(encoding="utf-8")
    replacements = {
        "<project-id>": "customer-self-service",
        "<titulo-do-produto-ou-necessidade>": "Customer self service",
        "<nome-ou-identidade>": "business-owner",
        "Descreva o problema real a ser resolvido, sem propor tecnologia ou solução.": "Customers cannot resolve account issues without support.",
        "Descreva o resultado observável esperado para o negócio.": "Customers resolve common account issues independently.",
        "- Métrica ou critério mensurável:": "- Reduce support contacts for common account issues.",
        "- Proprietário de negócio:": "- Proprietário de negócio: business-owner",
        "- Partes afetadas:": "- Partes afetadas: customers and support team",
        "Registre fatos, regulações ou limites. Caso não existam restrições conhecidas, declare isso explicitamente.": "No known restrictions.",
        "- Fonte ou evidência:": "- Support contact reports.",
        "- Premissa a validar:": "- Customers want self-service.",
        "- Questão ou lacuna a resolver:": "- Which account issues are most frequent?",
    }
    for source, target in replacements.items():
        content = content.replace(source, target)
    path.write_text(content, encoding="utf-8")


def test_request_is_validated_and_approved(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    result = runner.invoke(app, ["init-project-request", "--request-id", "self-service", "--repository-root", str(repository)])
    assert result.exit_code == 0, result.output
    request = repository / "naamive" / "registries" / "project-intake" / "self-service" / "PROJECT_REQUEST.md"
    complete_request(request)

    result = runner.invoke(app, ["orchestrate", "--request", "self-service", "--repository-root", str(repository)])
    assert result.exit_code == 0, result.output
    assert "WAITING_FOR_REGISTRATION" in result.output

    result = runner.invoke(app, ["decide", "--request", "self-service", "--gate", "REGISTER_PROJECT", "--decision", "APPROVED", "--repository-root", str(repository)])
    assert result.exit_code == 0, result.output
    assert (repository / "projects" / "customer-self-service" / "PROJECT.md").is_file()
    project = repository / "projects" / "customer-self-service"
    assert "current_state: ANALYSIS" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "# Status do Projeto" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "PRE_PROJECT" in (project / "STATUS_HISTORY.md").read_text(encoding="utf-8")


def test_invalid_request_is_rejected_without_project(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    result = runner.invoke(app, ["init-project-request", "--request-id", "incomplete", "--repository-root", str(repository)])
    assert result.exit_code == 0, result.output

    result = runner.invoke(app, ["orchestrate", "--request", "incomplete", "--repository-root", str(repository)])
    assert result.exit_code == 1
    assert "REJECTED" in result.output
    assert not any((repository / "projects").iterdir())


def test_missing_scope_instructs_how_to_create_a_request(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])

    result = runner.invoke(app, ["orchestrate", "--repository-root", str(repository)])

    assert result.exit_code == 1
    assert "init-project-request --request-id" in result.output
    assert not any((repository / "projects").iterdir())


def test_active_project_can_be_cancelled_without_deletion(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    runner.invoke(app, ["init-project-request", "--request-id", "self-service", "--repository-root", str(repository)])
    request = repository / "naamive" / "registries" / "project-intake" / "self-service" / "PROJECT_REQUEST.md"
    complete_request(request)
    runner.invoke(app, ["orchestrate", "--request", "self-service", "--repository-root", str(repository)])
    runner.invoke(app, ["decide", "--request", "self-service", "--gate", "REGISTER_PROJECT", "--decision", "APPROVED", "--repository-root", str(repository)])

    result = runner.invoke(
        app,
        [
            "cancel",
            "--project",
            "customer-self-service",
            "--reason",
            "The approved request did not contain sufficient business detail.",
            "--repository-root",
            str(repository),
        ],
    )

    project = repository / "projects" / "customer-self-service"
    assert result.exit_code == 0, result.output
    assert "CANCELLED" in (project / "STATUS.md").read_text(encoding="utf-8")
    history = (project / "STATUS_HISTORY.md").read_text(encoding="utf-8")
    assert "HUMAN_DECISION" in history
    assert "CANCELLED" in history
    assert (project / "PROJECT.md").is_file()
    evidence = project / "validation" / "evidence" / "CANCELLATION.md"
    assert evidence.is_file()
    assert "did not contain sufficient business detail" in evidence.read_text(encoding="utf-8")


def test_legacy_status_can_be_migrated_without_state_transition(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    project = repository / "projects" / "legacy-project"
    project.mkdir()
    (project / "STATUS.md").write_text(
        "scope_type: project\nproject_id: legacy-project\ncurrent_state: CANCELLED\n"
        "state_machine: naamive/orchestration/PROJECT_LIFECYCLE.md\n"
        "last_transition: ANALYSIS → CANCELLED\n"
        "last_transition_evidence: validation/evidence/CANCELLATION.md\n"
        "pending_gate: none\ncancelled_at: '2026-07-28T14:25:41+00:00'\n",
        encoding="utf-8",
    )

    result = runner.invoke(app, ["status", "--project", "legacy-project", "--migrate", "--repository-root", str(repository)])

    assert result.exit_code == 0, result.output
    status = (project / "STATUS.md").read_text(encoding="utf-8")
    assert "format_version: 2" in status
    assert "current_state: CANCELLED" in status
    assert "# Status do Projeto — legacy-project" in status
    assert "MIGRATED" in (project / "STATUS_HISTORY.md").read_text(encoding="utf-8")
