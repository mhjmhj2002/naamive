---
task: UI-01
status: TO DO
title: Projeção única de estado e allowed_actions
depends_on: [AUT-01, REC-01, GAT-01, GAT-03, AUT-03, REC-02, GAT-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# UI-01 — Projeção única de estado e `allowed_actions`

## Objetivo e problema corrigido

Criar uma única projeção server-side de estado, causa, próxima ação e ações
permitidas, e um único dono de renderização. Corrige renderers/observers
concorrentes, botões legados, mensagens falsas e autoridade inferida no client.

## Contexto, atual e esperado

`web/index.html` acumula renderers compatíveis concorrentes; ações somem ou
reaparecem e `QA_IN_PROGRESS` pode dizer que há execução quando não há job. A
resposta do servidor deve conter estado canônico/projetado, workflow/version,
atividade real, parada, motivo e `allowed_actions` autorizadas para o ator.

## Invariantes

- client nunca deriva transição, elegibilidade, recovery ou autoridade;
- `allowed_actions` é informativo; endpoint revalida estado/autoridade;
- SSE solicita refresh/aplica projeção ordenada, sem loop de fetch/mutação;
- uma ação incompatível nunca é exibida nem aceita;
- estado legado é legível e explicitamente identificado.

## Componentes prováveis

`projection.ts`, APIs detail, SSE, `web/index.html` ou estrutura web sucessora,
state/action schemas, session GAT-03 e testes DOM/browser.

## Dependências e restrições

Depende de AUT-01, REC-01, GAT-01, GAT-03, AUT-03, REC-02 e GAT-02. O contrato
normativo de implementação é
[`STATE_ACTION_PROJECTION:v1`](UI-01-single-state-action-projection-prevalidation.md).
UI-02 cobre painéis específicos. Não introduzir polling simulando progresso nem
reescrever frontend além do menor refactor que garanta ownership único.

## Estratégia de implementação e compatibilidade

Inventariar renderers/actions; publicar schema único; centralizar builder de
ações; substituir renderização incrementalmente; remover observers concorrentes;
preservar leitura de projetos legados por adapter de projeção server-side.

## Critérios de aceite

- um renderer explícito é dono de cada superfície;
- ações vêm exclusivamente do servidor e incluem requisito de confirmação/dados;
- nenhum botão de autorização individual, QA, merge ou integração aparece no
  caminho automático ordinário;
- SSE/replay/troca de projeto não duplica requests nem restaura ação obsoleta;
- mensagem nunca afirma job ativo sem lease/atividade correspondente.

## Testes obrigatórios

Contrato de projeção por estado/causa/papel, DOM por action, estado legado,
SSE cursor/replay/out-of-order, troca de projeto, race após comando, autorização
servidor e navegador real.

## Riscos e evidências esperadas

Riscos: regressão da UI ampla e stale action. Evidências: schema/examples,
inventário de renderers removidos, contagem de requests, screenshots/DOM E2E e
testes de comando rejeitado após mudança concorrente.
