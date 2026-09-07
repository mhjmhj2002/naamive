# NAAMIVE — Projection Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-04 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `state/03_PROJECTION_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir como o novo estado canônico é projetado para UI, agents e orchestration.

---

# 2. Regra fundamental

```text
Projection != Source of Truth
```

A UI não inventa:

```text
ValueIncrement state
Delivery Target
membership disposition
progress
allowed action
acceptance eligibility
```

---

# 3. Project / Delivery Target projection

A projection deve conseguir mostrar:

```text
Delivery Target corrente
target version
required set
optional set
out-of-target set
included optional set
baseline candidate
global validation status
```

Exemplo:

```text
DT-01 v3

REQUIRED
4 / 4 accepted

OPTIONAL
1 / 2 accepted
1 included in candidate

OUT OF TARGET
3
```

Essas contagens são explicativas.

Não autorizam transição automaticamente.

---

# 4. Project aggregation

É proibido usar apenas:

```text
count(ValueIncrement ACCEPTED)
```

como lei de avanço.

Allowed actions devem derivar do conjunto canônico completo.

---

# 5. Module / ValueIncrement projection

```text
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

Exemplo:

```text
MODULE — Orçamento Familiar

✓ EV-C1 Criar orçamento mensal
  ACCEPTED
  REQUIRED_FOR_TARGET

● EV-C2 Alertar estouro
  IMPLEMENTING
  OPTIONAL_FOR_TARGET

  ✓ WI-01
  ✓ WI-02
  ● WI-03
  ○ WI-04
```

---

# 6. Activity Center

Activity Center deve derivar da projection canônica.

Deve separar:

```text
functional state
functional progress
Work Item state
Execution state
heartbeat
operational activity
```

Exemplo:

```text
EV-C2 — Alertar estouro
IMPLEMENTING

Último progresso funcional:
"regra de limite validada"

Work Item atual:
WI-03

Execution:
RUNNING

Heartbeat:
há 12s

Atividade operacional:
há 5s
```

---

# 7. Sem falso progresso

É proibido inferir percentual arbitrário.

Pode ser mostrado:

```text
3 / 5 steps
2 / 4 Work Items
4 / 4 required ValueIncrements accepted
```

quando o denominador vem do estado/plano canônico.

---

# 8. Human decision projection

Mudanças materiais de Delivery Target devem mostrar:

```text
current target version
proposed target version
ValueIncrement affected
old disposition
new disposition
reason
impact
agent recommendation
alternatives
split proposal
baseline
authority requirement
```

---

# 9. Split projection

Proposta de split deve mostrar:

```text
source
proposed successors
rationale
required/optional effect
dependency effect
target-version effect
```

---

# 10. Required Projection Set

Deve incorporar, quando relevante:

```text
ValueIncrement actionable continuity
DeliveryTarget decision
membership change
split decision
acceptance decision
blocked/wait state
rework/successor action
```

---

# 11. Staleness

Projection deve carregar watermark/version suficiente para detectar staleness de:

```text
ValueIncrement
DeliveryTarget version
membership
allowed action
```

Comando sempre revalida canonical state.

---

# 12. No client inference

Cliente não pode concluir:

```text
4/4 required = botão VALIDATE habilitado
```

por conta própria.

O servidor projeta a ação autorizada.

---

# 13. Restart reconstruction

Após restart, a projection deve ser reconstruível e voltar a mostrar:

```text
target atual
dispositions
ValueIncrement states
Work Items
Executions
continuity
functional progress
pending decisions
```

---

# 14. Agent context

Context package para agent pode projetar:

```text
Module
ValueIncrement map
DeliveryTarget
required/optional/out-of-target
dependencies
current baseline
open decisions
continuity
```

Antes de ação material, canonical state é revalidado.

---

# 15. Inconsistency projection

Deve tornar visível, conforme autoridade:

```text
two-current-target conflict
missing required membership
projection conformance mismatch
missing continuity
stale candidate baseline
accepted ValueIncrement incorrectly reopened
```

---

# 16. Invariantes

```text
projection derivada
target version visível
membership disposition não é inventada
counts são explicativos
allowed actions são server-derived
Activity Center não confunde heartbeat com valor
restart reconstrói a jornada
stale UI não vence canonical state
```

---

# 17. Regra de consolidação

Este conteúdo deve ser incorporado à revisão completa de
`state/03_PROJECTION_MODEL.md` na candidata `NB-0002`.
