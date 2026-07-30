"""DEPRECATED legacy orchestration retained for Node migration reference."""
from __future__ import annotations

import fcntl
import hashlib
import re
import subprocess
from datetime import datetime, timezone
from contextlib import ExitStack, contextmanager
from pathlib import Path
from uuid import uuid4

import yaml

from .codex_executor import run_codex_agent
from .audit_schema import validate_audit_record
from .evidence import architecture_requires_material_decision, completion_criteria as evidence_completion_criteria, report_requires_human_gate, validate_architecture, validate_architecture_document, validate_business_analysis, validate_delivery_package, validate_delivery_plan, validate_delivery_plan_document, validate_integration_report, validate_module_definition_document, validate_module_proposal, validate_quality_report, validate_requirements, validate_review, validate_security_assessment
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
    "PAUSED": {"ANALYSIS", "DEFINITION", "ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION", "PAUSED"},
    "CANCELLED": {"ANALYSIS", "DEFINITION", "ARCHITECTURE", "PLANNING", "IMPLEMENTATION", "VALIDATION", "DELIVERY", "EVOLUTION", "PAUSED", "CANCELLED"},
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


def audit_timeline(repository_root: Path, project_id: str) -> list[dict[str, object]]:
    """Human-readable, chronological projection; immutable records stay canonical."""
    root = audit_root(repository_root, project_id)
    if not root.is_dir():
        raise IntakeError(f"audit project not found: {project_id}")
    rows: list[dict[str, object]] = []
    for path in sorted((root / "executions").glob("*/events/*.yaml")) if (root / "executions").is_dir() else []:
        payload = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            continue
        rows.append({"occurred_at": payload.get("occurred_at"), "kind": "execution", "execution_id": payload.get("execution_id"), "phase": payload.get("current_state"), "module_id": payload.get("module_id"), "agent": payload.get("agent_id"), "work_item": payload.get("authorized_work_item"), "result": payload.get("state"), "cause": payload.get("failure_message") or payload.get("validation_error"), "next_action": "recover-execution" if payload.get("state") == "FAILED" else "address evidence and redispatch" if payload.get("state") == "REWORK_REQUIRED" else "await gate" if payload.get("state") == "WAITING_FOR_GATE" else None, "canonical_record": str(path.relative_to(repository_root))})
    for directory, kind, stamp in (("transition-requests", "gate-request", "requested_at"), ("gate-decisions", "gate-decision", "decided_at")):
        for path in sorted((root / directory).glob("*.yaml")) if (root / directory).is_dir() else []:
            payload = yaml.safe_load(path.read_text(encoding="utf-8"))
            if isinstance(payload, dict):
                feedback = payload.get("feedback_snapshot") or payload.get("feedback_path")
                rows.append({"occurred_at": payload.get(stamp), "kind": kind, "phase": payload.get("from_state"), "result": payload.get("decision") or payload.get("required_gate"), "cause": payload.get("rationale") or payload.get("trigger"), "feedback": feedback, "next_action": "human decision" if kind == "gate-request" else "run naamive start" if payload.get("decision") in {"REJECTED", "REWORK_REQUIRED"} else None, "canonical_record": str(path.relative_to(repository_root))})
    return sorted(rows, key=lambda item: (str(item.get("occurred_at") or ""), str(item["canonical_record"])))


def _assert_relative_reference(value: str) -> None:
    candidate = Path(value)
    if candidate.is_absolute() or ".." in candidate.parts:
        raise IntakeError(f"audit references must be relative and contained: {value}")


def _write_immutable(path: Path, payload: dict[str, object], record_type: str) -> Path:
    if path.exists():
        raise IntakeError(f"immutable audit record already exists: {path}")
    return _write_yaml(path, validate_audit_record(payload, record_type))


def _record_release_package(repository_root: Path, project_id: str, project: Path, execution_id: str, package: Path, validation_evidence: list[Path]) -> Path:
    """Persist the exact package that operational authority is asked to approve."""
    record_id = f"release-package-{execution_id.removeprefix('execution-')}"
    record_path = audit_root(repository_root, project_id) / "release-packages" / f"{record_id}.yaml"
    return _write_immutable(record_path, {
        "release_package_id": record_id, "project_id": project_id, "execution_id": execution_id,
        "package_path": _relative(project, package), "sha256": hashlib.sha256(package.read_bytes()).hexdigest(),
        "validation_evidence": [_relative(project, item) for item in validation_evidence], "recorded_at": _now(),
    }, "release_package")


def _load_authorized_release_package(repository_root: Path, project_id: str, project: Path, status: dict[str, object]) -> tuple[dict[str, object], Path, Path]:
    reference = status.get("release_authorized")
    if not isinstance(reference, str) or not reference:
        raise IntakeError("delivery has no authorized release package")
    record_path = repository_root / reference
    record = yaml.safe_load(record_path.read_text(encoding="utf-8")) if record_path.is_file() else None
    if not isinstance(record, dict) or record.get("record_type") != "release_package" or record.get("project_id") != project_id:
        raise IntakeError("authorized release package record is invalid")
    package_ref = record.get("package_path")
    if not isinstance(package_ref, str):
        raise IntakeError("authorized release package path is invalid")
    _assert_relative_reference(package_ref)
    package = project / package_ref
    if not package.is_file() or hashlib.sha256(package.read_bytes()).hexdigest() != record.get("sha256"):
        raise IntakeError("authorized release package is missing or its hash diverged")
    return record, record_path, package


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
        needs_work_item = str(module_status["current_state"]) in {"PLANNED", "IMPLEMENTING"}
        if needs_work_item and (not work_item.is_file() or work_item_status(project, module_id, str(payload["authorized_work_item"])) not in {"AUTHORIZED", "IN_PROGRESS"}):
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
        advance_execution(repository_root, project_id, execution_id, "FAILED", failure_code="INTERRUPTED", failure_origin="operator-recovery", failure_message=_sanitize_failure(reason))
        return advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", recovery_reason=reason.strip())
    if current == "FAILED":
        return advance_execution(repository_root, project_id, execution_id, "REWORK_REQUIRED", recovery_reason=reason.strip())
    raise IntakeError(f"execution cannot be recovered from state: {current}")


def _sanitize_failure(error: BaseException | str) -> str:
    """Keep a short diagnostic without recording prompts, tokens, or secrets."""
    message = str(error).replace("\n", " ").strip()
    message = re.sub(r"(?i)(token|password|secret|api[_-]?key)\s*[=:]\s*\S+", r"\1=[REDACTED]", message)
    return message[:500] or "Agent dispatch failed without a diagnostic message."


def _failure_details(error: BaseException) -> dict[str, str]:
    if isinstance(error, subprocess.TimeoutExpired) or "timed out" in str(error).lower():
        code = "TIMEOUT"
    elif isinstance(error, KeyboardInterrupt):
        code = "INTERRUPTED"
    elif isinstance(error, IntakeError) and ("evidence" in str(error).lower() or "authorized target" in str(error).lower()):
        code = "EVIDENCE_ERROR"
    else:
        code = "ADAPTER_ERROR"
    return {"failure_code": code, "failure_origin": "agent-adapter", "failure_message": _sanitize_failure(error)}


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


def _rework_completion_criteria(project: Path, expected_output: str) -> str:
    criteria = evidence_completion_criteria(expected_output)
    feedback = _active_feedback_inputs(project)
    if feedback:
        return f"{criteria} This is authorized rework: add a non-empty Feedback tratado section that addresses every adjustment in {feedback[0].relative_to(project)}."
    return criteria


def _dispatch_analysis_agent(repository_root: Path, project: Path, project_id: str, agent: str, work_item: str, target_rel: str, inputs: list[Path], expected_output: str, agent_runner) -> tuple[str, Path]:
    inputs = [*inputs, *_active_feedback_inputs(project)]
    execution_id = f"execution-{uuid4().hex}"
    completion_criteria = _rework_completion_criteria(project, expected_output)
    if expected_output.endswith("/REVIEW.md"):
        completion_criteria = (
            f"Produce {expected_output} using YAML front matter evidence_schema_version: 1, artifact_type: {expected_output}, execution_id: <supplied execution_id>, with non-empty headings Critérios verificados and Resultado; "
            "the result must include the word approved, and the document must also include headings "
            "Execution ID, Escopo, Fonte, Responsável, Data, Premissas and Lacunas linked to the supplied execution_id."
        )
    context = {
        "execution_id": execution_id, "project_id": project_id, "scope_type": "project", "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md",
        "current_state": str(migrate_project_status(project)["current_state"]), "requested_transition": "evidence-only",
        "agent_id": agent, "authorized_work_item": work_item, "target_path": target_rel,
        "input_artifacts": [str(path.relative_to(project)) for path in inputs], "required_evidence": [expected_output],
        "authority_context": "INDEPENDENT_REVIEW", "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item,
        "allowed_write_paths": [target_rel], "allowed_tools": ["codex"], "allowed_network_targets": [], "credential_scope": "none",
        "action_class": "WRITE", "expected_outputs": [expected_output], "completion_criteria": completion_criteria,
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    target = project / target_rel
    target.mkdir(parents=True, exist_ok=True)
    try:
        result = agent_runner(repository_root, project_id, agent, work_item, target, inputs, execution_context=context)
    except Exception as error:
        advance_execution(repository_root, project_id, execution_id, "FAILED", **_failure_details(error))
        if isinstance(error, IntakeError):
            raise
        raise IntakeError(f"agent dispatch failed: {error}") from error
    advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=[expected_output])
    return execution_id, target / Path(expected_output).name


