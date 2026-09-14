# WI-003 — Username / Password Login

**State:** IN_REVIEW
**Project:** PRJ-001  
**Module:** MOD-001 — Project Context  
**Owner:** MOD-001 — Project Context  
**Governing scope:** MODULE  
**Value Increment reference:** VI-001 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Depends on:** WI-002  
**Development Cycle:** DC-003
**Execution:** EX-007 — SUCCEEDED
**Readiness authority:** GRANTED / EXERCISED (`AUTH-PRJ001-WI-READINESS-01`; `GATE-WI003-02`)

## Reason / business intention

This Work Item exists because its outcome is required to materialize or prove the
finite value of VI-001 without forcing the implementation agent to invent a
material product/architecture decision.

## Relation to plan

Entrada canônica do DevelopmentRoadmap v2, executada nesta passagem causal sob
authority específica e limitada a `WI-003` / `DC-003` / `EX-007`.

## Outcome

Authenticate human credentials without turning the login form/client into authority.

## Out of scope

Durable session implementation; Project grants; Project listing.

## Dependency satisfaction condition

WI-002 = DONE; principal persistence/currentness contract available and compatible.

A dependency is not satisfied merely because its file exists, an agent was
assigned, or an Execution started.

## Acceptance criteria

- Argon2id according to TIR
- generic authentication error
- rate limiting/progressive delay according to TIR
- typed validated POST /api/session/login
- valid/invalid credential behavior verified

## Required tests

- valid credential succeeds through typed endpoint
- invalid username/password produce same generic failure
- Argon2id parameters match TIR
- username+IP and IP rate-limit thresholds/progressive delay behave as specified
- transport validation rejects malformed input without secret leakage

## Required evidence

- unit/application tests for credential/rate-limit rules
- API contract/integration output
- security-negative test output
- implementation diff/artifact scoped to this WI
- finding references and baseline classification if scope changed

## Review / audit requirement

Because this WI is `MATERIAL`, an independent proportional audit is required
before the relevant readiness/acceptance advancement unless an upstream audit
explicitly proves exact coverage of this WI, same scope, same baseline, same
material decision and current risks/findings.

No such reuse is assumed automatically.

## Normative owner / TB-140 physical mapping

```text
normative owner....... MODULE: MOD-001
ValueIncrement ref.... VI-001
TB-140 anchor......... VALUE_INCREMENT
value_increment_id.... VI-001
project_id............ NULL
derived Module owner.. VI-001.module_id = MOD-001
```

This mapping is governed by
`decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.

Before readiness/Execution, the system must revalidate that the referenced
ValueIncrement still resolves to the declared normative Module owner on a
compatible baseline. `VALUE_INCREMENT` is a physical FK anchor, not a third
normative owner type.

## Process gate

```text
PROPOSED
→ readiness review against current approved baseline
→ applicable independent audit / explicit coverage proof
→ human/authority decision as required
→ READY
→ create Development Cycle
→ valid Execution starts
→ IN_PROGRESS
```

No code may start while this Work Item remains `PROPOSED`.

A material gap opens a Finding and stops only the affected scope according to
the Gap Protocol.

## Fluxo corrente e evidência

A readiness authority foi `GRANTED / EXERCISED` pelo
[`GATE-WI003-02_READINESS.md`](../../../../../governance/GATE-WI003-02_READINESS.md),
sob `AUTH-PRJ001-WI-READINESS-01`. A instrução explícita corrente do Project
Owner para executar WI-003 e corrigir sua documentação foi materializada como
[`AUTH-WI003-EXECUTION-01.md`](../../../../../governance/AUTH-WI003-EXECUTION-01.md).
Ela é a authority rastreável, específica e não reutilizável desta primeira
tentativa.

`EX-007` percorreu `CREATED → ELIGIBLE → RUNNING → SUCCEEDED`; a primeira
Execution válida promoveu `READY → IN_PROGRESS` e o resultado técnico,
evidências e candidato para avaliação promoveram `IN_PROGRESS → IN_REVIEW`.
O pacote de review está em
[`EX-007-WI003.md`](../../../../../executions/EX-007-WI003.md) e
[`EX-007-WI003.md`](../../../../../executions/evidence/EX-007-WI003.md).
Não há decisão de aceite nesta Work Item.

[`DEC-009_AUTHENTICATION_CONTRACT.md`](../../../../../decisions/DEC-009_AUTHENTICATION_CONTRACT.md)
materializa a aprovação humana e resolve `FND-WI003-RCP-001..004`. A
[`WI-003_READINESS_CANDIDATE_R2.md`](../../../../../governance/WI-003_READINESS_CANDIDATE_R2.md)
conclui `READY FOR INDEPENDENT READINESS AUDIT`; R1 é evidência histórica e não
é o resultado corrente. [`AUD-WI003-01_INDEPENDENT_READINESS_AUDIT.md`](../../../../../governance/AUD-WI003-01_INDEPENDENT_READINESS_AUDIT.md)
permanece a evidência independente aplicável, e
[`GATE-WI003-01_READINESS.md`](../../../../../governance/GATE-WI003-01_READINESS.md)
permanece o bloqueio histórico de authority. Gates, decisões, Development
Cycle, Execution, reviews, audits e acceptance devem ser lidos em seus
artefatos aplicáveis quando existirem. A próxima ação legal é review
independente do resultado de WI-003, seguido da auditoria/decisão de aceite
exigidas para uma Work Item `MATERIAL`.
