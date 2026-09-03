---
task: GAT-03-FIX-02
status: TO_DO
title: Restaurar sessão/CSRF após reload e separar login da aplicação
depends_on: [GAT-03, GAT-03-FIX-01, UI-01, UI-02]
severity: P1
discovered_by: manual-e2e
discovered_at: 2026-09-02
baseline: orchestration/audits/2026-08-22-lifecycle-conformance-audit.md
context: NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
---

# GAT-03-FIX-02 — Restaurar sessão/CSRF após reload e separar login da aplicação

## Classificação

**P1 — bloqueia operações mutáveis após reload com sessão ainda válida.**

Correção pós-certificação da Fase 6.5.

Antes de implementar, ler:

```text
/AGENTS.md
NAAMIVE_POST_F6_5_MANUAL_E2E_CONTINUITY_2026-09-02.md
GAT-03-authentication-rbac.md
GAT-03-FIX-01-project-creator-rbac-grants.md
UI-01-single-state-action-projection.md
UI-02-complete-stop-surfaces.md
```

Além disso, inspecionar autenticação, sessão, CSRF, frontend, rotas, SSE e testes atuais.

## 1. Problema funcional observado

A UI consegue carregar projetos depois de um reload porque o cookie de sessão
continua válido. Porém o JavaScript reinicializa `csrfToken = ''` e não restaura
o contexto CSRF da sessão existente.

Fluxo reproduzido:

1. usuário autenticou anteriormente;
2. cookie de sessão continuou válido;
3. página foi recarregada;
4. `GET /api/projects` funcionou com o cookie;
5. projetos apareceram;
6. ao executar `POST /api/projects`, o frontend não enviou `x-csrf-token`;
7. servidor respondeu:

```text
AUTH_CSRF_TOKEN_REQUIRED
```

Estado inconsistente:

```text
backend: sessão autenticada
frontend: contexto de autenticação/CSRF ausente
```

## 2. Comportamento esperado

Com sessão válida após reload:

- restaurar explicitamente o principal autenticado;
- restaurar/renovar de forma segura o contexto CSRF;
- não exigir novo login;
- só carregar a aplicação após resolver autenticação;
- permitir operações mutáveis autorizadas normalmente.

Com sessão ausente, inválida, expirada ou revogada:

- não mostrar a aplicação protegida;
- encaminhar para login;
- não carregar projetos ou demais dados protegidos.

## 3. Recuperação segura de sessão/CSRF

Não persistir CSRF em `localStorage`, query string, URL ou mecanismo inseguro.

Investigar o modelo atual e, se necessário, criar endpoint equivalente a:

```text
GET /api/auth/session
```

ou:

```text
GET /api/auth/me
```

O contrato deve:

- exigir sessão válida;
- não expor segredo de sessão;
- retornar identidade/contexto mínimo;
- fornecer ou renovar CSRF de maneira compatível com o modelo vigente;
- falhar fechado;
- não conceder role/grant;
- possuir testes positivos e negativos.

O nome real da rota deve seguir as convenções do repositório.

## 4. Tela de login dedicada

Remover o formulário de login do navbar da aplicação.

Sem sessão válida, mostrar uma tela dedicada e simples:

```text
NAAMIVE

Usuário
[________________]

Senha
[________________]

[ Entrar ]
```

Pode conter mensagem de erro e estado de carregamento.

Não mostrar nessa tela:

- projetos;
- criar rascunho;
- módulos;
- work items;
- gates;
- ações;
- timeline;
- qualquer conteúdo autenticado.

Usar o Bootstrap já existente. Não criar cadastro, recuperação de senha, SSO ou
novo framework.

## 5. Navegação

### Sem sessão

Exibir login.

### Login bem-sucedido

```text
login
→ sessão criada
→ CSRF estabelecido
→ redirecionamento para página principal
→ carregar projetos
```

### Sessão já válida

```text
restaurar sessão
→ restaurar CSRF
→ abrir página principal
```

Sem pedir senha novamente.

### Logout

```text
logout
→ sessão encerrada
→ CSRF descartado
→ redirecionamento para login
```

Reload após logout não pode restaurar a aplicação.

## 6. Layout da página principal após login

O layout atual empilha:

```text
Projetos
↓
Criar rascunho
```

na mesma coluna lateral. Isso deve ser alterado.

Em desktop, a página principal deve abrir com:

```text
┌──────────────────────────┬──────────────────────────────┐
│         Projetos         │       Criar rascunho        │
│                          │                              │
│  projeto A               │  Identificador              │
│  projeto B               │  Repositório                │
│  projeto C               │  Título                     │
│                          │  Responsável                 │
│                          │  ...                         │
└──────────────────────────┴──────────────────────────────┘
```

Requisitos:

- `Projetos` à esquerda;
- `Criar rascunho` à direita;
- ambos lado a lado em desktop;
- formulário com largura confortável;
- não manter formulário longo dentro de sidebar estreita;
- responsivo: em tela pequena pode empilhar;
- usar grid Bootstrap existente;
- não adicionar framework novo.

A proporção pode ser, por exemplo:

```text
Projetos: col-lg-4 ou col-lg-5
Criar rascunho: col-lg-8 ou col-lg-7
```

mas deve ser escolhida após inspecionar o layout real.

## 7. Área de detalhe do projeto

A reorganização não pode eliminar nem comprimir indevidamente a projeção UI-01/UI-02.

Preferência:

