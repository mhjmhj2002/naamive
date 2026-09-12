# NAAMIVE — Technical Implementation Readiness

**Status:** APPROVED  
**Version:** 1.0  
**Natureza:** non-normative technical implementation-readiness contract  
**Derives from:** Technology Baseline v0.10 — APPROVED / FROZEN  
**Normative authority:** NB-0002 — RATIFIED / IN FORCE  
**Source checkpoint:** `300b965a056c40bdfafe4833584abd74a28decc0`  
**Date:** 2026-09-10  
**Implementation:** AUTHORIZED FOR VS-01

---

# 1. Objective

The Technology Baseline fixed the architecture.

TIR fixes the concrete engineering defaults required to start implementing that
architecture without silently reopening it.

TIR does not redefine:

```text
domain law
lifecycle law
authority law
terminality
DeliveryTarget semantics
ValueIncrement semantics
PhaseCycle semantics
Technology Baseline decisions
```

If a TIR decision conflicts with the frozen Technology Baseline or NB-0002, the
TIR decision loses.

Authority order:

```text
NB-0002
  ↓
Technology Baseline v0.10 APPROVED / FROZEN
  ↓
TIR
  ↓
implementation
```

---

# 2. Readiness verdict

This candidate closes the known implementation parameters required before the
first vertical slice.

```text
TIR blockers................ 0
TIR verification............ PASS
human approval.............. APPROVED
implementation.............. AUTHORIZED FOR VS-01
```

The approval gate is explicit and is not part of this generated package.

---

# 3. Runtime and toolchain

## TIR-001 — Node.js

```text
Node.js 24.21.0 LTS
```

Runtime policy:

```text
major line........ 24 LTS
bootstrap pin..... 24.21.0
package engines... >=24.21.0 <25
```

Runtime major changes require explicit technical review.

---

## TIR-002 — PostgreSQL

```text
PostgreSQL 18.6
```

Development, integration tests and the initial deployable database target the
same major line:

```text
PostgreSQL 18.x
```

Patch updates within 18.x are maintenance changes when regression gates pass.

Major upgrade requires explicit technical change.

---

## TIR-003 — Package manager

```text
pnpm 12.3.4
```

Repository records the package-manager version.

`pnpm-lock.yaml` is committed and is the exact dependency-resolution authority.

---

## TIR-004 — TypeScript / module system

```text
TypeScript 7.0.2
ECMAScript modules
package.json: "type": "module"
```

Application packages use strict TypeScript.

JavaScript application code is not the default.

---

## TIR-005 — Core package snapshot

Exact bootstrap versions are defined in:

```text
readiness/04_VERSION_SNAPSHOT.md
```

Rules:

```text
core baseline dependencies..... exact version in package.json
transitive dependencies........ pnpm-lock.yaml
same-major maintenance......... regression-gated
major changes.................. explicit technical review
```

---

# 4. Repository physical layout

## TIR-006 — Root layout

Initial structure:

```text
naamive/
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── server/
│   │       └── client/
│   └── worker/
│       └── src/
│
├── packages/
│   ├── contracts/
│   ├── kernel/
│   ├── database/
│   ├── modules/
│   │   ├── need/
│   │   ├── project/
│   │   ├── business-module/
│   │   ├── value-delivery/
│   │   ├── work-item/
│   │   ├── execution/
│   │   ├── governance/
│   │   ├── authority/
│   │   └── delivery/
│   └── testing/
│
├── database/
│   ├── migrations/
│   ├── backfills/
│   └── seeds/
│
├── deploy/
│   ├── compose/
│   ├── caddy/
│   └── observability/
│
└── tests/
    └── e2e/
```

This is a physical implementation convention, not a new domain hierarchy.

---

## TIR-007 — Composition roots

`apps/web` and `apps/worker` are composition roots.

They may wire modules and infrastructure.

They must not become new owners of domain rules.

---

## TIR-008 — Module privacy

Public imports are exposed only through deliberate package exports.

Forbidden:

```text
deep import into another module's internals
frontend importing persistence
frontend importing domain internals
domain importing Fastify
domain importing Kysely/pg
domain importing React
module A repository writing module B private tables
```

Architecture checks run in CI from the first implementation slice.

---

# 5. Database physical readiness

## TIR-009 — Database and schemas

