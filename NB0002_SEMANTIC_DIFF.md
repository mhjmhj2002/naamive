# NB-0001 → NB-0002 — Semantic Diff

**Natureza:** NON-NORMATIVE REVIEW EVIDENCE  
**Source baseline:** `NB-0001`  
**Candidate baseline:** `NB-0002`  
**Source checkpoint:** `7ee08781a069a5d00f6af7a96ca544ec5adb7c65`

---

# 1. Changes in governing model

```text
NB-0001
Need → Project → Module → Work Item → Execution

NB-0002 candidate
Need → Project → Module → ValueIncrement → Work Item → Execution
```

Module remains a business capability. ValueIncrement becomes the finite, usable, verifiable unit of business value within a Module.

# 2. Project internal lifecycle

Every nonterminal Project macro phase gains a durable semantic internal cycle: CONCEPTION, ARCHITECTURE, PLANNING, IMPLEMENTATION, VALIDATION and DELIVERY. `Project.DELIVERED` remains terminal.

# 3. Work Item development

Work Item macro lifecycle remains distinct from a causal DevelopmentCycleInstance. `IN_REVIEW → IN_PROGRESS` creates a successor Development Cycle rather than resetting history.

# 4. Value delivery

DeliveryTarget becomes versioned and target-specific membership uses `REQUIRED_FOR_TARGET`, `OPTIONAL_FOR_TARGET`, `OUT_OF_TARGET`. DeliveryManifest freezes the exact candidacy actually presented.

# 5. Continuity and blockers

Findings carry affected scope. NON_BLOCKING work can continue where independent eligibility remains. BLOCKING prevents only affected scope by default. Agent memory is never the continuity mechanism.

# 6. State and persistence

PhaseCycle, PhaseStep, DevelopmentCycle, DevelopmentRoadmap, DeliveryTarget, DeliveryManifest and FunctionalProgress become durable/reconstructable concepts. Re-entry is causal and history remains immutable.

# 7. Observability and UI

Heartbeat, operational activity and functional progress are distinct. Activity Center renders canonical projections and browser does not supervise lifecycle. No fake progress percentage.

# 8. API and orchestration

Commands express semantic intent and stale context is rejected. Scheduler chooses among already-eligible work and does not invent business priority, scope or authority.

# 9. Terminality

Terminal ValueIncrement, Module, Work Item and Execution history is not reopened. Correction/evolution creates successor or new governed work.
