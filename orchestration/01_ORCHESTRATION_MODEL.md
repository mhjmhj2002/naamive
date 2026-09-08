# NAAMIVE — Orchestration Model

**Status:** RATIFIED  **Versão:** 0.4  
**Autoridade:** modelo conceitual de orquestração  
**Deriva de:** Lifecycle, Contracts, State e Runtime Architecture

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** orquestração de trabalho autorizado, continuidade e materialização de Execution

---

# 1. Objetivo

Definir como o NAAMIVE encontra e materializa trabalho sem transformar
orchestrator em authority de negócio.

---

# 2. Regra central

Orchestrator responde:

```text
qual trabalho já autorizado pode ser executado agora?
```

Não responde:

```text
qual decisão de negócio devemos tomar?
```

---

# 3. Inputs

- canonical state;
- eligibility projection;
- continuity;
- authority;
- dependencies;
- gates;
- scheduling constraints.

---

# 4. Outputs

- Execution intent;
- human action task;
- wait;
- recovery task;
- reconciliation task;
- escalation.

---

# 5. No hidden law

Orchestrator não possui lifecycle paralelo.

---

# 6. Eligibility

Só agenda trabalho elegível.

---

# 7. Revalidation

Antes de claim, state deve ser revalidado.

---

# 8. Human work

Decisão humana pode ser orquestrada como action surface, não simulada por agent.

---

# 9. Agent work

Agent work é Execution de Work Item ou atividade governada equivalente.

---

# 10. Concurrency

Orchestrator pode gerar candidatos concorrentes, mas claim/fencing decide
authority operacional.

---

# 11. Restart

Pending work deve sobreviver restart.

---

# 12. Duplicate scheduling

Scheduling repetido não pode duplicar intention.

---

# 13. Backpressure

Arquitetura deve suportar limite de workload.

---

# 14. Priority

Priority pode ordenar, nunca violar dependencies/gates.

---

# 15. Fairness

Recursos não devem ficar starving indefinidamente sem observabilidade/escalation.

---

# 16. Dead-end e Inconsistency detection

Orchestrator deve ajudar a detectar active resource sem continuity. Quando a
detecção representar discrepância governada, deve abrir/vincular a
`Inconsistency` canônica e encaminhar sua continuity/escalation; não deve criar
ticket/log como segunda fonte de verdade.

---

# 17. Invariants

```text
no business decision by scheduler
no schedule without eligibility
no duplicate intention
restart-safe
```

---

# 18. Princípio final

Orchestration move trabalho autorizado.

Governança decide o que pode ser autorizado.


---

# Orquestração de ValueIncrement e internal phases

## Regra central preservada

Orchestrator responde:

```text
qual trabalho já autorizado pode executar agora?
```

Não responde:

```text
qual ValueIncrement devemos inventar?
qual escopo devemos reduzir?
qual decisão de negócio devemos aprovar?
```

---

## Unidade de contexto de implementação

Durante `Project.IMPLEMENTATION`, o orchestrator deve conhecer, conforme aplicável:

```text
Project
DeliveryTarget current/version
Module
ValueIncrement current
Work Item current
Execution attempts
Business Baseline
normative_baseline_ref
dependencies
continuity
gates/findings
authority
```

---

## Política sequencial do MVP

No MVP:

```text
active ValueIncrement = 1
active Work Item      = 1
```

Esta regra é política de orquestração inicial.

Não é cardinalidade estrutural do domínio.

O modelo deve permitir evolução futura para maior concorrência sem redefinir
ownership ou lifecycle.

---

## Prioridade entre REQUIRED e OPTIONAL

Se existir `ValueIncrement REQUIRED_FOR_TARGET` elegível, o scheduler não inicia
automaticamente `OPTIONAL_FOR_TARGET`.

Regra inicial:

```text
REQUIRED elegível
→ precede OPTIONAL em scheduling automático
```

Humano autorizado pode deliberadamente alterar a prioridade quando houver decisão
governada e rastreável.

`OUT_OF_TARGET` não compete por execução para a candidatura corrente.

---

## Ordem governada

Scheduler não escolhe por conveniência técnica.

Deve respeitar:

```text
planning order
dependencies
DeliveryTarget
baseline
authority
gates
continuity
priority policy
```

---

## Revalidation antes de claim

Antes de materializar nova Execution, revalidar:

```text
ValueIncrement ainda ativa?
Work Item ainda elegível?
DeliveryTarget/version ainda corrente?
membership/disposition ainda válida?
baseline ainda current?
dependências ainda satisfeitas?
nenhuma concorrência incompatível?
authority ainda válida?
```

Projection stale nunca autoriza claim.

---

## Decision requests

Quando falta decisão material:

```text
orchestrator
→ produz/encaminha human action task
```

Não simula decisão.

Exemplos:

```text
aprovar decomposição Module → ValueIncrement
aprovar split
alterar REQUIRED → OPTIONAL
aceitar ValueIncrement
aprovar nova DeliveryTarget version
```

---

## Proposal handling

Agent pode produzir proposal/draft.

Orchestrator pode encaminhar esse draft para decisão.

Mas:

```text
proposal != approved canonical state
```

---

## Restart

Pending work deve sobreviver restart.

Após restart, o orchestrator deve reconstruir:

```text
current target
active ValueIncrement
active Work Item
pending human decision
continuity
eligible next work
```

---

## Inconsistency / dead-end

Exemplos:

```text
ValueIncrement IMPLEMENTING sem Work Item/continuity
required ValueIncrement sem caminho executável
dois active ValueIncrements no MVP sem decisão autorizada
target current sem next action
```

Devem produzir/ligar `Inconsistency` canônica quando aplicável.

---

## Invariantes

```text
scheduler não toma decisão de negócio
REQUIRED precede OPTIONAL automaticamente
OUT_OF_TARGET não compete
claim revalida canonical state
MVP sequencial
restart-safe
proposal não é aprovação
```

---
