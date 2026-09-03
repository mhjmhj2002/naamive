# NAAMIVE Agent Instructions

## Mission

When given an implementation task, complete the entire requested scope before stopping.

Do not treat partial implementation as task completion.

The goal is to deliver complete, validated, minimal, production-quality changes that respect the existing architecture and project lifecycle.

## Task completion

Before finishing any implementation task:

1. Re-read the original task.
2. Identify every explicit requirement and acceptance criterion.
3. Verify that each requirement was implemented.
4. Run the relevant tests and validations.
5. Fix failures caused by your changes.
6. Review the final `git status`.
7. Review the final `git diff`.
8. Confirm that no requested item was silently omitted or postponed.

Do not describe unfinished requirements from the current task as "next steps".

If something belongs to the requested scope, implement it before declaring the task complete.

## Autonomy

Do not ask for confirmation for normal engineering decisions that can be resolved by inspecting the repository.

When information is available in source code, tests, migrations, documentation, planning files, existing contracts, or project conventions, inspect those sources and make the decision yourself.

Do not stop because an unexpected implementation detail appears. Investigate it and continue.

Ask the user only when:

- requirements are genuinely contradictory;
- a required business decision cannot be inferred from the repository or task;
- completing the task would require an irreversible or destructive action;
- required external information is unavailable and cannot be inferred safely.

Do not ask the user to make technical implementation decisions that can reasonably be resolved from the repository.

## Scope discipline

Never silently reduce, simplify, reinterpret, or narrow the requested scope to make the task easier.

If a task requests multiple requirements, all remain required unless explicitly marked optional.

Do not omit a requirement merely because:

- it requires changes in another architectural layer;
- it requires additional tests;
- it requires a migration;
- it requires changing an API or internal contract;
- it requires modifying workflow or orchestration behavior;
- it requires documentation updates;
- it makes the implementation larger than initially expected.

When implementation reveals additional work that is strictly necessary for the requested behavior to work correctly, include that work when it is a natural consequence of the task.

Before finishing, map every requirement from the original task to corresponding implementation or validation evidence.

If any requested requirement remains unmet, the task is not complete.

## Planning before implementation

Before modifying code:

1. Read the complete task.
2. Inspect the relevant source code.
3. Inspect relevant tests.
4. Inspect relevant migrations and persistence structures when applicable.
5. Inspect relevant planning, architecture, lifecycle, and orchestration documents.
6. Identify all affected layers.
7. Understand existing behavior before changing it.

Do not begin by assuming the implementation path from the task text alone when the repository can provide additional context.

Do not stop after planning. Planning is preparation for implementation, not completion.

## Continuity and checkpoint context

Before modifying code, when the relevant phase or workstream contains a current
continuity, checkpoint, or operational-context file, locate and read the most
recent relevant one.

Continuity and checkpoint files provide operational context. They do not
replace:

- the active task;
- architectural contracts;
- current code, schema, migrations, or persisted state; or
- normative or canonical documentation.

Do not overwrite dated historical context files to represent a new state. When
context changes materially, prefer creating a new dated checkpoint. When
multiple checkpoints exist, use the most recent relevant checkpoint while
preserving earlier files as historical evidence.

## Validation discipline

Tests and validations are part of implementation, not optional follow-up work.

Before declaring a task complete:

1. Identify which validations are relevant to the changed behavior.
2. Run relevant unit tests.
3. Run relevant integration tests.
4. Run relevant E2E tests.
5. Run build, type checking, linting, migrations, or other repository validations when applicable.
6. If a validation fails, determine whether the failure was caused by the current changes.
7. Fix every failure caused by the current changes.
8. Re-run the affected validation after the fix.

Do not claim that a test, build, migration, or validation passed unless it was actually executed.

Do not use a narrower successful test as evidence that broader affected behavior is correct when additional relevant validation is available.

Do not leave known failures caused by the implementation for the user to fix.

## Testing expectations

Automated PostgreSQL tests MUST use disposable isolated databases. The runtime/manual database `naamive` MUST NEVER be used by automated tests; do not point a test `DATABASE_URL` at it, use the repository test runner/helper, and never solve a failing test by deleting or resetting the runtime/manual database.

Tests must validate behavior, not merely implementation details.

When applicable, cover:

- happy path;
- invalid input;
- boundary conditions;
- authorization or access constraints;
- persistence behavior;
- workflow transitions;
- idempotency;
- duplicate requests;
- incompatible state;
- missing dependencies;
- failure behavior;
- backward compatibility;
- regression scenarios.

When database behavior is part of the task, use the repository's real PostgreSQL integration/E2E infrastructure when available instead of replacing database validation with mocks.

When workflow or orchestration behavior changes, test both the expected transition and the behavior that must not occur.

## Change discipline

Preserve existing behavior that is outside the requested scope.

Do not modify completed functionality merely because another implementation would be cleaner or more convenient.

Avoid unrelated refactors while executing focused work.

Prefer the smallest complete change, not the smallest partial change.

