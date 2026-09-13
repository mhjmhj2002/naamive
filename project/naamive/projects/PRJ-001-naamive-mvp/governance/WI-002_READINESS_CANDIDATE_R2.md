# WI-002 — Preparação de Readiness R2

**status:** PREPARED
**work_item:** WI-002 — Principal Persistence
**work_item_state:** PROPOSED
**impact:** MATERIAL
**governing_scope:** MODULE
**normative_owner:** MOD-001 — Project Context
**value_increment_ref:** VI-001 — Authenticated Project Context
**dependency:** WI-001 — DONE
**business_baseline_ref:** PBL-PRJ001-R1-v1.0
**normative_baseline_ref:** NB-0002
**governing_decision:** DEC-008_WI002_PRINCIPAL_SEMANTICS.md
**prior_readiness_candidate:** WI-002_READINESS_CANDIDATE.md
**preparation_input_commit:** ad287e85f1b824928fb9cd182cc9765070439699
**author_principal:** agent:codex:readiness:WI-002:R2
**nature:** non-normative readiness preparation; not audit, approval or authority
**readiness_authority:** NOT GRANTED
**development_cycle:** NOT CREATED
**execution:** NONE
**implementation:** NOT AUTHORIZED
**prepared_at:** 2026-09-13T10:46:37-03:00

---

## 1. Pergunta central e limite

Pergunta exata:

> Is WI-002 now sufficiently defined for an independent readiness audit without
> requiring the implementation agent or auditor to invent material product,
> security, persistence or authority semantics?

Em termos operacionais: WI-002 está agora suficientemente definida e compatível
com as baselines para essa auditoria, sem que implementador ou auditor inventem
semântica material de produto, segurança, persistência ou authority?

Esta é preparação não normativa. Não é auditoria, não decide gate, não concede
authority e não altera o lifecycle de WI-002, que permanece `PROPOSED`.

## 2. Snapshot governado

| Verificação | Resultado |
|---|---|
| Branch / HEAD | `lifecycle-reboot` / `ad287e85f1b824928fb9cd182cc9765070439699` |
| PRJ-001 / MOD-001 / VI-001 | `PLANNING` / `PLANNED` / `PLANNED` |
| WI-002 | `PROPOSED` |
| DEC-008 | `CURRENT / GOVERNED` |
| FND-WI002-RCP-001 | `RESOLVED BY DEC-008` |
| readiness audit / authority | `REQUIRED / NOT EXECUTED` / `NOT GRANTED` |
| Development Cycle / Execution / implementation de WI-002 | `NOT CREATED` / `NONE` / `NOT AUTHORIZED` |

O histórico entre o aceite de WI-001 e o commit de entrada contém a preparação
R1, a candidata de decisão e a materialização de DEC-008; não há classificação
posterior que invalide a evidência de foundation/PostgreSQL de WI-001.

## 3. Prova da dependência WI-001

`WI-001-workspace-foundation.md` registra `DONE`, com business baseline
`PBL-PRJ001-R1-v1.0` e normative baseline `NB-0002`.
`HUMAN_APPROVAL_WI001_ACCEPTANCE.md` prova aceite humano
`GRANTED / EXERCISED`, execução autoritativa `EX-003` e `blocking_findings: 0`.
O fechamento posterior e DEC-008 não alteram Technology Baseline, TIR, pacotes,
migrations ou a evidência de guardrails/PostgreSQL que satisfaz a dependência.
Resultado: **dependência satisfeita e compatível**.

## 4. Owner Module / VI / TB-140

`WI-002` referencia `VI-001`; `VALUE_INCREMENT.md` prova
`VI-001.module_id = MOD-001`; `MODULE.md` prova que `MOD-001` existe e ambos os
ancestrais mantêm os baselines declarados. `DEC-005` fixa a correspondência:

```text
normative owner........ MODULE: MOD-001
physical TB-140 anchor. VALUE_INCREMENT
value_increment_id..... VI-001
project_id............. NULL
```

Não há classificação pendente `KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE` ou
`RECONCILE` que invalide esse mapeamento. Esta preparação não inventa
`work_item.module_id` nem `governing_scope_type = MODULE`. Resultado:
**mapeamento conforme**.

## 5. Suficiência de DEC-008

DEC-008 resolve deterministicamente o blocker anterior:

| Semântica | Regra governada e resultado |
|---|---|
| Identidade | `principal_id` é UUID canônico, estável e imutável; atributos mutáveis não o alteram. |
| Username | Atributo de login mutável, não identidade nem credencial; valida exatamente `[a-z][a-z0-9_-]{2,31}`, sem normalização silenciosa e único enquanto current. A posse anterior permanece na história, sem reserva permanente, podendo ser reassociada se não houver conflito current. |
| Status | Somente `ACTIVE` e `SUSPENDED`; apenas criação → `ACTIVE`, `ACTIVE → SUSPENDED` e `SUSPENDED → ACTIVE`; só `ACTIVE` é elegível como Principal ativo. Não há delete físico nem estado terminal. |
| Currentness e história | `authority.principal` é snapshot current com `version bigint` e `current_history_event_id` explícito; `authority.principal_history` é append-only com `PRINCIPAL_CREATED`, `USERNAME_CHANGED` e `STATUS_CHANGED`. Currentness não deriva de `MAX(version)`. |
| Concorrência e restart | Versão inicia em 1; mutação material aceita com expected version incrementa exatamente uma vez; stale não cria fato. Snapshot, ponteiro e história são reconstruíveis após restart. |

As regras são compatíveis com `security/01_IDENTITY_AND_ACCESS_MODEL.md`:
identidade não equivale a authority, e autenticação não equivale a autorização.
`WI-003` conserva credenciais/login fora de WI-002; `WI-005` conserva grants e
authority de Project fora de WI-002.

## 6. Disposição do finding anterior

`FND-WI002-RCP-001` permanece **RESOLVED BY DEC-008**. A decisão humana fixa
precisamente a identidade canônica, username, status, eventos materiais,
versionamento, currentness e reconstrução que R1 identificou como ausentes.
Não há contradição entre DEC-008 e os critérios atualizados de WI-002; o finding
não é reaberto.

## 7. Objetivo, escopo e fronteira de mutation/authority

O objetivo finito é persistir restart-safely o Principal humano e seu estado
mínimo de identidade. Permanecem fora de escopo: hashing/verificação de senha,
endpoint de login, rate limiting, ciclo de sessão, grants/listagem de Project,
UI e regras de nome/unicidade de Project.

**Classificação da fronteira: A — não bloqueadora.** WI-002 define as
invariantes de persistência/domínio das mutações de username e status e permite
testá-las por operações de criação/mutação controladas com expected version. Ela
não promete um ator de negócio, endpoint externo ou grant para operar essas
mutações. A eventual authority de comando protegido deve ser revalidada quando
esse comando existir, conforme Authority Policy/Contract; inventar papel
administrativo, endpoint ou grant agora extrapolaria WI-002. Assim, o auditor
consegue avaliar as invariantes sem criar regra de authority nova.

## 8. Determinismo de aceite, testes e evidence

Os critérios de WI-002 agora fornecem oracle determinístico para:

- migration limpa em PostgreSQL;
- UUID imutável, validação e unicidade current de username e reutilização de
  username anterior após deixar de ser current;
- criação `ACTIVE`, transições permitidas e inelegibilidade de `SUSPENDED`;
- história append-only, tipos de evento, progressão exata de versão e rejeição
  stale sem novo fato;
- `current_history_event_id` explícito; persistência e reconstrução após restart.

O pacote de evidence exigido é suficiente para auditoria posterior: output de
migration em PostgreSQL 18.6, outputs de constraints/integração, output de
restart/reconstrução, diff limitado a WI-002 e referências a DEC-008 e à
resolução do finding. A existência futura desse pacote ainda terá de ser
auditada; esta preparação apenas conclui que está especificado de modo
verificável.

## 9. Compatibilidade TB/TIR e detalhes abertos

O desenho é compatível com TB-20, TB-22..TB-27, TB-132 e TB-139: separa snapshot
current de história imutável, usa UUID e `version bigint`, mantém currentness
explícita e história durável. TB-116..TB-119, TIR-011 e Foundation Contract §8
impõem migrations Kysely, forward-only, explícitas, sem startup e com lock.
TB-135, TIR-002, TIR-040 e TIR-041 exigem PostgreSQL 18.6 real para prova de
constraints. TB-138 e Foundation Contract §5 exigem transaction coerente quando
um comando material atravessar módulos; TIR-008 preserva privacidade de módulo.

São detalhes de implementação, não blockers: nome de migration SQL/Kysely,
índices e FKs físicos, estratégia física de índice unique, biblioteca UUID,
classes/adapters, layout de arquivos, helpers de teste e mecânica do helper de
transaction. Eles devem implementar as regras acima sem alterar semântica.

Não permanece questão material que exigiria inventar status, tipo de identidade,
normalização, reserva permanente, delete/offboarding, credencial, authority de
ator ou owner de domínio.

## 10. Findings, authority e próximo passo

Não há novo finding material ou blocker. `readiness_authority` continua
`NOT GRANTED`; uma preparação positiva não é audit, approval ou promoção.

Próxima ação governada exata: **submeter WI-002 a uma auditoria independente e
proporcional de readiness, no mesmo objeto, scope e baselines; a auditoria deve
registrar principal independente, critérios, evidence considerada, findings,
limitações e resultado.** Somente uma decisão/gate posterior com authority
válida pode tratar a transição `PROPOSED → READY`.

## 11. Conclusão final

READY FOR INDEPENDENT READINESS AUDIT
