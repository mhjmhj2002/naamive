---
task: F6-14
status: TODO
depends_on: [F6-01, F6-02, F6-03, F6-04, F6-05, F6-06, F6-07, F6-08, F6-09]
---

# F6-14 — Testes unitários, persistência e idempotência

## Diretrizes para o agente

Escreva testes determinísticos, sem agente externo, credenciais ou chamadas reais. Cada correção encontrada é parte desta task quando ligada ao escopo F6. Mantenha os checkboxes atualizados e, ao término, atualize status, valide `git diff --check`, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Cobrir schemas/enums, política opt-in, classificação máxima, sanitização e invariantes de aceite/review/cancelamento.
- [ ] **TO_DO:** Cobrir seleção de reviewer, identidade congelada, auto-review proibido, exceção auditada/expirada e ausência de elegível.
- [ ] **TO_DO:** Cobrir transações/constraints de aceite, dispatch review, decisão terminal, finding/rework F3, block deduplicado, reabertura e gates humanos.
- [ ] **TO_DO:** Cobrir retry/restart e reconciliador para garantir ausência de dispatch, finding, block, decisão ou efeito de negócio duplicados.
- [ ] **TO_DO:** Cobrir limites/recorrência/ausência de progresso e a impossibilidade de terceira rodada F3 ou loop de review.

## Aceite

Executar build e toda a suíte unitária/persistência da task, incluindo casos de corrida e rollback transacional relevantes.

