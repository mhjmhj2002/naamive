# Ciclo de Vida do Projeto

## Finalidade

Este documento define o fluxo, os eventos e as transições do Projeto desde sua criação obrigatória, a partir de uma Necessidade com compromisso aprovado, até seu encerramento.

Ele não define o modelo da entidade, os detalhes internos da formação, o catálogo normativo de status, Resultados do Processo, Módulos, Entregas de Valor ou Itens de Trabalho. A formação do Projeto é definida em [Formação do Projeto](03_FORMACAO_DO_PROJETO.md).

Os status usados conceitualmente neste ciclo serão formalizados em catálogo próprio em atividade posterior. Os Resultados do Processo do Projeto também serão catalogados separadamente; conclusões de auditoria, decisões, verificações e recomendações não devem ser tratados como status.

## Origem do Projeto

Uma Necessidade com compromisso humano `APROVADO` origina obrigatoriamente exatamente um Projeto:

```text
1 Necessidade com compromisso aprovado
→ criação obrigatória de 1 Projeto
→ Projeto entra em formação
```

O Projeto não nasce de formulário independente nem de criação manual desvinculada da Necessidade. A criação futura deve preservar a relação 1:1 de forma atômica ou recuperável, sem que este documento defina sua implementação técnica.

A existência do Projeto correspondente permite que a Necessidade de origem assuma `EM_PROJETO`, conforme o [Ciclo de Vida da Necessidade](../necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md).

## Fluxo principal

```text
criação do Projeto
→ EM_FORMACAO
→ formação conduzida
→ formação suficiente e Módulos necessários materializados
→ EM_MODULOS
→ trabalho conduzido pelos Módulos
→ trabalho necessário dos Módulos concluído
→ verificação agregada do compromisso do Projeto
→ compromisso atendido
→ CONCLUIDO
```

`EM_FORMACAO`, `EM_MODULOS`, `CONCLUIDO` e `CANCELADO` são posições conceituais deste ciclo; não constituem ainda um catálogo normativo de status.

## Formação e entrada em `EM_MODULOS`

Após sua criação, o Projeto está em `EM_FORMACAO` e sob responsabilidade direta de formação e decomposição. Esse trabalho é conduzido conforme a [Formação do Projeto](03_FORMACAO_DO_PROJETO.md), que define as etapas, os controles e as condições para a materialização dos Módulos.

A transição para `EM_MODULOS` ocorre somente quando a formação for suficiente e os Módulos necessários nela definidos tiverem sido materializados adequadamente. Nesse ponto, o Projeto encerra sua responsabilidade direta de formação e decomposição, mas não é encerrado.

`EM_MODULOS` substitui a proposta anterior `EM_MODULO`: um Projeto pode originar N Módulos, e essa posição representa que sua realização passa a ser conduzida por eles, não que o Projeto esteja dentro de um único Módulo.

## Condução pelos Módulos

Em `EM_MODULOS`, o Projeto permanece existente como entidade pai, agregador e referência do compromisso recebido da Necessidade. O trabalho direto passa para os Módulos e seus futuros descendentes.

O Projeto não replica os status internos de seus Módulos, e este documento não define o ciclo interno deles. Para explicitar apenas a fronteira conceitual, a hierarquia de referência é:

```text
Necessidade (1)
→ Projeto (1)
→ Módulo (N)
→ Entrega de Valor (N)
→ Item de Trabalho (N)
```

## Verificação agregada e conclusão

A conclusão do trabalho dos Módulos é condição necessária, mas não suficiente, para concluir o Projeto. Após esse trabalho estar concluído, o Projeto deve verificar em nível agregado se o resultado produzido:

* permanece coerente com a Necessidade de origem;
* atende ao resultado comprometido;
* respeita as fronteiras relevantes do compromisso; e
* permite considerar o Projeto efetivamente realizado.

A pergunta conceitual dessa verificação é: **“O resultado agregado produzido atende ao compromisso que originou este Projeto?”** Esta verificação não recebe nome formal de Resultado do Processo nesta definição.

Se ela ainda não for suficiente, o Projeto não avança para `CONCLUIDO`: permanece no trecho de condução pelos Módulos, com trabalho adicional ou correção antes de nova verificação. Este documento não define como um Módulo retorna, reabre ou altera seu próprio ciclo.

`CONCLUIDO` é a posição terminal de sucesso. O Projeto somente chega a ela quando o trabalho necessário dos Módulos estiver concluído e a verificação agregada confirmar o atendimento do compromisso. Como efeito externo, a Necessidade de origem pode transicionar de `EM_PROJETO` para `ATENDIDA`, conforme seu próprio ciclo de vida.

## Caminho excepcional de cancelamento

Há um caminho excepcional de encerramento:

```text
decisão humana válida de cancelamento
→ CANCELADO
```

O agente não pode cancelar unilateralmente o Projeto. A definição do Resultado do Processo que autoriza o cancelamento, do responsável pelo Projeto, da matriz de permissões e das regras detalhadas de cancelamento em cada ponto do ciclo permanece para atividade posterior.

`CANCELADO` é terminal e distinto de `CONCLUIDO`.

## Transições

| Evento ou condição | Transição | Regra |
| --- | --- | --- |
| Criação obrigatória do Projeto a partir de Necessidade com compromisso humano `APROVADO` | criação → `EM_FORMACAO` | A criação preserva a relação 1:1 com a Necessidade de origem. A existência do Projeto permite que a Necessidade assuma `EM_PROJETO`. |
| Formação suficiente e Módulos necessários materializados | `EM_FORMACAO` → `EM_MODULOS` | A formação e a decomposição deixam de ser responsabilidade direta do Projeto; sua existência como pai, agregador e referência do compromisso permanece. |
| Conclusão do trabalho necessário dos Módulos | `EM_MODULOS` → verificação agregada | A conclusão dos Módulos não conclui automaticamente o Projeto. |
| Verificação agregada suficiente | verificação agregada → `CONCLUIDO` | Exige confirmação de que o resultado agregado atende ao compromisso recebido da Necessidade. |
| Verificação agregada insuficiente | verificação agregada → permanece em `EM_MODULOS` | Trabalho adicional ou correção deve ocorrer antes de nova verificação. |
| Decisão humana válida de cancelamento | posição não terminal → `CANCELADO` | Caminho excepcional; o agente não pode cancelar unilateralmente. |
