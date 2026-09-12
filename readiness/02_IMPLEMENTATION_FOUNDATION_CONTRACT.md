# NAAMIVE — Implementation Foundation Contract

**Status:** APPROVED WITH TIR v1.0  
**Purpose:** executable engineering boundaries for repository bootstrap  
**Implementation:** AUTHORIZED FOR VS-01

---

# 1. Dependency direction

```text
apps
↓
application/public module contracts
↓
domain
```

Infrastructure implements ports.

Forbidden dependency direction:

```text
domain → Fastify
domain → Kysely
domain → pg
domain → React
domain → Vite
domain → Docker
```

---

# 2. Web composition

```text
apps/web
├── server composition
└── client composition
```

Server responsibilities:

```text
HTTP transport
session boundary
CSRF boundary
authorization invocation
command/query mapping
SSE transport
health/metrics exposure
```

Client responsibilities:

```text
AppShell
routing
TanStack Query
typed API client
Activity Center rendering
semantic command initiation
```

Browser never becomes canonical truth or supervisor.

---

# 3. Worker composition

```text
apps/worker
```

Responsibilities:

```text
durable dispatch polling
claim
lease
heartbeat
fencing
execution orchestration
recovery
reconciliation
projection/background processing when assigned
```

Worker cannot bypass AuthorityService/lifecycle rules.

---

# 4. Module contract

Each business module owns:

```text
domain
application
public contract
persistence adapter
tests
```

A module can expose:

```text
commands
queries
application ports
DTO/contracts
domain-safe identifiers/types
```

It does not expose internal repositories/entities by default.

---

# 5. Cross-module transaction

For a material command spanning modules:

```text
Application Coordinator
→ UnitOfWork opens PostgreSQL transaction
→ calls public/application ports
→ each module adapter writes only owned tables
→ all receive same transaction context
→ canonical state/history/continuity/outbox become atomic
→ boundary commit
```

No participating repository commits internally.

---

# 6. HTTP command envelope

Material command request uses:

```text
Idempotency-Key: <opaque UUID>
X-CSRF-Token: <session csrf token>
```

Body contains only command-specific typed payload.

Server maps `Idempotency-Key` to `intention_id`.

Expected-version data belongs to the command contract whenever concurrency
protection applies.

---

# 7. Error categories

Transport/application response must keep distinct:

```text
VALIDATION
AUTHENTICATION
AUTHORIZATION
CONCURRENCY_STALE
IDEMPOTENCY_CONFLICT
GOVERNED_REJECTION
TRANSIENT_INFRASTRUCTURE
UNKNOWN_EXTERNAL_EFFECT
INTERNAL
```

A transport failure cannot be rendered as a governed domain failure.

---

# 8. Persistence convention

```text
database........ naamive
naming.......... snake_case
tables.......... singular
PK.............. id
FK.............. <resource>_id
```

Migrations are forward-only.

Runtime apps do not run migrations automatically at startup.

---

# 9. Environment variables

Secrets/config enter via environment/secret injection.

Never expose server secrets through Vite client build variables.

Client-exposed configuration must be explicitly public and non-secret.

---

# 10. Logging fields

Every material server/worker operation should make available, where applicable:

```text
timestamp
level
service
environment
release_id
correlation_id
causation_id
intention_id
principal_class
operation
outcome
error_class
```

Entity IDs are allowed in logs when needed and appropriately protected, but are
not Prometheus labels by default.

Sensitive values are redacted.

---

# 11. Health

Web:

```text
/health/live
/health/ready
```

Worker must expose equivalent machine-readable health by the deployment
mechanism chosen for the worker container.

`alive != functional progress`.

---

# 12. Bootstrap definition of done

Repository foundation is not complete until:

```text
pnpm workspace boots
web builds
worker builds
PostgreSQL 18.6 starts locally
migrations execute explicitly
schema/roles are created
architecture guardrails run
unit test runs
real-PG integration test runs
frontend behavior test runs
Playwright runs
health endpoints work
structured logging works
```

No fake passing test may substitute for missing implementation.
