# NAAMIVE — Delivery Target Model

**Status:** BRAINSTORM — VD-03 APPROVED WORKING DECISION  
**Versão:** 0.3  
**Autoridade:** candidato a modelo normativo de escopo-alvo de entrega  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Deriva de:** `03_PROJECT_LIFECYCLE.md`, `09_VALUE_DELIVERY_MODEL.md`, `10_VALUE_INCREMENT_LIFECYCLE.md`  
**Normative Baseline candidata:** `NB-0002`  
**Vigência:** NOT IN FORCE  
**Escopo:** definição, versionamento e uso de Delivery Target para governar quais Entregas de Valor participam ou bloqueiam uma candidatura de Delivery

---

# 1. Objetivo

Definir o conceito de **Delivery Target** como artefato governado e versionado que
declara qual conjunto de Entregas de Valor compõe a candidatura de entrega alvo
de um Project.

Delivery Target responde:

```text
o que estamos comprometendo entregar nesta candidatura?
```

---

# 2. Delivery Target é governado e versionado

Cada Delivery Target deve possuir identidade e versão próprias.

Exemplo:

```text
DT-01 v1

EV-A1  REQUIRED_FOR_TARGET
EV-B1  REQUIRED_FOR_TARGET
EV-C3A REQUIRED_FOR_TARGET
EV-C3B OPTIONAL_FOR_TARGET
EV-D2  OUT_OF_TARGET
```

Mudanças materiais produzem nova versão ou nova decisão governada equivalente,
preservando o histórico.

Não é permitido reconstruir retrospectivamente o escopo da entrega por memória,
convenção ou inferência informal.

---

# 3. Disposição de Entrega de Valor por Target

Cada Entrega de Valor relevante para o Project deve possuir, conforme aplicável,
uma disposição explícita em relação ao Delivery Target corrente:

```text
REQUIRED_FOR_TARGET
OPTIONAL_FOR_TARGET
OUT_OF_TARGET
```

Semântica:

```text
REQUIRED_FOR_TARGET
→ necessária para aceitar esta candidatura de Delivery

OPTIONAL_FOR_TARGET
→ pode participar da Delivery, mas sua ausência não bloqueia o aceite

OUT_OF_TARGET
→ não pertence à candidatura corrente
```

---

# 4. Regra de bloqueio

Se qualquer Entrega de Valor `REQUIRED_FOR_TARGET` não estiver em condição válida
para a candidatura:

```text
Delivery acceptance = BLOCKED
```

O sistema deve:

```text
concluir o valor obrigatório
ou
realizar mudança governada de escopo/decomposição
```

Nunca:

```text
ignorar silenciosamente porque não deu tempo
```

---

# 5. Mudança de obrigatoriedade

Alterar:

```text
REQUIRED_FOR_TARGET
→ OPTIONAL_FOR_TARGET

ou

REQUIRED_FOR_TARGET
→ OUT_OF_TARGET
```

após o início da implementação é mudança material de escopo.

Requer:

```text
racional
impact assessment
authority
evidence
decision
history
baseline/version impact
```

Agente pode recomendar.

Agente não decide sozinho quando a mudança for material.

---

# 6. Challenge de decomposição antes de reduzir compromisso

Antes de reclassificar uma Entrega de Valor obrigatória como opcional ou fora do
target, o processo deve perguntar:

```text
esta Entrega de Valor contém mais de um incremento de valor?
há partes com obrigatoriedade diferente?
é possível dividir sem falsificar a intenção original?
```

Exemplo:

```text
EV-C3 — Alertar estouro de orçamento
```

pode esconder:

```text
EV-C3A — Mostrar visualmente que o orçamento estourou
EV-C3B — Enviar notificação automática
```

Então o Delivery Target pode decidir:

```text
EV-C3A REQUIRED_FOR_TARGET
EV-C3B OPTIONAL_FOR_TARGET
```

---

# 7. Split governado

Quando uma Entrega de Valor é dividida:

```text
EV-C3
   ↓ SPLIT
EV-C3A
EV-C3B
```

a origem deve permanecer rastreável.

O sistema deve preservar:

```text
predecessor
successors
reason
authority
baseline
decision
effective target version
```

A Entrega de Valor original não é silenciosamente reescrita.

---

# 8. Split após ACCEPTED

Se a Entrega de Valor original já estiver `ACCEPTED`, não existe split retroativo
da história.

Mudança material posterior cria successor(s) governados.

```text
EV-C3 v1 ACCEPTED
        ↓
new evidence / evolution
        ↓
successor(s)
```

---

# 9. OPTIONAL_FOR_TARGET pode entrar na Delivery

`OPTIONAL_FOR_TARGET` significa:

```text
não bloqueia
```

Não significa:

```text
proibida de participar
```

Se uma Entrega de Valor opcional estiver pronta, válida e compatível com o
baseline candidato, ela pode ser incluída na Delivery corrente.

Sua inclusão deve ser explícita no escopo final da candidatura.

---

# 10. OUT_OF_TARGET

Uma Entrega de Valor `OUT_OF_TARGET` não participa da candidatura corrente.

Ela pode:

```text
permanecer planejada para target futuro
ser reavaliada
ser cancelada
ser sucedida
```

conforme governança.

Ela não bloqueia a candidatura atual.

---

# 11. Relação temporal

A disposição é relativa ao Delivery Target.

Uma mesma Entrega de Valor pode ter:

```text
DT-01
EV-X = OUT_OF_TARGET

DT-02
EV-X = REQUIRED_FOR_TARGET
```

sem reescrever a história anterior.

---

# 12. Evidência mínima de Delivery Target

Candidato mínimo:

```text
delivery_target_id
version
project_id
target_name
scope statement
value_increment dispositions
required set
optional set
out-of-target set
baseline reference
normative_baseline_ref
decision authority
created_at
supersedes_ref
history
```

Detalhes físicos pertencem à camada de persistência/Technology Baseline.

---

# 13. Invariantes

```text
Delivery Target é governado e versionado
required ausente bloqueia Delivery
optional ausente não bloqueia
out-of-target não participa da candidatura
redução de compromisso é mudança material
split preserva lineage
accepted nunca é reescrito retroativamente
optional pronta pode ser incluída
disposição é relativa ao target
```

---

# 14. Status

```text
VD-03 Delivery Target model........ CLOSED — working decision
NB-0002............................ NOT IN FORCE
```


---

# 15. Canonical current target — VD-04

No MVP, um Project possui no máximo um Delivery Target autoritativo corrente.

Podem coexistir drafts, proposals, versões históricas e versões superseded.

Somente uma versão governa a candidatura corrente.

A relação de disposition pertence a `DeliveryTargetMembership`, não à
`ValueIncrement` intrinsecamente.

Esses fatos são canônicos e duráveis.


---

# 16. Scheduling priority — VD-05

No MVP, `REQUIRED_FOR_TARGET` elegível precede automaticamente
`OPTIONAL_FOR_TARGET`.

Humano autorizado pode aprovar prioridade diferente de forma governada.

`OUT_OF_TARGET` não compete por execução para a candidatura corrente.
