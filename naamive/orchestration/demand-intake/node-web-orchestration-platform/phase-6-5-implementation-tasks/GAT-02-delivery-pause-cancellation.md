---
task: GAT-02
status: TO DO
prevalidation_status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: DELIVERY_PAUSE_CANCELLATION:v1
title: Entrega, pausa e cancelamento
depends_on: [LR-02, GAT-01, GAT-03, AUT-03]
consumes_contracts: [EffectiveRequiredModuleSet:v1, ASSURANCE_EXPANSION_TO_REAL_WORK:v1]
conceptual_guardrails: [REC-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-02 — Entrega, pausa e cancelamento

## Contrato obrigatório de pré-validação

Implementar exclusivamente conforme
[`GAT-02-delivery-pause-cancellation-prevalidation.md`](GAT-02-delivery-pause-cancellation-prevalidation.md)
(`DELIVERY_PAUSE_CANCELLATION:v1`). A pré-validação fecha a sequência não
circular `DeliveryPreparationSnapshot:v1` → preparação → `DeliveryPackage:v1`
final → assurance técnica → aceite humano, além de pausa/retomada,
cancelamento, required-set, efeitos em voo, RBAC, idempotência, concorrência e
legado. Ela está
`PREVALIDATION_READY_FOR_IMPLEMENTATION`; GAT-02 continua funcionalmente
`TO_DO` e nenhuma parte deste contrato foi implementada por esta alteração.

## Objetivo e problema corrigido

Completar `DELIVERY → DELIVERED`, as decisões de entrega `APPROVE` e `REWORK`,
`PAUSED`, retomada e `CANCELLED`. Corrige aceite final inexistente e o uso de `ARCHIVED` como
cancelamento sem semântica normativa.

## Contexto, atual e esperado

Projeto/módulo não alcançam entrega aceita e operações de arquivamento misturam
encerramento administrativo com lifecycle. O novo fluxo prepara pacote de
entrega automaticamente, abre gate humano final, retorna achados à validação,
pausa qualquer estado ativo preservando `previous_active_state` e cancela
terminalmente preservando artefatos e evidências.

## Invariantes

- aceite final exige autoridade de negócio autenticada;
- `REWORK` registra achados e retorna a `VALIDATION`, sem apagar pacote;
- pausa impede novos dispatches; resume preserva `previous_active_state`, mas
  só retorna a ele quando continua normativamente válido após revalidar
  cancellation, parent state, workflow/version, generation, package, gate,
  acceptance, policy, dependencies e jobs/leases/fences; se estiver stale ou
  inválido, mantém `PAUSED` e entra em `RESUME_RECONCILIATION_REQUIRED`;
- cancelamento vence dispatch/review, é terminal e difere de archive/delete;
- módulo entregue deriva do controle do projeto, sem gate duplicado.

## Componentes prováveis

Workflows LR-01, agregador LR-02, gate service, delivery package, jobs/operações,
cancelamento/reconciliador, API/SSE/projeções e persistência.

## Dependências e restrições

As dependências funcionais são LR-02 (required-set), GAT-01 (gate) e GAT-03
(identidade/RBAC), além de AUT-03 para a Assurance técnica do package final.
REC-02 é guardrail conceitual e consumidor posterior de blocks/recovery de
Assurance: não é pré-requisito funcional para criar snapshot, job ou package.
Não abre PR (F7), não remove archive legado e não cancela efeitos externos sem
reconciliação/evidência.

## Estratégia de implementação e migração

Congelar inputs de preparação; persistir outputs e materializar o package final
imutável; aplicar Assurance sobre o package final e abrir gate versionado;
implementar `previous_active_state` e resume revalidado fail-closed, além da
precedência de pausa/cancelamento; reconciliar trabalho em curso; manter
histórico `ARCHIVED` como legado, sem renomeá-lo retroativamente.

## Critérios de aceite

- `APPROVE` promove projeto/módulos para `DELIVERED` uma vez;
- `REWORK` retorna com findings; risco material usa gate correto;
- pausa bloqueia dispatch; resume só restaura `previous_active_state` quando
  ele permanece normativamente válido, ou mantém `PAUSED` e exige
  `RESUME_RECONCILIATION_REQUIRED`;
- cancelamento encerra de modo auditável e preserva dados;
- archive/delete permanecem operações distintas.

## Testes obrigatórios

`APPROVE`/`REWORK`, decisão concorrente/obsoleta, pausa em cada classe de
estado, resume com estado anterior válido e stale, cancelamento durante
job/review/handoff/gate, precedência, idempotência, autorização e coexistência
`ARCHIVED`.

## Riscos e evidências esperadas

Riscos: entregar sem evidência, restaurar cegamente estado stale e efeito após
cancelamento. Evidências: pacote/hashes, gates/atores, histórico de
`previous_active_state`, cancel records e E2E até `DELIVERED`.
