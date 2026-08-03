"""DEPRECATED legacy schemas retained for Node migration reference."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .intake import IntakeError, SLUG_PATTERN


class _AuditRecord(BaseModel):
    model_config = ConfigDict(extra="allow")
    format_version: Literal[1] = 1
    record_type: str


class ExecutionEvent(_AuditRecord):
    record_type: Literal["execution_event"]
    execution_id: str = Field(min_length=1)
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    scope_type: Literal["project", "module"]
    state: Literal["RECEIVED", "VALIDATING", "DISPATCHED", "EVIDENCE_REVIEW", "WAITING_FOR_GATE", "REWORK_REQUIRED", "COMPLETED", "REJECTED", "FAILED", "PAUSED", "CANCELLED"]
    occurred_at: str = Field(min_length=1)


class TransitionRequest(_AuditRecord):
    record_type: Literal["transition_request"]
    transition_request_id: str = Field(min_length=1)
    execution_id: str = Field(min_length=1)
    scope_type: Literal["project", "module"]
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    from_state: str = Field(min_length=1)
    to_state: str = Field(min_length=1)
    evidence: list[str] = Field(min_length=1)
    required_gate: str = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    requested_at: str = Field(min_length=1)


class GateDecision(_AuditRecord):
    record_type: Literal["gate_decision"]
    gate_decision_id: str = Field(min_length=1)
    transition_request_id: str = Field(min_length=1)
    gate_id: str = Field(min_length=1)
    decision: Literal["APPROVED", "REJECTED", "REWORK_REQUIRED"]
    control_type: Literal["AUTOMATED_EVIDENCE", "INDEPENDENT_REVIEW", "HUMAN_DECISION"]
    decided_by: str = Field(min_length=1)
    authority_basis: str = Field(min_length=1)
    evidence_reviewed: list[str] = Field(min_length=1)
    rationale: str = Field(min_length=1)
    decided_at: str = Field(min_length=1)


class IdempotencyIndex(_AuditRecord):
    record_type: Literal["idempotency_index"]
    idempotency_key: str = Field(pattern=SLUG_PATTERN.pattern)
    transition_request: str = Field(min_length=1)
    recorded_at: str = Field(min_length=1)


class DeliveryAcceptanceOperation(_AuditRecord):
    """Append-only record for a coordinated delivery-acceptance operation."""
    record_type: Literal["delivery_acceptance_operation"]
    operation_id: str = Field(min_length=1)
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    transition_request_id: str = Field(min_length=1)
    decision: Literal["APPROVED"]
    participants: list[dict[str, str]]
    expected_project_state: Literal["DELIVERY"]
    expected_module_state: Literal["READY_FOR_DELIVERY"]
    state: Literal["INCOMPLETE", "COMPLETED"]
    recorded_at: str = Field(min_length=1)


class ReleasePackage(_AuditRecord):
    """Immutable identity of the delivery package reviewed for a release."""
    record_type: Literal["release_package"]
    release_package_id: str = Field(min_length=1)
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    execution_id: str = Field(min_length=1)
    package_path: str = Field(min_length=1)
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")
    validation_evidence: list[str] = Field(min_length=1)
    recorded_at: str = Field(min_length=1)


class Finding(_AuditRecord):
    record_type: Literal["finding"]
    finding_id: str = Field(min_length=1)
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    evidence: list[str] = Field(min_length=1)
    reproduction: str = Field(min_length=1)
    resolution: str = Field(min_length=1)
    recorded_at: str = Field(min_length=1)


class ChangeRequest(_AuditRecord):
    record_type: Literal["change_request"]
    change_request_id: str = Field(min_length=1)
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    modules: list[str] = Field(min_length=1)
    rationale: str = Field(min_length=1)
    evidence: list[str] = Field(min_length=1)
    requested_by: str = Field(min_length=1)
    requested_at: str = Field(min_length=1)


class DeletionProof(_AuditRecord):
    record_type: Literal["deletion_proof"]
    project_id: str = Field(pattern=SLUG_PATTERN.pattern)
    prior_state: Literal["CANCELLED"]
    authorization: str = Field(min_length=1)
    deleted_paths: list[str] = Field(min_length=1)
    deleted_at: str = Field(min_length=1)


SCHEMAS = {
    "execution_event": ExecutionEvent,
    "transition_request": TransitionRequest,
    "gate_decision": GateDecision,
    "idempotency_index": IdempotencyIndex,
    "delivery_acceptance_operation": DeliveryAcceptanceOperation,
    "release_package": ReleasePackage,
    "finding": Finding,
    "change_request": ChangeRequest,
    "deletion_proof": DeletionProof,
}


def validate_audit_record(payload: dict[str, object], record_type: str) -> dict[str, object]:
    """Validate and normalize a versioned immutable audit record."""
    model = SCHEMAS.get(record_type)
    if model is None:
        raise IntakeError(f"unknown audit record type: {record_type}")
    try:
        return model.model_validate(dict(payload, format_version=1, record_type=record_type)).model_dump(mode="json")
    except ValidationError as error:
        raise IntakeError(f"invalid {record_type} audit record: {error}") from error
