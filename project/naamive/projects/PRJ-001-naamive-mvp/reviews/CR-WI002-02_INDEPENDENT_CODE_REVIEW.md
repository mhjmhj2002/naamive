# CR-WI002-02 — Independent Code Review (Re-review after EX-005 remediation)

**review_id:** CR-WI002-02  
**review_type:** INDEPENDENT_CODE_REVIEW  
**work_item:** WI-002 — Principal Persistence  
**execution_under_review:** EX-005 — SUCCEEDED / current rework result  
**previous_execution:** EX-004 — SUCCEEDED / HISTORICAL  
**previous_review:** CR-WI002-01 — FAIL / HISTORICAL (immutable)  
**execution_environment_commit:** f5c60de5e3184579d08e25ee6362416c1c4d5ffe  
**review_target_commit:** b943ed2e18602a0060f784b079d05937d8477976  
**rework_base_commit:** caa1168f6eec5710f3ae7bcc6f8006a5ed2f7fcf  
**original_implementation_commit:** da624f2a7206f9eabe95e5c0afedb91b467d780a  
**implementation_principal:** agent:codex:implementation:WI-002:EX-005  
**previous_implementation_principal:** agent:codex:implementation:WI-002:EX-004  
**logical_reviewer_principal:** agent:deepseek:review:CR-WI002-02  
**supervisor_wrapper:** NOT EXPOSED by harness (identity unavailable; not fabricated)  
**runtime_worker_identity:** NOT EXPOSED by harness (identity unavailable; not fabricated)  
**delegation_depth:** 1  
**logical_worker_count:** 1  
**independence:** CONFIRMED — the logical reviewer principal and the implementation principal under review are distinct; no same-principal review; no recursive delegation  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**governing_decision:** DEC-008_WI002_PRINCIPAL_SEMANTICS.md  
**previous_finding:** CR-WI002-F001  
**previous_finding_disposition:** RESOLVED  
**review_started_at:** 2026-09-13T14:54:00-03:00  
**review_completed_at:** 2026-09-13T15:12:00-03:00  
**result:** FAIL  
**blocking_findings:** 1  
**non_blocking_findings:** 1

## Snapshot validation

```text
branch................... lifecycle-reboot
HEAD..................... f5c60de5e3184579d08e25ee6362416c1c4d5ffe  ✓
review_target_commit..... b943ed2e18602a0060f784b079d05937d8477976  ✓ exists, ancestor of HEAD
rework_base_commit....... caa1168f6eec5710f3ae7bcc6f8006a5ed2f7fcf  ✓ exists
commits above target..... cc081996 + f5c60de5 — AGENTS.md only (382+/38-), no technical file
working tree at start.... CLEAN
```

The two commits above the technical target modify **only** `AGENTS.md`. The
technical review target was therefore kept at `b943ed2e…`; it was **not**
redefined to current `HEAD`.

Governed state confirmed as expected: WI-001 `DONE`; WI-002 `IN_REVIEW`;
DC-002 `CREATED`; EX-004 `SUCCEEDED / HISTORICAL`; EX-005 `SUCCEEDED` /
`attempt 2` / `reason REWORK_AFTER_CODE_REVIEW` / `caused_by CR-WI002-01` /
`claim RELEASED / COMPLETED`; CR-WI002-01 `FAIL / HISTORICAL`;
CR-WI002-F001 `REMEDIATION IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`;
Acceptance `NOT GRANTED / BLOCKED`; DEC-008 `CURRENT / GOVERNED`;
PBL `PBL-PRJ001-R1-v1.0`; NB `NB-0002`. No fail-closed divergence.

## Technical scope reviewed

Diff `caa1168f… → b943ed2e…` (SHA-based, later AGENTS.md-only commits excluded):

- `database/migrations/000003_authority__principal_command_boundary.ts` (new, 138 lines)
- `packages/database/src/index.ts` (adapter now calls controlled commands)
- `packages/database/src/principal.integration.ts` (new negative/concurrency proofs)
- consolidated review of `000002` constraints/triggers, Principal domain code,
  effective privileges, and the current projections.

## Independent checks rerun

```text
frozen install (corepack pnpm 12.3.4, committed lockfile)...... PASS
typecheck (all 7 workspace projects)........................... PASS
unit tests (worker, kernel, web)............................... PASS
architecture guardrails........................................ PASS
architecture guardrails tests (12/12).......................... PASS
build (kernel, modules, database, testing, web)................ PASS
clean PostgreSQL 18.6 integration (000001+000002+000003)....... PASS
focused runtime privilege proof................................ PASS
focused expected_version NULL proof............................ FAIL (defect found)
one bounded concurrency proof.................................. PASS
Foundation E2E regression, temporary port 4189.................. PASS (1 test)
```

