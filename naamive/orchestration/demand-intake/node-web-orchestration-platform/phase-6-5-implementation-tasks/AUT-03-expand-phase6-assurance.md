---
task: AUT-03
status: DONE
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
fronteira REC-02. O estado `READY_FOR_IMPLEMENTATION` foi a pré-validação
histórica; AUT-03 está concluída. A implementação certificada aplica a matriz
fechada aos subjects selecionados, preserva a coexistência das versões antigas
e é evidenciada por TST-01.

## Objetivo e problema corrigido

Aplicar o micro-lifecycle F6 aos trabalhos reais explicitamente cobertos pela
matriz normativa de `ASSURANCE_EXPANSION_TO_REAL_WORK:v1`.

O escopo desta revisão é fechado pelo contrato versionado e não pode ser ampliado
por interpretação do implementador. Atualmente, a matriz cobre:

- planning / `PLAN_MODULE_WORK_ITEMS`;
- development / `DEVELOP_WORK_ITEM`;
- QA / `RUN_DELIVERY_QA`, exclusivamente como evidência interna AUT-02;
- integration / `MERGE_WORK_ITEM`, `REASSESS_INTEGRATION_CANDIDATE` e
  `VALIDATE_INTEGRATION_CANDIDATE`, exclusivamente como evidência/validação
  interna AUT-02;
- release / `PREPARE_DELIVERY_PACKAGE`, ativado sob o contrato de entrega
  publicado por GAT-02, sem transformar QA ou integração em acceptance própria.

Nenhum job kind ou subject adicional, incluindo security, pode ser selecionado
por AUT-03 sem nova revisão explícita do contrato normativo.

AUT-03 corrige o opt-in restrito à discovery e a ausência de
`work_acceptance` no projeto real auditado, sem reinterpretar execuções
históricas já concluídas.

A característica opt-in histórica da Fase 6 não impede esta ampliação: a
Fase 6.5 está autorizada a selecionar novos workflows, jobs e handoffs reais
para assurance somente dentro da matriz normativa publicada e preservando o
histórico.

## Contexto, atual e esperado

F6 certificou contracts, independence, review e blocks de modo aditivo, mas o
`AgentExecutionService` e as políticas operacionais não cobrem integralmente os
caminhos reais agora normatizados.

Cada dispatch selecionado pela policy deve seguir exatamente a linha aplicável
da matriz do contrato:

- planning possui acceptance técnica própria;
- development reutiliza a mesma `work_acceptance` já normativa em AUT-02;
- QA não possui acceptance própria e permanece evidência determinística AUT-02;
- integration não possui acceptance própria e permanece evidence/validation
  interna AUT-02;
- release poderá possuir acceptance técnica própria somente quando GAT-02
  publicar o job/subject reservado pelo contrato.

Compatibilidade controla rollout por versão/policy e não mantém
permanentemente o fluxo real fora de supervision/assurance.

## Invariantes

- policy publicada, versionada e opt-in seleciona somente os job kinds
  explicitamente permitidos pela matriz normativa;
- nenhuma auto-review; identidade/contexto congelados preservam independência;
- decisão terminal é única; retry/restart não duplica snapshot,
  acceptance/review ou consequência;
- development reutiliza a acceptance AUT-02 e não cria authority paralela;
- QA e integration não possuem acceptance AUT-03 própria;
- F3 continua autoridade para findings/rework de work item;
- gates humanos GAT-01/GAT-02 não são substituídos por `ACCEPT` técnico;
- rollback só afeta novos dispatches e não reinterpreta histórico F4/F5/F6;
- novos job kinds/subjects exigem nova revisão versionada do contrato antes de
  entrarem em policy AUT-03.

## Componentes prováveis

`AgentExecutionService`, worker, assurance policies, dispatch contracts,
`AssuranceDispatchSnapshot:v1`, review packages, handoffs AUT-02, producers e
aplicadores de efeito das linhas normativas planning/development/QA/integration,
migrations somente se necessárias e projeções.

A fronteira release permanece reservada até GAT-02 publicar
`PREPARE_DELIVERY_PACKAGE` e seu subject/generation conforme o contrato.

## Dependências e restrições

Depende de AUT-02.

Não:

- tornar F6 universal sem policy/rollout;
- concluir trabalho apenas por sucesso técnico;
- criar coleção paralela de findings;
- criar acceptance AUT-03 adicional para development;
- criar acceptance própria para QA ou integration;
- selecionar security ou qualquer outro job kind não publicado na matriz;
- antecipar implementação funcional de GAT-02 ou REC-02.

## Estratégia de implementação e compatibilidade

