---
task: F4-11
status: DONE
---

# F4-11 — Testes, aceite controlado e smoke opcional

## Referências

- [Plano: testes e aceite](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: cenários obrigatórios](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Consolidar suítes unitárias, integração fake e E2E PostgreSQL determinísticas, isoladas por cenário e sem credenciais, custo ou chamadas reais.
2. Provar Codex-only com paridade; quota no primário, fallback autorizado e sucesso/validação no secundário; ArtifactStore, timeline, auditoria, web e SSE.
3. Provar ambos sem quota, timeout, cancelamento, lease perdida, resposta perdida, restart, `retry-after`, saída inválida, egress bloqueado e reconciliação, sempre com estado, próxima ação e uma tentativa em voo.
4. Criar smoke real opcional e explicitamente confirmado para cada adapter, em contexto descartável e teto de custo; ele não bloqueia o aceite determinístico.

## Comandos finais

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate
npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

Marcar F4-01 a F4-12 `DONE` somente quando todos os cenários obrigatórios passarem, nenhum segredo/conteúdo bruto persistir e todos os fluxos usarem o serviço único.
