# NAAMIVE — Internal Phase and Roadmap Continuity Contract

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Durable handoffs

Every material handoff between steps/phases must be durable enough to survive
restart and detect incomplete transfer.

---

# 2. Continuity invariant

No active resource may exist without actionable persisted continuity.

Allowed continuity families remain:

```text
AUTOMATIC_WORK
HUMAN_ACTION
GOVERNED_WAIT
GOVERNED_BLOCK
RECOVERY
RECONCILIATION
```

---

# 3. Agent discovers impediment

Mandatory sequence:

```text
discover
→ persist Finding/Decision Need
→ affected scope
→ severity/consequence
→ roadmap/phase-plan trace
→ continuity
→ revalidate eligibility
```

Agent may not merely stop and return prose.

---

# 4. NON_BLOCKING

```text
persist
→ continue other eligible work
```

unless future dependency later makes a specific item ineligible.

---

# 5. BLOCKING

Blocks only affected scope by default.

Orchestrator re-evaluates whether another independent item is eligible.

---

# 6. Scheduler boundary

Scheduler decides:

```text
which already-eligible work runs now
```

It does not decide:

```text
product scope
architecture
ValueIncrement decomposition
DeliveryTarget commitment
```

---

# 7. MVP concurrency policy

```text
1 active ValueIncrement
1 actively executing Work Item
```

Policy, not structural cardinality.

A blocked parked Work Item need not consume the operational slot if another
independent item is legitimately eligible.

---

# 8. REQUIRED versus OPTIONAL

Automatic scheduling:

```text
eligible REQUIRED_FOR_TARGET
precedes
eligible OPTIONAL_FOR_TARGET
```

Human authorized override may change priority with durable rationale.

---

# 9. Retry / failure

`Execution.FAILED` never resurrects.

Retry/recovery creates new causal Execution.

---

# 10. Stale/expired authority

Stale/expired executor loses authority.

Late result cannot publish authoritative state without reconciliation/fencing
checks.

---

# 11. Recovery

Recovery creates new Execution with causal links.

No hidden reset of prior attempt.

---

# 12. Reconciliation

Required when factual effect is uncertain.

Outcomes remain explicit:

```text
NO_EFFECT
EFFECT_CONFIRMED
PARTIAL_EFFECT
WRONG_EFFECT
UNKNOWN
```

---

# 13. Baseline invalidation

New claim/publish must revalidate current Business Baseline and
normative_baseline_ref.

Descendant eligibility may be:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

---

# 14. Roadmap/phase supervision

Backend/worker/reconciler, not browser, supervises:

```text
next eligible work
blockers
wait exit
dependency release
stalled progress
dead-end
unresolved tail remediation
```

---

# 15. Invariants

```text
fail-closed still has route
scheduler != authority
agent != backlog memory
FAILED never resurrects
stale executor cannot publish
handoff restart-safe
recovery causal
reconciliation factual
```