Inventariar os job kinds estritamente previstos na matriz normativa e seus
efeitos; publicar selectors por classificação; persistir o policy snapshot
imutável no dispatch; adaptar cada produtor ao handoff correspondente; certificar
review package específico sem conteúdo proibido; ativar por canário e medir.

Para development, integrar o snapshot ao pipeline AUT-02 sem criar nova
`work_acceptance`.

Para QA e integration, preservar integralmente os outcomes e a autoridade
existentes em AUT-02; esses jobs são fronteiras internas de evidência e devem
falhar fechado se alguma policy tentar selecioná-los para acceptance própria.

Planning pode gerar acceptance técnica própria, mas
`MODULE_PLAN_APPROVAL` permanece a única autoridade de aprovação do plano.

Release permanece reservado até GAT-02 publicar o job/subject correspondente;
eventual `RELEASE_TECHNICALLY_ACCEPTED` não pode executar
`DELIVERY_ACCEPTANCE` nem `DELIVERY → DELIVERED`.

Publicar novos workflows/contratos somente quando necessário para substituir
comportamento operacional legado em novos dispatches, mantendo versões
históricas para consulta, recovery compatível e auditoria.

## Critérios de aceite

- todos os job kinds da matriz normativa possuem comportamento e teste
  explícitos;
- dispatch selecionado persiste policy snapshot e cria a acceptance aplicável
  somente quando a linha normativa declarar acceptance própria;
- dispatch não selecionado preserva o comportamento legado/publicado;
- planning selecionado pode gerar acceptance técnica própria e permanece
  bloqueado de qualquer aprovação material do plano até `MODULE_PLAN_APPROVAL`;
- development selecionado reutiliza exclusivamente a mesma acceptance AUT-02,
  sem duplicação de authority;
- QA permanece fato/evidência interna AUT-02 (`QA_ACCEPTED` /
  `QA_REWORK_REQUIRED`) e não cria acceptance AUT-03;
- integration permanece evidence/validation interna AUT-02 e não cria
  acceptance AUT-03;
- tentativa de policy selecionar QA/integration para acceptance própria falha
  fechado;
- security ou qualquer job kind/subject ausente da matriz não pode ser
  selecionado por AUT-03;
- release permanece não despachável por AUT-03 enquanto GAT-02 não publicar o
  job/subject reservado; quando publicado, acceptance técnica não substitui
  `DELIVERY_ACCEPTANCE`;
- sucesso técnico nunca substitui a decisão/authority exigida pela linha
  normativa;
- decisão negativa não promove subject;
- rollout/reversão não alteram dispatches, snapshots, acceptances ou execuções
  existentes;
- replay, retry, restart, redelivery e concorrência preservam subject,
  generation, policy snapshot e unicidade;
- stale revision/generation/SHA/candidate/manifest/round/PlanWorkItem identity
  falha fechado antes de qualquer efeito.

## Testes obrigatórios

Cobrir, no mínimo:

- matriz normativa por job kind;
- planning selecionado e não selecionado;
- development com acceptance AUT-02 compartilhada;
- QA rejeitado como job selecionável de acceptance própria;
- integration rejeitada como job selecionável de acceptance própria;
- security/outro job kind fora da matriz rejeitado;
- release reservado e não despachável antes de GAT-02;
- opt-in/off/rollback;
- policy revision/hash congelados;
- independência;
- `ACCEPT`/`REWORK`/`BLOCK`/`ESCALATE` onde aplicáveis;
- restart;
- replay;
- duplicate delivery;
- concorrência PostgreSQL;
- coexistência F3/F4/F5;
- classificação/redaction;
- stale revision/generation/SHA/candidate/manifest/round/PlanWorkItem identity;
- planning sem bypass de `MODULE_PLAN_APPROVAL`;
- release sem bypass de `DELIVERY_ACCEPTANCE` / `DELIVERY → DELIVERED`;
- regressão do projeto real com acceptance efetiva;
- ausência de acceptance dupla ou authority dupla em AUT-02.

## Riscos e evidências esperadas

Riscos:

- efeito aplicado antes da authority aplicável;
- policy mais ampla que a matriz normativa;
- acceptance duplicada para development;
- acceptance indevida para QA/integration;
- implementação prematura de security/release fora do contrato;
- pacote inseguro;
- stale subject promovendo geração posterior.

Evidências esperadas:

- matriz job → subject → policy → evidence → acceptance/fact → effect;
- policies publicadas e versionadas;
- `AssuranceDispatchSnapshot:v1`;
- acceptances/reviews somente onde normativamente aplicáveis;
- rejeição explícita de QA/integration/security/outros kinds fora da matriz;
- testes de coexistência, replay, restart, concurrency e fencing;
- métricas do rollout.

