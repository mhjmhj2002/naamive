# NAAMIVE — Project Lifecycle / NB-0002 Reconciliation Note

**Status:** BRAINSTORM — VD-03 RECONCILIATION APPROVED  
**Versão:** 0.1  
**Natureza:** working normative delta; não substitui `03_PROJECT_LIFECYCLE.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Registrar deltas exigidos por:

```text
ValueIncrement
Delivery Target
```

sem mutar a `NB-0001`.

---

# 2. PLANNING

Conteúdo de planejamento passa a incluir, conforme aplicável:

```text
Modules
ValueIncrements
Delivery Target
disposição REQUIRED/OPTIONAL/OUT_OF_TARGET
ordem e dependências
Work Items
estratégia de validação
```

Antes de implementação, o mapa global de valor deve estar conhecido em
profundidade suficiente.

---

# 3. IMPLEMENTATION → VALIDATION

Revisão candidata:

```text
todas as ValueIncrements REQUIRED_FOR_TARGET = ACCEPTED
Modules necessários em condição compatível
Work Items transversais obrigatórias concluídas
baseline global identificável
nenhuma Execution autorizada em voo para o mesmo baseline
nenhum blocker incompatível
continuidade para Project.VALIDATION
```

---

# 4. VALIDATION

Permanece validação global do Project.

Não é substituída por:

```text
ValueIncrement.VALIDATING
Module.VALIDATING
```

Pode encontrar falha apesar de ValueIncrements individualmente aceitas.

Nesse caso:

```text
criar successor/rework
não reabrir histórico terminal
```

---

# 5. VALIDATION → DELIVERY

Além dos critérios existentes, exige:

```text
Delivery Target resolvido
required set satisfeito
optional included set explícito
out-of-target set explícito
baseline final candidato estável
```

---

# 6. DELIVERY

A candidatura deve mostrar explicitamente:

```text
Delivery Target id/version
required
optional incluídas
out-of-target
baseline
validação global
findings
riscos
limitações
```

Se required não estiver satisfeita:

```text
aceite proibido
```

salvo após mudança governada de escopo/decomposição que produza novo estado
válido do target.

---

# 7. DELIVERED

A Delivery aceita preserva o escopo exato:

```text
target version
ValueIncrements incluídas
disposições
baseline
```

Project permanece terminal.

---

# 8. Regra de consolidação

Na revisão final da candidata `NB-0002`, este conteúdo deve ser incorporado ao
documento normativo completo de Project Lifecycle.

Esta nota não deve permanecer como norma concorrente.
