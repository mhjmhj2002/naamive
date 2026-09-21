# P-001 — Jornada Autônoma do NAAMIVE

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `5575efa1-c68e-464f-8393-07be8c9bc93a` |
| Código | `P-001` |
| Nome inicial | Jornada Autônoma do NAAMIVE |
| Necessidade de origem | [N-001 — NAAMIVE](../../necessidades/N-001/necessidade.md) |
| Status | `FORMADO` |

O nome inicial foi proposto pelo Especialista em Formação do Projeto e permanece editável pelo Owner. Ele não altera o identificador técnico, o código nem o vínculo 1:1 com a Necessidade de origem.

## Bootstrap

O bootstrap foi iniciado pela decisão humana `APROVADO` já registrada na N-001. Antes da materialização, a coleção `dados/` continha somente `dados/necessidades/N-001/necessidade.md`; portanto, não havia Projeto correspondente nem outro código de Projeto materializado.

Foi criado exatamente este Projeto, vinculado exclusivamente à N-001, já no status `EM_FORMACAO`. Após essa materialização, a N-001 foi atualizada para `EM_PROJETO`.

`P-001` segue a convenção conceitual de códigos apresentada no modelo de Projeto e a inexistência de Projetos anteriores. O mecanismo normativo permanente para gerar códigos ainda não está definido.

## Evidências consultadas

| Identificador | Evidência | Uso na formação |
| --- | --- | --- |
| E-001 | [N-001](../../necessidades/N-001/necessidade.md) | Compromisso, resultado pretendido, escopo, fora de escopo, critérios, restrições e decisão `APROVADO`. |
| E-002 | Documentação normativa de Necessidade e Projeto em `documentacao/` | Fronteiras, Atores, ciclo de vida, status e processo de formação. |
| E-003 | Inventário atual do repositório | Evidencia uma base documental e de dados, sem artefato de produto executável ou instância de Projeto anterior. |

## ENQUADRAMENTO

### Compromisso recebido

**Conhecido.** A N-001 compromete o NAAMIVE a permitir que uma pessoa ou equipe conduza uma necessidade de negócio até software verificável com estado atual, próximo trabalho válido, competência e executor adequados, contexto preservado e decisões humanas solicitadas somente quando necessárias. O teste central é permitir delegar trabalho declarado pronto por uma instrução simples, sem reconstrução manual do contexto.

**Conhecido.** A primeira jornada inclui registro e formação de Necessidade, avaliação de sua qualidade, compromisso humano, criação de Projeto, condução de trabalho executável, atribuição por competência, preservação de contexto, decisões humanas, acompanhamento e rastreabilidade até o resultado. Não inclui substituir todas as ferramentas, escala ilimitada, todas as integrações ou todos os cenários organizacionais.

### O que o Projeto precisa realizar

**Inferido a partir de E-001.** O Projeto precisa transformar o compromisso em uma primeira jornada utilizável do NAAMIVE, na qual as informações necessárias ao avanço legítimo do trabalho sejam preservadas e recuperáveis, sem depender de coordenação humana contínua.

Isso requer uma direção que mantenha separadas a posição atual no ciclo, os Resultados do Processo, as decisões humanas e as evidências de contexto, pois essa separação é uma restrição explícita da N-001 e da documentação normativa atual.

### Fronteiras do Projeto

**Conhecido.** O Projeto preserva integralmente o compromisso da N-001; não altera seu problema, resultado, escopo, critério de atendimento ou restrições.

**Conhecido.** A formação do próprio Projeto termina no handoff para Auditor do Projeto. Nesta formação não foi criada, identificada, decomposta ou materializada entidade descendente, nem foi definido ciclo, status ou realização dessa camada futura.

**Proposto.** A primeira jornada deve priorizar demonstrar o critério de atendimento da N-001 com uma necessidade real, limitada e rastreável, antes de ampliar cobertura de integrações, escala ou cenários organizacionais.

### Lacunas tratadas no enquadramento

