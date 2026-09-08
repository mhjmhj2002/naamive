# NAAMIVE — Development Roadmap Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Autoridade:** candidato a modelo governado de sequência, impedimentos e continuidade durante desenvolvimento  
**Deriva de:** `08_IMPLEMENTATION_INTERNAL_LIFECYCLE.md`, `13_WORK_ITEM_DEVELOPMENT_INTERNAL_LIFECYCLE.md`, Finding Policy, Continuity Contract e Orchestration  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  

---

# 1. Objetivo

Tirar do agent a responsabilidade de lembrar:

```text
o que falta
o que foi bloqueado
o que deve ser retomado
quais impedimentos ficaram para o final
```

Esses fatos devem ser persistidos e supervisionados pelo NAAMIVE.

---

# 2. Development Roadmap é artefato governado e durável

Development Roadmap representa a sequência de trabalho relevante para uma frente
de implementação.

Pode ser associado, conforme aplicável, a:

```text
Project
Module
ValueIncrement
```

No fluxo normal de materialização de valor, o roadmap mais comum é o da
`ValueIncrement`.

---

# 3. Roadmap não duplica lifecycle

Roadmap não substitui:

```text
Work Item
Finding
Execution
Decision
Recovery
Reconciliation
```

Cada entrada referencia fatos canônicos próprios.

A tabela/estrutura de roadmap organiza e projeta continuidade; não cria segunda
verdade de estado.

---

# 4. Estrutura conceitual

Sem fixar schema físico final:

```text
DevelopmentRoadmap
------------------
roadmap_id
scope_ref
version
Business Baseline
normative_baseline_ref
currentness
continuity
created_at
supersedes_ref

RoadmapEntry
------------
entry_id
roadmap_id
position/order_key
kind
reference_ref
dependency refs
reason
created_at
```

Kinds candidatos:

```text
WORK_ITEM
FINDING_REMEDIATION
HUMAN_DECISION
RECOVERY
RECONCILIATION
```

Estado exibido da entrada deve preferencialmente derivar do recurso referenciado,
evitando uma segunda state machine conflitante.

---

# 5. Persistência em banco

O Roadmap deve ser durável em armazenamento canônico.

A Technology Baseline definirá:

```text
physical tables
indexes
constraints
query strategy
```

Mas o requisito normativo é:

```text
restart não perde roadmap
restart não perde impedimentos
restart não perde ordem/dependências
```

---

# 6. Adição de impedimento

Ao surgir Finding durante desenvolvimento:

```text
persist Finding
→ create remediation RoadmapEntry
```

Por padrão:

```text
new remediation entry
→ appended to end of current roadmap
```

---

# 7. Exceção ao simples append

Append no final não significa ignorar dependências.

Se trabalho futuro depender do impedimento:

```text
future RoadmapEntry
depends_on
remediation entry / Finding resolution
```

Quando chegar a esse ponto:

```text
dependency unsatisfied
→ future item ineligible
```

---

# 8. NON_BLOCKING discovery

Exemplo:

```text
WI-03 current
Finding F-17 NON_BLOCKING
```

Resultado:

```text
F-17 persisted
remediation appended
WI-03 continues if still eligible
```

---

# 9. BLOCKING discovery

Exemplo:

```text
WI-03 current
Finding F-25 BLOCKING for WI-03
```

Resultado:

```text
F-25 persisted
remediation appended
WI-03 + BLOCKED
GOVERNED_BLOCK continuity
```

Orchestration reavalia o roadmap.

Se houver outro item independente e autorizado:

```text
may continue elsewhere
```

Se não houver:

```text
roadmap remains blocked
```

---

# 10. Escopo e severidade

Finding deve preservar:

```text
severity
affected_scope
baseline
evidence
consequence
```

Um Finding pode ser `NON_BLOCKING` para o trabalho atual e, ao mesmo tempo, ser
dependência verificável de trabalho futuro.

Se sua consequência material mudar, reclassification segue Finding Policy.

---

# 11. Remediação no final do Roadmap

A intenção padrão é não perder dívida descoberta durante desenvolvimento.

Antes de declarar a frente concluída, o Roadmap Supervisor deve verificar
entradas de impedimento ainda pendentes.

Tratamentos possíveis continuam governados pela Finding Policy:

```text
RESOLVED
INVALIDATED
ACCEPTED_RISK
SUPERSEDED
ou tratamento/exception permitido
```

Não é permitido simplesmente apagar a entrada porque a implementação principal
terminou.

---

# 12. Roadmap completion

Roadmap não é considerado coerentemente encerrado enquanto existir:

```text
mandatory RoadmapEntry sem disposição válida
required remediation sem continuity
blocking Finding sem tratamento compatível
pending dependency sem resolução/disposição
```

A conclusão do roadmap não promove automaticamente `ValueIncrement` ou Project.

---

# 13. Versionamento

Mudança material de:

```text
order
scope
dependency
required remediation
target baseline
```

deve ser versionada ou preservada por histórico equivalente.

Não reescrever o roadmap antigo como se sempre tivesse sido diferente.

---

# 14. Roadmap Supervisor

Deve existir responsabilidade sistêmica de supervisionar o roadmap.

Pode ser implementada por:

```text
worker
reconciler
scheduler
combinação equivalente
```

A forma física fica para Technology Baseline.

Responsabilidades:

```text
revalidar current roadmap
detectar item sem continuidade
detectar blocker
detectar dependency release
detectar novo eligible work
detectar roadmap aparentemente finalizado com impedimento pendente
detectar item stale
detectar divergência roadmap ↔ canonical state
```

---

# 15. Cadência

Supervisor pode operar:

```text
event-driven
periodically
ou híbrido
```

Intervalos concretos ficam para Technology/Operations Baseline.

---

# 16. UI não supervisiona

A tela consulta/renderiza projection.

Não é permitido depender de:

```text
browser aberto
timer JavaScript
refresh manual do humano
```

para manter continuidade do roadmap.

---

# 17. Projection

Exemplo:

```text
ROADMAP — EV-01

01 ✓ WI-01 Estruturar orçamento
02 ✓ WI-02 Persistir orçamento
03 ● WI-03 Editar orçamento
04 ○ WI-04 Interface
05 ○ WI-05 Testes

06 ⚠ F-17 Arredondamento
   NON_BLOCKING

07 ⚠ F-21 Timezone
   NON_BLOCKING agora
   dependency of WI-05
```

---

# 18. Inconsistency

Exemplos:

```text
roadmap ativo sem next action/exit condition
remediation entry sem Finding/ref válida
blocking Finding sem GOVERNED_BLOCK
entry marcada concluída mas referenced Work Item não terminal
roadmap current apontando baseline stale
```

Devem abrir/vincular `Inconsistency` quando material.

---

# 19. Invariantes

```text
roadmap durable
roadmap != Work Item lifecycle
roadmap != Finding state
agent memory != backlog
non-blocking finding is not forgotten
blocking stops affected scope
dependencies govern future eligibility
browser is not supervisor
roadmap history is explainable
```
