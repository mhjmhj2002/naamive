# PRJ-001 — Planning Round 1 — AUD-010 Reaudit Request

**Status:** READY FOR REAUDIT  
**Audit object:** ROUND-1-APPROVAL-CANDIDATE  
**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002  
**Remediation author principal:** agent:codex:naamive-aud9-remediation  
**Required independent auditor principal:** agent:codex:naamive-independent-audit  
**Human approval:** NOT GRANTED  
**Implementation:** NOT AUTHORIZED

Verificar manifesto e certificado antes de análise: ID, NB, predecessor,
`created_at`, contagem, SHA-256 e tamanho de cada membro. A auditoria só pode
aceitar um pacote cujo `created_at` seja anterior ao seu próprio timestamp.

Preservar AUD-001..AUD-009 como histórico e verificar:

```text
AUD7-001 / FND-008: todos os membros declarados no manifesto v1.0 conferem em hash e tamanho
AUD9-001 / FND-011: os 24 objetos de `BASELINE_REVALIDATION_AUD009.md` possuem record por objeto com source/target, decisão, autoridade, evidence e resultado candidato; cada alvo declara v1.0
AUD9-001 / FND-011: nenhuma instrução ativa oferece baseline ou autoria alternativa à candidata v1.0
AUD7-003 / FND-010: a criação do pacote é anterior à AUD-010 e está coerente em baseline, manifesto e certificado
FND-003 permanece SUPERSEDED, sem blocker ou rota ativa para AUD-005
CONT-PRJ001-010 e todas as projeções apontam somente para AUD-010
DEC-005/AUD3-001 permanece resolvido no snapshot exato
nenhuma promoção ou autorização ocorreu
```

Executar regressão destrutiva de todos os findings e buscar novos blockers.
Registrar auditor, autor, independência, escopo, baseline, manifesto,
evidências, resultado, limitações e timestamp. Usar `PASS`,
`PASS WITH NON-BLOCKING FINDINGS` ou `FAIL`; blocker implica FAIL. PASS não
aprova nem promove estado. Criar somente `audits/AUD-010_PLANNING_ROUND_1_CODEX.md`.
