# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A delimitação inicial e a formação técnica dos cinco Módulos do P-001 foram concluídas com Especificações Técnicas aprovadas por auditoria independente. A sequência normativa principal `01–07` da vertical Entrega de Valor e suas quatro Skills principais estão materializadas. A instância `EV-001 — Compromisso da Necessidade` foi formada e aprovada por auditoria independente com `FORMACAO_SUFICIENTE`, alcançando `FORMADA`, com Mapa canônico e registro principal coerentes.

A lacuna estrutural que impedia uma Entrega de Valor formada de prosseguir legitimamente para a Realização (descoberta no teste de fogo) foi formalmente saneada em nível de governança e arquitetura. Foi criada a vertical completa de **Item de Trabalho** (com sequência normativa `01_DEFINICAO` a `07_RESULTADOS_DO_PROCESSO` em `documentacao/item-de-trabalho/`), modelando a unidade operacional de trabalho de engenharia de software, o mecanismo formal de início da realização (via `Plano de Realização da Entrega de Valor`), os Atores especializados (`Especialista em Planejamento da Realização`, `Engenheiro de Software` e `Integrador da Realização`), o fluxo de integração técnica e suas respectivas Skills operacionais.

Nenhum Item de Trabalho da EV-001 foi decomposto nesta atividade, nenhuma linha de software da EV-001 foi implementada e o status de EV-001 permanece estritamente em `FORMADA`. O bloqueio arquitetural que impedia o avanço legítimo foi sanado.

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
* M-002 — Formação do Projeto: `FORMADO`
* M-003 — Coordenação do Trabalho: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-004 — Contexto e Rastreabilidade: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* M-005 — Verificação do Resultado de Software: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`
* Saída de cada instância aprovada: `Especificação Técnica do Módulo` aprovada; status `FORMADO`

### Entrega de Valor

* Localização normativa: `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md` a `07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md`
* Catálogo de referência: `documentacao/entrega-de-valor/referencias/CATALOGO_DE_BASELINES_TECNICAS.md`
* Atores formalizados: Owner; Especialista em Delimitação de Entregas de Valor; Especialista em Formação da Entrega de Valor; Auditor da Entrega de Valor; Verificador da Entrega de Valor.
* Instância `EV-001 — Compromisso da Necessidade`:
  - Módulo proprietário: `M-001`
  - Mapa canônico: `dados/modulos/M-001/mapa-de-entregas-de-valor.md`
  - Registro principal: `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
  - Status atual: `FORMADA` (com `FORMACAO_SUFICIENTE`)
  - A realização ainda não foi iniciada; EV-001 aguarda legitimamente o Ator de Planejamento da Realização para elaborar o seu Plano de Realização e acionar `EM_REALIZACAO`.

### Item de Trabalho (Camada de Realização)

* Localização normativa: `documentacao/item-de-trabalho/`
  - `01_DEFINICAO_DO_ITEM_DE_TRABALHO.md`: conceito de unidade de execução técnica subordinada a exatamente uma EV (`1 : 1..N`); separação entre decisões de alto nível (Formação da EV) e locais (Item de Trabalho).
  - `02_MODELO_DE_ITEM_DE_TRABALHO.md`: atributos (UUID v4, código `IT-<sequencial>`, vínculo perene com a EV), Plano de Realização da EV (`plano-de-realizacao.md`) e estrutura de instância (`dados/itens-de-trabalho/<IT>/item-de-trabalho.md`).
  - `03_ATORES_DO_ITEM_DE_TRABALHO.md`: Owner humano, Especialista em Planejamento da Realização, Engenheiro de Software e Integrador da Realização.
  - `04_PLANEJAMENTO_E_DECOMPOSICAO.md`: princípios de decomposição, DAG de dependências e gatilho de início da Realização da EV (`FORMADA → EM_REALIZACAO`).
  - `05_CICLO_DE_VIDA_DO_ITEM_DE_TRABALHO.md`: fases `CRIADO → PRONTO_PARA_EXECUCAO → EM_EXECUCAO → CONCLUIDO` (e ramos de exceção `BLOQUEADO` / `CANCELADO`), além da conexão com a etapa de integração e a Verificação da EV.
  - `06_STATUS_DO_ITEM_DE_TRABALHO.md`: catálogo oficial exclusivo (`CRIADO`, `PRONTO_PARA_EXECUCAO`, `EM_EXECUCAO`, `BLOQUEADO`, `CONCLUIDO`, `CANCELADO`).
  - `07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md`: catálogo oficial de resultados (`EXECUCAO_CONCLUIDA`, `EXECUCAO_IMPEDIDA`, `REALIZACAO_INTEGRADA`, `REALIZACAO_INSUFICIENTE`).
