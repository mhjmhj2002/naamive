# EV-003 — Coordenação do Trabalho Preparado

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `b06d5c8e-f9d1-457b-8880-87305dc3aca6` |
| Código | `EV-003` |
| Módulo proprietário | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `EM_REALIZACAO` |

## Delimitação inicial

* **Item canônico:** [EV-003 no Mapa de Entregas de Valor de M-003](../../modulos/M-003/mapa-de-entregas-de-valor.md#ev-003--coordenação-do-trabalho-preparado)
* **Declaração de valor:** permitir que o operador ou usuário conduza o avanço do trabalho do projeto a partir do reconhecimento legítimo do próximo avanço válido, verificando as condições de preparação, a competência e o Ator/Skill necessários, e emitindo handoff com contexto recuperável suficiente sem reconstrução manual.
* **Beneficiário relevante:** o operador da jornada, os Atores executores e o Owner que acompanha a progressão contínua e legítima do trabalho.
* **Resultado observável esperado:** dado um trabalho originado da Direção do Projeto ou de capacidade habilitada, o sistema reconhece suas dependências e estado de preparação; identifica a competência, Ator e Skill requeridos; disponibiliza a composição do handoff de despacho com referências recuperáveis; e reflete as condições operacionais (preparado, bloqueado, em execução, aguardando decisão humana) sem exigir reconstrução manual do percurso.
* **Dentro da fronteira:** avaliação de condições de preparação e critérios de elegibilidade do próximo avanço válido; encadeamento competência → Ator → Skill; preparação do handoff lógico com referências recuperáveis e critérios observáveis de término; acompanhamento de retornos e condições operacionais; explicitação de dependências, bloqueios e pendências de decisão humana do fluxo; consulta e inspeção da coordenação via interface e adaptadores.
* **Fora da fronteira:** tomar decisão humana soberana pelo Owner; prover repositório e infraestrutura transversal de histórico/busca física (M-004); atestar e verificar substantivamente resultado final de software (M-005); alterar a Direção do Projeto (M-002); formar ou qualificar a Necessidade (M-001).
* **Dependências, relações e incertezas relevantes:** depende da Direção do Projeto fornecida por M-002; depende conceitualmente de referências recuperáveis a serem preservadas por M-004; seleção física de executores e políticas de runtime de agentes permanecem como incógnitas proporcionais a serem especificadas na formação técnica.

## Formação da Entrega de Valor

Esta formação é conduzida pelo **Especialista em Formação da Entrega de Valor** a partir da delimitação canônica e da Especificação Técnica aprovada de [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md#especificação-técnica-do-módulo), em estrita observância à Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL, Web responsiva e Worker desacoplado).

### Evidências e classificação do contexto

| Informação | Classificação | Fundamentação e efeito na formação |
| --- | --- | --- |
| Valor, beneficiário, resultado observável e fronteira iniciais | Conhecido | Registro canônico desta EV no [Mapa de Entregas de Valor de M-003](../../modulos/M-003/mapa-de-entregas-de-valor.md#ev-003--coordenação-do-trabalho-preparado) e no item de delimitação acima. |
| Regras, modelo e responsabilidades de M-003 | Conhecido | [Especificação Técnica de M-003](../../modulos/M-003/modulo.md#especificação-técnica-do-módulo), aprovada formalmente por `FORMACAO_SUFICIENTE`. |
| Arquitetura e Stack do NAAMIVE | Conhecido / Decisão Material do Owner | Node.js (TypeScript) com PostgreSQL, camada web responsiva com Bootstrap 5 e worker desacoplado em background para processamento contínuo. |
| Teste primário da N-001 | Conhecido | "Dado um trabalho declarado pronto, deve ser possível delegá-lo por meio de uma instrução simples, sem que uma pessoa precise reconstruir manualmente todo o contexto necessário para sua execução." |
| Direção do Projeto P-001 | Conhecido | [Direção do Projeto P-001](../../projetos/P-001/projeto.md#direção-do-projeto), aprovada por `FORMACAO_SUFICIENTE` e homologada pelo Owner na EV-002. |
| Invariante de encadeamento de competência | Conhecido | `necessidade de execução → responsabilidade necessária → Ator especializado → Skill principal correspondente → Executor compatível`. |
| Infraestrutura e esquemas existentes (EV-001 e EV-002) | Conhecido | Tabelas `necessidades`, `projetos`, `etapas_formacao_projeto`, `auditorias_projeto`, `direcoes_projeto`, `tarefas_segundo_plano` e `eventos_dominio` no PostgreSQL. |
| Seleção física e catálogo global de executores | Desconhecido legítimo | A coordenação define o contrato lógico de compatibilidade e explicita a lacuna de despacho quando não houver executor compatível, sem impor um catálogo físico rígido nesta formação. |

### Especificação da Entrega de Valor

#### Valor, comportamento e fronteira refinados

**Declaração de valor.** Permitir que o operador da jornada e o Owner conduzam o avanço do trabalho do projeto reconhecendo de forma auditável e automática o próximo avanço válido, verificando as condições de preparação, associando a competência, Ator e Skill requeridos, emitindo o handoff com contexto recuperável suficiente para execução sem reconstrução manual e acompanhando as condições operacionais do fluxo de coordenação.

**Jornada e Fluxos relevantes:**
1. **Identificação e Avaliação do Próximo Avanço Válido:** A partir da Direção do Projeto aprovada (P-001) e das capacidades habilitadas pelos Módulos, o sistema identifica os trabalhos candidatos. Para cada trabalho, avalia as pré-condições: vinculação à Direção vigente, ausência de bloqueios por dependências não satisfeitas, ausência de decisões humanas pendentes e completude do contexto de entrada. O trabalho que satisfaz integralmente os critérios é qualificado como *Trabalho Preparado* e elegível como próximo avanço válido.
2. **Encadeamento de Especialização (Competência → Ator → Skill → Executor):** Para o trabalho preparado, a coordenação identifica a responsabilidade funcional necessária, mapeia o Ator agêntico especializado correspondente, indica a Skill principal canônica (ex.: `.agents/skills/.../SKILL.md`) e valida se há Executor compatível registrado ou disponível. Se faltar Skill ou Executor, o trabalho é marcado na condição operacional `BLOQUEADO` com a lacuna explicitada para tratamento competente.
3. **Composição e Emissão Idempotente do Handoff:** Quando o operador solicita o despacho do próximo avanço válido (ou via instrução simples de delegação), o sistema compõe o artefato lógico de handoff. O handoff contém: identificador estável do trabalho, objetivo e responsabilidade, referências ao contexto de origem recuperável (Necessidade, Projeto, Módulo, EV e baselines), dependências verificadas, decisões consolidadas, critérios observáveis de término e destino esperado do retorno. A emissão do handoff registra a transição da condição operacional para `EM_EXECUCAO` e gera token de correlação único para prevenir despachos concorrentes incompatíveis.
4. **Recepção de Retorno e Reconciliação do Fluxo:** Ao receber o retorno de uma execução (sucesso, falha ou bloqueio), a coordenação valida a correlação com o handoff emitido e confronta os resultados reportados com os critérios observáveis de término. Se consistente, a condição é atualizada para `ENCERRADO` e o próximo avanço do fluxo é recalculado. Se inconsistente ou omisso, o avanço é suspenso com registro das divergências.
5. **Tratamento de Pendência de Decisão Humana:** Quando um trabalho necessita de decisão humana material soberana do Owner, a coordenação suspende estritamente o avanço dependente, marcando-o na condição `AGUARDANDO_DECISAO_HUMANA`, sintetiza o contexto e o dilema para o Owner e mantém os trabalhos independentes aptos a progredir.
6. **Inspeção e Gestão Operacional via Camada Web:** O operador e o Owner inspecionam o painel de coordenação do trabalho (`/coordenacao` e `/coordenacao/trabalhos/:id`), visualizando a fila de trabalhos preparados, trabalhos em execução, bloqueios ativos, pendências humanas, handoffs emitidos e histórico de retornos.

**Regras de negócio e integridade:**
1. **Separação entre Condição Operacional e Status Normativo:** As condições operacionais de coordenação (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`) são estados de fluxo de trabalho do motor de coordenação e não se confundem com o catálogo oficial de Status normativos de entidades como Entrega de Valor ou Projeto.
2. **Idempotência de Despacho e Retorno:** A repetição do envio de um handoff ou o recebimento de retorno duplicado não cria execuções paralelas nem promove o fluxo duas vezes.
3. **Invariante de Especialização:** Nenhum trabalho pode ser despachado sem a associação explícita de seu Ator competente e Skill correspondente. É vedada a emissão de handoff para agentes genéricos desprovidos de especialização.
4. **Suficiência Recuperável de Contexto:** O handoff não deve copiar integralmente todo o histórico da base de dados, mas deve conter referências canônicas estáveis suficientes para que o executor recupere o contexto necessário sem reconstrução manual externa.

**Fronteira confirmada.** A EV-003 compreende a avaliação de preparação, identificação do próximo avanço válido, mapeamento Ator/Skill, composição/emissão de handoff com contexto recuperável, acompanhamento de condições operacionais, reconciliação de retornos e visualização web do fluxo de coordenação. Permanece fora da fronteira: tomar decisões humanas soberanas pelo Owner; prover infraestrutura global de busca ou telemetria física (M-004); atestar e verificar substantivamente resultado de software de capacidades posteriores (M-005); e implementar código de outros módulos.

#### Arquitetura e Decisões Técnicas

A solução de alto nível segue rigorosamente a Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL relacional, camada web responsiva com Bootstrap 5 e Worker desacoplado em background):

* **Runtime e Linguagem:** Node.js com TypeScript, preservando tipagem estática rigorosa e arquitetura hexagonal de portas e adaptadores.
* **Persistência Relacional (PostgreSQL):** Esquema relacional estruturado para suportar o ciclo de coordenação, garantindo integridade referencial com os projetos existentes (`projetos(id)`), transações atômicas e isolamento contra concorrência via locks transacionais (`SELECT ... FOR UPDATE` ou índices únicos de correlação).
* **Núcleo de Domínio:** Entidades puras `TrabalhoCoordenado`, `HandoffCoordenacao`, `RetornoCoordenacao` e o serviço de domínio `MotorCoordenacaoTrabalho` para avaliar preparação e calcular o próximo avanço válido.
* **Worker em Background:** Tarefas assíncronas contínuas para avaliar periodicamente a liberação de dependências, verificar timeouts operacionais de handoffs em execução e reconciliar retornos enfileirados.
* **Camada Web Responsiva:** Páginas HTML renderizadas no servidor com templates Bootstrap 5 dedicadas à Coordenação do Trabalho (`/coordenacao`), permitindo ao operador disparar o próximo avanço com um clique ("Delegar Próximo Avanço"), inspecionar o handoff gerado e visualizar pendências do fluxo.

| Componente Lógico | Responsabilidade Técnica |
| --- | --- |
| `DominioCoordenacao` | Entidades puras, regras de preparação de trabalho, encadeamento Ator/Skill, cálculo do próximo avanço válido e validação de critérios de término. |
| `MotorCoordenacaoTrabalho` | Serviço de domínio que avalia a elegibilidade dos trabalhos, reconcilia dependências e emite o handoff lógico. |
| `RepositorioCoordenacaoPostgres` | Persistência relacional no PostgreSQL com integridade referencial, histórico imutável de handoffs e retornos. |
| `ServicoAplicacaoCoordenacao` | Orquestração dos casos de uso de coordenação, despacho de handoffs e recepção de retornos. |
| `WorkerCoordenacao` | Processamento assíncrono em background para reavaliação de dependências e monitoramento contínuo das condições operacionais. |
| `InterfaceWebCoordenacao` | Rotas HTTP (`/coordenacao`, `/coordenacao/trabalhos/:id`, `/coordenacao/handoffs/:id`) e templates responsivos para gestão e inspeção visual do fluxo. |

#### Dados, contratos e integrações

**Modelo de Dados Relacional (PostgreSQL):**
- Tabela `trabalhos_coordenados`:
  - `id UUID PRIMARY KEY`: Identificador técnico do trabalho.
  - `codigo VARCHAR(50) NOT NULL UNIQUE`: Código de referência do trabalho (ex.: `TC-001`).
  - `projeto_id UUID NOT NULL REFERENCES projetos(id)`: Vínculo ao Projeto de origem.
  - `titulo VARCHAR(255) NOT NULL`: Nome do trabalho.
  - `objetivo TEXT NOT NULL`: Objetivo e responsabilidade especializada.
  - `condicao_operacional VARCHAR(50) NOT NULL`: `POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`.
  - `competencia_requerida VARCHAR(100) NOT NULL`: Competência técnica exigida.
  - `ator_requerido VARCHAR(100) NOT NULL`: Ator agêntico ou humano competente.
  - `skill_requerida VARCHAR(255)`: Caminho canônico da Skill correspondente (ou nulo para humano).
  - `executor_designado VARCHAR(100)`: Identificador do executor atribuído (ou nulo se pendente).
  - `criterio_termino TEXT NOT NULL`: Critério observável de término da execução.
  - `dependencias JSONB NOT NULL DEFAULT '[]'::jsonb`: Lista de códigos de trabalhos que devem estar `ENCERRADO`.
  - `motivo_bloqueio TEXT`: Descrição do motivo quando a condição for `BLOQUEADO` ou `AGUARDANDO_DECISAO_HUMANA`.
  - `criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
  - `atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
- Tabela `handoffs_coordenacao`:
  - `id UUID PRIMARY KEY`: Identificador técnico v4.
  - `trabalho_id UUID NOT NULL REFERENCES trabalhos_coordenados(id)`.
  - `token_correlacao VARCHAR(100) NOT NULL UNIQUE`: Token único de rastreabilidade.
  - `ator_destinatario VARCHAR(100) NOT NULL`.
  - `skill_destinataria VARCHAR(255)`.
  - `conteudo_handoff JSONB NOT NULL`: Pacote com referências recuperáveis (Necessidade, Projeto, Módulo, EV, critérios).
  - `despachado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
- Tabela `retornos_coordenacao`:
  - `id UUID PRIMARY KEY`: Identificador do retorno.
  - `handoff_id UUID NOT NULL REFERENCES handoffs_coordenacao(id)`.
  - `sucesso BOOLEAN NOT NULL`: Indicador de sucesso da execução.
  - `resultado_observavel TEXT NOT NULL`: Descrição do resultado ou evidências produzidas.
  - `pendencias_ou_bloqueios TEXT`: Detalhamento de problemas ou decisão humana necessária.
  - `recebido_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.

**Contratos lógicos de casos de uso:**
1. `avaliarElegibilidadeTrabalhos(projetoId: string): Promise<ResultadoAvaliacaoElegibilidade>`
2. `obterProximoAvancoValido(projetoId: string): Promise<TrabalhoCoordenado | null>`
3. `despacharProximoAvanco(trabalhoId: string, executorId?: string): Promise<HandoffEmitido>`
4. `registrarRetornoExecucao(tokenCorrelacao: string, retorno: DadosRetorno): Promise<ResultadoProcessamentoRetorno>`
5. `listarTrabalhosCoordenados(projetoId: string): Promise<VisaoTrabalhosCoordenacao>`
6. `obterDetalhesTrabalho(trabalhoId: string): Promise<DetalheTrabalhoCoordenado>`

#### Segurança, operação e riscos

| Risco / Lacuna | Classificação | Mitigação Técnica |
| --- | --- | --- |
| Despacho concorrente do mesmo trabalho | Risco de concorrência | Transação atômica em PostgreSQL com restrição de chave única no token de correlação e atualização condicional (`UPDATE ... WHERE condicao_operacional = 'PREPARADO'`). |
| Perda de contexto do handoff | Risco de rastreabilidade | Persistência estruturada em `JSONB` no PostgreSQL contendo as URLs e referências estáveis aos artefatos de governança. |
| Inexistência de Executor agêntico autônomo físico | Desconhecido legítimo / Limite operacional | O sistema emite e disponibiliza o handoff completo na tela e API para que o operador humano ou o orquestrador despache o agente sem perda de contexto, registrando a lacuna de seleção caso o executor não seja pré-definido. |
| Decisão humana não identificada | Risco de governança | Exigência da identidade autenticada do Owner (`mhj`) para qualquer destravamento de pendência em `AGUARDANDO_DECISAO_HUMANA`. |

#### Critérios verificáveis e estratégia de testes

O software integrado resultante da realização técnica da `EV-003` demonstrará conclusivamente que:
1. **Reconhecimento do Próximo Avanço Válido:** A partir de uma lista de trabalhos de um projeto com dependências declaradas, o motor identifica com precisão qual trabalho satisfaz os critérios de preparação e o elege como o próximo avanço válido.
2. **Encadeamento de Especialização:** Cada trabalho preparado aponta inequivocamente a competência requerida, o Ator especializado e o link para a Skill canônica em `.agents/skills/`.
3. **Composição e Emissão de Handoff com Contexto Recuperável:** Ao solicitar o despacho do próximo avanço válido, o sistema gera o handoff estruturado com referências a N-001, P-001, critérios observáveis de término e token de correlação, transicionando a condição operacional para `EM_EXECUCAO`.
4. **Reconciliação e Liberação de Dependências:** O registro de retorno bem-sucedido encerra o trabalho executado e reavalia automaticamente os trabalhos dependentes, transicionando os trabalhos aptos para `PREPARADO`.
5. **Tratamento de Bloqueios e Decisões Humanas:** Trabalhos que dependem de decisão soberana do Owner são isolados em `AGUARDANDO_DECISAO_HUMANA` com exibição clara da pendência, sem bloquear trabalhos paralelos independentes.
6. **Interface Web Responsiva e Acompanhamento:** A camada web responsiva em Bootstrap 5 (`/coordenacao`) permite ao operador inspecionar o fluxo em tempo real, disparar o despacho com um clique e consultar os handoffs emitidos.

**Estratégia de Testes:**
- Testes unitários do domínio para o motor de elegibilidade, transições de condições operacionais e geração de handoffs.
- Testes de integração PostgreSQL (via `pg-mem` e banco real) validando transações, persistência de handoffs/retornos e integridade referencial com projetos.
- Testes de serviço de aplicação simulando o ciclo completo: preparação → despacho → execução simulada → retorno → liberação do próximo avanço.
- Testes web responsivos das novas rotas HTTP de coordenação.

#### Custo técnico-operacional

A proposta técnica opera integralmente dentro da infraestrutura já provisionada do NAAMIVE (Node.js com TypeScript e PostgreSQL). Não há necessidade de contratação de serviços externos de fila, bancos adicionais ou brokers gerenciados neste estágio. O custo incremental mensal de infraestrutura é **zero**, mantendo o baixo custo total de propriedade e a conformidade com a Baseline Essencial.

#### Justificativa de suficiência e handoff

A Especificação da `EV-003` consolida com precisão o lado de produto e a solução técnica de alto nível, preservando a rastreabilidade `EV-003 → M-003 → P-001 → N-001`, a compatibilidade com a stack oficial e os critérios verificáveis necessários para o planejamento e decomposição da futura realização técnica sem necessidade de redescoberta do valor de negócio nem redesenho arquitetural.

## Handoff da formação

A Especificação consolidada da **EV-003 — Coordenação do Trabalho Preparado** foi finalizada pelo **Especialista em Formação da Entrega de Valor** e entregue ao **Auditor da Entrega de Valor** para avaliação independente da formação, conforme estabelecido em `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md` e `documentacao/entrega-de-valor/04_FORMACAO_DA_ENTREGA_DE_VALOR.md`.

## Resultado do Processo — Auditoria independente

| Campo | Registro |
| --- | --- |
| Ator competente | Auditor da Entrega de Valor |
| Resultado do Processo | `FORMACAO_SUFICIENTE` |
| Status após a auditoria | `FORMADA` |

### Parecer independente

O **Auditor da Entrega de Valor** realizou a avaliação independente da Especificação da `EV-003 — Coordenação do Trabalho Preparado`, confrontando proporcionalmente a intenção de valor, beneficiário, resultado observável, fronteiras, aderência à capacidade do Módulo proprietário (M-003), cadeia de origem causal, dependências, critérios verificáveis, solução técnica de alto nível, contratos de dados e decisões de arquitetura:

1. **Aderência à Capacidade de M-003 e Origem Causal:** A EV-003 materializa a capacidade nuclear e a responsabilidade de [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) (avaliação de condições de preparação, identificação do próximo avanço válido, encadeamento de competência/Ator/Skill, composição/emissão idempotente de handoffs com contexto recuperável e acompanhamento operacional). Não invade as fronteiras de decisão humana do Owner, de histórico transversal (M-004) ou de verificação final de software (M-005).
2. **Conformidade com a Arquitetura e Stack Oficial:** A especificação adota com rigor a Decisão Material do Owner de Arquitetura e Stack (Node.js com TypeScript em arquitetura hexagonal, PostgreSQL relacional com transações atômicas e restrições de integridade, Worker assíncrono em background e interface web responsiva com Bootstrap 5). O custo de infraestrutura incremental permanece zero, alinhado à Baseline Essencial.
3. **Invariantes e Integridade de Domínio:** O invariante nuclear de especialização (`necessidade de execução → responsabilidade necessária → Ator especializado → Skill principal correspondente → Executor compatível`) está expressamente garantido no desenho. A distinção entre condições operacionais (`POSSIVEL`, `PREPARADO`, `EM_EXECUCAO`, `BLOQUEADO`, `AGUARDANDO_DECISAO_HUMANA`, `ENCERRADO`) e os Status normativos das entidades de governança é mantida de forma inequívoca.
4. **Suficiência para a Futura Realização:** O modelo de dados relacional (`trabalhos_coordenados`, `handoffs_coordenacao`, `retornos_coordenacao`), os contratos lógicos dos casos de uso, o mapeamento de riscos e os critérios verificáveis de aceitação são claros, precisos e completos. Permitem o planejamento da realização e a decomposição em Itens de Trabalho sem a necessidade de redescoberta do valor de negócio nem redesenho da solução técnica de alto nível.

Conclui-se formalmente pela emissão do Resultado do Processo **`FORMACAO_SUFICIENTE`**, habilitando a transição de status de `EM_FORMACAO` para **`FORMADA`**.

### Handoff da auditoria

Com a emissão de `FORMACAO_SUFICIENTE`, a Especificação da `EV-003` torna-se validamente disponível e a Entrega de Valor atinge o status **`FORMADA`**, ficando apta para a futura fase de realização técnica (Planejamento da Realização).

## Realização da Entrega de Valor

O **Especialista em Planejamento da Realização** elaborou formalmente o [Plano de Realização da EV-003](plano-de-realizacao.md), decompondo a realização técnica da EV-003 em quatro Itens de Trabalho ordenados em grafo acíclico (`IT-009`, `IT-010`, `IT-011` e `IT-012`).

Com a aprovação do Plano de Realização e a disponibilização do primeiro item com status `PRONTO_PARA_EXECUCAO` (`IT-009`), a Entrega de Valor transiciona legitimamente para o status **`EM_REALIZACAO`**.



