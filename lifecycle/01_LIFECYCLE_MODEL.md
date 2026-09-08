# NAAMIVE — Lifecycle Model

**Status:** RATIFIED  **Versão:** 0.3  
**Autoridade:** modelo normativo de alto nível do lifecycle do NAAMIVE  
**Deriva de:** `../00_NAAMIVE_CONSTITUTION.md`  
**Autoridade de ratificação:** Manuel Hinojosa — NAAMIVE Project Owner  
**Ratificado em:** 2026-09-08T18:38:36-03:00  
**Vigência:** IN FORCE — desde 2026-09-08T18:38:36-03:00  
**Normative Baseline:** `NB-0002`  
**Supersessão normativa:** supersedes the corresponding `NB-0001` revision for instances governed by `NB-0002`; `NB-0001` remains immutable for historical and non-migrated instances  
**Escopo:** relações e regras de alto nível entre todos os lifecycles governados do NAAMIVE

---

# 1. Objetivo

Este documento define o modelo de lifecycle de alto nível do NAAMIVE.

Ele existe para responder, de ponta a ponta:

- quais entidades possuem lifecycle;
- como essas entidades nascem;
- como avançam;
- como se relacionam;
- onde existem decisões;
- onde existem brainstorm, revisão e auditoria;
- como continuidade é preservada;
- como bloqueios, pausas, falhas e cancelamentos são tratados;
- como recovery e reconciliation reentram no fluxo;
- como entrega acontece;
- como evolução retorna ao lifecycle.

Este documento não define tecnologia, tabelas, endpoints, filas, agentes concretos,
payloads, migrations ou detalhes físicos de persistência.

Esses elementos serão derivados depois.

---

# 2. Posição na hierarquia normativa

A hierarquia é:

```text
00_NAAMIVE_CONSTITUTION.md
        ↓
lifecycle/01_LIFECYCLE_MODEL.md
        ↓
lifecycles específicos
        ↓
políticas e contratos
        ↓
persistência / projeções / orquestração
        ↓
APIs / UI
        ↓
implementação
```

Este documento não pode contradizer a Constituição.

Os lifecycles específicos não podem contradizer este documento.

Se durante o detalhamento surgir necessidade de alterar uma regra fundamental
deste modelo, primeiro este documento deve ser revisado.

---

# 3. Princípio de modelagem

O NAAMIVE não possui uma única máquina de estados para tudo.

Cada entidade governada possui lifecycle próprio.

O modelo separa:

```text
LIFECYCLES DE NEGÓCIO
Need
Project
Module
ValueIncrement
Work Item

LIFECYCLE OPERACIONAL
Execution
```

Uma execução falhar não significa automaticamente que Projeto, Módulo ou Item de
Trabalho falharam.

Da mesma forma, um Projeto continuar ativo não pode esconder uma execução
operacional quebrada.

---

# 4. Entidades governadas

O modelo mínimo contém:

```text
Need
Project
Module
ValueIncrement
Work Item
Execution
Delivery
```

## 4.1 Need

Representa uma necessidade de negócio governada.

Pode expressar:

- problema;
- oportunidade;
- correção;
- mudança;
- evolução.

Toda jornada começa por uma Need válida.

---

## 4.2 Project

É a unidade governada que transforma uma Need aceita em resultado entregue.

Um Project possui:

- uma origem de negócio;
- objetivos;
- escopo;
- decisões;
- módulos;
- trabalho;
- evidências;
- entregas.

---

## 4.3 Module

Representa uma capacidade de negócio coerente pertencente a um Project.

Module não representa camada técnica.

Um Module deve possuir responsabilidade de negócio compreensível de forma
independente.

---

## 4.4 ValueIncrement

Representa uma Entrega de Valor finita, utilizável e verificável pertencente a
exatamente um Module.

No fluxo normal de implementação:

```text
Module → ValueIncrement → Work Item → Execution
```

## 4.5 Work Item

Representa uma unidade planejada de mudança.

Um Work Item possui exatamente um escopo governante:

```text
Project
ou
Module
```

Work Items de Project podem representar trabalho transversal.

Work Items de Module representam trabalho localizado naquela capacidade.

---

## 4.6 Execution

Representa uma tentativa concreta de executar um Work Item autorizado.

Uma Execution pertence a exatamente um Work Item.

Uma nova tentativa não apaga tentativa anterior.

---

## 4.7 Delivery

