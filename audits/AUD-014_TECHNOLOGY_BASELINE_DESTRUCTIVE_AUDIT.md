# NAAMIVE — AUD-014 Technology Baseline Technical / Destructive Audit

**Status:** COMPLETE — REMEDIATION REQUIRED  
**Natureza:** technical destructive audit evidence; non-normative  
**Audited artifact:** `technology/01_TECHNOLOGY_BASELINE.md`  
**Audited version:** `0.9 — CANDIDATE FOR TECHNICAL AUDIT`  
**Normative authority:** `NB-0002` — RATIFIED / IN FORCE  
**Repository checkpoint:** `9c9e0969967e2b4f0de17cccbdfdfe4ccc3703fb`  
**Audit date:** 2026-09-09  
**Implementation:** NOT AUTHORIZED

---

# 1. Objetivo

Tentar quebrar a Technology Baseline antes do freeze.

A auditoria não pergunta apenas:

```text
o desenho parece bom?
```

Ela tenta provar:

```text
há contradição com NB-0002?
há decisão técnica aprovada perdida na consolidação?
é possível produzir estado impossível?
concorrência permite dupla autoridade?
restart perde continuidade?
security/authority sobrevive restart e revocation?
module ownership entra em conflito com atomicidade?
o desenho físico consegue provar no-orphan?
o sistema consegue recuperar de falha parcial?
```

---

# 2. Escala de severidade

```text
P0
viola NB-0002, quebra autoridade/canonical truth ou permite corrupção material
sem contenção arquitetural aceitável.

P1
bloqueia Technology Baseline 2.11 approval/freeze.
Precisa de remediação antes do freeze.

P2
não invalida a arquitetura estrutural, mas precisa ser fechado antes da
Technical Implementation Readiness ou antes da vertical slice afetada.

P3
melhoria/precisão operacional. Pode permanecer como decisão de implementação
explicitamente rastreada.
```

Gate para 2.11:

```text
P0 = 0
P1 = 0
```

---

# 3. Resultado executivo

```text
P0................ 0
P1................ 4
P2................ 6
P3................ 3

FREEZE GATE........ FAIL
IMPLEMENTATION..... NOT AUTHORIZED
```

A arquitetura central permanece viável.

Não foi encontrado motivo para reabrir `NB-0002`.

O bloqueio é técnico e concentrado na consolidação/finalização da Technology
Baseline.

---

# 4. P1 — Findings bloqueantes

## TB-AUD-001 — Consolidação 2.9 não prova preservação integral das decisões

**Severidade:** P1  
**Área:** traceability / consolidation  
**Status:** OPEN

O arquivo consolidado `technology/01_TECHNOLOGY_BASELINE.md` declara que
2.1–2.8 foram consolidados, mas não possui uma matriz que prove:

```text
D2.x-y
→ TB-n
ou
→ decisão explicitamente preservada por referência
ou
→ decisão conscientemente superseded
```

A inspeção encontrou decisões materiais aprovadas em 2.7 que não aparecem com
equivalência clara no consolidado, por exemplo:

```text
D2.7-06  route model detalhado
D2.7-12  DTO/projection/command transport contracts
D2.7-16  double-click/pending mutation behavior
D2.7-21  authenticated SSE stream scope
D2.7-28  action descriptors server-derived
D2.7-29  modal/drawer vs dedicated decision surface
D2.7-30  minimum material-decision content
D2.7-31  current state vs timeline
D2.7-32  local Activity history vs Project timeline
D2.7-34  transport error != governed failure
D2.7-35  no eternal spinner
D2.7-44  real-time regression scenarios
D2.7-45  server-side search
D2.7-46  session bootstrap
```

Em 2.8 também existem decisões aprovadas sem equivalência explícita no
consolidado, incluindo:

```text
D2.8-48  authority history append-only
D2.8-66  migrations organized by capability ownership
D2.8-67  explicit Unit of Work
D2.8-75  physical snake_case naming
```

Algumas regras podem estar cobertas semanticamente por outras seções ou pela
NB-0002. O problema destrutivo é outro:

```text
não existe prova de que a redução não perdeu decisão técnica aprovada
```

**Risco:**

Uma implementação pode obedecer ao arquivo consolidado e ainda contrariar uma
decisão previamente aprovada.

**Remediação obrigatória:**

Criar traceability completa 2.1–2.8 e:

```text
RESTORE
ou
MAP
ou
EXPLICITLY SUPERSEDE
```

cada decisão material.

Nenhuma decisão aprovada pode simplesmente desaparecer por compressão editorial.

---

## TB-AUD-002 — Atomicidade cross-module vs ownership não está fechada

**Severidade:** P1  
**Área:** modular monolith / transaction boundary  
**Status:** OPEN

A baseline exige simultaneamente:

