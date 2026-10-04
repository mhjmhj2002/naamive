# Mapa de Entregas de Valor — M-005

## Referência e escopo da delimitação

Este é o registro canônico da delimitação das Entregas de Valor de [M-005 — Verificação do Resultado de Software](modulo.md). O Módulo está em `FORMADO`, com Especificação Técnica aprovada por `FORMACAO_SUFICIENTE`; por isso, está legitimamente apto a originar Entregas de Valor.

Foram recuperados proporcionalmente a [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto), o [Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-005--verificação-do-resultado-de-software), o [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) e a [Especificação Técnica de M-005](modulo.md#especificação-técnica-do-módulo). Eles permanecem como fontes de verdade de seus próprios contextos.

## Análise das evoluções candidatas

| Evolução candidata | Decisão | Justificativa |
| --- | --- | --- |
| Demonstrar tecnicamente que o resultado de software integrado da jornada é verificável frente aos critérios derivados da Necessidade e Direção, emitindo pareceres estruturados e explicações de conformidade | Materializar como `EV-005` | Concretiza a capacidade central de M-005 e o critério de atendimento da N-001: permite demonstrar a verificabilidade do software integrado através de critérios objetivos, observações e evidências reproduzíveis, relacionando o resultado à sua origem sem presumir conformidade nem substituir o Verificador Agregado do Projeto. |
| Testes puramente sintéticos ou suíte de cobertura arbitrária desconectada de critérios de valor | Não incluir | São ferramentas técnicas e meios de automação; isoladamente não constituem evolução de valor de negócio utilizável nem perceptível pelo beneficiário para o percurso. |
| Avaliação agregada do projeto completo com emissão de COMPROMISSO_ATENDIDO | Não incluir | Pertence ao rito e Ator de Verificação Agregada do Projeto (`.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md`), não à verificação técnica de software de M-005. |
| Preservação de contexto, busca transversal ou auditoria de governança | Não incluir | Pertence a M-004 (Contexto e Rastreabilidade); M-005 consome os vínculos recuperados por M-004 para rastrear critérios e conclusões sem gerenciar o armazenamento transversal. |

## Entregas de Valor materializadas

### EV-005 — Avaliação e Verificação da Entrega de Valor

| Campo | Registro |
| --- | --- |
| Identificador técnico | `6868d52a-295d-46a5-89fc-a6eac1d70dc5` |
| Módulo proprietário | [M-005 — Verificação do Resultado de Software](modulo.md) |
| Status | `FORMADA` |
| Registro principal | [EV-005 — Avaliação e Verificação da Entrega de Valor](../../entregas-de-valor/EV-005/entrega-de-valor.md) |
| Plano de Realização | [Plano de Realização da EV-005](../../entregas-de-valor/EV-005/plano-de-realizacao.md) |

* **Declaração de valor:** permitir que o operador, o Owner e os Atores comprovem de forma observável, reproduzível e rastreável se o incremento de software integrado atende aos critérios verificáveis derivados do Compromisso da Necessidade e da Direção do Projeto, emitindo laudos técnicos fundamentados (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `DIVERGÊNCIA_ENCONTRADA`) e identificando explicitamente limites e divergências.
* **Beneficiário relevante:** o operador da jornada, os Atores de governança, o Verificador Agregado do Projeto e o Owner que necessitam de comprovação técnica rigorosa, independente e demonstrável do software integrado antes da homologação final.
* **Resultado observável esperado:** dado um resultado de software identificado e integrado gerado por um percurso da jornada, o sistema inspeciona suas saídas contra critérios verificáveis objetivos, avalia a suficiência de evidências automatizadas e operacionais, correlaciona o resultado com sua origem causal (N-001 → P-001 → Módulos → EV) e emite parecer técnico conclusivo e explicável, expondo divergências quando houver.
* **Dentro da fronteira:** recepção e registro de resultados de software identificáveis; derivação de critérios verificáveis a partir do percurso e do compromisso; execução/coleta de evidências operacionais e automatizadas; correlação explicativa de critérios, evidências e conclusões técnicas; persistência estruturada do laudo de verificação; interface web e endpoints REST para inspeção técnica da verificação.
* **Fora da fronteira:** implementar, corrigir ou empacotar software; coordenar o avanço ou despachar retrabalho (M-003); emitir `COMPROMISSO_ATENDIDO` ou concluir o Projeto P-001 (Verificador Agregado do Projeto); alterar o status de N-001 para `ATENDIDA`; tomar decisões humanas materiais pelo Owner.

## Dependências, sobreposições e incertezas

* M-002 fornece a Direção do Projeto aprovada que orienta critérios e restrições.
* M-003 disponibiliza o percurso e o resultado informado da coordenação.
* M-004 fornece a cadeia de proveniência e o contexto causal para relacionar o resultado à sua origem.
* As ferramentas concretas de automação e inspeção de testes e as páginas visuais de verificação serão especificadas na formação técnica proporcional da EV-005.
* A consulta aos registros existentes confirma que `EV-001` pertence a M-001, `EV-002` a M-002, `EV-003` a M-003, `EV-004` a M-004 e não há Entrega de Valor materializada em M-005. Não há sobreposição nesta delimitação.

## Handoff

`EV-005` foi materializada em `EM_FORMACAO` e é entregue ao **Especialista em Formação da Entrega de Valor**. O próximo Ator deve aprofundar produto e solução técnica de alto nível sem redelimitar silenciosamente esta fronteira, com base no registro principal, na Especificação Técnica de M-005 e nas referências de origem deste Mapa.
