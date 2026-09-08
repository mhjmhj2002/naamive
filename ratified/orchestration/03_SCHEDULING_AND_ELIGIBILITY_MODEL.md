# NAAMIVE — Scheduling and Eligibility Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo de elegibilidade e agendamento  
**Deriva de:** Work Item, Execution, Continuity e Orchestration

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** elegibilidade derivada, scheduling, prioridade, concorrência e revalidação

---

# 1. Objetivo

Definir quando trabalho pode competir por execução.

---

# 2. Eligibility

Eligibility é predicado derivado.

Não é estado de negócio adicional.

---

# 3. Work Item eligibility

Requer, conforme aplicável:

- state READY/IN_PROGRESS compatível;
- baseline current;
- dependencies satisfied;
- no incompatible blocker;
- authority valid;
- no cancellation;
- retry/recovery allowed;
- no authoritative result already final.

---

# 4. Execution eligibility

Execution CREATED torna-se ELIGIBLE apenas após revalidation.

---

# 5. Scheduling

Scheduler escolhe entre eligible candidates.

---

# 6. Priority

Priority não cria eligibility.

---

# 7. Concurrency limit

Pode existir por Project, agent, external API ou resource.

---

# 8. Dependency release

Mudança de dependency deve recomputar eligibility.

---

# 9. Baseline invalidation

Descendant perde eligibility imediatamente quando baseline governante é
revogado.

---

# 10. Human eligibility

Ação humana só é elegível quando principal/authority existem.

---

# 11. Wait

Wait não vira polling frenético por padrão.

Cadence deriva da natureza da condição.

---

# 12. Retry schedule

Backoff é policy futura.

Retry não pode ultrapassar uma vez por intenção lógica sem attempt lineage.

---

# 13. Starvation

Work eligible não executado por tempo excessivo deve ser observável.

---

# 14. Duplicate candidates

Dedup por intention.

---

# 15. Invariants

```text
priority != authority
READY local != globally eligible
stale baseline => ineligible
cancelled => ineligible
```

---

# 16. Princípio final

Scheduler escolhe quando executar.

Eligibility decide se pode executar.


---

# Scheduling de ValueIncrement e DeliveryTarget

## Eligibility

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

## REQUIRED priority

Quando houver candidatos elegíveis:

```text
REQUIRED_FOR_TARGET
→ prioridade automática sobre OPTIONAL_FOR_TARGET
```

Essa prioridade não viola dependências, authority ou gates.

---

## OPTIONAL

`OPTIONAL_FOR_TARGET` pode executar quando:

```text
não existe REQUIRED elegível concorrente
ou
há decisão humana governada alterando prioridade
```

---

## OUT_OF_TARGET

Por padrão:

```text
OUT_OF_TARGET => ineligible for current DeliveryTarget execution
```

salvo fluxo explícito de preparação/evolução fora da candidatura corrente,
governado separadamente.

---

## Sequencialidade

No MVP:

```text
eligible active ValueIncrement slots = 1
eligible active Work Item slots      = 1
```

O schema não deve assumir que sempre será assim.

---

## Recompute

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

## Invariantes

```text
priority != authority
OPTIONAL não fura REQUIRED automaticamente
OUT_OF_TARGET não executa para target corrente
stale target => ineligible
stale baseline => ineligible
```

---
