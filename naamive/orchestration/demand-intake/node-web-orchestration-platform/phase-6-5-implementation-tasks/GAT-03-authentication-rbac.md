---
task: GAT-03
status: TO DO
title: Autenticação e RBAC
depends_on: [GAT-01]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-03 — Autenticação e RBAC

## Objetivo e problema corrigido

Tornar identidade, escopo e autoridade verificáveis para gates e comandos
sensíveis. Corrige endpoints ordinários sem autorização demonstrada e papéis F6
aceitos por headers declarativos sem autenticação.

## Contexto, atual e esperado

O MVP tinha operador configurado no servidor; F6 usa papéis em headers. A fase
precisa de uma fronteira autenticada compatível com a implantação atual, sessão/
credencial protegida e RBAC server-side por projeto, ação e gate. O client nunca
escolhe ator/papel confiável.

## Invariantes

- identidade vem de mecanismo autenticado; headers/payload não concedem papel;
- autorização é repetida no comando, não apenas ocultada na UI;
- menor privilégio, escopo de projeto e separação de autoridades;
- evento/decisão registra ator autenticado e base de autoridade;
- erros e logs não expõem credenciais; revogação impede ação futura.

## Componentes prováveis

Middleware/session, identity provider adapter/configuração local, RBAC policy,
server routes, gate service, audit actor, UI session/CSRF e testes de segurança.

## Dependências e restrições

Depende de GAT-01. A solução concreta deve respeitar o modelo de implantação e
ser decidida antes da implementação. Não confiar em `x-role`, não ampliar para
multitenancy completo e não quebrar automações com service identity sem escopo.

## Estratégia de implementação e migração

Modelar principals/roles/scopes; integrar autenticação; centralizar autorização;
mapear rotas/ações; criar service principals para worker; migrar
`NAAMIVE_OPERATOR_ID` para compatibilidade controlada e registrar origem.

## Critérios de aceite

- spoofing de header/payload não concede autoridade;
- cada gate/comando sensível exige papel e escopo corretos;
- cross-project access é rejeitado;
- worker usa identidade de serviço limitada;
- decisões e eventos contêm ator autenticado;
- sessão revogada/expirada não executa ação.

## Testes obrigatórios

Matriz papel×ação×escopo, anônimo, spoofing, CSRF/session, expiração/revogação,
cross-project, service identity, logs/redaction e E2E UI+servidor.

## Riscos e evidências esperadas

Riscos: lockout, papel excessivo e confiança no navegador. Evidências: threat
model curto, matriz RBAC, config/runbook, audit records e testes negativos.
