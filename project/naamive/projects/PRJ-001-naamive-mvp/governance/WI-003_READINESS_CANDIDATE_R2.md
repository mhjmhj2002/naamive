# WI-003 — Preparação de Readiness R2

**status:** PREPARED / POSITIVE
**work_item:** WI-003 — Username / Password Login
**work_item_state:** PROPOSED
**impact:** MATERIAL
**governing_scope:** MODULE / MOD-001
**value_increment_ref:** VI-001 — Authenticated Project Context
**dependency:** WI-002 — DONE
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**Technology Baseline:** v0.10 — APPROVED / FROZEN
**TIR:** v1.0 — APPROVED
**governing_decisions:** DEC-008_WI002_PRINCIPAL_SEMANTICS.md; DEC-009_AUTHENTICATION_CONTRACT.md
**prior_readiness_preparation:** WI-003_READINESS_CANDIDATE.md (R1)
**preparation_input_commit:** 4cb0898ae116a9745d2bcfa5d21e85b6504cf091
**author_principal:** agent:codex:readiness:WI-003:R2
**nature:** non-normative readiness preparation; not audit, approval or authority
**readiness_authority:** NOT GRANTED
**development_cycle:** NOT CREATED
**execution:** NONE
**implementation:** NOT AUTHORIZED
**prepared_at:** 2026-09-13T19:18:17-03:00

## 1. Pergunta e conclusão

Pergunta avaliada: WI-003 está suficientemente definida para auditoria
independente de readiness, sem que auditor ou implementador precisem inventar
semântica material de Credential, API, segurança, persistência, sessão ou
authority?

```text
conclusão.................... READY FOR INDEPENDENT READINESS AUDIT
pronto para implementação..... NÃO
```

Esta preparação não é audit, gate, approval ou concessão de authority. WI-003
permanece `PROPOSED`.

## 2. Snapshot governado

| Verificação | Resultado |
|---|---|
| PRJ-001 / MOD-001 / VI-001 | `PLANNING` / `PLANNED` / `PLANNED` |
| WI-003 | `PROPOSED` |
| WI-002 / dependência | `DONE` / satisfeita e compatível com as mesmas baselines |
| DEC-008 | `CURRENT / GOVERNED` |
| DEC-009 | `CURRENT / GOVERNED / APPROVED` |
| FND-WI003-RCP-001..004 | `RESOLVED BY DEC-009` |
| Technology Baseline / TIR | `v0.10 APPROVED / FROZEN` / `v1.0 APPROVED` |
| audit / readiness authority | `REQUIRED / NOT EXECUTED` / `NOT GRANTED` |
| Development Cycle / Execution / implementation | `NOT CREATED` / `NONE` / `NOT AUTHORIZED` |

`NB-0002` permanece a baseline normativa efetiva; `PBL-PRJ001-R1-v1.0`
permanece a baseline de negócio. Não há mudança delas, do Technology Baseline
ou do TIR que exija classificação de evidência anterior. O mapeamento
`WI-003 → VI-001 → MOD-001` e a âncora TB-140 permanecem compatíveis conforme
DEC-005 e a matriz de assurance.

## 3. Escopo, dependência e decisões aplicáveis

O resultado finito de WI-003 é autenticar credenciais humanas pelo endpoint
tipado, sem transformar login/client em authority. Sessão durável, cookies,
tokens reutilizáveis, Grants e listagem de Projects continuam fora de escopo.
WI-002 está `DONE` e DEC-008 fixa `principal_id` estável, username current,
status `ACTIVE`/`SUSPENDED` e a elegibilidade de somente `ACTIVE` para sucesso.

DEC-009 aprovada resolve as quatro lacunas materiais que bloquearam R1. Ela
preserva `authentication != authorization`, não cria Grant/authority e não
antecipa o trabalho de WI-004. Não há audit upstream que possa ser presumida
como cobertura exata desta WI, desta decisão e destes riscos; por ser
`MATERIAL`, a auditoria independente própria continua obrigatória.

## 4. Critérios verificáveis, evidência e fronteiras

| Critério | Regra agora determinística | Evidence futura esperada |
|---|---|---|
| Credential | DEC-009 §3: Credential atual por `principal_id`, Argon2id TIR-017, versionada, revogável; `ACTIVE` e Credential não revogada são necessários ao sucesso. | testes unitários/aplicação de provisionamento, verificação, revogação, rehash e ausência de segredo em logs/respostas. |
| HTTP login | DEC-009 §4: JSON validado; `400 VALIDATION_ERROR`, `401 AUTHENTICATION_FAILED`, `429 RATE_LIMITED`, `204` vazio. | contrato/API e integração para requests válidos e inválidos, e comparação das falhas externas antienumeração. |
| Abuso | DEC-009 §5: dois sinais, 15 min, 5/25 falhas, atraso determinístico, reset/retenção, PostgreSQL atômico, restart e proxies confiáveis. | testes de janela, `Retry-After`, atraso, reset, retenção, concorrência, restart e semântica de IP confiável. |
| Fronteira WI-004 | DEC-009 §§4.2 e 6: apenas `AuthenticatedPrincipal` interno e efêmero; sem sessão/cookie/token/Grant. | prova de sucesso `204` sem `Set-Cookie`/token, ausência de persistência de sessão e diff limitado a WI-003. |
| Segurança de boundary | DEC-009 §§3–5 e `security/02`: password, hash e salt não são retornados, logados ou expostos. | testes negativos de request, resposta, logs e erros. |

Os detalhes remanescentes — nomes físicos, migrations/adapters, índices,
classes, helpers e layout — são escolhas de implementação delimitadas por
DEC-008, DEC-009, TB, TIR e contracts. Eles não exigem inventar regra de
produto, segurança, API, owner, sessão ou authority.

## 5. Disposição dos findings de R1

| Finding | Situação | Resolução comprovada |
|---|---|---|
| FND-WI003-RCP-001 | **RESOLVED BY DEC-009** | DEC-009 incorpora candidata §§3.1–3.3: Credential por `principal_id`, lifecycle, revogação e rehash. |
| FND-WI003-RCP-002 | **RESOLVED BY DEC-009** | DEC-009 incorpora candidata §§4.1–4.3: boundary HTTP, validação e resultados públicos. |
| FND-WI003-RCP-003 | **RESOLVED BY DEC-009** | DEC-009 incorpora candidata §§5.1–5.4: semântica completa de abuso, atomicidade/restart e proxy. |
| FND-WI003-RCP-004 | **RESOLVED BY DEC-009** | DEC-009 incorpora candidata §§4.2–4.3 e §6: efeito de sucesso e handoff exclusivo de WI-004. |

Não há finding material novo ou blocker remanescente identificado nesta
preparação. A decisão humana governada, e não esta R2, é a fonte da resolução.

## 6. Authority e continuidade

Authority para readiness não decorre de DEC-009. Pela Work Item Lifecycle e
policies de Gate/Audit/Authority de `NB-0002`, a preparação positiva de uma WI
`MATERIAL` requer auditoria independente proporcional antes da decisão de
avanço. Esta preparação não pode decidir o gate nem a transição
`PROPOSED → READY`.

Próxima ação governada exata: **submeter WI-003 a auditoria independente e
proporcional de readiness, sobre o mesmo objeto, scope e baselines, registrando
principal independente, critérios, evidência considerada, findings, limitações
e resultado.** Se o resultado for aplicável, apenas uma decisão/gate posterior
com authority válida poderá conceder readiness.

## 7. Conclusão final

READY FOR INDEPENDENT READINESS AUDIT
