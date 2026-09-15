# Definição da Necessidade

## Conceito

Necessidade representa uma mudança de negócio que pode justificar a criação de um Projeto finito.

Ela descreve principalmente **o que precisa mudar e por quê**, sem antecipar como a mudança será implementada.

Esta documentação define o conceito e o modelo de Necessidade. As instâncias reais administradas pelo NAAMIVE pertencem à área de dados operacionais.

Uma Necessidade deve ser:

* clara;
* coerente;
* de escopo compreensível;
* limitada;
* entregável;
* associada a um resultado observável; e
* suficientemente coesa para originar um único Projeto.

## Tipo da Necessidade

Toda Necessidade possui um dos tipos abaixo:

* `NOVO_PRODUTO`;
* `EVOLUCAO_DE_PRODUTO`.

Quando a Necessidade for uma evolução, deve identificar o produto existente afetado e, quando conhecido, o resultado atual que motivou a mudança. Não é exigido vínculo direto com um Projeto anterior: um produto pode existir por meio de muitos Projetos sucessivos.

## Relação entre Necessidade e Projeto

Uma Necessidade aceita origina um único Projeto:

```text
1 Necessidade aceita
→ origina
→ 1 Projeto
```

Quando uma demanda contiver resultados que possam ser priorizados, entregues, adiados ou cancelados independentemente, ela é candidata à decomposição em mais de uma Necessidade.

Os conceitos não devem ser confundidos:

* **Produto** pode ter longa duração e ser evoluído por muitos Projetos.
* **Necessidade** representa uma mudança entregável.
* **Projeto** é o esforço finito criado para atender uma Necessidade.

## Limites da Necessidade

A Necessidade não deve definir ou antecipar:

* arquitetura;
* tecnologias;
* banco de dados;
* estrutura de módulos;
* solução técnica;
* plano de implementação; ou
* detalhamento pertencente ao Projeto.
