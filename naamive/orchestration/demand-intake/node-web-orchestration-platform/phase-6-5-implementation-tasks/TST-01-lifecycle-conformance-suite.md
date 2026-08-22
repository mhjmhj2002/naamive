---
task: TST-01
status: TO DO
title: Suíte de conformidade do lifecycle
depends_on: [LR-01, LR-02, AUT-01, AUT-02, AUT-03, REC-01, REC-02, GAT-01, GAT-02, GAT-03, UI-01, UI-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# TST-01 — Suíte de conformidade do lifecycle

## Objetivo e problema corrigido

Criar a certificação transversal que prova que documentação normativa,
workflows, runtime, persistência, API, UI e SSE obedecem ao mesmo contrato.
Corrige testes que reforçam autorização individual e sucessos estreitos que não
demonstram a jornada automática completa.

## Contexto, atual e esperado

As fases anteriores possuem cobertura extensa, mas em contratos/versionamentos
isolados. A suíte nova não substitui testes de cada task: consolida os vinte
critérios globais, incluindo negativos que provam que transições e cliques
indevidos não ocorrem.

## Invariantes

- PostgreSQL real/efêmero é obrigatório para integração/E2E;
- nenhum teste obrigatório pode ser ignorado silenciosamente;
- fixtures declaram workflow/version/policy e não alteram banco do operador;
- evidência normaliza apenas valores voláteis e não força estado via SQL;
- falha deve apontar requisito/matriz e deixar ambiente limpo.

## Componentes prováveis

Testes de workflow/migration, `phase3.e2e.test.ts`, assurance E2E, HTTP/SSE,
UI browser, helpers de PostgreSQL/Git e novo manifesto de conformidade.

## Dependências e restrições

Depende de todas as tasks funcionais. Não marcar gap como coberto por teste
mockado quando existe infraestrutura real; não reutilizar o projeto real nem
alterar a auditoria.

## Estratégia de implementação

Mapear critério→cenário→camada→evidência; criar fixtures de versão nova e legado;
executar jornada necessidade→entrega; injetar falhas/crashes; validar ações que
devem e não devem existir; publicar relatório automatizado e fail-closed.

## Cenário real obrigatório

Em fixture isolada equivalente ao snapshot auditado:

1. WI Persistência produz, passa por QA/review, recebe `ACCEPT` e merge automático.
2. O aceite reavalia dependentes.
3. WI Métrica, sem decisão humana, é despachado automaticamente.
4. WI Interface espera somente pelo grupo prioritário; resolvida a decisão e a
   dependência, é despachado automaticamente.

## Critérios de aceite

- os vinte critérios globais do plano possuem ao menos uma prova automatizada;
- não existe expectativa nova de `WAITING_FOR_WORK_ITEM_AUTHORIZATION` no fluxo
  novo, e o legado permanece explicitamente testado;
- happy path chega a `DELIVERED` com único gate final humano;
- rework, block, recovery, dependências, gates, pausa/cancelamento e RBAC passam;
- crash/restart não duplica efeito;
- API/UI/SSE concordam em estado e `allowed_actions`;
- cenário real obrigatório passa integralmente.

## Testes obrigatórios

Unitários, migrations/persistência, integração, HTTP, SSE, browser E2E, Git
descartável, concorrência, crash/restart, coexistência F3/F4/F5/F6, segurança/
redaction, build/typecheck e verificação de links/documentos.

## Riscos e evidências esperadas

Riscos: suíte flakey, fixture irreal e cobertura declarativa sem asserção de
ausência. Evidências: manifesto/matriz, relatório de comandos e contagens, logs
sanitizados, artefatos por cenário e comprovação de teardown.
