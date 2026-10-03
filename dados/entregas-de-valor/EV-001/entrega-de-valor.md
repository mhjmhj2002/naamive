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

Esta formação foi conduzida pelo Especialista em Formação da Entrega de Valor. Ela aprofunda a evolução delimitada sem alterar sua identidade, sua propriedade por M-001 nem sua fronteira de valor. O Status permanece `EM_FORMACAO`: a suficiência desta Especificação ainda depende de Auditoria independente.

### Evidências e classificação do contexto

| Informação | Classificação | Fundamentação e efeito na formação |
| --- | --- | --- |
| Valor, beneficiário, resultado observável e fronteira iniciais | Conhecido | Registro desta EV e [Mapa canônico de M-001](../../modulos/M-001/mapa-de-entregas-de-valor.md#ev-001--compromisso-da-necessidade). |
| Regras, responsabilidades e fronteira de M-001 | Conhecido | [Especificação Técnica de M-001](../../modulos/M-001/modulo.md#especificação-técnica-do-módulo), aprovada por `FORMACAO_SUFICIENTE`. |
| Compromisso de origem, autoridade humana e limitações da primeira jornada | Conhecido | [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade). |
| Uma aplicação única e modular atende inicialmente à evolução | Inferido | A primeira jornada é limitada e não há requisito documentado de escala, disponibilidade elevada ou integração externa; distribuir componentes aumentaria a complexidade sem benefício evidenciado. |
| Java 21, Spring Boot, PostgreSQL e interface web simples na mesma aplicação | Proposto | **Proposta inicial — Baseline Essencial**, limitada a esta EV; não é decisão herdada nem plataforma obrigatória para outras Entregas de Valor. |
| Persistência, identidade, transporte entre Módulos, concorrência e orquestração físicos | Desconhecido legítimo | Não há evidência para escolhê-los agora. Os contratos e invariantes abaixo orientam a realização sem tratá-los como fatos. |

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

**Fronteira confirmada.** A EV inclui registrar e atualizar a Necessidade, apoiar Formação, Auditoria e Qualificação, registrar a decisão do Owner, compor o Compromisso e disponibilizá-lo logicamente a M-002. Não inclui criar, formar ou auditar P-001; coordenar execução; definir ou operar mecanismos físicos; nem verificar software integrado. Não há evidência de intenção independente, sobreposição material ou Módulo proprietário incorreto; não há retorno ao Delimitador.

#### Proposta inicial — Baseline Essencial

**Solução de alto nível.** Uma aplicação principal em monólito modular realiza a primeira EV. O módulo interno de Condução da Necessidade preserva as regras de domínio e não depende de interface, protocolo, banco ou provedor de identidade. Adaptadores de entrada apresentam interface web e, quando necessário, API HTTP; adaptadores de saída tratam persistência, identidade do Owner, contexto de M-004 e o handoff lógico a M-002. A separação permite substituir detalhes físicos sem redesenhar as regras da EV.

| Componente lógico | Responsabilidade |
| --- | --- |
| Interface da Necessidade | Registrar, consultar e atualizar o conteúdo autorizado; apresentar posição, pendências e Compromisso disponível. |
| Aplicação de Condução | Orquestrar os casos de uso e validar pré-condições, sem assumir decisão humana ou parecer de Ator. |
| Domínio da Necessidade | Aplicar transições, separar estado de histórico, validar competência do resultado e compor o Compromisso após `APROVADO`. |
| Histórico e evidências | Associar atividade, Ator, resultado, recomendação, decisão, autoria e evidência à referência estável; M-004 é a dependência de preservação e recuperação compartilhada. |
| Porta de identidade do Owner | Exigir identidade autenticada identificável antes de registrar decisão material; o provedor permanece aberto. |
| Porta de bootstrap do Projeto | Emitir e recuperar solicitação idempotente para M-002, sem criar ou formar o Projeto. |

**Tecnologias propostas.** Java 21 e Spring Boot organizam a aplicação; PostgreSQL guarda o estado transacional e o histórico próprio da capacidade; migrações versionadas preservam a evolução do esquema. A interface web pode ser servida pela mesma aplicação, sem frontend separado nesta primeira EV. São escolhas desta proposta, não novas Entregas de Valor nem decisões de alcance superior aprovadas.

#### Dados, contratos e integrações

**Estado e dados mínimos.** A solução mantém uma referência estável para a Necessidade, conteúdo de negócio, único Status vigente, registros históricos imutáveis de atividade e evidência, Resultados do Processo, recomendações, decisão do Owner com identidade, visão derivada do Compromisso e solicitação idempotente para M-002. Esquema físico, tabelas e formatos de mensagem são decisões locais, desde que preservem essa separação.

**Contratos lógicos internos.** O mapeamento para HTTP, filas ou outros transportes não está decidido:

| Caso de uso | Pré-condição e efeito observável |
| --- | --- |
| Registrar ou atualizar Necessidade | Valida conteúdo permitido, preserva evidência e mantém a posição inicial ou vigente conforme regra aplicável. |
| Consolidar formação | Registra conteúdo formado, classificações e evidências, sem produzir parecer de Auditoria nem decisão humana. |
| Registrar parecer ou qualificação | Aceita somente conclusão de Ator competente e aplica a consequência normativa sem convertê-la em Status. |
| Registrar decisão do Owner | Exige identidade autenticada e posição elegível; registra decisão e autoria, sem simulá-las. |
| Disponibilizar Compromisso | Após `APROVADO`, compõe a visão consolidada e cria ou recupera a solicitação idempotente a M-002. |
| Consultar Necessidade e Compromisso | Retorna posição atual e, quando elegível, Compromisso com referências suficientes ao contexto. |

**Integrações e dependências.** M-004 preserva, recupera e correlaciona contexto; M-002 recebe exclusivamente o Compromisso e a solicitação lógica de bootstrap. Não há endpoint, fila, credencial, confirmação física, sincronismo ou mecanismo de repetição definido. A realização deve preservar o invariante `1 Necessidade aprovada → 1 Projeto`; decisão que afete outros Módulos ou EVs retorna ao nível competente.

#### Segurança, operação e riscos

**Segurança e confiabilidade.** Decisão humana material não é aceita sem identidade autenticada identificável. A aplicação valida entradas e transições antes de persistir, restringe alteração do histórico, evita segredos em logs e trata falhas de integração sem perder `APROVADO` nem duplicar o Projeto. TLS, autorização fina, criptografia, retenção, cópia de segurança, recuperação e provedor de identidade serão concretizados na realização conforme a tecnologia escolhida.

**Operação proposta.** Desenvolvimento local e produção são suficientes inicialmente. A construção executa migrações e testes automaticamente, produz artefato reproduzível, publica logs estruturados sem dados sensíveis, expõe verificação de saúde e mantém cópia de segurança restaurável. Não há requisito evidenciado para múltiplas regiões, alta disponibilidade, cache, fila, escalonamento horizontal ou microserviços.

**Custo técnico-operacional estimado.** Para produção inicial isolada, a referência é serviço web sempre ativo de 0,5 CPU e 512 MB e PostgreSQL gerenciado mínimo, em espaço Hobby do Render: aproximadamente **US$ 13/mês** antes de crescimento de armazenamento, tráfego excedente, domínio e impostos. A estimativa usa a [página de preços](https://render.com/pricing) e a [orientação do provedor](https://render.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses), consultadas em 03/10/2026; é premissa de proposta, não preço congelado. O plano gratuito é somente de teste. O custo aumenta com computação, armazenamento, tráfego ou mais ambientes; uma escolha de provedor, moeda em reais ou disponibilidade compartilhada deve ser decidida no nível competente.

| Risco ou lacuna | Classificação | Tratamento |
| --- | --- | --- |
| Decisão material sem identidade confiável | Bloqueante para decisão do Owner | A porta de identidade deve estar concretizada antes desse caso de uso em produção. |
| Confusão entre Status, histórico, resultado e decisão | Risco de integridade | Regras de domínio e testes de transição preservam representações separadas. |
| Falha ou repetição do handoff a M-002 | Risco de duplicação ou perda | Solicitação idempotente, confirmação recuperável e novo processamento seguro. |
| Contrato físico com M-002 e M-004 não definido | Desconhecido legítimo | Manter portas explícitas; decidir transporte, persistência compartilhada e repetição durante a realização. |
| Carga, disponibilidade, privacidade detalhada e retenção sem evidência | Desconhecido não bloqueante | Não introduzir infraestrutura avançada por antecipação; reavaliar se requisito concreto surgir. |

#### Critérios verificáveis e estratégia de testes

O resultado integrado deverá demonstrar, com uma Necessidade limitada, que:

1. uma pessoa registra e consulta Necessidade com posição atual distinguível de seu histórico;
2. resultado de Formação, Auditoria e Qualificação é associado ao Ator competente sem ser apresentado como Status;
3. tentativa de decisão material sem identidade autenticada ou fora de posição elegível não altera o estado;
4. decisão válida `APROVADO` produz Compromisso consultável e solicitação idempotente a M-002, sem criar o Projeto nesta capacidade;
5. repetição da solicitação não permite mais de um Projeto para a mesma Necessidade aprovada; e
6. evidências, decisão e vínculo de origem permanecem recuperáveis para explicar o percurso.

A realização combina testes unitários das regras de domínio, de integração da persistência e migrações, de contrato para as portas de M-002, M-004 e identidade, e ao menos um teste de ponta a ponta do fluxo de compromisso. Testes de segurança cobrem pré-condições de decisão humana e entradas inválidas. A futura Verificação confrontará software integrado, estes critérios e a declaração de valor; ela não é executada nesta Formação.

#### Justificativa de suficiência e handoff

A especificação preserva a origem `EV-001 → M-001 → P-001 → N-001`, fixa comportamento, invariantes, solução de alto nível, responsabilidades, dados, contratos lógicos, dependências, riscos e critérios necessários para decompor e realizar a EV sem redescobrir seu valor ou redesenhar sua arquitetura de alto nível. Rotas, tabelas, fornecedor de identidade e transporte permanecem decisões locais de realização, pois não alteram valor, contratos centrais ou regras estabelecidas.

Nenhuma decisão humana material irrecuperável foi identificada: a proposta é proporcional, não há alternativa de negócio aberta e decisões de maior alcance continuam explicitamente encaminhadas. Não foi produzido Resultado do Processo, mudança de Status, Work Item, software, teste de implementação ou evidência de verificação.

**Handoff:** esta Especificação, evidências, classificações, riscos e lacunas legítimas são entregues ao **Auditor da Entrega de Valor** para avaliação independente, mediante a Skill `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md`.

## Resultado do Processo — Auditoria independente

| Campo | Registro |
| --- | --- |
| Ator competente | Auditor da Entrega de Valor |
| Resultado do Processo | `FORMACAO_SUFICIENTE` |
| Status após a auditoria | `FORMADA` |

### Parecer independente

A Formação é suficiente para a futura realização de `EV-001` sem redescoberta do valor de negócio nem redesenho da solução técnica de alto nível.

A intenção de valor, o beneficiário e o resultado observável são coerentes com a capacidade aprovada de M-001 e com a cadeia `EV-001 → M-001 → P-001 → N-001`. A fronteira é finita e coesa: conduz a Necessidade até o Compromisso decidido pelo Owner e disponível a M-002, sem incorporar a materialização do Projeto, a coordenação posterior ou a verificação de software. O Mapa canônico e o registro principal concordam em identidade, código e Módulo proprietário; não há evidência de sobreposição material ou de problema estrutural de delimitação.

A Especificação torna explícitos o comportamento esperado, as regras de integridade, os dados e estados que precisam permanecer separados, os contratos lógicos com identidade do Owner, M-002 e M-004, a proposta de monólito modular e os critérios verificáveis. A proposta de Baseline Essencial está classificada como proposta restrita a esta EV; ela não é apresentada como decisão superior já aprovada. Riscos e desconhecidos relevantes — identidade concreta, transporte, persistência compartilhada, concorrência, orquestração, retenção e escala — têm fronteiras e tratamento explícitos. Eles não exigem redescoberta de valor ou arquitetura de alto nível: sua concretização pode ocorrer localmente na realização, preservando os contratos e invariantes definidos.

As evidências consideradas foram o registro e o Mapa de EV-001, a Especificação Técnica aprovada de M-001, a Direção formada de P-001, o Compromisso de N-001 e as normas de Entrega de Valor, incluindo o Catálogo de Baselines Técnicas. Não foi identificada lacuna de Formação, Delimitação ou nível superior que impeça o marco atual.

### Handoff da auditoria

A Especificação está disponível para futura Realização e `EV-001` alcança `FORMADA`. A vertical de Work Item, os mecanismos operacionais de início da Realização e o Ator executor correspondente ainda não estão definidos; portanto, esta auditoria não inicia Realização, não cria trabalho executável e encerra no handoff para a futura camada competente quando ela for materializada.
