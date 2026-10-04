# Resultados do Processo da Entrega de Valor

Este é o catálogo oficial e a única fonte normativa dos Resultados do Processo da Entrega de Valor.

Resultado do Processo registra uma conclusão, determinação ou decisão produzida por atividade competente. Ele não informa onde a Entrega de Valor está no ciclo.

```text
Status
→ posição validamente alcançada no ciclo

Resultado do Processo
→ conclusão, determinação ou decisão produzida por atividade competente

Débito
→ pendência reconhecida que precisa de tratamento
```

Resultado do Processo não é Status. Um Resultado negativo não representa regressão do ciclo nem cria Débito automaticamente. Ele tampouco cria etapas intermediárias, filas, handoffs ou estados operacionais.

Os Status da Entrega de Valor estão em [Status da Entrega de Valor](06_STATUS_DA_ENTREGA_DE_VALOR.md), e a continuidade diante de lacunas segue [Débitos e Continuidade Progressiva](../governanca/01_DEBITOS_E_CONTINUIDADE_PROGRESSIVA.md).

## Catálogo oficial e autoridade exclusiva

| Atividade | Resultado | Ator competente |
| --- | --- | --- |
| Auditoria da Formação | `FORMACAO_SUFICIENTE` | Auditor da Entrega de Valor |
| Auditoria da Formação | `FORMACAO_INSUFICIENTE` | Auditor da Entrega de Valor |
| Verificação da Entrega de Valor | `EVOLUCAO_MATERIALIZADA` | Verificador da Entrega de Valor |
| Verificação da Entrega de Valor | `EVOLUCAO_NAO_MATERIALIZADA` | Verificador da Entrega de Valor |
| Homologação da Entrega de Valor | `HOMOLOGADO_PELO_OWNER` | Owner |
| Homologação da Entrega de Valor | `REJEITADO_PELO_OWNER` | Owner |
| Decisão humana excepcional | `CANCELAMENTO_APROVADO` | Owner |

Um Resultado somente é válido quando produzido pelo Ator competente. Em particular:

* o Formador não aprova a própria Formação;
* o Auditor não realiza a Verificação da evolução integrada;
* o Verificador não forma, redelimita ou implementa, e seu laudo positivo (`EVOLUCAO_MATERIALIZADA`) habilita, mas não substitui, a decisão soberana do Owner;
* a homologação ou rejeição do valor entregue cabe com exclusividade ao Owner (`HOMOLOGADO_PELO_OWNER` ou `REJEITADO_PELO_OWNER`); e
* nenhum Ator agêntico produz unilateralmente decisões materiais do Owner.

Artefato existente, condição técnica isolada ou aparente proximidade de um marco não permite inferir Resultado automaticamente.

## Resultados da Auditoria da Formação

### `FORMACAO_SUFICIENTE`

O Auditor da Entrega de Valor produz `FORMACAO_SUFICIENTE` quando conclui independentemente que a Formação é suficiente para permitir futura realização sem redescoberta do valor de negócio nem redesenho da solução técnica de alto nível.

O Resultado permite a transição:

```text
EM_FORMACAO
→ FORMADA
```

A Especificação da Entrega de Valor passa a estar validamente disponível para consumo pela realização posterior. O Resultado não significa software implementado, realização iniciada, evolução entregue, homologação ou conclusão da Entrega de Valor.

### `FORMACAO_INSUFICIENTE`

O Auditor da Entrega de Valor produz `FORMACAO_INSUFICIENTE` quando conclui que a Formação ainda não possui suficiência necessária.

A Entrega de Valor permanece em:

```text
EM_FORMACAO
```

O problema é tratado no ponto competente e submetido a nova Auditoria quando aplicável. O Resultado não provoca regressão de Status. Sua causa pode estar na própria Formação, na Delimitação ou em decisão ou contexto de nível superior, sem criar Resultados distintos para essas origens.

## Resultados da Verificação da Entrega de Valor

### `EVOLUCAO_MATERIALIZADA`

O Verificador da Entrega de Valor produz `EVOLUCAO_MATERIALIZADA` quando conclui, com evidência adequada, que o software integrado realmente materializa a evolução prometida de forma utilizável e perceptível no contexto definido.

Este Resultado é o parecer técnico favorável independente da Verificação. Ele atesta a prontidão técnica do incremento e é condição mandatória para acionar a Homologação pelo Owner. Não encerra diretamente a Entrega de Valor:

```text
EM_REALIZACAO (com EVOLUCAO_MATERIALIZADA)
→ acionamento do Owner para Homologação
```

Código existente, Pull Request integrado, deploy, endpoint, tabela ou testes técnicos isoladamente não equivalem necessariamente a este Resultado. A conclusão depende da Verificação da evolução integrada prevista no [Ciclo de Vida da Entrega de Valor](05_CICLO_DE_VIDA_DA_ENTREGA_DE_VALOR.md).

### `EVOLUCAO_NAO_MATERIALIZADA`

O Verificador da Entrega de Valor produz `EVOLUCAO_NAO_MATERIALIZADA` quando conclui que o software integrado ainda não materializa adequadamente a evolução prometida.

A Entrega de Valor permanece em:

```text
EM_REALIZACAO
```

O Resultado não provoca retorno para `FORMADA` ou `EM_FORMACAO`, nem regressão para Módulo, Projeto ou Necessidade. A causa orienta o tratamento pela Realização, Formação, Delimitação ou nível superior competente, conforme o Ciclo de Vida. Após o tratamento necessário, a realização e/ou a Verificação prossegue conforme aplicável.

## Decisões Humanas Materiais de Homologação do Owner

