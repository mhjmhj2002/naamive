# P-001 — Jornada Inicial do NAAMIVE

## Identificação

| Elemento | Valor |
| --- | --- |
| Identificador técnico | `b4fbd5b9-7df7-45cf-a9ca-44c5e260a4f8` |
| Código | `P-001` |
| Nome inicial | Jornada Inicial do NAAMIVE |
| Necessidade de origem | `N-001 — NAAMIVE` |
| Status | `EM_FORMACAO` |

O identificador técnico identifica esta instância. O código é a referência operacional legível. O nome é uma proposta inicial editável pelo Owner e sua mudança não altera o identificador, o código nem o vínculo com a `N-001`.

## Bootstrap

O bootstrap foi executado pelo Especialista em Formação do Projeto após a confirmação das condições de entrada:

* a `N-001` registra a decisão humana `APROVADO`, tomada por `mhj`;
* não havia coleção nem instância de Projeto no repositório antes desta materialização; e
* esta instância é o único Projeto vinculado à `N-001`.

O código `P-001` foi aplicado a partir da convenção exemplificada para Projetos (`P-001`, `P-002`) e da ausência verificada de qualquer Projeto anterior. O mecanismo permanente de geração de códigos não está definido normativamente; esta aplicação não o estabelece.

Depois da criação bem-sucedida deste registro em `EM_FORMACAO`, a `N-001` foi atualizada para `EM_PROJETO`.

## Formação do Projeto

### Enquadramento

**Compromisso recebido.** Realizar a primeira jornada utilizável do NAAMIVE para que uma Necessidade de software, limitada e entregável, possa seguir até um resultado verificável, com estado, próximo trabalho, competência, executor, decisões humanas e rastreabilidade compreensíveis.

**Fronteira do Projeto.** O Projeto abrange a direção e a decomposição necessárias para essa jornada inicial. Não amplia o compromisso para substituir todas as ferramentas de desenvolvimento, automatizar decisões materiais, atender escala ilimitada, realizar todas as integrações ou incorporar funcionalidades futuras independentes.

**Critério de atendimento preservado.** A jornada deve permitir determinar onde o trabalho está, qual é o próximo trabalho, qual competência e executor são necessários, quais decisões humanas pendem e como o resultado se relaciona à Necessidade de origem. O teste central é delegar trabalho declarado pronto com instrução simples, sem reconstrução manual de contexto.

### Descoberta

**Evidências examinadas.**

* `dados/necessidades/N-001/necessidade.md`, fonte do compromisso, do escopo e das restrições;
* a documentação das verticais Necessidade e Projeto, que define os ciclos, Atores, status, Resultados do Processo e a fronteira de Módulos;
* a árvore operacional do repositório, que contém somente a instância `N-001` e documentação/Skills antes deste bootstrap, sem código de produto, instâncias de Projeto anteriores ou instâncias de Módulo.

**Restrições e dependências relevantes.** Decisões materiais dependem do Owner; agentes devem atuar conforme suas competências; informação essencial não pode ser inventada; estado atual deve permanecer separado de histórico; rastreabilidade não pode criar burocracia desproporcional; e a primeira solução admite limites de escala, concorrência e integração.

**Riscos e incógnitas materiais.** Não há evidência de implementação executável, interface, persistência, mecanismo de orquestração, política operacional para selecionar executores, modelo de Módulo ou critérios mensuráveis para o teste central. Essas ausências não são tratadas como fatos de produto já resolvidos.

### Direção da solução

**Direção proposta.** Construir uma primeira jornada integrada que registre a Necessidade, mantenha seu estado e contexto, determine o próximo trabalho válido, encaminhe-o ao Ator e executor compatíveis, apresente ao Owner somente as decisões materiais e preserve a ligação entre o resultado produzido e a Necessidade de origem.

**Princípios estruturais propostos.**

* A fonte de verdade do compromisso continua na Necessidade; o Projeto não a duplica nem a altera silenciosamente.
* Status, Resultados do Processo, decisões humanas e histórico precisam permanecer semanticamente distintos.
* A orquestração deve fornecer ao executor contexto suficiente para uma instrução simples, sem delegar ao Owner a reconstrução manual do processo.
* O primeiro percurso deve tratar a limitação de escala e integrações como restrição explícita, não como capacidade presumida.

