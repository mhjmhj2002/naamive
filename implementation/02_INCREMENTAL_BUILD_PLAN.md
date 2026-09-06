# NAAMIVE — Incremental Build Plan

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.2  
**Autoridade:** plano de construção incremental  
**Deriva de:** Implementation Readiness

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** ordem e critérios da construção vertical incremental do reboot

---

# 1. Objetivo

Construir o reboot em fatias pequenas, prováveis e auditáveis.

---

# 2. Regra

```text
uma fatia vertical de cada vez
```

Cada fatia deve atravessar:

```text
state
persistence
transition
authority
projection
API
UI/agent
tests
observability
recovery
```

---

# 3. Ordem inicial recomendada

1. infraestrutura mínima de canonical state/history;
2. Need CAPTURED;
3. CAPTURED → QUALIFYING;
4. QUALIFYING → IN_DISCOVERY;
5. WAITING;
6. READY_FOR_COMMITMENT;
7. ACCEPTED + handoff Need → Project;
8. Project CONCEPTION;
9. seguir transition por transition.

---

# 4. Não construir tudo horizontalmente

Evitar:

```text
todas tabelas
depois todas APIs
depois todas UIs
```

sem prova de fluxo real.

---

# 5. Slice Definition of Done

Cada slice precisa:

- automatic tests;
- concurrency tests quando aplicável;
- restart test;
- manual proof quando human surface;
- audit local;
- observability;
- no dead-end.

---

# 6. Human proof

Toda nova human decision surface deve ser validada manualmente.

---

# 7. Recovery proof

Toda slice com effect/handoff deve provar failure path.

---

# 8. Baseline

Cada milestone gera baseline certificada.

---

# 9. No silent scope expansion

Nova decisão material volta para docs antes do código.

---

# 10. Princípio final

Cada transition entregue deve ser pequena o bastante para explicar e forte o
bastante para confiar.
