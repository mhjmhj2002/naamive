# NAAMIVE — Technology Baseline Brainstorm 2.8
## PostgreSQL Physical Persistence Design

**Status:** APPROVED  
**Versão:** 0.2  
**Natureza:** desenho técnico derivado; não normativo  
**Deriva de:** `NB-0002`  
**Technology Baseline:** working technical design  
**Último passo aprovado:** 2.7 — Application Shell / UI Runtime / Real-Time  
**Aprovação:** Manuel Hinojosa — NAAMIVE Project Owner — 2026-09-08  
**Implementação:** NOT AUTHORIZED  
**Resultado:** Brainstorm 2.8 fechado e aprovado  
**Próximo passo:** 2.9 — Technology Baseline consolidation

---

# 1. Objetivo

Definir como PostgreSQL materializa fisicamente as garantias já ratificadas em
`NB-0002`.

Este documento não redefine:

```text
lifecycle
authority
terminalidade
causalidade
baseline
ValueIncrement
DeliveryTarget
PhaseCycle
DevelopmentRoadmap
Execution
Delivery
```

Ele responde:

```text
como representar fisicamente essas verdades?
como impedir estados impossíveis?
como preservar history?
como sobreviver concorrência/restart?
como suportar web + worker + Activity Center?
```

---

# 2. Princípio central

A persistência física será organizada em cinco categorias distintas:

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

---

# 3. Banco inicial

## D2.8-01 — Uma instância PostgreSQL, um database da aplicação

No MVP:

```text
PostgreSQL
└── naamive
```

Não criar bancos independentes por capability.

Motivo:

```text
atomicidade transacional
foreign keys
constraints
simplicidade operacional
backup/restore único
baixo custo de desenvolvimento
```

A separação será lógica dentro do mesmo database.

---

# 4. Namespaces físicos

## D2.8-02 — PostgreSQL schemas por ownership

Usar schemas PostgreSQL para reforçar ownership lógico.

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

Os nomes finais podem sofrer refinamento no 2.9 sem mudar o princípio.

Objetivo:

```text
módulo dono
→ schema dono
→ tabelas privadas
```

Não usar um `public` gigantesco com todas as entidades misturadas.

---

## D2.8-03 — Schema não concede acesso cruzado

Mesmo no mesmo database:

```text
schema A
não significa
livre acesso de domínio ao schema B
```

Código de módulo só deve manipular persistência privada do próprio ownership.

Foreign keys inter-schema podem existir quando preservam identidade/integridade,
mas não autorizam writes cruzados arbitrários.

---

# 5. Identificadores

## D2.8-04 — PostgreSQL UUID como tipo padrão de identity

Recursos governados usam:

```text
uuid
```

como tipo físico padrão de ID.

Preferência de geração:

```text
time-ordered UUID / UUIDv7
```

gerado fora da semântica de negócio.

A biblioteca exata fica para consolidação/implementação.

Não usar ID incremental global como identidade pública do domínio.

---

## D2.8-05 — IDs não carregam semântica

Proibido inferir de ID:

```text
ordem normativa
currentness
version
state
authority
```

ID identifica.

State/version/history são campos próprios.

---

# 6. Versionamento concorrente

## D2.8-06 — `version bigint` para current state mutável

Recursos mutáveis relevantes possuem:

```text
version bigint not null
```

Atualização autoritativa segue conceito:

```sql
UPDATE ...
SET ..., version = version + 1
WHERE id = :id
  AND version = :expected_version
```

Se nenhuma linha for alterada:

```text
STALE / CONCURRENCY CONFLICT
```

A application layer decide a resposta sem reinterpretar o estado.

---

## D2.8-07 — Version não identifica currentness histórica

`MAX(version)` não é fonte universal de currentness.

Recursos versionados materiais usam currentness explícita quando necessário:

```text
is_current
superseded_at
superseded_by
current_version_id
```

conforme o agregado.

---

# 7. Tempo

## D2.8-08 — `timestamptz` para instantes

