# NAAMIVE — Technology Baseline

**Status:** APPROVED / FROZEN  
**Versão:** 0.10  
**Natureza:** baseline técnica derivada; não normativa  
**Deriva de:** `NB-0002`  
**Normative Baseline vigente:** `NB-0002` — RATIFIED / IN FORCE  
**Brainstorms consolidados:** 2.1–2.8  
**Implementação:** NOT AUTHORIZED  
**Auditoria:** 2.10 COMPLETE; 2.10R COMPLETE; 2.10V PASS  
**2.11:** HUMAN APPROVAL COMPLETE — FROZEN  
**Próxima etapa:** NONE STARTED — TIR NOT STARTED  
**Última atualização:** 2026-09-10

---

# 1. Propósito

Esta Technology Baseline define **como implementar tecnicamente** o NAAMIVE sem
alterar a lei ratificada em `NB-0002`.

Hierarquia de autoridade:

```text
NB-0002
  ↓
Technology Baseline
  ↓
Architecture / Implementation Design
  ↓
Code
```

Se uma decisão técnica conflitar com `NB-0002`, a decisão técnica perde.

A Technology Baseline:

```text
não redefine lifecycle
não redefine authority
não redefine terminalidade
não redefine ValueIncrement
não redefine DeliveryTarget
não redefine Project PhaseCycle
não redefine Delivery
```

Ela materializa essas regras.

---

# 2. Princípios técnicos centrais

```text
one canonical truth
immutable governed history
projection != truth
browser != supervisor
heartbeat != functional progress
terminal means terminal
FAILED Execution is never reused
retry/recovery creates causal successor
authority must be provable
handoff must be durable
unknown external effect requires reconciliation
currentness must be explicit
frameworks stay peripheral
domain stays central
```

Preferências arquiteturais:

```text
modular monolith before microservices
single PostgreSQL before distributed persistence
explicit contracts before cross-module access
two deployables before premature decomposition
build once / promote immutable artifact
local-first development
automated guardrails from day one
```

---

# 3. Runtime, linguagem e deployables

## TB-01 — Runtime

```text
Node.js
```

Versão exata será fixada antes da implementação.

## TB-02 — Linguagem

```text
TypeScript
```

JavaScript sem tipagem não é padrão para application code.

## TB-03 — Deployables iniciais

```text
web
worker
```

`web` é monólito modular contendo frontend e backend.

`worker` executa trabalho assíncrono, recovery, reconciliation, scheduling e
continuity operacional.

Não existem microservices adicionais na baseline inicial.

---

# 4. Monorepo e organização

## TB-04 — Package manager e workspace

```text
pnpm
pnpm workspaces
```

Não adicionar inicialmente:

```text
Nx
Turborepo
```

Estrutura conceitual:

```text
naamive/
├── apps/
│   ├── web/
│   └── worker/
├── packages/
└── tests/
    └── e2e/
```

Packages internos podem materializar boundaries, mas:

```text
package != microservice
package != deployable
```

---

# 5. Monólito modular

## TB-05 — Módulos por capacidade de negócio

A organização principal segue capacidades de negócio.

Exemplos de boundaries:

```text
Need
Project
Business Module
Value Delivery
Work Item
Execution
Governance
Authority
Delivery
```

Evitar arquitetura global centrada em:

```text
controllers/
services/
repositories/
models/
```

## TB-06 — Internals privados

Cada módulo possui internals privados.

Outro módulo não importa diretamente:

```text
entities internas
repositories internos
services internos
mappers internos
controllers internos
persistence interna
```

Integração ocorre por public contract explícito.

## TB-07 — Data ownership

Cada módulo é dono de seus dados.

Compartilhar o mesmo PostgreSQL não autoriza:

```text
cross-module UPDATE
cross-module repository access
```

Reads agregados/projections são desenhados explicitamente.

## TB-08 — Shared mínimo

`shared/common/utils` são exceção.

Permitido para infraestrutura realmente transversal:

```text
configuration
clock
ids
database primitives
transactions
logging
telemetry primitives
```

Regra de negócio não migra para `shared` por conveniência.

## TB-09 — Dependências direcionais

Dependências entre módulos devem ser explícitas, direcionais e verificáveis.

Dependência circular é finding arquitetural.

## TB-10 — Guardrails automáticos

Build/CI deve detectar, conforme aplicável:

```text
import de internals de outro módulo
dependência circular proibida
acesso a persistence privada de outro módulo
uso de camada proibida
boundary violation
```

---

# 6. Stack de backend e frontend

## TB-11 — Backend HTTP

```text
Fastify
TypeBox
Fastify Type Provider
```

Regra:

```text
Fastify não entra no domínio
TypeBox valida transporte
domain valida business rule
```

## TB-12 — Frontend

```text
React
Vite
React Router
```

Não há requisito atual de SSR/full-stack framework.

## TB-13 — Persistence tooling

```text
Kysely
pg / node-postgres
PostgreSQL
```

Kysely permanece na camada de persistence/infrastructure.

Domain não depende de:

```text
Kysely
pg
SQL
Fastify
React
```

## TB-14 — Build

Backend e worker:

```text
TypeScript
tsc
```

Bundler adicional não é requisito atual.

---

# 7. Testes e regressão

## TB-15 — Test runner

```text
Vitest
```

