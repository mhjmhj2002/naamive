# Definição do Item de Trabalho

## Conceito

**Item de Trabalho é uma unidade finita de execução técnica de software, subordinada a exatamente uma Entrega de Valor, que materializa parte de sua solução técnica em código, testes automatizados, esquemas de dados ou artefatos executáveis de software.**

Ele existe para decompor a Especificação de uma Entrega de Valor em trabalho de engenharia de software atribuível, executável, verificável isoladamente e integrável.

O Item de Trabalho não é uma evolução de valor para o usuário final nem redefine o negócio; ele realiza partes técnicas da solução necessária para que a evolução prometida pela Entrega de Valor se torne utilizável, perceptível, demonstrável e verificável.

## Propósito

O propósito do Item de Trabalho é viabilizar a realização técnica do software de forma coesa, transparente, rastreável e gerenciável. Ele estabelece uma fronteira de execução para o Engenheiro de Software (ou agente executor de desenvolvimento) com contrato, contexto e critérios de aceitação técnica bem definidos, prevenindo tanto a paralisia por excesso de amplitude quanto a perda de contexto.

Um Item de Trabalho pode realizar:

* modelagem e migração de persistência/esquemas de dados;
* contratos, interfaces, serviços de domínio e regras de negócio internas;
* adaptadores de entrada (APIs, endpoints, controladores, interfaces de usuário);
* adaptadores de saída e clientes de comunicação externa;
* testes automatizados proporcionais (unidade, integração de persistência, contrato); ou
* scripts e configurações de infraestrutura local de execução.

Essas categorias explicam as naturezas técnicas possíveis de trabalho, mas não constituem tipos rígidos ou burocráticos de entidade.

## Posição na hierarquia

O Item de Trabalho ocupa a camada operacional de realização posterior à Entrega de Valor:

```text
Necessidade
→ Projeto
→ Módulo
→ Entrega de Valor
→ Item de Trabalho
```

Nesta cadeia, o Item de Trabalho pertence a exatamente uma Entrega de Valor. Uma Entrega de Valor pode conter um ou mais Itens de Trabalho relacionados. A rastreabilidade com o Módulo, o Projeto, a Necessidade e seus respectivos compromissos e especificações é preservada por essa cadeia de proveniência; o Item de Trabalho não contradiz nem redefine esses níveis superiores.

## Relação com a Entrega de Valor

Entrega de Valor e Item de Trabalho possuem fronteiras e naturezas distintas:

```text
Entrega de Valor
→ evolução finita, utilizável e perceptível pelo usuário de parte da capacidade do Módulo
→ orientada a valor de negócio e experiência do usuário
→ conclui-se por verificação substantiva do software integrado

Item de Trabalho
→ unidade finita de realização técnica subordinada à Entrega de Valor
→ orientada à construção e teste de partes específicas da solução de software
→ conclui-se por execução técnica e testes automatizados locais satisfatórios
```

Um Item de Trabalho nunca existe sem uma Entrega de Valor de origem. A conclusão de um Item de Trabalho não significa que a Entrega de Valor esteja concluída; significa apenas que aquela parcela técnica foi executada e está pronta para a integração.

## Cardinalidade e Decomposição

A cardinalidade entre Entrega de Valor e Item de Trabalho é de um para muitos (`1 : 1..N`):

* Uma Entrega de Valor pode exigir apenas **um único Item de Trabalho**, quando a evolução técnica for compacta, atômica e coesa, podendo ser realizada integralmente em um único ciclo contínuo de desenvolvimento.
* Uma Entrega de Valor pode ser decomposta em **múltiplos Itens de Trabalho**, quando a solução envolver passos de construção técnica que possuam dependência sequencial, separação de fronteiras tecnológicas ou necessidade de isolamento técnico para execução segura.

A decomposição deve ser guiada por coesão técnica e dependências lógicas, evitando tanto a fragmentação artificial em tarefas infinitesimais quanto a criação de itens gigantescos e incontroláveis.

## Decisões Técnicas: Alto Nível versus Locais

A fronteira de decisões é estritamente demarcada:

* **Decisões técnicas de alto nível** (arquitetura, padrão de arquitetura, linguagem, banco de dados principal, baseline técnica, contratos externos entre Módulos, requisitos globais de segurança e limites de fronteira) pertencem à **Formação da Entrega de Valor** (ou são herdadas do Módulo e do Projeto). O Item de Trabalho as recebe como premissas consolidadas e não as rediscute nem as altera silenciosamente.
* **Decisões técnicas locais de implementação** (nomes internos de métodos, classes internas, organização de pacotes de implementação, algoritmos específicos, escolha de estruturas de dados locais, formulação dos testes unitários) pertencem ao **Item de Trabalho** e são tomadas legitimamente pelo Ator executor da implementação.
* Se durante a execução do Item de Trabalho for descoberta uma inviabilidade, contradição ou necessidade de alterar a arquitetura, contratos de fronteira ou o comportamento esperado de negócio, a execução é interrompida e a questão é devolvida para a camada competente (Formação da Entrega de Valor ou superior). O Item de Trabalho não tem autoridade para absorver silenciosamente tais mudanças.

## O que um Item de Trabalho NÃO é

Item de Trabalho não é:

* Entrega de Valor, Módulo, Projeto ou Necessidade;
* evolução autônoma de valor para o usuário final;
* justificativa para rediscutir arquitetura de alto nível;
* apenas um commit ou uma linha de diff no Git;
* substituto da verificação integrada da Entrega de Valor; ou
* encerramento definitivo de demanda sem integração.

## Teste Conceitual

A pergunta orientadora para validar a legitimidade de um Item de Trabalho é:

> Este trabalho representa uma unidade técnica clara e necessária para viabilizar a evolução prometida pela Especificação da Entrega de Valor, com escopo e critério de término técnico verificáveis, sem tentar redefinir o negócio ou a arquitetura de alto nível?

Se a resposta for afirmativa, trata-se de um Item de Trabalho legítimo.

## Fronteiras Normativas

Esta definição formaliza o conceito e a finalidade do Item de Trabalho. Modelo, campos, estrutura documental, Atores, planejamento/decomposição, ciclo de vida, status e Resultados do Processo são detalhados nos documentos subsequentes desta vertical.
