# Tasks de implementação — Fase 4

Execute uma task por vez e atualize o roadmap somente após seu aceite. Preserve o modo Codex-only até o corte controlado de F4-12.

| Ordem | Task | Dependência |
| --- | --- | --- |
| 1 | [F4-01 — Contratos neutros](F4-01-neutral-contracts.md) | Gate F4 aprovado |
| 2 | [F4-08 — Persistência e segurança](F4-08-persistence-security.md) | F4-01 |
| 3 | [F4-02 — Serviço único](F4-02-agent-execution-service.md) | F4-01, F4-08 |
| 4 | [F4-03 — Adapter Codex](F4-03-codex-adapter.md) | F4-01, F4-02 |
| 5 | [F4-04 — Adapter DeepSeek](F4-04-deepseek-adapter.md) | F4-01, F4-08 |
| 6 | [F4-05 — Políticas determinísticas](F4-05-execution-policies.md) | F4-02, F4-08 |
| 7 | [F4-06 — Retry e fallback](F4-06-retry-fallback.md) | F4-02 a F4-05 |
| 8 | [F4-07 — Quota e créditos](F4-07-quota-credits.md) | F4-04, F4-06 |
| 9 | [F4-09 — Auditoria e observabilidade](F4-09-audit-observability.md) | F4-02, F4-06 a F4-08 |
| 10 | [F4-10 — Web e SSE](F4-10-web-sse.md) | F4-09 |
| 11 | [F4-12 — Migração e corte](F4-12-consumer-migration.md) | F4-03, F4-05 a F4-10 |
| 12 | [F4-11 — Aceite controlado](F4-11-acceptance.md) | F4-01 a F4-10, F4-12 |

Fontes canônicas: [roadmap](../01_DELIVERY_ROADMAP.md), [plano](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md), [pacote de prontidão](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md), [ADR](../12_ADR_PROVIDER_NEUTRAL_AGENT_EXECUTION_RUNTIME.md) e [contratos](../phase-4-contracts/).
