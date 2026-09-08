# NAAMIVE — Value Increment Lifecycle

**Status:** RATIFIED  
**Versão:** 0.4  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a lifecycle específico de Entrega de Valor (`ValueIncrement`)  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Deriva de:** `01_LIFECYCLE_MODEL.md`, `03_PROJECT_LIFECYCLE.md`, `04_MODULE_LIFECYCLE.md`, `05_WORK_ITEM_LIFECYCLE.md`, `09_VALUE_DELIVERY_MODEL.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Escopo:** identificação, definição, planejamento, implementação, validação, aceite, rework, terminalidade e sucessão de Entrega de Valor

---

# 1. Objetivo

Definir o lifecycle governado da **Entrega de Valor**.

Uma Entrega de Valor responde:

```text
qual incremento finito de valor de negócio este Module está produzindo?
```

Ela não é:

```text
Module
Work Item
Execution
Pull Request
Project Delivery
```

---

# 2. Ownership

Cada `ValueIncrement` pertence a exatamente um `Module`.

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

Ownership compartilhado entre vários Modules é proibido.

Dependências com resultados de outros Modules são permitidas e devem ser
expressas por condição verificável.

---

# 3. Estados normativos candidatos aprovados em VD-02

Lifecycle principal:

```text
IDENTIFIED
    ↓
DEFINED
    ↓
PLANNED
    ↓
IMPLEMENTING
    ↓
VALIDATING
    ↓
READY_FOR_ACCEPTANCE
    ↓
ACCEPTED
```

Estado terminal alternativo:

```text
CANCELLED
```

Condições transversais:

```text
BLOCKED
PAUSED
WAITING
```

`ACCEPTED` e `CANCELLED` são terminais para a instância.

---

# 4. IDENTIFIED

## 4.1 Significado

Foi identificado um incremento de valor candidato dentro de um Module.

Ainda não existe definição suficiente para planejamento executável.

## 4.2 Evidência mínima

Conforme aplicável:

```text
module owner
value statement preliminar
beneficiário/ator
problema ou capacidade afetada
motivo de existência
relação com a Delivery alvo
```

## 4.3 Saída

```text
IDENTIFIED → DEFINED
IDENTIFIED → CANCELLED
```

---

# 5. DEFINED

## 5.1 Significado

O incremento possui valor, limites e critérios suficientemente compreendidos.

## 5.2 Definição mínima

Deve permitir responder:

```text
qual valor será entregue?
para quem?
o que está dentro?
o que está fora?
como saberemos que o valor existe?
de que resultados externos depende?
```

Deve conter, conforme aplicável:

```text
value statement
in scope / out of scope
critérios de valor
critérios de aceite
dependências
riscos
questões abertas
impacto
```

## 5.3 Challenge do agente

Antes de considerar a definição suficiente, o processo deve questionar:

```text
isso realmente entrega valor?
está grande demais?
está pequeno demais?
mistura dois valores diferentes?
há uma entrega útil menor possível?
há dependência oculta?
está refletindo arquitetura técnica em vez de negócio?
```

## 5.4 Retornos

```text
DEFINED → IDENTIFIED
DEFINED → CANCELLED
```

Retorno não apaga histórico.

---

# 6. PLANNED

## 6.1 Significado

A Entrega de Valor possui plano executável suficiente para iniciar
materialização.

## 6.2 Conteúdo esperado

Conforme aplicável:

```text
Work Items
ordem
dependências
critérios de aceite
evidências esperadas
estratégia de validação
integração
risco
review/audit requirements
baseline aplicável
```

## 6.3 Relação com Work Item

Work Item governada por Module deve referenciar a Entrega de Valor que ajuda a
produzir.

A Entrega de Valor não é considerada `PLANNED` apenas porque existe uma lista de
tasks.

O plano deve explicar como o conjunto de trabalho produz o valor definido.

## 6.4 Readiness para implementação

Para:

```text
PLANNED → IMPLEMENTING
```

deve existir, no mínimo:

```text
próxima Work Item executável ou continuidade válida para torná-la READY
dependências iniciais tratadas
nenhuma decisão material ausente
authority aplicável
findings bloqueadores tratados
baseline identificável
```

---

# 7. IMPLEMENTING

## 7.1 Significado

Work Items autorizadas estão materializando o incremento de valor.

## 7.2 Política inicial do MVP

Execução inicial é sequencial:

```text
active ValueIncrement = 1
active Work Item      = 1
```

Isso é política de orquestração inicial, não limitação estrutural do domínio.

## 7.3 Fluxo conceitual

Exemplo:

```text
EV-01 Criar e editar orçamento mensal

