# Máquina de Estados do Módulo

Esta máquina governa uma capacidade de negócio materializada em `projects/<project-id>/modules/<module-id>/`. Ela não substitui a máquina do projeto.

## Reconciliação operacional F6.5

Para novas instâncias, `MODULE_DELIVERY:v2` e `WORK_ITEM_DELIVERY:v2`
materializam esta máquina. Um plano aprovado cria o conjunto de work items
canônico e o scheduler despacha automaticamente as raízes elegíveis; um
predecessor técnico só libera dependente depois de aceito **e integrado**.
`WAITING_FOR_WORK_ITEM_AUTHORIZATION` é estado legado, não uma parada humana do
v2. QA, review independente, `ACCEPT`, merge, candidata, validação e integração
permanecem fatos distintos; o agregador promove o módulo somente com a evidência
exigida. Workflows antigos continuam imutáveis e consultáveis pela sua versão.

## Estados

| Estado | Significado | Próximos estados permitidos |
| --- | --- | --- |
| `IDENTIFIED` | A capacidade foi identificada, mas ainda não está definida. | `DEFINED`, `PAUSED`, `CANCELLED` |
| `DEFINED` | Domínio, necessidade específica e requisitos estão delimitados. | `ARCHITECTED`, `PAUSED`, `CANCELLED` |
| `ARCHITECTED` | Arquitetura interna, interfaces e estados necessários estão definidos. | `PLANNED`, `PAUSED`, `CANCELLED` |
| `PLANNED` | Trabalho, dependências e critérios de pronto estão planejados. | `IMPLEMENTING`, `PAUSED`, `CANCELLED` |
| `IMPLEMENTING` | Aplicações e artefatos autorizados do módulo estão sendo produzidos. | `INTEGRATING`, `PAUSED`, `CANCELLED` |
| `INTEGRATING` | Contratos e fluxos com outros módulos ou sistemas estão sendo verificados. | `VALIDATING`, `IMPLEMENTING`, `PAUSED`, `CANCELLED` |
| `VALIDATING` | Requisitos e qualidade do módulo estão sendo validados. | `READY_FOR_DELIVERY`, `IMPLEMENTING`, `PAUSED`, `CANCELLED` |
| `READY_FOR_DELIVERY` | O módulo possui evidência para integrar uma entrega do projeto. | `DELIVERED`, `IMPLEMENTING`, `PAUSED`, `CANCELLED` |
| `DELIVERED` | O módulo participou de uma entrega aceita do projeto. | `EVOLVING` |
| `EVOLVING` | O módulo está recebendo mudança controlada. | `DEFINED`, `PLANNED`, `PAUSED`, `CANCELLED` |
| `PAUSED` | O trabalho do módulo foi temporariamente interrompido. | último estado ativo, `CANCELLED` |
| `CANCELLED` | A capacidade foi encerrada sem continuidade. | nenhum |

## Controles de avanço

| Transição | Evidência mínima | Controle exigido |
| --- | --- | --- |
| `IDENTIFIED` → `DEFINED` | capacidade, limite, necessidade e responsável identificados | `INDEPENDENT_REVIEW` |
| `DEFINED` → `ARCHITECTED` | domínio, requisitos e critérios de aceitação | `INDEPENDENT_REVIEW` |
| `ARCHITECTED` → `PLANNED` | arquitetura interna, interfaces e dependências | revisão independente; humano somente se decisão material |
| `PLANNED` → `IMPLEMENTING` | itens autorizados, riscos e dependências tratados | `AUTOMATED_EVIDENCE` e revisão independente |
| `IMPLEMENTING` → `INTEGRATING` | implementação e testes locais | `AUTOMATED_EVIDENCE` |
| `INTEGRATING` → `VALIDATING` | contratos e fluxos integrados | `AUTOMATED_EVIDENCE` e revisão independente |
| `VALIDATING` → `READY_FOR_DELIVERY` | requisitos, qualidade e segurança | revisão independente; humano somente para risco material |
| `READY_FOR_DELIVERY` → `DELIVERED` | inclusão em release e aceite do projeto | controle de entrega do projeto; não cria aprovação humana duplicada |

## Restrições de escopo

O módulo representa uma capacidade de negócio, não uma camada técnica. Cada execução deve apontar para esse módulo e para um caminho sob ele. Um módulo tem um projeto proprietário, mas pode publicar contrato para projetos consumidores. O consumidor pode integrar esse contrato, nunca modificar o módulo provedor; uma mudança no provedor exige contexto e work item do próprio provedor. Ações que afetam diversos módulos do mesmo projeto devem executar em escopo de projeto, com os módulos envolvidos explicitamente identificados no contexto.
