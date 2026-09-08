# NAAMIVE — Cross-Lifecycle Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  

---

# 1. Canonical hierarchy

```text
Need
  ↓
Project
  ↓
Module
  ↓
ValueIncrement
  ↓
Work Item
  ↓
Execution
```

Cross-cutting governed artifacts:

```text
DeliveryTarget
PhaseCycleInstance
PhaseCyclePlan
DevelopmentCycleInstance
DevelopmentRoadmap
DeliveryManifest
```

---

# 2. Ownership / relation matrix

| Resource | Governing owner | May have many | Terminal can exist before parent terminal? |
|---|---|---|---|
| Need | itself | Projects only after accepted commitment as governed | yes |
| Project | accepted Need context | Modules, DeliveryTargets, Project-scoped WIs | yes |
| Module | exactly one Project | ValueIncrements | yes |
| ValueIncrement | exactly one Module | Work Items | yes |
| Work Item | Project or Module scope; Module path references one ValueIncrement | Executions | yes |
| Execution | exactly one logical Work Item/activity intent | attempts/causal successors | terminal attempt yes |
| DeliveryTarget | exactly one Project | memberships/version history | yes |
| DeliveryManifest | exactly one Project candidacy context | included EV refs/evidence | yes |

---

# 3. No automatic promotion shortcuts

Forbidden:

```text
Execution.SUCCEEDED
=> WorkItem.DONE

WorkItem.DONE
=> ValueIncrement.ACCEPTED

ValueIncrement.ACCEPTED
=> Module.INTEGRATED

Module.INTEGRATED
=> Project validation passed

Project.VALIDATION completed
=> Delivery accepted
```

Each layer requires its own governing decision/evidence.

---

# 4. Terminality / succession

```text
Need ACCEPTED/REJECTED/CANCELLED terminal
Project DELIVERED/CANCELLED terminal
Module INTEGRATED/CANCELLED terminal
ValueIncrement ACCEPTED/CANCELLED terminal
Work Item DONE/CANCELLED terminal
Execution SUCCEEDED/FAILED/CANCELLED terminal
```

Material correction never silently reopens terminal resource.

Use successor/new governed work.

---

# 5. Phase lifecycle matrix

| Project phase | Internal lifecycle | Exit step |
|---|---|---|
| CONCEPTION | Conception Cycle | READY_FOR_ARCHITECTURE |
| ARCHITECTURE | Architecture Cycle | READY_FOR_PLANNING |
| PLANNING | Planning Cycle | READY_FOR_IMPLEMENTATION |
| IMPLEMENTATION | Implementation Cycle | READY_FOR_VALIDATION |
| VALIDATION | Validation Cycle | READY_FOR_DELIVERY |
| DELIVERY | Delivery Cycle | decision + materialized handoff |

`Project.DELIVERED` has no active internal phase lifecycle.

---

# 6. Internal lifecycle is orthogonal

Internal Phase Lifecycle does not become another ownership layer.

Example:

```text
Project.IMPLEMENTATION
  └ PhaseCycleInstance
      └ semantic steps

Module
  └ ValueIncrement
      └ WorkItem
          └ Execution
```

Steps may reference work/evidence but do not own Work Items by hidden cardinality.

---

# 7. Parent change validity classification

Material parent/baseline change can classify descendants:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

The classification must be explicit when validity could have changed.

---

# 8. Delivery Target relationship

`DeliveryTargetMembership` relates:

```text
DeliveryTargetVersion ↔ ValueIncrement
```

with:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Disposition is target-specific.

---

# 9. Delivery Manifest relationship

DeliveryManifest freezes:

```text
exact DeliveryTargetVersion
exact candidate Business Baseline
required set
included optional set
out-of-target set
participating Modules
evidence context
```

It does not rewrite DeliveryTargetMembership.

---

# 10. Development Roadmap relationship

DevelopmentRoadmap organizes:

```text
Work Item refs
Finding remediation refs
Human Decision refs
Recovery/Reconciliation refs
```

It is not a duplicate lifecycle for those resources.

---

# 11. Re-entry

When Project returns to a macro phase:

```text
create new PhaseCycleInstance
cause_ref previous decision/finding
do not reset prior cycle
```

When Work Item returns `IN_REVIEW → IN_PROGRESS`:

```text
create new DevelopmentCycleInstance
```

---

# 12. Cross-layer validation ladder

```text
Work Item review
→ local work correctness

ValueIncrement VALIDATING/ACCEPTANCE
→ promised incremental business value

Module VALIDATING/INTEGRATED
→ coherent business capability

Project VALIDATION
→ global/E2E result

Project DELIVERY
→ governed acceptance candidacy

Delivery
→ accepted terminal fact
```

---

# 13. Invariants

```text
ownership remains explicit
internal phase != ownership layer
terminal history never reopens
no implicit promotion across layers
target disposition is contextual
manifest inclusion is candidacy-specific
baseline change never silently preserves validity
```


---

# Validação em camadas e Delivery

## Validação em camadas

O NAAMIVE preserva perguntas diferentes:

```text
Work Item review
→ este trabalho local está correto?

ValueIncrement VALIDATING
→ este incremento entrega o valor prometido?

Module VALIDATING
→ os incrementos aceitos formam uma capacidade coerente?

Project VALIDATION
→ o conjunto integrado satisfaz os critérios globais do Project?

Project DELIVERY
→ a candidatura de entrega deve ser aceita?

Delivery
→ registro terminal do aceite
```

Nenhuma camada substitui automaticamente a outra.

---

## Pré-condição de Project.VALIDATION

Antes de `Project.IMPLEMENTATION → Project.VALIDATION`, para o Delivery Target
corrente:

