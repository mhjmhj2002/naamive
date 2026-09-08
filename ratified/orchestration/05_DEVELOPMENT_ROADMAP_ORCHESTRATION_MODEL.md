# NAAMIVE — Development Roadmap Orchestration Model

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Objetivo

Definir como orchestration usa Development Roadmap sem delegar decisão de
negócio ao agent.

---

# 2. Agent discovery flow

```text
agent discovers impediment
→ persist Finding
→ persist remediation RoadmapEntry
→ update continuity
→ revalidate roadmap eligibility
```

---

# 3. NON_BLOCKING

Se current work continua elegível:

```text
continue
```

Agent não precisa manter lista mental do impedimento.

---

# 4. BLOCKING

Bloqueia o affected scope.

Orchestrator então pergunta:

```text
existe outro RoadmapEntry independente e elegível?
```

Se sim e policy permite:

```text
schedule next eligible entry
```

Se não:

```text
maintain governed block
```

---

# 5. MVP sequentiality

Permanece:

```text
1 active ValueIncrement
1 actively executing Work Item
```

Uma Work Item `BLOCKED` e sem Execution autoritativa não deve obrigatoriamente
consumir o único slot operacional se a policy permitir estacioná-la e continuar
outro item independente do mesmo roadmap.

Essa decisão deve ser derivada, não tomada informalmente pelo agent.

---

# 6. Supervisor

Responsabilidade sistêmica:

```text
revalidate roadmap
release dependencies
surface pending impediments
detect stalled current item
detect no-continuity
detect unresolved tail remediation
compute next eligible item
```

---

# 7. Agent final result

Agent pode reportar:

```text
findings created
roadmap refs created
result/evidence refs
limitations
```

`next eligible item` é server/orchestration-derived após revalidation.

---

# 8. Invariantes

```text
agent does not own backlog memory
scheduler does not invent business decision
blocking is scope-aware
non-blocking does not stop eligible work
roadmap is restart-safe
```
