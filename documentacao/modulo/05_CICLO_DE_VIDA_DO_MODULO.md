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
   → insuficiência técnica: Especialista em Formação do Módulo
   → problema de delimitação: revisão pelo Especialista em Delimitação de Módulos
ou
→ FORMACAO_SUFICIENTE
→ FORMADO
→ Especificação Técnica do Módulo aprovada e disponível
→ continuação operacional ainda não definida
```

`FORMACAO_INSUFICIENTE` por insuficiência técnica retorna ao Especialista em Formação do Módulo. Quando a auditoria revelar problema de delimitação, ela registra o retorno e o entrega ao Especialista em Delimitação de Módulos, que revisa o arquivo canônico do Mapa de Módulos do Projeto em `dados/projetos/<codigo-projeto>/mapa-de-modulos.md`. A revisão normal corrige capacidade, responsabilidade, fronteira, nome, relações ou dependências e pode materializar Módulo adicional. Caso exija alteração de identidade, a alteração afetada é interrompida e registrada como lacuna que demanda decisão normativa específica. O procedimento completo está em [Formação do Módulo](04_FORMACAO_DO_MODULO.md#retorno-estrutural-de-delimitação).

## Transições conhecidas

| Evento ou condição | Efeito | Regra |
| --- | --- | --- |
| Delimitação justificada | materialização → `EM_FORMACAO` | Todo Módulo materializado pertence a um único Projeto. |
| `FORMACAO_INSUFICIENTE` técnico | permanece em `EM_FORMACAO` | O Especialista em Formação do Módulo trata as lacunas antes de nova auditoria. |
| `FORMACAO_INSUFICIENTE` por delimitação com identidade preservada | permanece em `EM_FORMACAO` | O Especialista em Delimitação de Módulos atualiza o Mapa e devolve os Módulos afetados à formação. |
| `FORMACAO_INSUFICIENTE` por delimitação com impacto de identidade | permanece em `EM_FORMACAO` | Registra a lacuna e interrompe somente a alteração afetada até decisão normativa específica; não apaga instância nem cria transição adicional. |
| `FORMACAO_SUFICIENTE` | `EM_FORMACAO` → `FORMADO` | Aprova e disponibiliza a Especificação Técnica do Módulo. |

Não há neste ciclo caminho para conclusão, cancelamento, realização, Entrega de Valor ou qualquer regra da vertical posterior. `FORMADO` significa somente formação aprovada; não existe status para encerrar, fundir ou substituir identidades de Módulo.
