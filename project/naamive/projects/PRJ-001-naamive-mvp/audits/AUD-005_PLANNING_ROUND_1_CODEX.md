# AUD-005 — Reauditoria independente e destrutiva da rodada 1

**audit_id:** AUD-005  
**object:** ROUND-1-APPROVAL-CANDIDATE  
**timestamp:** 2026-09-11T22:47:01-03:00

## Registro obrigatório

```text
auditor_principal_id: agent:codex:naamive-independent-audit
author_principal_id:  agent:chatgpt:naamive-planning-r1-v0.5
independence_status:   ATTESTED — principals declarados distintos; sem atestação criptográfica local
scope:                 project/naamive/; PRJ-001 / MOD-001 / VI-001; ROUND-1-APPROVAL-CANDIDATE; regressão destrutiva de AUD-001..004
baseline:              PBL-PRJ001-R1-v0.5 (business baseline candidata) / NB-0002
manifest_sha256:       ff7551b1d3a7dd620a7897d973a3f0afdd4aa27170b775741f5e4324f41e6d7b
criteria:              NB-0002; lifecycles; governance; evidence/audit; baseline/supersession; continuity/recovery; authority; TIR; TB v0.10/TB-140; projeções/histórico; novos blockers
evidence_considered:   MANIFEST.md, BASELINE_CERTIFICATE.md e 52 membros; AUD-001..004; FND-001..003; DEC-001..005; Project, Module, VI, DT, Roadmap, Current State, Execution Board, Activity Log, continuity, approval candidate, matriz WI, WI-001..013, risks e normas aplicáveis
review_refs:           AUD-001, AUD-002, AUD-003, AUD-004
result:                FAIL
limitations:           evidência exclusivamente local; sem web, remoto, GitHub, fetch, pull ou sincronização; identidades sem atestação criptográfica SaaS local
timestamp:             2026-09-11T22:47:01-03:00
```

Os principals declarados do autor e auditor são distintos, e o auditor não é autoridade humana. A limitação de atestação externa não concedeu aprovação nem contornou a segregação.

## Pré-condição: integridade da candidata

O manifesto declara `PBL-PRJ001-R1-v0.5`, `NB-0002` e 52 membros. Seu SHA-256 recalculado é `ff7551b1d3a7dd620a7897d973a3f0afdd4aa27170b775741f5e4324f41e6d7b`, idêntico ao certificado. Hash e tamanho de cada linha `SHA-256 tamanho caminho` foram recalculados: 52/52 conferem, sem membro ausente ou divergente.

O certificado também confere em baseline ID, baseline normativa, contagem e status de candidata. Isso prova a reprodução do snapshot submetido, não a coerência semântica entre seus membros.

AUD-001..004 foram preservados sem modificação. SHA-256 verificados:

```text
AUD-001  df91b6480356bb49ed88fb37ebeaaf4e9a80aa5dedd3fffc73b683c5abfac397
AUD-002  39d6f429bfbef51c8ae3ea4089b7ad7eb0353ea808f91c7c7153954b0c06e98a
AUD-003  12e091807e1bca752d66549814d27844704662543139f410380b781f5577bde4
AUD-004  ca56495f7d723571f5d898f32921eaf159f2947874ac795f0fa1360617562e12
```

## Teste obrigatório de AUD4-001

| Prova exigida | Resultado | Evidência |
|---|---|---|
| `cause_ref` existe e resolve | SIM | `CURRENT_CONTINUITY.md`: `FND-003 / AUD4-001`; `FND-003`: `source_finding: AUD4-001`. |
| ação canônica é AUD-005 | SIM, somente na fonte canônica | `CONT-PRJ001-005` declara AUD-005. |
| AUD-003 e AUD-004 são apenas históricos | NÃO | Roadmap ainda define AUD-003 como ação atual; Project, FND-002, Current State e Board ainda pendem AUD3-001/AUD-004. |
| projeções concordam | NÃO | Roadmap contém AUD-003 como ação atual e AUD-005 no binding; Current State contém AUD-004/FND-002 antigos; Board ainda requer AUD-004. |
| restart tem uma única ação válida | NÃO | Há rotas textuais para AUD-003, AUD-004 e AUD-005. |
| aprovação bloqueada até esta auditoria | NÃO determinístico | Continuity usa AUD-005, mas Current State usa AUD-004. |
| nenhuma promoção ocorreu | SIM | Project PLANNING; Module/VI IDENTIFIED; DT/Roadmap CANDIDATE; 13 WIs PROPOSED; 0 READY, ciclos ou Executions. |

### AUD5-001 — Remediação de AUD4-001 incompleta; continuidade e projeções contraditórias

