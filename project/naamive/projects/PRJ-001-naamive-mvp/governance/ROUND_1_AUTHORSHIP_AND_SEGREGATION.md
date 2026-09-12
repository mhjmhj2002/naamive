# Round 1 — Authorship and Audit Segregation

**business_baseline_ref:** PBL-PRJ001-R1-v0.5  
**normative_baseline_ref:** NB-0002

## Planning producer

```text
principal_id: agent:chatgpt:naamive-planning-r1-v0.5
principal_type: AGENT
role: planning/remediation author
provider/context: ChatGPT planning conversation
approval authority: NONE
independent audit authority: NONE for its own output
```

## Independent audit principal

```text
principal_id: agent:codex:naamive-independent-audit
principal_type: AGENT
role: independent destructive auditor
provider/context: Codex Agent chat, separate from ChatGPT planning producer
write scope: audit report only
approval authority: NONE
```

AUD-001, AUD-002 and AUD-003 were produced by Codex contexts and are retained as evidence.
AUD-005 must be produced through the Codex audit principal/context, not by
the planning producer.

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

The manual local phase can record principal identities and the operator-observed
separate ChatGPT/Codex contexts, but does not provide cryptographic attestation
of SaaS account identity. The auditor must record this limitation explicitly.

That limitation does not authorize self-audit: if the auditor cannot establish a
principal distinct from `agent:chatgpt:naamive-planning-r1-v0.5`, it must FAIL closed.

AUD-004 is retained as independent historical evidence.
