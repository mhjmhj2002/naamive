---
task: F6-11
status: TODO
depends_on: [F6-02, F6-05, F6-06, F6-07, F6-08, F6-09]
---

# F6-11 — Auditoria, observabilidade e SSE

## Diretrizes para o agente

Todo evento F6 precisa ser correlacionável e sanitizado, sem mudar estado por efeito da projeção. SSE é derivado do estado canônico e deve suportar reconexão idempotente. Atualize os itens/estado da task, valide o diff, faça commit e push.

## Itens de implementação

- [ ] **TO_DO:** Emitir eventos auditáveis para criação/transição de aceite, seleção/checagem de independência, dispatch/decisão de review, finding/rework, block/assistência/routing, gate humano e reconciliação.
- [ ] **TO_DO:** Criar métricas e logs sanitizados para tempo até review/aceite, taxas de rework, ausência de reviewer, blocks por categoria, escalonamento e falhas de handoff, sem conteúdo de execução.
- [ ] **TO_DO:** Publicar eventos SSE/projeções de timeline versionados, ordenados e redatados, com recuperação por cursor e sem duplicar efeito de negócio em reconnect.
- [ ] **TO_DO:** Garantir retenção mínima, correlação entre execução/dispatch/aceite/review/block e índices compatíveis com consulta operacional.

## Aceite

Cobrir auditoria de cada decisão, sanitização, ordenação/reconnect SSE e observabilidade sem mutação canônica.

