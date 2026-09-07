# NAAMIVE — Work Item Lifecycle / NB-0002 Reconciliation

**Status:** BRAINSTORM — R2-02b APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `05_WORK_ITEM_LIFECYCLE.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Ownership delta

Para Work Item governada por Module no fluxo normal de implementação:

```text
Module
→ ValueIncrement
→ Work Item
```

A Work Item deve referenciar sua `ValueIncrement`.

Project-scoped Work Item transversal permanece permitida.

---

# 2. IN_PROGRESS

`IN_PROGRESS` continua sendo estado da Work Item.

Seu progresso funcional detalhado é representado por:

```text
Development Cycle Instance
Development Steps
Development Roadmap
```

sem alterar o macro lifecycle.

---

# 3. IN_PROGRESS → IN_REVIEW

Requer conclusão aplicável do ciclo:

```text
PREPARE_WORK
IMPLEMENT_CHANGE
VERIFY_CHANGE
MATERIALIZE_CANDIDATE
VERIFY_CANDIDATE
PREPARE_REVIEW
```

Passos explicitamente `NOT_APPLICABLE` não bloqueiam.

---

# 4. IN_REVIEW

Seu ciclo interno:

```text
REVIEW_RESULT
VERIFY_ACCEPTANCE
READY_FOR_DECISION
```

---

# 5. IN_REVIEW → IN_PROGRESS

Cria nova Development Cycle Instance causal.

Não reseta a anterior.

---

# 6. Impedimentos

Finding descoberto deve:

```text
persistir
ser classificado no escopo afetado
produzir continuity
ser inserido no Development Roadmap quando exigir tratamento
```

`NON_BLOCKING` não encerra trabalho ainda elegível.

`BLOCKING` bloqueia o affected scope.

---

# 7. DONE

`DONE` continua terminal.

Development Roadmap não autoriza reabrir Work Item `DONE`.

Correção material futura cria novo trabalho/sucessão.

---

# 8. Consolidação

Este delta deve ser incorporado à revisão final de
`lifecycle/05_WORK_ITEM_LIFECYCLE.md`.
