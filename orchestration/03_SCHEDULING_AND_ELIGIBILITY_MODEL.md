# NAAMIVE — Scheduling and Eligibility Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.2  
**Autoridade:** modelo de elegibilidade e agendamento  
**Deriva de:** Work Item, Execution, Continuity e Orchestration

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** elegibilidade derivada, scheduling, prioridade, concorrência e revalidação

---

# 1. Objetivo

Definir quando trabalho pode competir por execução.

---

# 2. Eligibility

Eligibility é predicado derivado.

Não é estado de negócio adicional.

---

# 3. Work Item eligibility

Requer, conforme aplicável:

- state READY/IN_PROGRESS compatível;
- baseline current;
- dependencies satisfied;
- no incompatible blocker;
- authority valid;
- no cancellation;
- retry/recovery allowed;
- no authoritative result already final.

---

# 4. Execution eligibility

Execution CREATED torna-se ELIGIBLE apenas após revalidation.

---

# 5. Scheduling

Scheduler escolhe entre eligible candidates.

---

# 6. Priority

Priority não cria eligibility.

---

# 7. Concurrency limit

Pode existir por Project, agent, external API ou resource.

---

# 8. Dependency release

Mudança de dependency deve recomputar eligibility.

---

# 9. Baseline invalidation

Descendant perde eligibility imediatamente quando baseline governante é
revogado.

---

# 10. Human eligibility

Ação humana só é elegível quando principal/authority existem.

---

# 11. Wait

Wait não vira polling frenético por padrão.

Cadence deriva da natureza da condição.

---

# 12. Retry schedule

Backoff é policy futura.

Retry não pode ultrapassar uma vez por intenção lógica sem attempt lineage.

---

# 13. Starvation

Work eligible não executado por tempo excessivo deve ser observável.

---

# 14. Duplicate candidates

Dedup por intention.

---

# 15. Invariants

```text
priority != authority
READY local != globally eligible
stale baseline => ineligible
cancelled => ineligible
```

---

# 16. Princípio final

Scheduler escolhe quando executar.

Eligibility decide se pode executar.
