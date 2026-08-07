---
task: F5-15
status: TODO
---

# F5-15 — API do Catálogo Tecnológico e da Technology Baseline

## Referências

- [Planning: API, web e SSE](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 4, 8](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/server.ts` (rotas regex por `/api/projects/:id/...`), `src/agent-runtime-contracts.ts`

## Implementar

1. Expor endpoints somente-leitura do Catálogo: `GET /api/technology/categories`, `GET /api/technology/catalog-items?category_id=:categoryId&status=ACTIVE`, `GET /api/technology/catalog-revisions/:catalogRevisionId`, `GET /api/technology/profiles?status=ACTIVE` e `GET /api/technology/profiles/:profileId`, retornando dados da revisão global `PUBLISHED` selecionável e a composição expandida do perfil em referências.
2. Expor endpoints aninhados no projeto: `GET /api/projects/:projectId/technology-baseline`, `GET /api/projects/:projectId/technology-baseline/selection-context`, `POST /api/projects/:projectId/technology-baseline/inventory`, `POST /api/projects/:projectId/technology-baseline/revisions`, `POST /api/projects/:projectId/technology-baseline/decision` e `POST /api/projects/:projectId/technology-baseline/revisions/:revisionId/start-revision`.
3. Aceitar corpos de criação/complemento/submissão exclusivamente pelo contrato estruturado (`selection_context_id`, `technology_catalog_revision_id`, `items` com `catalog_item_id`, `classification`, `version_constraint`, `reason` e referências auditáveis opcionais), ignorando/rejeitando campos de tecnologia em texto livre (`technology_name`, `ecosystem`, `technology_version`, `framework`).
4. Validar no servidor: revisão global igual à do `selection_context_id`, item do snapshot `PUBLISHED`, estado congelado que permite a operação e regras de compatibilidade satisfeitas; nenhum endpoint aceita fatos tecnológicos calculados pelo navegador.

## Aceite e comandos

Cobrir leitura do snapshot publicado e opções selecionáveis (somente perfil ativo e itens ativos), rejeição de texto tecnológico livre, contexto/revisão incompatíveis, item fora do snapshot e idempotência dos comandos.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check