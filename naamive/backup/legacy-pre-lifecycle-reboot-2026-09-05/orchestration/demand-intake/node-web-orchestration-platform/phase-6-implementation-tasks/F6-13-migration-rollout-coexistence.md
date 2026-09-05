---
task: F6-13
status: DONE
depends_on: [F6-01, F6-02, F6-03, F6-04, F6-05, F6-06, F6-07, F6-08, F6-09, F6-10, F6-11, F6-12]
---

# F6-13 — Migração, rollout e coexistência F3/F4/F5

## Diretrizes para o agente

Planeje e execute o corte somente de forma aditiva, opt-in e reversível para dispatches novos. Não migre nem reinterprete resultados históricos. Atualize os itens no próprio arquivo, e depois do aceite atualize status, valide o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Criar procedimento de migration com pré-checagens, índices/retenção, backfill proibido para legado e relatório de compatibilidade, aplicável em ambiente vazio e com histórico F3/F4/F5.
- [x] **DONE:** Implementar publicação/seleção controlada de política F6, rollout opt-in e reversão que afeta somente dispatches ainda não criados, sem apagar histórico ou alterar execuções em curso.
- [x] **DONE:** Documentar e automatizar verificação de coexistência: F4 legado termina em `SUCCEEDED`, F3 preserva QA/rework/gates e F5 preserva baseline/workflow.
- [x] **DONE:** Atualizar documentação operacional de deploy, rollback, reconciliação e observabilidade, incluindo a distinção entre rollback de política e rollback de schema.

## Aceite

Demonstrar migration repetível, rollout/reversão de novos dispatches e todas as jornadas anteriores inalteradas.
