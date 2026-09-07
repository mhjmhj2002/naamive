# NAAMIVE — Scheduling and Eligibility / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `orchestration/03_SCHEDULING_AND_ELIGIBILITY_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Eligibility

Work Item eligibility passa a considerar também, conforme aplicável:

```text
owner ValueIncrement state compatível
DeliveryTarget current/version
membership/disposition
ordering
ValueIncrement dependencies
MVP concurrency policy
baseline validity
```

---

# 2. REQUIRED priority

Quando houver candidatos elegíveis:

```text
REQUIRED_FOR_TARGET
→ prioridade automática sobre OPTIONAL_FOR_TARGET
```

Essa prioridade não viola dependências, authority ou gates.

---

# 3. OPTIONAL

`OPTIONAL_FOR_TARGET` pode executar quando:

```text
não existe REQUIRED elegível concorrente
ou
há decisão humana governada alterando prioridade
```

---

# 4. OUT_OF_TARGET

Por padrão:

```text
OUT_OF_TARGET => ineligible for current DeliveryTarget execution
```

salvo fluxo explícito de preparação/evolução fora da candidatura corrente,
governado separadamente.

---

# 5. Sequencialidade

No MVP:

```text
eligible active ValueIncrement slots = 1
eligible active Work Item slots      = 1
```

O schema não deve assumir que sempre será assim.

---

# 6. Recompute

Eligibility deve ser recomputada quando mudar:

```text
target version
membership
dependency
baseline
ValueIncrement state
Work Item state
authority
blocker
human decision
```

---

# 7. Invariantes

```text
priority != authority
OPTIONAL não fura REQUIRED automaticamente
OUT_OF_TARGET não executa para target corrente
stale target => ineligible
stale baseline => ineligible
```

---

# 8. Consolidação

Este delta deve ser incorporado à revisão final de
`orchestration/03_SCHEDULING_AND_ELIGIBILITY_MODEL.md`.
