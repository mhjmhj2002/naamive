from __future__ import annotations

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pytest
import yaml

from naamive_runtime.intake import IntakeError
from naamive_runtime.orchestration import (
    advance_execution,
    apply_state_transition,
    create_execution,
    create_work_item,
    dispatch_module_implementation,
    materialize_module,
    register_module_consumption,
    recover_interrupted_execution,
    orchestrate_project,
    set_work_item_status,
    unresolved_work_item_dependencies,
    resolve_product_commitment,
    open_human_gate,
    resolve_human_gate,
)
from naamive_runtime.project import render_project_status
from naamive_runtime.audit_schema import validate_audit_record
from naamive_runtime.evidence import validate_module_proposal


def make_project(root: Path, state: str = "ANALYSIS") -> Path:
    project = root / "projects" / "sample"
    project.mkdir(parents=True)
    status = {
        "format_version": 2, "scope_type": "project", "project_id": "sample", "current_state": state,
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "transition_sequence": 1,
        "last_transition_id": "project-0001", "last_transition_from": "PRE_PROJECT", "last_transition_to": state,
        "last_transition_at": "2026-01-01T00:00:00+00:00", "last_transition_actor": "test",
        "last_transition_reason": "created", "last_transition_evidence": "test", "pending_gate": "none",
        "history_path": "STATUS_HISTORY.md",
    }
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    (project / "STATUS_HISTORY.md").write_text("# history\n", encoding="utf-8")
    (root / "naamive" / "registries").mkdir(parents=True)
    return project


def test_rejects_transition_outside_project_machine(tmp_path: Path) -> None:
    make_project(tmp_path)

    with pytest.raises(IntakeError, match="invalid project transition"):
        apply_state_transition(tmp_path, "sample", "IMPLEMENTATION", actor="reviewer", reason="skip", evidence=["evidence"], control_type="INDEPENDENT_REVIEW")


def test_pause_resumes_only_recorded_active_state_and_is_audited(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    apply_state_transition(tmp_path, "sample", "PAUSED", actor="human", reason="blocked", evidence=["decision"], control_type="HUMAN_DECISION")

    with pytest.raises(IntakeError, match="last_active_state"):
        apply_state_transition(tmp_path, "sample", "DEFINITION", actor="human", reason="wrong resume", evidence=["decision"], control_type="INDEPENDENT_REVIEW")
    request = apply_state_transition(tmp_path, "sample", "ANALYSIS", actor="human", reason="unblocked", evidence=["decision"], control_type="HUMAN_DECISION")

    assert request.is_file()
    assert "current_state: ANALYSIS" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert len(list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "gate-decisions").glob("*.yaml"))) == 2


def test_module_cannot_advance_beyond_project_eligibility(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    module = materialize_module(project, "catalog", "Catalog")

    with pytest.raises(IntakeError, match="not eligible"):
        apply_state_transition(tmp_path, "sample", "IMPLEMENTING", scope_type="module", module_id="catalog", actor="reviewer", reason="too early", evidence=["evidence"], control_type="AUTOMATED_EVIDENCE")

    apply_state_transition(tmp_path, "sample", "DEFINED", scope_type="module", module_id="catalog", actor="reviewer", reason="defined", evidence=["evidence"], control_type="INDEPENDENT_REVIEW")
    assert "current_state: DEFINED" in (module / "STATUS.md").read_text(encoding="utf-8")


def test_execution_events_are_append_only_and_recoverable(tmp_path: Path) -> None:
    make_project(tmp_path)
    context = {
        "execution_id": "execution-sample", "project_id": "sample", "scope_type": "project",
        "current_state": "ANALYSIS", "requested_transition": "ANALYSIS->DEFINITION",
        "authorized_work_item": "analyze", "target_path": "analysis/business",
        "input_artifacts": ["need/BUSINESS_NEED.md"], "required_evidence": ["analysis/business"],
        "authority_context": "INDEPENDENT_REVIEW",
    }
    create_execution(tmp_path, context)
    advance_execution(tmp_path, "sample", "execution-sample", "VALIDATING")
    advance_execution(tmp_path, "sample", "execution-sample", "DISPATCHED")
    recovered = recover_interrupted_execution(tmp_path, "sample", "execution-sample", "agent timeout")

    assert recovered.is_file()
    assert len(list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "executions" / "execution-sample" / "events").glob("*.yaml"))) == 5


