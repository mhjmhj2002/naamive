# NAAMIVE — Project Lifecycle

**Status:** CANDIDATE FOR APPROVAL  
**Versão:** 0.3  
**Autoridade:** lifecycle específico da entidade Project  
**Deriva de:** `01_LIFECYCLE_MODEL.md`  
**Norma superior:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** autoridade humana competente de governança do NAAMIVE  
**Vigência:** NOT IN FORCE — pendente de ratificação explícita  
**Supersessão normativa:** nenhuma versão anterior deste documento foi ratificada  
**Escopo:** entidade Project, agregação de seus descendentes e produção de Delivery

---

# 1. Objetivo

Este documento define o lifecycle detalhado da entidade **Project**.

Project é a unidade governada que transforma uma Need aceita em resultado
entregue.

Este lifecycle existe para garantir que:

- Project nunca perca sua origem de negócio;
- solução não seja materializada antes de maturidade suficiente;
- arquitetura e planejamento sejam decisões explícitas;
- Modules e Work Items sejam derivados de forma governada;
- implementação não invente decisões materiais;
- validação seja distinta de execução técnica;
- Delivery seja aceita com evidência e autoridade;
- bloqueio, pausa, cancelamento e retorno sejam explícitos;
- continuidade seja preservada de ponta a ponta;
- Project não avance por inferência informal a partir de seus filhos.

Este documento não define tecnologia, tabelas, APIs, filas, agentes concretos,
payloads, migrations ou UI física.

---

# 2. Origem do Project

Todo Project nasce de exatamente uma Need `ACCEPTED`.

A criação deve preservar, no mínimo:

- identificador da Need;
- decisão de aceite;
- baseline de entendimento da Need;
- `normative_baseline_ref` aplicável;
- classificação de impacto;
- riscos e findings residuais;
- intenção de criação;
- principal e autoridade responsáveis.

É inválido:

```text
Project sem Need ACCEPTED
```

---

# 3. Responsabilidade do Project

Project governa a transformação:

```text
Need aceita
    ↓
solução concebida
    ↓
arquitetura definida
    ↓
trabalho planejado
    ↓
resultado implementado
    ↓
resultado validado
    ↓
Delivery aceita
```

Project não é sinônimo de repositório, aplicação, módulo técnico, branch,
pipeline ou conjunto de jobs.

---

# 4. Estados normativos

O lifecycle principal é:

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

Estado terminal alternativo:

```text
CANCELLED
```

Condições transversais governadas:

```text
BLOCKED
PAUSED
```

`BLOCKED` e `PAUSED` não substituem silenciosamente o estado principal.

O Project preserva seu estado principal e registra a condição transversal que
suspende ou impede avanço.

---

# 5. Regras gerais de transição

Toda transição deve possuir, conforme aplicável:

- Project;
- estado anterior;
- estado resultante;
- intenção;
- causa;
- `normative_baseline_ref`;
- principal;
- autoridade;
- evidências;
- findings relevantes;
- decisão;
- continuidade resultante.

Nenhuma transição é válida apenas porque uma tarefa terminou.

---

# 6. Estado CONCEPTION

## 6.1 Significado

O Project recém-criado transforma a Need aceita em definição governada de
solução.

A Need responde:

```text
qual problema merece compromisso?
```

Project `CONCEPTION` responde:

```text
qual resultado de produto precisamos produzir para cumprir esse compromisso?
```

---

## 6.2 Objetivos

Devem ser amadurecidos, conforme impacto:

- objetivo do Project;
- usuários e stakeholders;
- escopo;
- fora de escopo;
- jornadas;
- capacidades necessárias;
- regras de negócio;
- critérios de sucesso;
- riscos;
- restrições;
- hipóteses;
- alternativas;
- impactos;
- decisões ainda abertas.

---

## 6.3 Materialidade

Project herda a classificação inicial da Need.

A classificação deve ser reavaliada quando a concepção revelar impacto maior.

Redução de classificação exige evidência e autoridade conforme a Constituição.

---

## 6.4 Brainstorm

Project `MATERIAL` ou `CRÍTICO` deve possuir brainstorm estruturado quando
existirem decisões relevantes em aberto.

O brainstorm deve impedir que o futuro implementador seja obrigado a decidir
sozinho questões de produto ou experiência.

---

## 6.5 Saída de CONCEPTION

Transição normal:

```text
CONCEPTION → ARCHITECTURE
```

Requer:

