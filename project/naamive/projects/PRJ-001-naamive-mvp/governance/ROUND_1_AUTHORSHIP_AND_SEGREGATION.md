# Round 1 — Authorship and Audit Segregation (Historical)

**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002

**Planning Round 1:** COMPLETE
**Audit phase:** CLOSED BY HUMAN DECISION
**Last valid audit:** AUD-009

## Produtor da remediação v1.0

```text
principal_id: agent:codex:naamive-aud9-remediation
principal_type: AGENT
role: remediation author
provider/context: Codex remediation conversation
approval authority: NONE
independent audit authority: NONE for its own output
```

## Segregação histórica de auditoria

```text
principal_id: agent:codex:naamive-independent-audit
principal_type: AGENT
role: independent destructive auditor
provider/context: Codex Agent chat, separado do contexto de remediação
write scope: audit report only
approval authority: NONE
```

AUD-001, AUD-002 and AUD-003 were produced by Codex contexts and are retained as evidence.
AUD-007, AUD-008 e AUD-009 são evidência histórica independente. Não existe
auditoria futura planejada nesta rodada.

## Human authority

```text
principal_id: human:manuel-hinojosa:project-owner
principal_type: HUMAN
role: authority for the final audit-phase closure decision
```

## Segregation rule

```text
planning producer != independent auditor
independent auditor != human approval authority
PASS != approval
```

## Verification and limitation

O processo local manual pode registrar identidades de principal e contextos de
remediação/auditoria observados pelo operador, mas não fornece atestação
criptográfica da identidade SaaS. A limitação é preservada como contexto
histórico.

Essa limitação não autoriza autoauditoria em futuras atividades que venham a
ser explicitamente autorizadas.

AUD-004 is retained as independent historical evidence.
