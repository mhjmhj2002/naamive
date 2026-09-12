# VI-001 — Authenticated Project Context

**Lifecycle state:** IDENTIFIED  
**Definition/planning candidate:** COMPLETE / NOT APPROVED  
**Module owner:** MOD-001 — Project Context  
**Candidate DeliveryTarget:** DT-001 v1 — REQUIRED_FOR_TARGET  
**Technical correspondence:** VS-01 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Implementation:** NOT STARTED / NOT AUTHORIZED

## State reconciliation

The earlier bootstrap label `VI-001 = DEFINED` had no valid parent transition and
no governed approval proof. It is therefore superseded as an invalid projection,
not treated as a valid `DEFINED → IDENTIFIED` lifecycle transition.

Current provable state is `IDENTIFIED` until the audited approval candidate is
accepted by the human authority.

## Beneficiary

```text
human NAAMIVE operator / Project participant
```

## Preliminary value statement

A human principal with valid authority can enter NAAMIVE, see only Projects
within its authority and open an explicit Project context with factual activity
visibility.

## Definition candidate — in scope

```text
username/password authentication entry
durable server-side session
scoped authority/grants
session bootstrap
canonical read-only Project source
authorized Project list
explicit Project selection
authenticated AppShell
initial Activity Center projection
SSE invalidation + canonical refetch
unit/integration/API/UI/E2E evidence owned by the relevant Work Items
```

## Definition candidate — out of scope

```text
Project lifecycle mutation
Work Item execution engine
agent orchestration/autonomy
Delivery workflow
HML/PROD provisioning
external evidence/blob storage
```

## Dependencies

| Dependency | Satisfaction condition | Fallback |
|---|---|---|
| MOD-001 definition | MOD-001 transition to DEFINED approved on same baseline | stop VI transition |
| PRJ-001 | Project remains PLANNING on `PBL-PRJ001-R1-v1.0` | revalidate candidate |
| NB-0002 | current normative baseline compatible | stop affected scope |
| TB v0.10 | frozen technical baseline unchanged or explicitly revalidated | technical governance |
| TIR v1.0 | technical readiness valid; no lifecycle authority inferred | reopen TIR if invalid |
| WI-001 | remains PROPOSED until later readiness; no execution implied | no implementation |

## Definition candidate — acceptance/value criteria

The eventual Entrega de Valor must prove:

```text
authentication valid
session durable server-side
revocation restart-safe
authority enforced server-side
unauthorized Project denied and hidden
canonical Project read source restart-safe
explicit Project selection reflected in navigable context
AppShell functional
Activity Center derived/rebuildable from declared canonical sources
SSE invalidation followed by canonical refetch
critical E2E journeys passing on real PostgreSQL
```

## Risk treatment

See `../../../../risks/RISK_REGISTER.md` for governed risk ownership, evaluation,
mitigation, validity and evidence links.

## Open questions

```text
none currently known that require a new material decision before submitting the candidate to audit
```

## Work Item proposal set

```text
13 Work Items = PROPOSED
0 READY
0 IN_PROGRESS
0 DONE
0 Development Cycles
0 Executions
```

The proposal set is evidence for planning. It does not make `VI-001` `PLANNED`
and cannot authorize any Execution.

## Proposed transition set

After MOD-001 is validly DEFINED, the same audited package proposes:

```text
VI-001 IDENTIFIED → DEFINED
VI-001 DEFINED → PLANNED
```

Neither transition occurs until the independent audit passes and the human
Project Owner explicitly approves the ordered transition set.