When a change to existing behavior is truly required:

1. keep the change as small as practical;
2. preserve backward compatibility when applicable;
3. update affected tests;
4. include regression coverage when appropriate;
5. explicitly mention the behavior change in the final response.

Never discard, overwrite, revert, or clean existing user changes unless explicitly requested.

## NAAMIVE lifecycle discipline

NAAMIVE is developed incrementally through numbered phases.

Treat behavior delivered by completed phases as stable unless the current task explicitly requires changing it.

When implementing work for the current phase:

1. inspect the relevant phase planning documentation;
2. identify dependencies on previously completed phases;
3. preserve completed phase behavior;
4. avoid broad rewrites of earlier phase implementations;
5. validate that new behavior does not regress earlier contracts.

If current work requires changing behavior introduced by an earlier phase, make the smallest compatible change and add regression coverage when applicable.

Never silently migrate older workflow behavior into a newer lifecycle version unless the task explicitly requires it.

## Planning and architecture documents

Planning and architecture documents define intended behavior and domain constraints.

Relevant documentation may include:

- delivery roadmap;
- lifecycle compass;
- orchestration protocol;
- phase planning documents;
- architecture documents;
- runtime contracts;
- domain specifications.

Before implementing phase work, inspect the documents relevant to that task.

Do not rewrite planning or architecture documents merely to match an incorrect implementation.

When documentation and runtime behavior appear inconsistent:

1. investigate which artifact represents the intended current contract;
2. inspect tests and historical implementation;
3. make the smallest correct change;
4. avoid inventing new domain rules without evidence.

If the task explicitly requires documentation updates, update all directly affected authoritative documents.

## Workflow and orchestration

When changing workflow or orchestration behavior:

1. inspect the complete transition path;
2. inspect current lifecycle/version behavior;
3. validate source state;
4. validate destination state;
5. validate side effects;
6. validate operations/jobs created;
7. validate persistence;
8. validate retry or idempotency behavior when applicable;
9. validate that older lifecycle versions remain unaffected unless explicitly required.

Do not implement only the success transition while ignoring guards, error behavior, operations, persistence, or compatibility.

## Persistence and migrations

When persistence behavior changes:

1. inspect existing schema and migrations;
2. follow existing migration conventions;
3. preserve migration ordering;
4. do not rewrite already-applied migrations unless explicitly required;
5. add a new migration when schema evolution is required;
6. preserve referential integrity;
7. validate constraints and indexes where relevant;
8. add or update persistence tests.

Do not make schema assumptions without inspecting the actual database model.

Do not use application-level logic to compensate for a missing database invariant when the invariant belongs in the database.

## API and contract discipline

When changing an API or internal contract:

1. inspect current consumers;
2. preserve compatibility unless breaking behavior is explicitly required;
3. validate required fields;
4. validate invalid and unknown inputs;
5. validate error responses;
6. update tests;
7. update authoritative documentation when required.

Do not expose internal implementation state unless the contract explicitly requires it.

## Agent context isolation and ephemerality

Context isolation is a repository-wide architectural invariant. Preserve it in every current or future path that invokes, retries, reviews, replaces, routes, assists, recovers, or otherwise delegates work to an AI/model provider.

The authoritative state of NAAMIVE must live outside the model, in canonical persisted state such as database records, versioned contracts, snapshots, artifacts/evidence, jobs/operations, and Git state. Provider conversation memory, local model session state, transcripts, hidden context, or opaque continuation state must never become authoritative project state.

Every provider invocation must be treated as disposable and independently reconstructable.

When implementing or modifying any agent execution path:

1. construct model input explicitly from canonical persisted state and explicitly allowed artifacts/evidence;
2. keep the execution context minimal sufficient for the task;
3. bound context by explicit size/count/token policies where applicable;
4. make every reused source, prior output, or prior decision explicit and auditable;
5. do not rely on provider-side conversational memory for correctness, recovery, or continuation;
6. preserve enough persisted state to discard a degraded execution and start another without losing authoritative project state.

### Forbidden implicit conversational carry-over

Do not introduce or propagate conversational continuation state between independent dispatches unless a future versioned architectural contract explicitly authorizes it.

This includes, but is not limited to:

- `conversation_id`;
- `thread_id`;
- `previous_response_id`;
- provider session/thread references;
- `previous_messages`;
- chat history;
- transcript;
- hidden/opaque continuation handles;
- automatic resume/fork behavior;
- producer reasoning or conversational context injected into a reviewer.

Authentication/session mechanisms used only to authenticate a CLI or provider are not model conversation state and must not be repurposed as such.

### Retry semantics

A retry is a new concrete provider invocation, not continuation of the previous model conversation.

For a pure retry:

- do not send the prior attempt transcript, prompt history, model reasoning, stdout/stderr, or provider conversation state;
- prefer the same frozen execution-context snapshot/hash as the failed attempt;
- if canonical context must materially change, represent that change explicitly through a new execution/version or other governed lifecycle transition instead of silently changing the meaning of a retry;
- make retry context identity auditable.

