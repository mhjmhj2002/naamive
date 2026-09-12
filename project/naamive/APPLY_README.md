# APPLY — NAAMIVE self-hosted project bootstrap — Part 1 v0.2

This package supersedes the local planning package `v0.1`.

It is still a planning candidate.

```text
Project lifecycle............... PLANNING
Module MOD-001.................. IDENTIFIED
VI-001.......................... DEFINED
Work Items...................... 12 PROPOSED
Development Cycles.............. 0
Executions...................... 0
Implementation.................. NOT STARTED
Codex independent audit......... NOT YET EXECUTED
Human approval.................. NOT GRANTED
```

Corrections in v0.2:

```text
1. removed invalid Project state "ACTIVE"; Project is PLANNING
2. completed MOD-001 minimum identified metadata
3. completed VI-001 DEFINED fields and MATERIAL impact
4. corrected WI ownership: Project or Module; VI is a reference, not owner
5. completed DT-001 v1 with canonical REQUIRED_FOR_TARGET metadata
6. integrated EXECUTION_BOARD.md and mandatory independent Codex audit gate
```

Additional hardening:

```text
Need/Project impact made explicit
AUDIT_REQUEST_CODEX.md added
planning-round Activity facts updated without fabricating approval/audit
```

Gate:

```text
READY FOR AUDIT
→ independent Codex audit
→ remediate blocking findings
→ re-audit
→ PASS
→ human approval
→ VI-001 PLANNED
```

Do not start implementation from this package before the gate is completed.