Esta direção define a abordagem no nível necessário à decomposição; não define arquitetura, tecnologia, interface específica, persistência física ou implementação interna.

### Decomposição conceitual em Módulos

Os itens a seguir são Módulos **propostos conceitualmente**, sem instância materializada, código, status ou trabalho interno definido.

| Módulo proposto | Responsabilidade geral | Fronteira e dependências relevantes |
| --- | --- | --- |
| Gestão de Necessidades | Registrar e conduzir Necessidades, seus estados, resultados e decisões humanas até a origem de um Projeto. | É fonte do compromisso; não conduz a formação interna do Projeto. Depende da interação com o Owner para decisões materiais. |
| Gestão de Projetos e decomposição | Manter Projetos vinculados 1:1 às Necessidades, conduzir sua formação, auditoria e posterior passagem para Módulos. | Não redefine o compromisso da Necessidade nem executa o trabalho interno dos Módulos. Depende da Gestão de Necessidades para a origem aprovada. |
| Orquestração de trabalho | Determinar o próximo trabalho válido, a competência requerida, o Ator responsável e o contexto de execução. | Não substitui decisões materiais do Owner nem altera regras de ciclo. Depende dos estados e resultados fornecidos pelas gestões de Necessidades e Projetos. |
| Continuidade e rastreabilidade | Preservar o estado corrente, relações entre entidades, contexto necessário e ligação do resultado à Necessidade de origem. | Não decide o próximo trabalho por conta própria. Serve de suporte às demais responsabilidades e deve separar estado corrente de histórico. |
| Interação com o Owner | Permitir registro de Necessidades, apresentação de estado e coleta das decisões humanas realmente necessárias. | Não executa responsabilidades agênticas, auditorias ou decisões por delegação. Depende das informações de estado e das solicitações da orquestração. |

As fronteiras acima são suficientes para auditoria da formação no nível conceitual. A materialização futura depende da auditoria e de uma definição normativa de Módulo; não foram criadas Entregas de Valor, Itens de Trabalho, tarefas nem detalhamento interno.

## Classificação das afirmações relevantes

### Conhecido

* A `N-001` possui `APROVADO`, define o compromisso, escopo, fora de escopo, critério de atendimento e restrições acima referidos.
* O repositório contém as documentações e Skills das verticais Necessidade e Projeto e não continha Projeto antes deste bootstrap.
* A documentação atual não define modelo, ciclo de vida ou materialização de Módulo.

### Inferido

* Uma jornada inicial utilizável requer coordenação entre a condução de Necessidades, a condução de Projetos, a determinação do próximo trabalho, a continuidade e a interação humana; a inferência decorre dos critérios de atendimento e do escopo da `N-001`.
* Não há implementação operacional verificável no repositório atual, pois a árvore examinada contém apenas documentos, Skills e dados operacionais em Markdown.

### Proposto

* O nome inicial `Jornada Inicial do NAAMIVE` para tornar explícito que este é o esforço finito da primeira jornada utilizável, sem confundi-lo com o Produto NAAMIVE.
* A direção integrada e os cinco Módulos conceituais desta formação.

### Desconhecido

* Tecnologia, arquitetura, canal de interação, persistência, mecanismo de orquestração e política concreta de seleção de executores.
* Modelo, ciclo de vida, catálogo de status e forma de materialização dos Módulos.
* Métricas, cenário de validação e evidência de execução necessários para demonstrar o critério de atendimento da `N-001` no produto concluído.

## Lacunas e handoff

### Lacunas normativas identificadas

* O modelo de Projeto fornece exemplos de código, mas não define mecanismo permanente de geração; o bootstrap aplicou `P-001` de modo consistente com o primeiro registro observado, sem criar uma nova regra normativa.
* Não existe definição normativa de Módulo, de seu modelo, ciclo de vida, status ou mecanismo de materialização. Isso impede materializar Módulos com segurança, mas não impede sua identificação conceitual nesta formação.

### Próximo Ator

Entregar este material ao **Auditor do Projeto**, que deverá carregar `.agents/skills/projeto/auditoria-do-projeto/SKILL.md`, avaliar a suficiência da formação e produzir, se cabível, o Resultado do Processo de sua própria responsabilidade.

Esta formação não produziu `FORMACAO_SUFICIENTE` nem `FORMACAO_INSUFICIENTE`, não realizou auditoria e não materializou Módulos.
