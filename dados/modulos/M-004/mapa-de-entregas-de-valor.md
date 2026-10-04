# Mapa de Entregas de Valor — M-004

## Referência e escopo da delimitação

Este é o registro canônico da delimitação das Entregas de Valor de [M-004 — Contexto e Rastreabilidade](modulo.md). O Módulo está em `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`; por isso, está legitimamente apto a originar Entregas de Valor.

Foram recuperados proporcionalmente a [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto), o [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-004--contexto-e-rastreabilidade), o [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) e a [Especificação Técnica de M-004](modulo.md#especificação-técnica-do-módulo). Eles permanecem como fontes de verdade de seus próprios contextos.

## Análise das evoluções candidatas

| Evolução candidata | Decisão | Justificativa |
| --- | --- | --- |
| Preservar e recuperar referências de proveniência, contexto e rastreabilidade proporcional entre Necessidade, Projeto, trabalho e resultados | Materializar como `EV-004` | Concretiza a capacidade central de M-004 e suporta o teste primário da N-001: permite que qualquer ator ou participante recupere a cadeia causal e o contexto de uma decisão, handoff ou resultado por finalidade sem reconstrução manual externa e sem transformar o histórico em estado concorrente. |
| Repositório físico genérico de busca e telemetria ou log append-only arbitrário | Não incluir | São meios técnicos ou abstrações prematuras; não constituem evolução de valor de negócio utilizável nem perceptível pelo beneficiário para o percurso. |
| Determinação do próximo avanço válido e emissão de handoffs | Não incluir | Pertence a M-003 (Coordenação do Trabalho); M-004 apenas preserva e recupera as referências requeridas sem conduzir o fluxo. |
| Verificação substantiva de atendimento do compromisso de software | Não incluir | Pertence a M-005 (Verificação do Resultado de Software) e aos ritos de verificação agregada do projeto. |

## Entregas de Valor materializadas

### EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade

| Campo | Registro |
| --- | --- |
| Identificador técnico | `806acc2a-8f8f-4389-a234-ca61c42f5bb3` |
| Módulo proprietário | [M-004 — Contexto e Rastreabilidade](modulo.md) |
| Status | `EM_FORMACAO` |
| Registro principal | [EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade](../../entregas-de-valor/EV-004/entrega-de-valor.md) |

* **Declaração de valor:** permitir que o operador, o Owner e os Atores recuperem e correlacionem por finalidade declarada o contexto proporcional, as decisões, os vínculos de causalidade e as referências de origem da jornada sem exigir reconstrução manual do histórico e sem gerar estados concorrentes.
* **Beneficiário relevante:** o operador da jornada, os Atores executores e o Owner que necessitam explicar o percurso, auditar decisões e recuperar insumos para o avanço legítimo.
* **Resultado observável esperado:** dada uma finalidade declarada (ex.: auditar, despachar, verificar), o sistema recupera a cadeia de origem e referências estáveis (Necessidade → Projeto → Módulos → Entregas de Valor → Itens de Trabalho → Resultados do Processo), preservando proveniência e temporalidade, distinguindo estado vigente de histórico superado e expondo lacunas de contexto quando existirem.
* **Dentro da fronteira:** preservação e consulta estruturada de referências de proveniência, decisões humanas, Resultados do Processo, vínculos causais e contexto proporcional por finalidade; distinção lógica entre estado vigente e histórico; identificação de referências ausentes, obsoletas ou contraditórias; interface e endpoints de consulta de rastreabilidade.
* **Fora da fronteira:** tomar decisões humanas pelo Owner; coordenar o próximo avanço ou despachar trabalhos (M-003); verificar substantivamente o software frente ao compromisso (M-005); alterar a semântica ou o estado das entidades das demais verticais.

## Dependências, sobreposições e incertezas

* M-001, M-002 e M-003 produzem os eventos, decisões e artefatos de origem que M-004 preserva e correlaciona.
* M-005 consome a cadeia causal recuperável por M-004 para conduzir a verificação de software.
* A persistência física detalhada (esquema relacional em PostgreSQL integrado ao banco existente) será estabelecida na formação técnica proporcional da EV-004.
* A consulta aos registros existentes confirma que `EV-001` pertence a M-001, `EV-002` a M-002, `EV-003` a M-003 e não há Entrega de Valor materializada em M-004. Não há sobreposição nesta delimitação.

## Handoff

`EV-004` foi materializada em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor**. O próximo Ator deve aprofundar produto e solução técnica de alto nível sem redelimitar silenciosamente esta fronteira, com base no registro principal, na Especificação Técnica de M-004 e nas referências de origem deste Mapa.