* Skills principais materializadas:
  - `planejamento-da-realizacao` (`.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`)
  - `execucao-do-item-de-trabalho` (`.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`)
  - `integracao-da-realizacao` (`.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md`)

## Causa raiz sanada

A interrupção do teste de fogo após a formação de `EV-001` decorreu da inexistência de:
1. uma vertical que formalizasse a unidade técnica executável de engenharia (Item de Trabalho);
2. Atores e Skills agênticas com responsabilidade de planejar a realização (decompor sem reinventar arquitetura), implementar o código com testes locais e integrar o resultado técnico; e
3. mecanismo formal de transição de uma Entrega de Valor de `FORMADA` para `EM_REALIZACAO` e de entrega ao `Verificador da Entrega de Valor`.

Com a introdução da vertical `item-de-trabalho` e suas Skills, a lacuna foi eliminada mantendo a integridade de todas as verticais precedentes.

## Estado do bloqueio

**DESBLOQUEADO.** A governança, os conceitos, os catlogos normativos de status e resultados, o ciclo de vida e as Skills operacionais para guiar os agentes a partir de uma Entrega de Valor formada até o software integrado e verificável estão plenamente estabelecidos.

## Próxima ação legítima

Acionar o Ator agêntico **Especialista em Planejamento da Realização** (carregando a Skill `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`) sobre a instância `EV-001 — Compromisso da Necessidade`, para:
1. Ler a Especificação de `EV-001` e a Especificação de `M-001`;
2. Criar o Plano de Realização da Entrega de Valor (`dados/entregas-de-valor/EV-001/plano-de-realizacao.md`);
3. Materializar os Itens de Trabalho necessários da EV-001 (`IT-001`, etc.); e
4. Transicionar formalmente o status de `EV-001` de `FORMADA` para `EM_REALIZACAO`.

## Lacunas e limites vigentes

* Não há instâncias de Item de Trabalho materializadas ainda (o que é esperado antes do planejamento de EV-001).
* Persistência, infraestrutura física, orquestrador de execução em runtime e concorrência física de agentes continuam como lacunas tecnológicas não bloqueantes, sendo operadas atualmente pela governança documental serial.
* O consumo final de evidências pelo Verificador Agregado do Projeto e os efeitos em `CONCLUIDO` do P-001 e `ATENDIDA` da N-001 continuam sem caminho operacional formalizado.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/atores/01_CONCEITO_DE_ATOR.md`
* `documentacao/governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md`
* `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md` a `07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md`
* `documentacao/item-de-trabalho/01_DEFINICAO_DO_ITEM_DE_TRABALHO.md` a `07_RESULTADOS_DO_PROCESSO_DO_ITEM_DE_TRABALHO.md`
* `.agents/skills/item-de-trabalho/planejamento-da-realizacao/SKILL.md`
* `.agents/skills/item-de-trabalho/execucao-do-item-de-trabalho/SKILL.md`
* `.agents/skills/item-de-trabalho/integracao-da-realizacao/SKILL.md`
* `dados/modulos/M-001/modulo.md`
* `dados/modulos/M-001/mapa-de-entregas-de-valor.md`
* `dados/entregas-de-valor/EV-001/entrega-de-valor.md`