Suites permanecem semanticamente separadas:

```text
domain
application
architecture
integration
API
frontend
```

## TB-16 — E2E

```text
Playwright
```

E2E existe desde a primeira vertical slice.

Core journeys crescem incrementalmente com funcionalidades consolidadas.

## TB-17 — UI tests

```text
React Testing Library
+
Vitest
```

Testar comportamento, não estrutura interna frágil.

## TB-18 — Regression gate

Pipeline conceitual:

```text
architecture guardrails
→ unit/domain
→ integration/API
→ frontend
→ E2E core journeys
→ PASS
```

Uma nova task não é saudável se quebrar comportamento consolidado.

---

# 8. PostgreSQL — princípio físico

## TB-19 — Database

No MVP:

```text
PostgreSQL
└── naamive
```

Um database principal da aplicação.

Não criar database por módulo.

## TB-20 — Categorias persistidas separadamente

```text
CURRENT STATE
IMMUTABLE HISTORY
EVIDENCE / AUDIT
DERIVED PROJECTIONS
OPERATIONAL CLAIMS / TELEMETRY
```

Regra:

```text
current row != complete history
projection != truth
claim != business state
log != canonical evidence
```

## TB-21 — PostgreSQL schemas por ownership

Estrutura conceitual:

```text
platform
need
project
business_module
value_delivery
work_item
execution
governance
authority
delivery

audit
evidence
projection
ops
```

Nomes finais podem ser refinados sem mudar ownership.

---

# 9. Identidade, versão e tempo

## TB-22 — IDs

Recursos governados usam:

```text
uuid
```

Preferência de geração:

```text
UUIDv7 / time-ordered UUID
```

Biblioteca exata fica aberta.

ID não carrega semântica de state/currentness/version.

## TB-23 — Optimistic concurrency

Current state mutável relevante possui:

```text
version bigint
```

Update autoritativo exige:

```text
id
+
expected_version
```

Conflito produz stale/concurrency failure controlada.

## TB-24 — Currentness explícita

Nunca inferir currentness apenas de:

```text
MAX(version)
```

Usar, conforme agregado:

```text
is_current
current_version_id
superseded_at
superseded_by
```

## TB-25 — Instantes

Usar:

```text
timestamptz
```

para fatos temporais.

Fato produzido pelo sistema usa clock server-side/database-side.

---

# 10. Current state + immutable history

## TB-26 — Sem Event Sourcing total

Modelo inicial:

```text
current table
+
append-only governed history
```

Não adotar Event Sourcing completo.

## TB-27 — History append-only

Mudança material registra:

```text
resource
from/to
resource version
cause
correlation
intention
principal
authority
Business Baseline
normative_baseline_ref
timestamp
```

conforme aplicável.

History material não sofre UPDATE corretivo.

Correção ocorre por novo fato/supersession/reversal/compensation.

---

# 11. Transactions e isolation

## TB-28 — Command local = uma transaction

Quando toda operação é local ao PostgreSQL:

```text
revalidate state
revalidate authority/context
update current state
append history
persist decision/evidence refs
update continuity
create durable dispatch/handoff
create durable projection invalidation
commit
```

Ou tudo aparece, ou nada aparece.

## TB-29 — Sem dual-write desprotegido

É proibido publicar canonical state e depois “tentar” criar handoff obrigatório.

## TB-30 — Isolation

Default:

```text
READ COMMITTED
```

com:

```text
expected-version checks
unique constraints
foreign keys
SELECT ... FOR UPDATE
```

nos pontos necessários.

`SERIALIZABLE` global não é requisito.

---

# 12. ValueIncrement e DeliveryTarget

## TB-31 — ValueIncrement

Estrutura conceitual:

```text
value_increment
value_increment_history
value_increment_lineage
```

ValueIncrement normal possui exatamente um Module owner.

Split/successor preservam origem e lineage.

## TB-32 — DeliveryTarget

Estrutura:

```text
delivery_target
delivery_target_version
delivery_target_membership
```

Membership pertence à **versão** do target.

Disposition:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

## TB-33 — Um target current por Project

Constraint física equivalente deve impedir dois DeliveryTargets autoritativos
correntes para o mesmo Project no MVP.

## TB-34 — Target version transacional

Nova versão materializa de forma coerente:

```text
new version
membership
decision
authority
history
supersession/currentness
continuity impact
```

---

# 13. DeliveryManifest

## TB-35 — Snapshot durável

Estrutura:

```text
delivery_manifest
delivery_manifest_item
```

O Manifest identifica exatamente:

```text
Project
DeliveryTarget
DeliveryTargetVersion
candidate baseline
required set
included optional set
out-of-target set
decision/evidence context
```

Depois de materializado para decisão/delivery:

```text
immutable
```

Não reconstruir candidatura histórica apenas consultando estado atual.

---

# 14. Project PhaseCycle e internal steps

## TB-36 — PhaseCycleInstance first-class

Persistir:

```text
phase_cycle_instance
```

com:

```text
project
project phase
generation
status
previous cycle
phase entry ref
Business Baseline
normative_baseline_ref
cause
current step
started/completed
version
```

Reentry em fase cria nova instância causal.

## TB-37 — Um current cycle por Project

Transação/constraint impede duas PhaseCycleInstances current autoritativas.

Project transition + nova PhaseCycle formam unidade consistente.