```text
linha 1:
Projetos | Criar rascunho

linha 2:
Detalhe completo do projeto selecionado
```

A área de detalhe pode ocupar largura total abaixo e deve preservar:

- resumo;
- módulos;
- itens de trabalho;
- atividade;
- gates/paradas;
- superfícies de parada;
- ações permitidas;
- notificações/SSE.

## 8. Estado autenticado na aplicação

Depois do login, não mostrar novamente usuário/senha no navbar.

Mostrar apenas informação mínima útil, por exemplo:

```text
mhj
Sair
```

ou equivalente.

A aplicação deve carregar projetos somente depois de confirmar/restaurar a sessão.

Remover o bootstrap cego que chama `loadProjects()` antes de resolver autenticação.

## 9. Segurança e invariantes

Preservar:

- sessão/cookies conforme GAT-03;
- CSRF obrigatório;
- fail-closed;
- RBAC server-side;
- nenhuma role inferida na UI;
- nenhuma identidade por header/payload não confiável;
- nenhuma autoridade de gate criada;
- service principals fora do login humano;
- senha não persistida pela aplicação;
- nenhum token em URL;
- credenciais fora de logs.

## 10. Compatibilidade

Não quebrar:

- GAT-03-FIX-01;
- grants project-scoped;
- EventSource/SSE;
- UI-01;
- UI-02;
- logout;
- worker/service principals;
- endpoints não relacionados.

## 11. Testes obrigatórios — sessão/CSRF

Adicionar regressão que prove:

1. login humano;
2. sessão criada;
3. CSRF inicial disponível;
4. simular reload/nova carga sem novo login;
5. restaurar sessão usando cookie existente;
6. restaurar/renovar CSRF;
7. executar operação mutável permitida;
8. confirmar ausência de `AUTH_CSRF_TOKEN_REQUIRED`;
9. confirmar que não houve novo login.

Cobrir também:

- cookie ausente;
- sessão inválida;
- sessão expirada;
- sessão revogada;
- CSRF ausente;
- CSRF inválido;
- logout seguido de tentativa de reutilização;
- endpoint de restauração, se criado, não amplia autoridade.

## 12. Testes obrigatórios — navegação/UI

Cobrir:

- sem sessão, aplicação não carrega projetos;
- login válido encaminha para a aplicação;
- login inválido permanece no login;
- sessão existente evita login redundante;
- logout retorna ao login;
- lista de projetos e `Criar rascunho` são regiões irmãs no layout principal,
  e não uma sequência dentro da mesma sidebar;
- área de detalhe continua disponível;
- UI-01/UI-02 continuam renderizadas.

Não criar teste frágil baseado apenas em pixels.

## 13. Arquivos prováveis

A solução pode afetar:

```text
naamive/runtime/node-web/web/index.html
naamive/runtime/node-web/src/server.ts
naamive/runtime/node-web/src/auth.ts
```

e novos HTML/JS se separar `login` e `app` for mais adequado.

Evitar duplicação desnecessária de helpers.

## 14. Fora de escopo

Não incluir:

- cadastro;
- recuperação de senha;
- MFA;
- OIDC/SSO;
- multitenancy;
- redesign visual completo;
- framework SPA novo;
- administração de usuários;
- alteração de RBAC/gates;
- mudança no worker secret;
- refatoração geral sem necessidade.

## 15. Validações

Seguir o `AGENTS.md` vigente.

Executar:

- build;
- testes focados de auth/session/CSRF;
- regressão nova;
- testes focados de UI;
- `git diff --check`;
- revisão de `git status`;
- revisão de `git diff`.

Executar agregados apenas conforme política vigente do `AGENTS.md`.

Não fazer commit, push, reset, clean, rebase ou merge.

## 16. Aceite manual obrigatório

### Primeira entrada

1. abrir sem sessão;
2. confirmar tela somente de login;
3. autenticar;
4. confirmar redirecionamento;
5. confirmar `Projetos` à esquerda;
6. confirmar `Criar rascunho` à direita;
7. confirmar ausência do formulário de login na aplicação.

### Reload

1. com sessão válida, recarregar;
2. não fazer novo login;
3. confirmar restauração da sessão;
4. confirmar projetos carregados;
5. criar rascunho;
6. confirmar ausência de `AUTH_CSRF_TOKEN_REQUIRED`.

### Logout

1. clicar `Sair`;
2. confirmar retorno ao login;
3. recarregar;
4. confirmar que aplicação protegida não reaparece.

### Projeto

1. autenticar;
2. selecionar projeto;
3. confirmar detalhe UI-01/UI-02 íntegro;
4. confirmar SSE ativo.

## 17. Evidência esperada para DONE

- reprodução registrada;
- causa confirmada;
- diff focado;
- regressão reload/session/CSRF;
- testes de navegação;
- layout reorganizado;
- build e testes focados PASS;
- agregados conforme política vigente;
- smoke manual aprovado;
- sem nova regressão;
- commit SHA auditável.

## Nota de origem

Finding descoberto em 02/09/2026 durante o teste manual pós-F6.5.

A sessão HTTP persistida permitia leitura após reload, mas o frontend perdia o
CSRF mantido apenas em memória, causando `AUTH_CSRF_TOKEN_REQUIRED`.

Na mesma validação foi identificado que o login no navbar e o layout com
`Projetos` acima de `Criar rascunho` prejudicavam a experiência. A correção passa
a exigir login dedicado e dashboard com essas duas regiões lado a lado.
