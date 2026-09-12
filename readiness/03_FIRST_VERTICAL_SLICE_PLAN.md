# NAAMIVE — First Vertical Slice Plan

**Status:** AUTHORIZED — NOT STARTED  
**Slice:** VS-01 — Authenticated Project Context  
**Authority to start:** APPROVED by Manuel Hinojosa — NAAMIVE Project Owner on 2026-09-10  
**Implementation:** AUTHORIZED

---

# 1. Why this slice

The first slice proves the complete technical path without prematurely choosing
a governed lifecycle mutation.

It exercises:

```text
PostgreSQL
migrations
security/session persistence
AuthorityService
Fastify + TypeBox
Kysely + pg
React + Vite
React Router
TanStack Query
AppShell
Project visibility
Activity Center projection
SSE invalidation/reconnect
structured logging
OpenTelemetry boundary
real-PG integration
Playwright E2E
```

It intentionally does not claim that the worker/execution mutation path is fully
proven by VS-01.

That path becomes mandatory before the first autonomous/governed execution flow.

---

# 2. User journey

```text
user opens /login
→ authenticates with username/password
→ server creates durable opaque session
→ browser receives HttpOnly session cookie
→ app loads session bootstrap
→ backend returns principal + allowed capabilities
→ Project Sidebar loads Projects visible to this principal
→ user selects a Project
→ /projects/:projectId opens
→ page shows canonical current Project context
→ Activity Center shows current derived activity
→ SSE connection starts
→ invalidation causes canonical refetch
```

---

# 3. Initial data

DEV/test uses deterministic fixture data.

Fixture includes only what is necessary to represent:

```text
one HUMAN principal
one active session-capable account
one valid scoped grant
one valid Project context
minimum canonical data needed by the existing normative model
```

Fixture is test/demo data and is not production history.

No HML/PROD demo seed is automatic.

---

# 4. Backend scope

Required endpoints/contracts:

```text
POST /api/session/login
POST /api/session/logout
GET  /api/session
GET  /api/projects
GET  /api/projects/:projectId
GET  /api/projects/:projectId/activity
GET  /api/events
GET  /health/live
GET  /health/ready
```

Exact DTO fields must be the minimum needed for the journey and remain
transport contracts, not domain authority.

---

# 5. Frontend scope

Required surfaces:

```text
Login
AppShell
Top Bar
Project Sidebar
Project Context page
Persistent Activity Center
session-expired handling
forbidden handling
loading/empty/error states
```

No dashboard is required.

No optimistic governed state is allowed.

---

# 6. Security acceptance

Must prove:

```text
wrong password returns generic failure
valid login creates durable server-side session
raw token is not stored in DB
logout revokes session
revoked session fails after web restart
Project outside grant scope is denied server-side
CSRF protects state-changing authenticated request
client bundle contains no server secret
```

---

# 7. Persistence acceptance

Must prove:

```text
migration from empty PostgreSQL 18.6 succeeds
migration rerun is safe under migration framework semantics
runtime web role has no general DDL
worker role is separate
Project query respects canonical current state
Activity Center projection is explicitly derived/rebuildable
```

---

# 8. Realtime acceptance

Must prove:

```text
SSE carries invalidation, not canonical entity state
lost connection reconnects
reconnect triggers refetch
duplicate invalidation does not duplicate canonical mutation
lost NOTIFY cannot permanently hide canonical state
```

---

# 9. Testing acceptance

Minimum automated coverage:

```text
architecture boundary test
session domain/application tests
session persistence integration
authorization integration
real PostgreSQL constraint test
API contract tests
React behavior tests
Playwright happy path
Playwright denied-project path
Playwright session-expired path
SSE reconnect/refetch regression
```

---

# 10. Explicitly out of VS-01

```text
governed Project phase mutation
Work Item execution
autonomous agent execution
external evidence store
HML provisioning
PROD provisioning
Kubernetes
external broker
distributed cache
```

Out-of-scope does not mean abandoned.

It means not required to prove the first vertical technical path.

---

# 11. VS-01 done

VS-01 is complete only when:

```text
fresh clone/bootstrap reproducible
all mandatory CI gates pass
real PostgreSQL used in integration
browser journey passes
restart/session test passes
server-side authorization test passes
SSE reconnect/refetch test passes
no architecture guardrail violation
no P0/P1 implementation finding
```
