# NAAMIVE — Test and Certification Strategy

**Status:** RATIFIED  **Versão:** 0.2  
**Autoridade:** estratégia de prova da implementação  
**Deriva de:** Lifecycles, Contracts e Build Plan

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** estratégia de testes, provas, concorrência, restart, E2E e certificação

---

# 1. Objetivo

Definir como provar que código implementa lei.

---

# 2. Test layers

```text
unit
contract
state-machine
property
integration
concurrency
crash/restart
security
projection
E2E
manual certification
```

---

# 3. State-machine tests

Cada lifecycle transition deve possuir:

- valid path;
- invalid path;
- terminal behavior;
- return;
- blocker;
- cancellation.

---

# 4. Contract tests

Transition, Handoff, Authority, Evidence e Continuity contracts devem ser
testados diretamente.

---

# 5. Property tests

Propriedades úteis:

```text
terminal never reopens
same intent never duplicates effect
stale writer never wins
active resource always has continuity
```

---

# 6. Concurrency tests

Testar:

- double click;
- duplicate message;
- two workers;
- accept vs cancel;
- recovery vs late result.

---

# 7. Crash tests

Simular crash em boundaries críticos.

---

# 8. Restart tests

Após restart, pending work/handoff deve retomar corretamente.

---

# 9. Projection tests

Projection deve ser completa/correta/rebuildable.

---

# 10. Security tests

Authority, revocation, scope, human-vs-agent.

---

# 11. E2E

E2E deve provar journey real, não só endpoint.

---

# 12. Manual certification

Human gates e UI journeys exigem prova manual antes de baseline certificada.

---

# 13. Known failures

Teste known-failing só pode existir com finding explícito e prazo.

---

# 14. No greenwashing

Não ajustar teste apenas para combinar com bug.

---

# 15. Certification

Milestone só é certificada quando:

- suite relevante green;
- manual proof complete;
- no P0/P1;
- findings tratados;
- docs/code aligned.

---

# 16. Princípio final

Teste não serve para aumentar número verde.

Serve para provar invariantes.
