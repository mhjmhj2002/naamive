---
task: AUT-03
status: READY_FOR_IMPLEMENTATION
prevalidation_status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: ASSURANCE_EXPANSION_TO_REAL_WORK:v1
title: Ampliar F6 aos trabalhos reais
depends_on: [AUT-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# AUT-03 — Ampliar F6 aos trabalhos reais

## Contrato obrigatório de pré-validação

Implementar exclusivamente conforme
[`AUT-03-expand-phase6-assurance-prevalidation.md`](AUT-03-expand-phase6-assurance-prevalidation.md)
(`ASSURANCE_EXPANSION_TO_REAL_WORK:v1`). O contrato fecha subject, generation,
policy snapshot, autoridade, compatibilidade AUT-02, rollout, idempotência e
fronteira REC-02. AUT-03 está `READY_FOR_IMPLEMENTATION`; a implementação
funcional continua pendente.

## Objetivo e problema corrigido

Aplicar o micro-lifecycle F6 aos trabalhos reais selecionados: planejamento,
desenvolvimento, integração, QA, segurança, release e demais job kinds aprovados.
Corrige o opt-in restrito à discovery e a ausência de `work_acceptance` no
projeto real auditado. A característica opt-in histórica da Fase 6 não impede
esta ampliação: a Fase 6.5 está autorizada a selecionar novos workflows, jobs e
handoffs reais para assurance, preservando sem reinterpretar execuções históricas
já concluídas. Em outros termos, o opt-in histórico da Fase 6 não obriga a Fase
6.5 a manter o fluxo real fora de assurance.

## Contexto, atual e esperado

F6 certificou contracts, independence, review e blocks de modo aditivo, mas o
`AgentExecutionService` e as políticas operacionais não cobrem os caminhos reais.
Cada dispatch selecionado pela política deve criar `work_acceptance`, produzir
output, aguardar revisão independente quando a política exigir e só gerar efeito
de negócio após `ACCEPT`. Compatibilidade controla o rollout por versão/política;
não mantém permanentemente o fluxo real fora de supervision/assurance.

## Invariantes

- política publicada, versionada e opt-in seleciona job kinds explicitamente;
- nenhuma auto-review; identidade/contexto congelados preservam independência;
- decisão terminal é única; retry/restart não duplica acceptance/review;
- F3 continua autoridade para findings/rework de work item;
- rollback só afeta novos dispatches e não reinterpreta histórico F4/F5/F6.

## Componentes prováveis

`AgentExecutionService`, worker, assurance policies, dispatch contracts,
review packages, handoffs AUT-02, jobs de planning/development/integration/QA/
security/release, migrations somente se necessárias e projeções.

## Dependências e restrições

Depende de AUT-02. Não tornar F6 universal sem política/rollout, não concluir
trabalho em sucesso técnico e não criar coleção paralela de findings.

## Estratégia de implementação e compatibilidade

Inventariar job kinds e efeitos; publicar seletores por classificação; adaptar
cada produtor ao handoff F6 e seu aplicador de efeito após `ACCEPT`; certificar
review package específico sem conteúdo proibido; ativar por canário e medir.
Publicar novos workflows/contratos quando necessário para substituir o
comportamento operacional legado em novos dispatches, mantendo as versões
históricas somente para consulta, recovery compatível e auditoria.

## Critérios de aceite

- todos os job kinds no escopo possuem política e teste explícitos;
- dispatch selecionado cria acceptance; não selecionado preserva legado;
- sucesso fica incompleto até `ACCEPT` e decisão negativa não promove;
- planning, development, QA, integration, security e release passam pelo mesmo
  contrato, com efeitos específicos somente após aceite;
- rollout/reversão não alteram execuções existentes.

## Testes obrigatórios

Matriz por job kind, opt-in/off/rollback, independência, `ACCEPT`/`REWORK`/
`BLOCK`/`ESCALATE`, restart, coexistência F3/F4/F5, classificação/redaction e
regressão do projeto real com acceptance efetiva.

## Riscos e evidências esperadas

Riscos: efeito aplicado antes do review, política ampla e pacote inseguro.
Evidências: matriz job→policy→effect, políticas publicadas, acceptances/reviews,
testes de coexistência e métricas do rollout.
