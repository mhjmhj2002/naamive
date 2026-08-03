# DEPRECATED: legacy Python runtime retained only for Node migration reference.
from __future__ import annotations

import shutil
import subprocess
import os
import re
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from .intake import IntakeError


@dataclass(frozen=True)
class CodexProfile:
    model: str | None = None
    reasoning_effort: str = "low"
    timeout_seconds: int = 900


def codex_command() -> str:
    """Resolve the explicitly configured Codex binary, if any.

    A launcher can set ``NAAMIVE_CODEX_COMMAND`` once for terminals and IDEs;
    accepting an arbitrary IDE cache here would make dispatch non-reproducible.
    """
    configured = os.environ.get("NAAMIVE_CODEX_COMMAND")
    if configured:
        candidate = Path(configured).expanduser()
        if not candidate.is_file() or not os.access(candidate, os.X_OK):
            raise IntakeError("NAAMIVE_CODEX_COMMAND must name an executable Codex CLI")
        if "/.cache/JetBrains/" in str(candidate):
            raise IntakeError("NAAMIVE_CODEX_COMMAND must not point to an IDE cache; install Codex in a stable location")
        return str(candidate.resolve())
    command = shutil.which("codex")
    if not command:
        raise IntakeError("Codex CLI not found on PATH; install or expose codex before dispatching an agent")
    return command


