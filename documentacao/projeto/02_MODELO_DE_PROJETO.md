# Modelo de Projeto

## Finalidade

Este documento define a forma mínima de uma instância de Projeto para que ela exista de maneira identificável, rastreável e utilizável pelo sistema e pela pessoa usuária.

O modelo é propositalmente mínimo. Projeto nasce obrigatoriamente de uma Necessidade com compromisso aprovado; portanto, não repete informações que já pertencem à Necessidade nem antecipa decisões sobre a condução ou a realização do Projeto.

## Estrutura conceitual

```text
Projeto
├── identificador técnico
├── código
├── nome
└── necessidade de origem
```

## Elementos mínimos

### Identificador técnico único

Todo Projeto possui uma identidade técnica única da instância. Ela permite sua identificação inequívoca pelo sistema e viabiliza sua futura persistência.

Este modelo não define tecnologia, formato de UUID, estratégia de banco de dados nem regra física de restrição.

### Código legível e rastreável

Todo Projeto possui um código humano e estável para referência operacional. Como convenção conceitual, pode ser apresentado em formatos como `P-001` e `P-002`.

O código não substitui o identificador técnico. Este modelo não define ainda seu mecanismo de geração.

### Nome

Todo Projeto possui um nome amigável para exibição e uso pela pessoa usuária. O nome permite a identificação semântica e visual do Projeto na aplicação.

Durante o bootstrap, o Especialista em Formação do Projeto propõe ou gera o nome inicial. O nome não precisa ser fornecido previamente pelo Owner nem exige aprovação humana específica para ser aceito. O Owner pode alterá-lo posteriormente.

Alterar o nome não modifica o identificador técnico, o código nem a Necessidade de origem. Assim, esses elementos preservam papéis distintos:

```text
identificador técnico
→ identidade técnica da instância

código
→ referência operacional estável

nome
→ identificação humana e editável

necessidade de origem
→ vínculo 1:1 estável
```

Esta definição não estabelece regras de unicidade, escopo de duplicidade, persistência ou interface. Em futura interface, o nome inicialmente sugerido deve ser apresentado de forma editável ao Owner.

### Necessidade de origem

Todo Projeto referencia exatamente uma Necessidade de origem. A referência preserva a relação conceitual:

```text
1 Necessidade com compromisso aprovado
→ 1 Projeto
```

A Necessidade continua sendo a fonte de verdade do compromisso. Por isso, o Projeto não copia para este modelo o problema, o resultado pretendido, o escopo, o fora de escopo, o critério de atendimento, o valor ou as demais informações que pertencem à Necessidade.

## Artefatos de passagem

O Projeto recebe o **Compromisso da Necessidade** como referência de entrada. Após a aprovação da formação, seu registro deve identificar em seção própria a **Direção do Projeto**, resumo consolidado e rastreável do que foi formado e aprovado.

A Direção do Projeto deve cobrir compromisso recebido, objetivo, fronteiras, contexto, restrições, dependências, riscos, direção geral e a classificação entre conhecido, inferido, proposto e desconhecido. Ela não substitui o registro completo do Projeto nem antecipa detalhamento técnico ou trabalho de verticais posteriores. Antes de `FORMACAO_SUFICIENTE`, existe material de formação, mas ainda não há Direção do Projeto aprovada e disponível para consumo.

## Limites deste modelo inicial

Não pertencem a este modelo inicial:

* status;
* fases;
* agentes;
* Owner como campo da instância;
* datas;
* estimativas;
* arquitetura;
* direção da solução;
* entidades descendentes;
* Entregas de Valor;
* Itens de Trabalho;
* tarefas;
* resultados de auditoria;
* Resultados do Processo;
* informações duplicadas da Necessidade;
* regras físicas de banco de dados; e
* regras de unicidade do nome.

Em particular, Owner é Ator humano transversal, executado pelo usuário autenticado, e não um campo atribuível individualmente ao Projeto. Suas responsabilidades estão definidas em [Atores do Projeto](03_ATORES_DO_PROJETO.md).

Este documento é um modelo da entidade, não um formulário de entrada, processo, ciclo de vida ou especificação de persistência técnica.