- objetivo suficientemente definido;
- escopo material compreendido;
- usuários/consumidores conhecidos quando aplicável;
- principais jornadas compreendidas;
- critérios de sucesso disponíveis;
- questões abertas classificadas;
- findings bloqueadores tratados;
- review adequado;
- auditoria de prontidão quando exigida;
- continuidade para arquitetura.

---

# 7. Estado ARCHITECTURE

## 7.1 Significado

O Project define a estrutura da solução sem ainda executar a implementação.

Arquitetura responde:

```text
como a solução será organizada para cumprir a concepção?
```

---

## 7.2 Escopo arquitetural

Conforme aplicável, devem ser decididos:

- capacidades de negócio;
- limites de Modules;
- responsabilidades;
- dependências;
- integrações;
- dados relevantes;
- contratos conceituais;
- estratégia tecnológica;
- segurança;
- operação;
- observabilidade;
- impactos de migração;
- riscos arquiteturais;
- decisões reversíveis e irreversíveis.

---

## 7.3 Modules

Modules podem ser identificados durante `ARCHITECTURE`.

Um Module somente pode nascer quando existir responsabilidade de negócio
identificável.

Module não pode ser criado apenas para representar:

- controller;
- repository;
- frontend;
- backend;
- database;
- framework;
- camada técnica.

---

## 7.4 Decisões arquiteturais materiais

Toda decisão arquitetural `MATERIAL` ou `CRÍTICA` deve possuir:

```text
problema
alternativas
trade-offs
decisão
evidência
review
auditoria
autoridade
```

A implementação não pode substituir essa decisão por conveniência.

---

## 7.5 Dependências

Dependências relevantes devem ser explicitadas antes de planejamento.

Cada dependência deve possuir:

- origem;
- destino;
- condição de satisfação;
- impacto;
- responsável;
- fallback.

Ciclo sem estratégia de resolução é inválido.

---

## 7.6 Saída de ARCHITECTURE

Transição normal:

```text
ARCHITECTURE → PLANNING
```

Requer:

- arquitetura suficiente para planejar;
- Modules materiais identificados ou justificadamente postergados;
- responsabilidades conhecidas;
- dependências materiais conhecidas;
- riscos arquiteturais tratados;
- findings bloqueadores tratados;
- review especializado;
- auditoria de prontidão quando exigida;
- continuidade para planejamento.

---

# 8. Retorno ARCHITECTURE → CONCEPTION

É permitido quando arquitetura revela que a concepção precisa mudar.

Exemplos:

- jornada inviável;
- escopo incompatível;
- capacidade de negócio ausente;
- custo ou risco desproporcional;
- premissa de produto invalidada.

O retorno deve possuir causa, evidência e autoridade.

Nada é apagado.

---

# 9. Estado PLANNING

## 9.1 Significado

O Project transforma concepção e arquitetura em trabalho executável.

Planejamento responde:

```text
o que precisa ser feito, em que ordem e sob quais condições?
```

---

## 9.2 Conteúdo mínimo

Conforme aplicável:

- Modules;
- Work Items de Module;
- Work Items transversais de Project;
- dependências;
- sequência;
- critérios de aceite;
- estratégia de validação;
- riscos;
- marcos;
- Delivery pretendida;
- pontos de integração;
- necessidades de review;
- auditorias materiais;
- gates.

---

## 9.3 Planejamento como discovery

Se planejamento descobrir decisão material ausente, não pode inventá-la.

Deve retornar para:

```text
CONCEPTION
ou
ARCHITECTURE
```

conforme a natureza da lacuna.

---

## 9.4 Readiness para implementação

Um Project não entra em `IMPLEMENTATION` apenas porque existe uma lista de
tarefas.

Deve existir plano executável suficiente para iniciar trabalho sem obrigar
implementadores a inventar decisões materiais.

---

## 9.5 Saída de PLANNING

Transição normal:

```text
PLANNING → IMPLEMENTATION
```

Requer:

- escopo inicial implementável;
- Work Items necessários identificados em profundidade adequada;
- pelo menos um Work Item elegível ou continuidade explícita para torná-lo
  elegível;
- dependências conhecidas;
- critérios de aceite;
- estratégia de integração e validação;
- findings bloqueadores tratados;
- auditoria de prontidão do plano quando exigida;
- autoridade para iniciar implementação.

---

# 10. Retornos a partir de PLANNING

Permitidos:

```text
PLANNING → ARCHITECTURE
PLANNING → CONCEPTION
```

