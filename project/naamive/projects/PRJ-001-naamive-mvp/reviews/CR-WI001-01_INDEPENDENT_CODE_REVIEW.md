# CR-WI001-01 — Independent Code Review

**review_id:** CR-WI001-01  
**review_type:** INDEPENDENT_CODE_REVIEW  
**work_item:** WI-001  
**execution:** EX-001  
**review_target_commit:** 1d664ffd1d04d0516a4feb2d2df8dbf568a43c89  
**implementation_principal:** agent:codex:implementation:EX-001  
**reviewer_principal:** agent:codex:review:CR-WI001-01  
**runtime_identity:** agent:codex:/root  
**independence:** CONFIRMED — distinct logical principals  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**review_started_at:** 2026-09-12T20:02:20-03:00  
**review_completed_at:** 2026-09-12T20:07:40-03:00  
**result:** FAIL

## Scope reviewed

The complete implementation diff from `9a971bab662ec1a5ba8d8c37d3007ab5ba135724` to the canonical target was reviewed. Current `HEAD` equals the target. Reviewed: workspace/lockfile, fixed toolchain, strict TypeScript/ESM, both apps, five packages, PostgreSQL, guardrails, health, logging/redaction, tests, and Playwright. No business, authentication, RBAC, or lifecycle behavior outside WI-001 was found.

## Checks rerun

- Frozen install: PASS through Corepack pnpm 12.3.4; committed lockfile accepted.
- Typecheck, architecture script, unit tests, and build: PASS.
- Playwright foundation smoke: PASS (1 test), with temporary localhost permission.
- Real PostgreSQL 18.6 bootstrap: PASS for provisioning/migration, subject to F001/F002.
- `git diff --check`: PASS for the final working-tree diff.

The runtime initially lacked a `pnpm` shim and has Node 24.18.1 rather than the project pin 24.21.0. Corepack supplied the committed pnpm in a temporary path. This is an environment limitation, not a finding against the committed pins.

## Findings

### CR-WI001-F001

**Severity:** BLOCKING  
**Category:** DATABASE

**Evidence:** `packages/database/src/migrate.ts:7-15` creates a Kysely `Migrator` without an advisory lock or `migrationTableSchema: 'platform'`.

**Expected:** TIR-011 and TB-119 require an explicit migration step with advisory lock (or equivalent) and Kysely migration metadata in `platform`.

**Observed:** `migrateToLatest()` runs directly; neither requirement is configured.

**Impact:** Concurrent explicit migration jobs can race and metadata is created in the default schema, violating the required foundation layout.

**Required action:** Add database-scoped migration serialization, configure `platform` metadata, and test concurrent migrations and metadata placement with PostgreSQL.

### CR-WI001-F002

**Severity:** BLOCKING  
**Category:** DATABASE

**Evidence:** `packages/database/src/bootstrap.ts:11-21` creates roles, grants only schema `USAGE`, then migrates using the original privileged `DATABASE_URL`. In the real review container, `naamive_migrator` had `rolcanlogin=false` and `has_schema_privilege(..., 'platform', 'CREATE')=false`.

**Expected:** TIR-013 requires `naamive_migrator` to have DDL/migration capability while web/worker receive only runtime grants and no general DDL.

**Observed:** The migrator cannot connect or create in `platform`; the successful integration migrated as `postgres`.

**Impact:** The declared role boundary is ineffective and requires a privileged connection for migration.

**Required action:** Materialize a usable controlled migrator role/path, apply least runtime grants, and prove allowed/denied role operations in real PostgreSQL tests.

### CR-WI001-F003

**Severity:** BLOCKING  
**Category:** SECURITY

**Evidence:** `packages/kernel/src/index.ts:23` redacts only top-level paths and `packages/kernel/src/index.test.ts:4-16` tests only a top-level password. An independent logger invocation emitted synthetic `request.password` and `headers.authorization` values unchanged.

**Expected:** TB-94 and readiness/02 section 10 require automatic sensitive-value redaction.

**Observed:** Nested request/body/header fields leak to structured output.

**Impact:** Reusable credentials can be disclosed in server/worker logs.

**Required action:** Cover nested and common request/header sensitive paths and add regression tests for nested passwords, authorization headers, cookies, and tokens.

### CR-WI001-F004

**Severity:** BLOCKING  
**Category:** ARCHITECTURE

**Evidence:** `scripts/architecture-guardrails.mjs:42-55` flags private imports only for `/internal/` or deep `@naamive/` specifiers. It does not resolve relative imports; a module can import `../../../database/src/index.ts` and bypass public exports. `scripts/architecture-guardrails.test.mjs:14-22` proves only one deep package import.

**Expected:** TB-06, TB-10 and TIR-008 require public exports as the only cross-package interface and guardrails that detect applicable private/boundary violations.

**Observed:** Relative filesystem imports across packages pass the guardrail.

**Impact:** Module privacy is trivially bypassable; the passing script does not prove the required boundary.

**Required action:** Resolve relative targets, reject cross-package source access except declared exports, and test rejection for relative deep/private imports and applicable boundary rules.

### CR-WI001-F005

**Severity:** NON_BLOCKING  
**Category:** DOCUMENTATION

**Evidence:** The “Relation to plan” section of `WI-001-workspace-foundation.md` still says a Development Cycle remains required before any Execution, although DC-001 and EX-001 exist.

**Expected:** Current explanatory text reflects recorded lifecycle.

**Observed:** Known historical wording remains.

**Impact:** Reader confusion only; no lifecycle effect.

**Required action:** Correct in a separate documentation housekeeping task.

## Conclusion and next action

Result: **FAIL**. Four BLOCKING findings prevent technical acceptance. WI-001 remains **IN_REVIEW**, EX-001 remains **SUCCEEDED**, and acceptance remains **NOT GRANTED**. Next action: governed rework for F001–F004, followed by a new authorized review/acceptance path. EX-001 must not be reexecuted.
