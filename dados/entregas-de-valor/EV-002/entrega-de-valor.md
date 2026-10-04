# EV-002 — Direção do Projeto

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `096a280f-c8aa-4de1-932b-159e5a609b21` |
| Código | `EV-002` |
| Módulo proprietário | [M-002 — Formação do Projeto](../../modulos/M-002/modulo.md) |
| Status | `EM_REALIZACAO` |

## Delimitação inicial

* **Item canônico:** [EV-002 no Mapa de Entregas de Valor de M-002](../../modulos/M-002/mapa-de-entregas-de-valor.md#ev-002--direção-do-projeto).
* **Declaração de valor:** permitir que um Compromisso da Necessidade validamente aprovado materialize de forma idempotente um único Projeto 1:1, conduzindo sua formação técnica e auditoria independente até que sua Direção aprovada fique disponível para orientar as capacidades descendentes.
* **Beneficiário relevante:** o Owner e as equipes que necessitam de direcionamento estratégico, técnico e estrutural unificado para desdobrar trabalho derivado de uma Necessidade comprometida.
* **Resultado observável esperado:** uma solicitação de bootstrap vinculada a uma Necessidade com `APROVADO` materializa exatamente uma instância de Projeto em `EM_FORMACAO`; a confirmação é devolvida a M-001 (permitindo sua evolução para `EM_PROJETO`); a formação percorre Enquadramento, Descoberta e Direção da Solução; após parecer `FORMACAO_SUFICIENTE` do Auditor do Projeto, o Projeto atinge `FORMADO` e sua Direção aprovada fica disponível para consumo e consulta.
* **Dentro da fronteira:** recepção e validação do Compromisso da Necessidade aprovado; garantia de unicidade e idempotência do vínculo 1:1 (Necessidade → Projeto); criação e atualização controlada do Projeto; suporte às etapas de Enquadramento, Descoberta e Direção da Solução pelo Especialista em Formação do Projeto; recepção e registro do parecer do Auditor do Projeto; disponibilização da Direção aprovada e handoff para delimitação de Módulos; e persistência e consulta do estado e histórico.
* **Fora da fronteira:** formar ou qualificar a Necessidade (M-001); aprovar o compromisso (Owner); delimitar, formar ou auditar Módulos; coordenar fluxo de trabalho ou selecionar executores (M-003); prover infraestrutura compartilhada física de busca e telemetria (M-004); e implementar ou verificar software integrado de capacidades posteriores (M-005).
* **Dependências, relações e incertezas relevantes:** M-001 disponibiliza o Compromisso aprovado e consome a confirmação de materialização; o Auditor do Projeto é a autoridade independente para avaliação da formação; o Owner é a autoridade máxima transversal com competência exclusiva para cancelamento excepcional (`CANCELAMENTO_APROVADO`); o banco de dados relacional PostgreSQL preserva a unicidade estrita 1:1 através de chave única; concorrência e transporte de mensagens entre processos são tratados com segurança e idempotência.

## Formação da Entrega de Valor

Esta formação é conduzida pelo **Especialista em Formação da Entrega de Valor** a partir da delimitação canônica e da Especificação Técnica aprovada de M-002, em estrita observância à Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL, Web responsiva e Worker desacoplado).

### Evidências e classificação do contexto

