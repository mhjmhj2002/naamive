# Planning Baseline — PBL-PRJ001-R1-v1.0

**baseline_id:** PBL-PRJ001-R1-v1.0  
**status:** CANDIDATE FOR INDEPENDENT REAUDIT  
**created_at:** 2026-09-12T11:18:00-03:00  
**normative_baseline_ref:** NB-0002  
**supersedes_ref:** PBL-PRJ001-R1-v0.9  
**primary_remediation:** AUD9-001 / FND-011 — revalidação explícita do material ativo v0.5  
**manifest:** `../../../MANIFEST.md`  
**certificate:** `../../../BASELINE_CERTIFICATE.md`

## Escopo fixado

O manifesto v1.0 fixa, por hash e tamanho, toda a evidência material submetida
ao gate, inclusive AUD-009 e o registro por objeto
`BASELINE_REVALIDATION_AUD009.md`. Não há evidence herdada ou revalidada fora
do manifesto.

| Objeto | Classificação | Disposição |
|---|---|---|
| PBL-PRJ001-R1-v0.9 | SUPERSEDE | preservada como evidência histórica do AUD-009 FAIL |
| Material ativo listado no registro AUD9 | REVALIDATE | revalidação candidata por objeto v0.5 → v1.0, sem aprovação implícita |
| Instruções, projeções e contexto de autoridade | RECONCILE | uma única candidata, continuidade e auditoria corrente v1.0/AUD-010 |
| FND-003 | SUPERSEDE | sucedido por FND-004; sem blocker ou próxima ação ativa |
| FND-004 e FND-005 | SUPERSEDE | sucedidos pelos findings de AUD-006 e preservados como história |
| FND-006 e FND-007 | SUPERSEDE | sucedidos por FND-008..FND-010, abertos por AUD-007 |
| FND-008 e FND-010 | KEEP | verificados por AUD-008; preservados como evidence de resolução |
| FND-009 | SUPERSEDE | sucedido por FND-011 / AUD8-001 |
| AUD-001..AUD-009 | KEEP | evidência histórica terminal, nunca ação corrente |
| DEC-005 / AUD3-001 | KEEP | resolução preservada e pinada no snapshot v0.9 |

Não há promoção de lifecycle, aprovação humana, WI `READY`, Cycle, Execution,
Validation ou Delivery.

## Currentness

Esta é a única candidata para AUD-010. A ação canônica é exclusivamente a
definida em `CURRENT_CONTINUITY.md`; a baseline não autoriza implementação.
