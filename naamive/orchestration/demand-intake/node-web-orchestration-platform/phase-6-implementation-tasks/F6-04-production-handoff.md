---
task: F6-04
status: TODO
depends_on: [F6-01, F6-02]
---

# F6-04 — Handoff de produção e work acceptance

## Diretrizes para o agente

Altere apenas o caminho de dispatch abrangido pela política F6. A transação precisa ser idempotente em retry/restart e não pode chamar o handoff de sucesso legado. Mantenha os itens atualizados (`TO_DO` → `DOING` → `DONE`), depois atualize a task, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Na criação de dispatch F6, criar na mesma transação `work_acceptance=PENDING_PRODUCE`, correlacionado à execução e selecionado pela política publicada.
- [ ] **TO_DO:** Após tentativa de produção validada, persistir referência sanitizada de saída, mover execução de `RUNNING` para `OUTPUT_SUBMITTED`, mover o aceite para `PENDING_REVIEW` e criar idempotentemente o dispatch `REVIEW`.
- [ ] **TO_DO:** Impedir nesse handoff toda conclusão de job/operação, promoção de workflow ou efeito de negócio; preservar a saída para decisões não aceitas.
- [ ] **TO_DO:** Fazer retry e reconciliador repetirem o mesmo handoff, sem duplicar dispatch, aceite, finding, block ou efeito de negócio; requests fora de F6 continuam no caminho F4 certificado.

## Aceite

Demonstrar que `OUTPUT_SUBMITTED` não promove estado e que restart em qualquer ponto entrega exatamente um review.