Instantes técnicos/auditáveis usam:

```text
timestamptz
```

Exemplos:

```text
created_at
updated_at
occurred_at
started_at
completed_at
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
lease_expires_at
```

O sistema trata esses valores como instantes absolutos.

Timezone de apresentação é responsabilidade de boundary/UI.

---

## D2.8-09 — Tempo autoritativo server-side

Fatos materiais não aceitam timestamp autoritativo arbitrário do browser.

Quando o instante representa fato produzido pelo sistema:

```text
server/database clock
```

é a referência.

Tempo informado pelo usuário pode existir como dado de negócio separado.

---

# 8. Current State + History

## D2.8-10 — Não adotar Event Sourcing total

O NAAMIVE não será implementado inicialmente como event-sourced system completo.

Modelo:

```text
current table
+
append-only history/transition tables
```

Motivo:

```text
queries atuais simples
constraints físicas diretas
menor complexidade
history preservada
rebuild parcial possível
```

---

## D2.8-11 — Transition/history append-only

Mudanças governadas materiais produzem registro histórico append-only.

Campos comuns conceituais:

```text
history_id
resource_id
from_state
to_state
resource_version
cause_ref
correlation_id
intention_id
principal_ref
authority_ref
business_baseline_ref
normative_baseline_ref
occurred_at
metadata
```

Nem todos são obrigatórios em toda tabela; aplicam-se conforme semântica.

---

## D2.8-12 — Sem UPDATE de history material

History governada:

```text
INSERT only
```

Correção ocorre por:

```text
supersession
reversal
compensation
new fact
```

e nunca por reescrever silenciosamente fato histórico.

---

# 9. Atomicidade de command

## D2.8-13 — Uma transação PostgreSQL por command local

Quando toda a operação é local ao database, o command material deve produzir em
uma única transação:

```text
revalidate current state
revalidate authority/context
update current state
append history
persist decision/evidence refs
update continuity
create durable handoff/dispatch se necessário
publish projection invalidation durável se necessário
commit
```

Ou tudo aparece, ou nada aparece.

---

## D2.8-14 — Sem dual-write não protegido

Proibido:

```text
UPDATE canonical state
COMMIT
depois tentar gravar handoff
```

quando o handoff é necessário para continuidade.

O durable handoff deve nascer na mesma transação quando fisicamente possível.

---

# 10. Isolation e locking

## D2.8-15 — `READ COMMITTED` como default

Default:

```text
READ COMMITTED
```

com:

```text
optimistic version checks
unique constraints
foreign keys
SELECT ... FOR UPDATE
```

nos pontos necessários.

Não elevar todo o sistema para `SERIALIZABLE` sem necessidade.

---

## D2.8-16 — Locks explícitos para invariantes concorrentes

Usar row locking quando a decisão depende do estado corrente de recurso
específico.

Exemplo:

```text
DeliveryTarget current
Project transition
claim de Execution
```

Constraints continuam sendo última defesa para invariantes estruturais.

---

# 11. DeliveryTarget

## D2.8-17 — Estrutura física em três níveis

Conceito:

```text
delivery_target
delivery_target_version
delivery_target_membership
```

`delivery_target` possui identidade estável.

`delivery_target_version` preserva cada composição material.

`delivery_target_membership` liga uma versão a ValueIncrements.

---

## D2.8-18 — Um DeliveryTarget current por Project

Currentness deve ser explícita.

Constraint equivalente a:

```sql
UNIQUE (project_id)
WHERE is_current = true
```

deve impedir dois targets autoritativos correntes no MVP.

A condição física exata pode incluir candidacy scope se o modelo futuro exigir.

---

## D2.8-19 — Membership pertence à versão

Chave lógica:

```text
delivery_target_version_id
+
value_increment_id
```

Disposition:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Não gravar disposition como atributo eterno da ValueIncrement.

---

## D2.8-20 — Troca de target version é transacional

Criar nova versão envolve, como unidade:

```text
new version
membership set
decision
authority refs
history
supersession/currentness
continuity impact
```

Currentness anterior só é desligada junto da ativação consistente da nova.

---

# 12. DeliveryManifest

## D2.8-21 — Manifest header + immutable items

Persistência conceitual:

```text
delivery_manifest
delivery_manifest_item
```

Manifest identifica exatamente:

```text
Project
DeliveryTarget
DeliveryTargetVersion
candidate baseline
decision context
created_at
```

Itens preservam:

```text
ValueIncrement
disposition
included/excluded fact
acceptance/evidence ref
```

Depois de materializado para decisão/delivery:

```text
immutable
```

---

## D2.8-22 — Snapshot exato, não query futura

O conteúdo apresentado para decisão não deve ser reconstruído posteriormente
consultando apenas estado atual.

O Manifest é o snapshot durável da candidatura exata.

---

# 13. ValueIncrement

## D2.8-23 — Current + history + lineage

Estrutura conceitual:

```text
value_increment
value_increment_history
value_increment_lineage
```

Lineage representa:

```text
split
successor
replacement
correction
```

Origem nunca é apagada.

---

## D2.8-24 — Exactly one Module owner

ValueIncrement normal possui:

```text
module_id NOT NULL
```

e integridade referencial com o business Module owner.

---

# 14. Work Item

## D2.8-25 — Governing scope explícito

Work Item deve representar exatamente um governing scope.

Modelo conceitual:

```text
scope_type
scope_id
```

ou relações físicas equivalentes com constraint.

Escopos aceitos pelo modelo vigente:

```text
VALUE_INCREMENT
PROJECT_TRANSVERSAL
```

Não aceitar combinação ambígua.

---

## D2.8-26 — DevelopmentCycle separado

Passagem:

```text
IN_REVIEW → IN_PROGRESS
```

não recicla a mesma instância interna.

Persistir:

```text
development_cycle
development_cycle_step/history
```

com predecessor causal quando houver retorno.

---

# 15. Project PhaseCycle

## D2.8-27 — PhaseCycleInstance é first-class table

Conceito:

```text
phase_cycle_instance
```

Campos essenciais:

```text
id
project_id
project_phase
generation
status
is_current
previous_cycle_id
phase_entry_transition_ref
business_baseline_ref
normative_baseline_ref
cause_ref
current_step_id
started_at
completed_at
version
```

---

## D2.8-28 — Reentry cria nova row

Se Project volta para fase anteriormente visitada:

```text
não reabre PhaseCycle antiga
```

Cria:

```text
new phase_cycle_instance
previous_cycle_id = old cycle
generation = successor
```

---

## D2.8-29 — Um current PhaseCycle coerente com Project

Constraint/transação deve impedir duas PhaseCycleInstances autoritativas current
para o mesmo Project.

A transition de Project e a criação/ativação da nova PhaseCycle devem formar
unidade consistente.

---

# 16. PhaseStep

## D2.8-30 — PhaseStepInstance persistida

Conceito:

```text
phase_step_instance
```

Campos essenciais:

```text
phase_cycle_id
semantic_step
status
ordinal
started_at
completed_at
wait/block refs
functional_progress_ref
version
```

Estados físicos devem representar de forma inequívoca:

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

# 17. DevelopmentRoadmap

## D2.8-31 — Roadmap possui identidade estável

Estrutura:

```text
development_roadmap
roadmap_version
roadmap_entry
```

RoadmapEntry referencia recurso canônico; não duplica seu lifecycle state.

---

## D2.8-32 — Roadmap versionado

Mudança material de ordem/composição gera versão.

Currentness explícita:

```text
current_version_id
```

ou mecanismo equivalente.

Não inferir pela maior versão numérica.

---

## D2.8-33 — Roadmap restart-safe

Após restart deve ser possível reconstruir:

```text
qual entry estava ativa
qual próxima é elegível
o que está bloqueado
por qual Finding/Decision
qual continuity existe
```

