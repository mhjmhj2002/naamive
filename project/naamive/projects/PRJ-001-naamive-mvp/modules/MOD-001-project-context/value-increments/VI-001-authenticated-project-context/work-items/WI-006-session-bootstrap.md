# WI-006 — Session Bootstrap

**State:** PROPOSED  
**Project:** PRJ-001  
**Module:** MOD-001 — Project Context  
**Owner:** MOD-001 — Project Context  
**Governing scope:** MODULE  
**Value Increment reference:** VI-001 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Depends on:** WI-004, WI-005  
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

Expose authenticated session bootstrap needed by the AppShell without leaking domain internals.

## Out of scope

Project list/query; Project selection; lifecycle mutation.

## Dependency satisfaction condition

WI-004 and WI-005 = DONE; session and authority contracts stable.

A dependency is not satisfied merely because its file exists, an agent was
assigned, or an Execution started.

## Acceptance criteria

- GET /api/session
- explicit transport DTO
- no domain internals leaked
- CSRF token/capability projection per TIR
- expired/revoked state handled

## Required tests

- valid session returns typed bootstrap DTO
- expired/revoked session denied consistently
- CSRF token/capability projection generated and validated
- DTO contains no domain/private persistence internals
- restart preserves correct bootstrap behavior

## Required evidence

- API schema/contract tests
- session+CSRF integration outputs
- restart bootstrap evidence
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
PROPOSED
→ readiness review against current approved baseline
→ applicable independent evidence / explicit coverage proof
→ human/authority decision as required
→ READY
→ create Development Cycle
→ valid Execution starts
→ IN_PROGRESS
```

No code may start while this Work Item remains `PROPOSED`.

A material gap opens a Finding and stops only the affected scope according to
the Gap Protocol.
