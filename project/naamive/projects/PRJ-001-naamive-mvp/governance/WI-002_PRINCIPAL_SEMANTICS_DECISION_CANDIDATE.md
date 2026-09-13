# WI-002 — Candidata de Decisão de Semântica de Principal

**status:** HUMAN DECISION REQUIRED  
**finding:** FND-WI002-RCP-001  
**work_item:** WI-002 — Principal Persistence  
**impact:** MATERIAL  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**preparation_input_commit:** 37ba881ec1dc0706011a45872d5b749e95a3e33e  
**author_principal:** agent:codex:decision-prep:WI-002  
**decision_authority_required:** human:manuel-hinojosa:project-owner  
**nature:** decision preparation only; not an exercised decision  
**prepared_at:** 2026-09-13T10:07:15-03:00

## 1. Problema exato

FND-WI002-RCP-001 é MATERIAL / BLOCKING. WI-002 requer constraints, testes e
evidência determinísticos, mas NB-0002 e o envelope técnico não escolhem:
identificador humano/login, normalização/unicidade; vocabulário/transições de
status; nem o vínculo entre estado atual, versão e histórico.

Esta candidata prepara a decisão material necessária para fechar essas três
lacunas. Não a exerce, não resolve o Finding e não concede readiness ou
authority.

## 2. Restrições já governadas

| Regra vigente | Consequência |
|---|---|
| NB-0002: human, agent, service e executor são distintos; authenticated != authorized; sessão não é authority; claim do cliente não prova nada | Principal humano não se confunde com sessão, grant, credencial ou outro principal. Ação protegida revalida principal e authority no servidor. |
| State/Persistence Model | Identidade estável, current state, versão e história imutável são obrigatórios; delete destrutivo não apaga entidade governada cuja história seja necessária. |
| TB-22..TB-25 | IDs são UUID e não carregam state/currentness/version; current state relevante usa version bigint, expected version e timestamptz. |
| TB-26..TB-27 | Modelo é current table + histórico append-only, não Event Sourcing total. Mudança material registra from/to, versão, causa, correlação, intenção, principal, authority, baselines e tempo conforme aplicável. |
| TB-132 e TB-139 | História necessária à auditabilidade não é apagada por idade; authority.principal e authority.principal_history são estruturas conceituais duráveis em PostgreSQL. |
| WI-003 | O compromisso existente é Username / Password Login: o username deve localizar o humano deterministicamente e WI-003 verifica se está ativo sem expor a causa externa. |

Credencial continua distinta de identidade. WI-002 não cria hash, verificação,
política de senha, endpoint, rate limit, token ou sessão.

## 3. Alternativas de identidade

| Alternativa | Compatibilidade, efeito e decisão |
|---|---|
| I-1 — apenas UUID interno | Compatível com ID estável, mas WI-003 não teria username persistido para localizar o principal; apenas desloca o blocker. **Rejeitada.** |
| I-2 — UUID interno + username canônico | Compatível com NB-0002, TB-22..TB-27, TB-139 e WI-003; permite constraint/lookup determinísticos e mantém grants no UUID. Exige validação e reserva histórica explícitas. **Recomendada.** |
| I-3 — UUID + email/identificador externo | Não há requisito de email ou IdP; introduz privacidade, ownership e verificação fora do escopo. **Rejeitada.** |

Análise requerida por alternativa:

- I-1 é tecnicamente simples para WI-002 e preserva grants por UUID, mas deixa
  WI-003 sem lookup de username e deixa a evidência de identidade insuficiente;
  por isso sua aparente baixa complexidade apenas transfere o risco/audit gap.
- I-2 requer validação, unicidade e reserva persistentes em WI-002; dá a WI-003
  lookup exato e mantém WI-005 em UUID estável. A regra ASCII reduz confusão de
  normalização e a reserva preserva auditabilidade; sua complexidade é
  proporcional e necessária.
- I-3 faria WI-002 e WI-003 tratarem verificação/privacidade de contato externo,
  sem benefício para grants que já devem usar UUID. A complexidade e a superfície
  de segurança/audit são maiores, sem requisito governado que as justifique.

