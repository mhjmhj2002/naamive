---
task: F5-01
status: DONE
---

# F5-01 — Contratos neutros do Technology Catalog e da Baseline

## Referências

- [Planning: modelo de domínio e contratos](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios arquiteturais normativos: 1-10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: padrões de `src/agent-runtime-contracts.ts`, `src/agent-runtime-contracts.test.ts`, `phase-4-contracts/`

## Implementar

1. Definir tipos e interfaces neutras do domínio para categoria, item de catálogo, revisão de catálogo, perfil, item de perfil, regra de compatibilidade, inventário, contexto de seleção, baseline, revisão de baseline, item de baseline e decisão por deferimento.
2. Definir os schemas JSON Draft 2020-12 `technology-catalog/v1/...` e `technology-baseline/v1` (payload da revisão exige `technology_catalog_revision_id`, `catalog_item_id`, `classification`, `version_constraint` obrigatória quando `version_governance=REQUIRED`, e `reason`), rejeitando propriedades extras e campos de tecnologia em texto livre (`technology_name`, `ecosystem`, `technology_version`, `framework`).
3. Garantir que os tipos sejam neutros: a engine conhece somente enums genéricos de ciclo de vida, classificação, `selection_mode`, `relationship_type`, `severity` e resultado de resolução; nenhum nome, fornecedor, linguagem, framework, banco ou versão concreta aparece em tipo, schema, API ou validação.
4. Declarar as constantes canônicas (classificação, `selection_mode`, `relationship_type`, `severity`, estados de revisão, resultado de resolução, `version_governance`), sem duplicá-las em contratos divergentes.

## Aceite e comandos

Cobrir payloads válidos e inválidos, propriedades extras, referências sem conteúdo, versão obrigatória quando `REQUIRED`, decisão aberta explícita e ausência de texto tecnológico livre em tipo, schema e validação.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
npm run build && npm test
git -C /home/mhj/git/naamive diff --check
