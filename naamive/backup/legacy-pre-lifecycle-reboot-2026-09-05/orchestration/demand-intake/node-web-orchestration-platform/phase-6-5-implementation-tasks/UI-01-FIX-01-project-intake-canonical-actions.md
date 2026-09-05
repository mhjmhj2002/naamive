---
task: UI-01-FIX-01
status: TO_DO
title: Destravar PROJECT_INTAKE v1 na projeção canônica e permitir continuidade do intake
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-03
depends_on: [UI-01, UI-02, GAT-03, GAT-03-FIX-01, GAT-03-FIX-02, TST-02]
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# UI-01-FIX-01 — Destravar PROJECT_INTAKE v1 na projeção canônica

## Problema

No manual E2E, um projeto criado pelo fluxo oficial fica em:

```text
workflow_code    = PROJECT_INTAKE
workflow_version = 1
state            = DRAFT
journey_status   = LEGACY
allowed_actions  = []
```

A UI mostra "Rascunho / Preencha e submeta a necessidade", porém nenhuma ação humana é publicada.

O backend já possui o fluxo de intake e o criador já recebe os grants project-scoped de leitura/operação. O bloqueio está na projeção/publicação canônica das ações.

## Evidência arquitetural

Antes de alterar código, confirmar no branch atual:

- `migrations/005_project_intake_workflow.sql` publica `PROJECT_INTAKE v1`.
- `DRAFT -- SUBMIT_INTAKE --> DRAFT`, authority `OPERATOR`, guard `INTAKE_VALID`, effect `CREATE_VALIDATION_JOB`.
- `DRAFT -- INTAKE_VALIDATED --> WAITING_FOR_REGISTRATION`.
- `WAITING_FOR_REGISTRATION -- REGISTER_PROJECT_APPROVED --> REGISTERED`.
- `WAITING_FOR_REGISTRATION -- REGISTER_PROJECT_REJECTED --> DRAFT`.
- O workflow publicado é imutável.
- `state-action-projection.ts` classifica `PROJECT_INTAKE:1` como legacy e hoje o adapter publica `{}`.
- `service.ts` já possui `submitIntake(...)`.
- `server.ts` já expõe a rota oficial `POST /api/projects/:projectId/submit`.

Não editar semanticamente a migration 005 nem criar endpoint paralelo.

## Objetivo

Permitir que projetos `PROJECT_INTAKE v1` continuem o lifecycle pelo contrato canônico:

```text
persisted lifecycle facts
→ server projection
→ authorized action descriptor
→ UI-02 renderer
→ descriptor.command
```

Não resolver com botão hardcoded, condição por `project.state` no frontend ou montagem manual de endpoint.

## Estratégia arquitetural

Preservar o fail-closed de workflows legacy.

Como `PROJECT_INTAKE:1` é histórico/publicado/imutável, a solução preferencial é estender o adapter legado explícito somente com ações seguras realmente suportadas.

Não promover `PROJECT_INTAKE:1` para "current" apenas para deixar testes verdes, salvo evidência arquitetural forte e conformidade completa.

Não inferir ações genericamente por nome de estado.

## DRAFT — SUBMIT_INTAKE

Quando o projeto estiver em `PROJECT_INTAKE v1 / DRAFT`, o principal for HUMAN, possuir authority project-scoped necessária e não houver bloqueio operacional, a projeção deve publicar descriptor para:

```text
SUBMIT_INTAKE
```

Descriptor esperado conceitualmente:

```text
code = SUBMIT_INTAKE
target = PROJECT / <project_id>
command.method = POST
command.href = /api/projects/<project_id>/submit
command.idempotency_required = true
```

Não exigir input humano se o endpoint não exige. Não transportar CSRF no descriptor.

A sessão/CSRF continua responsabilidade da infraestrutura HTTP/UI existente.

## Autorização

A ação deve respeitar o RBAC atual.

Provar:

