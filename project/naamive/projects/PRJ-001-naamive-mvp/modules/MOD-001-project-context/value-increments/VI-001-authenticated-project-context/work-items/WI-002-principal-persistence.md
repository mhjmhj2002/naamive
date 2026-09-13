# WI-002 — Principal Persistence

**State:** IN_REVIEW
**Project:** PRJ-001  
**Module:** MOD-001 — Project Context  
**Owner:** MOD-001 — Project Context  
**Governing scope:** MODULE  
**Value Increment reference:** VI-001 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Depends on:** WI-001  
**Development Cycle:** DC-002 — `../../../../../development-cycles/DC-002-WI002.md`<br>
**Execution:** EX-004 — SUCCEEDED
**Readiness authority:** GRANTED / EXERCISED
**Implementation authority:** GRANTED
**Code review:** CR-WI002-01 — FAIL / 1 BLOCKING FINDING
**Implementation:** CODE REVIEW FAILED / GOVERNED REWORK REQUIRED
**Acceptance:** NOT GRANTED / BLOCKED
**Readiness human approval:** governance/HUMAN_APPROVAL_WI002_READINESS.md
**Readiness preparation:** governance/WI-002_READINESS_CANDIDATE_R2.md — PREPARED / POSITIVE
**Readiness audit:** AUD-WI002-READINESS-01 — PASS / 0 blocking findings / 0 nonblocking findings
**Governing decision:** decisions/DEC-008_WI002_PRINCIPAL_SEMANTICS.md

## Reason / business intention

This Work Item exists because its outcome is required to materialize or prove the
finite value of VI-001 without forcing the implementation agent to invent a
material product/architecture decision.

## Relation to plan

Canonical entry in DevelopmentRoadmap v2. Its readiness gate is approved and
exercised, and `DC-002` delimita sua Execution autorizada; `EX-004` está
`ELIGIBLE`, sem claim operacional e sem início de implementação.

## Outcome

Persist the human principal and minimum identity state restart-safely.

## Out of scope

Credential verification/login flow; session token lifecycle; Project grants.

## Dependency satisfaction condition

WI-001 = DONE on a baseline compatible with the approved round; workspace/PG guardrails evidence valid.

A dependency is not satisfied merely because its file exists, an agent was
assigned, or an Execution started.

## Acceptance criteria

- `principal_id` is an immutable UUID canonical Principal identity; mutable
  attributes do not change it.
- `username` is a mutable login attribute, unique while current and validated
  exactly as `[a-z][a-z0-9_-]{2,31}`. A prior username is preserved in history
  but is not permanently reserved and may become available under current
  uniqueness rules.
- Principal status is explicitly `ACTIVE` or `SUSPENDED`; only creation to
  `ACTIVE`, `ACTIVE → SUSPENDED`, and `SUSPENDED → ACTIVE` are accepted. Only
  `ACTIVE` is eligible for successful authentication/use as an active Principal.
- `authority.principal` persists the current snapshot with `version bigint` and
  explicit `current_history_event_id`; currentness is not inferred from
  `MAX(version)`.
- `authority.principal_history` is append-only and preserves
  `PRINCIPAL_CREATED`, `USERNAME_CHANGED`, and `STATUS_CHANGED` material facts,
  including historical username ownership by material version.
- A material mutation requires expected version, increments version by exactly
  one when accepted, and produces no history fact when stale.
- Principal snapshot, explicit pointer, version, and reconstructable history
  persist across restart; migrations are explicit and tested on real PostgreSQL.

## Required tests

- clean PostgreSQL migration creates principal structures and constraints
- immutable UUID identity, deterministic current username validation and
  uniqueness behave deterministically; a former username may be reassigned
  after it is no longer current
- creation/status transitions accept only the defined state model; `SUSPENDED`
  is not eligible for successful authentication/use as an active Principal
- current snapshot, explicit pointer, version and append-only material history
  persist for creation, username change and status change
- expected-version stale mutation fails without changing the snapshot or adding
  a history fact; accepted mutation increments version exactly once
- restart reconstruction yields the same snapshot and explicit pointer without
  inferring currentness from `MAX(version)`

## Required evidence

- migration output on PostgreSQL 18.6
- constraint/integration test outputs for UUID, username, status, history and
  optimistic version behavior
- restart persistence and reconstruction evidence, including explicit
  `current_history_event_id`
- implementation diff/artifact scoped to this WI
- DEC-008 and `FND-WI002-RCP-001` resolution references; finding references and
  baseline classification if scope changed

## Review / audit requirement

Because this WI is `MATERIAL`, an independent proportional audit is required
before the relevant readiness/acceptance advancement unless an upstream audit
explicitly proves exact coverage of this WI, same scope, same baseline, same
material decision and current risks/findings.

No such reuse is assumed automatically.

## Normative owner / TB-140 physical mapping

```text
normative owner....... MODULE: MOD-001
ValueIncrement ref.... VI-001
TB-140 anchor......... VALUE_INCREMENT
value_increment_id.... VI-001
project_id............ NULL
derived Module owner.. VI-001.module_id = MOD-001
```

This mapping is governed by
`decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.

Before readiness/Execution, the system must revalidate that the referenced
ValueIncrement still resolves to the declared normative Module owner on a
compatible baseline. `VALUE_INCREMENT` is a physical FK anchor, not a third
normative owner type.

## Process gate

```text
PROPOSED → READY................ APPROVED / EXERCISED
READY → DC-002 CREATED........... recorded
→ EX-004 ELIGIBLE
→ valid operational claim acquired
→ EX-004 RUNNING
→ IN_PROGRESS
```

`EX-004` acquired the valid operational claim on 2026-09-13T11:42:30-03:00 and
produced its technical result on 2026-09-13T11:52:07-03:00. WI-002 is now
`IN_REVIEW`; `CR-WI002-01` returned `FAIL` with the blocking finding
`CR-WI002-F001`; implementation is `CODE REVIEW FAILED / GOVERNED REWORK
REQUIRED`. The next governed action is treatment/rework of that finding; no
acceptance was exercised by EX-004.

A material gap opens a Finding and stops only the affected scope according to
the Gap Protocol.
