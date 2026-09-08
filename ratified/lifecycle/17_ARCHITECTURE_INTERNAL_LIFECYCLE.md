# NAAMIVE — ARCHITECTURE Internal Lifecycle

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a lifecycle interno da fase `Project.ARCHITECTURE`  
**Deriva de:** `03_PROJECT_LIFECYCLE.md`, `04_MODULE_LIFECYCLE.md`, `07_INTERNAL_PHASE_LIFECYCLE_MODEL.md`, `15_CONCEPTION_INTERNAL_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Objetivo

Definir o processo semântico interno da fase `Project.ARCHITECTURE`.

A fase responde:

```text
como a solução será organizada para cumprir a Conception Baseline?
```

Não executa implementação.

---

# 2. Entrada

ARCHITECTURE recebe:

```text
Conception Baseline
classified open questions
continuity
Project impact
normative_baseline_ref
```

---

# 3. Lifecycle interno

```text
RECEIVE_CONCEPTION_BASELINE
        ↓
REFINE_CAPABILITY_MAP
        ↓
DESIGN_MODULE_BOUNDARIES
        ↓
FORMALIZE_MODULES
        ↓
DEFINE_RESPONSIBILITIES_AND_INTERFACES
        ↓
MAP_DEPENDENCIES_AND_INTEGRATIONS
        ↓
MODEL_DATA_AND_CONCEPTUAL_CONTRACTS
        ↓
DESIGN_CROSS_CUTTING_CONCERNS
        ↓
ASSESS_ARCHITECTURE_ALTERNATIVES
        ↓
DEFINE_TECHNOLOGY_STRATEGY
        ↓
RESOLVE_ARCHITECTURE_DECISIONS
        ↓
VERIFY_ARCHITECTURE_COHERENCE
        ↓
FIX_ARCHITECTURE_BASELINE
        ↓
VERIFY_ARCHITECTURE_READINESS
        ↓
READY_FOR_PLANNING
```

---

# 4. REFINE_CAPABILITY_MAP

Revalida as capacidades conceituais vindas de CONCEPTION.

Verifica, conforme aplicável:

```text
missing capability
duplicated responsibility
mixed responsibility
technical grouping masquerading as capability
capability without business outcome
```

---

# 5. DESIGN_MODULE_BOUNDARIES

Propõe limites de capacidades de negócio coerentes.

É inválido usar como Module:

```text
Frontend
Backend
Database
Controllers
Repositories
AWS
React
Java
```

---

# 6. FORMALIZE_MODULES

Modules canônicos podem nascer nesta fase.

Fluxo esperado:

```text
Module.IDENTIFIED
→ Module.DEFINED
```

Para Modules materiais necessários ao target corrente, a saída normal de
ARCHITECTURE deve ser `DEFINED`.

Permanecer apenas `IDENTIFIED` exige justificativa governada e continuity
explícita.

---

# 7. DEFINE_RESPONSIBILITIES_AND_INTERFACES

Deve esclarecer:

```text
business responsibility
inputs
outputs
conceptual interfaces
ownership boundaries
actors
business rules
```

---

# 8. MAP_DEPENDENCIES_AND_INTEGRATIONS

Dependência relevante deve possuir:

```text
source
target
satisfaction condition
impact
owner
fallback
```

Dependência sem condição verificável é incompleta.

---

# 9. MODEL_DATA_AND_CONCEPTUAL_CONTRACTS

Define ownership conceitual de informação e contratos de troca.

Não fixa necessariamente:

```text
tables
indexes
ORM mapping
wire protocol
```

Esses detalhes pertencem à Technology Baseline/implementation design conforme
aplicável.

---

# 10. DESIGN_CROSS_CUTTING_CONCERNS

Deve cobrir, conforme aplicável:

```text
security
identity/authority
auditability
privacy
operability
observability
resilience
migration
compatibility
```

Primeiro define requisito arquitetural.

Tecnologia vem depois.

---

# 11. ASSESS_ARCHITECTURE_ALTERNATIVES

Agent pode propor:

```text
alternatives
trade-offs
risks
recommendation
```

Recomendação não é decisão.

---

# 12. DEFINE_TECHNOLOGY_STRATEGY

Technology Baseline é artefato arquitetural.

Não é Project state.

ARCHITECTURE deve resolver tecnologia no nível necessário para:

```text
planejar
avaliar riscos
definir constraints
preparar readiness
```

Nem todo detalhe tecnológico precisa estar final antes de `ARCHITECTURE → PLANNING`.

---

# 13. Technology Baseline e transição para implementação

Regra aprovada:

```text
ARCHITECTURE → PLANNING
```

requer Technology Baseline suficientemente definida para planejamento.

Mas:

```text
PLANNING → IMPLEMENTATION
```

não pode ocorrer com decisão tecnológica material necessária à implementação
ainda aberta.

---

# 14. RESOLVE_ARCHITECTURE_DECISIONS

Decisões `MATERIAL`/`CRÍTICA` devem preservar:

```text
problem
alternatives
trade-offs
decision
evidence
review
audit
authority
baseline
normative_baseline_ref
```

---

# 15. VERIFY_ARCHITECTURE_COHERENCE

Verifica o desenho como sistema.

Perguntas mínimas, conforme aplicável:

```text
toda capability tem owner?
há responsibility duplicada?
há responsibility sem owner?
há dependency problemática/circular?
há conceptual contract incompatível?
há dado sem owner?
há cross-cutting concern esquecido?
Modules cumprem a Conception Baseline?
```

---

# 16. FIX_ARCHITECTURE_BASELINE

A fase deve produzir Business Baseline identificável.

Nome humano candidato:

```text
Architecture Baseline
```

Pode conter:

```text
Conception Baseline ref
Module map
Module versions
responsibilities
boundaries
dependencies
integrations
conceptual contracts
data ownership
cross-cutting requirements
architecture decisions
Technology Baseline ref/version
risks
findings
classified open questions
```

Não é obrigatório criar entidade física específica chamada
`ArchitectureBaseline`.

---

# 17. Questões e impedimentos

Mesmo padrão aprovado:

```text
issue/finding/decision discovered
        ↓
