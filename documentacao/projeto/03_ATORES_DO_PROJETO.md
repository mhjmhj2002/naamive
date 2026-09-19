# Atores do Projeto

Este documento é a fonte normativa dos Atores e das responsabilidades da vertical Projeto. O conceito transversal de Ator, Executor e Skill está em [Conceito de Ator](../atores/01_CONCEITO_DE_ATOR.md).

## Owner

* **Natureza:** humana.
* **Executor:** usuário autenticado.

Responsabilidades no Projeto:

* tomar decisões humanas materiais quando necessárias;
* esclarecer intenção material quando algo não puder ser legitimamente decidido pelo agente; e
* aprovar cancelamento do Projeto.

O Resultado do Processo associado à sua autoridade humana é `CANCELAMENTO_APROVADO`, definido normativamente em [Resultados do Processo do Projeto](07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md).

Não existe um segundo conceito concorrente de responsável pelo Projeto nesta versão.

## Especialista em Formação do Projeto

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/projeto/formacao-do-projeto/SKILL.md](../../.agents/skills/projeto/formacao-do-projeto/SKILL.md).

Responsabilidades:

* atuar como primeiro Ator agêntico após a Necessidade receber `APROVADO`;
* realizar o bootstrap inicial quando ainda não existir o Projeto 1:1 da Necessidade aprovada, materializando-o em `EM_FORMACAO`;
* atribuir o código conforme a convenção aplicável, propor ou gerar o nome inicial e preservar o vínculo estável com a Necessidade de origem;
* conduzir enquadramento, descoberta e direção da solução;
* investigar evidências;
* distinguir conhecido, inferido, proposto e desconhecido;
* tratar lacunas;
* recorrer ao Owner quando houver decisão material humana; e
* entregar a formação ao Auditor do Projeto.

Limites:

* não inventa fatos;
* não produz decisão humana;
* não cancela Projeto; e
* não exerce auditoria sobre o próprio trabalho como substituto do Ator especializado.

O bootstrap é parte inicial da formação, não uma responsabilidade de Ator distinto. Não há Ator separado para criação, materialização ou transição de Projeto, nem para cada etapa da formação nesta versão. Após o bootstrap, este mesmo Ator continua a formação normalmente; a auditoria permanece responsabilidade separada do Auditor do Projeto.

## Auditor do Projeto

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/projeto/auditoria-do-projeto/SKILL.md](../../.agents/skills/projeto/auditoria-do-projeto/SKILL.md).

Responsabilidades:

* verificar qualidade e suficiência da formação do Projeto;
* avaliar coerência, sustentação e direção da solução;
* identificar lacunas; e
* produzir os Resultados do Processo formais da auditoria e da verificação de formação, transicionando o Projeto para `FORMADO` quando produzir `FORMACAO_SUFICIENTE`.

Sua atuação se relaciona conceitualmente a `FORMACAO_SUFICIENTE` e `FORMACAO_INSUFICIENTE`. As definições normativas desses resultados pertencem exclusivamente a [Resultados do Processo do Projeto](07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md).

## Verificador Agregado do Projeto

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md](../../.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md).

Responsabilidades:

* atuar, quando a continuação operacional do Projeto for definida, após haver evidências suficientes do resultado produzido;
* verificar o resultado agregado produzido;
* comparar o resultado com o compromisso recebido da Necessidade;
* decidir tecnicamente se o compromisso foi atendido no nível do Projeto; e
* produzir os Resultados do Processo formais da verificação agregada.

Sua atuação se relaciona conceitualmente a `COMPROMISSO_ATENDIDO` e `COMPROMISSO_NAO_ATENDIDO`. As definições normativas desses resultados pertencem exclusivamente a [Resultados do Processo do Projeto](07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md).

Limites:

* não cancela Projeto;
* não substitui decisão humana;
* não executa diretamente trabalho corretivo; e
* não redefine a Necessidade de origem.

Este Ator permanece separado do Auditor do Projeto porque auditoria de formação e verificação agregada possuem responsabilidades diferentes. Seu ponto de entrada e seus efeitos no ciclo dependem de camada operacional ainda não definida. A especialização é preferível a um agente genérico acumulando funções.
