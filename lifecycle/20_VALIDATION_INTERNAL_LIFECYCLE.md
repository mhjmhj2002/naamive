# NAAMIVE — VALIDATION Internal Lifecycle

**Status:** BRAINSTORM — R2-06 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir a validação global do resultado integrado do Project contra o compromisso
e critérios da candidatura.

Project.VALIDATION não substitui:

```text
Work Item review
ValueIncrement validation/acceptance
Module validation/integration
```

É a camada global/E2E.

---

# 2. Lifecycle interno

```text
RECEIVE_IMPLEMENTATION_CANDIDATE
→ FREEZE_VALIDATION_CONTEXT
→ VERIFY_TARGET_COVERAGE
→ VERIFY_MODULE_COHERENCE
→ EXECUTE_CROSS_MODULE_VALIDATION
→ VALIDATE_END_TO_END_JOURNEYS
→ VALIDATE_NON_FUNCTIONAL_REQUIREMENTS
→ CONSOLIDATE_EVIDENCE
→ ASSESS_FINDINGS_AND_RISKS
→ DETERMINE_REWORK_SCOPE
→ VERIFY_VALIDATION_COMPLETENESS
→ FIX_VALIDATION_BASELINE
→ READY_FOR_DELIVERY
```

---

# 3. FREEZE_VALIDATION_CONTEXT

Validation precisa de contexto identificável:

```text
Delivery Target/version
candidate Business Baseline
participating Modules/versions
participating ValueIncrements
included optional set
transversal work
normative_baseline_ref
```

A baseline deve permanecer estável durante a evidência relevante.

---

# 4. Baseline drift

Se baseline mudar:

```text
existing evidence
→ classify KEEP / REVALIDATE / SUPERSEDE / REVOKE / RECONCILE
```

Evidência não continua válida por inércia.

---

# 5. VERIFY_TARGET_COVERAGE

Verifica:

```text
all REQUIRED_FOR_TARGET obligations resolved
included OPTIONAL explicitly identified
OUT_OF_TARGET excluded from candidate
target version exact
candidate scope coherent
```

---

# 6. VERIFY_MODULE_COHERENCE

Confirma que Modules participantes estão coerentes para validação global.

`Module.INTEGRATED` é fato local/hierárquico.

Não prova automaticamente que o Project funciona globalmente.

---

# 7. EXECUTE_CROSS_MODULE_VALIDATION

Valida interações entre capacidades.

Exemplo:

```text
Movimentação registrada
→ orçamento realizado atualizado
→ dashboard reflete resultado correto
```

---

# 8. VALIDATE_END_TO_END_JOURNEYS

Testa jornadas e critérios globais originados da Conception/Planning Baselines.

---

# 9. VALIDATE_NON_FUNCTIONAL_REQUIREMENTS

Conforme aplicável:

```text
security
privacy
performance
resilience
operability
observability
accessibility
compatibility
```

---

# 10. CONSOLIDATE_EVIDENCE

Evidence package deve ser baseline-specific e rastreável.

---

# 11. ASSESS_FINDINGS_AND_RISKS

Finding deve indicar affected scope.

Regra:

```text
finding discovered
!=
reopen terminal history
```

---

# 12. DETERMINE_REWORK_SCOPE

Falha global deve ser enviada ao nível correto:

```text
local implementation defect
→ IMPLEMENTATION / new rework work

planning defect
→ PLANNING

architecture defect
→ ARCHITECTURE

product/conception defect
→ CONCEPTION
```

---

# 13. Terminal entities do not reopen

`ValueIncrement.ACCEPTED` não reabre.

Se correção material posterior for necessária:

```text
create successor/rework ValueIncrement
```

`Module.INTEGRATED` também não reabre.

Se mudança material afetar Module terminal:

```text
create successor Module
```

conforme lifecycle/succession rules.

---

# 14. VERIFY_VALIDATION_COMPLETENESS

Requer, conforme aplicável:

```text
global success criteria satisfied
target coverage valid
E2E journeys validated
non-functional requirements treated
evidence sufficient
blocking findings treated
risks known
candidate baseline stable
continuity toward DELIVERY
```

---

# 15. Validation Baseline

A fase fixa baseline/evidence context identificável.

Nome humano candidato:

```text
Validation Baseline
```

Pode ser composição da candidate Business Baseline + evidence coverage.

Não exige entidade física específica.

---

# 16. READY_FOR_DELIVERY

Step interno, não Project state.

Significa que:

```text
Project.VALIDATION internal cycle
is ready for governed transition to DELIVERY
```

Não significa Delivery aceita.

---

# 17. Returns

VALIDATION pode retornar para:

```text
IMPLEMENTATION
PLANNING
ARCHITECTURE
CONCEPTION
```

conforme causa governada.

Nada terminal é reaberto silenciosamente.

---

# 18. Activity Center

Deve mostrar:

```text
candidate baseline
target/version
coverage
E2E progress
non-functional progress
evidence completeness
findings/risks
rework destination
last functional progress
continuity
```

---

# 19. Invariantes

```text
Project validation is global/E2E
local acceptance does not substitute global validation
baseline drift forces evidence classification
accepted EV never reopens
integrated Module never reopens
rework returns to correct governing level
READY_FOR_DELIVERY is internal
```

---

# 20. Status

```text
R2-06 VALIDATION Internal Lifecycle
CLOSED — working decision

NEXT
R2-07 DELIVERY Internal Lifecycle
```
