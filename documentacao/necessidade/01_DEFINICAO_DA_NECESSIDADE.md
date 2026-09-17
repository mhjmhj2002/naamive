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

Uma Necessidade com compromisso aprovado origina um único Projeto:

```text
1 Necessidade com compromisso aprovado
→ origina
→ 1 Projeto
```

Quando uma demanda contiver resultados que possam ser priorizados, entregues, adiados ou cancelados independentemente, ela é candidata à decomposição em mais de uma Necessidade.

Os conceitos não devem ser confundidos:

* **Produto** pode ter longa duração e ser evoluído por muitos Projetos.
* **Necessidade** representa uma mudança entregável.
* **Projeto** é o esforço finito criado para atender uma Necessidade.

## Artefato de saída: Compromisso da Necessidade

O **Compromisso da Necessidade** é a representação formal, consolidada e rastreável, mantida no registro da Necessidade, do que foi legitimamente assumido. Ele torna consumível pela vertical Projeto o resultado útil de formação, auditoria, qualificação, recomendação e decisão humana, sem obrigá-la a reconstruir o raciocínio interno dessas atividades.

O artefato deve apresentar, de forma suficientemente autocontida:

* o problema ou oportunidade assumido;
* o resultado pretendido;
* o escopo e o fora de escopo;
* o critério de atendimento;
* as restrições e dependências conhecidas que devem ser preservadas;
* o contexto relevante; e
* a decisão humana que tornou o compromisso válido.

Ele é uma visão consolidada da entidade, e não uma nova entidade de domínio, novo arquivo, histórico, status, Resultado do Processo ou decisão humana. A Necessidade completa continua sendo a fonte de verdade de seu contexto, processo, resultados, estado e evidências.

O Compromisso da Necessidade somente está disponível para consumo após a decisão humana `APROVADO`. Material de formação, auditoria ou qualificação anterior não constitui compromisso assumido. O Projeto o recebe como referência de entrada e não pode redefini-lo silenciosamente.

```text
Necessidade
→ Compromisso da Necessidade
→ Projeto
→ Direção do Projeto
→ próxima vertical
```

## Limites da Necessidade

A Necessidade não deve definir ou antecipar:

* arquitetura;
* tecnologias;
* banco de dados;
* estrutura de módulos;
* solução técnica;
* plano de implementação; ou
* detalhamento pertencente ao Projeto.
