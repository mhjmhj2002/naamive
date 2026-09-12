# PRJ-001 / MOD-001 / VI-001 — Risk Register

**Status:** ACTIVE PLANNING REGISTER  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**No risk acceptance is granted by this register.**

All material risks have an owner and planned treatment. A risk becomes a
blocking Finding if its mitigation requires an unresolved material decision.

| ID | Risk | Likelihood | Impact | Owner | Treatment | Status | Mitigation / linked work | Validation evidence | Validity / trigger |
|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | authority scope leakage exposes unauthorized Project | MEDIUM | CRITICAL | MOD-001 / WI-005 | MITIGATE | OPEN / TREATMENT PLANNED | scoped grants, server reauthorization, deny-by-default; WI-005/007/008 | grant allow/deny/revoke/restart tests + E2E denied Project | valid for PBL-PRJ001-R1-v1.0; revalidate on authority model change |
| RISK-002 | browser/session becomes de facto authority | MEDIUM | CRITICAL | MOD-001 / WI-004, WI-006 | MITIGATE | OPEN / TREATMENT PLANNED | opaque durable server session, AuthorityService independent of session | raw-token absence, rotation/expiry/revocation, session bootstrap tests | revalidate on session/auth contract change |
| RISK-003 | Activity Center/projection used as canonical truth | MEDIUM | MATERIAL | MOD-001 / WI-010, WI-011 | MITIGATE | OPEN / TREATMENT PLANNED | declared canonical sources, rebuild/watermark, SSE hint-only | rebuild/idempotence/watermark/reconnect tests | revalidate on projection source/version change |
| RISK-004 | cross-module shortcut violates ownership/boundaries | MEDIUM | MATERIAL | PRJ-001 / WI-001 | MITIGATE | OPEN / TREATMENT PLANNED | architecture guardrails + public contracts only | architecture tests/import guardrails | revalidate on package/module boundary change |
| RISK-005 | tests/evidence deferred until WI-012 | MEDIUM | MATERIAL | PRJ-001 / each WI owner | MITIGATE | OPEN / TREATMENT PLANNED | each WI owns applicable tests/evidence; WI-012 only consolidates E2E | per-WI assurance matrix + final validation package | revalidate when WI scope changes |
| RISK-006 | Project read source is invented ad hoc | MEDIUM | MATERIAL | MOD-001 / WI-013 | MITIGATE | OPEN / TREATMENT PLANNED | DEC-003 + canonical current/history + public query contract | migration/current/history/restart/query tests | revalidate on Project source/ownership change |

## Contingency / escalation

If a mitigation cannot be implemented without changing NB-0002, TB v0.10, TIR
v1.0 or the approved business scope:

```text
open Finding
→ stop affected scope
→ owner = Project Owner / relevant authority
→ classify baseline impact
→ resolve through correct governance level
→ re-audit/revalidate before resume
```

No `ACCEPT` treatment is present. Material residual risk acceptance, if ever
needed, requires separate authority proof, rationale, scope, baseline and
validity.
