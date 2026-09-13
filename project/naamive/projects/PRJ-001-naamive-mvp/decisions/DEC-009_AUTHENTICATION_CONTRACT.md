# DEC-009 — Contrato de autenticação da WI-003

**Status:** CURRENT / GOVERNED DECISION
**Impact:** MATERIAL
**object:** WI-003 — Username / Password Login
**scope:** MOD-001 / VI-001
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**decision:** APPROVED
**decision_authority:** human:manuel-hinojosa:project-owner
**authority_role:** Project Owner
**decision_source:** explicit human approval
**decision_text:** APPROVE CANDIDATE AS PROPOSED
**source_candidate:** DEC-009_AUTHENTICATION_CONTRACT_CANDIDATE.md
**source_candidate_commit:** 4cb0898ae116a9745d2bcfa5d21e85b6504cf091
**source_candidate_sha256:** 5f4992a88b5bf93cc8f1bb6eb8c80cabf150b9d03e7bc905ca3303b8f6448bad
**approved_sections_3_to_6_sha256:** 63ac64db65fcc445bf0913823351c256819e5f187d4ee312c28f2e43270aa3d2
**materialized_at:** 2026-09-13T19:18:17-03:00
**Implementation:** NOT AUTHORIZED

## Decisão exercida e conteúdo incorporado

O Project Owner aprovou integralmente, como proposto, o pacote das seções 3 a
6 de `DEC-009_AUTHENTICATION_CONTRACT_CANDIDATE.md`, identificado pelo commit,
digest da candidata no snapshot de entrada e digest do pacote aprovado acima.
Essas seções são incorporadas por referência exata a esta
decisão; seu conteúdo passa a ser a regra governada de WI-003. A candidata é
preservada como evidência histórica do input humano e não é retroeditada.

Portanto, a decisão fixa, sem extensão ou redução semântica:

- a Credential humana vinculada por `principal_id`, Argon2id, versionada,
  revogável e com lifecycle de provisionamento, alteração, reset, revogação e
  rehash (seção 3);
- `POST /api/session/login`, sua validação e os resultados públicos `400
  VALIDATION_ERROR`, `401 AUTHENTICATION_FAILED`, `429 RATE_LIMITED` e sucesso
  `204` sem cookie ou token (seção 4);
- os contadores `username+IP` e `IP`, janela de 15 minutos, limiares vigentes,
  atraso progressivo determinístico, reset, retenção, persistência, restart,
  concorrência e semântica de proxy/IP confiável (seção 5); e
- o `AuthenticatedPrincipal` interno, efêmero e não serializável de WI-003, e
  a exclusividade de WI-004 para a Durable Server-side Session, cookie ou token
  reutilizável (seção 6).

As referências de seção nesta decisão apontam para o conteúdo exato da
candidata preservada no snapshot identificado. Em especial, a decisão não cria
Grant, authority, sessão durável, cookie reutilizável ou token reutilizável;
ela também não define authority administrativa de senha, canal/token de reset,
política de composição de senha, implementação física ou runtime.

## Disposição dos findings

| Finding | Disposição | Cobertura governada exata |
|---|---|---|
| FND-WI003-RCP-001 | **RESOLVED BY DEC-009** | candidata §§3.1–3.3: vínculo por `principal_id`, formato/versionamento Argon2id, elegibilidade e operações de Credential. |
| FND-WI003-RCP-002 | **RESOLVED BY DEC-009** | candidata §§4.1–4.3: request, validação, respostas, antienumeração e sucesso sem portador reutilizável. |
| FND-WI003-RCP-003 | **RESOLVED BY DEC-009** | candidata §§5.1–5.4: sinais, janela/limiares, atraso, reset/retenção, atomicidade, restart e IP confiável. |
| FND-WI003-RCP-004 | **RESOLVED BY DEC-009** | candidata §§4.2–4.3 e §6: `204` sem cookie/token e handoff interno exclusivo de WI-004. |

Cada finding é resolvido por esta decisão humana exercida, não pela candidata
isoladamente. A disposição não substitui a necessidade de uma nova preparação
e de auditoria independente de readiness para a Work Item material.

## Efeito e limites

```text
WI-003...................... PROPOSED
readiness authority.......... NOT GRANTED
Development Cycle............ NOT CREATED
Execution.................... NONE
implementation............... NOT AUTHORIZED
```

Esta decisão não altera `NB-0002`, a Technology Baseline, o TIR, PEC-001,
lifecycle, API/runtime, schema, migration, código ou testes. Ela não promove
WI-003 e não constitui auditoria nem aprovação do gate de readiness.

## Continuidade

A continuidade imediatamente permitida é uma nova preparação de readiness de
WI-003 contra esta decisão e as baselines registradas. Se a preparação for
positiva, a próxima ação legal é auditoria independente e proporcional de
readiness; somente gate/authority posterior pode decidir `PROPOSED → READY`.
