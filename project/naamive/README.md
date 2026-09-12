# NAAMIVE — Self-hosted Project Workspace

**Canonical root:** `project/naamive/`  
**Project:** PRJ-001 — NAAMIVE MVP  
**Current Project lifecycle:** PLANNING  
**Planning baseline candidate:** `PBL-PRJ001-R1-v0.5`  
**Last independent audit:** AUD-002 — FAIL  
**Implementation:** NOT AUTHORIZED

This workspace manually operates the NAAMIVE process while the platform does not
yet automate itself.

## Current governance truth

```text
Need NEED-001........... ACCEPTED
Project PRJ-001......... PLANNING
Module MOD-001.......... IDENTIFIED
VI-001.................. IDENTIFIED
DT-001 v1............... CANDIDATE / NOT CURRENT
Roadmap v2.............. CANDIDATE / NOT CURRENT
Work Items.............. 13 PROPOSED / 0 READY
Development Cycles...... 0
Executions.............. 0
```

The previous manual claim `VI-001 = DEFINED` was reconciled as an invalid
bootstrap projection because no valid parent/gate evidence existed. It was not
rewritten out of history; see `decisions/DEC-001_BOOTSTRAP_STATE_RECONCILIATION.md`.

## Current gate

The package is a **remediation candidate**, not an approval.

```text
PBL-PRJ001-R1-v0.5
→ independent AUD-005
→ resolve any blocking findings
→ PASS
→ human decision
→ only then materialize approved transitions
```

The transition set proposed for later human decision is in:

`projects/PRJ-001-naamive-mvp/governance/ROUND_1_APPROVAL_CANDIDATE.md`

No code may start from this workspace while every Work Item remains `PROPOSED`.

## Current audit continuation

AUD-003 closed all prior findings except one material blocker:

```text
AUD3-001 — normative Work Item owner versus frozen TB-140 physical scope mapping
```

Candidate remediation:

```text
DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md
FND-002_AUD003_TB140_OWNER_MAPPING.md
```

Next gate: independent AUD-004. No approval or implementation is authorized.

## Current audit continuation

AUD-004 independently resolved AUD3-001 and verified DEC-005.

The remaining blocker is:

```text
AUD4-001 — canonical continuity/currentness
```

Candidate remediation:

```text
FND-003_AUD004_CONTINUITY_CURRENTNESS.md
CONT-PRJ001-005
baseline PBL-PRJ001-R1-v0.5
```

Next gate: AUD-005.

Human approval and implementation remain blocked.