| Lacuna | Tratamento | Situação |
| --- | --- | --- |
| Nome inicial do Projeto | Proposto autonomamente como “Jornada Autônoma do NAAMIVE”. | Resolvida para o bootstrap; editável pelo Owner. |
| Código aplicável | Investigado o estado real de `dados/`; não havia Projeto anterior. | Resolvida para esta instância como `P-001`; a regra permanente permanece desconhecida. |
| Como realizar a jornada após a formação | Delimitada como continuação operacional ainda não definida pela vertical Projeto. | Não bloqueia a formação; permanece como lacuna de processo. |

## DESCOBERTA

### Contexto compreendido

| Tema | Classificação | Evidência e conclusão |
| --- | --- | --- |
| Estado atual do produto | Conhecido | E-003 mostra somente documentação normativa, Skills e a instância N-001; não há artefato executável do NAAMIVE nesta base. |
| Fluxo já materializado | Conhecido | A N-001 foi formada, qualificada e recebeu `APROVADO`; a vertical Projeto define o bootstrap 1:1 e a formação até auditoria. |
| Decisões humanas | Conhecido | O Owner, exercido pelo usuário autenticado, toma decisões humanas materiais; agentes não as substituem. |
| Especialização dos agentes | Conhecido | Cada Ator agêntico tem responsabilidade e Skill própria; a formação não acumula auditoria. |
| Persistência e orquestração técnicas | Desconhecido | A documentação não define tecnologia, banco de dados, mecanismo físico de unicidade, disparo de eventos ou seleção concreta de executores. |

### Restrições e dependências relevantes

| Item | Classificação | Implicação |
| --- | --- | --- |
| Decisões materiais exigem o Owner | Conhecido | A solução deve tornar pendências e decisões explicitáveis, sem automatizá-las como decisões de agente. |
| Trabalho deve respeitar competência | Conhecido | O contexto de cada avanço precisa indicar a responsabilidade especializada necessária. |
| Estado atual e histórico são distintos | Conhecido | A solução não deve confundir a posição vigente com o registro de decisões, resultados e evidências anteriores. |
| Rastreabilidade proporcional | Conhecido | As relações e evidências precisam ser suficientes para explicar o avanço, sem burocracia desproporcional. |
| Escala, concorrência e integrações | Conhecido como limitação inicial | A primeira direção não as trata como requisito de completude. |
| Camada operacional posterior à auditoria | Desconhecido | Não há processo normativo que defina como o Projeto prossegue após eventual aprovação da formação. |

### Riscos

| Risco | Classificação | Tratamento na direção |
| --- | --- | --- |
| Tratar suposições técnicas como fatos | Conhecido a partir da regra contra invenção | Manter tecnologia, persistência e orquestração física como desconhecidas até haver evidência ou decisão adequada. |
| Confundir etapas, status, resultados e decisões | Conhecido | Preservar os catálogos e relações normativas separados. |
| Perder contexto entre Atores | Inferido a partir do problema da N-001 | Registrar vínculo de origem, evidências, lacunas e handoffs de forma rastreável. |
| Avançar para trabalho descendente sem vertical definida | Conhecido | Manter a fronteira do Projeto; nenhuma entidade descendente foi criada nesta formação. |
| Não conseguir demonstrar a jornada de ponta a ponta | Inferido | Priorizar uma primeira jornada verificável e limitada, em vez de cobertura ampla não validável. |

### Verificação da descoberta

As lacunas investigáveis no repositório foram verificadas: há documentação e dados da N-001, sem código de produto, sem Projeto anterior e sem definição da continuação operacional posterior à auditoria. As lacunas restantes estão explicitamente classificadas e não exigem decisão humana para entregar a formação à auditoria.

## DIREÇÃO DA SOLUÇÃO

### Direção proposta

**Proposto.** Orientar a primeira jornada do NAAMIVE como um fluxo rastreável centrado em entidades e transições explícitas: uma Necessidade preserva seu compromisso; um Projeto 1:1 recebe esse compromisso; cada avanço identifica o Ator especializado, a Skill e o contexto necessário; resultados, decisões humanas e status permanecem distintos; e a evidência final pode ser relacionada à Necessidade de origem.

