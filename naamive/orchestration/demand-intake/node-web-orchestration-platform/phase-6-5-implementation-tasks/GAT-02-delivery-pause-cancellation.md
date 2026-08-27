---
task: GAT-02
status: TO DO
prevalidation_status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: DELIVERY_PAUSE_CANCELLATION:v1
title: Entrega, pausa e cancelamento
depends_on: [LR-02, GAT-01, GAT-03]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-02 — Entrega, pausa e cancelamento

## Contrato obrigatório de pré-validação

Implementar exclusivamente conforme
[`GAT-02-delivery-pause-cancellation-prevalidation.md`](GAT-02-delivery-pause-cancellation-prevalidation.md)
(`DELIVERY_PAUSE_CANCELLATION:v1`). A pré-validação fecha package de entrega,
assurance técnica, aceite humano, pausa/retomada, cancelamento, required-set,
efeitos em voo, RBAC, idempotência, concorrência e legado. Ela está
`PREVALIDATION_READY_FOR_IMPLEMENTATION`; GAT-02 continua funcionalmente
`TO_DO` e nenhuma parte deste contrato foi implementada por esta alteração.

## Objetivo e problema corrigido

Completar `DELIVERY → DELIVERED`, rejeição/rework de entrega, `PAUSED`, retomada
e `CANCELLED`. Corrige aceite final inexistente e o uso de `ARCHIVED` como
cancelamento sem semântica normativa.

## Contexto, atual e esperado

Projeto/módulo não alcançam entrega aceita e operações de arquivamento misturam
encerramento administrativo com lifecycle. O novo fluxo prepara pacote de
entrega automaticamente, abre gate humano final, retorna achados à validação,
pausa qualquer estado ativo com last-state e cancela terminalmente preservando
artefatos e evidências.

## Invariantes

- aceite final exige autoridade de negócio autenticada;
- rejeição registra achados e retorna a `VALIDATION`, sem apagar pacote;
- pausa impede novos dispatches e retomada retorna exatamente ao último estado
  ativo após remoção do impedimento;
- cancelamento vence dispatch/review, é terminal e difere de archive/delete;
- módulo entregue deriva do controle do projeto, sem gate duplicado.

## Componentes prováveis

Workflows LR-01, agregador LR-02, gate service, delivery package, jobs/operações,
cancelamento/reconciliador, API/SSE/projeções e persistência.

## Dependências e restrições

Depende de LR-02, GAT-01 e GAT-03. Não abre PR (F7), não remove archive legado e
não cancela efeitos externos sem reconciliação/evidência.

## Estratégia de implementação e migração

Definir pacote/evidências; abrir gate versionado; aplicar decisões; implementar
last-active-state e precedência de pausa/cancelamento; reconciliar trabalho em
curso; manter histórico `ARCHIVED` como legado, sem renomeá-lo retroativamente.

## Critérios de aceite

- entrega aprovada promove projeto/módulos para `DELIVERED` uma vez;
- recusa/rework retorna com findings; risco material usa gate correto;
- pausa bloqueia dispatch e retomada restaura estado exato;
- cancelamento encerra de modo auditável e preserva dados;
- archive/delete permanecem operações distintas.

## Testes obrigatórios

Aceitar/rejeitar/rework, decisão concorrente/obsoleta, pausa em cada classe de
estado, retomada, cancelamento durante job/review/handoff/gate, precedência,
idempotência, autorização e coexistência `ARCHIVED`.

## Riscos e evidências esperadas

Riscos: entregar sem evidência, retomar estado errado e efeito após cancelamento.
Evidências: pacote/hashes, gates/atores, histórico de last-state, cancel records e
E2E até `DELIVERED`.
