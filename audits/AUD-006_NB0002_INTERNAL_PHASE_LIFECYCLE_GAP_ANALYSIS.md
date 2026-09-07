# AUD-006 — NB-0002 Internal Phase Lifecycle Gap Analysis

**Status:** OPEN — R2-11 UI/OBSERVABILITY/API CLOSED; CORPUS CONFORMANCE NEXT  
**Natureza:** NON-NORMATIVE AUDIT EVIDENCE  
**Baseline analisada:** `NB-0001`  
**Baseline candidata de remediação:** `NB-0002`  
**Source commit analisado:** `36dafaf4f62f3b7a6e017696444fb547ce9aed90`  
**Escopo:** lacuna entre Project phase, Work Item, Execution, projection e UI  
**Implementação:** BLOCKED até remediação e nova auditoria

---

# 1. Objetivo

Registrar formalmente a lacuna identificada durante o Brainstorm técnico 2.7 e
abrir a rodada normativa destinada a eliminá-la antes da implementação.

---

# 2. Contexto

A `NB-0001` foi ratificada e permanece imutável.

Durante o desenho da UI em tempo real para atividades longas de agents, surgiu a
necessidade de mostrar ao usuário:

```text
etapas previstas
etapa atual
etapas concluídas
etapas futuras
blocking/waiting
heartbeat
progresso funcional
```

A análise revelou que heartbeat e Execution state não são suficientes para
representar o processo funcional interno de uma fase de Project.

---

# 3. Evidência normativa observada

A documentação atual possui:

```text
Project Lifecycle
Work Item Lifecycle
Execution Lifecycle
```

O Project define fases macro.

Work Item define compromisso planejado de mudança.

Execution define tentativa operacional.

Nenhum desses modelos define, de forma explícita e reutilizável, o ciclo
funcional interno de uma fase como `IMPLEMENTATION`.

---

# 4. GAP-001 — Missing Internal Phase Lifecycle

**Status:** OPEN  
**Materialidade:** IMPLEMENTATION BLOCKER  
**Camada de origem:** lifecycle

Descrição:

```text
Project = IMPLEMENTATION
Work Item = IN_PROGRESS
Execution = RUNNING
```

não permite determinar normativamente:

```text
PREPARE_CONTEXT?
CODING?
UNIT_TESTING?
INTEGRATION_TESTING?
REVIEW?
FIXING?
RETESTING?
FINAL_VERIFICATION?
```

Qualquer resposta atual precisaria ser criada pela implementação, agent,
orchestration ou UI.

Isso viola o princípio:

```text
lower layer does not invent law
```

e impede derivação segura da primeira implementação.

---

# 5. Consequência prática

Sem remediação, a implementação tenderia a criar um destes anti-patterns:

```text
UI hardcodes steps
agent invents its own workflow
worker maps arbitrary logs to progress
different phases use incompatible conventions
heartbeat is mistaken for progress
phase completion is inferred from job completion
rework rewrites visible history
```

Esses comportamentos recriariam classes de problema já encontradas no primeiro
desenvolvimento.

---

# 6. Impacto no Brainstorm 2.7

O Brainstorm 2.7 revelou a lacuna, mas não deve solucioná-la localmente.

Status:

```text
2.7 Application Shell / UI
PAUSED AT NORMATIVE DEPENDENCY
```

Decisões de shell que não dependem da nova lei permanecem como material de
brainstorm.

O `Activity Center` depende da remediação normativa antes de ser congelado.

---

# 7. Scope da rodada NB-0002

A rodada deve:

```text
1. definir conceito geral de Internal Phase Lifecycle
2. definir a relação Project phase ↔ internal cycle
3. definir a relação internal cycle ↔ Work Item
4. definir a relação internal cycle ↔ Execution
5. definir canonical state/history
6. definir continuity e recovery
7. definir projection
8. definir orchestration
9. definir UI derivada
10. definir observability
11. revisar API/contracts/persistence
12. executar auditoria transversal completa
```

---

# 8. Fases obrigatórias

Devem possuir ciclo interno explícito ou justificativa normativa equivalente:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

A primeira prova completa será `IMPLEMENTATION`.

---

# 9. Ordem de trabalho proposta

