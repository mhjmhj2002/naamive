# Análise de Negócio — Piloto de Catálogo

## Identificação e rastreabilidade

- Projeto: `catalog-pilot-retry`
- Execução: `execution-797835bd33de45a2875df6e7fedd86e9`
- Despacho: `dispatch-5668f9b52acc4b2ab213226d5a357d9b`
- Item autorizado: `analyze-business-need`
- Fonte analisada: `projects/catalog-pilot-retry/need/BUSINESS_NEED.md`
- Estado de origem: `ANALYSIS`
- Transição em avaliação: `ANALYSIS -> DEFINITION`
- Contexto de autoridade: `INDEPENDENT_REVIEW`

Esta análise interpreta somente a necessidade normalizada. Propostas abaixo identificadas como critérios, regras ou indicadores candidatos precisam ser confirmadas na etapa de definição; não alteram a necessidade aprovada.

## Síntese do problema e do valor

### Problema

Equipes que apresentam ofertas em contextos distintos não dispõem de uma capacidade simples e genérica para organizar e consultar um catálogo. Como consequência, a estrutura é recriada em cada situação, a consulta em dispositivos distintos fica dificultada e o reuso da solução de negócio diminui.

### Resultado de negócio esperado

O piloto deve disponibilizar uma capacidade de catálogo genérica e descartável que permita cadastrar, organizar, listar, consultar e manter itens, sem escolher um segmento de negócio. Seu propósito principal é validar a orquestração do NAAMIVE ao longo do ciclo de projeto; não há objetivo de produção nesta rodada.

### Hipótese de valor

Se uma estrutura mínima e neutra de catálogo atender às operações essenciais e permanecer consultável em diferentes tamanhos de tela, então a equipe poderá:

- evitar recriar a estrutura conceitual básica em cada experimento;
- demonstrar reuso potencial entre cenários de negócio;
- validar o ciclo de projeto do NAAMIVE com evidências concretas;
- aprender quais conceitos mínimos devem seguir para definição sem assumir um domínio específico.

O piloto valida essa hipótese apenas como demonstração e evidência de processo. Ele não prova prontidão para produção, adoção, escala ou retorno financeiro.

## Stakeholders e necessidades

| Stakeholder | Papel no piloto | Necessidade ou interesse | Impacto esperado |
| --- | --- | --- | --- |
| `naamive-platform-team` | Proprietário de negócio | Validar a orquestração com um projeto simples, completo e rastreável | Evidências suficientes da passagem pelo ciclo de projeto |
| Equipe da plataforma NAAMIVE | Parte afetada | Observar se o fluxo, os gates e os artefatos funcionam no piloto | Aprendizado sobre a operação do processo e seus pontos de ajuste |
| Pessoas que administram itens | Usuárias da capacidade | Cadastrar, organizar e manter informações básicas dos itens | Menor necessidade de reconstruir uma estrutura de catálogo para cada contexto |
| Pessoas que consultam o catálogo | Usuárias da capacidade | Listar e consultar itens em dispositivos com telas distintas | Acesso utilizável às informações relevantes do catálogo |

Não foram informados representantes individuais, volumes de usuários, frequência de uso nem conflitos entre stakeholders. A validação dessas lacunas deve ocorrer na definição.

## Escopo de negócio

### Capacidades incluídas pela necessidade

- cadastrar itens;
- organizar itens;
- listar itens;
- consultar itens;
- manter itens;
- representar identificação, descrição, classificação e disponibilidade;
- permitir consulta utilizável em diferentes tamanhos de tela;
- gerar evidências da passagem pelo ciclo de projeto.

### Fora do escopo ou explicitamente não exigido

- uso em produção;
- tratamento de dados pessoais reais;
- integração com sistemas externos;
- especialização para um segmento de negócio;
- decisões de implementação ou entrega;
- compromisso com uma solução reutilizável em produção.

### Fronteiras ainda indefinidas

- atributos mínimos que compõem identificação, descrição, classificação e disponibilidade;
- significado operacional de “organizar” e “manter”;
- classificações e filtros do primeiro recorte;
- critérios observáveis de usabilidade por tamanho de tela;
- criação de módulo próprio ou consumo de módulo reutilizável existente.

## Fluxos de negócio candidatos

Os fluxos abaixo explicitam o comportamento sugerido pelos verbos da necessidade. Sequência detalhada, permissões e exceções devem ser definidas posteriormente.

