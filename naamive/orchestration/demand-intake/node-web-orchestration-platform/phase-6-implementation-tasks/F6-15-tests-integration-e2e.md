---
task: F6-15
status: DONE
depends_on: [F6-10, F6-11, F6-12, F6-13, F6-14]
---

# F6-15 — Testes de integração e jornadas E2E

## Diretrizes para o agente

Use repositório/ambiente descartável e agentes simulados controlados. Valide API, persistência, SSE e UI sem expor dados brutos. Atualize os itens durante a execução; após todos passarem, atualize status, revise o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Provar que sucesso do produtor fica em `OUTPUT_SUBMITTED`/`PENDING_REVIEW` e só `ACCEPT` conclui job/operação e promove o fluxo.
- [x] **DONE:** Provar reviewer inelegível ou ausente: nenhum autoaceite, aceite aguardando reviewer e block/routing operacional criado.
- [x] **DONE:** Provar `REWORK` F3: cria ou vincula uma única decisão, respeita duas rodadas, retorna a review independente e fecha somente por QA posterior.
- [x] **DONE:** Provar restart em handoff/review, falha bloqueável antes de terminalizar job/operação, resolução autorizada e cancelamento que impede aceite/re-review.
- [x] **DONE:** Provar block F4 correlacionado sem mudança de estado técnico, advisory não executando decisão humana, API/UI/SSE sanitizados e reconnect sem duplicação.

## Aceite

Executar E2E completo contra PostgreSQL, com evidência automatizada de todos os cenários mínimos do planning.
