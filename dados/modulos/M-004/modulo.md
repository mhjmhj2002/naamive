# M-004 — Contexto e Rastreabilidade

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `a31a5a6a-4b55-47e9-9db9-fdbe1bba8c84` |
| Código | `M-004` |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) |
| Status | `FORMADO` |

## Delimitação inicial

* **Item canônico:** [M-004 no Mapa de Módulos do Projeto](../../projetos/P-001/mapa-de-modulos.md#m-004--contexto-e-rastreabilidade).
* **Capacidade:** preservar e recuperar o contexto proporcional do percurso, incluindo evidências, decisões, Resultados do Processo e vínculos de origem.
* **Responsabilidade:** manter informações e relações recuperáveis para explicar a jornada sem substituir os Atores que avançam ou decidem.
* **Dentro da fronteira:** preservação e recuperação de contexto, evidências, decisões, Resultados do Processo e rastreabilidade entre Necessidade, Projeto, trabalho e resultado.
* **Fora da fronteira:** determinar próximo trabalho, escolher executor, tomar decisão humana e verificar substantivamente o resultado.
* **Relações relevantes:** atende a M-001, M-002 e M-003 com contexto; fornece rastreabilidade a M-005. Não coordena seus fluxos.

## Handoff

A formação técnica foi concluída pelo **Especialista em Formação do Módulo**, avaliada pelo **Auditor do Módulo** e aprovada por `FORMACAO_SUFICIENTE`. A Especificação Técnica está disponível para consumo posterior. A continuação operacional não está definida.

## Formação técnica

### Compreensão e refinamento da capacidade e fronteira

**Conhecido.** M-004 existe para preservar, recuperar e correlacionar o contexto proporcional do percurso iniciado na Necessidade, orientado pelo Projeto e continuado por trabalhos futuros. O resultado habilitado é contexto explicável e recuperável para que Atores e Executores atuem sem reconstrução manual extensa, mantendo a origem de cada informação identificável.

**Inferido do Compromisso da N-001 e da Direção do P-001.** A delegação por instrução simples requer mais que uma cópia de informações: requer localizar somente o que é material para uma finalidade, preservar a ligação com as fontes responsáveis e distinguir o que vigora do que apenas explica o percurso.

**Proposto.** M-004 oferece uma capacidade transversal de preservação, recuperação e correlação. Ele recebe das capacidades responsáveis o significado de estado, decisão, Resultado do Processo, evidência, handoff ou resultado; não interpreta novamente esse significado, não valida transições e não se torna fonte de verdade concorrente.

**Verificação de fronteira.** Não foi identificada sobreposição estrutural que exija retorno ao Especialista em Delimitação de Módulos. A coordenação do próximo avanço continua em M-003; a semântica de Necessidade e Projeto, em M-001 e M-002; e a verificação substantiva do resultado, em M-005.

### Descoberta técnica

| Evidência | Classificação | Impacto no desenho |
| --- | --- | --- |
| [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) | Conhecido | Exige contexto preservado, decisões humanas identificáveis, separação entre estado atual e histórico, rastreabilidade proporcional e delegação sem reconstrução manual. |
| [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto) e [M-004 no Mapa](../../projetos/P-001/mapa-de-modulos.md#m-004--contexto-e-rastreabilidade) | Conhecido | Determinam fluxo rastreável, separação entre status, Resultados, decisões e evidências, e a fronteira de preservação sem coordenação. |
| [Especificação de M-001](../M-001/modulo.md#especificação-técnica-do-módulo) | Conhecido | Define que Necessidade, histórico, Resultados, decisão do Owner, evidências e Compromisso têm semânticas distintas e que M-004 apoia sua preservação e consulta. |
| [Especificação de M-002](../M-002/modulo.md#especificação-técnica-do-módulo) | Conhecido | Define o vínculo 1:1 N-001 → P-001, bootstrap idempotente, Direção aprovada, auditoria e a preservação dos registros que explicam seus efeitos. |
| [Especificação de M-003](../M-003/modulo.md#especificação-técnica-do-módulo) | Conhecido | Exige contexto de handoff, retorno, dependências, decisões, tentativas e correlações recuperáveis; M-003 determina sua relevância operacional e M-004 os preserva e recupera. |
| [M-005](../M-005/modulo.md) | Conhecido | Delimita a futura verificação de resultado, que precisará recuperar a cadeia entre resultado, percurso, Projeto, Compromisso e Necessidade sem que M-004 conclua o atendimento. |
| Inventário e histórico Git do repositório | Conhecido | Há documentação, Skills e registros Markdown vinculados por links, códigos e identificadores técnicos; o commit mais recente registra a formação de M-003. Não há código executável, banco, índice, mecanismo de busca, API, armazenamento compartilhado, log de eventos ou infraestrutura de observabilidade. |
| [CONTINUIDADE_ATUAL.md](../../../CONTINUIDADE_ATUAL.md) | Conhecido | É mecanismo atual de retomada humana/agêntica e evidência do fluxo de trabalho do repositório; não é arquitetura de produção nem fonte autoritativa das entidades. |

## Especificação Técnica do Módulo

Esta Especificação Técnica está **aprovada** por `FORMACAO_SUFICIENTE`. Ela consolida a formação técnica de M-004 e está disponível para consumo posterior, sem definir continuação operacional.

### Origem, capacidade e resultado habilitado

| Elemento | Referência | Classificação |
| --- | --- | --- |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) | Conhecido |
| Direção consumida | [Direção do Projeto](../../projetos/P-001/projeto.md#direção-do-projeto), disponível após `FORMACAO_SUFICIENTE` | Conhecido |
| Justificativa de delimitação | [M-004 no Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-004--contexto-e-rastreabilidade) | Conhecido |
| Necessidades contextuais | Contextos, evidências, decisões, Resultados e handoffs semanticamente definidos por M-001, M-002 e M-003 | Conhecido |

M-004 preserva referências e informações relevantes do percurso e torna possível recuperá-las por finalidade, mantendo sua proveniência e relações. A capacidade não cria uma verdade única de domínio: a fonte que produz uma informação continua responsável por seu significado e por sua visão atual. M-004 oferece às demais capacidades contexto suficiente, relacionado e explicável, por conteúdo proporcional ou por referências recuperáveis.

### Fronteiras e contratos com as capacidades relacionadas

Está dentro de M-004:

* preservar referências de origem, informações contextuais, evidências, decisões, Resultados do Processo, vínculos, handoffs, retornos e resultados produzidos quando forem materialmente relevantes;
* recuperar uma visão contextual proporcional à finalidade declarada e correlacionar partes do percurso que já possuam relação conhecida;
* manter identificáveis proveniência, temporalidade, classificação, relação e condição de atualidade quando necessárias para explicar ou usar uma informação; e
* sinalizar contexto insuficiente, referência indisponível, contradição, ambiguidade ou informação superada sem fabricar uma conclusão.

Está fora de M-004:

* definir ou alterar estado válido, transição, Resultado do Processo, compromisso, Direção ou semântica de entidade de outra capacidade;
* decidir próximo trabalho, selecionar Executor, despachar, replanejar ou acompanhar o fluxo — responsabilidades de M-003;
* tomar decisão humana, substituir o Owner ou inventar identidade, autenticação, autorização, RBAC ou ACL;
* formar ou auditar Necessidade, Projeto ou Módulo; verificar substantivamente resultado de software; declarar `COMPROMISSO_ATENDIDO` ou `COMPROMISSO_NAO_ATENDIDO`; e
* definir Entrega de Valor, Item de Trabalho, tarefa, tecnologia física, armazenamento, API, mecanismo de busca, banco, Event Sourcing, CQRS, grafo, vetor, log append-only ou barramento de eventos.

| Relação | Contrato lógico de fronteira |
| --- | --- |
| M-001 ↔ M-004 | M-001 continua fonte da semântica da Necessidade, seu estado, histórico, evidências, Resultados, decisão do Owner e Compromisso. M-004 preserva e recupera as referências e o contexto que M-001 indicar, sem produzir `APROVADO`, reconstruir Compromisso ou decidir transição. |
| M-002 ↔ M-004 | M-002 continua fonte de Projeto, vínculo 1:1, bootstrap, formação, auditoria, Direção e seus efeitos. M-004 preserva origem, confirmação, evidências, decisão, Resultado e Direção como informações correlacionáveis, sem materializar Projeto, validar unicidade ou aprovar Direção. |
| M-003 ↔ M-004 | M-003 define qual contexto é necessário a preparação, handoff, retorno e próximo avanço; M-004 torna esse contexto preservável e recuperável. M-004 não escolhe trabalho, Executor, despacho ou replanejamento, e M-003 não precisa tornar-se repositório transversal. |
| M-005 ↔ M-004 | M-004 torna recuperável a cadeia resultado → percurso → Projeto → Compromisso → Necessidade quando tais referências existirem. M-005 decide a verificabilidade e a conclusão substantiva; M-004 não a antecipa. |

### Modelo lógico de contexto, proveniência e correlação

Os conceitos abaixo descrevem propriedades lógicas. Não formam uma entidade monolítica denominada “Contexto”, esquema universal de identificadores ou modelo físico de persistência.

| Conceito lógico | Papel em M-004 | Proporcionalidade e distinção |
| --- | --- | --- |
| Referência de origem | Aponta para a entidade, trabalho, fonte ou artefato de onde veio a informação. | Obrigatória quando a informação afetar explicação, uso ou efeito; não exige duplicar a fonte. |
| Informação contextual | Conteúdo ou resumo necessário para uma finalidade. | Pode ser referência, resumo ou materialização conforme a finalidade e recuperabilidade. Não é automaticamente estado autoritativo. |
| Evidência | Fonte que sustenta afirmação, parecer, transição, decisão ou resultado. | Identificável e recuperável; distinta da afirmação que sustenta, da decisão e do Resultado. Pode ser externa e ser representada apenas por referência. |
| Decisão humana | Ato material do Owner ou de outro Executor humano quando pertinente. | Preserva autoria identificável, contexto, evidências relevantes e efeito informado; M-004 não a toma nem redefine seu efeito. |
| Resultado do Processo | Conclusão produzida pelo Ator competente segundo catálogo da entidade. | Preserva identificação do Resultado, Ator, contexto, evidências e efeito aplicável; não o reinterpreta como status. |
| Vínculo e relação causal | Conecta origem, dependência, decisão, transição, evidência, handoff, retorno ou resultado. | Só é registrado quando conhecido ou proposto de modo identificado; não infere causalidade sem sustentação. |
| Histórico | Registro de observações, alterações e relações anteriores relevantes. | Explica o percurso, mas não substitui visão atual. Pode conter informação superada. |
| Estado observado | Referência à visão atual fornecida pela fonte responsável em determinado momento. | Não se torna estado autoritativo em M-004; requer consulta à fonte novamente se não houver garantia de atualidade. |
| Contexto de execução, handoff e retorno | Conjunto proporcional de referências e conteúdos para executar, devolver ou auditar um avanço. | É orientado por finalidade; não cria trabalho futuro nem decide seu avanço. |
| Resultado produzido | Referência neutra a resultado de execução ou de software quando existir. | Não é Resultado do Processo e não recebe semântica de vertical futura. |
| Autoria, Ator, Executor e momento | Identificam quem produziu informação e em que situação temporal, quando pertinentes. | Ator, Executor e autoria permanecem conceitos distintos; não impõem mecanismo de identidade. |
| Classificação epistêmica | Marca informação como conhecida, inferida, proposta ou desconhecida. | Preservada quando material para evitar que hipótese seja tratada como fato. |

Para cada informação preservada, M-004 deve manter somente os atributos necessários para responder com segurança: de onde veio, qual entidade ou trabalho a originou, quem a produziu quando relevante, em qual situação e momento foi registrada, sua classificação e a evidência que a sustenta. Uma referência simples de fonte basta quando o conteúdo for recuperável nela; uma cópia ou resumo só é justificável se necessário à continuidade, ao handoff ou à preservação de explicação. A ausência de atributo material deve ser explícita como lacuna, não preenchida por inferência silenciosa.

### Estado atual, histórico e informação superada

**Proposto.** M-004 deve preservar separadamente a referência à visão atual da fonte e o histórico que explica como o percurso chegou a ela. Uma observação histórica pode registrar estado, transição ou decisão anteriores, mas não altera por si só o estado vigente. A recuperação deve distinguir: visão atual solicitada à fonte responsável; eventos, alterações ou versões anteriores; decisão ou Resultado que explicou efeito; evidência relacionada; e informação substituída, corrigida, obsoleta ou contraditória.

| Situação | Tratamento lógico |
| --- | --- |
| Dado corrigido ou decisão substituída | Preservar referência ao anterior e à correção/substituição, com a relação conhecida. A informação anterior não é apresentada como vigente. |
| Informação obsoleta | Mantê-la explicável quando contribuiu para o percurso, sinalizando que não deve orientar a ação atual. |
| Evidências contraditórias | Manter as referências e a contradição identificável; não selecionar verdade, alterar estado ou ocultar a divergência. O consumidor responsável decide o tratamento. |
| Referência quebrada ou origem indisponível | Informar recuperação parcial e a origem ausente; não reconstruir conteúdo sem evidência. |
| Duplicação | Correlacionar a repetição à mesma referência quando identificável; se não for possível, preservar a ambiguidade para tratamento competente. |
| Contexto incompleto ou excessivo | Informar insuficiência para a finalidade ou restringir a resposta ao conjunto justificadamente relevante, oferecendo referências adicionais em vez de despejo completo. |

### Recuperação de contexto proporcional

**Proposto.** Um consumidor solicita contexto declarando sua finalidade, referência de origem ou trabalho, relações relevantes conhecidas e, quando necessário, momento ou visão desejada. M-004 devolve um conjunto suficiente para essa finalidade: conteúdo estritamente necessário, referências à fonte responsável, evidências, decisões, Resultados, dependências, restrições, histórico explicativo e alertas de atualidade somente quando forem pertinentes.

As finalidades podem incluir formar, auditar, qualificar, decidir, coordenar, executar ou verificar; elas não criam novos Atores, entidades ou fluxos. Uma solicitação sem origem ou finalidade definida não deve produzir um despejo indiscriminado: M-004 deve requerer referência suficiente ou devolver apenas a lacuna e as referências disponíveis. Informação histórica não vinculada à finalidade fica fora da visão inicial, mas pode permanecer recuperável por referência.

Para o handoff definido por M-003, M-004 deve tornar recuperáveis origem, objetivo, contexto e evidências relevantes, decisões e pendências, dependências e restrições, histórico necessário, resultado esperado e referências adicionais. M-003 continua definindo a necessidade operacional e a elegibilidade do avanço; M-004 somente satisfaz a recuperação contextual. Para M-005, a visão deve permitir localizar, quando existente, a cadeia entre resultado, percurso, Projeto, Compromisso e Necessidade, sem concluir a verificação.

### Causalidade, integridade e idempotência

**Proposto.** Quando necessário para explicar o percurso, as relações devem permitir registrar que decisão causou transição, Resultado habilitou avanço, evidência sustentou parecer, retorno desbloqueou trabalho, dependência impediu avanço, trabalho produziu resultado ou resultado originou verificação. A capacidade exige correlação e explicabilidade dessas relações, não um motor universal de regras causais.

| Operação lógica | Efeito exigido |
| --- | --- |
| Registrar novamente a mesma evidência identificada | Não criar evidência logicamente nova nem apagar a referência original; relacionar a repetição à existente quando possível. |
| Receber o mesmo vínculo, correlação ou decisão já identificada | Preservar um único efeito lógico e manter a relação recuperável, sem duplicar causalidade ou alterar fonte. |
| Repetir recuperação de contexto | Com mesma finalidade e visão relevante, devolver contexto equivalente ou apontar explicitamente a informação que mudou. |
| Retomar após falha de preservação ou recuperação | Não presumir informação não confirmada; expor o conjunto recuperado, ausências e referências pendentes. |
| Receber relação ambígua | Não escolher correlação arbitrariamente; registrar a ambiguidade e impedir que ela seja apresentada como explicação certa. |

Identidade e correlação devem distinguir código humano, identificador técnico, referência de entidade, referência neutra de trabalho, evidência e handoff. O formato, a unicidade física e o mecanismo universal de tais referências são desconhecidos; M-004 exige apenas referências estáveis o bastante para não confundir elementos nem aplicar repetição ao elemento errado.

### Segurança, falhas, direção de realização e lacunas

**Conhecido como requisito; mecanismo desconhecido.** A capacidade precisa preservar autoria identificável quando ela for material, integridade de relações e acesso proporcional ao contexto solicitado. Visibilidade de informação não transfere autoridade para decidir, alterar estado ou produzir Resultado. Não há requisitos normativos suficientes sobre confidencialidade, privacidade, segregação, autenticação, autorização ou retenção para definir controles físicos.

**Proposto.** Operações materialmente relevantes de preservação e recuperação devem ser explicáveis por origem, relação e correlação recuperáveis. Falhas de preservação ou recuperação precisam ser detectáveis na futura realização, ao menos como referência ausente, conteúdo incompleto, contradição, ambiguidade ou atualidade não confirmada. O mecanismo para tanto permanece aberto.

| Item | Classificação | Impacto e tratamento |
| --- | --- | --- |
| Persistência, formato de referências, consulta, busca e indexação físicos | Desconhecido legítimo | Não bloqueiam a formação: a realização deve satisfazer proveniência, recuperação proporcional, integridade e idempotência sem tecnologia pré-escolhida. |
| Armazenamento de evidência externa, versionamento e retenção | Desconhecido legítimo | A fonte pode ser referenciada; preservação anterior necessária para explicação não deve ser apagada silenciosamente. Prazo e meio permanecem futuros. |
| Consistência, concorrência, escala, cache e correlação físicos | Desconhecido legítimo | A semântica exige não confundir repetição, vínculo ou visão atual; os mecanismos concretos serão decisão de realização. |
| Autenticação, autorização, confidencialidade e privacidade | Desconhecido legítimo | Autoria e autoridade conceitualmente distintas são necessárias; controles concretos dependem de requisitos ainda ausentes. |
| Observabilidade física | Desconhecido legítimo | A auditabilidade lógica não exige logs, métricas, tracing, dashboards ou tecnologia específica. |
| Fonte de verdade indisponível | Risco conhecido | A recuperação deve declarar a lacuna e não converter cópia histórica em estado atual autoritativo. |
| Contexto insuficiente, excessivo ou contraditório | Risco conhecido | A resposta deve expor a condição, limitar-se à finalidade e devolver referências adicionais ou pendências, sem inventar reconciliação. |
| Fronteira de M-004 | Conhecido | Não há problema estrutural ou necessidade de retorno à delimitação. |

### Suficiência e handoff para Auditoria

A realização posterior pode decompor preservação, recuperação e rastreabilidade sem redesenhar a capacidade: estão definidos o papel não autoritativo de M-004, conceitos lógicos mínimos, proveniência proporcional, separação entre estado e histórico, relações causais, recuperação orientada por finalidade, handoff, idempotência e tratamento de inconsistências. Nenhuma tecnologia física, vertical futura, entidade de trabalho, status, ciclo, Resultado do Processo ou decisão humana foi definida por esta formação.

O handoff foi avaliado pelo **Auditor do Módulo** com as evidências, classificações, riscos e lacunas acima.

## Resultado do Processo — Auditoria independente do Módulo

`FORMACAO_SUFICIENTE`

### Parecer independente

A formação técnica de M-004 é suficiente para orientar realização posterior sem redesenhar sua capacidade ou fronteira. O parecer foi produzido a partir da Direção aprovada de P-001, do item canônico M-004 no Mapa de Módulos, do Compromisso da N-001 e dos registros de M-001 a M-005, preservando a independência em relação à formação avaliada.

O núcleo invariável está presente: origem e Direção consumida identificáveis; capacidade, responsabilidade, valor habilitado e fronteiras explícitos; evidências e classificações epistêmicas; relações e dependências com os demais Módulos; direção de realização lógica; e riscos, lacunas e desconhecidos legítimos registrados. Não há sobreposição estrutural nem inadequação de fronteira que justifique retorno ao Especialista em Delimitação de Módulos.

M-004 permanece uma capacidade transversal de preservação, recuperação e correlação. A Especificação distingue a informação produzida pela fonte responsável de sua referência, cópia ou representação preservada; separa estado observado, visão atual da fonte e histórico; e mantém evidência, decisão, Resultado do Processo, resultado produzido e relação causal como conceitos distintos. Assim, um registro histórico de M-004 não passa a valer como estado vigente de Necessidade, Projeto ou trabalho, e M-004 não interpreta nem substitui a semântica de M-001, M-002, M-003 ou M-005.

O teste central da N-001 é atendido no nível da Especificação. A recuperação é solicitada por finalidade, origem, relações e, quando material, visão ou momento; devolve somente o contexto suficiente, suas fontes, evidências, decisões, Resultados, restrições, dependências e histórico explicativo pertinentes. Para handoffs, são recuperáveis origem, objetivo, contexto e evidências relevantes, decisões e pendências, dependências, restrições, histórico necessário, resultado esperado e referências adicionais. M-003 mantém a determinação de elegibilidade, Ator, Skill, Executor, despacho e próximo avanço.

Proveniência, identidade e correlação são proporcionais: distinguem identificador técnico, código humano, referências de entidade, trabalho, evidência e handoff, e preservam autoria, Ator, Executor, momento, classificação e sustentação quando necessários. A Especificação trata informação corrigida, substituída, obsoleta, incompleta ou contraditória, origem indisponível, referência quebrada, duplicação, ambiguidade e recuperação parcial sem inventar contexto, escolher arbitrariamente uma verdade ou apagar silenciosamente o histórico material. Também define efeitos lógicos idempotentes para repetição de evidência, vínculo, decisão, correlação e recuperação.

As relações críticas estão preservadas: M-001 conserva a semântica da Necessidade e do Compromisso; M-002, do Projeto, vínculo 1:1 e Direção; M-003, da coordenação e do handoff; e M-005, da verificação substantiva do resultado. M-004 fornece a cadeia recuperável entre resultado, percurso, Projeto, Compromisso e Necessidade quando as referências existirem, sem declarar atendimento do compromisso. Não foram criados Entrega de Valor, Item de Trabalho, tarefa, status ou Resultados de verticais futuras.

Persistência, formato de referências, busca, indexação, retenção, versionamento, consistência, concorrência, escala, cache, autenticação, autorização, confidencialidade, privacidade e observabilidade físicos permanecem desconhecidos legítimos. A ausência dessas escolhas não impede a aprovação porque os contratos lógicos de preservação, integridade, acesso proporcional, recuperação, atualidade e idempotência já orientam a realização posterior sem impor tecnologia.

Não foram encontrados problemas de formação nem de delimitação. M-004 transiciona de `EM_FORMACAO` para `FORMADO`, e sua Especificação Técnica fica aprovada e disponível para consumo posterior. Esta auditoria não cria continuação operacional, Entrega de Valor, Item de Trabalho, tarefa, tecnologia física ou autoridade de domínio adicional.
