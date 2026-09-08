# NAAMIVE — Internal Phase Lifecycle Model

**Status:** RATIFIED  
**Versão:** 0.3  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Autoridade:** candidato a modelo normativo dos ciclos internos das fases de Project  
**Deriva de:** `01_LIFECYCLE_MODEL.md`, `03_PROJECT_LIFECYCLE.md`, `05_WORK_ITEM_LIFECYCLE.md`, `06_EXECUTION_LIFECYCLE.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Normative Baseline:** `NB-0002`  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Escopo:** ciclos internos obrigatoriamente avaliados para todas as fases não terminais de Project: `CONCEPTION`, `ARCHITECTURE`, `PLANNING`, `IMPLEMENTATION`, `VALIDATION` e `DELIVERY`

---

# 1. Objetivo

Definir o conceito normativo que permite a cada fase não terminal do lifecycle de
Project possuir um ciclo interno explícito, observável, auditável e projetável.

O objetivo é eliminar a lacuna entre:

```text
Project phase
    ↓
Work Item
    ↓
Execution
```

quando o sistema precisa responder também:

```text
em qual passo funcional desta fase estamos?
o que já foi concluído?
o que está em andamento?
o que está previsto depois?
o que está bloqueado ou aguardando?
```

Este documento existe para impedir que UI, agent, worker ou implementação inventem
esse processo em tempo de execução.

---

# 2. Problema identificado

A baseline `NB-0001` define:

```text
Project lifecycle
Work Item lifecycle
Execution lifecycle
```

mas não define, como conceito próprio, o ciclo interno de cada fase do Project.

Exemplo:

```text
Project = IMPLEMENTATION
Work Item = IN_PROGRESS
Execution = RUNNING
```

Essas três verdades ainda não respondem:

```text
o desenvolvimento está preparando contexto?
codificando?
executando testes unitários?
executando integração?
em revisão?
corrigindo?
retestando?
finalizando?
```

Sem regra própria, qualquer resposta seria inventada por implementação ou UI.

---

# 3. Separação obrigatória de níveis

O NAAMIVE deve preservar os seguintes níveis sem sobreposição semântica:

```text
NÍVEL 1 — PROJECT LIFECYCLE
em qual grande fase da jornada do Project estamos?

NÍVEL 2 — INTERNAL PHASE LIFECYCLE
em qual passo funcional daquela fase estamos?

NÍVEL 3 — WORK ITEM LIFECYCLE
qual compromisso planejado de trabalho está sendo produzido?

NÍVEL 4 — EXECUTION LIFECYCLE
qual tentativa concreta e autorizada está executando trabalho?

NÍVEL 5 — TELEMETRY / ACTIVITY SIGNALS
o executor está vivo e qual atividade operacional foi observada recentemente?
```

Nenhum nível redefine silenciosamente o outro.

---

# 4. Project phase continua sendo a verdade macro

O lifecycle de Project permanece:

```text
CONCEPTION
    ↓
ARCHITECTURE
    ↓
PLANNING
    ↓
IMPLEMENTATION
    ↓
VALIDATION
    ↓
DELIVERY
    ↓
