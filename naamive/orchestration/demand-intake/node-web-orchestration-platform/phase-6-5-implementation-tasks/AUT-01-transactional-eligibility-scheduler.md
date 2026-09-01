---
task: AUT-01
status: DONE
title: Scheduler transacional de elegibilidade
depends_on: [LR-01, GAT-01, GAT-03]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-01 — Scheduler transacional de elegibilidade

## Pré-validação arquitetural — 2026-08-23

O runtime reutiliza `work_items`, `work_item_external_blockers`, `operations`,
`deliveries`, `worktrees`, `jobs` e `events`. As constraints existentes de
delivery/worktree/job ativo são o backstop de uma attempt ativa; AUT-01 adiciona
uma migration para decisões auditáveis e uma identidade única de dispatch por
WI, revisão e versão, sem usar contador de tentativa como unicidade.

O predicado versionado é `WORK_ITEM_DELIVERY:v2/eligibility/v1`:

```text
workflow == WORK_ITEM_DELIVERY:v2
AND state == ELIGIBLE_FOR_DISPATCH
AND no active external blocker
AND every predecessor == INTEGRATED
AND no active delivery
AND no pause/gate state
AND global development capacity available
```

`INTEGRATED` é propositalmente a única prova de dependência nesta task: nem job
`COMPLETED`, nem QA e nem produção técnica satisfazem a dependência. AUT-02
registrará ACCEPT + integração antes de tornar esse fato verdadeiro.

O scheduler bloqueia o WI com `FOR UPDATE`, revalida o predicado no banco,
contabiliza as deliveries ativas e, numa única transação, grava decisão,
operation, reservation de delivery/worktree, job e evento. Git, criação física
de worktree e agente acontecem somente no worker após commit. A concorrência usa
locks de linha, índices parciais existentes e a identidade única do dispatch;
o reconciler reutiliza exatamente o mesmo scheduler e ordena candidatos por
`created_at, id`. Eventos de aprovação de plano e resolução do último blocker
chamam o scheduler; capacity/restart usam o reconciler como safety net.

Capacidade é global e configurada por `NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY`
(default 1). Sem vaga, o WI continua elegível e recebe decisão
`WAITING_CAPACITY`, não um novo estado de lifecycle. As razões persistidas são
`BLOCKED_EXTERNAL_INPUT`, `WAITING_DEPENDENCIES`, `WAITING_CAPACITY`,
`ACTIVE_ATTEMPT_EXISTS`, `PAUSED`, `NOT_ELIGIBLE`, `ELIGIBLE` e `DISPATCHED`.

Riscos controlados: um crash antes de commit não deixa reservation; depois de
commit o job/delivery existem juntos e o reconciler redescobre o WI/job. AUT-01
não implementa QA, review, ACCEPT, merge, integração, assurance, pause/cancel,
macro-lifecycle ou UI. O hook futuro de AUT-02 é a reavaliação do dependente
quando ela persistir `INTEGRATED` após ACCEPT.

## Evidência de conclusão — 2026-08-23

AUT-01 está `DONE`. A suíte PostgreSQL cobre DAG simples, roots paralelas,
cadeia, fan-out, fan-in, ciclo determinístico sem materialização parcial,
execução/QA/ACCEPT sem integração, capacidade disponível/no limite/esgotada,
competição pelo último slot, replay, trigger e reconciler concorrentes,
rollback no meio da transação, restart/reconciler e o cenário Métrica/Interface.
O teste de crash confirma que decision, operation, worktree reservation,
delivery, job e evento são revertidos juntos; a avaliação seguinte cria uma
única reservation recuperável. Nenhuma funcionalidade de AUT-02, REC-01,
LR-02, QA, review, ACCEPT, merge, integração ou macro-lifecycle foi antecipada.

## Objetivo e problema corrigido

Despachar automaticamente WIs autorizados pelo plano quando dependências,
blockers, capacidade e política permitirem. Corrige ausência de scheduler,
autorização individual, dependentes esquecidos e perda/obsolescência de blockers.

## Contexto e comportamento atual

`approveModulePlan` apenas insere WIs; `startDevelopment` é chamado externamente
e só rejeita dependência pendente. Blockers externos múltiplos podem ser
sobrescritos e sua resolução não dispara nova avaliação.

## Comportamento esperado e invariantes

- aprovação do plano agenda todas as raízes elegíveis;
- `ACCEPT` + integração, resolução de blocker, liberação de capacidade e recovery
  provocam reavaliação;
- fan-in/fan-out, múltiplos blockers e limite de worktrees são transacionais;
- exatamente uma tentativa ativa por WI, mesmo com eventos/chaves concorrentes;
- predecessor só satisfaz dependência após aceite e integração exigidos;
- blocker humano mantém o WI parado somente enquanto ativo.

## Componentes prováveis

Novo serviço de scheduling, `approveModulePlan`, resolução de blockers,
acceptance/merge callbacks, jobs/outbox, worktree capacity, eventos e projeções.

## Dependências e restrições

Depende de LR-01. Não executa QA/merge (AUT-02), não decide gate, não usa polling
sem coordenação transacional e não permite ao client declarar elegibilidade.

## Estratégia de implementação e migração

Modelar predicados versionados de elegibilidade; bloquear candidatos no banco;
reservar WI/capacidade e criar operação/job/evento atomicamente; usar chave
determinística por WI/revisão/tentativa; reavaliar por eventos e reconciliador.
Migrar blockers para cardinalidade correta sem apagar evidência; classificar WIs
legados com LR-01 antes de qualquer dispatch.

## Critérios de aceite

- plano aprovado despacha raízes e não pede autorização por WI;
- dependente é despachado após predecessor aceito/integrado;
- blocker externo impede e, ao ser resolvido, reavalia automaticamente;
- múltiplos blockers não se sobrescrevem e metadados ativos ficam coerentes;
- corridas, replay e restart não criam dois jobs/deliveries/worktrees;
- capacidade esgotada deixa fila observável e reavaliável.

## Testes obrigatórios

DAG, ciclo rejeitado, fan-in/fan-out, roots paralelas, múltiplos blockers,
resolução, worktree limit, duas chaves concorrentes, crash entre reserva/job,
replay de evento, PostgreSQL real e cenário WI Métrica/Interface da auditoria.

## Riscos e evidências esperadas

Riscos: dispatch prematuro, starvation, deadlock e duplicação. Evidências:
predicados publicados, constraints/locks, timeline de decisões de elegibilidade,
métricas de fila e testes de concorrência/idempotência.
