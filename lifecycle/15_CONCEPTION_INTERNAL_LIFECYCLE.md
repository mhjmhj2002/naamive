# NAAMIVE — CONCEPTION Internal Lifecycle

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a lifecycle interno da fase `Project.CONCEPTION`  
**Deriva de:** `03_PROJECT_LIFECYCLE.md`, `07_INTERNAL_PHASE_LIFECYCLE_MODEL.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Objetivo

Definir o processo semântico interno da fase `Project.CONCEPTION`.

A fase macro continua sendo:

```text
Project.CONCEPTION
```

O lifecycle interno responde:

```text
como a Need aceita se transforma em uma definição governada de solução
suficientemente madura para entrar em ARCHITECTURE?
```

---

# 2. Fronteira com a Need

A Need `ACCEPTED` já respondeu:

```text
qual problema merece compromisso?
```

`Project.CONCEPTION` responde:

```text
qual resultado de produto precisamos produzir para cumprir esse compromisso?
```

CONCEPTION não redescobre se a Need deveria ter sido aceita.

---

# 3. Fronteira com ARCHITECTURE

CONCEPTION identifica:

```text
capacidades necessárias
```

ARCHITECTURE decide:

```text
limites formais de Modules
responsabilidades
dependências arquiteturais
organização da solução
```

Capacidade em CONCEPTION é conceitual.

Module formal nasce em ARCHITECTURE.

---

# 4. Lifecycle interno normal

```text
ESTABLISH_CONTEXT
        ↓
FRAME_PRODUCT_OUTCOME
        ↓
MAP_ACTORS_AND_JOURNEYS
        ↓
BOUND_SCOPE
        ↓
IDENTIFY_REQUIRED_CAPABILITIES
        ↓
CAPTURE_RULES_AND_CONSTRAINTS
        ↓
DEFINE_SUCCESS_CRITERIA
        ↓
ASSESS_RISKS_AND_ALTERNATIVES
        ↓
RESOLVE_OPEN_DECISIONS
        ↓
VERIFY_CONCEPTION_READINESS
        ↓
READY_FOR_ARCHITECTURE
```

---

# 5. ESTABLISH_CONTEXT

Fixa o contexto recebido da Need aceita.

Deve preservar, conforme aplicável:

```text
Need ref
Need acceptance decision
Need understanding baseline
stakeholders known
impact classification
known risks/findings
constraints inherited
normative_baseline_ref
authority context
```

Não começa do zero.

---

# 6. FRAME_PRODUCT_OUTCOME

Transforma a Need aceita em resultado de produto pretendido.

Exemplo:

```text
Need:
"famílias precisam organizar e acompanhar suas finanças"

Product outcome:
"permitir que uma família registre, organize, planeje
e compreenda sua situação financeira"
```

Não define tecnologia.

---

# 7. MAP_ACTORS_AND_JOURNEYS

Identifica, conforme aplicável:

```text
users
stakeholders
consumers
main journeys
critical interactions
expected outcomes
```

Jornada deve ser suficiente para orientar escopo e critérios de sucesso.

---

# 8. BOUND_SCOPE

Define:

```text
in scope
out of scope
boundary assumptions
material exclusions
```

Evita crescimento informal de escopo durante arquitetura/implementação.

---

# 9. IDENTIFY_REQUIRED_CAPABILITIES

Identifica capacidades de negócio necessárias para cumprir o outcome.

Exemplos:

```text
controle de movimentações
orçamento familiar
visão financeira
controle de acesso
```

Essas capacidades ainda não são Modules formais.

---

# 10. CAPTURE_RULES_AND_CONSTRAINTS

Consolida, conforme aplicável:

```text
business rules
domain constraints
policy constraints
legal/privacy constraints
experience constraints
operational constraints
known data constraints
```

---

# 11. DEFINE_SUCCESS_CRITERIA

Define critérios globais de sucesso do Project.

Exemplos:

```text
usuário registra movimentações
usuário estabelece orçamento
usuário compara planejado x realizado
informação permanece consistente
jornada principal é compreensível
```

Esses critérios não substituem critérios futuros de ValueIncrement/Work Item.

---

# 12. ASSESS_RISKS_AND_ALTERNATIVES

Explora:

```text
risks
assumptions
alternatives
trade-offs
reversible decisions
irreversible decisions
recommendations
```

Agent pode analisar e recomendar.

Recomendação não é decisão.

---

# 13. RESOLVE_OPEN_DECISIONS

Decisões materiais ainda abertas devem ser:

```text
identified
classified
assigned
decided
or
carried forward with valid continuity when non-blocking
```

Para Project `MATERIAL` ou `CRÍTICO`, brainstorm estruturado deve existir quando
decisões relevantes estiverem abertas.

---

# 14. Questões e impedimentos durante CONCEPTION

Encontrar questão não significa parar toda a fase.

Fluxo:

```text
questão/finding/decision need
        ↓