def codex_preflight() -> dict[str, str]:
    """Verify the configured CLI before a real dispatch is created."""
    command = codex_command()
    try:
        result = subprocess.run([command, "--version"], capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise IntakeError(f"Codex preflight could not execute configured CLI: {error}") from error
    if result.returncode != 0:
        raise IntakeError("Codex preflight failed; authenticate or repair the configured Codex CLI")
    if os.environ.get("NAAMIVE_CODEX_AUTH_VERIFIED", "").lower() != "true":
        raise IntakeError("Codex preflight requires NAAMIVE_CODEX_AUTH_VERIFIED=true from the managed launcher or CI")
    return {"command": command, "version": (result.stdout or result.stderr).strip()[:200], "authenticated": "verified-by-launcher"}


def _workspace_snapshot(repository_root: Path) -> dict[Path, tuple[int, int]]:
    snapshot: dict[Path, tuple[int, int]] = {}
    for path in repository_root.rglob("*"):
        relative = path.relative_to(repository_root)
        # IDE workspace state is incidental local metadata.  It is never an
        # authorized write target and is deliberately excluded from collision
        # detection so an open IDE cannot be attributed to an agent dispatch.
        if path.is_file() and ".git" not in relative.parts and ".venv" not in relative.parts and ".idea" not in relative.parts:
            stat = path.stat()
            snapshot[relative] = (stat.st_mtime_ns, stat.st_size)
    return snapshot


def _git(repository_root: Path, *args: str) -> str:
    result = subprocess.run(["git", *args], cwd=repository_root, capture_output=True, text=True)
    if result.returncode != 0:
        raise IntakeError(result.stderr.strip() or f"git {' '.join(args)} failed")
    return result.stdout.strip()


def _git_ref_exists(repository_root: Path, reference: str) -> bool:
    return subprocess.run(["git", "show-ref", "--verify", "--quiet", reference], cwd=repository_root).returncode == 0


def canonical_work_branch(context: dict[str, object]) -> str:
    """Derive the only branch name allowed for an authorized dispatch."""
    project_id = str(context.get("project_id", ""))
    work_item = str(context.get("authorized_work_item", ""))
    module_id = context.get("module_id")
    valid = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    if not valid.fullmatch(project_id) or not valid.fullmatch(work_item):
        raise IntakeError("git dispatch requires kebab-case project_id and authorized_work_item")
    if module_id is not None:
        module = str(module_id)
        if not valid.fullmatch(module):
            raise IntakeError("git dispatch requires a kebab-case module_id")
        return f"work/{project_id}/{module}/{work_item}"
    return f"work/{project_id}/project/{work_item}"


def _allowed(path: str, allowed_paths: list[str]) -> bool:
    candidate = Path(path)
    return any(candidate == Path(allowed) or Path(allowed) in candidate.parents for allowed in allowed_paths)


def _scope_violations(
    before: dict[Path, tuple[int, int]], after: dict[Path, tuple[int, int]], writable_paths: list[Path]
) -> list[str]:
    """Return unauthorized creations, changes, and removals since a dispatch began."""
    changed = {
        path for path in before.keys() | after.keys()
        if before.get(path) != after.get(path)
    }
    return sorted(
        str(path) for path in changed
        if not any(path == allowed or allowed in path.parents for allowed in writable_paths)
    )


@contextmanager
def _ephemeral_worktree(repository_root: Path):
    """Yield an isolated detached worktree and always remove it afterwards."""
    if _git(repository_root, "rev-parse", "--is-inside-work-tree") != "true":
        raise IntakeError("agent dispatch requires a Git worktree for isolation")
    base = _git(repository_root, "rev-parse", "HEAD")
    location = Path(tempfile.mkdtemp(prefix="naamive-dispatch-"))
    location.rmdir()
    try:
        _git(repository_root, "worktree", "add", "--detach", str(location), base)
        yield location
    finally:
        if location.exists():
            subprocess.run(["git", "worktree", "remove", "--force", str(location)], cwd=repository_root, capture_output=True, text=True)
            shutil.rmtree(location, ignore_errors=True)


def _promote_authorized_output(source_root: Path, destination_root: Path, writable_paths: list[Path]) -> list[str]:
    promoted: list[str] = []
    for allowed in writable_paths:
        source = source_root / allowed
        if source.is_file():
            destination = destination_root / allowed
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            promoted.append(str(allowed))
        elif source.is_dir():
            for item in source.rglob("*"):
                if item.is_file():
                    relative = item.relative_to(source_root)
                    destination = destination_root / relative
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(item, destination)
                    promoted.append(str(relative))
    return sorted(set(promoted))


def prepare_git_iteration(repository_root: Path, context: dict[str, object]) -> tuple[str, str]:
    """Put a clean authorized implementation dispatch on its canonical branch.

    This intentionally never touches ``main`` and refuses pre-existing work outside
    the dispatch scope before switching or creating a branch.
    """
    if _git(repository_root, "rev-parse", "--is-inside-work-tree") != "true":
        raise IntakeError("implementation dispatch requires a Git worktree")
    allowed_paths = [str(item) for item in context.get("allowed_write_paths", [])]
    if not allowed_paths:
        raise IntakeError("implementation dispatch requires allowed_write_paths")
    dirty = [line[3:] for line in _git(repository_root, "status", "--porcelain=v1", "--untracked-files=all").splitlines()]
    outside = [path for path in dirty if not _allowed(path, allowed_paths)]
    if outside:
        raise IntakeError(f"unrelated working-tree changes block implementation dispatch: {', '.join(outside)}")
    if dirty:
        raise IntakeError("working-tree changes inside the implementation scope must be resolved before dispatch")
    branch = canonical_work_branch(context)
    if branch == "main":  # Defensive; canonical_work_branch never produces it.
        raise IntakeError("implementation dispatch must not use main")
    base = str(context.get("authorized_base_ref", ""))
    if not base:
        raise IntakeError("implementation dispatch requires authorized_base_ref")
    current = _git(repository_root, "branch", "--show-current")
    if current != branch:
        if _git_ref_exists(repository_root, f"refs/heads/{branch}"):
            _git(repository_root, "switch", branch)
        elif _git_ref_exists(repository_root, f"refs/remotes/origin/{branch}"):
            _git(repository_root, "switch", "--track", "-c", branch, f"origin/{branch}")
        else:
            # Creating from the explicitly authorized base is allowed; no work is committed on main.
            _git(repository_root, "rev-parse", "--verify", base)
            _git(repository_root, "switch", "-c", branch, base)
    return branch, _git(repository_root, "rev-parse", "HEAD")


def verify_git_iteration(repository_root: Path, context: dict[str, object], branch: str, before_head: str) -> str:
    """Verify the agent produced one or more scoped, committed changes."""
    if _git(repository_root, "branch", "--show-current") != branch or branch == "main":
        raise IntakeError("implementation agent changed away from its canonical work branch")
    after_head = _git(repository_root, "rev-parse", "HEAD")
    if after_head == before_head:
        raise IntakeError("implementation agent did not create an atomic commit")
    allowed_paths = [str(item) for item in context["allowed_write_paths"]]
    changed = _git(repository_root, "diff", "--name-only", f"{before_head}..{after_head}").splitlines()
    outside = [path for path in changed if not _allowed(path, allowed_paths)]
    if outside:
        raise IntakeError(f"implementation commit contains unauthorized paths: {', '.join(outside)}")
    if _git(repository_root, "status", "--porcelain=v1", "--untracked-files=all"):
        raise IntakeError("implementation agent left uncommitted changes")
    return after_head


def run_codex_agent(repository_root: Path, project_id: str, agent_id: str, work_item: str, target_path: Path, inputs: list[Path], profile: CodexProfile = CodexProfile(), execution_context: dict[str, object] | None = None) -> dict[str, object]:
    """Run one explicitly-scoped Codex agent and reject writes outside its target path."""
    if not target_path.is_relative_to(repository_root):
        raise IntakeError("agent target_path must be inside the repository")
    relative_target = target_path.relative_to(repository_root)
    context = execution_context or {
        "execution_id": f"manual-{work_item}", "project_id": project_id, "scope_type": "project",
        "target_path": str(relative_target), "current_state": "UNSPECIFIED", "requested_transition": "none",
        "authorized_work_item": work_item, "input_artifacts": [str(path.relative_to(repository_root)) for path in inputs],
        "required_evidence": [str(relative_target)], "authority_context": "explicit manual dispatch",
    }
    implementation_iteration = str(context.get("action_class", "")) == "IMPLEMENTATION"
    writable_paths = [Path(str(item)) for item in context.get("allowed_write_paths", [])] if implementation_iteration else [relative_target]
    # Every real dispatch runs in an isolated checkout. Implementation promotes
    # its validated commit by retaining the canonical branch; evidence rounds
    # promote only their validated authorized files.
    if not context.get("_isolated_workspace") and (repository_root / ".git").exists():
        with _ephemeral_worktree(repository_root) as isolated:
            # A detached worktree starts at HEAD and deliberately omits
            # uncommitted product evidence.  Inputs are immutable for this
            # dispatch, so stage just those authorized files into the isolated
            # workspace before the agent reads them.
            isolated_inputs: list[Path] = []
            for input_path in inputs:
                relative_input = input_path.relative_to(repository_root)
                destination = isolated / relative_input
                destination.parent.mkdir(parents=True, exist_ok=True)
                if input_path.is_file():
                    shutil.copy2(input_path, destination)
                elif input_path.is_dir():
                    shutil.copytree(input_path, destination, dirs_exist_ok=True)
                else:
                    raise IntakeError(f"authorized input does not exist: {relative_input}")
                isolated_inputs.append(destination)
            isolated_context = dict(context, _isolated_workspace=True)
            response = run_codex_agent(
                isolated, project_id, agent_id, work_item, isolated / relative_target,
                isolated_inputs, profile, isolated_context,
            )
            if not implementation_iteration:
                response["promoted_paths"] = _promote_authorized_output(isolated, repository_root, writable_paths)
            else:
                response["promoted_paths"] = [str(response["commit"])]
            response["isolation"] = "ephemeral-worktree"
            return response
    before = _workspace_snapshot(repository_root)
    branch = before_head = None
    if implementation_iteration:
        branch, before_head = prepare_git_iteration(repository_root, context)
    git_instruction = ("Create an atomic commit on the canonical branch after validations; do not push, merge, rebase, or modify main." if implementation_iteration else "Do not change Git branches or create commits.")
    prompt = f"""You are the NAAMIVE agent `{agent_id}`.
Project: `{project_id}`. Authorized work item: `{work_item}`.
Your writable paths are: {', '.join(str(path) for path in writable_paths)}. Read only these authorized inputs: {', '.join(str(path.relative_to(repository_root)) for path in inputs)}.
Follow naamive/agents/{agent_id}/AGENT.md, naamive/contracts/EXECUTION_CONTEXT.md and naamive/contracts/WORK_DISPATCH.md.
The following is the complete, authoritative execution context. It satisfies the contracts; do not reject it merely because the prose above is abbreviated:
```json
{__import__('json').dumps(context, ensure_ascii=False)}
```
Do not change STATUS.md, STATUS_HISTORY.md, dependencies, credentials, or files outside the writable path. {git_instruction} Produce the requested evidence only. In the final response, return a concise JSON object with `summary`, `evidence`, and `transition_requested`.
"""
    configured_model = os.environ.get("NAAMIVE_CODEX_MODEL") or profile.model
    command = [codex_command(), "exec", "--sandbox", "workspace-write", "--cd", str(repository_root), "-c", f'model_reasoning_effort="{profile.reasoning_effort}"']
    if configured_model:
        command.extend(["--model", configured_model])
    command.append(prompt)
    timeout_seconds = int(os.environ.get("NAAMIVE_CODEX_TIMEOUT_SECONDS", profile.timeout_seconds))
    if timeout_seconds <= 0:
        raise IntakeError("Codex timeout must be a positive number of seconds")
    try:
        result = subprocess.run(command, cwd=repository_root, capture_output=True, text=True, timeout=timeout_seconds)
    except subprocess.TimeoutExpired as error:
        after = _workspace_snapshot(repository_root)
        violations = _scope_violations(before, after, writable_paths)
        if violations:
            raise IntakeError(f"agent wrote outside authorized target_path: {', '.join(violations)}") from error
        raise IntakeError(f"Codex agent timed out after {timeout_seconds} seconds") from error
    after = _workspace_snapshot(repository_root)
    violations = _scope_violations(before, after, writable_paths)
    if violations:
        raise IntakeError(f"agent wrote outside authorized target_path: {', '.join(violations)}")
    if result.returncode != 0:
        raise IntakeError(f"Codex agent failed: {result.stderr.strip() or result.stdout.strip()}")
    response = {"agent_id": agent_id, "work_item": work_item, "model": configured_model or "codex-account-default", "reasoning_effort": profile.reasoning_effort, "target_path": str(relative_target), "output": result.stdout.strip()}
    if implementation_iteration:
        response.update({"branch": branch, "commit": verify_git_iteration(repository_root, context, str(branch), str(before_head))})
    return response
