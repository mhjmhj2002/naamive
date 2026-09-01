---
task: F6-17
status: DONE
depends_on: [F6-01 through F6-16]
---

# F6-17 — Aceite consolidado da Fase 6

## Diretrizes para o agente

Faça uma autoauditoria contra o planning F6, estas tasks e o código entregue. Não marque qualquer item `DONE` por inspeção parcial: execute e registre os cenários. Quando todos concluírem, atualize a task, revise o diff, faça commit e push; não faça merge.

## Itens de implementação

- [x] **DONE:** Demonstrar a jornada PRODUCE → OUTPUT_SUBMITTED → REVIEW → ACCEPT, comprovando que sucesso técnico e self-check não constituem aceite.
- [x] **DONE:** Demonstrar independência verificável, exceção humana limitada, ausência de reviewer e review terminal sem cadeia automática de reviews.
- [x] **DONE:** Demonstrar findings/rework/re-review: uma única coleção, F3 prevalente, deduplicação, duas rodadas e QA como único fechamento F3.
- [x] **DONE:** Demonstrar block/assistência/routing/escalonamento: lifecycle completo, proposta com trade-offs/confiança, gate humano e nenhuma decisão reservada automática.
- [x] **DONE:** Demonstrar handoffs atômicos, retry/restart/cancelamento, sanitização, auditoria/SSE, rollout opt-in e coexistência F3/F4/F5 preservada.
- [x] **DONE:** Executar build completo, testes unitários, integração e E2E; revisar arquitetura, regressões, código morto, duplicação, TODOs introduzidos, erros e arquivos temporários.

## Comandos finais

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

Marcar F6-01 a F6-17 como `DONE` somente após todos os cenários acima passarem e o comportamento legado permanecer certificado.

## Evidência consolidada executada — 2026-08-14 (final)

Resultado: **aprovado para aceite F6**.

- PostgreSQL: migrations aditivas 044–047 aplicadas e `npm run migrate` reaprovado de forma repetível antes do fechamento.
- Contratos: oito JSON Schemas F6 fechados/versionados aprovados por fixtures válidas e rejeição de propriedades extras/dados proibidos.
- Unidade/integração: `npm test` aprovado, incluindo F3 rework/QA, F4 runtime e F5 baseline/inventário.
- E2E consolidado: `npm run e2e` aprovado contra PostgreSQL local, sem cenários obrigatórios ignorados.
- E2E F6 dedicado: falha real do reviewer → retry do mesmo dispatch → restart → uma única decisão terminal; reviewer inelegível sem autoaceite; rework → revalidação → review independente v2; recorrência sem progresso escalada; lifecycle de blocks, gates e comandos idempotentes; cancelamento HTTP somente por `ON_CALL_OWNER`, com precedência sobre review e bloqueios; projeções por projeto/módulo/work item/correlação e SSE HTTP real com cursor, replay e reconexão idempotente, sem conteúdo sensível.
- F3 na consolidação: deduplicação de finding/rework, teto de duas rodadas e fechamento exclusivamente pela QA posterior permanecem validados no fluxo proprietário.
- UI F6: `web-ui-f6-12.e2e.test.ts` integrou a execução E2E e validou comandos por papel, confirmação, motivo/evidência, EventSource sem polling, degradação/reconexão, acessibilidade e sanitização.
