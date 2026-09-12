# NAAMIVE

**Transforming Business Needs into Delivered Software**

NAAMIVE é uma plataforma orientada a lifecycle para transformar uma necessidade
real de negócio em software entregue, validado, auditável e capaz de evoluir.

O software é consequência.

**Valor de negócio entregue é o objetivo.**

---

## 0. Origem e significado do nome

O nome **NAAMIVE** representa a jornada central da plataforma:

```text
N — Need
A — Analysis
A — Architecture
M — Module
I — Implementation
V — Validation
E — Evolution
```

Em português:

```text
Necessidade
→ Análise
→ Arquitetura
→ Módulo
→ Implementação
→ Validação
→ Evolução
```

Essa expansão faz parte da identidade conceitual do projeto e deve ser
preservada.

Ela resume a proposta do NAAMIVE: partir de uma necessidade real de negócio,
compreendê-la e estruturá-la, definir arquitetura e capacidades de negócio,
implementar, validar e permitir evolução governada.

O significado permanece alinhado ao lema do projeto:

```text
Transforming Business Needs into Delivered Software
```

---

## 1. Onde começar

Se você está chegando agora:

1. leia a [Constituição](00_NAAMIVE_CONSTITUTION.md);
2. veja o [guia visual do lifecycle](lifecycle/diagrams/00_LIFECYCLE_VISUAL_GUIDE.md);
3. leia o [Lifecycle Model](lifecycle/01_LIFECYCLE_MODEL.md);
4. aprofunde-se nos lifecycles específicos;
5. consulte Governance e Contracts antes de interpretar autoridade, gates,
   findings, exceções, handoffs, recovery ou continuidade;
6. consulte os modelos derivados antes de implementar;
7. se você for um agente, leia também [AGENTS.md](AGENTS.md).

O guia visual é **não normativo**. Ele facilita leitura humana, mas nunca
substitui a documentação normativa.

---

## 1.1 Estado atual do self-hosting

O NAAMIVE também está sendo usado para governar o próprio desenvolvimento.

Workspace canônico:

```text
project/naamive/
```

Projeto corrente:

```text
PRJ-001 — NAAMIVE MVP
```

Estado resumido:

```text
Normative Baseline........ NB-0002 — RATIFIED / IN FORCE
Technology Baseline....... v0.10 — APPROVED / FROZEN
TIR........................ v1.0 — APPROVED
Project.................... PRJ-001 PLANNING
Planning Round 1........... COMPLETE
Module MOD-001............. PLANNED
VI-001..................... PLANNED
DT-001 v1.................. CURRENT
Roadmap v2................. CURRENT
Work Items................. 12 PROPOSED / 1 IN_REVIEW
Development Cycles......... 1
Executions................. 2
EX-001...................... SUCCEEDED / HISTORICAL
EX-002...................... SUCCEEDED
Implementation authority... GRANTED
Implementation............. REWORK TECHNICAL RESULT PRODUCED / AWAITING CODE REVIEW
```

A decisão humana T1–T6 já foi exercida e materializou o avanço de MOD-001,
VI-001, DT-001 v1 e Roadmap v2 sem autorizar implementação.

O primeiro Work Item em preparação é:

```text
WI-001 — Repository / Workspace Foundation
```

Seu readiness candidate foi preparado e passou por auditoria independente com:

```text
AUD-WI001-READINESS-01
Result..................... PASS_WITH_FINDINGS
Findings F-001 / F-002...... RESOLVED
WI-001..................... IN_REVIEW
Readiness authority........ GRANTED / EXERCISED
Development Cycles......... 1 (DC-001)
Executions................. 2 (EX-001 historical; EX-002 SUCCEEDED)
Implementation authority... GRANTED
Implementation............. REWORK TECHNICAL RESULT PRODUCED / AWAITING CODE REVIEW
```

Os dois findings não bloqueadores identificados pela auditoria foram tratados:

```text
F-001 — RESOLVED por DEC-007, com classificação RECONCILE
F-002 — RESOLVED com fortalecimento da provenance de DEC-006
```

O resultado histórico da auditoria permanece `PASS_WITH_FINDINGS`; a remediation
não reescreve retroativamente o relatório de auditoria.