Nada disso pode depender de memória do worker/browser.

---

# 18. Functional Progress

## D2.8-34 — Current functional progress separado de telemetry

Persistir current:

```text
resource_type
resource_id
semantic_step_ref
last_functional_progress_at
progress_summary
progress_evidence_ref
version
```

Não confundir com heartbeat.

---

## D2.8-35 — Três relógios permanecem separados

Campos/recursos distintos:

```text
last_heartbeat_at
last_operational_activity_at
last_functional_progress_at
```

Atualizar heartbeat não atualiza functional progress automaticamente.

---

# 19. Execution

## D2.8-36 — Execution attempt é immutable identity

Cada tentativa:

```text
execution
```

possui identidade própria.

FAILED/CANCELLED/EXPIRED não voltam a RUNNING.

Retry/recovery cria nova row e preserva:

```text
origin_execution_id
cause_ref
intention_id
correlation_id
```

---

## D2.8-37 — Claim operacional separado

Não colocar lease como verdade de lifecycle.

Estrutura conceitual:

```text
execution
execution_claim
```

Claim guarda:

```text
execution_id
worker_instance_id
fencing_generation
claimed_at
lease_expires_at
last_heartbeat_at
```

Claim expirada revoga authority operacional.

---

## D2.8-38 — Fencing generation monotônica

Para cada responsabilidade executável:

```text
fencing_generation bigint
```

Nova authority recebe geração superior.

Publish autoritativo exige geração corrente.

Resultado de executor stale é rejeitado.

---

# 20. Durable dispatch

## D2.8-39 — `ops.dispatch_item`

O handoff web → worker terá estrutura durável conceitual:

```text
ops.dispatch_item
```

Campos:

```text
id
intention_id
execution_id
kind
status
available_at
attempt_context
created_at
claimed_at
completed_at
version
```

O dispatch não substitui Execution.

---

## D2.8-40 — Claim com `FOR UPDATE SKIP LOCKED`

Worker obtém trabalho elegível usando padrão equivalente a:

```sql
SELECT ...
FOR UPDATE SKIP LOCKED
```

dentro de transação curta de claim.

Execução longa ocorre fora do lock físico da row.

---

## D2.8-41 — Polling com wake-up opcional

Fonte durável:

```text
PostgreSQL table
```

Otimização opcional:

```text
LISTEN / NOTIFY
```

pode acordar worker/web mais rápido, porém:

```text
NOTIFY != durable queue
```

Perder notification não pode perder trabalho.

---

# 21. Idempotency

## D2.8-42 — Registry durável de intention

Estrutura conceitual:

```text
ops.idempotency_record
```

Chave:

```text
principal/scope
+
intention_id
+
command kind
```

ou composição equivalente.

---

## D2.8-43 — Intention record guarda outcome

Deve permitir responder:

```text
a intenção já foi aceita?
qual command/result corresponde?
qual resource/version foi produzido?
```

Registro não é cache efêmero.

---

# 22. Effect certainty / external effects

## D2.8-44 — External effect state explícito

Quando houver efeito fora do PostgreSQL:

```text
NO_EFFECT
EFFECT_CONFIRMED
PARTIAL_EFFECT
WRONG_EFFECT
UNKNOWN
```

ou representação equivalente.

---

## D2.8-45 — UNKNOWN força reconciliation

Se resultado externo for incerto:

```text
não retry cego
```

Persistir reconciliation necessária antes de nova tentativa quando duplicação for
materialmente perigosa.

---

# 23. Findings e Inconsistencies

## D2.8-46 — Canonical tables, não somente logs

Conceito:

```text
governance.finding
governance.finding_history
governance.inconsistency
governance.inconsistency_history
```

Log/telemetry podem referenciar esses IDs, mas não substituí-los.

---

## D2.8-47 — affected scope explícito

Finding material preserva:

```text
severity
affected_scope_type
affected_scope_id
cause_ref
owner
status
remediation
continuity
normative_baseline_ref
```

