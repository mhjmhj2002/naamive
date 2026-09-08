# NAAMIVE — Implementation Internal Lifecycle

**Status:** RATIFIED  
**Versão:** 0.7  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a lifecycle interno da fase `Project.IMPLEMENTATION`  
**Deriva de:** `01_LIFECYCLE_MODEL.md`, `03_PROJECT_LIFECYCLE.md`, `05_WORK_ITEM_LIFECYCLE.md`, `06_EXECUTION_LIFECYCLE.md`, `07_INTERNAL_PHASE_LIFECYCLE_MODEL.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Escopo:** ciclo interno macro da fase `IMPLEMENTATION`, reconciliado com Entrega de Valor, Development Roadmap e Work Item Development Internal Lifecycle

---

# 1. Objetivo

Definir o ciclo interno funcional da fase:

```text
Project.state = IMPLEMENTATION
```

sem confundir:

```text
Project phase
Internal Phase Lifecycle
Work Item lifecycle
Execution lifecycle
telemetry
```

Este documento cobre o **ciclo macro interno da fase de implementação**.

O ciclo detalhado de desenvolvimento de cada Work Item é definido em
`13_WORK_ITEM_DEVELOPMENT_INTERNAL_LIFECYCLE.md`.

---

# 2. Problema que este lifecycle resolve

`Project = IMPLEMENTATION` sozinho não explica:

```text
a implementação foi preparada?
há trabalho materializando resultado?
resultados já estão sendo integrados?
a implementação integrada foi verificada?
o Project está realmente pronto para entrar em VALIDATION?
```

Também não pode assumir uma linha única porque vários Work Items podem estar em
estágios diferentes simultaneamente.

Exemplo válido:

```text
WI-042 = CODING
WI-043 = UNIT_TESTING
WI-044 = TECHNICAL_REVIEW
```

enquanto o Project continua em:

```text
IMPLEMENTATION
```

---

# 3. Lifecycle interno proposto — revisado

Fluxo macro de trabalho:

```text
PREPARE_IMPLEMENTATION
        ↓
MATERIALIZE_VALUE
        ↓
VERIFY_IMPLEMENTATION
        ↓
READY_FOR_VALIDATION
```

Integração de resultados não é um estado macro exclusivo; ocorre continuamente por Work Item e baseline cumulativa.

A integração ocorre dentro da materialização sequencial de cada Work Item /
Entrega de Valor, produzindo uma baseline técnica cumulativa e identificável.

Este desenho continua candidato da `NB-0002`.

---

# 4. Regra fundamental

O estado interno da fase representa a maturidade **global da implementação do
Project**, não o passo atual de cada Work Item.

Portanto:

```text
Implementation Internal Lifecycle
!=
Work Item Development Lifecycle
```

O estado interno global é derivado de fatos e critérios do conjunto de trabalho
relevante.

---

# 5. PREPARE_IMPLEMENTATION

## 5.1 Significado

A fase de implementação foi iniciada, mas o sistema ainda está consolidando as
condições necessárias para materializar trabalho autorizado com segurança.

Responde:

```text
temos contexto e continuidade suficientes para começar a executar o plano?
```

## 5.2 Deve verificar, conforme aplicável

```text
Business Baseline atual
Normative Baseline aplicável
Work Items planejados
Work Items elegíveis ou rota para torná-los elegíveis
dependências
autoridades
gates
findings bloqueadores
riscos
ambiente/repositórios/artefatos necessários
estratégia de integração
estratégia de validação posterior
```

## 5.3 Saída normal

```text
PREPARE_IMPLEMENTATION → MATERIALIZE_VALUE
```

Requer:

```text
ao menos um caminho de trabalho executável
continuidade explícita para itens ainda não executáveis
nenhum blocker global incompatível
nenhuma decisão material ausente que obrigue implementador a inventar lei
```

## 5.4 Retorno / desvio

Se preparação descobrir problema material:

```text
→ PLANNING
→ ARCHITECTURE
→ CONCEPTION
```

conforme a natureza da lacuna.

---

# 6. MATERIALIZE_VALUE

## 6.1 Significado

Existe uma Entrega de Valor ativa avançando pelo lifecycle necessário para
materializar e aceitar seu valor.

Responde:

```text
qual valor de negócio estamos produzindo agora?
em qual estado da Entrega de Valor ele está?
```

O MVP permite uma única Entrega de Valor ativa por vez.

---

## 6.2 Ordem inicial

A ordem de Entregas de Valor é governada por:

```text
valor
dependências
plano
baseline
```

e não por ordem arbitrária de criação.

---

## 6.3 Work Items sequenciais

Dentro da Entrega de Valor ativa, o MVP executa uma Work Item por vez.

Exemplo:

```text
EV-01 Criar orçamento mensal

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

