---
context: POST_F6_5_MANUAL_E2E
status: ACTIVE
checkpoint_date: 2026-09-02
branch: main
scope: post-certification manual validation and corrective findings
---

# NAAMIVE — Continuidade pós-F6.5 e teste manual E2E

## Objetivo deste arquivo

Permitir que um novo chat, agente ou sessão de implementação retome o estado
operacional atual sem reconstruir o histórico da Fase 6.5.

Este arquivo é um **checkpoint operacional datado**. Ele não substitui contratos,
tasks, migrations, testes, planejamento, `AGENTS.md` ou documentação canônica.

Quando houver divergência:

1. contratos e estado persistido atual prevalecem;
2. a task corrente define o escopo da mudança;
3. `AGENTS.md` define a disciplina de execução do agente;
4. este arquivo fornece contexto para retomada e investigação.

---

## 1. Estado canônico da Fase 6.5

A Fase 6.5 foi concluída e certificada em 01/09/2026.

A certificação histórica registrou:

- TST-01: 20/20;
- E2E agregado manual: 139 testes;
- 132 `PASS`;
- exatamente 7 `KNOWN_BASELINE`;
- 0 falhas novas;
- 0 skipped;
- 0 cancelled;
- 0 todo.

A F6.5 e sua documentação histórica **não devem ser reescritas retroativamente**
para esconder findings encontrados após a certificação.

Findings posteriores devem ser registrados como **correções pós-certificação**.

A Fase 7 permanece documentalmente desbloqueada, mas o teste manual ponta a ponta
está sendo usado para validar o produto real antes de avançar sem evidência.

---

## 2. Baselines históricas conhecidas

As sete baselines históricas autorizadas são:

### Inventory — 4

Diferenças históricas relacionadas a retry:

- casos antigos esperam `FAILED`;
- política atual produz `RETRYABLE` na tentativa aplicável.

### Phase 4 — 3

Casos históricos relacionados a:

- estado legado Codex-only;
- fallback Codex → DeepSeek;
- cleanup/foreign key de `work_acceptances_execution_id_fkey`.

Não transformar essas baselines em escopo de uma correção sem relação causal
demonstrada.

---

## 3. Repositório e runtime local

Repositório NAAMIVE:

```text
/home/mhj/git/naamive
```

Runtime:

```text
/home/mhj/git/naamive/naamive/runtime/node-web
```

Servidor:

```bash
npm run dev
```

Worker:

```bash
npm run worker
```

PostgreSQL local é executado pelo `docker compose` do runtime.

A UI local usa:

```text
http://127.0.0.1:3000
```

---

## 4. Provider/executor atual

O teste manual atual deve usar Codex.

Configuração relevante no `.env`:

```text
NAAMIVE_AGENT_ADAPTER=codex
NAAMIVE_DEVELOPMENT_EXECUTOR=codex
NAAMIVE_CODEX_COMMAND=/home/mhj/.nvm/versions/node/v24.18.1/bin/codex
```

Codex validado no checkpoint:

```text
codex-cli 0.147.0
Logged in using ChatGPT
```

`NAAMIVE_DEEPSEEK_MODEL` pode permanecer configurado, mas DeepSeek não é o
executor selecionado neste teste.

Não introduzir fallback ou troca silenciosa de provider para mascarar falha.

---

## 5. Autenticação e worker

Administrador humano usado no teste manual:

```text
mhj
```

O administrador foi criado pelo bootstrap GAT-03 e consegue autenticar pela UI.

Um service principal de worker foi criado corretamente com:

```text
WORKER_SERVICE / WORKER_EXECUTE
```

O `.env` já contém:

```text
NAAMIVE_WORKER_SERVICE_ID=<configurado>
NAAMIVE_WORKER_SERVICE_SECRET=<configurado>
```

**Nunca registrar, imprimir, documentar ou commitar o secret.**

A credencial do worker é persistente e não precisa ser recriada a cada start.
Somente rotacionar/recriar em caso de revogação, reset do banco, perda/vazamento
ou decisão explícita de rotação.

O worker validou startup com:

```text
event=worker_started
```

---

## 6. Laboratório manual atual

Clone Git usado como projeto-alvo:

```text
/home/mhj/git/central-atendimento
```

Antes do teste, um worktree antigo do NAAMIVE foi removido corretamente via Git:

```text
.naamive-worktrees/...
```

O checkout principal ficou como único worktree registrado e o clone foi limpo.

Projeto manual atual:

```text
project_id: financas-familiares-lab-1
title: Controle Financeiro Familiar
```

Objetivo do laboratório: percorrer o fluxo real do NAAMIVE desde intake,
discovery, commitment, tecnologia, materialização, módulos, work items,
desenvolvimento, QA/review, integração e entrega, registrando qualquer finding
real antes de mascará-lo com alterações manuais no banco.

---

## 7. Estado do banco no início do laboratório

Os projetos gerados por E2E anteriores foram limpos antes do laboratório.

A autenticação ainda contém principals de testes antigos (`test-auth-*`,
`tst01-*` e outros). Essa sujeira não bloqueou o login do administrador `mhj`,
mas deve ser distinguida do fluxo real.

Não limpar tabelas de autenticação durante uma correção sem necessidade, pois:

- o admin real existe;
- o worker service principal real existe;
- o worker secret está configurado;
- resetar autenticação exigiria bootstrap e service credential novamente.

---

## 8. Finding 1 — GAT-03-FIX-01

Classificação:

```text
P1
```

Task:

```text
GAT-03-FIX-01-project-creator-rbac-grants.md
```

Problema:

um principal humano autorizado a criar projeto recebe grants globais de
`CREATE_PROJECT` e `LIST_PROJECTS`, mas o fluxo real de criação não materializa
automaticamente os grants project-scoped necessários para continuar trabalhando
no projeto recém-criado.

Sintomas reproduzidos:

```text
GET /api/projects/financas-familiares-lab-1/projection
403 READ_PROJECT_DENIED
```

e:

```text
GET /api/projects/financas-familiares-lab-1/events
403 AUTH_GRANT_DENIED
```

Efeito na UI:

- o projeto aparece na lista;
- o estado `Rascunho` aparece;
- a projeção detalhada não carrega corretamente;
- o SSE é rejeitado;
- a UI mostra aviso de reconexão de notificações;
- o fluxo manual fica bloqueado.

Diagnóstico atual:

o `POST /api/projects` exige `OPERATOR / CREATE_PROJECT`, porém a criação não
concede ao principal autenticado, no escopo do novo projeto:

```text
OPERATOR / READ_PROJECT
OPERATOR / OPERATE_PROJECT
```

Os testes existentes frequentemente injetam esses grants em fixtures/helpers,
o que impediu a lacuna de aparecer nas suítes anteriores.

A correção deve seguir integralmente a task GAT-03-FIX-01.

---

## 9. Observação não bloqueante — 401 inicial da UI

Ao abrir a página antes do login, o frontend executa `loadProjects()`.

Por isso é esperado observar no console/log:

```text
GET /api/projects
401 AUTH_SESSION_REQUIRED
```

Depois do login bem-sucedido, o frontend chama novamente `/api/projects` e a
lista carrega.

Esse comportamento é confuso/cosmético, mas **não é a causa do bloqueio atual**
e não pertence ao escopo de GAT-03-FIX-01.

Se for corrigido no futuro, registrar finding/task separada.

---

## 10. Regra para findings pós-certificação

Cada novo bug encontrado no teste manual deve:

1. ser reproduzido antes de alteração corretiva;
2. receber task própria;
3. registrar severidade;
4. registrar evidência objetiva (HTTP, log, estado, UI, banco quando aplicável);
5. separar causa comprovada de hipótese;
6. definir comportamento atual e esperado;
7. definir testes de regressão;
8. preservar a certificação histórica;
9. entrar no README em seção própria de **Correções pós-certificação**;
10. ser corrigido antes de prosseguir quando for bloqueante do fluxo E2E.

Não inserir findings novos retroativamente na tabela serial histórica de tasks
certificadas como `DONE`.

---

## 11. Onde ficam as correções pós-certificação

Diretório:

```text
naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/
```

O README desse diretório deve possuir uma seção:

```text
Correções pós-certificação
```

e apontar para cada task corretiva.

O arquivo histórico:

```text
NAAMIVE_PHASE_6_5_CONTINUITY_2026-08-22.md
```

permanece como checkpoint histórico e não deve ser sobrescrito por este arquivo.

---

## 12. Ordem de leitura para um agente implementar um bug pós-F6.5

Antes de alterar código, ler no mínimo:

1. `/AGENTS.md`;
2. a task corretiva atual;
3. este arquivo de continuidade;
4. o README de tasks da F6.5;
5. a task original relacionada ao componente corrigido;
6. código e testes atuais;
7. migrations/schema quando aplicável;
8. contratos/lifecycle/planejamento afetados.

A task não substitui investigação do repositório.

---

## 13. Limitação de validação no Codex

`AGENTS.md` registra uma limitação do ambiente Codex para processos agregados
longos.

Portanto o agente **não deve executar por conta própria**:

```text
npm test
npm run e2e
macro-lifecycle.e2e.test.ts
```

salvo instrução explícita do operador ou mudança confirmada do ambiente.

O agente deve:

- executar build e suítes focadas seguras;
- executar regressões diretamente relacionadas que não caiam na limitação;
- executar `git diff --check`;
- revisar `git status` e `git diff`;
- reportar `MANUAL_OPERATOR_VALIDATION_REQUIRED` para agregados obrigatórios.

O operador executa manualmente as validações agregadas quando necessário.

Nunca classificar agregado não executado como PASS ou FAIL.

---

## 14. Retomada após GAT-03-FIX-01

Como a correção não deve fazer backfill heurístico de autoridade, após a
implementação:

1. validar os testes focados;
2. executar as validações manuais exigidas;
3. remover/recriar o projeto de laboratório de forma controlada;
4. criar o projeto novamente pela UI com o admin autenticado;
5. confirmar `projection = 200`;
6. confirmar conexão SSE autorizada;
7. confirmar que intake pode ser salvo/submetido;
8. continuar o E2E até o próximo finding ou até completar o lifecycle.

O worker já possui credencial persistente; não recriá-la apenas por causa desta
correção.

---

## 15. Princípio do teste atual

O objetivo não é “fazer a demo passar”.

O objetivo é provar que o produto real segue seus contratos sem:

- grants injetados manualmente;
- SQL corretivo para esconder bug;
- alteração de provider para contornar falha;
- estados forçados;
- dados artificiais que fixtures fornecem mas a UI real não cria;
- concessões de autoridade fora do fluxo publicado.

Quando o caminho real divergir do caminho provado apenas por fixtures, tratar a
divergência como finding até que a causa seja demonstrada.