Node 24.21.0 was used (the `engines` requirement). Port 4173 and its
pre-existing unrelated `vite preview` process were neither used nor modified.

## CR-WI002-F001 — previous blocking finding

**Disposition: RESOLVED.**

Against a pristine disposable PostgreSQL 18.6 database with migrations
`000001`–`000003` applied by `naamive_migrator`, and using the **actual runtime
role** `naamive_web`, one bounded attack matrix was executed (one statement per
invocation so each fails independently):

| # | Attack | Result |
|---|---|---|
| A1 | `INSERT authority.principal` | `permission denied for table principal` |
| A2 | `INSERT authority.principal_history` | `permission denied for table principal_history` |
| A3 | `UPDATE principal SET version = 7` | `permission denied for table principal` |
| A4 | `UPDATE principal SET current_history_event_id = …` | `permission denied` |
| A5 | `UPDATE principal SET username = …` | `permission denied` |
| A6 | `UPDATE principal SET status = …` | `permission denied` |
| A7 | `UPDATE authority.principal_history` | `permission denied` |
| A8 | `DELETE FROM authority.principal_history` | `permission denied` |
| A9 | `DELETE FROM authority.principal` | `permission denied` |
| A10 | `TRUNCATE authority.principal` | `permission denied` |
| A11 | `SELECT authority.principal` | allowed (as intended) |
| A12 | `SELECT authority.principal_history` | allowed (as intended) |

The version-jump/pointer-rewrite bypass demonstrated in CR-WI002-01 is no
longer reachable by a runtime role. **REQUIRED EXIT CONDITION of CR-WI002-F001
is met**: direct runtime DML bypass removed; canonical mutation reachable only
through the controlled command path; expected/current version enforced on the
normal (non-NULL) path; accepted mutation increments exactly +1; material event
semantics controlled; snapshot/history/pointer coherent under real PostgreSQL.

CR-WI002-01 remains immutable historical evidence and was not rewritten.

## Findings

### CR-WI002-02-F001

**Severity:** BLOCKING  
**Category:** OPTIMISTIC CONCURRENCY / EXPECTED-VERSION ENFORCEMENT /
DATABASE BOUNDARY / NULL HANDLING

**Governing expectation:** DEC-008 and WI-002 require every accepted material
mutation to require `expectedVersion`, compare it to the current state and only
then increment by exactly one. A material mutation must not proceed when a valid
expected version is absent: `NULL` must not skip the comparison, implicitly adopt
the current version, or mutate whatever state exists.

**Exact evidence:**

1. Static, from `pg_proc` on the clean database:

```text
change_principal_username  is_strict=f  security_definer=t  proconfig=search_path=pg_catalog, authority
change_principal_status    is_strict=f  security_definer=t  proconfig=search_path=pg_catalog, authority
```

Neither command is `STRICT` (`proisstrict = f`), and neither contains an explicit
`IF expected_version IS NULL` guard. Both compare with the SQL three-valued `<>`
operator (`current_principal.version <> expected_version`), which yields `NULL`
— not `TRUE` — when `expected_version` is `NULL`. In PL/pgSQL an `IF` whose
condition evaluates to `NULL` does **not** raise; control falls through.

2. Runtime, on the clean PostgreSQL 18.6 database as `naamive_web`, one bounded
   probe per command (no retry, no timeout):

```text
create_principal(id, 'nullprobe_01', …)      -> ACTIVE / version 1

change_principal_username(id, NULL, 'nullprobe_02', …)
  -> ACCEPTED: username='nullprobe_02' status='ACTIVE' version=2
  -> history now 2 rows (…PRINCIPAL_CREATED, …USERNAME_CHANGED)
  -> current_history_event_id = the NEW event id

change_principal_status(id, NULL, 'SUSPENDED', …)
  -> ACCEPTED: username='nullprobe_02' status='SUSPENDED' version=3
  -> history now 3 rows (…STATUS_CHANGED at version 3)
  -> current_history_event_id = the NEW event id

control change_principal_status(id, 1, 'ACTIVE', …)  -> ERROR: Principal expected version is stale
control change_principal_status(id, 3, 'ACTIVE', …)  -> ACCEPTED version 4
```

**Observed behavior:** with `expected_version = NULL`, both controlled mutation
commands perform a full material mutation — version advanced by exactly one,
a new material history fact appended and the current pointer advanced — while
**no version comparison at all** is performed. The mutation succeeds regardless
of the caller's knowledge of current state.