## TB-38 — PhaseStepInstance

Persistir passo semântico com estados inequívocos:

```text
A_FAZER
FAZENDO
FEITO
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
NAO_APLICAVEL
```

---

# 15. Work Item e DevelopmentCycle

## TB-39 — Governing scope

Work Item possui exatamente um governing scope.

MVP:

```text
VALUE_INCREMENT
PROJECT_TRANSVERSAL
```

Combinação ambígua é inválida.

## TB-40 — DevelopmentCycle first-class

`IN_REVIEW → IN_PROGRESS` cria successor DevelopmentCycleInstance.

Não reciclar ciclo anterior.

---

# 16. DevelopmentRoadmap e FunctionalProgress

## TB-41 — Roadmap persistente

Estrutura conceitual:

```text
development_roadmap
roadmap_version
roadmap_entry
```

RoadmapEntry referencia canonical resource; não duplica lifecycle state.

Current version é explícita.

## TB-42 — Restart-safe

Após restart deve ser possível reconstruir:

```text
entry ativa
próxima elegível
blocker/finding
pending decision
continuity
```

## TB-43 — FunctionalProgress

Persistir progresso funcional corrente necessário à retomada.

Separar:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Heartbeat não atualiza progresso funcional automaticamente.

---

# 17. Web ↔ Worker durable transport

## TB-44 — PostgreSQL-backed dispatch

Fluxo:

```text
WEB
→ durable intent / dispatch
→ PostgreSQL
→ WORKER
```

Web não depende de chamada HTTP direta ao worker.

## TB-45 — Sem broker externo inicialmente

Não adicionar agora:

```text
Kafka
RabbitMQ
Redis queue
broker dedicado
```

## TB-46 — Claim concorrente

