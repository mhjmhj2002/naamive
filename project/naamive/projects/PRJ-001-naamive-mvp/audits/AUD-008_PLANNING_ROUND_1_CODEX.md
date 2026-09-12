# AUD-008 — Reauditoria independente e destrutiva da rodada 1

**audit_id:** AUD-008  
**auditor_principal_id:** agent:codex:naamive-independent-audit  
**author_principal_id:** agent:codex:naamive-aud7-remediation  
**independence_status:** INDEPENDENT — o principal auditor declarado é distinto do autor da remediação v0.8; a separação de contexto é declarada localmente, sem atestação criptográfica de identidade SaaS.  
**scope:** `project/naamive/`; PRJ-001 / MOD-001 / VI-001; objeto `ROUND-1-APPROVAL-CANDIDATE`; PBL-PRJ001-R1-v0.8. Inclui validação prévia de manifesto/certificado, regressão destrutiva de todos os findings históricos e busca de novos blockers.  
**baseline:** PBL-PRJ001-R1-v0.8 (Business Baseline candidata; `CANDIDATE FOR INDEPENDENT REAUDIT`) / NB-0002 (`RATIFIED / IN FORCE`)  
**manifest_sha256:** `c7fa3c0f69fb69bf586927897bc7f14ae8886d328e021cbef74076b727373ee2`  
**criteria:** NB-0002 §4; `contracts/03_EVIDENCE_AND_AUDIT_CONTRACT.md` §§3–4, 8–10, 14–16, 20–22, 26–29 e 35–36; `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` §§2–3, 8, 12–15; `state/04_BASELINE_AND_SUPERSESSION_MODEL.md` §§5–8, 18, 21, 24–25; `governance/04_AUDIT_AND_REVIEW_POLICY.md` §§4–6, 11–16, 26–30, 35–38 e 42–50; `governance/05_FINDING_AND_EXCEPTION_POLICY.md` §§2–6, 24–29 e 40–43; solicitação AUD-008.  
**evidence_considered:** `MANIFEST.md`, `BASELINE_CERTIFICATE.md` e seus 63 membros; `PLANNING_BASELINE`, `CURRENT_CONTINUITY`, `ROUND_1_APPROVAL_CANDIDATE`, `ROUND_1_AUTHORSHIP_AND_SEGREGATION`, `AUTHORITY_CONTEXT`, `CURRENT_STATE`, `PROJECT`, `ROADMAP`, `EXECUTION_BOARD`, `DELIVERY_TARGET`, `AGENT_EXECUTION_POLICY`, `MANUAL_OPERATING_MODEL`, `ACTIVITY_LOG`; DEC-001..DEC-005; FND-001..FND-010; WI-001..WI-013; AUD-001..AUD-007; NB-0002 e os contratos/modelos ratificados aplicáveis.  
**review_refs:** AUD-001, AUD-002, AUD-003, AUD-004, AUD-005, AUD-006, AUD-007; FND-001..FND-010; DEC-005.  
**result:** FAIL  
**limitations:** a separação de principal é evidência declarativa local, sem prova criptográfica externa. A análise foi feita sobre o snapshot que passou em integridade, mas a inconsistência substantiva abaixo impede tratá-lo como pacote coerente de gate. Este relatório não cria Finding persistido, não altera os findings existentes, não aprova e não promove lifecycle state.  
**timestamp:** 2026-09-12T10:36:04-03:00

## Resultado

**FAIL.** A verificação de integridade e proveniência do pacote v0.8 passou,
mas FND-009 não pode ser considerado remediado: dois membros ativos e
manifestados ainda apresentam a baseline v0.5 e seu produtor ChatGPT como a
*candidata corrente*. Isso cria uma rota de audit/gate não vinculada ao
manifesto v0.8, em conflito com a candidata submetida. É blocker aplicável;
logo PASS é proibido.

Esta auditoria não aprova a rodada, não encerra continuidade, não concede
authority e não autoriza implementação.

## Validação prévia: manifesto e certificado

O SHA-256 calculado de `MANIFEST.md` é
`c7fa3c0f69fb69bf586927897bc7f14ae8886d328e021cbef74076b727373ee2`, igual
ao certificado. Manifesto e certificado concordam em:

| Campo | Valor verificado |
|---|---|
| `baseline_id` | `PBL-PRJ001-R1-v0.8` |
| `normative_baseline_ref` | `NB-0002` |
| predecessor | `PBL-PRJ001-R1-v0.7` |
| `member_count` | 63 |
| `created_at` | `2026-09-12T10:23:00-03:00` |

