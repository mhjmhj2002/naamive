---
task: TST-01
status: TO DO
prevalidation_status: READY_FOR_IMPLEMENTATION
implementation_status: PARTIALLY_IMPLEMENTED
title: Suíte de conformidade do lifecycle
depends_on: [LR-01, LR-02, LR-02A, AUT-01, AUT-02, AUT-03, REC-01, REC-02, GAT-01, GAT-02, GAT-03, UI-01, UI-02]
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# TST-01 — Suíte de conformidade do lifecycle

## Evidência de implementação local — 2026-08-30

O baseline técnico contém o manifesto, o teste estático e a fixture inicial
`lifecycle-conformance-audit-scenario.e2e.test.ts` de TST-01. Eles ainda não
certificam a jornada PostgreSQL/Git do critério 18. A execução PostgreSQL segue
sem certificação; ausência de `DATABASE_URL` é
`MANUAL_OPERATOR_VALIDATION_REQUIRED`, nunca PASS.

Durante implementação/auditoria, foram encontrados defeitos na fixture sob o
contrato AUT-02 v1. As correções experimentais de runtime/teste foram
deliberadamente restauradas ao baseline `2016bee...` para isolar esta decisão
arquitetural. Portanto, o HEAD atual não afirma plano único, remoção de dispatch
manual, autor Git, allowlist/denylist específicos, nem a cadeia incremental v2.
O critério 18 permanece bloqueado até a implementação de AUT-02 v2 e a fixture
TST-01 corrigida e certificada em PostgreSQL/Git.

## Resolução arquitetural corretiva — required-set AUT-02

TST-01 demonstrou o conflito real entre AUT-02 v1 e o lifecycle DAG; ele foi
resolvido normativamente pela pré-validação
[`AUT-02 v2 — IntegrationCohort`](AUT-02-v2-integration-cohort-prevalidation.md).
`RequiredWorkItemSet:v1` continua sendo a obrigação completa do plano/módulo;
`IntegrationCohort:v1` é a fronteira incremental de cada candidate v2. Assim,
Persistência pode integrar e reavaliar Métrica sem antecipar Interface, que
permanece bloqueada pelo seu blocker legítimo. AUT-02 v1 e seus registros ficam
históricos e fail-closed; novas execuções selecionam explicitamente
`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2`.

O critério 18 continua bloqueado até a implementação e certificação
PostgreSQL/Git do contrato v2. A fixture atual é somente a base inicial e deve
ser corrigida para certificar o cenário v2, sem inventar estado ou dispatch
manual.

## Decisão de pré-validação

**PREVALIDATION: READY_FOR_IMPLEMENTATION.** Esta task ainda não implementa a
suíte. Há cobertura funcional PostgreSQL, HTTP, SSE, browser, Git descartável,
recovery e concorrência a reutilizar, mas não uma certificação transversal dos
vinte critérios. Teste estreito ou mockado é somente `PARTIALLY_COVERED`.

A pré-validação original não conhecia conflito arquitetural. Durante a
implementação/auditoria, TST-01 revelou o conflito AUT-02 v1 × lifecycle DAG;
ele foi resolvido normativamente por AUT-02 v2. Não existe decisão arquitetural
pendente agora, mas a implementação do contrato v2 e sua certificação em fixture
isolada continuam pendentes.

## Autoridade normativa e inventário atual

- Auditoria de 22/08, critérios 1–20 e o cenário Persistência/Métrica/Interface.
- Plano F6.5, Lifecycle Compass, Orchestration Protocol e Gate Policy vigentes.
- `runtime/node-web/migrations/048_phase_6_5_conformant_workflows.sql` publica
  `PROJECT_DISCOVERY:v4`, `MODULE_DELIVERY:v2`, `WORK_ITEM_DELIVERY:v2` e
  `ORCHESTRATION_EXECUTION:v1`.
- Specs/pré-validações LR-01, LR-02/LR-02A, AUT-01/02/03, REC-01/02,
  GAT-01/02/03 e UI-01/02 desta pasta.