Worker usa padrão equivalente a:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED
```

Claim físico ocorre em transação curta.

Execução longa ocorre fora do lock de row.

## TB-47 — Polling + wake-up opcional

A fonte durável é tabela PostgreSQL.

`LISTEN / NOTIFY` pode acelerar wake-up, mas:

```text
NOTIFY != durable queue
```

Perder NOTIFY não pode perder trabalho.

---

# 18. Execution, lease e fencing

## TB-48 — Execution attempt tem identity própria

FAILED/CANCELLED/EXPIRED não voltam a RUNNING.

Retry/recovery cria nova Execution causal.

## TB-49 — Operational claim separado

Estrutura conceitual:

```text
execution
execution_claim
```

Claim guarda:

```text
worker instance
fencing generation
claimed_at
lease_expires_at
last_heartbeat_at
```

## TB-50 — Fencing obrigatório

Nova authority recebe generation superior.

Publish autoritativo exige generation corrente.

Executor stale não publica resultado.

## TB-51 — Revalidation

Antes de RUNNING e antes de publicar resultado, revalidar conforme aplicável:

```text
Work Item
intention
dependencies
authority
blockers
cancellation
baseline
normative baseline
claim/fencing
absence of competing authoritative result
```

---

# 19. Idempotency e effect certainty

## TB-52 — Intention identity durável

Operações materiais usam intention identity persistente.

Estrutura conceitual:

```text
ops.idempotency_record
```

Deve responder:

```text
esta intenção já foi aplicada?
qual outcome foi produzido?
```

## TB-53 — Exactly-once lógico

Não exigir transporte físico exactly-once.

Exigir:

```text
um único resultado autoritativo por intenção
```

## TB-54 — External effect certainty

Representar, quando aplicável:

```text
NO_EFFECT
EFFECT_CONFIRMED
PARTIAL_EFFECT
WRONG_EFFECT
UNKNOWN
```

`UNKNOWN` material exige reconciliation antes de retry cego.

---

# 20. Findings, Inconsistencies, audit e evidence

## TB-55 — Findings são canônicos

Persistir:

```text
finding
finding_history
inconsistency
inconsistency_history
```

Logs/alerts só referenciam esses recursos.

Finding material preserva:

```text
severity
affected scope
cause
owner
status
remediation
continuity
normative baseline
```

## TB-56 — Audit não é log

Audit material possui persistência própria e append-only.

## TB-57 — Evidence

Evidence possui identity e integridade verificável.

Metadados conceituais:

```text
kind
content/external ref
digest
source
principal
correlation
created_at
```

Conteúdo grande pode futuramente usar store externo, mantendo referência canônica.

---

# 21. JSONB, enums, FKs e delete

## TB-58 — JSONB

Permitido como extensão para:

```text
metadata
provider payload
diagnostic snapshot
evidence metadata
```

Não esconder estrutura central governada em JSONB genérico.

## TB-59 — Estados

Preferir:

```text
text/varchar
+
CHECK
```

ou tabela controlada, em vez de PostgreSQL ENUM rígido para todo lifecycle.

## TB-60 — Foreign keys

Usar FK em relações estruturais críticas.

## TB-61 — Sem cascade destrutivo

Recursos governados não usam `ON DELETE CASCADE` para apagar história.

Preferir:

```text
RESTRICT / NO ACTION
```

## TB-62 — Sem hard delete operacional de governados

Lifecycle terminal/archive/supersession preservam história.

---

# 22. Projections e realtime

## TB-63 — Projection rebuildable

Projection é derivada.

Não persistir read model dedicado até access pattern justificar.

Projection materializada deve possuir:

```text
source watermark/version
rebuild strategy
staleness detection
```

## TB-64 — Durable invalidation

Mudança canônica pode registrar na mesma transação:

```text
projection invalidation / outbox
```

## TB-65 — SSE como transporte inicial para UI realtime

Fluxo:

```text
canonical commit
→ durable invalidation
→ optional NOTIFY
→ SSE
→ TanStack Query invalidate
→ canonical refetch
```

SSE transporta sinal, não a verdade canônica.

## TB-66 — Fallback

Reconnect e polling com backoff recuperam estado quando SSE falha.

---

# 23. Application Shell / UI Runtime

## TB-67 — Login separado

```text
/login
→ authenticated session
→ AppShell
```

## TB-68 — AppShell estável

Estrutura:

```text
Top Bar
+
Project Sidebar
+
Content Area
+
Persistent Activity Center
```

Shell não é desmontado a cada navegação.

## TB-69 — Project selection explícita

Nenhum Project implícito escondido no MVP.

Deep links podem selecionar Project autorizado.

## TB-70 — Server state

```text
TanStack Query
```

Responsável por fetch/cache/invalidation/refetch.

Não é source of truth.

## TB-71 — Sem Redux/Zustand inicialmente

Usar:

```text
TanStack Query → server state
React Router   → navigation state
React state    → local transient UI state
Context        → shell/session local concerns
```

Adicionar store global só por necessidade concreta.

## TB-72 — API Client

Usar `fetch` nativo por wrapper tipado.

Responsabilidades:

```text
credentials
CSRF
JSON
standard errors
stale handling
abort/cancellation
correlation when applicable
```

Axios não é requisito.

## TB-73 — Semantic commands

UI envia intenção semântica.

Proibido API de negócio genérica:

```text
setStatus(...)
```

## TB-74 — No optimistic canonical mutation

Estado governado só aparece concluído após confirmação canônica.

---

# 24. Activity Center

## TB-75 — Persistente no AppShell

Activity Center acompanha trabalho longo durante navegação.

Deve deep-linkar para recurso relacionado e possuir view detalhada quando necessário.

## TB-76 — Hierarquia explícita

Exibir separadamente:

```text
Project phase
Internal phase step
Module
ValueIncrement
Work Item
Execution
Finding
Decision
Continuity
```

## TB-77 — Progresso factual

Permitido:

```text
3/5 semantic steps
2/4 Work Items
4/6 REQUIRED ValueIncrements accepted
```

Proibido percentual inventado.

## TB-78 — Erro material persistente

Erro governado não pode existir apenas em toast.

## TB-79 — Três relógios

Exibir conforme aplicável:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

---

# 25. UI visual e acessibilidade

## TB-80 — Base visual

```text
Bootstrap 5 CSS
Bootstrap Icons
NAAMIVE scoped CSS / design tokens
```

Não usar Bootstrap JS imperativo.

## TB-81 — Componentes locais

Criar primitives/componentes do produto para padrões recorrentes, sem construir
framework próprio.

## TB-82 — Desktop-first responsivo

Prioridade:

```text
desktop
tablet usable
mobile basic-safe
```

## TB-83 — Accessibility target

```text
WCAG 2.2 AA
```

Inclui keyboard, visible focus, semantic HTML, labels, contrast e no-color-only
meaning.

---

# 26. Security

## TB-84 — Human authentication

```text
username
+
password
```

## TB-85 — Password hashing

```text
Argon2id
```

Plain password storage e reversible password encryption são proibidos.

## TB-86 — Session

```text
opaque server-side session
HttpOnly cookie
SameSite
Secure in production
Path=/
```

Browser JWT/localStorage auth token não fazem parte do modelo.

## TB-87 — CSRF

Mutações via cookie session usam:

```text
same-origin validation
+
CSRF token
```

## TB-88 — Authorization

Authorization é server-side.

A UI pode projetar capabilities, mas:

```text
button visible != authority
```

## TB-89 — AuthorityService

Authority resolution canônica e reutilizável por web/worker/boundaries.

Role isolada não é authority.

## TB-90 — Scoped grants

Grants consideram conforme aplicável:

```text
principal
action
scope
time
baseline
normative baseline
restrictions
authority source
```

## TB-91 — Principal classes

Separar:

```text
HUMAN
SERVICE
AGENT
EXECUTOR
```

Human gate exige HUMAN.

## TB-92 — Security operations

Obrigatório:

```text
least privilege
expiration
revocation
login rate limiting
generic auth errors
security headers
boundary validation
security audit
fail closed
```

## TB-93 — Secrets

Local:

```text
.env not versioned
```

Produção:

```text
protected host secret files
+
Docker Compose secrets
```

Sem secret em Git/log/prompt/telemetry.

---

# 27. Observability

## TB-94 — Logging

```text
Pino
structured JSON
automatic redaction
```

Log não é canonical event.

## TB-95 — Tracing

```text
OpenTelemetry
OpenTelemetry Collector
Tempo default backend
```

Instrumentação é vendor-neutral.

`trace_id` não substitui correlation/causation duráveis.

## TB-96 — Metrics

```text
prom-client
Prometheus
```

Evitar high-cardinality IDs em labels.

## TB-97 — Visualization

```text
Grafana
```

## TB-98 — Logs backend

```text
Loki
```

default self-hosted.

## TB-99 — Health

Web:

```text
/health/live
/health/ready
```

Worker possui health equivalente.

## TB-100 — ALIVE != PROGRESS

Observabilidade deve distinguir:

```text
alive
operational activity
functional progress
```

## TB-101 — Alertas

Alertas devem ser acionáveis.

Discrepancy governada referencia canonical Inconsistency.

## TB-102 — Sem paid dependency obrigatória

Stack deve funcionar self-hosted sem assinatura SaaS obrigatória.

---

# 28. Environments e deployment

## TB-103 — Profiles

```text
DEV
PRE-HML
HML
PROD
```

## TB-104 — DEV

```text
web / worker no host
PostgreSQL via Docker
infra auxiliar via Docker
hot reload
debug local
```

## TB-105 — PRE-HML

Stack containerizada real:

```text
web
worker
PostgreSQL
migrations
health
observability quando necessária
complete E2E
```

Local ou CI, preferencialmente descartável.

## TB-106 — HML

Containerizado e persistente quando provisionado.

## TB-107 — PROD

Containerizado, hardened, persistente, backup + observability.

## TB-108 — Local-first

Nenhuma infraestrutura paga é obrigatória antes da readiness.

---

# 29. Containers e promoção

## TB-109 — Runtime

```text
Docker Engine
Docker Compose v2
```

Não exigir inicialmente:

```text
Kubernetes
Docker Swarm
Nomad
```

## TB-110 — Initial production topology

```text
single Linux host
+
Docker Compose
```

com evolução futura possível.

## TB-111 — Containers

Fora de DEV:

```text
web container
worker container
```

Worker pode escalar horizontalmente quando necessário.

## TB-112 — Reverse proxy

```text
Caddy
```

responsável por HTTPS/TLS/reverse proxy.

## TB-113 — Network exposure

Por padrão, somente reverse proxy exposto externamente.

Não expor publicamente:

```text
PostgreSQL
worker
OTel Collector
Prometheus
Loki
Tempo
Grafana
```

## TB-114 — Build once / promote

```text
BUILD ONCE
→ PRE-HML
→ HML
→ PROD
```

Mesmo artefato imutável.

## TB-115 — Release identity

Release carrega conforme aplicável:

```text
release_id
git_commit
build_timestamp
technology_baseline_ref
image_digest
```

`:latest` não é identidade autoritativa.

---

# 30. Migrations

## TB-116 — Versionadas no repositório

Usar:

```text
Kysely migration infrastructure
+
explicit SQL when necessary
```

## TB-117 — Controlled migration step

`web` e `worker` não executam migrations automaticamente ao iniciar.

Promoção possui etapa explícita de migration.

## TB-118 — Forward-only

Padrão:

```text
expand
migrate/backfill
switch
contract
```

Rollback de aplicação não deve exigir apagar fato novo válido.

## TB-119 — Migration lock

Um migrator por database/ambiente, usando advisory lock ou equivalente.

## TB-120 — Backfills

Backfill material deve ser:

```text
idempotent
checkpointed
observable
safe to rerun
```

---

# 31. Database roles e secrets

## TB-121 — Roles mínimos

```text
naamive_migrator
naamive_app
```

Runtime normal não recebe DDL amplo.

Web/worker podem inicialmente compartilhar runtime DB role técnico.

PostgreSQL role não substitui AuthorityService.

## TB-122 — Database credentials

Connection string via environment/secret injection.

Nunca versionada.

---

# 32. Backup / restore

## TB-123 — PROD backup

Quando PROD existir:

```text
automated backup
integrity validation
restore test
separate backup storage
```

Obrigatórios.

## TB-124 — Integrity

Padrão inicial compatível com:

```text
pg_dump
validation
SHA-256 or equivalent
metadata
```

## TB-125 — Restore controlado

Restore destrutivo exige operação/confirmacão explícita.

## TB-126 — Post-restore reconciliation

Após restore/restart, reavaliar:

```text
RUNNING Executions
claims/leases
pending dispatch
UNKNOWN external effects
pending handoffs
roadmap continuity
```

---

# 33. Container hardening e CI/CD

## TB-127 — Hardening

HML/PROD:

```text
non-root containers
minimal images
drop unnecessary capabilities when possible
read-only filesystem when possible
minimal mounts
minimal networks
```

Docker socket é proibido em web/worker.

## TB-128 — CI/CD

Default:

```text
GitHub Actions
```

Paid CI obrigatório é proibido.

Self-hosted runner pode ser usado.

## TB-129 — Production promotion

Inicialmente, produção exige promoção explícita.

Merge não promove automaticamente para PROD.

---

# 34. Índices e access patterns

## TB-130 — Índices orientados a uso real

Índices iniciais cobrem:

```text
foreign keys
current resource lookup
project hierarchy
current DeliveryTarget
roadmap active entries
eligible dispatch
claim/lease expiry
idempotency/intention
correlation
Activity Center queries
```

## TB-131 — Partial indexes

Usar quando adequado:

```text
WHERE is_current
WHERE status = 'ELIGIBLE'
WHERE completed_at IS NULL
```

Não criar índice especulativo em massa.

---

# 35. Retention

## TB-132 — Governed history

History/lifecycle/decision/baseline lineage necessária para auditabilidade não é
apagada só por idade.

## TB-133 — Operational telemetry

Heartbeat/telemetry de alta frequência pode ter:

```text
retention
compaction
partitioning futura
```

Sem destruir fatos governados.

## TB-134 — Sem partitioning prematuro

Não particionar tabelas governadas no MVP sem necessidade de volume.

---

# 36. Testes específicos de persistência e concorrência

## TB-135 — PostgreSQL real

Testes de:

```text
locking
SKIP LOCKED
partial unique indexes
foreign keys
isolation
fencing
concurrent claim
```

rodam contra PostgreSQL real em container.

SQLite/in-memory não prova essas invariantes.

## TB-136 — Destructive concurrency tests

Testar simultaneamente:

```text
dois current DeliveryTargets
duas current PhaseCycles
dois claims da mesma responsabilidade
publish com stale fencing generation
mesma intention duas vezes
expected_version stale
```

Esperado:

```text
uma authority vence
demais falham de forma controlada
```

---

# 37. Proibições e decisões não adotadas

```text
microservices iniciais.................... NOT REQUIRED
multiple databases per module............ NOT NOW
full Event Sourcing....................... NOT NOW
external broker........................... NOT NOW
Kubernetes................................ NOT REQUIRED
Redux/Zustand............................. NOT REQUIRED NOW
WebSocket................................. NOT REQUIRED NOW
Axios..................................... NOT REQUIRED NOW
SSR/Next.js............................... NOT REQUIRED NOW
Tailwind.................................. NOT REQUIRED NOW
Material UI............................... NOT REQUIRED NOW
custom full design system................. NOT REQUIRED NOW

