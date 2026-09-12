# AUD-007 — Planning Round 1 — Independent Reaudit

**audit_id:** AUD-007  
**audit_object:** ROUND-1-APPROVAL-CANDIDATE  
**auditor_principal_id:** agent:codex:naamive-independent-audit  
**author_principal_id:** agent:chatgpt:naamive-planning-r1-v0.5  
**independence_status:** INDEPENDENT — principals declarados distintos; sem atestação criptográfica da identidade SaaS (limitação registrada)  
**scope:** `project/naamive/`; PRJ-001 / MOD-001 / VI-001; candidata ROUND-1-APPROVAL-CANDIDATE; PBL-PRJ001-R1-v0.7; validação de baseline e certificado, regressão destrutiva de AUD-001..AUD-006 e busca de novos blockers  
**baseline:** PBL-PRJ001-R1-v0.7 (Business Baseline candidata) / NB-0002 (RATIFIED / IN FORCE)  
**manifest_sha256:** `dcb4ad6f3c44c01b7e2212fa57496a5915a63dfb051e2c82077dc050ff4ed8bf`  
**criteria:** NB-0002 §4; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§3–4, 8–10, 14–16, 20–22, 26–29; `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` §§2–3, 12–15; `state/04_BASELINE_AND_SUPERSESSION_MODEL.md` §§5–8, 18, 21, 24–25; `governance/04_AUDIT_AND_REVIEW_POLICY.md`; `governance/05_FINDING_AND_EXCEPTION_POLICY.md`; solicitação AUD-007  
**evidence_considered:** MANIFEST.md, BASELINE_CERTIFICATE.md e os 59 membros declarados; PLANNING_BASELINE, CURRENT_CONTINUITY, CURRENT_STATE, PROJECT, ROADMAP, EXECUTION_BOARD, DELIVERY_TARGET, ROUND_1_APPROVAL_CANDIDATE, AUTHORSHIP_AND_SEGREGATION, AUTHORITY_CONTEXT, ACTIVITY_LOG; DEC-001..DEC-005; FND-001..FND-007; WI-001..WI-013; AUD-001..AUD-006; NB-0002 e contratos/modelos ratificados aplicáveis  
**review_refs:** AUD-001, AUD-002, AUD-003, AUD-004, AUD-005, AUD-006; DEC-005; FND-001..FND-007  
**result:** FAIL  
**limitations:** a identidade separada de ChatGPT/Codex é declarada localmente, sem atestação criptográfica; a candidata falha integridade antes de poder sustentar cobertura substantiva global. As observações substantivas abaixo são testes de regressão no diretório de trabalho, não validação de um snapshot íntegro.  
**timestamp:** 2026-09-12T10:13:39-03:00

## Resultado

**FAIL.** Há findings bloqueadores aplicáveis. Este resultado não aprova a
rodada, não promove lifecycle state e não autoriza implementação.

## Validação prévia: manifesto e certificado

O certificado e o manifesto concordam entre si quanto a `baseline_id`
`PBL-PRJ001-R1-v0.7`, `normative_baseline_ref` `NB-0002`, predecessor
`PBL-PRJ001-R1-v0.6`, contagem declarada de 59 e digest do próprio manifesto:
`dcb4ad6f3c44c01b7e2212fa57496a5915a63dfb051e2c82077dc050ff4ed8bf`.

O teste completo de membros, obrigatório antes da análise substantiva, falhou:
57/59 hashes e tamanhos conferem; dois membros materiais divergem.

| Membro | Manifesto (SHA-256 / bytes) | Observado (SHA-256 / bytes) |
|---|---|---|
| `README.md` | `ec4a034be32b1fd8212d20ac5a7ae2231ae5ab817ceb169a3210de203d15aad4` / 1180 | `d38c7fbc10c88343708e7adbfecb679392804669553c5710bf25d4a21d765be2` / 1152 |
| `projects/PRJ-001-naamive-mvp/activity/ACTIVITY_LOG.md` | `7bfc2cc84345082913f9417cfe555ec61c5be503a6ecfb677db6ce789d708e90` / 3277 | `1557856e2816663f21d066f9abf62b74170879b556da7992e8325266031c6ece` / 3729 |

### AUD7-001 — PBL v0.7 não é um snapshot íntegro dos membros que declara

- **Severidade:** P1 / BLOCKING.
- **Evidência:** os dois desvios acima coexistem com o digest manifesto ↔
  certificado correto; logo esse digest prova somente o texto do manifesto,
  não a identidade dos membros materiais. `README.md` e `ACTIVITY_LOG.md`
  pertencem ao gate e a baseline afirma fixá-los por hash e tamanho.
