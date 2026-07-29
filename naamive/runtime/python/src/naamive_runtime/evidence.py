"""Evidence contracts for the orchestration rounds."""
from __future__ import annotations

import re
from pathlib import Path

from .intake import IntakeError


BUSINESS_REQUIRED = ("problema", "valor", "stakeholders", "fluxo", "restrições", "incertezas", "métricas")
REQUIREMENTS_REQUIRED = ("requisitos", "critérios de aceitação", "rastreabilidade")
MODULE_DEFINITION_REQUIRED = ("módulo", "objetivo", "limites", "rastreabilidade")
TRACEABILITY_REQUIRED = ("execution id", "escopo", "fonte", "responsável", "data", "premissas", "lacunas")
TECHNICAL_MODULE_NAMES = {"backend", "frontend", "database", "banco de dados", "api", "web", "mobile", "common", "utils"}


def require_markdown(path: Path, required_sections: tuple[str, ...], execution_id: str | None = None) -> Path:
    if not path.is_file():
        raise IntakeError(f"required evidence not found: {path}")
    content = path.read_text(encoding="utf-8").lower()
    missing = [section for section in required_sections if section not in content]
    if missing:
        raise IntakeError(f"evidence is missing required sections: {', '.join(missing)}")
    if execution_id and execution_id.lower() not in content:
        raise IntakeError(f"evidence is not linked to execution_id: {path}")
    return path


def validate_business_analysis(project: Path, execution_id: str) -> Path:
    return require_markdown(project / "analysis" / "business" / "BUSINESS_ANALYSIS.md", BUSINESS_REQUIRED + TRACEABILITY_REQUIRED, execution_id)


def validate_module_proposal(project: Path, execution_id: str) -> Path:
    path = require_markdown(project / "analysis" / "domain" / "MODULE_PROPOSAL.md", ("módulos candidatos", "justificativa", "dependências", "riscos", "questões em aberto") + TRACEABILITY_REQUIRED, execution_id)
    candidates = re.findall(r"^\s*-\s+`?([^`\n:]+)`?", path.read_text(encoding="utf-8"), re.MULTILINE)
    invalid = [candidate.strip().lower() for candidate in candidates if candidate.strip().lower() in TECHNICAL_MODULE_NAMES]
    if invalid:
        raise IntakeError(f"module proposal contains technical candidate: {invalid[0]}")
    return path


def validate_requirements(project: Path, execution_id: str) -> Path:
    return require_markdown(project / "analysis" / "requirements" / "REQUIREMENTS.md", REQUIREMENTS_REQUIRED + TRACEABILITY_REQUIRED, execution_id)


def validate_module_definition_document(path: Path, execution_id: str) -> Path:
    return require_markdown(path, MODULE_DEFINITION_REQUIRED + TRACEABILITY_REQUIRED, execution_id)


def validate_review(path: Path, execution_id: str) -> Path:
    reviewed = require_markdown(path, ("critérios verificados", "resultado") + TRACEABILITY_REQUIRED, execution_id)
    if "approved" not in reviewed.read_text(encoding="utf-8").lower():
        raise IntakeError(f"independent review did not approve evidence: {path}")
    return reviewed


def validate_architecture(project: Path, execution_id: str) -> Path:
    return validate_architecture_document(project / "architecture" / "SOLUTION_ARCHITECTURE.md", execution_id)


def validate_architecture_document(path: Path, execution_id: str) -> Path:
    validated = require_markdown(
        path,
        ("decisões", "integrações", "impactos", "riscos", "decisões materiais") + TRACEABILITY_REQUIRED,
        execution_id,
    )
    if not re.search(r"^material_decision_required:\s*(true|false)\s*$", validated.read_text(encoding="utf-8"), re.IGNORECASE | re.MULTILINE):
        raise IntakeError(f"architecture evidence must declare material_decision_required: {path}")
    return validated


def architecture_requires_material_decision(path: Path) -> bool:
    """Read the machine-checkable architectural escalation declaration."""
    content = path.read_text(encoding="utf-8")
    match = re.search(r"^material_decision_required:\s*(true|false)\s*$", content, re.IGNORECASE | re.MULTILINE)
    if not match:
        raise IntakeError(f"architecture evidence must declare material_decision_required: {path}")
    return match.group(1).lower() == "true"


def validate_delivery_plan(project: Path, execution_id: str) -> Path:
    return validate_delivery_plan_document(project / "planning" / "DELIVERY_PLAN.md", execution_id)


def validate_delivery_plan_document(path: Path, execution_id: str) -> Path:
    validated = require_markdown(
        path,
        ("roadmap", "releases", "riscos", "dependências", "work items", "critérios de pronto") + TRACEABILITY_REQUIRED,
        execution_id,
    )
    content = validated.read_text(encoding="utf-8")
    if not re.search(r"^risks_resolved:\s*true\s*$", content, re.IGNORECASE | re.MULTILINE) or not re.search(r"^dependencies_resolved:\s*true\s*$", content, re.IGNORECASE | re.MULTILINE) or not re.search(r"^unresolved_risks:\s*\[\s*\]\s*$", content, re.MULTILINE):
        raise IntakeError(f"delivery plan has unresolved risks or dependencies: {path}")
    return validated


def validate_integration_report(project: Path, execution_id: str) -> Path:
    return require_markdown(project / "integration" / "INTEGRATION_REPORT.md", ("contratos", "fluxos", "sistemas externos", "incompatibilidades", "resultado") + TRACEABILITY_REQUIRED, execution_id)


def validate_quality_report(project: Path, execution_id: str) -> Path:
    return require_markdown(project / "validation" / "QUALITY_REPORT.md", ("requisitos", "critérios de aceitação", "testes", "achados", "resultado") + TRACEABILITY_REQUIRED, execution_id)


def validate_security_assessment(project: Path, execution_id: str) -> Path:
    validated = require_markdown(project / "validation" / "security" / "SECURITY_ASSESSMENT.md", ("riscos", "impacto", "mitigação", "exceções", "risco residual", "resultado") + TRACEABILITY_REQUIRED, execution_id)
    _require_gate_marker(validated, "residual_risk_acceptance_required")
    return validated


def validate_delivery_package(project: Path, execution_id: str) -> Path:
    validated = require_markdown(project / "delivery" / "DELIVERY_PACKAGE.md", ("release", "implantação", "reversão", "operação", "observabilidade", "handover", "resultado") + TRACEABILITY_REQUIRED, execution_id)
    _require_gate_marker(validated, "release_authorization_required")
    return validated


def _require_gate_marker(path: Path, marker: str) -> None:
    if not re.search(rf"^{re.escape(marker)}:\s*(true|false)\s*$", path.read_text(encoding="utf-8"), re.IGNORECASE | re.MULTILINE):
        raise IntakeError(f"evidence must declare {marker}: true|false: {path}")


def report_requires_human_gate(path: Path, marker: str) -> bool:
    """Read an explicit boolean escalation marker from a validated report."""
    match = re.search(rf"^{re.escape(marker)}:\s*(true|false)\s*$", path.read_text(encoding="utf-8"), re.IGNORECASE | re.MULTILINE)
    return bool(match and match.group(1).lower() == "true")