| Informação | Classificação | Fundamentação e efeito na formação |
| --- | --- | --- |
| Valor, beneficiário, resultado observável e fronteira iniciais | Conhecido | Registro canônico desta EV no [Mapa de Entregas de Valor de M-002](../../modulos/M-002/mapa-de-entregas-de-valor.md#ev-002--direção-do-projeto). |
| Regras, modelo e responsabilidades de M-002 | Conhecido | [Especificação Técnica de M-002](../../modulos/M-002/modulo.md#especificação-técnica-do-módulo), aprovada por `FORMACAO_SUFICIENTE`. |
| Arquitetura e Stack do NAAMIVE | Conhecido / Decisão Material do Owner | Node.js (TypeScript) com PostgreSQL, camada web responsiva e worker desacoplado em background para processamento assíncrono. |
| Portas de integração existentes da EV-001 | Conhecido | `PortaIntegracaoProjeto` e `PortaIntegracaoContexto` já definidas e testadas no ecossistema (`src/infrastructure/adapters/integracao-modulos.ts`). |
| Invariante do vínculo exclusivo 1:1 | Conhecido | Exatamente 1 Projeto para 1 Necessidade aprovada; tentativas de bootstrap concorrentes ou duplicadas devem recuperar a mesma instância sem gerar duplicidade. |
| Modelo normativo da vertical Projeto | Conhecido | Catálogos oficiais em `documentacao/projeto/`: status (`EM_FORMACAO`, `FORMADO`, `EM_CONDUCAO`, `CONCLUIDO`, `CANCELADO`), etapas de formação (`ENQUADRAMENTO`, `DESCOBERTA`, `DIREÇÃO DA SOLUÇÃO`) e Resultados do Processo (`FORMACAO_SUFICIENTE`, `FORMACAO_INSUFICIENTE`, etc.). |

### Especificação da Entrega de Valor

#### Valor, comportamento e fronteira refinados

**Declaração de valor.** Permitir que o Owner e as equipes do NAAMIVE conduzam a transição estrutural entre uma demanda comprometida e sua realização sistêmica, materializando de forma idempotente um Projeto exclusivo 1:1, conduzindo sua formação técnica especializada e submetendo-a à auditoria independente, culminando na disponibilização da Direção do Projeto aprovada para orientar a delimitação e execução modular.

**Jornada e Fluxos relevantes:**
1. **Recepção e Materialização Idempotente do Projeto:** M-002 recebe o Compromisso da Necessidade aprovado via `PortaIntegracaoProjeto`. Caso não exista Projeto para a `necessidadeId`, o sistema cria a instância de Projeto em status `EM_FORMACAO`, gera o identificador técnico e o código (`P-001` ou sequencial estável), registra o vínculo exclusivo e devolve a confirmação com `jaExistente: false`. Em caso de repetição legítima da solicitação, recupera o Projeto existente e devolve a confirmação com `jaExistente: true`. Ao receber a confirmação de materialização bem-sucedida, a Necessidade associada em M-001 é transicionada para `EM_PROJETO`.
2. **Formação Técnica Especializada do Projeto:** O Ator agêntico Especialista em Formação do Projeto atua sobre o Projeto em `EM_FORMACAO`, estruturando e registrando as etapas conceituais:
   - *Enquadramento:* Compreensão do compromisso recebido, objetivos, atores e fronteiras.
   - *Descoberta:* Análise de contexto, evidências, riscos e dependências.
   - *Direção da Solução:* Formulação da visão estratégica da solução técnica, critérios de atendimento e diretrizes para realização.
3. **Auditoria Independente da Formação:** O Ator agêntico Auditor do Projeto inspeciona a formação e emite o parecer independente:
   - Se `FORMACAO_SUFICIENTE`, o Projeto transiciona de `EM_FORMACAO` para o status `FORMADO`, consolidando e disponibilizando a `Direção do Projeto` para consumo pelas capacidades descendentes;
   - Se `FORMACAO_INSUFICIENTE`, o Projeto permanece em `EM_FORMACAO` com o registro das pendências e apontamentos para tratamento pelo Formador.
4. **Consulta e Navegação:** Usuários e o Owner podem consultar via interface web e API o Projeto, seu status atual, histórico imutável de etapas, pareceres de auditoria e a Direção consolidada.
5. **Cancelamento Excepcional do Projeto:** Apenas o Owner autenticado pode determinar o cancelamento do Projeto em estado não terminal (`CANCELAMENTO_APROVADO`), transicionando o Projeto para `CANCELADO` e propagando o efeito normativo para a Necessidade associada.

**Regras de negócio e integridade:**
1. **Unicidade e Exclusividade 1:1:** Uma Necessidade aprovada origina exatamente um Projeto. O esquema de banco de dados deve impor restrição de unicidade (`UNIQUE(necessidade_id)`).
2. **Separação Rigorosa de Conceitos:** Status do Projeto (`EM_FORMACAO`, `FORMADO`, etc.) não se confunde com etapas de formação (`ENQUADRAMENTO`, `DESCOBERTA`, `DIREÇÃO DA SOLUÇÃO`), nem com Resultados do Processo (`FORMACAO_SUFICIENTE`, `FORMACAO_INSUFICIENTE`) ou decisões humanas (`CANCELAMENTO_APROVADO`).
3. **Autoridade Exclusiva:** Somente o Auditor do Projeto pode emitir parecer de auditoria; somente o Formador do Projeto pode registrar as etapas de formação; somente o Owner identificado pode produzir cancelamento excepcional. Agentes não simulam decisões humanas.
4. **Idempotência Operacional:** Repetições de solicitações de bootstrap ou reprocessamentos de mensagens não criam novos projetos nem alteram o estado da instância existente.

#### Arquitetura e Decisões Técnicas

A solução apoia-se estritamente na Decisão Material do Owner de Arquitetura e Stack:
* **Runtime e Linguagem:** Node.js com TypeScript, preservando tipagem estática e desacoplamento hexagonal.
* **Banco de Dados Relacional:** PostgreSQL, estendendo o esquema com tabelas dedicadas ao Projeto (`projetos`, `etapas_formacao_projeto`, `auditorias_projeto`), com restrições de integridade referencial, chave estrangeira para `necessidades` e índice único para assegurar o 1:1.
* **Núcleo de Domínio:** Entidades puras do Projeto (`Projeto`, `DirecaoProjeto`, `EtapaFormacaoProjeto`), métodos de transição controlada e emissão de eventos de domínio.
* **Worker em Background:** Processamento assíncrono contínuo para reconciliação de solicitações de bootstrap, disparos de auditoria e sincronização de status entre M-001 e M-002.
* **Camada Web Responsiva:** Telas responsivas em Bootstrap integradas à aplicação web existente para listar projetos, visualizar detalhes, acompanhar a formação, inspecionar pareceres de auditoria e consultar a Direção do Projeto aprovada.

| Componente Lógico | Responsabilidade Técnica |
| --- | --- |
| `DominioProjeto` | Entidades ricas, regras de transição de status, invariantes de integridade do Projeto e composição da Direção. |
| `RepositorioProjetoPostgres` | Persistência transacional relacional no PostgreSQL, garantindo exclusão mútua e unicidade estrita 1:1. |
| `ServicoProjeto` | Orquestração dos casos de uso de bootstrap, avanço de etapas de formação e registro de pareceres de auditoria. |
| `AdaptadorIntegracaoProjeto` | Implementação concreta da `PortaIntegracaoProjeto` para consumo transparente por M-001 e pelo worker. |
| `WorkerProjeto` | Tarefas em background para sincronização de estados e reconciliação assíncrona de bootstrap. |
| `InterfaceWebProjeto` | Rotas HTTP e templates responsivos para acompanhamento e interação com o Projeto. |

#### Dados, contratos e integrações

**Modelo de Dados Relacional (PostgreSQL):**
- Tabela `projetos`:
  - `id UUID PRIMARY KEY`: Identificador técnico v4.
  - `codigo VARCHAR(20) NOT NULL UNIQUE`: Código humano estável (`P-001`, etc.).
  - `necessidade_id UUID NOT NULL UNIQUE REFERENCES necessidades(id)`: Vínculo exclusivo 1:1.
  - `titulo VARCHAR(255) NOT NULL`: Nome inicial/editável do projeto.
  - `status VARCHAR(50) NOT NULL`: `EM_FORMACAO`, `FORMADO`, `EM_CONDUCAO`, `CONCLUIDO`, `CANCELADO`.
  - `criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
  - `atualizado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
- Tabela `etapas_formacao_projeto`:
  - `id UUID PRIMARY KEY`, `projeto_id UUID NOT NULL REFERENCES projetos(id)`, `etapa VARCHAR(50) NOT NULL`, `conteudo JSONB NOT NULL`, `registrado_por VARCHAR(100) NOT NULL`, `registrado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
- Tabela `auditorias_projeto`:
  - `id UUID PRIMARY KEY`, `projeto_id UUID NOT NULL REFERENCES projetos(id)`, `resultado VARCHAR(50) NOT NULL`, `parecer TEXT NOT NULL`, `auditor VARCHAR(100) NOT NULL`, `auditado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.
- Tabela `direcoes_projeto`:
  - `id UUID PRIMARY KEY`, `projeto_id UUID NOT NULL UNIQUE REFERENCES projetos(id)`, `compromisso_origem TEXT NOT NULL`, `objetivo_projeto TEXT NOT NULL`, `fronteiras TEXT NOT NULL`, `contexto_relevante TEXT NOT NULL`, `aprovado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`.

**Contratos lógicos de casos de uso:**
1. `solicitarBootstrapProjeto(solicitacao: SolicitacaoBootstrapProjeto): Promise<ConfirmacaoBootstrapProjeto>`
2. `registrarEtapaFormacao(projetoId: string, etapa: EtapaFormacao, dados: ConteudoEtapa, autor: string): Promise<void>`
3. `registrarParecerAuditoria(projetoId: string, resultado: ResultadoAuditoriaProjeto, parecer: string, auditor: string): Promise<void>`
4. `obterProjetoPorId(projetoId: string): Promise<VisaoProjeto>`
5. `obterProjetoPorNecessidadeId(necessidadeId: string): Promise<VisaoProjeto | null>`
6. `obterDirecaoProjeto(projetoId: string): Promise<DirecaoProjeto | null>`

#### Segurança, operação e riscos

| Risco / Lacuna | Classificação | Mitigação Técnica |
| --- | --- | --- |
| Duplicação de Projeto sob concorrência | Risco de integridade relacional | Restrição `UNIQUE` em banco de dados (`necessidade_id`) com transações atômicas `SERIALIZABLE` ou cláusula `ON CONFLICT DO NOTHING`. |
| Confusão entre Status do Projeto e etapas de formação | Risco conceitual | Tipos de domínio estritos em TypeScript e validação de invariantes no núcleo de domínio. |
| Cancelamento não autorizado | Risco de autoridade | Exigência estrita de identidade autenticada do Owner (`mhj`) para qualquer ato de cancelamento excepcional. |
| Falha transitória de comunicação entre módulos | Risco operacional | Worker assíncrono com mecanismo de retry idempotente e fila de tarefas persistida em banco. |

#### Critérios verificáveis e estratégia de testes

O software integrado resultante desta Entrega de Valor deverá demonstrar conclusivamente que:
1. **Materialização Idempotente 1:1:** O envio de uma solicitação de bootstrap vinculada a uma Necessidade com Compromisso aprovado materializa exatamente uma instância de Projeto em `EM_FORMACAO`; envios subsequentes devolvem a mesma instância sem duplicá-la.
2. **Transição Causal de M-001:** A confirmação do bootstrap do Projeto permite que a Necessidade correspondente em M-001 seja posicionada validamente em `EM_PROJETO`.
3. **Registro de Formação Técnica:** O Especialista em Formação do Projeto registra as etapas `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO` com preservação imutável de evidências e conteúdo.
4. **Auditoria Independente e Habilitação de Status:** O registro de parecer `FORMACAO_SUFICIENTE` pelo Auditor do Projeto transiciona o status para `FORMADO` e torna disponível a Direção do Projeto; pareceres insuficientes não alteram o status.
5. **Navegabilidade e Consulta Web Responsiva:** A camada web permite inspecionar o Projeto, navegar entre a Necessidade de origem e o Projeto gerado, visualizar as etapas e consultar a Direção aprovada de forma responsiva.
6. **Cancelamento do Owner:** Apenas o Owner autenticado consegue cancelar o Projeto em estado não terminal, refletindo a transição para `CANCELADO`.

**Estratégia de Testes:**
- Testes unitários para as entidades de domínio de Projeto, suas transições e regras de negócio.
- Testes de integração com PostgreSQL (via `pg-mem` e banco real) validando migrações, concorrência e restrição de unicidade 1:1.
- Testes de integração de módulos validando o contrato bidirecional entre M-001 e M-002.
- Testes web responsivos das novas rotas de Projeto e visualização da Direção.

#### Justificativa de suficiência e handoff

A Especificação da `EV-002` encontra-se plenamente detalhada no lado de produto e no lado técnico, preservando a rastreabilidade `EV-002 → M-002 → P-001 → N-001` e aderindo à arquitetura oficial. Os contratos, o modelo relacional e os critérios verificáveis são suficientes para permitir o planejamento e a realização técnica sem redescoberta do negócio nem redesenho arquitetural.

**Handoff:** Esta especificação consolidada é entregue ao **Auditor da Entrega de Valor** para avaliação independente da formação, conforme `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md`.

## Resultado do Processo — Auditoria independente

| Campo | Registro |
| --- | --- |
| Ator competente | Auditor da Entrega de Valor |
| Resultado do Processo | `FORMACAO_SUFICIENTE` |
| Status após a auditoria | `FORMADA` |

### Parecer independente

O Auditor da Entrega de Valor realizou a avaliação independente da Especificação da `EV-002 — Direção do Projeto`, confrontando proporcionalmente a intenção de valor, beneficiário, resultado observável, fronteiras, aderência à capacidade de M-002, origem causal, dependências, critérios verificáveis, solução técnica de alto nível, contratos e decisões de arquitetura:

1. **Aderência à Capacidade de M-002 e Origem Causal:** A EV-002 materializa a capacidade nuclear de M-002 (recepção do Compromisso da Necessidade aprovado, bootstrap idempotente 1:1, suporte às etapas conceituais de formação, registro do parecer do Auditor do Projeto e disponibilização da Direção aprovada) sem extravasar para outras verticais nem sobrepor-se à EV-001 de M-001.
2. **Conformidade Arquitetural e Stack Oficial:** A especificação adota com precisão a Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL relacional, camada web responsiva com Bootstrap e Worker em background desacoplado).
3. **Invariantes e Integridade de Domínio:** O invariante nuclear de exclusividade 1:1 (`1 Necessidade aprovada → 1 Projeto`) está assegurado conceitualmente e com suporte relacional (`UNIQUE(necessidade_id)`). A separação de responsabilidades e autoridades preserva estritamente a distinção entre Status, etapas de formação, pareceres técnicos e decisões exclusivas do Owner (`CANCELAMENTO_APROVADO`).
4. **Suficiência para Realização Futura:** Os modelos de dados, contratos lógicos, critérios verificáveis e a estratégia de testes integrados e locais fornecem especificações claras e completas, permitindo o planejamento detalhado da realização e a execução dos Itens de Trabalho (`IT-005` a `IT-008`) sem necessidade de redescoberta de produto ou redesenho técnico de alto nível.

Conclui-se formalmente pela emissão do Resultado do Processo **`FORMACAO_SUFICIENTE`**, habilitando a transição de `EM_FORMACAO` para **`FORMADA`**.

### Handoff da auditoria

Com a emissão de `FORMACAO_SUFICIENTE`, a Especificação da `EV-002` tornou-se validamente disponível e a Entrega de Valor avançou para o status `FORMADA`.

## Início da Realização Técnica

* **Ator responsável:** Especialista em Planejamento da Realização
* **Status atual:** `EM_REALIZACAO`
* **Plano de Realização consolidado:** [Plano de Realização da EV-002](plano-de-realizacao.md)
* **Itens de Trabalho materializados:**
  - [`IT-005`](../../itens-de-trabalho/IT-005/item-de-trabalho.md): `CONCLUIDO`
  - [`IT-006`](../../itens-de-trabalho/IT-006/item-de-trabalho.md): `PRONTO_PARA_EXECUCAO`
  - [`IT-007`](../../itens-de-trabalho/IT-007/item-de-trabalho.md): `CRIADO`
  - [`IT-008`](../../itens-de-trabalho/IT-008/item-de-trabalho.md): `CRIADO`

### Handoff do Planejamento

Com a aprovação do Plano de Realização e a materialização dos Itens de Trabalho no repositório, a `EV-002` ingressou legitimamente em **`EM_REALIZACAO`**.
O próximo Ator competente a atuar é o **Engenheiro de Software** (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`), encarregado de assumir e executar o primeiro Item de Trabalho apto (`IT-005`).


