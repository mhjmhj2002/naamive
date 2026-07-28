"""Auditable project orchestration; agents supply evidence, never state changes."""
from __future__ import annotations

import fcntl
import re
from datetime import datetime, timezone
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

import yaml

from .codex_executor import run_codex_agent
from .audit_schema import validate_audit_record
from .evidence import validate_architecture, validate_business_analysis, validate_delivery_plan, validate_module_proposal, validate_requirements, validate_review
from .intake import IntakeError, SLUG_PATTERN
from .project import append_transition_history, migrate_project_status, render_project_status


PROJECT_TRANSITIONS = {
    "ANALYSIS": ("DEFINITION", "INDEPENDENT_REVIEW"),
    "DEFINITION": ("ARCHITECTURE", "HUMAN_DECISION"),
}

# State rules are data, rather than branching spread through CLI commands.  The
# two automatic rounds above deliberately remain a small subset of this model.
PROJECT_STATE_GRAPH = {
    "ANALYSIS": {"DEFINITION", "PAUSED", "CANCELLED"},
    "DEFINITION": {"ARCHITECTURE", "PAUSED", "CANCELLED"},
    "ARCHITECTURE": {"PLANNING", "PAUSED", "CANCELLED"},
    "PLANNING": {"IMPLEMENTATION", "PAUSED", "CANCELLED"},
    "IMPLEMENTATION": {"VALIDATION", "PAUSED", "CANCELLED"},
    "VALIDATION": {"DELIVERY", "IMPLEMENTATION", "PAUSED", "CANCELLED"},
    "DELIVERY": {"DELIVERED", "VALIDATION", "PAUSED", "CANCELLED"},
    "DELIVERED": {"EVOLUTION"},
    "EVOLUTION": {"ANALYSIS", "PLANNING", "PAUSED", "CANCELLED"},
    "PAUSED": set(),  # resumed only through last_active_state below
    "CANCELLED": set(),
}
MODULE_STATE_GRAPH = {
    "IDENTIFIED": {"DEFINED", "PAUSED", "CANCELLED"},
    "DEFINED": {"ARCHITECTED", "PAUSED", "CANCELLED"},
    "ARCHITECTED": {"PLANNED", "PAUSED", "CANCELLED"},
    "PLANNED": {"IMPLEMENTING", "PAUSED", "CANCELLED"},
    "IMPLEMENTING": {"INTEGRATING", "PAUSED", "CANCELLED"},
    "INTEGRATING": {"VALIDATING", "IMPLEMENTING", "PAUSED", "CANCELLED"},
    "VALIDATING": {"READY_FOR_DELIVERY", "IMPLEMENTING", "PAUSED", "CANCELLED"},
    "READY_FOR_DELIVERY": {"DELIVERED", "IMPLEMENTING", "PAUSED", "CANCELLED"},
    "DELIVERED": {"EVOLVING"},
    "EVOLVING": {"DEFINED", "PLANNED", "PAUSED", "CANCELLED"},
    "PAUSED": set(),
    "CANCELLED": set(),
}
FORWARD_GATE = {
    ("project", "ANALYSIS", "DEFINITION"): "INDEPENDENT_REVIEW",
    ("project", "DEFINITION", "ARCHITECTURE"): "HUMAN_DECISION",
    ("project", "ARCHITECTURE", "PLANNING"): "INDEPENDENT_REVIEW",
    ("project", "PLANNING", "IMPLEMENTATION"): "AUTOMATED_EVIDENCE",
    ("project", "IMPLEMENTATION", "VALIDATION"): "AUTOMATED_EVIDENCE",
    ("project", "VALIDATION", "DELIVERY"): "INDEPENDENT_REVIEW",
    ("project", "DELIVERY", "DELIVERED"): "HUMAN_DECISION",
    ("module", "IDENTIFIED", "DEFINED"): "INDEPENDENT_REVIEW",
    ("module", "DEFINED", "ARCHITECTED"): "INDEPENDENT_REVIEW",
    ("module", "ARCHITECTED", "PLANNED"): "INDEPENDENT_REVIEW",
    ("module", "PLANNED", "IMPLEMENTING"): "AUTOMATED_EVIDENCE",
    ("module", "IMPLEMENTING", "INTEGRATING"): "AUTOMATED_EVIDENCE",
    ("module", "INTEGRATING", "VALIDATING"): "AUTOMATED_EVIDENCE",
    ("module", "VALIDATING", "READY_FOR_DELIVERY"): "INDEPENDENT_REVIEW",
    ("module", "READY_FOR_DELIVERY", "DELIVERED"): "AUTOMATED_EVIDENCE",
}
MODULE_PROJECT_ELIGIBILITY = {
    "IDENTIFIED": {"DEFINITION", "ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "DEFINED": {"DEFINITION", "ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "ARCHITECTED": {"ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "PLANNED": {"PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "IMPLEMENTING": {"IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "INTEGRATING": {"IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "VALIDATING": {"IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION"},
    "READY_FOR_DELIVERY": {"VALIDATION", "DELIVERY", "EVOLUTION"},
    "DELIVERED": {"DELIVERY", "DELIVERED", "EVOLUTION"},
    "EVOLVING": {"EVOLUTION"},
}
EXECUTION_STATE_GRAPH = {
    "RECEIVED": {"VALIDATING", "REJECTED"},
    "VALIDATING": {"DISPATCHED", "REJECTED"},
    "DISPATCHED": {"EVIDENCE_REVIEW", "FAILED"},
    "EVIDENCE_REVIEW": {"WAITING_FOR_GATE", "REWORK_REQUIRED", "FAILED"},
    "WAITING_FOR_GATE": {"COMPLETED", "REWORK_REQUIRED", "PAUSED", "CANCELLED"},
    "REWORK_REQUIRED": {"DISPATCHED", "PAUSED", "CANCELLED"},
    "FAILED": {"REWORK_REQUIRED", "PAUSED", "CANCELLED"},
    "PAUSED": {"VALIDATING", "CANCELLED"},
    "COMPLETED": set(), "REJECTED": set(), "CANCELLED": set(),
}
EXECUTION_REQUIRED_FIELDS = {
    "execution_id", "project_id", "scope_type", "current_state", "requested_transition",
    "authorized_work_item", "target_path", "input_artifacts", "required_evidence", "authority_context",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _write_yaml(path: Path, payload: dict[str, object]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(yaml.safe_dump(payload, allow_unicode=True, sort_keys=False), encoding="utf-8")
    return path


def _relative(project: Path, path: Path) -> str:
    return str(path.relative_to(project))


def audit_root(repository_root: Path, project_id: str) -> Path:
    """Runtime audit data belongs to NAAMIVE, never to a disposable product."""
    return repository_root / "naamive" / "registries" / "orchestration" / project_id


def _assert_relative_reference(value: str) -> None:
    candidate = Path(value)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise IntakeError(f"audit references must be relative and contained: {value}")


def _write_immutable(path: Path, payload: dict[str, object], record_type: str) -> Path:
    if path.exists():
        raise IntakeError(f"immutable audit record already exists: {path}")
    return _write_yaml(path, validate_audit_record(payload, record_type))


def _execution_event_path(repository_root: Path, project_id: str, execution_id: str) -> Path:
    event_id = f"{_now().replace(':', '').replace('+', '_').replace('-', '')}-{uuid4().hex}"
    return audit_root(repository_root, project_id) / "executions" / execution_id / "events" / f"{event_id}.yaml"


def _execution_events(repository_root: Path, project_id: str, execution_id: str) -> list[dict[str, object]]:
    directory = audit_root(repository_root, project_id) / "executions" / execution_id / "events"
    events: list[dict[str, object]] = []
    for path in sorted(directory.glob("*.yaml")) if directory.exists() else []:
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            events.append(payload)
    return events


def create_execution(repository_root: Path, payload: dict[str, object]) -> Path:
    """Create an immutable RECEIVED event after validating execution context."""
    missing = sorted(field for field in EXECUTION_REQUIRED_FIELDS if not payload.get(field))
    if missing:
        raise IntakeError(f"execution context is missing: {', '.join(missing)}")
    project_id = str(payload["project_id"])
    execution_id = str(payload["execution_id"])
    if not SLUG_PATTERN.fullmatch(project_id) or not execution_id.strip():
        raise IntakeError("execution project_id or execution_id is invalid")
    if payload["scope_type"] not in {"project", "module"}:
        raise IntakeError("execution scope_type must be project or module")
    if payload["scope_type"] == "module" and not payload.get("module_id"):
        raise IntakeError("module execution requires module_id")
    if payload["scope_type"] == "project" and payload.get("module_id"):
        raise IntakeError("project execution must not contain module_id")
    for reference in [str(payload["target_path"]), *[str(item) for item in payload["input_artifacts"]], *[str(item) for item in payload["required_evidence"]]]:
        _assert_relative_reference(reference)
    if payload["scope_type"] == "module":
        module_id = str(payload["module_id"])
        if not SLUG_PATTERN.fullmatch(module_id):
            raise IntakeError("module execution requires a kebab-case module_id")
        project = repository_root / "projects" / project_id
        module = project / "modules" / module_id
        module_status = _read_module_status(module)
        project_status = migrate_project_status(project)
        if str(module_status["current_state"]) != str(payload["current_state"]):
            raise IntakeError("module execution current_state does not match module status")
        if str(project_status["current_state"]) not in MODULE_PROJECT_ELIGIBILITY.get(str(module_status["current_state"]), set()):
            raise IntakeError("module execution is not compatible with the current project state")
        target = Path(str(payload["target_path"]))
        module_root = Path("modules") / module_id
        if target != module_root and module_root not in target.parents:
            raise IntakeError("module execution target must be under its module")
        work_item = module / "planning" / "work-items" / f"{payload['authorized_work_item']}.md"
        if not work_item.is_file() or work_item_status(project, module_id, str(payload["authorized_work_item"])) not in {"AUTHORIZED", "IN_PROGRESS"}:
            raise IntakeError("module execution requires an existing authorized work item")
    if _execution_events(repository_root, project_id, execution_id):
        raise IntakeError(f"execution already exists: {execution_id}")
    event = dict(payload, state="RECEIVED", occurred_at=_now())
    return _write_immutable(_execution_event_path(repository_root, project_id, execution_id), event, "execution_event")


def advance_execution(repository_root: Path, project_id: str, execution_id: str, to_state: str, **details: object) -> Path:
    """Append one legal execution-state event; terminal executions cannot restart."""
    events = _execution_events(repository_root, project_id, execution_id)
    if not events:
        raise IntakeError(f"execution not found: {execution_id}")
    current = str(events[-1].get("state"))
    if to_state not in EXECUTION_STATE_GRAPH.get(current, set()):
        raise IntakeError(f"invalid execution transition: {current} -> {to_state}")
    event = dict(events[-1])
    event.update(details)
    event.update({"state": to_state, "occurred_at": _now(), "previous_state": current})
    return _write_immutable(_execution_event_path(repository_root, project_id, execution_id), event, "execution_event")


def recover_interrupted_execution(repository_root: Path, project_id: str, execution_id: str, reason: str) -> Path:
    """Close an abandoned active execution without changing project/module state."""
    if not reason.strip():
        raise IntakeError("recovery reason is required")
    events = _execution_events(repository_root, project_id, execution_id)
    if not events:
        raise IntakeError(f"execution not found: {execution_id}")
    current = str(events[-1].get("state"))
    if current == "DISPATCHED" or current == "EVIDENCE_REVIEW":
        advance_execution(repository_root, project_id, execution_id, "FAILED", recovery_reason=reason.strip())
        return advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", recovery_reason=reason.strip())
    if current == "FAILED":
        return advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", recovery_reason=reason.strip())
    raise IntakeError(f"execution cannot be recovered from state: {current}")


@contextmanager
def _scope_lock(repository_root: Path, project_id: str, scope_type: str, module_id: str | None):
    identity = module_id if scope_type == "module" else "project"
    lock_path = audit_root(repository_root, project_id) / "locks" / f"{scope_type}-{identity}.lock"
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with lock_path.open("a+", encoding="utf-8") as handle:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _record_execution(repository_root: Path, project_id: str, payload: dict[str, object]) -> Path:
    """Compatibility wrapper: create or advance an execution event stream."""
    execution_id = str(payload["execution_id"])
    if not _execution_events(repository_root, project_id, execution_id):
        created = create_execution(repository_root, payload)
        target = str(payload.get("state", "RECEIVED"))
        if target == "RECEIVED":
            return created
        if target == "DISPATCHED":
            advance_execution(repository_root, project_id, execution_id, "VALIDATING")
        return advance_execution(repository_root, project_id, execution_id, target)
    events = _execution_events(repository_root, project_id, execution_id)
    target = str(payload.get("state", "RECEIVED"))
    if target == str(events[-1].get("state")):
        return _write_immutable(_execution_event_path(repository_root, project_id, execution_id), dict(payload, occurred_at=_now(), previous_state=target), "execution_event")
    return advance_execution(repository_root, project_id, execution_id, target, **{key: value for key, value in payload.items() if key not in {"state", "execution_id"}})


def _transition(project: Path, status: dict[str, object], to_state: str, actor: str, reason: str, evidence: str, gate: str) -> None:
    previous = str(status["current_state"])
    sequence = int(status.get("transition_sequence", 0)) + 1
    occurred_at = _now()
    status.update({
        "current_state": to_state, "state_category": "active", "transition_sequence": sequence,
        "last_transition_id": f"project-{sequence:04d}", "last_transition_from": previous,
        "last_transition_to": to_state, "last_transition_at": occurred_at,
        "last_transition_actor": actor, "last_transition_reason": reason,
        "last_transition_evidence": evidence, "pending_gate": "none",
    })
    if to_state == "CANCELLED":
        status["cancelled_at"] = occurred_at
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    append_transition_history(project, sequence, occurred_at, previous, to_state, gate, actor, reason, evidence)


def _evidence_files(target: Path) -> list[Path]:
    return [path for path in target.rglob("*") if path.is_file() and path.name != ".gitkeep"]


def _dispatch_analysis_agent(repository_root: Path, project: Path, project_id: str, agent: str, work_item: str, target_rel: str, inputs: list[Path], expected_output: str, agent_runner) -> tuple[str, Path]:
    execution_id = f"execution-{uuid4().hex}"
    context = {
        "execution_id": execution_id, "project_id": project_id, "scope_type": "project", "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md",
        "current_state": str(migrate_project_status(project)["current_state"]), "requested_transition": "evidence-only",
        "agent_id": agent, "authorized_work_item": work_item, "target_path": target_rel,
        "input_artifacts": [str(path.relative_to(project)) for path in inputs], "required_evidence": [expected_output],
        "authority_context": "INDEPENDENT_REVIEW", "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item,
        "allowed_write_paths": [target_rel], "allowed_tools": ["codex"], "allowed_network_targets": [], "credential_scope": "none",
        "action_class": "WRITE", "expected_outputs": [expected_output], "completion_criteria": f"Produce {expected_output}; include headings Execution ID, Escopo, Fonte, Responsável, Data, Premissas and Lacunas, and link the supplied execution_id.",
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    target = project / target_rel
    target.mkdir(parents=True, exist_ok=True)
    try:
        result = agent_runner(repository_root, project_id, agent, work_item, target, inputs, execution_context=context)
    except IntakeError:
        advance_execution(repository_root, project_id, execution_id, "FAILED")
        raise
    advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=[expected_output])
    return execution_id, target / Path(expected_output).name


def _dispatch_project_round(repository_root: Path, project: Path, project_id: str, state: str, agent: str, work_item: str, target_rel: str, inputs: list[Path], expected_output: str, agent_runner) -> tuple[str, Path]:
    """Dispatch a non-analysis project round with a fully auditable context."""
    execution_id = f"execution-{uuid4().hex}"
    context = {
        "execution_id": execution_id, "project_id": project_id, "scope_type": "project", "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md",
        "current_state": state, "requested_transition": "evidence-only", "agent_id": agent,
        "authorized_work_item": work_item, "target_path": target_rel,
        "input_artifacts": [str(path.relative_to(project)) for path in inputs], "required_evidence": [expected_output],
        "authority_context": "INDEPENDENT_REVIEW", "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item,
        "allowed_write_paths": [target_rel], "allowed_tools": ["codex"], "allowed_network_targets": [], "credential_scope": "none",
        "action_class": "WRITE", "expected_outputs": [expected_output],
        "completion_criteria": f"Produce {expected_output} with complete traceability and the supplied execution_id.",
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    target = project / target_rel
    target.mkdir(parents=True, exist_ok=True)
    try:
        result = agent_runner(repository_root, project_id, agent, work_item, target, inputs, execution_context=context)
    except IntakeError:
        advance_execution(repository_root, project_id, execution_id, "FAILED")
        raise
    advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=[expected_output])
    return execution_id, target / Path(expected_output).name


def _orchestrate_architecture_planning(repository_root: Path, project: Path, project_id: str, status: dict[str, object], agent_runner) -> dict[str, object]:
    state = str(status["current_state"])
    if state == "ARCHITECTURE":
        inputs = [project / "need" / "BUSINESS_NEED.md", project / "analysis" / "requirements" / "REQUIREMENTS.md"]
        execution_id, architecture = _dispatch_project_round(repository_root, project, project_id, state, "solution-architecture", "define-solution-architecture", "architecture", inputs, "architecture/SOLUTION_ARCHITECTURE.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, execution_id, validate_architecture, project, execution_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": execution_id, "error": error}
        review_id, review = _dispatch_project_round(repository_root, project, project_id, state, "governance-assurance", "review-solution-architecture", "architecture/reviews", [architecture], "architecture/reviews/REVIEW.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, review_id, validate_review, review, review_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": error}
        apply_state_transition(repository_root, project_id, "PLANNING", actor="governance-assurance", reason="Independent review approved solution architecture.", evidence=[str(architecture.relative_to(project)), str(review.relative_to(project))], control_type="INDEPENDENT_REVIEW", execution_id=review_id, expected_state="ARCHITECTURE", idempotency_key=f"architecture-planning-{execution_id}")
        advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
        advance_execution(repository_root, project_id, execution_id, "COMPLETED")
        advance_execution(repository_root, project_id, review_id, "WAITING_FOR_GATE")
        advance_execution(repository_root, project_id, review_id, "COMPLETED")
        return {"project_id": project_id, "current_state": "PLANNING", "state": "COMPLETED", "architecture_execution": execution_id, "review_execution": review_id}
    inputs = [project / "architecture" / "SOLUTION_ARCHITECTURE.md", project / "analysis" / "requirements" / "REQUIREMENTS.md"]
    execution_id, plan = _dispatch_project_round(repository_root, project, project_id, state, "delivery-planning", "prepare-delivery-plan", "planning", inputs, "planning/DELIVERY_PLAN.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, execution_id, validate_delivery_plan, project, execution_id)
    if error:
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": execution_id, "error": error}
    review_id, review = _dispatch_project_round(repository_root, project, project_id, state, "governance-assurance", "review-delivery-plan", "planning/reviews", [plan], "planning/reviews/REVIEW.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, review_id, validate_review, review, review_id)
    if error:
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": error}
    # Implementation is intentionally not entered until module work items are authorized.
    modules = [path for path in (project / "modules").glob("*") if path.is_dir()] if (project / "modules").is_dir() else []
    authorized = [item for module in modules for item in (module / "planning" / "work-items").glob("*.md") if work_item_status(project, module.name, item.stem) == "AUTHORIZED"]
    if not authorized:
        advance_execution(repository_root, project_id, review_id, "REWORK_REQUIRED", validation_error="planning has no authorized module work items")
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": "planning has no authorized module work items"}
    unresolved = [f"{item.parents[2].name}/{item.stem}: {', '.join(unresolved_work_item_dependencies(project, item.parents[2].name, item.stem))}" for item in authorized if unresolved_work_item_dependencies(project, item.parents[2].name, item.stem)]
    if unresolved:
        advance_execution(repository_root, project_id, review_id, "REWORK_REQUIRED", validation_error="unresolved work item dependencies")
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": f"unresolved work item dependencies: {'; '.join(unresolved)}"}
    apply_state_transition(repository_root, project_id, "IMPLEMENTATION", actor="governance-assurance", reason="Independent review approved delivery plan and authorized work items exist.", evidence=[str(plan.relative_to(project)), str(review.relative_to(project)), *[str(item.relative_to(project)) for item in authorized]], control_type="AUTOMATED_EVIDENCE", execution_id=review_id, expected_state="PLANNING", idempotency_key=f"planning-implementation-{execution_id}")
    for identifier in (execution_id, review_id):
        advance_execution(repository_root, project_id, identifier, "WAITING_FOR_GATE")
        advance_execution(repository_root, project_id, identifier, "COMPLETED")
    return {"project_id": project_id, "current_state": "IMPLEMENTATION", "state": "COMPLETED", "planning_execution": execution_id, "review_execution": review_id}


def _validate_round_evidence(repository_root: Path, project_id: str, execution_id: str, validator, *arguments) -> str | None:
    try:
        validator(*arguments)
        return None
    except IntakeError as error:
        advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", validation_error=str(error))
        return str(error)


def _open_product_commitment_gate(repository_root: Path, project: Path, project_id: str, execution_id: str, evidence: list[str]) -> Path:
    request_id = f"transition-{uuid4().hex}"
    request = _write_immutable(audit_root(repository_root, project_id) / "transition-requests" / f"{request_id}.yaml", {
        "transition_request_id": request_id, "execution_id": execution_id, "scope_type": "project", "project_id": project_id,
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "from_state": "DEFINITION", "to_state": "ARCHITECTURE",
        "trigger": "definition evidence reviewed", "evidence": evidence, "required_gate": "HUMAN_DECISION", "requested_by": "governance-assurance", "requested_at": _now(),
    }, "transition_request")
    status = migrate_project_status(project)
    status["pending_gate"] = "PRODUCT_COMMITMENT"
    status["pending_transition_request"] = str(request.relative_to(repository_root))
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    return request


def open_human_gate(repository_root: Path, project_id: str, gate_id: str, to_state: str, rationale: str, evidence: list[str], actor: str = "human-cli") -> Path:
    """Open a human gate for one valid project transition without applying it."""
    allowed_targets = {
        "MATERIAL_ARCHITECTURE_DECISION": {("ARCHITECTURE", "PLANNING")},
        "RESIDUAL_RISK_ACCEPTANCE": {("VALIDATION", "DELIVERY")},
        "DELIVERY_ACCEPTANCE": {("DELIVERY", "DELIVERED")},
    }
    if gate_id not in {*allowed_targets, "PAUSE"}:
        raise IntakeError(f"unsupported human gate: {gate_id}")
    project = repository_root / "projects" / project_id
    status = migrate_project_status(project)
    current = str(status["current_state"])
    if status.get("pending_gate") not in (None, "", "none"):
        raise IntakeError("project already has a pending gate")
    if to_state not in PROJECT_STATE_GRAPH.get(current, set()) or not rationale.strip() or not evidence:
        raise IntakeError("gate target, rationale or evidence is invalid")
    if gate_id == "PAUSE" and to_state != "PAUSED":
        raise IntakeError("PAUSE gate can target only PAUSED")
    if gate_id in allowed_targets and (current, to_state) not in allowed_targets[gate_id]:
        raise IntakeError(f"gate {gate_id} is not applicable to {current} -> {to_state}")
    request_id = f"transition-{uuid4().hex}"
    request = _write_immutable(audit_root(repository_root, project_id) / "transition-requests" / f"{request_id}.yaml", {
        "transition_request_id": request_id, "execution_id": "human-gate-request", "scope_type": "project", "project_id": project_id,
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "from_state": current, "to_state": to_state,
        "trigger": rationale.strip(), "evidence": evidence, "required_gate": "HUMAN_DECISION", "requested_by": actor, "requested_at": _now(),
    }, "transition_request")
    status["pending_gate"] = gate_id
    status["pending_transition_request"] = str(request.relative_to(repository_root))
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    return request


def resolve_human_gate(repository_root: Path, project_id: str, gate_id: str, decision: str, actor: str, rationale: str) -> dict[str, object]:
    """Resolve a pending generic human gate, rejecting stale or mismatched requests."""
    if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"} or not rationale.strip():
        raise IntakeError("valid decision and rationale are required")
    with _scope_lock(repository_root, project_id, "project", None):
        project = repository_root / "projects" / project_id
        status = migrate_project_status(project)
        if status.get("pending_gate") != gate_id:
            raise IntakeError(f"project is not waiting for gate: {gate_id}")
        reference = status.get("pending_transition_request")
        request_path = repository_root / str(reference) if isinstance(reference, str) else None
        request = yaml.safe_load(request_path.read_text(encoding="utf-8")) if request_path and request_path.is_file() else None
        if not isinstance(request, dict) or request.get("from_state") != status.get("current_state"):
            raise IntakeError("pending gate transition request is invalid or obsolete")
        decision_id = f"gate-{uuid4().hex}"
        decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
            "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": gate_id,
            "decision": decision, "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "human gate decision",
            "evidence_reviewed": list(request.get("evidence", [])), "rationale": rationale.strip(), "decided_at": _now(),
        }, "gate_decision")
        status.pop("pending_transition_request", None)
        if decision == "APPROVED":
            _transition(project, status, str(request["to_state"]), actor, rationale.strip(), str(decision_path.relative_to(repository_root)), "HUMAN_DECISION")
        else:
            status["pending_gate"] = "none"
            status["next_action"] = "Submit a new proposal." if decision == "REJECTED" else "Address the recorded decision rationale and submit a new proposal."
            status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
            (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
        return {"project_id": project_id, "gate_id": gate_id, "state": str(request["to_state"]) if decision == "APPROVED" else decision, "decision_path": str(decision_path)}


def resolve_product_commitment(repository_root: Path, project_id: str, decision: str, actor: str, rationale: str, module_id: str | None = None, module_title: str | None = None) -> dict[str, object]:
    if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"} or not rationale.strip():
        raise IntakeError("valid decision and rationale are required")
    if decision == "APPROVED" and (not module_id or not module_title):
        raise IntakeError("module_id and module_title are required to approve PRODUCT_COMMITMENT")
    project = repository_root / "projects" / project_id
    status = migrate_project_status(project)
    if status.get("current_state") != "DEFINITION" or status.get("pending_gate") != "PRODUCT_COMMITMENT":
        raise IntakeError("project must be in DEFINITION waiting for PRODUCT_COMMITMENT")
    reference = status.get("pending_transition_request")
    if not isinstance(reference, str):
        raise IntakeError("pending PRODUCT_COMMITMENT has no transition request")
    request_path = repository_root / reference
    request = yaml.safe_load(request_path.read_text(encoding="utf-8")) if request_path.is_file() else None
    if not isinstance(request, dict) or request.get("from_state") != "DEFINITION" or request.get("to_state") != "ARCHITECTURE":
        raise IntakeError("pending PRODUCT_COMMITMENT transition request is invalid or obsolete")
    decision_id = f"gate-{uuid4().hex}"
    decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
        "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": "PRODUCT_COMMITMENT",
        "decision": decision, "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "human product commitment",
        "evidence_reviewed": list(request.get("evidence", [])), "rationale": rationale.strip(), "decided_at": _now(),
    }, "gate_decision")
    if decision != "APPROVED":
        status["pending_gate"] = "none"
        status.pop("pending_transition_request", None)
        status["next_action"] = "Submit a new product proposal." if decision == "REJECTED" else "Address the recorded product commitment rationale and submit a new proposal."
        status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
        (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
        return {"project_id": project_id, "state": decision, "gate_id": "PRODUCT_COMMITMENT", "decision_path": str(decision_path)}
    module = materialize_module(project, module_id, module_title, str(decision_path.relative_to(repository_root)))
    status.pop("pending_transition_request", None)
    _transition(project, status, "ARCHITECTURE", actor, rationale.strip(), str(decision_path.relative_to(repository_root)), "HUMAN_DECISION")
    return {"project_id": project_id, "module_id": module_id, "module_path": str(module), "state": "ARCHITECTURE", "decision_path": str(decision_path)}


def _orchestrate_analysis_definition(repository_root: Path, project: Path, project_id: str, status: dict[str, object], agent_runner) -> dict[str, object]:
    state = str(status["current_state"])
    need = project / "need" / "BUSINESS_NEED.md"
    if state == "ANALYSIS":
        business_execution, business_path = _dispatch_analysis_agent(repository_root, project, project_id, "business-analysis", "analyze-business-need", "analysis/business", [need], "analysis/business/BUSINESS_ANALYSIS.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, business_execution, validate_business_analysis, project, business_execution)
        if error:
            return {"project_id": project_id, "current_state": "ANALYSIS", "state": "REWORK_REQUIRED", "execution_id": business_execution, "error": error}
        review_execution, review_path = _dispatch_analysis_agent(repository_root, project, project_id, "governance-assurance", "review-business-analysis", "analysis/reviews/business", [business_path], "analysis/reviews/business/REVIEW.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, review_execution, validate_review, review_path, review_execution)
        if error:
            return {"project_id": project_id, "current_state": "ANALYSIS", "state": "REWORK_REQUIRED", "execution_id": review_execution, "error": error}
        advance_execution(repository_root, project_id, review_execution, "WAITING_FOR_GATE")
        request = apply_state_transition(repository_root, project_id, "DEFINITION", actor="governance-assurance", reason="Independent review approved business analysis.", evidence=[str(business_path.relative_to(project)), str(review_path.relative_to(project))], control_type="INDEPENDENT_REVIEW", execution_id=review_execution, expected_state="ANALYSIS", idempotency_key=f"analysis-definition-{business_execution}")
        advance_execution(repository_root, project_id, review_execution, "COMPLETED")
        return {"project_id": project_id, "current_state": "DEFINITION", "state": "COMPLETED", "transition_request": str(request.relative_to(repository_root))}
    domain_execution, domain_path = _dispatch_analysis_agent(repository_root, project, project_id, "domain-modeling", "propose-business-modules", "analysis/domain", [need], "analysis/domain/MODULE_PROPOSAL.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, domain_execution, validate_module_proposal, project, domain_execution)
    if error:
        return {"project_id": project_id, "current_state": "DEFINITION", "state": "REWORK_REQUIRED", "execution_id": domain_execution, "error": error}
    requirements_execution, requirements_path = _dispatch_analysis_agent(repository_root, project, project_id, "requirements-engineering", "define-requirements", "analysis/requirements", [need, domain_path], "analysis/requirements/REQUIREMENTS.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, requirements_execution, validate_requirements, project, requirements_execution)
    if error:
        return {"project_id": project_id, "current_state": "DEFINITION", "state": "REWORK_REQUIRED", "execution_id": requirements_execution, "error": error}
    review_execution, review_path = _dispatch_analysis_agent(repository_root, project, project_id, "governance-assurance", "review-definition", "analysis/reviews/definition", [domain_path, requirements_path], "analysis/reviews/definition/REVIEW.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, review_execution, validate_review, review_path, review_execution)
    if error:
        return {"project_id": project_id, "current_state": "DEFINITION", "state": "REWORK_REQUIRED", "execution_id": review_execution, "error": error}
    _open_product_commitment_gate(repository_root, project, project_id, review_execution, [str(domain_path.relative_to(project)), str(requirements_path.relative_to(project)), str(review_path.relative_to(project))])
    advance_execution(repository_root, project_id, review_execution, "WAITING_FOR_GATE")
    return {"project_id": project_id, "current_state": "DEFINITION", "state": "WAITING_FOR_GATE", "gate_id": "PRODUCT_COMMITMENT", "definition_executions": [domain_execution, requirements_execution, review_execution]}


def orchestrate_project(repository_root: Path, project_id: str, agent_runner=run_codex_agent) -> dict[str, object]:
    project = repository_root / "projects" / project_id
    if not project.is_dir():
        raise IntakeError(f"project not found: {project}")
    status = migrate_project_status(project)
    state = str(status["current_state"])
    if state in {"CANCELLED", "DELIVERED"}:
        return {"project_id": project_id, "current_state": state, "state": state}
    if status.get("pending_gate") not in (None, "", "none"):
        return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": status["pending_gate"]}
    if state in {"ANALYSIS", "DEFINITION"}:
        return _orchestrate_analysis_definition(repository_root, project, project_id, status, agent_runner)
    if state in {"ARCHITECTURE", "PLANNING"}:
        return _orchestrate_architecture_planning(repository_root, project, project_id, status, agent_runner)
    if state not in PROJECT_TRANSITIONS:
        return {"project_id": project_id, "current_state": state, "state": "PROJECT_EXECUTION_PENDING", "reason": "no automated project round is configured for this state"}

    to_state, control = PROJECT_TRANSITIONS[state]
    agent, target_rel, work_item = (
        ("business-analysis", "analysis/business", "analyze-business-need") if state == "ANALYSIS"
        else ("domain-modeling", "analysis/domain", "propose-business-modules")
    )
    target = project / target_rel
    execution_id = f"execution-{uuid4().hex}"
    execution = {"execution_id": execution_id, "project_id": project_id, "scope_type": "project", "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "current_state": state,
                 "requested_transition": f"{state}->{to_state}", "agent_id": agent, "authorized_work_item": work_item,
                 "target_path": target_rel, "input_artifacts": ["need/BUSINESS_NEED.md"], "required_evidence": [target_rel],
                 "authority_context": control, "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item,
                 "allowed_write_paths": [target_rel], "allowed_tools": ["codex"], "allowed_network_targets": [],
                 "credential_scope": "none", "action_class": "WRITE", "expected_outputs": [target_rel],
                 "completion_criteria": "At least one business evidence document exists in the authorized target.",
                 "state": "DISPATCHED", "started_at": _now()}
    execution_path = _record_execution(repository_root, project_id, execution)
    try:
        result = run_codex_agent(repository_root, project_id, agent, work_item, target, [project / "need" / "BUSINESS_NEED.md"], execution_context=execution)
    except IntakeError as error:
        execution.update({"state": "FAILED", "completed_at": _now(), "error": str(error)})
        _record_execution(repository_root, project_id, execution)
        raise
    evidence = [_relative(project, item) for item in _evidence_files(target) if item.name != "EXECUTION_CONTEXT_VALIDATION.md"]
    if not evidence:
        execution.update({"state": "REWORK_REQUIRED", "completed_at": _now(), "error": "agent produced no evidence in authorized target"})
        _record_execution(repository_root, project_id, execution)
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_path": str(execution_path)}
    request_id = f"transition-{uuid4().hex}"
    request_path = _write_yaml(audit_root(repository_root, project_id) / "transition-requests" / f"{request_id}.yaml", {
        "transition_request_id": request_id, "execution_id": execution_id, "scope_type": "project", "project_id": project_id,
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "from_state": state, "to_state": to_state,
        "trigger": work_item, "evidence": evidence, "required_gate": control, "requested_by": agent, "requested_at": _now(),
    })
    execution.update({"state": "EVIDENCE_REVIEW", "completed_at": _now(), "agent_result": result, "evidence": evidence,
                      "transition_request": str(request_path.relative_to(repository_root))})
    if control == "HUMAN_DECISION":
        status["pending_gate"] = "PRODUCT_COMMITMENT"
        (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
        execution["state"] = "WAITING_FOR_GATE"
        _record_execution(repository_root, project_id, execution)
        return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": "PRODUCT_COMMITMENT", "execution_path": str(execution_path)}
    execution["state"] = "WAITING_FOR_GATE"
    _record_execution(repository_root, project_id, execution)
    decision_id = f"gate-{uuid4().hex}"
    decision_path = _write_yaml(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
        "gate_decision_id": decision_id, "transition_request_id": request_id, "gate_id": f"{state}_TO_{to_state}", "decision": "APPROVED",
        "control_type": control, "decided_by": "naamive-runtime-evidence-review", "authority_basis": "PROJECT_LIFECYCLE.md",
        "evidence_reviewed": evidence, "rationale": "Required evidence exists in the authorized project path.", "decided_at": _now(),
    })
    _transition(project, status, to_state, "naamive-runtime-evidence-review", "Independent evidence review approved.", str(decision_path.relative_to(repository_root)), control)
    execution["state"] = "COMPLETED"
    _record_execution(repository_root, project_id, execution)
    return {"project_id": project_id, "current_state": to_state, "state": "COMPLETED", "execution_path": str(execution_path)}


MODULE_DIRECTORIES = (
    "need", "domain", "requirements", "planning/work-items", "architecture", "state-machine",
    "applications", "tests", "evidence", "documentation", "delivery",
)
WORK_ITEM_STATUSES = {"AUTHORIZED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"}
WORK_ITEM_DEPENDENCY = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*/[a-z0-9]+(?:-[a-z0-9]+)*$")


def materialize_module(project: Path, module_id: str, title: str, authorization_reference: str = "PRODUCT_COMMITMENT") -> Path:
    if not SLUG_PATTERN.fullmatch(module_id):
        raise IntakeError("module_id must use kebab-case")
    destination = project / "modules" / module_id
    if destination.exists():
        raise IntakeError(f"module already exists: {destination}")
    if not title.strip() or not authorization_reference.strip():
        raise IntakeError("module title and authorization reference are required")
    destination.mkdir(parents=True)
    for directory in MODULE_DIRECTORIES:
        (destination / directory).mkdir(parents=True, exist_ok=True)
    occurred_at = _now()
    status = {
        "format_version": 2, "scope_type": "module", "project_id": project.name, "module_id": module_id,
        "current_state": "IDENTIFIED", "state_category": "active", "state_machine": "naamive/orchestration/MODULE_LIFECYCLE.md",
        "transition_sequence": 1, "last_transition_id": "module-0001", "last_transition_from": "UNMATERIALIZED",
        "last_transition_to": "IDENTIFIED", "last_transition_at": occurred_at, "last_transition_actor": "human-cli",
        "last_transition_reason": "Módulo materializado após compromisso de produto.", "last_transition_evidence": authorization_reference,
        "pending_gate": "none", "history_path": "STATUS_HISTORY.md",
    }
    (destination / "STATUS.md").write_text(_render_module_status(status), encoding="utf-8")
    (destination / "MODULE.md").write_text(f"# {title}\n\n**Module ID:** `{module_id}`\n\nCapacidade de negócio aprovada no gate de compromisso de produto.\n", encoding="utf-8")
    (destination / "STATUS_HISTORY.md").write_text(f"# Histórico de Transições — {module_id}\n\n| # | Quando (UTC) | De | Para | Tipo | Responsável | Justificativa | Evidência |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| 1 | {occurred_at} | UNMATERIALIZED | IDENTIFIED | HUMAN_DECISION | human-cli | Módulo materializado após compromisso de produto. | `{authorization_reference}` |\n", encoding="utf-8")
    return destination


def create_work_item(project: Path, module_id: str, work_item_id: str, title: str, *, objective: str, write_scope: list[str], dependencies: list[str], priority: str, definition_of_ready: list[str], expected_evidence: list[str], authorization_reference: str) -> Path:
    if not SLUG_PATTERN.fullmatch(work_item_id):
        raise IntakeError("work_item_id must use kebab-case")
    module = project / "modules" / module_id
    if not module.is_dir():
        raise IntakeError(f"module not found: {module_id}")
    module_status = _read_module_status(module)
    if str(module_status["current_state"]) not in {"ARCHITECTED", "PLANNED"}:
        raise IntakeError("work items can be created only during module planning")
    if not all((title.strip(), objective.strip(), priority.strip(), authorization_reference.strip())) or not write_scope or not definition_of_ready or not expected_evidence:
        raise IntakeError("work item requires objective, write scope, priority, ready criteria, expected evidence and authorization")
    for item in [*write_scope, *expected_evidence]:
        _assert_relative_reference(item)
        parts = Path(item).parts
        if parts and parts[0] == "modules" and (len(parts) < 2 or parts[1] != module_id):
            raise IntakeError("work item cannot authorize writes to another module")
    for dependency in dependencies:
        if not WORK_ITEM_DEPENDENCY.fullmatch(dependency):
            raise IntakeError("work item dependencies must use module-id/work-item-id")
    path = module / "planning" / "work-items" / f"{work_item_id}.md"
    if path.exists():
        raise IntakeError(f"work item already exists: {work_item_id}")
    def bullets(items: list[str]) -> str:
        return "\n".join(f"- `{item}`" for item in items)
    path.write_text(
        f"# {title}\n\n**Work item ID:** `{work_item_id}`\n**Module:** `{module_id}`\n**Status:** `AUTHORIZED`\n**Priority:** `{priority}`\n**Authorized by:** `{authorization_reference}`\n\n"
        f"## Objective\n\n{objective.strip()}\n\n## Write scope\n\n{bullets(write_scope)}\n\n## Dependencies\n\n{bullets(dependencies) if dependencies else '- None'}\n\n"
        f"## Definition of ready\n\n{bullets(definition_of_ready)}\n\n## Expected evidence\n\n{bullets(expected_evidence)}\n",
        encoding="utf-8",
    )
    return path


def _work_item_path(project: Path, module_id: str, work_item_id: str) -> Path:
    if not SLUG_PATTERN.fullmatch(module_id) or not SLUG_PATTERN.fullmatch(work_item_id):
        raise IntakeError("work item module and identifier must use kebab-case")
    path = project / "modules" / module_id / "planning" / "work-items" / f"{work_item_id}.md"
    if not path.is_file():
        raise IntakeError(f"work item not found: {module_id}/{work_item_id}")
    return path


def work_item_status(project: Path, module_id: str, work_item_id: str) -> str:
    content = _work_item_path(project, module_id, work_item_id).read_text(encoding="utf-8")
    match = re.search(r"^\*\*Status:\*\* `([A-Z_]+)`$", content, re.MULTILINE)
    if not match or match.group(1) not in WORK_ITEM_STATUSES:
        raise IntakeError(f"work item has invalid status: {module_id}/{work_item_id}")
    return match.group(1)


def work_item_dependencies(project: Path, module_id: str, work_item_id: str) -> list[str]:
    content = _work_item_path(project, module_id, work_item_id).read_text(encoding="utf-8")
    match = re.search(r"## Dependencies\n\n(.*?)(?:\n\n## |\Z)", content, re.DOTALL)
    if not match or match.group(1).strip() == "- None":
        return []
    dependencies = re.findall(r"^- `([^`]+)`$", match.group(1), re.MULTILINE)
    if not dependencies or any(not WORK_ITEM_DEPENDENCY.fullmatch(item) for item in dependencies):
        raise IntakeError(f"work item has invalid dependencies: {module_id}/{work_item_id}")
    return dependencies


def set_work_item_status(project: Path, module_id: str, work_item_id: str, status: str) -> Path:
    """Apply the small, explicit lifecycle used to unblock implementation work."""
    if status not in WORK_ITEM_STATUSES:
        raise IntakeError("work item status is invalid")
    path = _work_item_path(project, module_id, work_item_id)
    previous = work_item_status(project, module_id, work_item_id)
    allowed = {
        "AUTHORIZED": {"IN_PROGRESS", "BLOCKED", "CANCELLED"},
        "IN_PROGRESS": {"BLOCKED", "COMPLETED", "CANCELLED"},
        "BLOCKED": {"AUTHORIZED", "CANCELLED"},
        "COMPLETED": set(), "CANCELLED": set(),
    }
    if status not in allowed[previous]:
        raise IntakeError(f"invalid work item transition: {previous} -> {status}")
    path.write_text(path.read_text(encoding="utf-8").replace(f"**Status:** `{previous}`", f"**Status:** `{status}`", 1), encoding="utf-8")
    return path


def unresolved_work_item_dependencies(project: Path, module_id: str, work_item_id: str) -> list[str]:
    unresolved: list[str] = []
    for dependency in work_item_dependencies(project, module_id, work_item_id):
        dependency_module, dependency_item = dependency.split("/", 1)
        if work_item_status(project, dependency_module, dependency_item) != "COMPLETED":
            unresolved.append(dependency)
    return unresolved


def _work_item_list(path: Path, heading: str) -> list[str]:
    content = path.read_text(encoding="utf-8")
    match = re.search(rf"## {re.escape(heading)}\n\n(.*?)(?:\n\n## |\Z)", content, re.DOTALL)
    if not match:
        raise IntakeError(f"work item is missing {heading.lower()}")
    return re.findall(r"^- `([^`]+)`$", match.group(1), re.MULTILINE)


def dispatch_module_implementation(repository_root: Path, project_id: str, module_id: str, work_item_id: str, agent_runner=run_codex_agent) -> dict[str, object]:
    """Dispatch one eligible module item and complete it only with verified evidence."""
    project = repository_root / "projects" / project_id
    if str(migrate_project_status(project)["current_state"]) != "IMPLEMENTATION":
        raise IntakeError("implementation dispatch requires project state IMPLEMENTATION")
    module = project / "modules" / module_id
    if str(_read_module_status(module)["current_state"]) != "PLANNED":
        raise IntakeError("implementation dispatch requires module state PLANNED")
    if work_item_status(project, module_id, work_item_id) != "AUTHORIZED":
        raise IntakeError("implementation dispatch requires an AUTHORIZED work item")
    unresolved = unresolved_work_item_dependencies(project, module_id, work_item_id)
    if unresolved:
        set_work_item_status(project, module_id, work_item_id, "BLOCKED")
        return {"project_id": project_id, "module_id": module_id, "work_item_id": work_item_id, "state": "BLOCKED", "dependencies": unresolved}
    item_path = _work_item_path(project, module_id, work_item_id)
    write_scope = _work_item_list(item_path, "Write scope")
    expected_evidence = _work_item_list(item_path, "Expected evidence")
    if not write_scope or not expected_evidence:
        raise IntakeError("implementation work item requires write scope and expected evidence")
    apply_state_transition(repository_root, project_id, "IMPLEMENTING", scope_type="module", module_id=module_id, actor="naamive-runtime", reason="Authorized implementation work item is eligible.", evidence=[str(item_path.relative_to(project))], control_type="AUTOMATED_EVIDENCE", expected_state="PLANNED", idempotency_key=f"implementing-{module_id}-{work_item_id}")
    set_work_item_status(project, module_id, work_item_id, "IN_PROGRESS")
    execution_id = f"execution-{uuid4().hex}"
    context = {
        "execution_id": execution_id, "project_id": project_id, "scope_type": "module", "module_id": module_id,
        "state_machine": "naamive/orchestration/MODULE_LIFECYCLE.md", "current_state": "IMPLEMENTING", "requested_transition": "evidence-only",
        "agent_id": "implementation", "authorized_work_item": work_item_id, "target_path": f"modules/{module_id}",
        "input_artifacts": [str(item_path.relative_to(project))], "required_evidence": expected_evidence, "authority_context": "AUTOMATED_EVIDENCE",
        "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item_id, "allowed_write_paths": [*write_scope, *expected_evidence],
        "allowed_tools": ["codex", "git"], "allowed_network_targets": [], "credential_scope": "none", "action_class": "IMPLEMENTATION",
        "authorized_base_ref": "main", "expected_outputs": expected_evidence, "completion_criteria": "Create the expected evidence, pass validations, and create a scoped atomic commit.",
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    try:
        result = agent_runner(repository_root, project_id, "implementation", work_item_id, module, [item_path], execution_context=context)
    except IntakeError:
        set_work_item_status(project, module_id, work_item_id, "BLOCKED")
        advance_execution(repository_root, project_id, execution_id, "FAILED")
        raise
    missing = [evidence for evidence in expected_evidence if not (project / evidence).is_file()]
    if missing:
        set_work_item_status(project, module_id, work_item_id, "BLOCKED")
        advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW")
        advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", validation_error=f"missing expected evidence: {', '.join(missing)}")
        return {"project_id": project_id, "module_id": module_id, "work_item_id": work_item_id, "state": "REWORK_REQUIRED", "missing_evidence": missing}
    advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=expected_evidence)
    advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
    set_work_item_status(project, module_id, work_item_id, "COMPLETED")
    advance_execution(repository_root, project_id, execution_id, "COMPLETED")
    return {"project_id": project_id, "module_id": module_id, "work_item_id": work_item_id, "state": "COMPLETED", "execution_id": execution_id, "evidence": expected_evidence, "agent_result": result}


def register_module_consumption(repository_root: Path, consumer_project_id: str, consumer_module_id: str, provider_project_id: str, provider_module_id: str, contract_reference: str, compatible_version: str, business_purpose: str, integration_owner: str, impact_and_risk: str) -> Path:
    """Record a consumer-owned contract reference without granting provider writes."""
    required = [contract_reference, compatible_version, business_purpose, integration_owner, impact_and_risk]
    if consumer_project_id == provider_project_id and consumer_module_id == provider_module_id:
        raise IntakeError("a module cannot consume itself")
    if not all(value.strip() for value in required):
        raise IntakeError("module consumption requires all contract fields")
    consumer = repository_root / "projects" / consumer_project_id / "modules" / consumer_module_id
    provider = repository_root / "projects" / provider_project_id / "modules" / provider_module_id
    _read_module_status(consumer)
    _read_module_status(provider)
    _assert_relative_reference(contract_reference)
    reference = Path(contract_reference)
    provider_root = Path("modules") / provider_module_id
    if reference != provider_root and provider_root not in reference.parents:
        raise IntakeError("contract reference must remain under the provider module")
    record = consumer / "architecture" / "module-consumption" / f"{provider_project_id}-{provider_module_id}.yaml"
    if record.exists():
        raise IntakeError("module consumption is already registered")
    return _write_yaml(record, {
        "consumer_project_id": consumer_project_id, "consumer_module_id": consumer_module_id,
        "provider_project_id": provider_project_id, "provider_module_id": provider_module_id,
        "contract_reference": contract_reference, "compatible_version": compatible_version,
        "business_purpose": business_purpose, "integration_owner": integration_owner,
        "impact_and_risk": impact_and_risk, "recorded_at": _now(),
    })


def _read_module_status(module_path: Path) -> dict[str, object]:
    status_path = module_path / "STATUS.md"
    if not status_path.is_file():
        raise IntakeError(f"module status not found: {status_path}")
    document = status_path.read_text(encoding="utf-8")
    if not document.startswith("---\n") or "\n---\n" not in document:
        raise IntakeError("module status must contain YAML front matter")
    metadata, _ = document[4:].split("\n---\n", 1)
    status = yaml.safe_load(metadata)
    if not isinstance(status, dict) or status.get("scope_type") != "module":
        raise IntakeError("module status must be a module YAML mapping")
    if status.get("module_id") != module_path.name or not isinstance(status.get("current_state"), str):
        raise IntakeError("module status identity or current_state is invalid")
    return status


def _render_module_status(status: dict[str, object]) -> str:
    state = str(status["current_state"])
    category = "terminal" if state in {"CANCELLED", "DELIVERED"} else "paused" if state == "PAUSED" else "active"
    payload = dict(status, format_version=2, state_category=category, history_path="STATUS_HISTORY.md")
    serialized = yaml.safe_dump(payload, allow_unicode=True, sort_keys=False).strip()
    return f"---\n{serialized}\n---\n\n# Status do Módulo — {payload['module_id']}\n\n## Estado atual\n\n**{state}** · {category}\n\n## Gate pendente\n\n{payload.get('pending_gate', 'none')}\n"


def _append_module_history(module_path: Path, sequence: int, occurred_at: str, from_state: str, to_state: str, control: str, actor: str, reason: str, evidence: str) -> None:
    history = module_path / "STATUS_HISTORY.md"
    if not history.exists():
        history.write_text(f"# Histórico de Transições — {module_path.name}\n\n| # | Quando (UTC) | De | Para | Tipo | Responsável | Justificativa | Evidência |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n", encoding="utf-8")
    safe_reason = reason.replace("|", "\\|")
    with history.open("a", encoding="utf-8") as handle:
        handle.write(f"| {sequence} | {occurred_at} | {from_state} | {to_state} | {control} | {actor} | {safe_reason} | `{evidence}` |\n")


def _apply_state_transition_locked(
    repository_root: Path,
    project_id: str,
    to_state: str,
    *,
    scope_type: str = "project",
    module_id: str | None = None,
    actor: str,
    reason: str,
    evidence: list[str],
    control_type: str,
    execution_id: str | None = None,
    expected_state: str | None = None,
    idempotency_key: str | None = None,
) -> Path:
    """Validate and apply one state transition with immutable central audit records."""
    if scope_type not in {"project", "module"} or not reason.strip() or not evidence:
        raise IntakeError("scope_type, reason and at least one evidence reference are required")
    project = repository_root / "projects" / project_id
    if not project.is_dir():
        raise IntakeError(f"project not found: {project}")
    if idempotency_key:
        if not SLUG_PATTERN.fullmatch(idempotency_key):
            raise IntakeError("idempotency_key must use kebab-case")
        index_path = audit_root(repository_root, project_id) / "idempotency" / f"{idempotency_key}.yaml"
        if index_path.exists():
            recorded = yaml.safe_load(index_path.read_text(encoding="utf-8"))
            if not isinstance(recorded, dict) or not isinstance(recorded.get("transition_request"), str):
                raise IntakeError(f"invalid idempotency record: {index_path}")
            return repository_root / str(recorded["transition_request"])
    if scope_type == "project":
        if module_id is not None:
            raise IntakeError("project transition must not include module_id")
        status = migrate_project_status(project)
        if status.get("pending_gate") not in (None, "", "none"):
            raise IntakeError(f"project has a pending gate: {status['pending_gate']}")
        scope_path, graph = project, PROJECT_STATE_GRAPH
    else:
        if not module_id or not SLUG_PATTERN.fullmatch(module_id):
            raise IntakeError("module transition requires a kebab-case module_id")
        scope_path = project / "modules" / module_id
        status, graph = _read_module_status(scope_path), MODULE_STATE_GRAPH
        project_status = migrate_project_status(project)
        if str(project_status["current_state"]) not in MODULE_PROJECT_ELIGIBILITY.get(to_state, set()):
            raise IntakeError(f"module target state {to_state} is not eligible while project is {project_status['current_state']}")
    from_state = str(status["current_state"])
    if expected_state is not None and expected_state != from_state:
        raise IntakeError(f"state changed while transition was pending: expected {expected_state}, found {from_state}")
    if from_state == "PAUSED":
        if to_state != status.get("last_active_state"):
            raise IntakeError("paused scope can resume only to its recorded last_active_state")
    elif to_state not in graph.get(from_state, set()):
        raise IntakeError(f"invalid {scope_type} transition: {from_state} -> {to_state}")
    required_control = "HUMAN_DECISION" if to_state in {"PAUSED", "CANCELLED"} else FORWARD_GATE.get((scope_type, from_state, to_state), control_type)
    if control_type != required_control:
        raise IntakeError(f"transition requires {required_control}, not {control_type}")
    transition_id = f"transition-{uuid4().hex}"
    request_path = _write_immutable(audit_root(repository_root, project_id) / "transition-requests" / f"{transition_id}.yaml", {
        "transition_request_id": transition_id, "execution_id": execution_id or "manual-transition", "scope_type": scope_type,
        "project_id": project_id, "module_id": module_id, "state_machine": "naamive/orchestration/MODULE_LIFECYCLE.md" if scope_type == "module" else "naamive/orchestration/PROJECT_LIFECYCLE.md",
        "from_state": from_state, "to_state": to_state, "trigger": reason, "evidence": evidence,
        "required_gate": required_control, "requested_by": actor, "requested_at": _now(),
    }, "transition_request")
    decision_id = f"gate-{uuid4().hex}"
    decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
        "gate_decision_id": decision_id, "transition_request_id": transition_id, "gate_id": f"{from_state}_TO_{to_state}",
        "decision": "APPROVED", "control_type": control_type, "decided_by": actor, "authority_basis": "state-machine validation",
        "evidence_reviewed": evidence, "rationale": reason, "decided_at": _now(),
    }, "gate_decision")
    reference = str(decision_path.relative_to(repository_root))
    if scope_type == "project":
        if to_state == "PAUSED":
            status["last_active_state"] = from_state
        _transition(project, status, to_state, actor, reason, reference, control_type)
    else:
        sequence = int(status.get("transition_sequence", 0)) + 1
        occurred_at = _now()
        if to_state == "PAUSED":
            status["last_active_state"] = from_state
        status.update({"current_state": to_state, "transition_sequence": sequence, "last_transition_id": f"module-{sequence:04d}",
                       "last_transition_from": from_state, "last_transition_to": to_state, "last_transition_at": occurred_at,
                       "last_transition_actor": actor, "last_transition_reason": reason, "last_transition_evidence": reference, "pending_gate": "none"})
        (scope_path / "STATUS.md").write_text(_render_module_status(status), encoding="utf-8")
        _append_module_history(scope_path, sequence, occurred_at, from_state, to_state, control_type, actor, reason, reference)
    if idempotency_key:
        _write_immutable(audit_root(repository_root, project_id) / "idempotency" / f"{idempotency_key}.yaml", {
            "idempotency_key": idempotency_key, "transition_request": str(request_path.relative_to(repository_root)), "recorded_at": _now(),
        }, "idempotency_index")
    return request_path


def apply_state_transition(
    repository_root: Path,
    project_id: str,
    to_state: str,
    *,
    scope_type: str = "project",
    module_id: str | None = None,
    actor: str,
    reason: str,
    evidence: list[str],
    control_type: str,
    execution_id: str | None = None,
    expected_state: str | None = None,
    idempotency_key: str | None = None,
) -> Path:
    """Apply a transition under a per-scope lock to prevent concurrent updates."""
    with _scope_lock(repository_root, project_id, scope_type, module_id):
        return _apply_state_transition_locked(
            repository_root, project_id, to_state, scope_type=scope_type, module_id=module_id,
            actor=actor, reason=reason, evidence=evidence, control_type=control_type,
            execution_id=execution_id, expected_state=expected_state, idempotency_key=idempotency_key,
        )
