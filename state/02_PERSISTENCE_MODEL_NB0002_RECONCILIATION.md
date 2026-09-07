# NAAMIVE — Persistence Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-04 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `state/02_PERSISTENCE_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir as garantias de persistência necessárias para:

```text
ValueIncrement
DeliveryTarget
DeliveryTargetMembership
```

sem escolher tabelas físicas ou tecnologia.

---

# 2. Categorias preservadas

```text
CURRENT STATE
IMMUTABLE HISTORY
EVIDENCE
PROJECTIONS
OPERATIONAL CLAIMS
```

---

# 3. ValueIncrement current state

Deve ser durável o suficiente para responder:

```text
estado atual
versão
Module owner
baseline
continuidade
predecessor/successor
decisão/evidência
```

---

# 4. ValueIncrement immutable history

Deve preservar append-only:

```text
transitions
returns
acceptance
cancellation
split lineage
successor creation
baseline changes
authority decisions
evidence linkage
```

---

# 5. DeliveryTarget current state

Deve ser durável o suficiente para responder:

```text
qual target é current authoritative?
qual versão governa?
qual Project owner?
qual scope statement?
qual baseline?
qual authority/decision?
```

---

# 6. DeliveryTarget version history

Cada mudança material deve preservar:

```text
old version
new version
cause
decision
authority
Business Baseline
normative_baseline_ref
supersession
```

---

# 7. Membership persistence

A relação target-version ↔ ValueIncrement deve preservar:

```text
target id/version
value_increment_id
disposition
effective decision
included-in-candidate fact quando aplicável
baseline
authority
```

A forma física fica para a Technology Baseline.

---

# 8. Um current target por Project

A persistência deve conseguir impedir ou detectar dois Delivery Targets
autoritativos correntes para o mesmo Project e mesma intenção, inclusive sob
concorrência.

---

# 9. Atomicidade lógica de mudança de target

Uma mudança material deve formar unidade lógica consistente:

```text
nova versão
membership set
decision
authority
history
supersession da versão anterior
continuity resultante
descendant validity classification quando aplicável
```

Se atomicidade física completa não for possível, deve existir completion/recovery
durável.

---

# 10. Split de ValueIncrement

Split governado deve persistir:

```text
source ValueIncrement
successor ValueIncrements
reason
decision
authority
Business Baseline
normative_baseline_ref
target version effect
history
```

A origem não é apagada.

---

# 11. PR e artefatos externos

Vínculos entre ValueIncrement e artefatos técnicos externos, como GitHub Pull
Requests, devem ser duráveis.

O estado externo observado não vira source of truth do lifecycle de
ValueIncrement.

---

# 12. Functional progress

Estado funcional necessário para reconstrução após restart deve ser persistido.

Conforme aplicável:

```text
current internal phase/step
last_functional_progress_at
last functional progress description/ref
blocker/wait
continuity
```

---

# 13. Operational activity

Quando necessária para continuidade e UI, deve ser persistida a informação
corrente de:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Os três conceitos são distintos.

Histórico de heartbeat de alta frequência pode ser submetido futuramente a
retenção/compaction.

Histórico governado de lifecycle não pode ser apagado apenas por idade quando
necessário para auditoria/reconstrução.

---

# 14. Restart proof

Cenário:

```text
Project P
DT-01 v3 current

EV-C2 = IMPLEMENTING
disposition = OPTIONAL_FOR_TARGET

WI-C2-03 = IN_PROGRESS
Execution = RUNNING
last_functional_progress = "regra de limite validada"
```

Após restart:

```text
DT-01 v3 continua current
EV-C2 continua IMPLEMENTING
membership continua OPTIONAL_FOR_TARGET
WI continua conhecida
progress funcional continua conhecido
Execution é reavaliada conforme recovery/reconciliation
```

---

# 15. Idempotência

Operações de:

```text
accept ValueIncrement
create DeliveryTarget version
supersede target version
change membership
split ValueIncrement
include optional ValueIncrement in candidate
```

devem ser idempotentes por intention identity ou mecanismo equivalente.

---

# 16. Integridade referencial

Devem ser enforceáveis, conforme aplicável:

```text
Project → DeliveryTarget
Project → Module
Module → ValueIncrement
DeliveryTargetVersion ↔ ValueIncrement membership
ValueIncrement → Work Item
Work Item → Execution
```

---

# 17. Retenção

Pode existir futuramente:

```text
archival
partitioning
compaction
cleanup
```

para alto volume operacional, sem destruir fatos necessários para reconstrução,
auditoria, baseline ou lineage.

---

# 18. Regra de consolidação

Este conteúdo deve ser incorporado à revisão completa de
`state/02_PERSISTENCE_MODEL.md` na candidata `NB-0002`.