Invariantes consumidos: `EXECUTION_SUCCEEDED != WORK_ACCEPTED`; dependência
técnica exige predecessor aceito **e integrado**; gate humano é proporcional;
recovery é orientado por causa; ações sensíveis são autorizadas no servidor; e
`allowed_actions`/stop surfaces vêm de projeção única.

| Área | Evidência reutilizável | Limite que TST-01 deve fechar |
| --- | --- | --- |
| Workflow/versão | migration 048, `workflow-selection.e2e`, `lifecycle-v2.e2e`, `plan-work-item-lineage.e2e` | Provas locais, sem jornada auditada completa. |
| Elegibilidade | `eligibility-scheduler.e2e`, `scheduleWorkItem`, decisões persistidas | DAG/corrida/rollback já existem; falta cadeia real QA→integração. |
| Assurance | `automatic-assurance-qa.e2e`, `automatic-assurance-integration.e2e`, `assurance.e2e` | Fixtures partem em estados intermediários e são separadas. |
| Macro/delivery | `macro-lifecycle.e2e`, `delivery-*.e2e`, `delivery-final-gaps.e2e` | Não correlacionam o WI auditado ao relatório único. |
| Recovery | `recovery.e2e`, `worker-restart.e2e`, `reviewer-recovery-*.e2e` | Causas dispersas, sem manifesto transversal. |
| API/UI/SSE | `ui-01-focused.e2e`, `ui-02-stop-surfaces`, `ui-02-browser`, `web-ui-f6-12.e2e` | Browser parcialmente usa fixture HTTP simulada. |
| RBAC/redaction | `auth.e2e`, assurance, UI-01 e delivery HTTP | Falta prova comum às ações do cenário. |

E2E PostgreSQL usa `DATABASE_URL`; ausência é `SKIPPED: set DATABASE_URL`,
nunca evidência de PASS.

## Matriz dos 20 critérios

`COVERED` exige prova transversal executada; unitário, mock ou teste estreito
não basta. Resultado: **0 COVERED, 18 PARTIALLY_COVERED, 2 GAP**.

