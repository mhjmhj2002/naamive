# Ciclo de Vida do Projeto

## Finalidade

Este documento define o trecho atualmente modelado do ciclo do Projeto, desde sua criação obrigatória, a partir de uma Necessidade com compromisso aprovado, até a aprovação de sua formação.

Ele não define o modelo da entidade, os detalhes internos da formação, o catálogo normativo de status, Resultados do Processo, mecanismos de realização ou entidades descendentes. A formação do Projeto é definida em [Formação do Projeto](04_FORMACAO_DO_PROJETO.md).

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
→ Auditor do Projeto
→ `FORMACAO_SUFICIENTE`
→ formação do Projeto aprovada
→ Direção do Projeto disponível
→ handoff ao Especialista em Delimitação de Módulos
```

`EM_FORMACAO` é o único status usado no trecho atualmente definido. `CONCLUIDO` permanece como terminal conceitual futuro e `CANCELADO` como terminal excepcional; seus significados normativos pertencem exclusivamente ao [Status do Projeto](06_STATUS_DO_PROJETO.md).

## Formação aprovada

Após sua criação, o Projeto está em `EM_FORMACAO`. Esse trabalho é conduzido pelo Especialista em Formação do Projeto conforme a [Formação do Projeto](04_FORMACAO_DO_PROJETO.md), que define as etapas, os controles e a condição de entrega ao Auditor do Projeto. O Auditor produz os Resultados do Processo de formação.

Quando o Resultado do Processo `FORMACAO_SUFICIENTE` é produzido, a formação está concluída e aprovada pelo Auditor. Esse resultado não produz transição para outro status: o próximo estado operacional do Projeto ainda não foi definido. A aprovação não depende da criação, da definição ou do status de entidade descendente alguma.

`FORMACAO_SUFICIENTE` torna disponível a **Direção do Projeto**, artefato de saída consolidado no próprio registro do Projeto. O próximo Ator elegível é o Especialista em Delimitação de Módulos, que a consome como entrada da vertical Módulo sem substituir a entidade completa. A Direção não é status, Resultado do Processo, decisão humana ou nova entidade.

## Handoff para Módulo e continuação futura

Após a formação aprovada, o Especialista em Delimitação de Módulos pode receber a Direção do Projeto. O Projeto não delimita nem forma Módulos; apenas disponibiliza seu artefato de saída e faz o handoff. A continuação operacional após a Especificação Técnica de cada Módulo permanece futura. Esta vertical não prescreve mecanismos, entidades, ciclos internos, executores, transições ou status para esse trecho, nem há caminho normativo definido até `CONCLUIDO`.

## Verificação agregada e conclusão

`COMPROMISSO_ATENDIDO` e `COMPROMISSO_NAO_ATENDIDO` permanecem Resultados do Processo normativos, mas sua ocasião, entradas e efeitos operacionais serão definidos com a camada posterior. `CONCLUIDO` permanece o terminal conceitual futuro; este ciclo não inventa seu caminho de alcance.

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
| `FORMACAO_SUFICIENTE` | `EM_FORMACAO` → formação aprovada | Não cria novo status; torna a Direção disponível ao Especialista em Delimitação de Módulos. |
| `FORMACAO_INSUFICIENTE` | permanece em `EM_FORMACAO` | O Especialista em Formação do Projeto trata as lacunas antes de nova auditoria. |
| `COMPROMISSO_ATENDIDO` | efeito operacional ainda não definido | Resultado preservado; não há transição atual para `CONCLUIDO`. |
| `COMPROMISSO_NAO_ATENDIDO` | efeito operacional ainda não definido | Resultado preservado; não há status de permanência definido. |
| `CANCELAMENTO_APROVADO` | posição não terminal → `CANCELADO` | Caminho excepcional produzido pelo Owner; nenhum Ator agêntico pode produzi-lo unilateralmente. |
