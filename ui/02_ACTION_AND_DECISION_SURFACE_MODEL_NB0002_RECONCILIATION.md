# NAAMIVE — Action and Decision Surface / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Novas decision surfaces

Devem existir, quando aplicável, surfaces para:

```text
aprovar ValueIncrementProposal
ajustar proposta
rejeitar proposta
abrir brainstorm
split
merge
alterar disposition
aprovar DeliveryTarget version
aceitar ValueIncrement
priorizar OPTIONAL sobre REQUIRED
```

---

# 2. Proposal surface

Deve mostrar:

```text
Module
proposal
rationale
alternatives
dependencies
risk
criteria
agent recommendation
trade-offs
Business Baseline
normative_baseline_ref
```

---

# 3. Split surface

Deve mostrar:

```text
source ValueIncrement
proposed successors
value statement de cada successor
required/optional effect
dependency effect
target-version effect
```

---

# 4. Priority override

Se humano optar por executar OPTIONAL apesar de REQUIRED elegível, a surface deve
explicar:

```text
qual REQUIRED está sendo postergada
motivo
impacto
authority
consequence
```

A decisão deve ser persistida.

---

# 5. Descriptor exactness

Action descriptors devem continuar server-derived.

UI não cria:

```text
APPROVE
SPLIT
CHANGE_DISPOSITION
PRIORITIZE_OPTIONAL
ACCEPT_VALUE
```

a partir de strings de estado.

---

# 6. Invariantes

```text
proposal action != silent approval
priority override é governado
split decision é rastreável
payload binding é exato
double click é idempotente
```

---

# 7. Consolidação

Este delta deve ser incorporado à revisão final de
`ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md`.
