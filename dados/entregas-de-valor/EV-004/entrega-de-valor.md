# EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `806acc2a-8f8f-4389-a234-ca61c42f5bb3` |
| Código | `EV-004` |
| Módulo proprietário | [M-004 — Contexto e Rastreabilidade](../../modulos/M-004/modulo.md) |
| Status | `EM_FORMACAO` |

## Delimitação inicial

* **Item canônico:** [EV-004 no Mapa de Entregas de Valor de M-004](../../modulos/M-004/mapa-de-entregas-de-valor.md#ev-004--preservação-e-recuperação-de-contexto-e-rastreabilidade)
* **Declaração de valor:** permitir que o operador, o Owner e os Atores recuperem e correlacionem por finalidade declarada o contexto proporcional, as decisões, os vínculos de causalidade e as referências de origem da jornada sem exigir reconstrução manual do histórico e sem gerar estados concorrentes.
* **Beneficiário relevante:** o operador da jornada, os Atores executores e o Owner que necessitam explicar o percurso, auditar decisões e recuperar insumos para o avanço legítimo.
* **Resultado observável esperado:** dada uma finalidade declarada (ex.: auditar, despachar, verificar), o sistema recupera a cadeia de origem e referências estáveis (Necessidade → Projeto → Módulos → Entregas de Valor → Itens de Trabalho → Resultados do Processo), preservando proveniência e temporalidade, distinguindo estado vigente de histórico superado e expondo lacunas de contexto quando existirem.
* **Dentro da fronteira:** preservação e consulta estruturada de referências de proveniência, decisões humanas, Resultados do Processo, vínculos causais e contexto proporcional por finalidade; distinção lógica entre estado vigente e histórico; identificação de referências ausentes, obsoletas ou contraditórias; interface e endpoints de consulta de rastreabilidade.
* **Fora da fronteira:** tomar decisões humanas pelo Owner; coordenar o próximo avanço ou despachar trabalhos (M-003); verificar substantivamente o software frente ao compromisso (M-005); alterar a semântica ou o estado das entidades das demais verticais.
* **Dependências, relações e incertezas relevantes:** depende dos eventos, decisões e dados produzidos por M-001, M-002 e M-003; fornece a cadeia explicativa e de proveniência para M-005; detalhes do modelo relacional e índices no PostgreSQL serão especificados proporcionalmente na formação técnica.

## Handoff da Delimitação

A delimitação inicial da **EV-004 — Preservação e Recuperação de Contexto e Rastreabilidade** foi materializada pelo **Especialista em Delimitação de Entregas de Valor** com status `EM_FORMACAO`. O artefato e seu contexto são entregues formalmente ao **Especialista em Formação da Entrega de Valor** para condução da formação técnica e especificação detalhada da evolução.