Delivery é o **registro governado terminal de um aceite de negócio já ocorrido**.

A fase `Project.DELIVERY` representa a candidatura e o processo de decisão de
entrega. A entidade Delivery somente nasce quando essa candidatura é aceita.

Portanto:

```text
Project.DELIVERY
    ↓ aceite autorizado
Delivery é criada
    ↓
Project.DELIVERED
```

Se a candidatura for rejeitada, nenhuma Delivery aceita é criada; o Project
retorna ao ponto de lifecycle adequado.

Delivery representa uma versão ou baseline aceita dentro de determinado escopo
e deve vincular a decisão, evidências, riscos residuais e autoridade de aceite.

Delivery não é sinônimo de:

```text
build terminou
merge terminou
deploy terminou
agente terminou
```

---

# 5. Jornada macro do NAAMIVE

A jornada de mais alto nível é:

```text
NECESSIDADE
    ↓
QUALIFICAÇÃO
    ↓
CONCEPÇÃO
    ↓
COMPROMISSO
    ↓
ARQUITETURA
    ↓
PLANEJAMENTO
    ↓
IMPLEMENTAÇÃO
    ↓
VALIDAÇÃO
    ↓
ENTREGA
    ↓
EVOLUÇÃO
```

Esses nomes representam fases conceituais da jornada.

Eles não significam que todas as entidades possuem exatamente os mesmos estados.

Cada lifecycle específico será derivado separadamente.

---

# 6. Fases macro

## 6.1 Necessidade

Objetivo:

```text
capturar o problema ou oportunidade
```

Resultado esperado:

- origem de negócio registrada;
- contexto inicial conhecido;
- problema suficientemente descrito para iniciar qualificação.

Nenhuma solução técnica precisa estar decidida aqui.

---

## 6.2 Qualificação

Objetivo:

```text
determinar se a Need merece continuar
```

A qualificação verifica, em profundidade proporcional:

- problema real;
- usuários ou afetados;
- valor esperado;
- urgência;
- restrições;
- duplicidade;
- viabilidade mínima de investigação;
- classificação inicial de impacto.

Resultado possível:

```text
seguir
rejeitar
cancelar
aguardar informação
```

A qualificação não compromete ainda implementação.

---

## 6.3 Concepção

Objetivo:

```text
amadurecer o que deveria ser construído
```

Aqui entram, conforme materialidade:

- discovery;
- brainstorm;
- requisitos;
- jornadas;
- domínio;
- alternativas;
- impactos;
- riscos;
- escopo;
- critérios de sucesso.

Uma Need vaga não deve sair desta fase transformada silenciosamente em solução.

---

## 6.4 Compromisso

Objetivo:

```text
decidir se a organização assume o compromisso de transformar a Need em Project
```

Compromisso é uma decisão governada.

Antes do compromisso material devem existir:

```text
concepção suficiente
        ↓
review
        ↓
auditoria de prontidão
        ↓
decisão
```

Resultado possível:

```text
Project autorizado
Need devolvida para concepção
Need rejeitada
Need cancelada
Need aguardando condição externa
```

---

## 6.5 Arquitetura

Objetivo:

```text
definir como o problema será estruturado em solução
```

Arquitetura inclui, conforme aplicável:

- decomposição em capacidades de negócio;
- limites de módulos;
- integrações;
- dados;
- responsabilidades;
- decisões arquiteturais materiais;
- impactos;
- dependências;
- estratégia tecnológica.

Arquitetura não deve ser inventada durante implementação.

---

## 6.6 Planejamento

Objetivo:

```text
transformar solução concebida em trabalho executável
```

Aqui são definidos, conforme aplicável:

- Modules;
- Work Items;
- ordem;
- dependências;
- critérios de aceite;
- estratégia de validação;
- riscos;
- entregas;
- marcos.

Planejamento também deve detectar ausência de definição.

Se o planejamento descobrir lacuna material, o fluxo retorna ao ponto adequado
de concepção ou arquitetura.

---

## 6.7 Implementação

Objetivo:

```text
executar trabalho autorizado
```

A implementação acontece através de:

```text
Work Item
    ↓
Execution
```

O lifecycle de Execution é operacional e separado do lifecycle de negócio.

A implementação não pode criar novas decisões materiais silenciosamente.

Se uma decisão material não prevista surgir, o fluxo deve voltar ao nível
apropriado de concepção, arquitetura ou planejamento.

