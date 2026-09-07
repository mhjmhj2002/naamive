# NAAMIVE — Orchestration Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `orchestration/01_ORCHESTRATION_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Reconciliar orquestração com:

```text
ValueIncrement
DeliveryTarget
DeliveryTargetMembership
Internal Phase Lifecycle
Activity Center
```

sem transformar o orchestrator em autoridade de negócio.

---

# 2. Regra central preservada

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

# 3. Unidade de contexto de implementação

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

# 4. Política sequencial do MVP

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

# 5. Prioridade entre REQUIRED e OPTIONAL

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

# 6. Ordem governada

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

# 7. Revalidation antes de claim

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

# 8. Decision requests

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

# 9. Proposal handling

Agent pode produzir proposal/draft.

Orchestrator pode encaminhar esse draft para decisão.

Mas:

```text
proposal != approved canonical state
```

---

# 10. Restart

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

# 11. Inconsistency / dead-end

Exemplos:

```text
ValueIncrement IMPLEMENTING sem Work Item/continuity
required ValueIncrement sem caminho executável
dois active ValueIncrements no MVP sem decisão autorizada
target current sem next action
```

Devem produzir/ligar `Inconsistency` canônica quando aplicável.

---

# 12. Invariantes

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

# 13. Consolidação

Este delta deve ser incorporado à revisão final de
`orchestration/01_ORCHESTRATION_MODEL.md` na candidata `NB-0002`.
