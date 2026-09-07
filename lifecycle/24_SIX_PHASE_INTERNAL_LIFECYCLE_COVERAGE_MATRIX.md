# NAAMIVE — Six-Phase Internal Lifecycle Coverage Matrix

**Status:** BRAINSTORM — R2-08 APPROVED WORKING DECISION  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

Coverage:

```text
CONCEPTION      covered
ARCHITECTURE    covered
PLANNING        covered
IMPLEMENTATION  covered
VALIDATION      covered
DELIVERY        covered
```

Every phase defines:
- identifiable PhaseCycleInstance;
- semantic steps;
- durable plan/progress;
- blockers/waits/decisions;
- readiness/exit semantics;
- restart reconstruction;
- causal re-entry.

No phase is allowed to collapse to `RUNNING` as the only meaningful progress.