```text
todas as ValueIncrements REQUIRED_FOR_TARGET
→ ACCEPTED

todas as capacidades/Modules necessários
→ em condição compatível com validação global

Work Items transversais obrigatórios
→ concluídos

baseline global
→ identificável e estável

Executions capazes de alterar o mesmo baseline
→ nenhuma em voo
```

ValueIncrement `OPTIONAL_FOR_TARGET` pode:

```text
estar aceita e participar
ou
estar ausente sem bloquear
```

ValueIncrement `OUT_OF_TARGET` não participa da candidatura.

---

## Project.VALIDATION

Project.VALIDATION responde:

```text
o conjunto integrado resolve o compromisso global do Project?
```

Exemplo — Controle Financeiro Familiar:

```text
login
  ↓
registrar despesa
  ↓
classificar em categoria
  ↓
recalcular orçamento
  ↓
atualizar previsto x realizado
  ↓
refletir dashboard
```

Todos os ValueIncrements podem estar `ACCEPTED` localmente e ainda assim a
validação global pode encontrar problema de integração, experiência, operação,
segurança, performance ou coerência transversal.

---

## Finding global sobre ValueIncrement ACCEPTED

Se Project.VALIDATION encontrar defeito material ligado a uma Entrega de Valor já
`ACCEPTED`:

```text
não reabrir o ValueIncrement histórico
```

Criar:

```text
successor ValueIncrement
ou
Project-scoped Work Item transversal
```

conforme ownership real da correção.

O Project retorna ao nível apropriado de implementação/planejamento/arquitetura,
preservando causalidade e baseline.

---

## VALIDATION → DELIVERY

Somente quando:

```text
critérios globais satisfeitos
evidências suficientes
findings bloqueadores tratados
riscos residuais conhecidos
baseline estável
Delivery Target resolvido
continuidade para decisão de entrega
```

o Project pode entrar em `DELIVERY`.

---

## Project.DELIVERY é candidatura

`Project.DELIVERY` continua sendo fase de decisão.

Não é:

```text
deploy
merge
release técnico
Delivery já aceita
```

A entidade `Delivery` somente nasce após decisão positiva.

---

## Conteúdo mínimo da candidatura

A superfície de decisão deve permitir avaliar:

```text
Need original
Project
Delivery Target + version
baseline candidato
Modules participantes
ValueIncrements REQUIRED_FOR_TARGET
ValueIncrements OPTIONAL_FOR_TARGET incluídas
ValueIncrements OUT_OF_TARGET
evidências
validação global
findings
riscos residuais
exceções
limitações
capacidade operacional
recomendação
authority
```

---

## Regra de Required

Se existir:

```text
ValueIncrement REQUIRED_FOR_TARGET
!= ACCEPTED
```

a candidatura não pode ser aceita.

Saídas:

```text
retornar para implementação
ou
mudar escopo/decomposição por decisão governada
```

---

## Regra de Optional

ValueIncrement `OPTIONAL_FOR_TARGET` ausente:

```text
não bloqueia
```

ValueIncrement `OPTIONAL_FOR_TARGET` pronta:

```text
pode ser incluída
```

desde que:

```text
compatível com baseline
validada conforme regras
explicitamente incluída no escopo final
```

---

## Regra de Out of Target

ValueIncrement `OUT_OF_TARGET`:

```text
não participa
não bloqueia
não pode ser apresentada como entregue
```

---

## Aceite

Ao aceitar a candidatura:

```text
Project.DELIVERY
        ↓ positive governed decision
create Delivery
        ↓
Project.DELIVERED
```

A decisão, criação idempotente de Delivery e transição para `DELIVERED` devem
formar handoff governado e recuperável.

---

## Conteúdo da Delivery aceita

A Delivery aceita deve preservar, conforme aplicável:

```text
Need original
Project
Delivery Target id/version
baseline entregue
Modules participantes
ValueIncrements incluídas
disposição de cada ValueIncrement no target
evidências
findings
riscos aceitos
exceções
limitações
authority
decision
normative_baseline_ref
```

---

## Evolução

Project `DELIVERED` permanece terminal.

Nova mudança entra por Need governada e referencia:

```text
Delivery predecessora
ou
baseline predecessor
```

Uma ValueIncrement que estava `OUT_OF_TARGET` ou `OPTIONAL_FOR_TARGET` em Delivery
anterior pode tornar-se `REQUIRED_FOR_TARGET` em evolução futura.

---

## Exemplo completo

```text
PROJECT
Controle Financeiro Familiar

DELIVERY TARGET DT-01

REQUIRED_FOR_TARGET
✓ EV-A1 Login
✓ EV-B1 Registrar movimentações
✓ EV-C1 Criar orçamento
✓ EV-C2 Previsto x realizado
✓ EV-D1 Dashboard

OPTIONAL_FOR_TARGET
✓ EV-C3B Notificação push

OUT_OF_TARGET
○ EV-R1 Relatório PDF
```

Project.VALIDATION prova a jornada integrada.

Project.DELIVERY apresenta:

```text
5 required / 5 accepted
1 optional included
1 out of target
global validation PASS
baseline B42
```

Após aceite:

```text
Delivery D-001
```

preserva exatamente esse escopo.

---

## Invariantes

```text
ValueIncrement.ACCEPTED != Project validated
Module.INTEGRATED != Project validated
Project.VALIDATION != Delivery accepted
Project.DELIVERY != Delivery entity
required missing blocks acceptance
optional missing does not block
out-of-target is not delivered
global finding does not rewrite accepted history
Delivery records exact target version and included scope
```

---
