# NAAMIVE — Canonical State Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-04 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `state/01_CANONICAL_STATE_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Registrar os deltas necessários no estado canônico para incorporar:

```text
ValueIncrement
DeliveryTarget
DeliveryTargetMembership
```

sem alterar a `NB-0001` vigente.

---

# 2. Novas entidades canônicas first-class

`ValueIncrement` é entidade canônica first-class.

Deve possuir, conforme aplicável:

```text
stable id
owner Module
current lifecycle state
version/generation
impact
definition
criteria
continuity
Business Baseline
normative_baseline_ref
predecessor/successor lineage
current authority-relevant facts
```

`DeliveryTarget` também é entidade canônica first-class e versionada.

Deve possuir, conforme aplicável:

```text
stable id
Project owner
current authoritative version
scope statement
Business Baseline
normative_baseline_ref
authority/decision refs
supersession refs
```

---

# 3. DeliveryTargetMembership é relação governada

A disposição de uma Entrega de Valor não pertence intrinsecamente à
`ValueIncrement`.

Ela pertence à relação entre:

```text
DeliveryTarget version
        ↕
ValueIncrement
```

A relação deve representar:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Exemplo:

```text
EV-X

DT-01 v1 → OUT_OF_TARGET
DT-02 v1 → REQUIRED_FOR_TARGET
```

---

# 4. Um único Delivery Target autoritativo corrente por Project

No MVP:

```text
Project
→ exatamente 0..1 DeliveryTarget autoritativo corrente
```

Podem coexistir:

```text
historical versions
superseded versions
drafts
proposals
```

Mas somente **um** Delivery Target governa a candidatura corrente.

É inválido ter dois Delivery Targets autoritativos correntes para o mesmo Project
e a mesma intenção de candidatura.

---

# 5. Estado atual versus histórico

O estado canônico atual responde:

```text
qual ValueIncrement está em qual estado agora?
qual Delivery Target/version governa agora?
qual disposition cada ValueIncrement possui nesse target?
```

O histórico responde:

```text
como chegamos aqui?
```

Alterar target, disposition, lifecycle state ou lineage não reescreve fatos
anteriores.

---

# 6. Terminalidade

`ValueIncrement.ACCEPTED` permanece terminal.

Mudança material posterior cria successor.

`DeliveryTarget` superseded permanece histórico.

Nenhuma nova versão apaga a versão anterior.

---

# 7. Relação hierárquica

```text
Need
  ↓
Project
  ├── DeliveryTarget
  │      └── DeliveryTargetMembership → ValueIncrement
  │
  └── Module
        └── ValueIncrement
              └── Work Item
                    └── Execution
```

`DeliveryTargetMembership` não muda ownership de `ValueIncrement`.

---

# 8. Currentness

O sistema deve conseguir responder canonicamente:

```text
qual Delivery Target é authoritative_current?
qual versão governa a candidatura?
qual membership é vigente nessa versão?
qual baseline sustenta essa decisão?
```

Currentness não pode ser inferido apenas pelo maior número de versão.

---

# 9. Continuidade

Todo `ValueIncrement` ativo deve possuir continuidade governada.

Todo `DeliveryTarget` corrente deve possuir continuidade compatível com o estado
do Project.

---

# 10. Baselines

Decisões materiais sobre `ValueIncrement`, `DeliveryTarget` e memberships devem
referenciar:

```text
Business Baseline
normative_baseline_ref
```

---

# 11. Inconsistency

Exemplos representáveis como inconsistência canônica:

```text
dois DeliveryTargets autoritativos correntes
ValueIncrement ativa sem continuidade
required membership sem ValueIncrement válida
target current apontando para versão superseded
projection divergente do target atual
accepted ValueIncrement reaberta
```

---

# 12. Restart safety

Após restart completo, o canonical state deve permitir reconstruir:

```text
Project atual
Delivery Target corrente e versão
membership/disposition
ValueIncrement state
Module/Work Item/Execution lineage
continuity
baseline
pending human decisions
```

Nada necessário para responder essas perguntas pode depender apenas de memória.

---

# 13. Regra de consolidação

Na revisão normativa final da candidata `NB-0002`, este delta deve ser incorporado
à revisão completa de `state/01_CANONICAL_STATE_MODEL.md`.
