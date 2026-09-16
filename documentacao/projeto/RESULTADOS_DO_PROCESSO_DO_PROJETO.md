# Resultados do Processo do Projeto

Este é o catálogo oficial e a única fonte normativa dos Resultados do Processo atualmente definidos para Projeto.

Resultado do Processo representa uma conclusão, determinação ou decisão produzida durante uma atividade do processo. Ele não informa onde o Projeto está.

```text
Status
→ posição do Projeto no ciclo

Resultado do Processo
→ conclusão, determinação ou decisão produzida durante uma atividade do processo
```

Nenhum Resultado do Processo é status. O catálogo oficial de status do Projeto está em [Status do Projeto](STATUS_DO_PROJETO.md).

## Resultados da auditoria e verificação de formação

| Resultado | Significado |
| --- | --- |
| `FORMACAO_SUFICIENTE` | A formação do Projeto possui compreensão, sustentação, direção e decomposição suficientes para permitir a materialização adequada dos Módulos necessários. |
| `FORMACAO_INSUFICIENTE` | A formação ainda possui lacuna, inconsistência, ausência de sustentação ou insuficiência relevante que impede o avanço seguro para a materialização definitiva dos Módulos. |

`FORMACAO_SUFICIENTE` permite concluir o processo de formação. Combinado à materialização dos Módulos necessários, permite a transição de `EM_FORMACAO` para `EM_MODULOS`. A materialização dos Módulos é uma condição e uma atividade da formação; não é Resultado do Processo.

`FORMACAO_INSUFICIENTE` mantém o Projeto em `EM_FORMACAO`. O motor de formação trata as lacunas conforme a [Formação do Projeto](03_FORMACAO_DO_PROJETO.md) e, após esse tratamento, realiza nova verificação.

## Resultados da verificação agregada final

| Resultado | Significado |
| --- | --- |
| `COMPROMISSO_ATENDIDO` | A verificação agregada concluiu que o resultado produzido pelo trabalho dos Módulos atende ao compromisso recebido da Necessidade de origem. |
| `COMPROMISSO_NAO_ATENDIDO` | A verificação agregada concluiu que o resultado produzido ainda não atende suficientemente ao compromisso recebido da Necessidade. |

`COMPROMISSO_ATENDIDO` permite a transição do Projeto de `EM_MODULOS` para `CONCLUIDO`. Após o Projeto assumir `CONCLUIDO`, a Necessidade de origem pode transicionar de `EM_PROJETO` para `ATENDIDA`, conforme seu próprio ciclo.

`COMPROMISSO_NAO_ATENDIDO` impede que o Projeto assuma `CONCLUIDO` e o mantém em `EM_MODULOS`. Trabalho adicional ou correção deve ocorrer nos níveis descendentes adequados, seguido de nova verificação agregada. Este catálogo não define como Módulos reabrem, retornam ou alteram seus próprios ciclos.

## Decisão humana material de cancelamento

| Resultado | Significado |
| --- | --- |
| `CANCELAMENTO_APROVADO` | Uma pessoa humana com autoridade válida aprovou o cancelamento do Projeto. |

`CANCELAMENTO_APROVADO` é uma decisão humana material, não um status. O agente não pode produzi-la unilateralmente. Ela provoca a transição de um status não terminal do Projeto para `CANCELADO`.

Este catálogo não define responsável pelo Projeto, papéis, delegação, matriz de permissões ou mecanismo técnico de autorização.

## Efeitos na Necessidade de origem

Como a relação é de uma Necessidade aprovada para um único Projeto, os efeitos de encerramento do Projeto sobem a relação hierárquica:

```text
Projeto CONCLUIDO
→ Necessidade de origem ATENDIDA

Projeto CANCELADO
→ Necessidade de origem CANCELADA
```

O cancelamento do único Projeto encerra o compromisso assumido para sua Necessidade de origem. A Necessidade não pode permanecer em `EM_PROJETO` apontando para um Projeto terminal `CANCELADO`, nem pode ser criado um segundo Projeto para a mesma Necessidade para contornar o cancelamento.

Esta regra não é generalizada nesta definição para Módulo, Entrega de Valor ou Item de Trabalho.

## Regra de crescimento do catálogo

O catálogo deve crescer somente quando novos Resultados do Processo forem efetivamente definidos. Ele não antecipa resultados como reprovação, adiamento, bloqueio, revisão, reabertura, falha, abandono ou suspensão.

## Conceitos que não são Resultados do Processo

Não são Resultados do Processo do Projeto:

* `EM_FORMACAO`;
* `EM_MODULOS`;
* `CONCLUIDO`;
* `CANCELADO`;
* `ENQUADRAMENTO`;
* `DESCOBERTA`;
* `DIREÇÃO DA SOLUÇÃO`;
* `DECOMPOSIÇÃO EM MÓDULOS`;
* materialização dos Módulos;
* conclusão dos Módulos;
* tratamento de lacunas;
* investigação;
* reformulação;
* interação humana em si; e
* status internos de Módulos.

Esses conceitos são status, etapas, atividades, verificações, condições, decisões ou elementos internos de outras entidades e permanecem separados deste catálogo.
