# Mapa de Entregas de Valor — M-002

## Referência e escopo da delimitação

Este é o registro canônico da delimitação das Entregas de Valor de [M-002 — Formação do Projeto](modulo.md). O Módulo está em `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`; por isso, pode originar Entregas de Valor.

Foram recuperados proporcionalmente a [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto), o [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-002--formação-do-projeto), o [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) e a [Especificação Técnica de M-002](modulo.md#especificação-técnica-do-módulo). Eles permanecem como fontes de verdade de seus próprios contextos.

## Análise das evoluções candidatas

| Evolução candidata | Decisão | Justificativa |
| --- | --- | --- |
| Receber o Compromisso da Necessidade aprovado, garantir o vínculo exclusivo 1:1, conduzir a formação e auditoria do Projeto até disponibilizar sua Direção aprovada | Materializar como `EV-002` | Materializa a capacidade completa e central de M-002 em resultado utilizável e perceptível: uma Necessidade comprometida ganha representação de Projeto correspondente único e auditado, cuja Direção orienta as capacidades descendentes do NAAMIVE. |
| Recepção isolada do handoff e registro de Projeto sem formação | Não separar | É apenas uma etapa inicial de recepção/bootstrap; isoladamente não entrega o valor prometido por M-002, que é a Direção do Projeto aprovada e disponível. |
| Auditoria independente do Projeto isolada | Não separar | É um marco de controle interno obrigatório da vertical Projeto; não constitui evolução de valor utilizável independente para o beneficiário. |
| Delimitação ou formação de Módulos descendentes | Não incluir | Pertence à vertical Módulo e não integra a capacidade nem a fronteira de M-002. |

## Entregas de Valor materializadas

### EV-002 — Direção do Projeto

| Campo | Registro |
| --- | --- |
| Identificador técnico | `096a280f-c8aa-4de1-932b-159e5a609b21` |
| Módulo proprietário | [M-002 — Formação do Projeto](modulo.md) |
| Status | `EM_REALIZACAO` |
| Registro principal | [EV-002 — Direção do Projeto](../../entregas-de-valor/EV-002/entrega-de-valor.md) |
| Plano de Realização | [Plano de Realização da EV-002](../../entregas-de-valor/EV-002/plano-de-realizacao.md) |

* **Declaração de valor:** permitir que um Compromisso da Necessidade validamente aprovado materialize de forma idempotente um único Projeto 1:1, conduzindo sua formação técnica e auditoria independente até que sua Direção aprovada fique disponível para orientar as capacidades descendentes.
* **Beneficiário relevante:** o Owner e as equipes que necessitam de direcionamento estratégico, técnico e estrutural unificado para desdobrar trabalho derivado de uma Necessidade comprometida.
* **Resultado observável esperado:** uma solicitação de bootstrap vinculada a uma Necessidade com `APROVADO` materializa exatamente uma instância de Projeto em `EM_FORMACAO`; a confirmação é devolvida a M-001 (permitindo sua evolução para `EM_PROJETO`); a formação percorre Enquadramento, Descoberta e Direção da Solução; após parecer `FORMACAO_SUFICIENTE` do Auditor do Projeto, o Projeto atinge `FORMADO` e sua Direção aprovada fica disponível para consumo e consulta.
* **Dentro da fronteira:** recepção e validação do Compromisso da Necessidade aprovado; garantia de unicidade e idempotência do vínculo 1:1 (Necessidade → Projeto); criação e atualização controlada do Projeto; suporte às etapas de Enquadramento, Descoberta e Direção da Solução pelo Especialista em Formação do Projeto; recepção e registro do parecer do Auditor do Projeto; disponibilização da Direção aprovada e handoff para delimitação de Módulos; e persistência e consulta do estado e histórico.
* **Fora da fronteira:** formar ou qualificar a Necessidade (M-001); aprovar o compromisso (Owner); delimitar, formar ou auditar Módulos; coordenar fluxo de trabalho ou selecionar executores (M-003); prover infraestrutura compartilhada física de busca e telemetria (M-004); e implementar ou verificar software integrado de capacidades posteriores (M-005).

## Dependências, sobreposições e incertezas

* M-001 disponibiliza o Compromisso aprovado e consome a confirmação de materialização do Projeto.
* O Auditor do Projeto é autoridade independente para o parecer `FORMACAO_SUFICIENTE` ou `FORMACAO_INSUFICIENTE`.
* O Owner é a autoridade humana transversal para decisão excepcional de cancelamento (`CANCELAMENTO_APROVADO`).
* A garantia de unicidade 1:1 é invariante estrita da solução, prevenindo duplicações mesmo sob concorrência ou reenvio de solicitações.
* A consulta aos registros existentes confirma que `EV-001` pertence a M-001 e que não há Entrega de Valor materializada nem evolução equivalente em M-002. Não há sobreposição nesta delimitação.

## Handoff

`EV-002` foi materializada em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor**. O próximo Ator deve aprofundar produto e solução técnica de alto nível sem redelimitar silenciosamente esta fronteira, com base no registro principal, na Especificação Técnica de M-002 e nas referências de origem deste Mapa.
