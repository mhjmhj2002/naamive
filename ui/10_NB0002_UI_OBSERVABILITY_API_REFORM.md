# NAAMIVE — NB-0002 UI / Observability / API Reform

**Status:** BRAINSTORM — R2-11 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Activity Center

Persistent surface for long-running governed work.

Must distinguish:

```text
Project macro phase
internal phase step
Module
ValueIncrement
Work Item
Execution
```

---

# 2. Roadmap and Phase Plan

UI can inspect:

```text
Phase Cycle Plan
Development Roadmap
open decisions
findings
remediations
dependencies
continuity
```

Browser is projection consumer, not supervisor.

---

# 3. Error visibility

Material failure must not exist only as ephemeral toast.

Must remain inspectable with:

```text
affected resource
failure
cause
last functional progress
continuity
allowed next actions
```

---

# 4. Three clocks

Separate:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

`ALIVE != PROGRESS`.

---

# 5. ALIVE_NO_PROGRESS

Must be observable as a condition/signal when applicable.

Does not automatically cancel Execution.

Thresholds belong to Technology/Operations Baseline.

---

# 6. Local history versus global timeline

```text
local phase/activity history
!=
Project global timeline
!=
current state
```

---

# 7. Action descriptors

Allowed actions are server-derived.

Browser must not enable transitions from raw state strings or counts.

---

# 8. Stale command

Commands carry expected version/watermark/context.

Stale command:

```text
reject
→ refresh/refetch
→ human/agent re-decides if necessary
```

---

# 9. Semantic commands

API must prefer intention-oriented commands:

```text
acceptValueIncrement
approveTargetVersion
splitValueIncrement
prioritizeOptional
acceptDelivery
```

Not:

```text
setStatus("DONE")
```

---

# 10. Queries/projections

Must expose enough context to render:

```text
target/version
phase cycle
roadmap
value map
current work
functional progress
findings/risks
allowed actions
timeline refs
```

---

# 11. Real-time

Low-latency update is a product/UX requirement.

Transport remains Technology Baseline concern:

```text
SSE / WebSocket / polling / equivalent
```

---

# 12. Observability health

Must detect:

```text
dead-end
zombie/stale execution
alive-no-progress
required work starvation
roadmap supervisor failure
projection lag
projection semantic conformance failure
handoff lag
reconciliation backlog
```

---

# 13. Projection conformance

Required action/wait/blocker/decision missing, duplicated, contradictory or extra
is a semantic conformance defect.

Material mismatch opens/links canonical Inconsistency.

---

# 14. Accessibility

Status/priority/blocking cannot rely solely on color.

---

# 15. Invariants

```text
UI != source of truth
browser != supervisor
action server-derived
error durable
alive != progress
semantic API commands
stale command fail-closed
projection conformance observable
```
