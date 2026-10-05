# DEB-TEC-001 — Ausência de Motor de Orquestração Autônoma de Agentes e Handoffs no Worker/Backend

## Ficha do Débito Técnico

| Campo | Valor |
| --- | --- |
| **Identificador** | `DEB-TEC-001` |
| **Título** | Ausência de motor de orquestração autônoma de agentes e handoffs no worker/backend |
| **Severidade** | `NAO_BLOQUEANTE` |
| **Natureza** | Débito Técnico (Arquitetura de Execução / Autonomia Agêntica) |
| **Origem / Competência de Tratamento** | Módulo `M-003 — Coordenação do Trabalho` / Infraestrutura de Worker e Orquestração |
| **Data de Registro** | 2026-10-04 |
| **Data de Resolução** | *Em Tratamento Prioritário (2026-10-04)* |
| **Status da Proposta** | **`EM_TRATAMENTO_PRIORITARIO`** (Determinação Soberana do Owner) |

---

## 1. Descrição do Desvio

Atualmente, o sistema NAAMIVE implementa em seu backend/worker uma arquitetura orientada a domínio (DDD) com persistência em PostgreSQL, filas de eventos e tarefas em background, além de serviços especializados de formação, coordenação, contexto e verificação.

Entretanto, observa-se uma dependência indevida de intervenção manual no chat/CLI a cada transição de Ator agêntico:
1. **Ausência de Despacho Autônomo de Handoffs:** Quando uma etapa agêntica é concluída (por exemplo, finalização de um Item de Trabalho ou emissão de laudo técnico de verificação), a passagem de bastão (handoff) para o próximo Ator agêntico não é acionada de forma autônoma pelo worker de backend.
2. **Dependência de Acionamento Manual:** O avanço entre papéis agênticos (ex.: Executor para Integrador, Integrador para Verificador, Delimitador para Formador) exige que um operador humano ou prompt externo invoque explicitamente o próximo agente via chat/CLI.
3. **Subutilização da Capacidade do Worker:** Embora o worker possua capacidade para processamento assíncrono de tarefas e verificação de regras de elegibilidade (como construído no módulo `M-003`), ele ainda não dispõe de um motor executivo de orquestração autônoma capaz de instanciar ou delegar a execução de subagentes com suas respectivas Skills operacionais de maneira contínua e autônoma.

---

## 2. Impacto e Riscos

* **Latência Operacional:** O ciclo de vida da demanda é interrompido a cada fronteira de Ator agêntico, aguardando intervenção externa no ambiente de chat ou terminal.
* **Sobrecarga Cognitiva do Operador:** Exige que a pessoa usuária/operador atue como "ponte humana" mecânica de acionamento entre agentes, papel que deveria ser delegado à infraestrutura autônoma de orquestração do sistema.
* **Não Bloqueante para o Valor Atual:** A condução do ciclo de vida e a integridade conceitual do NAAMIVE permanecem plenamente funcionais e rastreáveis, uma vez que as regras de governança, permissões e invariantes continuam sendo respeitadas em cada handoff, mesmo com despacho assistido.

---

## 3. Determinação do Owner e Proposta de Resolução Técnica

Em consonância com a determinação soberana do Owner para tratamento prioritário imediato do `DEB-TEC-001`, o **Arquiteto de Software** e **Especialista em Planejamento da Realização** elaborou a presente proposta formal de arquitetura e implementação.

### 3.1. Arquitetura do Despachante Autônomo no Worker/Backend

O despachante autônomo opera dentro do ciclo contínuo do `WorkerSegundoPlano` (`src/worker/worker-segundo-plano.ts`), atuando como o motor executivo da Coordenação do Trabalho (`M-003`), integrado causalmente à Rastreabilidade (`M-004`) e à Verificação (`M-005`):

```text
                ┌────────────────────────────────────────────────────────┐
                │             WorkerSegundoPlano (Backend)               │
                │                                                        │
                │  Loop de Polling Assíncrono (t = 250ms)                │
                │  ┌──────────────────────────────────────────────────┐  │
                │  │  DespachanteAutonomoAgentes                      │  │
                │  │  1. Inspeciona Fila de Handoffs Elegíveis        │  │
                │  │  2. Avalia Natureza do Ator Destinatário         │  │
                │  │  3. Filtra Invariantes e Gates Humanos (Owner)   │  │
                │  └──────────┬───────────────────────────┬───────────┘  │
                └─────────────┼───────────────────────────┼──────────────┘
                              │                           │
          [Ator Agêntico Especializado]         [Ator Humano / Owner]
                              │                           │
                              ▼                           ▼
                ┌───────────────────────────┐ ┌──────────────────────────┐
                │ ExecucaoAgenteAdapter     │ │ Ponto de Interrupção     │
                │ - Monta Contexto Canônico │ │ Humana (Human-in-the-Loop│
                │ - Localiza Skill em       │ │ - Status / Condição:     │
                │   .agents/skills/         │ │   AGUARDANDO_DECISAO_    │
                │ - Aciona Executor/Runtime │ │   HUMANA                 │
                │ - Registra Token e Início │ │ - Notifica Painel Web    │
                │   EM_EXECUCAO             │ │ - Aguarda Decisão Soberan│
                └─────────────┬─────────────┘ └──────────────────────────┘
                              │
                              ▼
                ┌───────────────────────────┐
                │ Retorno e Reconciliação   │
                │ - Valida Critérios Término│
                │ - Salva Retorno Imutável  │
                │ - Marca ENCERRADO         │
                │ - Libera Sucessores no DAG│
                └───────────────────────────┘
```

