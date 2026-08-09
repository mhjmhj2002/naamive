---
task: F5-07
status: DONE
---

# F5-07 — Validador de cardinalidade, classificação e deferimento

## Referências

- [Planning: cardinalidade, classificação e decisão aberta](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 5, 7](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)

## Implementar

1. Implementar o validador genérico de cardinalidade que agrupa itens selecionados por `category_id` e valida `min_selections`, `max_selections` e `selection_mode` genericamente contra a tabela de categorias, sem sobrescrever essas regras em perfil, workflow, API ou UI.
2. Implementar a validação de classificação e precedência (`PROHIBITED` nega > `REQUIRED` exige restrição compatível > `PREFERRED` orienta > `ALLOWED` permite) e a regra de que a classificação `REQUIRED` não autoriza exceder `max_selections` nem contornar `SINGLE`/`MULTIPLE`.
3. Implementar a decisão aberta explícita `DEFER_TO_MODULE_ARCHITECTURE` (escopada por `category_id`, com pergunta e justificativa auditáveis), que satisfaz decisão mínima sem contar como item selecionado e não pode coexistir com classificação tecnológica para a mesma decisão; não existe item `NONE`/`DEFER`.
4. Apoiar a validação da baseline: remoção de `REQUIRED` deve manter a baseline válida em cardinalidade, permitindo substituição por item ativo da mesma categoria ou deferimento explícito quando a política da categoria permitir.

## Aceite e comandos

Cobrir validação de `SINGLE`/`MULTIPLE`, `min`/`max` e `max=NULL` ilimitado, precedência de classificação, deferimento explícito e inválido, e ausência de item `NONE`/`DEFER`.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check
