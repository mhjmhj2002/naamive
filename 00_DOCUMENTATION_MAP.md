# NAAMIVE — Documentation Map

**Status:** BRAINSTORM  
**Versão:** 0.2  
**Autoridade:** mapa de navegação documental  
**Norma superior:** `00_NAAMIVE_CONSTITUTION.md`

---

# 1. Objetivo

Este documento organiza a documentação normativa e arquitetural do NAAMIVE.

Ele não cria novas leis.

Seu papel é tornar explícita a ordem de derivação para evitar autoridades
concorrentes.

---

# 2. Hierarquia

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

Se uma camada inferior descobrir nova lei fundamental, a correção deve ser feita
primeiro na camada superior apropriada.

---

# 3. Constituição

```text
00_NAAMIVE_CONSTITUTION.md
```

Define os princípios soberanos.

---

# 4. Lifecycle

```text
lifecycle/
├── 01_LIFECYCLE_MODEL.md
├── 02_NEED_LIFECYCLE.md
├── 03_PROJECT_LIFECYCLE.md
├── 04_MODULE_LIFECYCLE.md
├── 05_WORK_ITEM_LIFECYCLE.md
└── 06_EXECUTION_LIFECYCLE.md
```

Define como entidades governadas mudam de estado.

---

# 5. Governance

```text
governance/
├── 01_GOVERNANCE_MODEL.md
├── 02_AUTHORITY_POLICY.md
├── 03_GATE_POLICY.md
├── 04_AUDIT_AND_REVIEW_POLICY.md
├── 05_FINDING_AND_EXCEPTION_POLICY.md
└── 06_RISK_POLICY.md
```

Define quem pode decidir e quais controles se aplicam.

---

# 6. Contracts

```text
contracts/
├── 01_TRANSITION_CONTRACT.md
├── 02_HANDOFF_CONTRACT.md
├── 03_EVIDENCE_AND_AUDIT_CONTRACT.md
├── 04_CONTINUITY_AND_RECOVERY_CONTRACT.md
└── 05_AUTHORITY_CONTRACT.md
```

Define o que precisa existir e ser provado para uma operação ser válida.

---

# 7. State

```text
state/
├── 01_CANONICAL_STATE_MODEL.md
├── 02_PERSISTENCE_MODEL.md
├── 03_PROJECTION_MODEL.md
└── 04_BASELINE_AND_SUPERSESSION_MODEL.md
```

Define onde está a verdade atual, como história é preservada e como projeções são
derivadas.

---

# 8. Architecture

```text
architecture/
├── 01_RUNTIME_ARCHITECTURE_MODEL.md
├── 02_TRANSACTION_AND_CONSISTENCY_MODEL.md
└── 03_TECHNOLOGY_BASELINE_MODEL.md
```

Define a arquitetura técnica derivada das leis, sem transformar tecnologia em
autoridade normativa.

---

# 9. Orchestration

```text
orchestration/
├── 01_ORCHESTRATION_MODEL.md
├── 02_AGENT_EXECUTION_MODEL.md
├── 03_SCHEDULING_AND_ELIGIBILITY_MODEL.md
└── 04_RECOVERY_AND_RECONCILIATION_MODEL.md
```

Define como trabalho elegível é materializado, executado e recuperado.

---

# 10. Security

```text
security/
├── 01_IDENTITY_AND_ACCESS_MODEL.md
└── 02_SECRETS_AND_TRUST_BOUNDARY_MODEL.md
```

Define identidade, autenticação, autorização técnica e fronteiras de confiança.

---

# 11. API

```text
api/
├── 01_API_MODEL.md
├── 02_COMMAND_QUERY_MODEL.md
└── 03_ERROR_IDEMPOTENCY_AND_CONCURRENCY_MODEL.md
```

Define a superfície programática sem transformar API em fonte de verdade.

---

# 12. UI

```text
ui/
├── 01_UI_MODEL.md
├── 02_ACTION_AND_DECISION_SURFACE_MODEL.md
└── 03_TIMELINE_AND_EXPLAINABILITY_MODEL.md
```

Define a projeção humana da verdade canônica e das ações autorizadas.

---

# 13. Observability

```text
observability/
├── 01_OBSERVABILITY_MODEL.md
└── 02_AUDIT_TRAIL_AND_FORENSICS_MODEL.md
```

Define saúde, diagnóstico, rastreabilidade e investigação.

---

# 14. Implementation

```text
implementation/
├── 01_IMPLEMENTATION_READINESS.md
├── 02_INCREMENTAL_BUILD_PLAN.md
├── 03_TEST_AND_CERTIFICATION_STRATEGY.md
└── 04_LEGACY_REFERENCE_AND_REUSE_POLICY.md
```

Define quando podemos codificar, como construir incrementalmente, como provar
cada fatia e como impedir que o legado arquivado volte a ser norma.

---

# 15. Regra de vigência

Documentos em `BRAINSTORM` ou `CANDIDATE FOR APPROVAL` não são vigentes apenas
por existirem.

A vigência depende da ratificação definida pela Constituição e pela governança.
A ratificação/freeze produz uma **Normative Baseline** identificada por
certificado imutável com membership completo das revisões que passam a valer.
Documentos publicados depois não entram automaticamente na baseline de uma
instância ativa.

---

# 16. Regra para auditoria final

Antes da implementação, a auditoria deve avaliar o conjunto inteiro, não apenas
arquivos isolados.

A pergunta central deve ser:

```text
é possível implementar tudo isso sem inventar nova lei fundamental?
```

Se a resposta for não, a documentação ainda não está fechada.
