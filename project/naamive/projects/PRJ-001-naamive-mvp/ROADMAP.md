# PRJ-001 — Development Roadmap v2 Candidate

**roadmap_id:** DR-PRJ001-VI001  
**scope_ref:** VI-001 / MOD-001 / PRJ-001  
**version:** 2  
**currentness:** CANDIDATE / NOT CURRENT  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002

## Ordem proposta

| Entrada | Tipo | Referência | Condição |
|---|---|---|---|
| RM-001 | FINDING_REMEDIATION | FND-011 | AUD-010 PASS sem blocker aplicável |
| RM-002 | HUMAN_DECISION | ROUND-1-APPROVAL-CANDIDATE | RM-001 e decisão humana explícita |
| RM-003 | WORK_ITEM | WI-001 | RM-002 e critérios de readiness satisfeitos |
| RM-004..RM-015 | WORK_ITEM | WI-002..WI-012 e WI-013 | dependências declaradas nos WIs e baseline compatível |

`depends_on` só é satisfeito pelo resultado declarado em baseline compatível.
Mudança material exige classificar impacto como `KEEP`, `REVALIDATE`,
`SUPERSEDE`, `REVOKE` ou `RECONCILE` antes de novo trabalho.

## Continuidade corrente

Este roadmap não é a fonte da ação livre. O binding canônico é:

```text
continuity_ref = CONT-PRJ001-010
cause_ref      = FND-011 / AUD9-001
baseline       = PBL-PRJ001-R1-v1.0
next_action    = AUD-010
```

AUD-003, AUD-004, AUD-005 e AUD-006 são históricos e NÃO DEVEM ser agendados novamente.
