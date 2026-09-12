# PRJ-001 — Development Roadmap v2 Candidate

**roadmap_id:** DR-PRJ001-VI001  
**scope_ref:** VI-001 / MOD-001 / PRJ-001  
**version:** 2  
**currentness:** CANDIDATE / NOT CURRENT  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002  
**created_at:** 2026-09-11T20:43:24-03:00  
**supersedes_ref:** v1 informal bootstrap roadmap (not authoritative after DEC-001)

## Purpose

Versioned execution/planning order that references canonical resources instead
of duplicating their lifecycle states.

## Entries

| Entry | Kind | reference_ref | eligibility/result condition | dependency refs |
|---|---|---|---|---|
| RM-001 | FINDING_REMEDIATION | FND-001 | AUD-002 remediation verified by AUD-003 except follow-up AUD3-001 | none |
| RM-002 | HUMAN_DECISION | ROUND-1-APPROVAL-CANDIDATE | AUD-005 PASS then human decision | RM-001 |
| RM-003 | WORK_ITEM | WI-001 | round approved; WI-001 readiness/audit criteria satisfied | RM-002 |
| RM-004 | WORK_ITEM | WI-002 | WI-001 DONE on compatible baseline | RM-003 |
| RM-005 | WORK_ITEM | WI-013 | WI-001 DONE on compatible baseline | RM-003 |
| RM-006 | WORK_ITEM | WI-003 | WI-002 DONE on compatible baseline | RM-004 |
| RM-007 | WORK_ITEM | WI-004 | WI-003 DONE on compatible baseline | RM-006 |
| RM-008 | WORK_ITEM | WI-005 | WI-002 + WI-004 DONE on compatible baseline | RM-004, RM-007 |
| RM-009 | WORK_ITEM | WI-006 | WI-004 + WI-005 DONE on compatible baseline | RM-007, RM-008 |
| RM-010 | WORK_ITEM | WI-007 | WI-005 + WI-006 + WI-013 DONE | RM-008, RM-009, RM-005 |
| RM-011 | WORK_ITEM | WI-008 | WI-007 DONE | RM-010 |
| RM-012 | WORK_ITEM | WI-009 | WI-006 + WI-007 + WI-008 DONE | RM-009, RM-010, RM-011 |
| RM-013 | WORK_ITEM | WI-010 | WI-008 + WI-009 + WI-013 DONE | RM-011, RM-012, RM-005 |
| RM-014 | WORK_ITEM | WI-011 | WI-009 + WI-010 DONE | RM-012, RM-013 |
| RM-015 | WORK_ITEM | WI-012 | WI-003..WI-011 and WI-013 DONE; integrated candidate stable | RM-006..RM-014 |

## Dependency rule

`depends_on` is satisfied only by the declared result on a baseline that remains
compatible with the current approved plan. A predecessor merely existing or
having an agent assigned does not satisfy dependency.

If baseline/scope changes materially, classify affected entries/evidence as
`KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` or `RECONCILE` before further work.

## Finding remediation rule

Any new Finding creates a remediation entry. A blocking Finding also creates a
`GOVERNED_BLOCK` continuity record for its affected scope. Non-blocking findings
remain visible and cannot be silently dropped.

## Current continuity

The authoritative current next action is not stored as free prose here. See:

`governance/CURRENT_CONTINUITY.md`

Current action: independent AUD-003 against `PBL-PRJ001-R1-v0.5`.

## Completion rule

The roadmap cannot be considered complete while a required entry, blocking
Finding, dependency or required remediation lacks valid disposition/continuity.

The roadmap does not promote VI/Module/Project automatically.

## Current continuity binding

```text
continuity_ref = CONT-PRJ001-005
cause_ref      = FND-003 / AUD4-001
baseline       = PBL-PRJ001-R1-v0.5
next_action    = AUD-005
```

AUD-003 and AUD-004 are historical audit instances and MUST NOT be scheduled
again as the current action.