Redis as canonical truth.................. FORBIDDEN
filesystem as canonical state............. FORBIDDEN
browser canonical state................... FORBIDDEN
optimistic governed state................. FORBIDDEN
fake progress percentage.................. FORBIDDEN
hard delete governed history.............. FORBIDDEN
generic JSONB domain database............. FORBIDDEN
projection as source of truth............. FORBIDDEN
blind retry after UNKNOWN external effect. FORBIDDEN
Docker socket in app containers........... FORBIDDEN
:latest authoritative deploy.............. FORBIDDEN
mandatory paid SaaS/CI/hosting............ FORBIDDEN
```

---

# 38. Pontos ainda abertos

A baseline estrutural está fechada o suficiente para auditoria, mas parâmetros
operacionais concretos permanecem abertos até implementação/readiness:

```text
exact Node version
exact TypeScript/package versions
exact PostgreSQL major version
exact UUIDv7 library
exact schema names
singular/plural table convention
exact Compose file layout
exact migration folder layout
exact lease duration
exact heartbeat cadence
exact polling/backoff cadence
exact session lifetime/renewal
exact login rate limits
exact alert thresholds
exact retention windows
exact backup schedule/tool
exact HML/PROD provider/host
exact image registry
which projections receive physical read models first
```

Esses pontos não podem ser preenchidos por suposição silenciosa.

---

# 39. Gate antes de implementação

Código permanece bloqueado.

Estado:

```text
2.9 Consolidation....................... COMPLETE
2.10 Technical / Destructive Audit...... COMPLETE
2.10R Remediation....................... COMPLETE
2.10V Focused Verification.............. PASS
2.11 Human Approval / Freeze............ COMPLETE
Technology Baseline v0.10............... APPROVED / FROZEN
```

A aprovação do 2.11 não autoriza implementação.

```text
Technology Baseline APPROVED
!=
implementation authorized
```

Technical Implementation Readiness é uma etapa posterior e separada.

```text
TIR STARTED? NO
```

---

# 40. Estado consolidado

```text
Normative Baseline........ NB-0002 — RATIFIED / IN FORCE
Technology Baseline....... v0.10 APPROVED / FROZEN
Brainstorms 2.1–2.8....... CONSOLIDATED / TRACEABLE
2.10 Audit................ COMPLETE
2.10R Remediation......... COMPLETE
2.10V Verification........ PASS
2.11 Human Approval....... COMPLETE
P0........................ 0
P1........................ 0
Freeze gate............... PASS
TIR....................... NOT STARTED
Implementation............ NOT AUTHORIZED
```

---

# 41. Rastreabilidade dos brainstorms

```text
2.1 Foundation / AppShell................ CONSOLIDATED
2.2 Core Stack / Regression.............. CONSOLIDATED
2.3 Web ↔ Worker Transport............... CONSOLIDATED
2.4 Security Implementation.............. CONSOLIDATED
2.5 Observability Tooling................. CONSOLIDATED
2.6 Deployment Model...................... CONSOLIDATED
2.7 UI Runtime / Real-Time................ APPROVED / INCORPORATED
2.8 PostgreSQL Physical Persistence....... APPROVED / INCORPORATED
```

A matriz completa está em:

```text
technology/06_TECHNOLOGY_BASELINE_DECISION_TRACEABILITY.md
```

Ela é membro controlador da Technology Baseline v0.10 para rastreabilidade de
decisões.

A compressão editorial do arquivo principal não revoga silenciosamente decisão
aprovada.

---

# 42. TB-137 — Decision traceability e incorporação

A Technology Baseline v0.10 é um **document set**.

Membros técnicos controladores para o freeze:

```text
technology/01_TECHNOLOGY_BASELINE.md
technology/06_TECHNOLOGY_BASELINE_DECISION_TRACEABILITY.md
technology/02_BRAINSTORM_2_7_APPLICATION_UI_RUNTIME.md
technology/03_BRAINSTORM_2_8_POSTGRESQL_PHYSICAL_PERSISTENCE.md
```

Para 2.1–2.6, a matriz referencia a fonte histórica imutável:

```text
commit: fd3feadf0f6761cc5b847815b65c70e5e4354c6d
file:   technology/01_TECHNOLOGY_BASELINE.md
```

Somente a **semântica técnica das decisões D2.1..D2.6** é incorporada.

Metadados antigos, referências antigas a `NB-0001` e qualquer texto incompatível
com `NB-0002` não são incorporados.

Regra de precedência:

```text
NB-0002
>
Technology Baseline v0.10 main document
>
explicit remediation decisions 2.10R
>
approved source decision semantics referenced by traceability
>
historical explanatory text
```

Toda decisão D2.1..D2.8 possui uma disposition explícita:

```text
PRESERVED
REFINED
SUPERSEDED_WITH_REASON
```

Nenhuma decisão pode desaparecer por simples redução editorial.

---

# 43. TB-138 — Cross-module Unit of Work

Commands materiais que exigem atualização coerente de mais de um module
participam de uma **única transaction PostgreSQL** quando todas as mudanças são
locais ao mesmo database.

Fluxo:

```text
Application Coordinator
→ opens UnitOfWork / transaction
→ calls module public/application ports
→ each module adapter writes only module-owned tables
→ all participating adapters receive the same transaction context
→ history / continuity / durable handoff are written in the same transaction
→ one commit at the application boundary
```

Proibições:

```text
repository commits internally............... FORBIDDEN
module A writes module B private table...... FORBIDDEN
separate commits for one atomic command..... FORBIDDEN
hidden transaction inside repository........ FORBIDDEN
```

Se uma operação não puder permanecer fisicamente numa única transaction, ela
deixa de ser tratada como command local atômico e exige completion/recovery
durável explícito.

---

# 44. TB-139 — Session e authority persistence física

Security state necessário após restart é durável no PostgreSQL.

Estrutura conceitual mínima:

```text
authority.principal
authority.principal_history
authority.grant
authority.grant_history
authority.delegation
authority.delegation_history
authority.revocation

