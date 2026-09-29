# Modelo de Entrega de Valor

## Finalidade

Este documento define as informações e relações que tornam uma Entrega de Valor uma entidade identificável, coerente e rastreável, capaz de receber formação posterior suficiente para sua decomposição em trabalho executável.

O modelo preserva a Entrega de Valor como a ponte principal entre a intenção de produto e a realização técnica. Ele não define como a entidade é criada, formada, auditada, realizada, verificada, homologada ou encerrada.

## Estrutura conceitual

```text
Entrega de Valor
├── identificador técnico
├── código
├── nome
├── Módulo de origem
├── intenção principal de valor
├── beneficiário relevante
├── resultado observável esperado
├── fronteira
├── relações e dependências relevantes
└── conteúdo progressivamente formado
```

Essa estrutura não é formulário, esquema de persistência nem definição de que todos os elementos estejam completos no primeiro registro da entidade.

## Identidade própria

Toda Entrega de Valor possui identidade própria e estável, composta conceitualmente por:

* **identificador técnico:** referência estável que identifica inequivocamente a entidade;
* **código:** referência legível para comunicação humana; e
* **nome:** identificação humana curta da evolução de valor.

Esses elementos têm papéis distintos:

```text
identificador técnico
→ identidade estável da Entrega de Valor

código
→ referência humana legível

nome
→ comunicação breve da evolução pretendida
```

O nome pode ser refinado sem alterar o identificador técnico, o código ou o Módulo de origem. Um código como `EV-001` é apenas exemplo conceitual; este modelo não define formato de identificador, geração de código, sequência, persistência, concorrência, reutilização ou regra operacional de materialização.

## Vínculo estrutural com o Módulo

Uma Entrega de Valor pertence a exatamente um Módulo. Um Módulo pode possuir uma ou mais Entregas de Valor.

```text
1 Módulo
→ possui
→ N Entregas de Valor

1 Entrega de Valor
→ pertence a
→ exatamente 1 Módulo
```

O Módulo é fonte estrutural da capacidade coesa que a Entrega de Valor materializa parcialmente. A Entrega de Valor não redefine essa capacidade nem contradiz silenciosamente sua fronteira; ela a aprofunda no necessário para tornar concreta uma evolução finita.

Uma Entrega de Valor pode depender de capacidades, contratos ou resultados associados a outros Módulos. Essa dependência não torna a entidade multi-Módulo nem altera seu Módulo proprietário. Se uma evolução exigir mudar estruturalmente a capacidade ou a fronteira do Módulo, esse fato deve permanecer explícito e requer tratamento estrutural posterior, não ser absorvido como detalhe silencioso da Entrega de Valor.

## Origem e rastreabilidade

A cadeia estrutural de origem é:

```text
Entrega de Valor
→ Módulo
→ Projeto
→ Necessidade
```

Por ela, também são recuperáveis a Especificação Técnica do Módulo, a Direção do Projeto e o Compromisso da Necessidade. O Módulo é a referência estrutural direta da Entrega de Valor; Projeto e Necessidade não devem ser copiados como fontes concorrentes quando puderem ser recuperados por essa cadeia.

Referências derivadas ou convenientes podem existir para facilitar a recuperação proporcional de contexto, desde que não substituam as entidades de origem como fontes de verdade.

## Nome e intenção principal de valor

O nome é curto e comunica a evolução de modo legível, por exemplo, “Delegação de trabalho preparado”. Ele não carrega sozinho a especificação de negócio ou solução.

Toda Entrega de Valor possui uma **declaração de valor**, que responde: “Qual evolução do software queremos tornar verdadeira para o usuário?”. Ela é orientada ao resultado utilizável e perceptível, distinta do nome, da descrição técnica, de tarefas, de critérios detalhados ou de Resultados do Processo.

Exemplo conceitual:

> O usuário consegue delegar um trabalho preparado a um executor adequado sem reconstruir manualmente o contexto necessário.