Initial database:

```text
naamive
```

Initial schemas:

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
security
delivery
audit
evidence
projection
ops
```

Schema ownership remains architectural ownership, not permission for arbitrary
cross-schema writes.

---

## TIR-010 — IDs

Application-side ID generation:

```text
uuid 14.0.2
UUIDv7
```

The application normally generates governed IDs before persistence.

PostgreSQL-native UUID generation may be used only where the resource contract
explicitly delegates identity creation to persistence.

Do not mix generators silently for the same resource type.

---

## TIR-011 — Migration layout

Migration directory:

```text
database/migrations/
```

Filename format:

```text
000001_authority__principal.ts
000002_security__human_session.ts
000003_project__project.ts
...
```

Rules:

```text
global monotonic sequence
capability tag in filename
one repository history
forward-only
no app-startup migration
explicit migration command/step
advisory lock
```

Kysely migration metadata uses schema:

```text
platform
```

Backfills:

```text
database/backfills/
```

and must be:

```text
idempotent
checkpointed
observable
safe to rerun
```

---

## TIR-012 — Seed policy

```text
DEV / test deterministic seed......... ALLOWED
HML / PROD automatic demo seed........ FORBIDDEN
```

A DEV/test fixture is test data.

It must not pretend to be production-governed historical evidence.

---

# 6. Database roles

## TIR-013 — Runtime role strategy

Choose the stronger TB-143 option from the beginning.

Roles:

```text
naamive_migrator
naamive_web
naamive_worker
naamive_observer
```

`naamive_migrator`:

```text
DDL + migration capability
not application runtime
```

`naamive_web`:

```text
runtime grants needed by web only
no general DDL
```

`naamive_worker`:

```text
runtime grants needed by worker only
no general DDL
```

`naamive_observer`:

```text
read-only access to explicitly exposed operational views
no canonical mutation
```

PostgreSQL permissions are defense-in-depth.

They do not replace `AuthorityService`.

This closes the implementation decision behind `TB-AUD-007`.

---

# 7. Session and login security

## TIR-014 — Session token

Browser receives a high-entropy opaque session token.

Database stores:

```text
HMAC-SHA-256(token, server-held session hashing key)
```

and never the raw reusable token.

Cookie:

```text
HttpOnly
SameSite=Lax
Secure in remotely served environments
Path=/
```

Localhost development may omit `Secure` only where HTTPS is not in use.

---

## TIR-015 — Session lifetime

Defaults:

```text
absolute lifetime........ 12 hours
idle timeout............. 2 hours
rotation interval........ 60 minutes
post-rotation previous
token overlap............ max 30 seconds
```

Rotation also occurs after privilege-sensitive session changes.

The short previous-token overlap exists only to avoid breaking concurrent browser
requests/tabs and never extends absolute expiration.

---

## TIR-016 — CSRF

State-changing authenticated browser requests require CSRF validation.

Bootstrap/session response supplies a per-session CSRF token.

Client sends:

```text
X-CSRF-Token
```

SameSite cookie is defense-in-depth, not the only CSRF control.

---

## TIR-017 — Password hashing

Initial Argon2id parameters:

```text
memory........ 64 MiB
iterations.... 3
parallelism... 1
salt.......... 16 bytes random
hash.......... 32 bytes
```

Parameters are stored/versioned so successful login can rehash when policy is
upgraded.

---

## TIR-018 — Login abuse control

Initial limits:

```text
username + IP...... 5 failed attempts / 15 min
IP................. 25 failed attempts / 15 min
```

After the third failure in a window, apply progressive delay.

Do not implement a permanent/global user lock triggered only by remote failures,
because that creates an account-lockout denial-of-service vector.

Authentication error returned to the browser remains generic.

---

# 8. Worker operational parameters

## TIR-019 — Polling

Defaults:

```text
active polling........... 1 second
idle backoff............. exponential with jitter
idle backoff ceiling..... 5 seconds
```

`LISTEN/NOTIFY` may wake earlier but is not durable authority.

---

## TIR-020 — Lease and heartbeat

Defaults:

```text
lease duration........... 90 seconds
heartbeat cadence........ 20 seconds
lease renewal............ with valid heartbeat
```

Lease renewal must prove the same current fencing generation.

---

## TIR-021 — Reconciliation

General operational reconciliation sweep:

```text
60 seconds
```

Specific resource types may use a stricter cadence when their contract requires
it.

---

## TIR-022 — Graceful worker shutdown

On shutdown signal:

```text
stop claiming new work immediately
signal cooperative cancellation where supported
wait up to 30 seconds
exit
```

After process loss, lease expiration + fencing prevent a stale executor from
publishing an authoritative result.

---

# 9. SSE and client revalidation

## TIR-023 — SSE endpoint

Initial endpoint:

```text
GET /api/events
```

One authenticated stream per AppShell/browser tab.

The stream carries invalidation/event hints, not canonical state.

---

## TIR-024 — SSE timing

Defaults:

```text
server keepalive......... 15 seconds
reconnect floor.......... 1 second
reconnect ceiling........ 30 seconds
reconnect jitter......... REQUIRED
```

After reconnect:

```text
invalidate relevant queries
canonical refetch
```

Window refocus may also refetch state whose freshness affects available actions.

---

# 10. Idempotency

## TIR-025 — HTTP mapping

Material commands use:

```text
Idempotency-Key
```

HTTP header.

The server maps it 1:1 to the canonical `intention_id`.

The command application layer never treats the header itself as authority.

---

## TIR-026 — Replay rules

```text
same intention + same material digest
→ return/reconstruct same authoritative outcome

