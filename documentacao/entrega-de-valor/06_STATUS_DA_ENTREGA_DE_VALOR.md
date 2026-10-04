# Status da Entrega de Valor

## Finalidade

Este é o catálogo oficial e a única fonte normativa dos Status da entidade Entrega de Valor.

Status responde à pergunta:

> Onde a Entrega de Valor está no seu ciclo de vida?

Ele não representa atividade em curso, fila, transferência entre Atores, conclusão de Auditoria ou Verificação, decisão humana, condição isolada, mecanismo de realização ou Resultado do Processo.

## Catálogo oficial

| Status | Definição |
| --- | --- |
| `EM_FORMACAO` | A Entrega de Valor foi validamente materializada pelo Especialista em Delimitação de Entregas de Valor e ainda não superou o marco de formação. Nesse Status ocorrem a Formação, a Auditoria independente e os ciclos de tratamento necessários até que a formação seja considerada suficiente. |
| `FORMADA` | A Formação foi considerada suficiente pela Auditoria independente, a Especificação da Entrega de Valor está disponível e a Entrega de Valor está apta à realização, que ainda não foi efetivamente iniciada. |
| `EM_REALIZACAO` | A realização foi efetivamente iniciada. A Entrega de Valor permanece nesse Status durante o desenvolvimento, a integração, a Verificação técnica da Entrega de Valor e a homologação do Owner. |
| `CONCLUIDA` | Status terminal de sucesso, alcançado exclusivamente quando as condições de conclusão do Ciclo de Vida forem satisfeitas conjuntamente: software integrado correspondente, evolução utilizável e perceptível conforme a Entrega de Valor, Verificação técnica positiva (`EVOLUCAO_MATERIALIZADA`) e Homologação favorável do Owner (`HOMOLOGADO_PELO_OWNER`). |
| `CANCELADA` | Status terminal excepcional, alcançado exclusivamente por decisão humana material válida de cancelamento. |

O fluxo de referência é:

```text
EM_FORMACAO
→ FORMADA
→ EM_REALIZACAO
→ CONCLUIDA

CANCELADA
← encerramento excepcional a partir de qualquer posição não terminal,
   mediante decisão humana material válida
```

Esse fluxo consolida as posições e os encerramentos já definidos no [Ciclo de Vida da Entrega de Valor](05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md). Não cria etapa, retorno, loop ou mecanismo operacional adicional.

## Status como marco progressivo e ponto de controle persistente

Os Status representam marcos progressivos do ciclo de vida. O Status de uma Entrega de Valor é a última posição do ciclo validamente alcançada e persistida por ela; por isso, é o ponto de controle confiável para retomar o processo após interrupção, inclusive quando outro Agente assumir o trabalho.

Trabalho parcial, intenção de transição ou proximidade aparente de um marco não autorizam antecipar o Status. Artefatos e demais registros preservam o trabalho parcial; o Status preserva o último marco seguro do ciclo.

Por exemplo:

```text
formação 99% executada
+ marco FORMADA ainda não validamente alcançado e persistido
= EM_FORMACAO
```

Se houver interrupção nessa condição, o próximo Agente recupera `EM_FORMACAO`, recupera e revalida o trabalho existente e continua desse marco. Se `FORMADA` já tiver sido validamente alcançado e persistido, o marco de formação deve ser reconhecido como superado, e a retomada começa dessa posição.

O Status não precisa descrever exatamente a atividade executada no instante da interrupção. Assim, Auditoria, Verificação, espera por contexto ou tratamento de problema podem estar em curso sem constituírem novo Status.

## Não regressão e retornos causais

Uma vez validamente alcançado um marco posterior, a Entrega de Valor não regride a Status anterior apenas porque uma descoberta posterior exige atuação de Ator de etapa anterior.

```text
EM_REALIZACAO
→ descoberta de problema relacionado à formação
→ tratamento pelo Ator competente
→ permanece EM_REALIZACAO
```

Portanto, retorno causal é o encaminhamento do problema ao Ator ou nível competente para tratamento. Não significa regressão automática do Status da Entrega de Valor:

```text
EM_REALIZACAO
→ EM_FORMACAO
```

Esse percurso não é admitido como consequência automática do retorno. Cada posição não terminal pode conter ciclos internos de tratamento e reavaliação antes de alcançar o próximo marco.

## `EM_FORMACAO`

