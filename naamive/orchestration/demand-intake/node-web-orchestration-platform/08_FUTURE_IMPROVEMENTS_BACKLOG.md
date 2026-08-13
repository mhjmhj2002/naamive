# Backlog de Melhorias Futuras

## Objetivo

Registrar melhorias percebidas durante o uso e a validação da plataforma que não bloqueiam as fases planejadas. Este é um espaço de descoberta e priorização: uma entrada aqui não autoriza implementação nem altera o escopo da fase em andamento.

As melhorias devem ser analisadas após a conclusão das fases do roadmap, quando poderão ser promovidas a uma issue e, se aprovadas, a uma fase, incremento ou débito técnico planejado.

## Como registrar uma melhoria

Cada item deve conter:

- **Status:** `CAPTURED`, `UNDER_REVIEW`, `ACCEPTED`, `DECLINED` ou `PROMOTED`.
- **Contexto observado:** o que foi percebido e em qual situação.
- **Problema ou oportunidade:** por que vale tratar o tema.
- **Proposta inicial:** direção de solução, sem obrigar desenho definitivo.
- **Valor esperado:** benefício para usuário, operação, segurança ou manutenção.
- **Impacto nas fases atuais:** explicitar por que não bloqueia o plano vigente.
- **Perguntas para decisão futura:** pontos que precisam de debate antes de priorizar.

## Itens capturados

### M-001 — Diagnóstico e preparação do ambiente do agente Codex

- **Status:** `CAPTURED`
- **Contexto observado:** a configuração do adaptador real depende de variáveis como `NAAMIVE_CODEX_COMMAND`, `NAAMIVE_CODEX_WORKDIR`, timeout, retries e heartbeat. Uma configuração aparentemente válida pode falhar somente quando o primeiro job é executado — por exemplo, quando o diretório-base de trabalho não existe.
- **Problema ou oportunidade:** o operador descobre erros operacionais tarde, após abrir uma operação de descoberta. Além disso, configurações declaradas mas não aplicadas pelo worker podem gerar expectativa incorreta durante a operação.
- **Proposta inicial:** adicionar uma verificação de prontidão do agente, executável por comando e exposta de forma segura na interface local. Ela deve validar: disponibilidade do comando Codex, existência e permissões do diretório de trabalho, interpretação numérica de timeout/retries/heartbeat e compatibilidade do adaptador selecionado. A tela deve indicar claramente o que está configurado, o que foi validado e o que não é aplicado pela versão em execução. Avaliar também a renovação periódica real do lease conforme `NAAMIVE_AGENT_HEARTBEAT_SECONDS`.
- **Valor esperado:** falhas previsíveis aparecem antes da abertura de um job; menor tempo de diagnóstico; maior confiança no uso do adaptador real e melhor base para múltiplos workers.
- **Impacto nas fases atuais:** não bloqueia as fases, pois o ambiente pode ser preparado manualmente e a execução controlada continua disponível para testes de aceitação.
- **Perguntas para decisão futura:** a verificação deve apenas reportar ou também criar diretórios ausentes? O diagnóstico deve poder executar um smoke test do Codex? Qual política de lease deve valer quando houver mais de um worker?

### M-002 — Área de proposta e documentos do projeto

- **Status:** `CAPTURED`
- **Contexto observado:** ao selecionar um projeto, a interface mostra o título, a próxima ação e a linha do tempo. A necessidade/proposta inicial preenchida na criação não fica disponível para consulta no detalhe. Conforme o fluxo avança, também poderão existir artefatos de validação, análise e requisitos, sem uma área clara para o usuário encontrá-los e lê-los.
- **Problema ou oportunidade:** o stakeholder não consegue revisar facilmente o que foi solicitado nem acompanhar o conteúdo que fundamenta decisões do projeto. A linha do tempo informa que algo ocorreu, mas não substitui a leitura da proposta e das evidências produzidas.
- **Proposta inicial:** acrescentar no detalhe do projeto seções colapsáveis ou abas para: (1) **Proposta inicial**, com todos os campos submetidos no intake e sua revisão vigente; e (2) **Documentos e evidências**, listando artefatos disponíveis com tipo, data/hora, etapa de origem, integridade/versão e ação de visualização. Usar visualização HTML/Markdown ou JSON formatado quando aplicável. Avaliar uma ação explícita de **Exportar para PDF** para a proposta e, posteriormente, para um dossiê consolidado do projeto.
- **Valor esperado:** aumenta transparência, facilita revisão por stakeholders, reduz a necessidade de buscar informações no banco ou diretório de artefatos e melhora a apresentação da plataforma como produto.
- **Impacto nas fases atuais:** não bloqueia o fluxo de criação, validação, descoberta ou arquivamento; os dados e artefatos já existem como base para uma futura experiência de consulta.
- **Perguntas para decisão futura:** quem pode acessar/baixar cada artefato? O PDF deve retratar somente a proposta, cada documento individual ou um dossiê completo? A geração será sob demanda ou armazenará uma versão imutável assinada por hash? Quais formatos poderão ser exibidos diretamente na interface?