def test_transition_is_idempotent_and_detects_stale_state(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    request = apply_state_transition(tmp_path, "sample", "DEFINITION", actor="reviewer", reason="reviewed", evidence=["evidence"], control_type="INDEPENDENT_REVIEW", expected_state="ANALYSIS", idempotency_key="analysis-definition")
    repeated = apply_state_transition(tmp_path, "sample", "DEFINITION", actor="reviewer", reason="reviewed", evidence=["evidence"], control_type="INDEPENDENT_REVIEW", expected_state="ANALYSIS", idempotency_key="analysis-definition")

    assert repeated == request
    assert (project / "STATUS_HISTORY.md").read_text(encoding="utf-8").count("DEFINITION") == 1
    with pytest.raises(IntakeError, match="state changed while transition was pending"):
        apply_state_transition(tmp_path, "sample", "ARCHITECTURE", actor="human", reason="stale", evidence=["evidence"], control_type="HUMAN_DECISION", expected_state="ANALYSIS")


def test_scope_lock_allows_only_one_concurrent_transition(tmp_path: Path) -> None:
    make_project(tmp_path)

    def advance() -> str:
        try:
            apply_state_transition(tmp_path, "sample", "DEFINITION", actor="reviewer", reason="reviewed", evidence=["evidence"], control_type="INDEPENDENT_REVIEW", expected_state="ANALYSIS")
            return "applied"
        except IntakeError:
            return "rejected"

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(lambda _: advance(), range(2)))
    assert sorted(outcomes) == ["applied", "rejected"]


def test_schema_rejects_invalid_audit_enum() -> None:
    with pytest.raises(IntakeError, match="invalid execution_event"):
        validate_audit_record({"execution_id": "e", "project_id": "sample", "scope_type": "project", "state": "NOT_A_STATE", "occurred_at": "now"}, "execution_event")


