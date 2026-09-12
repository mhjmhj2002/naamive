# DT-001 — DeliveryTarget v1

**delivery_target_id:** DT-001  
**version:** 1  
**currentness:** CANDIDATE / NOT CURRENT  
**Project:** PRJ-001 — NAAMIVE MVP  
**normative_baseline_ref:** NB-0002  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**Technology Baseline:** v0.10 — APPROVED / FROZEN  
**TIR:** v1.0 — APPROVED (technical envelope)  
**decision_status:** PENDING AUDIT + HUMAN APPROVAL  
**decision_authority_ref:** human:manuel-hinojosa:project-owner

## Escopo candidato

O alvo candidato é o primeiro contexto NAAMIVE utilizável: principal humano
autorizado autentica, vê somente Projects permitidos, entra explicitamente em
um Project e observa atividade contextual factual.

| Value Increment | Disposição |
|---|---|
| VI-001 — Authenticated Project Context | REQUIRED_FOR_TARGET |

## Gate

```text
continuity_ref = CONT-PRJ001-010
cause_ref      = FND-011 / AUD9-001
next_audit     = AUD-010
```

DT-001 não se torna current automaticamente. Após auditoria válida é necessária
uma decisão humana explícita; antes disso não existe Delivery.