### M-003 — Progresso confiável e previsão de duração de etapas assíncronas

- **Status:** `CAPTURED`
- **Contexto observado:** etapas executadas por agentes, como análise de necessidade, podem levar minutos e variar conforme o repositório, o serviço externo e tentativas. A tela hoje informa apenas o estado e a duração; o operador não sabe se o processo está saudável, qual marco já foi atingido ou por quanto tempo ainda é razoável aguardar.
- **Problema ou oportunidade:** uma barra percentual sem medida real induz confiança indevida. Por outro lado, somente um spinner ou estado estático faz uma operação saudável parecer travada e não orienta quando investigar ou recuperar uma falha.
- **Proposta inicial:** adotar um componente de progresso híbrido, baseado em sinais reais:
  1. **Marcos determinísticos:** `aceito`, `job adquirido`, `agente iniciado`, `evidência recebida`, `etapa concluída` e `próxima etapa enfileirada` — cada um derivado de evento persistido.
  2. **Enquanto o agente executa:** indicador indeterminado, tempo decorrido, último heartbeat e limite configurado da etapa; nunca exibir percentual artificial.
  3. **Previsão opcional:** após acumular amostras suficientes e comparáveis por tipo de job, mostrar uma faixa, por exemplo “normalmente 1–3 min; limite desta tentativa: 90 s”. A previsão deve usar mediana e intervalo de percentis de execuções concluídas, identificar a amostra e desaparecer quando a base for insuficiente.
  4. **Sinais de atenção:** destacar heartbeat vencido, retry, timeout e falha com hora precisa e ação recomendada, substituindo a previsão por diagnóstico.
  5. **Acessibilidade:** texto equivalente para leitores de tela, atualização não intrusiva e não depender exclusivamente de cor ou animação.
- **Valor esperado:** reduz ansiedade e cliques repetidos, torna atraso observável, estabelece expectativa honesta de duração e melhora a percepção de qualidade operacional sem falsear progresso.
- **Impacto nas fases atuais:** não bloqueia o workflow, pois os eventos, timestamps, jobs e limites já fornecem a base mínima. A previsão histórica depende de coleta adicional e deve entrar após estabilização do adaptador real.
- **Perguntas para decisão futura:** qual número mínimo de execuções torna uma previsão apresentável? Devemos separar histórico por adaptador/modelo/repositório? A faixa deve considerar retries? Onde guardar agregados sem misturar telemetria operacional com evidência auditável do projeto?

### M-004 — Ciclo de melhoria orientado por observabilidade

- **Status:** `CAPTURED`
- **Contexto observado:** diagnósticos recentes exigiram inspeção manual de banco, processos e reprodução de comandos externos porque o sistema registrava somente o resultado final genérico, e não os sinais que explicavam a falha.
- **Proposta inicial:** adotar como regra de engenharia: toda ocorrência deve perguntar “qual sinal teria identificado esta causa sem investigação manual?”. Se o sinal puder ser produzido com segurança, a correção inclui log, métrica, evento, projeção ou teste correspondente. A issue deve separar claramente causa de domínio, causa de ambiente e lacuna de observabilidade; a lacuna só pode ser adiada quando não bloquear a recuperação segura.
- **Valor esperado:** cada incidente deixa o sistema mais diagnosticável, reduz repetição de análise manual e melhora a autonomia do operador.
- **Impacto nas fases atuais:** a regra orienta correções futuras sem transformar toda descoberta em reescrita imediata; lacunas que bloqueiem diagnóstico ou recuperação seguem o fluxo normal de issue bloqueante.
- **Perguntas para decisão futura:** quais sinais mínimos são obrigatórios por integração externa? Como medir redução de tempo de diagnóstico? Quando um log deve virar métrica, alerta ou item de interface?

