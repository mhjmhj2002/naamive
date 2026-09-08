# NAAMIVE — Development Roadmap Health Model

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Objetivo

Tornar detectável quando Development Roadmap existe, mas não está avançando de
forma coerente.

---

# 2. Sinais

Deve ser possível observar:

```text
roadmap current age
current entry age
pending remediation count
blocking finding count
non-blocking finding count
dependency-blocked entry count
eligible-but-not-scheduled age
roadmap without continuity
roadmap apparently complete with unresolved remediation
```

---

# 3. Agent stopped unexpectedly

Deve ser detectável:

```text
agent Execution terminal
current Work Item still active
no next Execution
no HUMAN_ACTION
no GOVERNED_WAIT
no GOVERNED_BLOCK
no recovery/reconciliation
```

Isso é candidate dead-end/Inconsistency.

---

# 4. Non-blocking accumulation

Grande acúmulo de impedimentos não bloqueantes deve ser observável.

Threshold/escalation concretos ficam para Technology/Operations Baseline.

---

# 5. Supervisor health

Monitorar:

```text
last supervisor pass
reconciliation failures
eligibility recompute failures
projection mismatch
```

---

# 6. Invariantes

```text
agent stopped != roadmap forgotten
pending impediment visible
dead-end detectable
roadmap supervisor failure detectable
```
