from __future__ import annotations

from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

import pytest
import yaml
import naamive_runtime.orchestration as orchestration

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
    orchestrate_module_architecture_planning,
    set_work_item_status,
    unresolved_work_item_dependencies,
    resolve_product_commitment,
    open_human_gate,
    return_to_implementation_for_finding,
    pause_or_resume_scope,
    cancel_module,
    start_evolution,
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


def test_public_scope_operations_pause_resume_and_cancel_a_module(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DEFINITION")
    materialize_module(project, "catalog", "Catalog")
    paused = pause_or_resume_scope(tmp_path, "sample", scope_type="module", module_id="catalog", reason="waiting", evidence=["evidence/pause.md"])
    resumed = pause_or_resume_scope(tmp_path, "sample", scope_type="module", module_id="catalog", reason="unblocked", evidence=["evidence/resume.md"], resume=True)
    cancelled = cancel_module(tmp_path, "sample", "catalog", "scope removed", ["evidence/cancel.md"])

    assert paused["state"] == "PAUSED"
    assert resumed["state"] == "IDENTIFIED"
    assert cancelled["state"] == "CANCELLED"


def test_evolution_requires_change_request_and_reopens_only_affected_modules(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DELIVERED")
    module = materialize_module(project, "catalog", "Catalog")
    status = module / "STATUS.md"
    status.write_text(status.read_text(encoding="utf-8").replace("current_state: IDENTIFIED", "current_state: DELIVERED"), encoding="utf-8")

    result = start_evolution(tmp_path, "sample", ["catalog"], "New regulatory requirement", ["need/change-001.md"])

    assert result["state"] == "PLANNING"
    assert "current_state: PLANNING" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: PLANNED" in status.read_text(encoding="utf-8")
    assert (tmp_path / result["change_request_path"]).is_file()


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


def test_unexpected_agent_failure_is_audited_as_failed(tmp_path: Path) -> None:
    make_project(tmp_path)

    def broken_runner(*args: object, **kwargs: object) -> dict[str, object]:
        raise RuntimeError("transport disconnected")

    with pytest.raises(IntakeError, match="agent dispatch failed: transport disconnected"):
        orchestrate_project(tmp_path, "sample", broken_runner)

    events = list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "executions").glob("*/events/*.yaml"))
    assert any(yaml.safe_load(event.read_text(encoding="utf-8"))["state"] == "FAILED" for event in events)


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
    candidates = [
        {"module_id": "catalog", "title": "Catalog", "justification": "Product catalog capability.", "owner": "catalog-owner"},
        {"module_id": "orders", "title": "Orders", "justification": "Order lifecycle capability.", "owner": "orders-owner"},
    ]
    outcome = resolve_product_commitment(tmp_path, "sample", "APPROVED", "human-test", "scope approved", module_candidates=candidates)

    assert outcome["state"] == "ARCHITECTURE"
    assert (project / "modules" / "catalog" / "MODULE.md").is_file()
    assert (project / "modules" / "orders" / "MODULE.md").is_file()
    decision = yaml.safe_load((tmp_path / str(outcome["decision_path"])).read_text(encoding="utf-8"))
    assert decision["approved_modules"] == candidates
    assert len(list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "gate-decisions").glob("*.yaml"))) == 1


