---
task: GAT-03
document_type: mandatory-authentication-rbac-prevalidation
status: DECISÃO_ARQUITETURAL_APROVADA
validated_at: 2026-08-22
catalog_dependency: GAT-01/v2
---

# GAT-03 — Pré-validação de autenticação e RBAC

## Resultado da trava

**Histórico preservado — DECISÃO ARQUITETURAL NECESSÁRIA.** A trava original
foi aprovada em 2026-08-22. A decisão abaixo desbloqueia a implementação.

### DECISÃO ARQUITETURAL APROVADA

O MVP local usa `LocalIdentityProvider`: principal persistido, hash `scrypt` de
senha/segredo, sessão server-side e identificador opaco em cookie `HttpOnly` e
`SameSite=Strict`. A sessão expira, pode ser revogada e exige `Origin` igual a
`NAAMIVE_WEB_ORIGIN` e token CSRF em mutações. Roles, grants, projetos,
recursos e ações são exclusivamente server-side. Não há OIDC nesta fase; a
fronteira de resolução de principal permite um provider futuro sem redesenhar
grants ou a GAT-01.

O deployment continua loopback/same-origin. Essa decisão não autoriza exposição
remota: qualquer boundary fora do host local exige nova revisão de segurança,
TLS e mecanismo de identidade confiável.

O deployment aprovado/documentado é um MVP local, sem provedor de identidade,
sem cadastro de usuários, sem sessão, sem proxy autenticador e sem contrato de
credencial de serviço. Portanto não é seguro inferir se a fronteira deve ser
OIDC, autenticação delegada por proxy, credencial local ou outro mecanismo.
Escolher qualquer uma dessas alternativas alteraria a fronteira de segurança e
o modelo operacional sem uma decisão de arquitetura.

Esta interrupção é exigida pela trava da GAT-03: o `NAAMIVE_OPERATOR_ID` e os
headers declarativos atuais não são prova de identidade nem de autoridade.

## Levantamento do deployment atual

| Aspecto | Evidência levantada | Consequência para GAT-03 |
| --- | --- | --- |
| Inicialização | `npm run dev` inicia Node/HTTP; `npm run worker` inicia outro processo Node; ambos carregam `.env`. | UI e worker não possuem identidade autenticada própria. |
| Backend e UI | A API serve `web/index.html`; `NAAMIVE_WEB_ORIGIN` e o bind são somente loopback por `src/config.ts`. | A interface é same-origin local, mas loopback não autentica um usuário. |
| Sessão/usuário | Não há tabela de usuários, sessão, principal, role, grant ou revogação; não há endpoint de login/logout. | Não existe fonte confiável para construir claims, expiração ou revogação. |
| `NAAMIVE_OPERATOR_ID` | Obrigatório em `src/config.ts`; usado como ator de comandos e eventos em `service.ts`, `worker.ts` e outros serviços. | É configuração de processo legado, não credencial e não pode conceder role no fluxo novo. |
| Headers F6 | `src/server.ts` aceita `x-actor-role` e `x-actor-id` para assurance, e `x-naamive-operator` para retries. | São controlados pelo caller e permitem spoofing; devem deixar de autorizar comandos. |
| Worker/agentes | Worker leasing jobs no mesmo banco; agentes são adaptadores executados pelo worker. Não há credencial, principal, escopo ou rotação por worker/agente. | A identidade de serviço precisa de contrato e credencial próprios; não pode reutilizar identidade humana. |
| Proxy/reverse proxy | `docker-compose.yml` contém apenas PostgreSQL; não há proxy, TLS, IdP ou configuração de headers confiáveis. | Não há proxy autenticador aprovado ao qual delegar a autenticação. |
| Segredos | Há resolver restrito a segredos de adaptador de IA (`secret-resolver.ts`) e variáveis de ambiente. | Isso não é gestão de credenciais de usuários/serviços, nem define rotação/revogação de acesso ao runtime. |
| Limites do MVP | API local, PostgreSQL local e ArtifactStore/repositórios locais; documentação afirma que o operador é injetado pelo servidor. | O MVP não define múltiplos usuários, atribuição por projeto, administrador ou boundary de rede confiável. |

