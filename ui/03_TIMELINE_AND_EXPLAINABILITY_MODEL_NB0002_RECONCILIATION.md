# NAAMIVE — Timeline and Explainability / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `ui/03_TIMELINE_AND_EXPLAINABILITY_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Duas escalas

A UI deve distinguir:

```text
local activity history
Project global timeline
```

---

# 2. Local activity history

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

# 3. Project timeline

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

# 4. Explainability

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

# 5. Invariantes

```text
local history != current state
global timeline != current state
override de prioridade é explicável
target supersession é visível
agent proposal e human decision são distinguíveis
```

---

# 6. Consolidação

Este delta deve ser incorporado à revisão final de
`ui/03_TIMELINE_AND_EXPLAINABILITY_MODEL.md`.