**Consequence:** the governed requirement that a material mutation requires a
valid expected version is not enforced at the actual database boundary for a
`NULL` argument. A caller that passes `NULL` (absent/uninitialized expected
version) silently obtains last-writer-wins semantics: it mutates whatever state
exists at the moment of the call. Optimistic concurrency and the no-lost-update
guarantee therefore remain bypassable through a second, independent route — not
via raw DML (which CR-WI002-F001 correctly closed), but via the same controlled
command path with a null expected version. The adapter's own TypeScript typing
(`expectedVersion: bigint`) does not defend the database boundary, since the
boundary is reachable by any runtime-role SQL caller.

**Required exit condition:** make the controlled commands reject a
`NULL`/absent `expected_version` before any state read or mutation — e.g. an
explicit `IF expected_version IS NULL THEN RAISE EXCEPTION …` guard,
`STRICT`, or an equivalent non-null constraint on the parameter — so that a
material mutation cannot proceed without a valid expected version. Add a real
PostgreSQL negative test proving `change_principal_username(id, NULL, …)` and
`change_principal_status(id, NULL, …)` are rejected and leave snapshot, version,
pointer and history unchanged. This finding was **not** remediated during the
review.

### CR-WI002-02-F002

**Severity:** NON_BLOCKING  
**Category:** DOCUMENTATION / CURRENT-PROJECTION (stale narrative)

**Governing expectation:** living/current projections must describe the current
governed state; historical narrative must not contradict the metadata of the
same projection.

**Exact evidence:**

- `modules/MOD-001-project-context/value-increments/VI-001-authenticated-project-context/work-items/WI-002-principal-persistence.md`,
  section *Relation to plan*, still reads: *"`EX-004` está `ELIGIBLE`, sem
  claim operacional e sem início de implementação."* — while the same file's
  metadata (line 13) states `EX-005 — SUCCEEDED / current rework result`, and
  the file's *Process gate* block still lists `→ EX-004 ELIGIBLE`.