---

## 6.8 Validação

Objetivo:

```text
provar que o resultado satisfaz os critérios definidos
```

Validação pode incluir:

- testes;
- revisão;
- auditoria;
- integração;
- comportamento funcional;
- experiência;
- segurança;
- critérios de negócio;
- evidências operacionais.

Implementação tecnicamente concluída não significa resultado validado.

---

## 6.9 Entrega

Objetivo:

```text
avaliar a candidatura de entrega e, se aceita, criar o registro Delivery
```

A fase macro de Entrega corresponde a `Project.DELIVERY`. A entidade `Delivery`
ainda não existe como entrega aceita durante a avaliação. Ela nasce somente após
a decisão positiva.

A candidatura de entrega exige, conforme aplicável:

- escopo conhecido;
- evidências suficientes;
- findings tratados;
- riscos residuais conhecidos;
- autoridade de aceite;
- decisão explícita.

Aceite positivo produz uma Delivery rastreável. Rejeição devolve o Project ao
ponto adequado e não cria Delivery aceita.

---

## 6.10 Evolução

Objetivo:

```text
permitir mudança governada depois da entrega
```

Evolução não é continuação informal de Project entregue.

Toda evolução nasce de:

```text
nova Need
ou
alteração governada de Need existente
```

A evolução referencia a Delivery ou baseline anterior e retorna ao ponto
apropriado do lifecycle.

---

# 7. Lifecycle de Need — visão macro

O lifecycle detalhado será definido em documento próprio.

Neste nível, Need possui a seguinte jornada conceitual:

```text
CAPTURED
    ↓
QUALIFYING
    ↓
IN_DISCOVERY
    ↓
READY_FOR_COMMITMENT
    ↓
ACCEPTED
```

Saídas alternativas:

```text
REJECTED
CANCELLED
WAITING
```

## 7.1 CAPTURED

A necessidade foi registrada.

Ainda não existe compromisso de projeto.

---

## 7.2 QUALIFYING

A necessidade está sendo avaliada.

O objetivo é determinar se ela merece descoberta adicional.

---

## 7.3 IN_DISCOVERY

A necessidade está sendo amadurecida.

Aqui podem ocorrer:

- brainstorm;
- levantamento;
- análise;
- alternativas;
- perguntas;
- descoberta de riscos.

---

## 7.4 READY_FOR_COMMITMENT

A Need possui maturidade suficiente para decisão de compromisso.

Isso não significa aprovação automática.

---

## 7.5 ACCEPTED

A Need foi aceita e pode originar Project governado.

O vínculo entre Need e Project deve ser explícito.

---

## 7.6 REJECTED

A Need foi analisada e explicitamente rejeitada.

A rejeição preserva histórico e justificativa.

---

## 7.7 CANCELLED

A intenção de continuar a Need foi encerrada.

---

## 7.8 WAITING

A Need depende de fato externo conhecido.

`WAITING` só é válido quando existir espera governada com saída e escalada.

---

# 8. Lifecycle de Project — visão macro

O Project nasce somente após Need aceita.

Sua jornada macro é:

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

Condições transversais:

```text
BLOCKED
PAUSED
CANCELLED
```

`BLOCKED` e `PAUSED` não são atalhos para esconder ausência de continuidade.

---

## 8.1 CONCEPTION

O Project transforma a Need aceita em definição governada de solução.

---

## 8.2 ARCHITECTURE

A estrutura de solução é definida.

É aqui que são estabelecidas as capacidades principais, responsabilidades e
dependências arquiteturais.

---

## 8.3 PLANNING

O Project passa a possuir plano executável.

Modules, ValueIncrements e Work Items são derivados em profundidade suficiente.

---

## 8.4 IMPLEMENTATION

Existe trabalho autorizado em execução.

O Project pode possuir vários Modules, ValueIncrements e Work Items simultaneamente.

---

## 8.5 VALIDATION

O Project está verificando se o conjunto integrado satisfaz os critérios de
aceite.

---

## 8.6 DELIVERY

O Project está em processo de aceitação de entrega.

Pode incluir auditoria final, tratamento de findings e decisão humana.

---

## 8.7 DELIVERED

Existe ao menos uma Delivery aceita para o escopo definido do Project.

`DELIVERED` não significa que o produto nunca mais muda.

Nova evolução volta via Need governada.

---

# 9. Lifecycle de Module — visão macro