Sem blocker sem escopo.

---

# 24. Authority / audit / evidence

## D2.8-48 — Authority history append-only

Grants/delegations/revocations possuem current representation quando necessária,
mas toda alteração material deixa history append-only.

Decisão histórica continua reproduzível.

---

## D2.8-49 — Audit separado de application log

Audit material usa persistência própria:

```text
audit.audit_record
```

e não arquivo de log como única evidência.

---

## D2.8-50 — Evidence por referência íntegra

Evidence metadata pode usar:

```text
evidence.evidence_record
```

com:

```text
id
kind
content_ref / external_ref
digest
source
created_at
principal_ref
correlation_id
```

Conteúdo grande pode viver fora do PostgreSQL futuramente, desde que a referência
canônica preserve origem/integridade.

---

# 25. JSONB

## D2.8-51 — JSONB como extensão, não modelagem principal

Permitido para:

```text
metadata
provider-specific payload
evidence metadata
immutable diagnostic snapshot
rare extensibility
```

Não usar JSONB para esconder estrutura central como:

```text
Project lifecycle
DeliveryTarget membership
ValueIncrement ownership
authority grants
Execution state
```

quando relação/constraint relacional é necessária.

---

# 26. Enums

## D2.8-52 — Lifecycle states não dependem de PostgreSQL ENUM rígido

Preferência física:

```text
text/varchar
+
CHECK constraint
```

ou tabela de valores controlados quando houver necessidade.

Motivo:

```text
migrations mais simples
evolução controlada
menos acoplamento ao type catalog
```

Os valores continuam definidos pelo domínio, não pelo banco.

---

# 27. Foreign Keys

## D2.8-53 — FK para identidade estrutural crítica

Usar FK para relações que não podem ser órfãs, por exemplo:

```text
Project → Need
Module → Project
ValueIncrement → Module
WorkItem → ValueIncrement quando aplicável
Execution → WorkItem
DeliveryTarget → Project
Membership → DeliveryTargetVersion + ValueIncrement
PhaseCycle → Project
```

---

## D2.8-54 — Sem cascade delete de governados

Regra:

```text
ON DELETE CASCADE
```

não deve apagar cadeia governada/histórica.

Preferir:

```text
RESTRICT / NO ACTION
```

e lifecycle explícito.

Cascade pode existir apenas em dados técnicos descartáveis claramente não
governados.

---

# 28. Deletes

## D2.8-55 — Governed resource não usa hard delete operacional

Recursos governados usam:

```text
state terminal
archive marker
supersession
```

conforme semântica.

Não usar botão "delete" para apagar história.

---

# 29. Indexes

## D2.8-56 — Índices derivados de access patterns reais

Baseline inicial exige índices para:

```text
foreign keys
current resource lookup
project hierarchy
current DeliveryTarget
roadmap active entries
eligible dispatch items
execution claims/lease expiry
intention/idempotency
correlation
recent Activity Center queries
```

Não criar dezenas de índices especulativos.

---

## D2.8-57 — Partial indexes para current/eligible

Quando aplicável:

```text
WHERE is_current
WHERE status = 'ELIGIBLE'
WHERE completed_at IS NULL
WHERE lease_expires_at < now()
```

para manter queries operacionais pequenas.

---

# 30. Projection persistence

## D2.8-58 — Não persistir toda projection no primeiro dia

A API pode construir projections a partir de current canonical state e relações
necessárias.

Persistir read models dedicados somente quando:

```text
query complexa
Activity Center
performance
fan-out
repeated aggregation
```

justificarem.

---

## D2.8-59 — Projection materializada é rebuildable

Toda projection persistida deve possuir:

```text
source watermark/version
rebuild strategy
staleness detection
```

Nunca vira source of truth.

---

# 31. Real-time invalidation

## D2.8-60 — Durable invalidation/outbox record

Mudança que exige atualização realtime pode registrar, na mesma transação:

```text
projection invalidation / outbox record
```