A decisão humana de readiness está registrada em
`project/naamive/projects/PRJ-001-naamive-mvp/governance/HUMAN_APPROVAL_WI001_READINESS.md`.
`CR-WI001-01` permanece FAIL histórico. `EX-002` produziu a remediação técnica
e `WI-001` está `IN_REVIEW`. A próxima ação legítima é `CR-WI001-02`
independente e aceite separado; ela não promove `WI-001` automaticamente para
`DONE`.

A documentação operacional corrente do self-hosting está em:

- [Self-hosted Project Workspace](project/naamive/README.md)
- [Project Current State](project/naamive/projects/PRJ-001-naamive-mvp/CURRENT_STATE.md)
- [Execution Board](project/naamive/projects/PRJ-001-naamive-mvp/EXECUTION_BOARD.md)
- [WI-001 Readiness Candidate](project/naamive/projects/PRJ-001-naamive-mvp/governance/WI-001_READINESS_CANDIDATE.md)

---


## 2. Mapa da documentação

Índice completo:

- [Documentation Map](00_DOCUMENTATION_MAP.md)

Hierarquia principal:

```text
00_NAAMIVE_CONSTITUTION.md
        ↓
lifecycle/
        ↓
governance/
        ↓
contracts/
        ↓
state/
        ↓
architecture/
        ↓
orchestration/
        ↓
security/
        ↓
api/
        ↓
ui/
        ↓
observability/
        ↓
implementation/
```

Nenhum documento inferior pode contradizer documento superior.

---

## 3. Lifecycle

### Visão geral

- [Lifecycle Model](lifecycle/01_LIFECYCLE_MODEL.md)
- [Lifecycle Visual Guide](lifecycle/diagrams/00_LIFECYCLE_VISUAL_GUIDE.md)

### Lifecycles específicos

- [Need Lifecycle](lifecycle/02_NEED_LIFECYCLE.md)
- [Project Lifecycle](lifecycle/03_PROJECT_LIFECYCLE.md)
- [Module Lifecycle](lifecycle/04_MODULE_LIFECYCLE.md)
- [Work Item Lifecycle](lifecycle/05_WORK_ITEM_LIFECYCLE.md)
- [Execution Lifecycle](lifecycle/06_EXECUTION_LIFECYCLE.md)

A jornada conceitual é:

```text
Need
  ↓
Project
  ↓
Module
  ↓
Work Item
  ↓
Execution
  ↓
Validation
  ↓
Delivery
  ↓
Evolution por nova Need
```

As entidades possuem lifecycles próprios. Uma falha operacional de Execution não
se transforma automaticamente em falha de Project, Module ou Work Item.

---

## 4. Governance

- [Governance Model](governance/01_GOVERNANCE_MODEL.md)
- [Authority Policy](governance/02_AUTHORITY_POLICY.md)
- [Gate Policy](governance/03_GATE_POLICY.md)
- [Audit and Review Policy](governance/04_AUDIT_AND_REVIEW_POLICY.md)
- [Finding and Exception Policy](governance/05_FINDING_AND_EXCEPTION_POLICY.md)
- [Risk Policy](governance/06_RISK_POLICY.md)

---

## 5. Contracts

- [Transition Contract](contracts/01_TRANSITION_CONTRACT.md)
- [Handoff Contract](contracts/02_HANDOFF_CONTRACT.md)
- [Evidence and Audit Contract](contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md)
- [Continuity and Recovery Contract](contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md)
- [Authority Contract](contracts/05_AUTHORITY_CONTRACT.md)

---

## 6. State

- [Canonical State Model](state/01_CANONICAL_STATE_MODEL.md)
- [Persistence Model](state/02_PERSISTENCE_MODEL.md)
- [Projection Model](state/03_PROJECTION_MODEL.md)
- [Baseline and Supersession Model](state/04_BASELINE_AND_SUPERSESSION_MODEL.md)

---

## 7. Architecture

- [Runtime Architecture Model](architecture/01_RUNTIME_ARCHITECTURE_MODEL.md)
- [Transaction and Consistency Model](architecture/02_TRANSACTION_AND_CONSISTENCY_MODEL.md)
- [Technology Baseline Model](architecture/03_TECHNOLOGY_BASELINE_MODEL.md)

---

## 8. Orchestration

- [Orchestration Model](orchestration/01_ORCHESTRATION_MODEL.md)
- [Agent Execution Model](orchestration/02_AGENT_EXECUTION_MODEL.md)
- [Scheduling and Eligibility Model](orchestration/03_SCHEDULING_AND_ELIGIBILITY_MODEL.md)
- [Recovery and Reconciliation Model](orchestration/04_RECOVERY_AND_RECONCILIATION_MODEL.md)