Essa direção atende ao núcleo do compromisso sem escolher prematuramente tecnologia, arquitetura, mecanismo de persistência, integração, interface ou desenho de entidades de uma camada futura. Tais escolhas continuam desconhecidas e deverão ser sustentadas por evidências ou decisão humana quando se tornarem materiais.

### Decisões e propostas vigentes

| Item | Classificação | Registro |
| --- | --- | --- |
| Vínculo de origem | Conhecido | P-001 referencia exclusivamente N-001, que permanece fonte de verdade do compromisso. |
| Status atual | Conhecido | P-001 está em `FORMADO`; as etapas de formação e o handoff não são status. |
| Nome inicial | Proposto | “Jornada Autônoma do NAAMIVE”; pode ser alterado pelo Owner sem alterar a identidade do Projeto. |
| Direção de primeira jornada | Proposto | Fluxo rastreável, orientado por estado, evidência, especialização e decisões humanas explícitas. |
| Detalhamento técnico | Desconhecido | Não foi escolhido por falta de evidência e por não ser necessário para a formação atual. |
| Continuação após aprovação da formação | Desconhecido | A vertical Projeto deliberadamente não a define. |

### Critérios para orientar a realização futura

**Proposto.** Quando houver camada operacional definida, ela deve permitir demonstrar, para uma necessidade limitada, os itens observáveis do critério de atendimento da N-001: posição atual, próximo trabalho válido, competência, executor adequado, contexto suficiente, decisão humana pendente quando aplicável, separação entre estado e histórico e rastreabilidade ao resultado.

**Conhecido.** Esse direcionamento não constitui transição de status, Resultado do Processo, auditoria, verificação agregada ou definição de entidade descendente.

## Handoff para Auditor do Projeto

O Especialista em Formação do Projeto encerra sua responsabilidade com a entrega deste material ao **Auditor do Projeto**.

**Skill a carregar pelo próximo Ator:** `.agents/skills/projeto/auditoria-do-projeto/SKILL.md`.

O Auditor deve avaliar independentemente a coerência, a sustentação e a suficiência desta formação, incluindo as propostas e incógnitas registradas. Até a produção de um Resultado do Processo de auditoria, P-001 permanece em `EM_FORMACAO`.

## Resultado do Processo — Auditoria independente

| Campo | Registro |
| --- | --- |
| Ator | Auditor do Projeto |
| Resultado do Processo | `FORMACAO_SUFICIENTE` |
| Status do Projeto após a auditoria | `FORMADO` |

### Parecer independente

A formação é aprovada. O enquadramento identifica o compromisso recebido da N-001, o que o Projeto precisa realizar e suas fronteiras, mantendo a Necessidade como fonte de verdade. A descoberta apresenta evidências consultadas, contexto, restrições, dependências e riscos relevantes; as limitações técnicas e a continuação operacional posterior à formação são explicitamente tratadas como desconhecidas, e não como fatos.

A direção de solução é proposta de modo proporcional e rastreável: preserva a separação entre status, Resultados do Processo, decisões humanas e evidências, sem antecipar arquitetura, implementação, entidades descendentes ou trabalho de realização. As afirmações materiais estão classificadas como conhecidas, inferidas, propostas ou desconhecidas e mantêm vínculo identificável com as evidências registradas.

Não foi encontrada lacuna concreta pertencente à formação do Projeto que impeça sua aprovação. A ausência de camada operacional posterior, de entidade descendente e de detalhamento técnico não impede este resultado, pois esses elementos estão fora da responsabilidade atualmente definida para a formação do Projeto.

### Handoff da auditoria

A formação do P-001 está aprovada e o Projeto está em `FORMADO`; a Direção do Projeto está disponível para o **Especialista em Delimitação de Módulos**, conforme `.agents/skills/modulo/delimitacao-de-modulos/SKILL.md`. Esse Ator é o próximo elegível, mas não é executado neste registro; nenhuma instância de Módulo foi criada.

## Direção do Projeto

