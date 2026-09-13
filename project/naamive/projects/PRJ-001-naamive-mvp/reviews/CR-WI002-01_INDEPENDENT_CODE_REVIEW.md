# CR-WI002-01 — Independent Code Review

**review_id:** CR-WI002-01  
**review_type:** INDEPENDENT_CODE_REVIEW  
**work_item:** WI-002  
**execution:** EX-004  
**review_target_commit:** da624f2a7206f9eabe95e5c0afedb91b467d780a  
**implementation_base_commit:** 32976c79fce474b24131dd27eccef70423acc1ea  
**implementation_principal:** agent:codex:implementation:WI-002:EX-004  
**reviewer_principal:** agent:codex:review:CR-WI002-01  
**runtime_identity:** agent:codex:/root  
**independence:** CONFIRMED — reviewer and implementation logical principals are distinct  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**governing_decision:** DEC-008  
**review_started_at:** 2026-09-13T11:54:00-03:00  
**review_completed_at:** 2026-09-13T12:08:44-03:00  
**result:** FAIL  
**blocking_findings:** 1  
**non_blocking_findings:** 0

## Snapshot and scope

The branch was `lifecycle-reboot` and `HEAD` was the requested target. WI-001
is `DONE`; WI-002 is `IN_REVIEW`; DC-002 is `CREATED`; EX-004 is `SUCCEEDED`
with claim `RELEASED / COMPLETED`; its authoritative result remains `EX-004
technical result`. DEC-008 is current/governed; the cited baselines and
readiness-audit state match the task snapshot.

The complete diff from the implementation base to the target was reviewed. It
is confined to Principal persistence/domain rules, migration/bootstrap,
integration/tests, package dependency/build configuration, evidence and current
projections. It does not add credentials, login, sessions, grants, UI or
WI-003 behavior.

## Technical assessment

| Criterion | Result | Review conclusion |
|---|---|---|
| DEC-008 identity | PASS | UUID primary identity is stable across ordinary domain mutations; the composite pointer FK prevents reassignment to another Principal. |
| Username | PASS | Application and PostgreSQL use the exact unnormalised language; current uniqueness, mutation, history and former-name reuse work. |
| Status | PASS | Only `ACTIVE`/`SUSPENDED` are stored; domain transitions and active predicate implement the governed model. |
| Snapshot/pointer | PASS | Snapshot has the required fields. The deferrable composite FK plus deferred consistency trigger bind pointer, Principal, version, username and status; currentness is not computed by `MAX(version)`. |
| History | PASS | Schema vocabulary is closed and runtime roles lack `UPDATE`/`DELETE` on history. Normal command paths append one material row. |
| Optimistic concurrency | FAIL | The adapter's row lock is sound, but the granted runtime DML boundary permits bypassing expected-version/version+1 semantics (F001). |
| Transactional consistency | FAIL | Normal adapter transactions are atomic, but the runtime bypass in F001 permits a committed snapshot/history sequence that violates the governed mutation protocol. |
| Migration | PASS | `000002` applies cleanly on PostgreSQL 18.6, is forward-only, uses the authority schema, and its deferred ordering is valid. |
| Privilege/security | FAIL | F001 is a least-privilege/state-bypass failure. No broad runtime DDL grant was observed. |
| Architecture | PASS | `@naamive/database → @naamive/modules` is inward dependency direction; domain rules remain free of database imports and public package exports are used. |
| Restart/reconstruction | PASS | The fresh-connection proof reads durable snapshot and pointer, not a maximum history version. |
| Test quality | PASS_WITH_LIMITATION | The clean integration covers the governed happy/negative paths. It does not exercise concurrent competing writers or hostile runtime DML; the latter omission allowed F001 to escape. |

## Independent checks

- Frozen install: PASS with Corepack pnpm 12.3.4 and the committed lockfile.
- Typecheck: PASS.
- Unit tests: PASS (all workspace tests; Principal domain tests pass).
- Architecture guardrails and guardrail tests: PASS.
- Build: PASS.
- PostgreSQL integration: PASS against a newly created disposable database in
  `naamive-wi002-postgres-1` (PostgreSQL 18.6): migrations `000001` and
  `000002` succeeded; Principal persistence and migration-lock checks passed.
  The temporary database was removed afterward.
- E2E regression: PASS (one foundation smoke) with a temporary Playwright
  config that started the reviewed target on `127.0.0.1:4174`. Port 4173 and
  its unrelated pre-existing server were not used or modified.

The root scripts assume a global `pnpm` shim unavailable in this runtime.
Equivalent commands were executed directly through Corepack; this is an
environment limitation, not a finding against the committed toolchain.

The existing WI-002 PostgreSQL container was not a clean database, so an
initial integration rerun failed on its previously persisted `alpha_01` test
data. The clean disposable rerun passed and is the applicable migration proof.

## Evidence consistency

`executions/evidence/EX-004-WI002.md` is consistent with the clean migration,
username reuse, stale-adapter behavior, append-only restrictions,
current-history pointer, restart/reconnection and PostgreSQL 18.6 claims. Its
runtime-role restriction claim is incomplete as a security proof: it tests only
history `UPDATE` and `DELETE`, not the granted composition of history `INSERT`
with snapshot `UPDATE`; this is recorded as F001 rather than treated as an
otherwise unsupported claim.

## Findings

### CR-WI002-F001

**Severity:** BLOCKING  
**Category:** SECURITY / TRANSACTIONAL CONSISTENCY / OPTIMISTIC CONCURRENCY

**Governing expectation:** DEC-008 and WI-002 require every accepted material
mutation to require `expectedVersion`, compare it to current state, increment
by exactly one, append exactly one corresponding fact and advance the pointer
atomically. The architecture also prohibits direct canonical-state bypass.

**Evidence:** `database/migrations/000002_authority__principal_persistence.ts`
grants `INSERT, UPDATE` on `authority.principal` and `INSERT` on
`authority.principal_history` to both runtime roles. The only deferred trigger
checks that the resulting snapshot matches the pointed history row; it does not
enforce adjacency, an expected version, or event/diff semantics. In the clean
temporary PostgreSQL 18.6 database, as `naamive_web`, the reviewer committed a
valid version-1 Principal/history pair, then inserted a version-7 history row
and updated the snapshot/pointer to version 7 in a second transaction. The
database accepted it and returned `username=bravo_02`, `version=7`.

**Observed behavior:** runtime code can bypass `mutatePrincipal()` and commit a
version jump without any expected-version comparison.

**Consequence:** stale-writer/no-lost-update and exactly-`+1` guarantees are not
enforced at the actual runtime database boundary. A compromised or mistaken web
or worker path can publish canonical Principal state/history outside DEC-008.

**Required exit condition:** remove the direct runtime DML bypass or enforce the
complete mutation protocol at the database boundary (including expected/current
version, adjacency and event semantics), expose only a controlled command path
to runtime roles, and add real PostgreSQL negative/concurrency tests proving
the bypass is rejected.

## Conclusion and lifecycle effect

Result: **FAIL** — one blocking finding. Acceptance is **NOT GRANTED / BLOCKED**.
WI-002 remains `IN_REVIEW`; EX-004 remains `SUCCEEDED`; no new Execution was
created. Implementation is `CODE REVIEW FAILED / GOVERNED REWORK REQUIRED`.
The next action is governed treatment/rework of `CR-WI002-F001`, followed by a
new review path. This review did not perform acceptance audit, acceptance or
any technical rework.
