# NAAMIVE — Phase Cycle Plan / CONCEPTION Reconciliation

**Status:** BRAINSTORM — R2-03 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working reconciliation of generic Phase Cycle Plan with CONCEPTION  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Aplicar o mecanismo genérico de Phase Cycle Plan à fase `Project.CONCEPTION`.

---

# 2. Requisitos

O plano deve ser:

```text
durable
versioned
restart-safe
reconstructable
explainable
```

e deve representar:

```text
planned steps
current step
completed steps
open decisions
findings
waits
blockers
continuity
material plan changes
```

---

# 3. Não é checklist descartável

Não pode existir apenas em:

```text
agent prompt
chat
frontend state
temporary worker memory
```

---

# 4. Relação com fatos canônicos

Phase Cycle Plan referencia:

```text
Decision
Finding
Evidence
Review
Audit
Continuity
Business Baseline
```

Não duplica o lifecycle desses recursos.

---

# 5. Mudança material

Mudança de:

```text
scope
required journey
required capability
success criteria
material decision path
```

deve produzir version/history suficiente.

---

# 6. Supervisão

O backend/worker deve conseguir detectar:

```text
phase active without next step
blocking decision without continuity
step stale too long
plan current but baseline stale
all steps done but readiness not decided
```

Browser não é supervisor.