```text
module owns its data
no cross-module direct DB writes
one PostgreSQL transaction for a local material command
state + history + continuity + handoff atomically
```

Mas a consolidação não preservou explicitamente a decisão de **Unit of Work**
do 2.8 e não fecha como um command que cruza capabilities participa da mesma
transaction sem:

```text
A repository writing B tables
ou
cada module fazendo commit independente
```

Cenário destrutivo:

```text
Project transition
→ cria PhaseCycle
→ produz continuity
→ cria durable dispatch
```

Se os recursos pertencem a boundaries diferentes, há duas saídas ruins:

```text
1. coordinator viola ownership e escreve tabelas alheias;
2. módulos fazem commits separados e surge partial canonical state.
```

**Remediação obrigatória:**

Fixar no consolidated baseline:

```text
Application Coordinator
→ opens UnitOfWork / transaction
→ calls module application/public persistence ports
→ each module writes only its own tables
→ all adapters participate in the same transaction context
→ one commit at boundary
```

Repositories não podem esconder commit próprio dentro da operação coordenada.

---

## TB-AUD-003 — Server-side session / authority persistence física incompleta

**Severidade:** P1  
**Área:** security / persistence / restart  
**Status:** OPEN

A baseline aprova:

```text
opaque server-side session
expiration
revocation
scoped grants
baseline-aware authority
HUMAN / SERVICE / AGENT / EXECUTOR
security audit
```

Mas o desenho físico consolidado não fecha como persistir de forma restart-safe:

```text
session identity/hash
session expiration
session revocation
principal status
grant current state
grant history
delegation
revocation
authority source
baseline binding
```

Cenário destrutivo:

```text
web reinicia
+
sessão humana continua no browser
+
grant foi revogado antes/durante restart
```

A aplicação precisa provar, no primeiro request após restart, que:

```text
session ainda existe
principal ainda é válido
grant ainda é válido
scope ainda é válido
baseline ainda é compatível
```

Sem store durável explícito, a regra pode virar memória de processo ou
implementação ad hoc.

**Remediação obrigatória:**

Adicionar ao desenho físico, no mínimo:

```text
security/auth session persistence
principal persistence
grant/delegation/revocation current + append-only history
indexes for active/expiry/revocation lookup
session rotation/revocation semantics
```

Pode permanecer no mesmo PostgreSQL.

---

## TB-AUD-004 — Work Item governing scope ainda permite modelagem sem FK real

**Severidade:** P1  
**Área:** referential integrity / no-orphan  
**Status:** OPEN

A baseline aceita conceitualmente:

```text
scope_type
scope_id
```

ou equivalente.

O problema é físico:

```text
(scope_type, scope_id)
```

polimórfico não pode ser protegido por FK PostgreSQL simples para:

```text
VALUE_INCREMENT
PROJECT_TRANSVERSAL
```

Isso permite uma implementação aparentemente conforme que grave:

```text
scope_type = VALUE_INCREMENT
scope_id   = UUID inexistente
```

violando:

```text
no orphan governed resource
```

**Remediação obrigatória:**

Escolher um modelo enforceável, por exemplo:

```text
Option A
value_increment_id nullable
project_transversal_id/project_id nullable
CHECK exatamente um governing scope
FK física para cada coluna

ou

Option B
governing_scope first-class table
com FK real e tipo fechado
```

A opção final deve impedir orphan no banco, não apenas por convenção de código.

---

# 5. P2 — Findings importantes

## TB-AUD-005 — Current DeliveryTargetVersion precisa constraint explícita

**Severidade:** P2  
**Status:** OPEN

A baseline impede dois `DeliveryTarget` current por Project, mas o freeze deve
também deixar explícito:

```text
um current version por DeliveryTarget
unique membership (target_version_id, value_increment_id)
```

e a ordem transacional da ativação.

---

## TB-AUD-006 — Durable invalidation/outbox não possui lifecycle de consumo

**Severidade:** P2  
**Status:** OPEN

Está correto dizer:

```text
durable invalidation
+
optional NOTIFY
+
SSE
```

Mas falta fechar o mecanismo de:

```text
claim
delivery/replay
dedup
processed watermark
cleanup/retention
multiple web instances no futuro
```

Como a UI refaz canonical fetch, isso não ameaça canonical truth; por isso não é
P1.

---

## TB-AUD-007 — Runtime DB role compartilhado reduz defesa em profundidade

**Severidade:** P2  
**Status:** ACCEPTABLE WITH REMEDIATION

`naamive_app` compartilhado entre web e worker é simples para o MVP, mas o DB
não consegue impedir fisicamente que um adapter comprometido escreva schema
alheio.

Antes de PROD readiness, decidir entre:

```text
separate web/worker roles
schema grants
ou
explicit acceptance of application-level guardrails
```

com teste de arquitetura correspondente.

---