Um Module nasce dentro de Project quando sua responsabilidade de negócio se torna
suficientemente definida.

Jornada macro:

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
READY_FOR_INTEGRATION
    ↓
INTEGRATED
```

Condições transversais:

```text
BLOCKED
PAUSED
CANCELLED
```

## 9.1 IDENTIFIED

Existe uma capacidade candidata dentro do Project.

---

## 9.2 DEFINED

Responsabilidade, limites e interfaces conceituais do Module são conhecidos.

---

## 9.3 PLANNED

O Module possui trabalho planejado e dependências conhecidas.

---

## 9.4 IMPLEMENTING

ValueIncrements do Module estão sendo materializadas por Work Items.

---

## 9.5 VALIDATING

O resultado do Module está sendo verificado.

---

## 9.6 READY_FOR_INTEGRATION

O Module produziu resultado validado suficiente para integração.

---

## 9.7 INTEGRATED

O resultado do Module está incorporado ao conjunto do Project.

`INTEGRATED` não equivale automaticamente a `DELIVERED`.

---

# 10. Lifecycle de Work Item — visão macro

Work Item representa uma unidade de mudança planejada.

Jornada macro:

```text
PROPOSED
    ↓
READY
    ↓
IN_PROGRESS
    ↓
IN_REVIEW
    ↓
DONE
```

Saídas ou condições possíveis:

```text
BLOCKED
CANCELLED
```

## 10.1 PROPOSED

O trabalho foi identificado, mas ainda pode estar incompleto.

---

## 10.2 READY

O Item possui definição suficiente para execução.

No mínimo deve existir, conforme aplicável:

- objetivo;
- escopo;
- critério de aceite;
- dependências;
- classificação de impacto;
- autoridade para executar.

---

## 10.3 IN_PROGRESS

Existe uma Execution válida tentando produzir o resultado **ou** existe
continuidade operacional governada, persistida e acionável para produzir,
recuperar, reconciliar ou consolidar esse resultado.

Assim, `IN_PROGRESS` pode permanecer válido temporariamente sem Execution ativa
quando houver, por exemplo, recovery, reconciliation, blocker governado, ação
humana necessária ou nova tentativa elegível.

Sem Execution ativa **e** sem continuidade operacional válida, `IN_PROGRESS` é
inconsistência.

---

## 10.4 IN_REVIEW

O trabalho produzido está sendo revisado ou validado.

---

## 10.5 DONE

O resultado foi aceito para o escopo do Work Item.

`Execution SUCCEEDED` não implica automaticamente `Work Item DONE`.

---

# 11. Lifecycle de Execution — visão macro

Execution é operacional.

Jornada mínima:

```text
CREATED
    ↓
ELIGIBLE
    ↓
RUNNING
    ↓
SUCCEEDED
```

Saídas terminais alternativas:

```text
FAILED
CANCELLED
```

Condições de controle:

```text
EXPIRED
STALE
```

Esses estados serão refinados no lifecycle específico.

---

## 11.1 CREATED

A tentativa foi criada e possui vínculo causal com uma intenção.

---

## 11.2 ELIGIBLE

Todas as pré-condições para iniciar foram satisfeitas.

---

## 11.3 RUNNING

A tentativa possui autoridade operacional válida para executar.

---

## 11.4 SUCCEEDED

A execução produziu resultado técnico esperado.

Isso não equivale automaticamente a aceite do Work Item.

---

## 11.5 FAILED

A execução terminou sem produzir resultado esperado.

FAILED é fato terminal daquela tentativa.

Recovery cria nova Execution.

---

## 11.6 CANCELLED

A execução perdeu intenção ou autoridade de continuar.

---

## 11.7 EXPIRED / STALE

A execução não possui mais autoridade para promover estado autoritativo.

Resultado tardio deve ser reconciliado quando necessário.

---

# 12. Relação entre lifecycles

A relação principal é:

```text
Need
  │
  └── origina → Project
                  │
                  ├── possui → Module
                  │             │
                  │             └── possui → ValueIncrement
                  │                           │
                  │                           └── referencia → Work Item de Module
                  │
                  ├── pode governar → Work Item transversal
                  │
                  └── produz → Delivery

Work Item
   └── possui tentativas → Execution
