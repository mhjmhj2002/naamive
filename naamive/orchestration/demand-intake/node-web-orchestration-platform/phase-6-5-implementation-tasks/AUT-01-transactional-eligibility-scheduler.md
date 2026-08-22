---
task: AUT-01
status: TO DO
title: Scheduler transacional de elegibilidade
depends_on: [LR-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-01 — Scheduler transacional de elegibilidade

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
