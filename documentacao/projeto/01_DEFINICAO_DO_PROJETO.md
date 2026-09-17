# Definição do Projeto

## Conceito

Projeto é o esforço finito criado obrigatoriamente para atender uma única Necessidade com compromisso aprovado.

Ele transforma o compromisso definido pela Necessidade em compreensão e direção de solução suficientes para auditoria de formação.

Projeto não é a Necessidade: a Necessidade define a mudança a ser atendida; o Projeto assume a responsabilidade de compreender esse compromisso e formar uma direção de solução para ele.

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

A entrada do Projeto é o **Compromisso da Necessidade**, artefato consolidado disponível após `APROVADO`. Ele permite receber o que foi assumido sem reconstruir o processo interno da Necessidade. A Necessidade completa continua sendo a fonte de verdade, e o Projeto não pode redefinir silenciosamente o compromisso recebido.

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

## Artefato de saída: Direção do Projeto

A **Direção do Projeto** é a representação formal, consolidada e rastreável, mantida no registro do Projeto, do resultado aprovado de sua formação. Ela permite que uma vertical posterior compreenda o que recebeu sem assumir as responsabilidades internas de enquadramento, descoberta, direção da solução ou auditoria do Projeto.

Ela deve apresentar, de forma suficientemente autocontida:

* o Compromisso da Necessidade recebido;
* o que o Projeto precisa realizar e suas fronteiras;
* o contexto descoberto;
* restrições, dependências e riscos relevantes;
* a direção geral proposta; e
* o que é conhecido, inferido, proposto e legitimamente desconhecido.

A Direção do Projeto não é uma especificação técnica detalhada: não exige banco de dados, tabelas, endpoints, diagramas de sequência, componentes internos, entidades descendentes, módulos, Entregas de Valor, Itens de Trabalho ou tarefas. Também não é uma nova entidade de domínio, novo arquivo, histórico, status, Resultado do Processo ou decisão humana.

Ela somente está aprovada e disponível para consumo posterior após o Resultado do Processo `FORMACAO_SUFICIENTE`. Esse Resultado confirma a suficiência da formação, mas não é a Direção do Projeto. A entidade Projeto completa preserva o contexto, o processo, os resultados, o estado e as evidências.

```text
Necessidade
→ Compromisso da Necessidade
→ Projeto
→ Direção do Projeto
→ próxima vertical
```

## Responsabilidade do Projeto

O Projeto é responsável por:

* enquadrar o compromisso recebido e suas fronteiras;
* investigar o contexto necessário à realização;
* definir uma direção de solução adequada;
* registrar decisões, propostas, incógnitas, restrições, dependências e riscos relevantes;
* entregar sua formação para auditoria independente.

## Fronteira com trabalho descendente futuro

O Projeto pode futuramente originar trabalho descendente quando uma vertical própria para esse trabalho estiver definida. Essa possibilidade não integra a formação, o ciclo de vida, os status, os Resultados do Processo nem as responsabilidades atualmente definidos para Projeto.

Projeto não identifica, decompõe formalmente, materializa ou conduz o ciclo de vida de entidades descendentes ainda não definidas. Também não antecipa suas estruturas internas, entregas, itens de trabalho, tarefas ou detalhamento de implementação.

## Fronteira da responsabilidade direta de formação

A responsabilidade direta do Especialista em Formação do Projeto termina quando ele entrega ao Auditor do Projeto material suficiente para auditoria. A formação não depende da existência física de trabalho descendente nem de sua constituição normativa.

`FORMACAO_SUFICIENTE` significa somente que a formação do Projeto foi aprovada. O estado e a continuação operacional posteriores ainda não estão definidos; esta definição não infere caminho até `CONCLUIDO`.

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
* backlog permanente;
* repositório;
* aplicação;
* arquitetura;
* cronograma; ou
* conjunto de tarefas.

Esses elementos podem existir no contexto do Projeto, mas não definem o conceito de Projeto.
