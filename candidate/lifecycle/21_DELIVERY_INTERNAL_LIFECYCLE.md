# NAAMIVE — DELIVERY Internal Lifecycle

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  

---

# 1. Objetivo

Definir o processo interno da fase `Project.DELIVERY`.

Project.DELIVERY é candidatura governada à aceitação.

Não é deploy técnico.

`Delivery` é o fato terminal aceito.

---

# 2. Lifecycle interno

```text
RECEIVE_VALIDATED_CANDIDATE
→ FREEZE_DELIVERY_CANDIDACY
→ RESOLVE_TARGET_MEMBERSHIP
→ BUILD_DELIVERY_MANIFEST
→ VERIFY_REQUIRED_VALUE
→ RESOLVE_OPTIONAL_INCLUSION
→ CONSOLIDATE_RESIDUAL_FINDINGS_RISKS_EXCEPTIONS
→ VERIFY_OPERATIONAL_READINESS
→ PREPARE_DELIVERY_DECISION
→ READY_FOR_DELIVERY_DECISION
→ DECIDE_DELIVERY
→ MATERIALIZE_DELIVERY
→ CONFIRM_DELIVERY_HANDOFF
```

---

# 3. FREEZE_DELIVERY_CANDIDACY

Candidatura deve identificar exatamente:

```text
Project
DeliveryTarget id/version
validated Business Baseline
Validation Baseline/evidence context
participating Modules
required ValueIncrements
candidate optional ValueIncrements
normative_baseline_ref
```

---

# 4. Delivery Target versus Delivery Manifest

Delivery Target define:

```text
o compromisso / obrigação
```

Delivery Manifest define:

```text
o conjunto efetivamente apresentado nesta candidatura
```

Por isso:

```text
included_in_candidate
```

não deve ser atributo eterno do `DeliveryTargetMembership`.

---

# 5. Delivery Manifest / Candidacy Snapshot

Deve existir snapshot durável e reproduzível da candidatura.

Nome conceitual candidato:

```text
Delivery Manifest
ou
Delivery Candidacy Snapshot
```

Pode conter:

```text
DeliveryTarget version
candidate baseline
all REQUIRED set
included OPTIONAL set
excluded OPTIONAL set
OUT_OF_TARGET set
participating Modules
evidence refs
findings/risks/exceptions
operational readiness
decision context
```

O nome físico não é normativo.

---

# 6. VERIFY_REQUIRED_VALUE

Se qualquer:

```text
REQUIRED_FOR_TARGET
```

não estiver satisfeito/aceito/compatível conforme as regras:

```text
Delivery candidacy is blocked
```

Alternativa é mudança governada de target/scope, nunca omissão silenciosa.

---

# 7. RESOLVE_OPTIONAL_INCLUSION

`OPTIONAL_FOR_TARGET`:

```text
absent
→ does not block

accepted + baseline-compatible
→ may be explicitly included
```

Inclusão precisa ser factual no Delivery Manifest.

---

# 8. OUT_OF_TARGET

`OUT_OF_TARGET`:

```text
does not block current target
cannot be presented as delivered value
```

---

# 9. Residual findings, risks and exceptions

A decisão deve receber visão consolidada de:

```text
findings
accepted risks
exceptions
limitations
operational caveats
```

Exception não apaga finding.

---

# 10. VERIFY_OPERATIONAL_READINESS

Avalia, conforme aplicável:

```text
operability
supportability
migration readiness
security operations
observability readiness
known limitations
rollback/continuity conditions
```

Sem confundir com deploy.

---

# 11. PREPARE_DELIVERY_DECISION

Decision surface deve apresentar:

```text
original Need
Project
DeliveryTarget/version
delivered scope
Delivery Manifest
baseline
Modules
required EVs
included optional EVs
evidence
success criteria
findings
risks
exceptions
limitations
operational readiness
recommendation
authority
```

---

# 12. READY_FOR_DELIVERY_DECISION

Step interno explícito.

Não significa aceite.

---

# 13. DECIDE_DELIVERY

Decisões:

```text
ACCEPT DELIVERY
RETURN TO VALIDATION
RETURN TO IMPLEMENTATION
PAUSE
CANCEL
```

Retornos adicionais para Planning/Architecture/Conception podem ocorrer por
retorno governado quando a causa exigir, sem esconder a causa sob Delivery.

---

# 14. MATERIALIZE_DELIVERY

Após decisão positiva, criar `Delivery` de forma idempotente.

Delivery preserva:

```text
Need ref
Project ref
DeliveryTarget exact version
Delivery Manifest exact snapshot
delivered Business Baseline
Modules
included ValueIncrements + dispositions
evidence
findings/risks/exceptions/limitations
decision
authority
normative_baseline_ref
```

---

# 15. CONFIRM_DELIVERY_HANDOFF

A operação:

```text
positive decision
+ Delivery creation
+ Project → DELIVERED
```

é handoff governado e recuperável.

Falha parcial não pode gerar:

```text
Delivery exists but Project state lost
ou
Project DELIVERED without Delivery fact
```

sem completion/reconciliation.

---

# 16. Terminalidade

`Project.DELIVERED` é terminal.

`Delivery` é fato terminal governado.

Correção/evolução futura:

```text
new Need
→ new governed lifecycle
```

---

# 17. Activity Center

Deve mostrar:

```text
target/version
manifest identity
required coverage
included optional
out-of-target
residual findings/risks/exceptions
operational readiness
decision readiness
handoff/materialization status
```

---

# 18. Invariantes

```text
Delivery phase != deploy
DeliveryTarget = obligation
Delivery Manifest = actual candidacy
included_in_candidate is not eternal membership property
missing REQUIRED blocks
OPTIONAL absence does not block
OUT_OF_TARGET cannot be delivered
Delivery creation is idempotent
positive decision handoff is recoverable
Delivery is terminal fact
```
