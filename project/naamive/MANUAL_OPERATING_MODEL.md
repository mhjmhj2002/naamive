# Manual Operating Model

**Status:** ACTIVE FOR SELF-HOSTED BUILD

Enquanto o NAAMIVE não automatiza o próprio processo, este arquivo define como
vamos operar manualmente.

---

# 1. Uma entidade, um estado explícito

Nunca inferir estado a partir de conversa, arquivo existente ou código.

Se um estado muda, registrar a mudança no artefato correspondente.

---

# 2. Sem promoção implícita

Exemplos proibidos:

```text
arquivo criado → automaticamente READY
código compilou → automaticamente DONE
teste passou → automaticamente DELIVERED
commit/push → automaticamente APPROVED
agente terminou → automaticamente VALIDATED
```

Cada transição depende do gate adequado.

---

# 3. Agentes ajudam; não são autoridade final

Agentes podem:

```text
analisar
propor
implementar
testar
auditar
levantar Finding
produzir evidência
```

Agentes não podem, por conta própria:

```text
aprovar Entrega de Valor
promover estado governado
declarar Delivery
alterar NB-0002
alterar Technology Baseline congelada
resolver gap normativo silenciosamente
```

---

# 4. Um agente por Work Item

Quando a implementação começar:

```text
1 Work Item
→ 1 contexto/agente de implementação
→ entrega de evidência
→ contexto/agente separado para auditoria quando aplicável
```

Evitar reaproveitar um contexto longo para vários Work Items não relacionados.

---

# 5. Gap protocol

Ao detectar um gap real:

```text
DETECT
→ RECORD FINDING
→ SCOPE IMPACT
→ STOP AFFECTED SCOPE
→ RESOLVE AT CORRECT AUTHORITY LEVEL
→ VERIFY
→ RECORD RESOLUTION
→ RESUME
```

Não contornar a regra só para continuar desenvolvendo.

---

# 6. Escopo do bloqueio

Um Finding não congela o projeto inteiro automaticamente.

Bloqueia:

```text
o Work Item
a Entrega de Valor
o Module
ou o Project
```

somente conforme o impacto real.

Finding CRÍTICA pode exigir bloqueio mais amplo.

---

# 7. Verdade factual

Progress, Activity e Timeline registram fatos.

Proibido:

```text
fake progress
eternal spinner equivalent
"quase pronto" sem evidência
"done" porque o agente disse
```

---

# 8. Desenvolvimento começa somente com Work Item READY

Fluxo manual:

```text
PROPOSED
→ READY
→ Development Cycle created
→ IN_PROGRESS
→ IN_REVIEW
→ DONE
```

Se houver rework depois da review:

```text
novo Development Cycle
```

Não ressuscitar Development Cycle encerrado.

---

# 9. Execution é tentativa concreta

Execution não é sinônimo de Work Item.

Uma nova tentativa, retry ou recovery cria uma nova Execution causal quando
aplicável.

---

# 10. Delivery é fato de negócio

Código no branch, merge, container ou deploy não significa Delivery.

Delivery só ocorre quando os critérios da Entrega de Valor e da validação
governada forem satisfeitos.


---

# 11. Independent Codex audit before final approval

For the current manual self-hosted process:

```text
candidate planning/result
→ independent Codex audit
→ findings
→ remediation
→ re-audit if necessary
→ PASS
→ human approval
```

No final approval is valid before the independent audit passes.

Human approval remains the authority decision; Codex audit is evidence/gate and
does not replace human authority.


---

# 12. Planning baseline and audit identity

Every material planning audit must name the exact planning baseline and the
author/auditor principals. For the current remediation candidate:

```text
baseline........ PBL-PRJ001-R1-v0.5
author.......... agent:chatgpt:naamive-planning-r1-v0.5
next auditor.... agent:codex:naamive-independent-audit
human authority. human:manuel-hinojosa:project-owner
```

A new Codex chat with the same Codex principal is not used to pretend that the
auditor differs from itself. Independence here is between the planning producer
principal (ChatGPT) and the audit principal (Codex). The manual phase records
this segregation and its local-attestation limitation explicitly.

# 13. No state repair by silent edit

If an earlier manual file claimed a state without valid transition evidence, do
not manufacture a transition after the fact. Record a reconciliation that marks
the previous claim invalid, restore the last provable state, and submit the
intended transition as an audited approval candidate.
