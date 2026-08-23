# NAAMIVE — Resumo de Continuidade da Fase 6.5

**Data do checkpoint:** 22/08/2026  
**Branch:** `phase6.5-lifecycle-alignment`  
**Fase:** 6.5 — Lifecycle Alignment and Autonomous Orchestration Recovery  
**Objetivo deste arquivo:** permitir retomar o trabalho em um novo chat sem reconstruir todo o histórico.

---

## 1. Por que a Fase 6.5 foi criada

A Fase 6 havia sido implementada e marcada como concluída, porém um teste manual do projeto real mostrou que o runtime não seguia corretamente o lifecycle planejado.

O problema central observado foi que o processo deveria ser predominantemente automático, com intervenção humana apenas em gates legítimos ou situações excepcionais, mas o runtime ainda possuía paradas operacionais, autorizações individuais e estados sem continuidade adequada.

Princípio arquitetural reforçado:

> **AUTOMATION FIRST, HUMAN BY EXCEPTION OR EXPLICIT GATE.**

A Fase 6.5 foi criada como fase corretiva entre F6 e F7. A F7 permanece bloqueada até o aceite integral da F6.5.

Auditoria baseline:

`naamive/orchestration/audits/2026-08-22-lifecycle-conformance-audit.md`

Planejamento principal:

`naamive/orchestration/demand-intake/node-web-orchestration-platform/16_PHASE_6_5_LIFECYCLE_ALIGNMENT_AND_AUTONOMOUS_ORCHESTRATION_RECOVERY.md`

Tasks:

`naamive/orchestration/demand-intake/node-web-orchestration-platform/phase-6-5-implementation-tasks/`

---

## 2. Escopo planejado

A Fase 6.5 possui 14 demandas:

| Ordem | Task | Objetivo resumido | Status atual |
|---:|---|---|---|
| 1 | **LR-01** | Publicar workflows aderentes v2 e corrigir o modelo de estados/transições | **DONE** |
| 2 | **GAT-01** | Catálogo server-side versionado de gates e autoridade | **DONE** |
| 3 | **GAT-03** | Autenticação e RBAC server-side | **DONE** |
| 4 | **AUT-01** | Scheduler transacional de elegibilidade e dispatch automático | **TO_DO** |
| 5 | **REC-01** | Recovery orientado pela causa | **TO_DO** |
| 6 | **LR-02** | Sincronizar lifecycle macro de projeto e módulo | **TO_DO** |
| 7 | **AUT-02** | Automatizar QA → review → merge → integração | **TO_DO** |
| 8 | **AUT-03** | Expandir assurance F6 para os trabalhos reais | **TO_DO** |
| 9 | **REC-02** | Recovery de reviewer, assistência e routing | **TO_DO** |
| 10 | **GAT-02** | Lifecycle de entrega, pausa, retomada e cancelamento | **TO_DO** |
| 11 | **UI-01** | Projeção única de estado e `allowed_actions` | **TO_DO** |
| 12 | **UI-02** | Superfícies completas para estados de parada/recovery | **TO_DO** |
| 13 | **TST-01** | Suíte transversal de conformidade do lifecycle | **TO_DO** |
| 14 | **DOC-01** | Reconciliar documentação F5/F6/F6.5 | **TO_DO** |

Ordem planejada:

`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01 → LR-02 → AUT-02 → AUT-03 → REC-02 → GAT-02 → UI-01 → UI-02 → TST-01 → DOC-01`

---

## 3. LR-01 — DONE

### Objetivo

Publicar contratos de workflow compatíveis com o lifecycle normativo antes de construir automações em cima do modelo antigo.

### Implementado

Foram publicados:

- `PROJECT_DISCOVERY v4`
- `MODULE_DELIVERY v2`
- `WORK_ITEM_DELIVERY v2`
- `ORCHESTRATION_EXECUTION v1`

Migration:

`048_phase_6_5_conformant_workflows.sql`

A LR-01 separou semanticamente:

- blocker externo;
- dependência técnica;
- elegibilidade;
- dispatch;
- produção;
- output;
- QA;
- review;
- `ACCEPT`;
- rework;
- block;
- recovery;
- gate humano.

Regra importante:

> `EXECUTION_SUCCEEDED != WORK_ACCEPTED`

No caminho supervisionado, somente `ACCEPT` representa aceite técnico.

Novos WIs podem nascer como:

- `WAITING_FOR_EXTERNAL_INPUT`
- `WAITING_FOR_DEPENDENCIES`
- `ELIGIBLE_FOR_DISPATCH`

A autorização humana individual existente no workflow legado não faz parte do novo fluxo.

### Compatibilidade

O legado foi preservado sem reinterpretar registros históricos.

A LR-01 não implementou scheduler ou auto-dispatch; isso pertence à AUT-01.

### Validação

As suítes diretamente afetadas passaram.

Foram encontradas quatro falhas em `inventory.e2e.test.ts`. Foi feita comparação contra o commit anterior à LR-01 e comprovado que as mesmas quatro falhas já existiam.

Causa conhecida:

`agentMaxRetries=2` faz a primeira falha resultar em `RETRYABLE`, enquanto quatro testes antigos esperam `FAILED`.

Classificação:

**DÍVIDA PREEXISTENTE — NÃO CAUSADA PELA LR-01.**

Não corrigir essa dívida dentro de tasks sem relação com inventory.

---

## 4. GAT-01 — DONE

### Objetivo

Transformar o servidor na fonte de verdade para gates.

Gate humano deve ser exceção, não mecanismo normal de progressão.

### Implementado

Catálogo server-side versionado, incluindo:

- hash;
- contratos imutáveis;
- registros auditáveis;
- decisões auditáveis;
- idempotência;
- condições;
- evidências;
- autoridade requerida;
- decisões permitidas;
- consequências;
- snapshot obrigatório do contrato para gates v2+.

Arquivo principal:

`naamive/runtime/node-web/src/gate-catalog.ts`

Migrations:

`049` a `052`

Matriz de pré-validação:

`phase-6-5-implementation-tasks/GAT-01-gate-matrix.md`

O assurance F6 passou a aceitar somente tipos presentes no catálogo.

### Regra central

Não são gates humanos por si só:

- blocker externo;
- dependência;
- erro técnico;
- retry;
- recovery;
- rework automático;
- QA;
- review independente;
- espera por reviewer;
- elegibilidade;
- integração técnica.

Gate condicional exige:

`condição normativa + evidência + autoridade + decisões + consequência determinística`

O happy path também deve provar **ausência de gate** quando nenhuma condição material existir.

### Fronteira

GAT-01 responde:

> **QUAL autoridade é necessária?**

GAT-03 responde:

> **QUEM está autenticado e possui essa autoridade?**

---

## 5. GAT-03 — DOING

### Objetivo

Eliminar confiança em identidade/role declarada pelo cliente e implementar autenticação + RBAC server-side.

### Pré-validação

A task parou corretamente em:

`BLOCKED_BY_ARCHITECTURAL_DECISION`

porque o deployment existente não possuía:

- IdP;
- sessão;
- proxy autenticador;
- credenciais de serviço;
- modelo confiável de usuários/grants.

Foi criado:

`phase-6-5-implementation-tasks/GAT-03-authentication-rbac-prevalidation.md`

Após revisão, a decisão arquitetural foi aprovada.

### Decisão arquitetural aprovada

#### Humanos

Autenticação local server-side:

`login → credencial validada → sessão opaca server-side → cookie HttpOnly → principal/roles/grants server-side`

Características:

- `HttpOnly`;
- `SameSite=Strict`;
- expiração;
- revogação;
- logout;
- CSRF/origin protection;
- fail-closed.

Roles e scopes nunca são confiados ao browser.

#### Service principals

Workers/agentes possuem identidades próprias e credenciais separadas.

Não podem:

- assumir identidade humana;
- ganhar role humana;
- decidir gate reservado a humano;
- aumentar o próprio scope;
- usar credencial humana.

