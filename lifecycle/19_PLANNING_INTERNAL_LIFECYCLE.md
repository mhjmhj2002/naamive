# NAAMIVE — PLANNING Internal Lifecycle

**Status:** BRAINSTORM — R2-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Autoridade:** candidato a lifecycle interno da fase `Project.PLANNING`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Transformar Conception/Architecture Baselines em plano executável suficiente para
iniciar implementação sem obrigar implementadores a inventar decisões materiais.

PLANNING responde:

```text
o que precisa ser feito,
em que ordem,
para qual Delivery Target,
e sob quais condições?
```

---

# 2. Entrada

```text
Conception Baseline
Architecture Baseline
Modules
Technology Baseline state/readiness
classified open questions
risks/findings
continuity
normative_baseline_ref
```

---

# 3. Lifecycle interno

```text
RECEIVE_ARCHITECTURE_BASELINE
→ ESTABLISH_DELIVERY_TARGET
→ PLAN_MODULE_DELIVERY
→ DECOMPOSE_MODULES_INTO_VALUE_INCREMENTS
→ CHALLENGE_VALUE_DECOMPOSITION
→ DEFINE_VALUE_INCREMENT_DEPENDENCIES
→ ORDER_VALUE_DELIVERY
→ DETAIL_NEAR_TERM_WORK
→ PLAN_TRANSVERSAL_WORK
→ DEFINE_VALIDATION_STRATEGY
→ DEFINE_INTEGRATION_STRATEGY
→ RESOLVE_PLANNING_DECISIONS
→ VERIFY_TECHNOLOGY_READINESS
→ FIX_PLANNING_BASELINE
→ VERIFY_IMPLEMENTATION_READINESS
→ READY_FOR_IMPLEMENTATION
```

---

# 4. ESTABLISH_DELIVERY_TARGET

PLANNING deve possuir Delivery Target formal, governado e versionado.

O target define o compromisso da candidatura corrente.

Cada ValueIncrement relevante possui membership por target/version:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Disposition não é atributo eterno da ValueIncrement.

---

# 5. PLAN_MODULE_DELIVERY

Modules necessários ao target devem estar suficientemente definidos para planejar.

Module material requerido que permaneça apenas `IDENTIFIED` exige justificativa
governada; normalmente deve chegar a PLANNING como `DEFINED`.

---

# 6. DECOMPOSE_MODULES_INTO_VALUE_INCREMENTS

Fluxo normal de Module:

```text
Module
→ ValueIncrement
→ Work Item
```

Module não salta diretamente para Work Items executáveis no caminho normal.

Cada ValueIncrement deve representar valor finito, utilizável e verificável.

---

# 7. CHALLENGE_VALUE_DECOMPOSITION

Agent deve desafiar a decomposição:

```text
isso entrega valor real?
está grande demais?
está pequeno demais?
mistura valores obrigatórios e opcionais?
é só agrupamento técnico?
pode entregar algo útil antes?
há dependência oculta?
há Work Item sem rastreabilidade de valor?
```

Agent recomenda; decisão material permanece governada.

---

# 8. DEFINE_VALUE_INCREMENT_DEPENDENCIES

Dependência entre ValueIncrements deve declarar resultado requerido de forma
verificável.

Cross-Module dependency é válida quando o consumidor depende de resultado
identificável, não de acoplamento informal.

---

# 9. ORDER_VALUE_DELIVERY

A ordem global pode intercalar Modules:

```text
Module A / EV-A1
Module B / EV-B1
Module A / EV-A2
Module C / EV-C1
```

Ordem é governada por valor, dependências, risco e target.

Não é agrupamento obrigatório por Module.

---

# 10. DETAIL_NEAR_TERM_WORK

Não é necessário detalhar antecipadamente todos os Work Items de todas as EVs.

Regra:

```text
primeira ValueIncrement a executar
→ detalhada o suficiente para Work Items READY

ValueIncrements próximas
→ detalhadas proporcionalmente à proximidade/risco

ValueIncrements distantes
→ podem manter decomposição em nível mais alto
```

Refinamento posterior não pode alterar silenciosamente o compromisso.

---

# 11. PLAN_TRANSVERSAL_WORK

Trabalho realmente transversal permanece Project-scoped.

Não deve ser colocado artificialmente dentro de um Module/ValueIncrement apenas
para satisfazer hierarquia.

---

# 12. DEFINE_VALIDATION_STRATEGY

PLANNING deve preparar como provar:

```text
Work Item acceptance
ValueIncrement value
Module coherence
Project global/E2E validation
```

Nenhuma camada substitui outra.

---

# 13. DEFINE_INTEGRATION_STRATEGY

Deve indicar como resultados cumulativos permanecerão coerentes durante
IMPLEMENTATION.

Integração não é passo exclusivo tardio.

Cada Work Item deve contribuir para baseline acumulada identificável.

---

# 14. RESOLVE_PLANNING_DECISIONS

Se PLANNING descobrir decisão material ausente:

```text
product problem → CONCEPTION
architecture problem → ARCHITECTURE
planning detail → resolve in PLANNING
```

Não inventar decisão upstream.

---

# 15. VERIFY_TECHNOLOGY_READINESS

Technology Baseline é artefato.

Antes de `PLANNING → IMPLEMENTATION`:

```text
toda decisão tecnológica MATERIAL/CRÍTICA
necessária à implementação inicial
deve estar aprovada
```

Detalhes não materiais podem continuar evoluindo quando governados.

---

# 16. Planning Baseline

A saída deve possuir Business Baseline identificável.

Nome humano candidato:

```text
Planning Baseline
```

Pode conter:

```text
Architecture Baseline ref
Delivery Target/version
Module set
ValueIncrement map
memberships
dependencies
global value order
near-term Work Items
transversal work
integration strategy
validation strategy
Technology Baseline ref/version
risks/findings/open decisions
```

Não exige entidade física com esse nome.

---

# 17. VERIFY_IMPLEMENTATION_READINESS

Requer, conforme aplicável:

```text
Delivery Target authoritative current
required Modules sufficiently planned
required ValueIncrements identified
first execution horizon detailed
dependencies verifiable
no blocking open decision
technology materially ready
integration strategy defined
validation strategy defined
Planning Baseline identifiable
continuity for IMPLEMENTATION
```

---

# 18. READY_FOR_IMPLEMENTATION

Step interno, não Project state.

Depois:

```text
Project.PLANNING
→ Project.IMPLEMENTATION
```

por transição governada.

---

# 19. Impedimentos

Segue mecanismo comum:

```text
NON_BLOCKING
→ persist + continuity + continue eligible planning work

BLOCKING
→ block affected scope
→ prevent phase exit when readiness affected
```

Phase Cycle Plan permanece durável.

---

# 20. Invariantes

```text
DeliveryTarget is formal/versioned in PLANNING
Module normal path → ValueIncrement → Work Item
not all distant Work Items need upfront detail
near-term execution must be sufficiently detailed
global EV order may interleave Modules
material technology must be ready before IMPLEMENTATION
Planning Baseline identifiable
READY_FOR_IMPLEMENTATION is internal
```

---

# 21. Status

```text
R2-05 PLANNING Internal Lifecycle
CLOSED — working decision

NEXT
R2-06 VALIDATION Internal Lifecycle
```