Foram recalculados SHA-256 e tamanho de cada uma das 63 entradas fechadas:
**63/63 conferem**, sem membro ausente ou divergente. O `created_at` também é
coerente em `PLANNING_BASELINE.md` e `ACTIVITY_LOG.md` (A-023), e antecede este
registro (`2026-09-12T10:36:04-03:00`). Portanto AUD7-001/FND-008 e
AUD7-003/FND-010 passam em seus requisitos de integridade e temporalidade.

## Blocker

### AUD8-001 — O pacote v0.8 contém instruções ativas que mantêm candidata, baseline e autoria conflitantes

- **Severidade:** BLOCKING / P1.
- **Finding afetado:** FND-009 / AUD7-002, que permanece bloqueador até
  verificação independente válida.
- **Evidência exata:** `MANUAL_OPERATING_MODEL.md:193–208`, arquivo com status
  `ACTIVE FOR SELF-HOSTED BUILD` e membro do manifesto, afirma que a
  “current remediation candidate” é `PBL-PRJ001-R1-v0.5`, de
  `agent:chatgpt:naamive-planning-r1-v0.5`, e oferece o caminho
  `independent audit → PASS → human approval`. `AGENT_EXECUTION_POLICY.md:20–45`,
  também ativo e membro do manifesto, repete a proibição corrente sob v0.5 e
  identifica esse mesmo autor como o produtor de planejamento atual.
- **Conflito:** a solicitação AUD-008 (`AUDIT_REQUEST_CODEX.md:3–10`), a
  candidata de aprovação e `ROUND_1_AUTHORSHIP_AND_SEGREGATION.md:3–30`
  identificam univocamente a candidata como v0.8 e o autor da remediação como
  `agent:codex:naamive-aud7-remediation`. A candidata de aprovação exige o
  manifesto íntegro v0.8, AUD-008 válido, ausência de blocker aplicável e
  decisão humana nova.
- **Teste destrutivo:** se um operador seguir o caminho expresso no modelo
  operacional ativo, pode submeter uma auditoria e decisão humana para a
  candidata v0.5 sem validar o manifesto v0.8, FND-008..FND-010 ou
  `CONT-PRJ001-008`. A integrity do manifesto apenas fixa esse texto
  contraditório; ela não o reconcilia. Não há classificação explícita que
  converta os dois enunciados em evidência puramente histórica nem decisão que
  estabeleça compatibilidade v0.5 → v0.8 para esse gate.
- **Impacto:** não é possível determinar uma única Business Baseline nem um
  único autor para toda evidence material do gate. O critério “somente o
  manifesto íntegro v0.8” e a exclusividade de AUD-008 deixam de ser prováveis
  no pacote submetido. Sob evidence contraditória, o contrato exige
  reconciliação ou decisão explícita; até lá, fail-closed.
- **Tratamento necessário fora desta auditoria:** preservar AUD-008, tratar a
  divergência como finding governado, classificar/reconciliar os artefatos
  ativos afetados na baseline sucessora e criar continuidade sucessora antes de
  nova reauditoria independente. Nenhuma correção foi feita aqui.

## Regressão destrutiva dos findings históricos