### `HOMOLOGADO_PELO_OWNER`

`HOMOLOGADO_PELO_OWNER` é a Decisão Humana Material proferida exclusivamente pelo Owner após inspecionar o software integrado e validar o valor de negócio entregue, tendo como subsídio o laudo técnico `EVOLUCAO_MATERIALIZADA`.

Este Resultado autoriza a transição terminal de sucesso:

```text
EM_REALIZACAO (com EVOLUCAO_MATERIALIZADA + HOMOLOGADO_PELO_OWNER)
→ CONCLUIDA
```

A homologação do Owner registra formalmente a aceitação soberana do incremento de valor entregue. A conclusão da Entrega de Valor não conclui automaticamente Módulo ou Projeto, nem torna automaticamente a Necessidade atendida.

### `REJEITADO_PELO_OWNER`

`REJEITADO_PELO_OWNER` é a Decisão Humana Material proferida pelo Owner quando, na inspeção da Entrega de Valor, identifica que a solução não satisfaz os objetivos de negócio, a usabilidade ou a intenção de valor pretendida, mesmo diante de testes técnicos favoráveis.

A Entrega de Valor permanece em:

```text
EM_REALIZACAO
```

O Owner explicita as razões e desconformidades observadas, direcionando a causa para tratamento pela Realização (correção de comportamento/interface), pela Formação (revisão de especificação) ou para decisão de nível superior. A Entrega de Valor não é concluída enquanto não for sanada e homologada favoravelmente.

## Resultado, causa e determinação de tratamento

Resultado, causa e determinação de tratamento são informações distintas:

| Informação | Pergunta que responde | Exemplo |
| --- | --- | --- |
| Resultado | Qual foi a conclusão formal produzida pela atividade? | `EVOLUCAO_NAO_MATERIALIZADA` |
| Causa | Por que a atividade chegou a essa conclusão? | A Especificação não contempla comportamento necessário observado na Verificação. |
| Determinação de tratamento | Em qual ponto competente essa causa precisa ser tratada? | Formação da Entrega de Valor. |

A determinação de tratamento não é Status, não provoca regressão e não significa retornar operacionalmente o ciclo à vertical indicada. Causa e destino de tratamento não devem ser transformados em tokens combinatórios de Resultado.

## Informações mínimas para continuidade

Resultado técnico produzido pelo Auditor ou pelo Verificador não é apenas um token isolado. Deve conter, proporcionalmente, informação suficiente para que outro Ator ou Agente compreenda a conclusão e continue o trabalho sem reconstrução arbitrária do raciocínio anterior, incluindo:

* Resultado produzido;
* Ator competente;
* fundamentação;
* evidências relevantes;
* quando negativo, causa identificada; e
* quando negativo e aplicável, determinação de tratamento.

Este documento não define formato físico obrigatório para Resultados, JSON, esquema, banco de dados, tabela, API, timestamp obrigatório, identificador de Resultado ou mecanismo de histórico. A estrutura da instância e sua identidade pertencem exclusivamente ao Modelo; este catálogo não cria campos concorrentes para elas.

## Relação com Débitos

Resultado negativo pode revelar lacuna cuja origem pertença a ponto anterior da cadeia ou à própria governança. Nessa hipótese, pode haver proposta de Débito, conforme a regra transversal:

```text
resultado negativo
→ identificação da causa
→ determinação de tratamento
→ possível proposta de Débito, se houver lacuna relevante anterior
→ decisão humana competente
```

Auditor e Verificador podem identificar e fundamentar possível lacuna, mas não reconhecem nem criam unilateralmente um Débito. Resultado negativo não gera Débito automaticamente. Débito reconhecido bloqueante pode impedir o avanço pelo marco dele dependente sem regressão do Status atual; Débito não bloqueante permite continuidade enquanto é tratado.

## Decisão humana de cancelamento

### `CANCELAMENTO_APROVADO`

`CANCELAMENTO_APROVADO` é decisão humana material do Owner, distinta dos Resultados técnicos. Pode ocorrer a partir de qualquer Status não terminal e requer somente decisão humana explícita e inequívoca, acompanhada de breve razão para preservar o contexto histórico.

O Resultado permite a transição:

```text
qualquer Status não terminal
→ CANCELADA
```

A razão não cria processo burocrático de aprovação: não exige Auditoria da decisão, aprovação do Verificador, causa técnica, determinação de tratamento, justificativa extensa ou aprovação agêntica.

Cancelar uma Entrega de Valor não significa necessariamente abandonar o valor ou a Necessidade que motivaram sua existência. Uma nova Entrega de Valor poderá ser delimitada futuramente se for necessária, mas `CANCELAMENTO_APROVADO` não cria automaticamente substituta, não reutiliza identidade, não define redelimitação automática nem relacionamento formal de sucessão.

## Continuidade progressiva e fronteiras

Resultados negativos existem para permitir tratamento e evolução:

```text
resultado negativo
→ compreender causa
→ determinar tratamento
→ tratar
→ repetir atividade competente quando aplicável
→ continuar avançando
```

Não há Resultado técnico equivalente a abandono, parada, falha definitiva ou impossibilidade. O encerramento humano da Entrega de Valor utiliza exclusivamente `CANCELAMENTO_APROVADO`.

Este catálogo não define Work Item, tarefas, decomposição, implementação, Executor de Work Item, realização física, pipelines, branches, Pull Requests, ambientes, deploy, homologação, Skills, armazenamento físico dos Resultados, mecanismo físico de transição de Status, entidade física ou ciclo completo de Débito, mecanismo de substituição de Entrega de Valor ou propagação automática de conclusão para Módulo, Projeto ou Necessidade.
