# Tasks de implementação — Fase 6

> Registro histórico de execução da fundação F6. O escopo aqui descrito foi
> entregue de modo aditivo e opt-in. A ampliação posterior aos fluxos reais foi
> entregue pela Fase 6.5, por versões novas e sem reinterpretação de requests
> legados; consulte o planejamento F6.5 e TST-01 para a certificação vigente.

Execute uma task por vez; atualize o item correspondente no roadmap somente depois de seu aceite. A Fase 6 acrescenta assurance a dispatches selecionados por política, sem reinterpretar requests legados F4/F5 nem alterar o lifecycle macro.

| Ordem | Task | Dependência |
| --- | --- | --- |
| 1 | [F6-01 — Contratos e política de assurance](F6-01-assurance-contracts.md) | — |
| 2 | [F6-02 — Persistência aditiva e segurança](F6-02-assurance-persistence.md) | F6-01 |
| 3 | [F6-03 — Seleção e independência do reviewer](F6-03-reviewer-independence.md) | F6-01, F6-02 |
| 4 | [F6-04 — Handoff de produção e work acceptance](F6-04-production-handoff.md) | F6-01, F6-02 |
| 5 | [F6-07 — Blocks e assistência](F6-07-block-management.md) | F6-01, F6-02, F6-04 |
| 6 | [F6-08 — Routing, advisory e gates humanos](F6-08-routing-advisory-gates.md) | F6-01, F6-02, F6-07 |
| 7 | [F6-05 — Serviço de review independente](F6-05-independent-review.md) | F6-01 a F6-04, F6-07, F6-08 |
| 8 | [F6-06 — Findings e rework F3](F6-06-findings-rework.md) | F6-02, F6-05 |
| 9 | [F6-09 — Handoff de bloqueio e reconciliação](F6-09-block-handoff-reconciliation.md) | F6-04, F6-07, F6-08 |
| 10 | [F6-10 — APIs e projeções sanitizadas](F6-10-api-projections.md) | F6-05 a F6-09 |
| 11 | [F6-11 — Auditoria, observabilidade e SSE](F6-11-audit-observability-sse.md) | F6-02, F6-05 a F6-09 |
| 12 | [F6-12 — UI operacional](F6-12-web-ui.md) | F6-10, F6-11 |
| 13 | [F6-13 — Migração, rollout e coexistência](F6-13-migration-rollout-coexistence.md) | F6-01 a F6-12 |
| 14 | [F6-14 — Testes unitários e de persistência](F6-14-tests-unit-persistence.md) | F6-01 a F6-09 |
| 15 | [F6-15 — Integração e jornadas E2E](F6-15-tests-integration-e2e.md) | F6-10 a F6-14 |
| 16 | [F6-16 — Regressão F3/F4/F5](F6-16-regression-coexistence.md) | F6-13 a F6-15 |
| 17 | [F6-17 — Aceite consolidado](F6-17-acceptance.md) | F6-01 a F6-16 |

Fonte canônica: [planning da Fase 6](../15_PHASE_6_AGENT_SUPERVISION_AND_ASSURANCE.md), além do [roadmap](../01_DELIVERY_ROADMAP.md), contratos e tasks das Fases 3, 4 e 5.
