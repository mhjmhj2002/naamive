# NAAMIVE — Project Continuity

**Status:** LIVING PROJECT DOCUMENT  
**Natureza:** documento operacional e de continuidade; não normativo  
**Local:** raiz do repositório  
**Arquivo:** `PROJECT_CONTINUITY.md`  
**Última atualização:** 2026-09-07  
**Branch ativa:** `lifecycle-reboot`  
**Último commit validado:** `7ee08781a069a5d00f6af7a96ca544ec5adb7c65`  
**Normative Baseline vigente:** `NB-0001`  
**Normative Baseline candidata:** `NB-0002` — NOT IN FORCE

---

## 1. Propósito

Este arquivo é o roadmap operacional vivo do NAAMIVE.

Ele deve permitir responder rapidamente:

```text
onde o projeto está?
o que já terminou?
qual lei está vigente?
qual baseline está sendo preparada?
qual é a próxima etapa?
o que está bloqueado?
como continuar sem reconstruir todo o contexto?
```

Ele **não é normativo**.

Em caso de divergência:

```text
Normative Baseline vigente
> documentação normativa candidata
> PROJECT_CONTINUITY.md
> material explicativo
```

---

## 2. Visão do produto

```text
Transforming Business Needs into Delivered Software
```

Princípio:

```text
necessidade de negócio primeiro
software como consequência
valor entregue como objetivo
```

Hierarquia candidata atual:

```text
Need
  ↓
Project
  ↓
Module
  ↓
ValueIncrement / Entrega de Valor
  ↓
Work Item
  ↓
Execution
```

Internal Phase Lifecycle é ortogonal à hierarquia de ownership.

---

## 3. Leitura obrigatória ao retomar

```text
1. PROJECT_CONTINUITY.md
2. README.md
3. AGENTS.md
4. governance/normative-baselines/NB-0001.md
5. audits/AUD-006_NB0002_INTERNAL_PHASE_LIFECYCLE_GAP_ANALYSIS.md
6. audits/AUD-007_NB0002_VALUE_DELIVERY_GAP_ANALYSIS.md
7. documentação específica da task atual
```

Regras:

```text
NB-0001 = lei vigente e imutável
NB-0002 working docs = candidata, NOT IN FORCE
audits = evidência, não norma
Technology Baseline = desenho técnico, não norma
legacy = referência histórica, não autoridade
```

---

## 4. Estado normativo

Baseline vigente:

```text
NB-0001
Status: IN FORCE
Membership: 43 documentos normativos
```

Commit de ratificação:

```text
36dafaf4f62f3b7a6e017696444fb547ce9aed90
docs(governance): ratify normative baseline NB-0001
```

`NB-0001` é imutável.

Mudança normativa futura:

```text
NB-0001
   ↓
NB-0002
```

Instâncias existentes não migram automaticamente para futura baseline.

---

## 5. Último checkpoint validado

Branch:

```text
lifecycle-reboot
```

HEAD validado:

```text
7ee08781a069a5d00f6af7a96ca544ec5adb7c65
docs(nb-0002): advance lifecycle reconciliation through R2-11
```

Validação:

```text
branch/history........................ PASS
NB-0001 preservada.................... PASS
working docs NB-0002 publicados....... PASS
R2-05..R2-11 publicados............... PASS
AUD-006 aponta Corpus Conformance...... PASS
Technology Baseline permanece draft... PASS
```

---

## 6. Por que a Technology Baseline foi pausada

A rodada técnica chegou a:

```text
Technology Baseline 2.6
```

Durante o desenho do 2.7/UI surgiu uma lacuna normativa real:

```text
Project macro phase
não possuía lifecycle interno semântico suficiente
```

Além disso, foi identificada a necessidade de:

```text
ValueIncrement / Entrega de Valor
DeliveryTarget
DeliveryManifest / Candidacy Snapshot
DevelopmentRoadmap
PhaseCycle
```

Decisão:

```text
PAUSAR Technology Baseline
→ corrigir a candidata normativa
→ auditar
→ ratificar NB-0002
→ retomar Technology Baseline 2.7
```