Toda Entrega de Valor possui uma intenção principal de valor coesa. Ela pode envolver vários comportamentos, pontos da solução, Fluxos e alterações técnicas, desde que continue explicável como uma única evolução coerente para o beneficiário. Evoluções independentes, utilizáveis e perceptíveis separadamente são sinal de possível decomposição em mais de uma Entrega de Valor.

## Beneficiário e resultado observável esperado

Toda Entrega de Valor identifica o beneficiário relevante — a pessoa ou participante que efetivamente utiliza ou percebe a evolução. Conforme o contexto, pode ser usuário final, operador, desenvolvedor, responsável de negócio, Owner ou outro participante. O modelo não cria Persona, catálogo de usuários, perfil, RBAC ou nova vertical de Usuário.

Não existe Entrega de Valor sem alguém capaz de perceber ou utilizar a evolução. O beneficiário não precisa ser necessariamente cliente externo.

A entidade também registra o **resultado observável esperado**, isto é, o que poderá ser observado no software quando a evolução existir. Ele torna a intenção concreta e prepara a formação e a verificação posteriores, mas não é critério detalhado de homologação, evidência, conclusão, status ou Resultado do Processo.

```text
declaração de valor
→ o que muda para o beneficiário

resultado observável esperado
→ o que se espera observar no software quando a mudança existir
```

Por exemplo, para a declaração de valor sobre delegar trabalho preparado, um resultado observável poderia ser: “Dado um trabalho preparado, o usuário consegue iniciar sua delegação e acompanhar um retorno relacionado ao contexto correto.”

## Fronteira e finitude

A Entrega de Valor registra explicitamente:

* o que pretende tornar verdadeiro;
* o que está incluído na evolução; e
* o que está fora dela.

A fronteira sustenta sua finitude e impede que ela represente todo o Módulo, toda a Jornada, todo o Projeto, uma área funcional indefinida ou agrupamento permanente de evolução. A fronteira pode ser refinada durante a formação, sem que todo refinamento altere automaticamente a identidade da Entrega de Valor.

Uma alteração que transforme completamente sua intenção principal de valor pode demandar tratamento estrutural posterior. Este modelo não define substituição, cancelamento ou qualquer regra de ciclo para esse caso.

## Coesão e granularidade

Uma Entrega de Valor deve ser suficientemente coesa para ser demonstrada e percebida como uma entrega de evolução de software.

São sinais de possível amplitude excessiva:

* várias intenções independentes de valor;
* partes que podem ser utilizadas e percebidas separadamente; ou
* fronteira equivalente ao Módulo inteiro sem necessidade evidente.

São sinais de possível fragmentação excessiva:

* cada camada técnica convertida em Entrega de Valor;
* cada endpoint, tabela ou componente técnico tratado como evolução de valor; ou
* partes isoladas sem resultado utilizável pelo beneficiário.

Esses sinais são heurísticos conceituais, sem limite numérico ou algoritmo de decomposição.

## Jornada, Fluxo e contexto de experiência

Jornada e Fluxo permanecem conceitos relacionados, não entidades formais desta vertical. A Entrega de Valor pode registrar descritivamente, quando conhecidos, Jornadas relevantes, Fluxos impactados e contexto de experiência do usuário.

Uma Entrega de Valor pode contribuir para uma ou mais Jornadas e manifestar-se em um ou mais Fluxos. Uma Jornada pode atravessar diversos Módulos. Fluxo descreve comportamento ou experiência, não unidade de execução.

Este modelo não cria identificadores, diretórios, status, ciclos ou cardinalidades definitivas para Jornada ou Fluxo.

## Dependências, relações e restrições

A Entrega de Valor pode registrar dependências e interações materiais para sua realização, como outra capacidade disponível, contrato de outro Módulo, infraestrutura existente, decisão superior ou evolução anterior necessária.

Dependência não se confunde com propriedade:

```text
propriedade
→ a Entrega de Valor pertence a um único Módulo

dependência
→ pode depender ou interagir com capacidades de outros Módulos
```

Ela também pode preservar restrições materiais derivadas do Módulo, Direção do Projeto, Compromisso da Necessidade, decisão arquitetural superior, negócio, segurança, tecnologia, integração ou ambiente. Não há checklist universal: uma restrição entra quando houver fundamento.

## Ponte entre produto e solução

A Entrega de Valor reúne dois lados complementares.

No lado de produto, o modelo comporta intenção de valor, beneficiário, evolução perceptível, resultado observável esperado, Jornadas ou Fluxos relacionados e fronteiras.

No lado de solução, o modelo comporta o recebimento progressivo de comportamento refinado, solução técnica de alto nível, decisões relevantes, contratos, dados ou estado relevantes, integrações, restrições, riscos, estratégia de verificação e informação suficiente para decomposição em trabalho executável.

Esses dois lados não se substituem: a solução deve servir à evolução de valor, e a intenção de valor deve orientar quais decisões de solução precisam ser explicitadas.

## Decisões técnicas e nível competente

Decisões técnicas de alto nível necessárias à realização pertencem à futura formação da Entrega de Valor ou são herdadas de contexto técnico superior já aprovado. Não devem ser sistematicamente redescobertas por cada futuro Work Item.

Podem ser relevantes, conforme a evolução concreta, decisões sobre persistência, modelo de dados, integração, contrato, protocolo, distribuição de responsabilidades, fronteira arquitetural, consistência, plataforma ou requisitos técnicos estruturais. Nenhuma delas é campo obrigatório por ritual.

Uma decisão deve ser tomada no nível mais baixo capaz de decidir legitimamente todo o seu impacto:

| Classe de decisão | Alcance e tratamento conceitual |
| --- | --- |
| Estrutural ou ampla | Afeta Projeto, vários Módulos, várias Entregas de Valor ou a arquitetura geral. Pode ser herdada de contexto superior e não deve ser reinventada isoladamente. |
| Técnica da Entrega de Valor | Afeta a realização daquela evolução e precisa estar resolvida antes dos trabalhos que dela dependem. Pertence à futura Formação da Entrega de Valor. |
| Local de implementação | Tem impacto restrito ao trabalho técnico local e não altera valor, comportamento esperado, contrato, arquitetura de alto nível, fronteira ou decisão superior. Pode ser tomada futuramente na execução. |

O modelo não define processo de escalonamento de decisão.

## Conteúdo progressivamente formado

O modelo distingue três conjuntos de informação:

| Conjunto | Informações | Papel |
| --- | --- | --- |
| Núcleo de identidade e origem | identificador técnico, código, nome e Módulo de origem | Reconhece a Entrega de Valor como entidade e preserva sua cadeia estrutural. |
| Intenção de valor | declaração de valor, beneficiário, resultado observável esperado, fronteira e, quando relevantes, Jornada e Fluxo | Explica por que a evolução existe e o que pretende tornar verdadeiro. |
| Conteúdo progressivamente formado | comportamento, solução técnica, decisões, contratos, dados ou estado, integrações, riscos, restrições, critérios verificáveis e dependências | É aprofundado proporcionalmente durante a futura Formação. |

Não se presume que o terceiro conjunto esteja completo no primeiro instante de existência da entidade. Quando materialmente relevante, a futura Especificação pode distinguir informação conhecida, inferida, proposta e desconhecida; essa classificação não é status.

## Futura Especificação da Entrega de Valor

A futura Formação pode consolidar a **Especificação da Entrega de Valor** como artefato de saída. Ela poderá reunir, proporcionalmente, intenção de valor, comportamento, fronteiras, solução técnica, decisões, contratos, riscos, critérios verificáveis e a informação necessária para decomposição.

