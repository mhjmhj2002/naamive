# Status do Projeto

Este é o catálogo oficial e a única fonte normativa de status da entidade Projeto.

Status responde onde o Projeto está em seu ciclo de vida. Não representa etapa de formação, evento, condição, verificação, decisão humana, conclusão de auditoria, recomendação ou Resultado do Processo.

| Status | Definição |
| --- | --- |
| `EM_FORMACAO` | O Projeto já existe, foi criado a partir de uma Necessidade com compromisso aprovado e está sob responsabilidade direta de formação. Sua condução ocorre conforme a [Formação do Projeto](04_FORMACAO_DO_PROJETO.md). O Projeto entra diretamente neste status após sua criação. |
| `CONCLUIDO` | Status terminal conceitual futuro de sucesso. O caminho operacional e as condições de transição para ele ainda não estão definidos. |
| `CANCELADO` | Status terminal excepcional. O Projeto somente o assume por `CANCELAMENTO_APROVADO`, uma decisão humana material. Um Projeto cancelado não representa compromisso atendido. |

## `EM_FORMACAO`

Em `EM_FORMACAO`, o Projeto é uma instância existente vinculada à sua Necessidade de origem com compromisso aprovado. Ele é conduzido pelo Especialista em Formação do Projeto conforme a [Formação do Projeto](04_FORMACAO_DO_PROJETO.md), até que sua formação seja entregue para auditoria e o Auditor produza `FORMACAO_SUFICIENTE`.

`ENQUADRAMENTO`, `DESCOBERTA` e `DIREÇÃO DA SOLUÇÃO` são etapas internas da formação, não status.

## `CONCLUIDO`

`CONCLUIDO` é terminal conceitual futuro de sucesso. A vertical Projeto ainda não define o trecho operacional, as evidências, a verificação ou a transição que poderão levá-lo a esse status.

## `CANCELADO`

Nenhum Ator agêntico pode cancelar unilateralmente o Projeto. `CANCELADO` é distinto de `CONCLUIDO`: enquanto este representa encerramento bem-sucedido, aquele não representa compromisso atendido.

`CANCELAMENTO_APROVADO` é o Resultado do Processo e a decisão humana material do Owner que autoriza a transição para `CANCELADO`. Este catálogo não define mecanismo técnico de cancelamento.

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
* `FORMACAO_SUFICIENTE`;
* `FORMACAO_INSUFICIENTE`;
* verificação agregada;
* `COMPROMISSO_ATENDIDO`;
* `COMPROMISSO_NAO_ATENDIDO`;
* `CANCELAMENTO_APROVADO`;
* decisões humanas;
* conclusões de auditoria; e
* Resultados do Processo.

Esses elementos são etapas, eventos, condições, verificações, decisões ou resultados e permanecem separados do catálogo de status.

## Fluxo de referência

```text
criação
→ EM_FORMACAO
→ FORMACAO_SUFICIENTE
→ formação do Projeto aprovada
→ continuação operacional ainda não definida
```

```text
posição não terminal
→ CANCELAMENTO_APROVADO
→ CANCELADO
```

O detalhamento das transições pertence ao [Ciclo de Vida do Projeto](05_CICLO_DE_VIDA_DO_PROJETO.md). O catálogo de Resultados do Processo pertence exclusivamente a [Resultados do Processo do Projeto](07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md).
