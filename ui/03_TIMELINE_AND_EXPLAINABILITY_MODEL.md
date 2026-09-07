# NAAMIVE — Timeline and Explainability Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** modelo de timeline e explicabilidade  
**Deriva de:** History, Projection e Audit Trail

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
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
