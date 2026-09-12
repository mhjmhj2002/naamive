# AUD-006 — Reauditoria independente e destrutiva da rodada 1

**audit_id:** AUD-006  
**object:** ROUND-1-APPROVAL-CANDIDATE  
**timestamp:** 2026-09-12T10:01:10-03:00

## Registro obrigatório

```text
auditor_principal_id: agent:codex:naamive-independent-audit
author_principal_id:  agent:chatgpt:naamive-planning-r1-v0.5
independence_status:   ATTESTED — principals declarados distintos e contextos Codex/ChatGPT separados; sem atestação criptográfica local
scope:                 project/naamive/; PRJ-001 / MOD-001 / VI-001; ROUND-1-APPROVAL-CANDIDATE; PBL-PRJ001-R1-v0.6; regressão destrutiva de todos os findings históricos
baseline:              PBL-PRJ001-R1-v0.6 (Business Baseline candidata) / NB-0002
manifest_sha256:       ec32f40cce42613c90c8a54a9599f08f48f28eae0d83d5611f7f6ca4f9f493b7
criteria:              NB-0002; baseline/supersession e compatibilidade; evidence/audit; continuidade/recovery; lifecycle; authority; TIR; TB-140; projeções/currentness; findings históricos; novos blockers
evidence_considered:   MANIFEST.md, BASELINE_CERTIFICATE.md e seus 23 membros; AUD-001..AUD-005; FND-001..FND-005; DEC-001..DEC-005; Project, Module, VI, DT, Roadmap, Current State, Execution Board, Activity Log, continuidade, candidato de aprovação, matriz WI, WI-001..WI-013, riscos e normas ratificadas aplicáveis
review_refs:           AUD-001, AUD-002, AUD-003, AUD-004, AUD-005
result:                FAIL
limitations:           evidência exclusivamente local; sem web, remoto, GitHub, fetch, pull ou sincronização; identidades sem atestação criptográfica SaaS local
timestamp:             2026-09-12T10:01:10-03:00
```

Os principals declarados de planejamento e auditoria são distintos. O auditor não
é a autoridade humana, e esta segregação declarada não concede aprovação. A
limitação de identidade externa tampouco autoriza autoauditoria.

## Pré-condição: integridade formal da candidata

`MANIFEST.md` declara `PBL-PRJ001-R1-v0.6`, `NB-0002` e 23 membros. Seu digest
recalculado é
`ec32f40cce42613c90c8a54a9599f08f48f28eae0d83d5611f7f6ca4f9f493b7`, igual ao
de `BASELINE_CERTIFICATE.md`. Hash e tamanho de cada entrada no formato
`SHA-256 tamanho caminho` foram recalculados: **23/23** conferem, sem membro
ausente ou divergente. O certificado também coincide em ID, baseline normativa,
contagem, criação, predecessor (`PBL-PRJ001-R1-v0.5`) e status de candidata.

Isso prova a reprodução dos 23 itens declarados, não que eles sejam cobertura
suficiente para a realidade material que a baseline pretende submeter ao gate.

AUD-001..AUD-005 foram preservadas. Seus digests atuais coincidem com os
registrados no manifesto v0.6:

```text
AUD-001  df91b6480356bb49ed88fb37ebeaaf4e9a80aa5dedd3fffc73b683c5abfac397
AUD-002  39d6f429bfbef51c8ae3ea4089b7ad7eb0353ea808f91c7c7153954b0c06e98a
AUD-003  12e091807e1bca752d66549814d27844704662543139f410380b781f5577bde4
AUD-004  ca56495f7d723571f5d898f32921eaf159f2947874ac795f0fa1360617562e12
AUD-005  6471922fecf19670c9f180698b98e06a08a701e060d2cad38bfa48ebf19a5cee
```

## Verificação das remediações AUD-005