| Criterion | Requirement | Scenario | Layer(s) | Existing evidence/test | Gap | Required test/change | PostgreSQL required? | Negative assertion | Expected artifact/evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 — PARTIALLY_COVERED | Novo WI sem autorização individual. | Plano v2/Persistência. | workflow,scheduler,UI | LR-01/AUT-01 scheduler | Não unido à auditoria. | Fixture v2 e absence check. | Sim | Sem `WAITING_FOR_WORK_ITEM_AUTHORIZATION`, `AUTHORIZE_WORK_ITEM` ou botão equivalente. | workflow/version,eventos,projection |
| 2 — PARTIALLY_COVERED | Elegível despacha automática/idempotentemente. | Raiz e Métrica. | scheduler,DB | `eligibility-scheduler.e2e` | Não após ACCEPT/merge real. | Uma delivery/job/evento sob replay. | Sim | Replay não cria tentativa 2. | decisions,deliveries,jobs |
| 3 — PARTIALLY_COVERED | Dependência satisfeita reavalia automaticamente. | Persistência→Métrica/Interface. | handoff,scheduler | AUT-01/AUT-02 | Falta gatilho end-to-end. | Observar integração sem comando de dispatch dependente. | Sim | Produção/QA/ACCEPT sem integração não libera. | lineage,eventos,decisão |
| 4 — PARTIALLY_COVERED | Produção cria QA/review sem humano. | Persistência. | worker,QA,F6 | AUT-02/assurance | Fixtures começam no meio. | Produzir e reconciliar intents reais. | Sim | Sem command humano QA/review/merge. | report/hash,candidate,review |
| 5 — PARTIALLY_COVERED | F6 incompleto até `ACCEPT`. | QA PASS/review/ACCEPT. | execution,assurance | AUT-02/AUT-03 | Não ligado ao macro. | Assertar antes/depois de ACCEPT. | Sim | Success/QA não integra/libera. | acceptance,WI,intent |
| 6 — PARTIALLY_COVERED | REWORK corretivo automático salvo gate material. | Finding/re-review. | assurance,recovery | assurance/recovery | Sem matriz comum. | Nova delivery/review; material abre gate publicado. | Sim | Sem start humano/aceite de geração velha. | finding,lineage,recovery |
| 7 — PARTIALLY_COVERED | BLOCK faz assistência/routing antes de escalar. | Reviewer indisponível. | REC-02,gates,UI | assurance/reviewer recovery | Sem prova no manifesto. | Diagnóstico→routing/fallback→escalada. | Sim | Sem gate/ESCALATED precoce. | block,intents,surface |
| 8 — PARTIALLY_COVERED | Falha recuperável tem retry/restart/resume visível. | Crashes/lease. | REC-01,worker,UI | recovery,worker restart,UI-02 | Casos dispersos. | Reusar matriz REC-01 e projection. | Sim | Confirmado não reaplica; desconhecido não retry cego. | decision,footprint,lineage |
| 9 — PARTIALLY_COVERED | Recuperável não fica sem saída. | Recovery/rework/reviewer wait. | recovery,gates,UI | REC-01/02,UI-01/02 | Sem enumeração fail-closed. | Manifesto estado→automação/surface. | Sim | Estado sem mapper falha. | relatório/projection |
| 10 — PARTIALLY_COVERED | Gates só onde autorizados. | Plano, commitment, materialidade, delivery. | workflow,catalog | gate catalog | Não cruza todos v2. | Um permitido e um proibido. | Sim | Sem gate individual/técnico universal. | record,transition,audit |
| 11 — PARTIALLY_COVERED | Stop humano explica motivo/estado/authority/decisões/consequências. | Gate,blocker,recovery,pause. | projection,browser | UI-01/UI-02 | Não cobre matriz/fixture. | Tabela stops→campos + browser. | Sim | Descriptor incompleto não cria form; LEGACY não vira humano ordinário. | JSON/DOM sanitizado |
| 12 — PARTIALLY_COVERED | Merge/candidate/validation/integration automáticos. | ACCEPT Persistência. | AUT-02,Git,macro | AUT-02 | Estado inicial parcialmente montado. | Cadeia real até integração/Git. | Sim | Sem clique; replay não duplica manifest/candidate/attempt. | SHA,manifest,intents,eventos |
| 13 — PARTIALLY_COVERED | Projeto/módulo coerentes até DELIVERY. | Integração/macro. | macro,workflow | macro lifecycle,delivery | Sem correlação com WI. | Cenário reduzido e macro manual. | Sim | Filho não ultrapassa pai; job/QA isolado não avança macro. | macro intents/states |
| 14 — PARTIALLY_COVERED | Aceite humano final leva a DELIVERED. | Package/handover. | delivery,RBAC | delivery E2E | Não no relatório comum. | Decisão autenticada/replay. | Sim | Service/header/payload/package stale não entrega. | package hash,gate,audit,state |
| 15 — PARTIALLY_COVERED | PAUSED/CANCELLED diferem de archive. | pause/resume/cancel. | workflow,delivery,UI | GAT-02/UI-01 | Falta certificação comum. | Matriz curta com projection. | Sim | Pause não cancela; cancel preserva evidence. | pause/resume/cancel records |
| 16 — PARTIALLY_COVERED | Sensível exige identidade/papel autenticados. | Gate,blocker,delivery,recovery. | auth,HTTP | auth/UI-01/delivery | Falta amostra da fixture. | Humano permitido/negado/service. | Sim | Header/payload não concede role; service sem ação humana. | session/audit,401/403 |
| 17 — PARTIALLY_COVERED | UI usa projection server-side única. | Snapshot antes/depois blocker. | API,SSE,browser | UI-01/UI-02/web UI | Browser simulada em parte. | API→DOM/SSE real por descriptor/surface ID. | Sim | UI não infere; evento velho não regride action. | `as_of_event_id`,JSON,DOM |
| 18 — GAP | Cenário auditado completa QA/review/merge/Métrica e preserva Interface. | Persistência→Métrica/Interface. | todas | AUT-01 tem regressão reduzida | Não há E2E equivalente. | Novo `lifecycle-conformance-audit-scenario.e2e`. | Sim/Git | Sem auth individual; Interface só após blocker+dep. | relatório,IDs,hashes,eventos |
| 19 — PARTIALLY_COVERED | E2E happy/rework/block/retry/deps/gates/restart. | Subcenários registrados. | all E2E | AUT/REC/GAT/UI dispersos | Sem execução/relatório fechado. | Manifesto+runner exigem cenário por categoria. | Sim | Ausência/skip indevido/assert faltante falha. | JSON sanitizado/TAP |
| 20 — GAP | Docs/workflow/runtime/API/UI/testes coerentes. | Static + snapshot runtime. | docs,migration,source | revisão manual, DOC-01 pendente | Sem verificador automático. | Teste de referências/versões/links contra 048 e snapshot. | Não static; Sim snapshot | Desconhecido fail-closed; v2 não declara gate removido. | relatório links/hashes/versions |

