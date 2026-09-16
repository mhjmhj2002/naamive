# Definição do Projeto

## Conceito

Projeto é o esforço finito criado obrigatoriamente para atender uma única Necessidade com compromisso aprovado.

Ele transforma o compromisso definido pela Necessidade em uma direção realizável, organiza sua realização e conduz sua decomposição até o nível de Módulo.

Projeto não é a Necessidade: a Necessidade define a mudança a ser atendida; o Projeto assume a responsabilidade de compreender como realizar o compromisso recebido.

## Relação entre Necessidade e Projeto

Uma Necessidade com compromisso aprovado origina um único Projeto:

```text
1 Necessidade com compromisso aprovado
→ origina
→ 1 Projeto
```

A relação é 1:1. Projeto não nasce diretamente de formulário independente nem de criação manual desvinculada de uma Necessidade.

Após `APROVADO`, o primeiro Ator agêntico da vertical é o Especialista em Formação do Projeto. Se a instância 1:1 ainda não existir, o bootstrap faz parte da responsabilidade inicial desse mesmo Ator: ele materializa o Projeto em `EM_FORMACAO` e continua sua formação. Não há Ator separado para criação ou materialização de Projeto.

## Compromisso recebido da Necessidade

A Necessidade continua sendo a fonte de verdade para:

* o que precisa mudar;
* por que precisa mudar;
* problema ou oportunidade;
* resultado pretendido;
* escopo;
* fora de escopo;
* critério de atendimento;
* valor da mudança; e
* contexto e restrições já conhecidos.

O Projeto usa essas informações como compromisso e referência, mas não deve redefini-las silenciosamente. Alterações materiais nesse compromisso pertencem à relação com a Necessidade e exigem tratamento explícito.

## Responsabilidade do Projeto

O Projeto é responsável por compreender como o compromisso será realizado. Em seu domínio conceitual podem existir:

* investigação do contexto necessário à execução;
* direção de solução;
* decisões estruturais;
* restrições e dependências de execução;
* organização da realização;
* decomposição em Módulos;
* acompanhamento agregado do trabalho descendente; e
* verificação de que o resultado produzido continua alinhado ao compromisso recebido.

## Relação entre Projeto e Módulo

O Projeto identifica os Módulos necessários, define a responsabilidade geral de cada Módulo, define as fronteiras entre eles e materializa os Módulos.

O Projeto não define internamente:

* Entregas de Valor dos Módulos;
* Itens de Trabalho;
* tarefas; ou
* detalhamento interno de implementação pertencente ao Módulo.

A definição interna de cada Módulo pertence ao próprio Módulo. Esta decisão estabelece uma fronteira conceitual e não cria, por enquanto, modelo de Módulo.

## Fronteira da responsabilidade direta

Quando os Módulos são materializados, o Projeto encerra sua responsabilidade direta de formação e decomposição. A partir desse ponto, o trabalho é conduzido pelos Módulos, enquanto o Projeto permanece existente como entidade agregadora e referência do compromisso recebido da Necessidade.

Essa fronteira não significa que o Projeto deixa de existir quando surgem os Módulos. Embora finito, ele permanece como entidade pai e agregadora até o encerramento de seu compromisso. Esta definição não estabelece ainda como ocorrem encerramento, sucesso, cancelamento ou aceite final.

## Projeto, Necessidade e Produto

Os conceitos são distintos:

* **Produto** pode ter longa duração.
* **Necessidade** representa uma mudança entregável.
* **Projeto** representa o esforço finito para realizar uma única Necessidade aprovada.

Um mesmo Produto pode ser alterado por sucessivas Necessidades e Projetos.

## Limites do Projeto

Projeto não é:

* Produto;
* Necessidade;
* Módulo;
* backlog permanente;
* repositório;
* aplicação;
* arquitetura;
* cronograma; ou
* conjunto de tarefas.

Esses elementos podem existir no contexto do Projeto, mas não definem o conceito de Projeto.

## Hierarquia conceitual de referência

```text
Necessidade (1)
→ Projeto (1)
→ Módulo (N)
→ Entrega de Valor (N)
→ Item de Trabalho (N)
```

Esta hierarquia serve somente como referência. As entidades abaixo de Projeto não são definidas neste documento.