DELIVERED
```

O ciclo interno não cria novos estados macro de Project.

Exemplo:

```text
Project.state = IMPLEMENTATION
```

permanece verdadeiro enquanto o ciclo interno de `IMPLEMENTATION` percorre seus
passos próprios.

---

# 5. Internal Phase Lifecycle

Cada fase não terminal do Project pode possuir uma definição explícita de ciclo
interno.

Fases obrigatoriamente avaliadas nesta rodada:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

`DELIVERED` é terminal e não possui ciclo interno de avanço normal.

---

# 6. Definição de ciclo interno

Uma definição de ciclo interno deve possuir, conforme aplicável:

```text
phase
definition_id
version
ordered or graph-based steps
entry conditions
exit conditions
step applicability rules
optional-step rules
parallelism rules
dependencies
expected evidence
authority requirements
continuity rules
blocking/waiting rules
failure handling
recovery/reconciliation behavior
projection obligations
observability obligations
```

A forma física será definida posteriormente.

---

# 7. Instância de ciclo interno

Quando um Project entra em uma fase que possui ciclo interno, o sistema deve
possuir representação canônica suficiente para responder:

```text
qual definição governa?
qual versão?
quando começou?
quais passos se aplicam?
qual passo está ativo?
quais foram concluídos?
quais ainda são esperados?
quais foram pulados por regra?
quais foram adicionados por mudança governada?
qual continuidade existe?
```

A decisão final sobre a identidade física dessa instância permanece aberta.

Nome de trabalho:

```text
Phase Cycle Instance
```

Este nome ainda não é normativo.

---

# 8. Phase Step

Um passo do ciclo interno representa uma unidade funcional observável da fase.

Um passo não deve representar operação microscópica de baixo nível.

Exemplos adequados:

```text
CODING
UNIT_TESTING
INTEGRATION_TESTING
TECHNICAL_REVIEW
```

Exemplos inadequados como passo funcional:

```text
abrir arquivo
ler linha 42
executar comando ls
heartbeat recebido
```

Esses últimos pertencem à telemetria.

---

# 9. Estado do passo

A baseline final deverá definir uma máquina de estados própria para `Phase Step`.

A nomenclatura canônica ainda está **OPEN**.

A UI poderá traduzir estados canônicos para linguagem humana como:

```text
A FAZER
FAZENDO
FEITO
```

e, quando aplicável:

```text
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
```

Os labels de UI não devem ser assumidos como estados normativos até decisão
explícita.

---

# 10. Progresso

O sistema pode mostrar progresso factual baseado em passos conhecidos.

Exemplo permitido:

```text
3 de 7 etapas previstas concluídas
```

É proibido derivar percentual temporal fictício apenas pela contagem de passos.

Exemplo proibido sem métrica real:

```text
3 de 7 etapas = 43% do tempo restante
```

Percentual somente pode existir quando houver grandeza realmente mensurável e
definida pela própria atividade.

---

# 11. Relação com Work Item

Internal Phase Lifecycle não substitui Work Item.

Work Item continua representando:

```text
compromisso planejado de mudança
```

Um passo interno pode:

```text
consumir uma ou várias Work Items
produzir Work Items
aguardar Work Item
ser satisfeito por resultado de Work Item
```

conforme a fase e a regra específica.

A relação exata deve ser definida por fase.

É proibido assumir:

```text
1 Phase Step = 1 Work Item
```

como regra universal.

---

# 12. Relação com Execution

Execution continua representando tentativa concreta de realizar uma Work Item.

Internal Phase Lifecycle não substitui:

```text
CREATED
ELIGIBLE
RUNNING
SUCCEEDED
FAILED
CANCELLED
```

Um passo funcional pode ser suportado por zero, uma ou várias Executions.

Exemplo:

```text
UNIT_TESTING
    ↓
Work Item de validação técnica
    ↓
Execution #1 FAILED
    ↓
Execution #2 SUCCEEDED
```

O passo funcional não deve apagar as tentativas operacionais.

---

# 13. Heartbeat e progresso funcional

Heartbeat prova liveness operacional.

Heartbeat não prova avanço do ciclo interno.

O sistema deve distinguir:

```text
executor ativo
```

de:

```text
passo funcional avançando
```

É válida a situação:

```text
Execution RUNNING
heartbeat recente
Phase Step sem progresso funcional recente
```

A projeção deve poder representar essa condição.

---

# 14. Activity signals

Telemetria pode enriquecer a explicação do passo ativo.

Exemplo:

```text
Phase Step = UNIT_TESTING
Execution = RUNNING
última atividade = "executando suíte de testes"
heartbeat = há 3 s
último progresso funcional = há 18 s
```

Telemetria nunca altera por si só o estado canônico do ciclo interno.

---

# 15. Planos conhecidos antes da execução

Quando a natureza da fase permitir, os passos aplicáveis devem ser
materializados antes ou no início da execução da fase.

Isso permite projetar:

```text
o que está previsto
o que já terminou
o que está ocorrendo
o que deve vir depois
```

O sistema não deve esconder plano conhecido do usuário quando esse plano for
material para compreensão da atividade.

---

# 16. Mudança do plano interno

A realidade pode revelar necessidade de novo passo, remoção, substituição ou
reordenação.

Mudança material do plano interno não pode ocorrer silenciosamente.

Deve preservar:

```text
old plan/version
new plan/version
cause
principal/authority quando aplicável
evidence
impact
continuity
```

O modelo final deverá decidir quando a mudança é:

```text
trivial operational adaptation
ou
material replanning
```

---

# 17. Reentrada em fase

Quando Project retorna para uma fase anterior ou reentra em fase já visitada, o
histórico anterior não pode ser apagado.

Exemplo:

```text
IMPLEMENTATION
    ↓
