# Resultados do Processo do Módulo

Este é o catálogo oficial e a única fonte normativa dos Resultados do Processo da entidade Módulo. Resultado do Processo é uma conclusão produzida durante uma atividade; não informa onde o Módulo está.

```text
Status
→ posição do Módulo no ciclo

Resultado do Processo
→ conclusão produzida durante o processo
```

| Resultado | Significado |
| --- | --- |
| `FORMACAO_SUFICIENTE` | O Auditor do Módulo aprovou a formação técnica: capacidade, fronteiras e desenho técnico são suficientes para orientar realização posterior sem redesenhar o Módulo. |
| `FORMACAO_INSUFICIENTE` | A formação tem lacuna, inconsistência, ausência de sustentação ou insuficiência relevante para aprovação. |

`FORMACAO_SUFICIENTE` torna disponível a **Especificação Técnica do Módulo** aprovada e faz o Módulo transicionar de `EM_FORMACAO` para `FORMADO`. O Resultado não é o artefato e não define continuação operacional.

`FORMACAO_INSUFICIENTE` mantém o Módulo em `EM_FORMACAO`. Insuficiência técnica retorna ao Especialista em Formação do Módulo; problema de delimitação é registrado e entregue ao Especialista em Delimitação de Módulos para revisão executável do Mapa de Módulos. A revisão normal pode corrigir capacidade, responsabilidade, fronteira, nome, relações ou dependências e materializar Módulo adicional. Se o caso exigir alteração de identidade, a alteração afetada fica registrada como lacuna para decisão normativa específica, sem apagar instância, reutilizar código ou criar status ou Resultado do Processo.

Estes Resultados pertencem ao Módulo e não se confundem com Resultados de mesmo nome produzidos para Projeto. O catálogo não antecipa reprovação, bloqueio, cancelamento, entrega, realização ou resultados de verticais posteriores.