Esse artefato não é nova entidade, status, Resultado do Processo ou aprovação. Este modelo não define quando ele é produzido, como é avaliado, quem o produz, que efeito provoca ou como é armazenado.

## Critérios verificáveis e verificação integrada futura

Uma Entrega de Valor formada pode conter critérios verificáveis ligados à evolução prometida. Eles permitem confrontar posteriormente intenção de valor, comportamento esperado e resultado integrado.

Critério verificável não se confunde com evidência, conclusão, homologação ou Resultado do Processo. O modelo não define catálogo, formato obrigatório, responsável, ambiente, automação ou mecanismo de homologação.

O Work Item deverá, futuramente, entregar sua parte em condição técnica adequada à integração. A avaliação de se o conjunto realizado produz a evolução prometida retorna ao nível integrado da Entrega de Valor. Esta fronteira não cria Ator, processo ou resultado de homologação.

## Fronteira com Work Item e Pull Request

Work Item (Item de Trabalho) é conceito futuro de execução técnica. A Entrega de Valor não é definida por seus Work Items, e este modelo não lhes atribui identidade, código, status, ciclo, Resultado, Ator, Executor, Skill, cardinalidade ou mecanismo de decomposição.

Quando a Entrega de Valor dispuser de formação suficiente, um Work Item deve receber negócio e solução técnica de alto nível já definidos no nível competente, além de contexto, restrições e critérios técnicos proporcionais. A execução pode tomar decisões locais de implementação, mas uma descoberta que altere negócio, contrato ou solução técnica de alto nível deve retornar ao nível competente; não pode ser absorvida silenciosamente pelo Work Item.

Pull Request pode relacionar-se à realização futura: uma Entrega de Valor pode resultar em vários Pull Requests, e um Pull Request pode conter trabalho relacionado a ela. Pull Request, branch, commit, ferramenta, pipeline e ambiente não pertencem ao núcleo identitário nem possuem relação estrutural um para um com a Entrega de Valor.

## O que não pertence ao modelo essencial

Não são atributos essenciais da Entrega de Valor prioridade, sprint, estimativa, pontos, previsão, percentual, responsável de desenvolvimento, branch, commit, Pull Request, ambiente, ferramenta, pipeline, ticket externo, banco ou linguagem específicos.

Também não são definidos neste documento Atores, Skills, Formação, Auditoria, Ciclo de Vida, Status, Resultados do Processo, transições, eventos, cancelamento, conclusão, instâncias, Work Items, tarefas, Pull Requests concretos, mecanismo de homologação ou tecnologia de implementação.

## Invariantes

1. Toda Entrega de Valor possui identidade própria, com identificador técnico, código e nome conceitualmente distintos.
2. Toda Entrega de Valor pertence a exatamente um Módulo.
3. Toda Entrega de Valor possui uma intenção principal de valor coesa.
4. Toda Entrega de Valor representa evolução utilizável e perceptível para algum beneficiário identificável.
5. Toda Entrega de Valor possui fronteira finita entre o que pretende tornar verdadeiro, o que inclui e o que exclui.
6. Dependência de capacidade de outro Módulo não altera o Módulo proprietário.
7. A Entrega de Valor não é definida por Work Items, Pull Requests ou outros artefatos técnicos de realização.
8. Decisões técnicas de alto nível necessárias à realização não devem ser sistematicamente delegadas aos futuros Work Items.
9. Conteúdo técnico pode ser formado progressivamente, sem que a identidade ou a origem sejam perdidas.
10. A realização de uma Entrega de Valor não implica automaticamente conclusão do Projeto nem atendimento da Necessidade.

## Questões deliberadamente posteriores

Permanecem para documentos posteriores a criação e a formação da entidade; Atores e Skills; auditoria; ciclo de vida; catálogo de status; Resultados do Processo; regras de transição; realização; decomposição; Work Item; homologação; verificação operacional; relação com planejamento; persistência; geração de códigos; tecnologia; e instâncias reais de Entrega de Valor.
