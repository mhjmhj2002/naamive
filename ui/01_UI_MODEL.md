# NAAMIVE — UI Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.2  
**Autoridade:** modelo arquitetural da interface humana  
**Deriva de:** Projection Model, Governance e API

**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
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
