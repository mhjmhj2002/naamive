# FND-002 — AUD3-001 TB-140 owner / physical scope mapping

**Status:** READY_FOR_VERIFICATION  
**Severity:** MATERIAL  
**Blocking:** YES until independent verification  
**Affected scope:** PRJ-001 planning round 1 / Work Item ownership mapping  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002  
**source_evidence:** audits/AUD-003_PLANNING_ROUND_1_CODEX.md  
**candidate_resolution:** decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md

## Gap

The normative Work Item owner is Project or Module, while frozen TB-140 uses a
physical FK discriminator of VALUE_INCREMENT or PROJECT_TRANSVERSAL.

Without an explicit mapping, implementation could create two incompatible owner
interpretations.

## Stop boundary

```text
human approval of round 1 = BLOCKED
all Work Items remain PROPOSED
no Work Item READY
no Development Cycle
no Execution
no implementation
```

## Candidate resolution

DEC-005 preserves the exact TB-140 physical fields/FKs and defines:

```text
PROJECT owner
→ PROJECT_TRANSVERSAL + project_id

MODULE owner
→ VALUE_INCREMENT + value_increment_id
→ derive normative Module owner through ValueIncrement.module_id
```

It also defines readiness revalidation, baseline propagation and fail-closed
behavior.

## Verification required

Independent AUD-004 must determine whether DEC-005 is a valid correspondence
under NB-0002 precedence while preserving TB-140 unchanged.

The planning author does not mark AUD3-001 RESOLVED.

If AUD-004 finds that TB-140 itself must change, this Finding remains blocking
and a successor Technology Baseline must be opened.
