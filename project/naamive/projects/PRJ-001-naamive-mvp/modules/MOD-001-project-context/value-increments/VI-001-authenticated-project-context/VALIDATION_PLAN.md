# VI-001 — Validation Plan Candidate

**State:** PLANNED AS CANDIDATE / NOT EXECUTED  
**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002

Validation is separate from implementation completion and from human acceptance.

## Security / authority

| Check | Risk | Primary WI evidence |
|---|---|---|
| generic invalid-password response + rate limiting | RISK-001/RISK-002 | WI-003 |
| durable session, no raw token, rotation/expiry/revocation | RISK-002 | WI-004 |
| grant allow/deny/revoke/restart | RISK-001 | WI-005 |
| session bootstrap/CSRF/expired state | RISK-002 | WI-006 |
| unauthorized Project absent/denied | RISK-001 | WI-007/WI-008 |

## Canonical Project / projection

| Check | Risk | Primary WI evidence |
|---|---|---|
| canonical Project current/history + restart-safe fixture/query | RISK-006 | WI-013 |
| Activity Center declared sources, watermark, rebuild/idempotence | RISK-003 | WI-010 |
| SSE hint-only + reconnect/refetch/lost notification convergence | RISK-003 | WI-011 |

## Architecture / quality

| Check | Risk | Primary WI evidence |
|---|---|---|
| workspace/build/architecture guardrails | RISK-004 | WI-001 |
| per-WI tests not deferred to final E2E | RISK-005 | WI-001..WI-013 |
| integrated Playwright journeys on stable baseline | RISK-005 | WI-012 |

## Final evidence package

WI-012 must identify the exact integrated baseline and reference actual outputs
from every required WI. This plan does not predeclare PASS, VI acceptance or
Delivery.
