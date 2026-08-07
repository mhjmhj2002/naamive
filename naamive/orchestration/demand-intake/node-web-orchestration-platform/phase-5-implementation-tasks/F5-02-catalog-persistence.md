---
task: F5-02
status: TODO
---

# F5-02 — Persistência versionada do Catálogo Tecnológico e do Inventário read-only

## Referências

- [Planning: Technology Categories, Catalog, Revision, Technology Inventory e referências aplicadas](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 2-4, 6](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: padrões de `migrations/025_phase_4_agent_runtime.sql`, `migrations/016_phase_3_module_delivery.sql`

## Implementar

1. Criar migration aditiva `026_phase_5_technology_catalog.sql` introduzindo `technology_categories`, `technology_catalog_items`, `technology_catalog_revisions` e `technology_compatibility_rules`, exatamente dentro do contrato físico aprovado (colunas, FKs, checks de enum genérico, `UNIQUE(category_id, code)`, unicidade `NULLS NOT DISTINCT` de regras, `UNIQUE(revision_number)`).
2. Criar as tabelas de associação congeladas `technology_catalog_revision_categories`, `technology_catalog_revision_items` (com `metadata`), `technology_catalog_revision_profiles`, `technology_catalog_revision_profile_items` e `technology_catalog_revision_compatibility_rules`, com `PRIMARY KEY(revision_id, ...)` e FKs compostas que vinculam identidade corrente.
3. **Criar a estrutura persistente da tabela read-only `technology_inventory`** na mesma migration aditiva, ligada ao projeto, ao `repository_sha`, à execução/job que a produziu e à `technology_catalog_revision_id` `PUBLISHED` usada, com as colunas de fato sanitizado (`source_path`, `detector_code`, `confidence`, valor resumido, resultado de resolução e `catalog_item_id` quando resolvido), sem cascata destrutiva e sem colunas/dados de conteúdo integral, credencial ou segredo. Esta é a única fonte persistente do inventário; a task F5-08 apenas a utiliza/popula e não inventa DDL.
4. Implementar triggers/guards transacionais: `code`/`category_id` imutáveis após publicação, `selection_mode`/`min`/`max` checks, `SINGLE` com `max_selections=1`, ausência de `ON DELETE CASCADE` em dados publicados/referenciados, e bloqueio de atualização de associações congeladas de revisão `PUBLISHED`/`SUPERSEDED`.
5. Garantir que o banco não contenha enum, coluna, constraint ou tabela que represente tecnologia concreta; somente valores genéricos de ciclo de vida, classificação e tipo de regra.

## Aceite e comandos

Cobrir migration/restart, unicidade e imutabilidade, checks de cardinalidade, ausência de cascata destrutiva, campos de auditoria, existência e read-only da tabela `technology_inventory` (sem serialização de conteúdo/segredo) e inexistência de referência a tecnologia concreta no schema.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check