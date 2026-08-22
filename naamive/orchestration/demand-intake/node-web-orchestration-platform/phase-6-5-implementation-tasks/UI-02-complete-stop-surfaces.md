---
task: UI-02
status: TO DO
title: Superfícies completas de parada
depends_on: [UI-01, REC-02, GAT-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# UI-02 — Superfícies completas de parada

## Objetivo e problema corrigido

Explicar e tornar acionáveis todas as paradas legítimas de gate, failure, retry,
rework, block, escalation, pause, delivery e recovery. Corrige estados em limbo,
gates ocultos e mensagens sem motivo/autoridade/continuação.

## Contexto, atual e esperado

A UI atual não cobre corretamente `REWORK_ELIGIBLE`,
`WAITING_FOR_ESCALATION`, reviewer falho, `INTEGRATION_BLOCKED`, entrega, pausa e
cancelamento. Cada painel deve informar por que parou, o que aguarda, quem pode
decidir, decisões válidas, evidências e como cada decisão continua o processo.
Estados automáticos apenas mostram progresso/recovery automático.

## Invariantes

- nenhuma parada técnica pede clique ordinário;
- ação humana existe somente se projetada/autorizada pelo servidor;
- detalhes sensíveis são redatados conforme classificação;
- acessibilidade, confirmação e feedback idempotente são obrigatórios;
- ausência de ação válida é defeito detectável, não estado vazio silencioso.

## Componentes prováveis

Painéis web de QA/review/rework/block/gate/integration/pause/delivery, projeções
UI-01, session/RBAC, SSE, acessibilidade e testes browser.

## Dependências e restrições

Depende de UI-01, REC-02 e GAT-02. Não oferece ação administrativa como caminho
ordinário nem expõe payload técnico que o servidor pode derivar.

## Estratégia de implementação e compatibilidade

Criar matriz estado/causa→mensagem/ação; componentes dirigidos por dados;
renderizar gate/authority/evidence; integrar confirmação e comandos; cobrir
estados legados com orientação segura e sem afirmar aderência retroativa.

## Critérios de aceite

- todos os estados em limbo da auditoria possuem mensagem e saída coerentes;
- gate mostra motivo, espera, autoridade, decisões e consequências;
- reviewer/block mostra fallback, routing, assistência e escalada;
- pausa permite retomar/cancelar; entrega permite aceitar/rejeitar/rework;
- estados automáticos informam automação e não exigem clique;
- RBAC visual coincide com autorização do servidor.

## Testes obrigatórios

E2E de cada parada, papel autorizado/não autorizado, ausência de ação técnica,
reconnect SSE, stale gate, confirmação, teclado/leitor de tela, redaction e
responsividade.

## Riscos e evidências esperadas

Riscos: UX mascarar limbo e divergência visual/servidor. Evidências: matriz de
cobertura, fixtures por parada, E2E browser e auditoria de acessibilidade/RBAC.
