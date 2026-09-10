# NAAMIVE — Technology Baseline Decision Traceability

**Status:** COMPLETE  
**Natureza:** controlling technical traceability member; non-normative  
**Technology Baseline:** v0.10 — READY FOR HUMAN APPROVAL  
**Normative Baseline:** NB-0002 — RATIFIED / IN FORCE  
**Coverage:** 290/290 approved source decisions  
**Date:** 2026-09-09

---

# 1. Regra

Cada decisão aprovada de 2.1–2.8 possui disposition explícita.

```text
PRESERVED
REFINED
SUPERSEDED_WITH_REASON
```

Para 2.1–2.6, a fonte histórica de decisão é:

```text
commit: fd3feadf0f6761cc5b847815b65c70e5e4354c6d
file:   technology/01_TECHNOLOGY_BASELINE.md
```

Somente a semântica técnica D2.x é incorporada; metadados antigos e referências
a NB-0001 não são autoridade para a baseline atual.

Para 2.7 e 2.8, os documentos aprovados atuais permanecem membros técnicos
controladores do document set.

---

# 2. Coverage

```text
2.1 = 20/20
2.2 = 15/15
2.3 = 18/18
2.4 = 30/30
2.5 = 37/37
2.6 = 45/45
2.7 = 48/48
2.8 = 77/77
TOTAL = 290/290
```

---

# 3. Matrix

