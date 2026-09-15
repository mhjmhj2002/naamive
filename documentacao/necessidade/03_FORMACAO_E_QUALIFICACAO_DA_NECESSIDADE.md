# Formação e qualificação da Necessidade

## Escopo desta definição

Este documento detalha a formação e a qualificação, trechos iniciais do ciclo de vida da Necessidade, desde o registro até a decisão humana sobre assumir compromisso.

```text
entrada
→ formação interativa
→ auditoria de formação
→ qualificação
→ recomendação
→ decisão humana de compromisso
```

O ciclo de vida completo, inclusive a relação posterior com Projeto e o encerramento, está definido em [Ciclo de Vida da Necessidade](CICLO_DE_VIDA_DA_NECESSIDADE.md). Os status oficiais estão em [Status da Necessidade](STATUS_DA_NECESSIDADE.md), e os resultados produzidos durante este processo estão em [Resultados do Processo da Necessidade](RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md).

## Entrada

A entrada acontece quando uma pessoa registra uma demanda conforme o [Modelo de Necessidade](02_MODELO_DE_NECESSIDADE.md). O preenchimento do modelo não prova, por si só, que a Necessidade está pronta para avançar.

> O modelo inicial é uma porta de entrada, não uma prova que o usuário precisa passar sozinho.

## Formação interativa

A formação transforma a manifestação inicial em uma Necessidade que represente fielmente o que a pessoa realmente precisa. Ela é conduzida por agente especializado em Necessidade e privilegia esclarecimento, interação, brainstorm, reformulação e, quando necessária, decomposição.

A finalidade é formar adequadamente a demanda, não rejeitá-la rapidamente por estar incompleta ou mal formulada.

### Responsabilidades

O agente especializado pode identificar lacunas e pontos adequados, selecionar tratamento, formular perguntas, conduzir brainstorm, propor reformulação ou decomposição, reconstruir o registro e executar nova auditoria.

A pessoa usuária fornece contexto e esclarecimentos materiais, participa quando necessário, confirma mudanças relevantes e decomposições, e confirma que o registro formado representa sua intenção. O agente não substitui informação ausente por invenção.

### Estratégia de tratamento

A estratégia é decisão do agente especializado; a pessoa usuária não escolhe mecanismos internos. Conforme o diagnóstico, o agente pode aplicar uma estratégia ou combiná-las:

* esclarecimento;
* brainstorm;
* reformulação;
* decomposição; ou
* nenhuma intervenção necessária.

## Auditoria de formação

Antes de seguir para qualificação, toda Necessidade passa por auditoria especializada. A auditoria avalia a qualidade real do conteúdo, e não apenas a existência de campos.

O diagnóstico registra:

* **Pontos adequados:** o que está bom e por que está bom;
* **Pontos a melhorar:** lacunas, ambiguidades, contradições, problemas de escopo, mistura entre problema e solução, ausência de resultado observável, tamanho inadequado ou outros riscos; e
* **Tratamento:** a estratégia decidida pelo agente.

Quando houver problema corrigível, aplica-se o loop abaixo até que a formação esteja suficiente:

```text
auditoria
↓
diagnóstico
↓
estratégia escolhida pelo agente
↓
interação com a pessoa usuária
↓
atualização da Necessidade
↓
nova auditoria
└──────────────────── loop
```

Uma Necessidade pode sair da formação quando há problema compreensível, afetados identificáveis, resultado pretendido compreensível, fronteira de escopo suficiente, critério de atendimento observável, ausência de contradição material conhecida, tamanho compatível com uma única Necessidade, separação adequada entre problema e solução e confirmação da intenção pela pessoa usuária.

Nessa condição, a auditoria produz o resultado de formação previsto no catálogo de [Resultados do Processo da Necessidade](RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md). Esse resultado é da auditoria ou verificação; ele não é estado formal do ciclo de vida.

## Capacidades especializadas identificadas

As capacidades necessárias ao especialista em Necessidade, sem criar ainda catálogo global de competências nem arquitetura definitiva de agentes, são:

* Auditoria de Necessidade;
* Formação de Necessidade;
* Esclarecimento de Necessidade;
* Brainstorm de Necessidade;
* Reformulação de Necessidade; e
* Decomposição de Necessidade.

## Qualificação

Após a formação, a qualificação responde: faz sentido assumir compromisso com esta Necessidade? Ela avalia exclusivamente:

* **Valor:** mudança ou benefício relevante pretendido;
* **Prioridade:** motivo para tratar agora em vez de posteriormente;
* **Aderência:** compatibilidade com o produto, a organização ou o contexto responsável;
* **Restrições conhecidas:** condições que impeçam ou condicionem o compromisso; e
* **Dependências conhecidas:** dependências que impeçam assumir compromisso agora.

Arquitetura, banco de dados, tecnologias, módulos, desenho técnico, plano de implementação, estimativa técnica detalhada e solução de engenharia não pertencem à qualificação. Esses assuntos pertencem ao Projeto ou a etapas futuras.

Se faltar informação relevante, a qualificação retorna à interação humana e é refeita após a complementação; a ausência de informação não implica rejeição automática.

```text
qualificação
↓
lacuna
↓
interação com humano
↓
complementação
↓
nova qualificação
```

## Recomendação e decisão de compromisso

Concluída a qualificação, o agente especializado emite a recomendação fundamentada prevista no catálogo de [Resultados do Processo da Necessidade](RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md). A recomendação não é decisão material.

```text
Agente especializado
→ analisa, audita, qualifica e recomenda

Humano com autoridade
→ decide
```

O agente não assume sozinho compromisso de execução, pessoas, orçamento ou tempo. Quando a decisão humana for positiva, uma Necessidade com compromisso aprovado deverá originar um único Projeto. Este documento não cria Projeto, não define seu modelo e não define sua estrutura.
