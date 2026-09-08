# NAAMIVE — Work Item Development Internal Lifecycle

**Status:** RATIFIED  
**Versão:** 0.1  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a lifecycle interno de desenvolvimento de Work Item durante `Project.IMPLEMENTATION`  
**Deriva de:** `05_WORK_ITEM_LIFECYCLE.md`, `06_EXECUTION_LIFECYCLE.md`, `07_INTERNAL_PHASE_LIFECYCLE_MODEL.md`, `08_IMPLEMENTATION_INTERNAL_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  

---

# 1. Objetivo

Definir o processo semântico interno de desenvolvimento de uma Work Item sem
criar lifecycle concorrente ao lifecycle normativo da Work Item.

A Work Item continua seguindo:

```text
PROPOSED
→ READY
→ IN_PROGRESS
→ IN_REVIEW
→ DONE
```

Este documento explica **o que acontece dentro de `IN_PROGRESS` e `IN_REVIEW`**.

---

# 2. Hierarquia

```text
Work Item
→ compromisso lógico de trabalho

Development Cycle Instance
→ jornada semântica daquela passagem por desenvolvimento/review

Development Step
→ etapa funcional da jornada

Execution
→ tentativa operacional autorizada

telemetry
→ liveness/atividade operacional
```

Não existe equivalência obrigatória 1:1 entre Development Step e Execution.

---

# 3. Mecanismo obrigatório, passos aplicáveis

Toda Work Item executável usa o mesmo mecanismo de Development Cycle.

Para Work Item trivial, passos podem ser explicitamente:

```text
NOT_APPLICABLE
```

É proibido criar um fluxo paralelo não governado chamado, por exemplo:

```text
simple_work_item_flow
fast_path_without_history
```

---

# 4. Ciclo interno de IN_PROGRESS

Fluxo normal:

```text
PREPARE_WORK
    ↓
IMPLEMENT_CHANGE
    ↓
VERIFY_CHANGE
    ↓
MATERIALIZE_CANDIDATE
    ↓
VERIFY_CANDIDATE
    ↓
PREPARE_REVIEW
    ↓
Work Item → IN_REVIEW
```

---

# 5. PREPARE_WORK

Responde:

```text
o trabalho já decidido pode realmente ser executado agora?
```

Deve revalidar, conforme aplicável:

```text
objective
scope
owner
ValueIncrement ref quando Module-scoped
DeliveryTarget/current membership quando relevante
Business Baseline
normative_baseline_ref
dependencies
authority
gates
findings
environment/artifact prerequisites
continuity
```

Se encontrar decisão material ausente:

```text
não inventar
registrar Finding/Decision Request
materializar continuidade
retornar ao nível governado apropriado
```

---

# 6. IMPLEMENT_CHANGE

Materializa a mudança planejada.

Pode produzir, conforme natureza da Work Item:

```text
code
configuration
migration
contract
documentation
test assets
other implementation artifacts
```

Uma mesma passagem por `IMPLEMENT_CHANGE` pode usar várias Executions por
retry/recovery/reconciliation.

---

# 7. VERIFY_CHANGE

Responde:

```text
a mudança produzida funciona no seu escopo local?
```

Pode incluir:

```text
local tests
static analysis
contract checks
schema checks
focused validation
```

Não substitui review de Work Item nem `ValueIncrement.VALIDATING`.

---

# 8. MATERIALIZE_CANDIDATE

Produz resultado identificável da Work Item.

Exemplo conceitual:

```text
WI-03 candidate result
Business Baseline B12
```

Resultado não pode existir apenas:

```text
na memória do agent
no filesystem temporário sem identidade
num chat
```

Tecnologia concreta de commit/branch/artifact fica para Technology Baseline.

---

# 9. VERIFY_CANDIDATE

Verifica o candidato dentro da baseline cumulativa relevante.

Exemplo:

```text
B11
 ↓ WI-03 candidate
B12
```

Responde:

```text
o resultado local continua válido quando colocado no contexto acumulado?
```

---

# 10. PREPARE_REVIEW

Materializa pacote de review suficiente:

```text
candidate result
baseline
scope
diff/artifact references
tests
evidence
known limitations
findings
risks
acceptance criteria
normative context
```

Depois:

```text
Work Item.IN_PROGRESS
→ Work Item.IN_REVIEW
```

---

# 11. Ciclo interno de IN_REVIEW

Fluxo normal:

```text
REVIEW_RESULT
    ↓
VERIFY_ACCEPTANCE
    ↓
READY_FOR_DECISION
    ↓
decision
    ↓
