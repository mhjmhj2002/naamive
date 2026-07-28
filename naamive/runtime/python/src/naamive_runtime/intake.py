from __future__ import annotations

import re
import shutil
import tempfile
from dataclasses import dataclass
from pathlib import Path

import yaml
from pydantic import BaseModel, field_validator


SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
FRONT_MATTER_PATTERN = re.compile(r"\A---\s*\n(?P<meta>.*?)\n---\s*\n(?P<body>.*)\Z", re.DOTALL)
REQUIRED_SECTIONS = (
    "Problema de negócio",
    "Resultado desejado",
    "Métricas de sucesso",
    "Stakeholders",
    "Restrições conhecidas",
    "Evidências e fontes",
    "Premissas",
    "Questões em aberto",
)
PROHIBITED_TECHNOLOGY = re.compile(
    r"\b(python|node(?:\.js)?|javascript|typescript|java|angular|react|"
    r"framework|banco de dados|postgres|mysql|mongodb|cloud|aws|azure|gcp|"
    r"openai|modelo de ia|arquitetura|microservi[cç]o|deployment)\b",
    re.IGNORECASE,
)


class IntakeError(ValueError):
    """Raised when a project intake request is not valid for the requested action."""


class ProjectRequestMetadata(BaseModel):
    request_id: str
    proposed_project_id: str
    status: str
    title: str
    business_owner: str
    submitted_by: str

    @field_validator("request_id", "proposed_project_id")
    def must_be_kebab_case(cls, value: str) -> str:
        if not SLUG_PATTERN.fullmatch(value):
            raise ValueError("must use kebab-case")
        return value

    @field_validator("status")
    def must_be_known_status(cls, value: str) -> str:
        allowed = {
            "DRAFT",
            "SUBMITTED",
            "REJECTED",
            "WAITING_FOR_REGISTRATION",
            "REGISTERED",
            "CANCELLED",
        }
        if value not in allowed:
            raise ValueError(f"must be one of: {', '.join(sorted(allowed))}")
        return value

    @field_validator("title", "business_owner", "submitted_by")
    def must_not_be_empty_or_placeholder(cls, value: str) -> str:
        if not value.strip() or (value.startswith("<") and value.endswith(">")):
            raise ValueError("must be filled")
        return value.strip()


@dataclass(frozen=True)
class ParsedRequest:
    metadata: ProjectRequestMetadata
    body: str
    path: Path


def request_path(repository_root: Path, request_id: str) -> Path:
    return repository_root / "naamive" / "registries" / "project-intake" / request_id / "PROJECT_REQUEST.md"


def parse_request(path: Path) -> ParsedRequest:
    if not path.is_file():
        raise IntakeError(f"project request not found: {path}")
    document = path.read_text(encoding="utf-8")
    match = FRONT_MATTER_PATTERN.match(document)
    if not match:
        raise IntakeError("PROJECT_REQUEST.md must contain YAML front matter delimited by ---")
    try:
        raw_metadata = yaml.safe_load(match.group("meta"))
    except yaml.YAMLError as error:
        raise IntakeError(f"invalid YAML front matter: {error}") from error
    if not isinstance(raw_metadata, dict):
        raise IntakeError("YAML front matter must be a mapping")
    try:
        metadata = ProjectRequestMetadata(**raw_metadata)
    except ValueError as error:
        raise IntakeError(f"invalid request metadata: {error}") from error
    return ParsedRequest(metadata=metadata, body=match.group("body"), path=path)


def validate_request(request: ParsedRequest, repository_root: Path) -> list[str]:
    errors: list[str] = []
    if request.path.parent.name != request.metadata.request_id:
        errors.append("request_id must match the request directory")
    if (repository_root / "projects" / request.metadata.proposed_project_id).exists():
        errors.append("proposed_project_id already exists")
    for section in REQUIRED_SECTIONS:
        content = section_content(request.body, section)
        if not meaningful(content):
            errors.append(f"required section is empty: {section}")
    if PROHIBITED_TECHNOLOGY.search(request.body):
        errors.append("request contains a prohibited technology decision")
    return errors


