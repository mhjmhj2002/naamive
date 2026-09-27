# Definição da Entrega de Valor

## Conceito

**Entrega de Valor é uma unidade finita de evolução do software, pertencente a exatamente um Módulo, que materializa parte da capacidade desse Módulo em um resultado utilizável, perceptível, demonstrável e verificável pelo usuário.**

Ela existe quando o software passa a oferecer ao usuário uma capacidade nova ou uma evolução relevante de capacidade já existente. Essa evolução deve poder ser utilizada, percebida, demonstrada e verificada no contexto para o qual foi concebida.

Entrega de Valor descreve a evolução que se quer tornar verdadeira para o usuário. Não descreve, por si, como essa evolução será realizada, decomposta, integrada ou disponibilizada tecnicamente.

## Propósito

O propósito da Entrega de Valor é manter a realização de software orientada por uma mudança concreta na experiência ou na capacidade disponível ao usuário. Ela evita que a existência de trabalho técnico, embora eventualmente indispensável, seja confundida com valor entregue.

Uma Entrega de Valor pode:

* introduzir uma possibilidade de uso;
* ampliar uma possibilidade já existente;
* melhorar comportamento perceptível;
* remover uma limitação perceptível; ou
* alterar de modo relevante como o usuário exerce uma capacidade.

Essas possibilidades esclarecem o conceito, mas não constituem tipos formais de Entrega de Valor.

## Posição na hierarquia

A Entrega de Valor ocupa a camada conceitual posterior ao Módulo:

```text
Necessidade
→ Projeto
→ Módulo
→ Entrega de Valor
→ Item de Trabalho
```

Nesta cadeia, a Entrega de Valor pertence a exatamente um Módulo. Um Módulo pode conter uma ou mais Entregas de Valor relacionadas. A rastreabilidade com Projeto, Direção do Projeto, Necessidade e Compromisso da Necessidade é preservada por essa cadeia de origem; a Entrega de Valor não redefine nenhum desses conceitos ou artefatos.

O Item de Trabalho é mencionado somente como conceito futuro: representa o trabalho necessário para realizar uma Entrega de Valor. Esta definição não estabelece seu modelo, ciclo, status, Resultado do Processo, Ator, Skill, decomposição ou cardinalidade com Entrega de Valor.

## Relação com o Módulo

Módulo e Entrega de Valor possuem fronteiras distintas:

```text
Módulo
→ capacidade coesa e permanente da solução

Entrega de Valor
→ evolução finita, utilizável e perceptível de parte dessa capacidade
```

Uma Entrega de Valor materializa progressivamente parte da capacidade de seu Módulo. Ela não substitui o Módulo, não representa toda a sua capacidade permanente e não torna necessária uma relação de uma Entrega de Valor para cada Módulo. Um Módulo não precisa ser entregue de uma única vez.

Esta definição também não estabelece quando, ou se, um Módulo pode ser considerado completamente realizado.

## Valor para o usuário

Uma Entrega de Valor precisa produzir uma evolução perceptível para o usuário. Trabalho técnico interno, isoladamente, não a caracteriza quando não resulta em capacidade utilizável e perceptível pelo usuário.

Podem ser necessários à realização, sem se tornarem automaticamente Entregas de Valor isoladas:

* criar ou alterar tabela e banco de dados;
* criar endpoint, serviço interno, biblioteca ou componente técnico;
* configurar fila, infraestrutura ou pipeline;
* refatorar código ou alterar arquitetura; e
* adicionar teste.

Esses trabalhos podem ser indispensáveis, mas não devem ser promovidos artificialmente a Entrega de Valor apenas por existirem. Em momento posterior, a camada apropriada de realização poderá tratá-los como trabalho necessário à evolução pretendida.

## Condições conceituais do resultado

Para caracterizar a evolução pretendida, os termos abaixo possuem este sentido conceitual:

* **Utilizável:** o usuário consegue exercer a capacidade no contexto para o qual ela foi concebida.
* **Perceptível:** há evolução reconhecível na experiência ou na capacidade disponível ao usuário.
* **Demonstrável:** é possível apresentar concretamente a evolução produzida.
* **Verificável:** é possível confrontar o comportamento ou os resultados observados com o que a Entrega de Valor pretendia tornar verdadeiro.

Essas condições não definem status, critério de auditoria, Resultado do Processo, ciclo de vida ou mecanismo de verificação. Elas delimitam o que distingue uma Entrega de Valor completa de trabalho interno ou de realização ainda incompleta.

## Finitude

Uma Entrega de Valor é finita: representa uma evolução delimitada que pode efetivamente alcançar resultado observável. Ela não é responsabilidade permanente, domínio inteiro, área funcional indefinida, manutenção eterna nem capacidade abstrata sem incremento delimitado.

A capacidade permanente pertence ao Módulo. A Entrega de Valor é uma evolução delimitada dessa capacidade.

## Relação conceitual com Jornada e Fluxo

Jornada e Fluxo são lentes de produto relacionadas à Entrega de Valor, mas não pertencem à hierarquia estrutural de Necessidade, Projeto, Módulo, Entrega de Valor e Item de Trabalho. Esta definição não cria vertical, entidade formal, modelo, ciclo ou status para nenhum deles.