Work Item → DONE
```

---

# 12. REVIEW_RESULT

Avalia o resultado contra:

```text
scope
quality
architecture
security
experience
side effects
evidence
```

---

# 13. VERIFY_ACCEPTANCE

Verifica:

```text
acceptance criteria satisfied
evidence sufficient
correct Business Baseline
required audit valid
blocking findings treated
authoritative result identifiable
```

---

# 14. READY_FOR_DECISION

É passo semântico obrigatório mesmo quando a decisão puder ser automática por
regra.

Significa:

```text
review concluído
evidência suficiente
resultado pronto para decisão de aceite
```

A decisão pode ser:

```text
human governed decision
automatic governed decision
```

conforme policy/authority.

---

# 15. Review negativo

Quando review exige correção dentro do mesmo compromisso:

```text
Work Item.IN_REVIEW
→ Work Item.IN_PROGRESS
```

A instância anterior do Development Cycle não é resetada.

Cria-se nova instância causal:

```text
Development Cycle #1
→ review encontrou finding

Development Cycle #2
→ correção
```

A história anterior permanece íntegra.

---

# 16. Nova instância causal é obrigatória em reentrada

Sempre que:

```text
IN_REVIEW → IN_PROGRESS
```

uma nova Development Cycle Instance deve ser criada.

Também deve existir lineage:

```text
previous_cycle_ref
cause_ref
reentry_reason
baseline
```

---

# 17. Impedimentos durante desenvolvimento

Encontrar impedimento não é motivo suficiente para parar.

Fluxo obrigatório:

```text
impedimento descoberto
        ↓
registrar Finding
        ↓
identificar affected scope
        ↓
classificar consequência
        ↓
persistir Roadmap remediation
        ↓
recalcular continuidade
```

---

# 18. NON_BLOCKING

Finding `NON_BLOCKING` para o escopo atual:

```text
não interrompe trabalho ainda elegível
```

O sistema:

```text
persiste Finding
adiciona remediation no Development Roadmap
mantém rastreabilidade
continua trabalho permitido
```

Se esse Finding for dependência de trabalho futuro, esse trabalho futuro pode se
tornar inelegível até tratamento.

---

# 19. BLOCKING

Finding `BLOCKING`:

```text
interrompe o affected scope
```

O sistema:

```text
persiste Finding
adiciona remediation no Development Roadmap
materializa GOVERNED_BLOCK continuity
revoga/impede trabalho incompatível
recalcula outros RoadmapItems elegíveis
```

Se existir trabalho independente legitimamente elegível e a policy permitir,
orchestration pode continuar por outra entrada.

Se não existir:

```text
Development Roadmap = sem continuidade executável
→ permanece BLOCKED com rota de saída
```

---

# 20. Escopo do blocker

O impedimento deve identificar escopo afetado, conforme aplicável:

```text
DEVELOPMENT_STEP
WORK_ITEM
VALUE_INCREMENT
MODULE
PROJECT
```

Blocker local não deve parar escopo não afetado por simples prudência do agent.

---

# 21. Agent não carrega memória do backlog

Agent é responsável por:

```text
detectar
descrever
produzir evidence
registrar Finding dentro da authority
```

Agent não é responsável por lembrar posteriormente de impedimentos.

A continuidade é persistida pelo sistema.

---

# 22. Resultado estruturado da Execution do agent

Ao terminar, deve ser possível materializar:

```text
work performed
result refs
evidence refs
findings discovered
proposed classification
affected scope
roadmap entries created
limitations
```

O agent não é fonte autoritativa de:

```text
next eligible item
roadmap completion
final blocking state
```

Esses fatos são derivados pelo canonical state/orchestration após revalidation.

---

# 23. Activity Center

Exemplo:

```text
WI-03 — Persistir orçamento
IN_PROGRESS

Development Cycle #2

✓ PREPARE_WORK
● IMPLEMENT_CHANGE
○ VERIFY_CHANGE
○ MATERIALIZE_CANDIDATE
○ VERIFY_CANDIDATE
○ PREPARE_REVIEW

Motivo da reentrada:
Finding F-218 — perda de precisão decimal

Último progresso funcional:
"tipo monetário corrigido"
```

---

# 24. Invariantes

```text
Work Item lifecycle != Development Cycle
Development Step != Execution
finding discovered != stop everything
NON_BLOCKING => continue eligible work
BLOCKING => stop affected scope
reentry creates new causal cycle
trivial work uses same mechanism with NOT_APPLICABLE
READY_FOR_DECISION remains explicit
agent memory is not continuity
```