### Administração de item

1. A pessoa administradora inicia o cadastro de um item.
2. Informa os dados mínimos de identificação, descrição, classificação e disponibilidade.
3. O catálogo registra o item.
4. A pessoa administradora localiza um item existente.
5. Atualiza as informações necessárias para mantê-lo coerente com o objetivo do piloto.
6. O catálogo passa a apresentar os dados atualizados nas consultas.

### Consulta de catálogo

1. A pessoa consulente acessa a listagem.
2. O catálogo apresenta os itens e suas informações relevantes.
3. A pessoa usa os meios de organização, classificação ou filtro que forem aprovados para o recorte.
4. A pessoa seleciona ou localiza um item e consulta seus detalhes.
5. O fluxo permanece utilizável no conjunto de tamanhos de tela definido nos critérios de aceitação.

### Validação da orquestração

1. A solicitação completa recebe a aprovação humana exigida antes da materialização do projeto.
2. Cada etapa do ciclo produz a evidência requerida.
3. As evidências são revisadas conforme o controle aplicável.
4. Ao fim do piloto, a equipe avalia se as evidências permitem confirmar a passagem pelo ciclo, sem inferir prontidão para produção.

## Regras de negócio candidatas

| ID | Regra candidata | Base na necessidade | Incerteza a resolver |
| --- | --- | --- | --- |
| RN-01 | Todo item registrável deve possuir o conjunto mínimo aprovado de identificação, descrição, classificação e disponibilidade. | Métrica de registro e consulta | Cardinalidade, obrigatoriedade e formato de cada atributo |
| RN-02 | Itens registrados devem poder ser recuperados por listagem e consulta. | Resultado desejado e métricas | Diferença entre listagem, consulta e detalhe |
| RN-03 | Alterações feitas na manutenção devem aparecer em consultas posteriores. | Capacidade de manter itens | Histórico, exclusão e estados permitidos não foram solicitados |
| RN-04 | A classificação deve permanecer neutra quanto a segmento de negócio. | Catálogo genérico, sem segmento específico | Vocabulário inicial e possibilidade de múltiplas classificações |
| RN-05 | A disponibilidade deve ser representada sem depender de sistema externo. | Informação básica e ausência de integrações | Valores, transições e significado da disponibilidade |
| RN-06 | A consulta deve preservar tarefas essenciais nos tamanhos de tela acordados. | Métrica de consulta em telas distintas | Tamanhos, dispositivos e limiares de aceitação |
| RN-07 | Dados pessoais reais não devem ser usados no piloto. | Restrição explícita | Processo de verificação dos dados de demonstração |
| RN-08 | A evidência do piloto não deve ser interpretada como aceite de produção. | Piloto descartável e sem meta de produção | Forma e responsável pelo encerramento da avaliação |

## Métricas e critérios candidatos

| Objetivo | Indicador observável candidato | Evidência candidata | Lacuna para definição |
| --- | --- | --- | --- |
| Validar a entrada controlada no ciclo | Projeto materializado somente após aprovação humana da solicitação completa | Registro temporal da aprovação e da materialização | Fonte oficial e responsável pela verificação |
| Registrar e consultar informações básicas | Cenários demonstráveis cobrem criação e recuperação de item com os quatro grupos de informação | Exemplos de cadastro, listagem e consulta | Atributos mínimos e quantidade de exemplos |
| Manter itens | Alteração de um item é recuperada em consulta posterior | Cenário de atualização com resultado observado | Quais campos e estados podem mudar |
| Consultar em telas distintas | Tarefas essenciais são concluídas sem perda de informação ou ação necessária nos tamanhos acordados | Evidência por cenário e tamanho de tela | Matriz de tamanhos, tarefas essenciais e critério de “utilizável” |
| Validar a orquestração | Etapas percorridas possuem evidências e controles requeridos pelo ciclo | Conjunto rastreável de artefatos e decisões | Limites inicial/final do ciclo avaliados e checklist de suficiência |
| Preservar neutralidade de domínio | Modelo e exemplos não exigem vocabulário de um segmento específico | Revisão dos termos e dados de demonstração | Critério objetivo para detectar especialização indevida |

Não há meta quantitativa de desempenho, volume, adoção ou disponibilidade operacional na fonte. Tais metas não devem ser presumidas para o piloto.