**Jornada** representa uma experiência ou objetivo do usuário de ponta a ponta. Ela pode atravessar diferentes capacidades e, portanto, diferentes Módulos. Uma Entrega de Valor pode contribuir para uma ou mais Jornadas, sem necessariamente representar uma Jornada integralmente.

**Fluxo** representa um caminho ou comportamento pelo qual parte da Jornada acontece. Uma Entrega de Valor deve produzir evolução perceptível em pelo menos um Fluxo relevante de uma Jornada do usuário e pode se manifestar em um ou mais Fluxos.

As relações exatas de cardinalidade com Jornada ou Fluxo permanecem abertas para definição posterior.

## Entrega de Valor não é Fluxo

Entrega de Valor não é Fluxo. A Entrega de Valor descreve a evolução utilizável de uma capacidade; o Fluxo descreve como essa capacidade se manifesta no comportamento ou na experiência do usuário. Uma Entrega de Valor pode exigir ou modificar um ou mais Fluxos, sem relação obrigatória de um para um.

## Entrega de Valor não é Jornada

Entrega de Valor não é Jornada. A Jornada é mais ampla e expressa uma experiência ou objetivo de ponta a ponta, podendo atravessar vários Módulos e várias Entregas de Valor. A Entrega de Valor contribui para a Jornada sem necessariamente representá-la integralmente.

## Relação futura com Item de Trabalho

Entrega de Valor é a evolução que se quer tornar verdadeira para o usuário. Item de Trabalho é o futuro conceito de trabalho necessário para realizar essa evolução.

Essa distinção impede que partes técnicas, preparações ou atividades incompletas sejam tomadas pela evolução completa. A definição do Item de Trabalho permanece fora do escopo desta vertical neste momento.

## Relação com Pull Request e outros artefatos técnicos

Uma Entrega de Valor pode demandar alterações de software. No futuro, essas alterações podem ser integradas por um ou mais Pull Requests. Pull Request é artefato de realização, integração ou entrega técnica; não é Entrega de Valor.

Não há relação obrigatória de um para um entre Entrega de Valor e Pull Request. Esta definição não torna Git, GitHub, branch, commit, pipeline, ambiente ou mecanismo de integração invariantes normativos da Entrega de Valor.

Código implementado, isoladamente, também não é condição suficiente: a evolução precisa alcançar condição em que possa ser utilizada, percebida, demonstrada e verificada. Esta definição não antecipa em qual status ou etapa isso será registrado.

## O que uma Entrega de Valor não é

Entrega de Valor não é:

* Módulo, Jornada ou Fluxo;
* Item de Trabalho, tarefa, agrupamento arbitrário de atividades ou sprint;
* release, Pull Request, commit ou branch;
* endpoint, tela, tabela, microserviço, camada técnica ou componente arquitetural;
* trabalho técnico interno sem evolução perceptível para o usuário; ou
* conclusão automática de Projeto ou atendimento automático de Necessidade.

Esses elementos podem participar da materialização, da experiência, da verificação ou do contexto de uma Entrega de Valor. Por exemplo, uma tela pode materializar parte de uma Entrega de Valor, mas uma tela não é, por definição, uma Entrega de Valor. A lista não proíbe que tais elementos sejam necessários; apenas preserva a fronteira conceitual.

## Teste conceitual

A pergunta orientadora é:

> Se esta Entrega de Valor estiver pronta, conseguimos mostrar ao usuário uma evolução concreta do software que ele já pode utilizar e perceber em sua jornada?

Se a resposta for negativa, o elemento provavelmente representa trabalho técnico interno, preparação, parte incompleta da realização ou futuro Item de Trabalho, e não uma Entrega de Valor completa. Este é um teste conceitual, não algoritmo, status ou Resultado do Processo.

## Exemplos conceituais

Uma formulação orientada a Entrega de Valor descreve a mudança para o usuário:

> O usuário agora consegue realizar X.

Em contraste, as formulações abaixo descrevem trabalho técnico e não caracterizam sozinhas uma Entrega de Valor:

* foi criada a tabela Y;
* foi criado o endpoint Z;
* foi configurada a fila; ou
* foi refatorada a camada interna.

Os exemplos são apenas ilustrativos. Um elemento técnico pode compor uma realização e uma formulação de usuário precisa continuar vinculada a uma evolução concreta, utilizável, perceptível, demonstrável e verificável.

## Fronteiras normativas

Esta definição formaliza exclusivamente o conceito de Entrega de Valor. Ela não define modelo, campos, identificador, código, nome, instâncias, Atores, Skills, formação, auditoria, decisões humanas, ciclo de vida, status, Resultados do Processo, eventos, cancelamento, decomposição, mecanismo de realização, Pull Requests, ambientes ou mecanismos de verificação.

Uma Entrega de Valor concluída não conclui automaticamente o Projeto, não torna automaticamente a Necessidade `ATENDIDA`, não redefine o Compromisso da Necessidade e não redefine a Direção do Projeto. Os mecanismos posteriores para essas relações permanecem fora desta definição.