Somente quando nova evidência comprovar necessidade.

O Project não deve oscilar por preferência informal.

---

# 11. Estado IMPLEMENTATION

## 11.1 Significado

Existe trabalho autorizado sendo materializado.

Project `IMPLEMENTATION` é um estado de negócio.

Executions pertencem ao lifecycle operacional e não redefinem automaticamente
o estado do Project.

---

## 11.2 Continuidade mínima

Enquanto `IMPLEMENTATION`, deve existir ao menos uma destas condições:

- Work Item elegível;
- Work Item em progresso;
- ação humana autorizada necessária;
- dependência em espera governada;
- blocker governado;
- recovery;
- reconciliation.

Se nenhuma existir, há inconsistência de continuidade.

---

## 11.3 Decisões novas durante implementação

Implementadores podem encontrar lacunas.

Se a lacuna for trivial e estiver dentro da autoridade concedida, pode ser
tratada conforme política.

Se for material ou crítica:

```text
não inventar
        ↓
registrar decisão pendente
        ↓
retornar ao nível adequado
```

---

## 11.4 Falha de Execution

Uma `Execution FAILED` não significa:

```text
Project FAILED
```

O Project avalia continuidade por meio do Work Item correspondente.

Pode ocorrer:

- retry;
- recovery;
- rework;
- reconciliation;
- blocker;
- replanejamento;
- cancelamento.

---

## 11.5 Saída de IMPLEMENTATION

Transição normal:

```text
IMPLEMENTATION → VALIDATION
```

Requer:

- Work Items necessários para o escopo de validação concluídos;
- Modules necessários em condição compatível;
- Work Items transversais necessários concluídos;
- integração suficiente;
- nenhum blocker incompatível com validação;
- nenhuma Execution em voo ainda autorizada a alterar o mesmo baseline;
- baseline de validação identificável;
- continuidade para validação.

---

# 12. Retorno IMPLEMENTATION → PLANNING

Permitido quando:

- escopo muda;
- dependência muda;
- trabalho inicialmente previsto é inadequado;
- surgem novas necessidades de decomposição;
- arquitetura permanece válida, mas o plano precisa mudar.

---

# 13. Retorno IMPLEMENTATION → ARCHITECTURE

Permitido quando implementação prova inadequação arquitetural material.

Exige decisão governada.

## 13.1 Efeito de retorno e mudança de baseline nos descendentes

Qualquer retorno que altere materialmente concepção, arquitetura, planejamento,
escopo ou baseline deve aplicar a classificação constitucional de cobertura aos
descendentes e artefatos potencialmente afetados:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

Isso inclui, no mínimo, quando aplicável:

- Modules;
- Work Items `PROPOSED`, `READY`, `IN_PROGRESS` ou `IN_REVIEW`;
- Executions;
- evidências;
- reviews;
- auditorias;
- autorizações;
- handoffs;
- baseline de integração.

Enquanto a cobertura não estiver resolvida, descendentes potencialmente afetados
não podem iniciar nova Execution nem publicar novo resultado autoritativo.

---

# 14. Estado VALIDATION

## 14.1 Significado

O Project verifica o resultado integrado contra critérios definidos.

Validação não é apenas execução de testes automatizados.

---

## 14.2 Escopo

Pode incluir:

- testes funcionais;
- testes de integração;
- experiência;
- segurança;
- performance;
- operação;
- critérios de negócio;
- compatibilidade;
- evidências;
- auditoria;
- validação de riscos;
- verificação de dependências.

---

## 14.3 Baseline

Validação deve operar sobre baseline identificável.

Não é válido validar um conjunto enquanto implementações concorrentes continuam
alterando silenciosamente o mesmo escopo.

Toda evidência usada em `VALIDATION` deve declarar o baseline que cobre. Mudança
do baseline exige `KEEP` fundamentado ou `REVALIDATE`; evidência de baseline
anterior não permanece válida por inércia.

---

## 14.4 Resultado de validação

Pode resultar em:

```text
pronto para Delivery
rework de implementação
replanejamento
retorno arquitetural
bloqueio
cancelamento
```

---

## 14.5 Saída de VALIDATION

Transição normal:

```text
VALIDATION → DELIVERY
```

Requer:

- critérios materiais satisfeitos;
- evidências suficientes;
- findings bloqueadores tratados;
- riscos residuais conhecidos;
- baseline estável;
- continuidade para decisão de entrega.

---

# 15. Retorno VALIDATION → IMPLEMENTATION

