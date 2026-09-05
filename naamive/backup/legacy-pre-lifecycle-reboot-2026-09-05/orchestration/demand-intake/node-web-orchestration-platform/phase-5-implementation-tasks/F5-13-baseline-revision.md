---
task: F5-13
status: DONE
---

# F5-13 — Nova revisão da Technology Baseline e reformulação

## Referências

- [Planning: workflow e comandos; evidências de mudança material](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 7, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)

## Implementar

1. Implementar `START_TECHNOLOGY_BASELINE_REVISION` (operador, a partir de revisão `REJECTED` ou `APPROVED`): inicia nova preparação de contexto e, apenas depois dela, cria novo `DRAFT` monotônico que aponta `supersedes_revision_id`.
2. Nenhum rascunho é editado: corrigir conteúdo marca o anterior `SUPERSEDED`/abandonado e cria outro rascunho numerado; submeter cria novo gate.
3. Gerar evidência `technology-baseline-revision` com revisão anterior, resumo de diferenças classificadas e decisão aplicável; uma nova revisão de baseline reinicia a preparação e obtém o snapshot `PUBLISHED` então selecionável, preservando o contexto anterior para histórico.
4. Após aprovação, `READY_FOR_MODULE_MATERIALIZATION` permanece disponível: iniciar nova revisão não bloqueia módulos enquanto houver ao menos uma revisão aprovada, e novos módulos recebem por padrão a última aprovada ou outra aprovada escolhida pelo operador.

## Aceite e comandos

Cobrir início a partir de `REJECTED`/`APPROVED`, rascunho monotônico com `supersedes_revision_id`, nenhuma edição de rascunho, novo gate na submissão, evidência de mudança e coexistência de revisões aprovadas para preservar módulos existentes.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check
