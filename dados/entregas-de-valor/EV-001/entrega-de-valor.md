# EV-001 — Compromisso da Necessidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `80264aa7-5243-4396-a99e-e33e38aca286` |
| Código | `EV-001` |
| Módulo proprietário | [M-001 — Condução da Necessidade](../../modulos/M-001/modulo.md) |
| Status | `FORMADA` |

## Delimitação inicial

* **Item canônico:** [EV-001 no Mapa de Entregas de Valor de M-001](../../modulos/M-001/mapa-de-entregas-de-valor.md#ev-001--compromisso-da-necessidade).
* **Declaração de valor:** permitir que uma demanda seja conduzida até um Compromisso da Necessidade decidido explicitamente pelo Owner e disponível ao Projeto.
* **Beneficiário relevante:** pessoa ou equipe que apresenta a demanda e o Owner responsável por decidir seu compromisso.
* **Resultado observável esperado:** uma Necessidade registrada percorre formação, auditoria e qualificação; após decisão humana `APROVADO`, seu Compromisso consolidado fica disponível para consumo por M-002.
* **Dentro da fronteira:** registro e atualização controlada da Necessidade; formação, auditoria e qualificação pelos Atores competentes; recomendação; apresentação da decisão ao Owner; registro separado da decisão; e consolidação e disponibilização do Compromisso após `APROVADO`.
* **Fora da fronteira:** materializar, formar ou auditar o Projeto; selecionar executor; coordenar trabalho posterior; definir persistência, autenticação, transporte ou orquestração físicos; e verificar resultado de software.
* **Dependências, relações e incertezas relevantes:** o Owner decide materialmente `APROVADO`; M-002 consome o Compromisso e materializa o Projeto 1:1; M-004 preserva e recupera contexto. Identidade autenticada do Owner, persistência, comunicação entre Módulos, concorrência e orquestração físicas permanecem desconhecidas legítimas para a Formação e a realização posteriores.

## Formação da Entrega de Valor

Esta formação foi conduzida pelo Especialista em Formação da Entrega de Valor e readequada sob intervenção material obrigatória de arquitetura pelo Owner. Ela aprofunda a evolução delimitada sem alterar sua identidade, sua propriedade por M-001 nem sua fronteira de valor.

### Evidências e classificação do contexto

| Informação | Classificação | Fundamentação e efeito na formação |
| --- | --- | --- |
| Valor, beneficiário, resultado observável e fronteira iniciais | Conhecido | Registro desta EV e [Mapa canônico de M-001](../../modulos/M-001/mapa-de-entregas-de-valor.md#ev-001--compromisso-da-necessidade). |
| Regras, responsabilidades e fronteira de M-001 | Conhecido | [Especificação Técnica de M-001](../../modulos/M-001/modulo.md#especificação-técnica-do-módulo), aprovada por `FORMACAO_SUFICIENTE`. |
| Compromisso de origem, autoridade humana e limitações da primeira jornada | Conhecido | [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade). |
| Decisão Material do Owner de Arquitetura e Stack | Decisão Humana Material | O Owner determinou explicitamente a arquitetura do NAAMIVE: Node.js (TypeScript) com PostgreSQL, camada web responsiva e worker desacoplado em background para processamento contínuo, revogando a presunção indevida anterior de Java 21 / Spring Boot. |
| Uma aplicação única e modular com worker desacoplado atende à evolução | Inferido | O desacoplamento entre serviço web e worker de background atende ao requisito contínuo sem impor complexidade prematura de microsserviços distribuídos. |
| Persistência, identidade, transporte entre Módulos, concorrência e orquestração físicos | Desconhecido legítimo | Os contratos e invariantes abaixo orientam a realização sem antecipar detalhes físicos de infraestrutura além dos determinados pelo Owner. |

### Especificação da Entrega de Valor

#### Valor, comportamento e fronteira refinados

**Declaração de valor.** A pessoa ou equipe que apresenta uma demanda e o Owner conseguem conduzi-la, com contexto recuperável e responsabilidades separadas, até um Compromisso da Necessidade decidido explicitamente pelo Owner e disponível ao Projeto.

**Jornada e Fluxo relevantes.** A pessoa registra e esclarece uma Necessidade; os Atores especializados produzem Formação, parecer e recomendação nas suas competências; o Owner toma a decisão material elegível; e, somente se ela for `APROVADO`, o sistema torna o Compromisso disponível para M-002. A pessoa consulta a posição atual e o contexto que explica o avanço, sem tratar parecer, recomendação ou decisão como Status.

**Regras de negócio e integridade.**

1. A Necessidade possui posição atual pertencente exclusivamente ao catálogo de Status da vertical; atividades, Resultados do Processo, recomendações e decisões humanas são registros separados.
2. Somente o Ator competente pode registrar o resultado que lhe cabe; apenas o Owner autenticado pode produzir `APROVADO` ou `CANCELAMENTO_APROVADO`.
3. O Compromisso é uma visão consolidada da Necessidade, não uma entidade ou histórico paralelo, e só fica disponível após `APROVADO` válido.
4. A disponibilidade para M-002 gera solicitação lógica idempotente vinculada à referência estável da Necessidade. A EV não cria o Projeto, e `EM_PROJETO` só é registrado após confirmação de M-002.
5. Entrada inválida, transição não permitida, resultado incompatível ou confirmação incompatível é rejeitada sem alterar a posição atual; o diagnóstico deve ser recuperável.

**Fronteira confirmada.** A EV inclui registrar e atualizar a Necessidade, apoiar Formação, Auditoria e Qualificação, registrar a decisão do Owner, compor o Compromisso e disponibilizá-lo logicamente a M-002. Não inclui criar, formar ou auditar P-001; coordenar execução; definir ou operar mecanismos físicos além dos decididos; nem verificar software integrado. Não há evidência de intenção independente, sobreposição material ou Módulo proprietário incorreto; não há retorno ao Delimitador.

#### Arquitetura e Decisões Técnicas (Decisão Material do Owner)

**Solução de alto nível.** A arquitetura adotada baseia-se na Decisão Material do Owner:
* **Runtime e Linguagem:** Node.js com TypeScript, garantindo tipagem estática e padronização do ecossistema.
* **Banco de Dados:** PostgreSQL para persistência transacional relacional, integridade referencial e histórico próprio da capacidade, com migrações versionadas de esquema.
* **Camada Web:** Interface responsiva (HTML/CSS com templates de renderização no servidor ou SPA leve e responsiva com Bootstrap) para interação do usuário e do Owner.
* **Processamento Assíncrono / Background:** Worker desacoplado para execução contínua de tarefas assíncronas, monitoramento e reconciliação sem bloquear o ciclo de atendimento HTTP da camada web.

| Componente lógico | Responsabilidade |
| --- | --- |
| Camada Web Responsiva | Interface web responsiva para registrar, consultar e atualizar o conteúdo autorizado; apresentar posição, pendências e Compromisso disponível. |
| Aplicação / Serviço HTTP (Node.js/TypeScript) | Orquestrar os casos de uso, expor rotas web/API e validar pré-condições, sem assumir decisão humana ou parecer de Ator. |
| Worker Desacoplado (Node.js/TypeScript) | Processar tarefas assíncronas em background de forma contínua, tratando jobs agendados e eventos de forma desacoplada. |
| Domínio da Necessidade | Aplicar transições, separar estado de histórico, validar competência do resultado e compor o Compromisso após `APROVADO`. |
| Camada de Persistência (PostgreSQL) | Gerenciar estado transacional relacional e histórico imutável com migrações controladas. |
| Porta de identidade do Owner | Exigir identidade autenticada identificável antes de registrar decisão material; o provedor permanece aberto. |
| Porta de bootstrap do Projeto | Emitir e recuperar solicitação idempotente para M-002, sem criar ou formar o Projeto. |

#### Dados, contratos e integrações

**Estado e dados mínimos.** A solução mantém uma referência estável para a Necessidade, conteúdo de negócio, único Status vigente, registros históricos imutáveis de atividade e evidência, Resultados do Processo, recomendações, decisão do Owner com identidade, visão derivada do Compromisso e solicitação idempotente para M-002. O esquema físico relacional em PostgreSQL preserva estritamente essa separação.

**Contratos lógicos internos.** O mapeamento de casos de uso permanece:

| Caso de uso | Pré-condição e efeito observável |
| --- | --- |
| Registrar ou atualizar Necessidade | Valida conteúdo permitido, preserva evidência e mantém a posição inicial ou vigente conforme regra aplicável. |
| Consolidar formação | Registra conteúdo formado, classificações e evidências, sem produzir parecer de Auditoria nem decisão humana. |
| Registrar parecer ou qualificação | Aceita somente conclusão de Ator competente e aplica a consequência normativa sem convertê-la em Status. |
| Registrar decisão do Owner | Exige identidade autenticada e posição elegível; registra decisão e autoria, sem simulá-las. |
| Disponibilizar Compromisso | Após `APROVADO`, compõe a visão consolidada e cria ou recupera a solicitação idempotente a M-002. |
| Consultar Necessidade e Compromisso | Retorna posição atual e, quando elegível, Compromisso com referências suficientes ao contexto. |

**Integrações e dependências.** M-004 preserva, recupera e correlaciona contexto; M-002 recebe exclusivamente o Compromisso e a solicitação lógica de bootstrap. Não há endpoint, fila externa rígida ou credencial física pré-amarrada. A realização deve preservar o invariante `1 Necessidade aprovada → 1 Projeto`.

#### Segurança, operação e riscos

**Segurança e confiabilidade.** Decisão humana material não é aceita sem identidade autenticada identificável. A aplicação valida entradas e transições antes de persistir no PostgreSQL, restringe alteração do histórico, evita segredos em logs e trata falhas de integração sem perder `APROVADO` nem duplicar o Projeto.

**Operação proposta.** Desenvolvimento local e produção em ambiente Node.js com PostgreSQL. A construção executa compilação TypeScript, migrações e testes automatizados, gerando execução reproduzível tanto do serviço web quanto do worker em background.

| Risco ou lacuna | Classificação | Tratamento |
| --- | --- | --- |
| Decisão material sem identidade confiável | Bloqueante para decisão do Owner | A porta de identidade deve estar concretizada antes desse caso de uso em produção. |
| Confusão entre Status, histórico, resultado e decisão | Risco de integridade | Regras de domínio e testes de transição preservam representações separadas. |
| Falha ou repetição do handoff a M-002 | Risco de duplicação ou perda | Solicitação idempotente, confirmação recuperável e novo processamento seguro. |
| Coordenação entre Camada Web e Worker | Risco operacional | Comunicação transacional através de tabelas de filas/eventos no PostgreSQL ou canal seguro. |

#### Critérios verificáveis e estratégia de testes

O resultado integrado deverá demonstrar, com uma Necessidade limitada, que:

1. uma pessoa registra e consulta Necessidade via interface web responsiva com posição atual distinguível de seu histórico;
2. resultado de Formação, Auditoria e Qualificação é associado ao Ator competente sem ser apresentado como Status;
3. tentativa de decisão material sem identidade autenticada ou fora de posição elegível não altera o estado;
4. decisão válida `APROVADO` produz Compromisso consultável e solicitação idempotente a M-002, sem criar o Projeto nesta capacidade;
5. o worker desacoplado processa tarefas contínuas sem degradação da interface web; e
6. evidências, decisão e vínculo de origem permanecem recuperáveis no PostgreSQL para explicar o percurso.

A realização combinará testes unitários das regras de domínio TypeScript, testes de integração de persistência PostgreSQL / migrações e testes end-to-end locais do fluxo de compromisso.

#### Justificativa de suficiência e handoff

A especificação readequada preserva a origem `EV-001 → M-001 → P-001 → N-001`, incorpora a Decisão Material do Owner (Node.js/TypeScript, PostgreSQL, Web responsiva e Worker desacoplado), fixa comportamento, invariantes, responsabilidades, contratos e critérios verificáveis suficientes para planejamento e realização legítimos.

**Handoff:** esta Especificação readequada é submetida ao **Auditor da Entrega de Valor** para avaliação independente, mediante a Skill `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md`.

## Resultado do Processo — Auditoria independente

| Campo | Registro |
| --- | --- |
| Ator competente | Auditor da Entrega de Valor |
| Resultado do Processo | `FORMACAO_SUFICIENTE` |
| Status após a auditoria | `FORMADA` |

### Parecer independente

O Auditor da Entrega de Valor avaliou independentemente a readequação da Especificação da EV-001, decorrente da intervenção material mandatória do Owner:

1. **Aderência à Decisão do Owner:** A baseline técnica foi formalmente realinhada para Node.js (TypeScript) com PostgreSQL, interface web responsiva e worker em background desacoplado, revogando expressamente a presunção técnica anterior.
2. **Suficiência Conceitual e Arquitetural:** A solução técnica de alto nível detalha claramente os componentes lógicos (Serviço Web, Worker em background, Domínio puro e Persistência relacional) mantendo o desacoplamento das regras de negócio em relação aos adaptadores de entrada e saída.
3. **Preservação de Fronteiras e Invariantes:** A fronteira de valor com M-001 e a cadeia causal `EV-001 → M-001 → P-001 → N-001` permanecem intactas. Os invariantes de negócio (separação rigorosa entre Status, histórico, Resultados do Processo e decisões humanas) continuam integralmente assegurados.
4. **Viabilidade de Realização:** Os critérios verificáveis e as diretrizes de teste fornecem base inequívoca para que o Especialista em Planejamento da Realização elabore novo Plano de Realização e decomponha os Itens de Trabalho sob a nova baseline sem ambiguidades.

Conclui-se formalmente pela emissão do Resultado do Processo **`FORMACAO_SUFICIENTE`**, habilitando a transição de `EM_FORMACAO` para **`FORMADA`**.

### Handoff da auditoria

A Especificação readequada está validamente disponível e a `EV-001` transiciona para o status **`FORMADA`**. O próximo passo legítimo é o acionamento do **Especialista em Planejamento da Realização** para concepção do novo Plano de Realização alinhado à stack Node.js/TypeScript/PostgreSQL e materialização dos novos Itens de Trabalho.