## Restrições, premissas e impactos

### Restrições confirmadas

- O piloto é simples, descartável e destinado a testar a orquestração.
- Não será usado em produção.
- Não deve tratar dados pessoais reais.
- Não requer sistemas externos nesta rodada.
- Decisões de implementação e entrega pertencem às etapas apropriadas posteriores.

### Premissas da necessidade e impacto se inválidas

| Premissa | Impacto se inválida |
| --- | --- |
| Um modelo genérico pode servir a contextos distintos sem escolha de domínio | O piloto pode produzir um modelo abstrato demais ou exigir delimitação de contexto |
| O escopo reduzido basta para exercitar intake, gate humano, materialização e etapas posteriores | A validação do ciclo pode ficar incompleta ou exigir evidências adicionais |
| Usuários entendem item, classificação e disponibilidade sem treinamento especializado | Termos podem ser usados de forma inconsistente, prejudicando cadastro e consulta |

## Riscos iniciais

| Risco | Consequência de negócio | Tratamento a considerar na definição |
| --- | --- | --- |
| Generalidade excessiva | Modelo pouco verificável ou pouco útil até como piloto | Fixar exemplos neutros e um conjunto mínimo explícito de atributos |
| Especialização acidental | Redução do reuso potencial e desvio da necessidade | Revisar vocabulário, classificações e exemplos contra a neutralidade de domínio |
| “Utilizável” permanecer subjetivo | Métrica de telas distintas não pode ser verificada | Definir tarefas, tamanhos e critérios observáveis antes da validação |
| Confusão entre sucesso do catálogo e sucesso da orquestração | Piloto pode ser considerado aprovado com evidência parcial | Manter critérios e evidências separados para capacidade e processo |
| Dados de demonstração inadequados | Violação da restrição de não usar dados pessoais reais | Definir dados sintéticos e uma verificação explícita |
| Decisão prematura de modularização | Arquitetura influencia indevidamente a análise do negócio | Encaminhar a questão como candidata, sem escolher módulo nesta análise |
| Ausência de representantes e volumes definidos | Critérios podem não refletir condições de uso esperadas | Identificar responsáveis por validar administração, consulta e processo |

## Questões para a etapa de definição

Prioridade alta:

1. Quais atributos mínimos e obrigatórios representam identificação, descrição, classificação e disponibilidade sem induzir um domínio?
2. Quais tarefas exatas compõem cadastrar, organizar, listar, consultar e manter?
3. Quais classificações e filtros entram no primeiro recorte?
4. Quais tamanhos de tela serão avaliados e o que torna cada tarefa “utilizável”?
5. Quais evidências, limites do ciclo e critérios determinam que a orquestração foi suficientemente validada?

Prioridade complementar:

6. Quem representa e valida as necessidades das pessoas administradoras e consulentes?
7. Quais dados sintéticos serão usados e como será verificado que não contêm dados pessoais reais?
8. Quais exceções mínimas precisam ser demonstradas, como dados incompletos ou consulta sem resultado?
9. A capacidade será definida como módulo próprio do piloto ou como consumo de módulo reutilizável já registrado?
10. Qual é o critério de encerramento e descarte do piloto?

## Encaminhamento para domínio e requisitos

A definição deve transformar:

- os quatro grupos de informação em conceitos e atributos rastreáveis;
- os cinco verbos de capacidade em requisitos e cenários de aceitação;
- a neutralidade de domínio em restrições verificáveis de vocabulário e exemplos;
- a consulta em telas distintas em uma matriz objetiva de tarefas e tamanhos;
- a validação da orquestração em um conjunto explícito de evidências;
- as regras candidatas em regras confirmadas, rejeitadas ou revisadas.

A decisão sobre módulo próprio ou reutilizável permanece candidata e não é tomada por esta análise.

## Avaliação da transição

A evidência cobre problema, hipótese de valor, stakeholders, capacidades, fluxos, restrições, premissas, riscos e questões abertas, com rastreabilidade à necessidade normalizada. As incertezas que exigem detalhamento foram isoladas para a etapa seguinte e não impedem iniciar a definição.

**Recomendação:** solicitar `ANALYSIS -> DEFINITION`, condicionada à revisão independente desta análise. Esta recomendação não altera o estado do projeto nem representa aprovação do gate.
