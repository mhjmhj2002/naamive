# Atores da Necessidade

Este documento é a fonte normativa dos Atores e das responsabilidades da vertical Necessidade. O conceito transversal de Ator, Executor e Skill está em [Conceito de Ator](../atores/01_CONCEITO_DE_ATOR.md).

## Owner

* **Natureza:** humana.
* **Executor:** usuário autenticado.

Responsabilidades na Necessidade:

* fornecer contexto material quando necessário;
* confirmar intenção quando o processo exigir decisão humana;
* tomar decisões humanas materiais;
* aprovar o compromisso; e
* aprovar cancelamento.

Os Resultados do Processo associados à sua autoridade humana são `APROVADO` e `CANCELAMENTO_APROVADO`, definidos normativamente em [Resultados do Processo da Necessidade](07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md).

O Owner não executa a auditoria agêntica, não substitui pesquisa ou investigação que cabe ao agente, não produz recomendação agêntica e não é obrigado a coordenar manualmente cada etapa do processo.

## Especialista em Formação da Necessidade

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal conceitual:** Formação da Necessidade.

Responsabilidades:

* conduzir formação interativa;
* compreender a entrada;
* investigar quando possível;
* esclarecer;
* reformular;
* apoiar brainstorm;
* identificar necessidade de decomposição;
* consolidar a Necessidade no nível adequado; e
* recorrer ao Owner quando informação essencial não puder ser descoberta ou quando existir decisão material humana.

Limites:

* não inventa fatos;
* não realiza decisão humana de compromisso;
* não cancela Necessidade;
* não assume papel de Auditor da Necessidade; e
* não realiza qualificação como se fosse o ator especializado dela.

Não há Atores separados para cada tratamento interno da formação.

## Auditor da Necessidade

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal conceitual:** Auditoria da Necessidade.

Responsabilidades:

* avaliar a qualidade e a suficiência da formação;
* identificar lacunas;
* produzir os Resultados do Processo de auditoria atualmente definidos; e
* não alterar unilateralmente o compromisso humano.

Sua atuação se relaciona conceitualmente a `QUALIFICAVEL`, `PRECISA_DE_ESCLARECIMENTO`, `PRECISA_DE_DECOMPOSICAO` e `NAO_CARACTERIZA_NECESSIDADE`. As definições normativas desses resultados pertencem exclusivamente a [Resultados do Processo da Necessidade](07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md).

## Especialista em Qualificação da Necessidade

* **Natureza:** agêntica.
* **Executor:** agente especializado.
* **Skill principal conceitual:** Qualificação da Necessidade.

Responsabilidades:

* avaliar valor;
* avaliar prioridade;
* avaliar aderência;
* avaliar restrições;
* avaliar dependências;
* avaliar os demais elementos definidos na qualificação; e
* produzir recomendação ao Owner.

Sua atuação se relaciona conceitualmente a `ASSUMIR_COMPROMISSO` e `NAO_ASSUMIR_COMPROMISSO`, definidos normativamente em [Resultados do Processo da Necessidade](07_RESULTADOS_DO_PROCESSO_DA_NECESSIDADE.md).

Recomendação não é decisão humana. Este Ator não pode produzir `APROVADO` nem cancelar unilateralmente a Necessidade.