contendo somente informação suficiente para invalidar/refetch.

---

## D2.8-61 — `LISTEN/NOTIFY` pode acelerar, não garantir

Fluxo:

```text
canonical commit
→ durable invalidation
→ optional NOTIFY
→ SSE
→ browser invalidates query
→ canonical refetch
```

Se NOTIFY se perder:

```text
poll/reconnect/refetch
```

reconstrói estado.

---

# 32. Migrations

## D2.8-62 — Migrations versionadas no repositório

Schema físico nasce de migrations versionadas e revisadas.

Ferramenta proposta:

```text
Kysely migration infrastructure
+
SQL explícito quando necessário
```

Migrations fazem parte do código auditável.

---

## D2.8-63 — Forward-only em ambientes governados

Não depender de rollback destrutivo como estratégia normal.

Padrão:

```text
expand
migrate/backfill
switch
contract
```

Rollback de application release não deve exigir apagar fatos novos válidos.

---

## D2.8-64 — Migration lock

Somente um processo executa migrations por database/ambiente.

Usar mecanismo de lock PostgreSQL/advisory lock ou equivalente.

---

## D2.8-65 — Backfill explícito e observável

Backfill material deve possuir:

```text
idempotência
checkpoint
progress
failure visibility
re-run safety
```

e não uma migration gigante opaca quando houver volume significativo.

---

# 33. Schema ownership no código

## D2.8-66 — Migrations organizadas por capability

Estrutura conceitual:

```text
packages/
  persistence/
    migrations/
      platform/
      project/
      value-delivery/
      execution/
      governance/
      ...
```

ou equivalente.

A forma exata será consolidada no 2.9.

---

# 34. Transaction API

## D2.8-67 — Unit of Work explícita

Application command deve poder abrir transaction boundary explícita.

Repositories recebem transaction/context quando necessário.

Não esconder commits internos dentro de repositories chamados pela mesma operação.

---

## D2.8-68 — Domain não recebe Kysely

Regra já aprovada permanece:

```text
domain
does not depend on
Kysely / pg / SQL
```

Persistence adapters implementam ports/contracts da application/domain boundary.

---

# 35. Database roles

## D2.8-69 — Roles separados por responsabilidade operacional

Mínimo conceitual:

```text
naamive_migrator
naamive_app
```

O migrator pode alterar schema.

A aplicação normal não deve possuir DDL amplo.

Worker e web podem inicialmente compartilhar role de application runtime se o
modelo de deployment justificar, sem compartilhar human authority.

Role PostgreSQL não substitui AuthorityService.

---

# 36. Secrets

## D2.8-70 — Connection string fora do repositório

Credenciais de database:

```text
environment/secret injection
```

Nunca commitadas.

Local development pode usar credencial descartável definida pelo compose local.

---

# 37. Backup / restore

## D2.8-71 — Restore test faz parte da readiness

A Technology Baseline exige que o mecanismo escolhido no deployment consiga
restaurar:

```text
current state
history
versions
idempotency
authority lineage
dispatch/continuity
```

e que restore seja testado antes de PROD readiness.

A ferramenta concreta de backup permanece decisão operacional de 2.9/2.11 se
ainda não estiver fechada pelo Deployment Model.

---

## D2.8-72 — Após restore, reconciliation obrigatória

Depois de restore/restart:

```text
não assumir trabalho in-flight saudável
```

Executar reconciliation de:

```text
Execution RUNNING
claims/leasing
pending dispatch
unknown external effect
pending handoff
roadmap continuity
```

---

# 38. Retention / partitioning

## D2.8-73 — Sem partitioning prematuro

Não particionar tabelas governadas no MVP sem volume que justifique.

Preparar design para futura partitioning de alto volume em:

```text
telemetry
operational events
audit de grande escala
```

sem alterar identidade lógica.

---

## D2.8-74 — Telemetry pode compactar; history governada não

Heartbeat histórico de alta frequência pode ter retenção.

