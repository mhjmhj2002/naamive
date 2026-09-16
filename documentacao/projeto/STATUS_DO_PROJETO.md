# Status do Projeto

Este é o catálogo oficial e a única fonte normativa de status da entidade Projeto.

Status responde onde o Projeto está em seu ciclo de vida. Não representa etapa de formação, evento, condição, verificação, decisão humana, conclusão de auditoria, recomendação ou Resultado do Processo.

| Status | Definição |
| --- | --- |
| `EM_FORMACAO` | O Projeto já existe, foi criado a partir de uma Necessidade com compromisso aprovado e permanece sob responsabilidade direta de formação e decomposição. Sua condução ocorre conforme a [Formação do Projeto](03_FORMACAO_DO_PROJETO.md). O Projeto entra diretamente neste status após sua criação. |
| `EM_MODULOS` | O Resultado do Processo `FORMACAO_SUFICIENTE` foi produzido e os Módulos necessários foram materializados. O Projeto encerrou sua responsabilidade direta de formação e decomposição, e sua realização passa a ser conduzida pelos Módulos. Ele continua existindo como entidade pai, agregadora e referência do compromisso recebido da Necessidade. |
| `CONCLUIDO` | Status terminal de sucesso. O Projeto somente o assume quando o trabalho necessário de seus Módulos estiver concluído e a verificação agregada produzir `COMPROMISSO_ATENDIDO`. Representa o encerramento bem-sucedido do Projeto. |
| `CANCELADO` | Status terminal excepcional. O Projeto somente o assume por `CANCELAMENTO_APROVADO`, uma decisão humana material. Um Projeto cancelado não representa compromisso atendido. |

## `EM_FORMACAO`

Em `EM_FORMACAO`, o Projeto é uma instância existente vinculada à sua Necessidade de origem com compromisso aprovado. Ele é conduzido conforme a [Formação do Projeto](03_FORMACAO_DO_PROJETO.md), até haver condições suficientes para identificar, delimitar e materializar os Módulos necessários.

`ENQUADRAMENTO`, `DESCOBERTA`, `DIREÇÃO DA SOLUÇÃO` e `DECOMPOSIÇÃO EM MÓDULOS` são etapas internas da formação, não status.

## `EM_MODULOS`

`EM_MODULOS` substitui a proposta anterior `EM_MODULO`. Um Projeto pode possuir N Módulos; por isso, este status representa que sua realização é conduzida por seus Módulos, e não que o Projeto esteja associado a um único Módulo.

O Projeto não replica os status internos dos Módulos. A conclusão dos Módulos, isoladamente, não altera automaticamente o Projeto para `CONCLUIDO`: ela é condição necessária para a verificação agregada, mas não suficiente para o encerramento bem-sucedido.

## `CONCLUIDO`

`CONCLUIDO` exige, cumulativamente:

* conclusão do trabalho necessário dos Módulos; e
* verificação agregada que produza `COMPROMISSO_ATENDIDO`.

A verificação agregada não é status. O efeito externo de `CONCLUIDO` é permitir que a Necessidade de origem siga de `EM_PROJETO` para `ATENDIDA`, conforme o próprio ciclo de vida dela.

## `CANCELADO`

O agente não pode cancelar unilateralmente o Projeto. `CANCELADO` é distinto de `CONCLUIDO`: enquanto este representa encerramento bem-sucedido, aquele não representa compromisso atendido.

`CANCELAMENTO_APROVADO` é o Resultado do Processo e a decisão humana material que autoriza a transição para `CANCELADO`. Este catálogo não define responsável, permissões ou mecanismo de cancelamento.

## Status terminais

Os status terminais são:

* `CONCLUIDO`;
* `CANCELADO`.

Não há status administrativo de arquivamento nesta versão. Se arquivamento for necessário futuramente, deverá ser tratado como condição administrativa posterior ao encerramento, salvo nova decisão conceitual.

## Conceitos que não são status

Não são status do Projeto:

* `ENQUADRAMENTO`;
* `DESCOBERTA`;
* `DIREÇÃO DA SOLUÇÃO`;
* `DECOMPOSIÇÃO EM MÓDULOS`;
* `FORMACAO_SUFICIENTE`;
* `FORMACAO_INSUFICIENTE`;
* Módulos materializados;
* conclusão de Módulos;
* verificação agregada;
* `COMPROMISSO_ATENDIDO`;
* `COMPROMISSO_NAO_ATENDIDO`;
* `CANCELAMENTO_APROVADO`;
* decisões humanas;
* conclusões de auditoria;
* recomendações; e
* Resultados do Processo.

Esses elementos são etapas, eventos, condições, verificações, decisões ou resultados e permanecem separados do catálogo de status.

## Fluxo de referência

```text
criação
→ EM_FORMACAO
→ FORMACAO_SUFICIENTE + Módulos materializados
→ EM_MODULOS
→ COMPROMISSO_ATENDIDO
→ CONCLUIDO
```

```text
posição não terminal
→ CANCELAMENTO_APROVADO
→ CANCELADO
```

O detalhamento das transições pertence ao [Ciclo de Vida do Projeto](CICLO_DE_VIDA_DO_PROJETO.md). O catálogo de Resultados do Processo pertence exclusivamente a [Resultados do Processo do Projeto](RESULTADOS_DO_PROCESSO_DO_PROJETO.md).
