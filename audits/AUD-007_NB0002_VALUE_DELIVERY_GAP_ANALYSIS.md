# AUD-007 — NB-0002 Value Delivery Gap Analysis

**Status:** OPEN — VD-01/VD-02/VD-03/VD-04/VD-05 CLOSED; CROSS-DOCUMENT REMEDIATION IN PROGRESS  
**Natureza:** NON-NORMATIVE AUDIT EVIDENCE  
**Baseline analisada:** `NB-0001`  
**Baseline candidata de remediação:** `NB-0002`  
**Escopo:** Entrega de Valor entre Module e Work Item

---

# 1. Finding

```text
VD-GAP-001
```

A `NB-0001` não possui entidade explícita para representar um incremento finito
de valor entre Module e Work Item.

---

# 2. VD-01 — Semântica e ownership

**Status:** CLOSED — working decision

Decisões fechadas:

```text
Project → Module → Entrega de Valor → Work Item → Execution
Module permanece capacidade de negócio
Entrega de Valor pertence a exatamente 1 Module
ownership multi-Module é proibido
dependências cross-Module são permitidas por resultado verificável
Module destinado à implementação possui 1..N Entregas de Valor
Work Item de Module deve referenciar sua Entrega de Valor
Work Item transversal de Project permanece permitida
decomposição é desafiada pelo agente
decisão material exige superfície humana governada
não existe número fixo de Entregas de Valor por Module
MVP é sequencial
modelo deve suportar paralelismo futuro sem reengenharia de domínio
```

---

# 3. Planejamento

Antes de `Project.IMPLEMENTATION`, o mapa de Modules, Entregas de Valor,
sequência e dependências da Delivery alvo deve estar conhecido em profundidade
suficiente.

A primeira Entrega de Valor deve estar planejada até permitir Work Items
executáveis sem invenção material.

Entregas de Valor futuras não precisam ter todos os Work Items detalhados até o
último nível antes de iniciar a primeira.

---

# 4. GitHub / Pull Request

Direção técnica aprovada:

```text
Entrega de Valor ↔ Pull Request........ SIM
PR é source of truth da EV............. NÃO
1 PR principal por EV no MVP........... PREFERENCIAL
1..N PRs por EV........................ SUPORTADO
PR MERGED = EV ACCEPTED................ NÃO
vínculo EV ↔ PR........................ DURÁVEL
```

Detalhes físicos permanecem para Technology Baseline / implementação.

---

# 5. R2-02

O `Implementation Internal Lifecycle` foi reconciliado em direção a:

```text
PREPARE_IMPLEMENTATION
        ↓
MATERIALIZE_VALUE
        ↓
VERIFY_IMPLEMENTATION
        ↓
READY_FOR_VALIDATION
```

A integração técnica acontece dentro da materialização sequencial e atualiza uma
baseline cumulativa.

`R2-02` ainda depende de `VD-02` para fechar o lifecycle da própria Entrega de
Valor e depois detalhar o mini-lifecycle de desenvolvimento de cada Work Item.

---

# 6. VD-02 — Lifecycle

**Status:** CLOSED — working decision

Lifecycle aprovado:

```text
IDENTIFIED
→ DEFINED
→ PLANNED
→ IMPLEMENTING
→ VALIDATING
→ READY_FOR_ACCEPTANCE
→ ACCEPTED
```

`ACCEPTED` é terminal.

Mudança material posterior cria successor.

`PR MERGED` não aceita automaticamente a Entrega de Valor.

Module agrega Entregas de Valor e somente pode sair de `IMPLEMENTING` para
`VALIDATING` quando o conjunto obrigatório do baseline alvo estiver `ACCEPTED`,
sem trabalho em voo capaz de alterar esse baseline.

---

# 7. Próximo trabalho

```text
VD-04  impacto state/persistence/projection
VD-05  impacto orchestration/UI/observability
R2-02b detalhar Work Item Development Internal Lifecycle
```

---

# 7. Status geral

```text
NB-0001........................ IN FORCE / UNCHANGED
NB-0002........................ WORKING ROUND / NOT IN FORCE
VD-01.......................... CLOSED
VD-02.......................... CLOSED
VD-03.......................... CLOSED
VD-04.......................... CLOSED
VD-05.......................... CLOSED
R2-02b......................... CLOSED
R2-03.......................... NEXT
R2-02 macro.................... RECONCILED WITH VD-03 / NOT FINAL
CODE IMPLEMENTATION............ BLOCKED
```


---

# 8. VD-03 — Delivery Target / Validation / Delivery

**Status:** CLOSED — working decision

Decisões:

```text
Delivery Target é governado e versionado
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
required ausente bloqueia Delivery
optional ausente não bloqueia
optional pronta pode ser incluída
out-of-target não participa
redução de compromisso após implementation é mudança material
agente deve avaliar split antes de downgrade de obrigatoriedade
split preserva lineage
accepted não é reescrito retroativamente
Project.VALIDATION prova resultado global
Project.DELIVERY continua candidatura
Delivery nasce somente após aceite
Delivery preserva target version e escopo exato
```


---

# 9. VD-04 — State / Persistence / Projection

**Status:** CLOSED — working decision

Decisões:

```text
ValueIncrement é entidade canônica first-class
DeliveryTarget é entidade canônica first-class e versionada
DeliveryTargetMembership carrega REQUIRED/OPTIONAL/OUT_OF_TARGET
Project possui no máximo 1 DeliveryTarget autoritativo corrente no MVP
drafts/proposals/history podem coexistir
currentness não é inferida apenas por número de versão
target change é atomicamente coerente ou recuperável
current state e immutable history permanecem separados
ValueIncrement/Target/Membership sobrevivem restart
functional progress necessário é persistente
heartbeat/operational activity/functional progress são conceitos distintos
projection é derivada
counts são explicativos, não autorizativos
Activity Center deriva da projection canônica
stale projection não vence canonical state
Business Baseline e Normative Baseline permanecem distintas
```


---

# 10. VD-05 — Orchestration / UI / Observability

**Status:** CLOSED — working decision

Decisões:

```text
MVP: 1 active ValueIncrement / 1 active Work Item
REQUIRED elegível precede OPTIONAL automaticamente
humano pode priorizar OPTIONAL por decisão governada
OUT_OF_TARGET não compete no target corrente
agent pode criar ValueIncrementProposal
proposal != canonical approval
agent deve desafiar granularidade/split
Activity Center é persistente/reconstruível
heartbeat != operational activity != functional progress
ALIVE != PROGRESS
erro material não pode existir apenas em toast
real-time transport fica para Technology Baseline
local activity history separado da Project timeline
```


---

# 11. R2-02b synchronization

`R2-02b` foi fechado com:

```text
Work Item Development Internal Lifecycle
Development Roadmap
scope-aware blocker handling
durable impediment remediation
Roadmap Supervisor
```

Isso não reabre `VD-01..VD-05`.

Próximo passo transversal da rodada:

```text
R2-03 CONCEPTION Internal Lifecycle
```