---

## 7. ValueIncrement / Entrega de Valor

```text
Module
→ capacidade de negócio relativamente estável

ValueIncrement
→ incremento finito, utilizável e verificável de valor

Work Item
→ trabalho planejado que produz parte do incremento

Execution
→ tentativa operacional autorizada
```

Exemplo:

```text
PROJECT Controle Financeiro Familiar

Module Orçamento Familiar
  ├ EV-01 Criar orçamento mensal
  │  ├ WI-01 Estruturar orçamento
  │  ├ WI-02 Definir limites
  │  └ WI-03 Editar orçamento
  │
  ├ EV-02 Acompanhar realizado x planejado
  └ EV-03 Alertar estouro de orçamento
```

Fluxo normal:

```text
Module
→ ValueIncrement
→ Work Item
→ Execution
```

---

## 8. Delivery Target

Disposition por target/version:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Disposition pertence à relação:

```text
DeliveryTargetVersion ↔ ValueIncrement
```

Não é atributo eterno da ValueIncrement.

Separação:

```text
DeliveryTarget
→ define obrigação

Delivery Manifest / Candidacy Snapshot
→ define o conjunto efetivamente apresentado na candidatura
```

`included_in_candidate` não deve ser atributo eterno do membership.

---

## 9. Internal Phase Lifecycle

Todos os seis macroestados não terminais do Project possuem ciclo interno
candidato:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

`DELIVERED` é terminal.

### CONCEPTION

```text
ESTABLISH_CONTEXT
→ FRAME_PRODUCT_OUTCOME
→ MAP_ACTORS_AND_JOURNEYS
→ BOUND_SCOPE
→ IDENTIFY_REQUIRED_CAPABILITIES
→ CAPTURE_RULES_AND_CONSTRAINTS
→ DEFINE_SUCCESS_CRITERIA
→ ASSESS_RISKS_AND_ALTERNATIVES
→ RESOLVE_OPEN_DECISIONS
→ VERIFY_CONCEPTION_READINESS
→ READY_FOR_ARCHITECTURE
```

### ARCHITECTURE

```text
RECEIVE_CONCEPTION_BASELINE
→ REFINE_CAPABILITY_MAP
→ DESIGN_MODULE_BOUNDARIES
→ FORMALIZE_MODULES
→ DEFINE_RESPONSIBILITIES_AND_INTERFACES
→ MAP_DEPENDENCIES_AND_INTEGRATIONS
→ MODEL_DATA_AND_CONCEPTUAL_CONTRACTS
→ DESIGN_CROSS_CUTTING_CONCERNS
→ ASSESS_ARCHITECTURE_ALTERNATIVES
→ DEFINE_TECHNOLOGY_STRATEGY
→ RESOLVE_ARCHITECTURE_DECISIONS
→ VERIFY_ARCHITECTURE_COHERENCE
→ FIX_ARCHITECTURE_BASELINE
→ VERIFY_ARCHITECTURE_READINESS
→ READY_FOR_PLANNING
```

### PLANNING

```text
RECEIVE_ARCHITECTURE_BASELINE
→ ESTABLISH_DELIVERY_TARGET
→ PLAN_MODULE_DELIVERY
→ DECOMPOSE_MODULES_INTO_VALUE_INCREMENTS
→ CHALLENGE_VALUE_DECOMPOSITION
→ DEFINE_VALUE_INCREMENT_DEPENDENCIES
→ ORDER_VALUE_DELIVERY
→ DETAIL_NEAR_TERM_WORK
→ PLAN_TRANSVERSAL_WORK
→ DEFINE_VALIDATION_STRATEGY
→ DEFINE_INTEGRATION_STRATEGY
→ RESOLVE_PLANNING_DECISIONS
→ VERIFY_TECHNOLOGY_READINESS
→ FIX_PLANNING_BASELINE
→ VERIFY_IMPLEMENTATION_READINESS
→ READY_FOR_IMPLEMENTATION
```

### IMPLEMENTATION

```text
PREPARE_IMPLEMENTATION
→ MATERIALIZE_VALUE
→ VERIFY_IMPLEMENTATION
→ READY_FOR_VALIDATION
```