A Entrega de Valor ingressa em `EM_FORMACAO` quando é validamente materializada pelo Especialista em Delimitação de Entregas de Valor. A materialização pressupõe a evolução delimitada dentro de Módulo com formação técnica aprovada, com identidade, vínculo ao Módulo, intenção de valor, beneficiário, resultado observável inicial e fronteira inicial suficientes para iniciar a Formação. O identificador, o código, o Mapa canônico, o registro principal e a estrutura mínima obrigatória são os definidos no [Modelo de Entrega de Valor](02_MODELO_DE_ENTREGA_DE_VALOR.md#materialização-no-modelo-operacional-atual).

Nesse Status ocorrem a Formação da Entrega de Valor, a Auditoria independente e as novas avaliações necessárias. Problema de formação é tratado pelo Especialista em Formação da Entrega de Valor; problema estrutural de delimitação retorna ao Especialista em Delimitação de Entregas de Valor; e questão de alcance superior retorna ao nível competente. Nenhum desses encaminhamentos cria Status próprio.

Enquanto o marco de formação não tiver sido validamente superado e persistido, a Entrega de Valor permanece `EM_FORMACAO`, independentemente do percentual de trabalho aparente, de transferência para Auditoria, de espera ou de quantas revisões forem necessárias.

## `FORMADA`

`FORMADA` é posição real do ciclo, não fila, atividade ou indicador de disponibilidade futura. A Entrega de Valor somente a alcança quando sua Formação foi considerada suficiente pela Auditoria independente e a Especificação da Entrega de Valor está disponível.

Nesse ponto, o marco de formação foi superado, a Entrega de Valor está apta à realização e a realização ainda não foi efetivamente iniciada. A permanência em `FORMADA` pode ser curta ou longa, sem que isso altere a validade dessa posição.

A conclusão da Auditoria que reconhece a suficiência da Formação é Resultado do Processo, não Status. Ela não significa software existente, integrado, homologado ou evolução concluída.

## `EM_REALIZACAO`

A Entrega de Valor passa de `FORMADA` para `EM_REALIZACAO` quando sua realização for efetivamente iniciada. O mecanismo operacional que materializa ou registra esse início ainda não está definido e não é estabelecido por este catálogo.

Em especial, a transição não é vinculada a primeiro Item de Trabalho, tarefa, commit, Pull Request, sprint, atribuição ou equivalente. Esses elementos pertencem, quando aplicáveis, a modelagens futuras de realização.

A Entrega de Valor permanece `EM_REALIZACAO` durante desenvolvimento, integração e Verificação. A Verificação não cria `EM_VERIFICACAO`.

Uma Verificação negativa também não provoca regressão de Status. Sua causa é encaminhada para realização, Formação, Delimitação ou nível competente, conforme o Ciclo de Vida, e a Entrega de Valor permanece `EM_REALIZACAO` até alcançar validamente o marco de conclusão ou ser cancelada.

## `CONCLUIDA`

`CONCLUIDA` é o Status terminal de sucesso da Entrega de Valor. Ela somente pode alcançá-lo quando as condições de conclusão definidas no Ciclo de Vida forem satisfeitas conjuntamente:

* software integrado correspondente à Entrega de Valor;
* evolução utilizável e perceptível no contexto definido;
* Verificação técnica positiva com evidência adequada de que a evolução prometida foi materializada (`EVOLUCAO_MATERIALIZADA`); e
* Homologação formal e soberana pelo Owner com decisão favorável (`HOMOLOGADO_PELO_OWNER`).

A Verificação técnica atesta a conformidade do software integrado; contudo, a decisão de conclusão é prerrogativa exclusiva e soberana do Owner, que valida se o valor entregue cumpre o propósito de produto. A conclusão da Entrega de Valor não conclui automaticamente Módulo ou Projeto, nem torna automaticamente a Necessidade atendida.

## `CANCELADA`

`CANCELADA` é o Status terminal excepcional. Somente decisão humana material válida pode levar uma Entrega de Valor a esse encerramento, a partir de qualquer Status não terminal. Agentes especializados não podem cancelar unilateralmente uma Entrega de Valor.

Cancelamento não se confunde com conclusão, evolução entregue, atendimento da Necessidade ou conclusão de Módulo ou Projeto. O mecanismo de registro da decisão, seus efeitos sobre identidade, exclusão, substituição ou realização já iniciada permanecem fora do escopo deste catálogo.

## Lacunas e Débitos descobertos posteriormente

Descoberta posterior de lacuna pode originar proposta de Débito de Governança ou de Débito da Demanda. A proposta depende de revisão e decisão humana competente antes que o Débito seja reconhecido e produza efeito. O local da descoberta não determina a origem nem a competência de tratamento.

Débito reconhecido não provoca regressão automática de Status. Se for bloqueante, pode impedir o avanço ao próximo marco dele dependente, sem obrigar a Entrega de Valor a retornar a Status anterior. Seu tratamento ocorre no ponto competente, conforme a regra transversal de [Débitos e Continuidade Progressiva](../governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md).

Este catálogo não cria entidade Débito, estrutura de persistência, fluxo de trabalho, Status de Débito ou mecanismo operacional equivalente.

## Conceitos que não são Status

Não são Status da Entrega de Valor:

* Formação, Auditoria, Verificação, Homologação, realização parcial, integração, espera, transferência entre Atores, encaminhamento ou tratamento de problema;
* `FORMACAO_SUFICIENTE`, formação insuficiente, conclusão positiva ou negativa da Verificação (`EVOLUCAO_MATERIALIZADA`, `EVOLUCAO_NAO_MATERIALIZADA`), determinações de retorno, decisões humanas (`HOMOLOGADO_PELO_OWNER`, `REJEITADO_PELO_OWNER`, `CANCELAMENTO_APROVADO`) ou qualquer outro Resultado do Processo;
* Especificação da Entrega de Valor, software integrado, critério verificável, evidência, homologação, débito ou lacuna; e
* `EM_AUDITORIA`, `AGUARDANDO_AUDITORIA`, `PRONTA_PARA_REALIZACAO`, `AGUARDANDO_REALIZACAO`, `EM_VERIFICACAO`, `AGUARDANDO_VERIFICACAO`, `AGUARDANDO_HOMOLOGACAO`, `AGUARDANDO_HOMOLOGACAO_OWNER`, `EM_CORRECAO`, `EM_AJUSTE` ou `BLOQUEADA`.

Status identifica a posição no ciclo. [Resultados do Processo da Entrega de Valor](07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md) identificam conclusões, decisões ou determinações produzidas por atividades relevantes do processo.

## Status terminais e fronteiras

Os Status terminais são:

* `CONCLUIDA`;
* `CANCELADA`.

Este documento não define Resultados do Processo, Skill, Work Item, decomposição, mecanismo operacional de Realização, mecanismo físico de transição, persistência tecnológica, ambiente, homologação ou mecanismo de débito. A persistência documental mínima de instância é definida exclusivamente no Modelo. O detalhamento do fluxo e de suas condições pertence ao [Ciclo de Vida da Entrega de Valor](05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md).
