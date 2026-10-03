# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A delimitação inicial e a formação técnica dos cinco Módulos do P-001 foram concluídas com Especificações Técnicas aprovadas por auditoria independente. A sequência normativa principal `01–07` da vertical Entrega de Valor e suas quatro Skills principais estão materializadas. A instância `EV-001 — Compromisso da Necessidade` foi formada e aprovada por auditoria independente com `FORMACAO_SUFICIENTE`.

A transição legítima da Entrega de Valor para a camada de Realização foi concluída com sucesso pelo Ator **Especialista em Planejamento da Realização** (conforme a Skill `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`):
1. Foi elaborado e aprovado o **Plano de Realização da Entrega de Valor** (`dados/entregas-de-valor/EV-001/plano-de-realizacao.md`), baseado na Baseline Essencial (Java 21, Spring Boot, PostgreSQL);
2. Foram materializados os 4 Itens de Trabalho da EV-001 (`IT-001` a `IT-004`) em `dados/itens-de-trabalho/`, com grafo DAG de dependências explícito;
3. O status de `EV-001` foi formalmente atualizado de `FORMADA` para `EM_REALIZACAO` no registro principal da EV e no Mapa do Módulo M-001;
4. O item de trabalho de fundação `IT-001` foi disponibilizado no status `PRONTO_PARA_EXECUCAO`.

## Governança transversal

* Localização normativa: `documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md`
* Descoberta tardia de lacuna não faz a condução retornar automaticamente a vertical ou Status anterior; marcos validamente alcançados e o histórico permanecem preservados.
* Ator agêntico pode identificar e propor Débito, mas sua validade depende de revisão e decisão humana competente.
* As naturezas conceituais iniciais são `Débito de Governança` e `Débito da Demanda`; Débito reconhecido pode ser bloqueante ou não bloqueante.
* Um Débito bloqueante impede o avanço pelo próximo marco dele dependente, sem provocar regressão; origem ou competência de tratamento é distinta da posição atual do ciclo.
* Entidade física, ciclo de vida, Status, armazenamento, fluxo de resolução e mecanismos de bloqueio de Débitos continuam não modelados.

## Entidades ativas

### Necessidade N-001

* Localização: `dados/necessidades/N-001/necessidade.md`
* Compromisso: aprovado pelo Owner (`APROVADO`, usuário autenticado `mhj`)
* Status: `EM_PROJETO`
* Projeto de origem: `P-001`, em vínculo exclusivo 1:1
* Artefato de saída: `Compromisso da Necessidade` disponível para consumo pelo Projeto

### Projeto P-001

* Localização: `dados/projetos/P-001/projeto.md`
* Identificador técnico: `5575efa1-c68e-464f-8393-07be8c9bc93a`
* Nome inicial: Jornada Autônoma do NAAMIVE
* Necessidade de origem: `N-001`
* Status: `FORMADO`
* Formação: aprovada pela auditoria independente, cobrindo `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO`
* Resultado de auditoria: `FORMACAO_SUFICIENTE`
* Artefato de saída: `Direção do Projeto` aprovada e disponível para a vertical Módulo

### Módulo

* Mapa canônico do P-001: `dados/projetos/P-001/mapa-de-modulos.md`
* Entrada: `Direção do Projeto` aprovada por `FORMACAO_SUFICIENTE`
* M-001 — Condução da Necessidade: `FORMADO`
  - Mapa de Entregas de Valor: `dados/modulos/M-001/mapa-de-entregas-de-valor.md` (registra EV-001 em `EM_REALIZACAO`)
* M-002 — Formação do Projeto: `FORMADO`
* M-003 — Coordenação do Trabalho: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-004 — Contexto e Rastreabilidade: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-005 — Verificação do Resultado de Software: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* Saída de cada instância aprovada: `Especificação Técnica do Módulo` aprovada; status `FORMADO`

### Entrega de Valor EV-001

* Localização normativa: `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md` a `07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md`
* Módulo proprietário: `M-001`
* Mapa canônico: `dados/modulos/M-001/mapa-de-entregas-de-valor.md`
* Registro principal: `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
* Plano de Realização: `dados/entregas-de-valor/EV-001/plano-de-realizacao.md`
* Status atual: `EM_REALIZACAO`
* Solução planejada: Baseline Essencial (Java 21, Spring Boot, PostgreSQL,Flyway, monólito modular).

### Itens de Trabalho da EV-001 (Camada de Realização)

* Localização normativa: `documentacao/item-de-trabalho/`
* Catálogo de instâncias ativas:
  - `IT-001`: Estrutura Base, Esquema de Persistência e Modelo Transacional — Status: `PRONTO_PARA_EXECUCAO` (disponível para execução)
  - `IT-002`: Domínio da Necessidade, Regras de Transição e Composição do Compromisso — Status: `CRIADO` (depende de IT-001)
  - `IT-003`: Adaptador de Autenticação do Owner e Portas de Integração — Status: `CRIADO` (depende de IT-002)
  - `IT-004`: Adaptador Web/HTTP e Suíte de Verificação Local Integrada — Status: `CRIADO` (depende de IT-003)

## Estado do bloqueio

**DESBLOQUEADO.** A camada de realização foi ativada legitimamente. O primeiro item técnico de trabalho (`IT-001`) está pronto e aguardando execução pelo Engenheiro de Software.

## Próxima ação legítima

Acionar o Ator agêntico **Engenheiro de Software** (carregando a Skill `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`) sobre a instância `IT-001` (`dados/itens-de-trabalho/IT-001/item-de-trabalho.md`), para:
1. Transicionar o status de `IT-001` de `PRONTO_PARA_EXECUCAO` para `EM_EXECUCAO`;
2. Inicializar a estrutura base do projeto Java 21 / Spring Boot com migrações Flyway e entidades de persistência conforme a Especificação de EV-001 e os critérios de aceitação de IT-001;
3. Executar a compilação e a suíte de testes locais de IT-001;
4. Registrar as evidências de execução e transicionar `IT-001` para `CONCLUIDO` (com `EXECUCAO_CONCLUIDA`), habilitando a prontidão de `IT-002`.

## Débitos e Gaps Identificados no Teste de Fogo

* **Débito de Governança — Baseline Técnica sem Decisão Humana Material do Owner**:
  - **Contexto do achado**: A baseline técnica (stack/linguagem/frameworks) foi assumida diretamente na Formação da Entrega de Valor sem rito formal de Decisão Humana Material do Owner. No modelo do NAAMIVE em produção, a escolha ou restrição de stack deve pertencer ao Owner (nível Projeto/Módulo ou Formação da EV), não podendo ser imposta tacitamente por agente.
  - **Tratamento previsto**: Não bloqueante para o teste de fogo em curso; a ser saneado no refinamento normativo da vertical Entrega de Valor (e/ou Projeto/Módulo) após o término do teste.

## Lacunas e limites vigentes

* Nenhuma linha de código de software foi implementada ainda nesta atividade (respeitando o limite estrito da Skill do Especialista em Planejamento da Realização).
* Persistência, infraestrutura física e pipeline CI/CD continuam no escopo local dos testes e da Baseline Essencial sem exigência de provisionamento externo antecipado.
* O consumo final de evidências pelo Verificador Agregado do Projeto e os efeitos em `CONCLUIDO` do P-001 e `ATENDIDA` da N-001 continuam sem caminho operacional formalizado.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md` a `07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md`
* `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`
* `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
* `dados/entregas-de-valor/EV-001/plano-de-realizacao.md`
* `dados/itens-de-trabalho/IT-001/item-de-trabalho.md`
