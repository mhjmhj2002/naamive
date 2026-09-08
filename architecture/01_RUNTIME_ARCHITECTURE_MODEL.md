# NAAMIVE — Runtime Architecture Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo arquitetural do runtime  
**Deriva de:** State, Contracts e Governance

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** fronteiras conceituais e responsabilidades do runtime do NAAMIVE

---

# 1. Objetivo

Definir componentes e responsabilidades do runtime sem escolher tecnologia
definitiva.

---

# 2. Princípio

Runtime implementa leis.

Runtime não cria leis.

---

# 3. Componentes conceituais

```text
Command Boundary
Canonical State Service
Governance/Policy Evaluator
Transition Engine
Handoff Manager
Projection Builder
Orchestrator
Execution Workers / Agents
Recovery/Reconciliation Manager
Evidence/Audit Store
Observability
External Adapters
```

---

# 4. Command Boundary

Recebe intenção.

Não altera state diretamente.

---

# 5. Canonical State Service

Fornece verdade atual e versões.

---

# 6. Governance Evaluator

Resolve authority, gates, findings e risk requirements.

---

# 7. Transition Engine

Aplica Transition Contract.

---

# 8. Handoff Manager

Garante transferência durável de responsabilidade.

---

# 9. Projection Builder

Deriva read models.

---

# 10. Orchestrator

Descobre trabalho elegível.

Não decide business law por conta própria.

---

# 11. Workers/Agents

Executam Executions autorizadas.

---

# 12. Recovery Manager

Trata failure lineage e retry seguro.

---

# 13. Reconciliation Manager

Resolve effect uncertainty.

---

# 14. Evidence/Audit

Preserva proofs e reviews.

---

# 15. External Adapters

Isolam sistemas externos.

---

# 16. Component boundaries

Cada componente deve ter responsabilidade pequena e verificável.

---

# 17. No hidden state

Nenhum componente pode manter business state autoritativo apenas em memória.

---

# 18. Restart safety

Runtime deve sobreviver restart sem perder:

- handoff;
- continuity;
- claim semantics;
- recovery;
- pending decisions.

---

# 19. Horizontal scale

Arquitetura deve permitir múltiplas instâncias sem dupla authority.

---

# 20. Worker independence

Worker pode morrer sem corromper lifecycle.

---

# 21. Policy evaluation

Decision rules devem ser centralmente deriváveis, não duplicadas em UI/worker.

---

# 22. External side effects

Devem atravessar adapter com idempotency/reconciliation strategy.

---

# 23. Synchronous vs asynchronous

A escolha pode variar por operação.

A semântica de handoff e continuity permanece igual.

---

# 24. Deployment topology

Não é fixada aqui.

---

# 25. Monolith vs services

MVP pode ser monolítico.

Fronteiras conceituais devem permanecer claras.

---

# 26. Invariants

```text
one canonical truth
no direct state bypass
orchestrator not business authority
worker not business authority
restart-safe handoffs
```

---

# 27. Princípio final

Arquitetura deve tornar as regras difíceis de violar, não apenas bem
documentadas.
