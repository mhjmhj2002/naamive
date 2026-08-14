---
task: F6-06
status: TODO
depends_on: [F6-02, F6-05]
---

# F6-06 — Findings, rework e re-review compatíveis com F3

## Diretrizes para o agente

Use exclusivamente a coleção canônica de findings F3 e faça F3 prevalecer para `work_item`. Não crie fluxo corretivo paralelo ou terceira rodada. Atualize os itens durante a execução e, ao final, atualize status, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Persistir findings `ASSURANCE_REVIEW` com origem, execução/dispatch/aceite/review, alvo, categoria, severidade, critério, evidência, ação, resolução e evidência de resolução.
- [ ] **TO_DO:** Para `work_item` F3, tornar `REWORK` uma única transação que cria/vincula finding e `rework_decision` F3 deduplicada por finding/delivery/SHA, aplica guard e move exclusivamente para `REWORK_ELIGIBLE`.
- [ ] **TO_DO:** Reutilizar decisão equivalente sem novo dispatch; fazer a correção seguir o fluxo F3 e fechar finding F6 apenas após revalidação QA aprovada de delivery posterior.
- [ ] **TO_DO:** Para alvos fora de F3, aplicar política versionada de limite, fingerprint recorrente e ausência de progresso; escalar em vez de criar loop infinito.

## Aceite

Cobrir deduplicação, duas rodadas F3, re-review obrigatório, guard ativo e escalonamento por limite/progresso.