### M-005 — Semântica visual de eventos na linha do tempo

- **Status:** `CAPTURED`
- **Contexto observado:** a linha do tempo apresenta eventos técnicos em uma aparência uniforme. Durante a operação, o usuário precisa percorrer texto e datas para perceber se algo terminou bem, falhou, está sendo processado ou requer uma decisão humana.
- **Problema ou oportunidade:** uma timeline sem hierarquia visual reduz a leitura de relance e dificulta identificar rapidamente onde está a responsabilidade pela próxima ação, sobretudo em fluxos com retry, rework e vários jobs consecutivos.
- **Proposta inicial:** criar uma classificação visual centralizada por significado operacional — e não por CSS associado individualmente a cada evento — e aplicá-la aos itens da timeline com fundo suave, borda/ícone e rótulo textual:
  1. **Verde:** conclusão ou sucesso, como validação, análise, requisitos, revisão aprovada e registro.
  2. **Amarelo:** processamento, retry ou ajuste em andamento.
  3. **Vermelho:** falha, rejeição, interrupção ou arquivamento.
  4. **Azul:** aguardando decisão, aprovação ou retorno humano; indica explicitamente que a próxima ação é do operador.
  5. **Cinza:** evento técnico ou informativo sem ação necessária.
  Eventos novos devem receber uma categoria por um mapeamento único, com fallback cinza, evitando estilos improvisados e mantendo consistência.
- **Valor esperado:** permite leitura rápida do estado operacional, torna decisões humanas mais visíveis e melhora a apresentação da plataforma sem alterar o ledger ou simular progresso.
- **Impacto nas fases atuais:** não bloqueia o workflow nem altera eventos persistidos; é uma projeção visual sobre a timeline canônica já disponível.
- **Perguntas para decisão futura:** o mapeamento deve ficar no frontend ou ser exposto pela projeção da API? Quais ícones serão usados sem depender só de cor? A preferência de contraste/alto contraste deve ser configurável pelo operador?

### M-006 — Validação independente e iterativa do planejamento de produto

