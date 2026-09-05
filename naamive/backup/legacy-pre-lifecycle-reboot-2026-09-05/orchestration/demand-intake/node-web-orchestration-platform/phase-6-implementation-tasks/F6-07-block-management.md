---
task: F6-07
status: DONE
depends_on: [F6-01, F6-02, F6-04]
---

# F6-07 — Gestão de blocks e assistência estruturada

## Diretrizes para o agente

`BLOCK` não é falha nem texto livre: preserve o fato nativo e use `work_blocks` como fonte de verdade F6. A assistência só recomenda; não pode mudar requisitos, arquitetura, política ou decisão humana. Mude os itens de `TO_DO` para `DOING`/`DONE`; no fim atualize a task, valide o diff, faça commit e push.

## Itens de implementação

- [x] **DONE:** Implementar o lifecycle `OPEN → DIAGNOSING → SOLUTION_PROPOSED → RESOLUTION_SELECTED → RESOLVING → RESOLVED`, mais `ESCALATED`, `PAUSED` e `CANCELLED`, com transições validadas.
- [x] **DONE:** Registrar fonte, execução/dispatch, alvo, categoria, sintomas, evidências, tentativas, causas suspeitas, severidade, responsável, resolução e evidência; implementar todas as categorias iniciais do planning.
- [x] **DONE:** Correlacionar sem substituir `BLOCKED_NO_EXECUTOR_AVAILABLE` F4 e `INTEGRATION_BLOCKED` F3, deduplicando block ativo; reabertura inicia ciclo novo ligado ao anterior.
- [x] **DONE:** Criar propostas de assistência baseadas em evidência/tentativas, alternativas, impactos, trade-offs, confiança, recomendação e especialista/decisão humana indicada, sem ação implícita.
- [x] **DONE:** Exigir resolução e evidência para `RESOLVED`; em pausa preservar block/executão e impedir dispatch; em cancelamento encerrar block e execução associada.

## Aceite

Cobrir lifecycle, deduplicação, reabertura, pausa/cancelamento e assistência incapaz de executar decisão reservada.
