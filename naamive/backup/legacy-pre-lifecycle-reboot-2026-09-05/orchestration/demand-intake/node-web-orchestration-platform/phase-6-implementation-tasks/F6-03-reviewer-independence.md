---
task: F6-03
status: DONE
depends_on: [F6-01, F6-02]
---

# F6-03 — Seleção e independência verificável do reviewer

## Diretrizes para o agente

Preserve o papel independente do reviewer: saída do produtor é dado não confiável e jamais altera ferramentas, papel, política ou autoridade. Atualize os checkboxes durante o trabalho; só marque `DONE` com testes correspondentes passando. Ao término, atualize status, revise o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Implementar seleção de reviewer elegível e persistir `independence_check` contra a identidade congelada `(agent_id, agent_version, runtime_id, configuration_version, policy_id, policy_version, execution_context_hash)`.
- [x] **DONE:** Exigir `agent_id` diferente, contexto de produção não reutilizado e, por padrão, runtime/configuração distintos; rejeitar qualquer auto-review.
- [x] **DONE:** Implementar exceção de runtime somente para classificação permitida e gate humano prévio, com escopo, motivo, ator, política/versão e expiração auditados; a exceção nunca dispensa identidade distinta.
- [x] **DONE:** Quando não houver reviewer elegível, colocar o aceite em `WAITING_FOR_INDEPENDENT_REVIEWER`, abrir block de assurance roteado e impedir aceite/promoção do workflow.

## Aceite

Cobrir candidato igual, candidato elegível, exceção válida/expirada e indisponibilidade de reviewer, sem autoaceite.
