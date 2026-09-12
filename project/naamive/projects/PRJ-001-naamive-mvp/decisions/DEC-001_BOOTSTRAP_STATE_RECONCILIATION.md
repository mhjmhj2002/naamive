# DEC-001 — Bootstrap state reconciliation

**Status:** RECORDED RECONCILIATION  
**Nature:** correction of invalid manual projection; not a lifecycle transition  
**Recorded at:** 2026-09-11T20:43:24-03:00  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0

## Problem

The bootstrap workspace claimed `VI-001 = DEFINED`, `DT-001 v1 = CURRENT` and an
informal current roadmap without valid transition/currentness proof.

## Resolution

Restore the last provable truth without fabricating transitions:

```text
MOD-001 = IDENTIFIED
VI-001  = IDENTIFIED
DT-001 v1 = CANDIDATE / NOT CURRENT
Roadmap v2 = CANDIDATE / NOT CURRENT
```

The old claims remain historical facts of what the manual workspace said, but
they are not accepted as authoritative lifecycle events.

The desired transitions are moved to `ROUND_1_APPROVAL_CANDIDATE.md` and require
independent audit + human approval.