### I-2 — Semântica proposta

| Conceito | Semântica exata |
|---|---|
| principal_id | UUID estável e imutável. É a única identidade referenciável por grants, delegações, sessões e auditoria; nunca codifica username, status, versão ou currentness. |
| username | Handle de login obrigatório para principal humano, persistido por WI-002; não é credencial nem FK de authority. Valor válido e canônico corresponde exatamente a [a-z][a-z0-9_-]{2,31}: 3–32 caracteres, começa com letra ASCII e só aceita letras ASCII minúsculas, dígitos, _ e -. |
| credencial | Segredo que prova identidade. Não é criado, persistido, validado ou versionado por WI-002; pertence a WI-003. |

Normalização é identity: uma entrada só é válida quando já corresponde ao valor
canônico. Não há trim silencioso; espaços, maiúsculas, Unicode e caracteres fora
do padrão são inválidos. O servidor valida e a persistência impede duplicidade.

Username pode mudar somente por mutação material versionada. O valor anterior
fica em principal_history e é reservado permanentemente ao mesmo principal_id:
não autentica como valor atual e não pode ser atribuído a outro principal,
inclusive após suspensão. Isso evita ambiguidade de auditoria e reatribuição
aparente de uma pessoa a outra.

## 4. Alternativas de status

| Alternativa | Compatibilidade, efeito e decisão |
|---|---|
| S-1 — ACTIVE, SUSPENDED | Menor vocabulário que torna principal ativo determinístico e permite bloqueio reversível, sem inventar offboarding definitivo. **Recomendada.** |
| S-2 — ACTIVE, SUSPENDED, DEACTIVATED | Pode atender offboarding futuro, mas nenhuma regra o exige agora; antecipa retenção e reativação de desligamento. **Rejeitada.** |
| S-3 — flag informal active | Não fixa significado, transições ou testes e não remove o Finding. **Rejeitada.** |

Análise requerida por alternativa:

- S-1 acrescenta em WI-002 apenas duas constantes e duas transições; WI-003
  ganha critério binário de elegibilidade e WI-005 preserva grants no UUID,
  revalidando o status. O histórico de suspensão/reativação é auditável, com a
  menor complexidade e sem semântica terminal inventada.
- S-2 exigiria a WI-002 testar terminalidade e retenção; WI-003 e WI-005 teriam
  que diferenciar suspensão de desligamento. Amplia consequências de segurança e
  audit sem requisito de negócio que decida essas consequências.
- S-3 dificulta constraints, testes e evidência em WI-002; deixa WI-003 e
  WI-005 interpretarem um mesmo flag de formas diferentes. É simples somente
  superficialmente e não oferece trilha de audit suficiente.

### S-1 — Semântica proposta

| Status | Significado | Autenticação e uso protegido |
|---|---|---|
| ACTIVE | Principal humano atual, elegível quanto à identidade. | Pode autenticar em WI-003 e ser usado como principal, sempre sujeito a sessão, authority, scope e demais requisitos. |
| SUSPENDED | Principal preservado, temporariamente inelegível. | Não pode autenticar com sucesso nem ser aceito em ação protegida. WI-003 retorna a mesma falha externa genérica usada para username ou credencial inválidos. |

Transições permitidas exclusivamente:

    criação → ACTIVE
    ACTIVE → SUSPENDED
    SUSPENDED → ACTIVE

Não há status terminal nem delete físico nesta decisão. Desligamento,
anonimização, eliminação autorizada por lei ou novo lifecycle exigem nova decisão
governada. Reativação é somente SUSPENDED → ACTIVE, com nova versão e novo fato
histórico; não altera fatos anteriores.

## 5. Alternativas de currentness e história

