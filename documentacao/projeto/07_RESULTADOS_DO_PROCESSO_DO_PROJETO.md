# Resultados do Processo do Projeto

Este é o catálogo oficial e a única fonte normativa dos Resultados do Processo atualmente definidos para Projeto.

Resultado do Processo representa uma conclusão, determinação ou decisão produzida durante uma atividade do processo. Ele não informa onde o Projeto está.

```text
Status
→ posição do Projeto no ciclo

Resultado do Processo
→ conclusão, determinação ou decisão produzida durante uma atividade do processo
```

Nenhum Resultado do Processo é status. O catálogo oficial de status do Projeto está em [Status do Projeto](06_STATUS_DO_PROJETO.md).

## Resultados da auditoria e verificação de formação

| Resultado | Significado |
| --- | --- |
| `FORMACAO_SUFICIENTE` | O Auditor do Projeto aprovou a formação: ela possui compreensão, sustentação e direção de solução suficientes. |
| `FORMACAO_INSUFICIENTE` | A formação ainda possui lacuna, inconsistência, ausência de sustentação ou insuficiência relevante para sua aprovação. |

`FORMACAO_SUFICIENTE` conclui e aprova o processo de formação. Ele torna disponível a Direção do Projeto, que é o artefato de saída consolidado dessa vertical, mas não se confunde com ela. Não cria status, não produz transição operacional e não exige a definição, a decomposição, a materialização, o status ou o ciclo de vida de entidade descendente alguma.

`FORMACAO_INSUFICIENTE` mantém o Projeto em `EM_FORMACAO`. O Especialista em Formação do Projeto trata as lacunas conforme a [Formação do Projeto](04_FORMACAO_DO_PROJETO.md) e o Auditor do Projeto realiza nova verificação.

## Resultados da verificação agregada final

| Resultado | Significado |
| --- | --- |
| `COMPROMISSO_ATENDIDO` | A verificação agregada concluiu que o resultado produzido na realização do Projeto atende ao compromisso recebido da Necessidade de origem. |
| `COMPROMISSO_NAO_ATENDIDO` | A verificação agregada concluiu que o resultado produzido ainda não atende suficientemente ao compromisso recebido da Necessidade. |

Os efeitos operacionais de `COMPROMISSO_ATENDIDO` ainda não estão definidos. `CONCLUIDO` permanece como terminal conceitual futuro, sem caminho normativo de alcance nesta versão.

Os efeitos operacionais de `COMPROMISSO_NAO_ATENDIDO` ainda não estão definidos. Este catálogo não antecipa status de permanência, trabalho corretivo ou nova verificação.

## Decisão humana material de cancelamento

| Resultado | Significado |
| --- | --- |
| `CANCELAMENTO_APROVADO` | O Owner aprovou o cancelamento do Projeto. |

`CANCELAMENTO_APROVADO` é uma decisão humana material, não um status. Seu Executor é o usuário autenticado no exercício do Owner; nenhum Ator agêntico pode produzi-la unilateralmente. Ela provoca a transição de um status não terminal do Projeto para `CANCELADO`.

Este catálogo não define mecanismo técnico de autorização. Nesta versão, não há RBAC, ACL, delegação, grupos, papéis configuráveis, ownership por entidade, matriz de autoridade ou modelo multiusuário.

## Efeitos na Necessidade de origem

Como a relação é de uma Necessidade aprovada para um único Projeto, os efeitos de encerramento do Projeto sobem a relação hierárquica:

```text
Projeto CONCLUIDO
→ Necessidade de origem ATENDIDA

Projeto CANCELADO
→ Necessidade de origem CANCELADA
```

O cancelamento do único Projeto encerra o compromisso assumido para sua Necessidade de origem. A Necessidade não pode permanecer em `EM_PROJETO` apontando para um Projeto terminal `CANCELADO`, nem pode ser criado um segundo Projeto para a mesma Necessidade para contornar o cancelamento.

## Regra de crescimento do catálogo

O catálogo deve crescer somente quando novos Resultados do Processo forem efetivamente definidos. Ele não antecipa resultados como reprovação, adiamento, bloqueio, revisão, reabertura, falha, abandono ou suspensão.

## Conceitos que não são Resultados do Processo

Não são Resultados do Processo do Projeto:

* `EM_FORMACAO`;
* `CONCLUIDO`;
* `CANCELADO`;
* `ENQUADRAMENTO`;
* `DESCOBERTA`;
* `DIREÇÃO DA SOLUÇÃO`;
* resultado da realização disponível para verificação;
* tratamento de lacunas;
* investigação;
* reformulação; e
* interação humana em si.

Esses conceitos são status, etapas, atividades, verificações, condições, decisões ou elementos internos de outras entidades e permanecem separados deste catálogo.

A Direção do Projeto também não é Resultado do Processo: é a representação consolidada aprovada que se torna disponível em decorrência de `FORMACAO_SUFICIENTE`.
