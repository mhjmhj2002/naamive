---
task: AUT-02
status: TO DO
title: Pipeline automático QA, review, merge e integração
depends_on: [AUT-01, REC-01, LR-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-02 — Pipeline automático QA → review → merge → integração

## Objetivo e problema corrigido

Encadear automaticamente output, QA, review independente, `ACCEPT`, merge,
candidata, validação e integração. Corrige `QA_IN_PROGRESS` sem job e os cliques
técnicos para `/qa`, `/merge`, candidata, validação e integração.

## Contexto, atual e esperado

Hoje o worker conclui desenvolvimento em `QA_IN_PROGRESS`/`EVIDENCE_REVIEW` com
`SUBMIT_QA`, mas não cria o próximo job. No fluxo esperado, cada handoff grava
intenção, job e evento atomicamente; somente `ACCEPT` habilita promoção; falha
gera retry, finding ou block pela causa; integração reavalia dependentes e macro
estado sem comando humano.

## Invariantes

- output/sucesso técnico não é aceite;
- QA e review usam SHA/evidência congelados;
- cada handoff é idempotente e reconciliável após crash;
- merge preserva ancestralidade e garantias Git F3;
- finding impede candidata/integração; divergência não é resolvida implicitamente;
- pipeline automático para apenas em gate explícito ou falha não recuperável.

## Componentes prováveis

Worker, jobs/outbox, QA, assurance, `phase3.ts`, Git delivery, candidate services,
integration, agregador LR-02, eventos/SSE e reconciliador.

## Dependências e restrições

Depende de AUT-01, REC-01 e LR-02. Não amplia seletores F6 (AUT-03), não aceita
risco material e não substitui recuperação específica por retry genérico.

## Estratégia de implementação e compatibilidade

Definir stateful saga/handoffs transacionais; criar jobs automáticos; congelar
inputs/hashes; aplicar QA e review; em `ACCEPT`, agendar merge e próximos passos;
usar reconciliador por intenção. Manter endpoints manuais apenas como recovery
governado/admin enquanto houver coexistência, nunca como caminho ordinário.

## Critérios de aceite

- output cria QA e review sem comando externo;
- `ACCEPT` promove e integra exatamente uma vez;
- QA/review negativos geram finding/rework/block correto;
- merge/candidata/validação/integração são automáticos e auditáveis;
- crash em qualquer fronteira converge sem duplicação;
- integração reavalia dependentes e macro-estados.

## Testes obrigatórios

Happy path completo, QA reprovada, review `REWORK`/`BLOCK`, Git divergente,
push falho, retry/restart, crash antes/depois de cada handoff, cancelamento
concorrente, replay e cenário WI Persistência da auditoria em PostgreSQL real.

## Riscos e evidências esperadas

Riscos: autoaceite, merge duplicado, SHA obsoleto e saga parcial. Evidências:
ledger de handoffs, intents/hashes, eventos ordenados, manifesto Git e resultados
E2E do fluxo sem cliques técnicos.
