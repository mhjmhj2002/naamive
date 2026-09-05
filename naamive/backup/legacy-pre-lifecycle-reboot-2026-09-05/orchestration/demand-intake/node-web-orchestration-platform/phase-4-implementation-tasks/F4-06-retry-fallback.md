---
task: F4-06
status: DONE
---

# F4-06 — Retry, fallback e reconciliação governados

## Referências

- [Plano: retry, fallback e falhas](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: P0-15](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Separar retry de provider do retry de job: até dois retries no mesmo runtime, com `retry-after` ou 5 s/15 s, persistidos como tentativas.
2. Executar no máximo um fallback para o outro runtime, somente após a regra elegível e todos os filtros de política; impedir ping-pong e retry cego.
3. Normalizar classes e próxima ação; timeout, cancelamento em voo ou resposta perdida requerem reconciliação antes de qualquer nova tentativa.
4. Criar reconciliador idempotente que consulta efeito por `execution_id`/hash, persiste sucesso uma vez e bloqueia resultado ambíguo para intervenção.

## Aceite e comandos

Cobrir rede, indisponibilidade, timeout, 429, autenticação, configuração, saída inválida, falha funcional, limite de retry, fallback único, restart durante fallback e uma única tentativa em voo.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
