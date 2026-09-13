# PRJ-001 — Development Roadmap v2

**roadmap_id:** DR-PRJ001-VI001  
**scope_ref:** VI-001 / MOD-001 / PRJ-001  
**version:** 2  
**currentness:** CURRENT  
**decision_ref:** governance/HUMAN_APPROVAL_T1_T6.md  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002

## Ordem e dependências

| Entrada | Tipo | Referência | Dependência / condição de planejamento |
|---|---|---|---|
| RM-001 | FINDING_REMEDIATION | FND-011 | histórico; encerrado na baseline v1.0 |
| RM-002 | HUMAN_DECISION | HUMAN_APPROVAL_T1_T6 | decisão que exerceu a currentness do roadmap |
| RM-003 | WORK_ITEM | WI-001 | precede WI-002 |
| RM-004 | WORK_ITEM | WI-002 | depende de WI-001 |
| RM-005..RM-015 | WORK_ITEM | WI-003..WI-013 | seguir dependências declaradas em cada Work Item e baseline compatível |

`depends_on` só é satisfeito pelo resultado declarado em baseline compatível.
Mudança material exige classificação `KEEP`, `REVALIDATE`, `SUPERSEDE`, `REVOKE`
ou `RECONCILE` antes de novo trabalho.

Este roadmap registra ordem e dependências, não status operacional, authority,
reviews, audits, findings ou executions. Para o ramo corrente, use
[STATUS.md](STATUS.md).
