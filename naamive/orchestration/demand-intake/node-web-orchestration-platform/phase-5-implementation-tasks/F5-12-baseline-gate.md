---
task: F5-12
status: TODO
---

# F5-12 — Submissão da baseline e gate versionado de aprovação

## Referências

- [Planning: gates e comandos; evidências e auditoria](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- [Princípios normativos: 8, 10](../10_PHASE_5_TECHNOLOGY_BASELINE_PLANNING.md)
- Runtime: padrão de gate em `src/service.ts` (`GATE_DECISION`, `events`), `src/artifacts.ts`

## Implementar

1. Implementar `SUBMIT_TECHNOLOGY_BASELINE` (operador, somente para `DRAFT`): revalida perfil, catálogo e compatibilidades contra o contexto fixado, valida o schema e cria um único gate novo `OPEN` vinculado àquela revisão, mudando-a para `PENDING_APPROVAL`; nunca atualiza gate.
2. Implementar `DECIDE_TECHNOLOGY_BASELINE` (operador, exige versão do gate aberto): aprova ou rejeita definitivamente; rejeição exige feedback, preserva a revisão/gate e retorna a `TECHNOLOGY_BASELINE_IN_REVIEW`.
3. Persistir decisão com versão do gate, decisão, feedback e hash da revisão, emitindo o artefato `technology-baseline-decision`; `REQUEST_BASELINE_ADJUSTMENTS` fecha o gate como `REJECTED` e nunca retorna para editar o objeto rejeitado.
4. Garantir no máximo um gate `OPEN` por revisão (índice parcial) e no máximo uma decisão por revisão; todo comando aceita `idempotency-key`, retorna `ACCEPTED` com `operation_id` quando assíncrono e registra evento persistido com ator de `NAAMIVE_OPERATOR_ID`.

## Aceite e comandos

Cobrir submissão válida/inválida de `DRAFT`, gate único `OPEN`, aprovação/rejeição com versão, rejeição sem feedback, ajuste fechando gate `REJECTED`, idempotência e evidência no ArtifactStore.

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test
git -C /home/mhj/git/naamive diff --check