| Decision | Source decision | Disposition | Consolidated target |
|---|---|---|---|
| `D2.1-01` | Runtime principal | PRESERVED | TB-01 |
| `D2.1-02` | Linguagem principal | PRESERVED | TB-02 |
| `D2.1-03` | Deployables iniciais | PRESERVED | TB-03 |
| `D2.1-04` | Aplicação web | PRESERVED | TB-03 / TB-68 |
| `D2.1-05` | Aplicação worker | PRESERVED | TB-03 |
| `D2.1-06` | Banco de dados | PRESERVED | TB-19 |
| `D2.1-07` | Ambiente local | PRESERVED | TB-104 |
| `D2.1-08` | Módulos representam capacidades | PRESERVED | TB-05 |
| `D2.1-09` | Internals privados | PRESERVED | TB-06 |
| `D2.1-10` | Public contracts explícitos | PRESERVED | TB-06 |
| `D2.1-11` | Ownership de dados | PRESERVED | TB-07 |
| `D2.1-12` | Sem acesso cruzado direto ao banco | PRESERVED | TB-07 |
| `D2.1-13` | Shared mínimo | PRESERVED | TB-08 |
| `D2.1-14` | Dependências direcionais | PRESERVED | TB-09 |
| `D2.1-15` | Boundaries verificáveis | PRESERVED | TB-10 |
| `D2.1-16` | Novo módulo deve ser barato | PRESERVED | TB-05 / TB-10 |
| `D2.1-17` | Application Shell | REFINED | TB-68 / D2.7 refined shell |
| `D2.1-18` | Content Area inicialmente vazia | REFINED | TB-69 / D2.7 project selection |
| `D2.1-19` | Navegação por menu | REFINED | TB-68 / TB-69 |
| `D2.1-20` | Projetos no menu vertical | REFINED | TB-69 / TB-88 |
| `D2.2-01` | Backend framework | PRESERVED | TB-11 |
| `D2.2-02` | Frontend framework | PRESERVED | TB-12 |
| `D2.2-03` | Frontend build tooling | PRESERVED | TB-12 |
| `D2.2-04` | Frontend routing | PRESERVED | TB-12 |
| `D2.2-05` | Persistence tooling | PRESERVED | TB-13 |
| `D2.2-06` | HTTP schema validation | PRESERVED | TB-11 |
| `D2.2-07` | Package manager | PRESERVED | TB-04 |
| `D2.2-08` | Workspace / monorepo tooling | PRESERVED | TB-04 |
| `D2.2-09` | Build backend e worker | PRESERVED | TB-14 |
| `D2.2-10` | Test runner | PRESERVED | TB-15 |
| `D2.2-11` | E2E desde a primeira vertical slice | PRESERVED | TB-16 |
| `D2.2-12` | Automated Regression from Day One | PRESERVED | TB-18 |
| `D2.2-13` | Core Journeys Regression Suite | PRESERVED | TB-16 / TB-18 |
| `D2.2-14` | CI Regression Gate | PRESERVED | TB-18 |
| `D2.2-15` | Architecture guardrails desde o início | PRESERVED | TB-10 / TB-18 |
| `D2.3-01` | PostgreSQL-backed durable dispatch | PRESERVED | TB-44 |
| `D2.3-02` | Sem broker externo inicialmente | PRESERVED | TB-45 |
| `D2.3-03` | Worker polling | PRESERVED | TB-47 |
| `D2.3-04` | Claim concorrente seguro | PRESERVED | TB-46 |
| `D2.3-05` | Lease | PRESERVED | TB-49 |
| `D2.3-06` | Heartbeat | PRESERVED | TB-49 / TB-79 |
| `D2.3-07` | Fencing obrigatório | PRESERVED | TB-50 |
| `D2.3-08` | Expiração não ressuscita Execution | PRESERVED | TB-48 |
| `D2.3-09` | Retry cria nova Execution causal | PRESERVED | TB-48 |
| `D2.3-10` | Recovery cria nova Execution causal | PRESERVED | TB-48 |
| `D2.3-11` | Idempotência durável | PRESERVED | TB-52 / TB-144 |
| `D2.3-12` | Exactly-once lógico | PRESERVED | TB-53 |
| `D2.3-13` | Revalidation antes de RUNNING | PRESERVED | TB-51 |
| `D2.3-14` | Revalidation antes de publicar resultado | PRESERVED | TB-51 |
| `D2.3-15` | Reconciliation como safety net | PRESERVED | TB-54 / TB-126 |
| `D2.3-16` | Efeito externo incerto | PRESERVED | TB-54 |
| `D2.3-17` | Web e worker não compartilham autoridade implícita | PRESERVED | TB-89 / TB-91 |
| `D2.3-18` | Transporte é infraestrutura, handoff é domínio governado | PRESERVED | TB-28 / TB-44 / TB-138 |
| `D2.4-01` | Human authentication | PRESERVED | TB-84 |
| `D2.4-02` | Password hashing | PRESERVED | TB-85 |
| `D2.4-03` | Server-side opaque session | PRESERVED | TB-86 / TB-139 |
| `D2.4-04` | HttpOnly cookie | PRESERVED | TB-86 |
| `D2.4-05` | No auth token in localStorage | PRESERVED | TB-86 |
| `D2.4-06` | CSRF protection | PRESERVED | TB-87 |
| `D2.4-07` | Authorization server-side only | PRESERVED | TB-88 |
| `D2.4-08` | Canonical Authority Service | PRESERVED | TB-89 |
| `D2.4-09` | Role is not authority by itself | PRESERVED | TB-90 |
| `D2.4-10` | Scoped grants | PRESERVED | TB-90 |
| `D2.4-11` | Expiration and revocation | PRESERVED | TB-92 / TB-139 |
| `D2.4-12` | Baseline-aware authority | PRESERVED | TB-90 / TB-139 |
| `D2.4-13` | Distinct principal classes | PRESERVED | TB-91 / TB-139 |
| `D2.4-14` | Worker uses service principal | PRESERVED | TB-91 |
| `D2.4-15` | Agent uses agent identity | PRESERVED | TB-91 |
| `D2.4-16` | Executor identity | PRESERVED | TB-91 |
| `D2.4-17` | Human gates require HUMAN | PRESERVED | TB-91 |
| `D2.4-18` | Least privilege | PRESERVED | TB-92 |
| `D2.4-19` | Login rate limiting | PRESERVED | TB-92 |
| `D2.4-20` | Generic authentication errors | PRESERVED | TB-92 |
| `D2.4-21` | Security headers | PRESERVED | TB-92 |
| `D2.4-22` | Boundary validation | PRESERVED | TB-92 |
| `D2.4-23` | Local secrets | PRESERVED | TB-93 |
| `D2.4-24` | Production secret store | PRESERVED | TB-93 |
| `D2.4-25` | Secret rotation | PRESERVED | TB-93 |
| `D2.4-26` | No secrets in repository | PRESERVED | TB-93 |
| `D2.4-27` | No secrets in logs | PRESERVED | TB-93 / TB-94 |
| `D2.4-28` | Security audit | PRESERVED | TB-56 / TB-139 |
| `D2.4-29` | UI capability projection | PRESERVED | TB-88 |
| `D2.4-30` | Security fail-closed | PRESERVED | TB-92 |
| `D2.5-01` | Zero assinatura obrigatória | PRESERVED | TB-102 |
| `D2.5-02` | Pino para application logging | PRESERVED | TB-94 |
| `D2.5-03` | Structured JSON required | PRESERVED | TB-94 |
| `D2.5-04` | Automatic redaction | PRESERVED | TB-94 |
| `D2.5-05` | Logs are not canonical events | PRESERVED | TB-94 / TB-56 |
| `D2.5-06` | OpenTelemetry | PRESERVED | TB-95 |
| `D2.5-07` | OpenTelemetry Collector | PRESERVED | TB-95 |
| `D2.5-08` | Tracing ponta a ponta | PRESERVED | TB-95 |
| `D2.5-09` | Correlation and causation remain durable | PRESERVED | TB-95 |
| `D2.5-10` | Prometheus metrics model | PRESERVED | TB-96 |
| `D2.5-11` | prom-client | PRESERVED | TB-96 |
| `D2.5-12` | Metrics endpoint | PRESERVED | TB-96 / TB-137 |
| `D2.5-13` | Technical metrics | PRESERVED | TB-96 / TB-137 |
| `D2.5-14` | Lifecycle and governance metrics | PRESERVED | TB-96 / TB-137 |
| `D2.5-15` | Execution metrics | PRESERVED | TB-96 / TB-137 |
| `D2.5-16` | Handoff and continuity metrics | PRESERVED | TB-96 / TB-137 |
| `D2.5-17` | Projection metrics | PRESERVED | TB-63 / TB-96 / TB-137 |
| `D2.5-18` | Inconsistency and reconciliation metrics | PRESERVED | TB-55 / TB-96 / TB-137 |
| `D2.5-19` | No high-cardinality IDs as metric labels | PRESERVED | TB-96 |
| `D2.5-20` | Grafana | PRESERVED | TB-97 |
| `D2.5-21` | Prometheus server | PRESERVED | TB-96 |
| `D2.5-22` | Loki as default log backend | PRESERVED | TB-98 |
| `D2.5-23` | Tempo as default trace backend | PRESERVED | TB-95 |
| `D2.5-24` | Observability stack | PRESERVED | TB-94..TB-102 |
| `D2.5-25` | Liveness endpoint | PRESERVED | TB-99 |
| `D2.5-26` | Readiness endpoint | PRESERVED | TB-99 |
| `D2.5-27` | Worker health | PRESERVED | TB-99 / TB-137 |
| `D2.5-28` | ALIVE is not PROGRESS | PRESERVED | TB-100 |
| `D2.5-29` | Operational progress signal | PRESERVED | TB-100 |
| `D2.5-30` | Agent telemetry closed contract | PRESERVED | TB-137 incorporated detail |
| `D2.5-31` | Raw agent payload forbidden by default | PRESERVED | TB-137 incorporated detail |
| `D2.5-32` | Durable failure evidence | PRESERVED | TB-56 / TB-57 / TB-137 |
| `D2.5-33` | Separate operational signals from audit | PRESERVED | TB-55..TB-57 / TB-94..TB-96 |
| `D2.5-34` | Actionable alerts | PRESERVED | TB-101 / TB-137 |
| `D2.5-35` | Governed alert references canonical Inconsistency | PRESERVED | TB-55 / TB-101 |
| `D2.5-36` | Observability failure must not corrupt business state | PRESERVED | TB-28 / TB-56 / TB-94 |
| `D2.5-37` | Observability module boundaries | PRESERVED | TB-10 / TB-94..TB-102 |
| `D2.6-01` | Zero infraestrutura paga durante desenvolvimento | PRESERVED | TB-108 / TB-102 |
| `D2.6-02` | Quatro environment profiles | PRESERVED | TB-103 |
| `D2.6-03` | DEV | PRESERVED | TB-104 |
| `D2.6-04` | PRE-HML | PRESERVED | TB-105 |
| `D2.6-05` | PRE-HML local-first | PRESERVED | TB-105 / TB-108 |
| `D2.6-06` | HML | PRESERVED | TB-106 |
| `D2.6-07` | PROD | PRESERVED | TB-107 |
| `D2.6-08` | Build once, promote | PRESERVED | TB-114 |
| `D2.6-09` | Same artifact across PRE-HML, HML and PROD | PRESERVED | TB-114 |
| `D2.6-10` | Environment differences are configuration | PRESERVED | TB-114 / TB-115 |
| `D2.6-11` | Docker Engine | PRESERVED | TB-109 |
| `D2.6-12` | Docker Compose v2 | PRESERVED | TB-109 |
| `D2.6-13` | No Kubernetes initially | PRESERVED | TB-109 |
| `D2.6-14` | Production topology starts single-host | PRESERVED | TB-110 |
| `D2.6-15` | Web and worker separate containers | PRESERVED | TB-111 |
| `D2.6-16` | Horizontal worker scaling supported | PRESERVED | TB-111 / TB-46 |
| `D2.6-17` | Reverse proxy | PRESERVED | TB-112 |
| `D2.6-18` | TLS | PRESERVED | TB-112 / TB-93 |
| `D2.6-19` | Network exposure | PRESERVED | TB-113 |
| `D2.6-20` | Persistent state outside ephemeral container filesystem | PRESERVED | TB-107 / TB-113 |
| `D2.6-21` | Repository/source is not runtime state | PRESERVED | TB-107 / TB-113 |
| `D2.6-22` | Worker filesystem access is narrower than web | PRESERVED | TB-111 / TB-127 / TB-137 |
| `D2.6-23` | Immutable release identification | PRESERVED | TB-115 |
| `D2.6-24` | Same release ID for web and worker | PRESERVED | TB-115 |
| `D2.6-25` | No latest tag in authoritative deployment | PRESERVED | TB-115 |
| `D2.6-26` | Controlled migration step | PRESERVED | TB-117 |
| `D2.6-27` | Release flow | PRESERVED | TB-114 / TB-128 / TB-129 / TB-137 |
| `D2.6-28` | Health validation | PRESERVED | TB-99 / TB-114 |
| `D2.6-29` | Post-deploy smoke | PRESERVED | TB-114 / TB-137 |
| `D2.6-30` | Graceful worker shutdown | PRESERVED | TB-111 / TB-137 |
| `D2.6-31` | Restart policy | PRESERVED | TB-111 / TB-101 |
| `D2.6-32` | PostgreSQL backup | PRESERVED | TB-123 |
| `D2.6-33` | Backup integrity | PRESERVED | TB-124 |
| `D2.6-34` | Restore is explicitly destructive | PRESERVED | TB-125 |
| `D2.6-35` | Restore testing | PRESERVED | TB-123..TB-126 |
| `D2.6-36` | Backup separate from primary DB storage | PRESERVED | TB-123 |
| `D2.6-37` | Production secret delivery | PRESERVED | TB-93 |
| `D2.6-38` | No Vault requirement initially | PRESERVED | TB-93 |
| `D2.6-39` | Container hardening | PRESERVED | TB-127 |
| `D2.6-40` | Docker socket forbidden | PRESERVED | TB-127 |
| `D2.6-41` | CI/CD default | PRESERVED | TB-128 |
| `D2.6-42` | No mandatory paid CI | PRESERVED | TB-128 |
| `D2.6-43` | Explicit production promotion initially | PRESERVED | TB-129 |
| `D2.6-44` | HML and PROD can be deferred | PRESERVED | TB-108 |
| `D2.6-45` | Environment parity rule | PRESERVED | TB-103..TB-108 / TB-114 |
| `D2.7-01` | Login separado do AppShell | PRESERVED | TB-67..TB-69 / TB-137 |
| `D2.7-02` | AppShell estável | PRESERVED | TB-67..TB-69 / TB-137 |
| `D2.7-03` | Top Bar | PRESERVED | TB-67..TB-69 / TB-137 |
| `D2.7-04` | Project Sidebar | PRESERVED | TB-67..TB-69 / TB-137 |
| `D2.7-05` | Seleção explícita de Project | PRESERVED | TB-67..TB-69 / TB-137 |
| `D2.7-06` | React Router | PRESERVED | TB-68..TB-69 / TB-137 |
| `D2.7-07` | URL representa contexto navegável | PRESERVED | TB-68..TB-69 / TB-137 |
| `D2.7-08` | TanStack Query | PRESERVED | TB-70..TB-72 / TB-137 |
| `D2.7-09` | Sem Redux/Zustand inicialmente | PRESERVED | TB-70..TB-72 / TB-137 |
| `D2.7-10` | Não persistir canonical state no browser | PRESERVED | TB-70..TB-72 / TB-137 |
| `D2.7-11` | Native fetch wrapper | PRESERVED | TB-70..TB-72 / TB-137 |
| `D2.7-12` | Contratos de transporte explícitos | PRESERVED | TB-72..TB-74 / TB-144 / TB-137 |
| `D2.7-13` | Semantic commands only | PRESERVED | TB-72..TB-74 / TB-144 / TB-137 |
| `D2.7-14` | Expected version em commands materiais | PRESERVED | TB-72..TB-74 / TB-144 / TB-137 |
| `D2.7-15` | Sem optimistic update de estado governado | PRESERVED | TB-72..TB-74 / TB-144 / TB-137 |
| `D2.7-16` | Double click seguro | PRESERVED | TB-72..TB-74 / TB-144 / TB-137 |
| `D2.7-17` | SSE como transporte inicial | PRESERVED | TB-63..TB-66 / TB-137 |
| `D2.7-18` | SSE transporta sinal, não verdade canônica | PRESERVED | TB-63..TB-66 / TB-137 |
| `D2.7-19` | Reconnect seguro | PRESERVED | TB-63..TB-66 / TB-137 |
| `D2.7-20` | Fallback polling | PRESERVED | TB-63..TB-66 / TB-137 |
| `D2.7-21` | Um stream autenticado por AppShell | PRESERVED | TB-63..TB-66 / TB-137 |
| `D2.7-22` | Activity Center persistente no AppShell | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-23` | Hierarquia explícita | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-24` | Estados funcionais legíveis | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-25` | Três relógios | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-26` | Progresso factual somente | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-27` | Finding/impediment visível | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-28` | Action descriptor server-derived | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-29` | Decision Drawer/Modal contextual | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-30` | Conteúdo mínimo de decisão material | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-31` | Current state separado da timeline | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-32` | Local activity history e global Project timeline | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-33` | Material error é persistente | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-34` | Transport error separado de governed failure | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-35` | No eternal spinner | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-36` | Query loading factual | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-37` | Refetch triggers | PRESERVED | TB-75..TB-79 / TB-137 |
| `D2.7-38` | Bootstrap 5 CSS | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-39` | Componente local acima de markup repetido | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-40` | Desktop-first responsivo | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-41` | WCAG 2.2 AA como target | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-42` | Component/integration UI tests | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-43` | Playwright journeys | PRESERVED | TB-80..TB-83 / TB-17 / TB-16 / TB-137 |
| `D2.7-44` | Real-time regression | PRESERVED | TB-16..TB-18 / TB-63..TB-66 / TB-87 / TB-93 / TB-137 |
| `D2.7-45` | Busca server-side | PRESERVED | TB-16..TB-18 / TB-63..TB-66 / TB-87 / TB-93 / TB-137 |
| `D2.7-46` | Session bootstrap | PRESERVED | TB-16..TB-18 / TB-63..TB-66 / TB-87 / TB-93 / TB-137 |
| `D2.7-47` | CSRF integrado ao ApiClient | PRESERVED | TB-16..TB-18 / TB-63..TB-66 / TB-87 / TB-93 / TB-137 |
| `D2.7-48` | Sem secrets no bundle | PRESERVED | TB-16..TB-18 / TB-63..TB-66 / TB-87 / TB-93 / TB-137 |
| `D2.8-01` | Uma instância PostgreSQL, um database da aplicação | PRESERVED | TB-19..TB-21 / TB-137 |
| `D2.8-02` | PostgreSQL schemas por ownership | PRESERVED | TB-19..TB-21 / TB-137 |
| `D2.8-03` | Schema não concede acesso cruzado | PRESERVED | TB-19..TB-21 / TB-137 |
| `D2.8-04` | PostgreSQL UUID como tipo padrão de identity | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-05` | IDs não carregam semântica | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-06` | `version bigint` para current state mutável | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-07` | Version não identifica currentness histórica | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-08` | `timestamptz` para instantes | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-09` | Tempo autoritativo server-side | PRESERVED | TB-22..TB-25 / TB-137 |
| `D2.8-10` | Não adotar Event Sourcing total | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-11` | Transition/history append-only | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-12` | Sem UPDATE de history material | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-13` | Uma transação PostgreSQL por command local | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-14` | Sem dual-write não protegido | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-15` | `READ COMMITTED` como default | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-16` | Locks explícitos para invariantes concorrentes | PRESERVED | TB-26..TB-30 / TB-138 / TB-137 |
| `D2.8-17` | Estrutura física em três níveis | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-18` | Um DeliveryTarget current por Project | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-19` | Membership pertence à versão | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-20` | Troca de target version é transacional | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-21` | Manifest header + immutable items | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-22` | Snapshot exato, não query futura | PRESERVED | TB-32..TB-35 / TB-141 / TB-137 |
| `D2.8-23` | Current + history + lineage | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-24` | Exactly one Module owner | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-25` | Governing scope explícito | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-26` | DevelopmentCycle separado | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-27` | PhaseCycleInstance é first-class table | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-28` | Reentry cria nova row | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-29` | Um current PhaseCycle coerente com Project | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-30` | PhaseStepInstance persistida | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-31` | Roadmap possui identidade estável | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-32` | Roadmap versionado | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-33` | Roadmap restart-safe | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-34` | Current functional progress separado de telemetry | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-35` | Três relógios permanecem separados | PRESERVED | TB-31 / TB-36..TB-43 / TB-140 / TB-137 |
| `D2.8-36` | Execution attempt é immutable identity | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-37` | Claim operacional separado | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-38` | Fencing generation monotônica | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-39` | `ops.dispatch_item` | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-40` | Claim com `FOR UPDATE SKIP LOCKED` | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-41` | Polling com wake-up opcional | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-42` | Registry durável de intention | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-43` | Intention record guarda outcome | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-44` | External effect state explícito | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-45` | UNKNOWN força reconciliation | PRESERVED | TB-44..TB-54 / TB-142 / TB-144 / TB-137 |
| `D2.8-46` | Canonical tables, não somente logs | PRESERVED | TB-55..TB-57 / TB-139 / TB-137 |
| `D2.8-47` | affected scope explícito | PRESERVED | TB-55..TB-57 / TB-139 / TB-137 |
| `D2.8-48` | Authority history append-only | PRESERVED | TB-55..TB-57 / TB-139 / TB-137 |
| `D2.8-49` | Audit separado de application log | PRESERVED | TB-55..TB-57 / TB-139 / TB-137 |
| `D2.8-50` | Evidence por referência íntegra | PRESERVED | TB-55..TB-57 / TB-139 / TB-137 |
| `D2.8-51` | JSONB como extensão, não modelagem principal | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-52` | Lifecycle states não dependem de PostgreSQL ENUM rígido | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-53` | FK para identidade estrutural crítica | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-54` | Sem cascade delete de governados | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-55` | Governed resource não usa hard delete operacional | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-56` | Índices derivados de access patterns reais | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-57` | Partial indexes para current/eligible | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-58` | Não persistir toda projection no primeiro dia | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-59` | Projection materializada é rebuildable | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-60` | Durable invalidation/outbox record | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-61` | `LISTEN/NOTIFY` pode acelerar, não garantir | PRESERVED | TB-58..TB-66 / TB-141 / TB-142 / TB-145 / TB-137 |
| `D2.8-62` | Migrations versionadas no repositório | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-63` | Forward-only em ambientes governados | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-64` | Migration lock | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-65` | Backfill explícito e observável | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-66` | Migrations organizadas por capability | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-67` | Unit of Work explícita | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-68` | Domain não recebe Kysely | PRESERVED | TB-116..TB-120 / TB-138 / TB-137 |
| `D2.8-69` | Roles separados por responsabilidade operacional | PRESERVED | TB-121..TB-126 / TB-139 / TB-143 / TB-137 |
| `D2.8-70` | Connection string fora do repositório | PRESERVED | TB-121..TB-126 / TB-139 / TB-143 / TB-137 |
| `D2.8-71` | Restore test faz parte da readiness | PRESERVED | TB-121..TB-126 / TB-139 / TB-143 / TB-137 |
| `D2.8-72` | Após restore, reconciliation obrigatória | PRESERVED | TB-121..TB-126 / TB-139 / TB-143 / TB-137 |
| `D2.8-73` | Sem partitioning prematuro | PRESERVED | TB-132..TB-136 / TB-145 / TB-137 |
| `D2.8-74` | Telemetry pode compactar; history governada não | PRESERVED | TB-132..TB-136 / TB-145 / TB-137 |
| `D2.8-75` | `snake_case` físico | PRESERVED | TB-132..TB-136 / TB-145 / TB-137 |
| `D2.8-76` | Integration tests com PostgreSQL real | PRESERVED | TB-132..TB-136 / TB-145 / TB-137 |
| `D2.8-77` | Concurrent destructive tests | PRESERVED | TB-132..TB-136 / TB-145 / TB-137 |

---

# 4. Result

```text
unmapped approved decisions........ 0
silently dropped decisions......... 0
decisions requiring supersession... 0
refined legacy shell decisions..... 4
coverage........................... 290/290
```

Os quatro itens 2.1 refinados mantêm a intenção original, mas a forma concreta
de AppShell/navegação passa a ser governada pelo 2.7 aprovado.

Traceability gate:

```text
PASS
```
