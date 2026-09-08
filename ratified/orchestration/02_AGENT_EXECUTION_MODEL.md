# NAAMIVE — Agent Execution Model

**Status:** RATIFIED  **Versão:** 0.4  
**Autoridade:** modelo conceitual de execução por agentes  
**Deriva de:** Execution Lifecycle, Governance e Orchestration

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** participação governada de agents, contexto, tools, independência e execução

---

# 1. Objetivo

Definir como agents participam do NAAMIVE sem receber autoridade implícita.

---

# 2. Agent principal

Cada agent execution deve possuir principal identificável.

---

# 3. Agent role

Pode atuar como:

- author;
- reviewer;
- auditor;
- executor;
- recommender.

---

# 4. Role is not authority

Role descreve função.

Authority continua separada.

---

# 5. Context package

Agent deve receber contexto versionado:

- objective;
- scope;
- baseline;
- `normative_baseline_ref` server-derived;
- `controlling_rule_refs` quando necessários para a tarefa;
- evidence;
- constraints;
- authority;
- expected output;
- prohibited actions.

---

# 6. Context immutability

Durante uma execution, contexto base deve ser identificável.

Mudança material requer stale/restart/revalidation. Mudança da Normative
Baseline da instância também invalida o contexto até migração/revalidation
explícita. Agent nunca assume que `latest` é a norma aplicável.

---

# 7. Prompt is not law

Prompt operacional deriva das normas.

Não pode redefinir lifecycle.

---

# 8. Tool authority

Agent só usa tools explicitamente autorizadas.

---

# 9. Write isolation

Agent de audit não deve possuir write capability quando independência exigir
read-only.

---

# 10. Human gates

Agent não responde por humano.

---

# 11. Evidence

Agent deve produzir evidence suficiente para sua atividade.

---

# 12. Auditability

Registrar:

- model/provider quando relevante;
- principal;
- context version;
- tool calls relevantes;
- output;
- limitations;
- result.

---

# 13. Non-determinism

Outputs probabilísticos não podem ser tratados como prova única em decisão
crítica sem controls.

---

# 14. Retry

Retry cria nova Execution attempt.

---

# 15. Same agent independence

Nova sessão com mesmo principal não cria auditor independente.

---

# 16. Model changes

Troca de modelo pode alterar risk e deve ser tratada por Technology Baseline.

---

# 17. Cost controls

Policies podem limitar:

- reasoning level;
- attempts;
- model class;
- context size.

Cost não pode justificar bypass de law.

---

# 18. Failure

Tool/model failure segue Execution Lifecycle.

---

# 19. Hallucination defense

Agent deve operar fail-closed quando evidence/material context for insuficiente.

---

# 20. No silent invention

Decisão material ausente vira finding/decision request.

---

# 21. Secret handling

Secrets não devem entrar em prompt sem necessidade e proteção adequada.

---

# 22. External side effects

Agent não chama side effect fora de authority/Execution contract.

---

# 23. Invariants

```text
agent role != authority
prompt != law
agent context pins normative_baseline_ref
same principal != independent
material decision missing => escalate
```

---

# 24. Princípio final

Agent é participante governado do sistema.

Nunca é soberano.


---

# Agents, proposals e progresso funcional

## Agent como challenger/recommender

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

## ValueIncrementProposal

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

## Proposal não é fato aprovado

```text
ValueIncrementProposal
!=
ValueIncrement canônica aprovada
```

Agent pode propor.

Agent não pode aprovar decisão material em nome de humano.

---

## Human decision boundary

Para decisão material:

```text
agent proposal
→ decision request
→ human action surface
→ governed decision
→ canonical creation/change
```

---

## Challenge obrigatório

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

## Split antes de downgrade

Antes de recomendar:

```text
REQUIRED_FOR_TARGET
→ OPTIONAL_FOR_TARGET
ou OUT_OF_TARGET
```

agent deve avaliar se o problema real é decomposição ruim.

Se sim, sugerir split antes de reduzir compromisso.

---

## Context package

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

## Stale context

Se target/baseline/lifecycle mudar materialmente durante a Execution:

```text
agent context becomes stale
```

Resultado não pode ser aplicado automaticamente sem revalidation.

---

## Evidence

Proposal/recommendation material deve preservar racional e evidência suficiente
para a decisão humana.

---

## Invariantes

```text
agent role != authority
proposal != approval
material decision missing => escalate
context pins baseline
split challenge precedes scope downgrade when applicable
agent cannot silently create canonical commitment
```

---