## TB-AUD-008 — Compatibility floor ainda está aberto

**Severidade:** P2  
**Status:** OPEN

Antes da primeira vertical slice, fixar pelo menos majors/floors suportados para:

```text
Node.js
PostgreSQL
TypeScript
Fastify
React
Vite
Kysely
pg
```

Patch/minor pode permanecer lockfile/dependency policy.

Sem major floor, feature support e migration behavior ficam ambíguos.

---

## TB-AUD-009 — External Evidence store precisa protocolo de consistência

**Severidade:** P2  
**Status:** DEFERRED UNTIL EXTERNAL STORE EXISTS

Se evidence grande sair do PostgreSQL, definir:

```text
upload staging
digest verification
canonical DB reference
finalization
orphan cleanup
failure recovery
backup/restore coupling
```

Enquanto evidence permanecer integralmente no PostgreSQL, este finding não
bloqueia.

---

## TB-AUD-010 — Idempotency namespace/retention precisa contrato

**Severidade:** P2  
**Status:** OPEN

Fechar antes da vertical slice que aceita commands materiais:

```text
quem gera intention_id?
qual namespace?
por quanto tempo permanece?
same intention + different payload = reject?
same intention after authority change = replay or reject?
outcome retention
```

Expected version não substitui idempotency.

---

# 6. P3 — Precisões operacionais

## TB-AUD-011 — Naming físico

**Severidade:** P3

Restaurar ou declarar explicitamente:

```text
snake_case
table singular/plural convention
constraint/index naming convention
```

antes de gerar migrations em volume.

---

## TB-AUD-012 — Cadências operacionais

**Severidade:** P3

Permanecem corretamente abertas:

```text
lease duration
heartbeat
polling/backoff
SSE retry
reconciliation cadence
retention windows
```

Devem virar config com defaults testados e limites seguros.

---

## TB-AUD-013 — Search/read-model threshold

**Severidade:** P3

O 2.7 aprovou busca server-side.

Definir no implementation readiness:

```text
MVP search fields
pagination
index strategy
quando criar dedicated projection/read model
```

Não precisa travar o freeze estrutural.

---

# 7. Destructive scenario matrix

## DS-01 — Dois DeliveryTargets current

Ataque:

```text
Tx A cria current DT-A
Tx B cria current DT-B
mesmo Project
```

Esperado:

```text
uma vence
outra falha por constraint/concurrency
```

Resultado da baseline:

```text
PASS
```

---

## DS-02 — Duas target versions current

Ataque:

```text
duas versões concorrentes do mesmo target
```

Resultado:

```text
PARTIAL
```

Motivo: currentness geral está definida, mas constraint física de uma versão
current por target deve ficar explícita.

Finding: `TB-AUD-005`.

---

## DS-03 — Membership duplicada

Ataque:

```text
mesma ValueIncrement entra duas vezes na mesma target version
```

Resultado:

```text
PARTIAL
```

Exigir unique `(target_version_id, value_increment_id)` explicitamente.

---

## DS-04 — Orphan Work Item

Ataque:

```text
scope_type = VALUE_INCREMENT
scope_id = UUID inexistente
```

Resultado:

```text
FAIL
```

Finding: `TB-AUD-004`.

---

## DS-05 — Cross-module partial commit

Ataque:

```text
Project state commit
worker dispatch falha antes de commit próprio
```

Resultado:

```text
FAIL AS CURRENTLY CONSOLIDATED
```

A intenção de atomicidade existe, mas UnitOfWork cross-module precisa ser
restaurada/fechada.

Finding: `TB-AUD-002`.

---

## DS-06 — Dois workers claimam a mesma responsabilidade

Ataque:

```text
worker A e B fazem polling simultâneo
```

Resultado:

```text
PASS
```

`FOR UPDATE SKIP LOCKED` + claim curto + fencing protegem.

---

## DS-07 — Worker stale publica depois da lease

Ataque:

```text
generation 7 expira
generation 8 assume
generation 7 retorna
```

Resultado:

```text
PASS
```

Publish precisa fencing current.

---

## DS-08 — FAILED Execution é reutilizada

Ataque:

```text
UPDATE execution SET status='RUNNING' após FAILED
```

Resultado sem enforcement físico específico:

```text
PASS AT ARCHITECTURE / MUST BE TESTED IN IMPLEMENTATION
```

Baseline proíbe reuse e exige successor causal.

---

## DS-09 — NOTIFY é perdido

Ataque:

```text
canonical commit ocorre
PostgreSQL NOTIFY não chega
```

Resultado:

```text
PASS
```

NOTIFY não é fonte durável; reconnect/poll/refetch recupera.

---

## DS-10 — Outbox é processada duas vezes

Ataque:

```text
dois publishers consomem a mesma invalidation
```

Resultado:

```text
SAFE FOR CANONICAL STATE / PARTIAL FOR OPERATIONS
```

