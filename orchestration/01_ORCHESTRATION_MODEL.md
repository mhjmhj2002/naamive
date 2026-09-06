# NAAMIVE — Orchestration Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** modelo conceitual de orquestração  
**Deriva de:** Lifecycle, Contracts, State e Runtime Architecture

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** orquestração de trabalho autorizado, continuidade e materialização de Execution

---

# 1. Objetivo

Definir como o NAAMIVE encontra e materializa trabalho sem transformar
orchestrator em authority de negócio.

---

# 2. Regra central

Orchestrator responde:

```text
qual trabalho já autorizado pode ser executado agora?
```

Não responde:

```text
qual decisão de negócio devemos tomar?
```

---

# 3. Inputs

- canonical state;
- eligibility projection;
- continuity;
- authority;
- dependencies;
- gates;
- scheduling constraints.

---

# 4. Outputs

- Execution intent;
- human action task;
- wait;
- recovery task;
- reconciliation task;
- escalation.

---

# 5. No hidden law

Orchestrator não possui lifecycle paralelo.

---

# 6. Eligibility

Só agenda trabalho elegível.

---

# 7. Revalidation

Antes de claim, state deve ser revalidado.

---

# 8. Human work

Decisão humana pode ser orquestrada como action surface, não simulada por agent.

---

# 9. Agent work

Agent work é Execution de Work Item ou atividade governada equivalente.

---

# 10. Concurrency

Orchestrator pode gerar candidatos concorrentes, mas claim/fencing decide
authority operacional.

---

# 11. Restart

Pending work deve sobreviver restart.

---

# 12. Duplicate scheduling

Scheduling repetido não pode duplicar intention.

---

# 13. Backpressure

Arquitetura deve suportar limite de workload.

---

# 14. Priority

Priority pode ordenar, nunca violar dependencies/gates.

---

# 15. Fairness

Recursos não devem ficar starving indefinidamente sem observabilidade/escalation.

---

# 16. Dead-end e Inconsistency detection

Orchestrator deve ajudar a detectar active resource sem continuity. Quando a
detecção representar discrepância governada, deve abrir/vincular a
`Inconsistency` canônica e encaminhar sua continuity/escalation; não deve criar
ticket/log como segunda fonte de verdade.

---

# 17. Invariants

```text
no business decision by scheduler
no schedule without eligibility
no duplicate intention
restart-safe
```

---

# 18. Princípio final

Orchestration move trabalho autorizado.

Governança decide o que pode ser autorizado.
