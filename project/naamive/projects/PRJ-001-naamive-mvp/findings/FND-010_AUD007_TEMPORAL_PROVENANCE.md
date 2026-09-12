# FND-010 — AUD7-003 proveniência temporal da candidata

**Status:** RESOLVED — verificado por AUD-008  
**Severity:** P1  
**Blocking:** NO — resolução histórica retida  
**source_finding:** AUD7-003  
**source_evidence:** audits/AUD-007_PLANNING_ROUND_1_CODEX.md  
**business_baseline_ref:** PBL-PRJ001-R1-v0.8  
**normative_baseline_ref:** NB-0002  
**owner:** human:manuel-hinojosa:project-owner

AUD-007 foi registrada às `2026-09-12T10:13:39-03:00`, antes do `created_at`
declarado pela v0.7. A v0.8 declara `created_at` posterior a AUD-007 e esse
mesmo instante aparece em baseline, manifesto e certificado. Isso não altera a
proveniência histórica da AUD-007; estabelece apenas uma sucessora auditável.

AUD-008 foi registrada após o `created_at` v0.8 e confirmou a coerência entre
baseline, manifesto e certificado. A resolução é evidence histórica e não
aprova a rodada.
