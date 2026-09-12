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
13 WIs = PROPOSED
0 WIs = READY
0 Development Cycles
0 Executions
```

No implementation agent may be dispatched yet.

## Planning author/auditor segregation

Autor da remediação corrente:

`agent:codex:naamive-aud9-remediation`

Independent auditor principal:

`agent:codex:naamive-independent-audit`

Uma janela de chat diferente não é suficiente se o principal for o mesmo. O
fluxo corrente usa produtor e auditor declaradamente distintos; o relatório de
auditoria deve registrar identidade, independência e limitação.

## Gap rule

Material conflict/gap:

```text
record Finding
→ stop affected scope
→ assign owner/exit condition/fallback/escalation
→ resolve at correct authority level
→ verify/audit
→ resume only with valid continuity
```

## Audit-before-human-approval

```text
candidate baseline
→ independent audit
→ blockers resolved
→ PASS
→ human authority decision
```

PASS does not change state by itself.