É esperado quando o resultado não satisfaz critérios e a correção não exige
mudar concepção ou arquitetura.

O retorno cria novo trabalho governado.

Não reabre Work Item `DONE` por edição silenciosa; cria rework ou novo Work Item
conforme política.

Se a correção afetar Module já `INTEGRATED`, a instância integrada também não é
reaberta. Deve ser criada sucessão governada conforme o Module Lifecycle, e a
agregação do Project passa a distinguir o baseline histórico do baseline
autoritativo corrente.

---

# 16. Estado DELIVERY

## 16.1 Significado

O Project está avaliando uma **candidatura de entrega**.

`DELIVERY` é fase de decisão, não uma entidade Delivery já aceita e não é
sinônimo de deploy. A entidade `Delivery` somente nasce após decisão positiva.

---

## 16.2 Conteúdo da decisão

A autoridade deve poder avaliar:

- Need original;
- escopo entregue;
- baseline;
- evidências;
- critérios de sucesso;
- riscos residuais;
- findings;
- exceções;
- limitações;
- capacidade operacional;
- decisão recomendada.

---

## 16.3 Auditoria de entrega

Delivery `MATERIAL` ou `CRÍTICA` deve possuir auditoria independente de prontidão.

A auditoria verifica conformidade, não substitui a autoridade de aceite.

---

## 16.4 Decisões possíveis

```text
ACEITAR DELIVERY
DEVOLVER PARA VALIDATION
DEVOLVER PARA IMPLEMENTATION
PAUSAR
CANCELAR
```

Exceção governada pode existir quando permitida.

Ao `ACEITAR DELIVERY`, a decisão de aceite, a criação idempotente do registro
Delivery e a transição para `DELIVERED` devem formar um handoff governado e
recuperável. Falha operacional entre esses fatos não pode criar duas Deliveries
nem perder a decisão já tomada.

Rejeição ou devolução não cria Delivery aceita.

---

# 17. Estado DELIVERED

## 17.1 Significado

Existe Delivery aceita para o escopo do Project.

`DELIVERED` é terminal para o lifecycle normal desta instância de Project.

---

## 17.2 O que permanece rastreável

- Need;
- baseline entregue;
- módulos participantes;
- Work Items;
- evidências;
- auditorias;
- findings;
- riscos aceitos;
- autoridade;
- decisão;
- `normative_baseline_ref`.

---

## 17.3 Evolução

Project `DELIVERED` não volta para `IMPLEMENTATION`.

Nova mudança entra por Need governada.

A nova Need de evolução **deve** referenciar esta Delivery ou baseline
predecessora e, se aprovada, poderá originar novo Project ou outra forma de
evolução que a política futura permitir.

---

# 18. Condição BLOCKED

## 18.1 Significado

O Project pretende continuar, mas existe impedimento conhecido.

O estado principal permanece conhecido.

Exemplo:

```text
PLANNING + BLOCKED
IMPLEMENTATION + BLOCKED
```

---

## 18.2 Requisitos

Todo blocker deve possuir:

- causa;
- responsável;
- impacto;
- condição de saída;
- fallback;
- prazo ou cadência;
- escalada.

`BLOCKED` sem rota de saída é inconsistência.

---

## 18.3 Saída

Ao resolver blocker, Project retoma o mesmo estado principal ou transiciona para
outro estado apenas por regra explícita.

---

# 19. Condição PAUSED

## 19.1 Significado

O avanço foi suspenso por decisão governada.

A intenção pode continuar existindo.

---

## 19.2 Requisitos

- autoridade;
- motivo;
- instante;
- escopo;
- estado principal preservado;
- processo de retomada;
- tratamento de trabalho em voo;
- validade das evidências.

---

## 19.3 Retomada

Antes de retomar devem ser revalidados:

- norma;
- Need e objetivo;
- escopo;
- autoridade;
- dependências;
- findings;
- baseline;
- evidências que possam ter expirado.

---

# 20. Estado CANCELLED

## 20.1 Significado

A intenção de continuidade do Project foi encerrada.

É terminal.

---

## 20.2 Efeitos

- nenhum novo Work Item pode ser autorizado;
- novas Executions são proibidas;
- claims em voo devem perder autoridade conforme política;
- efeitos tardios entram em reconciliation;
- efeitos indesejados podem exigir compensation;
- Modules e Work Items precisam receber classificação explícita de cobertura;
- autorizações e handoffs descendentes devem ser revogados, revalidados ou reconciliados conforme o efeito real;
- histórico permanece.

