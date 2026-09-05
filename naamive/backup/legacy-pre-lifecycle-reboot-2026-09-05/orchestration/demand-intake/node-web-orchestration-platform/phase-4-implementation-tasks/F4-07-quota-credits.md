---
task: F4-07
status: DONE
---

# F4-07 — Quota, créditos e indisponibilidade total

## Referências

- [Plano: quota e indisponibilidade](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: limite DeepSeek](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Normalizar sinais oficiais de saldo/crédito/franquia para `QUOTA_EXHAUSTED` e manter `RATE_LIMITED` separado, com causa e disponibilidade por runtime/executação.
2. Aplicar teto DeepSeek de US$ 1,00 por execução e US$ 10,00 por mês por uso/custo estruturado sanitizado; não recarregar ou ampliar automaticamente.
3. Após quota, usar um único fallback somente se já autorizado; com ambos indisponíveis, persistir `BLOCKED_NO_EXECUTOR_AVAILABLE`, tentativas, referências e próxima ação.
4. Preservar job, worktree e evidências sem saída vazia, sucesso simulado ou alternância de executores.

## Aceite e comandos

Cobrir quota no primário seguida de fallback, ambos sem quota, 429 versus quota, teto por execução/mês, custo ausente e bloqueio somente do trabalho afetado.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