def section_content(body: str, section: str) -> str:
    headings = re.escape(section)
    match = re.search(rf"^## {headings}\s*$\n(?P<content>.*?)(?=^## |\Z)", body, re.MULTILINE | re.DOTALL)
    return match.group("content") if match else ""


def meaningful(content: str) -> bool:
    normalized = re.sub(r"[\s\-*:]+", "", content)
    return bool(normalized) and not ("<" in content and ">" in content)


def write_request(request: ParsedRequest, status: str) -> None:
    metadata = request.metadata.model_dump()
    metadata["status"] = status
    serialized = yaml.safe_dump(metadata, allow_unicode=True, sort_keys=False).strip()
    request.path.write_text(f"---\n{serialized}\n---\n\n{request.body.lstrip()}", encoding="utf-8")


def reject_request_document(path: Path) -> None:
    """Record REJECTED for requests whose YAML can still be safely rewritten."""
    if not path.is_file():
        return
    match = FRONT_MATTER_PATTERN.match(path.read_text(encoding="utf-8"))
    if not match:
        return
    try:
        raw_metadata = yaml.safe_load(match.group("meta"))
    except yaml.YAMLError:
        return
    if not isinstance(raw_metadata, dict):
        return
    raw_metadata["status"] = "REJECTED"
    serialized = yaml.safe_dump(raw_metadata, allow_unicode=True, sort_keys=False).strip()
    path.write_text(f"---\n{serialized}\n---\n\n{match.group('body').lstrip()}", encoding="utf-8")


def initialize_request(repository_root: Path, request_id: str) -> Path:
    if not SLUG_PATTERN.fullmatch(request_id):
        raise IntakeError("request_id must use kebab-case")
    destination = request_path(repository_root, request_id)
    if destination.exists():
        raise IntakeError(f"project request already exists: {destination}")
    template = repository_root / "naamive" / "templates" / "project-intake" / "PROJECT_REQUEST_TEMPLATE.md"
    if not template.is_file():
        raise IntakeError(f"project request template not found: {template}")
    destination.parent.mkdir(parents=True, exist_ok=False)
    content = template.read_text(encoding="utf-8").replace("<request-id>", request_id)
    destination.write_text(content, encoding="utf-8")
    return destination


def materialize_project(request: ParsedRequest, repository_root: Path) -> Path:
    project_id = request.metadata.proposed_project_id
    projects_directory = repository_root / "projects"
    destination = projects_directory / project_id
    if destination.exists():
        raise IntakeError(f"project already exists: {destination}")
    templates = repository_root / "naamive" / "templates" / "project"
    required_templates = {
        "PROJECT.md": templates / "PROJECT_TEMPLATE.md",
        "STATUS.md": templates / "STATUS_TEMPLATE.md",
        "need/BUSINESS_NEED.md": templates / "BUSINESS_NEED_TEMPLATE.md",
    }
    missing = [str(path) for path in required_templates.values() if not path.is_file()]
    if missing:
        raise IntakeError(f"project templates not found: {', '.join(missing)}")

    projects_directory.mkdir(parents=True, exist_ok=True)
    temporary_directory = Path(tempfile.mkdtemp(prefix=f".{project_id}.", dir=projects_directory))
    try:
        replacements = {
            "<project-title>": request.metadata.title,
            "<project-id>": project_id,
            "<request-id>": request.metadata.request_id,
            "<business-owner>": request.metadata.business_owner,
            "<gate-decision-reference>": f"REGISTER_PROJECT:{request.metadata.request_id}",
        }
        for relative_path, template in required_templates.items():
            output = temporary_directory / relative_path
            output.parent.mkdir(parents=True, exist_ok=True)
            content = template.read_text(encoding="utf-8")
            for token, value in replacements.items():
                content = content.replace(token, value)
            if relative_path == "need/BUSINESS_NEED.md":
                content = f"{content.rstrip()}\n\n{request.body.strip()}\n"
            output.write_text(content, encoding="utf-8")
        temporary_directory.replace(destination)
    except Exception:
        shutil.rmtree(temporary_directory, ignore_errors=True)
        raise
    return destination
