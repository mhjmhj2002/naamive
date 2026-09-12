# AUD-003 — Terceira auditoria independente, destrutiva e adversarial da rodada 1

**Resultado:** `FAIL`  
**Data:** 2026-09-11T22:12:18-03:00  
**audit_id:** AUD-003  
**Objeto:** `ROUND-1-APPROVAL-CANDIDATE`  
**baseline:** `PBL-PRJ001-R1-v0.3`  
**normative_baseline_ref:** `NB-0002`  
**manifest_sha256:** `edfbd78b7bcfcaa7ea25dc4a272dc028579a2b27f59f626c389887f162707848`

## Registro de independência e escopo

```text
auditor_principal_id: agent:codex:naamive-independent-audit
author_principal_id:  agent:chatgpt:naamive-planning-r1-v0.3
independence_status:   ATTESTED — principals declarados distintos; sem atestação criptográfica local
scope:                 planejamento PRJ-001 / MOD-001 / VI-001, DT-001 v1,
                       Roadmap v2, WI-001..WI-013 e seus controles de governança
baseline:              PBL-PRJ001-R1-v0.3 / NB-0002
criteria:              lifecycles, governance, authority, evidence, continuity,
                       projection/currentness, TIR e Technology Baseline congelada
evidence_considered:   MANIFEST, certificado, artefatos membros, AUD-001, AUD-002,
                       NB-0002, TB v0.10/freeze, TIR v1.0 e normas locais aplicáveis
review_refs:           AUD-001, AUD-002
result:                FAIL
limitations:           somente arquivos locais; sem prova criptográfica da identidade SaaS
```

O auditor pôde estabelecer que seu principal declarado é distinto do principal
autor registrado. A limitação de atestação externa não é usada para fingir uma
identidade diferente nem para conceder aprovação.

## Integridade e delimitação da candidata

A árvore auditada foi exclusivamente `project/naamive/`. Não foram usados web,
remoto, GitHub, `fetch`, `pull` ou qualquer sincronização externa. Os arquivos
históricos `AUD-001` e `AUD-002` foram preservados.

O SHA-256 atual de `MANIFEST.md` coincide com o valor de
`BASELINE_CERTIFICATE.md`. Os 47 hashes e os 47 tamanhos declarados também
conferem quando cada linha é lida conforme seu formato documentado
`SHA-256 tamanho caminho`. O formato de três campos não é diretamente aceito por
`sha256sum --check`, que espera apenas hash e caminho; isso não revelou
divergência material porque a verificação independente dos hashes e tamanhos
passou. `MANIFEST.md` e o certificado não são membros por desenho declarado; o
presente relatório é evidence nova e tampouco é membro.

## Revalidação histórica

| Finding | Classificação | Evidência concreta |
|---|---|---|
| AUD-001 | PARTIALLY_RESOLVED | WI-002..WI-013 agora declaram `Owner: MOD-001`, `Governing scope: MODULE` e VI-001 apenas como referência. Porém o mapeamento para TB-140 ainda não está decidido; ver AUD3-001. |
| AUD-002 | RESOLVED | `CURRENT_STATE.md`, `PROJECT.md`, `MODULE.md` e `VALUE_INCREMENT.md` mantêm MOD-001 e VI-001 em `IDENTIFIED`; `ROUND_1_APPROVAL_CANDIDATE.md` propõe, sem executar, a sequência compatível T1–T4. |
| AUD-003 | RESOLVED | `BOOTSTRAP_DECISION.md` fixa a reconciliação manual em PLANNING sem inventar histórico; Project/estado/gate agora trazem baseline, NB-0002, continuidade e proibição de execução. |
| AUD-004 | RESOLVED | `DELIVERY_TARGET.md` contém identidade, versão, sets, `REQUIRED_FOR_TARGET`, baseline, criação, autoridade requerida, currentness e regra de versionamento. |
| AUD-005 | RESOLVED | `ROADMAP.md` v2 tem identidade, escopo, baseline, currentness, entradas referenciadas e condições; `CURRENT_CONTINUITY.md` contém owner, saída, fallback, escalada e cadência. |
| AUD-006 | RESOLVED | `DEC-002_TIR_LIFECYCLE_PRECEDENCE.md` torna explícito que TIR não cria WI READY, Execution ou mudança de lifecycle; todos os WIs continuam PROPOSED. |
| AUD-007 | RESOLVED | `DEC-003`, `DEC-004`, WI-013, WI-010 e WI-011 definem fonte Project current/history, fixture DEV/test, query pública, fontes da projeção, watermark, rebuild, invalidação durável e testes. |
| AUD-008 | RESOLVED | WI-001..WI-013 trazem owner, intenção, fora de escopo, dependências verificáveis, critérios, testes, evidence e audit proporcional; a matriz associa cada WI a obrigações específicas e impede concentrá-las em WI-012. |
| AUD-009 | RESOLVED | A solicitação e a candidata estão na raiz canônica exigida; não há árvore aninhada `project/naamive/project/naamive/`. |
| AUD-010 | RESOLVED | `AUDIT_REQUEST_CODEX.md` está READY FOR REAUDIT; `CURRENT_STATE.md`, board, activity A-013 e continuity concordam que AUD-003 é a próxima ação, sem alegar aprovação. |
| AUD2-001 | RESOLVED | Manifesto canônico fechado, certificado com digest correspondente e 47 membros verificáveis integralmente dentro da árvore candidata. |
| AUD2-002 | RESOLVED | Solicitação, `ROUND_1_AUTHORSHIP_AND_SEGREGATION.md`, política de agentes e este registro identificam autor, auditor, escopo, baseline e limitação de segregação. |
| AUD2-003 | RESOLVED | `RISK_REGISTER.md` registra owner, probabilidade, impacto, tratamento, status, mitigação/WI, evidence e gatilho de revalidação para RISK-001..006. |
| AUD2-004 | RESOLVED | A disposição está somente na membership de VI-001 em DT-001; `MODULE.md` a descreve como derivação, não como estado intrínseco do Module. |

