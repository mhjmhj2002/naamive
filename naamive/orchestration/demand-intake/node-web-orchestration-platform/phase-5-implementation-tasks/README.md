# Tasks de implementação — Fase 5

Execute uma task por vez e atualize o roadmap somente após seu aceite. A Fase 5 publica o Catálogo Tecnológico, o workflow `PROJECT_DISCOVERY` v3 e a Technology Baseline; a engine permanece genérica e não conhece tecnologias específicas.

| Ordem | Task | Dependência |
| --- | --- | --- |
| 1 | [F5-01 — Contratos neutros](F5-01-contracts.md) | Gate F5 aprovado |
| 2 | [F5-02 — Persistência do catálogo e do inventário](F5-02-catalog-persistence.md) | F5-01 |
| 3 | [F5-03 — Persistência da baseline/contexto](F5-03-baseline-persistence.md) | F5-01, F5-02 |
| 4 | [F5-04 — Seeds versionados](F5-04-seeds.md) | F5-01, F5-02 |
| 5 | [F5-05 — Publicador transacional](F5-05-catalog-publisher.md) | F5-02, F5-04 |
| 6 | [F5-06 — Avaliador de compatibilidade](F5-06-compatibility-evaluator.md) | F5-02, F5-04 |
| 7 | [F5-07 — Validador de cardinalidade/classificação](F5-07-cardinality-validator.md) | F5-02, F5-06 |
| 8 | [F5-10 — Workflow PROJECT_DISCOVERY v3](F5-10-workflow-v3.md) | F5-03 |
| 9 | [F5-09 — Contexto de seleção](F5-09-selection-context.md) | F5-03, F5-05, F5-06, F5-10 |
| 10 | [F5-08 — Inventário read-only](F5-08-inventory.md) | F5-02, F5-05, F5-09 |
| 11 | [F5-11 — Criação da Baseline DRAFT](F5-11-baseline-draft.md) | F5-07, F5-08, F5-09 |
| 12 | [F5-12 — Submissão e gate da baseline](F5-12-baseline-gate.md) | F5-10, F5-11 |
| 13 | [F5-13 — Nova revisão da baseline](F5-13-baseline-revision.md) | F5-09, F5-12 |
| 14 | [F5-14 — Propagação e bloqueio de materialização](F5-14-propagation-and-blocking.md) | F5-10, F5-12, F5-13 |
| 15 | [F5-15 — API do catálogo e da baseline](F5-15-api.md) | F5-05, F5-07, F5-11, F5-12, F5-14 |
| 16 | [F5-16 — SSE e projeção da baseline](F5-16-sse-projection.md) | F5-10, F5-12, F5-14, F5-15 |
| 17 | [F5-17 — UI dirigida por dados](F5-17-web-ui.md) | F5-15, F5-16 |
| 18 | [F5-18 — Testes unitários, persistência e idempotência](F5-18-tests-unit-persistence.md) | F5-01, F5-02, F5-03, F5-04, F5-05, F5-06, F5-07 |
| 19 | [F5-19 — Testes de integração de inventário e workflow](F5-19-tests-integration.md) | F5-08, F5-09, F5-10, F5-11, F5-12, F5-13, F5-14 |
| 20 | [F5-20 — Regressão Fase 3 e coexistência](F5-20-phase3-regression.md) | F5-10, F5-14, F5-16, F5-17, F5-18, F5-19 |
| 21 | [F5-21 — Aceite consolidado](F5-21-acceptance.md) | F5-01 a F5-20 |
| 22 | [F5-22 — Planejamento autônomo de módulos](F5-22-autonomous-module-planning.md) | F5-17, F5-20 |
| 23 | [F5-23 — Decomposição autônoma e auditável do plano](F5-23-autonomous-plan-decomposition.md) | F5-22 |
| 24 | [F5-24 — Revisão visual e auditável do plano de módulo](F5-24-module-plan-review-ui.md) | F5-22, F5-23 |
| 25 | [F5-25 — Projeção fiel e diagnóstico do runtime de desenvolvimento](F5-25-development-runtime-projection.md) | F5-23 |

Fontes canônicas: [roadmap](../01_DELIVERY_ROADMAP.md), [planning Fase 5](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md), [auditoria Fase 5](../PHASE_5_TECHNOLOGY_BASELINE_AUDIT.md), [planning Fase 4](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md), [prontidão Fase 4](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md) e [contratos Fase 4](../phase-4-contracts/).

Ocorrências encontradas durante o teste manual: [Bugs de teste da Fase 5](BUGS_PHASE_5_TESTING.md).