---

# 21. Cancelamento e filhos

Cancelar Project não apaga Modules ou Work Items.

O cancelamento deve propagar intenção de encerramento de forma governada.

Cada recurso filho preserva seu histórico e recebe decisão compatível:

```text
cancelar
concluir tratamento seguro
reconciliar
compensar
```

conforme seu estado.

---

# 22. Aggregation Project ↔ Module

O Project não deriva seu estado por simples contagem.

A agregação deve considerar:

- Modules obrigatórios;
- Modules opcionais;
- Modules cancelados;
- dependências;
- Work Items transversais;
- integração;
- findings;
- blockers;
- baseline de Delivery.

Leis:

```text
Module INTEGRATED ≠ Project DELIVERED
todos Modules INTEGRATED ≠ aceite automático
um Module FAILED operacionalmente ≠ Project CANCELLED
```

---

# 23. Modules obrigatórios e opcionais

A classificação deve ser explícita.

### Obrigatório

Resultado necessário para o escopo atual de Delivery.

### Opcional

Pode ser excluído da Delivery sem invalidar o escopo aprovado, desde que a
decisão seja rastreável.

Mudar Module de obrigatório para opcional é decisão material quando altera o
compromisso de produto.

---

# 24. Module CANCELLED

Um Module cancelado exige avaliação do Project.

Possíveis consequências:

- substituir capacidade;
- reduzir escopo;
- replanejar;
- bloquear;
- cancelar Project;
- aceitar exceção.

Nunca pode ser ignorado.

---

# 25. Work Items transversais

Project pode possuir Work Items cujo escopo governante é o próprio Project.

Exemplos:

- integração transversal;
- migração comum;
- requisito cross-module;
- validação global.

Esses itens entram na agregação do Project.

---

# 26. Handoffs entre fases

Cada mudança de fase deve produzir handoff durável.

Exemplo:

```text
ARCHITECTURE → PLANNING
```

exige mais que mudança de status.

Deve existir:

- resultado arquitetural;
- evidência;
- critérios de saída satisfeitos;
- versão;
- findings tratados;
- destino apto;
- continuidade para o próximo estágio.

---

# 27. Findings

Findings podem ser produzidos durante todo o Project.

Finding bloqueador impede avanço normal.

Tratamentos válidos seguem a Constituição:

- remediação;
- invalidação fundamentada;
- reclassificação independente;
- aceitação de risco quando permitida;
- exceção governada.

---

# 28. Exceções

Exceção não apaga a regra nem o finding.

Uma transição aprovada por exceção deve ser distinguível de transição aprovada
normalmente.

A exceção deve carregar:

- autoridade;
- justificativa;
- escopo;
- prazo;
- mitigação;
- risco;
- revalidação posterior quando aplicável.

---

# 29. Continuidade

Todo Project ativo deve responder:

```text
o que o faz avançar daqui?
```

Exemplos por estado:

```text
CONCEPTION
→ decisão aberta / trabalho de discovery

ARCHITECTURE
→ trabalho arquitetural / decisão

PLANNING
→ decomposição / decisão de plano

IMPLEMENTATION
→ Work Item elegível / execução / blocker governado

VALIDATION
→ atividade de validação / decisão

DELIVERY
→ ação de aceite / tratamento de finding
```

---

# 30. Dead-ends proibidos

São inválidos:

- `CONCEPTION` sem atividade, decisão ou espera;
- `ARCHITECTURE` sem responsável ou saída;
- `PLANNING` sem trabalho e sem decisão pendente;
- `IMPLEMENTATION` sem Work Item elegível, blocker, wait, recovery ou ação;
- `VALIDATION` sem baseline ou atividade;
- `DELIVERY` sem autoridade capaz de decidir;
- `BLOCKED` sem saída;
- `PAUSED` sem processo de retomada.

---

# 31. Idempotência

A mesma intenção de transição não deve produzir duplicidade.

Exemplos:

- entrada repetida em Delivery;
- aceite repetido;
- criação duplicada de Module;
- criação duplicada de Work Item;
- retomada repetida.

Resultados autoritativos devem ser únicos por intenção.

---

# 32. Concorrência

Transições concorrentes sobre o mesmo Project devem usar versão, geração ou
mecanismo equivalente.

Exemplo:

```text
DELIVERY → DELIVERED
```

concorrendo com:

```text
DELIVERY → CANCELLED
```