---

## 9. Security

- [Identity and Access Model](security/01_IDENTITY_AND_ACCESS_MODEL.md)
- [Secrets and Trust Boundary Model](security/02_SECRETS_AND_TRUST_BOUNDARY_MODEL.md)

---

## 10. API

- [API Model](api/01_API_MODEL.md)
- [Command and Query Model](api/02_COMMAND_QUERY_MODEL.md)
- [Error, Idempotency and Concurrency Model](api/03_ERROR_IDEMPOTENCY_AND_CONCURRENCY_MODEL.md)

---

## 11. UI

- [UI Model](ui/01_UI_MODEL.md)
- [Action and Decision Surface Model](ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md)
- [Timeline and Explainability Model](ui/03_TIMELINE_AND_EXPLAINABILITY_MODEL.md)

---

## 12. Observability

- [Observability Model](observability/01_OBSERVABILITY_MODEL.md)
- [Audit Trail and Forensics Model](observability/02_AUDIT_TRAIL_AND_FORENSICS_MODEL.md)

---

## 13. Implementation

- [Implementation Readiness](implementation/01_IMPLEMENTATION_READINESS.md)
- [Incremental Build Plan](implementation/02_INCREMENTAL_BUILD_PLAN.md)
- [Test and Certification Strategy](implementation/03_TEST_AND_CERTIFICATION_STRATEGY.md)
- [Legacy Reference and Reuse Policy](implementation/04_LEGACY_REFERENCE_AND_REUSE_POLICY.md)

A implementação só deve começar quando os requisitos de readiness estiverem
satisfeitos, incluindo ratificação da documentação aplicável e uma Normative
Baseline efetiva.

No self-hosting atual, uma Technology Baseline aprovada ou um TIR aprovado não
substituem o lifecycle próprio de Work Item:

```text
Work Item PROPOSED
→ readiness
→ auditoria aplicável
→ authority decision
→ Work Item READY
→ Development Cycle
→ Execution válida
```

Enquanto nenhum Work Item estiver `READY`, a implementação permanece
`NOT AUTHORIZED`.

---

## 14. Normative Baselines

Uma revisão normativa publicada não se torna lei apenas por existir no
repositório.

A autoridade normativa efetiva é determinada por uma **Normative Baseline**
ratificada, cujo certificado fixa de forma imutável:

- documentos membros;
- revisões exatas;
- digests;
- precedência;
- escopo;
- autoridade de ratificação;
- instante de vigência;
- relação de supersessão.

Certificados efetivos ficam em:

```text
governance/normative-baselines/
```

Se ainda não existir uma Normative Baseline efetiva, o corpus permanece em fase
pré-ratificação e não autoriza implementação real.

---

## 15. Auditorias

Relatórios de auditoria são evidência de governança, não normas:

```text
audits/
```

Auditoria positiva não substitui ratificação humana quando autoridade humana é
obrigatória.

Auditorias de objetos posteriores, como readiness de Work Item, não reabrem por
si só auditorias históricas de Planning Round já encerradas. Cada auditoria deve
declarar objeto, baseline, escopo, evidência, findings, resultado e limitações.

---

## 16. Legado arquivado

O projeto anterior ao lifecycle reboot permanece preservado em:

```text
naamive/backup/
```

Esse conteúdo é evidência histórica. Pode ensinar, mas não governa o reboot
atual e não cria requisito de compatibilidade salvo decisão governada explícita.

---

## 17. Para agentes

Antes de realizar qualquer trabalho no repositório, leia:

- [AGENTS.md](AGENTS.md)

`AGENTS.md` define regras operacionais para agentes, mas não pode enfraquecer nem
substituir a Normative Baseline aplicável.

Princípio operacional atual:

```text
1 task
→ 1 logical worker
→ validação proporcional
→ report
→ STOP
```

Wrappers técnicos exigidos por um runtime não devem virar cadeias de workers,
reviewers ou auditores. O worker lógico executa o escopo e encerra quando os
critérios de conclusão forem satisfeitos.

---

## 18. Princípio final

```text
esta mudança transforma uma necessidade real de negócio
em valor entregue de forma governada, verificável e evolutiva?
```
