# DEC-002 — TIR technical readiness does not replace lifecycle authority

**Status:** DETERMINISTIC INTERPRETATION OF EXISTING AUTHORITY HIERARCHY  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0

## Conflict clarified

TIR v1.0 contains phrases equivalent to:

```text
Implementation: AUTHORIZED FOR VS-01
Authority to start: APPROVED
```

Under the authority hierarchy, these statements mean the **technical envelope**
for VS-01 is approved. They do not create or replace lifecycle facts.

## Operational precedence

Code/Execution is eligible only when all applicable conditions hold:

```text
Project state compatible with implementation
Module/VI state compatible with implementation
Work Item = READY (or other explicitly allowed current state)
valid Development Cycle
valid Execution intent
dependencies satisfied
current baseline still covered
applicable authority valid
no incompatible blocker/finding
```

Therefore:

```text
TIR APPROVED
!= Work Item READY
!= Execution authority
!= Project PLANNING → IMPLEMENTATION
!= VI PLANNED / IMPLEMENTING
```

No frozen TIR text is edited by this interpretation.
