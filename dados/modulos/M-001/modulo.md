# M-001 — Condução da Necessidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `817168df-ad01-436c-8eb6-3749e0fd7070` |
| Código | `M-001` |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) |
| Status | `FORMADO` |

## Delimitação inicial

* **Item canônico:** [M-001 no Mapa de Módulos do Projeto](../../projetos/P-001/mapa-de-modulos.md#m-001--condução-da-necessidade).
* **Capacidade:** conduzir uma demanda desde seu registro até o compromisso humano explícito e disponível ao Projeto.
* **Responsabilidade:** registrar, formar, avaliar, qualificar e encaminhar a decisão material do Owner sobre a Necessidade.
* **Dentro da fronteira:** registro, formação, avaliação, qualificação, recomendação e compromisso humano da Necessidade.
* **Fora da fronteira:** criação e formação do Projeto, coordenação de trabalho posterior e verificação do resultado de software.
* **Relações relevantes:** disponibiliza o compromisso para M-002; seu contexto e evidências são preservados por M-004.

## Formação técnica

### Compreensão e refinamento da fronteira

**Conhecido.** M-001 conduz a Necessidade desde o registro até o compromisso humano explícito e disponibiliza esse compromisso a M-002. O ciclo normativo exige que status, Resultados do Processo, decisões humanas e histórico permaneçam distintos.

**Inferido.** A capacidade precisa manter uma visão atual da Necessidade e um histórico imutável das afirmações, avaliações, recomendações e decisões que explicam seu avanço. Essa separação atende à Direção do P-001 e permite recuperar o contexto sem depender de reconstrução manual.

**Proposto.** M-001 será a autoridade das regras de negócio da Necessidade e de suas transições iniciais. M-004 será consumido como capacidade de preservação e recuperação de contexto e rastreabilidade; M-001 não define sua persistência física nem assume sua responsabilidade.

**Verificação de fronteira.** Não há evidência de que a capacidade delimitada de M-001 deva ser fundida, substituída ou deslocada para outro Módulo. A formação preserva integralmente a capacidade, a responsabilidade e as relações definidas no Mapa.

### Descoberta técnica

| Evidência | Classificação | Impacto no desenho |
| --- | --- | --- |
| [N-001](../../necessidades/N-001/necessidade.md) | Conhecido | Demonstra o registro consolidado de uma Necessidade, seu Compromisso, a decisão `APROVADO` pelo Owner e o vínculo exclusivo com P-001. |
| Documentação normativa de Necessidade | Conhecido | Define campos, status, Resultados do Processo, Atores, transições e a separação entre compromisso, decisão, status e histórico. |
| [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto) e [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-001--condução-da-necessidade) | Conhecido | Exige fluxo rastreável, transições explícitas, decisões humanas identificáveis e preservação de contexto, mantendo a fronteira com M-002, M-003 e M-004. |
| Inventário versionado do repositório | Conhecido | Contém somente documentação, Skills e registros Markdown; não há código executável, API, banco de dados, mecanismo de autenticação, orquestrador ou integração existente a reutilizar. |

### Especificação Técnica do Módulo

Esta especificação foi aprovada pela auditoria independente e está disponível para consumo posterior. Essa aprovação alterou exclusivamente o status do Módulo para `FORMADO`; não define continuação operacional.

#### Origem e rastreabilidade de delimitação

| Elemento | Referência | Classificação |
| --- | --- | --- |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) | Conhecido |
| Direção consumida | [Direção do Projeto](../../projetos/P-001/projeto.md#direção-do-projeto), aprovada por `FORMACAO_SUFICIENTE` | Conhecido |
| Justificativa de delimitação | [Item M-001 no Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-001--condução-da-necessidade) | Conhecido |

Essas referências orientam a realização e não substituem o Projeto, a Direção, o Mapa ou a Necessidade como fontes de verdade de seus próprios contextos.

#### Objetivo técnico e fronteira de realização

M-001 deve oferecer a capacidade de registrar e conduzir uma Necessidade até que uma decisão humana `APROVADO` torne disponível seu Compromisso. Deve permitir que os Atores especializados executem as atividades normativas de formação, auditoria e qualificação, preservando suas responsabilidades distintas e registrando as conclusões formais cabíveis.

Está dentro da realização de M-001:

* criação e atualização controlada da Necessidade e de seu conteúdo de negócio;
* validação das transições de status previstas para a Necessidade;
* registro separado de Resultados do Processo, recomendações, decisões do Owner e evidências associadas;
* consolidação do Compromisso da Necessidade somente após `APROVADO`; e
* handoff confiável do compromisso para M-002, sem criar o Projeto nem executar sua formação.

Está fora da realização de M-001:

* formação, auditoria ou materialização do Projeto;
* escolha e atribuição concreta de executor para trabalho posterior, pertencente à coordenação de M-003;
* infraestrutura compartilhada de contexto e rastreabilidade, pertencente a M-004; e
* implementação ou verificação do resultado de software, pertencentes à continuação posterior e a M-005.

#### Modelo lógico e regras de integridade

**Proposto.** A realização mantém uma representação atual de Necessidade com referência estável, conteúdo previsto no Modelo de Necessidade e um único status do catálogo normativo. A referência estável é necessária para relacionar resultados, decisões, evidências e o Projeto 1:1; o formato técnico dessa referência permanece desconhecido. O código legível já existente, como `N-001`, pode continuar sendo usado para referência humana.

**Proposto.** O histórico associado registra, separadamente da posição atual: atividade e Ator responsável, afirmação ou evidência utilizada, Resultado do Processo quando existir, recomendação, decisão humana, identidade autenticada do Owner quando aplicável e relação de causalidade com a transição. M-001 define o significado dessas informações; M-004 fornecerá a preservação, consulta e correlação compartilhadas necessárias.

| Conceito lógico | Finalidade em M-001 | Não se confunde com |
| --- | --- | --- |
| Estado atual | A posição vigente da Necessidade no catálogo de status. | etapa, Resultado do Processo, recomendação ou decisão. |
| Histórico | Registro cronológico das atividades, alterações e causalidades já ocorridas. | estado atual. |
| Resultado do Processo | Conclusão formal de auditoria, qualificação ou decisão prevista no catálogo normativo. | status ou artefato de saída. |
| Decisão humana | Ato material do Owner, com identidade autenticada identificável. | recomendação de agente ou Resultado de auditoria. |
| Evidência | Fonte ou contexto que sustenta uma afirmação, avaliação, transição ou decisão. | o próprio conteúdo da Necessidade ou a decisão tomada. |
| Compromisso da Necessidade | Visão consolidada disponível após `APROVADO` para consumo por M-002. | nova entidade, histórico, decisão ou Resultado do Processo. |

As seguintes regras são obrigatórias para a realização:

1. status somente pode assumir valores do catálogo de Necessidade e não pode receber nome de etapa, Resultado do Processo, recomendação ou decisão humana;
2. `QUALIFICAVEL`, `PRECISA_DE_ESCLARECIMENTO`, `PRECISA_DE_DECOMPOSICAO`, `NAO_CARACTERIZA_NECESSIDADE`, `ASSUMIR_COMPROMISSO`, `NAO_ASSUMIR_COMPROMISSO`, `APROVADO` e `CANCELAMENTO_APROVADO` são registros de processo, nunca status;
3. apenas o Owner identificado por identidade autenticada pode registrar `APROVADO` ou `CANCELAMENTO_APROVADO`; um agente não pode produzi-los;
4. o Compromisso é uma visão consolidada da Necessidade, não uma entidade, status, decisão ou histórico paralelo, e só se torna disponível após `APROVADO`;
5. uma Necessidade aprovada só passa a `EM_PROJETO` após confirmação de materialização bem-sucedida do único Projeto correspondente por M-002; e
6. toda alteração de conteúdo ou posição deve preservar evidência e contexto suficientes para auditoria e recuperação posterior.

#### Fluxos e contratos lógicos

| Operação lógica | Pré-condição e efeito | Responsável pela regra |
| --- | --- | --- |
| Registrar Necessidade | Recebe os campos do Modelo de Necessidade, cria a referência estável, preserva a entrada e inicia em `EM_FORMACAO`. | M-001 |
| Consolidar formação | Atualiza a compreensão da demanda com evidências, lacunas e classificações, sem produzir resultado de auditoria nem decisão humana. | M-001, sob atuação do Especialista em Formação da Necessidade |
| Registrar parecer de auditoria | Aceita somente Resultado do Processo produzido pelo Auditor da Necessidade e aplica a consequência normativa aplicável, sem converter o resultado em status. | M-001 |
| Registrar qualificação | Preserva a recomendação do Especialista em Qualificação e posiciona a Necessidade em `AGUARDANDO_DECISAO` quando a qualificação estiver concluída. | M-001 |
| Registrar decisão do Owner | Exige identidade autenticada do Owner, estado elegível e decisão normativa válida; preserva decisão e identidade sem tratá-las como status. | M-001 |
| Disponibilizar Compromisso e handoff | Após `APROVADO`, consolida o Compromisso e registra uma solicitação idempotente de bootstrap para M-002. A confirmação de M-002 é a única condição para registrar `EM_PROJETO`. | M-001 para a regra; M-002 para a materialização do Projeto |
| Consultar Necessidade e Compromisso | Recupera a visão atual e, quando aprovado, o Compromisso autocontido com referências ao contexto e histórico pertinente. | M-001 com apoio de M-004 |

#### Interações e dependências materiais

| Relação | Entrada consumida por M-001 | Saída produzida por M-001 | Limite de responsabilidade |
| --- | --- | --- | --- |
| Owner | Decisão humana material e identidade autenticada identificável. | Decisão preservada com sua autoria e efeito normativo. | M-001 não escolhe, simula nem substitui o Owner. |
| Atores da Necessidade | Formação, parecer de auditoria ou recomendação produzidos pelo Ator competente. | Estado e histórico atualizados segundo as regras normativas. | M-001 suporta a execução; não confunde as responsabilidades dos Atores. |
| M-002 | Confirmação de que o Projeto 1:1 foi materializado. | Compromisso disponível e solicitação lógica de bootstrap após `APROVADO`. | M-001 não cria, forma ou audita Projeto. |
| M-004 | Capacidade futura de preservar, recuperar e correlacionar contexto. | Semântica dos vínculos, evidências e registros que devem ser preservados. | M-001 não define armazenamento, consulta compartilhada ou rastreabilidade física. |
| M-003 | Nenhuma entrada necessária ao fluxo de compromisso. | Contexto e posição identificáveis para coordenação posterior. | M-001 não determina próximo trabalho nem seleciona executor. |

**Proposto.** O handoff para M-002 deve possuir um identificador lógico de idempotência vinculado à referência estável da Necessidade. A necessidade é sustentada pela regra normativa de que uma Necessidade aprovada origina exatamente um Projeto 1:1. Em caso de indisponibilidade ou falha antes da confirmação de criação do Projeto, a decisão `APROVADO` e a obrigação de bootstrap permanecem registradas, sem antecipar `EM_PROJETO` nem criar status intermediário. O mecanismo concreto de entrega, repetição, exclusão mútua e confirmação permanece desconhecido; a realização deverá garantir apenas o efeito lógico de não duplicar o Projeto correspondente.

#### Direção de realização técnica

**Proposto.** A realização deve separar a aplicação de regras de domínio de seus adaptadores de entrada, armazenamento, autenticação e comunicação com outros Módulos. As regras de transição, autorização do Owner e composição do Compromisso não podem depender de interface, API, banco ou mecanismo de orquestração específicos.

**Desconhecido legítimo.** Não há evidência suficiente para escolher linguagem, framework, interface, API, formato de mensagem, banco de dados, mecanismo de autenticação, tecnologia de fila, topologia de implantação ou modelo físico de concorrência. Nenhuma dessas escolhas é necessária para validar a capacidade, os invariantes ou os contratos lógicos acima; deverão ser decididas com evidência durante a realização ou quando uma decisão técnica se tornar material.

#### Decisões técnicas registradas

| Decisão | Necessidade que a motiva | Sustentação |
| --- | --- | --- |
| Separar logicamente estado atual, histórico, Resultados do Processo, decisões humanas, evidências e Compromisso. | Evitar perda de contexto e confusão entre posição, conclusão e autoridade. | Direção do P-001 e catálogos normativos da Necessidade. |
| Exigir identidade autenticada identificável para decisão humana material. | Preservar autoria legítima de `APROVADO` e `CANCELAMENTO_APROVADO`. | Conceito de Owner e Resultados do Processo da Necessidade. |
| Condicionar `EM_PROJETO` à confirmação de Projeto 1:1 materializado. | Impedir registro antecipado de posição sem Projeto existente. | Ciclo de Vida da Necessidade. |
| Exigir idempotência lógica no handoff para M-002. | Impedir duplicação lógica de Projeto para uma única Necessidade aprovada. | Vínculo normativo 1 Necessidade aprovada → 1 Projeto. |

Nenhuma decisão sobre tecnologia física é tomada nesta especificação.

#### Segurança, confiabilidade e observabilidade

* **Conhecido:** decisão humana material exige identidade autenticada do Owner e registro da decisão; a realização deve rejeitar decisão sem essa identidade ou fora da posição elegível.
* **Proposto:** alterações devem manter trilha de auditoria com Ator, contexto, efeito e referência de evidência, preservando a separação entre estado atual e histórico.
* **Proposto:** o tratamento do handoff após `APROVADO` deve ser recuperável e idempotente para impedir perda de compromisso ou duplicação do Projeto 1:1.
* **Proposto:** uma entrada inválida, uma transição não permitida ou uma confirmação incompatível deve ser rejeitada sem alterar a visão atual, preservando evidência suficiente para diagnóstico e nova tentativa legítima.
* **Desconhecido legítimo:** não há volume, tempo de resposta, disponibilidade ou escala documentados que justifiquem requisito de desempenho, métrica, alerta ou mecanismo concreto de observabilidade neste momento.
* **Desconhecido legítimo:** controles concretos de autenticação, autorização, retenção, criptografia, métricas, logs, alertas, cópias de segurança e recuperação dependem da tecnologia ainda não selecionada.

#### Dependências, lacunas e riscos

| Item | Classificação | Tratamento |
| --- | --- | --- |
| M-002 materializa o Projeto após o compromisso | Conhecido | M-001 entrega apenas o Compromisso e a solicitação idempotente; não cria nem forma Projeto. |
| M-004 preserva e recupera contexto e rastreabilidade | Proposto | M-001 define os dados e vínculos que precisam ser preservados, sem impor mecanismo físico a M-004. |
| Identidade autenticada do Owner | Conhecido como requisito; mecanismo desconhecido | Deve ser fornecida por adaptador futuro antes de aceitar decisão humana material. |
| Tecnologia, persistência, comunicação entre Módulos e concorrência física | Desconhecido | Permanecem decisões técnicas futuras; os invariantes de idempotência, separação de estado e histórico e unicidade 1:1 orientam sua escolha. |
| Cancelamento de Necessidade já em `EM_PROJETO` | Lacuna de processo existente | A documentação da Necessidade admite cancelamento antes do atendimento, mas não define a coordenação com o ciclo posterior do Projeto. Não bloqueia o fluxo de compromisso de M-001; deve ser tratado quando a continuação operacional do Projeto for modelada. |

#### Material avaliado pela auditoria

A capacidade, fronteira, regras de integridade, fluxos, dependências, decisões e direção de realização foram avaliadas sem escolher tecnologia por ritual. Não foram criadas Entregas de Valor, Itens de Trabalho, tarefas, implementação ou alteração de delimitação.

## Resultado do Processo — Auditoria independente

`FORMACAO_SUFICIENTE`

### Parecer independente

A formação é suficiente para orientar a realização posterior sem redesenhar a capacidade ou a fronteira de M-001. As referências ao P-001, à Direção aprovada e ao item canônico do Mapa estão explícitas. A responsabilidade se mantém no ciclo da Necessidade, sem formar o Projeto, coordenar trabalho posterior, assumir a capacidade transversal de M-004, verificar software ou antecipar a próxima vertical.

O núcleo invariável está presente: capacidade e fronteiras, evidências classificadas, relações e dependências, decisões necessárias, contratos lógicos, dados conceitualmente separados, riscos e desconhecidos legítimos. A especificação preserva que o Owner é um usuário autenticado sem inventar mecanismo de identidade; que o Compromisso somente fica disponível após `APROVADO`; e que M-002, e não M-001, materializa o Projeto.

O handoff possui idempotência lógica sustentada pela regra de um único Projeto por Necessidade aprovada, sem supor mecanismo físico. `EM_PROJETO` depende da confirmação de materialização de M-002. A lacuna de cancelamento em `EM_PROJETO` corresponde às fontes normativas, não inventa propagação ao Projeto e não impede a capacidade principal já formada.

Não foram identificados problemas de formação ou de delimitação que exijam retorno. A Especificação Técnica fica aprovada e o M-001 transiciona de `EM_FORMACAO` para `FORMADO`.

## Situação após a auditoria

O M-001 está em `FORMADO`, com Especificação Técnica aprovada e disponível para consumo posterior. A continuação operacional permanece não modelada; portanto, não há próximo Ator operacional definido para este Módulo.
