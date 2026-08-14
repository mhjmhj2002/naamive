---
task: F6-09
status: DONE
depends_on: [F6-04, F6-07, F6-08]
---

# F6-09 — Handoff de bloqueio e reconciliação

## Diretrizes para o agente

Antes de terminalizar F6, classifique a falha pela política e execute operações correlatas em uma transação. Não altere a terminação imediata dos pedidos legados/fora de F6. Atualize os status de item durante o trabalho e finalize com status da task, diff validado, commit e push.

## Itens de implementação

- [x] **DONE:** Implementar classificação versionada de falha bloqueável para indisponibilidade de executor, bloqueio de política, reconciliação ambígua e demais casos definidos em política.
- [x] **DONE:** Na mesma transação, persistir fato técnico sanitizado, criar/correlacionar `work_block`, mudar aceite para `BLOCKED` e job/operação para `BLOCKED`, retirar lease e impedir avanço de workflow.
- [x] **DONE:** Liberar somente dispatch posterior autorizado após resolução selecionada e evidenciada; falha não bloqueável segue o tratamento da política.
- [x] **DONE:** Fazer reconciliador detectar sucesso ou bloqueio pendente e aplicar exatamente os mesmos handoffs idempotentes, respeitando cancelamento.

## Aceite

Cobrir block antes de falha terminal, retry/restart, reconciliação ambígua, resolução e preservação F4 fora do opt-in.
