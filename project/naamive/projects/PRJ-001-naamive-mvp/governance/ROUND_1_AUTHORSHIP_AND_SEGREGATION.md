# Round 1 — Authorship and Audit Segregation

**business_baseline_ref:** PBL-PRJ001-R1-v1.0  
**normative_baseline_ref:** NB-0002

## Produtor da candidata sucessora

```text
principal_id: agent:codex:naamive-aud9-remediation
principal_type: AGENT
role: remediation author
provider/context: Codex remediation conversation
approval authority: NONE
independent audit authority: NONE for its own output
```

## Independent audit principal

```text
principal_id: agent:codex:naamive-independent-audit
principal_type: AGENT
role: independent destructive auditor
provider/context: Codex Agent chat, separado do contexto de remediação
write scope: audit report only
approval authority: NONE
```

AUD-001, AUD-002 and AUD-003 were produced by Codex contexts and are retained as evidence.
AUD-007, AUD-008 e AUD-009 são evidência histórica independente. AUD-010 deve ser
produzido por `agent:codex:naamive-independent-audit`, distinto do produtor da
v1.0.

## Human authority

```text
principal_id: human:manuel-hinojosa:project-owner
principal_type: HUMAN
role: final gate authority after valid audit PASS
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
criptográfica da identidade SaaS. O auditor deve registrar essa limitação.

Essa limitação não autoriza autoauditoria: se o auditor não puder estabelecer
principal distinto de `agent:codex:naamive-aud9-remediation`, deve falhar em
modo fechado.

AUD-004 is retained as independent historical evidence.
