# NAAMIVE — UI Model / NB-0002 Reconciliation

**Status:** BRAINSTORM — VD-05 APPROVED WORKING DECISION  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `ui/01_UI_MODEL.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir como humanos observam:

```text
Project
Module
ValueIncrement
Work Item
Execution
DeliveryTarget
Internal Phase Lifecycle
```

sem transformar UI em source of truth.

---

# 2. Activity Center

Deve existir superfície persistente de acompanhamento de atividade longa.

Deve responder separadamente:

```text
onde o Project está?
qual valor está sendo produzido?
qual Work Item está ativa?
qual Execution está rodando?
o executor está vivo?
houve progresso funcional?
```

---

# 3. Hierarquia visual

A UI deve permitir navegar:

```text
Project
  ↓
Module
  ↓
ValueIncrement
  ↓
Work Item
  ↓
Execution
```

e exibir Delivery Target corrente sem confundir ownership.

---

# 4. Status humanos

Conforme o lifecycle aplicável, a UI pode humanizar estados como:

```text
A FAZER
FAZENDO
FEITO
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
NÃO APLICÁVEL
```

Labels humanos não alteram estados canônicos.

---

# 5. Sem progresso fictício

É proibido inventar percentual arbitrário.

Permitido quando factual:

```text
3/5 steps
2/4 Work Items
4/6 REQUIRED ValueIncrements accepted
```

---

# 6. Functional vs operational

A UI deve separar:

```text
functional progress
operational activity
heartbeat
```

Exemplo:

```text
Heartbeat: agora
Atividade operacional: agora
Progresso funcional: há 46 min
```

---

# 7. Erro persistente

Falha relevante não pode existir apenas como toast efêmero.

A UI deve manter visível:

```text
objeto afetado
Execution
failure
last functional progress
continuity
allowed next actions
```

---

# 8. Restart

Após reload/restart, a UI deve reconstruir a jornada a partir da projection.

Não pode depender do estado local anterior do browser para saber:

```text
qual EV estava ativa
qual WI estava ativa
qual passo estava concluído
qual decisão estava pendente
```

---

# 9. Real-time

A norma exige atualização suficientemente responsiva para acompanhamento humano.

Não fixa transporte técnico.

SSE/WebSocket/polling pertencem à Technology Baseline.

---

# 10. Invariantes

```text
UI renders projection
UI não inventa lifecycle
erro material não some em toast
heartbeat != progress
reload não apaga jornada
sem percentual falso
```

---

# 11. Consolidação

Este delta deve ser incorporado à revisão final de `ui/01_UI_MODEL.md`.
