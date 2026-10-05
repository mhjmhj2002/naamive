# EV-005 — Avaliação e Verificação da Entrega de Valor

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `6868d52a-295d-46a5-89fc-a6eac1d70dc5` |
| Código | `EV-005` |
| Módulo proprietário | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `EM_REALIZACAO` |
| Plano de Realização | [Plano de Realização da EV-005](plano-de-realizacao.md) |

## Delimitação inicial

* **Item canônico:** [EV-005 no Mapa de Entregas de Valor de M-005](../../modulos/M-005/mapa-de-entregas-de-valor.md#ev-005--avaliação-e-verificação-da-entrega-de-valor)
* **Declaração de valor:** permitir que o operador, o Owner e os Atores comprovem de forma observável, reproduzível e rastreável se o incremento de software integrado atende aos critérios verificáveis derivados do Compromisso da Necessidade e da Direção do Projeto, emitindo laudos técnicos fundamentados (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `DIVERGÊNCIA_ENCONTRADA`) e identificando explicitamente limites e divergências.
* **Beneficiário relevante:** o operador da jornada, os Atores de governança, o Verificador Agregado do Projeto e o Owner que necessitam de comprovação técnica rigorosa, independente e demonstrável do software integrado antes da homologação final.
* **Resultado observável esperado:** dado um resultado de software identificado e integrado gerado por um percurso da jornada, o sistema inspeciona suas saídas contra critérios verificáveis objetivos, avalia a suficiência de evidências automatizadas e operacionais, correlaciona o resultado com sua origem causal (N-001 → P-001 → Módulos → EV) e emite parecer técnico conclusivo e explicável, expondo divergências quando houver.
* **Dentro da fronteira:** recepção e registro de resultados de software identificáveis; derivação de critérios verificáveis a partir do percurso e do compromisso; execução/coleta de evidências operacionais e automatizadas; correlação explicativa de critérios, evidências e conclusões técnicas; persistência estruturada do laudo de verificação; interface web e endpoints REST para inspeção técnica da verificação.
* **Fora da fronteira:** implementar, corrigir ou empacotar software; coordenar o avanço ou despachar retrabalho (M-003); emitir `COMPROMISSO_ATENDIDO` ou concluir o Projeto P-001 (Verificador Agregado do Projeto); alterar o status de N-001 para `ATENDIDA`; tomar decisões humanas materiais pelo Owner.
* **Dependências, relações e incertezas relevantes:** consome as evidências e o percurso de M-003 e a cadeia de rastreabilidade de M-004; é orientado pelas diretrizes de M-002; os mecanismos concretos de inspeção automatizada e as páginas web de visualização de conformidade serão especificados na formação técnica.

## Handoff da Delimitação

A delimitação inicial da **EV-005 — Avaliação e Verificação da Entrega de Valor** foi materializada pelo **Especialista em Delimitação de Entregas de Valor** com status `EM_FORMACAO`. O artefato e seu contexto são entregues formalmente ao **Especialista em Formação da Entrega de Valor** para condução da formação técnica e especificação detalhada da evolução.

## Formação da Entrega de Valor

Esta formação técnica é conduzida com exclusividade pelo Ator agêntico **Especialista em Formação da Entrega de Valor**, em conformidade com as diretrizes de [Formação da Entrega de Valor](../../../documentacao/entrega-de-valor/04_FORMACAO_DA_ENTREGA_DE_VALOR.md), da Skill `.agents/skills/entrega-de-valor/formacao-da-entrega-de-valor/SKILL.md` e a partir da Especificação Técnica aprovada de [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md#especificação-técnica-do-módulo) e da Decisão Material do Owner de Arquitetura e Stack (Node.js/TypeScript, PostgreSQL relacional, Worker desacoplado em segundo plano e camada web responsiva com Bootstrap 5).

### Evidências e classificação do contexto

| Evidência / Informação | Classificação | Fundamentação e impacto no desenho |
| :--- | :--- | :--- |
| Delimitação canônica da EV-005 | Conhecido | Registrada no [Mapa de Entregas de Valor de M-005](../../modulos/M-005/mapa-de-entregas-de-valor.md#ev-005--avaliação-e-verificação-da-entrega-de-valor) e na identificação deste artefato. |
| Capacidade e Especificação Técnica de M-005 | Conhecido | [Especificação Técnica de M-005](../../modulos/M-005/modulo.md#especificação-técnica-do-módulo), aprovada formalmente por `FORMACAO_SUFICIENTE`. Define os conceitos lógicos de objeto de verificação, derivação de critérios, evidências, conclusões técnicas (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `VERIFICAÇÃO_IMPOSSÍVEL`, `DIVERGÊNCIA_ENCONTRADA`), explicabilidade, idempotência e relação com a Verificação Agregada do Projeto. |
| Teste primário da Necessidade N-001 | Conhecido | "Dado um trabalho declarado pronto, deve ser possível delegá-lo por meio de uma instrução simples, sem que uma pessoa precise reconstruir manualmente todo o contexto necessário para sua execução." |
| Direção do Projeto P-001 | Conhecido | [Direção do Projeto P-001](../../projetos/P-001/projeto.md#direção-do-projeto), estabelecendo a jornada rastreável orientada a módulos coesos, demonstração observável e evolução incremental. |
| Arquitetura e Stack consolidada do NAAMIVE | Conhecido / Decisão Material do Owner | Monólito modular em Node.js (TypeScript strict ESM), banco de dados PostgreSQL com transações ACID e integridade referencial, emulador `pg-mem` para testes rápidos, worker em background desacoplado e camada web responsiva com Bootstrap 5. |
| Baseline Técnica adotada | Proposta inicial | **Baseline Essencial** adaptada ao contexto do monólito modular existente. Custo incremental de infraestrutura: zero (utiliza os mesmos recursos locais e banco PostgreSQL já provisionados). |
| Infraestrutura e esquemas existentes (EV-001 a EV-004) | Conhecido | Tabelas PostgreSQL existentes: `necessidades`, `compromissos_necessidade`, `projetos`, `etapas_formacao_projeto`, `auditorias_projeto`, `direcoes_projeto`, `trabalhos_coordenados`, `handoffs_coordenacao`, `retornos_coordenacao`, `registros_proveniencia`, `vinculos_causais`, `tarefas_segundo_plano` e `eventos_dominio`. |
| Lacuna normativa de consumo pela Verificação Agregada | Conhecido / Tratado | A verificação de software em M-005 produz laudos e pareceres técnicos de verificabilidade. Não substitui o rito de Verificação Agregada de Projeto nem emite `COMPROMISSO_ATENDIDO` ou transiciona P-001/N-001; disponibiliza laudos estruturados consumíveis. |

### Especificação da Entrega de Valor

#### Valor, comportamento e fronteira refinados

**Declaração de valor.** Permitir que o operador, o Owner e os Atores comprovem de forma observável, reproduzível e rastreável se o incremento de software integrado atende aos critérios verificáveis derivados do Compromisso da Necessidade e da Direção do Projeto, emitindo laudos técnicos fundamentados (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `DIVERGÊNCIA_ENCONTRADA`), relacionando o resultado à sua cadeia de proveniência causal e identificando explicitamente limites e divergências.

**Jornada e Fluxos relevantes:**

1. **Recepção e Registro de Resultado de Software:**
   - O sistema recebe a declaração de um resultado de software integrado disponibilizado por uma realização (ex.: via handoff/retorno de M-003 ou integração direta), contendo identificador único de build/artefato, percurso originador, revisão de código ou hash versionado e referências de proveniência.
   - O registro do resultado é persistido de forma imutável em `resultados_software`, identificando a evolução ou Entrega de Valor alvo (ex.: `EV-001`, `EV-002`, `EV-003`, `EV-004`, `EV-005`).
2. **Derivação Estruturada de Critérios Verificáveis:**
   - A partir do percurso e da cadeia de ascendência fornecida por M-004 (Necessidade → Projeto → Módulos → EV), o motor deriva os critérios verificáveis objetivos, vinculando cada critério à sua respectiva fonte normativa ou de negócio.
   - Cada critério define: identificador técnico, código legível, descrição do comportamento esperado, método de observação (ex.: `SUITE_AUTOMATIZADA`, `INSPECAO_HTTP`, `CONFORMIDADE_ESQUEMA`), condição de satisfação e tolerâncias ou limitações conhecidas.
3. **Coleta e Registro de Evidências Técnicas:**
   - O sistema registra evidências concretas obtidas a partir de execuções de testes, checagens de integridade relacional, inspeções de endpoints HTTP ou relatórios de execução.
   - Cada evidência armazena: resultado observado, procedimento executado, momento da coleta, parâmetros e dados estruturados em `JSONB`.
4. **Emissão Fundamentada de Laudos de Verificação:**
   - O motor de verificação confronta as evidências registradas com os critérios verificáveis aplicáveis ao resultado de software.
   - Para cada critério e para o laudo agregado, o sistema emite uma conclusão técnica interna fundamentada:
     * `CRITÉRIO_DEMONSTRADO`: quando há evidências suficientes e consistentes demonstrando o comportamento esperado.
     * `CRITÉRIO_NÃO_DEMONSTRADO`: quando a observação falha ou diverge da condição esperada.
     * `EVIDÊNCIA_INSUFICIENTE`: quando não há dados suficientes para atestar o critério sem presumi-lo.
     * `VERIFICAÇÃO_IMPOSSÍVEL`: quando o ambiente ou resultado está indisponível para observação.
     * `DIVERGÊNCIA_ENCONTRADA`: quando há conflito de evidências ou contradição com o comportamento especificado.
5. **Rastreabilidade e Vinculação Causal:**
   - O laudo de verificação e suas evidências são vinculados à cadeia de proveniência de M-004 através de vínculos causais (ex.: `SUSTENTADO_POR`, `ORIGINADO_DE`), garantindo explicabilidade integral até N-001.
6. **Inspeção Visual da Conformidade via Camada Web:**
   - O operador e o Owner inspecionam o painel de verificação de software em `/verificacao`, visualizando o catálogo de resultados avaliados, laudos emitidos, matriz de conformidade por critério, badges de conclusão e detalhamento de divergências.

**Regras de negócio e integridade:**

1. **Não Presunção de Conformidade:** A ausência de falha ou a ausência de evidência não constitui aprovação; se não houver evidência concreta, o status do critério é rigorosamente `EVIDÊNCIA_INSUFICIENTE`.
2. **Imutabilidade e Idempotência:** A reavaliação de um mesmo resultado com as mesmas evidências gera o mesmo diagnóstico sem produzir duplicatas conflitantes; novos laudos decorrem de novas evidências ou novas revisões de software.
3. **Não Autoridade de Homologação ou Aceite:** M-005 e a EV-005 produzem comprovação e laudos técnicos de conformidade; não emitem `HOMOLOGADO_PELO_OWNER` (exclusivo do Owner) e não emitem `COMPROMISSO_ATENDIDO` (exclusivo do Verificador Agregado do Projeto).
4. **Explicabilidade:** Toda conclusão técnica deve apontar expressamente as evidências que a sustentam e os limites da observação realizada.

**Fronteira confirmada.**
- **Dentro da fronteira:** Esquema relacional e repositório de verificação de software; catálogo e derivação de critérios verificáveis; coleta de evidências de verificação; motor de avaliação e emissão de laudos técnicos; integração de rastreabilidade com M-004; rotas HTTP e interface web responsiva de verificação (`/verificacao`).
- **Fora da fronteira:** Corrigir código de software ou despachar retrabalho (M-003); emitir `COMPROMISSO_ATENDIDO` do Projeto (Verificador Agregado); aprovar o Compromisso da Necessidade (Owner); substituir ferramentas externas de CI/CD ou telemetria em tempo real.

#### Arquitetura e Decisões Técnicas

Seguindo a **Baseline Essencial** e a arquitetura oficial estabelecida:

* **Arquitetura Hexagonal e Isolamento DDD:**
  - Domínio puro em `src/domain/verificacao/`: entidades `ResultadoSoftware`, `CriterioVerificavel`, `EvidenciaVerificacao`, `LaudoVerificacao`, enums `ConclusaoVerificacao` (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`), `MetodoObservacao` e o serviço de domínio `MotorVerificacaoSoftware`.
  - Repositório relacional em `src/infrastructure/database/repositorio-verificacao-postgres.ts`.
  - Serviço de aplicação em `src/application/servico-verificacao.ts`.
  - Adaptadores web e rotas HTTP em `src/web/rotas-verificacao.ts` e templates em `src/web/templates.ts`.
* **Persistência Relacional no PostgreSQL (Migração `007_esquema_verificacao_software.sql`):**
  - Tabelas normalizadas com suporte a chaves primárias, integridade referencial, campos em `JSONB` para evidências e critérios, e índices por código de resultado, módulo e conclusão.
  - Compatibilidade garantida com PostgreSQL e com o emulador `pg-mem` para execução dos testes locais rápidos.
* **Worker em Background:**
  - Tarefa periódica assíncrona de reconciliação e validação contínua da conformidade dos resultados de software integrados.
* **Interface Web Responsiva:**
  - Páginas em Bootstrap 5 integradas ao Dark Mode (`/verificacao` e `/verificacao/:id`), exibindo matriz de conformidade, cartões de critérios e laudos técnicos detalhados.

#### Dados, contratos e integrações

**Modelo de Dados Relacional (PostgreSQL — Migração `007_esquema_verificacao_software.sql`):**

1. Tabela `resultados_software`:
   - `id VARCHAR(64) PRIMARY KEY`: Identificador técnico UUID v4.
   - `codigo_referencia VARCHAR(50) NOT NULL UNIQUE`: Código de identificação (ex.: `RS-001`, `RS-005`).
   - `modulo_origem VARCHAR(50) NOT NULL`: Módulo associado (ex.: `M-001` a `M-005`).
   - `entrega_valor_codigo VARCHAR(50) NOT NULL`: Código da EV associada (ex.: `EV-001` a `EV-005`).
   - `versao_artefato VARCHAR(100) NOT NULL`: Versão, hash de commit ou tag do resultado integrado.
   - `descricao TEXT NOT NULL`: Descrição do incremento de software disponibilizado.
   - `declarado_por VARCHAR(100) NOT NULL`: Ator ou integrador que disponibilizou o resultado.
   - `registrado_em TIMESTAMPTZ NOT NULL DEFAULT now()`.
   - Índices: `idx_res_software_modulo` (`modulo_origem`), `idx_res_software_ev` (`entrega_valor_codigo`).

2. Tabela `criterios_verificaveis`:
   - `id VARCHAR(64) PRIMARY KEY`: Identificador técnico UUID v4.
   - `codigo VARCHAR(50) NOT NULL UNIQUE`: Código do critério (ex.: `CRIT-001`).
   - `resultado_software_id VARCHAR(64) NOT NULL REFERENCES resultados_software(id) ON DELETE CASCADE`.
   - `origem_normativa VARCHAR(255) NOT NULL`: Referência da origem (ex.: `N-001/Compromisso`, `P-001/Direcao`, `EV-005/Especificacao`).
   - `descricao_comportamento TEXT NOT NULL`: Comportamento esperado observável.
   - `metodo_observacao VARCHAR(50) NOT NULL`: `SUITE_AUTOMATIZADA`, `INSPECAO_HTTP`, `CONFORMIDADE_ESQUEMA`, `OPERACIONAL`.
   - `condicao_satisfacao TEXT NOT NULL`: Condição objetiva que demonstra o critério.
   - `limites_ou_tolerancias TEXT`: Restrições e limitações conhecidas.
   - `criado_em TIMESTAMPTZ NOT NULL DEFAULT now()`.

3. Tabela `evidencias_verificacao`:
   - `id VARCHAR(64) PRIMARY KEY`: Identificador técnico UUID v4.
   - `criterio_id VARCHAR(64) NOT NULL REFERENCES criterios_verificaveis(id) ON DELETE CASCADE`.
   - `procedimento_executado VARCHAR(255) NOT NULL`: Procedimento ou teste que gerou a evidência.
   - `resultado_observado TEXT NOT NULL`: Dados, saída observada ou resultado obtido.
   - `dados_detalhados JSONB NOT NULL DEFAULT '{}'::jsonb`: Carga de dados, logs ou telemetria.
   - `sucesso BOOLEAN NOT NULL`: Indicador objetivo se a observação atendeu ao esperado.
   - `coletado_por VARCHAR(100) NOT NULL`: Ator ou suíte coletora.
   - `coletado_em TIMESTAMPTZ NOT NULL DEFAULT now()`.

4. Tabela `laudos_verificacao`:
   - `id VARCHAR(64) PRIMARY KEY`: Identificador técnico UUID v4.
   - `resultado_software_id VARCHAR(64) NOT NULL REFERENCES resultados_software(id) ON DELETE CASCADE`.
   - `criterio_id VARCHAR(64) NOT NULL REFERENCES criterios_verificaveis(id) ON DELETE CASCADE`.
   - `conclusao VARCHAR(50) NOT NULL`: `CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`.
   - `fundamentacao_tecnica TEXT NOT NULL`: Parecer explicativo fundamentando a conclusão.
   - `evidencias_utilizadas JSONB NOT NULL DEFAULT '[]'::jsonb`: Lista de IDs de evidências que sustentam a conclusão.
   - `divergencias_apontadas TEXT`: Descrição detalhada de inconsistências encontradas.
   - `emitido_por VARCHAR(100) NOT NULL`: Nome do Ator ou serviço emissor.
   - `emitido_em TIMESTAMPTZ NOT NULL DEFAULT now()`.
   - Índices: `idx_laudo_res_crit` (`resultado_software_id`, `criterio_id`).

**Contratos lógicos dos Casos de Uso:**

1. `registrarResultadoSoftware(dados: NovoResultadoSoftware): Promise<ResultadoSoftware>`
2. `cadastrarCriterioVerificavel(dados: NovoCriterioVerificavel): Promise<CriterioVerificavel>`
3. `registrarEvidenciaVerificacao(dados: NovaEvidenciaVerificacao): Promise<EvidenciaVerificacao>`
4. `avaliarConformidadeResultado(resultadoSoftwareId: string, emitidoPor: string): Promise<LaudoVerificacaoAgregado>`
5. `obterPainelVerificacao(): Promise<VisaoPainelVerificacao>`
6. `obterDetalhesVerificacao(resultadoSoftwareId: string): Promise<DetalheVerificacaoResultado>`

#### Segurança, operação e riscos

| Risco / Incerteza | Classificação | Mitigação Técnica |
| :--- | :--- | :--- |
| Presunção indevida de conformidade por falta de teste | Risco conceitual | Regra de domínio estrita: critério sem evidência explícita é classificado como `EVIDENCIA_INSUFICIENTE`. |
| Conflito de evidências para o mesmo critério | Risco de consistência | Detecção automática pelo motor e classificação do laudo como `DIVERGENCIA_ENCONTRADA`, exigindo investigação. |
| Invasão da autoridade de Verificação Agregada | Risco de governança | M-005 restringe-se a laudos técnicos de verificabilidade de software; o encerramento do Projeto e `COMPROMISSO_ATENDIDO` permanecem restritos ao Verificador Agregado do Projeto. |
| Degradação de performance por acúmulo de evidências brutas | Risco operacional | Armazenamento de cargas úteis em `JSONB` com índices nos identificadores chave e paginação nas consultas web. |

#### Critérios verificáveis e estratégia de testes

A realização da EV-005 demonstrará comprovadamente através de suíte automatizada que:

1. **Recepção e Registro de Resultados de Software:** O sistema registra e recupera instâncias de resultados de software identificáveis vinculadas às suas evoluções e módulos.
2. **Derivação e Gestão de Critérios Verificáveis:** O sistema cadastra critérios objetivos com descrição observável, método de medição e vínculo à sua origem normativa.
3. **Registro Estruturado de Evidências:** Evidências de testes automatizados e operacionais são persistidas com integridade, dados em `JSONB` e vínculo ao critério correspondente.
4. **Avaliação Técnica e Emissão de Laudos:** O motor avalia o conjunto de evidências e produz laudos conclusivos fundamentados com as categorias do modelo (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `DIVERGENCIA_ENCONTRADA`).
5. **Integração de Rastreabilidade:** Os laudos de verificação relacionam-se à cadeia causal de M-004, permitindo rastrear o laudo até o Compromisso da Necessidade N-001.
6. **Interface Web Responsiva de Verificação:** As páginas `/verificacao` e `/verificacao/:id` renderizam a matriz de conformidade, cards de status de critérios e detalhes dos laudos com Bootstrap 5.

**Estratégia de Testes:**
- Testes unitários de domínio para entidades de verificação, regras de avaliação de conformidade e invariantes de não presunção de sucesso.
- Testes de integração de repositório PostgreSQL e migração DDL validando integridade referencial e constraints.
- Testes de casos de uso do serviço de verificação cobrindo cenários demonstrados, divergentes e com evidência insuficiente.
- Testes de integração com o módulo web responsivo e rotas HTTP.

#### Custo técnico-operacional

A proposta técnica opera integralmente sob a **Baseline Essencial**, compartilhando a infraestrutura Node.js e a instância PostgreSQL já provisionada do NAAMIVE. O custo incremental mensal de infraestrutura é de **R$ 0,00** (zero reais).

#### Justificativa de suficiência e handoff

A presente Especificação da Entrega de Valor consolida de forma exaustiva o comportamento de produto, o modelo relacional de dados, os contratos de serviço, os critérios verificáveis e a estratégia de implementação. Não restam lacunas estruturais que exijam redescobrir o valor de negócio ou redesenhar a arquitetura técnica durante a realização.

## Plano de Realização e Decomposição em Itens de Trabalho

A realização técnica da EV-005 é estruturada em 4 Itens de Trabalho sequenciais e coesos, formalizados no [Plano de Realização da EV-005](plano-de-realizacao.md):

* [`IT-017`](../../itens-de-trabalho/IT-017/item-de-trabalho.md): Esquema Relacional PostgreSQL de Verificação de Software e Migrações
* [`IT-018`](../../itens-de-trabalho/IT-018/item-de-trabalho.md): Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade
* [`IT-019`](../../itens-de-trabalho/IT-019/item-de-trabalho.md): Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background
* [`IT-020`](../../itens-de-trabalho/IT-020/item-de-trabalho.md): Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada

## Handoff da Formação

A formação técnica da **EV-005 — Avaliação e Verificação da Entrega de Valor** foi integralmente concluída pelo **Especialista em Formação da Entrega de Valor**. A Especificação consolidada, os critérios verificáveis e o plano de realização foram entregues formalmente ao **Auditor da Entrega de Valor** para condução da auditoria independente da formação técnica.

## Resultado do Processo — Auditoria da Entrega de Valor

`FORMACAO_SUFICIENTE`

### Parecer técnico independente

A Especificação da **EV-005 — Avaliação e Verificação da Entrega de Valor** foi avaliada de forma independente pelo **Auditor da Entrega de Valor** a partir dos artefatos normativos do domínio, da Especificação Técnica aprovada de [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md#especificação-técnica-do-módulo), da Direção do Projeto [P-001](../../projetos/P-001/projeto.md#direção-do-projeto) e do Compromisso da Necessidade [N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade).

A avaliação conclui que a Formação é **suficiente para permitir futura realização sem redescoberta do valor de negócio nem redesenho da solução técnica de alto nível**:

1. **Intenção de valor e beneficiário:** A intenção de valor (permitir comprovar de forma observável, reproduzível e rastreável se o incremento de software integrado atende aos critérios verificáveis derivados do Compromisso e da Direção, emitindo laudos fundamentados e explicitando divergências) e os beneficiários (operador da jornada, Atores de governança, Verificador Agregado do Projeto e o Owner) estão rigorosamente alinhados com a capacidade delimitada de M-005 e concretizam o critério de atendimento da N-001 de levar a necessidade até software verificável.
2. **Fronteiras e não presunção de conformidade:** A especificação respeita integralmente as fronteiras de M-005 e do monólito modular. M-005 produz laudos e pareceres técnicos de verificabilidade; não implementa software, não coordena retrabalho (M-003), não compete com a rastreabilidade transversal (M-004), não usurpa o papel do Verificador Agregado do Projeto (`COMPROMISSO_ATENDIDO`) e não substitui a decisão soberana do Owner (`HOMOLOGADO_PELO_OWNER`). O princípio estrito de *Não Presunção de Conformidade* garante que ausência de evidência gere `EVIDENCIA_INSUFICIENTE`.
3. **Idempotência, imutabilidade e rastreabilidade:** O modelo relacional assegura que a reavaliação de um mesmo resultado com as mesmas evidências seja idempotente, que os laudos sejam imutáveis e auditáveis e que toda evidência e critério possuam vínculo causal explícito com a cadeia de proveniência preservada por M-004 até N-001.
4. **Arquitetura e Baseline Técnica:** A solução de alto nível está alinhada à **Baseline Essencial**, operando no mesmo ecossistema Node.js (TypeScript strict ESM) e PostgreSQL relacional com transações ACID, emulador `pg-mem` para testes rápidos, worker assíncrono em background e interface web com Bootstrap 5, com custo incremental de R$ 0,00.
5. **Critérios verificáveis e testabilidade:** Foram formalizados seis critérios de aceitação verificáveis cobrindo a recepção de resultados, cadastro de critérios, registro estruturado de evidências em `JSONB`, motor de avaliação com categorias internas (`CRITERIO_DEMONSTRADO`, `CRITERIO_NAO_DEMONSTRADO`, `EVIDENCIA_INSUFICIENTE`, `VERIFICACAO_IMPOSSIVEL`, `DIVERGENCIA_ENCONTRADA`), integração causal e interface web responsiva (`/verificacao`), acompanhados da respectiva estratégia de testes unitários, relacionais e de integração.

Com a emissão de `FORMACAO_SUFICIENTE`, o marco de formação é validamente superado. A Especificação da Entrega de Valor torna-se disponível para consumo posterior e o status da EV-005 avança legitimamente de `EM_FORMACAO` para **`FORMADA`**.

### Handoff da Auditoria

Com a aprovação independente da formação técnica (`FORMACAO_SUFICIENTE`), a **EV-005** encontra-se em status **`FORMADA`**. O artefato e seu contexto são entregues formalmente ao **Especialista em Planejamento da Realização** (`.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`) para abertura e coordenação da realização dos Itens de Trabalho no monólito executável.

## Realização

* **Plano de Realização da Entrega de Valor:** [Plano de Realização da EV-005](plano-de-realizacao.md)
* **Ator responsável pelo planejamento:** Especialista em Planejamento da Realização
* **Decisão Material do Owner:** Node.js (TypeScript strict ESM) + PostgreSQL relacional com interface web responsiva (Bootstrap 5) e worker desacoplado em background (Baseline Essencial, custo R$ 0,00).
* **Gatilho de Início da Realização:** Plano de Realização elaborado e aprovado com a materialização dos Itens de Trabalho `IT-017` a `IT-020`.
* **Transição de Status:** `FORMADA` → `EM_REALIZACAO`
* **Progresso da Realização:**
  - Itens de Trabalho [`IT-017`](../../itens-de-trabalho/IT-017/item-de-trabalho.md), [`IT-018`](../../itens-de-trabalho/IT-018/item-de-trabalho.md), [`IT-019`](../../itens-de-trabalho/IT-019/item-de-trabalho.md) e [`IT-020`](../../itens-de-trabalho/IT-020/item-de-trabalho.md) concluídos com sucesso pelo Ator Engenheiro de Software (`EXECUCAO_CONCLUIDA`).
  - Integração da Realização Técnica concluída com sucesso pelo Ator agêntico Integrador da Realização (`REALIZACAO_INTEGRADA`), com aprovação em `npm run typecheck`, `npm run build` e 100% de testes verdes (20 arquivos de teste e 143 testes automatizados aprovados sem regressões).
* **Situação da Realização:** `REALIZACAO_INTEGRADA` alcançada e validada com suíte completa de testes locais e execução operacional comprovada.

### Conclusão dos Itens de Trabalho e Integração Técnica

Todos os quatro Itens de Trabalho da cadeia de realização da EV-005 foram executados e concluídos com sucesso:
* [`IT-017 — Esquema Relacional PostgreSQL de Verificação de Software e Migrações`](../../itens-de-trabalho/IT-017/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
* [`IT-018 — Núcleo de Domínio de Verificação de Software e Motor de Avaliação de Conformidade`](../../itens-de-trabalho/IT-018/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
* [`IT-019 — Repositório PostgreSQL, Serviço de Aplicação de Verificação e Worker em Background`](../../itens-de-trabalho/IT-019/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)
* [`IT-020 — Camada Web Responsiva de Verificação, Matriz de Conformidade e Suíte Integrada`](../../itens-de-trabalho/IT-020/item-de-trabalho.md): `CONCLUIDO` (`EXECUCAO_CONCLUIDA`)

O Ator agêntico **Integrador da Realização**, atuando sob a Skill `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md`:
1. Validou a tipagem estrita via `npm run typecheck` (0 diagnósticos);
2. Validou a compilação global do sistema via `npm run build` (sucesso absoluto);
3. Executou a suíte integrada completa de testes via `npm test` (**20/20 arquivos de teste aprovados e 143/143 testes verdes — 100% de sucesso**);
4. Declarou a prontidão técnica global do software integrado e emitiu o Resultado do Processo **`REALIZACAO_INTEGRADA`** em 2026-10-04, devidamente registrado no [Plano de Realização](plano-de-realizacao.md).

### Handoff para Verificação da Entrega de Valor

A Entrega de Valor permanece no status **`EM_REALIZACAO`**. O software integrado da `EV-005` encontra-se operacionalmente disponível, e o **Integrador da Realização** formalizou o handoff oficial para o Ator agêntico **Verificador da Entrega de Valor** (`.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md`), para que proceda à avaliação substantiva da realização frente aos critérios de valor, beneficiários relevantes e resultados observáveis prometidos na Especificação da EV-005.


