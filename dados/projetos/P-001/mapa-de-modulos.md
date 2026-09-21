# Mapa de Módulos do Projeto — P-001

## Referência e escopo da delimitação

Este é o registro canônico da delimitação do conjunto de Módulos do `P-001 — Jornada Autônoma do NAAMIVE`. Foi elaborado pelo Especialista em Delimitação de Módulos a partir da [Direção do Projeto](projeto.md#direção-do-projeto), aprovada por `FORMACAO_SUFICIENTE`, e das evidências de origem nela referenciadas: a [N-001](../../necessidades/N-001/necessidade.md), a documentação normativa e o inventário do repositório.

**Conhecido.** O Projeto está em `FORMADO`; sua Direção requer uma primeira jornada utilizável, rastreável e orientada por estado, evidências, especialização e decisões humanas explícitas.

**Inferido da Direção e do compromisso da N-001.** Para realizar a jornada são necessárias capacidades distintas para conduzir a Necessidade, formar o Projeto, coordenar o trabalho, preservar seu contexto e rastreabilidade e verificar o resultado de software.

**Proposto.** As fronteiras abaixo são iniciais e deverão ser refinadas tecnicamente durante a formação de cada Módulo, sem redefinir silenciosamente este conjunto.

## Capacidades candidatas e decisão de delimitação

| Capacidade candidata | Decisão | Justificativa |
| --- | --- | --- |
| Registrar, formar, avaliar, qualificar e obter compromisso humano sobre uma Necessidade | Incluir como `M-001` | Forma uma capacidade de negócio completa: transformar uma demanda em compromisso válido, preservando a autoridade do Owner. |
| Criar o vínculo 1:1, formar e aprovar a Direção de um Projeto | Incluir como `M-002` | É a capacidade que transforma o compromisso em Direção aprovada, sem absorver a condução de trabalho posterior. |
| Decompor trabalho, determinar o próximo avanço válido, indicar competência, selecionar executor e acompanhar seu fluxo | Incluir como `M-003` | Essas ações respondem conjuntamente por conduzir trabalho preparado; separá-las fragmentaria a mesma capacidade de coordenação. |
| Preservar e recuperar contexto, evidências, decisões, Resultados do Processo e rastreabilidade de origem | Incluir como `M-004` | A capacidade atende à preservação e recuperação de contexto sem confundir o registro histórico com a coordenação do fluxo. |
| Verificar que o resultado de software é observável e relacioná-lo à Necessidade de origem | Incluir como `M-005` | A verificação de resultado é uma capacidade distinta da execução e torna atendível o critério final da N-001. |
| Interface, API, persistência, integrações, banco de dados, orquestração física ou outros componentes tecnológicos | Não incluir como Módulos próprios | São desconhecidos ou meios técnicos; não constituem, por si, capacidade de negócio coesa e deverão ser tratados proporcionalmente na formação dos Módulos pertinentes. |

## Conjunto delimitado

### M-001 — Condução da Necessidade

* **Capacidade:** conduzir uma demanda desde seu registro até o compromisso humano explícito e disponível ao Projeto.
* **Fronteira inicial:** inclui registro, formação, avaliação, qualificação, recomendação e apresentação de decisão material ao Owner. Exclui criar ou formar o Projeto, coordenar trabalho posterior e verificar o resultado de software.
* **Valor habilitado:** uma Necessidade clara, qualificada e comprometida sem automatizar decisão humana material.
* **Justificativa:** concentra o ciclo de compreensão e compromisso da demanda, que tem responsabilidade e valor próprios antes da existência do Projeto.

### M-002 — Formação do Projeto

* **Capacidade:** constituir o Projeto vinculado exclusivamente à Necessidade comprometida e produzir sua Direção aprovada.
* **Fronteira inicial:** inclui o vínculo 1:1, a formação, a auditoria independente da formação e a disponibilização da Direção. Exclui qualificar a Necessidade, delimitar ou formar Módulos, coordenar a execução posterior e verificar o resultado final.
* **Valor habilitado:** uma Direção de Projeto rastreável e apta a orientar as capacidades descendentes.
* **Justificativa:** é a passagem coesa entre compromisso e Direção; não deve absorver a realização do trabalho que a Direção apenas orienta.

### M-003 — Coordenação do Trabalho

* **Capacidade:** conduzir trabalho preparado por meio de decomposição, próximo avanço válido, competência necessária, seleção de executor, handoff e acompanhamento.
* **Fronteira inicial:** inclui a coordenação do fluxo de trabalho e a explicitação de pendências de decisão durante esse fluxo. Exclui decidir materialmente pelo Owner, ser a fonte de verdade de evidências e histórico, formar Necessidade ou Projeto e atestar o resultado final.
* **Valor habilitado:** trabalho avança legitimamente sem depender de coordenação humana contínua para reconstruir o próximo passo.
* **Justificativa:** os elementos são inseparáveis para responder qual trabalho pode avançar, por quem e com que contexto; separá-los por etapa ou por tecnologia criaria fragmentação artificial.

### M-004 — Contexto e Rastreabilidade

* **Capacidade:** preservar e recuperar o contexto proporcional do percurso, incluindo evidências, decisões, Resultados do Processo e vínculos de origem.
* **Fronteira inicial:** inclui a rastreabilidade entre Necessidade, Projeto, trabalho e resultado, bem como a recuperação de contexto suficiente. Exclui determinar o próximo trabalho, escolher executor, tomar decisão humana e realizar a verificação substantiva do resultado.
* **Valor habilitado:** contexto recuperável para que o executor adequado atue sem reconstrução manual extensa e para que o percurso seja explicável.
* **Justificativa:** a Direção exige separação entre posição atual, histórico, decisões, resultados e evidências; esta capacidade preserva a informação e suas relações sem tomar a coordenação do fluxo.

### M-005 — Verificação do Resultado de Software

* **Capacidade:** demonstrar que o resultado de software da jornada limitada é verificável e relacioná-lo à Necessidade de origem.
* **Fronteira inicial:** inclui definir e registrar evidência proporcional de verificabilidade e o vínculo do resultado com a N-001. Exclui implementar software, conduzir o trabalho de realização, aprovar a formação de outras entidades e substituir a preservação geral de contexto.
* **Valor habilitado:** evidência de que a primeira jornada atingiu um resultado de software verificável, conforme o critério de atendimento da N-001.
* **Justificativa:** o critério de atendimento exige mais que o acompanhamento do fluxo; requer uma capacidade explícita de verificar o resultado, ainda que seus mecanismos permaneçam a definir em vertical posterior.

## Relações, dependências, sobreposições e cobertura

| Relação | Situação | Tratamento de fronteira |
| --- | --- | --- |
| `M-001` → `M-002` | Dependência sequencial | O compromisso humano disponibilizado por M-001 é a entrada de M-002. M-002 não requalifica a Necessidade. |
| `M-002` → `M-003`, `M-004` e `M-005` | Dependência de direção | A Direção aprovada orienta as três capacidades posteriores; elas não alteram a Direção. |
| `M-003` ↔ `M-004` | Dependência mútua de capacidade | M-003 solicita e produz contexto do fluxo; M-004 preserva e recupera esse contexto. M-003 decide o próximo avanço, enquanto M-004 não o decide. |
| `M-003` → `M-005` | Dependência de percurso | M-005 recebe o estado e a evidência de que há resultado a verificar; não gerencia a execução que o produziu. |
| `M-004` → `M-005` | Dependência de rastreabilidade | M-005 associa a verificação ao percurso de origem; M-004 preserva a relação sem concluir a verificação. |

Não foi identificada sobreposição material entre os cinco Módulos. A distinção principal entre `M-003` e `M-004` é deliberada: o primeiro coordena o avanço; o segundo conserva e recupera o contexto que torna esse avanço explicável. A cobertura do conjunto alcança os elementos da Direção e do critério de atendimento da N-001: compromisso, Direção, trabalho válido, competência e executor, contexto, decisões explícitas, separação entre estado e histórico, resultado verificável e rastreabilidade.

## Granularidade e heurística 10 / 15 / 20

Foram delimitados **5 Módulos**. A quantidade é inferior à referência central aproximada de 10, sem qualquer exigência de aproximação a esse número. Não alcança o limiar de atenção de 15 nem o de revisão estrutural forte de 20.

A análise não indica agregação excessiva: cada Módulo possui capacidade, fronteira e valor habilitado próprios. Também não há divisão por camadas tecnológicas, por futura Entrega de Valor ou por etapas internas isoladas. A granularidade deverá ser revisada caso a formação revele fronteira estrutural inadequada, conforme o ciclo normativo.

## Lacunas, decisões materiais e retornos estruturais

| Item | Classificação | Tratamento |
| --- | --- | --- |
| Tecnologia, persistência, orquestração física, integrações e seleção concreta de executores | Desconhecido | Não são essenciais para definir as cinco fronteiras por capacidade. Permanecem para investigação proporcional durante a formação. |
| Continuação operacional após a Especificação Técnica do Módulo | Desconhecido | Não bloqueia a delimitação; está fora da fronteira desta atividade e será tratada quando a vertical posterior existir. |
| Critério operacional concreto para verificar o resultado de software | Desconhecido | A necessidade de verificação é conhecida; seus métodos serão formados no M-005 sem antecipar Entrega de Valor, Item de Trabalho ou implementação. |
| Decisão humana material indispensável à delimitação | Conhecido | Não identificada após consulta às evidências disponíveis; nenhuma decisão do Owner é requerida para materializar o conjunto inicial. |
| Retorno estrutural de delimitação | Conhecido | Não existe neste primeiro ciclo. |
