# Continuidade atual do NAAMIVE

## Produto

NAAMIVE

## Momento atual

Os artefatos de saída das verticais Necessidade e Projeto foram formalizados e materializados nas instâncias existentes. A delimitação inicial e a formação técnica dos cinco Módulos do P-001 foram concluídas. As Especificações Técnicas de M-001 a M-005 foram aprovadas por auditoria independente. A vertical Entrega de Valor possui Definição, Modelo, Atores, Formação, Ciclo de Vida, Status normativos e Catálogo de Baselines Técnicas; Resultados do Processo, realização e mecanismos posteriores permanecem não definidos.

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
* M-002 — Formação do Projeto: `FORMADO`
* M-003 — Coordenação do Trabalho: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior
* M-004 — Contexto e Rastreabilidade: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior
* M-005 — Verificação do Resultado de Software: `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior
* M-001: Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior; a continuação operacional não está modelada
* M-002: Especificação Técnica aprovada por `FORMACAO_SUFICIENTE` e disponível para consumo posterior; a continuação operacional não está modelada
* M-003: coordenação lógica de trabalho aprovada, sem tecnologia física de orquestração, sem catálogo concreto de Executores e sem modelar verticais futuras de trabalho
* M-004: preservação, recuperação proporcional e correlação de contexto aprovadas, sem se tornar fonte de verdade das demais capacidades e sem tecnologia física definida
* M-005: critérios verificáveis derivados da origem, evidências e conclusões técnicas proporcionais, tratamento de incerteza, rastreabilidade, repetição e atualidade aprovados; não implementa, não coordena retrabalho, não decide humanamente nem produz conclusão agregada
* Saída de cada instância aprovada: `Especificação Técnica do Módulo` aprovada; status `FORMADO`

### Entrega de Valor

* Localização normativa: `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md`
* Conceito formalizado: evolução finita de software, pertencente a exatamente um Módulo, que materializa parte de sua capacidade em resultado utilizável, perceptível, demonstrável e verificável pelo usuário
* Modelo formalizado: `documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md`
* Modelo: identidade própria, vínculo obrigatório com exatamente um Módulo, intenção de valor, beneficiário, resultado observável esperado, fronteira finita, rastreabilidade e conteúdo capaz de receber formação técnica progressiva
* Atores formalizados: Owner humano transversal; Especialista em Delimitação de Entregas de Valor; Especialista em Formação da Entrega de Valor; Auditor da Entrega de Valor; e Verificador da Entrega de Valor
* Separação vigente: Delimitador identifica e materializa evoluções coesas; Formador prepara produto e solução técnica de alto nível; Auditor avalia a suficiência da formação; Verificador avalia futuramente o resultado integrado de software. Nenhum deles decompõe ou executa Work Item.
* Relações de verificação: M-005 é capacidade de software do NAAMIVE e não substitui o Verificador da EV; este pode oferecer evidências ao Verificador Agregado do Projeto, sem concluir Projeto ou atender Necessidade
* Papel: ponte entre intenção de produto e execução técnica; decisões técnicas de alto nível pertencem à futura Formação da Entrega de Valor ou são herdadas de nível superior, sem redescoberta sistemática por Work Item
* Formação formalizada: `documentacao/entrega-de-valor/04_FORMACAO_DA_ENTREGA_DE_VALOR.md`; atua sobre EV já delimitada, aprofunda produto e solução técnica de alto nível e consolida conceitualmente a `Especificação da Entrega de Valor`, sem criar instância ou forma física obrigatória
* Ciclo de Vida formalizado: `documentacao/entrega-de-valor/05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md`; define materialização pelo Delimitador, formação, auditoria independente, retornos causais à Formação, à Delimitação ou ao nível competente, futura realização integrada, verificação, conclusão e cancelamento humano excepcional
* Status formalizados: `documentacao/entrega-de-valor/06_STATUS_DA_ENTREGA_DE_VALOR.md`; catálogo oficial `EM_FORMACAO`, `FORMADA`, `EM_REALIZACAO`, `CONCLUIDA` e `CANCELADA`, como marcos progressivos, não regressivos e persistentes do ciclo
* Catálogo de referência: `documentacao/entrega-de-valor/referencias/CATALOGO_DE_BASELINES_TECNICAS.md`; não é entidade, Skill, Ciclo de Vida, Status, Resultado do Processo nem instância
* Baselines: a Essencial é o ponto da proposta inicial concreta; a Equilibrada e a Avançada são níveis posteriores de escalada explícita. Para solução nova, a proposta parte de monólito modular, sem sugerir inicialmente microserviços ou grandes provedores de nuvem
* Interação cíclica com Owner: a Formação recupera contexto, investiga, propõe, explica, estima, colhe reação e refina; não começa por questionário técnico nem transfere arquitetura ao Owner
* Custo: a proposta considera custo técnico-operacional total proporcional e informa estimativa mensal quando houver infraestrutura executável, sem congelar preços na normativa
* Decisões: decisões superiores válidas são herdadas; decisões restritas à EV podem ser tomadas pelo Formador quando sustentadas; decisões locais legítimas permanecem para execução; alcance superior retorna ao nível competente, cujo mecanismo formal de armazenamento continua lacuna
* Jornada e Fluxo: conceitos relacionados descritivos, sem se tornarem entidades formais
* Escopo ainda não definido: Skills, Resultados do Processo, Work Item, realização, homologação, mecanismos de implementação e armazenamento formal de decisões técnicas de alcance superior; Auditoria ainda não possui Skill
* Não existem instâncias de Entrega de Valor, registros em dados, Item de Trabalho, tarefa ou continuação operacional automática dos Módulos

## Próxima ação

A próxima ação conceitual esperada é definir 07 — Resultados do Processo da Entrega de Valor. O catálogo de Status formalizado consolida as posições `EM_FORMACAO`, `FORMADA`, `EM_REALIZACAO`, `CONCLUIDA` e `CANCELADA`; o `07` deve consolidar apenas as conclusões, determinações e decisões produzidas por atividades relevantes, sem criar etapas novas. Não há Skill, vertical Work Item ou vertical de realização definida. M-001 a M-005 permanecem em `FORMADO`; P-001 permanece em `FORMADO`, e N-001 continua em `EM_PROJETO`.

## Lacunas e limites vigentes

* O mecanismo normativo permanente de geração de códigos de Projeto ainda não está definido; `P-001` foi aplicado pela convenção exemplificada e pela inexistência verificada de Projetos anteriores.
* M-002 definiu o invariante lógico de bootstrap idempotente `1 Necessidade aprovada → exatamente 1 Projeto`; persistência, unicidade física, transação, concorrência, retry, transporte e confirmação continuam sem mecanismo materializado.
* O cancelamento de Projeto aprovado pelo Owner possui efeito normativo de levar a Necessidade de origem a `CANCELADA`; o efeito inverso de uma Necessidade cancelada em `EM_PROJETO` sobre Projeto ativo continua sem regra normativa e não deve ser automatizado.
* Tecnologia, persistência física, orquestração e seleção concreta de executores ainda não estão definidas.
* A regra de atribuição de códigos de Módulo é `M-<sequencial>` por consulta aos registros existentes; a persistência e concorrência físicas dessa regra ainda não estão definidas.
* A Necessidade pode receber `CANCELAMENTO_APROVADO` enquanto está em `EM_PROJETO`, mas o efeito sobre o Projeto ativo ainda não tem regra normativa; não há propagação, novo status ou cancelamento automático definido.
* Casos de redelimitação que exijam encerrar, fundir ou substituir identidades de Módulo ainda não possuem mecanismo normativo completo e devem provocar decisão estrutural específica quando aparecerem na prática.
* A continuação operacional posterior à `Especificação Técnica do Módulo` permanece deliberadamente não modelada. A Definição, o Modelo, os Atores, a Formação, o Ciclo de Vida, os Status e o Catálogo de Baselines Técnicas da Entrega de Valor existem; Skills, Resultados do Processo, instâncias, Work Item e mecanismos de realização ainda não foram definidos.
* O Catálogo de Baselines Técnicas não define armazenamento, aprovação ou recuperação formal de decisões de arquitetura de alcance superior; esse mecanismo continua lacuna para tratamento posterior.
* M-003 definiu somente contratos lógicos de coordenação: a seleção concreta e disponibilidade de Executor, persistência, comunicação, orquestração, concorrência física, retry, timeout, escala, observabilidade, autenticação concreta e modelo físico de histórico permanecem desconhecidos. A ausência de Executor compatível bloqueia o despacho, mas não a formação técnica do Módulo.
* M-004 definiu contratos lógicos aprovados de preservação, recuperação proporcional e correlação de contexto sem se tornar fonte de verdade das demais capacidades. Persistência, busca, indexação, formato de referências, armazenamento de evidências externas, retenção, versionamento físico, autenticação, autorização, confidencialidade, concorrência, escala, cache e observabilidade permanecem desconhecidos; não bloqueiam a realização futura.
* M-005 definiu verificabilidade técnica proporcional, mas não há código, resultado executável, testes, CI, ambiente ou evidência real de comportamento no repositório versionado. A forma física do resultado, método e ambiente de observação, automação, armazenamento de evidência, autenticação, retenção, versionamento físico e observabilidade permanecem desconhecidos e não bloqueiam a auditoria da formação.
* A relação operacional entre a conclusão técnica de M-005 e o Verificador Agregado do Projeto não está definida. M-005 pode fornecer evidências a esse Ator futuro, mas não produz `COMPROMISSO_ATENDIDO` ou `COMPROMISSO_NAO_ATENDIDO`; os efeitos desses Resultados, o caminho de P-001 para `CONCLUIDO` e, por consequência, a transição de N-001 para `ATENDIDA` continuam sem mecanismo normativo atual.
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
* `documentacao/entrega-de-valor/01_DEFINICAO_DA_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/02_MODELO_DE_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/03_ATORES_DA_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/04_FORMACAO_DA_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/06_STATUS_DA_ENTREGA_DE_VALOR.md`
* `documentacao/entrega-de-valor/referencias/CATALOGO_DE_BASELINES_TECNICAS.md`
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
