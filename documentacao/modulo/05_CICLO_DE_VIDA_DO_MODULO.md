# Ciclo de Vida do Módulo

## Finalidade

Este documento define somente o trecho atualmente conhecido. Os status pertencem a [Status do Módulo](06_STATUS_DO_MODULO.md), os Resultados do Processo a [Resultados do Processo do Módulo](07_RESULTADOS_DO_PROCESSO_DO_MODULO.md) e as responsabilidades a [Atores do Módulo](03_ATORES_DO_MODULO.md).

## Fluxo de referência

```text
Direção do Projeto aprovada
→ Especialista em Delimitação de Módulos
→ identificação das capacidades coesas
→ aplicação da heurística de modularização
→ materialização dos Módulos
→ cada Módulo nasce em EM_FORMACAO
→ Especialista em Formação do Módulo
→ descoberta e desenho técnico
→ Auditor do Módulo
→ FORMACAO_INSUFICIENTE
   → retorno ao responsável adequado
ou
→ FORMACAO_SUFICIENTE
→ Especificação Técnica do Módulo aprovada
→ continuação operacional ainda não definida
```

`FORMACAO_INSUFICIENTE` por insuficiência técnica retorna ao Especialista em Formação do Módulo. Quando a auditoria revelar problema estrutural de delimitação, ela indica retorno ao Especialista em Delimitação de Módulos. A mecânica de divisão ou fusão é lacuna deliberada desta versão.

## Transições conhecidas

| Evento ou condição | Efeito | Regra |
| --- | --- | --- |
| Delimitação justificada | materialização → `EM_FORMACAO` | Todo Módulo materializado pertence a um único Projeto. |
| `FORMACAO_INSUFICIENTE` | permanece em `EM_FORMACAO` | O retorno é ao responsável adequado conforme a natureza da lacuna. |
| `FORMACAO_SUFICIENTE` | permanece em `EM_FORMACAO` | Aprova a Especificação Técnica do Módulo, sem criar status posterior. |

Não há neste ciclo status pós-formação, caminho para conclusão, cancelamento, realização, Entrega de Valor ou qualquer regra da vertical posterior.
