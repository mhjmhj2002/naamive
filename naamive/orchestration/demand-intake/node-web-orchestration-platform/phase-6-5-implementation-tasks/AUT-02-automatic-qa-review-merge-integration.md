---
task: AUT-02
status: TO_DO
prevalidation_status: PREVALIDATION_READY_FOR_IMPLEMENTATION
title: Pipeline automático QA, review, merge e integração
depends_on: [AUT-01, REC-01, LR-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-02 — Pipeline automático QA → review → merge → integração

Contrato normativo obrigatório antes de qualquer código:
[`AUT-02-automatic-qa-review-merge-integration-prevalidation.md`](AUT-02-automatic-qa-review-merge-integration-prevalidation.md)
(`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1`). A task permanece `TO_DO`.

## Objetivo e problema corrigido

Implementar o contrato versionado para encadear output, QA determinístico,
review independente, `ACCEPT`, merge, candidata, validação e integração no
`WORK_ITEM_DELIVERY:v2`.

## Contexto, atual e esperado

Hoje o worker conclui desenvolvimento em `QA_IN_PROGRESS`/`EVIDENCE_REVIEW` com
`SUBMIT_QA`, mas não cria o próximo job. No fluxo esperado, cada handoff grava
intenção, job e evento atomicamente; somente `ACCEPT` habilita promoção; falha
gera retry, finding ou block pela causa; integração reavalia dependentes e macro
estado sem comando humano.

## Invariantes

- sucesso técnico, QA, ACCEPT, merge e integração são fatos distintos;
- QA/review/merge usam o mesmo snapshot imutável e SHA;
- somente Assurance persiste `ACCEPT`; ausência de policy/reviewer nunca autoaceita;
- REC-01 é a única autoridade para `EFFECT_UNKNOWN` e recovery;
- merge/candidata/integração têm fencing, idempotência e reconciliação Git;
- AUT-03, REC-02 e GAT-02 não são antecipadas; LR-02 é a única autoridade macro.

## Componentes prováveis

Worker, jobs/outbox, QA, assurance, `phase3.ts`, Git delivery, candidate services,
integration, agregador LR-02, eventos/SSE e reconciliador.

## Dependências e restrições

Depende de AUT-01, REC-01 e LR-02. Não amplia seletores F6 (AUT-03), não aceita
risco material e não substitui recuperação específica por retry genérico.

## Estratégia de implementação e compatibilidade

Implementar snapshot, ledger de intents, executores e projeções exatamente como
prevalidados. Endpoints v2 tornam-se reemit/reconcile governado; v1 permanece
legado, sem bypass de saga.

## Critérios de aceite

- output cria QA automático sobre snapshot congelado;
- QA pass cria review independente; só `ACCEPT` autoriza merge;
- QA/review/validation negativos produzem finding, rework ou stop corretos;
- merge, candidata, validation e integration são auditáveis e exatamente uma vez;
- crash/replay/concurrency convergem sem repetir efeito externo;
- WI integrado emite reavaliação LR-02, sem mutação macro direta;
- recurso já `CANCELLED` é fenced/no-op; cancelamento funcional é GAT-02.

## Testes obrigatórios

Executar a matriz completa da prevalidation em PostgreSQL real, incluindo
happy path, QA failure, `REWORK`/`BLOCK`/`ESCALATE`, no reviewer, stale SHA,
REC-01 Git recovery, crash/replay, concorrência, revision antiga, recurso já
`CANCELLED` e coexistência legada.

## Riscos e evidências esperadas

Riscos: autoaceite, merge duplicado, SHA obsoleto e saga parcial. Evidências:
ledger de handoffs, intents/hashes, eventos ordenados, manifesto Git e resultados
E2E do fluxo sem cliques técnicos.