UI refetch é idempotente, mas lifecycle de outbox precisa ser fechado.

Finding: `TB-AUD-006`.

---

## DS-11 — Browser envia command stale

Ataque:

```text
expected_version = 12
current version = 13
```

Resultado:

```text
PASS
```

Command falha, canonical projection é refetched e humano reavalia.

---

## DS-12 — Duplo clique

Ataque:

```text
dois POST quase simultâneos
```

Resultado:

```text
PASS IN PRINCIPLE
```

Pending UI + idempotency + expected version.

Traceability do detalhe de double-click precisa ser preservada em
`TB-AUD-001`.

---

## DS-13 — Duas abas executam a mesma decisão

Ataque:

```text
tab A e tab B possuem mesma projection
ambas enviam decisão
```

Resultado:

```text
PASS
```

Expected version/unique authoritative outcome fazem uma vencer.

---

## DS-14 — Web reinicia com sessões existentes

Ataque:

```text
browser mantém cookie
web process perde memória
```

Resultado:

```text
FAIL UNTIL PHYSICAL SESSION STORE IS CLOSED
```

Finding: `TB-AUD-003`.

---

## DS-15 — Grant revogado durante restart

Ataque:

```text
grant revogado
processo antigo cai
novo processo atende cookie antigo
```

Resultado:

```text
FAIL UNTIL AUTHORITY PERSISTENCE IS CLOSED
```

Finding: `TB-AUD-003`.

---

## DS-16 — Projection atrasada

Ataque:

```text
UI recebe stale projection
```

Resultado:

```text
PASS
```

Projection não é authority; command revalida server-side.

---

## DS-17 — Transport error é confundido com business FAILED

Ataque:

```text
SSE cai
UI marca Execution FAILED
```

Resultado:

```text
RULE EXISTS IN 2.7
TRACEABILITY GAP IN CONSOLIDATED BASELINE
```

Finding: `TB-AUD-001`.

---

## DS-18 — Restore com RUNNING Execution

Ataque:

```text
backup restaurado contendo RUNNING + expired claim
```

Resultado:

```text
PASS
```

Post-restore reconciliation é obrigatória.

---

## DS-19 — Migration parcial

Ataque:

```text
migrator cai durante backfill
```

Resultado:

```text
PASS IN PRINCIPLE
```

Forward-only + lock + checkpointed/idempotent backfill.

Ownership das migrations por capability deve ser restaurado na consolidação.

---

## DS-20 — Technology Baseline omite decisão aprovada

Ataque:

```text
implementador lê somente v0.9
decisão aprovada em 2.7/2.8 não aparece
```

Resultado:

```text
FAIL
```

Finding: `TB-AUD-001`.

---

# 8. O que passou sem finding bloqueante

A auditoria não encontrou quebra estrutural nos seguintes eixos:

```text
Node + TypeScript
web modular monolith + worker
single PostgreSQL
Kysely + pg
Fastify + TypeBox
React + Vite + React Router
TanStack Query
SSE invalidation + canonical refetch
PostgreSQL durable dispatch
SKIP LOCKED
lease + heartbeat + fencing
retry/recovery = successor Execution
current + append-only history
DeliveryTarget/version/membership split
immutable DeliveryManifest
PhaseCycle / PhaseStep persistence
DevelopmentRoadmap durable
three clocks
server-side authority
opaque cookie session concept
CSRF
Argon2id
Pino + OpenTelemetry + Prometheus/Grafana/Loki/Tempo
DEV → PRE-HML → HML → PROD
build once / promote
Docker Compose initial deployment
forward-only migrations
real PostgreSQL destructive concurrency tests
```

O problema não é trocar a arquitetura.

É fechar as quatro lacunas P1 antes de congelá-la.

---

# 9. Remediation gate

Antes do 2.11:

```text
TB-AUD-001........ MUST CLOSE
TB-AUD-002........ MUST CLOSE
TB-AUD-003........ MUST CLOSE
TB-AUD-004........ MUST CLOSE
```

Depois executar verification focada:

```text
V-01 decision traceability complete
V-02 cross-module atomic command has one UnitOfWork
V-03 sessions/grants survive restart and revocation
V-04 governing scope cannot orphan
V-05 no regression in 2.7/2.8 approved decisions
```

Gate:

```text
P0 = 0
P1 = 0
```

Somente então:

```text
2.11 — Technology Baseline approval / freeze
```

---

# 10. Veredito

```text
Technology Baseline architecture......... VIABLE
NB-0002 compatibility.................... PASS
destructive audit........................ COMPLETE
freeze readiness......................... FAIL
implementation authorization............. NO
remediation required..................... YES
```

Não há necessidade de reabrir a baseline normativa.

A próxima ação é uma **remediação técnica localizada**, seguida de verificação.