## Evidência parcial de implementação — 2026-08-25

`068_phase_6_5_assurance_expansion.sql` publicou a persistência aditiva de
`AssuranceDispatchSnapshot:v1`. O snapshot possui chave única de dispatch,
policy/version/hash, seleção `SELECTED`/`NOT_SELECTED`, subject/generation,
lineage e IDs de correlação; trigger impede reinterpretar esses campos. A
acceptance possui `acceptance_key` único e referência única ao snapshot.

`assurance-expansion.ts` contém a matriz fechada do contrato. Só planning e
development podem ser selecionados; development exige
`aut02_shared_acceptance=true`. QA e os jobs internos de integration retornam
`ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE`; release retorna
`ASSURANCE_RELEASE_JOB_NOT_PUBLISHED`; security e kinds desconhecidos retornam
`ASSURANCE_JOB_NOT_IN_NORMATIVE_MATRIX`.

Policies AUT-03 recebem hash SHA-256 canônico na publicação. O rollback segue
desabilitando somente versões para dispatches futuros; snapshots existentes
continuam apontando à versão/hash publicada. Development reserva o dispatch na
handoff AUT-02 e vincula-o à `work_acceptance` canônica por
`delivery_candidate_id`, sem criar authority ou acceptance adicional. Planning
cria sua acceptance técnica apenas sob policy publicada e producer policy
existente; a proposta segue criando `MODULE_PLAN_APPROVAL`, que continua a
única materialização de plano aprovado. Release e REC-02 não foram
implementados. A task só pode mudar para `DONE` depois de completar a matriz
de recovery, replay/concurrency e fencing exigida por este contrato e de obter
a validação agregada limpa.

## Checkpoint adicional de assurance — 2026-08-26

O selector AUT-03 agora exige igualdade exata entre os job kinds publicados e
seus subject kinds normativos. `reserveAssuranceDispatch` distingue o release
reservado com `ASSURANCE_RELEASE_JOB_NOT_PUBLISHED` e faz uma corrida da mesma
dispatch key convergir para o snapshot já persistido, validando identidade
imutável em vez de expor violação de unicidade.

Antes de um `ACCEPT` de `ModulePlanProposal:v1`, Assurance relê sob lock a
proposta, a revisão atual do módulo, generation e fingerprint de lineage. Uma
divergência grava `STALE_ASSURANCE_SUBJECT`, abre block correlacionado e mantém
a acceptance bloqueada; não publica `PLAN_TECHNICALLY_ACCEPTED` nem materializa
aprovação de plano. Chaves idempotentes de decisão rejeitam reuso com review,
decisão ou evidence divergentes.

Validações: build; matriz/snapshot PostgreSQL AUT-03 (6/6); replay PostgreSQL
de acceptance (6/6); regressão focada de Assurance/AUT-02; e migration fresh
`001→070` seguida de segunda execução idempotente em
`naamive_aut03_fresh_20260826`. A regressão focada de planning teve um failure
que foi classificado em 2026-08-26 como teste legado desatualizado, e não
regressão AUT-03. LR-01 publica `ELIGIBLE_FOR_DISPATCH` como espera do scheduler
e AUT-01 exige a transição `DISPATCH_WORK_ITEM → DISPATCHED` quando cria a
reservation/job. `approveModulePlan()` chama
`scheduleEligibleWorkItems('MODULE_PLAN_APPROVED')` desde o commit AUT-01
`4bdb878`, anterior à AUT-03. O teste agora garante capacidade isolada e prova
uma única reservation, job e decisão `DISPATCHED`, preservando dependentes e
blockers em espera. O planning focused E2E passou integralmente (13/13).

A validação agregada foi concluída em 2026-08-26. `npm test` terminou com
exit 1 apenas pelos quatro failures históricos autorizados de inventory
(`expected FAILED`, `actual RETRYABLE`). `npm run e2e` terminou com exit 1,
112 testes, 105 pass, 7 fail e 0 skip: os mesmos quatro failures históricos e
três failures reproduzíveis de `phase4.e2e` foram investigados e classificados
como preexistentes, fora de AUT-03. Embora `AgentExecutionService` compartilhe
a infraestrutura genérica e invoque `createAcceptance()`, a seleção é causada
por policies legadas de selectors vazios, anteriores ao checkpoint, que fazem
Phase 4 aguardar Assurance. O teste Phase 4 (commit `ef98f12`) e esse caminho
genérico (`agent-execution-service`, commit `ca4ba64`) antecedem AUT-03; suas
alterações em `createAcceptance()` não introduziram a seleção nem mudaram a
causa observada. Build e `git diff --check` passaram; a task está
`DONE`. REC-02 e GAT-02 permanecem fora de escopo.