VALIDATION
    ↓
IMPLEMENTATION
```

A baseline `NB-0002` deverá decidir explicitamente se:

```text
nova entrada cria nova Phase Cycle Instance
ou
retoma uma instância anterior sob regras específicas
```

Recomendação de trabalho:

```text
preferir nova instância causal para cada reentrada material
```

Essa recomendação ainda não está ratificada.

---

# 18. Paralelismo

Um ciclo interno pode possuir passos paralelos quando a fase permitir.

Exemplo conceitual:

```text
SECURITY_VALIDATION ─┐
FUNCTIONAL_VALIDATION├→ FINAL_DECISION
UX_VALIDATION ───────┘
```

Paralelismo deve ser explícito.

A UI não deve inferir ordem linear quando a definição é um grafo.

---

# 19. Passos opcionais

Passos podem ser opcionais somente por regra explícita.

Exemplo:

```text
PERFORMANCE_VALIDATION
```

pode não se aplicar a determinado escopo.

Quando não aplicável, o sistema deve diferenciar:

```text
NOT_APPLICABLE / SKIPPED_BY_RULE
```

de:

```text
esquecido
não executado
```

A nomenclatura final permanece aberta.

---

# 20. Blocking e waiting

Cada passo ativo deve poder representar, quando aplicável:

```text
BLOCKED
WAITING
```

ou condição equivalente.

Deve existir:

```text
cause
owner
exit condition
continuity
escalation quando necessária
```

Um passo sem avanço e sem continuidade é inconsistente.

---

# 21. Falha

Falha de Execution não significa automaticamente falha do Phase Step.

Falha de Phase Step não significa automaticamente saída da fase macro.

A política específica deve decidir:

```text
retry
recovery
rework
return to earlier step
replan internal cycle
block
escalate
return Project to earlier phase
cancel
```

Toda relação deve ser explícita.

---

# 22. Completion do ciclo interno

Uma fase macro não deve avançar apenas porque "não há mais jobs".

O ciclo interno deve produzir evidência suficiente de que seus passos
obrigatórios e critérios de saída foram satisfeitos.

A conclusão do ciclo interno é uma das evidências para a transição de Project.

Ela não substitui:

```text
authority
gates
audit
findings
risk treatment
transition contract
```

quando exigidos.

---

# 23. Projection obrigatória

A projeção deve conseguir mostrar, para o principal correto:

```text
fase atual do Project
definição/version do ciclo interno
passos previstos
passos concluídos
passo(s) ativo(s)
passos futuros
waiting/blocking
último progresso funcional
liveness do executor quando aplicável
continuity
```

A UI apenas renderiza essa projeção.

---

# 24. Activity Center

O conceito de UI `Activity Center` será derivado deste modelo.

A UI não pode inventar:

```text
passos
ordem
estado do passo
progresso
próxima etapa
```

A representação compacta pode mostrar:

```text
✓ passo concluído
● passo atual
○ passo futuro
```

mas os fatos devem vir da projeção canônica.

---

# 25. Histórico local da fase

Além da timeline global do Project, deve existir capacidade de explicar o
histórico local da instância da fase.

Perguntas mínimas:

```text
quando entrou nesta fase?
qual plano inicial?
quais passos foram executados?
quais mudaram?
quais falharam?
quais foram repetidos?
qual passo está atual?
por que está aqui?
```

Isso não substitui o audit trail global.

---

# 26. Observability

Observability deve permitir detectar:

```text
phase cycle stalled
step active too long
executor alive without functional progress
step without continuity
unexpected step transition
projection missing expected step
phase exit with mandatory step incomplete
```

Alertas não substituem o estado canônico.

---

# 27. Fases a detalhar nesta rodada

A rodada `NB-0002` deve produzir definição explícita para:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

Cada definição deverá cobrir:

```text
steps
sequence/graph
optional paths
returns
parallelism
entry/exit
evidence
authority
Work Item relationship
Execution relationship
failure/recovery
projection
observability
```

---

# 28. Primeiro caso de prova — IMPLEMENTATION

`IMPLEMENTATION` será usado como primeiro caso completo para provar o modelo.

Exemplos de passos candidatos, **não aprovados**:

```text
PREPARE_CONTEXT
DESIGN_IMPLEMENTATION
CODING
STATIC_ANALYSIS
UNIT_TESTING
INTEGRATION_TESTING
TECHNICAL_REVIEW
FIXING
RETESTING
FINAL_VERIFICATION
COMPLETE
```

A lista final deve nascer de brainstorm específico.

---

# 29. Documentos impactados

A introdução deste conceito exige revisão transversal, no mínimo, de:

```text
lifecycle/01_LIFECYCLE_MODEL.md
lifecycle/03_PROJECT_LIFECYCLE.md
lifecycle/05_WORK_ITEM_LIFECYCLE.md
lifecycle/06_EXECUTION_LIFECYCLE.md

