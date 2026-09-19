# Atores do Módulo

Este documento é a fonte normativa dos Atores e responsabilidades da vertical Módulo. O conceito transversal de Ator, Executor e Skill está em [Conceito de Ator](../atores/01_CONCEITO_DE_ATOR.md).

## Owner

* **Natureza:** humana.
* **Executor:** usuário autenticado.

O Owner fornece contexto ou toma decisão humana material quando ela não puder ser legitimamente resolvida por evidência. Não há Skill para Owner.

## Especialista em Delimitação de Módulos

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/modulo/delimitacao-de-modulos/SKILL.md](../../.agents/skills/modulo/delimitacao-de-modulos/SKILL.md).

Recebe a Direção do Projeto aprovada, identifica capacidades coesas, propõe e justifica a divisão em Módulos, verifica sobreposições e lacunas, aplica a [heurística 10 / 15 / 20](01_DEFINICAO_DO_MODULO.md#heurística-de-qualidade-10--15--20), registra o Mapa de Módulos canônico no Projeto, materializa os Módulos necessários e preserva o vínculo com o Projeto de origem. Também executa a revisão de delimitação devolvida pela formação ou auditoria enquanto ela preservar as identidades existentes.

Não especifica tecnicamente cada Módulo em profundidade, não audita, não cria Entregas de Valor, Itens de Trabalho ou tarefas, e não implementa software.

## Especialista em Formação do Módulo

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/modulo/formacao-do-modulo/SKILL.md](../../.agents/skills/modulo/formacao-do-modulo/SKILL.md).

Recebe um Módulo materializado em `EM_FORMACAO`. Refina sua compreensão de capacidade e fronteira, conduz descoberta técnica, produz desenho técnico proporcional e entrega a formação ao Auditor do Módulo.

Se identificar fronteira estruturalmente errada, não redefine silenciosamente o conjunto de Módulos: registra um retorno estrutural e o entrega ao Especialista em Delimitação de Módulos conforme o ciclo. Se o retorno exigir alteração de identidade, registra a lacuna e aguarda decisão estrutural específica. Não audita, não cria Entregas de Valor, Itens de Trabalho ou tarefas, e não implementa software.

## Auditor do Módulo

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal:** [.agents/skills/modulo/auditoria-do-modulo/SKILL.md](../../.agents/skills/modulo/auditoria-do-modulo/SKILL.md).

Avalia independentemente coesão, responsabilidade, fronteiras, aderência à Direção do Projeto, sobreposições, dependências, descoberta, sustentação das decisões, proporcionalidade dos artefatos, desenho técnico e a distinção entre fatos, inferências, propostas e desconhecidos.

Produz exclusivamente os Resultados do Processo definidos em [Resultados do Processo do Módulo](07_RESULTADOS_DO_PROCESSO_DO_MODULO.md). Insuficiência técnica retorna ao Especialista em Formação do Módulo; problema de delimitação dispara o retorno estrutural ao Especialista em Delimitação de Módulos. Quando o problema exigir alteração de identidade, o parecer registra a lacuna e a necessidade de decisão estrutural específica. O Auditor não corrige silenciosamente o trabalho.