Representação consolidada da formação aprovada por `FORMACAO_SUFICIENTE`. Não substitui este registro completo, suas evidências, estado, processo ou Resultado do Processo; tampouco define a realização técnica ou entidades de vertical posterior.

| Elemento | Direção consolidada |
| --- | --- |
| Compromisso recebido | **Conhecido.** O Compromisso da N-001 requer uma primeira jornada utilizável que conduza uma necessidade de negócio até software verificável, com estado, próximo trabalho válido, competência, executor, contexto, decisões humanas e rastreabilidade preservados. Seu escopo e limites continuam definidos pela N-001, fonte de verdade. |
| Objetivo do Projeto | **Inferido de E-001.** Transformar esse compromisso em uma primeira jornada utilizável do NAAMIVE, na qual as informações necessárias ao avanço legítimo permaneçam preservadas e recuperáveis sem coordenação humana contínua. |
| Fronteiras | **Conhecido.** Preservar integralmente o compromisso da N-001; não redefinir seus elementos materiais; não criar ou definir entidades descendentes, ciclo futuro ou itens de realização; e não antecipar arquitetura, tecnologia, persistência, integrações, interface ou implementação detalhada. |
| Contexto relevante | **Conhecido.** O repositório contém documentação normativa, Skills e a N-001, sem artefato executável do produto ou Projeto anterior. A N-001 já foi formada, qualificada e aprovada; decisões materiais pertencem ao Owner e os Atores agênticos permanecem especializados. |
| Restrições e dependências | **Conhecido.** Decisões humanas devem ser explicitáveis; trabalho respeita competência; estado, Resultados do Processo, decisões e evidências permanecem distintos; rastreabilidade é proporcional. Escala, concorrência e integrações são limitações iniciais. **Conhecido.** A Direção do Projeto pode ser consumida pela vertical Módulo; a continuação operacional após a Especificação Técnica do Módulo permanece desconhecida. |
| Riscos relevantes | **Conhecido e inferido.** Evitar tratar suposições técnicas como fatos, confundir etapas com status, resultados ou decisões, perder contexto entre Atores, avançar para trabalho descendente sem vertical definida e não demonstrar uma jornada limitada de ponta a ponta. |
| Direção geral proposta | **Proposto.** Orientar a primeira jornada como fluxo rastreável centrado em entidades e transições explícitas: a Necessidade preserva seu compromisso; o Projeto 1:1 o recebe; cada avanço identifica Ator especializado, Skill e contexto; status, Resultados do Processo, decisões humanas e evidências ficam separados; e a evidência final permanece relacionada à Necessidade de origem. |
| Conhecidos | Compromisso e vínculo 1:1 com N-001; status `FORMADO`; fronteiras normativas; evidências E-001 a E-003; e responsabilidades humanas e agênticas separadas. |
| Inferidos | A necessidade de preservar e recuperar informações para permitir avanço legítimo sem coordenação contínua; o risco de perda de contexto; e a prioridade por uma jornada verificável e limitada. |
| Propostos | O nome “Jornada Autônoma do NAAMIVE” e a direção de primeira jornada rastreável, orientada por estado, evidência, especialização e decisões humanas explícitas. |
| Desconhecidos relevantes | Tecnologia, persistência, orquestração, seleção concreta de executores, detalhamento técnico e a camada operacional posterior à Especificação Técnica do Módulo. |

Este artefato está disponível para consumo pela vertical Módulo porque o Auditor do Projeto produziu `FORMACAO_SUFICIENTE` e o Projeto transicionou para `FORMADO`. A Direção foi consumida pelo Especialista em Delimitação de Módulos, que materializou o Mapa de Módulos e os cinco Módulos iniciais. Esse consumo não altera as responsabilidades do Projeto nem seu status `FORMADO`.

## Mapa de Módulos do Projeto

O Mapa de Módulos canônico deste Projeto existe em [`dados/projetos/P-001/mapa-de-modulos.md`](mapa-de-modulos.md). Esta referência factual não altera o status, a Direção, o Resultado do Processo, o vínculo com a N-001 nem a responsabilidade do Projeto.
