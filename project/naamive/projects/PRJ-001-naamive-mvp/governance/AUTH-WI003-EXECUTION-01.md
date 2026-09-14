# AUTH-WI003-EXECUTION-01 — Authority pontual para a primeira Execution de WI-003

**authority_id:** AUTH-WI003-EXECUTION-01  
**principal_id:** agent:codex:implementation:WI-003  
**principal_type:** AGENT  
**action:** EXECUTE_WORK  
**scope:** PRJ-001 / MOD-001 / VI-001 / WI-003 / DC-003 / primeira Execution causal (`EX-007`)  
**issued_by:** human:manuel-hinojosa:project-owner  
**issued_at:** 2026-09-14T20:01:37-03:00  
**valid_from:** 2026-09-14T20:01:37-03:00  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**validity_condition:** válida somente enquanto WI-003/DC-003 permanecessem elegíveis, as baselines fossem compatíveis, não existisse revogação/cancelamento ou blocker incompatível e a tentativa fosse a primeira causal.  
**revocation_condition:** revogação explícita pelo delegante, mudança incompatível de baseline/scope, perda de elegibilidade, cancelamento ou término terminal de EX-007.  
**segregation_constraints:** o principal somente implementa, testa e produz evidência; não revisa/audita independentemente o próprio resultado, não aceita WI-003 e não decide gate, risco, exceção, Delivery, PBL, NB, TB, TIR ou DEC-009.  
**decision_source:** instrução explícita corrente do Project Owner: “dev tocar WI-003 + corrigir a documentação da própria WI-003”.

## Cadeia e limites

```text
human:manuel-hinojosa:project-owner
→ agent:codex:implementation:WI-003
→ EXECUTE_WORK exclusivamente para WI-003 / DC-003 / EX-007
```

Esta é prova de authority operacional limitada à passagem registrada. Não é
grant reutilizável do Project, não ativa a candidata
`AUTH-PRJ001-WI-EXECUTION-01_CANDIDATE.md` e não cria authority de aprovação.

## Revalidação de uso

No início e antes de publicar o resultado, foram revalidados: `PRJ-001` em
`IMPLEMENTATION`; `MOD-001` e `VI-001` aptos a iniciar `IMPLEMENTING`; WI-003
em `READY` antes da Execution; `DC-003` existente; WI-002 projetada como
`DONE`; `PBL-PRJ001-R1-v1.0`; `NB-0002`; `DEC-009` corrente/aprovada; TIR v1.0
e TB v0.10 compatíveis; ausência de finding bloqueador incompatível,
cancelamento, retry/recovery ou resultado concorrente. Claim documental
exclusivo: `EX-007`, fencing generation `1`.

`EX-007` terminou `SUCCEEDED` em 2026-09-14T20:09:01-03:00; esta authority não
é reutilizável depois desse terminal.
