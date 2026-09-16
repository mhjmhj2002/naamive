# Ciclo de Vida do Projeto

## Finalidade

Este documento define o fluxo, os eventos e as transições do Projeto desde sua criação obrigatória, a partir de uma Necessidade com compromisso aprovado, até seu encerramento.

Ele não define o modelo da entidade, os detalhes internos da formação, o catálogo normativo de status, Resultados do Processo, Módulos, Entregas de Valor ou Itens de Trabalho. A formação do Projeto é definida em [Formação do Projeto](04_FORMACAO_DO_PROJETO.md).

O catálogo normativo de status do Projeto está em [Status do Projeto](06_STATUS_DO_PROJETO.md). O catálogo normativo de Resultados do Processo está em [Resultados do Processo do Projeto](07_RESULTADOS_DO_PROCESSO_DO_PROJETO.md). Os Atores estão definidos em [Atores do Projeto](03_ATORES_DO_PROJETO.md). Conclusões de auditoria, decisões e verificações não devem ser tratados como status.

## Origem do Projeto

Uma Necessidade com compromisso humano `APROVADO` origina obrigatoriamente exatamente um Projeto:

```text
1 Necessidade com compromisso aprovado
→ acionamento do Especialista em Formação do Projeto
→ bootstrap e criação obrigatória de 1 Projeto, se ele ainda não existir
→ Projeto nasce em EM_FORMACAO
```

O Projeto não nasce de formulário independente nem de criação manual desvinculada da Necessidade. O bootstrap é responsabilidade inicial do Especialista em Formação do Projeto; não há Ator específico para criação ou materialização. Após o bootstrap, o mesmo Ator continua a formação e, ao final, entrega o handoff ao Auditor do Projeto. A criação futura deve preservar a relação 1:1 de forma atômica ou recuperável, sem que este documento defina sua implementação técnica.

A existência real do Projeto correspondente em `EM_FORMACAO`, após materialização bem-sucedida, permite que a Necessidade de origem assuma `EM_PROJETO`, conforme o [Ciclo de Vida da Necessidade](../necessidade/05_CICLO_DE_VIDA_DA_NECESSIDADE.md). Se o bootstrap falhar, a Necessidade não pode assumir esse status antecipadamente.

## Fluxo principal

```text
criação do Projeto
→ EM_FORMACAO
→ formação conduzida
→ `FORMACAO_SUFICIENTE` e Módulos necessários materializados
→ EM_MODULOS
→ trabalho conduzido pelos Módulos
→ trabalho necessário dos Módulos concluído
→ verificação agregada do compromisso do Projeto
→ `COMPROMISSO_ATENDIDO`
→ CONCLUIDO
```

`EM_FORMACAO`, `EM_MODULOS`, `CONCLUIDO` e `CANCELADO` são as posições usadas neste ciclo. Seus significados normativos pertencem exclusivamente ao [Status do Projeto](06_STATUS_DO_PROJETO.md).

## Formação e entrada em `EM_MODULOS`

Após sua criação, o Projeto está em `EM_FORMACAO` e sob responsabilidade direta de formação e decomposição. Esse trabalho é conduzido pelo Especialista em Formação do Projeto conforme a [Formação do Projeto](04_FORMACAO_DO_PROJETO.md), que define as etapas, os controles e as condições para a materialização dos Módulos. O Auditor do Projeto produz os Resultados do Processo de formação.

A transição para `EM_MODULOS` ocorre somente quando o Resultado do Processo `FORMACAO_SUFICIENTE` tiver sido produzido e os Módulos necessários nela definidos tiverem sido materializados adequadamente. Nesse ponto, o Projeto encerra sua responsabilidade direta de formação e decomposição, mas não é encerrado.

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

A pergunta conceitual dessa verificação é: **“O resultado agregado produzido atende ao compromisso que originou este Projeto?”** O Verificador Agregado do Projeto produz `COMPROMISSO_ATENDIDO` na conclusão positiva e `COMPROMISSO_NAO_ATENDIDO` na conclusão negativa.

Com `COMPROMISSO_NAO_ATENDIDO`, o Projeto não avança para `CONCLUIDO`: permanece no trecho de condução pelos Módulos, com trabalho adicional ou correção antes de nova verificação. Este documento não define como um Módulo retorna, reabre ou altera seu próprio ciclo.

`CONCLUIDO` é a posição terminal de sucesso. O Projeto somente chega a ela quando o trabalho necessário dos Módulos estiver concluído e a verificação agregada produzir `COMPROMISSO_ATENDIDO`. Como efeito externo, a Necessidade de origem pode transicionar de `EM_PROJETO` para `ATENDIDA`, conforme seu próprio ciclo de vida.

## Caminho excepcional de cancelamento

Há um caminho excepcional de encerramento:

```text
`CANCELAMENTO_APROVADO`
→ CANCELADO
```

`CANCELAMENTO_APROVADO` é uma decisão humana material produzida pelo Owner, cujo Executor é o usuário autenticado. Nenhum Ator agêntico pode produzi-la unilateralmente. Não há RBAC, ACL, delegação, grupos, papéis configuráveis, ownership por entidade, matriz de autoridade ou modelo multiusuário nesta versão.

`CANCELADO` é terminal e distinto de `CONCLUIDO`. Como efeito externo, o cancelamento do Projeto faz a Necessidade de origem transicionar de `EM_PROJETO` para `CANCELADA`, conforme seu próprio ciclo de vida.

## Transições

| Evento ou condição | Transição | Regra |
| --- | --- | --- |
| `APROVADO` aciona o Especialista em Formação do Projeto; ausência do Projeto 1:1 | bootstrap e criação obrigatória → `EM_FORMACAO` | O mesmo Ator materializa o Projeto, com código, nome inicial proposto ou gerado e vínculo 1:1 com a Necessidade. Somente a criação bem-sucedida permite que a Necessidade assuma `EM_PROJETO`. |
| `FORMACAO_SUFICIENTE` e Módulos necessários materializados | `EM_FORMACAO` → `EM_MODULOS` | A formação e a decomposição deixam de ser responsabilidade direta do Projeto; sua existência como pai, agregador e referência do compromisso permanece. |
| Conclusão do trabalho necessário dos Módulos | `EM_MODULOS` → verificação agregada | A conclusão dos Módulos não conclui automaticamente o Projeto. |
| `COMPROMISSO_ATENDIDO` | verificação agregada → `CONCLUIDO` | Exige confirmação de que o resultado agregado atende ao compromisso recebido da Necessidade. |
| `COMPROMISSO_NAO_ATENDIDO` | verificação agregada → permanece em `EM_MODULOS` | Trabalho adicional ou correção deve ocorrer antes de nova verificação. |
| `CANCELAMENTO_APROVADO` | posição não terminal → `CANCELADO` | Caminho excepcional produzido pelo Owner; nenhum Ator agêntico pode produzi-lo unilateralmente. |