- **Teste destrutivo:** ao reconstruir a candidata exclusivamente a partir da
  lista fechada do manifesto, os dois membros não podem ser obtidos nem
  verificados na versão declarada. Aceitar os arquivos locais equivaleria a
  substituição silenciosa de evidence.
- **Impacto:** FND-006 / AUD6-001 não está remediado: a cobertura pode estar
  listada, mas não está deterministicamente verificável. A audit deve operar
  fail-closed.

### AUD7-002 — Critério de aprovação referencia a baseline histórica v0.6

- **Severidade:** P1 / BLOCKING.
- **Evidência:** `governance/ROUND_1_APPROVAL_CANDIDATE.md` declara
  `business_baseline_ref: PBL-PRJ001-R1-v0.7`, exige AUD-007 e continuidade
  `CONT-PRJ001-007`, mas afirma que a aprovação exige “manifesto íntegro
  v0.6”. `PLANNING_BASELINE.md`, o certificado e a solicitação definem v0.7
  como a única candidata e preservam v0.6 somente como histórico de AUD-006
  FAIL.
- **Teste destrutivo:** uma decisão humana posterior poderia satisfazer o
  texto do candidato com o manifesto v0.6, cuja AUD-006 já demonstrou cobertura
  insuficiente, em vez do snapshot v0.7 submetido a AUD-007.
- **Impacto:** o gate material não identifica deterministicamente a Business
  Baseline que a futura decisão deve usar, contrariando baseline obrigatório e
  evidência coerente. Não há base para PASS.

### AUD7-003 — Metadata temporal da candidata está à frente da auditoria

- **Severidade:** P1 / BLOCKING.
- **Evidência:** manifesto e certificado declaram `created_at:
  2026-09-12T10:30:00-03:00`; esta auditoria foi iniciada e registrada em
  `2026-09-12T10:13:39-03:00`, antes do instante declarado de criação.
- **Impacto:** a proveniência temporal do package submetido não é demonstrável
  no momento da audit. Somada às divergências de membros, impede afirmar que
  o audit avalia uma evidence produzida e congelada antes da revisão.

## Regressão destrutiva de findings históricos

| Findings históricos | Resultado do teste | Evidência |
|---|---|---|
| AUD-001..AUD-010 e AUD2-001..AUD2-004 | Sem regressão substantiva observada no diretório de trabalho, mas sem validação global do snapshot corrompido. | WI-001 permanece `PROJECT`/PRJ-001; WI-002..WI-013 permanecem `MODULE`/MOD-001; todos têm Cycle `NOT CREATED` e Execution `NONE`. Project continua PLANNING, WIs PROPOSED, 0 READY/Cycles/Executions, implementação NOT AUTHORIZED. |
| AUD3-001 / DEC-005 | Mantém-se resolvido no membro exato verificado. | `DEC-005` é um dos 57 membros que conferem (`199ffc…77dd`, 5453 bytes); mantém owner normativo PROJECT/MODULE e TB-140 apenas como âncora física. FND-002, PROJECT, CURRENT_STATE e EXECUTION_BOARD concordam. |
| AUD4-001 / FND-003 | Remediação de currentness observada; sem rota atual para AUD-005. | FND-003 está `SUPERSEDED`, `Blocking: NO`, sem próxima ação; `CURRENT_CONTINUITY` define exclusivamente `CONT-PRJ001-007 → AUD-007`; PROJECT, ROADMAP, CURRENT_STATE, EXECUTION_BOARD, DELIVERY_TARGET e solicitação concordam. A referência a AUD-005 ocorre somente em evidência histórica. |
| AUD5-001 / FND-004 e AUD5-002 / FND-005 | Sem regressão substantiva observada. | A cadeia declarada é v0.5 → v0.6 → v0.7; projeções correntes tratam AUD-003..AUD-006 como terminais. Contudo, AUD7-002 impede aceitar a condição de gate como coerente. |
| AUD6-001 / FND-006 | **REGREDIU / não remediado.** | AUD7-001: 2/59 membros divergem, portanto a lista material não prova a snapshot exata. |
| AUD6-002 / FND-007 | Remediação substantiva observada, sem validação final de baseline. | FND-003 dispõe a relação causal de supersessão, não é blocker e não direciona AUD-005; só AUD-007 é ação corrente. |

Não foi encontrada promoção ou autorização: não há aprovação humana, Work Item
READY, Cycle, Execution, Validation ou Delivery declarados. Isso não reduz os
blockers de evidence, gate e temporalidade acima.

## Continuidade exigida

AUD-001..AUD-006 permanecem evidência histórica terminal e não foram editadas.
Como esta audit falhou, ela própria não promove estado. Qualquer correção deve
preservar AUD-007, atualizar/criar finding e continuidade sucessora governada,
e submeter nova baseline íntegra a reauditoria independente.
