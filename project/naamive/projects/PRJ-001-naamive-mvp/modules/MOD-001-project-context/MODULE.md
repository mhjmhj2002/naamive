# MOD-001 — Project Context

**Lifecycle state:** IDENTIFIED  
**Definition candidate:** COMPLETE / NOT APPROVED  
**Project:** PRJ-001  
**Nature:** business capability  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5

## Responsibility

Provide the business capability for an authorized human principal to enter and
operate inside an explicit Project context without the browser becoming the
source of authority or canonical truth.

## Inputs

```text
authenticated human principal
server-side session status
authority/grants scoped to Project
canonical Project read source
```

## Results

```text
visible authorized Projects
explicit selected Project context
factual contextual Activity Center projection
restart-safe reconstruction of context
```

## Actors

```text
human NAAMIVE operator / Project participant
NAAMIVE web application
AuthorityService
Project query service
Activity Center projector
```

## In scope

```text
authenticated entry into the platform
durable session bootstrap needed for context
authorized Project visibility
explicit Project selection
initial contextual Activity Center
SSE invalidation followed by canonical refetch
```

## Out of scope

```text
Project lifecycle mutation
Work Item execution engine
agent orchestration/autonomy
Delivery workflow
HML/PROD provisioning
external evidence/blob storage
```

## Conceptual interfaces

```text
session bootstrap contract
AuthorityService decision contract
Project canonical query contract
Activity Center projection query contract
SSE invalidation hint contract
```

## Material dependencies

| Dependency | Required result | Satisfaction condition | Impact if absent | Owner | Fallback |
|---|---|---|---|---|---|
| NB-0002 | valid lifecycle/governance law | RATIFIED / IN FORCE and compatible baseline ref | stop planning | Project Owner | return to normative governance |
| Technology Baseline v0.10 | frozen technical boundaries | APPROVED / FROZEN | stop technical planning | Project Owner | technical change governance |
| TIR v1.0 | concrete implementation envelope | APPROVED and interpreted only as technical readiness | stop implementation preparation | Project Owner | reopen TIR through governance |
| PRJ-001 | owning Project in PLANNING | current Project baseline matches `PBL-PRJ001-R1-v0.5` | stop Module gate | Project Owner | reconcile Project baseline |

## Success criteria

A human principal can authenticate, see only authorized Projects, select one
explicitly and reconstruct that Project context after restart. The Activity
Center remains a derived projection and can be rebuilt from declared canonical
sources.

## Risks

Material risks are not bare labels here. Canonical treatment is in:

`../../risks/RISK_REGISTER.md`

Applicable risk IDs:

```text
RISK-001 authorization scope leakage
RISK-002 session/browser authority confusion
RISK-003 projection used as canonical truth
RISK-004 boundary/cross-module shortcut
RISK-005 insufficient/deferred test evidence
RISK-006 canonical Project read source ambiguity
```

## Open questions

```text
none known that require a new material product/architecture decision before the definition gate
```

Any new material question opens a Finding and stops the affected scope.

## DeliveryTarget relation

There is **no intrinsic DeliveryTarget disposition on Module**.

The candidate `DT-001 v1` assigns `REQUIRED_FOR_TARGET` to `VI-001`. Any Module
summary shown by UI is only a derivation from the memberships of its
ValueIncrements.

## Proposed next transition

```text
MOD-001 IDENTIFIED → DEFINED
```

This transition is **not executed by this file**. It is part of
`ROUND_1_APPROVAL_CANDIDATE.md`, requires independent audit coverage and later
human approval.
