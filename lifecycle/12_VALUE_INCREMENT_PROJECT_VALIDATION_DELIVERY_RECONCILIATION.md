# NAAMIVE — Value Increment / Project Validation / Delivery Reconciliation

**Status:** BRAINSTORM — VD-03 APPROVED WORKING DECISION  
**Versão:** 0.3  
**Natureza:** working normative reconciliation  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE

---

# 1. Objetivo

Definir como:

```text
ValueIncrement
Module
Project.VALIDATION
Project.DELIVERY
Delivery
```

se relacionam sem duplicar responsabilidade.

---

# 2. Validação em camadas

O NAAMIVE preserva perguntas diferentes:

```text
Work Item review
→ este trabalho local está correto?

ValueIncrement VALIDATING
→ este incremento entrega o valor prometido?

Module VALIDATING
→ os incrementos aceitos formam uma capacidade coerente?

Project VALIDATION
→ o conjunto integrado satisfaz os critérios globais do Project?

Project DELIVERY
→ a candidatura de entrega deve ser aceita?

Delivery
→ registro terminal do aceite
```

Nenhuma camada substitui automaticamente a outra.

---

# 3. Pré-condição de Project.VALIDATION

Antes de `Project.IMPLEMENTATION → Project.VALIDATION`, para o Delivery Target
corrente:

```text
todas as ValueIncrements REQUIRED_FOR_TARGET
→ ACCEPTED

todas as capacidades/Modules necessários
→ em condição compatível com validação global

Work Items transversais obrigatórios
→ concluídos

baseline global
→ identificável e estável

Executions capazes de alterar o mesmo baseline
→ nenhuma em voo
```

ValueIncrement `OPTIONAL_FOR_TARGET` pode:

```text
estar aceita e participar
ou
estar ausente sem bloquear
```

ValueIncrement `OUT_OF_TARGET` não participa da candidatura.

---

# 4. Project.VALIDATION

Project.VALIDATION responde:

```text
o conjunto integrado resolve o compromisso global do Project?
```

Exemplo — Controle Financeiro Familiar:

```text
login
  ↓
registrar despesa
  ↓
classificar em categoria
  ↓
recalcular orçamento
  ↓
atualizar previsto x realizado
  ↓
refletir dashboard
```

Todos os ValueIncrements podem estar `ACCEPTED` localmente e ainda assim a
validação global pode encontrar problema de integração, experiência, operação,
segurança, performance ou coerência transversal.

---

# 5. Finding global sobre ValueIncrement ACCEPTED

Se Project.VALIDATION encontrar defeito material ligado a uma Entrega de Valor já
`ACCEPTED`:

```text
não reabrir o ValueIncrement histórico
```

Criar:

```text
successor ValueIncrement
ou
Project-scoped Work Item transversal
```

conforme ownership real da correção.

O Project retorna ao nível apropriado de implementação/planejamento/arquitetura,
preservando causalidade e baseline.

---

# 6. VALIDATION → DELIVERY

Somente quando:

```text
critérios globais satisfeitos
evidências suficientes
findings bloqueadores tratados
riscos residuais conhecidos
baseline estável
Delivery Target resolvido
continuidade para decisão de entrega
```

o Project pode entrar em `DELIVERY`.

---

# 7. Project.DELIVERY é candidatura

`Project.DELIVERY` continua sendo fase de decisão.

Não é:

```text
deploy
merge
release técnico
Delivery já aceita
```

A entidade `Delivery` somente nasce após decisão positiva.

---

# 8. Conteúdo mínimo da candidatura

A superfície de decisão deve permitir avaliar:

```text
Need original
Project
Delivery Target + version
baseline candidato
Modules participantes
ValueIncrements REQUIRED_FOR_TARGET
ValueIncrements OPTIONAL_FOR_TARGET incluídas
ValueIncrements OUT_OF_TARGET
evidências
validação global
findings
riscos residuais
exceções
limitações
capacidade operacional
recomendação
authority
```

---

# 9. Regra de Required

Se existir:

```text
ValueIncrement REQUIRED_FOR_TARGET
!= ACCEPTED
```

a candidatura não pode ser aceita.

Saídas:

```text
retornar para implementação
ou
mudar escopo/decomposição por decisão governada
```

---

# 10. Regra de Optional

ValueIncrement `OPTIONAL_FOR_TARGET` ausente:

```text
não bloqueia
```

ValueIncrement `OPTIONAL_FOR_TARGET` pronta:

```text
pode ser incluída
```

desde que:

```text
compatível com baseline
validada conforme regras
explicitamente incluída no escopo final
```

---

# 11. Regra de Out of Target

ValueIncrement `OUT_OF_TARGET`:

```text
não participa
não bloqueia
não pode ser apresentada como entregue
```

---

# 12. Aceite

Ao aceitar a candidatura:

```text
Project.DELIVERY
        ↓ positive governed decision
create Delivery
        ↓
Project.DELIVERED
```

A decisão, criação idempotente de Delivery e transição para `DELIVERED` devem
formar handoff governado e recuperável.

---

# 13. Conteúdo da Delivery aceita

A Delivery aceita deve preservar, conforme aplicável:

```text
Need original
Project
Delivery Target id/version
baseline entregue
Modules participantes
ValueIncrements incluídas
disposição de cada ValueIncrement no target
evidências
findings
riscos aceitos
exceções
limitações
authority
decision
normative_baseline_ref
```

---

# 14. Evolução

Project `DELIVERED` permanece terminal.

Nova mudança entra por Need governada e referencia:

```text
Delivery predecessora
ou
baseline predecessor
```

Uma ValueIncrement que estava `OUT_OF_TARGET` ou `OPTIONAL_FOR_TARGET` em Delivery
anterior pode tornar-se `REQUIRED_FOR_TARGET` em evolução futura.

---

# 15. Exemplo completo

```text
PROJECT
Controle Financeiro Familiar

DELIVERY TARGET DT-01

REQUIRED_FOR_TARGET
✓ EV-A1 Login
✓ EV-B1 Registrar movimentações
✓ EV-C1 Criar orçamento
✓ EV-C2 Previsto x realizado
✓ EV-D1 Dashboard

OPTIONAL_FOR_TARGET
✓ EV-C3B Notificação push

OUT_OF_TARGET
○ EV-R1 Relatório PDF
```

Project.VALIDATION prova a jornada integrada.

Project.DELIVERY apresenta:

```text
5 required / 5 accepted
1 optional included
1 out of target
global validation PASS
baseline B42
```

Após aceite:

```text
Delivery D-001
```

preserva exatamente esse escopo.

---

# 16. Invariantes

```text
ValueIncrement.ACCEPTED != Project validated
Module.INTEGRATED != Project validated
Project.VALIDATION != Delivery accepted
Project.DELIVERY != Delivery entity
required missing blocks acceptance
optional missing does not block
out-of-target is not delivered
global finding does not rewrite accepted history
Delivery records exact target version and included scope
```

---

# 17. Status VD-03

```text
VD-01 Semântica/ownership................ CLOSED
VD-02 ValueIncrement lifecycle........... CLOSED
VD-03 Validation/Delivery/Target......... CLOSED
VD-04 State/Persistence/Projection....... CLOSED
VD-05 Orchestration/UI/Observability........ CLOSED
R2-02b Work Item Development Lifecycle......... NEXT
```
