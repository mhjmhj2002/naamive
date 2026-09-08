# NAAMIVE — Entrega de Valor Model

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.6  
**Autoridade de ratificação:** PENDING — Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** NOT YET RATIFIED  
**Autoridade:** candidato a modelo normativo de Entrega de Valor  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Deriva de:** `01_LIFECYCLE_MODEL.md`, `03_PROJECT_LIFECYCLE.md`, `04_MODULE_LIFECYCLE.md`, `05_WORK_ITEM_LIFECYCLE.md`, `07_INTERNAL_PHASE_LIFECYCLE_MODEL.md`  
**Normative Baseline:** `NB-0002` — candidate  
**Vigência:** NOT IN FORCE  
**Escopo:** relação Project → Module → Entrega de Valor → Work Item → Execution

---

# 1. Objetivo

Introduzir explicitamente no NAAMIVE o conceito de **Entrega de Valor** como
unidade finita e verificável de valor produzida dentro de um Module.

O objetivo é impedir que um Module seja decomposto em trabalho arbitrário sem
responder:

```text
qual valor de negócio este conjunto de trabalho entrega?
```

---

# 2. Hierarquia candidata

```text
Need
  ↓
Project
  ↓
Module
  ↓
Entrega de Valor
  ↓
Work Item
  ↓
Execution
```

Significados:

```text
Project
→ transforma uma Need aceita em resultado entregue

Module
→ capacidade de negócio coerente e relativamente estável

Entrega de Valor
→ incremento finito, utilizável e verificável dentro do Module

Work Item
→ trabalho planejado necessário para produzir parte desse incremento

Execution
→ tentativa concreta e autorizada de executar um Work Item
```

---

# 3. Module continua sendo capacidade de negócio

A introdução de Entrega de Valor não transforma `Module` em camada técnica.

Exemplos conceituais de Module:

```text
Acesso e Identidade
Movimentações Financeiras
Orçamento Familiar
Visão Financeira
```

Continuam inválidos como Module:

```text
Frontend
Backend
Database
React
Controllers
Repositories
```

---

# 4. Exemplo — Controle Financeiro Familiar

```text
PROJECT
Controle Financeiro Familiar

└── MODULE
    Orçamento Familiar

    ├── EV-01
    │   Criar orçamento mensal
    │
    │   ├── WI-01 Estruturar orçamento
    │   ├── WI-02 Definir limites por categoria
    │   └── WI-03 Editar orçamento
    │
    ├── EV-02
    │   Acompanhar realizado x planejado
    │
    │   ├── WI-04 Consolidar movimentações
    │   ├── WI-05 Calcular realizado
    │   └── WI-06 Exibir comparação
    │
    └── EV-03
        Alertar estouro de orçamento
```

A Entrega de Valor é o resultado compreensível.

Os Work Items são o trabalho necessário para produzi-lo.

---

# 5. Ownership e cardinalidade — VD-01 FECHADO

Decisões de trabalho aprovadas:

```text
1 Project → N Modules
1 Module → 1..N Entregas de Valor
1 Entrega de Valor → 1..N Work Items
```

Cada Entrega de Valor pertence a **exatamente um Module**.

Não existe ownership compartilhado de uma mesma Entrega de Valor entre vários
Modules.

Quando um resultado depender de capacidades de outros Modules, a Entrega de
Valor permanece sob um único Module e registra dependências por **resultado
necessário verificável**.

Exemplo:

```text
Module: Visão Financeira
EV: Exibir resumo personalizado

depends on:
- identidade autenticada disponível
- orçamento mensal disponível
```

A experiência integrada que atravessa vários Modules é validada no nível
apropriado de Project; não transforma a Entrega de Valor em mini-Project.


---

# 6. Regra de decomposição do Module

Um Module destinado à implementação deve possuir **uma ou mais Entregas de Valor identificadas e governadas** antes de ser decomposto em Work Items executáveis.

É proibido usar a decomposição direta `Module → Work Items` como caminho normal de implementação.