## Fixture real obrigatória

Criar fixture PostgreSQL/Git descartável `tst01-audit-<uuid>` com repositório
em `mkdtempSync(join(tmpdir(), 'naamive-tst01-'))`, nunca usando o projeto real
`728901f8-17fe-4fc9-bdc4-0b2fabc2ce08`.

| Entidade | Fatos mínimos declarados |
| --- | --- |
| Projeto | `PROJECT_DISCOVERY:v4`, `IMPLEMENTATION`, repositório base local. |
| Módulo | `MODULE_DELIVERY:v2`, revisão/round/plano aprovados, `IMPLEMENTING`; `MODULE_PLAN_APPROVAL` foi a única precondição humana. |
| WIs | `WORK_ITEM_DELIVERY:v2`: Persistência elegível; Métrica depende de Persistência; Interface depende de Persistência e tem blocker ACTIVE `priority-group`. |
| Assurance | `ORCHESTRATION_EXECUTION:v1`; `ASSURANCE_EXPANSION_TO_REAL_WORK:v1`; `AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v2` com `IntegrationCohort:v1`; policy v2 e hash persistidos; producer e reviewer independentes. `AUT-02:v1` só entra em prova histórica/legacy fail-closed. |
| Auth | Principais GAT-03 e grants mínimos próprios da fixture. |

SQL é permitido apenas para necessidade/projeto/módulo/plano/política/principais
pré-cenário. Após o primeiro dispatch, é proibido forçar por SQL estado de WI,
acceptance, delivery, candidate, merge ou integração. O percurso usa scheduler,
worker, QA, assurance, reconciliadores e API reais.

1. Persistência é despachado automaticamente, sem `AUTHORIZE_WORK_ITEM`.
2. Produção gera QA automática e review independente; QA PASS não é ACCEPT.
3. Reviewer registra `ACCEPT` uma vez; merge/candidate/validation/integration
   ocorrem automaticamente em Git descartável.
4. Integração reavalia dependentes: Métrica recebe uma delivery/job automaticamente.
5. Interface continua esperando **somente** `priority-group`.
6. Pessoa autorizada resolve o blocker por descriptor com `dependency_id`
   `SERVER_BOUND`; com dependência satisfeita, Interface despacha sem ação técnica.
7. PostgreSQL, API, stop surfaces e browser observam o mesmo `as_of_event_id`
   ou reload SSE mais novo; evento antigo não regride a UI.
8. Evidência final contém versões, IDs opacos, estados, eventos, hashes,
   contagens e teardown, sem payload interno ou segredo.

Reutilizar `pool`/`withTransaction`, `randomUUID`, `t.after` e a ordem de FK das
suites AUT/REC: auth/audit, events/artifacts/intents, jobs/deliveries/worktrees,
assurance/recovery, WIs, rounds/modules/revisions e projeto. Fechar servidor/SSE,
remover somente o `mkdtemp` criado e verificar ausência do projeto, deliveries,
jobs e diretório também em falha.

