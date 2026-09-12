# Agent Execution Policy

**State:** ACTIVE FOR MANUAL SELF-HOSTING  
**normative_baseline_ref:** NB-0002
**business_baseline_ref:** PBL-PRJ001-R1-v1.0

## Implementation isolation

When implementation is eventually authorized:

```text
1 Work Item
→ 1 implementation agent/context
→ WI-specific tests/evidence
→ separate review/audit principal when required
```

An implementation agent cannot approve its own governed transition, change
NB-0002/TB/TIR silently, or continue through a material gap.

## Current prohibition

Sob `PBL-PRJ001-R1-v1.0`:

```text
12 WIs = PROPOSED
1 WI = READY
1 Development Cycle (DC-001)
1 Execution ELIGIBLE (EX-001)
```

```text
Implementation authority = GRANTED
Implementation = NOT STARTED
```

`EX-001` ainda não possui claim operacional. O implementation agent não foi
despachado.

## Planning Round 1 closure

Autor histórico da remediação v1.0:

`agent:codex:naamive-aud9-remediation`

`Planning Round 1 = COMPLETE`; fase de auditoria encerrada por decisão humana;
AUD-009 é a última auditoria válida, `FND-011` está resolvido e não há
auditoria futura planejada para a rodada.

## Gap rule

Material conflict/gap:

```text
record Finding
→ stop affected scope
→ assign owner/exit condition/fallback/escalation
→ resolve at correct authority level
→ verify/audit when required by policy
→ resume only with valid continuity
```

## Review, audit and authority before governed promotion

For future MATERIAL/CRITICAL advances, `NB-0002` and
`governance/04_AUDIT_AND_REVIEW_POLICY.md` remain controlling: evidence does
not substitute for audit when the policy requires audit.

```text
candidate baseline
→ applicable review/audit and finding treatment
→ human authority decision when required
```

PASS does not change state by itself.
