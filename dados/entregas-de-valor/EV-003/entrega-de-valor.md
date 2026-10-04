# EV-003 — Coordenação do Trabalho Preparado

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `b06d5c8e-f9d1-457b-8880-87305dc3aca6` |
| Código | `EV-003` |
| Módulo proprietário | [M-003 — Coordenação do Trabalho](../../modulos/M-003/modulo.md) |
| Status | `EM_FORMACAO` |

## Delimitação inicial

* **Item canônico:** [EV-003 no Mapa de Entregas de Valor de M-003](../../modulos/M-003/mapa-de-entregas-de-valor.md#ev-003--coordenação-do-trabalho-preparado)
* **Declaração de valor:** permitir que o operador ou usuário conduza o avanço do trabalho do projeto a partir do reconhecimento legítimo do próximo avanço válido, verificando as condições de preparação, a competência e o Ator/Skill necessários, e emitindo handoff com contexto recuperável suficiente sem reconstrução manual.
* **Beneficiário relevante:** o operador da jornada, os Atores executores e o Owner que acompanha a progressão contínua e legítima do trabalho.
* **Resultado observável esperado:** dado um trabalho originado da Direção do Projeto ou de capacidade habilitada, o sistema reconhece suas dependências e estado de preparação; identifica a competência, Ator e Skill requeridos; disponibiliza a composição do handoff de despacho com referências recuperáveis; e reflete as condições operacionais (preparado, bloqueado, em execução, aguardando decisão humana) sem exigir reconstrução manual do percurso.
* **Dentro da fronteira:** avaliação de condições de preparação e critérios de elegibilidade do próximo avanço válido; encadeamento competência → Ator → Skill; preparação do handoff lógico com referências recuperáveis e critérios observáveis de término; acompanhamento de retornos e condições operacionais; explicitação de dependências, bloqueios e pendências de decisão humana do fluxo; consulta e inspeção da coordenação via interface e adaptadores.
* **Fora da fronteira:** tomar decisão humana soberana pelo Owner; prover repositório e infraestrutura transversal de histórico/busca física (M-004); atestar e verificar substantivamente resultado final de software (M-005); alterar a Direção do Projeto (M-002); formar ou qualificar a Necessidade (M-001).
* **Dependências, relações e incertezas relevantes:** depende da Direção do Projeto fornecida por M-002; depende conceitualmente de referências recuperáveis a serem preservadas por M-004; seleção física de executores e políticas de runtime de agentes permanecem como incógnitas proporcionais a serem especificadas na formação técnica.

## Handoff

A Entrega de Valor foi materializada pelo **Especialista em Delimitação de Entregas de Valor** com base no Mapa canônico de M-003 e na Especificação Técnica do Módulo. Encontra-se em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor** para o detalhamento da especificação de produto, comportamento, requisitos e arquitetura de alto nível.
