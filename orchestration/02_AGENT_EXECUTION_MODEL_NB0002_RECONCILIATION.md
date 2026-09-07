# NAAMIVE — Agent Execution Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `orchestration/02_AGENT_EXECUTION_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir como agents participam da decomposição e evolução de Entregas de Valor
sem receber soberania.

---

# 2. Agent como challenger/recommender

Agent de planejamento deve poder:

```text
analisar Module
propor ValueIncrements
questionar granularidade
sugerir split/merge
identificar dependências
propor ordem
propor critérios de valor
avaliar REQUIRED/OPTIONAL/OUT_OF_TARGET
explicar trade-offs
```

---

# 3. ValueIncrementProposal

Agent pode criar automaticamente um draft/proposal persistente equivalente a:

```text
ValueIncrementProposal
```

O proposal deve conter, conforme aplicável:

```text
source Module
proposed value statement
scope
out-of-scope
criteria
dependencies
rationale
alternatives
risk
recommended disposition
split/merge recommendation
Business Baseline
normative_baseline_ref
agent principal/context version
```

---

# 4. Proposal não é fato aprovado

```text
ValueIncrementProposal
!=
ValueIncrement canônica aprovada
```

Agent pode propor.

Agent não pode aprovar decisão material em nome de humano.

---

# 5. Human decision boundary

Para decisão material:

```text
agent proposal
→ decision request
→ human action surface
→ governed decision
→ canonical creation/change
```

---

# 6. Challenge obrigatório

O agent deve questionar, conforme aplicável:

```text
isso realmente entrega valor?
está grande demais?
está pequeno demais?
mistura mais de um valor?
há valor obrigatório + opcional misturados?
podemos entregar valor útil antes?
há dependência oculta?
há Work Item sem rastreabilidade de valor?
a decomposição está técnica demais?
```

---

# 7. Split antes de downgrade

Antes de recomendar:

```text
REQUIRED_FOR_TARGET
→ OPTIONAL_FOR_TARGET
ou OUT_OF_TARGET
```

agent deve avaliar se o problema real é decomposição ruim.

Se sim, sugerir split antes de reduzir compromisso.

---

# 8. Context package

Agent deve receber contexto versionado com:

```text
Project
Module
DeliveryTarget current/version
ValueIncrement map
dependencies
Business Baseline
normative_baseline_ref
open decisions
authority limits
expected output
prohibited actions
```

---

# 9. Stale context

Se target/baseline/lifecycle mudar materialmente durante a Execution:

```text
agent context becomes stale
```

Resultado não pode ser aplicado automaticamente sem revalidation.

---

# 10. Evidence

Proposal/recommendation material deve preservar racional e evidência suficiente
para a decisão humana.

---

# 11. Invariantes

```text
agent role != authority
proposal != approval
material decision missing => escalate
context pins baseline
split challenge precedes scope downgrade when applicable
agent cannot silently create canonical commitment
```

---

# 12. Consolidação

Este delta deve ser incorporado à revisão final de
`orchestration/02_AGENT_EXECUTION_MODEL.md` na candidata `NB-0002`.
