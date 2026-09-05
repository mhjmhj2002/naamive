---
task: F4-12
status: DONE
---

# F4-12 — Migração de consumidores e corte de chamadas diretas

## Referências

- [Plano: resultado e critérios finais](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: P0-19](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Migrar worker, agentes e consumidores para `AgentExecutionService`; remover chamadas diretas ao launcher fora do `CodexCliAdapter`.
2. Cortar em ordem por flags desligadas por padrão: serviço Codex-only, persistência de tentativa, projeção web/SSE, DeepSeek `PUBLIC`, e `INTERNAL` somente após aceite de redaction.
3. Garantir paridade Codex-only de input, output, transição, artefato, erro, lease e idempotência; não criar migration reversa destrutiva.
4. Implementar reversão apenas para novos jobs, preservando execuções/tentativas e reconciliando dispatches incertos.

## Aceite e comandos

Cobrir cada flag desligada/ligada, paridade antes/depois, rollback sem perda de fatos, proibição de chamada direta e DeepSeek bloqueado fora de classificação habilitada.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