- **Status:** `CAPTURED`
- **Contexto observado:** no planejamento da Fase 3, um agente produziu o plano e uma revisão independente identificou lacunas de contrato, integração, recuperação e testes. Os achados foram incorporados em rodadas sucessivas até que a revisão não encontrasse inconsistências materiais. No fluxo atual de descoberta do Naamive, há análise, requisitos e revisão, mas a revisão ainda não recebe explicitamente o artefato de planejamento como objeto canônico de auditoria nem opera como papel independente com findings estruturados.
- **Problema ou oportunidade:** uma proposta pode chegar ao gate de compromisso com ambiguidades, dependências incompletas ou critérios não verificáveis. Sem separar produtor e validador, registrar o artefato revisado e medir aderência por rubrica, o sistema não distingue com clareza “planejamento produzido” de “planejamento suficientemente validado”.
- **Proposta inicial:** promover um incremento/fase futura de **Validação Independente do Planejamento**. Após `DEFINE_PRODUCT_REQUIREMENTS`, o runtime entrega ao **Agente de Validação Independente do Planejamento** o `product-requirements` imutável, suas evidências de entrada e a rubrica versionada aplicável. O agente não altera o plano: produz `planning-validation-report` estruturado, com achados, severidade, referência ao requisito/trecho auditado, ação recomendada, resultado e pontuação de aderência de 0 a 100. A pontuação representa somente a cobertura da rubrica publicada — por exemplo, completude, consistência interna, rastreabilidade ao intake, critérios de sucesso verificáveis, riscos/dependências e limites de escopo — e não uma alegação genérica de qualidade ou de verdade do produto.
- **Limiar e fluxo propostos:** o limiar inicial é **90%**, configurável por ambiente/política versionada (por exemplo, `NAAMIVE_PLANNING_VALIDATION_MIN_SCORE=90`). Abaixo do limiar, ou com achado bloqueante, o workflow abre checkpoint de ajuste humano e retorna ao planejamento com feedback e referências auditáveis; não abre o gate de compromisso. No limiar ou acima, sem achado bloqueante, o relatório torna o plano elegível ao gate humano `PRODUCT_COMMITMENT`, sem aprová-lo automaticamente. Cada rodada preserva plano, relatório, versão da rubrica, limiar usado, correlação e hashes; revalidação sempre audita a nova revisão do plano.
- **Valor esperado:** aumenta a qualidade verificável do planejamento, reduz descoberta tardia de riscos e cria um ciclo explícito de produtor → validador independente → ajuste → revalidação → decisão humana. Também torna a revisão reproduzível em testes controlados e auditável pelo operador na web.
- **Impacto nas fases atuais:** não bloqueia as fases em andamento, pois a Fase 2 já possui revisão, ajustes humanos e gate de compromisso. Este item amplia o contrato para tornar a revisão independente, orientada por artefato e mensurável; deve ser planejado sem alterar retroativamente workflows publicados.
- **Perguntas para decisão futura:** a independência exige modelo/identidade/configuração distinta ou basta papel/prompt isolado e ausência de escrita no plano? Quais dimensões e pesos compõem a rubrica v1? Quais severidades são bloqueantes independentemente da pontuação? O limiar é global, por tipo de projeto ou por nível de risco? Como evitar otimização artificial da pontuação e como apresentar score, achados e incerteza sem induzir falsa precisão?

### M-007 — Sugestões contextuais para completar uma proposta de módulo

- **Status:** `CAPTURED`
- **Contexto observado:** na revisão de uma proposta de módulo, o operador recebeu feedback para informar itens fora de escopo, dependências e critérios de aceite. Os campos estavam vazios, embora o intake aprovado já contivesse problema de negócio, resultado desejado, métricas de sucesso, stakeholders e questões em aberto que permitiam formular um ponto de partida consistente.
- **Problema ou oportunidade:** o operador precisa buscar ou interpretar manualmente o contexto do projeto para completar a proposta. Isso aumenta a chance de campos genéricos, inconsistentes com a necessidade aprovada ou simplesmente esquecidos em revisões posteriores.
- **Proposta inicial:** na tela de criação e, principalmente, de ajuste de proposta de módulo, exibir sugestões editáveis e pré-preenchidas para `scope`, `out_of_scope`, `dependencies` e `acceptance_criteria`. As sugestões devem ser derivadas somente de fatos já aprovados ou registrados no projeto — intake, requisitos, baseline aprovada e feedback do gate — e indicar sua origem. O operador continua responsável por revisar, alterar ou remover cada sugestão antes de reenviar; nenhuma sugestão deve ser persistida automaticamente nem apresentada como requisito aprovado.
- **Valor esperado:** reduz atrito para responder ao feedback, melhora a rastreabilidade entre necessidade, escopo e critérios de aceite, e aumenta a qualidade da primeira revisão sem retirar a decisão humana.
- **Impacto nas fases atuais:** não bloqueia o fluxo vigente de revisão e reenvio; os campos já podem ser preenchidos manualmente e os dados-fonte já existem no projeto.
- **Perguntas para decisão futura:** quais fontes têm precedência quando divergirem? Como distinguir visualmente sugestão, conteúdo aprovado e conteúdo digitado pelo operador? As sugestões devem ser recalculadas a cada revisão ou congeladas junto com a revisão anterior para auditoria?

## Processo de revisão posterior

1. Revisar os itens `CAPTURED` e confirmar se o problema ainda existe.
2. Priorizar por valor, risco e dependências técnicas.
3. Mudar o status para `ACCEPTED` ou `DECLINED`, registrando a decisão.
4. Quando houver escopo suficiente para execução, abrir uma issue detalhada, referenciar seu identificador aqui e mudar o item para `PROMOTED`.
