# NAAMIVE — ARCHITECTURE Activity Center Model

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Deve mostrar

```text
Project.ARCHITECTURE
current internal step
Module map
Module lifecycle status
open decisions
dependencies
findings
Technology Baseline progress
Architecture Baseline identity
last functional progress
continuity
```

---

# 2. Module map

Exemplo:

```text
Acesso e Identidade........ DEFINED
Movimentações.............. DEFINED
Orçamento Familiar......... DEFINED
Visão Financeira........... IDENTIFIED
```

Se Module material necessário ao target permanecer `IDENTIFIED`, a UI deve
explicar por quê e mostrar continuity.

---

# 3. Technology Baseline

Mostrar como artefato:

```text
Technology Baseline v0.x
status/readiness
open material decisions
```

Nunca como estado do Project.

---

# 4. Architecture readiness

Surface deve mostrar:

```text
Modules materialmente suficientes
responsibilities known
dependencies known
risks/findings treated
review/audit
Architecture Baseline
Technology Baseline sufficient for planning
continuity
```

---

# 5. Invariantes

```text
UI does not invent Module
Technology Baseline != Project state
open architecture decision visible
baseline identity visible
internal step != macro state
```
