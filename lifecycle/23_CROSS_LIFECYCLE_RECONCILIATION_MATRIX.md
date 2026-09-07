# NAAMIVE — Cross-Lifecycle Reconciliation Matrix

**Status:** BRAINSTORM — R2-08 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Canonical hierarchy

```text
Need
  ↓
Project
  ↓
Module
  ↓
ValueIncrement
  ↓
Work Item
  ↓
Execution
```

Cross-cutting governed artifacts:

```text
DeliveryTarget
PhaseCycleInstance
PhaseCyclePlan
DevelopmentCycleInstance
DevelopmentRoadmap
DeliveryManifest
```

---

# 2. Ownership / relation matrix

| Resource | Governing owner | May have many | Terminal can exist before parent terminal? |
|---|---|---|---|
| Need | itself | Projects only after accepted commitment as governed | yes |
| Project | accepted Need context | Modules, DeliveryTargets, Project-scoped WIs | yes |
| Module | exactly one Project | ValueIncrements | yes |
| ValueIncrement | exactly one Module | Work Items | yes |
| Work Item | Project or Module scope; Module path references one ValueIncrement | Executions | yes |
| Execution | exactly one logical Work Item/activity intent | attempts/causal successors | terminal attempt yes |
| DeliveryTarget | exactly one Project | memberships/version history | yes |
| DeliveryManifest | exactly one Project candidacy context | included EV refs/evidence | yes |

---

# 3. No automatic promotion shortcuts

Forbidden:

```text
Execution.SUCCEEDED
=> WorkItem.DONE

WorkItem.DONE
=> ValueIncrement.ACCEPTED

ValueIncrement.ACCEPTED
=> Module.INTEGRATED

Module.INTEGRATED
=> Project validation passed

Project.VALIDATION completed
=> Delivery accepted
```

Each layer requires its own governing decision/evidence.

---

# 4. Terminality / succession

```text
Need ACCEPTED/REJECTED/CANCELLED terminal
Project DELIVERED/CANCELLED terminal
Module INTEGRATED/CANCELLED terminal
ValueIncrement ACCEPTED/CANCELLED terminal
Work Item DONE/CANCELLED terminal
Execution SUCCEEDED/FAILED/CANCELLED terminal
```

Material correction never silently reopens terminal resource.

Use successor/new governed work.

---

# 5. Phase lifecycle matrix

| Project phase | Internal lifecycle | Exit step |
|---|---|---|
| CONCEPTION | Conception Cycle | READY_FOR_ARCHITECTURE |
| ARCHITECTURE | Architecture Cycle | READY_FOR_PLANNING |
| PLANNING | Planning Cycle | READY_FOR_IMPLEMENTATION |
| IMPLEMENTATION | Implementation Cycle | READY_FOR_VALIDATION |
| VALIDATION | Validation Cycle | READY_FOR_DELIVERY |
| DELIVERY | Delivery Cycle | decision + materialized handoff |

`Project.DELIVERED` has no active internal phase lifecycle.

---

# 6. Internal lifecycle is orthogonal

Internal Phase Lifecycle does not become another ownership layer.

Example:

```text
Project.IMPLEMENTATION
  └ PhaseCycleInstance
      └ semantic steps

Module
  └ ValueIncrement
      └ WorkItem
          └ Execution
```

Steps may reference work/evidence but do not own Work Items by hidden cardinality.

---

# 7. Parent change validity classification

Material parent/baseline change can classify descendants:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

The classification must be explicit when validity could have changed.

---

# 8. Delivery Target relationship

`DeliveryTargetMembership` relates:

```text
DeliveryTargetVersion ↔ ValueIncrement
```

with:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Disposition is target-specific.

---

# 9. Delivery Manifest relationship

DeliveryManifest freezes:

```text
exact DeliveryTargetVersion
exact candidate Business Baseline
required set
included optional set
out-of-target set
participating Modules
evidence context
```

It does not rewrite DeliveryTargetMembership.

---

# 10. Development Roadmap relationship

DevelopmentRoadmap organizes:

```text
Work Item refs
Finding remediation refs
Human Decision refs
Recovery/Reconciliation refs
```

It is not a duplicate lifecycle for those resources.

---

# 11. Re-entry

When Project returns to a macro phase:

```text
create new PhaseCycleInstance
cause_ref previous decision/finding
do not reset prior cycle
```

When Work Item returns `IN_REVIEW → IN_PROGRESS`:

```text
create new DevelopmentCycleInstance
```

---

# 12. Cross-layer validation ladder

```text
Work Item review
→ local work correctness

ValueIncrement VALIDATING/ACCEPTANCE
→ promised incremental business value

Module VALIDATING/INTEGRATED
→ coherent business capability

Project VALIDATION
→ global/E2E result

Project DELIVERY
→ governed acceptance candidacy

Delivery
→ accepted terminal fact
```

---

# 13. Invariants

```text
ownership remains explicit
internal phase != ownership layer
terminal history never reopens
no implicit promotion across layers
target disposition is contextual
manifest inclusion is candidacy-specific
baseline change never silently preserves validity
```
