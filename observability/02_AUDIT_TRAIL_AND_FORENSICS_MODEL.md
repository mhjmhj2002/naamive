# NAAMIVE — Audit Trail and Forensics Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo arquitetural de trilha e investigação  
**Deriva de:** Governance, Evidence Contract e Persistence

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** audit trail, causalidade, normative context, efeitos externos e investigação forense

---

# 1. Objetivo

Permitir reconstrução confiável de decisões e efeitos.

---

# 2. Questions

A trilha deve responder:

```text
quem?
o quê?
quando?
por quê?
com qual authority?
sobre qual Business Baseline?
sob qual normative_baseline_ref?
qual regra específica governou quando relevante?
qual evidence?
qual efeito?
qual resultado?
```

---

# 3. Records

Incluem:

- transitions;
- commands;
- decisions;
- authority use;
- delegation/revocation;
- reviews/audits;
- findings;
- risk acceptance;
- exceptions;
- handoffs;
- executions;
- external effects;
- recovery/reconciliation;
- Inconsistency opening/treatment/closure;
- normative baseline migration.

---

# 4. Immutability

Audit trail não deve ser editada em place.

---

# 5. Clock

Timestamps devem ter referência temporal consistente.

---

# 6. Principal

Cada ação material deve possuir principal.

---

# 7. Correlation

Incidente deve ser navegável ponta a ponta.

---

# 8. External effects

Registrar identifiers suficientes para reconciliation.

---

# 9. Data access

Acesso à trilha pode ser protegido por authority.

---

# 10. Retention

Retenção deve preservar requirements de auditoria.

---

# 11. Forensic snapshot

Para incidentes, deve ser possível capturar estado, versions, lineage, Business
Baseline e `normative_baseline_ref` sem alterá-los.

---

# 12. Invariants

```text
material decision traceable
history immutable
external effect correlated
```

---

# 13. Princípio final

Forensics não deve depender de memória humana ou print perdido.