apenas uma pode vencer.

A outra deve detectar obsolescência.

---

# 33. Recovery e Project

Recovery pertence primariamente a Executions.

Entretanto, Project pode precisar de recovery de handoff ou transição.

Exemplo:

```text
VALIDATION aprovada
intenção de entrar em DELIVERY persistida
falha operacional antes de materializar destino
```

O sistema deve recuperar a intenção sem duplicar fatos nem reverter decisão
válida.

---

# 34. Reconciliation

É usada quando estado canônico e efeitos observados divergem.

Exemplos:

- Project acredita que baseline não foi entregue, mas efeito externo ocorreu;
- handoff para Delivery ficou incerto;
- executor antigo produziu efeito depois de cancelamento.

Reconciliation determina fato antes de repetir ação.

---

# 35. Projeção para UI

A UI deve mostrar, conforme aplicável:

- estado principal;
- condição BLOCKED/PAUSED;
- Need origem;
- classificação;
- Modules;
- Work Items relevantes;
- baseline;
- findings;
- dependências;
- riscos;
- ações autorizadas;
- responsável;
- continuidade;
- histórico de decisões.

A UI não calcula autorização.

---

# 36. Ações humanas esperadas

Podem incluir:

- aprovar decisão material de produto;
- aprovar arquitetura material;
- aprovar plano material;
- aceitar risco;
- aprovar exceção;
- pausar;
- retomar;
- cancelar;
- aceitar Delivery.

A política derivada definirá principals e permissões.

---

# 37. Invariantes

Devem permanecer verdadeiros:

```text
Project possui Need ACCEPTED
Project DELIVERED possui Delivery aceita
Project CANCELLED não autoriza novo trabalho
Execution SUCCEEDED não promove Project automaticamente
Module INTEGRATED não promove Project automaticamente
findings bloqueadores impedem avanço normal
Project ativo possui continuidade acionável
retorno preserva histórico
descendente elegível possui escopo/baseline compatível com o Project atual
```

---

# 38. Proibições

Não é permitido:

- Project sem Need aceita;
- pular arquitetura material por conveniência;
- pular planejamento material por conveniência;
- implementar decisão material ainda aberta;
- inferir avanço do Project pela aparência dos Modules;
- aceitar Delivery sem evidência e autoridade;
- voltar `DELIVERED` para implementação;
- cancelar e deixar executor antigo publicar estado;
- usar BLOCKED/PAUSED como estacionamento indefinido;
- reescrever decisão histórica.

---

# 39. Cenários mentais

## 39.1 Arquitetura encontra problema de produto

```text
ARCHITECTURE → CONCEPTION
```

com causa e evidência.

## 39.2 Planejamento encontra dependência nova

Pode permanecer em `PLANNING`, voltar para `ARCHITECTURE` ou bloquear,
dependendo da materialidade.

## 39.3 Execution falha

Project não falha automaticamente.

Work Item decide continuidade.

## 39.4 Todos Modules integram

Project só avança quando critérios de agregação, Work Items transversais e
baseline estiverem satisfeitos.

## 39.5 Delivery rejeitada

Retorna para `VALIDATION` ou `IMPLEMENTATION` conforme causa.

## 39.6 Project cancelado com trabalho em voo

Novas autorizações cessam; resultados tardios são reconciliados.

---

# 40. Questões deixadas para documentos derivados

Não são definidos aqui:

- payloads;
- eventos técnicos;
- schema;
- banco;
- API;
- locks;
- TTL;
- workers;
- agentes concretos;
- matriz final de permissões;
- matriz completa de agregação;
- severidades físicas;
- UI.

---

# 41. Critério de aprovação

Este lifecycle está pronto quando podemos responder sem nova lei:

- como Project nasce;
- como concebe;
- como arquiteta;
- como planeja;
- como implementa;
- como valida;
- como entrega;
- como retorna;
- como bloqueia;
- como pausa;
- como cancela;
- como agrega Modules;
- como trata Work Items transversais;
- como findings afetam avanço;
- como handoffs são preservados;
- como Delivery é aceita;
- como evolução sai do Project entregue.

---

# 42. Princípio final

Project não é uma fila de tarefas.

É um compromisso governado de transformar uma Need aceita em valor entregue.

Seu lifecycle somente avança quando:

```text
a fase atual cumpriu sua responsabilidade
+
a evidência é suficiente
+
a autoridade é válida
+
o próximo estágio possui continuidade comprovável
```
