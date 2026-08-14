---
task: F5-16
status: DONE
---

# F5-16 — SSE e projeção da baseline na timeline

## Referências

- [Planning: API, web e SSE; evidências](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 8, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/server.ts` (SSE `/api/projects/:id/events`), `web/index.html` (replay por cursor)

## Implementar

1. Publicar os eventos de timeline `TECHNOLOGY_SELECTION_CONTEXT_READY`, `TECHNOLOGY_INVENTORY_STARTED`, `TECHNOLOGY_INVENTORY_READY`, `TECHNOLOGY_BASELINE_SUBMITTED`, `TECHNOLOGY_BASELINE_APPROVED`, `TECHNOLOGY_BASELINE_ADJUSTMENTS_REQUESTED` e `TECHNOLOGY_BASELINE_REVISION_STARTED`.
2. Implementar projeção por replay por cursor sem duplicação, mostrando resumo sanitizado, duração, próxima ação, `technology_catalog_revision_id` e referências de evidência; não projetar nomes tecnológicos como dado autoritativo.
3. Registrar os artefatos canônicos mínimos `technology-inventory`, `technology-baseline`, `technology-baseline-decision` e `technology-baseline-revision` no `ArtifactStore`, observando o protocolo de intenção, escrita, hash, transação e reconciliação.
4. Garantir que corpo de configuração, conteúdo, tokens, URLs com credenciais, stdout/stderr e prompts completos sejam proibidos em evidência, SSE e projeção.

## Aceite e comandos

Cobrir publicação/sequência dos sete eventos, replay por cursor sem duplicação, projeção sanitizada na timeline e evidência canônica dos quatro artefatos no ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
