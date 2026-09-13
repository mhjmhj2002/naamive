# CR-WI002-03 — Independent Code Re-review after EX-006

**review_id:** CR-WI002-03  
**review_type:** INDEPENDENT_CODE_REVIEW  
**work_item:** WI-002  
**execution_under_review:** EX-006  
**previous_execution:** EX-005  
**previous_review:** CR-WI002-02  
**review_target_commit:** bed3a16e83968080293f9ca15fade5d85408e049  
**rework_base_commit:** c2972a2964041dd66f31aed6c8f32cec3e643564  
**implementation_principal:** agent:codex:implementation:WI-002:EX-006  
**reviewer_principal:** agent:codex:review:CR-WI002-03  
**independence:** CONFIRMED — reviewer and implementation logical principals are distinct  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**governing_decision:** DEC-008  
**previous_blocking_finding:** CR-WI002-02-F001  
**previous_blocking_finding_disposition:** RESOLVED  
**previous_nonblocking_finding:** CR-WI002-02-F002  
**previous_nonblocking_finding_disposition:** OPEN / NON_BLOCKING  
**review_started_at:** 2026-09-13T15:33:00-03:00  
**review_completed_at:** 2026-09-13T15:46:13-03:00  
**result:** PASS_WITH_FINDINGS  
**blocking_findings:** 0  
**non_blocking_findings:** 1

## Snapshot and scope

The snapshot was exact before substantive review: branch `lifecycle-reboot`,
HEAD `bed3a16e83968080293f9ca15fade5d85408e049`, rework base
`c2972a2964041dd66f31aed6c8f32cec3e643564`, and a clean working tree. The
governed state matched the task: WI-001 `DONE`; WI-002 `IN_REVIEW`; DC-002
`CREATED`; EX-004 and EX-005 historical `SUCCEEDED`; EX-006 `SUCCEEDED` with
claim `RELEASED / COMPLETED`; DEC-008 current/governed; PBL
`PBL-PRJ001-R1-v1.0`; NB `NB-0002`; and A-056 was the last activity.

Every file changed by the target diff was inspected. The material technical
changes are the forward-only `000004` migration and the real PostgreSQL
integration additions. The Playwright port configuration and the living
projections were reviewed proportionally. No WI-003 behavior is introduced.

## CR-WI002-02-F001 — expected version NULL

**Disposition: RESOLVED.**

`000004_authority__principal_expected_version_required` uses `CREATE OR
REPLACE FUNCTION` only for `authority.change_principal_username` and
`authority.change_principal_status`; it leaves historical migration `000003`
unchanged and has forward-only `down()`. In each replacement the explicit
`expected_version IS NULL` exception is the first statement in the function
body, before the principal read, `FOR UPDATE`, history insertion or snapshot
update. The non-NULL stale comparison and the controlled username/status event
semantics are otherwise retained.

On a new disposable PostgreSQL 18.6 database, migrations `000001` through
`000004` applied successfully. The real runtime role `naamive_web` rejected
one `change_principal_username(id, NULL, ...)` call and one
`change_principal_status(id, NULL, ...)` call with `Principal expected version
is required`. For each call, the integration compared the complete current
snapshot and ordered material history before and after; username, status,
version, current-history pointer and all history facts were unchanged.

The same independent integration proved a valid expected version succeeds with
exactly one version increment and one material fact; a stale non-NULL version
is rejected with unchanged snapshot/history; and two separate runtime
connections using the same version produce exactly one winner and one
`PrincipalVersionConflictError`, final version `N + 1`, one new fact and a
coherent current-history pointer. This resolves the missing expected-version
boundary enforcement without weakening the normal stale path.

## Command boundary and catalog state

The focused runtime-role regression denied representative raw mutation against
both canonical tables: `INSERT authority.principal_history` and `UPDATE
authority.principal` returned permission denial. Catalog inspection on the
same clean database showed, for both changed functions:

```text
SECURITY DEFINER........ true
search_path............. pg_catalog, authority
owner................... naamive_migrator
PUBLIC EXECUTE.......... false
naamive_web EXECUTE..... true
naamive_worker EXECUTE.. true
naamive_observer EXECUTE false

naamive_web table grants on authority.principal/principal_history:
SELECT true; INSERT/UPDATE/DELETE false
```

Thus the replacement preserved the intended owner, safe lookup path, revoked
PUBLIC execution and limited runtime mutation to the controlled commands.
Accepted `USERNAME_CHANGED` preserves status and increments exactly once;
accepted `STATUS_CHANGED` only permits `ACTIVE ↔ SUSPENDED`, preserves username
and increments exactly once. Rejected NULL/stale calls produce no snapshot,
history or pointer change. The transaction boundary remains coherent.

## Playwright and test quality

`playwright.config.ts` defaults to port `4173`; `PLAYWRIGHT_PORT` consistently
sets both `baseURL` and the managed `webServer` port, with
`reuseExistingServer: false`. It is test-local configuration and has no
production behavior. Foundation E2E passed on free temporary port `4188` and
the managed server exited.

The EX-006 integration is a real PostgreSQL/runtime-role proof, not a mock. It
exercises both NULL command calls and complete before/after state comparison,
valid and stale non-NULL paths, separate-connection concurrency, raw-DML
denial and final catalog `SECURITY DEFINER`/`search_path` inspection. It is
adequate for this targeted remediation.

## Independent checks

```text
corepack pnpm install --frozen-lockfile................. PASS
pnpm run typecheck...................................... PASS
pnpm run test........................................... PASS
pnpm run architecture................................... PASS
pnpm run test:architecture.............................. PASS
pnpm run build.......................................... PASS
clean PostgreSQL 18.6, 000001 → 000004................. PASS
Principal integration / runtime role.................... PASS
NULL username and status proofs.......................... PASS
valid, stale and bounded concurrency regressions........ PASS
focused raw-DML denial and catalog inspection............ PASS
Foundation E2E, PLAYWRIGHT_PORT=4188.................... PASS (1 test)
```

The first frozen-install attempt was blocked by sandbox DNS; one materially
changed, finite retry with permitted network access passed from the committed
lockfile. The first disposable PostgreSQL attempt failed before migrations
because its default SCRAM configuration was incompatible with the repository's
passwordless runtime-role probe. It was stopped and discarded; one clean retry
used local `trust` authentication and passed. No timeout was extended, no
unbounded database wait was used, and no orphan process/container remained.
The host supplied Node 24.18.1 rather than the project pin 24.21.0; this is an
environment limitation, not a defect in the reviewed commit.

## CR-WI002-02-F002 — current-projection narrative

**Disposition: OPEN / NON_BLOCKING.**

The living WI-002 document still says in *Relation to plan* that EX-005 is the
current rework result, although its metadata names EX-006 as current and EX-005
as historical. Its *Process gate* still depicts `EX-004 ELIGIBLE`. These prose
statements repeat the stale-currentness issue recorded by CR-WI002-02-F002.
They do not alter canonical lifecycle state or the technical behavior, but can
misidentify the execution under review. This review does not remediate that
finding.

## Conclusion and lifecycle effect

Result: **PASS_WITH_FINDINGS** — no blocking findings; one non-blocking finding
remains open. WI-002 remains `IN_REVIEW`; EX-006 remains `SUCCEEDED`; acceptance
is `NOT GRANTED`. Implementation is `CODE REVIEW PASSED WITH NONBLOCKING
FINDING / AWAITING ACCEPTANCE AUDIT`. The next governed action is an independent
WI-002 acceptance audit carrying `CR-WI002-02-F002`. This review neither grants
acceptance nor marks WI-002 `DONE`.
