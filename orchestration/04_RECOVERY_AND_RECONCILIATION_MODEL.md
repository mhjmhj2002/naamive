# NAAMIVE — Recovery and Reconciliation Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo arquitetural de recovery e reconciliation  
**Deriva de:** Continuity Contract e Execution Lifecycle

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** recovery, reconciliation, compensation, effect certainty e inconsistências operacionais

---

# 1. Objetivo

Transformar os conceitos normativos de failure, recovery e reconciliation em
responsabilidades arquiteturais claras.

---

# 2. Recovery

Recovery cria nova tentativa causal após falha conhecida.

---

# 3. Reconciliation

Reconciliation descobre o fato real quando outcome é incerto.

---

# 4. Compensation

Compensation cria novo efeito para neutralizar/mitigar efeito anterior.

---

# 5. Failure classifier

Runtime deve classificar:

- transient;
- deterministic;
- authority;
- stale;
- unknown-effect;
- dependency;
- external-system;
- invariant violation.

---

# 6. Recovery eligibility

Antes de recovery:

- current state;
- baseline;
- authority;
- cause;
- effect certainty;
- policy;
- dependencies;

devem ser revalidados.

---

# 7. No resurrection

FAILED attempt permanece FAILED.

---

# 8. Unknown effect

Vai para reconciliation.

---

# 9. Reconciliation adapters

Sistemas externos devem oferecer, quando possível, modo de consultar efeito por
correlation/idempotency key.

---

# 10. Canonical Inconsistency

Toda discrepância material tratada por recovery/reconciliation deve referenciar
uma `Inconsistency` canônica definida pelo State Model. Orchestration não cria uma
segunda semântica de inconsistência.

O runtime pode detectar/abrir a entidade, mas seu registro canônico preserva:
identity, type/class, affected resource, `cause_ref`, Business Baseline,
`normative_baseline_ref`, owner/status, causation/correlation, evidence,
treatment, continuity/escalation e closure history.

Reconciliation, Recovery e Compensation são treatments vinculados à entidade;
não substituem a discrepância.

---

# 11. Reconciliation owner

Toda reconciliation possui owner e deadline/cadence.

---

# 12. Recovery limit

Não existe retry/recovery infinito.

---

# 13. Escalation

Quando automação não consegue provar outcome, escalar.

---

# 14. Cancellation interaction

Cancelamento pode mudar recovery para reconciliation/compensation.

---

# 15. Stale results

Nunca promovem state.

---

# 16. Invariants

```text
failed attempt immutable
unknown effect reconciled
recovery current-context validated
canonical inconsistency durable
```

---

# 17. Princípio final

Recovery continua uma intenção conhecida.

Reconciliation descobre se ainda existe algo seguro a continuar.
