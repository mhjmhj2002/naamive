# NAAMIVE — Continuity and Recovery Contract / NB-0002 Reconciliation

**Status:** BRAINSTORM — R2-02b APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Finding discovery must materialize continuity

Agent que encontra impedimento não pode apenas retornar erro textual.

Após persistência/classificação, deve existir continuity compatível.

---

# 2. NON_BLOCKING continuity

Quando o Finding não bloqueia o affected scope:

```text
AUTOMATIC_WORK
```

pode continuar para trabalho elegível.

A remediation permanece no Development Roadmap.

---

# 3. BLOCKING continuity

Quando bloqueia:

```text
GOVERNED_BLOCK
```

deve conter:

```text
cause_ref = Finding
affected resource
owner
exit condition
fallback
escalation
cadence/deadline quando aplicável
Business Baseline
normative_baseline_ref
```

---

# 4. Roadmap as continuity context

Development Roadmap pode ser referência contextual para:

```text
next eligible work
pending remediation
dependency waits
decision requests
recovery/reconciliation
```

Mas não substitui o Continuity record normativo.

---

# 5. Fail-closed sem abandono

Fail-closed continua obrigatório.

Nova regra de implementação:

```text
stop affected operation
!=
forget roadmap
```

Mesmo quando nenhuma ação pode continuar agora, o sistema deve preservar rota de
retomada.

---

# 6. Supervisor

Roadmap Supervisor deve detectar:

```text
active resource sem continuity
blocking Finding sem GOVERNED_BLOCK
remediation sem owner/exit condition quando exigida
roadmap sem next action apesar de trabalho potencial
```

Discrepância material abre/vincula `Inconsistency`.

---

# 7. Consolidação

Este delta deve ser incorporado à revisão final de
`contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md`.
