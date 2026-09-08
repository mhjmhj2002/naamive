# NAAMIVE — UI Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo arquitetural da interface humana  
**Deriva de:** Projection Model, Governance e API

**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** projeção humana do estado, continuity, actions, blockers, decisões e recovery

---

# 1. Objetivo

Definir como humanos observam e decidem sem transformar UI em autoridade.

---

# 2. Regra central

```text
UI renders canonical projections
UI does not invent lifecycle
```

---

# 3. Entity page

Deve mostrar:

- current state;
- control condition;
- baseline;
- owner;
- continuity;
- findings;
- risks;
- pending decisions;
- allowed actions.

---

# 4. Action surfaces

Só exibem actions projetadas como autorizáveis.

---

# 5. Human gates

Devem apresentar evidence e contexto suficientes para decisão.

---

# 6. No raw-state buttons

Evitar interface genérica "mudar status".

---

# 7. Blocking visibility

Blocker deve ser visível e explicar por que impede avanço.

---

# 8. Waiting visibility

Wait deve mostrar condition e owner.

---

# 9. Pause

Mostrar motivo e resume criteria.

---

# 10. Recovery

Mostrar quando sistema está recuperando/reconciliando.

---

# 11. Timeline

Separar current state de history.

---

# 12. Error handling

Erro deve preservar contexto e explicar próxima ação.

---

# 13. Stale UI

Command com version antiga deve falhar e solicitar refresh.

---

# 14. Accessibility

A UI deve ser operável e compreensível sem depender somente de cor/posição.

---

# 15. Confirmation

Ações destrutivas/materialmente irreversíveis podem exigir confirmation, sem
confundir confirmation com authority.

---

# 16. Invariants

```text
visible action derives from projection
hidden required action = defect
UI state != canonical state
```

---

# 17. Princípio final

UI deve tornar a governança compreensível, não esconder complexidade crítica.


---

# Activity Center e hierarquia visual de valor

## Activity Center

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

## Hierarquia visual

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

## Sem progresso fictício

É proibido inventar percentual arbitrário.

Permitido quando factual:

```text
3/5 steps
2/4 Work Items
4/6 REQUIRED ValueIncrements accepted
```

---

## Functional vs operational

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

## Erro persistente

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

## Restart

Após reload/restart, a UI deve reconstruir a jornada a partir da projection.

Não pode depender do estado local anterior do browser para saber:

```text
qual EV estava ativa
qual WI estava ativa
qual passo estava concluído
qual decisão estava pendente
```

---

## Real-time

A norma exige atualização suficientemente responsiva para acompanhamento humano.

Não fixa transporte técnico.

SSE/WebSocket/polling pertencem à Technology Baseline.

---

## Invariantes

```text
UI renders projection
UI não inventa lifecycle
erro material não some em toast
heartbeat != progress
reload não apaga jornada
sem percentual falso
```

---
