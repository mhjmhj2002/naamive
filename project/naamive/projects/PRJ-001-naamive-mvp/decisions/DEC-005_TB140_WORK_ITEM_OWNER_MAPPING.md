# DEC-005 — TB-140 Work Item owner / physical scope mapping

**Status:** RESOLVED / HISTORICAL EVIDENCE PRESERVED
**Impact:** MATERIAL  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**technology_baseline_ref:** Technology Baseline v0.10 APPROVED / FROZEN — TB-140  
**source_finding:** AUD3-001  
**decision_authority_required:** human:manuel-hinojosa:project-owner  
**Implementation:** NOT AUTHORIZED

## Problem

NB-0002 defines the normative Work Item owner as exactly one of:

```text
Project
Module
```

For a Module-owned Work Item, the Work Item references the ValueIncrement it
helps produce.

TB-140 freezes the initial physical integrity model as:

```text
work_item.governing_scope_type
work_item.value_increment_id NULL
work_item.project_id NULL

VALUE_INCREMENT
PROJECT_TRANSVERSAL
```

with a real FK either to ValueIncrement or Project.

Those two vocabularies must not be allowed to become two different definitions
of "owner".

## Authority rule

```text
NB-0002 lifecycle ownership
> Technology Baseline persistence mechanics
> implementation
```

Technology Baseline v0.10 does not redefine lifecycle ownership.

This decision therefore defines the correspondence while preserving the exact
TB-140 physical shape. It does NOT add a column, enum value or FK and does NOT
modify the frozen Technology Baseline.

## Canonical mapping

### A. Project-owned transversal Work Item

Normative fact:

```text
owner_type = PROJECT
owner_ref  = PRJ-001
```

TB-140 physical anchor:

```text
governing_scope_type = PROJECT_TRANSVERSAL
project_id            = PRJ-001
value_increment_id    = NULL
```

The physical Project FK and the normative owner identify the same Project.

### B. Module-owned Work Item contributing to a ValueIncrement

Normative facts:

```text
owner_type          = MODULE
owner_ref           = MOD-001
value_increment_ref = VI-001
```

TB-140 physical anchor:

```text
governing_scope_type = VALUE_INCREMENT
value_increment_id   = VI-001
project_id           = NULL
```

The normative Module owner is derived deterministically through the mandatory
ValueIncrement ownership relation:

```text
work_item.value_increment_id
→ value_increment.id
→ value_increment.module_id
→ Module owner
```

For the current candidate:

```text
WI-002..WI-013
→ value_increment_id = VI-001
→ VI-001.module_id = MOD-001
→ normative owner = MOD-001
```

`VALUE_INCREMENT` in TB-140 is therefore the physical referential anchor used to
obtain a real FK. It is NOT a third normative owner type.

## MVP invariant

For every Module-owned Work Item in the MVP:

```text
exactly one normative Module owner
AND
exactly one ValueIncrement reference
AND
ValueIncrement.module_id == normative Module owner
```

A Module-owned Work Item without a ValueIncrement reference is not executable
under this MVP mapping and must fail closed into planning/finding treatment.

No implementation may invent `MODULE` as a new
`work_item.governing_scope_type` value.

No implementation may add `work_item.module_id` while Technology Baseline v0.10
remains frozen.

## Readiness / authority revalidation

Before READY and before an authorized Execution starts, a Module-owned Work Item
must revalidate at minimum:

```text
Work Item still references same current/covered ValueIncrement
ValueIncrement exists
ValueIncrement.module_id resolves to declared normative Module owner
Module exists and is compatible with the governing baseline
ValueIncrement state/baseline is compatible
Project ancestor state/baseline is compatible
no pending KEEP/REVALIDATE/SUPERSEDE/REVOKE/RECONCILE classification
authority is valid for the normative Module/Project context
```

A mismatch is fail-closed and opens/updates a Finding.

## Baseline-change propagation

A material change to a Module must select affected Module-owned Work Items by the
authoritative relation:

```text
work_item.value_increment_id
JOIN value_increment
  ON value_increment.id = work_item.value_increment_id
WHERE value_increment.module_id = :module_id
```

Affected descendants/evidence/authority are classified using the governed
coverage model:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

A material change to a ValueIncrement selects Work Items directly by
`value_increment_id`.

A material Project change reaches:

```text
Project-owned WIs directly by project_id
Module-owned WIs through ValueIncrement → Module → Project
```

No implementation may treat the TB-140 discriminator alone as sufficient
lifecycle revalidation.

## Query / projection rule

Canonical/domain/application code exposes separately:

```text
normative_owner_type
normative_owner_ref
value_increment_ref when applicable
```

Persistence adapters may use TB-140 fields internally, but transport/domain
contracts must not expose `VALUE_INCREMENT` as though it were the normative
Work Item owner.

## Scope of this decision

This is a semantic/physical correspondence decision for the existing frozen
TB-140 model.

It does not:

```text
change NB-0002
change TB-140 schema
unfreeze Technology Baseline v0.10
promote any Work Item
authorize implementation
```

## Fail-closed escape hatch

If a future governed assessment concludes that this mapping changes rather than
merely maps TB-140 semantics, a successor Technology Baseline must be opened at
the proper authority level.

No implementer may resolve that question locally.
