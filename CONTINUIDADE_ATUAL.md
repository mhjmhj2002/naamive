# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A vertical Módulo está normativamente definida: recebe a Direção do Projeto, delimita e materializa Módulos e forma tecnicamente cada instância até sua auditoria. Nenhuma instância de Módulo foi criada.

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
* Status: `EM_FORMACAO`
* Formação: aprovada pela auditoria independente, cobrindo `ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO`
* Resultado de auditoria: `FORMACAO_SUFICIENTE`
* Artefato de saída: `Direção do Projeto` aprovada e disponível para a vertical Módulo

### Módulo

* Estado normativo: vertical definida, sem instâncias materializadas
* Entrada: `Direção do Projeto` aprovada por `FORMACAO_SUFICIENTE`
* Primeiro Ator elegível: Especialista em Delimitação de Módulos
* Política de qualidade: heurística 10 / 15 / 20, sem limite normativo de Módulos por Projeto
* Saída de cada instância formada: `Especificação Técnica do Módulo` aprovada

## Próxima ação

Executar o teste de fogo da delimitação de Módulos do P-001: o Especialista em Delimitação de Módulos deve consumir a Direção do Projeto e avaliar as capacidades coesas necessárias. Essa ação ainda não foi executada. P-001 continua em `EM_FORMACAO`, e N-001 continua em `EM_PROJETO`.

## Lacunas e limites vigentes

* O mecanismo normativo permanente de geração de códigos de Projeto ainda não está definido; `P-001` foi aplicado pela convenção exemplificada e pela inexistência verificada de Projetos anteriores.
* Tecnologia, persistência física, orquestração e seleção concreta de executores ainda não estão definidas.
* O mecanismo normativo permanente de geração de códigos de Módulo ainda não está definido.
* A mecânica de divisão ou fusão de Módulos permanece lacuna deliberada, a ser refinada pelo teste de fogo quando necessário.
* A continuação operacional posterior à `Especificação Técnica do Módulo` permanece deliberadamente não modelada; Entrega de Valor não foi definida.
* A heurística 10 / 15 / 20 gera atenção e revisão, nunca reprovação automática, e é candidata a parametrização futura.
* Os artefatos de saída não substituem as entidades completas, seus status, Resultados do Processo, decisões humanas, histórico ou evidências.

## Arquivos mínimos para continuar

* `AGENTS.md`
* `README.md`
* `CONTINUIDADE_ATUAL.md`
* `documentacao/necessidade/01_DEFINICAO_DA_NECESSIDADE.md`
* `documentacao/necessidade/02_MODELO_DE_NECESSIDADE.md`
* `documentacao/projeto/01_DEFINICAO_DO_PROJETO.md`
* `documentacao/projeto/02_MODELO_DE_PROJETO.md`
* `documentacao/projeto/03_ATORES_DO_PROJETO.md`
* `documentacao/projeto/04_FORMACAO_DO_PROJETO.md`
* `documentacao/projeto/05_CICLO_DE_VIDA_DO_PROJETO.md`
* `documentacao/projeto/06_STATUS_DO_PROJETO.md`
* `documentacao/projeto/07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md`
* `documentacao/modulo/01_DEFINICAO_DO_MODULO.md`
* `documentacao/modulo/02_MODELO_DE_MODULO.md`
* `documentacao/modulo/03_ATORES_DO_MODULO.md`
* `documentacao/modulo/04_FORMACAO_DO_MODULO.md`
* `documentacao/modulo/05_CICLO_DE_VIDA_DO_MODULO.md`
* `documentacao/modulo/06_STATUS_DO_MODULO.md`
* `documentacao/modulo/07_RESULTADOS_DO_PROCESSO_DO_MODULO.md`
* `.agents/skills/modulo/delimitacao-de-modulos/SKILL.md`
* `.agents/skills/modulo/formacao-do-modulo/SKILL.md`
* `.agents/skills/modulo/auditoria-do-modulo/SKILL.md`
* `dados/necessidades/N-001/necessidade.md`
* `dados/projetos/P-001/projeto.md`