```text
R2-01  General Internal Phase Lifecycle model
R2-02  IMPLEMENTATION internal lifecycle
R2-02b Work Item Development Internal Lifecycle + Development Roadmap
R2-03  CONCEPTION internal lifecycle
R2-04  ARCHITECTURE internal lifecycle
R2-05  PLANNING internal lifecycle
R2-06  VALIDATION internal lifecycle
R2-07  DELIVERY internal lifecycle

R2-08  Cross-lifecycle reconciliation
R2-09  Canonical state / persistence / projection reform
R2-10  Contracts / orchestration / recovery reform
R2-11  UI / observability / API reform
R2-12  Documentation-wide conformance pass
R2-13  Destructive global audit
R2-14  Remediation
R2-15  Remediation verification
R2-16  Final pre-ratification check
R2-17  Human ratification → NB-0002
```

A ordem pode mudar se dependências forem descobertas.

---

# 10. Documentos com alteração provável

Alteração provável:

```text
lifecycle/01_LIFECYCLE_MODEL.md
lifecycle/03_PROJECT_LIFECYCLE.md
lifecycle/05_WORK_ITEM_LIFECYCLE.md
lifecycle/06_EXECUTION_LIFECYCLE.md

state/01_CANONICAL_STATE_MODEL.md
state/02_PERSISTENCE_MODEL.md
state/03_PROJECTION_MODEL.md

contracts/01_TRANSITION_CONTRACT.md
contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md

orchestration/01_ORCHESTRATION_MODEL.md
orchestration/02_AGENT_EXECUTION_MODEL.md
orchestration/03_SCHEDULING_AND_ELIGIBILITY_MODEL.md
orchestration/04_RECOVERY_AND_RECONCILIATION_MODEL.md

ui/01_UI_MODEL.md
ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md
ui/03_TIMELINE_AND_EXPLAINABILITY_MODEL.md

observability/01_OBSERVABILITY_MODEL.md
observability/02_AUDIT_TRAIL_AND_FORENSICS_MODEL.md

implementation/01_IMPLEMENTATION_READINESS.md
implementation/02_INCREMENTAL_BUILD_PLAN.md
implementation/03_TEST_AND_CERTIFICATION_STRATEGY.md
```

---

# 11. Documentos que exigem revisão mesmo sem alteração certa

Revisão obrigatória:

```text
00_NAAMIVE_CONSTITUTION.md
02_NEED_LIFECYCLE.md
04_MODULE_LIFECYCLE.md
governance/**
contracts/**
state/04_BASELINE_AND_SUPERSESSION_MODEL.md
architecture/**
security/**
api/**
```

Nenhum arquivo deve ser alterado apenas para "mostrar atividade".

Se não houver mudança semântica, permanece byte-identical sempre que possível.

---

# 12. NB-0001

`NB-0001`:

```text
remains IN FORCE
remains immutable
is not patched in place
```

A existência desta rodada não altera fatos históricos governados por `NB-0001`.

---

# 13. NB-0002

`NB-0002` ainda não existe como baseline ratificada.

Durante a rodada:

```text
working documents
BRAINSTORM / CANDIDATE
NOT IN FORCE
```

O certificado `NB-0002` somente deve ser produzido após:

```text
corpus final
audit sem blocker
human ratification
exact membership/digests
```

Não criar certificado imutável prematuramente.

---

# 14. Migration

Como não existe nova implementação ativa do reboot usando `NB-0001`, a rodada
não deve presumir necessidade de migração de runtime.

Ainda assim, a regra geral permanece:

```text
nova baseline != migração automática
```

Se existirem instâncias governadas por `NB-0001` no momento da futura
ratificação, migration/disposition deverá ser explícita.

---

# 15. Technology Baseline

A Technology Baseline em brainstorm permanece preservada como material de
trabalho.

Status da sequência:

```text
2.1 CLOSED
2.2 CLOSED
2.3 CLOSED
2.4 CLOSED
2.5 CLOSED
2.6 CLOSED
2.7 PAUSED
```

`2.7` será retomado após o novo lifecycle fornecer a verdade que o Activity
Center precisa renderizar.

---

# 16. Definition of Done da rodada

A rodada somente pode ser considerada pronta para ratificação quando:

```text
cada fase possui processo interno inequívoco
sem sobreposição com Work Item
sem sobreposição com Execution
falha/retry/recovery são claros
reentrada é clara
paralelismo é claro
optional steps são claros
state/history são deriváveis
projection é derivável
UI não inventa passos
observability detecta stall
implementation não precisa inventar lei
```

---

# 17. Gate de implementação

Enquanto `GAP-001` permanecer aberto:

```text
FIRST CODE SLICE = NOT READY
```

A implementação não deve começar.

---

# 18. Próximo passo

Status:

```text
R2-01  General model............................ CLOSED — working
R2-02  IMPLEMENTATION macro..................... CLOSED — working
R2-02b Work Item Development + Roadmap.......... CLOSED — working
R2-03  CONCEPTION internal lifecycle............ CLOSED — working
R2-04  ARCHITECTURE internal lifecycle............ CLOSED — working
R2-05  PLANNING internal lifecycle................ CLOSED — working
R2-06  VALIDATION internal lifecycle.............. CLOSED — working
R2-07  DELIVERY internal lifecycle................ CLOSED — working
R2-08  Cross-lifecycle reconciliation............. CLOSED — working
R2-09  State/Persistence/Projection reform......... CLOSED — working
R2-10  Contracts/Orchestration/Recovery............. CLOSED — working
R2-11  UI/Observability/API.......................... CLOSED — working
R2-12  Corpus conformance............................ NEXT
```

Próximo trabalho:

```text
R2-05 — PLANNING Internal Lifecycle
```

Objetivo:

definir o ciclo interno semântico da fase `Project.PLANNING`, transformando
Conception/Architecture Baselines e Modules definidos em plano executável,
Delivery Target e ValueIncrements suficientemente preparados para IMPLEMENTATION.

---

# 19. Clarificação aprovada de escopo

A remediação não é limitada à fase `IMPLEMENTATION`.

A `NB-0002` somente poderá ser ratificada após definição ou disposição
normativa explícita de ciclos internos para:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

O requisito de observabilidade também é transversal.

Toda atividade material potencialmente demorada deve evitar estados de UX como:

```text
loading eterno
tela aparentemente travada
background silencioso
ausência de indicação de aceite
```

A solução derivada deverá permitir ao usuário enxergar, conforme aplicável:

```text
passos previstos
passo atual
passos concluídos
passos futuros
heartbeat/liveness
último progresso funcional
blocking/waiting
próxima expectativa
```

`IMPLEMENTATION` permanece apenas como primeiro caso de prova do modelo.

---

# 20. Efeito no Definition of Done

Adicionar aos critérios da rodada:

```text
todos os seis ciclos internos definidos
Activity Center derivável sem inventar lifecycle
atividade demorada sempre observável
heartbeat separado de progresso funcional
grid de passos derivável de projeção canônica
histórico local da atividade disponível
nenhum percentual fictício
nenhuma fase reduzida a spinner genérico
```

---

# 21. Clarificação aprovada — persistência e restart

A rodada deve distinguir explicitamente dados duráveis de dados efêmeros.

Critérios adicionais:

```text
functional phase progress survives restart
current step survives restart
completed steps survive restart
continuity survives restart
plan/version survives restart
heartbeat current timestamp is durable
last functional progress timestamp is durable
high-volume heartbeat history may be retention-eligible
ephemeral process state may stay memory-only
```

Também deve existir política futura de retenção para telemetria de alto volume,
sem permitir que expurgo destrua fatos governados ou auditabilidade necessária.

Esse requisito deve ser reconciliado principalmente com:

```text
state/01_CANONICAL_STATE_MODEL.md
state/02_PERSISTENCE_MODEL.md
state/03_PROJECTION_MODEL.md
architecture/01_RUNTIME_ARCHITECTURE_MODEL.md
observability/01_OBSERVABILITY_MODEL.md
implementation/03_TEST_AND_CERTIFICATION_STRATEGY.md
```

---

# 22. Veredito desta análise

```text
GAP CONFIRMED
MATERIAL
REQUIRES NORMATIVE REMEDIATION
NB-0001 MUST REMAIN IMMUTABLE
NB-0002 ROUND OPEN
IMPLEMENTATION BLOCKED
```


---

# 23. R2-02b — Work Item Development / Development Roadmap

**Status:** CLOSED — working decision

Fechamentos:

```text
Work Item macro lifecycle permanece intacto
IN_PROGRESS possui Development Cycle explícito
IN_REVIEW possui Development Cycle explícito
trivial usa NOT_APPLICABLE em vez de fast path paralelo
reentry cria nova instância causal
Finding NON_BLOCKING é persistido e trabalho elegível continua
Finding BLOCKING interrompe affected scope
todo impedimento tratável entra no Development Roadmap
Roadmap é durável e versionado
Roadmap não duplica state de Work Item/Finding/Execution
Roadmap Supervisor é backend/system responsibility
browser não é supervisor
agent não é memória do backlog
next eligible item é server/orchestration-derived
```

Nova evidência reforça `GAP-001`: a ausência de ciclo interno e roadmap durável
permitiria agent encerrar sessão ao primeiro impedimento e perder continuidade.

A remediação candidate NB-0002 agora possui mecanismo explícito para impedir esse
anti-pattern.


---

# 24. R2-03 — CONCEPTION Internal Lifecycle