| Finding histórico | Resultado da regressão | Evidência / teste adversarial |
|---|---|---|
| AUD-001 | RESOLVIDO, sem regressão | WI-001 permanece `PROJECT`/PRJ-001; WI-002..WI-013 permanecem `MODULE`/MOD-001. VI-001 é referência física, não terceiro owner. |
| AUD-002 | RESOLVIDO, sem promoção fabricada | Module e VI seguem `IDENTIFIED`; as transições são apenas candidatas condicionadas à decisão humana. |
| AUD-003 | RESOLVIDO | Project está `PLANNING`; baseline/NB, gate e vedação de execução persistem. |
| AUD-004 | RESOLVIDO | DT-001 v1 é `CANDIDATE / NOT CURRENT`, com authority requerida e sem Delivery. |
| AUD-005 | RESOLVIDO nas projeções correntes | `CURRENT_CONTINUITY`, Project, Roadmap, Board, DT e solicitação usam `CONT-PRJ001-008 → AUD-008`; a rota v0.5 não identificada em AUD8-001 é novo conflito de gate, não reabertura de AUD-005. |
| AUD-006 | RESOLVIDO | DEC-002 continua separando envelope técnico TIR de `READY`, Execution e mudança de lifecycle. |
| AUD-007 | RESOLVIDO | DEC-003/004 e WI-010/011/013 preservam fonte canônica de Project, projeção, watermark, rebuild e invalidação. |
| AUD-008 | RESOLVIDO | WI-001..WI-013 e a matriz continuam com owner, escopo, critérios, testes, evidência e audit proporcional. |
| AUD-009 | RESOLVIDO | Não foi encontrada árvore candidata aninhada concorrente; a raiz canônica é `project/naamive/`. |
| AUD-010 | RESOLVIDO nas projeções correntes | Não há projeção corrente que agende AUD-003..AUD-007; a próxima ação canônica é AUD-008. |
| AUD2-001 | RESOLVIDO | Manifesto/certificado v0.8 fecham em 63/63 hashes e tamanhos. |
| AUD2-002 | Regressão de consistência no pacote v0.8 | O principal auditor é distinto do autor v0.8 declarado, mas os dois membros ativos citados em AUD8-001 ainda declaram outro autor/baseline como correntes; a segregação do gate não é determinável sem reconciliação. |
| AUD2-003 | RESOLVIDO | `RISK_REGISTER.md` está no snapshot e continua a registrar tratamento, owner, impacto, vínculos e gatilhos. |
| AUD2-004 | RESOLVIDO | Module não recebe disposição intrínseca de DeliveryTarget; ela continua derivada da membership de VI-001. |
| AUD3-001 / FND-002 / DEC-005 | RESOLVIDO no snapshot exato | `DEC-005` é membro verificado: SHA-256 `199ffc806587033754e81d94c1aa622595652d35beb186f833807a434cbb77dd`, 5453 bytes. Mantém owner normativo PROJECT/MODULE, TB-140 como âncora física e fail-closed antes de READY/Execution. |
| AUD4-001 / FND-003 | RESOLVIDO / SUPERSEDED, sem rota ativa para AUD-005 | FND-003 declara `SUPERSEDED`, `Blocking: NO` e nenhuma próxima ação; `CURRENT_CONTINUITY` estabelece exclusivamente CONT-PRJ001-008 → AUD-008. Referências a AUD-005 são históricas. |
| AUD5-001 / FND-004 | SUPERSEDED, sem regressão causal | A continuidade corrente possui causa, owner, saída, fallback, escalada e AUD-008 como ação canônica. |
| AUD5-002 / FND-005 | SUPERSEDED, sem regressão de linhagem | A cadeia declarada é v0.5 → v0.6 → v0.7 → v0.8; certificado, manifesto e baseline v0.8 concordam no predecessor imediato v0.7. |
| AUD6-001 / FND-006 | Remediado por FND-008 | A cobertura agora é determinística: todos os 63 membros declarados foram validados no snapshot submetido. |
| AUD6-002 / FND-007 | Remediado | FND-003 não é blocker, não define ação e não reintroduz AUD-005. |
| AUD7-001 / FND-008 | VERIFICADO | 63/63 hashes e tamanhos conferem. |
| AUD7-002 / FND-009 | **NÃO VERIFICADO / BLOCKING** | AUD8-001 demonstra condição ativa de gate ligada à v0.5, não apenas ao manifesto v0.8. |
| AUD7-003 / FND-010 | VERIFICADO | A criação v0.8 (`10:23:00-03:00`) antecede este registro (`10:36:04-03:00`) e é coerente nas três fontes requeridas. |

## Estado e continuidade observados

Não foi encontrada promoção: Project segue `PLANNING`, MOD-001/VI-001 seguem
`IDENTIFIED`, DT/Roadmap seguem candidatos, os 13 WIs seguem `PROPOSED`, e há
0 `READY`, Cycles, Executions, Validation e Delivery. A autoridade humana não
foi concedida e a implementação permanece `NOT AUTHORIZED`.

`CONT-PRJ001-008` é uma continuidade `GOVERNED_BLOCK` materializada, com
owner, preconditions, fallback e escalation. Contudo, seu resultado ainda não
é alcançável como gate coerente por causa de AUD8-001; a continuidade deve
permanecer bloqueada e ser sucedida de forma governada após tratamento.

## Conclusão para revisão humana

O pacote é reconstruível por integridade, e AUD3-001/DEC-005, AUD4-001/FND-003,
AUD7-001/FND-008 e AUD7-003/FND-010 não regrediram. FND-009 permanece um
blocker aplicável, ampliado pela inconsistência identificada em AUD8-001.
Assim, o único verdict conforme os critérios é **FAIL**. Nenhuma aprovação,
promoção ou autorização decorre deste relatório.
