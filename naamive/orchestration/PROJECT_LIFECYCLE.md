# Máquina de Estados do Projeto

Esta máquina governa o ciclo de vida de `projects/<project-id>/`. Ela começa em `ANALYSIS` após a decisão humana `REGISTER_PROJECT`; a qualificação inicial da necessidade ocorre na máquina pré-projeto.

## Estados

| Estado | Significado | Próximos estados permitidos |
| --- | --- | --- |
| `ANALYSIS` | Problema, valor, stakeholders e restrições estão sendo entendidos. | `DEFINITION`, `PAUSED`, `CANCELLED` |
| `DEFINITION` | Requisitos, domínio e módulos candidatos estão sendo definidos. | `ARCHITECTURE`, `PAUSED`, `CANCELLED` |
| `ARCHITECTURE` | Arquitetura e integração do produto estão sendo decididas. | `PLANNING`, `PAUSED`, `CANCELLED` |
| `PLANNING` | Plano de entrega, riscos e dependências estão sendo preparados. | `IMPLEMENTATION`, `PAUSED`, `CANCELLED` |
| `IMPLEMENTATION` | Módulos e aplicações autorizados estão sendo construídos. | `VALIDATION`, `PAUSED`, `CANCELLED` |
| `VALIDATION` | O produto integrado está sendo validado. | `DELIVERY`, `IMPLEMENTATION`, `PAUSED`, `CANCELLED` |
| `DELIVERY` | Release, implantação e handover estão sendo preparados ou executados. | `DELIVERED`, `VALIDATION`, `PAUSED`, `CANCELLED` |
| `DELIVERED` | A entrega foi aceita e possui evidência de entrega. | `EVOLUTION` |
| `EVOLUTION` | Mudanças posteriores são avaliadas e executadas de forma controlada. | `ANALYSIS`, `PLANNING`, `PAUSED`, `CANCELLED` |
| `PAUSED` | O trabalho foi temporariamente interrompido. | último estado ativo, `CANCELLED` |
| `CANCELLED` | O projeto foi encerrado sem continuidade. | nenhum |

## Controles de avanço

| Transição | Evidência mínima | Controle exigido |
| --- | --- | --- |
| `ANALYSIS` → `DEFINITION` | análise, stakeholders, valor e restrições iniciais | `INDEPENDENT_REVIEW`: análise verificável |
| `DEFINITION` → `ARCHITECTURE` | requisitos rastreáveis, critérios e módulos candidatos | `HUMAN_DECISION`: compromisso de produto |
| `ARCHITECTURE` → `PLANNING` | arquitetura, integrações e impactos registrados | `INDEPENDENT_REVIEW`; humano somente se decisão material |
| `PLANNING` → `IMPLEMENTATION` | plano, dependências, riscos e itens autorizados | `AUTOMATED_EVIDENCE` e revisão independente |
| `IMPLEMENTATION` → `VALIDATION` | implementação e integração disponíveis | `AUTOMATED_EVIDENCE` |
| `VALIDATION` → `DELIVERY` | aceitação, qualidade, segurança e risco residual explícitos | revisão independente; humano somente para produção de alto risco ou risco residual |
| `DELIVERY` → `DELIVERED` | entrega, operação e handover | `HUMAN_DECISION`: aceite de entrega |

O retorno de `VALIDATION` para `IMPLEMENTATION` exige registro dos achados que motivaram o retrabalho. A entrada em `EVOLUTION` exige uma nova necessidade ou mudança rastreável.

## Relação com módulos

Módulos podem ser identificados em `DEFINITION` e materializados após o compromisso de produto. Um módulo não pode iniciar `IMPLEMENTATION` enquanto o projeto não estiver em `IMPLEMENTATION`; ele não pode alcançar `DELIVERY` enquanto o projeto não estiver em `DELIVERY`.
