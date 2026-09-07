# NAAMIVE — Module Lifecycle / NB-0002 Reconciliation Note

**Status:** BRAINSTORM — RECONCILIATION APPROVED FOR VD-02  
**Versão:** 0.2  
**Natureza:** working normative delta; não substitui `04_MODULE_LIFECYCLE.md` da `NB-0001`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Registrar as mudanças que a introdução de `ValueIncrement` exige no lifecycle de
Module antes da geração da revisão normativa final de `04_MODULE_LIFECYCLE.md`.

`NB-0001` permanece intacta e vigente.

---

# 2. Semântica preservada

Permanece válido:

```text
Module = capacidade de negócio coerente pertencente a exatamente um Project
```

Module continua não sendo camada técnica.

Seu lifecycle macro permanece candidato a:

```text
IDENTIFIED
→ DEFINED
→ PLANNED
→ IMPLEMENTING
→ VALIDATING
→ READY_FOR_INTEGRATION
→ INTEGRATED
```

A introdução de `ValueIncrement` altera a decomposição interna e os critérios de
agregação; não transforma Module em mini-Project.

---

# 3. DEFINED → PLANNED

Na candidata `NB-0002`, planejamento de Module deve incluir Entregas de Valor.

Modelo:

```text
Module DEFINED
      ↓
identificar/decompor ValueIncrements
      ↓
challenge do agente
      ↓
decisão/brainstorm governado
      ↓
ordenar/dependências/critérios
      ↓
planejar primeira(s) ValueIncrement(s)
      ↓
Module PLANNED
```

A decomposição direta:

```text
Module → Work Items
```

deixa de ser o caminho normal.

---

# 4. Conteúdo esperado em Module.PLANNED

Passa a incluir, conforme aplicável:

```text
ValueIncrements
ordem
dependências entre ValueIncrements
required/optional disposition para baseline alvo
critérios de valor
estratégia de validação
Work Items derivadas
Work Items transversais do Project relevantes
riscos
review/audit requirements
```

Nem todos os Work Items distantes precisam estar detalhados até o último nível,
desde que o mapa de valor do Module esteja conhecido e a próxima Entrega de Valor
possa avançar sem invenção material.

---

# 5. Module.IMPLEMENTING

Semântica candidata:

```text
ValueIncrements do Module estão sendo materializadas
```

Fluxo:

```text
Module
  ↓
ValueIncrement
  ↓
Work Item
  ↓
Execution
```

No MVP:

```text
1 ValueIncrement ativa por vez
1 Work Item ativa por vez
```

Essa sequencialidade é política inicial, não cardinalidade estrutural.

---

# 6. Continuidade em IMPLEMENTING

Deve existir pelo menos uma rota válida:

```text
ValueIncrement ativa
próxima ValueIncrement elegível
Work Item elegível/em progresso
review/rework
WAITING/BLOCKED governado
human decision
recovery/reconciliation
```

Ausência de todas é `Inconsistency`.

---

# 7. IMPLEMENTING → VALIDATING

Critério candidato revisado:

```text
todas as ValueIncrements obrigatórias para o baseline alvo = ACCEPTED
nenhuma ValueIncrement ativa capaz de alterar baseline
nenhuma Execution em voo capaz de alterar baseline
baseline do Module identificável
continuidade para validação agregada
```

A simples conclusão de Work Items não é suficiente.

---

# 8. Module.VALIDATING

Pergunta própria:

```text
as Entregas de Valor aceitas formam, juntas, a capacidade de negócio prometida?
```

Pode validar:

```text
coerência entre incrementos
regras de negócio agregadas
dependências
integrações internas
experiência da capacidade
segurança/dados/operação
evidência agregada
```

Isso não repete `ValueIncrement.VALIDATING`, que prova o valor local de cada
incremento.

---

# 9. Finding sobre ValueIncrement ACCEPTED

Se Module.VALIDATING descobrir problema material em incremento já aceito:

```text
não reabrir ValueIncrement ACCEPTED
```

Criar successor/rework governado.

O Module pode retornar:

```text
VALIDATING → IMPLEMENTING
```

preservando história, baseline e causalidade.

---

# 10. READY_FOR_INTEGRATION / INTEGRATED

Permanecem como estados de capacidade agregada.

`ValueIncrement.ACCEPTED` não significa:

```text
Module READY_FOR_INTEGRATION
Module INTEGRATED
```

Module ainda deve provar coerência agregada e realizar sua integração no Project.

---

# 11. Impacto em agregação

Project e projections não podem usar apenas:

```text
count(WorkItems DONE)
```

nem:

```text
count(ValueIncrements ACCEPTED)
```

como regra automática.

Devem avaliar o conjunto obrigatório, baseline, dependências, validade e
condições do lifecycle do Module.

---

# 12. Regra de futura revisão

Na consolidação final da `NB-0002`, este delta deve ser incorporado à revisão
completa de:

```text
lifecycle/04_MODULE_LIFECYCLE.md
```

e esta nota de reconciliação deve permanecer apenas como evidência de trabalho,
não como norma concorrente.


---

# 13. Relação com Delivery Target

A agregação corrente do Module deve considerar a disposição das Entregas de
Valor no Delivery Target ativo.

Uma Entrega de Valor `OUT_OF_TARGET` não bloqueia o Module para aquela
candidatura.

Uma Entrega de Valor `OPTIONAL_FOR_TARGET` não bloqueia por ausência.

Uma Entrega de Valor `REQUIRED_FOR_TARGET` deve estar `ACCEPTED` para que o
Module possa satisfazer a capacidade exigida pelo target corrente.

A disposição é relativa ao Delivery Target e não altera a história intrínseca da
Entrega de Valor.