def _dispatch_project_round(repository_root: Path, project: Path, project_id: str, state: str, agent: str, work_item: str, target_rel: str, inputs: list[Path], expected_output: str, agent_runner) -> tuple[str, Path]:
    inputs = [*inputs, *_active_feedback_inputs(project)]
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
        "completion_criteria": _rework_completion_criteria(project, expected_output),
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    target = project / target_rel
    target.mkdir(parents=True, exist_ok=True)
    try:
        result = agent_runner(repository_root, project_id, agent, work_item, target, inputs, execution_context=context)
    except Exception as error:
        advance_execution(repository_root, project_id, execution_id, "FAILED", **_failure_details(error))
        if isinstance(error, IntakeError):
            raise
        raise IntakeError(f"agent dispatch failed: {error}") from error
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
        if architecture_requires_material_decision(architecture):
            request = open_human_gate(repository_root, project_id, "MATERIAL_ARCHITECTURE_DECISION", "PLANNING", "Architecture declares a material decision requiring human authority.", [str(architecture.relative_to(project)), str(review.relative_to(project))], actor="governance-assurance")
            advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
            advance_execution(repository_root, project_id, review_id, "WAITING_FOR_GATE")
            return {"project_id": project_id, "current_state": "ARCHITECTURE", "state": "WAITING_FOR_GATE", "gate_id": "MATERIAL_ARCHITECTURE_DECISION", "transition_request": str(request.relative_to(repository_root))}
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
    _ensure_gate_feedback(project, "PRODUCT_COMMITMENT")
    return request


def _ensure_gate_feedback(project: Path, gate_id: str) -> Path:
    feedback = project / "gate-feedback" / f"{gate_id}.md"
    if not feedback.exists():
        feedback.parent.mkdir(parents=True, exist_ok=True)
        feedback.write_text(
            f"# Feedback do Gate — {gate_id}\n\n## Decisão\n\nREJECTED ou REWORK_REQUIRED\n\n## Módulos afetados\n\n- `module-id` (remova a linha se o impacto for de projeto)\n\n## Itens rejeitados\n\n- Descreva o item e o motivo.\n\n## Evidências revisadas\n\n- Referência à evidência.\n\n## Ajustes propostos\n\n- Ajuste necessário.\n\n## Responsável\n\nIdentidade responsável pela revisão.\n\n## Critério para nova submissão\n\nCritério objetivo de aceite.\n",
            encoding="utf-8",
        )
    return feedback