def test_product_commitment_does_not_publish_a_partial_module_set(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    project = make_project(tmp_path, "DEFINITION")
    orchestration._open_product_commitment_gate(tmp_path, project, "sample", "execution-test", ["analysis/domain/MODULE_PROPOSAL.md"])
    original = orchestration.materialize_module
    calls = 0

    def fail_second_materialization(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise IntakeError("simulated materialization failure")
        return original(*args, **kwargs)

    monkeypatch.setattr(orchestration, "materialize_module", fail_second_materialization)
    with pytest.raises(IntakeError, match="simulated materialization failure"):
        resolve_product_commitment(tmp_path, "sample", "APPROVED", "human-test", "scope approved", module_candidates=[
            {"module_id": "catalog", "title": "Catalog", "justification": "Catalog capability.", "owner": "catalog-owner"},
            {"module_id": "orders", "title": "Orders", "justification": "Order capability.", "owner": "orders-owner"},
        ])

    assert not (project / "modules").exists()
    assert not list((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "gate-decisions").glob("*.yaml"))


def test_architecture_and_planning_rounds_require_review_and_authorized_work(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")
    (project / "analysis" / "requirements").mkdir(parents=True)
    (project / "analysis" / "requirements" / "REQUIREMENTS.md").write_text("# Requirements\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        if agent == "solution-architecture":
            (target / "SOLUTION_ARCHITECTURE.md").write_text("material_decision_required: false\n# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\nnenhuma\n" + trace, encoding="utf-8")
        elif agent == "delivery-planning":
            (target / "DELIVERY_PLAN.md").write_text("risks_resolved: true\ndependencies_resolved: true\nunresolved_risks: []\n# Roadmap\nx\n# Releases\nx\n# Riscos\nx\n# Dependências\nx\n# Work items\nx\n# Critérios de pronto\nx\n" + trace, encoding="utf-8")
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


def test_material_architecture_declaration_opens_human_gate(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")
    (project / "analysis" / "requirements").mkdir(parents=True)
    (project / "analysis" / "requirements" / "REQUIREMENTS.md").write_text("# Requirements\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\nneed\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        if agent == "solution-architecture":
            (target / "SOLUTION_ARCHITECTURE.md").write_text("material_decision_required: true\n# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\n# material_decisions\n- id: vendor-choice\n" + trace, encoding="utf-8")
        else:
            (target / "REVIEW.md").write_text("# Critérios verificados\nx\n# Resultado\nAPPROVED\n" + trace, encoding="utf-8")
        return {}

    result = orchestrate_project(tmp_path, "sample", runner)
    assert result["state"] == "WAITING_FOR_GATE"
    assert result["gate_id"] == "MATERIAL_ARCHITECTURE_DECISION"


def test_conditional_human_gate_applies_only_approved_pending_transition(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    open_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "PLANNING", "material impact", ["architecture/decision.md"])
    result = resolve_human_gate(tmp_path, "sample", "MATERIAL_ARCHITECTURE_DECISION", "APPROVED", "human-test", "accepted")

    assert result["state"] == "PLANNING"
    assert "current_state: PLANNING" in (project / "STATUS.md").read_text(encoding="utf-8")


@pytest.mark.parametrize("gate,state,target,decision", [
    ("MATERIAL_ARCHITECTURE_DECISION", "ARCHITECTURE", "PLANNING", "REJECTED"),
    ("RESIDUAL_RISK_ACCEPTANCE", "VALIDATION", "DELIVERY", "REWORK_REQUIRED"),
    ("RELEASE_AUTHORIZATION", "DELIVERY", "DELIVERY", "REJECTED"),
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


def test_phase6_orchestrates_integration_validation_and_accepted_delivery(tmp_path: Path) -> None:
    project = make_project(tmp_path, "IMPLEMENTATION")
    module = materialize_module(project, "catalog", "Catalog")
    for state, control in (("DEFINED", "INDEPENDENT_REVIEW"), ("ARCHITECTED", "INDEPENDENT_REVIEW"), ("PLANNED", "INDEPENDENT_REVIEW"), ("IMPLEMENTING", "AUTOMATED_EVIDENCE")):
        apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id="catalog", actor="test", reason=state, evidence=["evidence"], control_type=control)
    (project / "architecture").mkdir()
    (project / "architecture" / "SOLUTION_ARCHITECTURE.md").write_text("# Architecture\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\ntest\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        documents = {
            "integration-engineering": ("INTEGRATION_REPORT.md", "# Contratos\nx\n# Fluxos\nx\n# Sistemas externos\nx\n# Incompatibilidades\nnenhuma\n# Resultado\nAPPROVED\n"),
            "quality-assurance": ("QUALITY_REPORT.md", "# Requisitos\nx\n# Critérios de aceitação\nx\n# Testes\nx\n# Achados\nnenhum\n# Resultado\nAPPROVED\n"),
            "security-assurance": ("SECURITY_ASSESSMENT.md", "residual_risk_acceptance_required: false\n# Riscos\nx\n# Impacto\nx\n# Mitigação\nx\n# Exceções\nnenhuma\n# Risco residual\nnenhum\n# Resultado\nAPPROVED\n"),
            "release-operations": ("DELIVERY_PACKAGE.md", "release_authorization_required: false\n# Release\nx\n# Implantação\nx\n# Reversão\nx\n# Operação\nx\n# Observabilidade\nx\n# Handover\nx\n# Resultado\nREADY\n"),
            "governance-assurance": ("REVIEW.md", "# Critérios verificados\nx\n# Resultado\nAPPROVED\n"),
        }
        filename, content = documents[agent]
        (target / filename).write_text(content + trace, encoding="utf-8")
        return {}

    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "VALIDATION"
    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "DELIVERY"
    waiting = orchestrate_project(tmp_path, "sample", runner)
    assert waiting["gate_id"] == "DELIVERY_ACCEPTANCE"
    assert resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")["state"] == "DELIVERED"
    assert "current_state: DELIVERED" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: DELIVERED" in (module / "STATUS.md").read_text(encoding="utf-8")


def test_release_authorization_binds_delivery_acceptance_to_one_immutable_package(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DELIVERY")
    module = materialize_module(project, "catalog", "Catalog")
    for state, control in (("DEFINED", "INDEPENDENT_REVIEW"), ("ARCHITECTED", "INDEPENDENT_REVIEW"), ("PLANNED", "INDEPENDENT_REVIEW"), ("IMPLEMENTING", "AUTOMATED_EVIDENCE"), ("INTEGRATING", "AUTOMATED_EVIDENCE"), ("VALIDATING", "AUTOMATED_EVIDENCE"), ("READY_FOR_DELIVERY", "INDEPENDENT_REVIEW")):
        apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id="catalog", actor="test", reason=state, evidence=["evidence"], control_type=control)
    (project / "validation" / "security").mkdir(parents=True)
    (project / "validation" / "QUALITY_REPORT.md").write_text("# quality\n", encoding="utf-8")
    (project / "validation" / "security" / "SECURITY_ASSESSMENT.md").write_text("# security\n", encoding="utf-8")
    dispatched: list[str] = []

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        dispatched.append(agent)
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\ntest\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        (target / "DELIVERY_PACKAGE.md").write_text("release_authorization_required: true\n# Release\nx\n# Implantação\nx\n# Reversão\nx\n# Operação\nx\n# Observabilidade\nx\n# Handover\nx\n# Resultado\nREADY\n" + trace, encoding="utf-8")
        return {}

    waiting = orchestrate_project(tmp_path, "sample", runner)
    assert waiting["gate_id"] == "RELEASE_AUTHORIZATION"
    authorization = resolve_human_gate(tmp_path, "sample", "RELEASE_AUTHORIZATION", "APPROVED", "operations", "approved")
    assert authorization["state"] == "WAITING_FOR_GATE"
    assert dispatched == ["release-operations"]
    request = yaml.safe_load((tmp_path / authorization["transition_request"]).read_text(encoding="utf-8"))
    record_path = tmp_path / request["release_package_record"]
    record = yaml.safe_load(record_path.read_text(encoding="utf-8"))
    assert request["evidence"][0] == record["package_path"] == "delivery/DELIVERY_PACKAGE.md"
    assert resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "business", "accepted")["state"] == "DELIVERED"
    assert dispatched == ["release-operations"]


def test_changed_authorized_package_blocks_delivery_acceptance_and_requires_rework(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DELIVERY")
    module = materialize_module(project, "catalog", "Catalog")
    for state, control in (("DEFINED", "INDEPENDENT_REVIEW"), ("ARCHITECTED", "INDEPENDENT_REVIEW"), ("PLANNED", "INDEPENDENT_REVIEW"), ("IMPLEMENTING", "AUTOMATED_EVIDENCE"), ("INTEGRATING", "AUTOMATED_EVIDENCE"), ("VALIDATING", "AUTOMATED_EVIDENCE"), ("READY_FOR_DELIVERY", "INDEPENDENT_REVIEW")):
        apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id="catalog", actor="test", reason=state, evidence=["evidence"], control_type=control)
    (project / "validation" / "security").mkdir(parents=True)
    (project / "validation" / "QUALITY_REPORT.md").write_text("# quality\n", encoding="utf-8")
    (project / "validation" / "security" / "SECURITY_ASSESSMENT.md").write_text("# security\n", encoding="utf-8")

    def runner(_root, _project_id, _agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nproject\n# Fonte\ntest\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        (target / "DELIVERY_PACKAGE.md").write_text("release_authorization_required: true\n# Release\nx\n# Implantação\nx\n# Reversão\nx\n# Operação\nx\n# Observabilidade\nx\n# Handover\nx\n# Resultado\nREADY\n" + trace, encoding="utf-8")
        return {}

    orchestrate_project(tmp_path, "sample", runner)
    resolve_human_gate(tmp_path, "sample", "RELEASE_AUTHORIZATION", "APPROVED", "operations", "approved")
    package = project / "delivery" / "DELIVERY_PACKAGE.md"
    package.write_text(package.read_text(encoding="utf-8") + "\nchanged", encoding="utf-8")
    result = resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "business", "accepted")
    assert result["state"] == "REWORK_REQUIRED"
    status = (project / "STATUS.md").read_text(encoding="utf-8")
    assert "pending_gate: none" in status
    assert "release_authorized" not in status
    decision = yaml.safe_load((tmp_path / result["decision_path"]).read_text(encoding="utf-8"))
    assert decision["decision"] == "REWORK_REQUIRED"


def test_delivery_acceptance_rejects_incompatible_module_without_side_effects(tmp_path: Path) -> None:
    project = make_project(tmp_path, "DELIVERY")
    module = materialize_module(project, "catalog", "Catalog")
    open_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "DELIVERED", "accept", ["delivery/DELIVERY_PACKAGE.md"])
    before_project = (project / "STATUS.md").read_text(encoding="utf-8")
    before_module = (module / "STATUS.md").read_text(encoding="utf-8")

    with pytest.raises(IntakeError, match="READY_FOR_DELIVERY"):
        resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")

    assert (project / "STATUS.md").read_text(encoding="utf-8") == before_project
    assert (module / "STATUS.md").read_text(encoding="utf-8") == before_module
    audit = tmp_path / "naamive" / "registries" / "orchestration" / "sample"
    assert not list((audit / "gate-decisions").glob("*.yaml"))
    assert not (audit / "delivery-acceptance").exists()


def test_delivery_acceptance_recovers_partial_module_failure_and_is_idempotent(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    project = make_project(tmp_path, "DELIVERY")
    modules = [materialize_module(project, module_id, module_id.title()) for module_id in ("catalog", "billing")]
    for module in modules:
        for state, control in (("DEFINED", "INDEPENDENT_REVIEW"), ("ARCHITECTED", "INDEPENDENT_REVIEW"), ("PLANNED", "INDEPENDENT_REVIEW"), ("IMPLEMENTING", "AUTOMATED_EVIDENCE"), ("INTEGRATING", "AUTOMATED_EVIDENCE"), ("VALIDATING", "AUTOMATED_EVIDENCE"), ("READY_FOR_DELIVERY", "INDEPENDENT_REVIEW")):
            apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id=module.name, actor="test", reason=state, evidence=["evidence"], control_type=control)
    open_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "DELIVERED", "accept", ["delivery/DELIVERY_PACKAGE.md"])
    original = orchestration._apply_state_transition_locked
    calls = 0

    def fail_second(*args: object, **kwargs: object):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise OSError("injected persistence failure")
        return original(*args, **kwargs)

    monkeypatch.setattr(orchestration, "_apply_state_transition_locked", fail_second)
    with pytest.raises(OSError, match="injected persistence failure"):
        resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")
    assert "current_state: DELIVERY" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: READY_FOR_DELIVERY" in (modules[0] / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: DELIVERED" in (modules[1] / "STATUS.md").read_text(encoding="utf-8")
    operation = next((tmp_path / "naamive" / "registries" / "orchestration" / "sample" / "delivery-acceptance").glob("delivery-acceptance-*.yaml"))
    assert yaml.safe_load(operation.read_text(encoding="utf-8"))["state"] == "INCOMPLETE"

    monkeypatch.setattr(orchestration, "_apply_state_transition_locked", original)
    first = resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")
    module_histories = [(module / "STATUS_HISTORY.md").read_text(encoding="utf-8") for module in modules]
    repeated = resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")
    assert repeated == first
    assert [(module / "STATUS_HISTORY.md").read_text(encoding="utf-8") for module in modules] == module_histories


def test_blocking_validation_finding_reopens_work_and_returns_to_implementation(tmp_path: Path) -> None:
    project = make_project(tmp_path, "VALIDATION")
    materialize_module(project, "catalog", "Catalog")
    for state, control in (("DEFINED", "INDEPENDENT_REVIEW"), ("ARCHITECTED", "INDEPENDENT_REVIEW"), ("PLANNED", "INDEPENDENT_REVIEW")):
        apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id="catalog", actor="test", reason=state, evidence=["evidence"], control_type=control)
    create_work_item(project, "catalog", "catalog-rules", "Catalog rules", objective="Implement rules", write_scope=["modules/catalog/applications/rules.py"], dependencies=[], priority="HIGH", definition_of_ready=["Ready"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="plan")
    for state, control in (("IMPLEMENTING", "AUTOMATED_EVIDENCE"), ("INTEGRATING", "AUTOMATED_EVIDENCE"), ("VALIDATING", "AUTOMATED_EVIDENCE"), ("READY_FOR_DELIVERY", "INDEPENDENT_REVIEW")):
        apply_state_transition(tmp_path, "sample", state, scope_type="module", module_id="catalog", actor="test", reason=state, evidence=["evidence"], control_type=control)
    set_work_item_status(project, "catalog", "catalog-rules", "IN_PROGRESS")
    set_work_item_status(project, "catalog", "catalog-rules", "COMPLETED")

    result = return_to_implementation_for_finding(tmp_path, "sample", "catalog", "catalog-rules", "CRITICAL", ["validation/QUALITY_REPORT.md"], "reproduce", "fix rule")

    assert result["state"] == "IMPLEMENTATION"
    assert "current_state: IMPLEMENTATION" in (project / "STATUS.md").read_text(encoding="utf-8")
    assert "current_state: IMPLEMENTING" in (project / "modules" / "catalog" / "STATUS.md").read_text(encoding="utf-8")
    assert "**Status:** `AUTHORIZED`" in (project / "modules" / "catalog" / "planning" / "work-items" / "catalog-rules.md").read_text(encoding="utf-8")


def test_module_architecture_and_planning_rounds_are_independently_reviewed(tmp_path: Path) -> None:
    project = make_project(tmp_path, "ARCHITECTURE")
    module = materialize_module(project, "catalog", "Catalog")
    (project / "analysis" / "domain").mkdir(parents=True)
    (project / "analysis" / "domain" / "MODULE_PROPOSAL.md").write_text("# proposal\n", encoding="utf-8")
    (project / "analysis" / "requirements").mkdir(parents=True)
    (project / "analysis" / "requirements" / "REQUIREMENTS.md").write_text("# requirements\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nmodule\n# Fonte\nrequirements\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        if agent == "requirements-engineering":
            (target / "MODULE_REQUIREMENTS.md").write_text("# Módulo\ncatalog\n# Objetivo\nx\n# Limites\nx\n# Rastreabilidade\nx\n" + trace, encoding="utf-8")
        elif agent == "solution-architecture":
            (target / "SOLUTION_ARCHITECTURE.md").write_text("material_decision_required: false\n# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\nnenhuma\n" + trace, encoding="utf-8")
        elif agent == "delivery-planning":
            (target / "DELIVERY_PLAN.md").write_text("risks_resolved: true\ndependencies_resolved: true\nunresolved_risks: []\n# Roadmap\nx\n# Releases\nx\n# Riscos\nx\n# Dependências\nx\n# Work items\nx\n# Critérios de pronto\nx\n" + trace, encoding="utf-8")
        else:
            (target / "REVIEW.md").write_text("# Critérios verificados\nx\n# Resultado\nAPPROVED\n" + trace, encoding="utf-8")
        return {}

    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "DEFINED"
    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "ARCHITECTED"
    apply_state_transition(tmp_path, "sample", "PLANNING", actor="reviewer", reason="project architecture reviewed", evidence=["architecture"], control_type="INDEPENDENT_REVIEW")
    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "PLANNED"


def test_module_consumption_is_owned_by_consumer_and_cannot_authorize_provider_write(tmp_path: Path) -> None:
    consumer_project = make_project(tmp_path, "ARCHITECTURE")
    provider_project = tmp_path / "projects" / "provider"
    provider_project.mkdir()
    provider_status = dict(yaml.safe_load((consumer_project / "STATUS.md").read_text(encoding="utf-8").split("---\n", 2)[1]))
    provider_status["project_id"] = "provider"
    (provider_project / "STATUS.md").write_text(render_project_status(provider_status), encoding="utf-8")
    (provider_project / "STATUS_HISTORY.md").write_text("# history\n", encoding="utf-8")
    materialize_module(consumer_project, "orders", "Orders")
    provider_module = materialize_module(provider_project, "identity", "Identity")
    provider_module_status = orchestration._read_module_status(provider_module)
    provider_module_status["current_state"] = "DELIVERED"
    (provider_module / "STATUS.md").write_text(orchestration._render_module_status(provider_module_status), encoding="utf-8")
    contract = provider_module / "documentation" / "CONTRACT.md"
    contract.write_text("---\npublication_status: PUBLISHED\ncontract_version: 1.2.0\n---\n\n# Identity contract\n", encoding="utf-8")

    record = register_module_consumption(tmp_path, "sample", "orders", "provider", "identity", "modules/identity/documentation/CONTRACT.md", "1.x", "Authenticate orders", "integration-team", "Identity unavailable")

    assert record.is_file()
    assert record.is_relative_to(consumer_project / "modules" / "orders")
    assert not (provider_project / "modules" / "identity" / "architecture" / "module-consumption").exists()
    payload = yaml.safe_load(record.read_text(encoding="utf-8"))
    assert payload["provider_contract_path"] == "projects/provider/modules/identity/documentation/CONTRACT.md"
    assert payload["contract_version"] == "1.2.0"
    assert len(payload["contract_sha256"]) == 64


def test_module_consumption_rejects_missing_unpublished_or_drifted_provider_contract(tmp_path: Path) -> None:
    consumer_project = make_project(tmp_path, "IMPLEMENTATION")
    provider_project = tmp_path / "projects" / "provider"
    provider_project.mkdir()
    provider_status = dict(yaml.safe_load((consumer_project / "STATUS.md").read_text(encoding="utf-8").split("---\n", 2)[1]))
    provider_status["project_id"] = "provider"
    (provider_project / "STATUS.md").write_text(render_project_status(provider_status), encoding="utf-8")
    (provider_project / "STATUS_HISTORY.md").write_text("# history\n", encoding="utf-8")
    consumer = materialize_module(consumer_project, "orders", "Orders")
    provider = materialize_module(provider_project, "identity", "Identity")
    for module in (consumer, provider):
        status = orchestration._read_module_status(module)
        status["current_state"] = "DELIVERED" if module == provider else "IMPLEMENTING"
        (module / "STATUS.md").write_text(orchestration._render_module_status(status), encoding="utf-8")
    reference = "modules/identity/documentation/CONTRACT.md"
    with pytest.raises(IntakeError, match="does not exist"):
        register_module_consumption(tmp_path, "sample", "orders", "provider", "identity", reference, "1.x", "Authenticate", "team", "risk")
    contract = provider / "documentation" / "CONTRACT.md"
    contract.write_text("---\npublication_status: DRAFT\ncontract_version: 1.0.0\n---\n", encoding="utf-8")
    with pytest.raises(IntakeError, match="not published"):
        register_module_consumption(tmp_path, "sample", "orders", "provider", "identity", reference, "1.x", "Authenticate", "team", "risk")
    contract.write_text("---\npublication_status: PUBLISHED\ncontract_version: 1.0.0\n---\n# API\n", encoding="utf-8")
    register_module_consumption(tmp_path, "sample", "orders", "provider", "identity", reference, "1.x", "Authenticate", "team", "risk")
    contract.write_text("---\npublication_status: PUBLISHED\ncontract_version: 1.0.0\n---\n# Changed API\n", encoding="utf-8")
    with pytest.raises(IntakeError, match="changed or was replaced"):
        orchestration._revalidate_module_consumptions(tmp_path, consumer_project)


def test_deterministic_end_to_end_happy_path(tmp_path: Path) -> None:
    project = make_project(tmp_path)
    (project / "need").mkdir()
    (project / "need" / "BUSINESS_NEED.md").write_text("# Need\n", encoding="utf-8")

    def runner(_root, _project_id, agent, _work_item, target, _inputs, **kwargs):
        trace = f"# Execution ID\n{kwargs['execution_context']['execution_id']}\n# Escopo\nx\n# Fonte\nx\n# Responsável\nagent\n# Data\nnow\n# Premissas\nx\n# Lacunas\nx\n"
        documents = {
            "business-analysis": ("BUSINESS_ANALYSIS.md", "# Problema\nx\n# Valor\nx\n# Stakeholders\nx\n# Fluxo\nx\n# Restrições\nx\n# Incertezas\nx\n# Métricas\nx\n"),
            "domain-modeling": ("MODULE_PROPOSAL.md", "# Módulos candidatos\n- `catalog`\n# Justificativa\nx\n# Dependências\nx\n# Riscos\nx\n# Questões em aberto\nx\n"),
            "requirements-engineering": ("REQUIREMENTS.md" if target.name == "requirements" and "modules" not in target.parts else "MODULE_REQUIREMENTS.md", "# Requisitos\nx\n# Critérios de aceitação\nx\n# Rastreabilidade\nx\n" if "modules" not in target.parts else "# Módulo\ncatalog\n# Objetivo\nx\n# Limites\nx\n# Rastreabilidade\nx\n"),
            "solution-architecture": ("SOLUTION_ARCHITECTURE.md", "material_decision_required: false\n# Decisões\nx\n# Integrações\nx\n# Impactos\nx\n# Riscos\nx\n# Decisões materiais\nnone\n"),
            "delivery-planning": ("DELIVERY_PLAN.md", "risks_resolved: true\ndependencies_resolved: true\nunresolved_risks: []\n# Roadmap\nx\n# Releases\nx\n# Riscos\nx\n# Dependências\nx\n# Work items\nx\n# Critérios de pronto\nx\n"),
            "integration-engineering": ("INTEGRATION_REPORT.md", "# Contratos\nx\n# Fluxos\nx\n# Sistemas externos\nx\n# Incompatibilidades\nx\n# Resultado\nAPPROVED\n"),
            "quality-assurance": ("QUALITY_REPORT.md", "# Requisitos\nx\n# Critérios de aceitação\nx\n# Testes\nx\n# Achados\nnone\n# Resultado\nAPPROVED\n"),
            "security-assurance": ("SECURITY_ASSESSMENT.md", "residual_risk_acceptance_required: false\n# Riscos\nx\n# Impacto\nx\n# Mitigação\nx\n# Exceções\nnone\n# Risco residual\nnone\n# Resultado\nAPPROVED\n"),
            "release-operations": ("DELIVERY_PACKAGE.md", "release_authorization_required: false\n# Release\nx\n# Implantação\nx\n# Reversão\nx\n# Operação\nx\n# Observabilidade\nx\n# Handover\nx\n# Resultado\nAPPROVED\n"),
            "governance-assurance": ("REVIEW.md", "# Critérios verificados\nx\n# Resultado\nAPPROVED\n"),
        }
        if agent == "implementation":
            (target / "tests").mkdir(exist_ok=True)
            (target / "tests" / "rules.md").write_text("# evidence\n", encoding="utf-8")
            return {}
        filename, content = documents[agent]
        (target / filename).write_text(content + trace, encoding="utf-8")
        return {}

    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "DEFINITION"
    assert orchestrate_project(tmp_path, "sample", runner)["state"] == "WAITING_FOR_GATE"
    resolve_product_commitment(tmp_path, "sample", "APPROVED", "human", "approved", "catalog", "Catalog")
    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "DEFINED"
    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "ARCHITECTED"
    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "PLANNING"
    assert orchestrate_module_architecture_planning(tmp_path, "sample", "catalog", runner)["current_state"] == "PLANNED"
    create_work_item(project, "catalog", "catalog-rules", "Rules", objective="rules", write_scope=["modules/catalog/applications/rules.py"], dependencies=[], priority="HIGH", definition_of_ready=["ready"], expected_evidence=["modules/catalog/tests/rules.md"], authorization_reference="plan")
    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "IMPLEMENTATION"
    assert dispatch_module_implementation(tmp_path, "sample", "catalog", "catalog-rules", runner)["state"] == "COMPLETED"
    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "VALIDATION"
    assert orchestrate_project(tmp_path, "sample", runner)["current_state"] == "DELIVERY"
    assert orchestrate_project(tmp_path, "sample", runner)["gate_id"] == "DELIVERY_ACCEPTANCE"
    assert resolve_human_gate(tmp_path, "sample", "DELIVERY_ACCEPTANCE", "APPROVED", "human", "accepted")["state"] == "DELIVERED"
