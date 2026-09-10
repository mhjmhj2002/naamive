# NAAMIVE — Project Continuity

**Status:** LIVING PROJECT DOCUMENT  
**Natureza:** documento operacional e de continuidade; não normativo  
**Local:** raiz do repositório  
**Arquivo:** `PROJECT_CONTINUITY.md`  
**Última atualização:** 2026-09-10  
**Branch ativa:** `lifecycle-reboot`  
**Último commit validado:** `4197b566877fcff4e6bb103dc16af9c1ab2e7c9b`  
**Normative Baseline vigente:** `NB-0002`  
**Normative Baseline anterior:** `NB-0001` — histórica e imutável

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
4. governance/normative-baselines/NB-0002.md
5. NB0002_RATIFIED_MEMBERSHIP.md
6. technology/01_TECHNOLOGY_BASELINE.md
7. documentação específica da task atual
```

Regras:

```text
NB-0002 = lei vigente
NB-0001 = histórica e imutável
Technology Baseline = desenho técnico derivado, não norma
audits = evidência, não norma
legacy = referência histórica, não autoridade
```

As árvores de staging `candidate/` e `ratified/`, se ainda estiverem presentes,
não são fontes normativas concorrentes. A raiz ratificada e o certificado
`NB-0002` prevalecem.

---

## 4. Estado normativo


Baseline vigente:

```text
NB-0002
Status: RATIFIED / IN FORCE
Membership: 71 documentos normativos
```

Certificado:

```text
governance/normative-baselines/NB-0002.md
```

Commit de aplicação na raiz:

```text
fca35ae8d554ea45e1d20444ea755d0d7bbfeb60
docs(governance): apply ratified NB-0002 to repository root
```

Baseline anterior:

```text
NB-0001
Status: histórica / imutável
```

A ratificação de `NB-0002` não migra automaticamente instâncias historicamente
governadas por `NB-0001`.

Migração continua explícita, rastreável e governada.

---

## 5. Último checkpoint validado


Branch:

```text
lifecycle-reboot
```

HEAD validado:

```text
fca35ae8d554ea45e1d20444ea755d0d7bbfeb60
docs(governance): apply ratified NB-0002 to repository root
```

Validação:

```text
branch/history......................... PASS
NB-0002 certificate na raiz............ PASS
Constitution NB-0002 / RATIFIED........ PASS
71-member ratified membership.......... PASS
ValueIncrement lifecycle vigente....... PASS
root overlay............................ PASS
NB-0001 preservada...................... PASS
Technology Baseline permanece draft.... PASS
```

A rodada normativa NB-0002 está encerrada.

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

Arquivo principal:

```text
technology/01_TECHNOLOGY_BASELINE.md
```

Estado:

```text
v0.10
APPROVED / FROZEN
Deriva de: NB-0002
Implementation: NOT AUTHORIZED
```

Fechamentos:

```text
2.7   APPROVED
2.8   APPROVED
2.9   CONSOLIDATION COMPLETE
2.10  DESTRUCTIVE AUDIT COMPLETE
2.10R REMEDIATION COMPLETE
2.10V VERIFICATION PASS
2.11  HUMAN APPROVAL / FREEZE COMPLETE
```

Gate final da rodada:

```text
P0 = 0
P1 = 0
FREEZE GATE = PASS
TRACEABILITY = 290/290
```

Aprovação humana:

```text
Manuel Hinojosa
NAAMIVE Project Owner
2026-09-10
```

Terminologia:

```text
Normative Baseline = IN FORCE
Technology Baseline = APPROVED / FROZEN
```

TIR não foi iniciado.

---

## 15. Fase atual


```text
SECOND DOCUMENTATION ROUND
TECHNOLOGY BASELINE DESIGN
```

A rodada normativa NB-0002 foi concluída e ratificada.

Pergunta atual:

```text
como implementar tecnicamente a NB-0002
sem redefinir sua lei?
```

Implementação continua bloqueada até:

```text
Technology Baseline aprovada
+
Technical Implementation Readiness
```

---

## 16. Rodada NB-0002 — concluída


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
R2-12   Corpus Conformance
R2-13   Destructive Audit
R2-14   Remediation
R2-15   Verification
R2-16   Final Pre-Ratification
R2-17   Human Ratification
```

Value Delivery:

```text
VD-01 CLOSED
VD-02 CLOSED
VD-03 CLOSED
VD-04 CLOSED
VD-05 CLOSED
```

Resultado:

```text
NB-0002
RATIFIED / IN FORCE
71 normative members
```

---

## 17. Fechamento da rodada técnica 2

```text
2.7    APPROVED
2.8    APPROVED
2.9    COMPLETE
2.10   AUDIT COMPLETE
2.10R  REMEDIATION COMPLETE
2.10V  VERIFICATION PASS
2.11   HUMAN APPROVAL / FREEZE COMPLETE
```

Resultado:

```text
Technology Baseline v0.10 = APPROVED / FROZEN
P0 = 0
P1 = 0
FREEZE GATE = PASS
```

Nenhuma etapa posterior foi iniciada.

```text
TIR STARTED? NO
IMPLEMENTATION AUTHORIZED? NO
```

---

## 18. Estado após 2.11