A próxima Work Item somente inicia quando a anterior atingiu a condição governada
necessária para avançar.

---

## 6.4 Baseline cumulativa

Cada resultado aceito e integrado atualiza uma baseline técnica identificável.

Exemplo:

```text
B10
 ↓ WI-01
B11
 ↓ WI-02
B12
 ↓ WI-03
B13
```

A próxima Work Item inicia sobre a baseline válida definida pelo plano.

---

## 6.5 Pull Request

Quando a estratégia técnica usar GitHub, a Entrega de Valor pode possuir um Pull
Request principal e, quando necessário, Pull Requests adicionais.

`PR MERGED` não conclui a Entrega de Valor por si só.

O merge produz evidência/baseline técnica que ainda deve satisfazer os critérios
de valor e o lifecycle de `ValueIncrement`.

---

## 6.6 Falha / rework

Falha de uma Work Item deve, primeiro, ser tratada dentro do compromisso válido:

```text
retry
recovery
rework
review
retest
reconciliation
```

Somente quando a causa provar erro material de planejamento, arquitetura ou
concepção o fluxo afetado retorna à fase macro apropriada.

---

## 6.7 Conclusão da Entrega de Valor

`todos os Work Items DONE` não é critério suficiente por si só.

A conclusão depende do lifecycle de `ValueIncrement`, a ser fechado em `VD-02`.

---

## 6.8 Próxima Entrega de Valor

Após a Entrega de Valor corrente satisfazer a condição exigida pelo plano:

```text
EV-01
   ↓
EV-02
   ↓
EV-03
```

A implementação continua sequencialmente.

---

## 6.9 Preparação para paralelismo futuro

A política inicial é:

```text
active ValueIncrement = 1
active Work Item      = 1
```

Mas o modelo não pode gravar essa limitação como cardinalidade estrutural.

Evolução futura poderá permitir mais de uma Entrega de Valor ou Work Item ativa
quando regras de dependência, baseline, integração, fencing e autoridade
suportarem isso.

---

# 8. VERIFY_IMPLEMENTATION

## 8.1 Significado

A fase verifica se a implementação integrada está tecnicamente apta a se tornar
candidata à fase `VALIDATION`.

Responde:

```text
o que foi implementado está suficientemente consistente para passar à validação do Project?
```

## 8.2 Não é Project.VALIDATION

`VERIFY_IMPLEMENTATION` é verificação de prontidão técnica da implementação.

Não substitui:

```text
Project.VALIDATION
```

A validação do Project continua sendo fase macro própria.

## 8.3 Pode verificar

```text
build integrado
testes técnicos requeridos
regressão necessária
qualidade técnica
arquitetura
segurança técnica
observabilidade mínima
migrations
compatibilidade
evidências
findings técnicos
```

## 8.4 Resultado negativo

Pode produzir:

```text
VERIFY_IMPLEMENTATION → MATERIALIZE_VALUE
Project → PLANNING
Project → ARCHITECTURE
BLOCKED
```