security.human_session
security.session_history
```

`human_session` preserva, conforme aplicável:

```text
session_id
opaque_token_hash
principal_id
created_at
expires_at
last_seen_at
rotated_from_session_id
revoked_at
revocation_reason
version
```

Nunca persistir o token opaco bruto como credencial reutilizável.

Grant/delegation preserva, conforme aplicável:

```text
principal
action/capability
scope type + scope identity
authority source
valid_from
expires_at
revoked_at
business baseline binding
normative_baseline_ref
decision/causation/correlation
version
```

Mudança de grant/delegation/revocation produz history append-only.

Todo request protegido, após restart ou não, revalida:

```text
session exists and is active
principal active
grant/delegation active
scope valid
time valid
baseline binding compatible
normative baseline applicable
```

Cookie existente no browser não prova authority.

Índices devem suportar:

```text
opaque_token_hash lookup
active session + expiry
active grants by principal/scope
revocation lookup
expiry/revalidation
```

---

# 45. TB-140 — Work Item governing scope com FK física

Não usar apenas:

```text
scope_type
scope_id
```

como referência polimórfica sem FK.

Modelo físico inicial:

```text
work_item.governing_scope_type
work_item.value_increment_id NULL
work_item.project_id NULL
```

Valores:

```text
VALUE_INCREMENT
PROJECT_TRANSVERSAL
```

Constraints equivalentes:

```text
VALUE_INCREMENT
→ value_increment_id IS NOT NULL
→ project_id IS NULL
→ FK real para ValueIncrement

