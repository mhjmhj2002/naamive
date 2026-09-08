# NAAMIVE — Development Roadmap and Activity Center Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.1  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  

---

# 1. Roadmap surface

Activity Center deve conseguir mostrar:

```text
FEITO
FAZENDO
A FAZER
IMPEDIMENTOS
```

sem transformar UI em supervisor.

---

# 2. Exemplo

```text
ROADMAP — EV-01

FEITO
✓ WI-01 Estruturar orçamento
✓ WI-02 Persistir orçamento

FAZENDO
● WI-03 Editar orçamento

A FAZER
○ WI-04 Interface
○ WI-05 Testes

IMPEDIMENTOS
⚠ F-17 Arredondamento
  NON_BLOCKING

⚠ F-21 Timezone
  NON_BLOCKING no trabalho atual
  dependency of WI-05
```

---

# 3. Blocker

Quando blocker impedir continuidade:

```text
BLOQUEADO
Finding
affected scope
cause
owner
exit condition
next permitted action
```

devem ficar visíveis.

---

# 4. Impedimentos no fim

A UI deve permitir consultar/remediar a fila persistente de impedimentos.

Não depender de resumo textual da sessão anterior do agent.

---

# 5. Supervisão não pertence ao browser

Refresh/polling/SSE pode atualizar a tela.

Mas:

```text
browser closed
→ roadmap supervision continues
```

---

# 6. Structured execution summary

Após agent Execution, a UI pode renderizar:

```text
resultado produzido
findings encontrados
classificação
affected scope
roadmap entries criadas
continuity resultante
server-derived next eligible item
```

---

# 7. Invariantes

```text
roadmap visible
impediment durable
blocker actionable
UI is projection consumer
agent session is not history source
```
