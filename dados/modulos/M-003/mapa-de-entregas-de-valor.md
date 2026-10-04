# Mapa de Entregas de Valor — M-003

## Referência e escopo da delimitação

Este é o registro canônico da delimitação das Entregas de Valor de [M-003 — Coordenação do Trabalho](modulo.md). O Módulo está em `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`; por isso, está legitimamente apto a originar Entregas de Valor.

Foram recuperados proporcionalmente a [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto), o [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-003--coordenação-do-trabalho), o [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) e a [Especificação Técnica de M-003](modulo.md#especificação-técnica-do-módulo). Eles permanecem como fontes de verdade de seus próprios contextos.

## Análise das evoluções candidatas

| Evolução candidata | Decisão | Justificativa |
| --- | --- | --- |
| Conduzir trabalho preparado por meio da identificação do próximo avanço válido, vinculação ao Ator e Skill competentes e despacho com contexto recuperável de handoff | Materializar como `EV-003` | Concretiza a capacidade central de M-003 e o teste primário da N-001: o usuário/operador consegue verificar e despachar um trabalho preparado para execução sem reconstruir manualmente todo o contexto operacional. |
| Decomposição puramente estática de trabalho sem verificação de preparação ou despacho | Não separar | É etapa interna de planejamento/coordenação; isoladamente não entrega resultado utilizável nem perceptível pelo beneficiário para o avanço da jornada. |
| Preservação e recuperação global de histórico e contexto transversal | Não incluir | Pertence a M-004 (Contexto e Rastreabilidade) e não integra a fronteira nem a capacidade de coordenação de M-003. |
| Verificação substantiva observável do resultado integrado | Não incluir | Pertence a M-005 (Verificação do Resultado de Software) e aos ritos próprios de verificação, não à coordenação do fluxo de trabalho. |

## Entregas de Valor materializadas

### EV-003 — Coordenação do Trabalho Preparado

| Campo | Registro |
| --- | --- |
| Identificador técnico | `b06d5c8e-f9d1-457b-8880-87305dc3aca6` |
| Módulo proprietário | [M-003 — Coordenação do Trabalho](modulo.md) |
| Status | `EM_REALIZACAO` |
| Registro principal | [EV-003 — Coordenação do Trabalho Preparado](../../entregas-de-valor/EV-003/entrega-de-valor.md) |
| Plano de Realização | [Plano de Realização da EV-003](../../entregas-de-valor/EV-003/plano-de-realizacao.md) |

* **Declaração de valor:** permitir que o operador ou usuário conduza o avanço do trabalho do projeto a partir do reconhecimento legítimo do próximo avanço válido, verificando as condições de preparação, a competência e o Ator/Skill necessários, e emitindo handoff com contexto recuperável suficiente sem reconstrução manual.
* **Beneficiário relevante:** o operador da jornada, os Atores executores e o Owner que acompanha a progressão contínua e legítima do trabalho.
* **Resultado observável esperado:** dado um trabalho originado da Direção do Projeto ou de capacidade habilitada, o sistema reconhece suas dependências e estado de preparação; identifica a competência, Ator e Skill requeridos; disponibiliza a composição do handoff de despacho com referências recuperáveis; e reflete as condições operacionais (preparado, bloqueado, em execução, aguardando decisão humana) sem exigir reconstrução manual do percurso.
* **Dentro da fronteira:** avaliação de condições de preparação e critérios de elegibilidade do próximo avanço válido; encadeamento competência → Ator → Skill; preparação do handoff lógico com referências recuperáveis e critérios observáveis de término; acompanhamento de retornos e condições operacionais; explicitação de dependências, bloqueios e pendências de decisão humana do fluxo; consulta e inspeção da coordenação via interface e adaptadores.
* **Fora da fronteira:** tomar decisão humana soberana pelo Owner; prover repositório e infraestrutura transversal de histórico/busca física (M-004); atestar e verificar substantivamente resultado final de software (M-005); alterar a Direção do Projeto (M-002); formar ou qualificar a Necessidade (M-001).

## Dependências, sobreposições e incertezas

* M-002 orienta as capacidades e fornece a Direção do Projeto consolidada.
* M-004 fornece o contexto e correlações recuperáveis; M-003 consome essas informações sem assumir armazenamento global de histórico.
* M-005 receberá o percurso para verificação substantiva futura.
* A seleção física e concreta de executores agênticos e políticas de despacho físico permanecem desconhecidos legítimos a serem especificados proporcionalmente na formação técnica da EV-003.
* A consulta aos registros existentes confirma que `EV-001` pertence a M-001, `EV-002` pertence a M-002 e não há Entrega de Valor materializada nem evolução equivalente em M-003. Não há sobreposição nesta delimitação.

## Handoff

`EV-003` foi materializada em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor**. O próximo Ator deve aprofundar produto e solução técnica de alto nível sem redelimitar silenciosamente esta fronteira, com base no registro principal, na Especificação Técnica de M-003 e nas referências de origem deste Mapa.