def open_human_gate(repository_root: Path, project_id: str, gate_id: str, to_state: str, rationale: str, evidence: list[str], actor: str = "human-cli", release_package_record: str | None = None) -> Path:
    """Open a human gate for one valid project transition without applying it."""
    allowed_targets = {
        "MATERIAL_ARCHITECTURE_DECISION": {("ARCHITECTURE", "PLANNING")},
        "RESIDUAL_RISK_ACCEPTANCE": {("VALIDATION", "DELIVERY")},
        "DELIVERY_ACCEPTANCE": {("DELIVERY", "DELIVERED")},
        "RELEASE_AUTHORIZATION": {("DELIVERY", "DELIVERY")},
    }
    if gate_id not in {*allowed_targets, "PAUSE"}:
        raise IntakeError(f"unsupported human gate: {gate_id}")
    project = repository_root / "projects" / project_id
    status = migrate_project_status(project)
    current = str(status["current_state"])
    if status.get("pending_gate") not in (None, "", "none"):
        raise IntakeError("project already has a pending gate")
    action_gate = gate_id == "RELEASE_AUTHORIZATION" and current == to_state
    if (not action_gate and to_state not in PROJECT_STATE_GRAPH.get(current, set())) or not rationale.strip() or not evidence:
        raise IntakeError("gate target, rationale or evidence is invalid")
    if gate_id == "PAUSE" and to_state != "PAUSED":
        raise IntakeError("PAUSE gate can target only PAUSED")
    if gate_id in allowed_targets and (current, to_state) not in allowed_targets[gate_id]:
        raise IntakeError(f"gate {gate_id} is not applicable to {current} -> {to_state}")
    request_id = f"transition-{uuid4().hex}"
    payload: dict[str, object] = {
        "transition_request_id": request_id, "execution_id": "human-gate-request", "scope_type": "project", "project_id": project_id,
        "state_machine": "naamive/orchestration/PROJECT_LIFECYCLE.md", "from_state": current, "to_state": to_state,
        "trigger": rationale.strip(), "evidence": evidence, "required_gate": "HUMAN_DECISION", "requested_by": actor, "requested_at": _now(),
    }
    if release_package_record:
        payload["release_package_record"] = release_package_record
    request = _write_immutable(audit_root(repository_root, project_id) / "transition-requests" / f"{request_id}.yaml", payload, "transition_request")
    status["pending_gate"] = gate_id
    status["pending_transition_request"] = str(request.relative_to(repository_root))
    (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
    _ensure_gate_feedback(project, gate_id)
    return request


def _validated_gate_feedback(project: Path, gate_id: str, reference: str | None) -> Path:
    path = project / (reference or f"gate-feedback/{gate_id}.md")
    try:
        path.relative_to(project)
    except ValueError as error:
        raise IntakeError("gate feedback must stay under the project") from error
    if not path.is_file():
        raise IntakeError("rejected gate requires a completed gate feedback document")
    content = path.read_text(encoding="utf-8")
    required = ("## Decisão", "## Módulos afetados", "## Itens rejeitados", "## Evidências revisadas", "## Ajustes propostos", "## Responsável", "## Critério para nova submissão")
    if any(section not in content for section in required) or "Descreva o item e o motivo." in content:
        raise IntakeError("gate feedback is incomplete")
    return path


def _freeze_gate_feedback(project: Path, gate_id: str, feedback: Path) -> Path:
    """Create a content-addressed, append-only feedback version for rework.

    The editable gate template is useful to the human reviewer, but must never
    be the artifact supplied to an agent after a decision was recorded.
    """
    content = feedback.read_bytes()
    digest = hashlib.sha256(content).hexdigest()
    snapshot = project / "gate-feedback" / "history" / f"{gate_id}-{digest}.md"
    if snapshot.exists():
        if snapshot.read_bytes() != content:
            raise IntakeError("gate feedback snapshot collision")
        return snapshot
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    snapshot.write_bytes(content)
    return snapshot


def _active_feedback_inputs(project: Path) -> list[Path]:
    """Expose only the immutable, project-scoped feedback selected for rework."""
    status = migrate_project_status(project)
    reference = status.get("rework_feedback_snapshot") or status.get("rework_feedback")
    if not isinstance(reference, str):
        return []
    path = project / reference
    if not path.is_file():
        raise IntakeError("recorded rework feedback snapshot is unavailable")
    return [path]


def _affected_modules(project: Path, feedback: Path) -> list[str]:
    content = feedback.read_text(encoding="utf-8")
    match = re.search(r"## Módulos afetados\n\n(.*?)(?:\n\n## |\Z)", content, re.DOTALL)
    candidates = re.findall(r"`([a-z0-9]+(?:-[a-z0-9]+)*)`", match.group(1) if match else "")
    modules = sorted(set(candidates))
    if not modules:
        modules = [path.name for path in _phase6_modules(project)]
    available = {path.name for path in _phase6_modules(project)}
    if any(module not in available for module in modules):
        raise IntakeError("gate feedback references an unknown affected module")
    return modules


def resolve_human_gate(repository_root: Path, project_id: str, gate_id: str, decision: str, actor: str, rationale: str, feedback_reference: str | None = None) -> dict[str, object]:
    """Resolve a pending generic human gate, rejecting stale or mismatched requests."""
    if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"} or not rationale.strip():
        raise IntakeError("valid decision and rationale are required")
    with _scope_lock(repository_root, project_id, "project", None):
        project = repository_root / "projects" / project_id
        status = migrate_project_status(project)
        if gate_id == "DELIVERY_ACCEPTANCE" and decision == "APPROVED" and status.get("current_state") == "DELIVERED":
            completed = sorted((audit_root(repository_root, project_id) / "delivery-acceptance").glob("*-completed.yaml"))
            if completed:
                operation = yaml.safe_load(completed[-1].read_text(encoding="utf-8"))
                if isinstance(operation, dict) and operation.get("state") == "COMPLETED":
                    operation_id = str(operation["operation_id"])
                    decision_path = audit_root(repository_root, project_id) / "gate-decisions" / f"gate-{operation_id.removeprefix('delivery-acceptance-')}.yaml"
                    return {"project_id": project_id, "gate_id": gate_id, "state": "DELIVERED", "decision_path": str(decision_path), "operation_path": str(completed[-1].with_name(f"{operation_id}.yaml"))}
        if status.get("pending_gate") != gate_id:
            raise IntakeError(f"project is not waiting for gate: {gate_id}")
        reference = status.get("pending_transition_request")
        request_path = repository_root / str(reference) if isinstance(reference, str) else None
        request = yaml.safe_load(request_path.read_text(encoding="utf-8")) if request_path and request_path.is_file() else None
        if not isinstance(request, dict) or request.get("from_state") != status.get("current_state"):
            raise IntakeError("pending gate transition request is invalid or obsolete")
        if decision == "APPROVED" and gate_id == "DELIVERY_ACCEPTANCE":
            return _resolve_delivery_acceptance(repository_root, project_id, project, status, request, actor, rationale.strip())
        release_record = request.get("release_package_record")
        if gate_id == "RELEASE_AUTHORIZATION" and decision == "APPROVED":
            if not isinstance(release_record, str):
                raise IntakeError("release authorization has no immutable package record")
            candidate = repository_root / release_record
            record = yaml.safe_load(candidate.read_text(encoding="utf-8")) if candidate.is_file() else None
            if not isinstance(record, dict) or record.get("record_type") != "release_package":
                raise IntakeError("release authorization package record is invalid")
            # Detect a package changed between preparation and the operational decision.
            temporary = dict(status, release_authorized=release_record)
            _load_authorized_release_package(repository_root, project_id, project, temporary)
        feedback = _validated_gate_feedback(project, gate_id, feedback_reference) if decision in {"REJECTED", "REWORK_REQUIRED"} else None
        decision_id = f"gate-{uuid4().hex}"
        decision_payload: dict[str, object] = {
            "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": gate_id,
            "decision": decision, "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "human gate decision",
            "evidence_reviewed": list(request.get("evidence", [])), "rationale": rationale.strip(), "decided_at": _now(),
        }
        if isinstance(release_record, str):
            decision_payload["release_package_record"] = release_record
        snapshot: Path | None = None
        if feedback:
            snapshot = _freeze_gate_feedback(project, gate_id, feedback)
            decision_payload["feedback_path"] = str(feedback.relative_to(project))
            decision_payload["feedback_snapshot"] = str(snapshot.relative_to(project))
        decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", decision_payload, "gate_decision")
        status.pop("pending_transition_request", None)
        if decision == "APPROVED" and gate_id == "RELEASE_AUTHORIZATION":
            status["pending_gate"] = "none"
            # This is a versioned audit reference, never a reusable boolean.
            status["release_authorized"] = str(release_record)
            status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
            (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
            record, record_path, package = _load_authorized_release_package(repository_root, project_id, project, status)
            acceptance = open_human_gate(repository_root, project_id, "DELIVERY_ACCEPTANCE", "DELIVERED", "Authorized delivery package is ready for business acceptance.", [str(record["package_path"]), str(record_path.relative_to(repository_root))], actor="release-operations", release_package_record=str(record_path.relative_to(repository_root)))
            execution_id = str(record["execution_id"])
            if _execution_events(repository_root, project_id, execution_id) and str(_execution_events(repository_root, project_id, execution_id)[-1].get("state")) == "EVIDENCE_REVIEW":
                advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
            return {"project_id": project_id, "gate_id": gate_id, "state": "WAITING_FOR_GATE", "decision_path": str(decision_path), "transition_request": str(acceptance.relative_to(repository_root))}
        elif decision == "APPROVED":
            _transition(project, status, str(request["to_state"]), actor, rationale.strip(), str(decision_path.relative_to(repository_root)), "HUMAN_DECISION")
        else:
            status["pending_gate"] = "none"
            if snapshot:
                status["rework_feedback"] = str(feedback.relative_to(project))
                status["rework_feedback_snapshot"] = str(snapshot.relative_to(project))
                status["rework_gate"] = gate_id
            status["next_action"] = "Update the recorded gate feedback and run naamive start to submit the authorized rework."
            status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
            (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
            if gate_id == "DELIVERY_ACCEPTANCE" and feedback and (project / "modules").is_dir() and any((project / "modules").iterdir()):
                affected = _affected_modules(project, snapshot)
                apply_state_transition(repository_root, project_id, "VALIDATION", actor=actor, reason="Delivery acceptance feedback requires scoped validation rework.", evidence=[str(decision_path.relative_to(repository_root))], control_type="HUMAN_DECISION", expected_state="DELIVERY")
                for module_id in affected:
                    module = project / "modules" / module_id
                    if str(_read_module_status(module)["current_state"]) == "READY_FOR_DELIVERY":
                        apply_state_transition(repository_root, project_id, "IMPLEMENTING", scope_type="module", module_id=module_id, actor="naamive-runtime", reason="Accepted delivery feedback reopens affected module work.", evidence=[str(decision_path.relative_to(repository_root))], control_type="AUTOMATED_EVIDENCE", expected_state="READY_FOR_DELIVERY")
                    for item in sorted((module / "planning" / "work-items").glob("*.md")):
                        if work_item_status(project, module_id, item.stem) == "COMPLETED":
                            set_work_item_status(project, module_id, item.stem, "AUTHORIZED")
                refreshed = migrate_project_status(project)
                refreshed["rework_modules"] = affected
                (project / "STATUS.md").write_text(render_project_status(refreshed), encoding="utf-8")
        return {"project_id": project_id, "gate_id": gate_id, "state": str(request["to_state"]) if decision == "APPROVED" else decision, "decision_path": str(decision_path)}


def _resolve_delivery_acceptance(repository_root: Path, project_id: str, project: Path, status: dict[str, object], request: dict[str, object], actor: str, rationale: str) -> dict[str, object]:
    """Promote every module and the project as one recoverable acceptance operation."""
    if status.get("current_state") != "DELIVERY" or request.get("to_state") != "DELIVERED":
        raise IntakeError("delivery acceptance requires DELIVERY -> DELIVERED")
    release_reference = request.get("release_package_record")
    if release_reference:
        if release_reference != status.get("release_authorized"):
            raise IntakeError("delivery acceptance package does not match the authorized release")
        try:
            _load_authorized_release_package(repository_root, project_id, project, status)
        except IntakeError as error:
            decision_id = f"gate-{uuid4().hex}"
            decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
                "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": "DELIVERY_ACCEPTANCE",
                "decision": "REWORK_REQUIRED", "control_type": "HUMAN_DECISION", "decided_by": "runtime-integrity-check",
                "authority_basis": "authorized release package integrity check", "evidence_reviewed": list(request.get("evidence", [])),
                "rationale": str(error), "decided_at": _now(),
            }, "gate_decision")
            status.pop("pending_transition_request", None)
            status["pending_gate"] = "none"
            status.pop("release_authorized", None)
            status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
            status["next_action"] = "Prepare and authorize a new release package before delivery acceptance."
            (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
            return {"project_id": project_id, "gate_id": "DELIVERY_ACCEPTANCE", "state": "REWORK_REQUIRED", "decision_path": str(decision_path), "error": str(error)}
    modules = sorted((path for path in (project / "modules").glob("*") if path.is_dir()), key=lambda path: path.name) if (project / "modules").is_dir() else []
    operation_id = f"delivery-acceptance-{str(request['transition_request_id']).removeprefix('transition-')}"
    operation_path = audit_root(repository_root, project_id) / "delivery-acceptance" / f"{operation_id}.yaml"
    # Holding every module lock makes pre-validation and the following promotions one coordinated critical section.
    with ExitStack() as locks:
        for module in modules:
            locks.enter_context(_scope_lock(repository_root, project_id, "module", module.name))
        existing = yaml.safe_load(operation_path.read_text(encoding="utf-8")) if operation_path.exists() else None
        if existing is not None:
            if not isinstance(existing, dict) or existing.get("operation_id") != operation_id:
                raise IntakeError("delivery acceptance operation is invalid")
            participants = [str(item.get("module_id")) for item in existing.get("participants", []) if isinstance(item, dict)]
            if participants != [module.name for module in modules]:
                raise IntakeError("delivery acceptance participants changed; explicit compensation is required")
        else:
            incompatible = [module.name for module in modules if str(_read_module_status(module)["current_state"]) != "READY_FOR_DELIVERY"]
            if incompatible:
                raise IntakeError(f"delivery acceptance requires module(s) to be READY_FOR_DELIVERY: {', '.join(incompatible)}")
            participants = [module.name for module in modules]
            _write_immutable(operation_path, {
                "operation_id": operation_id, "project_id": project_id, "transition_request_id": request["transition_request_id"],
                "decision": "APPROVED", "participants": [{"module_id": module_id, "expected_state": "READY_FOR_DELIVERY"} for module_id in participants],
                "expected_project_state": "DELIVERY", "expected_module_state": "READY_FOR_DELIVERY", "state": "INCOMPLETE", "recorded_at": _now(),
            }, "delivery_acceptance_operation")
        decision_id = f"gate-{operation_id.removeprefix('delivery-acceptance-')}"
        decision_path = audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml"
        if not decision_path.exists():
            _write_immutable(decision_path, {
                "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": "DELIVERY_ACCEPTANCE",
                "decision": "APPROVED", "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "coordinated human delivery acceptance",
                "evidence_reviewed": list(request.get("evidence", [])), "rationale": rationale, "decided_at": _now(),
            }, "gate_decision")
        decision_reference = str(decision_path.relative_to(repository_root))
        for module in modules:
            current = str(_read_module_status(module)["current_state"])
            if current == "DELIVERED":
                continue
            if current != "READY_FOR_DELIVERY":
                raise IntakeError(f"delivery acceptance recovery requires module {module.name} to be READY_FOR_DELIVERY or DELIVERED")
            _apply_state_transition_locked(repository_root, project_id, "DELIVERED", scope_type="module", module_id=module.name, actor=actor, reason="Module is included in the accepted project delivery.", evidence=[decision_reference, str(operation_path.relative_to(repository_root))], control_type="AUTOMATED_EVIDENCE", expected_state="READY_FOR_DELIVERY", idempotency_key=f"{operation_id}-{module.name}")
        # The project is deliberately last: a failed module persistence can never declare the delivery complete.
        status = migrate_project_status(project)
        if str(status["current_state"]) != "DELIVERY":
            raise IntakeError("delivery acceptance recovery requires project state DELIVERY")
        _transition(project, status, "DELIVERED", actor, rationale, decision_reference, "HUMAN_DECISION")
        _write_immutable(operation_path.with_name(f"{operation_id}-completed.yaml"), {
            "operation_id": operation_id, "project_id": project_id, "transition_request_id": request["transition_request_id"],
            "decision": "APPROVED", "participants": [{"module_id": module_id, "expected_state": "READY_FOR_DELIVERY"} for module_id in participants],
            "expected_project_state": "DELIVERY", "expected_module_state": "READY_FOR_DELIVERY", "state": "COMPLETED", "recorded_at": _now(),
        }, "delivery_acceptance_operation")
        return {"project_id": project_id, "gate_id": "DELIVERY_ACCEPTANCE", "state": "DELIVERED", "decision_path": str(decision_path), "operation_path": str(operation_path)}


def _validated_product_modules(candidates: list[dict[str, str]] | None, module_id: str | None, module_title: str | None) -> list[dict[str, str]]:
    """Normalize the approved product scope before any product artifact is written."""
    if candidates is None:
        candidates = []
    if module_id is not None or module_title is not None:
        if not module_id or not module_title:
            raise IntakeError("module_id and module_title must be provided together")
        # Compatibility with the original public API.  New callers should make
        # the scope explicit with candidate id, title, justification and owner.
        candidates = [*candidates, {"module_id": module_id, "title": module_title, "justification": "Approved product capability.", "owner": "product-owner"}]
    if not candidates:
        raise IntakeError("at least one product module candidate is required to approve PRODUCT_COMMITMENT")
    normalized: list[dict[str, str]] = []
    identifiers: set[str] = set()
    for candidate in candidates:
        if not isinstance(candidate, dict):
            raise IntakeError("each product module candidate must be an object")
        identifier = str(candidate.get("module_id", "")).strip()
        title = str(candidate.get("title", "")).strip()
        justification = str(candidate.get("justification", "")).strip()
        owner = str(candidate.get("owner", "")).strip()
        if not SLUG_PATTERN.fullmatch(identifier):
            raise IntakeError("product module candidate id must use kebab-case")
        if not title or not justification or not owner:
            raise IntakeError("product module candidates require title, justification and owner")
        if identifier in identifiers:
            raise IntakeError(f"duplicate product module candidate: {identifier}")
        identifiers.add(identifier)
        normalized.append({"module_id": identifier, "title": title, "justification": justification, "owner": owner})
    return normalized


def resolve_product_commitment(repository_root: Path, project_id: str, decision: str, actor: str, rationale: str, module_id: str | None = None, module_title: str | None = None, module_candidates: list[dict[str, str]] | None = None, feedback_reference: str | None = None) -> dict[str, object]:
    if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"} or not rationale.strip():
        raise IntakeError("valid decision and rationale are required")
    candidates = _validated_product_modules(module_candidates, module_id, module_title) if decision == "APPROVED" else []
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
    modules_root = project / "modules"
    if decision == "APPROVED":
        existing = {path.name for path in modules_root.glob("*") if path.is_dir()} if modules_root.exists() else set()
        conflicts = sorted(existing.intersection(candidate["module_id"] for candidate in candidates))
        if conflicts:
            raise IntakeError(f"product module already exists: {', '.join(conflicts)}")
    decision_id = f"gate-{uuid4().hex}"
    decision_reference = str((audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml").relative_to(repository_root))
    stage_root: Path | None = None
    if decision == "APPROVED":
        # Build the complete set out of the published modules directory.  A
        # failed candidate therefore cannot expose a partially approved scope.
        stage_root = project / f".product-commitment-{uuid4().hex}"
        staged_project = stage_root / project.name
        try:
            for candidate in candidates:
                materialize_module(staged_project, candidate["module_id"], candidate["title"], decision_reference)
        except Exception:
            import shutil
            shutil.rmtree(stage_root, ignore_errors=True)
            raise
    feedback = _validated_gate_feedback(project, "PRODUCT_COMMITMENT", feedback_reference) if decision != "APPROVED" else None
    snapshot = _freeze_gate_feedback(project, "PRODUCT_COMMITMENT", feedback) if feedback else None
    payload = {
        "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": "PRODUCT_COMMITMENT",
        "decision": decision, "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "human product commitment",
        "evidence_reviewed": list(request.get("evidence", [])), "rationale": rationale.strip(), "approved_modules": candidates, "decided_at": _now(),
    }
    if feedback:
        payload["feedback_path"] = str(feedback.relative_to(project))
        payload["feedback_snapshot"] = str(snapshot.relative_to(project))
    decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", payload, "gate_decision")
    if decision != "APPROVED":
        status["pending_gate"] = "none"
        status.pop("pending_transition_request", None)
        status["rework_feedback"] = str(feedback.relative_to(project)) if feedback else ""
        status["rework_feedback_snapshot"] = str(snapshot.relative_to(project)) if snapshot else ""
        status["rework_gate"] = "PRODUCT_COMMITMENT"
        status["next_action"] = "Submit a new product proposal." if decision == "REJECTED" else "Address the recorded product commitment rationale and submit a new proposal."
        status["last_gate_decision"] = str(decision_path.relative_to(repository_root))
        (project / "STATUS.md").write_text(render_project_status(status), encoding="utf-8")
        return {"project_id": project_id, "state": decision, "gate_id": "PRODUCT_COMMITMENT", "decision_path": str(decision_path)}
    assert stage_root is not None
    staged_modules = stage_root / project.name / "modules"
    try:
        # PRODUCT_COMMITMENT is the first module materialization.  Replacing
        # its empty directory publishes the whole approved set in one rename.
        if modules_root.exists() and any(modules_root.iterdir()):
            raise IntakeError("product module directory changed during commitment; retry the decision")
        staged_modules.replace(modules_root)
    finally:
        import shutil
        shutil.rmtree(stage_root, ignore_errors=True)
    status.pop("pending_transition_request", None)
    _transition(project, status, "ARCHITECTURE", actor, rationale.strip(), str(decision_path.relative_to(repository_root)), "HUMAN_DECISION")
    return {"project_id": project_id, "module_ids": [candidate["module_id"] for candidate in candidates], "module_paths": [str(modules_root / candidate["module_id"]) for candidate in candidates], "state": "ARCHITECTURE", "decision_path": str(decision_path)}


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


def _phase6_modules(project: Path) -> list[Path]:
    modules = sorted(path for path in (project / "modules").glob("*") if path.is_dir()) if (project / "modules").is_dir() else []
    status = migrate_project_status(project)
    scoped = status.get("rework_modules")
    if isinstance(scoped, list):
        modules = [module for module in modules if module.name in scoped]
    if not modules:
        raise IntakeError("phase 6 requires at least one materialized module")
    return modules


def _published_provider_contract(repository_root: Path, provider_project_id: str, provider_module_id: str, contract_reference: str) -> tuple[Path, str, str]:
    """Resolve a published provider contract and return its stable identity."""
    if not SLUG_PATTERN.fullmatch(provider_project_id) or not SLUG_PATTERN.fullmatch(provider_module_id):
        raise IntakeError("provider project and module identifiers must use kebab-case")
    _assert_relative_reference(contract_reference)
    reference = Path(contract_reference)
    provider_root = Path("modules") / provider_module_id
    if reference == provider_root or provider_root not in reference.parents:
        raise IntakeError("contract reference must remain under the provider module")
    provider_module = repository_root / "projects" / provider_project_id / provider_root
    provider_status = _read_module_status(provider_module)
    if str(provider_status["current_state"]) != "DELIVERED":
        raise IntakeError("provider module is not published for consumption; it must be DELIVERED")
    contract = repository_root / "projects" / provider_project_id / reference
    if not contract.is_file():
        raise IntakeError("published provider contract does not exist")
    document = contract.read_text(encoding="utf-8")
    if not document.startswith("---\n") or "\n---\n" not in document:
        raise IntakeError("published provider contract must contain YAML front matter")
    metadata_text, _body = document[4:].split("\n---\n", 1)
    metadata = yaml.safe_load(metadata_text)
    if not isinstance(metadata, dict) or metadata.get("publication_status") != "PUBLISHED":
        raise IntakeError("provider contract is not published")
    version = metadata.get("contract_version")
    if not isinstance(version, str) or not version.strip():
        raise IntakeError("published provider contract must declare contract_version")
    return contract, version.strip(), hashlib.sha256(contract.read_bytes()).hexdigest()


def _revalidate_module_consumptions(repository_root: Path, project: Path) -> None:
    """Reject integration/delivery when a recorded provider contract has drifted."""
    for consumer in _phase6_modules(project):
        records = consumer / "architecture" / "module-consumption"
        for record_path in sorted(records.glob("*.yaml")) if records.is_dir() else []:
            record = yaml.safe_load(record_path.read_text(encoding="utf-8"))
            if not isinstance(record, dict):
                raise IntakeError(f"module consumption record is invalid: {record_path}")
            required = ("provider_project_id", "provider_module_id", "contract_reference", "provider_contract_path", "contract_version", "contract_sha256")
            if any(not isinstance(record.get(field), str) or not str(record[field]).strip() for field in required):
                raise IntakeError(f"module consumption record lacks immutable contract identity: {record_path}")
            contract, version, digest = _published_provider_contract(repository_root, str(record["provider_project_id"]), str(record["provider_module_id"]), str(record["contract_reference"]))
            canonical = str(contract.relative_to(repository_root))
            if canonical != record["provider_contract_path"] or version != record["contract_version"] or digest != record["contract_sha256"]:
                raise IntakeError(f"provider contract changed or was replaced since consumption registration: {record_path}")


def _orchestrate_phase6(repository_root: Path, project: Path, project_id: str, status: dict[str, object], agent_runner) -> dict[str, object]:
    """Run the integration, assurance and delivery rounds with explicit gates."""
    state = str(status["current_state"])
    modules = _phase6_modules(project)
    _revalidate_module_consumptions(repository_root, project)
    module_evidence = [module / "evidence" for module in modules]
    if state == "IMPLEMENTATION":
        for module in modules:
            module_state = str(_read_module_status(module)["current_state"])
            if module_state != "IMPLEMENTING":
                raise IntakeError(f"integration requires module {module.name} in IMPLEMENTING, found {module_state}")
        inputs = [project / "architecture" / "SOLUTION_ARCHITECTURE.md", *module_evidence]
        execution_id, report = _dispatch_project_round(repository_root, project, project_id, state, "integration-engineering", "verify-integrated-contracts", "integration", inputs, "integration/INTEGRATION_REPORT.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, execution_id, validate_integration_report, project, execution_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": execution_id, "error": error}
        for module in modules:
            apply_state_transition(repository_root, project_id, "INTEGRATING", scope_type="module", module_id=module.name, actor="integration-engineering", reason="Integration evidence is available for the module.", evidence=[str(report.relative_to(project))], control_type="AUTOMATED_EVIDENCE", execution_id=execution_id, expected_state="IMPLEMENTING", idempotency_key=f"integrating-{module.name}-{execution_id.split('-')[-1]}")
        apply_state_transition(repository_root, project_id, "VALIDATION", actor="integration-engineering", reason="Integrated contract and flow evidence was validated.", evidence=[str(report.relative_to(project))], control_type="AUTOMATED_EVIDENCE", execution_id=execution_id, expected_state="IMPLEMENTATION", idempotency_key=f"implementation-validation-{execution_id.split('-')[-1]}")
        advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
        advance_execution(repository_root, project_id, execution_id, "COMPLETED")
        return {"project_id": project_id, "current_state": "VALIDATION", "state": "COMPLETED", "integration_execution": execution_id}
    if state == "VALIDATION":
        for module in modules:
            if str(_read_module_status(module)["current_state"]) != "INTEGRATING":
                raise IntakeError(f"validation requires module {module.name} in INTEGRATING")
        integration = project / "integration" / "INTEGRATION_REPORT.md"
        quality_id, quality = _dispatch_project_round(repository_root, project, project_id, state, "quality-assurance", "validate-quality", "validation", [integration], "validation/QUALITY_REPORT.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, quality_id, validate_quality_report, project, quality_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": quality_id, "error": error}
        security_id, security = _dispatch_project_round(repository_root, project, project_id, state, "security-assurance", "assess-security", "validation/security", [integration, quality], "validation/security/SECURITY_ASSESSMENT.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, security_id, validate_security_assessment, project, security_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": security_id, "error": error}
        review_id, review = _dispatch_project_round(repository_root, project, project_id, state, "governance-assurance", "review-validation", "validation/reviews", [quality, security], "validation/reviews/REVIEW.md", agent_runner)
        error = _validate_round_evidence(repository_root, project_id, review_id, validate_review, review, review_id)
        if error:
            return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": error}
        for module in modules:
            apply_state_transition(repository_root, project_id, "VALIDATING", scope_type="module", module_id=module.name, actor="quality-assurance", reason="Project validation evidence is available.", evidence=[str(quality.relative_to(project)), str(security.relative_to(project))], control_type="AUTOMATED_EVIDENCE", execution_id=quality_id, expected_state="INTEGRATING", idempotency_key=f"validating-{module.name}-{quality_id.split('-')[-1]}")
            apply_state_transition(repository_root, project_id, "READY_FOR_DELIVERY", scope_type="module", module_id=module.name, actor="governance-assurance", reason="Independent validation review approved the module evidence.", evidence=[str(quality.relative_to(project)), str(security.relative_to(project)), str(review.relative_to(project))], control_type="INDEPENDENT_REVIEW", execution_id=review_id, expected_state="VALIDATING", idempotency_key=f"ready-for-delivery-{module.name}-{review_id.split('-')[-1]}")
        if report_requires_human_gate(security, "residual_risk_acceptance_required"):
            request = open_human_gate(repository_root, project_id, "RESIDUAL_RISK_ACCEPTANCE", "DELIVERY", "Security assessment declares residual risk requiring authority.", [str(quality.relative_to(project)), str(security.relative_to(project)), str(review.relative_to(project))], actor="governance-assurance")
            return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": "RESIDUAL_RISK_ACCEPTANCE", "transition_request": str(request.relative_to(repository_root))}
        apply_state_transition(repository_root, project_id, "DELIVERY", actor="governance-assurance", reason="Independent quality and security review approved validation.", evidence=[str(quality.relative_to(project)), str(security.relative_to(project)), str(review.relative_to(project))], control_type="INDEPENDENT_REVIEW", execution_id=review_id, expected_state="VALIDATION", idempotency_key=f"validation-delivery-{review_id.split('-')[-1]}")
        for identifier in (quality_id, security_id, review_id):
            advance_execution(repository_root, project_id, identifier, "WAITING_FOR_GATE")
            advance_execution(repository_root, project_id, identifier, "COMPLETED")
        return {"project_id": project_id, "current_state": "DELIVERY", "state": "COMPLETED", "validation_execution": review_id}
    # DELIVERY
    if any(str(_read_module_status(module)["current_state"]) != "READY_FOR_DELIVERY" for module in modules):
        raise IntakeError("delivery requires every project module to be READY_FOR_DELIVERY")
    if status.get("release_authorized"):
        record, record_path, _package = _load_authorized_release_package(repository_root, project_id, project, status)
        request = open_human_gate(repository_root, project_id, "DELIVERY_ACCEPTANCE", "DELIVERED", "Authorized delivery package is ready for business acceptance.", [str(record["package_path"]), str(record_path.relative_to(repository_root))], actor="release-operations", release_package_record=str(record_path.relative_to(repository_root)))
        return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": "DELIVERY_ACCEPTANCE", "transition_request": str(request.relative_to(repository_root))}
    inputs = [project / "validation" / "QUALITY_REPORT.md", project / "validation" / "security" / "SECURITY_ASSESSMENT.md"]
    execution_id, package = _dispatch_project_round(repository_root, project, project_id, state, "release-operations", "prepare-delivery", "delivery", inputs, "delivery/DELIVERY_PACKAGE.md", agent_runner)
    error = _validate_round_evidence(repository_root, project_id, execution_id, validate_delivery_package, project, execution_id)
    if error:
        return {"project_id": project_id, "current_state": state, "state": "REWORK_REQUIRED", "execution_id": execution_id, "error": error}
    if report_requires_human_gate(package, "release_authorization_required") and not status.get("release_authorized"):
        record = _record_release_package(repository_root, project_id, project, execution_id, package, inputs)
        request = open_human_gate(repository_root, project_id, "RELEASE_AUTHORIZATION", "DELIVERY", "Delivery package requires operational release authorization.", [str(package.relative_to(project)), str(record.relative_to(repository_root))], actor="release-operations", release_package_record=str(record.relative_to(repository_root)))
        return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": "RELEASE_AUTHORIZATION", "transition_request": str(request.relative_to(repository_root))}
    request = open_human_gate(repository_root, project_id, "DELIVERY_ACCEPTANCE", "DELIVERED", "Delivery package is ready for business acceptance.", [str(package.relative_to(project))], actor="release-operations")
    advance_execution(repository_root, project_id, execution_id, "WAITING_FOR_GATE")
    return {"project_id": project_id, "current_state": state, "state": "WAITING_FOR_GATE", "gate_id": "DELIVERY_ACCEPTANCE", "transition_request": str(request.relative_to(repository_root))}


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
    if state in {"IMPLEMENTATION", "VALIDATION", "DELIVERY"}:
        if state == "VALIDATION" and isinstance(status.get("rework_modules"), list):
            apply_state_transition(repository_root, project_id, "IMPLEMENTATION", actor="naamive-runtime", reason="Scoped delivery feedback resumes affected module implementation.", evidence=[str(status["rework_feedback"])], control_type="AUTOMATED_EVIDENCE", expected_state="VALIDATION")
            return {"project_id": project_id, "current_state": "IMPLEMENTATION", "state": "COMPLETED"}
        if state == "IMPLEMENTATION":
            modules = _phase6_modules(project)
            if any(str(_read_module_status(module)["current_state"]) != "IMPLEMENTING" for module in modules):
                return {"project_id": project_id, "current_state": state, "state": "PROJECT_EXECUTION_PENDING", "reason": "authorized module implementation work must complete before integration"}
        return _orchestrate_phase6(repository_root, project, project_id, status, agent_runner)
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
        execution.update({"state": "FAILED", "completed_at": _now(), **_failure_details(error)})
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


def orchestrate_until_blocked(repository_root: Path, project_id: str, agent_runner=run_codex_agent) -> dict[str, object]:
    """Chain public project rounds until a real decision or terminal condition.

    Individual rounds retain their own immutable execution streams; this loop is
    merely the public convenience layer that prevents an eligible project from
    stopping between automatic states.
    """
    rounds: list[dict[str, object]] = []
    while True:
        module_round = _orchestrate_next_module_round(repository_root, project_id, agent_runner)
        if module_round is not None:
            rounds.append(module_round)
            if module_round.get("state") != "COMPLETED":
                return dict(module_round, rounds=rounds)
            continue
        result = orchestrate_project(repository_root, project_id, agent_runner)
        rounds.append(result)
        if result.get("state") != "COMPLETED":
            return dict(result, rounds=rounds)


def _orchestrate_next_module_round(repository_root: Path, project_id: str, agent_runner) -> dict[str, object] | None:
    """Select exactly one eligible module action; callers loop until a real stop."""
    project = repository_root / "projects" / project_id
    status = migrate_project_status(project)
    if status.get("pending_gate") not in (None, "", "none"):
        return None
    project_state = str(status["current_state"])
    modules = _phase6_modules(project) if (project / "modules").is_dir() else []
    module_states = {module.name: str(_read_module_status(module)["current_state"]) for module in modules}

    # Module evidence belongs before the corresponding project round.
    if project_state == "ARCHITECTURE":
        candidate = next((name for name, state in module_states.items() if state in {"IDENTIFIED", "DEFINED"}), None)
        if candidate:
            return orchestrate_module_architecture_planning(repository_root, project_id, candidate, agent_runner)
    if project_state == "PLANNING":
        candidate = next((name for name, state in module_states.items() if state == "ARCHITECTED"), None)
        if candidate:
            return orchestrate_module_architecture_planning(repository_root, project_id, candidate, agent_runner)
        candidate = next((name for name, state in module_states.items() if state == "PLANNED" and not list((project / "modules" / name / "planning" / "work-items").glob("*.md"))), None)
        if candidate:
            # The reviewed module delivery plan is the authorization source for the
            # smallest executable slice. More granular planning remains an agent output.
            item = create_work_item(project, candidate, "implement-mvp", "Implement approved module MVP",
                objective="Implement the approved module scope, including a usable application, automated tests and local usage instructions.",
                write_scope=[f"modules/{candidate}/applications", f"modules/{candidate}/documentation"], dependencies=[], priority="HIGH",
                definition_of_ready=["Module architecture and delivery plan were independently reviewed."],
                expected_evidence=[f"modules/{candidate}/tests/rules.md"],
                authorization_reference=f"modules/{candidate}/planning/DELIVERY_PLAN.md")
            return {"project_id": project_id, "module_id": candidate, "state": "COMPLETED", "work_item_path": str(item), "activity": "authorize-planned-work"}
    if project_state == "IMPLEMENTATION":
        candidate = next((name for name, state in module_states.items() if state == "PLANNED"), None)
        if candidate:
            items = sorted((project / "modules" / candidate / "planning" / "work-items").glob("*.md"))
            authorized = next((item.stem for item in items if work_item_status(project, candidate, item.stem) == "AUTHORIZED"), None)
            if authorized:
                return dispatch_module_implementation(repository_root, project_id, candidate, authorized, agent_runner)
    return None


def orchestrate_module_architecture_planning(repository_root: Path, project_id: str, module_id: str, agent_runner=run_codex_agent) -> dict[str, object]:
    """Advance one module through definition, architecture, or planning."""
    project = repository_root / "projects" / project_id
    module = project / "modules" / module_id
    project_state = str(migrate_project_status(project)["current_state"])
    module_state = str(_read_module_status(module)["current_state"])
    rounds = {
        "IDENTIFIED": ("ARCHITECTURE", "requirements-engineering", "define-module-boundary", "requirements", "MODULE_REQUIREMENTS.md", validate_module_definition_document),
        "DEFINED": ("ARCHITECTURE", "solution-architecture", "define-module-architecture", "architecture", "SOLUTION_ARCHITECTURE.md", validate_architecture_document),
        "ARCHITECTED": ("PLANNING", "delivery-planning", "plan-module-delivery", "planning", "DELIVERY_PLAN.md", validate_delivery_plan_document),
    }
    if module_state not in rounds:
        raise IntakeError("module is not eligible for a definition, architecture, or planning round")
    expected_project_state, agent, work_item, directory, filename, validator = rounds[module_state]
    if project_state != expected_project_state:
        raise IntakeError(f"module {module_state} round requires project state {expected_project_state}")
    target_rel = f"modules/{module_id}/{directory}"
    evidence_rel = f"{target_rel}/{filename}"
    execution_id = f"execution-{uuid4().hex}"
    feedback_inputs = [str(path.relative_to(project)) for path in _active_feedback_inputs(project)]
    base_inputs = (["analysis/domain/MODULE_PROPOSAL.md", "analysis/requirements/REQUIREMENTS.md", f"modules/{module_id}/MODULE.md"] if module_state == "IDENTIFIED" else [f"modules/{module_id}/MODULE.md"] if module_state == "DEFINED" else [f"modules/{module_id}/architecture/SOLUTION_ARCHITECTURE.md"])
    context = {
        "execution_id": execution_id, "project_id": project_id, "scope_type": "module", "module_id": module_id,
        "state_machine": "naamive/orchestration/MODULE_LIFECYCLE.md", "current_state": module_state, "requested_transition": "evidence-only",
        "agent_id": agent, "authorized_work_item": work_item, "target_path": target_rel,
        "input_artifacts": [*base_inputs, *feedback_inputs], "required_evidence": [evidence_rel],
        "authority_context": "INDEPENDENT_REVIEW", "dispatch_id": f"dispatch-{uuid4().hex}", "activity": work_item,
        "allowed_write_paths": [target_rel], "allowed_tools": ["codex"], "allowed_network_targets": [], "credential_scope": "none", "action_class": "WRITE",
        "expected_outputs": [evidence_rel], "completion_criteria": _rework_completion_criteria(project, evidence_rel),
    }
    create_execution(repository_root, context)
    advance_execution(repository_root, project_id, execution_id, "VALIDATING")
    advance_execution(repository_root, project_id, execution_id, "DISPATCHED")
    target = project / target_rel
    target.mkdir(parents=True, exist_ok=True)
    try:
        inputs = [project / str(reference) for reference in context["input_artifacts"]] + _active_feedback_inputs(project)
        result = agent_runner(repository_root, project_id, agent, work_item, target, inputs, execution_context=context)
    except Exception as error:
        advance_execution(repository_root, project_id, execution_id, "FAILED", **_failure_details(error))
        if isinstance(error, IntakeError):
            raise
        raise IntakeError(f"agent dispatch failed: {error}") from error
    evidence = project / evidence_rel
    advance_execution(repository_root, project_id, execution_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=[evidence_rel])
    error = _validate_round_evidence(repository_root, project_id, execution_id, validator, evidence, execution_id)
    if error:
        return {"project_id": project_id, "module_id": module_id, "state": "REWORK_REQUIRED", "execution_id": execution_id, "error": error}
    review_target_rel = f"modules/{module_id}/{directory}/reviews"
    review_rel = f"{review_target_rel}/REVIEW.md"
    review_id = f"execution-{uuid4().hex}"
    review_context = dict(context, execution_id=review_id, agent_id="governance-assurance", authorized_work_item=f"review-{work_item}", target_path=review_target_rel, input_artifacts=[evidence_rel, *feedback_inputs], required_evidence=[review_rel], dispatch_id=f"dispatch-{uuid4().hex}", activity=f"review-{work_item}", allowed_write_paths=[review_target_rel], expected_outputs=[review_rel])
    create_execution(repository_root, review_context)
    advance_execution(repository_root, project_id, review_id, "VALIDATING")
    advance_execution(repository_root, project_id, review_id, "DISPATCHED")
    review_target = project / review_target_rel
    review_target.mkdir(parents=True, exist_ok=True)
    try:
        result = agent_runner(repository_root, project_id, "governance-assurance", f"review-{work_item}", review_target, [evidence, *[project / item for item in feedback_inputs]], execution_context=review_context)
    except Exception as error:
        advance_execution(repository_root, project_id, review_id, "FAILED", **_failure_details(error))
        if isinstance(error, IntakeError):
            raise
        raise IntakeError(f"agent dispatch failed: {error}") from error
    review = project / review_rel
    advance_execution(repository_root, project_id, review_id, "EVIDENCE_REVIEW", agent_result=result, produced_evidence=[review_rel])
    error = _validate_round_evidence(repository_root, project_id, review_id, validate_review, review, review_id)
    if error:
        return {"project_id": project_id, "module_id": module_id, "state": "REWORK_REQUIRED", "execution_id": review_id, "error": error}
    if module_state == "DEFINED" and architecture_requires_material_decision(evidence):
        request_id = f"transition-{uuid4().hex}"
        request = _write_immutable(audit_root(repository_root, project_id) / "transition-requests" / f"{request_id}.yaml", {
            "transition_request_id": request_id, "execution_id": review_id, "scope_type": "module", "project_id": project_id,
            "module_id": module_id, "state_machine": "naamive/orchestration/MODULE_LIFECYCLE.md", "from_state": "DEFINED", "to_state": "ARCHITECTED",
            "trigger": "module architecture declares a material decision", "evidence": [evidence_rel, review_rel], "required_gate": "HUMAN_DECISION", "requested_by": "governance-assurance", "requested_at": _now(),
        }, "transition_request")
        module_status = _read_module_status(module)
        module_status["pending_gate"] = "MATERIAL_MODULE_ARCHITECTURE_DECISION"
        module_status["pending_transition_request"] = str(request.relative_to(repository_root))
        (module / "STATUS.md").write_text(_render_module_status(module_status), encoding="utf-8")
        for identifier in (execution_id, review_id):
            advance_execution(repository_root, project_id, identifier, "WAITING_FOR_GATE")
        return {"project_id": project_id, "module_id": module_id, "current_state": "DEFINED", "state": "WAITING_FOR_GATE", "gate_id": "MATERIAL_MODULE_ARCHITECTURE_DECISION", "transition_request": str(request.relative_to(repository_root))}
    destination = "DEFINED" if module_state == "IDENTIFIED" else "ARCHITECTED" if module_state == "DEFINED" else "PLANNED"
    apply_state_transition(repository_root, project_id, destination, scope_type="module", module_id=module_id, actor="governance-assurance", reason=f"Independent review approved module {directory}.", evidence=[evidence_rel, review_rel], control_type="INDEPENDENT_REVIEW", execution_id=review_id, expected_state=module_state, idempotency_key=f"module-{module_id}-{directory}-{execution_id}")
    for identifier in (execution_id, review_id):
        advance_execution(repository_root, project_id, identifier, "WAITING_FOR_GATE")
        advance_execution(repository_root, project_id, identifier, "COMPLETED")
    return {"project_id": project_id, "module_id": module_id, "current_state": destination, "state": "COMPLETED", "execution_id": execution_id, "review_execution": review_id}


def resolve_module_architecture_gate(repository_root: Path, project_id: str, module_id: str, decision: str, actor: str, rationale: str) -> dict[str, object]:
    if decision not in {"APPROVED", "REJECTED", "REWORK_REQUIRED"} or not rationale.strip():
        raise IntakeError("valid decision and rationale are required")
    module = repository_root / "projects" / project_id / "modules" / module_id
    status = _read_module_status(module)
    if status.get("pending_gate") != "MATERIAL_MODULE_ARCHITECTURE_DECISION":
        raise IntakeError("module is not waiting for a material architecture decision")
    reference = status.get("pending_transition_request")
    request_path = repository_root / str(reference) if isinstance(reference, str) else None
    request = yaml.safe_load(request_path.read_text(encoding="utf-8")) if request_path and request_path.is_file() else None
    if not isinstance(request, dict) or request.get("from_state") != "DEFINED" or request.get("module_id") != module_id:
        raise IntakeError("module material architecture request is invalid or obsolete")
    decision_id = f"gate-{uuid4().hex}"
    decision_path = _write_immutable(audit_root(repository_root, project_id) / "gate-decisions" / f"{decision_id}.yaml", {
        "gate_decision_id": decision_id, "transition_request_id": request["transition_request_id"], "gate_id": "MATERIAL_MODULE_ARCHITECTURE_DECISION", "decision": decision,
        "control_type": "HUMAN_DECISION", "decided_by": actor, "authority_basis": "human module architecture decision", "evidence_reviewed": list(request["evidence"]), "rationale": rationale.strip(), "decided_at": _now(),
    }, "gate_decision")
    status.pop("pending_transition_request", None)
    status["pending_gate"] = "none"
    (module / "STATUS.md").write_text(_render_module_status(status), encoding="utf-8")
    if decision == "APPROVED":
        apply_state_transition(repository_root, project_id, "ARCHITECTED", scope_type="module", module_id=module_id, actor=actor, reason=rationale, evidence=[str(decision_path.relative_to(repository_root))], control_type="HUMAN_DECISION", expected_state="DEFINED")
    return {"project_id": project_id, "module_id": module_id, "state": "ARCHITECTED" if decision == "APPROVED" else decision, "decision_path": str(decision_path)}


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
        "COMPLETED": {"AUTHORIZED"}, "CANCELLED": set(),
    }
    if status not in allowed[previous]:
        raise IntakeError(f"invalid work item transition: {previous} -> {status}")
    path.write_text(path.read_text(encoding="utf-8").replace(f"**Status:** `{previous}`", f"**Status:** `{status}`", 1), encoding="utf-8")
    return path


def record_validation_finding(repository_root: Path, project_id: str, module_id: str, work_item_id: str, severity: str, evidence: list[str], reproduction: str, resolution: str) -> Path:
    """Persist an immutable validation finding and reopen its authorized work item."""
    if severity not in {"LOW", "MEDIUM", "HIGH", "CRITICAL"} or not evidence or not reproduction.strip() or not resolution.strip():
        raise IntakeError("finding severity, evidence, reproduction and resolution are required")
    project = repository_root / "projects" / project_id
    item = _work_item_path(project, module_id, work_item_id)
    _assert_relative_reference(str(item.relative_to(project)))
    finding_id = f"finding-{uuid4().hex}"
    path = _write_immutable(audit_root(repository_root, project_id) / "findings" / f"{finding_id}.yaml", {
        "finding_id": finding_id, "project_id": project_id, "module_id": module_id, "work_item_id": work_item_id,
        "severity": severity, "evidence": evidence, "reproduction": reproduction.strip(), "resolution": resolution.strip(), "recorded_at": _now(),
    }, "finding")
    if severity in {"HIGH", "CRITICAL"} and work_item_status(project, module_id, work_item_id) == "COMPLETED":
        set_work_item_status(project, module_id, work_item_id, "AUTHORIZED")
    return path


def return_to_implementation_for_finding(repository_root: Path, project_id: str, module_id: str, work_item_id: str, severity: str, evidence: list[str], reproduction: str, resolution: str) -> dict[str, object]:
    """Record a blocking finding and perform the auditable validation rework path."""
    project = repository_root / "projects" / project_id
    if str(migrate_project_status(project)["current_state"]) != "VALIDATION":
        raise IntakeError("validation finding rework requires project state VALIDATION")
    finding = record_validation_finding(repository_root, project_id, module_id, work_item_id, severity, evidence, reproduction, resolution)
    if severity not in {"HIGH", "CRITICAL"}:
        return {"project_id": project_id, "finding_path": str(finding), "state": "RECORDED"}
    apply_state_transition(repository_root, project_id, "IMPLEMENTATION", actor="quality-assurance", reason="Blocking validation finding requires implementation rework.", evidence=[str(finding.relative_to(repository_root))], control_type="AUTOMATED_EVIDENCE", expected_state="VALIDATION", idempotency_key=f"validation-rework-{finding.stem.split('-')[-1]}")
    # Validation is integrated: every active delivery participant must return
    # to a state compatible with the reopened project, not only the module in
    # which the finding was first observed.
    for module in sorted((path for path in (project / "modules").glob("*") if path.is_dir()), key=lambda path: path.name):
        current = str(_read_module_status(module)["current_state"])
        if current != "IMPLEMENTING":
            apply_state_transition(repository_root, project_id, "IMPLEMENTING", scope_type="module", module_id=module.name, actor="quality-assurance", reason="Blocking integrated finding reopens module implementation.", evidence=[str(finding.relative_to(repository_root))], control_type="AUTOMATED_EVIDENCE", expected_state=current, idempotency_key=f"module-rework-{module.name}-{finding.stem.split('-')[-1]}")
    return {"project_id": project_id, "module_id": module_id, "work_item_id": work_item_id, "finding_path": str(finding), "state": "IMPLEMENTATION"}


def pause_or_resume_scope(repository_root: Path, project_id: str, *, scope_type: str, module_id: str | None, reason: str, evidence: list[str], resume: bool = False, actor: str = "human-cli") -> dict[str, object]:
    """Pause an active scope or resume it only to its recorded active state."""
    if scope_type not in {"project", "module"} or not reason.strip() or not evidence:
        raise IntakeError("scope, reason and evidence are required")
    project = repository_root / "projects" / project_id
    status = migrate_project_status(project) if scope_type == "project" else _read_module_status(project / "modules" / str(module_id))
    current = str(status["current_state"])
    if resume and current != "PAUSED":
        raise IntakeError("only a paused scope can be resumed")
    if not resume and current == "PAUSED":
        raise IntakeError("paused scope must be resumed, not paused again")
    destination = str(status.get("last_active_state")) if resume else "PAUSED"
    if resume and not status.get("last_active_state"):
        raise IntakeError("paused scope has no recorded last_active_state")
    apply_state_transition(repository_root, project_id, destination, scope_type=scope_type, module_id=module_id, actor=actor, reason=reason, evidence=evidence, control_type="HUMAN_DECISION", expected_state=current)
    return {"project_id": project_id, "module_id": module_id, "scope_type": scope_type, "state": destination}


def cancel_module(repository_root: Path, project_id: str, module_id: str, reason: str, evidence: list[str], actor: str = "human-cli") -> dict[str, object]:
    """Cancel one module through the same auditable human authority as project cancellation."""
    module = repository_root / "projects" / project_id / "modules" / module_id
    current = str(_read_module_status(module)["current_state"])
    if current in {"CANCELLED", "DELIVERED"}:
        raise IntakeError("only active or paused modules can be cancelled")
    apply_state_transition(repository_root, project_id, "CANCELLED", scope_type="module", module_id=module_id, actor=actor, reason=reason, evidence=evidence, control_type="HUMAN_DECISION", expected_state=current)
    return {"project_id": project_id, "module_id": module_id, "state": "CANCELLED"}


def start_evolution(repository_root: Path, project_id: str, module_ids: list[str], rationale: str, evidence: list[str], actor: str = "human-cli") -> dict[str, object]:
    """Record a change request and reopen only its affected delivered modules."""
    if not module_ids or len(set(module_ids)) != len(module_ids) or not rationale.strip() or not evidence:
        raise IntakeError("affected modules, rationale and evidence are required")
    project = repository_root / "projects" / project_id
    if str(migrate_project_status(project)["current_state"]) != "DELIVERED":
        raise IntakeError("evolution can start only from DELIVERED")
    modules = sorted(module_ids)
    for module_id in modules:
        if not SLUG_PATTERN.fullmatch(module_id) or str(_read_module_status(project / "modules" / module_id)["current_state"]) != "DELIVERED":
            raise IntakeError("each affected evolution module must exist and be DELIVERED")
    change_id = f"change-{uuid4().hex}"
    change_path = _write_immutable(audit_root(repository_root, project_id) / "change-requests" / f"{change_id}.yaml", {
        "change_request_id": change_id, "project_id": project_id, "modules": modules, "rationale": rationale.strip(), "evidence": evidence,
        "requested_by": actor, "requested_at": _now(),
    }, "change_request")
    reference = str(change_path.relative_to(repository_root))
    apply_state_transition(repository_root, project_id, "EVOLUTION", actor=actor, reason=rationale, evidence=[reference], control_type="HUMAN_DECISION", expected_state="DELIVERED")
    for module_id in modules:
        apply_state_transition(repository_root, project_id, "EVOLVING", scope_type="module", module_id=module_id, actor=actor, reason=rationale, evidence=[reference], control_type="HUMAN_DECISION", expected_state="DELIVERED")
        apply_state_transition(repository_root, project_id, "PLANNED", scope_type="module", module_id=module_id, actor=actor, reason="Approved evolution enters a new planned cycle.", evidence=[reference], control_type="HUMAN_DECISION", expected_state="EVOLVING")
    apply_state_transition(repository_root, project_id, "PLANNING", actor=actor, reason="Approved evolution enters planning for affected modules.", evidence=[reference], control_type="HUMAN_DECISION", expected_state="EVOLUTION")
    return {"project_id": project_id, "module_ids": modules, "state": "PLANNING", "change_request_path": str(change_path)}


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
        result = agent_runner(repository_root, project_id, "implementation", work_item_id, module, [item_path, *_active_feedback_inputs(project)], execution_context=context)
    except Exception as error:
        set_work_item_status(project, module_id, work_item_id, "BLOCKED")
        advance_execution(repository_root, project_id, execution_id, "FAILED")
        if isinstance(error, IntakeError):
            raise
        raise IntakeError(f"agent dispatch failed: {error}") from error
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
    """Record a consumer-owned, immutable identity of a published provider contract."""
    required = [contract_reference, compatible_version, business_purpose, integration_owner, impact_and_risk]
    if consumer_project_id == provider_project_id and consumer_module_id == provider_module_id:
        raise IntakeError("a module cannot consume itself")
    if not all(value.strip() for value in required):
        raise IntakeError("module consumption requires all contract fields")
    consumer = repository_root / "projects" / consumer_project_id / "modules" / consumer_module_id
    _read_module_status(consumer)
    contract, contract_version, contract_sha256 = _published_provider_contract(repository_root, provider_project_id, provider_module_id, contract_reference)
    record = consumer / "architecture" / "module-consumption" / f"{provider_project_id}-{provider_module_id}.yaml"
    if record.exists():
        raise IntakeError("module consumption is already registered")
    return _write_yaml(record, {
        "consumer_project_id": consumer_project_id, "consumer_module_id": consumer_module_id,
        "provider_project_id": provider_project_id, "provider_module_id": provider_module_id,
        "contract_reference": contract_reference, "compatible_version": compatible_version,
        "provider_contract_path": str(contract.relative_to(repository_root)), "contract_version": contract_version,
        "contract_sha256": contract_sha256,
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
