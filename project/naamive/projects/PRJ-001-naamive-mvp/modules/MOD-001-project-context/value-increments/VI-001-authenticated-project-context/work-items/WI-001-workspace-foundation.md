# WI-001 — Repository / Workspace Foundation

**State:** IN_REVIEW
**Project:** PRJ-001  
**Module:** MOD-001 — Project Context  
**Owner:** PRJ-001 — NAAMIVE MVP  
**Governing scope:** PROJECT  
**Value Increment reference:** VI-001 — Authenticated Project Context  
**Impact:** MATERIAL  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Depends on:** none  
**Development Cycle:** DC-001 (`development-cycles/DC-001-WI001.md`)
**Execution:** EX-001 (`executions/EX-001-WI001.md`) — SUCCEEDED
**Readiness authority:** GRANTED / EXERCISED
**Readiness decision:** `governance/HUMAN_APPROVAL_WI001_READINESS.md`

## Reason / business intention

This Work Item exists because its outcome is required to materialize or prove the
finite value of VI-001 without forcing the implementation agent to invent a
material product/architecture decision.

## Relation to plan

Canonical proposed entry in DevelopmentRoadmap v2. Its readiness gate was
approved and exercised; a Development Cycle remains required before any
Execution or implementation.

## Outcome

Create the reproducible monorepo/workspace/build/guardrail foundation required by the first Value Increment.

## Out of scope

Business/domain behavior; authentication rules; Project/VI lifecycle mutation.

## Envelope técnico e governança aplicável (referências já em vigor)

Esta seção não introduz decisão nova. Ela apenas torna explícitas referências já
aprovadas/em vigor que governam este Work Item.

```text
Technology Baseline v0.10............ APPROVED / FROZEN
                                      technology/01_TECHNOLOGY_BASELINE.md
TIR v1.0............................. APPROVED
                                      readiness/01_TECHNICAL_IMPLEMENTATION_READINESS.md
Versões exatas (pins)................ readiness/04_VERSION_SNAPSHOT.md
Implementation Foundation Contract... readiness/02_IMPLEMENTATION_FOUNDATION_CONTRACT.md
Primeira fatia (correspondência)..... readiness/03_FIRST_VERTICAL_SLICE_PLAN.md (VS-01)
```

Já decidido e aplicável a este escopo:

```text
pnpm workspaces (TB-04)
apps/web + apps/worker como composition roots (TB-03, TIR-007)
layout físico inicial do repositório/monorepo (TIR-006)
module privacy / importações proibidas (TB-06, TB-08, TIR-008)
guardrails automáticos no build/CI (TB-10, TIR-008, TIR-040)
PostgreSQL 18.6 (TB-19, TIR-002) e integração real em container (TIR-041)
migrations forward-only com etapa explícita, sem migration no startup (TB-116..TB-118, TIR-011)
roles de banco (TIR-013)
Node.js 24.21.0 / pnpm 12.3.4 / TypeScript 7.0.2 / ESM (TIR-001, TIR-003, TIR-004)
sem regra de negócio em composition root (TIR-007, readiness/02)
```

Governança aplicável ao avanço deste Work Item:

```text
readiness............... lifecycle/05 (seção 5) e governance/03_GATE_POLICY.md (seção 30)
audit independente...... governance/04_AUDIT_AND_REVIEW_POLICY.md (seção 23),
                         lifecycle/05 (seção 5.1)
TIR != Execution........ DEC-002 (decisions/DEC-002_TIR_LIFECYCLE_PRECEDENCE.md)
PROPOSED não executa.... lifecycle/05 (seção 4.4)
```

O mecanismo concreto de guardrail é detalhe de implementação delimitado pelo
envelope aprovado: deve cobrir integralmente as violações exigidas por TB-10,
TIR-008 e TIR-040, sem alterar boundaries ou enfraquecer regras, e registrar
dependências/evidências conforme a policy de versões aplicável. O conteúdo do
pacote `kernel` não é fixado por esta seção.

A alocação de health e logging abaixo foi decidida pelo Project Owner em
`DEC-006_WI001_FOUNDATION_OBSERVABILITY_ALLOCATION.md`; ela torna explícitas
obrigações já vigentes de `readiness/02_IMPLEMENTATION_FOUNDATION_CONTRACT.md`
sem alterar a Planning Baseline.

## Dependency satisfaction condition

Round-1 approval materialized on the same audited baseline; no predecessor WI.

A dependency is not satisfied merely because its file exists, an agent was
assigned, or an Execution started.

## Acceptance criteria

- pnpm workspace bootstrap reproducible
- apps/web and apps/worker composition roots
- packages/contracts, kernel, database, modules, testing
- strict TypeScript / ESM
- architecture guardrails executable
- PostgreSQL 18.6 integration available
- web health endpoints `/health/live` and `/health/ready`
- worker equivalent machine-readable health
- minimum structured logging foundation compatible with `readiness/02`
- no business rules placed in composition roots

## Required tests

- frozen pnpm install succeeds from committed lockfile
- TypeScript strict/ESM typecheck and build pass
- architecture guardrails reject forbidden deep/private imports
- real PostgreSQL 18.6 integration bootstrap succeeds
- workspace/app composition-root smoke tests pass
- web health smoke/behavior verifies `/health/live` and `/health/ready`
- worker equivalent machine-readable health is verified
- structured logging bootstrap is verified against the `readiness/02` contract

## Required evidence

- tool/version snapshot and lockfile digest
- pipeline outputs for install/typecheck/architecture/integration/build
- workspace tree / configuration diff
- implementation diff/artifact scoped to this WI
- health smoke/behavior, worker-health and structured-logging bootstrap outputs
- finding references and baseline classification if scope changed

## Review / audit requirement

Because this WI is `MATERIAL`, an independent proportional audit is required
before the relevant readiness/acceptance advancement unless an upstream audit
explicitly proves exact coverage of this WI, same scope, same baseline, same
material decision and current risks/findings.

No such reuse is assumed automatically.

## Normative owner / TB-140 physical mapping

```text
normative owner....... PROJECT: PRJ-001
TB-140 anchor......... PROJECT_TRANSVERSAL
project_id............ PRJ-001
value_increment_id.... NULL
```

This mapping is governed by
`decisions/DEC-005_TB140_WORK_ITEM_OWNER_MAPPING.md`.

The TB-140 physical discriminator is not a substitute for lifecycle ownership.

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

`READY` does not authorize code, Execution or implementation. The first valid
Execution has now started under its recorded operational claim:

```text
READY → IN_PROGRESS
```

`EX-001` produced the technical result and the Work Item now awaits its
separate review/audit and acceptance decisions:

```text
IN_PROGRESS → IN_REVIEW
review........ NOT EXECUTED
acceptance.... NOT GRANTED
audit......... PENDING AS APPLICABLE
```

A material gap opens a Finding and stops only the affected scope according to
the Gap Protocol.
