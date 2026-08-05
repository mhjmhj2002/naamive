---
task: F3-08
status: DONE
---

# F3-08 — Projeção web e SSE da Fase 3

## Referências

- [Roadmap: F3-08](../01_DELIVERY_ROADMAP.md)
- [Planejamento: API, web e SSE](../09_PHASE_3_PLANNING.md)
- [North star](../00_PRODUCT_NORTH_STAR.md)
- Runtime: `src/server.ts`, `web/index.html`, `src/service.ts`, `src/phase3.ts`, `src/phase3-http.e2e.test.ts`, `src/http-acceptance.e2e.test.ts`.

## Implementar

1. Expor projeções sanitizadas e comandos versionados/idempotentes de toda jornada F3; conflito defasado é explicável e não causa efeito.
2. Mostrar estado, etapa, duração real, heartbeat, SHAs, evidências, findings, gates, bloqueio e próxima ação sem paths de host, prompts, saída bruta ou segredos.
3. Assinar/renderizar todos eventos F3 por SSE — inclusive restart, bloqueio, escalonamento, rework, candidata, integração e arquivamento — com replay por cursor sem duplicação.
4. Impedir que navegador injete SHA, worktree, resultado QA ou outro fato canônico.

## Aceite e comandos

E2E HTTP/web/SSE deve percorrer dois itens isolados, aprovado e pendente/reprovado, e mostrar atualização sem recarregar/duplicar. Cobrir timeout, interrupção e diagnóstico sanitizado.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
docker compose up -d postgres
npm run migrate && npm run e2e
git -C /home/mhj/git/naamive diff --check
```
