---
task: F5-14
status: TODO
---

# F5-14 — Bloqueio da primeira materialização e propagação da revisão aprovada

## Referências

- [Planning: referências aplicadas e integridade transacional](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/phase3.ts` (`materializeModule`), `migrations/016...021` (referência da estrutura legada de módulo/QA/Dev) e a migration aditiva da Fase 5 (`027_phase_5_baseline_context.sql`, criada na F5-03) responsável pelas colunas `technology_baseline_revision_id` em `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries`, `findings`, `jobs` e pela nova tabela `qa_matrices`

## Implementar

1. Bloquear a criação do primeiro módulo de projeto v3 antes da aprovação da baseline: API e UI recusam `MATERIALIZE_MODULE` enquanto não houver revisão aprovada; projeto legado com `BASELINE_NOT_REQUIRED_LEGACY` mantém a regra existente.
2. `MATERIALIZE_MODULE` para v3 usa a última revisão aprovada por padrão ou aceita `technology_baseline_revision_id` explicitamente selecionada dentre as aprovadas do projeto e fixa-a na proposta do módulo; conflito de versão, baseline ausente ou tentativa de materializar com revisão não aprovada retorna erro explicável sem efeito.
3. Propagar a revisão aprovada a todos os contratos de implementação: módulo/revisão/gate, work item (da sua module revision), delivery (do seu work item), `qa_matrices`, findings (da sua delivery) e manifesto/validação de candidata por work item; toda escrita posterior a herda exclusivamente do pai persistido.
4. Aplicar a regra de arquitetura: todo contrato de implementação de projeto v3 referencia uma revisão `APPROVED`, nenhuma entidade é criada/atualizada sem essa referência nem diverge da referência herdada do seu pai, e todas as entidades de um mesmo fluxo pertencem ao mesmo projeto; única exceção é legado `BASELINE_NOT_REQUIRED_LEGACY`, sem caminho alternativo.

## Aceite e comandos

Cobrir bloqueio antes do gate, herança da revisão ao módulo/work item/QA/Dev/candidata, escolha de revisão aprovada, rejeição de revisão não aprovada, igualdade de referências entre pai/filhos e não bloqueio de legado.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check