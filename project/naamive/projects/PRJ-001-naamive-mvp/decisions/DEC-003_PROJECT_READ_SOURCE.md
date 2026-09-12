# DEC-003 — Canonical read-only Project source for VI-001

**Status:** PLANNING DECISION CANDIDATE — covered by round audit before approval  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**Implementation owner:** WI-013

## Decision

VI-001 may read Project facts, but does not implement Project lifecycle mutation.
The minimum canonical source is owned by the Project domain boundary and exposed
through a public query contract.

Conceptual persistence required by the frozen baseline:

```text
project current state
+ append-only Project history
```

The physical implementation may refine names within TIR/TB constraints, but
must preserve:

```text
canonical current != projection
history append-only
restart-safe currentness
public query contract
no cross-module private repository access
```

## Initial data for DEV/test

Deterministic seed/fixture is allowed only in DEV/test and must create canonical
Project facts through the approved migration/seed mechanism. It must not invent
runtime progress or be used as HML/PROD truth.

## Out of scope

```text
Project lifecycle mutation commands
Project transition UI
Delivery mutation
```

## Verification

WI-013 owns migrations/query contract/restart proof. WI-007/008 depend on its
satisfaction condition.