| Verificação | Resultado | Evidência |
|---|---|---|
| FND-004 / AUD5-001: projeções nominadas apontam a uma ação | CONFORME | `CONT-PRJ001-006`, `PROJECT`, `ROADMAP`, `CURRENT_STATE`, `EXECUTION_BOARD`, `DELIVERY_TARGET`, pedido e candidato apontam para AUD-006. |
| AUD-003, AUD-004 e AUD-005 são históricos nas projeções nominadas | CONFORME | As projeções as classificam como `historical` e não as agendam. |
| FND-005 / AUD5-002: sucessora sem auto-referência | CONFORME | Manifesto, certificado e `PLANNING_BASELINE` identificam v0.6 e `supersedes_ref: PBL-PRJ001-R1-v0.5`. A auto-referência está preservada somente no histórico v0.5 que motivou a sucessora. |
| Não houve promoção ou autorização | CONFORME | Project permanece `PLANNING`; Module/VI `IDENTIFIED`; DT/Roadmap candidatos; 13 WIs `PROPOSED`; 0 Cycles/Executions; aprovação e implementação não autorizadas. |

Portanto, a correção textual das seis projeções exigidas está presente. Ela não
é suficiente para PASS porque a baseline declarada contém evidência material
incompatível/não coberta, descrita nos findings abaixo.

## Regressão destrutiva de findings históricos

| Finding histórico | Resultado na inspeção | Reserva de cobertura v0.6 |
|---|---|---|
| AUD-001 | Sem regressão observável: WI-001 permanece Project-owned e WI-002..013 Module-owned. | Os 13 WIs não são membros do manifesto v0.6 e ainda se vinculam a v0.5. |
| AUD-002 | Sem promoção fabricada: Module e VI permanecem `IDENTIFIED`. | `MODULE.md` e `VALUE_INCREMENT.md` não estão fixados na candidata e ainda se vinculam a v0.5. |
| AUD-003 | Estado/gate local permanece `PLANNING` e execução vedada. | DEC-001 e o material de Module/VI não são membros de v0.6. |
| AUD-004 | DT v1 ainda é candidato, com membership `REQUIRED_FOR_TARGET`, sem Delivery. | A prova subjacente de Module/VI não é membro de v0.6. |
| AUD-005 e AUD-010 | As projeções obrigatórias agora têm AUD-006 como ação única. | FND-003, que é membro v0.6, conserva ação de AUD-005 e blocker aberto; ver AUD6-002. |
| AUD-006 | DEC-002 ainda separa TIR técnico de READY, Execution e lifecycle. | DEC-002 não é membro e ainda declara v0.5. |
| AUD-007 | DEC-003/DEC-004 e WI-010/011/013 permanecem presentes localmente. | Nenhum desses documentos está pinado em v0.6. |
| AUD-008 | WIs e matriz permanecem detalhados e proporcionais localmente. | Matriz e WIs não são membros e ainda declaram v0.5. |
| AUD-009 | Não foi achada árvore candidata aninhada concorrente. | Sem reserva material adicional. |
| AUD2-001 | A integridade dos 23 membros declarados foi provada. | A candidata reduziu de 52 para 23 membros sem prova determinística de cobertura herdada. |
| AUD2-002 | Autor, auditor, escopo e limitação foram declarados; principals são distintos. | Limitação de atestação externa registrada. |
| AUD2-003 | RISK-001..006 permanecem estruturados localmente. | `RISK_REGISTER.md` não é membro e declara v0.5. |
| AUD2-004 | Module continua sem disposição intrínseca de DeliveryTarget. | `MODULE.md` não é membro de v0.6. |
| AUD3-001 / DEC-005 | Nenhuma contradição técnica nova foi encontrada: a regra Project/Module e a âncora física TB-140 continuam coerentes localmente. | DEC-005 não é membro de v0.6 e declara v0.5; não é possível confirmar sua resolução contra o snapshot exato submetido. |
| AUD4-001 | A contradição nas projeções principais foi removida. | O finding predecessor FND-003 continua ativo no próprio pacote, com saída para AUD-005; ver AUD6-002. |
| AUD5-001 / AUD5-002 | As remediações pretendidas são visíveis nas projeções e na linhagem v0.6. | Ainda há blockers novos de cobertura/currentness; ver AUD6-001 e AUD6-002. |