Transitions/decisions/baseline lineage necessários à auditabilidade não são
apagados por idade.

---

# 39. Naming

## D2.8-75 — `snake_case` físico

Database usa:

```text
snake_case
```

Tables no singular ou plural devem seguir uma convenção única a ser fechada no
2.9.

IDs:

```text
<resource>_id
```

Foreign keys explícitas.

Evitar abreviações obscuras.

---

# 40. Invariantes físicas obrigatórias

O schema final deve conseguir provar, por constraint/transação/teste de
arquitetura, pelo menos:

```text
no orphan governed resource
no lost update
no two current DeliveryTargets per Project
no two current PhaseCycles per Project
membership belongs to exact target version
FAILED Execution never reused
stale fencing generation cannot publish
one authoritative outcome per intention
history append-only
Manifest immutable after materialization
currentness explicit
heartbeat != functional progress
handoff durable
roadmap restart-safe
```

---

# 41. Testes de persistência

## D2.8-76 — Integration tests com PostgreSQL real

Regras críticas de DB devem ser testadas contra PostgreSQL real em container.

Não aceitar SQLite/in-memory DB como prova de:

```text
locking
SKIP LOCKED
partial unique index
foreign keys
transaction isolation
fencing
concurrent claim
```

---

## D2.8-77 — Concurrent destructive tests

Testes devem tentar simultaneamente:

```text
criar dois current DeliveryTargets
ativar duas PhaseCycles
claimar mesma Execution
publicar com fencing stale
aplicar mesma intention duas vezes
alterar row com expected_version stale
```

Esperado:

```text
uma authority vence
demais falham de forma controlada
```

---

# 42. Decisões explicitamente não adotadas

```text
multiple databases per module........ NOT NOW
full Event Sourcing................... NOT NOW
external broker....................... NOT NOW
Redis as truth........................ FORBIDDEN
filesystem as canonical state......... FORBIDDEN
PostgreSQL ENUM everywhere............ NOT PREFERRED
hard delete of governed history....... FORBIDDEN
generic JSONB domain database.......... FORBIDDEN
projection as source of truth......... FORBIDDEN
global SERIALIZABLE isolation......... NOT REQUIRED
blind retry of UNKNOWN effect.......... FORBIDDEN
```

---

# 43. Pontos abertos para 2.9 / implementação

```text
exact PostgreSQL major version
exact UUIDv7 library
exact schema names
singular vs plural table naming
exact migration folder layout
exact backup tool
exact polling cadence
exact lease duration
exact heartbeat cadence
exact retention windows
which projections deserve physical read models in first vertical slice
```

Esses pontos não impedem aprovar o desenho estrutural do 2.8.

---

# 44. Resultado proposto

```text
single PostgreSQL database
schemas by ownership
uuid identities
version bigint optimistic concurrency
current tables + append-only history
explicit currentness
timestamptz
READ COMMITTED default
row locks + constraints
DeliveryTarget header/version/membership
immutable DeliveryManifest
PhaseCycle / PhaseStep first-class
DevelopmentCycle first-class
DevelopmentRoadmap versioned
FunctionalProgress durable
Execution separate from operational claim
fencing generation
durable PostgreSQL dispatch
idempotency registry
effect certainty + reconciliation
Finding/Inconsistency canonical persistence
audit/evidence separated from logs
JSONB only as extension
FKs without governed cascade delete
derived/rebuildable projections
durable realtime invalidation
forward-only migrations
real PostgreSQL concurrency tests
```

---

# 45. Fechamento do Brainstorm 2.8

Decisão humana registrada:

```text
Technology Baseline 2.8.............. APPROVED
PostgreSQL Physical Persistence...... APPROVED
Implementation authorization......... NO
```

A aprovação ainda não autoriza implementação.

Próxima etapa:

```text
2.9 — Technology Baseline consolidation
```

No 2.9, decisões 2.1..2.8 são consolidadas em uma Technology Baseline coerente,
sem duplicações e derivada integralmente de `NB-0002`.
