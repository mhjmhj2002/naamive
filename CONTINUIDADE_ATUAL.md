# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A delimitação inicial de Módulos do P-001 foi executada: o Mapa de Módulos foi materializado e cinco Módulos foram criados em `EM_FORMACAO`. A formação técnica do M-001 foi aprovada por auditoria independente; os demais Módulos ainda não receberam formação técnica.

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
* Delimitação executada pelo Especialista em Delimitação de Módulos, com cinco capacidades coesas e sem divisão por camada tecnológica
* Política de qualidade: heurística 10 / 15 / 20, sem limite normativo de Módulos por Projeto
* Heurística: cinco Módulos; abaixo da referência aproximada de 10 e sem alcançar os limiares de atenção (15) ou revisão estrutural forte (20)
* M-001 — Condução da Necessidade: `FORMADO`
* M-002 — Formação do Projeto: `EM_FORMACAO`
* M-003 — Coordenação do Trabalho: `EM_FORMACAO`
* M-004 — Contexto e Rastreabilidade: `EM_FORMACAO`
* M-005 — Verificação do Resultado de Software: `EM_FORMACAO`
* M-001: Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior; a continuação operacional não está modelada
* Saída de cada instância aprovada: `Especificação Técnica do Módulo` aprovada; status `FORMADO`

## Próxima ação

O próximo trabalho elegível é a formação técnica de M-002, M-003, M-004 ou M-005, pelo Especialista em Formação do Módulo. M-001 não possui continuação operacional modelada. P-001 permanece em `FORMADO`, e N-001 continua em `EM_PROJETO`.

## Lacunas e limites vigentes

* O mecanismo normativo permanente de geração de códigos de Projeto ainda não está definido; `P-001` foi aplicado pela convenção exemplificada e pela inexistência verificada de Projetos anteriores.
* Tecnologia, persistência física, orquestração e seleção concreta de executores ainda não estão definidas.
* A regra de atribuição de códigos de Módulo é `M-<sequencial>` por consulta aos registros existentes; a persistência e concorrência físicas dessa regra ainda não estão definidas.
* A Necessidade pode receber `CANCELAMENTO_APROVADO` enquanto está em `EM_PROJETO`, mas o efeito sobre o Projeto ativo ainda não tem regra normativa; não há propagação, novo status ou cancelamento automático definido.
* Casos de redelimitação que exijam encerrar, fundir ou substituir identidades de Módulo ainda não possuem mecanismo normativo completo e devem provocar decisão estrutural específica quando aparecerem na prática.
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
* `dados/projetos/P-001/mapa-de-modulos.md`
* `dados/modulos/M-001/modulo.md`
* `dados/modulos/M-002/modulo.md`
* `dados/modulos/M-003/modulo.md`
* `dados/modulos/M-004/modulo.md`
* `dados/modulos/M-005/modulo.md`
