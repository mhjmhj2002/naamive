---
task: F5-11
status: TODO
---

# F5-11 — Criação do DRAFT da Technology Baseline

## Referências

- [Planning: Technology Baseline Revision e comandos](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 4, 5, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/service.ts`, `src/phase3.ts` (padrão de criação com gate)

## Implementar

1. Implementar `CREATE_TECHNOLOGY_BASELINE_DRAFT` (servidor, somente após inventário resolvido e contexto válido): expande o Perfil ativo em itens de baseline e grava o `technology_catalog_revision_id` do contexto; rejeita qualquer tecnologia em texto livre ou referência fora do snapshot.
2. Fixar na revisão `DRAFT` o `technology_catalog_revision_id` `PUBLISHED`, armazenar `catalog_item_id`, `classification`, `version_constraint` (obrigatória somente quando `version_governance=REQUIRED` no snapshot) e `reason` por item, além do perfil de origem auditável.
3. Validar schema, FKs, presença do item e do perfil no snapshot, estado ativo congelado para nova seleção, política de versão, restrições e regras de compatibilidade da revisão publicada, rejeitando contradições antes de criar a revisão.
4. Apoiar a solução de decisões abertas pela arquitetura do módulo: referenciar decisão por identificação na revisão, declarar escolha concreta de itens ativos do mesmo snapshot e justificar, exigindo o gate da arquitetura para resolver todo deferimento aplicável.

## Aceite e comandos

Cobrir expansão do perfil, item inativo ou fora do snapshot, `version_constraint` obrigatória/ausente, contradição de classificação/deferimento, schema inválido e ausência de texto tecnológico livre.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check