- **Severidade:** P1
- **Blocking:** YES
- **Regra violada:** NB-0002 §4; `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` §§2–3, 12–15; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§14–15 e 26; `governance/04_AUDIT_AND_REVIEW_POLICY.md` §§4, 12–15 e 22.
- **Evidência:** `CONT-PRJ001-005` contém causa, owner, saída, fallback, escalada e AUD-005. Porém `ROADMAP.md` ainda diz `Current action: independent AUD-003`, embora seu binding posterior diga AUD-005. `CURRENT_STATE.md` mantém `READY FOR AUD-004`, `AUD3-001 CANDIDATE REMEDIATION`, `FND-002 READY_FOR_VERIFICATION` e bloqueio até AUD-004. `EXECUTION_BOARD.md` ainda diz `verification required by AUD-004`; `PROJECT.md` ainda condiciona o bloqueio à AUD-004.
- **Cenário destrutivo:** após restart, Roadmap agenda AUD-003, Project/FND-002 espera AUD-004 e continuity indica AUD-005. Isto reabre instâncias históricas ou cria paralisação sem rota única.
- **Conclusão:** AUD4-001 não foi remediado. Requer baseline sucessora que reconcilie projeções e trackers sem reabrir AUD-003/AUD-004.

## Regressão destrutiva dos findings históricos

| Finding histórico | Resultado | Evidência/reserva |
|---|---|---|
| AUD-001 | RESOLVIDO | WI-001 tem owner PROJECT; WI-002..013 têm owner MODULE; VI é referência, não owner. |
| AUD-002 | RESOLVIDO | Module e VI permanecem IDENTIFIED; definições são candidatas, sem transição fabricada. |
| AUD-003 | RESOLVIDO no estado/gate | Project PLANNING com baseline/NB e execução vedada. Reativação textual de AUD-004 está em AUD5-001. |
| AUD-004 | RESOLVIDO | DT-001 contém campos, `REQUIRED_FOR_TARGET`, authority/currentness/versionamento e AUD-005 como próxima auditoria. |
| AUD-005 | REGREDIU / BLOCKING | Não há continuidade única; ver AUD5-001. |
| AUD-006 | RESOLVIDO | DEC-002 separa TIR técnico de READY, Execution e mudança de lifecycle. |
| AUD-007 | RESOLVIDO | DEC-003/004 e WI-013/010/011 definem fonte Project, projeção, watermark, rebuild e invalidação. |
| AUD-008 | RESOLVIDO | WI-001..013 e matriz têm conteúdo, evidência e audit proporcional por WI. |
| AUD-009 | RESOLVIDO | Não há árvore candidata aninhada concorrente; solicitação, candidata e saída estão em `project/naamive/`. |
| AUD-010 | REGREDIU / BLOCKING | Estado e ação da auditoria divergem entre Roadmap, Project, Current State e Board; ver AUD5-001. |
| AUD2-001 | RESOLVIDO | Manifesto/certificado v0.5 fecham em 52/52 hashes e tamanhos. |
| AUD2-002 | RESOLVIDO | Autor, auditor, escopo e limitação registrados; principals declarados distintos. |
| AUD2-003 | RESOLVIDO | RISK-001..006 têm owner, impacto, tratamento, WI/evidence e gatilho de revalidação. |
| AUD2-004 | RESOLVIDO | Module não tem disposição intrínseca; ela é membership da VI em DT-001. |
| AUD3-001 | RESOLVIDO — confirmado | DEC-005 preserva owner Project/Module e TB-140: VI é âncora física para derivar Module. Não há evidência para reabrir AUD-004 ou exigir sucessora tecnológica. |
| AUD4-001 | AINDA ABERTO / BLOCKING | Falha de projeções concorrentes em AUD5-001. |

## Novo blocker independente de continuidade

### AUD5-002 — Linhagem da business baseline é autocontraditória

- **Severidade:** P1
- **Blocking:** YES
- **Regra violada:** NB-0002 §4; `state/04_BASELINE_AND_SUPERSESSION_MODEL.md` §§5–8, 18, 21 e 25; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§2–4, 7–8 e 14.
- **Evidência:** `BASELINE_CERTIFICATE.md` declara que PBL-PRJ001-R1-v0.5 sucede `PBL-PRJ001-R1-v0.4`. O membro `governance/PLANNING_BASELINE.md` declara para a mesma v0.5 `supersedes_ref: PBL-PRJ001-R1-v0.5`.
- **Impacto:** não é possível navegar deterministicamente a cadeia de supersession ou estabelecer se a evidence da v0.4 foi preservada/revalidada pela v0.5. A integridade do manifesto confirma que a contradição está no snapshot; não a valida.
- **Conclusão:** blocker de identidade/linhagem, distinto de continuidade. Corrigir somente numa sucessora versionada e reauditar.

## Observações de decisão

Não houve promoção de lifecycle, autoridade humana, READY Work Item, Development Cycle, Execution, Validation ou Delivery. Este resultado é evidence de falha: não aprova, não promove estado e não autoriza implementação. A continuidade correta é preservar este relatório como histórico, abrir ou atualizar findings governados para AUD5-001/AUD5-002, criar baseline sucessora com classificação de impacto e submetê-la a nova auditoria independente.

## Verdict

FAIL