```

---

# 13. Regras de criação

## 13.1 Need

Pode ser criada quando existe problema, oportunidade, correção ou evolução a ser
avaliada.

---

## 13.2 Project

Somente pode ser criado a partir de Need aceita.

---

## 13.3 Module

Somente pode ser criado dentro de Project válido.

A criação exige responsabilidade de negócio identificável.

---

## 13.4 ValueIncrement

Somente pode ser criada dentro de Module válido, com valor de negócio, critérios e baseline identificáveis.

---

## 13.5 Work Item

Somente pode ser criado com escopo governante explícito. Work Item governado por Module no fluxo normal deve referenciar sua ValueIncrement.

---

## 13.6 Execution

Somente pode ser criada para Work Item autorizado e intenção válida.

---

## 13.7 Delivery

Somente pode ser criada **depois** que a candidatura em `Project.DELIVERY` tiver
sido aceita por decisão governada.

Rejeição da candidatura não cria uma Delivery aceita.

---

# 14. Fluxo de decisão material

Toda decisão material segue, em alto nível:

```text
DESCOBRIR
    ↓
CONCEBER
    ↓
REVISAR
    ↓
AUDITAR
    ↓
DECIDIR
    ↓
MATERIALIZAR
```

Nem toda tarefa trivial precisa atravessar todas as etapas com a mesma
profundidade.

Mas nenhuma mudança material pode pular silenciosamente esse fluxo.

---

# 15. Retornos de lifecycle

O lifecycle não é uma linha reta.

Retorno é permitido quando há causa explícita.

Exemplos:

```text
PLANNING
    ↓
lacuna arquitetural encontrada
    ↓
ARCHITECTURE
```

```text
VALIDATION
    ↓
resultado não atende critério
    ↓
IMPLEMENTATION
```

```text
AUDIT
    ↓
finding material
    ↓
