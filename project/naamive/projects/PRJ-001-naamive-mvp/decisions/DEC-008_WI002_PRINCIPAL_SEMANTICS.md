# DEC-008 — WI-002 Principal semantics

**Status:** CURRENT / GOVERNED DECISION  
**Impact:** MATERIAL  
**object:** WI-002 — Principal Persistence  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**decision_authority:** human:manuel-hinojosa:project-owner  
**decision_input_commit:** 354c334f221f9e7247aa926b4a3627b6260e57f5  
**decision_source:** explicit human authority instruction  
**source_candidate:** governance/WI-002_PRINCIPAL_SEMANTICS_DECISION_CANDIDATE.md  
**source_finding:** FND-WI002-RCP-001  
**materialized_at:** 2026-09-13T10:39:08-03:00  
**Implementation:** NOT AUTHORIZED

## Decisão exercida

`principal_id` é a identidade canônica do Principal. É UUID, é estável e
imutável depois da criação. Alterar username, display name ou outro atributo
mutável não altera `principal_id`.

`username` é atributo de login mutável, não identidade canônica nem credencial.
Enquanto atual, deve ser determinístico e único. Sua validação permanece
compatível com a candidata: corresponde exatamente a
`[a-z][a-z0-9_-]{2,31}`; não há normalização silenciosa. Mudança de username é
mutação material, preservada na história. Username anterior deixa de ser atual
e não fica permanentemente reservado ao mesmo `principal_id`: pode voltar a
ficar disponível conforme as regras de unicidade aplicáveis. WI-002 não define
senha nem outro comportamento de credencial; isso continua pertencendo a
WI-003.

Os únicos status são `ACTIVE` e `SUSPENDED`. As transições permitidas são:

```text
creation → ACTIVE
ACTIVE → SUSPENDED
SUSPENDED → ACTIVE
```

Somente `ACTIVE` é elegível para autenticação bem-sucedida ou uso como
Principal ativo. Esta decisão não introduz status terminal nem deleção física.

## Currentness e história

`authority.principal` é o snapshot atual, com `principal_id` estável, username
e status atuais, `version bigint` e `current_history_event_id` explícito.
Currentness não pode ser inferida por `MAX(version)`.

`authority.principal_history` é append-only e preserva os usernames que
pertenceram ao Principal em cada versão material. Os eventos materiais são:

```text
PRINCIPAL_CREATED
USERNAME_CHANGED
STATUS_CHANGED
```

`version` inicia em 1. Cada mutação material aceita exige expected version,
incrementa a versão exatamente em 1 e atualiza atomicamente o snapshot e
`current_history_event_id`. Mutação stale não cria fato histórico. Os fatos
materiais permanecem reconstruíveis após restart; a reconstrução deve produzir
o snapshot e ponteiro atuais sem promover automaticamente o maior número de
versão como current.

## Disposição e limites

`FND-WI002-RCP-001` (`MATERIAL / BLOCKING`) está **RESOLVED BY DEC-008**: a
identidade canônica, o status e a semântica de currentness/história agora são
determinísticos.

Esta decisão não promove WI-002, não concede readiness authority, não constitui
auditoria, não cria Development Cycle ou Execution e não autoriza
implementação. WI-002 permanece `PROPOSED`; uma nova preparação de readiness é
necessária antes de qualquer auditoria independente aplicável.

## Supersession explícita da candidata

A candidata permanece evidência histórica de preparação. Sua proposta de
reserva permanente de username anterior ao mesmo `principal_id` é superseded
por esta decisão humana; ela não é retroeditada como se já contivesse a regra
final.