WI-01
→ implementar
→ testar
→ revisar
→ integrar

WI-02
→ implementar
→ testar
→ revisar
→ integrar

WI-03
→ implementar
→ testar
→ revisar
→ integrar
```

A baseline técnica evolui de forma identificável:

```text
B10
 ↓ WI-01
B11
 ↓ WI-02
B12
 ↓ WI-03
B13
```

## 7.4 Pull Request

Quando GitHub for usado, a Entrega de Valor pode possuir:

```text
1 PR principal preferencialmente
1..N PRs quando necessário
```

O Pull Request é artefato técnico.

```text
PR MERGED != ValueIncrement ACCEPTED
```

## 7.5 Falha e rework

Falha operacional de Execution não altera automaticamente o estado da Entrega de
Valor.

Dentro do mesmo compromisso podem ocorrer:

```text
retry
recovery
rework
retest
review
reconciliation
```

Se surgir decisão material ausente, o avanço afetado deve parar e retornar ao
nível de planejamento/definição apropriado.

## 7.6 Saída

```text
IMPLEMENTING → VALIDATING
```

requer:

```text
Work Items necessários para o incremento concluídos/aceitos
nenhuma Execution em voo capaz de alterar a baseline candidata
resultado integrado identificável
baseline candidata da Entrega de Valor
continuidade para validação
```

---

# 8. VALIDATING

## 8.1 Significado

O sistema verifica se o **valor prometido** foi realmente materializado.

Esta validação é diferente de:

```text
review técnico de Work Item
Module.VALIDATING
Project.VALIDATION
```

## 8.2 Exemplo — Controle Financeiro Familiar

Entrega:

```text
Criar e editar orçamento mensal
```

Validação pode provar:

```text
usuário cria orçamento
define limites
salva
consulta novamente
edita
alteração persiste
regras definidas são respeitadas
```

Se uma dessas condições obrigatórias falhar, o valor ainda não está pronto para
aceite.

## 8.3 Resultado negativo

Pode produzir:

```text
VALIDATING → IMPLEMENTING
VALIDATING → PLANNED
```

quando respectivamente houver:

```text
rework dentro do compromisso
ou
problema material de plano/escopo
```

## 8.4 Saída normal

```text
VALIDATING → READY_FOR_ACCEPTANCE
```

requer:

```text
critérios de valor satisfeitos
critérios de aceite satisfeitos
evidência suficiente
findings bloqueadores tratados
riscos tratados conforme governança
baseline candidata identificada
```

---

# 9. READY_FOR_ACCEPTANCE

## 9.1 Significado

Implementação e validação da Entrega de Valor foram concluídas em profundidade
suficiente.

Resta a decisão governada de aceite quando exigida.

A UI deve tornar claro:

```text
implementada
validada
aguardando aceite
```

e não apresentar estado ambíguo de processamento.

## 9.2 Saídas

```text
READY_FOR_ACCEPTANCE → ACCEPTED
READY_FOR_ACCEPTANCE → VALIDATING
READY_FOR_ACCEPTANCE → IMPLEMENTING
```

Retorno exige causa/evidência.

---

# 10. ACCEPTED

## 10.1 Significado

O incremento de valor foi aceito para a baseline e escopo definidos.

Agora o NAAMIVE pode responder:

```text
qual valor de negócio ficou pronto?
```

com evidência rastreável.

## 10.2 Terminalidade

`ACCEPTED` é terminal para a instância.

Não é permitido reabrir silenciosamente uma Entrega de Valor aceita.

Mudança posterior material cria nova Entrega de Valor sucessora.

Exemplo:

```text
ValueIncrement v1 ACCEPTED
        ↓ nova necessidade/correção material
ValueIncrement v2 successor
```

A anterior permanece histórica.

## 10.3 O que ACCEPTED não significa

```text
Module INTEGRATED
Project VALIDATED
Project DELIVERED
Delivery criada
```

Esses fatos possuem lifecycles próprios.

---

# 11. CANCELLED

`CANCELLED` encerra a intenção da Entrega de Valor.

É terminal.

Cancelamento deve preservar:

```text
reason
authority
baseline
impact
Work Items afetadas
Executions em voo
effect certainty
continuity/reconciliation quando necessária
```

---

# 12. Condições transversais

## BLOCKED

Existe impedimento conhecido com intenção de continuidade preservada.

## WAITING

O avanço depende de fato externo conhecido e monitorável.

## PAUSED

O avanço foi suspenso por decisão governada.

Cada condição deve possuir, conforme aplicável:

```text
cause
cause_ref
owner
exit condition
fallback
escalation
Business Baseline
normative_baseline_ref
```

---

# 13. Retornos aprovados em VD-02

```text
IDENTIFIED → CANCELLED

