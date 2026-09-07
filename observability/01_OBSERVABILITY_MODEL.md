# NAAMIVE — Observability Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade:** modelo arquitetural de observabilidade  
**Deriva de:** Runtime, Continuity e Execution

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-06T22:09:34-03:00  
**Vigência:** IN FORCE — desde 2026-09-06T22:09:34-03:00  
**Normative Baseline:** `NB-0001`  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** sinais de lifecycle, continuity, execution, handoff, projection conformance e governança

---

# 1. Objetivo

Definir sinais necessários para detectar falha, dead-end, atraso e inconsistência.

---

# 2. Signals

```text
logs
metrics
traces
lifecycle health
continuity health
execution health
projection lag
projection semantic conformance
inconsistency backlog
reconciliation backlog
```

---

# 3. Lifecycle health

Métricas devem permitir contar recursos:

- por state;
- blocked;
- paused;
- waiting;
- no continuity;
- stale too long.

---

# 4. Execution health

- running age;
- failed count;
- retry count;
- stale result attempts;
- lease/claim expiry;
- recovery rate.

---

# 5. Continuity health

Detectar active resource sem actionable continuation e continuity cuja
`cause_ref` não possa ser resolvida. A discrepância deve abrir/vincular
Inconsistency canônica e possuir owner/escalation.

---

# 6. Handoff health

- pending age;
- retry;
- lost/uncertain handoff;
- acceptance latency.

---

# 7. Projection health

- rebuild failures;
- lag;
- stale watermark;
- conformance entre Required Projection Set e projection observada;
- required action/wait/blocker/decision ausente;
- duplicidade;
- contradição;
- ação extra que canonical authority não permite.

Conformance semântico é obrigatório mesmo quando projector está atualizado. Ao
detectar mismatch, o sistema cria/atualiza Inconsistency
`PROJECTION_CONFORMANCE`, emite sinal acionável e preserva escalation até
restabelecer a projeção correta.

---

# 8. Governance health

- pending human gates;
- blockers age;
- exceptions near expiration;
- authorities expiring.

---

# 9. Risk health

- riscos CRÍTICOS abertos;
- expired acceptance;
- mitigation overdue.

---

# 10. Correlation

Logs/traces devem carregar correlation/causation quando material.

---

# 11. Sensitive data

Observability não deve expor secrets.

---

# 12. Alerts

Alertas devem ser acionáveis e, quando representarem discrepancy governada,
referenciar a Inconsistency canônica em vez de substituir seu registro.

---

# 13. SLO/SLA

Valores concretos ficam para Technology/Operations baseline.

---

# 14. Invariants

```text
dead-end detectable
zombie detectable
handoff lag detectable
projection lag detectable
projection semantic omission/duplication/contradiction detectable
material inconsistency durable and observable
```

---

# 15. Princípio final

Se o sistema pode entrar em um estado ruim, deve existir sinal capaz de revelar
isso.