fase que precisa rework
```

Todo retorno deve possuir:

- causa;
- destino;
- evidência;
- autoridade;
- continuidade.

Retorno não apaga fatos anteriores.

## 15.1 Cobertura de mudança e baseline

Todo retorno, mudança material de escopo/baseline, supersessão ou cancelamento
de recurso governante deve classificar explicitamente os descendentes e
artefatos afetados conforme a Constituição:

```text
KEEP
REVALIDATE
SUPERSEDE
REVOKE
RECONCILE
```

Enquanto a classificação não estiver concluída, os descendentes potencialmente
afetados não são elegíveis para novo avanço.

Work Items `READY`, Executions, evidências, reviews, auditorias, autorizações e
handoffs devem estar vinculados ao escopo/baseline corrente do owner.

Uma volta de `IMPLEMENTATION → ARCHITECTURE`, por exemplo, não pode deixar Work
Items derivados da arquitetura anterior executáveis por inércia.

---

# 16. Agregação Project ↔ Module

Project não avança apenas porque um Module avançou.

O avanço do Project deve considerar:

- Modules obrigatórios;
- Modules opcionais;
- dependências;
- Work Items transversais;
- blockers;
- findings;
- validação integrada;
- Delivery pretendida.

A fórmula detalhada será definida posteriormente.

Neste nível, ficam as seguintes leis:

```text
Module DONE ≠ Project DONE
Module INTEGRATED ≠ Project DELIVERED
Execution SUCCEEDED ≠ Work Item DONE
Work Item DONE ≠ Module INTEGRATED
```

A agregação deve ser explícita e determinística.

---

# 17. Dependências entre Modules

Dependências devem possuir:

- origem;
- destino;
- condição de satisfação;
- responsável;
- impacto;
- fallback.

Um Module dependente não pode avançar por mera presunção de que predecessor
"provavelmente terminou".

A condição deve ser verificável.

Se dependência se tornar impossível, o recurso dependente entra em condição
governada de:

```text
BLOCKED
REPLAN
CANCEL
ou
EXCEPTION
```

conforme política futura.

---

# 18. Continuidade em qualquer lifecycle

Todo recurso ativo deve possuir continuidade acionável.

Uma continuidade válida é uma das seguintes:

```text
trabalho automático elegível
ação humana autorizada
espera governada
bloqueio governado
recovery governado
reconciliation governada
```

Toda continuidade precisa ter:

- responsável;
- próxima ação ou condição;
- saída;
- fallback;
- escalada quando aplicável.

Nenhum estado ativo pode permanecer apenas com:

```text
"aguardando"
"bloqueado"
"em análise"
```

sem mecanismo real de progressão.

---

# 19. Liveness

O sistema deve continuamente ser capaz de responder:

```text
o que faz este recurso avançar daqui?
```

Se a resposta não existir, existe inconsistência de continuidade.

Esse princípio vale para:

- Need;
- Project;
- Module;
- Work Item;
- Execution.

---

# 20. Pausa

Pausa preserva intenção de continuidade.

Um recurso pausado não executa avanço normal.

Pausa deve possuir:

- autoridade;
- motivo;
- instante;
- escopo;
- condição ou processo de retomada.

Retomada exige revalidação do contexto atual.

---

# 21. Bloqueio

Bloqueio significa:

```text
queremos continuar
mas existe impedimento conhecido
```

Bloqueio deve possuir:

- causa;
- responsável;
- condição de saída;
- escalada;
- prazo ou cadência quando aplicável.

Bloqueio sem saída é inconsistência.

---

# 22. Cancelamento

Cancelamento encerra intenção de continuidade.

Cancelamento:

- não apaga história;
- impede novas execuções;
- invalida autoridade de trabalho futuro;
- exige tratamento de trabalho em voo;
- pode exigir reconciliation;
- pode exigir compensation.

---

# 23. Falha

Falha pertence primariamente ao lifecycle de Execution.

Uma falha pode causar:

- retry;
- rework;
- recovery;
- reconciliation;
- blocker;
- escalada;
- cancelamento.

A escolha depende de causa, certeza do efeito e política aplicável.

Falha não deve promover automaticamente Project ou Module para estado terminal.

---

# 24. Retry, Rework, Recovery e Reconciliation

## Retry

Repete a mesma intenção quando repetir é seguro.

## Rework

Produz novo trabalho porque resultado anterior não foi aceito.

## Recovery

Cria nova Execution causal após falha terminal.

## Reconciliation

Resolve dúvida entre estado canônico e efeitos observados.

Esses conceitos não são intercambiáveis.

---

# 25. Findings e gates

Review e Audit podem produzir findings.

Um finding pode:

- não bloquear;
- bloquear;
- exigir rework;
- exigir reauditoria;
- exigir decisão de risco;
- exigir exceção governada.

`RISK_ACCEPTED` e `EXCEPTION_GRANTED` não são equivalentes.

Aceitação de risco registra que um risco conhecido foi conscientemente aceito
quando a política permitir. Ela **não libera, por si só, um finding bloqueador**.

Finding bloqueador somente permite avanço excepcional quando existir
`EXCEPTION_GRANTED` governada, ou quando o próprio finding tiver sido remediado,
invalidado ou reclassificado de forma válida.

Gate não é estado.

Gate é condição de decisão que controla transição.

Um gate deve possuir:

- objeto;
- critérios;
- evidências;
- autoridade;
- resultado.

---

# 26. Gates humanos de alto nível

Neste modelo, decisões humanas são esperadas especialmente em pontos como:

```text
aceitar Need para Project
aprovar decisão material de produto
aprovar arquitetura material
aprovar plano material
aceitar risco material
aprovar exceção
pausar
cancelar
aceitar Delivery
```

A lista detalhada será definida depois.

Não se pretende transformar toda tarefa técnica em gate humano.

---

# 27. Handoffs

Toda passagem de responsabilidade deve ser governada.

Exemplo:

```text
Concepção
    ↓
Arquitetura
```

não significa apenas:

```text
"o agente anterior terminou"
```

Significa:

```text
resultado produzido
+
evidência
+
condições de saída satisfeitas
+
handoff durável
+
destino capaz de assumir continuidade
```

---

# 28. UI e lifecycle

A UI nunca decide o lifecycle.

Ela apresenta projeções do estado e das ações autorizadas.

A relação é:

```text
norma
+
estado canônico
+
fatos
        ↓
projeção
        ↓
UI
```

Se existe ação humana necessária para continuidade, a projeção deve torná-la
visível ao responsável.

Se isso não acontecer, existe inconsistência operacional.

---

# 29. Evolução

Depois de uma Delivery:

```text
Delivery
    ↓
nova Need
    ↓
qualificação
    ↓
concepção
    ↓
...
```

A nova Need de evolução deve referenciar obrigatoriamente a Delivery ou baseline predecessora.

O sistema então decide em qual ponto do lifecycle a mudança precisa entrar.

Mudança pequena não precisa necessariamente repetir toda a jornada com mesma
profundidade.

Mudança material deve respeitar novamente discovery, review, audit e decisão.

---

# 30. Condições terminais

Cada lifecycle específico terá seus estados terminais.

Neste modelo:

```text
Need:
ACCEPTED
REJECTED
CANCELLED