#### Futuro

A autenticação deve possuir uma fronteira que permita futuramente substituir o provider local por OIDC/IdP sem redesenhar RBAC, grants, GAT-01 e audit trail.

OIDC/Keycloak/Auth0 **não fazem parte da F6.5 atual**.

#### Bootstrap

Primeiro administrador criado por bootstrap explícito usando:

`NAAMIVE_AUTH_BOOTSTRAP_SECRET`

Não permitir:

- `admin/admin`;
- senha default;
- bypass permanente;
- master password.

O secret serve somente ao bootstrap e não deve permanecer como caminho alternativo de autorização.

#### Legado

Não são prova de autoridade:

- `NAAMIVE_OPERATOR_ID`
- `x-actor-role`
- `x-actor-id`
- `x-naamive-operator`
- role/actor enviados no payload

Podem permanecer apenas quando necessário para compatibilidade/auditoria histórica.

### Implementação já realizada

Até o checkpoint atual:

- migration `053`;
- principals;
- credenciais com hash `scrypt`;
- roles/grants;
- sessões opacas;
- expiração;
- revogação;
- auditoria;
- bootstrap do primeiro administrador;
- login/logout;
- cookie `HttpOnly` / `SameSite=Strict`;
- CSRF por Origin + token;
- RBAC por ação, projeto e recurso;
- rejeição cross-project;
- fail-closed;
- integração com autoridade da GAT-01;
- headers legados sem autoridade;
- service principals;
- credenciais próprias de serviços;
- rotação/revogação;
- bloqueio de ações humanas por service principal;
- worker exigindo credencial de serviço ao iniciar;
- documentação/configuração de exemplo.

Arquivos principais:

- `naamive/runtime/node-web/src/auth.ts`
- `naamive/runtime/node-web/src/server.ts`
- `naamive/runtime/node-web/migrations/053_phase_6_5_authentication_rbac.sql`

### Validações já verdes

- `npm run migrate`
- `npm run build`
- `auth.e2e.test.ts`
- regressões GAT-01
- regressões F6
- `git diff --check`

### Bloqueio atual

A GAT-03 permanece **DOING / IN_PROGRESS** porque:

`http-acceptance.e2e.test.ts`

possui chamadas HTTP anônimas incompatíveis com a nova fronteira obrigatória de autenticação.

Isso **não deve ser resolvido enfraquecendo a autenticação**.

O agent está neste momento analisando/corrigindo essa regressão.

A orientação atual é classificar cada falha como:

- teste legado desatualizado;
- regressão funcional GAT-03;
- endpoint legitimamente público.

Se o endpoint corretamente exige autenticação, adaptar o teste para autenticar legitimamente.

Proibidos:

- bypass para ambiente de teste;
- header mágico;
- usuário implícito;
- role default;
- reutilização dos headers legados como autenticação.

### Critério para DONE

GAT-03 somente pode virar DONE quando:

- `http-acceptance.e2e.test.ts` estiver verde;
- GAT-03 estiver verde;
- regressões GAT-01/F6 estiverem verdes;
- build estiver verde;
- nenhuma regressão nova permanecer;
- eventuais falhas restantes forem somente as quatro de inventory já comprovadas como preexistentes;
- `git diff --check` passar.

---

## 6. Próximas tasks

### AUT-01 — TO_DO

Implementar scheduler transacional de elegibilidade.

Objetivo central:

Quando um WI estiver elegível, o sistema deve avançar automaticamente para dispatch sem exigir clique/autorização humana individual.

Deve tratar:

- elegibilidade;
- dependências;
- blockers;
- concorrência;
- idempotência;
- dispatch automático.

Não confundir scheduler com gate humano.

---

### REC-01 — TO_DO

Recovery orientado pela causa.

Objetivo:

Estados de falha/parada devem possuir caminho operacional de recuperação compatível com a causa.

Exemplos:

- retry;
- restart;
- resume;
- resolução de blocker;
- reexecução segura.

Nenhum erro deve deixar o processo permanentemente no limbo.

---

