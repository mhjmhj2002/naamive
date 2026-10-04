# EV-005 — Avaliação e Verificação da Entrega de Valor

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `6868d52a-295d-46a5-89fc-a6eac1d70dc5` |
| Código | `EV-005` |
| Módulo proprietário | [M-005 — Verificação do Resultado de Software](../../modulos/M-005/modulo.md) |
| Status | `EM_FORMACAO` |

## Delimitação inicial

* **Item canônico:** [EV-005 no Mapa de Entregas de Valor de M-005](../../modulos/M-005/mapa-de-entregas-de-valor.md#ev-005--avaliação-e-verificação-da-entrega-de-valor)
* **Declaração de valor:** permitir que o operador, o Owner e os Atores comprovem de forma observável, reproduzível e rastreável se o incremento de software integrado atende aos critérios verificáveis derivados do Compromisso da Necessidade e da Direção do Projeto, emitindo laudos técnicos fundamentados (`CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `DIVERGÊNCIA_ENCONTRADA`) e identificando explicitamente limites e divergências.
* **Beneficiário relevante:** o operador da jornada, os Atores de governança, o Verificador Agregado do Projeto e o Owner que necessitam de comprovação técnica rigorosa, independente e demonstrável do software integrado antes da homologação final.
* **Resultado observável esperado:** dado um resultado de software identificado e integrado gerado por um percurso da jornada, o sistema inspeciona suas saídas contra critérios verificáveis objetivos, avalia a suficiência de evidências automatizadas e operacionais, correlaciona o resultado com sua origem causal (N-001 → P-001 → Módulos → EV) e emite parecer técnico conclusivo e explicável, expondo divergências quando houver.
* **Dentro da fronteira:** recepção e registro de resultados de software identificáveis; derivação de critérios verificáveis a partir do percurso e do compromisso; execução/coleta de evidências operacionais e automatizadas; correlação explicativa de critérios, evidências e conclusões técnicas; persistência estruturada do laudo de verificação; interface web e endpoints REST para inspeção técnica da verificação.
* **Fora da fronteira:** implementar, corrigir ou empacotar software; coordenar o avanço ou despachar retrabalho (M-003); emitir `COMPROMISSO_ATENDIDO` ou concluir o Projeto P-001 (Verificador Agregado do Projeto); alterar o status de N-001 para `ATENDIDA`; tomar decisões humanas materiais pelo Owner.
* **Dependências, relações e incertezas relevantes:** consome as evidências e o percurso de M-003 e a cadeia de rastreabilidade de M-004; é orientado pelas diretrizes de M-002; os mecanismos concretos de inspeção automatizada e as páginas web de visualização de conformidade serão especificados na formação técnica.

## Handoff da Delimitação

A delimitação inicial da **EV-005 — Avaliação e Verificação da Entrega de Valor** foi materializada pelo **Especialista em Delimitação de Entregas de Valor** com status `EM_FORMACAO`. O artefato e seu contexto são entregues formalmente ao **Especialista em Formação da Entrega de Valor** para condução da formação técnica e especificação detalhada da evolução.