## Matriz RBAC normativa proposta para validação

Esta matriz é versionada contra o catálogo `GAT-01/v2`. Ela não substitui a
autoridade de gate: para `DECIDE_CATALOG_GATE`, a role também tem de pertencer a
`authority_roles` congelado no `gate_records.catalog_contract`.

| Principal/role | Escopo verificável exigido | Ação | Gate/comando publicado | Permitido | Regra |
| --- | --- | --- | --- | --- | --- |
| Anônimo | nenhum | qualquer leitura ou mutação | qualquer rota | não | Identidade ausente falha fechada. |
| `OPERATOR` | projeto atribuído | consultar e comandos ordinários | comandos de projeto publicados, sem gate | sim, quando publicado | Não decide gate, não administra configuração e não atravessa projeto. |
| `BUSINESS_INTAKE_AUTHORITY` | projeto atribuído | decidir gate | `REGISTER_PROJECT` | sim | Somente decisão catalogada e escopo do gate. |
| `BUSINESS_OWNER` | projeto atribuído | decidir gate | `PRODUCT_COMMITMENT`, `DELIVERY_ACCEPTANCE` | sim | Não ganha autoridade técnica. |
| `MODULE_PRODUCT_OWNER` | projeto e módulo atribuídos | decidir gate | `MODULE_PLAN_APPROVAL` | sim | O módulo deve pertencer ao projeto. |
| `TECH_LEAD` ou `REPOSITORY_OWNER` | projeto e recurso do gate atribuídos | decidir gate condicional | `MATERIAL_ARCHITECTURE`, `MATERIAL_RISK`, `SECURITY_COMPLIANCE`, `INDEPENDENCE_EXCEPTION`, `REWORK_ESCALATION`, `ESCALATED_CLOSURE` | sim | Deve coincidir com a role do catálogo e do snapshot. |
| `ON_CALL_OWNER` | projeto/recurso atribuído | retry, recovery e ações operacionais publicadas | comandos de recovery publicados | sim, quando publicado | Não aprova gate humano. |
| `CONFIGURATION_ADMIN` | escopo administrativo explícito | administrar configuração | comandos administrativos publicados | sim, quando publicado | Separado de roles de projeto e gates. |
| `WORKER_SERVICE` | projeto, recurso e ação mínimos atribuídos | consumir/executar job de worker | ações de worker publicadas | sim, quando atribuído | Não assume role humana nem decide gate. |
| `AGENT_SERVICE` | execution/projeto/recurso/ação mínimos atribuídos | ação automatizada atribuída | comandos de agente publicados | sim, quando atribuído | Não amplia escopo ou assume autoridade humana. |
| Qualquer principal autenticado | projeto diferente, recurso ausente, role desconhecida ou ação não publicada | qualquer ação | qualquer gate/comando | não | Validar principal, role, projeto, recurso, ação e gate antes do efeito. |

### Combinações negativas obrigatórias para a implementação posterior

- header `x-actor-role`, `x-actor-id`, `x-role`, `x-actor` ou payload declarando
  papel/ator não modifica o principal autenticado;
- role desconhecida, scope ausente, recurso que não pertence ao projeto e ação
  não publicada retornam negação sem efeito de negócio;
- uma role de projeto A não lê, decide, faz retry ou recupera recurso do projeto B;
- `WORKER_SERVICE` e `AGENT_SERVICE` não podem chamar decisão de gate humano;
- sessão/credencial expirada, revogada, rotacionada ou removida é negada antes
  do comando; registros históricos permanecem inalterados.

## Modelo curto de ameaças