DEFINED → IDENTIFIED
DEFINED → CANCELLED

PLANNED → DEFINED
PLANNED → CANCELLED

IMPLEMENTING → PLANNED
IMPLEMENTING → DEFINED
IMPLEMENTING → CANCELLED

VALIDATING → IMPLEMENTING
VALIDATING → PLANNED

READY_FOR_ACCEPTANCE → VALIDATING
READY_FOR_ACCEPTANCE → IMPLEMENTING

ACCEPTED → terminal
CANCELLED → terminal
```

Retornos não apagam histórico.

---

# 14. Relação com Module

Um Module pode possuir várias Entregas de Valor.

Exemplo:

```text
Module: Orçamento Familiar

EV-01 Criar/editar orçamento
EV-02 Comparar previsto x realizado
EV-03 Alertar estouro
```

Enquanto houver Entrega de Valor obrigatória para o baseline alvo ainda não
aceita, o Module não pode tratar a capacidade como pronta por simples contagem de
Work Items.

Para a transição:

```text
Module.IMPLEMENTING → Module.VALIDATING
```

deve existir, conforme o escopo alvo:

```text
todas as Entregas de Valor obrigatórias ACCEPTED
nenhuma Entrega de Valor ativa capaz de alterar o baseline
nenhuma Execution em voo capaz de alterar o baseline
baseline do Module identificável
continuidade válida para validação agregada
```

---

# 15. Validação em camadas

O NAAMIVE deve preservar quatro perguntas diferentes:

```text
Work Item review
→ este trabalho local está correto?

ValueIncrement VALIDATING
→ este incremento entrega o valor prometido?

Module VALIDATING
→ os incrementos aceitos formam uma capacidade coerente?

Project VALIDATION
→ o conjunto integrado satisfaz os critérios globais do Project?
```

Nenhuma camada substitui automaticamente a outra.

---

# 16. Finding após ACCEPTED

Se `Module.VALIDATING` ou validação superior descobrir problema material numa
Entrega de Valor já `ACCEPTED`:

```text
não reabrir a Entrega de Valor antiga
```

Deve existir successor/rework governado.

O Module pode retornar ao ponto apropriado de implementação enquanto preserva a
história do incremento anterior.

---

# 17. Persistência

Se `ValueIncrement` for ratificada na `NB-0002`, será entidade canônica durável.

Deve preservar, conforme aplicável:

```text
value_increment_id
module_id
project_id derivável
state
definition/version
impact
required/optional disposition
criteria
Business Baseline
normative_baseline_ref
dependencies
continuity
authority refs
evidence refs
Work Item relations
PR/artifact relations
started_at
completed_at
successor/predecessor refs
immutable transition history
```

Estado necessário para reconstrução após restart não pode viver apenas em
memória.

---

# 18. Projection / Activity Center

A UI deve conseguir mostrar:

```text
Module
  ↓
Entregas de Valor
  ↓
Work Items
  ↓
Executions
```

Exemplo:

```text
ORÇAMENTO FAMILIAR

✓ EV-01 Criar orçamento mensal        ACCEPTED
● EV-02 Realizado x planejado         IMPLEMENTING
○ EV-03 Alertar estouro               PLANNED

EV-02
  ✓ WI-04 Consolidar movimentações
  ● WI-05 Calcular realizado
  ○ WI-06 Exibir comparação
```

A projeção deriva do estado canônico.

---

# 19. Restart proof

Cenário mínimo:

```text
EV-02 = IMPLEMENTING
WI-05 = IN_PROGRESS
Execution = RUNNING
```

Após restart:

```text
EV-02 continua IMPLEMENTING
Work Items concluídas continuam concluídas
baseline permanece conhecida
continuidade é reconstruída
Execution é reavaliada/recover/reconcile conforme lei
UI volta a mostrar o ponto correto
```

---

# 20. Invariantes

```text
ValueIncrement pertence a exatamente um Module
ValueIncrement != Module
ValueIncrement != Work Item
ValueIncrement != Pull Request
ValueIncrement != Project Delivery
PR MERGED != ValueIncrement ACCEPTED
todos Work Items DONE != aceite automático
ACCEPTED é terminal
mudança material posterior cria successor
UI não inventa valor, estado ou progresso
restart não apaga progresso funcional
```
