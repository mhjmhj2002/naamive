# Status do Módulo

Este é o catálogo oficial e a única fonte normativa de status da entidade Módulo. Status responde onde o Módulo está no ciclo; não representa etapa, auditoria, condição, decisão ou Resultado do Processo.

| Status | Definição |
| --- | --- |
| `EM_FORMACAO` | O Módulo foi materializado pelo Especialista em Delimitação de Módulos, pertence a um Projeto e está sob formação técnica conforme a [Formação do Módulo](04_FORMACAO_DO_MODULO.md). |
| `FORMADO` | A formação da entidade foi concluída e aprovada por `FORMACAO_SUFICIENTE`. O Módulo não está mais sob formação, mas isso não significa realização, entrega, conclusão ou encerramento. |

## `EM_FORMACAO`

O Módulo entra diretamente em `EM_FORMACAO` ao ser materializado. Nele, sua capacidade e fronteiras são refinadas, sua descoberta e desenho técnico são produzidos e a formação é entregue ao Auditor do Módulo.

`FORMACAO_INSUFICIENTE` técnico o mantém nesse status. Um retorno de delimitação também o mantém em `EM_FORMACAO`: ajustes que preservam identidade são revisados pelo Especialista em Delimitação de Módulos. Se o caso exigir encerrar, fundir, eliminar conceitualmente ou substituir uma identidade, a alteração fica registrada como lacuna e depende de decisão normativa específica, sem alterar o status do Módulo.

## `FORMADO`

O Módulo entra em `FORMADO` quando o Auditor produzir `FORMACAO_SUFICIENTE`. A Especificação Técnica fica aprovada e disponível para consumo posterior. `FORMADO` separa a formação aprovada da formação ainda em curso e não antecipa realização, Entrega de Valor, conclusão, encerramento ou continuação operacional.

Não existem nesta versão status como `EM_ENTREGAS`, `EM_REALIZACAO`, `EM_EXECUCAO`, `PRONTO`, `EM_ANDAMENTO`, `CONCLUIDO` ou `CANCELADO`. Eles dependeriam de trecho operacional não modelado e não são criados por simetria.

## Conceitos que não são status

Não são status: delimitação, revisão de delimitação, descoberta técnica, desenho técnico, auditoria, `FORMACAO_SUFICIENTE`, `FORMACAO_INSUFICIENTE`, Especificação Técnica do Módulo, futura Entrega de Valor, Item de Trabalho e tarefa.
