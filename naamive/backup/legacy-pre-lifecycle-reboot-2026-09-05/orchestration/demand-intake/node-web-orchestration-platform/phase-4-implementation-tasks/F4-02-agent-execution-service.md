---
task: F4-02
status: DONE
---

# F4-02 — AgentExecutionService como única entrada

## Referências

- [Plano: fluxo soberano](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: ciclo de vida e idempotência](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Criar `AgentExecutionService` como única porta entre worker e adapters, com unicidade `(job_id, idempotency_key)` e estados/transições aprovados.
2. Persistir execução e tentativa planejada antes do dispatch; worker apenas entrega job leased e não chama launcher/adapter nem classifica falhas.
3. Validar request, seleção e saída; materializar evidência sanitizada no ArtifactStore antes de solicitar transição ao domínio.
4. Cancelamento, crash, timeout e resposta perdida após dispatch transitam para `RECONCILIATION_REQUIRED`; nunca criar duas tentativas `DISPATCHED`.

## Aceite e comandos

Cobrir replay, concorrência, lease, cancelamento antes/durante/depois, crash entre persistência/dispatch, saída inválida e reconciliação sem efeito duplicado.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
