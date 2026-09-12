# NAAMIVE — AUD-016 TIR Readiness Verification

**Status:** PASS — HUMAN GATE APPROVED  
**Natureza:** non-normative technical verification evidence  
**Verified:** TIR 1.0-candidate  
**Technology Baseline:** v0.10 APPROVED / FROZEN  
**Normative Baseline:** NB-0002 RATIFIED / IN FORCE  
**Implementation:** AUTHORIZED FOR VS-01

---

# 1. Verification objective

Try to find a remaining engineering ambiguity that would force VS-01 to invent a
structural decision while coding.

---

# 2. Compatibility

```text
TIR conflicts with NB-0002.................... 0
TIR conflicts with frozen Technology Baseline. 0
silent reopening of frozen architecture....... 0
```

Result:

```text
PASS
```

---

# 3. Previously deferred technical findings

## TB-AUD-007 — DB-role defense-in-depth

TIR chooses separate runtime roles:

```text
naamive_web
naamive_worker
```

plus migrator/observer roles.

```text
CLOSED FOR INITIAL IMPLEMENTATION
```

## TB-AUD-008 — compatibility / major floors

Runtime/toolchain/package snapshot is fixed.

```text
CLOSED
```

## TB-AUD-009 — external evidence protocol

Initial implementation does not accept external large/blob evidence.

Evidence remains PostgreSQL-backed within the initial supported scope.

```text
CONTAINED / CLOSED FOR INITIAL SCOPE
```

## TB-AUD-012 — operational cadences

Lease, heartbeat, polling/backoff, reconciliation and SSE defaults are fixed.

```text
CLOSED
```

## TB-AUD-013 — search/read-model threshold

Initial search path and first physical projection are fixed.

```text
CLOSED
```

---

# 4. Destructive checks

## TIR-DS-01 — Web and worker accidentally share unrestricted DB authority

Expected:

```text
separate runtime roles
no general DDL
```

Result:

```text
PASS BY CONTRACT
```

## TIR-DS-02 — Web restart invalidates every active session

Expected:

```text
session persisted in PostgreSQL
token hash/HMAC persisted
raw token not persisted
```

Result:

```text
PASS BY CONTRACT
```

## TIR-DS-03 — Old rotated token remains valid indefinitely

Expected:

```text
previous-token overlap <= 30 seconds
```

Result:

```text
PASS
```

## TIR-DS-04 — Worker stale after lease expiry publishes result

Expected:

```text
fencing generation reject
```

Result:

```text
PASS — frozen TB preserved
```

## TIR-DS-05 — Lost NOTIFY loses UI update forever

Expected:

```text
durable invalidation + reconnect/refetch
```

Result:

```text
PASS
```

## TIR-DS-06 — Duplicate command after network timeout

Expected:

```text
Idempotency-Key → intention_id
same digest → same outcome
different digest → conflict
```

Result:

```text
PASS
```

## TIR-DS-07 — Migration runs from every web replica

Expected:

```text
FORBIDDEN
explicit migrator step
```

Result:

```text
PASS
```

## TIR-DS-08 — Developer adds a module by deep-importing another module repository

Expected:

```text
architecture guardrail fails CI
```

Result:

```text
PASS BY CONTRACT
```

## TIR-DS-09 — First slice requires HML/PROD cloud account

Expected:

```text
NO
DEV + PRE-HML remain local-first
```

Result:

```text
PASS
```

## TIR-DS-10 — First slice invents a lifecycle mutation

Expected:

```text
NO
VS-01 intentionally proves authenticated read/context path first
```

Result:

```text
PASS
```

---

# 5. Remaining non-blocking choices

```text
HML provider
PROD provider
future object storage
future secret-management product
future dedicated search read model
future broker/orchestrator
```

None is required by VS-01.

Any later adoption requires explicit decision and cannot silently mutate the
frozen baseline.

---

# 6. Gate result

```text
TIR P0 blockers........... 0
TIR P1 blockers........... 0
verification.............. PASS
human approval............ APPROVED
code authorized........... YES — VS-01 ONLY
```

Verdict:

```text
TIR v1.0
APPROVED / READY FOR VS-01
```


---

# 7. Human gate closure

```text
Decision................... APPROVED
Approver................... Manuel Hinojosa — NAAMIVE Project Owner
Date....................... 2026-09-10
```

AUD-016 remains the technical verification evidence. Human approval evidence is
recorded in `readiness/06_TIR_APPROVAL_RECORD.md`.