### LR-02 — TO_DO

Sincronizar lifecycle macro de projeto e módulo com os novos contratos.

Projeto, módulo, work item e execução precisam refletir coerentemente o progresso real.

---

### AUT-02 — TO_DO

Automatizar:

`QA → review → ACCEPT → merge → integração`

quando não existir gate/blocker legítimo.

---

### AUT-03 — TO_DO

Expandir o assurance da F6 para o trabalho real.

F6 historicamente nasceu opt-in. F6.5 está autorizada a aplicar assurance aos novos dispatches selecionados do fluxo real.

Sucesso técnico não equivale a aceite.

---

### REC-02 — TO_DO

Recovery relacionado a:

- ausência/falha de reviewer;
- assistência;
- routing;
- fallback controlado.

---

### GAT-02 — TO_DO

Implementar lifecycle funcional de:

- entrega;
- aceite final;
- pause;
- resume;
- cancel.

GAT-01 já define catálogo/política; GAT-02 implementará esse comportamento funcional.

---

### UI-01 — TO_DO

Criar projeção única de estado + `allowed_actions`.

A UI não deve inferir ações possíveis por conta própria.

Servidor deve informar o estado e as ações legitimamente disponíveis.

---

### UI-02 — TO_DO

Criar superfícies operacionais para todas as paradas legítimas.

Exemplo do problema original que motivou F6.5:

Se existe falha recuperável, a tela precisa apresentar a ação correta de recovery.

Não pode existir estado em limbo sem ação operacional.

---

### TST-01 — TO_DO

Criar suíte transversal de conformidade do lifecycle.

Deve testar o fluxo como sistema, inclusive o cenário real que revelou a divergência original.

---

### DOC-01 — TO_DO

Reconciliar documentação de F5/F6/F6.5 sem falsificar histórico.

Documentos históricos permanecem históricos; documentação corrente deve refletir o comportamento vigente.

---

## 7. Estado consolidado

| Categoria | Quantidade |
|---|---:|
| DONE | 2 |
| DOING | 1 |
| TO_DO | 11 |
| Total | 14 |

Progresso funcional da F6.5:

- **LR-01: DONE**
- **GAT-01: DONE**
- **GAT-03: DOING**
- restante: **TO_DO**

Fase 7:

> **BLOCKED BY PHASE 6.5**

---

## 8. Regras que não devem ser perdidas ao trocar de chat

1. **Automation First.** Humano somente por exceção ou gate explícito.
2. Não transformar erro, retry, QA, review, dependência ou conclusão técnica em gate humano.
3. Nenhum estado recuperável pode ficar em limbo sem ação operacional.
4. `EXECUTION_SUCCEEDED != WORK_ACCEPTED`.
5. GAT-01 define autoridade exigida; GAT-03 autentica o principal e valida seus grants.
6. Client/header/payload nunca concede role ou identidade confiável.
7. Service principal nunca assume autoridade humana.
8. Preservar histórico; corrigir novas versões sem reinterpretar execuções antigas.
9. Não antecipar escopo de tasks posteriores.
10. Diante de decisão arquitetural material não prevista, usar `DECISÃO ARQUITETURAL NECESSÁRIA` em vez de inventar.
11. As quatro falhas `inventory.e2e.test.ts` (`FAILED` vs `RETRYABLE`) são dívida preexistente comprovada.
12. F7 só começa após aceite integral da F6.5.

---

## 9. Ponto exato para retomada

Ao iniciar um novo chat:

1. informar que estamos na branch `phase6.5-lifecycle-alignment`;
2. fornecer este arquivo;
3. verificar o resultado final do agent que está concluindo a regressão `http-acceptance.e2e.test.ts`;
4. decidir se GAT-03 pode mudar de `DOING` para `DONE`;
5. se GAT-03 estiver aceita, a próxima task da ordem planejada é **AUT-01 — transactional eligibility scheduler**;
6. antes de implementar AUT-01, auditar a task e seus guardrails, seguindo o mesmo processo usado em LR-01, GAT-01 e GAT-03.
