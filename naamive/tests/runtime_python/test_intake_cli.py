# DEPRECATED: tests for the legacy Python runtime, retained for Node parity.
from __future__ import annotations

import shutil
from pathlib import Path

from typer.testing import CliRunner

import naamive_runtime.cli as cli
from naamive_runtime.cli import app
from naamive_runtime.orchestration import materialize_module, open_human_gate
from naamive_runtime.project import render_project_status


runner = CliRunner()


def create_repository(tmp_path: Path, source_root: Path) -> Path:
    shutil.copytree(source_root / "naamive" / "templates", tmp_path / "naamive" / "templates")
    (tmp_path / "naamive" / "registries").mkdir(parents=True)
    (tmp_path / "projects").mkdir()
    return tmp_path


def test_run_agent_is_not_an_operational_command(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    project = repository / "projects" / "customer-self-service"
    project.mkdir()

    result = runner.invoke(
        app,
        [
            "run-agent",
            "--project", "customer-self-service",
            "--agent", "business-analysis",
            "--work-item", "untracked-work",
            "--target", "analysis/untracked",
            "--repository-root", str(repository),
        ],
    )

    assert result.exit_code != 0
    assert "No such command 'run-agent'" in result.output
    assert not (project / "analysis" / "untracked").exists()


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
    audit = repository / "naamive" / "registries" / "orchestration" / "customer-self-service"
    assert len(list((audit / "transition-requests").glob("*.yaml"))) == 1
    assert len(list((audit / "gate-decisions").glob("*.yaml"))) == 1


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


def test_only_cancelled_project_can_be_permanently_deleted_with_intake_reference(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    runner.invoke(app, ["init-project-request", "--request-id", "self-service", "--repository-root", str(repository)])
    request = repository / "naamive" / "registries" / "project-intake" / "self-service" / "PROJECT_REQUEST.md"
    complete_request(request)
    runner.invoke(app, ["orchestrate", "--request", "self-service", "--repository-root", str(repository)])
    runner.invoke(app, ["decide", "--request", "self-service", "--gate", "REGISTER_PROJECT", "--decision", "APPROVED", "--repository-root", str(repository)])

    blocked = runner.invoke(app, ["delete-project", "--project", "customer-self-service", "--confirm", "customer-self-service", "--repository-root", str(repository)])
    assert blocked.exit_code == 1
    assert "must be CANCELLED" in blocked.output

    runner.invoke(app, ["cancel", "--project", "customer-self-service", "--reason", "Pilot complete.", "--repository-root", str(repository)])
    audit = repository / "naamive" / "registries" / "orchestration" / "customer-self-service"
    assert audit.is_dir()
    result = runner.invoke(app, ["delete-project", "--project", "customer-self-service", "--confirm", "customer-self-service", "--repository-root", str(repository)])

    assert result.exit_code == 0, result.output
    assert "DELETED" in result.output
    assert not (repository / "projects" / "customer-self-service").exists()
    assert not request.parent.exists()
    assert not audit.exists()
    proof = repository / "naamive" / "registries" / "deletion-proofs" / "customer-self-service.yaml"
    assert proof.is_file()
    assert "prior_state: CANCELLED" in proof.read_text(encoding="utf-8")


def test_permanent_deletion_requires_exact_confirmation(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    project = repository / "projects" / "cancelled-project"
    project.mkdir()
    (project / "STATUS.md").write_text("project_id: cancelled-project\ncurrent_state: CANCELLED\n", encoding="utf-8")

    result = runner.invoke(app, ["delete-project", "--project", "cancelled-project", "--confirm", "different-project", "--repository-root", str(repository)])

    assert result.exit_code == 1
    assert project.exists()


def test_legacy_module_orchestration_command_is_not_operational(tmp_path: Path, monkeypatch) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    result = runner.invoke(app, ["orchestrate-module", "--project", "customer-self-service", "--module", "catalog", "--repository-root", str(repository)])

    assert result.exit_code != 0
    assert "No such command 'orchestrate-module'" in result.output


def test_cli_orchestration_accepts_a_deterministic_agent_double(tmp_path: Path, monkeypatch) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    runner.invoke(app, ["init-project-request", "--request-id", "self-service", "--repository-root", str(repository)])
    request = repository / "naamive" / "registries" / "project-intake" / "self-service" / "PROJECT_REQUEST.md"
    complete_request(request)
    runner.invoke(app, ["orchestrate", "--request", "self-service", "--repository-root", str(repository)])
    runner.invoke(app, ["decide", "--request", "self-service", "--gate", "REGISTER_PROJECT", "--decision", "APPROVED", "--repository-root", str(repository)])

    def no_evidence_runner(*args, **kwargs):
        return {"adapter": "deterministic-double"}

    monkeypatch.setattr(cli, "resolve_agent_runner", lambda: no_evidence_runner)
    result = runner.invoke(app, ["orchestrate", "--project", "customer-self-service", "--repository-root", str(repository)])

    assert result.exit_code == 0, result.output
    assert "REWORK_REQUIRED" in result.output


def test_cli_delivery_acceptance_rejects_incompatible_module_without_partial_effects(tmp_path: Path) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    project = repository / "projects" / "customer-self-service"
    project.mkdir()
    status = {
        "format_version": 2, "scope_type": "project", "project_id": "customer-self-service", "current_state": "DELIVERY",
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "transition_sequence": 1,
        "last_transition_id": "project-0001", "last_transition_from": "PRE_PROJECT", "last_transition_to": "DELIVERY",
        "last_transition_at": "2026-01-01T00:00:00+00:00", "last_transition_actor": "test", "last_transition_reason": "created",
        "last_transition_evidence": "test", "pending_gate": "none", "history_path": "STATUS_HISTORY.md",
    }
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    (project / "STATUS_HISTORY.md").write_text("# history\n", encoding="utf-8")
    module = materialize_module(project, "catalog", "Catalog")
    open_human_gate(repository, "customer-self-service", "DELIVERY_ACCEPTANCE", "DELIVERED", "accept", ["delivery/DELIVERY_PACKAGE.md"])

    result = runner.invoke(app, ["decide", "--project", "customer-self-service", "--gate", "DELIVERY_ACCEPTANCE", "--decision", "APPROVED", "--repository-root", str(repository)])

    assert result.exit_code == 1
    assert "READY_FOR_DELIVERY" in result.output
    assert "current_state: DELIVERY" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: IDENTIFIED" in (module / "STATUS.md").read_text(encoding="utf-8")


def test_cli_deterministic_end_to_end_happy_path(tmp_path: Path, monkeypatch) -> None:
    repository = create_repository(tmp_path, Path(__file__).parents[3])
    invoke = runner.invoke
    common = "# Execution ID\n{execution}\n# Escopo\nx\n# Fonte\nx\n# Responsável\na\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"

    def agent_runner(_root, _project, agent, _item, target, _inputs, **kwargs):
        execution = kwargs["execution_context"]["execution_id"]
        if agent == "implementation":
            (target / "tests").mkdir(exist_ok=True)
            (target / "tests" / "rules.md").write_text("# evidence\n", encoding="utf-8")
            return {}
        content = {
            "business-analysis": ("BUSINESS_ANALYSIS.md", "# Problema\nx\n# Valor\nx\n# Stakeholders\nx\n# Fluxo\nx\n# Restrições\nx\n# Incertezas\nx\n# Métricas\nx\n"),
            "domain-modeling": ("MODULE_PROPOSAL.md", "# Módulos candidatos\n- `catalog`\n# Justificativa\nx\n# Dependências\nx\n# Riscos\nx\n# Questões em aberto\nx\n"),
            "requirements-engineering": ("MODULE_REQUIREMENTS.md" if "modules" in target.parts else "REQUIREMENTS.md", "# Módulo\nx\n# Objetivo\nx\n# Limites\nx\n# Rastreabilidade\nx\n" if "modules" in target.parts else "# Requisitos\nx\n# Critérios de aceitação\nx\n# Rastreabilidade\nx\n"),
            "solution-architecture": ("SOLUTION_ARCHITECTURE.md", "material_decision_required: false\n# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\nx\n"),
            "delivery-planning": ("DELIVERY_PLAN.md", "risks_resolved: true\ndependencies_resolved: true\nunresolved_risks: []\n# Roadmap\nx\n# Releases\nx\n# Riscos\nx\n# Dependências\nx\n# Work items\nx\n# Critérios de pronto\nx\n"),
            "integration-engineering": ("INTEGRATION_REPORT.md", "# Contratos\nx\n# Fluxos\nx\n# Sistemas externos\nx\n# Incompatibilidades\nx\n# Resultado\nx\n"),
            "quality-assurance": ("QUALITY_REPORT.md", "# Requisitos\nx\n# Critérios de aceitação\nx\n# Testes\nx\n# Achados\nx\n# Resultado\nx\n"),
            "security-assurance": ("SECURITY_ASSESSMENT.md", "residual_risk_acceptance_required: false\n# Riscos\nx\n# Impacto\nx\n# Mitigação\nx\n# Exceções\nx\n# Risco residual\nx\n# Resultado\nx\n"),
            "release-operations": ("DELIVERY_PACKAGE.md", "release_authorization_required: false\n# Release\nx\n# Implantação\nx\n# Reversão\nx\n# Operação\nx\n# Observabilidade\nx\n# Handover\nx\n# Resultado\nx\n"),
            "governance-assurance": ("REVIEW.md", "# Critérios verificados\nx\n# Resultado\nAPPROVED\n"),
        }[agent]
        (target / content[0]).write_text(content[1] + common.format(execution=execution), encoding="utf-8")
        return {}

    monkeypatch.setattr(cli, "resolve_agent_runner", lambda: agent_runner)
    root = ["--repository-root", str(repository)]
    assert invoke(app, ["init-project-request", "--request-id", "self-service", *root]).exit_code == 0
    request = repository / "naamive/registries/project-intake/self-service/PROJECT_REQUEST.md"
    complete_request(request)
    for command in (["start", "--request", "self-service", *root], ["decide", "--request", "self-service", "--gate", "REGISTER_PROJECT", "--decision", "APPROVED", *root], ["start", "--project", "customer-self-service", *root], ["decide", "--project", "customer-self-service", "--gate", "PRODUCT_COMMITMENT", "--decision", "APPROVED", "--module", "catalog", "--module-title", "Catalog", *root]):
        assert invoke(app, command).exit_code == 0
    for command in (["start", "--project", "customer-self-service", *root], ["decide", "--project", "customer-self-service", "--gate", "DELIVERY_ACCEPTANCE", "--decision", "APPROVED", *root]):
        assert invoke(app, command).exit_code == 0
    assert "DELIVERED" in invoke(app, ["status", "--project", "customer-self-service", *root]).output
