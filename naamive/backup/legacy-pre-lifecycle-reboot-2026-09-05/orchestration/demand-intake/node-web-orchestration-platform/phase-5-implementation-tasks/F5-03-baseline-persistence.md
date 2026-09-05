---
task: F5-03
status: DONE
---

# F5-03 — Persistência do contexto de seleção, baseline e propagação de referência

## Referências

- [Planning: Technology Baseline, Revision, referências aplicadas e integridade transacional](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 5, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: tabelas da Fase 3 em `migrations/016_phase_3_module_delivery.sql`

## Implementar

1. Criar migration aditiva `027_phase_5_baseline_context.sql` com `technology_selection_contexts` (referencia uma revisão `PUBLISHED` e um perfil ativo congelado, com `hash`, ator, correlação e estado) e `technology_baselines` → `technology_baseline_revisions` (revisão imutável com `revision_number` monotônico, `status`, `technology_catalog_revision_id NOT NULL`, `selection_context_id`, `inventory_id`, `payload`, `schema_version`, `supersedes_revision_id`, ator e timestamps).
2. Criar `technology_baseline_revision_items` (somente referências `catalog_item_id`/`technology_catalog_revision_id` com `classification`, `version_constraint`, `reason` e referências auditáveis opcionais `source_profile_id`/`compatibility_rule_id`) e `technology_baseline_gates` (versão, `status`, feedback, `supersedes`), com índice parcial de no máximo um gate `OPEN` por revisão e sem colunas de texto livre de tecnologia.
3. Adicionar a coluna `technology_baseline_revision_id` a `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries`, `findings`, `jobs`; criar `qa_matrices` com `technology_baseline_revision_id NOT NULL`; adicionar a referência ao manifesto/validação de candidata por work item.
4. Implementar FKs compostas e triggers: igualdade da referência entre pai e filhos persistidos (`modules = module_revisions = module_gates`, `work_items = sua module_revision`, `deliveries = seu work_item`, `qa_matrices = sua delivery/work_item`, `findings = sua delivery`), vínculo de cada item ao `technology_catalog_revision_id` do seu contexto, ausência de cascata destrutiva e imutabilidade de revisão terminal.

## Aceite e comandos

Cobrir migration/restart, unicidade e monotonicidade da numeração, no máximo um `DRAFT` ativo por baseline, no máximo um gate `OPEN` por revisão, herança obrigatória da referência nos contratos de implementação e ausência de texto tecnológico livre no schema.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check
