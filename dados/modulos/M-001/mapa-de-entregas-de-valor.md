# Mapa de Entregas de Valor — M-001

## Referência e escopo da delimitação

Este é o registro canônico da delimitação das Entregas de Valor de [M-001 — Condução da Necessidade](modulo.md). O Módulo está em `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`; por isso, pode originar Entregas de Valor.

Foram recuperados proporcionalmente a [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto), o [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-001--condução-da-necessidade), o [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) e a Especificação Técnica deste Módulo. Eles permanecem como fontes de verdade de seus próprios contextos.

## Análise das evoluções candidatas

| Evolução candidata | Decisão | Justificativa |
| --- | --- | --- |
| Tornar uma demanda registrada em Compromisso da Necessidade decidido explicitamente pelo Owner e disponível para consumo do Projeto | Materializar como `EV-001` | Materializa a capacidade completa de M-001 em resultado utilizável e perceptível: a pessoa que conduz a demanda e o Owner conseguem acompanhar sua transformação em compromisso explícito, e o Projeto pode recebê-lo sem que M-001 crie ou forme esse Projeto. |
| Registro isolado da demanda | Não separar | É uma etapa interna necessária, mas isoladamente não entrega o resultado de valor que a capacidade de M-001 promete: uma Necessidade comprometida por decisão humana explícita. |
| Formação, auditoria, qualificação ou recomendação isoladas | Não separar | São atividades especializadas e marcos internos que sustentam o compromisso; não são evolução utilizável independente para o beneficiário e não devem ser convertidos artificialmente em Entregas de Valor. |
| Materialização ou formação do Projeto após o compromisso | Não incluir | Pertence a M-002 e não altera a propriedade exclusiva de `EV-001` por M-001. |

## Entregas de Valor materializadas

### EV-001 — Compromisso da Necessidade

| Campo | Registro |
| --- | --- |
| Identificador técnico | `80264aa7-5243-4396-a99e-e33e38aca286` |
| Módulo proprietário | [M-001 — Condução da Necessidade](modulo.md) |
| Status | `CONCLUIDA` |
| Registro principal | [EV-001 — Compromisso da Necessidade](../../entregas-de-valor/EV-001/entrega-de-valor.md) |
| Plano de Realização | [Plano de Realização da EV-001](../../entregas-de-valor/EV-001/plano-de-realizacao.md) |

* **Declaração de valor:** permitir que uma demanda seja conduzida até um Compromisso da Necessidade decidido explicitamente pelo Owner e disponível ao Projeto.
* **Beneficiário relevante:** pessoa ou equipe que apresenta a demanda e o Owner responsável por decidir seu compromisso.
* **Resultado observável esperado:** uma Necessidade registrada percorre formação, auditoria e qualificação; após decisão humana `APROVADO`, seu Compromisso consolidado fica disponível para consumo por M-002.
* **Dentro da fronteira:** registro e atualização controlada da Necessidade; formação, auditoria e qualificação pelos Atores competentes; recomendação; apresentação da decisão ao Owner; registro separado da decisão; e consolidação e disponibilização do Compromisso após `APROVADO`.
* **Fora da fronteira:** materializar, formar ou auditar o Projeto; selecionar executor; coordenar trabalho posterior; definir persistência, autenticação, transporte ou orquestração físicos; e verificar resultado de software.

## Dependências, sobreposições e incertezas

* O Owner é a única autoridade para a decisão humana material `APROVADO`; a Entrega de Valor não a simula nem a substitui.
* M-002 é consumidor posterior do Compromisso e materializa o Projeto 1:1; não integra a fronteira desta Entrega de Valor.
* M-004 é a capacidade prevista para preservação, recuperação e correlação de contexto; a dependência não altera a propriedade de `EV-001` por M-001.
* A identidade autenticada do Owner, a persistência, a comunicação entre Módulos, a concorrência e a orquestração físicas permanecem desconhecidas legítimas para formação e realização posteriores.
* A consulta aos registros existentes não encontrou Entrega de Valor materializada nem evolução equivalente em M-001. Não há sobreposição identificada nesta delimitação.

## Handoff

`EV-001` foi materializada em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor**. O próximo Ator deve aprofundar produto e solução técnica de alto nível sem redelimitar silenciosamente esta fronteira, com base no registro principal, na Especificação Técnica de M-001 e nas referências de origem deste Mapa.