A logical `AgentExecution` may have multiple attempts, but sharing logical execution identity must never imply sharing model conversation state.

### Reviewer independence

An independent reviewer must receive only the explicitly governed review package, referenced structured output, and other evidence explicitly allowed by the review contract.

A reviewer must not inherit:

- producer conversation history;
- producer prompt history;
- producer reasoning;
- producer stdout/stderr;
- producer tool-call transcript;
- producer provider thread/session identifiers;
- unrelated execution history.

Reviewer retry and reviewer replacement must preserve the same isolation principle. A failed or degraded reviewer must be disposable without requiring its conversational state to continue review processing.

### Planning, repair, assistance, routing, specialist and recovery flows

Do not recursively accumulate conversational history across planning, semantic repair, assistance, routing, specialist, recovery, or assurance stages.

If a prior candidate/output must be reused, pass it as explicit structured data through a defined contract. Keep it bounded, sanitized, versioned or hashed where appropriate, and distinguish it from conversational memory.

Semantic repair may use a prior candidate only when deliberately required by the repair contract; this must remain bounded and must not evolve into open-ended transcript accumulation.

Recovery should prefer deterministic reconstruction from persisted facts whenever possible.

### Provider/runtime isolation

Use the strongest supported ephemeral/non-resume execution mode for normal provider invocations.

For Codex CLI execution paths, use `--ephemeral` when the invoked command/runtime supports it, unless a versioned architectural contract explicitly requires a different mode.

Do not add `resume`, thread reuse, conversation reuse, or equivalent behavior as an implementation convenience.

Temporary workdirs, local provider homes, caches, credentials, or authentication sessions must not create an implicit dependency on conversational state from an earlier dispatch.

### Context bounds and observability

When introducing or modifying an execution context, review package, artifact/evidence collection, or prior-output reference set:

- define reasonable bounds for arrays, strings, references, bytes, or estimated tokens;
- avoid unbounded "all history", "all events", "all artifacts", "all attempts", or "all logs" context construction;
- prefer source references, versions, hashes, and selected structured fields over bulk history;
- preserve an auditable context identity without persisting raw prompts, secrets, reasoning, or sensitive provider payloads.

Where the runtime supports it, prefer recording metadata such as:

- context schema/version;
- context hash;
- source/reference count;
- context byte size;
- estimated input tokens;
- pruning/truncation indicators;
- ephemeral/non-ephemeral execution mode.

### Required validation for context-sensitive changes

Any task that creates or changes an agent/provider execution path must verify the isolation invariant as part of implementation.

When applicable, add or update tests proving that:

- retries create a new provider invocation;
- pure retries do not inherit opaque conversational state;
- frozen context identity remains stable across a pure retry;
- reviewers do not receive producer conversational state;
- oversized context is bounded or rejected deterministically;
- long-running/repeated cycles do not grow context monotonically merely because execution history exists;
- new provider adapters do not silently add conversation/thread continuation.

Do not consider a new agent execution path complete if it depends on opaque conversational state or if its context growth is unbounded without an explicit contract.

If a task appears to require violating this invariant, stop treating the change as an ordinary implementation detail. Inspect the authoritative architecture/lifecycle documents and require an explicit versioned contract change rather than silently weakening isolation.

## Git discipline

Before declaring a task complete:

1. Run `git status`.
2. Review the final `git diff`.
3. Verify that no unrelated files were modified.
4. Verify that temporary, generated, debug, or accidental files were not left behind.
5. Verify that existing user changes were preserved.
6. Confirm that the resulting diff matches the requested scope.

Do not automatically commit, push, rebase, merge, reset, clean, or open/update a pull request unless the task explicitly requests that action.

## Repository hygiene

Do not leave behind:

- debug logs;
- temporary files;
- experimental scripts;
- commented-out implementation;
- dead code created during the task;
- unused imports;
- duplicate tests;
- accidental snapshots;
- generated artifacts that do not belong in version control.

Do not delete existing artifacts simply because they appear unused without first confirming they are outside the current contract.

## Definition of Done

A task is DONE only when all applicable conditions are satisfied:

- all requested behavior is implemented;
- all acceptance criteria are satisfied;
- affected architectural layers are updated;
- required migrations are included;
- required tests are added or updated;
- relevant tests pass;
- relevant build and validation commands pass;
- no known regression introduced by the task remains;
- the final diff has been reviewed;
- no requested item was silently postponed;
- no unrelated behavior was changed unnecessarily.

If any applicable condition above is not satisfied, the task is not done.

## Final response

The final response must clearly state:

- what was implemented;
- important files changed;
- tests added or modified;
- validation commands executed;
- validation results;
- relevant compatibility or migration notes;
- any requested item that could not be completed and the exact reason.

Do not claim full completion when scope remains unfinished.

Do not present work that belongs to the current task as future work.

Keep the final report concise but complete.
