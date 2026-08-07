---
task: F5-10
status: TODO
---

# F5-10 — Workflow `PROJECT_DISCOVERY` v3 e seleção de versão

## Referências

- [Planning: workflow, seleção de versão, gates e comandos](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 8, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: `src/service.ts` (`startProductDiscovery`, `transitionTarget`), `migrations/006` e `012` (seeds v1/v2)

## Implementar

1. Publicar `PROJECT_DISCOVERY` v3 completo copiando todos os estados, transições, guards e políticas de arquivamento de v2 (inclusive `WAITING_FOR_REVIEW_ADJUSTMENT`, recuperação de falha e `ARCHIVE_PROJECT` → `PROJECT_ARCHIVING`), acrescentando os estados e transições da baseline após o gate de produto.
2. Implementar o estado `TECHNOLOGY_SELECTION_PREPARING`, `TECHNOLOGY_BASELINE_IN_REVIEW`, `WAITING_FOR_TECHNOLOGY_BASELINE` e `READY_FOR_MODULE_MATERIALIZATION`, com transições `APPROVE_TECHNOLOGY_BASELINE`, `REQUEST_BASELINE_ADJUSTMENTS`, `MATERIALIZE_MODULE` e `START_TECHNOLOGY_BASELINE_REVISION`.
3. `startProductDiscovery` deixa de fixar `workflow_version=2`: para todo projeto criado após a publicação de v3, seleciona v3 na mesma transação que sai de `PROJECT_INTAKE/REGISTERED`; projetos que já iniciaram descoberta e todos os v2 continuam em sua versão, sem migração silenciosa.
4. A seleção de versão persiste no evento/operation e é imutável; o workflow desconhece tecnologias específicas, decidindo apenas por condições genéricas de snapshot válido, perfil aprovado e compatibilidades requeridas satisfeitas.

## Aceite e comandos

Cobrir publication de v3 sem editar definições/transições v2 já aplicadas, seleção atômica da versão ao iniciar descoberta para projeto novo, coexistência v2/v3 e arquivamento em cada estado ativo da baseline.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check