**Status:** CLOSED — working decision

Decisões:

```text
CONCEPTION não reabre Need acceptance
capacidade em CONCEPTION é conceitual
Module formal nasce em ARCHITECTURE
Phase Cycle Plan é durável/versionado
NON_BLOCKING pode atravessar com continuity
BLOCKING impede saída da fase
Conception Baseline é Business Baseline identificável
não é obrigatório criar nova entidade física "ConceptionBaseline"
READY_FOR_ARCHITECTURE é step interno
```

Próximo:

```text
R2-04 ARCHITECTURE Internal Lifecycle
```


---

# 25. R2-04 — ARCHITECTURE Internal Lifecycle

**Status:** CLOSED — working decision

Decisões:

```text
capabilities from CONCEPTION become formal Modules in ARCHITECTURE
material target Modules normally leave ARCHITECTURE as DEFINED
IDENTIFIED-only exception requires governed justification + continuity
Architecture Baseline is identifiable Business Baseline
physical ArchitectureBaseline entity is not mandatory
Technology Baseline remains architectural artifact
Technology Baseline need only be sufficient for PLANNING at ARCHITECTURE exit
all material technology needed for implementation must be approved before PLANNING → IMPLEMENTATION
Phase Cycle Plan remains durable/versioned
BLOCKING prevents phase exit when readiness affected
NON_BLOCKING may cross only with valid continuity
READY_FOR_PLANNING is internal step
```

Próximo:

```text
R2-05 PLANNING Internal Lifecycle
```


---

# 26. R2-05 — PLANNING Internal Lifecycle

**Status:** CLOSED — working decision

```text
Delivery Target formal/versioned in PLANNING
Module → ValueIncrement → Work Item normal path
agent challenge mandatory for value decomposition
global EV order may interleave Modules
near-term work detailed, distant work progressively refined
transversal Project-scoped work remains valid
validation/integration strategies planned
material Technology Baseline decisions resolved before IMPLEMENTATION
Planning Baseline identifiable
READY_FOR_IMPLEMENTATION internal step
```


---

# 27. R2-06 — VALIDATION Internal Lifecycle

**Status:** CLOSED — working decision

```text
validation freezes exact target/baseline context
Project validation is global/E2E
local EV/Module acceptance cannot substitute it
baseline drift classifies evidence
findings route rework to correct lifecycle level
ACCEPTED ValueIncrement never reopens
INTEGRATED Module never reopens
Validation Baseline identifiable
READY_FOR_DELIVERY internal step
```


---

# 28. R2-07 — DELIVERY Internal Lifecycle

**Status:** CLOSED — working decision

```text
Delivery phase is governed candidacy, not deploy
DeliveryTarget defines obligation
Delivery Manifest freezes actual candidacy
OPTIONAL inclusion belongs to candidacy snapshot
missing REQUIRED blocks
OUT_OF_TARGET cannot be delivered
decision surface is exact and governed
positive decision → idempotent Delivery + Project.DELIVERED recoverable handoff
Delivery is terminal fact
```

Milestone:

```text
CONCEPTION.... CLOSED
ARCHITECTURE.. CLOSED
PLANNING...... CLOSED
IMPLEMENTATION CLOSED
VALIDATION.... CLOSED
DELIVERY...... CLOSED
```

`GAP-001` now has a candidate internal lifecycle for every nonterminal Project
phase. It remains open until cross-document reconciliation, corpus conformance,
audit and ratification complete.


---

# 29. R2-08 — Cross-Lifecycle Reconciliation

**Status:** CLOSED — working decision

```text
canonical hierarchy reconciled
six Project phase cycles covered
no implicit promotion shortcuts
terminal succession explicit
DeliveryTarget membership contextual
DeliveryManifest candidacy-specific
PhaseCycleInstance orthogonal to ownership
Work Item Development Cycle orthogonal to Execution
parent/baseline invalidation classification explicit
```


---

# 30. R2-09 — State / Persistence / Projection Reform

**Status:** CLOSED — working decision

All new lifecycle concepts now have explicit canonical/persistent/projection
semantics sufficient for restart-safe implementation design.


---

# 31. R2-10 — Contracts / Orchestration / Recovery

**Status:** CLOSED — working decision

Continuity, handoff, impediment routing, scheduler authority boundary, retry,
recovery, reconciliation and stale-result fencing are reconciled with the new
internal lifecycles.


---

# 32. R2-11 — UI / Observability / API

**Status:** CLOSED — working decision

Activity Center, roadmap visibility, three-clock observability, semantic commands,
stale rejection, projection conformance and durable error surfaces are reconciled.
