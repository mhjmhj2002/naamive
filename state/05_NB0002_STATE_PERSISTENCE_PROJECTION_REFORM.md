# NAAMIVE — NB-0002 State / Persistence / Projection Reform

**Status:** BRAINSTORM — R2-09 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. First-class canonical resources

NB-0002 candidate adds/reconciles as canonical first-class resources/artifacts:

```text
ValueIncrement
DeliveryTarget
DeliveryTargetVersion
DeliveryTargetMembership
PhaseCycleInstance
PhaseCyclePlanVersion
PhaseStepInstance
DevelopmentCycleInstance
DevelopmentRoadmap
RoadmapEntry
DeliveryManifest / CandidacySnapshot
FunctionalProgress
```

Physical schema is Technology Baseline responsibility.

---

# 2. Current state and immutable history

Must remain separate:

```text
CURRENT STATE
IMMUTABLE HISTORY
EVIDENCE
PROJECTIONS
OPERATIONAL CLAIMS/TELEMETRY
```

No object uses mutable current row as its only history.

---

# 3. PhaseCycleInstance

Each Project entry/re-entry into a nonterminal macro phase creates one causal
PhaseCycleInstance.

Conceptual identity:

```text
phase_cycle_instance_id
project_id
project_phase
generation
status
phase_entry_transition_ref
business_baseline_ref
normative_baseline_ref
cause_ref
current_step_ref
started_at
completed_at
continuity_ref
previous_cycle_ref
```

Only one authoritative current cycle should match the Project current phase.

---

# 4. PhaseCyclePlanVersion

Material plan change preserves version/history.

Currentness cannot be inferred solely from highest numeric version.

---

# 5. PhaseStepInstance

Represents semantic progress.

May be:

```text
A_FAZER
FAZENDO
FEITO
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
NAO_APLICAVEL
```

Human labels may vary; canonical semantic state must be unambiguous.

---

# 6. DevelopmentCycleInstance

Belongs to a Work Item pass through development/review.

`IN_REVIEW → IN_PROGRESS` creates successor DevelopmentCycleInstance.

---

# 7. DevelopmentRoadmap

Durable, versioned and reconstructable.

RoadmapEntry references canonical resources; it does not clone their state.

---

# 8. Functional progress

Persist current meaningful progress sufficient for restart:

```text
last_functional_progress_at
progress_ref/summary
current semantic step
```

Separate from:

```text
last_heartbeat_at
last_operational_activity_at
```

---

# 9. DeliveryTarget / membership

Target version and membership set change as one coherent governed unit or through
durable completion/recovery.

At most one authoritative current Delivery Target per Project candidacy in MVP.

---

# 10. DeliveryManifest

Durable exact snapshot of the presented candidate.

Must identify:

```text
target id/version
candidate baseline
required set
included optional set
out-of-target set
evidence context
decision context
```

---

# 11. Restart rule

If restart would otherwise forget:

```text
where are we?
what is current?
what is next?
what is blocked?
why?
what target/version?
what value is being delivered?
```

the information must not be memory-only.

---

# 12. Projection rules

Projection is reconstructable from canonical state/history.

Counts are explanatory only.

Example:

```text
4/4 REQUIRED accepted
```

does not itself authorize a transition.

Server projects allowed actions.

---

# 13. Currentness and staleness

Commands/projections carry enough version/watermark data to reject stale intent.

Currentness never comes from browser cache.

---

# 14. Retention

High-frequency operational telemetry may have retention/compaction.

Governed lifecycle/history/decision/baseline lineage cannot be age-purged when
required for reconstruction/audit.

---

# 15. Invariants

```text
one canonical truth
history immutable
restart-safe
phase re-entry causal
terminal succession preserved
target currentness explicit
manifest reproducible
projection derived
heartbeat != functional progress
```