Work Item Development:

```text
PREPARE_WORK
→ IMPLEMENT_CHANGE
→ VERIFY_CHANGE
→ MATERIALIZE_CANDIDATE
→ VERIFY_CANDIDATE
→ PREPARE_REVIEW
→ REVIEW_RESULT
→ VERIFY_ACCEPTANCE
→ READY_FOR_DECISION
```

### VALIDATION

```text
RECEIVE_IMPLEMENTATION_CANDIDATE
→ FREEZE_VALIDATION_CONTEXT
→ VERIFY_TARGET_COVERAGE
→ VERIFY_MODULE_COHERENCE
→ EXECUTE_CROSS_MODULE_VALIDATION
→ VALIDATE_END_TO_END_JOURNEYS
→ VALIDATE_NON_FUNCTIONAL_REQUIREMENTS
→ CONSOLIDATE_EVIDENCE
→ ASSESS_FINDINGS_AND_RISKS
→ DETERMINE_REWORK_SCOPE
→ VERIFY_VALIDATION_COMPLETENESS
→ FIX_VALIDATION_BASELINE
→ READY_FOR_DELIVERY
```

### DELIVERY

```text
RECEIVE_VALIDATED_CANDIDATE
→ FREEZE_DELIVERY_CANDIDACY
→ RESOLVE_TARGET_MEMBERSHIP
→ BUILD_DELIVERY_MANIFEST
→ VERIFY_REQUIRED_VALUE
→ RESOLVE_OPTIONAL_INCLUSION
→ CONSOLIDATE_RESIDUAL_FINDINGS_RISKS_EXCEPTIONS
→ VERIFY_OPERATIONAL_READINESS
→ PREPARE_DELIVERY_DECISION
→ READY_FOR_DELIVERY_DECISION
→ DECIDE_DELIVERY
→ MATERIALIZE_DELIVERY
→ CONFIRM_DELIVERY_HANDOFF
```

---

## 10. Impedimentos e Roadmap persistente

Agent não pode encontrar problema e simplesmente parar.

Fluxo:

```text
impedimento
   ↓
persistir Finding
   ↓
identificar affected scope
   ↓
classificar consequência
   ↓
registrar remediation
   ↓
recalcular continuity
```

### NON_BLOCKING

```text
persistir
→ registrar no roadmap
→ continuar trabalho ainda elegível
```

### BLOCKING

```text
persistir
→ bloquear affected scope
→ materializar GOVERNED_BLOCK
→ procurar outro trabalho independente elegível
```

Princípio:

```text
agent memory != project continuity
```

O agent detecta e registra.

O sistema persiste, supervisiona e retoma.

---

## 11. Development Roadmap

Deve ser:

```text
durável
versionado
restart-safe
consultável
supervisionado pelo backend/worker
```

Pode referenciar:

```text
WORK_ITEM
FINDING_REMEDIATION
HUMAN_DECISION
RECOVERY
RECONCILIATION
```

Roadmap não duplica o state das entidades referenciadas.

Browser renderiza projection.

Backend/worker supervisiona continuity/eligibility.

---

## 12. Activity Center

Deve distinguir:

```text
Project macro phase
Internal Phase step
Module
ValueIncrement
Work Item
Execution
Finding
Decision
Continuity
```

Três relógios:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Princípio:

```text
ALIVE != PROGRESS
```

---

## 13. Baselines candidatas

Baselines de negócio identificáveis:

```text
Conception Baseline
Architecture Baseline
Planning Baseline
Validation Baseline
Delivery candidacy baseline
```

Os nomes não obrigam entidades físicas com o mesmo nome.

Requisito:

```text
identificável
reproduzível
versionável
rastreável
```

Technology Baseline permanece artefato arquitetural separado.

---

## 14. Technology Baseline

Arquivo:

```text
technology/01_TECHNOLOGY_BASELINE.md
```

Estado:

```text
BRAINSTORM
v0.6
NOT APPROVED FOR IMPLEMENTATION
```

Fechado antes da pausa:

```text
2.1 Foundation / App Shell
2.2 Core stack / regression
2.3 PostgreSQL durable dispatch web↔worker
2.4 Security implementation
2.5 Observability tooling
2.6 Deployment model
```

Próximo item técnico:

```text
2.7 UI
```

Status:

```text
PAUSED
```

Correção terminológica futura:

```text
não usar "Technology Baseline IN FORCE"
usar "Technology Baseline APPROVED" ou equivalente
```

---

## 15. Fase atual

```text
NB-0002 NORMATIVE RECONCILIATION
```

Motivo:

```text
Internal Phase Lifecycle gap
+
ValueIncrement / Delivery Target refinements
+
continuity / roadmap / Activity Center requirements
```

Implementação continua bloqueada.

---

## 16. Rodada NB-0002 — concluído

```text
R2-01   Internal Phase Lifecycle general model
R2-02   IMPLEMENTATION Internal Lifecycle
R2-02b  Work Item Development + Development Roadmap
R2-03   CONCEPTION Internal Lifecycle
R2-04   ARCHITECTURE Internal Lifecycle
R2-05   PLANNING Internal Lifecycle
R2-06   VALIDATION Internal Lifecycle
R2-07   DELIVERY Internal Lifecycle
R2-08   Cross-Lifecycle Reconciliation
R2-09   State / Persistence / Projection Reform
R2-10   Contracts / Orchestration / Recovery
R2-11   UI / Observability / API
```

Value Delivery:

```text
VD-01 CLOSED
VD-02 CLOSED
VD-03 CLOSED
VD-04 CLOSED
VD-05 CLOSED
```

---

## 17. Próximas etapas

```text
R2-12  Corpus Conformance
R2-13  Destructive Audit
R2-14  Remediation
R2-15  Verification
R2-16  Final Pre-Ratification Check
R2-17  Human Ratification — NB-0002
```

---

## 18. Próxima ação — R2-12 Corpus Conformance

Objetivo:

```text
consolidar o corpus candidato
eliminar deltas concorrentes
encontrar terminologia velha
verificar cross-links
detectar contradições
preparar documentação normativa completa
```

Checagens mínimas:

```text
Module nunca é camada técnica
Module → ValueIncrement → Work Item no fluxo normal
TRIVIAL / MATERIAL / CRÍTICA
Technology Baseline nunca é Project state
sem INTEGRATE_RESULTS órfão
sem Project.current_work_item_id estrutural
sem reabertura de terminal
FAILED Execution nunca ressuscita
included_in_candidate não é atributo eterno do membership
Development Cycle não compete com Work Item lifecycle
Phase Cycle não compete com Project lifecycle
working reconciliations não permanecem como normas concorrentes
```

---

## 19. R2-13 — Destructive Audit

O auditor deve tentar quebrar o modelo.

Cenários mínimos:

```text
dois DeliveryTargets autoritativos atuais
duas EVs ativas no MVP
reentrada de fase sem nova PhaseCycleInstance
baseline muda durante validation
required omitida
optional incluída sem aceite
EV ACCEPTED reaberta
Module INTEGRATED reaberto
blocker sem affected scope
NON_BLOCKING paralisa tudo
agent encerra e roadmap perde continuity
stale executor publica resultado
handoff parcial
target/member versions divergentes
Delivery duplicada
Delivery aceita sem target version exata
```

Critério para seguir:

```text
P0 = 0
P1 = 0
```

---

## 20. R2-14..R2-17

### R2-14 — Remediation

```text
corrigir findings
não escrever narrativa de auditoria dentro da norma
mudança semântica material volta para autoridade humana
```

### R2-15 — Verification

```text
verificar correções
buscar regressão
produzir diff semântico NB-0001 → NB-0002
```

### R2-16 — Final Pre-Ratification

```text
corpus completo
working deltas incorporados
membership fechada
nenhum TODO normativo
nenhum BRAINSTORM na membership
cross-links válidos
READY FOR HUMAN RATIFICATION YES/NO
```

### R2-17 — Human Ratification

Somente depois do R2-16:

```text
autoridade humana ratifica NB-0002
certificado imutável
membership exata
timestamp
predecessor NB-0001
```

---

## 21. Regras operacionais

### Um agente por task

```text
nova task material
→ novo agente/contexto
```

### Git

Operador humano controla:

```text
commit
push
merge
rebase
reset
clean
history
```

### Não fazer agora

```text
não retomar Technology Baseline 2.7
não iniciar implementação
não restaurar runtime legado
não editar NB-0001
não ratificar NB-0002 antes de R2-12..R2-16
não deixar working reconciliation como norma concorrente final
```

---

## 22. Legado

```text
legacy can teach
legacy cannot govern
```

Backup pré-reboot continua preservado até decisão explícita futura.

---

## 23. Status board

### DONE

```text
Legacy archive
Lifecycle reboot
NB-0001 audit/remediation/verification
NB-0001 ratification/freeze
Technology Baseline brainstorm 2.1..2.6
VD-01..VD-05
R2-01
R2-02
R2-02b
R2-03
R2-04
R2-05
R2-06
R2-07
R2-08
R2-09
R2-10
R2-11
```

### DOING

```text
NB-0002 normative reconciliation round
```

### NEXT

```text
R2-12 — Corpus Conformance
```

### LATER

```text
R2-13 Destructive Audit
R2-14 Remediation
R2-15 Verification
R2-16 Final Pre-Ratification
R2-17 Human Ratification NB-0002
resume Technology Baseline 2.7
Technology Baseline consolidation/audit/approval
Technical Implementation Readiness
First vertical slice
```

### BLOCKED / PAUSED

```text
Implementation.......... BLOCKED
Technology Baseline 2.7. PAUSED
```

---

## 24. Próxima ação concreta

```text
Executar R2-12 — Corpus Conformance
```

Não ratificar ainda.

---

## 25. Handoff para novo chat/agente

```text
Estamos continuando o projeto NAAMIVE na branch lifecycle-reboot.

Leia primeiro:
1. PROJECT_CONTINUITY.md
2. governance/normative-baselines/NB-0001.md
3. audits/AUD-006_NB0002_INTERNAL_PHASE_LIFECYCLE_GAP_ANALYSIS.md
4. audits/AUD-007_NB0002_VALUE_DELIVERY_GAP_ANALYSIS.md

NB-0001 continua IN FORCE e imutável.
NB-0002 é candidata e NOT IN FORCE.
Technology Baseline 2.7 está PAUSED.

Último checkpoint validado:
7ee08781a069a5d00f6af7a96ca544ec5adb7c65

Próxima ação:
R2-12 — Corpus Conformance.

Não recrie decisões já aprovadas.
Não modifique NB-0001.
Não inicie código.
```

---

## 26. Manutenção deste arquivo

Atualizar quando houver:

```text
novo milestone fechado
novo commit/checkpoint validado
mudança da próxima ação
finding bloqueante
nova baseline normativa
ratificação
retomada da Technology Baseline
início da implementação
```

Não usar como changelog infinito.

Manter:

```text
passado necessário
+
estado atual
+
próximo caminho
```

---

## 27. Estado atual em uma tela

```text
PROJECT.................. NAAMIVE
BRANCH................... lifecycle-reboot
HEAD VALIDADO............. 7ee08781a069a5d00f6af7a96ca544ec5adb7c65

NORMATIVE BASELINE........ NB-0001
NB-0001 STATUS............ IN FORCE / IMMUTABLE
CANDIDATE BASELINE........ NB-0002
NB-0002 STATUS............ NOT IN FORCE

CURRENT ROUND............. NB-0002 NORMATIVE RECONCILIATION
R2-01..R2-11.............. CLOSED — working decisions
NEXT...................... R2-12 CORPUS CONFORMANCE

TECH BASELINE............. v0.6 BRAINSTORM
TECH BASELINE 2.7......... PAUSED

CODE AUTHORIZED?.......... NO
IMPLEMENTATION............ BLOCKED

NEXT ACTION............... execute R2-12 Corpus Conformance
FINAL HUMAN GATE.......... R2-17 Human Ratification NB-0002
```
