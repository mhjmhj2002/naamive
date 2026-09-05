---
task: GAT-03-FIX-01
status: TO_DO
title: Conceder acesso project-scoped ao criador do projeto
depends_on: [GAT-03, UI-01]
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-02
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
---

# GAT-03-FIX-01 — Conceder acesso project-scoped ao criador do projeto

## Classificação

**P1 — bloqueante do fluxo manual ponta a ponta.**

Correção pós-certificação da Fase 6.5. Esta task **não reabre nem reescreve a
certificação histórica** de GAT-03/TST-01/DOC-01; registra uma falha funcional
descoberta posteriormente em execução manual real do produto.

## Problema observado

Um principal humano autenticado com papel `OPERATOR` e grants globais de
`CREATE_PROJECT` e `LIST_PROJECTS` consegue criar e listar um projeto, porém não
recebe automaticamente grants project-scoped para ler e operar o projeto que
acabou de criar.

O resultado é um projeto visível na lista, mas inacessível na projeção e no
stream de eventos.

### Reprodução manual observada

Principal autenticado:

```text
mhj
```

Projeto criado pela UI:

```text
financas-familiares-lab-1
```

Após selecionar o projeto, o servidor registrou:

```text
GET /api/projects/financas-familiares-lab-1/projection
403 READ_PROJECT_DENIED

GET /api/projects/financas-familiares-lab-1/events
403 AUTH_GRANT_DENIED
```

Na UI:

- o projeto aparece na lista;
- o estado `Rascunho` aparece;
- a área de detalhe fica sem projeção útil;
- o SSE falha e a UI exibe
  `A conexão de notificações será restabelecida automaticamente.`;
- o fluxo de intake não consegue prosseguir normalmente.

## Causa funcional

O bootstrap do primeiro administrador concede, entre outros:

```text
OPERATOR / CREATE_PROJECT
OPERATOR / LIST_PROJECTS
```

O `POST /api/projects` autoriza `CREATE_PROJECT`, mas o fluxo de criação perde o
principal autenticado ao entrar em `createProject(...)` e não materializa grants
project-scoped para o novo projeto.

As rotas/projeções seguintes exigem grants como:

```text
OPERATOR / READ_PROJECT / <project_id>
OPERATOR / OPERATE_PROJECT / <project_id>
```

Os testes existentes frequentemente criam esses grants explicitamente em
fixtures/helpers, mascarando a ausência desse vínculo no fluxo real de criação.

## Comportamento esperado

Quando um principal humano autorizado cria um projeto com sucesso, o mesmo
principal deve sair da **mesma transação de criação** com autoridade mínima para
continuar o fluxo ordinário daquele projeto.

No mínimo:

```text
role_code=OPERATOR
action_code=READ_PROJECT
project_id=<novo_project_id>
```

e:

```text
role_code=OPERATOR
action_code=OPERATE_PROJECT
project_id=<novo_project_id>
```

Isso **não** deve conceder automaticamente:

- autoridade de gate;
- `CONFIGURATION_ADMIN`;
- papéis de negócio/técnicos;
- papéis de assurance;
- acesso a outros projetos;
- qualquer ação de service principal.

## Invariantes

- autorização continua fail-closed;
- o grant deve pertencer ao **principal autenticado que executou a criação**;
- não confiar em `NAAMIVE_OPERATOR_ID`, header declarativo ou payload para
  determinar o dono do grant;
- grants devem ser project-scoped;
- criação do projeto + grants iniciais deve ser atômica;
- falha ao persistir os grants deve abortar a criação inteira;
- retry/idempotência/conflito de criação não pode duplicar grants;
- nenhum cross-project access pode surgir;
- nenhuma autoridade de gate pode ser derivada implicitamente de `OPERATOR`;
- service principals não recebem esses grants por esse fluxo.

## Implementação requerida

### 1. Preservar o principal autenticado no comando de criação

A rota:

```text
POST /api/projects
```

já autentica e autoriza o caller.

Alterar a fronteira do serviço para que `createProject(...)` receba explicitamente
o principal autenticado, ou um contexto de ator derivado dele.

Não reconstituir identidade por variável de ambiente.

### 2. Persistir grants iniciais na mesma transação

Na mesma transação que insere `projects`, criar os dois grants project-scoped do
criador:

```text
OPERATOR / READ_PROJECT
OPERATOR / OPERATE_PROJECT
```

com `project_id` igual ao projeto recém-criado.