- `PROJECT_CONTINUITY.md` still states: *"Próximo avanço governado para WI-002:
  Independent technical review / acceptance audit aplicável ao resultado técnico
  de EX-004."* — while the same document states `WI-002 Execution…… EX-005
  SUCCEEDED / CLAIM RELEASED / current rework result` and that the next action
  is `CR-WI002-02`.

**Observed behavior:** two living projections carry a stale pre-EX-005 narrative
that names EX-004 as the pending/eligible technical result.

**Consequence:** a reader of the prose could misidentify the execution whose
technical result is under review. The governed metadata in these same documents
is correct, so no governed state is corrupted and no lifecycle semantics change;
the impact is documentation/current-projection accuracy only.

**Required exit condition:** reconcile the stale prose with the recorded
EX-005/CR-WI002-02 state in the living projections. This is a documentation
reconciliation, not a technical change, and it does not — by itself — block
acceptance advancement beyond the blocker recorded as CR-WI002-02-F001. It was
**not** silently fixed during the review.

## Assessment by criterion

| Criterion | Result | Review conclusion |
|---|---|---|
| Raw DML boundary | PASS | All ten raw canonical DML vectors denied for the real runtime role; `SELECT` retained. |
| Controlled command path | PASS (non-NULL) | Creation/username/status commands are the only reachable mutation path and behave correctly with a valid expected version. |
| `SECURITY DEFINER` / `search_path` | PASS | Owner `naamive_migrator`; `prosecdef=t`; `proconfig=search_path=pg_catalog, authority`; qualified references; `PUBLIC EXECUTE` revoked on the three commands; only `naamive_web`/`naamive_worker` hold `EXECUTE`; `naamive_observer` denied. |
| Hostile `search_path` | PASS | With `search_path = pg_temp, public` plus a temp `principal` view and temp shadow table, the command still resolved `authority.*` correctly and produced the correct result. |
| Creation semantics | PASS | `status=ACTIVE`, `version=1`, exactly one `PRINCIPAL_CREATED`, pointer matches, snapshot/history values match, total facts = 1. |
| Expected-version (non-NULL) | PASS | `expected == current` accepted → version `+1`, one new fact, pointer advanced, coherent; `expected != current` rejected with snapshot/version/pointer/history unchanged. |
| Expected-version (`NULL`) | **FAIL** | `NULL` is accepted and performs a full material mutation with no comparison. → CR-WI002-02-F001. |
| Real concurrency | PASS | Two separate real connections, `expected = N` on both: exactly one success, exactly one `Principal expected version is stale`; final version `N+1`; exactly one new fact; pointer matches winner; no lost update. |
| Event semantics | PASS | `PRINCIPAL_CREATED` on creation only; `USERNAME_CHANGED` preserves status; `STATUS_CHANGED` only `ACTIVE ↔ SUSPENDED` and preserves username; version `+1` exactly; caller cannot choose `event_type`; no-op username and same-status/invalid-status transitions rejected. |
| Transactional consistency | PASS | No reachable committed state with dangling pointer, cross-Principal pointer, snapshot/history mismatch, or runtime version jump; history not mutable by runtime. |
| DEC-008 regression | PASS | Immutable UUID identity; exact username grammar (no silent normalization, `Bad-Name` rejected); current uniqueness enforced; former username reusable; `ACTIVE`/`SUSPENDED` only; `SUSPENDED` not active. |
| Effective privileges | PASS | `naamive_web`/`naamive_worker`: `SELECT` only on both tables; no DDL (`CREATE` on database and `authority` schema = false); `naamive_migrator` retains privileged DML as migration authority, which is not a runtime bypass finding. |
| Adapter bypass scan | PASS | Production adapter issues only `SELECT` and controlled-command calls; no reachable production raw `INSERT`/`UPDATE` on canonical tables. Raw DML appears only in integration tests and their `dist/` build output (test/setup, classified separately). |
| Clean migration path | PASS | Fresh disposable PostgreSQL 18.6 applied `000001`+`000002`+`000003`; schema, functions, owners, grants, constraints and runtime behaviour verified. |
| Test quality | PASS_WITH_LIMITATION | EX-005 tests use real PostgreSQL and real runtime roles, prove raw-DML denial (incl. history `UPDATE`/`DELETE`) and use separate real connections for concurrency. They do **not** exercise `NULL` `expected_version`, which is why this second route escaped; mocks were not used for database-boundary claims. |

## Timeout / retry / environment incidents

Recorded because they affected probe execution:

1. An early `docker cp` + `psql -f` invocation exceeded its 120 s tool bound
   (no output). No client process remained; the disposable container was healthy.
   Remedy: switch to one bounded `docker exec psql -c` per statement.
2. The first ad-hoc attack heredoc was executed against a connection whose
   default role was the **superuser** (my error), contaminating that disposable
   database. Per AGENTS.md §7.4.5/§21 the contaminated state was **discarded**
   rather than corrected in place: the container was destroyed and recreated
   pristine, and migrations were re-applied. No contaminated evidence is used.
3. Two repository-check runs were initially mis-invoked with a `PATH` override
   that removed the nvm bin (breaking `corepack`), and with Node 24.18.1 instead
   of the required 24.21.0. Both runs were discarded and re-executed correctly
   with Node 24.21.0; only the corrected runs are cited.
4. One `nohup` matrix-script creation was rejected wholesale by the tool for
   exceeding the maximum timeout, so the script did not exist for the first
   attempt. The script was recreated and run with a finite 280 s bound.
5. No probe timeout was extended to obtain a `PASS`. No PostgreSQL probe used
   unbounded `wait`; every probe carried `lock_timeout` + `statement_timeout`
   plus an outer finite process timeout. No orphan process remained.

## Projection consistency

- `WI-002`, `DC-002`, `CURRENT_STATE.md`, `EXECUTION_BOARD.md`, the WI README
  and `PROJECT_CONTINUITY.md` all correctly identify EX-005 as the current
  rework result with claim released, CR-WI002-01 as `FAIL / HISTORICAL`,
  CR-WI002-F001 as `REMEDIATION IMPLEMENTED / AWAITING INDEPENDENT RE-REVIEW`,
  and `CR-WI002-02` as the next governed action.
- The stale narrative recorded as CR-WI002-02-F002 remains present in WI-002
  *Relation to plan* / *Process gate* and in `PROJECT_CONTINUITY.md`. It was
  reported, not silently fixed.

## Conclusion and lifecycle effect

Result: **FAIL** — `CR-WI002-F001` is **RESOLVED**, but one **new BLOCKING**
finding (`CR-WI002-02-F001`) and one NON_BLOCKING finding (`CR-WI002-02-F002`)
were recorded.

```text
WI-002.......................... IN_REVIEW              (unchanged)
EX-005.......................... SUCCEEDED              (unchanged)
CR-WI002-01..................... FAIL / HISTORICAL      (immutable, unchanged)
CR-WI002-F001................... RESOLVED
CR-WI002-02-F001................ BLOCKING / OPEN FOR REWORK
CR-WI002-02-F002................ NON_BLOCKING / OPEN
Implementation.................. CODE REVIEW FAILED / GOVERNED REWORK REQUIRED
Acceptance...................... NOT GRANTED / BLOCKED
Next governed action............ governed rework of the blocking finding
```

No new Execution was created; no `DONE` was declared; no acceptance audit was
performed; no acceptance was requested; no technical implementation was modified.
CR-WI002-01 remains immutable historical evidence. WI-002 was not advanced to
WI-003 and no other Work Item was touched.

This independent review does not constitute acceptance and does not replace the
separately required WI-002 acceptance audit.