#### Componentes Estruturais da Solução:
1. **`DespachanteAutonomoAgentes` (`src/application/despachante-autonomo-agentes.ts`):**
   - Serviço de orquestração acoplado ao worker que avalia periodicamente o resultado de `ServicoAplicacaoCoordenacao.avaliarElegibilidadeTrabalhos()`.
   - Identifica trabalhos em condição operacional `PREPARADO` que tenham como destinatário um Ator agêntico com Skill principal canônica declarada.
   - Emite o Handoff estruturado com token único e despacha o agente sem exigir clique manual.
2. **`AdaptadorExecucaoAgente` (`src/infrastructure/adapters/adaptador-execucao-agente.ts`):**
   - Porta e adaptador que isola a mecânica de invocação de agentes (seja via SDK, CLI ou processo desacoplado).
   - Injeta no runtime do agente o conteúdo recuperável do handoff (referência a N-001, P-001, EV correspondente, critérios observáveis de término e manual da Skill).
3. **Trilha de Auditoria Causal no M-004:**
   - Para cada ciclo de despacho autônomo, registro imediato de evento de rastreabilidade (`AGENTE_DESPACHADO_AUTONOMAMENTE`, `RETORNO_AGENTE_RECEBIDO`) no repositório de contexto.

---

### 3.2. Fila de Handoffs Agênticos e Protocolo de Execução

A fila de handoffs aproveita o modelo relacional robusto já persistido na tabela `tarefas_trabalho` e `handoffs_coordenacao`:

1. **Ciclo de Despacho:**
   - O worker processa tarefas do tipo `DESPACHAR_HANDOFF_AUTONOMO`.
   - Garante concorrência segura (`SELECT ... FOR UPDATE` via `FilaTarefasPostgres`).
   - Evita duplicidade através do token de correlação idempotente `hdof-<codigo>-<timestamp>`.
2. **Transição de Condição Operacional:**
   - `POSSIVEL` → *(dependências satisfeitas)* → `PREPARADO` → *(despachante autônomo)* → `EM_EXECUCAO`.
3. **Ciclo de Retorno e Liberação Sucessora:**
   - O agente conclui sua atuação e invoca o callback/endpoint de retorno (`registrarRetornoExecucao`).
   - O worker valida a correspondência do critério observável de término.
   - Condição operacional passa para `ENCERRADO`.
   - O motor de coordenação recalcula o grafo de dependências e promove os trabalhos sucessores para `PREPARADO`, realimentando a fila de despacho autônomo.

---

### 3.3. Pontos de Interrupção Humana (Human-in-the-Loop)

A autonomia do despachante respeita estritamente a soberania da governança humana do NAAMIVE. O despachante é **terminantemente proibido** de auto-atribuir ou auto-aprovar etapas reservadas ao Ator Humano (`Owner`).

Ficam definidos como **Pontos de Interrupção Humana Mandatórios**:

1. **Aprovação do Compromisso da Necessidade:**
   - Etapa: Decisão Material do Owner em `N-001`.
   - Comportamento: O despachante avança a formação e qualificação da necessidade até `AGUARDANDO_DECISAO`. Nesse ponto, o trabalho é colocado em `AGUARDANDO_DECISAO_HUMANA`, sendo necessária a intervenção expressa do usuário autenticado `mhj`.
2. **Homologação Soberana da Entrega de Valor (`DEB-GOV-001`):**
   - Etapa: Encerramento da Entrega de Valor após laudo técnico (`EVOLUCAO_MATERIALIZADA`).
   - Comportamento: O despachante autônomo conduz todos os Itens de Trabalho (Engenheiro de Software, Integrador da Realização e Verificador da EV). Ao receber `EVOLUCAO_MATERIALIZADA`, o despachante **não transiciona** a EV para `CONCLUIDA`; suspende o fluxo em `AGUARDANDO_HOMOLOGACAO_OWNER` no painel web até a Decisão Material Humana `HOMOLOGADO_PELO_OWNER`.
3. **Bloqueios de Incerteza, Ambiguidade ou Divergência Técnica:**
   - Etapa: Registro de retorno com `sucesso: false` ou indicação de dilema normativo.
   - Comportamento: Transição imediata para `AGUARDANDO_DECISAO_HUMANA`. O worker emite alerta na interface web e aguarda a diretriz resolutiva do Owner (`liberarDecisaoHumanaOwner`).

---

### 3.4. Plano de Implementação da Resolução

A implementação do saneamento do `DEB-TEC-001` será decomposta nos seguintes passos técnicos executáveis:

1. **Fase 1 — Domínio e Casos de Uso de Orquestração:**
   - Criação da porta `PortaDespachoAgente` e serviço de aplicação `DespachanteAutonomoAgentes`.
   - Configuração de políticas de segurança para segregação de Atores agênticos e humanos.
2. **Fase 2 — Integração no Worker em Segundo Plano:**
   - Adição do manipulador `DESPACHAR_HANDOFF_AUTONOMO` e ciclo de varredura periódica de trabalhos `PREPARADO` no `WorkerSegundoPlano`.
   - Integração com `ServicoContexto` para gravação de telemetria causal completa.
3. **Fase 3 — Painel Web de Supervisão e Controles Human-in-the-Loop:**
   - Atualização da interface web (`/coordenacao`) com alternador de modo autônomo (Ativo / Pausado) e fila visual de handoffs despachados e pendências humanas.
4. **Fase 4 — Suíte de Testes e Validação Integrada:**
   - Testes unitários do despachante autônomo com simulação de encadeamento entre agentes (`Executor → Integrador → Verificador`).
   - Teste de contenção demonstrando que o motor para obrigatoriamente no gateway do Owner.