## Novos blockers

### AUD6-001 — PBL-PRJ001-R1-v0.6 não fixa a evidence que declara revalidar

- **Severidade:** P1
- **Blocking:** YES
- **Regra violada:** NB-0002 §4; `state/04_BASELINE_AND_SUPERSESSION_MODEL.md` §§2, 5–8 e 25; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§10, 14–15, 20–21 e 32; `governance/04_AUDIT_AND_REVIEW_POLICY.md` §§12–16, 27–30 e 43–45.
- **Evidência:** `PLANNING_BASELINE.md` classifica Module, VI, DT, Roadmap, matriz, riscos e WI-001..013 como `REVALIDATE`, mas o manifesto de 23 membros omite `MODULE.md`, `VALUE_INCREMENT.md`, `VALIDATION_PLAN.md`, `RISK_REGISTER.md`, todos os 13 WIs, `WORK_ITEM_ASSURANCE_MATRIX.md` e DEC-001..DEC-005. Os artefatos omitidos que sustentam o gate ainda declaram `PBL-PRJ001-R1-v0.5`; DEC-005, indispensável à confirmação de AUD3-001, também está fora da candidata.
- **Cenário destrutivo:** após restart, um revisor obtém v0.6 integralmente pelo manifesto, mas não consegue reproduzir nem provar a versão dos WIs/riscos/decisões que o candidato diz ter revalidado. Se ler os arquivos locais não pinados, encontra baseline v0.5; se eles mudarem, o digest da v0.6 não acusa a alteração. A validade do audit e a compatibilidade da evidence ficam indeterminadas.
- **Conclusão:** uma lista de delta sem vínculo determinístico aos membros herdados não é Business Baseline suficiente para a decisão material proposta. Não há prova de que a evidence v0.5 é compatível e coberta por v0.6. Operar fail-closed.

### AUD6-002 — FND-003 mantém rota ativa para AUD-005 dentro da candidata v0.6

- **Severidade:** P1
- **Blocking:** YES
- **Regra violada:** NB-0002 §4; `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` §§2–3, 12–15, 33 e 38; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§14–15, 22 e 32; `governance/05_FINDING_AND_EXCEPTION_POLICY.md` §§24, 26–28 e 44.4.
- **Evidência:** `findings/FND-003_AUD004_CONTINUITY_CURRENTNESS.md` é membro hashado da v0.6, mas permanece `READY_FOR_VERIFICATION`, `Blocking: YES`, vinculado a v0.5 e determina `canonical next action = AUD-005` e stop boundary “Until AUD-005”. Não declara que foi superseded por FND-004/AUD5-001, nem tem vínculo causal de disposição. Isso contradiz `CURRENT_CONTINUITY.md`, que declara AUD-005 terminal/histórica e AUD-006 como única ação.
- **Cenário destrutivo:** um executor que resolve o finding ativo membro da baseline encontra AUD-005 como ação obrigatória, enquanto a continuity corrente exige AUD-006. Isto recria a rota concorrente que AUD5-001 pretendia eliminar e deixa a disposição de FND-003 não auditável.
- **Conclusão:** FND-003 deve ser tratado historicamente por relação causal explícita (`SUPERSEDE`, `RECONCILE`, resolução ou outra disposição governada) em uma sucessora; não pode permanecer como blocker ativo com ação terminal concorrente.

## Observações de decisão

O resultado não aprova o candidato, não promove lifecycle state, não fecha os
findings e não autoriza implementação. A continuidade exigida é preservar
AUD-006 como histórico, materializar o tratamento causal dos blockers em uma
baseline sucessora, fixar ou vincular deterministicamente toda evidence
revalidada e submetê-la a nova auditoria independente.

## Verdict

FAIL
