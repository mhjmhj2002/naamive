# FND-002 — AUD3-001 TB-140 owner / physical scope mapping

**Status:** RESOLVED — verified by AUD-004  
**Severity:** MATERIAL  
**Blocking:** NO — historical resolution retained  
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

## Historical verification

AUD-004 determinou que DEC-005 é uma correspondência válida sob NB-0002,
preserva TB-140 sem alteração física e não exige Technology Baseline sucessora.
Essa resolução é histórica e só pode ser reaberta por evidência contraditória
nova, não pela criação da baseline de planejamento v0.6.
