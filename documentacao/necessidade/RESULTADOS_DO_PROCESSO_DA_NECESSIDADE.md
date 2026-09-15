# Resultados do Processo da Necessidade

Este é o catálogo oficial dos Resultados do Processo atualmente definidos para Necessidade.

Resultado do Processo representa uma conclusão, decisão, recomendação ou determinação produzida durante uma atividade do processo. Ele não informa onde a Necessidade está.

```text
Status
→ posição no ciclo

Resultado do Processo
→ conclusão produzida durante o processo
```

## Resultados de auditoria de formação

| Resultado | Significado |
| --- | --- |
| `QUALIFICAVEL` | A formação é suficiente para avançar à qualificação: há compreensão, fronteira de escopo, entregabilidade e confirmação da intenção. |
| `PRECISA_DE_ESCLARECIMENTO` | Faltam informações ou há ambiguidades que exigem interação para esclarecer a Necessidade. |
| `PRECISA_DE_DECOMPOSICAO` | Há resultados independentes ou tamanho incompatível com uma única Necessidade, exigindo avaliação de decomposição. |
| `NAO_CARACTERIZA_NECESSIDADE` | O registro não representa uma mudança de negócio que possa ser tratada como Necessidade. Esse diagnóstico não encerra unilateralmente a Necessidade: se houver possibilidade de compreendê-la ou reformulá-la, a formação continua; se for definitivo, o encerramento depende de `CANCELAMENTO_APROVADO`. |

Nenhum desses resultados é status.

## Estratégia ou determinação operacional materializada

| Resultado | Significado |
| --- | --- |
| `NENHUM_TRATAMENTO_ADICIONAL` | O diagnóstico não exige tratamento adicional antes de continuar o processo. |

Esclarecimento, brainstorm, reformulação e decomposição podem ser estratégias escolhidas pelo agente conforme o diagnóstico. Este catálogo não antecipa novas enumerações para essas escolhas.

## Recomendação do agente

| Resultado | Significado |
| --- | --- |
| `ASSUMIR_COMPROMISSO` | O agente recomenda assumir compromisso com a Necessidade após a qualificação. |
| `NAO_ASSUMIR_COMPROMISSO` | A qualificação concluiu que, nas condições atuais, o agente não recomenda assumir compromisso com a Necessidade. |

Essas recomendações não são status nem decisões humanas. Em especial, `NAO_ASSUMIR_COMPROMISSO` não cancela a Necessidade automaticamente: a pessoa responsável pode decidir pelo cancelamento ou, quando houver informação, condição ou mudança que justifique nova análise, o processo pode retornar à formação ou à qualificação conforme a causa concreta.

## Decisões humanas materiais

| Resultado | Significado |
| --- | --- |
| `APROVADO` | O usuário autenticado responsável pela Necessidade aprovou o compromisso. Isso dispara obrigatoriamente a criação do Projeto correspondente. |
| `CANCELAMENTO_APROVADO` | O usuário autenticado responsável pela Necessidade confirmou seu encerramento. Isso provoca a transição de um status não terminal para `CANCELADA`. |

`APROVADO` e `CANCELAMENTO_APROVADO` são decisões humanas materiais, não status. Nesta primeira versão, o usuário responsável pela Necessidade é o usuário que a criou. Toda decisão humana material registra, no mínimo, a decisão e o usuário autenticado que a realizou. Não há papéis, configuração de autoridade, delegação ou matriz de permissões neste modelo.

O catálogo deve crescer somente quando novos Resultados do Processo forem efetivamente definidos; não antecipa resultados como reprovação, adiamento ou recusa.