def test_analysis_and_definition_rounds_use_evidence_and_independent_review(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    need = project / "need"
    need.mkdir()
    (need / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")

    def fake_runner(_root, _project_id, agent, work_item, target, _inputs, **kwargs):
        content = {
            "business-analysis": "# Problema\n# Valor\n# Stakeholders\n# Fluxo\n# Restrições\n# Incertezas\n# Métricas\n",
            "domain-modeling": "# Módulos candidatos\n- `catalog`\n# Justificativa\n# Dependências\n# Riscos\n# Questões em aberto\n",
            "requirements-engineering": "# Requisitos\n# Critérios de aceitação\n# Rastreabilidade\n",
            "governance-assurance": "# Critérios verificados\n## Resultado\nAPPROVED\n",
        }[agent]
        filename = "REVIEW.md" if agent == "governance-assurance" else "BUSINESS_ANALYSIS.md" if agent == "business-analysis" else "MODULE_PROPOSAL.md" if agent == "domain-modeling" else "REQUIREMENTS.md"
        traceability = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\n2026-07-28\n# Premissas\nnone\n# Lacunas\nnone\n"
        (target / filename).write_text(content + traceability, encoding="utf-8")
        return {"work_item": work_item}

    analysis = orchestrate_project(tmp_path, "sample", fake_runner)
    definition = orchestrate_project(tmp_path, "sample", fake_runner)

    assert analysis["current_state"] == "DEFINITION"
    assert definition["state"] == "WAITING_FOR_GATE"
    assert "pending_gate: PRODUCT_COMMITMENT" in (project / "STATUS.md").read_text(encoding="utf-8")


def test_invalid_analysis_evidence_requires_rework_without_project_transition(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")

    def invalid_runner(_root, _project_id, _agent, _work_item, target, _inputs, **_kwargs):
        (target / "BUSINESS_ANALYSIS.md").write_text("# Problema\n", encoding="utf-8")
        return {}

    result = orchestrate_project(tmp_path, "sample", invalid_runner)

    assert result["state"] == "REWORK_REQUIRED"
    assert "current_state: ANALYSIS" in (project / "STATUS.md").read_text(encoding="utf-8")


def test_technical_module_candidate_is_rejected(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    proposal = project / "analysis" / "domain"
    proposal.mkdir(parents=True)
    proposal.joinpath("MODULE_PROPOSAL.md").write_text(
        "# Módulos candidatos\n- `backend`\n# Justificativa\nx\n# Dependências\nx\n# Riscos\nx\n# Questões em aberto\nx\n"
        "# Execution ID\nexecution-domain\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n",
        encoding="utf-8",
    )
    with pytest.raises(IntakeError, match="technical candidate"):
        validate_module_proposal(project, "execution-domain")


def test_product_commitment_decision_is_linked_to_pending_request(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DEFINITION")
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        content = "# Módulos candidatos\n- `catalog`\n# Justificativa\nx\n# Dependências\nx\n# Riscos\nx\n# Questões em aberto\nx\n" if agent == "domain-modeling" else "# Requisitos\n# Critérios de aceitação\n# Rastreabilidade\n" if agent == "requirements-engineering" else "# Critérios verificados\n# Resultado\nAPPROVED\n"
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        filename = "MODULE_PROPOSAL.md" if agent == "domain-modeling" else "REQUIREMENTS.md" if agent == "requirements-engineering" else "REVIEW.md"
        (target / filename).write_text(content + trace, encoding="utf-8")
        return {}

    assert orchestrate_project(tmp_path, "sample", runner)["state"] == "WAITING_FOR_GATE"
    outcome = resolve_product_commitment(tmp_path, "sample", "APPROVED", "human-test", "scope approved", "catalog", "Catalog")

    assert outcome["state"] == "ARCHITECTURE"
    assert (project / "modules" / "catalog" / "MODULE.md").is_file()
    assert len(list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "gate-decisions").glob("*.yaml"))) == 1


def test_architecture_and_planning_rounds_require_review_and_authorized_work(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")
    (project / "analysis" / "requirements").mkdir(parents=True)
    (project / "analysis" / "requirements" / "REQUIREMENTS.md").write_text("# Requirements\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        if agent == "solution-architecture":
            (target / "SOLUTION_ARCHITECTURE.md").write_text("# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\nnenhuma\n" + trace, encoding="utf-8")
        elif agent == "delivery-planning":
            (target / "DELIVERY_PLAN.md").write_text("# Roadmap\nx\n# Releases\nx\n# Riscos\nx\n# Dependências\nx\n# Work items\nx\n# Critérios de pronto\nx\n" + trace, encoding="utf-8")
        else:
            (target / "REVIEW.md").write_text("# Critérios verificados\nx\n# Resultado\nAPPROVED\n" + trace, encoding="utf-8")
        return {}

    architecture = orchestrate_project(tmp_path, "sample", runner)
    assert architecture["current_state"] == "PLANNING"
    assert orchestrate_project(tmp_path, "sample", runner)["state"] == "REWORK_REQUIRED"
    module = materialize_module(project, "catalog", "Catalog")
    apply_state_transition(tmp_path, "sample", "DEFINED", scope_type="module", module_id="catalog", actor="reviewer", reason="defined", evidence=["domain"], control_type="INDEPENDENT_REVIEW")
    apply_state_transition(tmp_path, "sample", "ARCHITECTED", scope_type="module", module_id="catalog", actor="reviewer", reason="architected", evidence=["architecture"], control_type="INDEPENDENT_REVIEW")
    create_work_item(project, "catalog", "catalog-rules", "Catalog rules", objective="Implement rules", write_scope=["modules/catalog/applications/rules.py"], dependencies=[], priority="HIGH", definition_of_ready=["Architecture reviewed"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="plan")
    planning = orchestrate_project(tmp_path, "sample", runner)
    assert planning["current_state"] == "IMPLEMENTATION"


def test_conditional_human_gate_applies_only_approved_pending_transition(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    open_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "PLANNING", "material impact", ["architecture/decision.md"])
    result = resolve_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "APPROVED", "human-test", "accepted")

    assert result["state"] == "PLANNING"
    assert "current_state: PLANNING" in (project / "STATUS.md").read_text(encoding="utf-8")


@pytest.mark.parametrize("gate,state,target,decision", [
    ("MATERIAL_ARCHITECTURE_DECISION", "ARCHITECTURE", "PLANNING", "REJECTED"),
    ("RESIDUAL_RISK_ACCEPTANCE", "VALIDATION", "DELIVERY", "REWORK_REQUIRED"),
    ("DELIVERY_ACCEPTANCE", "DELIVERY", "DELIVERED", "REJECTED"),
    ("PAUSE", "IMPLEMENTATION", "PAUSED", "REWORK_REQUIRED"),
])
def test_conditional_gate_rejection_and_rework_preserve_state_and_next_action(tmp_path: Path, gate: str, state: str, target: str, decision: str) -> None:
    project = make_project(tmp_path, state)
    open_human_gate(tmp_path, "sample", gate, target, "human decision needed", ["evidence/gate.md"])

    result = resolve_human_gate(tmp_path, "sample", gate, decision, "human-test", "not accepted yet")

    status = (project / "STATUS.md").read_text(encoding="utf-8")
    assert result["state"] == decision
    assert f"current_state: {state}" in status
    assert "pending_gate: none" in status
    assert "next_action:" in status


def test_pending_gate_blocks_direct_transition_and_stale_gate_does_not_change_state(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    open_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "PLANNING", "material impact", ["architecture/decision.md"])

    with pytest.raises(IntakeError, match="pending gate"):
        apply_state_transition(tmp_path, "sample", "PAUSED", actor="human", reason="bypass", evidence=["decision"], control_type="HUMAN_DECISION")

    status = project / "STATUS.md"
    status.write_text(status.read_text(encoding="utf-8").replace("current_state: ARCHITECTURE", "current_state: PLANNING"), encoding="utf-8")
    with pytest.raises(IntakeError, match="obsolete"):
        resolve_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "APPROVED", "human-test", "accepted")
    assert "current_state: PLANNING" in status.read_text(encoding="utf-8")
    assert not list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "gate-decisions").glob("*.yaml"))


def test_gate_is_applicable_only_at_its_declared_transition(tmp_path: Path) -> None:
    make_project(tmp_path, "ANALYSIS")

    with pytest.raises(IntakeError, match="not applicable"):
        open_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "DEFINITION", "wrong moment", ["evidence.md"])


def test_module_materialization_has_canonical_tree_and_complete_status(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    module = materialize_module(project, "catalog", "Catalog", "naamive/registries/orchestration/sample/gate-decisions/decision.yaml")

    for directory in ("need", "domain", "requirements", "planning/work-items", "architecture", "state-machine", "applications", "tests", "evidence", "documentation", "delivery"):
        assert (module / directory).is_dir()
    status = (module / "STATUS.md").read_text(encoding="utf-8")
    for field in ("transition_sequence:", "last_transition_id:", "last_transition_evidence:", "history_path:"):
        assert field in status
    assert "decision.yaml" in (module / "STATUS_HISTORY.md").read_text(encoding="utf-8")


def test_work_item_is_planned_authorized_and_required_for_module_execution(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    module = materialize_module(project, "catalog", "Catalog")
    apply_state_transition(tmp_path, "sample", "DEFINED", scope_type="module", module_id="catalog", actor="reviewer", reason="defined", evidence=["domain"], control_type="INDEPENDENT_REVIEW")
    apply_state_transition(tmp_path, "sample", "ARCHITECTED", scope_type="module", module_id="catalog", actor="reviewer", reason="architected", evidence=["architecture"], control_type="INDEPENDENT_REVIEW")
    work_item = create_work_item(project, "catalog", "catalog-rules", "Catalog rules", objective="Define rules", write_scope=["modules/catalog/applications/rules.py"], dependencies=[], priority="HIGH", definition_of_ready=["Architecture reviewed"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="planning-decision")

    assert work_item == module / "planning" / "work-items" / "catalog-rules.md"
    assert "**Status:** `AUTHORIZED`" in work_item.read_text(encoding="utf-8")
    context = {
        "execution_id": "module-execution", "project_id": "sample", "scope_type": "module", "module_id": "catalog",
        "current_state": "ARCHITECTED", "requested_transition": "evidence-only", "authorized_work_item": "catalog-rules",
        "target_path": "modules/catalog/applications", "input_artifacts": ["modules/catalog/domain/MODEL.md"],
        "required_evidence": ["modules/catalog/tests/rules.md"], "authority_context": "INDEPENDENT_REVIEW",
    }
    assert create_execution(tmp_path, context).is_file()
    context["execution_id"] = "module-execution-outside"
    context["target_path"] = "applications"
    with pytest.raises(IntakeError, match="under its module"):
        create_execution(tmp_path, context)


def test_work_item_dependency_requires_completed_predecessor(tmp_path: Path) -> None:
    project = make_project(tmp_path, "PLANNING")
    for module_id in ("identity", "catalog"):
        materialize_module(project, module_id, module_id.title())
        apply_state_transition(tmp_path, "sample", "DEFINED", scope_type="module", module_id=module_id, actor="reviewer", reason="defined", evidence=["domain"], control_type="INDEPENDENT_REVIEW")
        apply_state_transition(tmp_path, "sample", "ARCHITECTED", scope_type="module", module_id=module_id, actor="reviewer", reason="architected", evidence=["architecture"], control_type="INDEPENDENT_REVIEW")
    create_work_item(project, "identity", "identity-contract", "Identity contract", objective="Publish contract", write_scope=["modules/identity/applications/contract.py"], dependencies=[], priority="HIGH", definition_of_ready=["Architecture reviewed"], expected_evidence=["modules/identity/tests/contract.md"], authorization_reference="plan")
    create_work_item(project, "catalog", "catalog-rules", "Catalog rules", objective="Use identity", write_scope=["modules/catalog/applications/rules.py"], dependencies=["identity/identity-contract"], priority="HIGH", definition_of_ready=["Architecture reviewed"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="plan")

    assert unresolved_work_item_dependencies(project, "catalog", "catalog-rules") == ["identity/identity-contract"]
    set_work_item_status(project, "identity", "identity-contract", "IN_PROGRESS")
    set_work_item_status(project, "identity", "identity-contract", "COMPLETED")
    assert unresolved_work_item_dependencies(project, "catalog", "catalog-rules") == []


def test_module_implementation_dispatch_completes_only_with_expected_evidence(tmp_path: Path) -> None:
    project = make_project(tmp_path, "IMPLEMENTATION")
    module = materialize_module(project, "catalog", "Catalog")
    apply_state_transition(tmp_path, "sample", "DEFINED", scope_type="module", module_id="catalog", actor="reviewer", reason="defined", evidence=["domain"], control_type="INDEPENDENT_REVIEW")
    apply_state_transition(tmp_path, "sample", "ARCHITECTED", scope_type="module", module_id="catalog", actor="reviewer", reason="architected", evidence=["architecture"], control_type="INDEPENDENT_REVIEW")
    apply_state_transition(tmp_path, "sample", "PLANNED", scope_type="module", module_id="catalog", actor="reviewer", reason="planned", evidence=["plan"], control_type="INDEPENDENT_REVIEW")
    create_work_item(project, "catalog", "catalog-rules", "Catalog rules", objective="Implement rules", write_scope=["modules/catalog/applications/rules.py"], dependencies=[], priority="HIGH", definition_of_ready=["Architecture reviewed"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="plan")

    def runner(_root, _project_id, _agent, _work_item, _target, _inputs, **_kwargs):
        (module / "applications" / "rules.py").write_text("RULE = 1\n", encoding="utf-8")
        (module / "tests" / "rules.md").write_text("# evidence\n", encoding="utf-8")
        return {"commit": "test-commit"}

    result = dispatch_module_implementation(tmp_path, "sample", "catalog", "catalog-rules", runner)
    assert result["state"] == "COMPLETED"
    assert "**Status:** `COMPLETED`" in (module / "planning" / "work-items" / "catalog-rules.md").read_text(encoding="utf-8")
    assert "current_state: IMPLEMENTING" in (module / "STATUS.md").read_text(encoding="utf-8")


def test_module_consumption_is_owned_by_consumer_and_cannot_authorize_provider_write(tmp_path: Path) -> None:
    consumer_project = make_project(tmp_path, "ARCHITECTURE")
    provider_project = tmp_path / "projects" / "provider"
    provider_project.mkdir()
    provider_status = dict(yaml.safe_load((consumer_project / "STATUS.md").read_text(encoding="utf-8").split("---\n", 2)[1]))
    provider_status["project_id"] = "provider"
    (provider_project / "STATUS.md").write_text(render_project_status(provider_status), encoding="utf-8")
    (provider_project / "STATUS_HISTORY.md").write_text("# history\n", encoding="utf-8")
    materialize_module(consumer_project, "orders", "Orders")
    materialize_module(provider_project, "identity", "Identity")

    record = register_module_consumption(tmp_path, "sample", "orders", "provider", "identity", "modules/identity/documentation/CONTRACT.md", "1.x", "Authenticate orders", "integration-team", "Identity unavailable")

    assert record.is_file()
    assert record.is_relative_to(consumer_project / "modules" / "orders")
    assert not (provider_project / "modules" / "identity" / "architecture" / "module-consumption").exists()