PROJECT_TRANSVERSAL
→ project_id IS NOT NULL
→ value_increment_id IS NULL
→ FK real para Project
```

CHECK garante exatamente um governing scope compatível com o tipo.

Resultado:

```text
no ambiguous governing scope
no polymorphic orphan
real PostgreSQL referential integrity
```

---

# 46. TB-141 — DeliveryTargetVersion currentness e membership uniqueness

Além de um DeliveryTarget current por Project, o schema deve impedir:

```text
duas current versions do mesmo DeliveryTarget
membership duplicada na mesma target version
```

Constraints equivalentes:

```text
UNIQUE (delivery_target_id) WHERE is_current = true

UNIQUE (
  delivery_target_version_id,
  value_increment_id
)
```

A criação/ativação de versão continua transacional.

---

# 47. TB-142 — Durable invalidation lifecycle

`projection invalidation / outbox` é durável e reconstruível.

Cada item possui, conforme aplicável:

```text
id
kind
aggregate/resource ref
source version/watermark
created_at
available_at
claimed_at
claim_generation
processed_at
attempt_count
last_error
```

Consumo usa claim concorrente seguro.

Reprocessamento é permitido porque a consequência é:

```text
invalidate
→ canonical refetch
```

e não mutação canônica duplicada.

Regras:

```text
NOTIFY may wake................ OPTIONAL
outbox row is durable.......... REQUIRED
duplicate invalidation......... SAFE
lost NOTIFY.................... SAFE
processed retention............ CONFIGURABLE
unprocessed item age........... OBSERVABLE
```

Multi-instance web futura não depende de uma notification única.

---

# 48. TB-143 — Database role defense-in-depth

Roles mínimas permanecem:

```text
naamive_migrator
naamive_app
```

Para DEV/PRE-HML inicial, `web` e `worker` podem compartilhar `naamive_app`.

Isso é uma simplificação operacional explícita, não equivalência de authority.

Antes de produção, a readiness deverá decidir e provar uma das opções:

```text
A. separate web/worker runtime roles + schema grants
B. shared runtime role com risco explicitamente aceito +
   architecture guardrails + restricted application paths
