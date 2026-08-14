---
task: F6-17
status: TODO
depends_on: [F6-01 through F6-16]
---

# F6-17 — Aceite consolidado da Fase 6

## Diretrizes para o agente

Faça uma autoauditoria contra o planning F6, estas tasks e o código entregue. Não marque qualquer item `DONE` por inspeção parcial: execute e registre os cenários. Quando todos concluírem, atualize a task, revise o diff, faça commit e push; não faça merge.

## Itens de implementação

- [ ] **TO_DO:** Demonstrar a jornada PRODUCE → OUTPUT_SUBMITTED → REVIEW → ACCEPT, comprovando que sucesso técnico e self-check não constituem aceite.
- [ ] **TO_DO:** Demonstrar independência verificável, exceção humana limitada, ausência de reviewer e review terminal sem cadeia automática de reviews.
- [ ] **TO_DO:** Demonstrar findings/rework/re-review: uma única coleção, F3 prevalente, deduplicação, duas rodadas e QA como único fechamento F3.
- [ ] **TO_DO:** Demonstrar block/assistência/routing/escalonamento: lifecycle completo, proposta com trade-offs/confiança, gate humano e nenhuma decisão reservada automática.
- [ ] **TO_DO:** Demonstrar handoffs atômicos, retry/restart/cancelamento, sanitização, auditoria/SSE, rollout opt-in e coexistência F3/F4/F5 preservada.
- [ ] **TO_DO:** Executar build completo, testes unitários, integração e E2E; revisar arquitetura, regressões, código morto, duplicação, TODOs introduzidos, erros e arquivos temporários.

## Comandos finais

```sh
cd /home/mhj/git/naamive/naamive/runtime/node-web
docker compose up -d postgres
npm run migrate && npm run build && npm test && npm run e2e
git -C /home/mhj/git/naamive diff --check
```

Marcar F6-01 a F6-17 como `DONE` somente após todos os cenários acima passarem e o comportamento legado permanecer certificado.