same intention + different material digest
→ idempotency conflict

not authorized before first acceptance
→ authorization failure

authority revoked after a valid accepted outcome
→ historical outcome remains valid
```

For governed material commands, idempotency evidence is not deleted merely
because a network retry window elapsed.

During the MVP, retained authoritative intention/outcome linkage follows the
governed history retention policy.

---

# 11. Observability thresholds

## TIR-027 — Initial actionable thresholds

Defaults:

```text
oldest eligible dispatch
  warning........ > 60 s
  critical....... > 5 min

oldest unprocessed projection invalidation
  warning........ > 30 s
  critical....... > 2 min

UNKNOWN external effect unreconciled
  warning........ > 5 min
  critical....... > 30 min
```

A lease expiration generates reconciliation/operational warning.

It is not automatically a critical business failure.

Execution semantic-stall threshold must be configured by execution kind before
that kind can run autonomously.

---

## TIR-028 — Telemetry retention

Initial self-hosted defaults:

```text
DEV / PRE-HML
logs................ 14 days
traces.............. 7 days
metrics............. 15 days

HML / PROD
logs................ 30 days
traces.............. 14 days
metrics............. 30 days
```

Governed history, audit, decision evidence and idempotency outcome linkage are
not age-purged by these telemetry settings.

---

# 12. Backup and restore

## TIR-029 — Production backup default

When PROD is provisioned:

```text
pg_dump custom format........ daily
integrity manifest........... SHA-256
daily retention.............. 7
weekly retention............. 4
restore verification......... monthly
backup storage............... separate from primary DB storage
```

A provider can change later without changing these minimum semantics.

---

## TIR-030 — HML backup

If HML becomes persistent/material:

```text
backup before destructive maintenance
+
daily backup with at least 7-day retention while materially used
```

---

## TIR-031 — Restore gate

Restore remains an explicit destructive operation.

After restore:

```text
reconcile RUNNING executions
reconcile claims/leases
reconcile pending dispatch
reconcile UNKNOWN effects
reconcile pending handoffs
rebuild/validate projections
verify roadmap continuity
```

---

# 13. Containers and environment definitions

## TIR-032 — Compose files

Repository paths:

```text
deploy/compose/compose.dev.yaml
deploy/compose/compose.prehml.yaml
deploy/compose/compose.hml.yaml
deploy/compose/compose.prod.yaml
```

HML/PROD definitions may exist before infrastructure is provisioned.

No paid infrastructure is required to begin implementation.

---

## TIR-033 — Caddy and observability

```text
deploy/caddy/
deploy/observability/
```

contain environment-owned deployment definitions.

Application modules do not own infrastructure configuration.

---

## TIR-034 — Image registry

Default registry:

```text
GitHub Container Registry (GHCR)
```

Initial image identities:

```text
ghcr.io/mhjmhj2002/naamive-web
ghcr.io/mhjmhj2002/naamive-worker
```

Authoritative deployment uses immutable digest/release identity, never `:latest`.

---

## TIR-035 — HML / PROD hosting

Specific paid provider/host:

```text
NOT SELECTED
```

This is not a blocker for local implementation or PRE-HML.

Provisioning HML or PROD requires a separate environment-provisioning decision
before that environment becomes operational.

---

# 14. Evidence storage

## TIR-036 — Initial evidence scope

For the initial implementation:

```text
structured evidence + small textual/JSON diagnostic evidence
→ PostgreSQL
```

External object/blob storage is **not introduced** in the first implementation
scope.

Large binary evidence/attachments are therefore not accepted until an explicit
external-evidence protocol is defined.

This contains the conditional risk behind `TB-AUD-009` without inventing a
premature object store.

---

# 15. Projection and search readiness

## TIR-037 — First physical read model

The first dedicated cross-capability read model is:

```text
projection.activity_center
```

It is rebuildable and stores source watermark/version metadata.

It is not canonical truth.

---

## TIR-038 — Project sidebar

Initially, authorized Project sidebar data may be queried from canonical Project
current state through an authorization-aware query service.

A separate Project sidebar projection is not required on day one.

---

## TIR-039 — Search

Initial search:

```text
server-side
indexed canonical/current-state queries
pagination required
```

Dedicated search projection/read model is introduced only after measurement.

Initial trigger for review:

```text
p95 search latency > 300 ms
under expected workload after appropriate indexes
```

or measurable contention/query complexity that makes canonical reads unhealthy.

Any dedicated read model remains rebuildable.

This closes the decision behind `TB-AUD-013`.

---

# 16. CI and test gate

## TIR-040 — Mandatory first-slice pipeline

Conceptual order:

```text
dependency/install integrity
→ TypeScript typecheck
→ architecture guardrails
→ unit/domain tests
→ application tests
→ PostgreSQL 18.6 integration tests
→ API tests
→ frontend behavior tests
→ Playwright critical journey
→ build
```

A failing mandatory gate blocks release candidacy.

---

## TIR-041 — PostgreSQL integration environment

Concurrency/locking/constraint tests run against:

```text
real PostgreSQL 18.6 container
```

No SQLite/in-memory substitute may claim proof of PostgreSQL concurrency
invariants.

---

# 17. First implementation slice

The exact first slice is specified in:

```text
readiness/03_FIRST_VERTICAL_SLICE_PLAN.md
```

Name:

```text
VS-01 — Authenticated Project Context
```

It deliberately proves the foundation end-to-end before introducing the first
governed lifecycle mutation.

---

# 18. Remaining choices that do not block VS-01

The following may be decided when their need becomes real:

```text
specific HML host/provider
specific PROD host/provider
remote secret-management product
future external evidence/object store
future dedicated search projection
future orchestration platform beyond Docker Compose
future broker
future Kubernetes
```

They cannot be introduced silently.

---

# 19. TIR acceptance criteria

TIR is acceptable only if all are true:

```text
Technology Baseline is frozen................ PASS
NB-0002 remains authoritative................ PASS
runtime/database versions fixed.............. PASS
dependency bootstrap fixed................... PASS
repository boundaries concrete............... PASS
database schemas concrete.................... PASS
migration strategy concrete.................. PASS
DB runtime roles concrete.................... PASS
session/security defaults concrete........... PASS
worker timing defaults concrete.............. PASS
SSE defaults concrete........................ PASS
idempotency transport concrete............... PASS
observability thresholds concrete............ PASS
retention defaults concrete.................. PASS
backup defaults concrete..................... PASS
first projection strategy concrete........... PASS
first vertical slice defined................. PASS
CI gates defined............................. PASS
destructive TIR verification................. PASS
human TIR approval........................... PENDING
```

---

# 20. Gate

Technical verification result:

```text
audits/AUD-016_TIR_READINESS_VERIFICATION.md
PASS
```

Human decision recorded:

```text
APPROVED
```

Approval result:

```text
TIR........................ APPROVED v1.0
VS-01...................... AUTHORIZED TO START
CODE AUTHORIZED?........... YES — WITHIN VS-01 SCOPE
```

Approval authority:

```text
Manuel Hinojosa — NAAMIVE Project Owner
2026-09-10
```