```text
criador autorizado → vê SUBMIT_INTAKE
principal sem OPERATE_PROJECT → não vê SUBMIT_INTAKE
```

Não criar grant global adicional nem authority de gate.

A leitura da projeção continua audit-free.

## Intake inválido

Não duplicar `validateIntake` no frontend.

O backend continua a autoridade final e deve continuar retornando `INTAKE_INVALID` quando aplicável.

## Operação ativa

Após submit:

```text
operation = VALIDATE_INTAKE
job       = VALIDATE_INTAKE
```

A projeção deve refletir atividade real e não publicar segunda submissão concorrente incompatível.

Preservar SSE; não adicionar polling.

## WAITING_FOR_REGISTRATION

Não mover o dead-end de DRAFT para `WAITING_FOR_REGISTRATION`.

Após a validação e abertura do gate `REGISTER_PROJECT`, verificar o contrato atual:

- se a infraestrutura genérica de gates já publica aprovação/rejeição, preservar e adicionar regressão;
- se não publica para `PROJECT_INTAKE v1`, incluir o mínimo no adapter/projeção canônica para o operador autorizado decidir via descriptor server-published.

Preservar `CURRENT_GATE`, `gate.version`, idempotência, RBAC e UI-02.

Não hardcodar decisão de gate no frontend.

## REGISTERED e continuidade para discovery

Não deixar projeto legacy-v3 permanentemente morto em `PROJECT_INTAKE v1 / REGISTERED`.

Preservar a seleção imutável da LR-02-FIX-01.

### selected discovery v3

Exemplo do manual:

```text
selected_discovery_workflow_code    = PROJECT_DISCOVERY
selected_discovery_workflow_version = 3
```

O backend possui `startProductDiscovery(...)`.

Se o contrato vigente exige ação humana explícita para iniciar discovery v3, publicar essa ação pelo adapter legacy e descriptor canônico.

Não criar endpoint novo. Não trocar silenciosamente v3 por v4.

### selected discovery v4

Preservar o fluxo LR-02 atual de macro lifecycle/reconciliation.

Não forçar semântica v3 em instância v4.

Não corrigir nesta task o finding `LR-02-FIX-02` do worker v4.

## Imutabilidade da seleção

Nunca recalcular a versão de discovery pelo rollout atual.

Usar exclusivamente:

```text
selected_discovery_workflow_code
selected_discovery_workflow_version
```

persistidos na instância.

## Stop surfaces / next action

Para legacy conhecido com ação explicitamente publicada e autorizada:

- não apresentar apenas `LEGACY_READ_ONLY`;
- refletir continuação humana;
- associar `action_descriptor_id` ao descriptor correto quando aplicável.

Para principal não autorizado, continuar fail-closed.

Para workflow/version desconhecido, continuar `LEGACY_READ_ONLY` e `allowed_actions=[]`.

## UI-02

Preservar:

```text
renderStopSurfaces(projection)
surface.action_descriptor_id
descriptor.input_binding.fields
buildActionPayload(...)
descriptor.command.href
```

A UI não pode montar endpoint por `action.code`.

Não voltar a usar `descriptor.input.schema.properties` como fonte de payload.

## SSE

Preservar:

```text
stream.onmessage = invalidate
```

e o fencing UI-01.

Fluxo esperado:

```text
event
→ SSE invalidation
→ refreshProjection()
→ nova projeção
```

Sem polling.

## Testes

Revisar especialmente:

```text
src/ui-01-focused.e2e.test.ts
src/ui-01-frontend.test.ts
src/baseline-materialization-ui.test.ts
src/session-csrf-login-dashboard.e2e.test.ts
```

Refinar o teste histórico que codifica legacy como read-only:

```text
legacy desconhecido
→ read-only

legacy conhecido + adapter sem ação naquele estado
→ read-only

legacy conhecido + ação explicitamente publicada
→ somente ações explicitamente publicadas
```

Não remover o fail-closed.

