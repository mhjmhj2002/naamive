# NAAMIVE — CONCEPTION Activity Center Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  

---

# 1. Objetivo

Definir a superfície humana de acompanhamento da fase `Project.CONCEPTION`.

---

# 2. Deve mostrar

```text
Project macro phase
current internal step
completed/pending steps
open decisions
findings
blocking/non-blocking status
continuity
last functional progress
Conception Baseline identity
```

---

# 3. Open decision surface

Exemplo:

```text
D-17
Orçamento será total ou por categoria?
MATERIAL
NON_BLOCKING agora
bloqueia BOUND_SCOPE completion

Owner: Product
Next action: decision review
```

---

# 4. Não esconder pendência

Questão `NON_BLOCKING` que atravessa para ARCHITECTURE deve permanecer visível
até disposição governada.

---

# 5. Readiness surface

Antes de `CONCEPTION → ARCHITECTURE`, mostrar:

```text
outcome defined
scope understood
journeys understood
capabilities identified
success criteria ready
blocking findings treated
open questions classified
review/audit status
baseline identity
continuity
```

---

# 6. Invariantes

```text
UI renders projection
open question remains visible
internal step != Project state
baseline identity visible
browser not source of phase continuity
```
