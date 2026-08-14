---
task: F6-05
status: TODO
depends_on: [F6-01, F6-02, F6-03, F6-04, F6-07, F6-08]
---

# F6-05 — Serviço de review independente

## Diretrizes para o agente

Implemente o review como execução mediada, nunca como extensão do produtor. Não delegue automaticamente uma decisão de review para outro review. Atualize os status dos itens no arquivo; após testes, atualize a task, revise o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Construir `review-package` sanitizado a partir de contrato/atividade autorizada, entradas, saídas esperadas, evidência requerida, critérios de completude, referências/hash/metadados, decisões e saída estruturada validada.
- [ ] **TO_DO:** Calcular classificação como máximo dos componentes e aplicar egress, runtime e permissões compatíveis; excluir payloads, prompts, logs, segredos e caminhos internos.
- [ ] **TO_DO:** Despachar review apenas após a verificação de independência e validar decisão estruturada `ACCEPT`, `REWORK`, `BLOCK` ou `ESCALATE` com evidência/rastreabilidade.
- [ ] **TO_DO:** Em `ACCEPT`, aplicar uma vez o efeito de negócio, marcar aceite `ACCEPTED`, concluir job/operação e promover workflow; nas demais decisões preservar saída e impedir promoção.
- [ ] **TO_DO:** Na decisão `BLOCK` do reviewer, criar ou correlacionar na mesma transação o `work_block` de assurance, mudar o aceite para `BLOCKED` e iniciar assistência/routing; preservar o fato/estado nativo F3/F4 e não concluir, falhar ou promover job/operação/workflow indevidamente.

## Aceite

Cobrir pacote sanitizado, classificação, decisão inválida, idempotência, a única promoção possível por `ACCEPT` e `REVIEW → BLOCK` transacional sem alteração indevida do estado nativo F3/F4.
