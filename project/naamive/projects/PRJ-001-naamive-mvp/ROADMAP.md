# PRJ-001 — Development Roadmap v2

**roadmap_id:** DR-PRJ001-VI001  
**scope_ref:** VI-001 / MOD-001 / PRJ-001  
**version:** 2  
**currentness:** CURRENT  
**decision_status:** APPROVED / EXERCISED — T6  
**decision_ref:** governance/HUMAN_APPROVAL_T1_T6.md  
**decision_input_commit:** cf4f2c032d61835329db820d9490250927b6bfeb  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002
**Planning Round 1:** COMPLETE / retained as planning evidence only

## Ordem proposta

| Entrada | Tipo | Referência | Condição |
|---|---|---|---|
| RM-001 | FINDING_REMEDIATION | FND-011 | CLOSED — remediação materializada na v1.0 e encerrada por decisão humana |
| RM-002 | HUMAN_DECISION | HUMAN_APPROVAL_T1_T6 | EXERCISED — decisão humana T1–T6 registrada em `governance/HUMAN_APPROVAL_T1_T6.md` |
| RM-003 | WORK_ITEM | WI-001 | EX-003 SUCCEEDED; CR-WI001-03 independente requerido antes de acceptance separado |
| RM-004..RM-015 | WORK_ITEM | WI-002..WI-012 e WI-013 | dependências declaradas nos WIs e baseline compatível |

`depends_on` só é satisfeito pelo resultado declarado em baseline compatível.
Mudança material exige classificar impacto como `KEEP`, `REVALIDATE`,
`SUPERSEDE`, `REVOKE` ou `RECONCILE` antes de novo trabalho.

## Encerramento da rodada

Este roadmap não é a fonte da ação livre. Não existe continuidade de auditoria
ativa nesta rodada:

```text
Planning Round 1............. COMPLETE
Audit phase.................. CLOSED
Last valid audit............. AUD-009
Known blocking findings...... 0
Further audit required....... NO
```

AUD-003, AUD-004, AUD-005 e AUD-006 são históricos e NÃO DEVEM ser agendados novamente.

## Currentness exercida

```text
T6 — DevelopmentRoadmap v2 CANDIDATE / NOT CURRENT → CURRENT    EXERCISED
result: DevelopmentRoadmap v2 CURRENT
```

A decisão humana T1–T6 foi exercida e está registrada em
`governance/HUMAN_APPROVAL_T1_T6.md` (gate_result APPROVED;
business_baseline_ref PBL-PRJ001-R1-v1.0; normative_baseline_ref NB-0002;
decision_input_commit cf4f2c032d61835329db820d9490250927b6bfeb).

A currentness do Roadmap v2 **não** satisfez automaticamente o readiness de
WI-001. O gate de RM-003 foi posteriormente aprovado e exercido por
`governance/HUMAN_APPROVAL_WI001_READINESS.md`: WI-001 está `READY`.
Permanecem 12 PROPOSED / 1 IN_REVIEW; 1 Development Cycle; `EX-001` e `EX-002`
são históricas e `EX-003 SUCCEEDED`. `CR-WI001-03` é a próxima ação legítima,
sem promover automaticamente `WI-001` para `DONE`.