**Totais históricos:** `RESOLVED = 13`; `PARTIALLY_RESOLVED = 1`;
`STILL_OPEN = 0`; `SUPERSEDED = 0`.

## Novo finding

### AUD3-001 — O mapeamento entre owner normativo de Work Item e o escopo físico congelado permanece indefinido

- **Severidade:** P1
- **Blocking:** YES
- **Artefatos afetados:** WI-002..WI-013, `WORK_ITEM_ASSURANCE_MATRIX.md`, `ROUND_1_APPROVAL_CANDIDATE.md`, `technology/01_TECHNOLOGY_BASELINE.md` (TB-140) e a futura persistência de Work Item.
- **Regra/autoridade violada:** `NB-0002` §4 (precedência e fail-closed); `lifecycle/05_WORK_ITEM_LIFECYCLE.md` §§4.3, 5, 24–25 e 44 (owner é Project ou Module; VI é referência no fluxo Module); Technology Baseline v0.10 §§1 e TB-140 (a baseline técnica materializa, não redefine lifecycle); e `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§4, 20–21.
- **Evidência encontrada:** os WI corrigidos declaram `Owner: MOD-001`, `Governing scope: MODULE` e `Value Increment reference: VI-001`. Em contraste, TB-140, congelado, exige `work_item.governing_scope_type` com os únicos valores `VALUE_INCREMENT` e `PROJECT_TRANSVERSAL`, e para o primeiro exige FK direta para `ValueIncrement`, sem `module_id`. Nenhum membro da baseline candidata define se esse campo físico passa a ser apenas uma referência de escopo, como o owner normativo Module é reconstruído/validado via `ValueIncrement.module_id`, ou como a classificação de baseline/invalidação do owner ocorre. `DEC-002` a `DEC-004` não tratam essa questão.
- **Cenário concreto de falha:** ao implementar WI-002, uma pessoa preserva TB-140 e persiste `VALUE_INCREMENT` como o governing owner; outra persiste `MOD-001` como owner e inventa coluna/constraint fora do freeze. A primeira quebra o lifecycle em mudança material do Module; a segunda quebra ou reinterpreta silenciosamente a baseline técnica. Em ambos os casos, readiness, revalidação e auditoria podem consultar owners diferentes.
- **Remediação exigida:** antes da decisão humana, materializar uma decisão auditável no baseline que defina a correspondência semântica e física, incluindo owner canônico, relação VI obrigatória, FK/derivação, consulta de revalidação e efeitos de mudança de Module/VI. Se essa correspondência não puder respeitar TB-140, abrir a mudança de Technology Baseline na autoridade adequada; não deixá-la para o implementador. Rebaselinar e reauditar a candidata depois da decisão material.

## Teste de prontidão real

| Pergunta | Resposta | Fundamentação |
|---|---|---|
| 1. Project pode permanecer em PLANNING? | YES | Bootstrap reconciliation e continuidade representam PLANNING sem promover Implementation. |
| 2. MOD-001 está no estado correto? | YES | `IDENTIFIED`; a definição é candidata, não fato promovido. |
| 3. VI-001 está no estado correto? | YES | `IDENTIFIED`; definição/plano são candidatos e a ordem futura depende de T1. |
| 4. DT-001 é somente CANDIDATE? | YES | Todos os fatos canônicos dizem `CANDIDATE / NOT CURRENT`. |
| 5. Roadmap v2 é somente CANDIDATE? | YES | `ROADMAP.md` e projeções declaram `CANDIDATE / NOT CURRENT`. |
| 6. Alguma WI pode virar READY sem nova decisão material? | NO | Além de readiness individual, AUD3-001 deixa a semântica owner/persistência sem decisão. |
| 7. Alguma WI pode iniciar Execution indevidamente? | NO | Todas são PROPOSED; política, board, decisão TIR e candidate gate exigem READY, ciclo, intent, baseline e authority. |
| 8. Source-of-truth de Project está definido? | YES | DEC-003 define current/history canônicos, query pública, fixture limitada e proibições; WI-013 possui critérios e testes. |
| 9. Activity Center está definido sem invenção? | YES | DEC-004 define fontes, campos, watermark, rebuild, outbox/invalidation, staleness, ownership e testes WI-010/011. |
| 10. Riscos materiais estão governados? | YES | Registro contém tratamento, responsáveis, vínculos e condição de abrir Finding. |
| 11. A autoria é identificável? | YES | Autor é registrado de forma explícita em solicitação e registro de segregação. |
| 12. A independência é verificável? | YES, com limitação | Principals são distintos e o limite de atestação local está registrado. |
| 13. PBL-PRJ001-R1-v0.3 é reconstruível e íntegra? | YES | Digest do manifesto/certificado e todos os 47 hashes/tamanhos conferem. |
| 14. Existe blocker para submissão à decisão humana? | YES | AUD3-001 é P1 bloqueador. |

## Totais e verdict

| Métrica | Total |
|---|---:|
| P0 | 0 |
| P1 | 1 |
| P2 | 0 |
| P3 | 0 |
| blocking findings | 1 |

FAIL

**VI-001 apta para aprovação humana:** NO

Este resultado não promove estado, não cria authority, não autoriza Execution e
não registra aprovação humana. A continuidade exigida é tratar AUD3-001 na
autoridade correta, gerar nova baseline com classificação de impacto e submetê-la
a nova auditoria independente.