```

Independentemente da opção:

```text
PostgreSQL role != AuthorityService
```

---

# 49. TB-144 — Intention / idempotency contract

Quem inicia um command material fornece ou recebe uma `intention_id` estável no
boundary.

O registry usa namespace suficiente para impedir colisão sem transformar uma
intenção em autorização eterna.

Chave conceitual:

```text
principal/initiator scope
command kind
intention_id
```

O registro preserva:

```text
request fingerprint/digest
accepted_at
governing resource/version
authoritative outcome ref
final status
authority context ref
normative_baseline_ref
```

Regras:

```text
same intention + same material payload
→ return/reconstruct same authoritative outcome

same intention + materially different payload
→ reject as idempotency conflict

authority revoked after accepted outcome
→ does not erase historical valid outcome

authority revoked before first acceptance
→ command fails authorization

expired browser/network retry
→ cannot create second authoritative outcome
```

Idempotency record de command governado não é cache descartável de poucos
minutos.

Retenção exata pode ser refinada posteriormente sem perder a capacidade de provar
um outcome autoritativo já materializado.

---

# 50. TB-145 — Physical naming

Database usa:

```text
snake_case
```

Convenção inicial:

```text
tables........ singular snake_case
columns....... snake_case
PK............ id
FK............ <resource>_id
unique........ uq_<table>__<purpose>
check......... ck_<table>__<purpose>
index......... ix_<table>__<purpose>
FK constraint. fk_<table>__<resource>
```

Abreviações obscuras devem ser evitadas.

---

# 51. 2.10R — Remediation result

Findings P1 da `AUD-014`:

```text
TB-AUD-001 decision traceability........ CLOSED by TB-137 + traceability matrix
TB-AUD-002 cross-module Unit of Work.... CLOSED by TB-138
TB-AUD-003 session/authority persistence. CLOSED by TB-139
TB-AUD-004 governing scope FK........... CLOSED by TB-140
```

P2 adicionais fechados durante a remediação:

```text
TB-AUD-005 current target version........ CLOSED by TB-141
TB-AUD-006 invalidation lifecycle........ CLOSED by TB-142
TB-AUD-010 idempotency contract.......... CLOSED by TB-144
```

P3 fechado:

```text
TB-AUD-011 physical naming............... CLOSED by TB-145
```

Explicitamente não fechados neste pacote:

```text
TB-AUD-007 DB-role defense-in-depth....... DEFERRED
TB-AUD-008 compatibility/major floors..... DEFERRED
TB-AUD-009 external evidence protocol..... CONDITIONAL / DEFERRED
TB-AUD-012 operational cadences........... DEFERRED
TB-AUD-013 search/read-model threshold.... DEFERRED
```

Esses itens não são P0/P1 e não impedem o freeze gate definido pela auditoria.

---

# 52. 2.10V — Focused verification

Verification evidence:

```text
audits/AUD-015_TECHNOLOGY_BASELINE_2_10V_VERIFICATION.md
```

Resultado:

```text
P0 = 0
P1 = 0
freeze gate = PASS
```

Technology Baseline v0.10 passou no gate técnico e foi posteriormente submetida
ao gate humano do 2.11.

---

# 53. 2.11 — Human Approval / Freeze

Human decision:

```text
APPROVED
```

Approved by:

```text
Manuel Hinojosa
NAAMIVE Project Owner
2026-09-10
```

Approved candidate:

```text
technology/01_TECHNOLOGY_BASELINE.md
version 0.10
candidate source checkpoint:
4197b566877fcff4e6bb103dc16af9c1ab2e7c9b
```

Gate evidence at approval:

```text
P0 = 0
P1 = 0
freeze gate = PASS
traceability = 290/290
```

Result:

```text
Technology Baseline v0.10
APPROVED / FROZEN
```

Approval evidence:

```text
technology/09_TECHNOLOGY_BASELINE_2_11_APPROVAL_RECORD.md
technology/10_TECHNOLOGY_BASELINE_2_11_FREEZE_MANIFEST.md
```

This approval does not:

```text
change NB-0002
authorize implementation
complete or start TIR
```

---

# 54. Freeze rule

The frozen technical decision set is identified by the freeze manifest.

Changes to a frozen technical decision require explicit technical change
governance and cannot be introduced silently by implementation.

Operational/editorial documents may evolve without silently changing the frozen
technical meaning.

Current terminal state of this documentation round:

```text
TECHNOLOGY BASELINE DOCUMENTATION ROUND 2
COMPLETE

Technology Baseline........ APPROVED / FROZEN
TIR........................ NOT STARTED
Implementation............. NOT AUTHORIZED
```

This package stops here.
