from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from naamive_runtime import codex_executor
from naamive_runtime.codex_executor import CodexProfile, _scope_violations, canonical_work_branch, codex_command, codex_preflight, prepare_git_iteration, run_codex_agent, verify_git_iteration
from naamive_runtime.intake import IntakeError


def git(repo: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=True)
    return result.stdout.strip()


def repository(tmp_path: Path) -> Path:
    git(tmp_path, "init", "-b", "main")
    git(tmp_path, "config", "user.name", "test")
    git(tmp_path, "config", "user.email", "test@example.invalid")
    (tmp_path / "README.md").write_text("base\n", encoding="utf-8")
    git(tmp_path, "add", "README.md")
    git(tmp_path, "commit", "-m", "initial")
    return tmp_path


def context() -> dict[str, object]:
    return {
        "project_id": "sample", "module_id": "catalog", "authorized_work_item": "catalog-rules",
        "authorized_base_ref": "main", "allowed_write_paths": ["projects/sample/modules/catalog/applications"],
    }


def test_derives_canonical_module_branch() -> None:
    assert canonical_work_branch(context()) == "work/sample/catalog/catalog-rules"


def test_codex_command_uses_explicit_stable_binary(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    binary = tmp_path / "codex"
    binary.write_text("#!/bin/sh\n", encoding="utf-8")
    binary.chmod(0o755)
    monkeypatch.setenv("NAAMIVE_CODEX_COMMAND", str(binary))
    assert codex_command() == str(binary.resolve())


def test_codex_preflight_records_configured_version(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    binary = tmp_path / "codex"
    binary.write_text("#!/bin/sh\necho codex-test-1.0\n", encoding="utf-8")
    binary.chmod(0o755)
    monkeypatch.setenv("NAAMIVE_CODEX_COMMAND", str(binary))
    monkeypatch.setenv("NAAMIVE_CODEX_AUTH_VERIFIED", "true")
    assert codex_preflight()["version"] == "codex-test-1.0"


def test_codex_preflight_rejects_unattested_authentication(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    binary = tmp_path / "codex"
    binary.write_text("#!/bin/sh\necho codex-test-1.0\n", encoding="utf-8")
    binary.chmod(0o755)
    monkeypatch.setenv("NAAMIVE_CODEX_COMMAND", str(binary))
    monkeypatch.delenv("NAAMIVE_CODEX_AUTH_VERIFIED", raising=False)
    with pytest.raises(IntakeError, match="AUTH_VERIFIED"):
        codex_preflight()


def test_git_iteration_creates_branch_and_records_scoped_commit(tmp_path: Path) -> None:
    repo = repository(tmp_path)
    branch, before = prepare_git_iteration(repo, context())
    target = repo / "projects/sample/modules/catalog/applications"
    target.mkdir(parents=True)
    (target / "rules.py").write_text("RULE = 1\n", encoding="utf-8")
    git(repo, "add", "projects/sample/modules/catalog/applications/rules.py")
    git(repo, "commit", "-m", "agent(implementation): catalog rules")
    assert verify_git_iteration(repo, context(), branch, before) == git(repo, "rev-parse", "HEAD")
    assert git(repo, "branch", "--show-current") == "work/sample/catalog/catalog-rules"


def test_git_iteration_switches_to_existing_canonical_branch(tmp_path: Path) -> None:
    repo = repository(tmp_path)
    git(repo, "switch", "-c", "work/sample/catalog/catalog-rules")
    git(repo, "switch", "main")
    branch, _ = prepare_git_iteration(repo, context())
    assert branch == "work/sample/catalog/catalog-rules"
    assert git(repo, "branch", "--show-current") == branch


def test_git_iteration_rejects_unrelated_worktree_changes(tmp_path: Path) -> None:
    repo = repository(tmp_path)
    (repo / "unrelated.txt").write_text("do not touch\n", encoding="utf-8")
    with pytest.raises(IntakeError, match="unrelated working-tree changes"):
        prepare_git_iteration(repo, context())


def test_git_iteration_rejects_unauthorized_committed_path(tmp_path: Path) -> None:
    repo = repository(tmp_path)
    branch, before = prepare_git_iteration(repo, context())
    (repo / "outside.py").write_text("x = 1\n", encoding="utf-8")
    git(repo, "add", "outside.py")
    git(repo, "commit", "-m", "agent(implementation): invalid")
    with pytest.raises(IntakeError, match="unauthorized paths"):
        verify_git_iteration(repo, context(), branch, before)


def test_scope_check_rejects_removal_outside_authorized_path() -> None:
    before = {Path("authorized/evidence.md"): (1, 1), Path("STATUS.md"): (1, 1)}
    after = {Path("authorized/evidence.md"): (1, 1)}

    assert _scope_violations(before, after, [Path("authorized")]) == ["STATUS.md"]


def test_codex_timeout_is_translated_to_domain_failure(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(codex_executor, "codex_command", lambda: "codex")

    def time_out(*args: object, **kwargs: object) -> object:
        raise subprocess.TimeoutExpired("codex exec", 3)

    monkeypatch.setattr(codex_executor.subprocess, "run", time_out)
    target = tmp_path / "projects/sample/analysis/business"

    with pytest.raises(IntakeError, match="timed out after 3 seconds"):
        run_codex_agent(tmp_path, "sample", "business-analysis", "analyze", target, [], profile=CodexProfile(timeout_seconds=3))