| Ameaça | Vetor atual | Impacto | Controle necessário |
| --- | --- | --- | --- |
| Spoofing de papel/ator | Headers F6 declarativos e `x-naamive-operator`. | Aprovação de gate ou recovery por caller não autorizado. | Principal autenticado; roles/scopes exclusivamente server-side; remover headers da decisão. |
| Escalada cross-project | Rotas recebem `projectId` e não há grants por projeto. | Ação ou leitura em outro projeto. | Grant por projeto/recurso e validação de pertencimento no comando. |
| Confusão humano/serviço | Worker usa o mesmo `NAAMIVE_OPERATOR_ID` configurado para eventos. | Serviço parecer autoridade humana ou aprovar gate. | Principals separados, ações mínimas e proibição explícita de gates humanos. |
| Replay/uso após revogação | Não há sessão, expiração, revogação ou rotação. | Principal removido ainda executa ações. | Validação server-side por requisição e estado de revogação/grant atual. |
| Vazamento de credencial | Logs são estruturados e SSE expõe projeções/eventos. | Token/claim em log, evento, erro, query string ou SSE. | Credencial somente em header protegido/canal aprovado; redaction; nunca persistir ou transmitir segredo. |
| CSRF | A UI é same-origin, mas o mecanismo de autenticação ainda não foi escolhido. | Requisição forjada caso a decisão use cookie. | Se cookie/sessão for escolhida: `HttpOnly`, `Secure`, `SameSite` e token CSRF/origin check; para bearer fora de cookie, documentar a não aplicabilidade. |

## Contrato requerido para identidades não humanas

Antes de criar qualquer principal de serviço, a decisão aprovada deve definir,
para cada `WORKER_SERVICE` e `AGENT_SERVICE`: identificador imutável, emissor ou
fonte de credencial, projetos/recursos/ações permitidos, TTL, rotação,
revogação, ator de auditoria e proibição de roles humanas/gates humanos. O
worker existente não satisfaz esse contrato porque seu único identificador é a
configuração legada do processo.

## Transição de compatibilidade

| Mecanismo legado | Estado no fluxo novo | Tratamento de migração |
| --- | --- | --- |
| `NAAMIVE_OPERATOR_ID` | Não autentica nem autoriza. | Manter somente como metadado de origem de eventos legados, marcado como `legacy_server_operator`; retirar dos novos comandos após o principal autenticado existir. |
| `x-actor-role` / `x-actor-id` | Não autentica nem autoriza. | Ignorar para decisão de role/ator; registrar tentativa somente sem valor sensível, se necessário para auditoria de migração. |
| `x-naamive-operator` | Não autentica nem autoriza. | Remover como bypass de retry; retry deve usar o principal autenticado e o grant de `ON_CALL_OWNER`/ação publicada. |
| Payloads com ator/papel | Não autenticam nem autorizam. | Preservar apenas dados de domínio permitidos; rejeitar campos que tentem declarar autoridade. |

## Decisão arquitetural solicitada

É necessário aprovar, em conjunto, os itens abaixo antes de retomar GAT-03:

1. O mecanismo de autenticação do deployment alvo e seu emissor/fonte confiável
   (por exemplo, IdP OIDC, proxy autenticador aprovado ou credencial local
   gerenciada), incluindo como a UI e o worker o obtêm.
2. A fronteira de rede/TLS e, se houver proxy, os headers que ele assina e a
   regra de confiança entre proxy e runtime.
3. O diretório/registro server-side de principals, roles, grants de
   projeto/recurso e administrador de configuração, com lifecycle de
   expiração, revogação e auditoria.
4. O emissor, armazenamento, TTL, rotação e revogação das credenciais distintas
   de `WORKER_SERVICE` e `AGENT_SERVICE`.
5. Se a UI usará cookie/sessão ou credencial fora de cookie, para então aplicar
   a proteção CSRF/sessão correspondente.

Os service principals `WORKER_SERVICE` e `AGENT_SERVICE` têm credenciais
distintas, hash seguro, grants mínimos, expiração/revogação e rotação. Eles não
possuem roles humanas nem decidem gates. O bootstrap do primeiro administrador
usa exclusivamente `NAAMIVE_AUTH_BOOTSTRAP_SECRET` (mínimo de 32 caracteres),
uma única vez; ele cria o principal e grants iniciais auditáveis, e não funciona
como senha mestre depois que existir `CONFIGURATION_ADMIN` ativo.
