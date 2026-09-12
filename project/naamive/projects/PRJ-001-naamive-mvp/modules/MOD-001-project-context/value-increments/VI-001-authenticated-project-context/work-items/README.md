# VI-001 — Work Item Proposal Set

**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002  
**Status:** 13 PROPOSED / 0 READY / NO EXECUTION AUTHORITY

| WI | Title | Governing scope | Depends on | State |
|---|---|---|---|---|
| WI-001 | Repository / Workspace Foundation | PROJECT | none | PROPOSED |
| WI-002 | Principal Persistence | MODULE | WI-001 | PROPOSED |
| WI-003 | Username / Password Login | MODULE | WI-002 | PROPOSED |
| WI-004 | Durable Server-side Session | MODULE | WI-003 | PROPOSED |
| WI-005 | Authority / Scoped Grants | MODULE | WI-002, WI-004 | PROPOSED |
| WI-006 | Session Bootstrap | MODULE | WI-004, WI-005 | PROPOSED |
| WI-007 | Authorized Project List | MODULE | WI-005, WI-006, WI-013 | PROPOSED |
| WI-008 | Explicit Project Selection | MODULE | WI-007 | PROPOSED |
| WI-009 | Authenticated AppShell | MODULE | WI-006, WI-007, WI-008 | PROPOSED |
| WI-010 | Initial Activity Center Projection | MODULE | WI-008, WI-009, WI-013 | PROPOSED |
| WI-011 | SSE Invalidation and Canonical Refetch | MODULE | WI-009, WI-010 | PROPOSED |
| WI-012 | End-to-end Validation Evidence | MODULE | WI-003..WI-011, WI-013 | PROPOSED |
| WI-013 | Canonical Project Read Source | MODULE | WI-001 | PROPOSED |

`WI-001` is Project-transversal. `WI-002..WI-013` are governed by MOD-001 and
reference VI-001; VI-001 is not their owner.

Full criteria/test/evidence/audit mapping is also summarized in:

`../../../../../governance/WORK_ITEM_ASSURANCE_MATRIX.md`


## Normative ownership versus TB-140 persistence anchor

Round 1 uses `DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.

```text
WI-001
normative owner = PRJ-001
TB-140 anchor   = PROJECT_TRANSVERSAL / project_id

WI-002..WI-013
normative owner = MOD-001
VI reference    = VI-001
TB-140 anchor   = VALUE_INCREMENT / value_increment_id
Module owner    = derive VI-001.module_id → MOD-001
```

No Work Item may treat `VALUE_INCREMENT` as its normative lifecycle owner.