Approval record:

```text
technology/09_TECHNOLOGY_BASELINE_2_11_APPROVAL_RECORD.md
```

Freeze manifest:

```text
technology/10_TECHNOLOGY_BASELINE_2_11_FREEZE_MANIFEST.md
```

Estado:

```text
Technology Baseline v0.10
APPROVED / FROZEN

P0 = 0
P1 = 0
FREEZE GATE = PASS
TRACEABILITY = 290/290
```

Nenhuma próxima etapa foi iniciada por este fechamento.

```text
STOP
TIR NOT STARTED
CODE NOT AUTHORIZED
```

A continuidade só deve avançar para TIR após instrução explícita futura.

---

## 19. R2-13 — registro histórico da auditoria destrutiva


Esta etapa já foi concluída durante o fechamento da `NB-0002`.

Ela tentou quebrar o modelo com cenários como:

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

Resultado de fechamento:

```text
P0 = 0
P1 = 0
```

O registro permanece aqui apenas para continuidade histórica.

---

## 20. R2-14..R2-17 — fechamento histórico

As etapas abaixo estão concluídas:

```text
R2-14 Remediation................ COMPLETE
R2-15 Verification............... PASS
R2-16 Final Pre-Ratification..... PASS
R2-17 Human Ratification......... COMPLETE
```

Resultado:

```text
NB-0002 = RATIFIED / IN FORCE
```

A evidência de ratificação deve permanecer preservada.


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
não iniciar implementação
não restaurar runtime legado
não editar NB-0001
não editar NB-0002 sem novo processo normativo
não pular 2.10 Technical / Destructive Audit
não aprovar/freeze a Technology Baseline antes da auditoria
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
NB-0001 closure
NB-0002 R2-01..R2-17
NB-0002 human ratification
NB-0002 root application
Technology Baseline 2.1..2.8 decisions
2.9 consolidation
2.10 destructive audit
2.10R remediation
2.10V focused verification
2.11 human approval / freeze
```

### FINAL STATE — DOCUMENTATION ROUND 2

```text
Technology Baseline........ v0.10 APPROVED / FROZEN
P0........................ 0
P1........................ 0
freeze gate............... PASS
human approval............ COMPLETE
```

### NOT STARTED

```text
Technical Implementation Readiness
Implementation
```

---

## 24. Próxima ação concreta

```text
NONE STARTED
```

A rodada documental da Technology Baseline está fechada.

```text
DO NOT START TIR
DO NOT START CODE
```

Aguardar instrução explícita futura.

---

## 25. Handoff para novo chat/agente

```text
Estamos continuando o projeto NAAMIVE na branch lifecycle-reboot.

Leia primeiro:
1. PROJECT_CONTINUITY.md
2. governance/normative-baselines/NB-0002.md
3. technology/01_TECHNOLOGY_BASELINE.md
4. technology/06_TECHNOLOGY_BASELINE_DECISION_TRACEABILITY.md
5. audits/AUD-014_TECHNOLOGY_BASELINE_DESTRUCTIVE_AUDIT.md
6. technology/07_TECHNOLOGY_BASELINE_2_10R_REMEDIATION_RECORD.md
7. audits/AUD-015_TECHNOLOGY_BASELINE_2_10V_VERIFICATION.md
8. technology/09_TECHNOLOGY_BASELINE_2_11_APPROVAL_RECORD.md
9. technology/10_TECHNOLOGY_BASELINE_2_11_FREEZE_MANIFEST.md

NB-0002 = RATIFIED / IN FORCE.

Last validated remote checkpoint before this approval package:
4197b566877fcff4e6bb103dc16af9c1ab2e7c9b

Technology Baseline:
v0.10
APPROVED / FROZEN

2.10R = COMPLETE
2.10V = PASS
2.11 = HUMAN APPROVAL COMPLETE

Verification:
P0=0
P1=0
FREEZE GATE=PASS
TRACEABILITY=290/290

Approved by:
Manuel Hinojosa — NAAMIVE Project Owner — 2026-09-10

Technical Implementation Readiness has NOT started.
Implementation is NOT authorized.

Do not change NB-0002 without a normative process.
Do not silently change the frozen Technology Baseline.
DO NOT START TIR.
DO NOT START CODE.
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
LAST VALIDATED HEAD....... 4197b566877fcff4e6bb103dc16af9c1ab2e7c9b

NORMATIVE BASELINE........ NB-0002
NB-0002 STATUS............ RATIFIED / IN FORCE

TECH 2.7.................. APPROVED
TECH 2.8.................. APPROVED
TECH 2.9.................. COMPLETE
TECH 2.10 AUDIT........... COMPLETE
TECH 2.10R................ COMPLETE
TECH 2.10V................ PASS
TECH 2.11................. APPROVED / FROZEN

TECH BASELINE............. v0.10 APPROVED / FROZEN
TRACEABILITY.............. 290/290
P0........................ 0
P1........................ 0
FREEZE GATE............... PASS

DOCUMENTATION ROUND 2..... COMPLETE

TIR STARTED?.............. NO
CODE AUTHORIZED?.......... NO

NEXT ACTION............... NONE — WAIT FOR EXPLICIT INSTRUCTION
```