| Alternativa | Compatibilidade, efeito e decisão |
|---|---|
| H-1 — snapshot atual somente | Não preserva mudança material nem permite auditoria/reconstrução; incompatível com State/Persistence Model e TB-27. **Rejeitada.** |
| H-2 — snapshot completo por versão | Compatível, mas duplica fatos inalterados sem necessidade. **Rejeitada.** |
| H-3 — snapshot atual + eventos delta append-only e ponteiro explícito | Compatível com TB-23..TB-27; mantém consulta atual direta, evita duplicação e permite reconstrução. **Recomendada.** |
| H-4 — Event Sourcing total | Contraria TB-26 e amplia escopo. **Rejeitada.** |

Análise requerida por alternativa:

- H-1 reduz o trabalho inicial de WI-002, mas não produz a evidência exigida
  para WI-003, WI-005 ou auditoria; é incompatível com NB-0002/TB e inseguro
  para reconstrução após restart.
- H-2 é compatível e fácil de consultar, porém torna cada mudança em WI-002 mais
  custosa e duplica dados sem melhorar lookup de WI-003 ou referências UUID de
  WI-005. Mais retenção não equivale a melhor auditabilidade.
- H-3 requer transação e replay de delta na validação/reconstrução, mas preserva
  consulta direta, restart seguro, causalidade e audit sem duplicar campos. É a
  complexidade mínima compatível para WI-002, WI-003 e grants futuros.
- H-4 aumentaria muito a implementação e a superfície de recuperação/audit,
  além de contrariar expressamente TB-26; não é alternativa viável.

### H-3 — Semântica proposta

authority.principal é o snapshot atual: uma linha atual por principal_id, com
UUID, username atual, status atual, version e current_history_event_id. Esse
ponteiro aponta explicitamente ao último fato material aceito. Currentness não é
inferida por MAX(version), timestamp ou ordem incidental.

authority.principal_history é append-only. Criação gera o evento base; cada
mudança material aceita gera um evento e atualiza atomicamente snapshot, versão
e ponteiro. Eventos permitidos:

    PRINCIPAL_CREATED
    USERNAME_CHANGED
    STATUS_CHANGED

Criação, mudança de username e mudança de status são materiais. Todo evento
contém conceitualmente:

    history_event_id (UUID estável)
    principal_id
    event_type
    resulting_principal_version
    before/after somente dos fatos alterados
    occurred_at (timestamptz server/database)
    cause_ref
    causation_id e correlation_id
    intention_id quando derivado de comando idempotente
    actor principal ou identidade explícita de origem sistêmica
    authority_ref quando a ação requer authority
    business_baseline_ref
    normative_baseline_ref

O evento de criação contém username/status iniciais; os demais, apenas before/after
do campo alterado. Origem técnica/sistêmica identifica-se como tal; authority_ref
só pode faltar quando nenhuma authority se aplica. A regra futura de quem pode
criar, suspender ou reativar não é inventada aqui, mas sua referência deve ser
registrada quando aplicável.

Version inicia em 1 e aumenta em um por mudança material. Mutação requer
principal_id + expected version; stale failure não gera evento. Correção gera fato
novo de supersession, reversal ou compensation quando regra futura o permitir.
Eventos e reservas de username são retidos enquanto auditabilidade for exigida.

Após restart, o snapshot é fonte de consulta e é validável pelos eventos desde
PRINCIPAL_CREATED até current_history_event_id, aplicando deltas por version.
Reconstrução produz o mesmo snapshot/ponteiro; nunca promove automaticamente o
maior número de versão como current.

## 6. Compatibilidade downstream

| Consumidor | Efeito |
|---|---|
| WI-002 | Pode definir constraints de UUID, username canônico/reservado, status, concurrency, snapshot e histórico; testes passam a ter oracle determinado para inválido/duplicado, transições e restart. |
| WI-003 | Localiza por username atual canônico. Username inexistente, SUSPENDED ou senha inválida produzem a mesma falha externa genérica; internamente podem ser distintos para segurança/observabilidade. WI-003 verifica ACTIVE, mas continua dono de hash, verificação e rate limit. |
| WI-005 / grants | Grants, delegações, revogações e audit referenciam principal_id. Troca de username não muda FKs nem reescreve referências; SUSPENDED impede uso protegido mesmo que grant persista. |

