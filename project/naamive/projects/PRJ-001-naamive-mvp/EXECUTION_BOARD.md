# PRJ-001 — Execution Board

**Board type:** derived manual projection / not canonical lifecycle storage  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002  
**Project:** PLANNING  
**Module:** IDENTIFIED  
**VI-001:** IDENTIFIED  
**Implementation:** NOT AUTHORIZED

## Current audit/gate fact

```text
AUD-001................ FAIL (historical)
AUD-002................ FAIL (historical)
Remediation baseline... PBL-PRJ001-R1-v0.5
AUD-003................ FAIL — historical
Human approval......... NOT GRANTED
Current next action.... run AUD-005................ FAIL — AUD4-001 (historical)
```

The canonical continuation is `governance/CURRENT_CONTINUITY.md`. This board is
only a projection of entity states/roadmap references.

## Work Items

| WI | Work Item | State | Condition | Agent | Development Cycle | Execution | Review Agent | Evidence | Next Action |
|---|---|---|---|---|---|---|---|---|---|
| WI-001 | Repository / Workspace Foundation | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-002 | Principal Persistence | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-003 | Username / Password Login | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-004 | Durable Server-side Session | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-005 | Authority / Scoped Grants | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-006 | Session Bootstrap | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-007 | Authorized Project List | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-008 | Explicit Project Selection | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-009 | Authenticated AppShell | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-010 | Initial Activity Center Projection | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-011 | SSE Invalidation and Canonical Refetch | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-012 | End-to-end Validation Evidence | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |
| WI-013 | Canonical Project Read Source | PROPOSED | — | — | — | — | — | — | after round approval: readiness against explicit dependency condition |

## Counts

```text
PROPOSED............. 13
READY................ 0
IN_PROGRESS.......... 0
IN_REVIEW............ 0
DONE................. 0
CANCELLED............ 0
BLOCKED.............. 0
Development Cycles... 0
Executions............ 0
Active Agents......... 0
```

Dependency waiting is not automatically `BLOCKED`. If a real blocker appears,
it must have a Finding plus a valid `GOVERNED_BLOCK` continuity record with
cause, owner, exit condition, fallback, cadence and escalation.

Agent assignment does not make a WI `IN_PROGRESS`. `READY → IN_PROGRESS` occurs
only when a valid Execution starts.

## Current blocker

```text
AUD3-001
→ candidate remediation DEC-005
→ verification required by AUD-004................ FAIL — AUD4-001 (historical)
```

No row may advance from PROPOSED while this blocker is applicable to ownership
semantics.

AUD-005................ NOT EXECUTED
