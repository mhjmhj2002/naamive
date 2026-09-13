# CR-WI001-02 — Independent Code Review

**review_id:** CR-WI001-02
**review_type:** INDEPENDENT_CODE_REVIEW
**work_item:** WI-001
**execution_under_review:** EX-002
**previous_execution:** EX-001
**previous_review:** CR-WI001-01
**review_target_commit:** 186ebbadabc95b551484dd90cfec57a0afa5cfef
**rework_base_commit:** 52ba9221bc4a945b9c8507df323826484a0d8bb8
**implementation_principal:** agent:codex:implementation:EX-002
**reviewer_principal:** agent:codex:review:CR-WI001-02
**runtime_identity:** agent:codex:/root
**independence:** CONFIRMED — distinct logical principals
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**review_started_at:** 2026-09-12T20:40:00-03:00
**review_completed_at:** 2026-09-12T20:53:56-03:00
**result:** FAIL

## Escopo e método

Foi revisado integralmente o diff de rework entre
`52ba9221bc4a945b9c8507df323826484a0d8bb8` e
`186ebbadabc95b551484dd90cfec57a0afa5cfef`. `HEAD` coincidia com o commit-alvo;
não houve mistura com alterações posteriores. Também foi feita uma passada
proporcional no estado consolidado de WI-001 e nas projeções afetadas.

## Checks executados

- `corepack pnpm install --frozen-lockfile`: PASS (pnpm 12.3.4).
- `pnpm typecheck`, `pnpm architecture`, testes negativos dos guardrails,
  `pnpm test`, `pnpm build` e `pnpm test:e2e`: PASS. O host usa Node 24.18.1;
  o repositório continua pinado em 24.21.0 e isso não é finding do repositório.
- PostgreSQL 18.6 real: PASS para bootstrap, metadata Kysely em `platform`,
  serialização por advisory lock, migration via `naamive_migrator`, `SELECT` de
  runtime e negação de `CREATE TABLE` para `naamive_web` e `naamive_worker`.
- Provas negativas independentes: um `password` em
  `request.envelope.body.password` foi emitido sem redaction; um
  `import('@naamive/database/src/index.ts')` foi aceito pelo guardrail.
- `git diff --check` sobre o diff de rework: FAIL, por whitespace no fim de
  linhas novas em `executions/EX-002-WI001.md` e
  `executions/evidence/EX-002-WI001.md`.

## Disposição dos findings anteriores

| Finding | Disposição | Evidência |
|---|---|---|
| CR-WI001-F001 | RESOLVED | `migrate.ts` usa `pg_advisory_lock` antes de Kysely e `migrationTableSchema: 'platform'`; integração PostgreSQL 18.6 comprovou metadata e serialização concorrente. Apps não chamam migration no startup. |
| CR-WI001-F002 | RESOLVED | Bootstrap concede `CREATE` somente a `naamive_migrator` no schema `platform`; migration usa sua connection string. PostgreSQL real confirmou `CREATE=t/f/f` para migrator/web/worker, `SELECT` de runtime permitido e DDL negado. |
| CR-WI001-F003 | NOT_RESOLVED | Embora os caminhos cobertos pelo teste tenham sido redigidos, `request.envelope.body.password` com valor sintético foi emitido em claro. A proteção continua limitada por profundidade. |
| CR-WI001-F004 | NOT_RESOLVED | O parser cobre apenas `import`/`export` estáticos. Uma fixture com `import('@naamive/database/src/index.ts')` retornou `[]` de `violationsFor`, permitindo bypass de deep package import. |
| CR-WI001-F005 | RESOLVED | WI-001, DC-001 e projeções registram coerentemente DC-001 existente, EX-001 histórica, EX-002 concluída e WI-001 `IN_REVIEW`. |

## Novo finding

### CR-WI001-02-F001

**Severity:** NON_BLOCKING
**Category:** DOCUMENTATION

**Evidence:** `git diff --check 52ba9221... 186ebbad...` reporta whitespace
no fim de 43 linhas novas nos artefatos de EX-002.

**Expected:** O diff de rework deve passar o check de whitespace exigido para a
review.

**Observed:** O check retorna não-zero para as linhas Markdown adicionadas em
`EX-002-WI001.md` e sua evidência.

**Impact:** O check obrigatório não fica limpo e futuros defeitos de whitespace
ficam mascarados.

**Required action:** Remover o whitespace final das linhas afetadas no próximo
rework, preservando o conteúdo documental.

## Conclusão

**FAIL.** F001, F002 e F005 foram resolvidos. F003 continua bloqueante porque
segredos equivalentes em profundidade maior vazam para o log estruturado; F004
continua bloqueante porque imports dinâmicos contornam o guardrail. WI-001
permanece `IN_REVIEW`, EX-001 permanece `SUCCEEDED / HISTORICAL`, EX-002
permanece `SUCCEEDED`, e acceptance continua `NOT GRANTED / BLOCKED`.

Próxima ação: rework governado para F003/F004, incluindo a disposição do novo
finding não bloqueante, seguido de nova review independente. Esta review não
concede acceptance e não marca WI-001 como `DONE`.
