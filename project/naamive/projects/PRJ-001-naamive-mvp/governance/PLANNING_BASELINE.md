# Planning Baseline — PBL-PRJ001-R1-v0.5

**baseline_id:** PBL-PRJ001-R1-v0.5  
**status:** CANDIDATE FOR INDEPENDENT REAUDIT  
**created_at:** 2026-09-11T22:33:18-03:00  
**normative_baseline_ref:** NB-0002  
**supersedes_ref:** PBL-PRJ001-R1-v0.5  
**primary_remediation:** AUD4-001 continuity/currentness reconciliation  
**manifest:** `../../../MANIFEST.md`  
**certificate:** `../../../BASELINE_CERTIFICATE.md`

## Change from v0.4

This baseline is intentionally narrow.

It preserves the independently verified DEC-005/TB-140 mapping and changes only
the planning records necessary to remove AUD4-001:

```text
canonical continuity now contains cause_ref
current action is AUD-005
AUD-003 is historical
AUD-004 is historical
ROADMAP/CURRENT_STATE/EXECUTION_BOARD/DELIVERY_TARGET agree with continuity
FND-003 tracks the blocker until independent verification
```

No lifecycle state is promoted.

No Technology Baseline field, enum, FK or constraint is changed.

## Currentness

This is the only candidate for AUD-005.

It is not approved and does not authorize implementation.