contracts/01_TRANSITION_CONTRACT.md
contracts/02_HANDOFF_CONTRACT.md
contracts/04_CONTINUITY_AND_RECOVERY_CONTRACT.md

state/01_CANONICAL_STATE_MODEL.md
state/02_PERSISTENCE_MODEL.md
state/03_PROJECTION_MODEL.md
state/04_BASELINE_AND_SUPERSESSION_MODEL.md

architecture/01_RUNTIME_ARCHITECTURE_MODEL.md

orchestration/01_ORCHESTRATION_MODEL.md
orchestration/02_AGENT_EXECUTION_MODEL.md
orchestration/03_SCHEDULING_AND_ELIGIBILITY_MODEL.md
orchestration/04_RECOVERY_AND_RECONCILIATION_MODEL.md

api/01_API_MODEL.md
api/02_COMMAND_QUERY_MODEL.md

ui/01_UI_MODEL.md
ui/02_ACTION_AND_DECISION_SURFACE_MODEL.md
ui/03_TIMELINE_AND_EXPLAINABILITY_MODEL.md

observability/01_OBSERVABILITY_MODEL.md
observability/02_AUDIT_TRAIL_AND_FORENSICS_MODEL.md

implementation/01_IMPLEMENTATION_READINESS.md
implementation/02_INCREMENTAL_BUILD_PLAN.md
implementation/03_TEST_AND_CERTIFICATION_STRATEGY.md
```

Outros documentos devem ser revisados por conformance mesmo quando nenhuma
alteração final for necessária.

---

# 30. Constituição

A Constituição atual já determina que máquinas de estado e lifecycles derivados
devem possuir autoridade normativa coerente e não podem ser inventados por
camadas inferiores.

A rodada deve revisar a Constituição.

Não existe, neste momento, evidência suficiente de que ela precise ser alterada.

Se o novo conceito exigir nova lei soberana, a Constituição deve ser alterada
antes dos documentos inferiores.

---

# 31. Invariantes candidatas

```text
Project phase != Internal Phase Lifecycle
Internal Phase Lifecycle != Work Item
Work Item != Execution
Execution state != functional phase progress
heartbeat != functional progress
UI does not invent phase steps
phase plan changes are traceable
mandatory phase step cannot disappear silently
phase exit cannot ignore incomplete mandatory steps
active phase step has continuity
history is preserved on reentry/rework
```

---

# 32. Decisões ainda abertas

Antes de ratificação, devem ser fechadas explicitamente:

```text
nome normativo definitivo do conceito
se Phase Cycle Instance é entidade canônica de primeira classe
identidade e versão da definição
máquina de estados de Phase Step
regra de criação/reentrada
regra de alteração de plano
regra de optional/skipped/not-applicable
relação exata com Work Items por fase
paralelismo e join semantics
regra de conclusão do ciclo
retorno entre passos
quando falha do passo escala para Project
projection contract
API/command contract
persistence/history model
retention/audit requirements
```

---

# 33. Status de implementação

Enquanto estas regras estiverem abertas:

```text
CODE IMPLEMENTATION........ BLOCKED
TECHNOLOGY BASELINE 2.7.... PAUSED
NB-0001..................... UNCHANGED / IN FORCE
NB-0002..................... WORKING ROUND / NOT IN FORCE
```

---

# 34. Regra aprovada — todas as fases devem possuir decomposição observável

A exigência de ciclo interno não é específica de `IMPLEMENTATION`.

A rodada `NB-0002` deve avaliar e definir explicitamente o mini-lifecycle funcional
de **cada fase não terminal do Project**:

```text
CONCEPTION
ARCHITECTURE
PLANNING
IMPLEMENTATION
VALIDATION
DELIVERY
```

Nenhuma dessas fases pode ser tratada na implementação apenas como:

```text
RUNNING
PROCESSING
LOADING
```

quando existir trabalho material acontecendo por baixo.

Cada fase deve possuir decomposição suficiente para tornar observável, conforme
aplicável:

```text
passos previstos
passo atual
passos concluídos
passos futuros
passos bloqueados
passos aguardando
passos não aplicáveis por regra
retornos/rework
conclusão
```

A granularidade deve ser funcionalmente útil.

Deve evitar tanto:

```text
granularidade insuficiente
→ "processando..."
```

quanto:

```text
granularidade microscópica
→ abrir arquivo / ler linha / executar comando
```

A primeira esconde o processo.

A segunda pertence à telemetria operacional.

---

# 35. Regra aprovada — atividade demorada nunca fica muda

Toda atividade material potencialmente demorada deve possuir representação
observável enquanto estiver em andamento.

O usuário deve conseguir saber, sem inferência:

```text
a ação foi aceita?
o sistema está trabalhando?
em qual passo estamos?
o que já foi feito?
o que vem depois?
o executor está vivo?
houve progresso funcional recente?
há bloqueio ou espera?
é necessária alguma intervenção?
```

É proibido como experiência normal:

```text
loading eterno sem contexto
spinner sem progresso observável
tela aparentemente travada
background silencioso
botão ainda disponível após aceite sem feedback
```

A duração esperada da atividade não elimina esse requisito.

Uma operação normalmente curta deve continuar compreensível se, por qualquer
motivo, passar a durar muito mais do que o esperado.

---

# 36. Regra aprovada — Activity Center é derivado, não autoritativo

A futura UI deverá possuir um mecanismo unificado de acompanhamento, nome de
trabalho:

```text
Activity Center
```

Ele poderá apresentar:

```text
barra compacta de status
grid de passos
histórico local da atividade/fase
liveness
último progresso funcional
blocking/waiting
next expectation
```

Esse componente não cria lifecycle.

Ele consome projeção derivada do estado canônico do ciclo interno da fase.

---

# 37. Regra aprovada — grid de progresso por passo

A representação humana preferida deve permitir distinguir, pelo menos:

```text
A FAZER
FAZENDO
FEITO
```

e, quando aplicável:

```text
AGUARDANDO
BLOQUEADO
FALHOU
CANCELADO
NÃO APLICÁVEL
```

Os labels exatos de UI serão definidos depois.

A grid pode representar os passos já conhecidos antes do início da atividade e
atualizá-los conforme avanço real.

Ela deve diferenciar claramente:

```text
previsto
em andamento
concluído
alterado por regra governada
```

---

# 38. Regra aprovada — progresso factual, sem percentual inventado

A UI pode mostrar fatos como:

```text
3 de 7 etapas previstas concluídas
```

ou barra segmentada equivalente.

Ela não pode converter isso automaticamente em estimativa temporal ou percentual
de conclusão real quando a duração relativa dos passos não for conhecida.

Percentual é permitido apenas quando a atividade possuir medida real e
semanticamente válida.

---

# 39. Regra aprovada — histórico local do momento

Além da timeline global do Project, o sistema deve permitir explicar a atividade
ou ciclo interno corrente.

Esse histórico local deve registrar eventos úteis ao entendimento humano, como:

```text
passo iniciado
passo concluído
passo bloqueado
passo retomado
plano interno alterado
rework iniciado
reteste iniciado
conclusão
```

Logs técnicos de baixo nível continuam separados.

---

# 40. Regra aprovada — um mecanismo genérico, ciclos específicos

A UI e a infraestrutura de projeção devem reutilizar um mecanismo genérico de
acompanhamento.

As definições de lifecycle, porém, são específicas de cada fase.

Portanto:

```text
um Activity Center genérico
+
seis ciclos internos específicos
```

e não:

```text
seis UIs independentes
```

nem:

```text
um único fluxo genérico pobre para todas as fases
```

---

# 41. Impacto na rodada NB-0002

A rodada não pode ser considerada completa apenas após provar
`IMPLEMENTATION`.

`IMPLEMENTATION` continua sendo o primeiro caso completo porque facilita a
validação do modelo, mas a ratificação da `NB-0002` exige disposição explícita de
todos os seis ciclos internos.

Critério adicional:

```text
R2-02 prova o modelo em IMPLEMENTATION
R2-03..R2-07 aplicam e refinam o modelo
R2-08+ verifica coerência transversal
```

Se qualquer fase revelar que o modelo geral é insuficiente, o modelo geral deve
ser corrigido antes de seguir.

---

# 42. Regra aprovada — durabilidade do ciclo interno

O estado funcional necessário para reconstruir a posição real de uma fase após
restart não pode existir somente em memória.

Deve ser durável, conforme aplicável:

```text
Phase Cycle Instance
phase plan/version
step current state
step transition history
step started/completed timestamps
functional progress timestamp
blocking/waiting state
continuity
plan changes
Work Item links
Execution links
```

A implementação física será definida no Persistence Model e na Technology
Baseline.

---

# 43. Regra aprovada — memória somente para estado efêmero

Podem permanecer exclusivamente em memória elementos cuja perda por restart não
altere verdade, continuidade ou explicabilidade do processo.

Exemplos:

```text
SSE connection
AbortController
Promise
process-local timers
temporary stream buffer
frontend cache
render-only UI state
```

Após restart, esses elementos podem ser reconstruídos a partir do estado durável.

---

# 44. Regra aprovada — heartbeat atual versus histórico de heartbeat

O sistema deve persistir informação atual suficiente para responder:

```text
quando ocorreu o último heartbeat?
quando houve última atividade operacional?
quando houve último progresso funcional?
```

A retenção de cada heartbeat individual não precisa ser permanente.

Deve existir separação conceitual entre:

```text
CANONICAL / DURABLE FUNCTIONAL HISTORY
```

e:

```text
HIGH-VOLUME OPERATIONAL TELEMETRY
```

Eventos de heartbeat e pulsos operacionais podem receber política futura de
retenção/expurgo, desde que sua remoção não destrua auditabilidade, causalidade,
continuidade ou reconstrução exigidas.

---

# 45. Regra aprovada — retenção e expurgo

Volume futuro não é justificativa para omitir persistência necessária hoje.

A implementação pode posteriormente adotar:

```text
retention policy
scheduled cleanup
partitioning
archival
compaction
```

para dados operacionais de alto volume.

É proibido aplicar expurgo puramente por idade a fatos governados necessários
para explicar ou reconstruir lifecycle.

A classificação mínima deve distinguir:

```text
GOVERNED HISTORY
→ retenção conforme obrigação de auditoria/reconstrução

OPERATIONAL TELEMETRY
→ retenção configurável quando seguro
```

---

# 46. Regra aprovada — restart proof

Cada ciclo interno material deve possuir prova de restart.

Exemplo de critério:

```text
fase em andamento
step atual conhecido
processo web/worker reinicia
estado funcional é reconstruído
passos concluídos permanecem concluídos
passo corrente/continuidade permanecem explicáveis
Execution expirada ou perdida é tratada pela lei de recovery
UI volta a mostrar a jornada correta
```

Restart não pode resetar visualmente ou semanticamente o ciclo para o início.

---

# 47. Princípio final

O usuário não deve observar apenas:

```text
RUNNING
```

Ele deve conseguir entender, de forma fiel ao estado canônico:

```text
onde estamos
o que já foi feito
o que está sendo feito
o que vem depois
se o executor está vivo
se existe progresso funcional
e o que precisa acontecer para continuar
```

Essa clareza deve nascer do domínio.

A UI apenas a torna visível.