## Legacy/current: WAITING_FOR_WORK_ITEM_AUTHORIZATION

A busca explícita em runtime, migrations, workflows e testes encontrou o estado
nas migrations F3 `016/017`, classificação histórica em `048`, e ramos
compatíveis de `development-runtime.ts`, `phase3.ts`, `worker.ts`,
`projection.ts`, snapshot LR-01 e `plan-work-item-lineage.e2e.test.ts`.

| Uso | Classificação | Decisão TST-01 |
| --- | --- | --- |
| F3/migrations e ramos sem `WORK_ITEM_DELIVERY:v2` | Legacy válido | Preservar e testar consulta histórica explícita. |
| `048` `WAITING_AUTH_*` | Classificação/auditoria válida | Provar que não seleciona v2 nem promove em massa. |
| Lineage com versão 1 | Assert legacy válido | Não remover; se necessário somente renomear descrição para `legacy v1`. |
| Novo cenário TST-01 | Proibido | Falhar se criar/esperar esse estado, `AUTHORIZE_WORK_ITEM` ou equivalente humano em v2. |

## Provas negativas, API/UI/SSE e segurança

| Proibição | Prova requerida |
| --- | --- |
| Dispatch/gate indevido | Métrica não despacha em produção/QA/ACCEPT sem integração; Interface não despacha antes do blocker; nenhum gate individual de WI. |
| ACCEPT implícito | Produção, QA PASS e review pendente não criam merge, integração ou liberação. |
| Capability inventada | Surface resolve `action_descriptor_id` exato; UI usa `input_binding`; LEGACY não é reclassificado. |
| SSE regressivo | Evento antigo/race só invalida e recarrega; não sobrescreve action atual nem cria efeito. |
| Escalada precoce | BLOCK cria diagnóstico, assistência, routing/retry antes de gate/escalada. |
| RBAC declarativo | Header/payload não confere role; service não recebe ação humana; grant stale/fora de escopo falha/audita. |
| Efeito duplicado | Crash antes de commit deixa zero; após efeito/restart/replay/corrida deixa uma delivery/review/merge/candidate/integration por chave. |
| Sigilo | Projection, SSE e relatório não expõem credential, segredo, payload interno ou ID técnico como instrução. |

Para cada marco — Interface bloqueada, blocker resolvido e Interface despachado
— o teste lê fatos canônicos, chama projection como principal permitido/negado,
compara descriptor/surface por ID e `as_of_event_id`, e abre browser contra a
mesma API. SSE é somente invalidação/reload, nunca segunda fonte de verdade.

## Crash, concorrência e idempotência

O manifesto referencia e compõe: falha injetada antes de commit no scheduler;
efeito persistido e reconcile REC-01; lease/restart de worker; `Promise.all`
para dispatch/dependência; replay QA/review/merge/integration com intent/hash/
manifest; decisão/gate stale/idempotente; rework/block; pause/resume/cancel; e
reconnect/race SSE. Cada caso deve afirmar cardinalidade, lineage e ausência de
novo efeito, não só status final.

## Manifesto, runner e relatório fail-closed

Na implementação, criar somente o necessário próximo aos testes runtime:

1. `runtime/node-web/src/lifecycle-conformance-manifest.ts`, estático e
   versionado como `LIFECYCLE_CONFORMANCE:v1`, com exatamente 20 IDs, cenário,
   arquivos, tipo de prova, PostgreSQL e negativos obrigatórios.
2. `runtime/node-web/src/lifecycle-conformance.test.ts`, que falha para ID
   ausente/duplicado, path inexistente, assertion não declarada ou critério não
   executado.
3. `runtime/node-web/src/lifecycle-conformance-audit-scenario.e2e.test.ts`, a
   fixture acima.