O planejamento deve perguntar:

```text
quantos incrementos de valor existem neste Module?
cada incremento é compreensível por negócio?
cada incremento possui resultado verificável?
está grande demais?
está pequeno demais?
há dependências?
há ordem recomendada?
há valor intermediário real?
```

Não existe quantidade fixa de Entregas de Valor por Module.

---

# 7. Agente de planejamento

O processo de planejamento deve possuir capacidade explícita de questionar e
propor a decomposição do Module em Entregas de Valor.

Responsabilidades candidatas:

```text
carregar definição do Module
identificar resultados de negócio possíveis
propor candidatos a Entrega de Valor
questionar granularidade
identificar dependências
identificar riscos
propor sequência
propor critérios de valor/aceite
explicar trade-offs
apresentar recomendação
```

O agente não possui autoridade para congelar unilateralmente uma decomposição
material.

---

# 8. Human decision / brainstorm

Quando a decomposição for material, o sistema deve produzir superfície de decisão
humana com:

```text
Module
candidatos a Entrega de Valor
racional
alternativas
dependências
impacto
riscos
critérios de valor
recomendação do agente
pontos em aberto
```

A autoridade humana pode:

```text
aprovar
rejeitar
pedir ajuste
abrir brainstorm
combinar propostas
dividir uma Entrega de Valor
agrupar Entregas de Valor
```

A decisão deve ser persistida e rastreável.

---

# 9. Critério de tamanho

Cada Entrega de Valor deve ser:

```text
compreensível
coesa
verificável
pequena o bastante para implementar com segurança
grande o bastante para produzir valor real
```

É inválido criar Entrega de Valor apenas para espelhar:

```text
uma classe
um endpoint
uma tabela
uma camada técnica
uma task operacional
```

sem justificativa de valor de negócio.

---

# 10. Relação com Work Item — VD-01 FECHADO

Para Work Item governada por Module:

```text
value_increment_ref = REQUIRED
```

Isto significa:

```text
Module-scoped Work Item
→ deve declarar qual Entrega de Valor ajuda a materializar
```

Work Items governadas diretamente pelo Project continuam permitidas para trabalho
transversal que não possua ownership honesto em um único Module.

Quando útil, uma Work Item transversal pode referenciar as Entregas de Valor que
suporta, mas essa referência não altera seu owner.

É inválido manter Work Item de Module sem conseguir responder:

```text
qual Entrega de Valor este trabalho ajuda a produzir?
```

---

# 11. Entrega de Valor não é Work Item grande

```text
Entrega de Valor
→ resultado

Work Item
→ trabalho
```

Exemplo:

```text
Entrega de Valor
→ usuário consegue criar e editar orçamento mensal

Work Items
→ persistir orçamento
→ definir limites
→ validar regras
→ construir superfície
→ testar comportamento
```

---

# 12. Entrega de Valor não é Module

Module é capacidade relativamente estável.

Entrega de Valor é incremento finito daquela capacidade.

```text
Module
Orçamento Familiar

EV-01 Criar orçamento mensal
EV-02 Comparar realizado x planejado
EV-03 Alertar estouro
EV-04 Simular próximo mês
```

---

# 13. Entrega de Valor não é Project Delivery

O NAAMIVE já possui `Delivery` como registro terminal de aceite do Project.

Portanto:

```text
Entrega de Valor != Delivery
```

Nome humano de trabalho:

```text
Entrega de Valor
```

Nome canônico de máquina permanece **OPEN**.

Candidato técnico:

```text
ValueIncrement
```

---

# 14. Lifecycle próprio

A Entrega de Valor possui lifecycle próprio aprovado como governed decision em `VD-02`:

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

Detalhes, retornos, terminalidade, persistência e relação com Module estão definidos em `10_VALUE_INCREMENT_LIFECYCLE.md` como governed decision da candidata `NB-0002`.

---

# 15. Quando uma Entrega de Valor pode ser considerada concluída

Não basta:

```text
todos os Work Items DONE
```

Critério candidato:

```text
Work Items necessários concluídos
+
resultado integrado
+
critérios de valor satisfeitos
+
evidência suficiente
+
review/audit quando aplicável
+
aceite válido
```

---

# 16. Sequencialidade inicial — VD-01 FECHADO

O MVP executa de forma sequencial.

Política inicial:

```text
max active Value Increments = 1
max active Work Items        = 1
```

A sequência é governada por valor, dependências e plano, não por conveniência
técnica.

Não é obrigatório concluir todas as Entregas de Valor de um Module antes de
começar uma Entrega de Valor de outro Module.

Exemplo:

```text
EV-A1 Login
    ↓
EV-M1 Registrar movimentações
    ↓
EV-O1 Criar orçamento mensal
    ↓
EV-V1 Exibir visão financeira
```

O domínio, persistência e contratos não podem assumir que paralelismo será
impossível no futuro.

Paralelismo futuro deve ser habilitável por evolução de política/orquestração,
sem reengenharia do modelo de negócio.

---

# 17. Relação com Implementation Internal Lifecycle — VD-01 FECHADO

O ciclo interno de `Project.IMPLEMENTATION` deve operar sobre Entregas de Valor,
e não apenas sobre uma fila sem contexto de Work Items.

Modelo inicial sequencial:

```text
PREPARE_IMPLEMENTATION
        ↓
MATERIALIZE_VALUE
        │
        ├── EV-01
        │     ├── WI-01 ciclo completo
        │     ├── WI-02 ciclo completo
        │     └── WI-03 ciclo completo
        │
        ├── EV-02
        │     └── ...
        │
        ↓
VERIFY_IMPLEMENTATION
        ↓
READY_FOR_VALIDATION
```

Cada Work Item é materializada, testada, revisada e integrada à baseline corrente
antes de iniciar a próxima Work Item elegível, salvo futura política explícita de
paralelismo.

A Entrega de Valor somente pode avançar para aceite conforme seu lifecycle próprio
e critérios de valor, a serem fechados em `VD-02`.

---

# 18. Persistência

Se Entrega de Valor se tornar entidade governada, deve possuir estado durável.

Candidato mínimo:

```text
value_delivery_id
project_id
module_id
definition/version
state
impact
business_baseline_ref
normative_baseline_ref
criteria
owner/authority refs
continuity
dependencies
started_at
completed_at
history
```

---

# 19. Projection / UI

A UI deve conseguir mostrar:

```text
Module
  ↓
Entregas de Valor
  ↓
Work Items
```

Exemplo:

```text
Orçamento Familiar

✓ EV-01 Criar orçamento mensal
● EV-02 Realizado x planejado
○ EV-03 Alertar estouro

EV-02
  ✓ Consolidar movimentações
  ● Calcular realizado
  ○ Exibir comparação
```

A UI não inventa a decomposição.

---

# 20. Agent challenge obrigatório

O agente de planejamento não deve apenas aceitar uma decomposição proposta.

Ele deve questionar:

```text
isso realmente entrega valor?
isso está grande demais?
isso está pequeno demais?
podemos obter valor antes?
existe dependência oculta?
estamos agrupando trabalho só por conveniência técnica?
há uma Entrega de Valor misturando resultados diferentes?
há Work Item sem valor rastreável?
```

---

# 21. Decisões materiais

Criar, dividir, agrupar, remover ou alterar materialmente uma Entrega de Valor
deve ser decisão rastreável.

Mudança material durante implementação pode exigir:

```text
replanning
revalidation
baseline impact
Work Item classification
dependency re-evaluation
```

---

# 22. Documentos impactados

Alteração provável na candidata `NB-0002`:

```text
lifecycle/01_LIFECYCLE_MODEL.md
lifecycle/03_PROJECT_LIFECYCLE.md
lifecycle/04_MODULE_LIFECYCLE.md
lifecycle/05_WORK_ITEM_LIFECYCLE.md
lifecycle/07_INTERNAL_PHASE_LIFECYCLE_MODEL.md
lifecycle/08_IMPLEMENTATION_INTERNAL_LIFECYCLE.md
new Value Delivery lifecycle/model

governance/**
contracts/**
state/**
orchestration/**
api/**
ui/**
observability/**
implementation/**
```

A Constituição também deve ser revisada por conformance, sem alteração automática.

---

# 23. Readiness de planejamento — VD-01 FECHADO

Antes de `Project.IMPLEMENTATION`, para a Delivery alvo:

```text
Modules relevantes
→ identificados/definidos em profundidade suficiente

Entregas de Valor relevantes
→ identificadas
→ objetivo compreendido
→ ordem/dependências conhecidas
→ critérios de valor em nível suficiente
```

A primeira Entrega de Valor a executar deve estar planejada em profundidade
suficiente para que seus próximos Work Items possam atingir `READY` sem invenção
material do implementador.

Não é obrigatório detalhar até o último Work Item de todas as Entregas de Valor
distantes antes de começar a primeira, desde que o mapa global de valor,
dependências e direção do Project esteja conhecido e governado.

---

# 24. Challenge do agente — VD-01 FECHADO

O agente de planejamento deve **questionar ativamente** a decomposição de cada
Module.

Perguntas mínimas:

```text
isso realmente entrega valor?
a Entrega de Valor está grande demais?
está pequena demais?
há dois valores distintos misturados?
podemos entregar valor útil antes?
há dependência oculta?
há Work Item sem rastreabilidade de valor?
a decomposição está refletindo arquitetura técnica em vez de negócio?
```

O agente deve apresentar:

```text
proposta
racional
alternativas
trade-offs
dependências
riscos
critérios de valor
recomendação
```

Decomposição material exige decisão governada.

A autoridade humana pode:

```text
APPROVE
REJECT
REQUEST_ADJUSTMENT
OPEN_BRAINSTORM
SPLIT
MERGE
```

O histórico da decisão deve ser durável.

---

# 25. Mapeamento para Pull Request — decisão técnica aprovada de direção

A Entrega de Valor pode ser vinculada a artefatos técnicos de implementação,
incluindo Pull Requests do GitHub.

Separação obrigatória:

```text
Entrega de Valor
!=
Pull Request
```

A Entrega de Valor é verdade de negócio governada.

O Pull Request é evidência/artefato técnico que materializa parte ou todo o
resultado.

Política preferencial do MVP:

```text
1 Entrega de Valor
→ 1 Pull Request principal, quando viável
```

O modelo deve suportar:

```text
1 Entrega de Valor
→ 1..N Pull Requests
```

para casos como múltiplos repositórios, correções, migrations ou componentes
necessariamente separados.

Papéis técnicos candidatos:

```text
PRIMARY
SUPPORTING
REWORK
FIX
```

`PR MERGED` **não** significa automaticamente `Entrega de Valor ACCEPTED`.

Fluxo conceitual:

```text
Work Items concluídos
        ↓
PR técnica
        ↓
review / merge
        ↓
baseline técnica identificável
        ↓
validação dos critérios de valor
        ↓
aceite governado da Entrega de Valor
```

O vínculo Entrega de Valor ↔ PR deve ser persistido.

Detalhes físicos de GitHub, branch strategy, repository mapping e schema pertencem
à Technology Baseline / implementação técnica e não devem virar lei de negócio.

---

# 26. Nome canônico

Nome humano:

```text
Entrega de Valor
```

Nome canônico de máquina adotado como candidato para evitar colisão com a entidade
`Delivery` do Project:

```text
ValueIncrement
```

A documentação pode usar:

```text
Entrega de Valor (ValueIncrement)
```

quando a distinção for útil.


---

# 28. Princípio final

O NAAMIVE não deve medir implementação apenas por:

```text
quantos Work Items terminaram?
```

Ele deve conseguir responder:

```text
qual valor de negócio ficou pronto?
```