Project:
DELIVERED
CANCELLED

Module:
INTEGRATED
CANCELLED

Work Item:
DONE
CANCELLED

Execution:
SUCCEEDED
FAILED
CANCELLED
```

`Delivery` não possui máquina ativa própria neste modelo: sua existência já
representa um aceite terminal e imutável para determinado escopo/baseline. Uma
candidatura rejeitada permanece fato do `Project.DELIVERY`, não uma Delivery
aceita.

Alguns estados terminais podem originar nova intenção governada.

Terminal significa:

```text
esta instância não continua normalmente
```

e não:

```text
nada relacionado poderá acontecer no futuro
```

---

# 31. Proibições de alto nível

O lifecycle derivado não pode permitir:

- Project sem Need aceita;
- Module sem Project proprietário;
- Work Item sem escopo governante;
- Execution sem Work Item;
- execução terminal ser ressuscitada;
- UI inventar transição;
- agente inventar autoridade;
- blocker sem rota de saída;
- wait sem condição observável;
- active resource sem continuidade;
- resultado técnico ser tratado automaticamente como aceite;
- finding bloqueador desaparecer sem tratamento;
- cancelamento deixar executor antigo promovendo estado;
- handoff depender apenas de expectativa;
- evolução entrar direto em implementação sem Need governada.

---

# 32. Questões que este documento deliberadamente não resolve ainda

Este documento não define:

- nomes definitivos de todos os eventos;
- payloads;
- schemas;
- tabelas;
- migrations;
- APIs;
- filas;
- workers;
- locks;
- leases;
- TTLs;
- timeouts;
- tipos exatos de agentes;
- prompts;
- layout de UI;
- desenho de telas;
- políticas detalhadas de autorização;
- matriz final de gates;
- matriz completa Project ↔ Module;
- severidades finais de findings;
- regras físicas de versionamento.

Esses elementos serão derivados depois.

---

# 33. Documentos derivados previstos

Após aprovação deste modelo, a decomposição prevista é:

```text
lifecycle/
├── 01_LIFECYCLE_MODEL.md
├── 02_NEED_LIFECYCLE.md
├── 03_PROJECT_LIFECYCLE.md
├── 04_MODULE_LIFECYCLE.md
├── 05_WORK_ITEM_LIFECYCLE.md
└── 06_EXECUTION_LIFECYCLE.md
```

Essa lista pode ser ajustada se o próprio modelo aprovado demonstrar necessidade
de decomposição diferente.

Arquivos não devem ser criados apenas para cumprir numeração.

---

# 34. Ordem de detalhamento

A ordem preferida é:

```text
1. Need
2. Project
3. Module
4. ValueIncrement
5. Work Item
6. Execution
```

Motivo:

cada nível fornece contexto para o próximo.

Execution é detalhada por último porque seu lifecycle operacional deve servir ao
modelo de negócio, e não definir o modelo de negócio.

---

# 35. Critério de aprovação deste documento

Este modelo somente deve ser considerado pronto quando for possível responder,
sem inventar nova lei:

- como uma Need vira Project;
- como Project gera Modules;
- como Modules se decompõem em ValueIncrements e estas originam Work Items;
- como Project pode governar Work Items transversais;
- como Work Items geram Executions;
- como execução técnica se diferencia de aceite;
- como Project agrega Modules;
- como dependências funcionam;
- como decisões materiais amadurecem;
- onde existem gates;
- como dead-ends são impedidos;
- como pause/block/cancel/failure diferem;
- como recovery funciona;
- como Delivery acontece;
- como Evolution reentra.

Se qualquer uma dessas respostas exigir uma nova regra constitucional, a
Constituição deve ser revisada antes.

---

# 36. Princípio final do lifecycle

O lifecycle do NAAMIVE não é uma sequência de telas, jobs ou agentes.

É uma sequência governada de mudanças de realidade.

Cada avanço deve responder:

```text
por que podemos avançar?
quem autorizou?
qual evidência existe?
qual estado muda?
qual regra permite?
o que acontece depois?
```

Se a última pergunta não possuir resposta verificável:

```text
o lifecycle não está pronto para avançar.
```