## Cobertura obrigatória

Provar pelo menos:

1. Projeto novo via API fica `PROJECT_INTAKE v1 / DRAFT` e o criador recebe `SUBMIT_INTAKE`.
2. Principal sem `OPERATE_PROJECT` não recebe `SUBMIT_INTAKE`.
3. Descriptor usa POST, `/submit`, idempotência e binding UI-02 corretos.
4. Submissão real retorna 202 e cria `VALIDATE_INTAKE` operation/job.
5. Replay idempotente não duplica operação/job.
6. Operação ativa impede segunda submissão incompatível.
7. Intake inválido continua recusado.
8. Após validação, `WAITING_FOR_REGISTRATION` + gate `REGISTER_PROJECT` têm caminho governado para decisão.
9. Rejeição retorna a DRAFT e a submissão volta a ficar disponível quando aplicável.
10. Aprovação preserva `selected_discovery_workflow_*`.
11. Para v3, o caminho oficial de início de discovery permanece disponível se esse for o contrato vigente.
12. Para v4, preservar LR-02 atual.
13. Workflow/version legacy desconhecido continua read-only.

## TST-02 / banco

Todos os testes PostgreSQL devem usar os runners de banco descartável.

É proibido usar o banco runtime `naamive` em testes automatizados.

Não criar fixtures no banco manual. Não iniciar worker manual.

## Baseline

Última certificação:

```text
npm run e2e
141 tests
137 PASS
4 FAIL conhecidos
0 regressões novas
```

As 4 falhas conhecidas são Inventory (`RETRYABLE` atual vs `FAILED` esperado).

Não corrigir Inventory nesta task.

## Fora de escopo

Não incluir:

- LR-02-FIX-02 / worker PROJECT_DISCOVERY v4;
- 4 Inventory baselines;
- reescrita ampla do lifecycle;
- promoção automática de workflows legacy;
- novo framework frontend;
- polling;
- endpoint paralelo;
- novo sistema de auth;
- limpeza do banco runtime;
- PR/merge.

## Arquivos prováveis

Mudança preferencialmente concentrada em:

```text
naamive/runtime/node-web/src/state-action-projection.ts
naamive/runtime/node-web/src/ui-01-focused.e2e.test.ts
```

Somente se necessário:

```text
naamive/runtime/node-web/src/server.ts
naamive/runtime/node-web/src/service.ts
naamive/runtime/node-web/web/index.html
```

Qualquer mudança de produção fora da projeção/action descriptors deve ser justificada.

Não alterar frontend se o renderer genérico UI-02 já suportar a ação.

## Validações obrigatórias

Executar:

```text
npm run build
testes focados UI-01/UI-02/intake
npm run e2e
git diff --check
git status --short
git diff
```

Somente em banco descartável conforme TST-02.

Resultado agregado esperado: somente os 4 Inventory known-baseline e zero regressões novas.

## Aceite manual posterior

Depois da implementação:

```text
Criar rascunho
→ selecionar projeto
→ ver SUBMIT_INTAKE
→ submeter
→ acompanhar validação por SSE
→ decidir REGISTER_PROJECT
→ continuar conforme discovery selecionado
```

A task não está manualmente aceita até esse smoke acontecer.

## Restrições do agent

Não executar:

```text
commit
push
merge
rebase
reset
clean
```

Não apagar banco manual.
Não alterar `.env` com segredos.
Não iniciar worker manual.
Não corrigir findings fora de escopo.

## Relatório final

Informar:

1. causa raiz;
2. estratégia arquitetural;
3. como o fail-closed foi preservado;
4. ações publicadas por estado de `PROJECT_INTAKE v1`;
5. arquivos alterados;
6. testes focados;
7. resultado de `npm run e2e`;
8. baselines conhecidos vs regressões novas;
9. confirmação de banco descartável/cleanup;
10. validação manual restante;
11. `git status --short`;
12. confirmação de que não houve commit/push.
