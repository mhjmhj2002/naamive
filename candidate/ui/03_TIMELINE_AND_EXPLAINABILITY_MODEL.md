# NAAMIVE — Timeline and Explainability Model

**Status:** CANDIDATE FOR APPROVAL  **Versão:** 0.4  
**Autoridade:** modelo de timeline e explicabilidade  
**Deriva de:** History, Projection e Audit Trail

**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Vigência:** NOT IN FORCE  
**Normative Baseline:** `NB-0002` — candidate  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision only upon ratification  
**Escopo:** timeline, causalidade, supersessão e explicabilidade de estado e decisões

---

# 1. Objetivo

Permitir que humano entenda:

```text
o que aconteceu?
por que estamos aqui?
o que falta?
quem decidiu?
```

---

# 2. Timeline

Timeline deriva de history.

---

# 3. Event categories

Pode mostrar:

- transition;
- decision;
- review;
- audit;
- finding;
- risk;
- exception;
- handoff;
- execution;
- recovery;
- reconciliation;
- inconsistency;
- delivery.

---

# 4. Current state

Timeline não substitui current state.

---

# 5. Explain current state

Deve ser possível explicar:

- transition mais recente;
- blockers;
- current Business Baseline;
- `normative_baseline_ref`;
- continuity e seu `cause_ref`;
- pending decisions.

---

# 6. Explain allowed action

Quando action aparece, UI deve poder explicar requisitos relevantes.

---

# 7. Explain denied action

Pode informar condição faltante sem vazar dado sensível.

---

# 8. Causality e contexto normativo

Timeline deve preservar causation/correlation, `cause_ref` quando aplicável e o
`normative_baseline_ref` que governou cada decisão material. Fatos históricos
não são reexplicados automaticamente sob a norma mais recente.

---

# 9. Supersession

Mostrar quando decisão/evidence foi superseded.

---

# 10. Exception visibility

Approval by exception deve ser distinguível.

---

# 11. Invariants

```text
history explainable
exception visible
supersession visible
current != timeline
```

---

# 12. Princípio final

Um sistema governado precisa ser capaz de explicar suas próprias decisões.


---

# Histórico local e timeline global

## Duas escalas

A UI deve distinguir:

```text
local activity history
Project global timeline
```

---

## Local activity history

Pode mostrar eventos como:

```text
ValueIncrement IMPLEMENTING
WI-01 started
WI-01 completed
baseline updated
WI-02 started
functional progress emitted
Execution failed
recovery started
```

---

## Project timeline

Deve mostrar fatos de maior nível:

```text
Project phase transition
DeliveryTarget version change
ValueIncrement accepted
split approved
required→optional decision
Module integrated
Project validation result
Delivery accepted
```

---

## Explainability

Deve ser possível responder:

```text
por que esta EV está ativa?
por que esta OPTIONAL furou a fila?
por que target mudou?
quem aprovou o split?
qual baseline governou?
qual progresso funcional ocorreu por último?
```

---

## Invariantes

```text
local history != current state
global timeline != current state
override de prioridade é explicável
target supersession é visível
agent proposal e human decision são distinguíveis
```

---