## 7. Pacote mínimo recomendado e efeito

Aprovar I-2 + S-1 + H-3: UUID estável e username obrigatório/canônico/mutável
reservado; somente ACTIVE/SUSPENDED; e snapshot versionado com ponteiro explícito
mais deltas append-only. É o mínimo que fixa persistência, testes e integração
com login/grants sem escolher email, IdP, password, sessão, política de
offboarding, autoridade administrativa, schema físico ou Event Sourcing.

Se aprovado, WI-002 poderá reconciliar critérios/testes/evidência para provar:

- username inválido ou já reservado rejeitado deterministicamente;
- criação em ACTIVE, transições permitidas e rejeição das demais;
- stale write sem novo fato;
- snapshot, ponteiro, version e histórico preservados após restart PostgreSQL; e
- retenção/reconstrução e metadados causais, de origem, baseline e tempo.

Então FND-WI002-RCP-001 pode ser classificado RESOLVED. Esta candidata não o
resolve agora.

## 8. Não efeitos e questões abertas

Esta candidata não aprova/exercita decisão humana; não altera NB-0002, TB v0.10
ou TIR v1.0; não promove WI-002, concede readiness, audita, cria Development
Cycle/Execution ou autoriza implementação; e não implementa migration, SQL,
índice, adapter, testes, login, senha, sessão, grants, UI ou endpoint.

As três dimensões bloqueadoras não ficam abertas. Permanecem fora do escopo:
credenciais (WI-003), sessão, autoridade administrativa de principal e
offboarding/eliminação. Se forem necessários antes de WI-002, exigem novo
Finding; não podem ser inferidos desta candidata.

## 9. Próxima ação governada exata

O Project Owner deve APPROVE, REJECT ou RETURN FOR ADJUSTMENT à proposta abaixo
sob NB-0002/PBL-PRJ001-R1-v1.0. Se aprovada, ela deve ser materializada como a
próxima decisão humana governada, reservada como DEC-008, sem retroeditar esta
candidata. Só então o Finding pode ser resolvido, WI-002 pode reconciliar seus
artefatos e uma nova preparação de readiness pode ocorrer. Auditoria independente
somente pode iniciar se essa nova preparação for positiva.

## PROPOSTA DE DECISÃO HUMANA

**Objeto:** resolver FND-WI002-RCP-001 para WI-002 — Principal Persistence.

    1. Principal humano possui principal_id UUID estável/imutável. Apenas esse ID
       referencia grants, sessões, delegações e auditoria.
    2. Principal humano possui username obrigatório, distinto de ID e credencial.
       É válido somente se corresponder exatamente a [a-z][a-z0-9_-]{2,31}.
       É único, reservado permanentemente ao mesmo principal_id e mutável somente
       por mudança material versionada; username antigo não autentica nem é
       reatribuível a outro principal.
    3. WI-002 não persiste, verifica nem define credencial.
    4. Os únicos status são ACTIVE e SUSPENDED. Criação produz ACTIVE; somente
       ACTIVE→SUSPENDED e SUSPENDED→ACTIVE são permitidas. Apenas ACTIVE é elegível
       para autenticação bem-sucedida e uso como principal protegido. Não há status
       terminal nem delete físico nesta decisão.
    5. authority.principal mantém snapshot atual, version bigint e
       current_history_event_id explícito. authority.principal_history é append-only
       com PRINCIPAL_CREATED, USERNAME_CHANGED e STATUS_CHANGED, os metadados e
       before/after definidos nesta candidata. Versões começam em 1, crescem uma
       unidade, e mutação exige expected version. Currentness não usa MAX(version).

**Efeito condicionado à aprovação:** o Finding pode ser RESOLVED; WI-002
permanece PROPOSED, com readiness authority NOT GRANTED, auditoria NOT EXECUTED,
Development Cycle NOT CREATED, Execution NONE e implementação NOT AUTHORIZED.
Nova preparação de readiness continua obrigatória.