conforme causa.

## 8.5 Saída normal

```text
VERIFY_IMPLEMENTATION → READY_FOR_VALIDATION
```

---

# 9. READY_FOR_VALIDATION

## 9.1 Significado

O ciclo interno de implementação concluiu que a baseline implementada está
tecnicamente preparada para a decisão de transição macro:

```text
Project.IMPLEMENTATION → Project.VALIDATION
```

## 9.2 Limite semântico

`READY_FOR_VALIDATION` não altera o Project automaticamente.

Ainda podem ser necessários:

```text
authority
gate
audit
finding treatment
risk treatment
transition contract
```

## 9.3 Estado terminal do ciclo interno

Dentro desta instância do ciclo interno de `IMPLEMENTATION`,
`READY_FOR_VALIDATION` é terminal para o fluxo normal.

Se a transição macro não ocorrer e nova evidência invalidar a readiness, a regra
de reentrada/reabertura deverá seguir o modelo geral da NB-0002.

Essa regra ainda exige fechamento formal.

---

# 10. Retornos normais do ciclo

Candidato inicial:

```text
PREPARE_IMPLEMENTATION
    → MATERIALIZE_VALUE

MATERIALIZE_VALUE
    → VERIFY_IMPLEMENTATION

VERIFY_IMPLEMENTATION
    → MATERIALIZE_VALUE
    → READY_FOR_VALIDATION
```

Retornos macro para fases anteriores de Project continuam governados pelo
`03_PROJECT_LIFECYCLE.md`.

---

# 11. Condições transversais

O ciclo interno deve suportar, sem apagar o estado principal:

```text
BLOCKED
WAITING
PAUSED
RECONCILING
RECOVERING
```

A nomenclatura canônica final ainda será harmonizada com os modelos superiores.

Toda condição transversal deve possuir:

```text
cause
cause_ref
owner
exit condition
continuity
escalation quando aplicável
Business Baseline
normative_baseline_ref
```

---

# 12. Relação com Work Items

O ciclo interno global observa o conjunto de Work Items relevante para a fase.

Ele não substitui os estados:

```text
PROPOSED
READY
IN_PROGRESS
IN_REVIEW
DONE
CANCELLED
```

Também não exige correspondência 1:1 entre:

```text
internal phase state
e
Work Item state
```

Exemplo válido:

```text
Implementation Internal = MATERIALIZE_VALUE

WI-042 = IN_PROGRESS
WI-043 = IN_REVIEW
WI-044 = BLOCKED
```

---

# 13. Relação com Executions

Executions materializam tentativas concretas de Work Items.

O ciclo interno global não usa:

```text
Execution RUNNING
```

como prova suficiente de progresso funcional.

Deve ser possível distinguir:

```text
Execution alive
atividade operacional
progresso funcional do Work Item
progresso agregado da fase
```

---

# 14. Persistência

O estado necessário para reconstruir este ciclo após restart deve ser durável.

No mínimo conceitual:

```text
implementation_phase_cycle_instance
definition/version
current internal state
state transition history
started_at
completed_at
baseline refs
continuity
blocking/waiting
reentry lineage
```

A forma física será definida posteriormente.

---

# 15. Projection

A projection deve permitir à UI mostrar a fase de forma verdadeira.

Exemplo:

```text
IMPLEMENTAÇÃO

✓ Preparação
● Materialização de valor
○ Verificação da implementação
○ Pronto para validação
```

Se houver paralelismo interno:

```text
3 Work Items em andamento
1 em review
1 bloqueado
```

A UI deve permitir drill-down sem transformar contagem simples em regra de
negócio.

---

# 16. Activity Center

O Activity Center deve conseguir representar este ciclo em modo compacto e
expandido.

Compacto:

```text
IMPLEMENTAÇÃO · Materializando trabalho
3 atividades em andamento · último progresso há 5 s
```

Expandido:

