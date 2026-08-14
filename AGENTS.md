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