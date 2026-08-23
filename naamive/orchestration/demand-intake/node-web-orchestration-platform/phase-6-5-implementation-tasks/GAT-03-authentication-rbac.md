---
task: GAT-03
status: BLOCKED_BY_ARCHITECTURAL_DECISION
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

## Trava de pré-validação do modelo de identidade e autenticação

Antes de implementar middleware, sessão, token, adapter de identity provider,
service principal, RBAC, CSRF, credenciais, claims ou configuração de
autenticação, levantar e documentar o modelo de implantação atual do NAAMIVE.
O levantamento deve identificar como o runtime é iniciado, como a UI acessa o
backend, se há usuário ou sessão atualmente, o uso de `NAAMIVE_OPERATOR_ID`, os
headers de papel F6, service identities existentes, a autenticação disponível
no ambiente, proxy/reverse proxy quando houver, credenciais/segredos já usados
e os limites do MVP atual.

Antes de qualquer código, produzir recomendação explícita para o mecanismo de
autenticação da Fase 6.5, com as evidências do levantamento e sua compatibilidade
com o deployment aprovado. Se o modelo concreto não puder ser derivado com
segurança do deployment atual e da documentação aprovada, registrar
`DECISÃO ARQUITETURAL NECESSÁRIA` e parar antes de implementar a autenticação.
Não escolher silenciosamente OIDC, JWT, sessão local, API key, proxy auth ou
qualquer outro mecanismo.

## Fronteiras de responsabilidade

### Autenticação

Prova quem é o principal.

### Identidade

Representa o principal autenticado e seus atributos confiáveis.

### Autorização / RBAC

Determina quais ações o principal pode executar em determinado escopo.

### Autoridade de gate

Continua definida pelo catálogo da `GAT-01`. A GAT-03 não recria, duplica ou
altera a política de gates. A `GAT-01` define qual autoridade é exigida; a
GAT-03 prova qual principal está autenticado e se possui essa autoridade no
escopo correto.

## Matriz obrigatória de RBAC

Antes da implementação funcional, produzir e validar uma matriz RBAC versionada
contra o catálogo publicado pela `GAT-01`. Cada permissão deve identificar o
projeto e o recurso quando aplicáveis; a coluna Gate/Comando deve referenciar o
gate ou comando catalogado, e não criar uma política paralela.

| Principal/Role | Scope | Ação | Gate/Comando | Permitido? | Justificativa |
| -------------- | ----- | ---- | ------------ | ---------- | ------------- |
| anônimo | nenhum | consultar, operar projeto, decidir gate, retry/recovery, administrar configuração, ações cross-project e ações de worker | qualquer um | não | não há identidade, role ou scope comprovados |
| operador | projeto explicitamente atribuído | consultar e operar projeto | comandos ordinários publicados | somente se a matriz publicada autorizar | não decide gate nem amplia escopo |
| autoridade de negócio | projeto/recurso explicitamente atribuído | consultar e decidir gate de negócio | gates/comandos de negócio da GAT-01 | somente se a autoridade catalogada coincidir | decisão humana limitada ao escopo e à ação |
| autoridade técnica | projeto/recurso explicitamente atribuído | consultar e decidir gate técnico | gates/comandos técnicos da GAT-01 | somente se a autoridade catalogada coincidir | não substitui outras autoridades |
| autoridade de risco/compliance | projeto/recurso explicitamente atribuído | consultar e decidir gate de risco/compliance | gates/comandos de risco/compliance da GAT-01 | somente se a autoridade catalogada coincidir | aplicabilidade, autoridade e escopo são verificados |
| On-call Owner | projeto/recurso explicitamente atribuído | retry/recovery e ações operacionais publicadas | comandos de recovery publicados | somente se a matriz publicada autorizar | não obtém decisão de gate por ser on-call |
| worker/service principal | identidade, projeto, recurso e ação mínimos explicitamente atribuídos | ações de worker | comandos de worker publicados | somente as ações atribuídas | não assume papel humano nem aprova gate humano |
| agentes não-humanos, quando aplicável | identidade, projeto, recurso e ação mínimos explicitamente atribuídos | ações automatizadas publicadas | comandos de agente publicados | somente as ações atribuídas | não assumem papel humano nem ampliam escopo |
| qualquer principal | projeto diferente ou sem scope do recurso | qualquer ação cross-project | qualquer gate/comando | não | role não concede autoridade global |
| administrador de configuração autorizado | escopo administrativo explicitamente publicado | administrar configuração | comandos administrativos publicados | somente se a matriz publicada autorizar | privilégio administrativo é separado de roles de projeto e de gate |

A matriz deve cobrir também as combinações negativas relevantes, role
desconhecida, recurso ausente, ação não publicada e divergência entre projeto e
recurso. Toda permissão funcional deve ser testada em caminho permitido e
negado antes de ser implementada.

## Service identities

Definir antes da implementação o contrato de identidades não-humanas. Cada
worker/service principal deve ter identidade própria, escopo mínimo, ações
explicitamente permitidas, rastreabilidade de auditoria e mecanismo compatível
com o deployment para rotação e revogação. Não pode assumir papel humano,
aprovar gate reservado a autoridade humana, ampliar o próprio escopo ou usar
credencial de usuário humano. Se forem necessárias identidades distintas por
tipo de agente ou worker, documentar a necessidade, escopo, ações e ciclo de
vida de cada uma antes de implementá-las.

## Compatibilidade com `NAAMIVE_OPERATOR_ID` e headers legados

Definir estratégia explícita de transição para `NAAMIVE_OPERATOR_ID`, `x-role`,
`x-actor` e quaisquer headers ou payloads declarativos. O legado pode continuar
consultável, auditável e identificado como legado; o fluxo novo não pode usá-lo
como prova definitiva de identidade ou autoridade. Compatibilidade temporária
deve ser explicitamente marcada, limitada em escopo, removível, incapaz de
conceder privilégios adicionais e nunca tratada como segurança final.

## Fail closed, expiração e revogação

Quando identidade, sessão, role, scope ou autoridade não puderem ser
comprovados, **NEGAR A AÇÃO** sem efeito de negócio. Não usar fallback
permissivo. Sessão ausente, token inválido, role desconhecida, scope ausente,
projeto divergente, credencial expirada e principal revogado devem falhar.

Definir o tratamento de sessão expirada, credencial expirada, principal revogado,
role removida, scope removido e rotação de credencial de serviço. Revogação deve
impedir ações futuras sem reinterpretar decisões históricas já auditadas.

## Proteção de credenciais e redaction

Definir critérios que não persistam segredo em eventos, não transmitam segredo
por SSE, não exponham token em logs, não incluam credenciais em erros e redijam
claims sensíveis. Credenciais não podem constar em query strings; armazenamento
de sessão/segredo e configuração devem ser protegidos de forma compatível com o
deployment validado antes da implementação.

## CSRF e sessão

Somente após fechar o mecanismo de autenticação, avaliar CSRF e sessão. Se o
mecanismo usar sessão/cookie, definir proteção CSRF apropriada, atributos do
cookie e proteção contra uso de sessão em outro contexto. Se não usar sessão
baseada em cookie, documentar por que CSRF não se aplica da mesma forma. Não
implementar proteção genérica antes dessa decisão.

## Escopo cross-project

Possuir role não significa possuir autoridade global. A autorização deve validar
principal, role, projeto, recurso, ação e gate/comando; ação em projeto diferente
do escopo autorizado deve ser negada.
