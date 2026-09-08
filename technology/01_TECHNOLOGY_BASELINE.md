# NAAMIVE — Technology Baseline

**Status:** CANDIDATE FOR TECHNICAL AUDIT  
**Versão:** 0.9  
**Natureza:** baseline técnica derivada; não normativa  
**Deriva de:** `NB-0002`  
**Normative Baseline vigente:** `NB-0002` — RATIFIED / IN FORCE  
**Brainstorms consolidados:** 2.1–2.8  
**Implementação:** NOT AUTHORIZED  
**Próxima etapa:** 2.10 — Technical / Destructive Audit  
**Última atualização:** 2026-09-08

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

# 39. Critério de implementation readiness

Código permanece bloqueado.

Sequência:

```text
2.9 Consolidation
→ 2.10 Technical / Destructive Audit
→ remediation if necessary
→ 2.11 Approval / Freeze
→ Technical Implementation Readiness
→ First Vertical Slice
```

A Technology Baseline somente autoriza implementação após fechamento técnico
explícito.

---

# 40. Estado consolidado

```text
Normative Baseline........ NB-0002 — RATIFIED / IN FORCE
Technology Baseline....... CANDIDATE FOR TECHNICAL AUDIT
Brainstorms 2.1–2.8....... CONSOLIDATED
Implementation............ NOT AUTHORIZED
Next...................... 2.10 Technical / Destructive Audit
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
2.7 UI Runtime / Real-Time................ CONSOLIDATED
2.8 PostgreSQL Physical Persistence....... CONSOLIDATED
```

Os documentos de brainstorm permanecem como evidência histórica de decisão.

Este arquivo passa a ser a fonte técnica consolidada para o **2.10**.