A implementação deve respeitar constraints/índices existentes e ser segura
contra duplicação.

### 3. Manter identidade/auditoria coerentes

Onde a criação do projeto registra ator/criador (`created_by`, `updated_by`,
`submitted_by`, `events.actor_id` ou equivalente aplicável), usar a identidade
autenticada quando o contrato atual permitir.

Não ampliar esta task para uma refatoração geral de todos os atores legados do
runtime; corrigir a criação do projeto e registrar qualquer dívida adicional
se encontrada.

### 4. Não fazer backfill inseguro

Projetos antigos criados antes desta correção podem não possuir evidência
suficiente para inferir com segurança qual principal humano deve receber grants.

Portanto:

- **não** conceder grants globais;
- **não** inferir proprietário apenas por `NAAMIVE_OPERATOR_ID`;
- **não** fazer backfill heurístico silencioso.

Se não houver vínculo autenticado confiável nos dados históricos, documentar a
limitação. Para o laboratório manual atual, o projeto pode ser recriado após a
correção.

## Testes obrigatórios

Adicionar um E2E que reproduza o fluxo real sem helper que injete grants
project-scoped artificialmente.

### Cenário positivo mínimo

1. bootstrap do primeiro administrador;
2. login do administrador;
3. criar projeto por `POST /api/projects`;
4. verificar no banco que o principal recebeu exatamente:
   - `OPERATOR / READ_PROJECT / <project_id>`;
   - `OPERATOR / OPERATE_PROJECT / <project_id>`;
5. `GET /api/projects` continua `200`;
6. `GET /api/projects/<id>/projection` retorna `200`;
7. `GET /api/projects/<id>/events` autoriza a conexão;
8. salvar intake do projeto é permitido;
9. submeter intake do projeto é permitido quando o payload é válido.

### Cenários negativos obrigatórios

- outro principal sem grant do projeto recebe `403`;
- grant do projeto A não autoriza projeto B;
- criador não recebe `DECIDE_CATALOG_GATE`;
- principal de serviço não herda grants humanos;
- falha transacional ao criar grant não deixa projeto órfão parcialmente criado;
- tentativa de criar `project_id` já existente não cria grants extras.

## Regressões obrigatórias

Executar, no mínimo:

```bash
npm run build
npm test
npm run e2e
```

Além da suíte focada de autenticação/RBAC/UI relacionada.

As baselines históricas já classificadas devem continuar sendo tratadas conforme
a documentação vigente; esta correção não pode introduzir nova falha fora dessas
baselines.

## Aceite manual obrigatório

Após implementar e passar os testes:

1. manter servidor e worker configurados normalmente;
2. autenticar na UI com o administrador;
3. criar um projeto novo pela própria UI;
4. selecionar o projeto;
5. confirmar que não aparecem:
   - `READ_PROJECT_DENIED`;
   - `AUTH_GRANT_DENIED`;
6. confirmar que a projeção carrega;
7. confirmar que o SSE permanece conectado;
8. confirmar que o fluxo permite preencher/salvar/submeter a necessidade.

## Arquivos prováveis

A implementação provavelmente tocará:

```text
naamive/runtime/node-web/src/server.ts
naamive/runtime/node-web/src/service.ts
naamive/runtime/node-web/src/auth.ts
```

e testes E2E/focados relacionados a autenticação, criação de projeto e UI.

Evitar migration nova se o schema atual já suportar os grants necessários.
Criar migration somente se houver necessidade estrutural real demonstrada.

## Fora de escopo

- redesenhar toda a matriz RBAC;
- criar UI administrativa de usuários;
- multitenancy;
- alterar autoridades de gate;
- conceder automaticamente papéis de negócio/técnicos;
- backfill heurístico de projetos históricos;
- corrigir o `401` cosmético do `loadProjects()` antes do login;
- qualquer mudança no worker secret/service principal já configurado.

## Evidência esperada para DONE

- diff focado;
- teste E2E novo reproduzindo a falha antes da correção e passando depois;
- build e suítes obrigatórias;
- `git diff --check`;
- evidência do smoke manual pela UI;
- ausência de `READ_PROJECT_DENIED` e `AUTH_GRANT_DENIED` no projeto recém-criado;
- commit SHA auditável.

## Nota de origem

Finding descoberto durante o primeiro teste manual ponta a ponta pós-F6.5, em
02/09/2026, ao iniciar o laboratório `Controle Financeiro Familiar` com um clone
Git local real e worker autenticado.