```text
✓ Preparação
● Materialização do trabalho
   ├── WI-042 · CODING
   ├── WI-043 · UNIT_TESTING
   └── WI-044 · TECHNICAL_REVIEW
○ Integração
○ Verificação
○ Pronto para validação
```

Os passos detalhados dos Work Items são definidos no Work Item Development Internal Lifecycle.

---

# 17. Validação em camadas

Durante `MATERIALIZE_VALUE`:

```text
Work Item review
→ prova resultado local do trabalho

ValueIncrement VALIDATING
→ prova o incremento de valor
```

Após todas as Entregas de Valor obrigatórias do Module estarem `ACCEPTED`:

```text
Module VALIDATING
→ prova coerência da capacidade
```

Em `VERIFY_IMPLEMENTATION`:

```text
Project
→ verifica se Modules obrigatórios estão suficientemente integrados
→ verifica Work Items transversais
→ fixa baseline candidata da implementação
```

Depois:

```text
Project.VALIDATION
```

continua sendo a fase macro que prova os critérios globais do Project.

Nenhuma dessas camadas deve ser colapsada.

---

# 18. Observability

Deve ser possível detectar:

```text
phase cycle stalled
no active continuity
all work streams blocked
integration repeatedly failing
verification repeatedly returning to rework
executor alive without functional progress
projection stale or incomplete
```

---

# 19. Restart proof

Cenário mínimo:

```text
Project = IMPLEMENTATION
Internal state = MATERIALIZE_VALUE
WI-042 = CODING
WI-043 = UNIT_TESTING

web/worker restart

→ internal state continua MATERIALIZE_VALUE
→ Work Items continuam explicáveis
→ passos concluídos não somem
→ liveness das Executions é reavaliada
→ recovery/reconciliation ocorre se necessário
→ UI reconstrói o Activity Center corretamente
```

---

# 20. Invariantes candidatas

```text
Project.IMPLEMENTATION != Implementation Internal Lifecycle
Implementation Internal Lifecycle != Work Item lifecycle
Work Item lifecycle != Execution lifecycle
paralelismo de Work Item não é colapsado em falso estado único
phase internal state é durável
phase readiness não promove Project automaticamente
integration opera sobre baseline identificável
verification != Project.VALIDATION
heartbeat != functional progress
UI não inventa estado interno
```

---

# 21. R2-02b — Work Item Development Lifecycle

Decisões fechadas:

```text
mesmo mecanismo para toda Work Item executável
passos não aplicáveis = NOT_APPLICABLE
IN_PROGRESS possui ciclo semântico explícito
IN_REVIEW possui ciclo semântico explícito
READY_FOR_DECISION permanece explícito
IN_REVIEW → IN_PROGRESS cria nova Development Cycle Instance causal
impedimento não bloqueante é persistido e não interrompe trabalho elegível
impedimento bloqueante interrompe o affected scope
Development Roadmap persiste impedimentos/remediações
agent não é memória do roadmap
Roadmap Supervisor deriva continuidade e next eligible work
```

Status:

```text
R2-02 IMPLEMENTATION macro................ CLOSED — working
R2-02b Work Item Development.............. CLOSED — working
```

---

# 22. Development Roadmap

Durante `MATERIALIZE_VALUE`, cada frente governada deve possuir roadmap durável
suficiente para representar:

```text
Work Items
dependências
impedimentos
remediações
human decisions
recovery/reconciliation
```

Finding `NON_BLOCKING` é registrado e não interrompe trabalho ainda elegível.

Finding `BLOCKING` interrompe seu affected scope e materializa continuidade
acionável.

---

# 23. Princípio final

A fase `IMPLEMENTATION` deve ser explicável em dois níveis simultâneos:

```text
onde está a implementação global do Project?
```

e:

```text
onde está cada trabalho concreto dentro dela?
```

Sem essa separação, a UI mente ou o domínio fica cego.