persistir fato governado
        ↓
classificar affected scope
        ↓
classificar BLOCKING/NON_BLOCKING
        ↓
atualizar Phase Cycle Plan
        ↓
recalcular continuidade
```

---

# 15. NON_BLOCKING

Questão `NON_BLOCKING` pode atravessar para ARCHITECTURE somente quando possuir:

```text
owner
cause
impact
continuity
exit condition / decision route
baseline context
```

A fase pode continuar se ainda houver trabalho elegível.

---

# 16. BLOCKING

Questão `BLOCKING` impede `CONCEPTION → ARCHITECTURE`.

Pode bloquear apenas escopo local da fase enquanto outros passos independentes
continuam.

Para saída de CONCEPTION:

```text
blocking findings must be treated
```

---

# 17. Phase Cycle Plan

CONCEPTION deve possuir plano durável e versionado da jornada interna.

Exemplo:

```text
01 ✓ Frame product outcome
02 ✓ Map actors
03 ● Main journey
04 ○ Bound scope
05 ○ Identify capabilities
06 ○ Rules
07 ○ Success criteria

OPEN
D-17 NON_BLOCKING agora
     bloqueia fechamento de scope

F-21 NON_BLOCKING
     aguardando stakeholder
```

O agent não carrega essa memória entre sessões.

---

# 18. Conception Baseline

A saída da fase deve fixar Business Baseline identificável contendo, conforme
aplicável:

```text
product outcome
actors/stakeholders
journeys
scope
out of scope
required capabilities
business rules
constraints
success criteria
risks
material decisions
classified open questions
```

Nome humano candidato:

```text
Conception Baseline
```

Não é obrigatório criar nova entidade física com esse nome.

Deve existir identidade suficiente de Business Baseline.

---

# 19. VERIFY_CONCEPTION_READINESS

Verifica, conforme aplicável:

```text
product outcome sufficiently defined
material scope understood
actors/consumers known
main journeys understood
success criteria available
required capabilities identified
open questions classified
blocking findings treated
review complete
readiness audit complete when required
continuity for ARCHITECTURE
Business Baseline identifiable
```

---

# 20. READY_FOR_ARCHITECTURE

É último step interno da fase.

Não é novo estado do Project.

Significa:

```text
CONCEPTION internal process ready
for governed macro transition
```

Depois:

```text
Project.CONCEPTION
→ Project.ARCHITECTURE
```

somente por transição governada.

---

# 21. Restart safety

Após restart, o sistema deve reconstruir:

```text
current Conception step
completed steps
open decisions
findings
Phase Cycle Plan
last functional progress
Conception Baseline candidate/current
continuity
```

---

# 22. Activity Center

Exemplo:

```text
PROJECT — Controle Financeiro Familiar
CONCEPTION

✓ Contexto
✓ Resultado de produto
✓ Atores e jornadas
● Escopo
○ Capacidades
○ Regras
○ Critérios
○ Riscos/alternativas
○ Decisões abertas
○ Readiness
○ Pronto para arquitetura

Open decisions: 2
Blocking: 0
Non-blocking: 2
```

---

# 23. Invariantes

```text
Need acceptance is not redone
CONCEPTION outcome != architecture
capability != Module yet
BLOCKING unresolved => cannot leave CONCEPTION
NON_BLOCKING may cross only with continuity
Conception Baseline is identifiable
READY_FOR_ARCHITECTURE is internal step, not Project state
Phase Cycle Plan is durable
agent memory is not phase memory
```


---

# Phase Cycle Plan da Concepção

## Requisitos

O plano deve ser:

```text
durable
versioned
restart-safe
reconstructable
explainable
```

e deve representar:

```text
planned steps
current step
completed steps
open decisions
findings
waits
blockers
continuity
material plan changes
```

---

## Não é checklist descartável

Não pode existir apenas em:

```text
agent prompt
chat
frontend state
temporary worker memory
```

---

## Relação com fatos canônicos

Phase Cycle Plan referencia:

```text
Decision
Finding
Evidence
Review
Audit
Continuity
Business Baseline
```

Não duplica o lifecycle desses recursos.

---

## Mudança material

Mudança de:

```text
scope
required journey
required capability
success criteria
material decision path
```

deve produzir version/history suficiente.

---

## Supervisão

O backend/worker deve conseguir detectar:

```text
phase active without next step
blocking decision without continuity
step stale too long
plan current but baseline stale
all steps done but readiness not decided
```

Browser não é supervisor.