persist
        ↓
classify affected scope
        ↓
BLOCKING / NON_BLOCKING
        ↓
update Phase Cycle Plan
        ↓
recompute continuity
```

Finding não implica parada total por padrão.

---

# 18. NON_BLOCKING

Pode atravessar para PLANNING somente com:

```text
owner
impact
continuity
exit condition / decision route
baseline context
```

e desde que não torne o planejamento materialmente inválido.

---

# 19. BLOCKING

Impede `ARCHITECTURE → PLANNING` quando afeta readiness da arquitetura.

Pode bloquear apenas escopo local enquanto outros passos independentes continuam.

---

# 20. VERIFY_ARCHITECTURE_READINESS

Requer, conforme aplicável:

```text
architecture sufficient to plan
material Modules identified
required material Modules DEFINED
responsibilities known
material dependencies known
risks treated
blocking findings treated
specialist review complete
readiness audit complete when required
Architecture Baseline identifiable
Technology Baseline sufficient for planning
continuity for PLANNING
```

---

# 21. READY_FOR_PLANNING

Último step interno.

Não é Project state.

Depois:

```text
Project.ARCHITECTURE
→ Project.PLANNING
```

por transição governada.

---

# 22. Retorno para CONCEPTION

Se arquitetura revelar:

```text
inviable journey
invalid product assumption
missing capability
scope incompatibility
disproportionate risk/cost
```

pode ocorrer:

```text
Project.ARCHITECTURE
→ Project.CONCEPTION
```

com cause/evidence/authority.

A história não é apagada.

---

# 23. Activity Center

Exemplo:

```text
ARCHITECTURE

✓ Conception Baseline
✓ Capability map
✓ Module boundaries
✓ Modules formalizados
✓ Responsabilidades
● Dependências
○ Dados/contratos
○ Cross-cutting
○ Alternativas
○ Estratégia tecnológica
○ Decisões
○ Coerência
○ Architecture Baseline
○ Readiness
○ Pronto para Planning
```

---

# 24. Invariantes

```text
capability from CONCEPTION becomes formal Module only here
technical layer != Module
material target Module normally leaves ARCHITECTURE as DEFINED
Architecture Baseline identifiable
Technology Baseline is artifact, not state
Technology Baseline may be incomplete for non-material planning detail
material implementation technology cannot remain open at PLANNING → IMPLEMENTATION
BLOCKING unresolved => cannot leave ARCHITECTURE
NON_BLOCKING may cross only with continuity
READY_FOR_PLANNING is internal step
```


---

# Phase Cycle Plan da Arquitetura

## Deve representar

```text
architecture steps
current step
completed steps
Module proposals/formalized refs
open architecture decisions
findings
dependencies
waits
blockers
Technology Baseline progress
Architecture Baseline candidate
continuity
```

---

## Mudança material

Mudança de:

```text
Module boundaries
responsibility ownership
dependency topology
conceptual contracts
technology strategy
material architecture decision
```

deve ser versionada ou manter histórico equivalente.

---

## Não depende do agent

Agent session pode terminar.

O plano continua no sistema.

---

## Supervisor

Deve detectar:

```text
architecture active without next step
Module required but not sufficiently defined
blocking dependency without continuity
Technology Baseline insufficient for next phase
baseline stale
all steps done but readiness not decided
```
