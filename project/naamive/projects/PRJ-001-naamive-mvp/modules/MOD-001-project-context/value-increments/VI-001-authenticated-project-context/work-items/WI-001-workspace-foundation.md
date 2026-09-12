# WI-001 — Repository / Workspace Foundation

**State:** PROPOSED  
**Project:** PRJ-001  
**Module:** MOD-001 — Project Context  
**Owner:** PRJ-001 — NAAMIVE MVP  
**Governing scope:** PROJECT  
**Value Increment reference:** VI-001 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**Depends on:** none  
**Development Cycle:** NOT CREATED  
**Execution:** NONE  
**Readiness authority:** NOT GRANTED

## Reason / business intention

This Work Item exists because its outcome is required to materialize or prove the
finite value of VI-001 without forcing the implementation agent to invent a
material product/architecture decision.

## Relation to plan

Canonical proposed entry in DevelopmentRoadmap v2. It remains non-executable
until the round is approved and its own readiness gate passes.

## Outcome

Create the reproducible monorepo/workspace/build/guardrail foundation required by the first Value Increment.

## Out of scope

Business/domain behavior; authentication rules; Project/VI lifecycle mutation.

## Dependency satisfaction condition

Round-1 approval materialized on the same audited baseline; no predecessor WI.

A dependency is not satisfied merely because its file exists, an agent was
assigned, or an Execution started.

## Acceptance criteria

- pnpm workspace bootstrap reproducible
- apps/web and apps/worker composition roots
- packages/contracts, kernel, database, modules, testing
- strict TypeScript / ESM
- architecture guardrails executable
- PostgreSQL 18.6 integration available
- no business rules placed in composition roots

## Required tests

- frozen pnpm install succeeds from committed lockfile
- TypeScript strict/ESM typecheck and build pass
- architecture guardrails reject forbidden deep/private imports
- real PostgreSQL 18.6 integration bootstrap succeeds
- workspace/app composition-root smoke tests pass

## Required evidence

- tool/version snapshot and lockfile digest
- pipeline outputs for install/typecheck/architecture/integration/build
- workspace tree / configuration diff
- implementation diff/artifact scoped to this WI
- finding references and baseline classification if scope changed

## Review / audit requirement

Because this WI is `MATERIAL`, an independent proportional audit is required
before the relevant readiness/acceptance advancement unless an upstream audit
explicitly proves exact coverage of this WI, same scope, same baseline, same
material decision and current risks/findings.

No such reuse is assumed automatically.

## Normative owner / TB-140 physical mapping

```text
normative owner....... PROJECT: PRJ-001
TB-140 anchor......... PROJECT_TRANSVERSAL
project_id............ PRJ-001
value_increment_id.... NULL
```

This mapping is governed by
`decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.

The TB-140 physical discriminator is not a substitute for lifecycle ownership.

## Process gate

```text
PROPOSED
→ readiness review against current approved baseline
→ applicable independent audit / explicit coverage proof
→ human/authority decision as required
→ READY
→ create Development Cycle
→ valid Execution starts
→ IN_PROGRESS
```

No code may start while this Work Item remains `PROPOSED`.

A material gap opens a Finding and stops only the affected scope according to
the Gap Protocol.
