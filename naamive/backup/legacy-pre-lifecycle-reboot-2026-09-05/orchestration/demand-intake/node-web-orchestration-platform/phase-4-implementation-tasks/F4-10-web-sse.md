---
task: F4-10
status: DONE
---

# F4-10 — Projeções web e SSE do runtime

## Referências

- [Plano: web/SSE](../13_PHASE_4_MULTI_PROVIDER_AGENT_RUNTIME_PLANNING.md)
- [Prontidão: flags e cenários](../14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md)

## Implementar

1. Projetar de eventos/persistência canônicos agente, tarefa, criticidade, política/versão, executor selecionado/efetivo, tentativas, retry, fallback, duração, uso/custo, erro, evidência e próxima ação.
2. Publicar todos os eventos F4 em SSE com cursor/replay sem duplicação, inclusive restart, reconciliação e bloqueio por indisponibilidade.
3. Expor comandos administrativos versionados e idempotentes, respeitando autorização; navegador nunca fornece runtime, versão, tentativa, resultado, SHA ou fato canônico.
4. Proteger projeções contra prompt, resposta, payload, stdout/stderr, segredo, caminho do host e variáveis de ambiente; campos novos permanecem sob flag.

## Aceite e comandos

Cobrir sucesso, fallback, bloqueio total, restart, cursor, atualização sem reload, conflito defasado e sanitização na API, HTML e SSE.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