4. `runtime/node-web/scripts/run-lifecycle-conformance.mjs` somente se
   `run-tests.mjs` não puder chamar o conjunto focado sem agregar a suíte completa.

Manifesto entra no Git. TAP/JSON sanitizado, logs, paths temporários, banco e
Git descartáveis vivem em `/tmp/naamive-lifecycle-conformance-<run-id>/`, não
em Git. O runner aceita `KNOWN_BASELINE` exclusivamente por nome exato e
fingerprint; qualquer outra falha é `REGRESSION_OR_UNCLASSIFIED`:

1. `rejects committed Git symlinks and submodules before parsing repository content` — actual `RETRYABLE`, expected `FAILED`.
2. `uses only package.json and rolls back all final persistence when its insert fails` — actual `RETRYABLE`, expected `FAILED`.
3. `reserves operation, job and evidence before a malformed manifest fails without final inventory` — actual `RETRYABLE`, expected `FAILED`.
4. `retries safely both before inventory persistence and after its immutable snapshot was written` — actual `RETRYABLE`, expected `FAILED`.
5. `keeps Codex-only parity behind the service flag` — actual `ANALYSIS_IN_PROGRESS`, expected `WAITING_FOR_PRODUCT_COMMITMENT`.
6. `falls back from Codex quota exhaustion to DeepSeek and keeps secrets redacted` — actual `ANALYSIS_IN_PROGRESS`, expected `WAITING_FOR_PRODUCT_COMMITMENT`.
7. `blocks the project when both runtimes are out of quota` — cleanup `SQLSTATE 23503`, `work_acceptances_execution_id_fkey`.

Critério 20 recebe teste estático que lê, sem alterar, Compass, Protocol, Gate
Policy, plano, auditoria e migration 048; verifica links, versões, controles
autorizados, invariantes de ACCEPT e ausência de autorização individual v2. O
E2E compara então o snapshot real. Isto não antecipa DOC-01.

## Validação planejada e limitação operacional

Com PostgreSQL efêmero configurado, a implementação executará somente:

```text
npm run build
node --test dist/lifecycle-conformance.test.js
node --test dist/lifecycle-conformance-audit-scenario.e2e.test.js
node --test dist/eligibility-scheduler.e2e.test.js
node --test dist/automatic-assurance-qa.e2e.test.js
node --test dist/automatic-assurance-integration.e2e.test.js
node --test dist/recovery.e2e.test.js
node --test dist/worker-restart.e2e.test.js
node --test dist/ui-01-focused.e2e.test.js dist/ui-02-browser.e2e.test.js
git diff --check
```

`MANUAL_OPERATOR_VALIDATION_REQUIRED`: `npm test`, `npm run e2e`,
`node --test dist/macro-lifecycle.e2e.test.js` e agregado que o inclua. O agent
não deve contornar, dividir ou repetir macro lifecycle; o operador fornecerá
comando, commit, PostgreSQL efêmero, exit code e TAP/resumo sanitizado.

## Critérios para iniciar a implementação

- PostgreSQL efêmero/migrations atuais, fixture própria com workflow/version/
  policy/principais/Git declarados e teardown verificável;
- manifesto fechado de 20 critérios, negativo por critério e runner fail-closed;
- somente as sete baselines exatas são `KNOWN_BASELINE`;
- cenário percorre os oito passos sem SQL de atalho após dispatch;
- legacy v1 fica explícito e v2 não espera autorização individual;
- artefatos são sanitizados/não versionados, focused tests passam e macro fica
  `MANUAL_OPERATOR_VALIDATION_REQUIRED` quando aplicável.

Riscos decididos: fixture irreal (usar APIs/reconciliadores após setup),
flakiness (UUID/condição persistida/teardown), cobertura declarativa
(manifesto fail-closed), vazamento (relatório sanitizado) e regressão histórica
(caso legacy v1 separado). Nenhuma migration, mudança de runtime/UI/workflow ou
DOC-01 é necessária nesta pré-validação.

## Contexto resumido originalmente registrado

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
