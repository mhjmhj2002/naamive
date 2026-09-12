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
→ verify
→ resume only with valid continuity
```

## Authority before governed promotion

```text
candidate baseline
→ applicable evidence and finding treatment
→ human authority decision when required
```

PASS does not change state by itself.
