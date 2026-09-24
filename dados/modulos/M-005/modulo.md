# M-005 — Verificação do Resultado de Software

## Identificação

| Campo | Valor |
| --- | --- |
| Identificador técnico | `1b439e85-01b1-4bff-8ef8-e89e36c652f7` |
| Código | `M-005` |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) |
| Status | `FORMADO` |

## Delimitação inicial

* **Item canônico:** [M-005 no Mapa de Módulos do Projeto](../../projetos/P-001/mapa-de-modulos.md#m-005--verificação-do-resultado-de-software).
* **Capacidade:** demonstrar que o resultado de software da jornada limitada é verificável e relacioná-lo à Necessidade de origem.
* **Responsabilidade:** definir e registrar evidência proporcional de verificabilidade e manter seu vínculo com a N-001.
* **Dentro da fronteira:** evidência de verificabilidade e relação do resultado com a Necessidade de origem.
* **Fora da fronteira:** implementar software, conduzir a execução, aprovar formação de outras entidades e preservar o contexto geral do percurso.
* **Relações relevantes:** recebe o percurso de M-003 e a rastreabilidade de M-004; é orientado pela Direção de M-002.

## Handoff

A Auditoria do Módulo aprovou a formação técnica. A Especificação Técnica abaixo está disponível para consumo posterior. A continuação operacional não é definida nesta vertical; portanto, não há próximo Ator operacional elegível para M-005.

## Formação técnica

### Compreensão e refinamento da capacidade e fronteira

**Conhecido.** M-005 existe para verificar substantivamente um resultado de software disponibilizado pela jornada, produzir evidências proporcionais e explicar sua relação com a N-001. Seu resultado habilitado é uma conclusão técnica explicável sobre os critérios que puderam, ou não, ser demonstrados — não implementação, aceite humano, conclusão do Projeto nem atendimento da Necessidade.

**Inferido do Compromisso da N-001 e da Direção do P-001.** Para demonstrar que a primeira jornada chega a software verificável, é necessário reconhecer qual resultado é observado, de qual percurso veio, quais critérios decorrem legitimamente de sua origem e quais fatos sustentam a conclusão. A simples declaração de que um trabalho está pronto não demonstra seu comportamento nem satisfaz o Compromisso.

**Proposto.** M-005 define os contratos lógicos de critério, evidência, conclusão, atualidade e retorno de divergência. M-003 disponibiliza o percurso, o resultado informado, seus handoffs e evidências de execução; M-004 preserva e recupera a proveniência e as referências necessárias. M-005 não se torna coordenador do retrabalho, repositório transversal ou fonte de verdade da N-001, P-001 ou Direção.

**Verificação de fronteira.** Não há evidência de sobreposição estrutural que exija retorno ao Especialista em Delimitação de Módulos. A verificação técnica do resultado é distinta da implementação, da coordenação e da preservação transversal. Há, contudo, lacuna normativa sobre como uma conclusão técnica de M-005 é consumida pelo Verificador Agregado do Projeto e sobre os efeitos operacionais da verificação agregada; ela não altera a fronteira atual e está registrada adiante.

### Descoberta técnica

| Evidência | Classificação | Impacto no desenho |
| --- | --- | --- |
| [Compromisso e critério de atendimento da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) | Conhecido | Exigem jornada completa até resultado verificável, rastreabilidade proporcional e o teste de delegação por instrução simples, sem converter cada frase em teste automático. |
| [Direção do P-001](../../projetos/P-001/projeto.md#direção-do-projeto) e [M-005 no Mapa](../../projetos/P-001/mapa-de-modulos.md#m-005--verificação-do-resultado-de-software) | Conhecido | Sustentam uma primeira jornada limitada, rastreável, orientada por estado, evidências e responsabilidades especializadas. |
| [Especificação de M-002](../M-002/modulo.md#especificação-técnica-do-módulo) | Conhecido | Disponibiliza a Direção aprovada; M-005 pode consumi-la, mas não a altera, não a audita novamente nem conclui o Projeto. |
| [Especificação de M-003](../M-003/modulo.md#especificação-técnica-do-módulo) | Conhecido | Define o handoff lógico, o retorno e a disponibilização de percurso, resultado informado e evidências de execução; M-003 não verifica o software. |
| [Especificação de M-004](../M-004/modulo.md#especificação-técnica-do-módulo) | Conhecido | Permite recuperar origem, contexto, evidências, vínculos e atualidade sem que M-005 absorva histórico, busca ou armazenamento transversal. |
| Documentação de Projeto e [Skill de Verificação Agregada](../../../.agents/skills/projeto/verificacao-agregada-do-projeto/SKILL.md) | Conhecido | Reserva `COMPROMISSO_ATENDIDO` e `COMPROMISSO_NAO_ATENDIDO` ao Verificador Agregado, em camada futura, com efeitos operacionais ainda indefinidos. |
| Inventário de arquivos versionados (`git ls-files`) | Conhecido | O produto versionado contém documentação, Skills e registros Markdown; não há código executável, testes, automação de CI, ambiente executável ou evidência real de um resultado de software para verificar. |

Não há resultado real de software, procedimento executado, teste, ambiente ou evidência de comportamento a declarar como existente. A ausência não é uma falha do resultado inexistente: é limite da descoberta desta formação e impede apenas produzir uma conclusão concreta agora, não a definição da capacidade.

## Especificação Técnica do Módulo

Esta Especificação Técnica está **aprovada** por `FORMACAO_SUFICIENTE`. Ela define o necessário para realização posterior verificar um resultado de software sem redesenhar a capacidade e sem criar uma vertical futura.

### Origem, capacidade e resultado habilitado

| Elemento | Referência | Classificação |
| --- | --- | --- |
| Projeto de origem | [P-001 — Jornada Autônoma do NAAMIVE](../../projetos/P-001/projeto.md) | Conhecido |
| Direção consumida | [Direção do Projeto](../../projetos/P-001/projeto.md#direção-do-projeto), aprovada por `FORMACAO_SUFICIENTE` | Conhecido |
| Item de delimitação | [M-005 no Mapa de Módulos](../../projetos/P-001/mapa-de-modulos.md#m-005--verificação-do-resultado-de-software) | Conhecido |
| Compromisso de origem | [Compromisso da N-001](../../necessidades/N-001/necessidade.md#compromisso-da-necessidade) | Conhecido |
| Percurso e resultado informado | Handoff e retorno definidos por M-003 | Proposto |
| Proveniência e recuperação | Contexto e correlações definidos por M-004 | Proposto |

M-005 habilita uma demonstração técnica, proporcional e rastreável do que foi observado em um resultado de software e de como isso se relaciona aos critérios derivados da origem correta. Ele produz informação útil para a coordenação posterior quando houver divergência, mas não corrige o resultado, não escolhe Executor, não despacha retrabalho e não determina o próximo avanço.

### Fronteiras e relações

Está dentro de M-005:

* receber resultado disponível para verificação, o percurso que o produziu e referências de contexto pertinentes;
* derivar critérios verificáveis de negócio e restrições a partir do Compromisso, da Direção e do percurso aplicável;
* observar ou registrar evidências proporcionais, avaliar sua suficiência e produzir conclusão técnica explicitamente limitada; e
* relacionar resultado, evidência, critério, origem do critério, percurso, P-001, Compromisso e N-001, por referências recuperáveis.

Está fora de M-005:

* implementar, corrigir, empacotar, publicar ou implantar software;
* coordenar execução, criar trabalho futuro, selecionar Executor, definir prioridade ou reabrir trabalho anterior;
* preservar todo o contexto, oferecer busca geral ou substituir as fontes responsáveis por estado, histórico, Direção, Compromisso ou decisão;
* produzir `COMPROMISSO_ATENDIDO`, `COMPROMISSO_NAO_ATENDIDO`, `FORMACAO_SUFICIENTE`, decisão humana ou mudança de status; e
* concluir P-001, alterar N-001 para `ATENDIDA` ou definir Entrega de Valor, Item de Trabalho, tarefa, seus ciclos ou Resultados.

| Relação | Contrato de fronteira |
| --- | --- |
| M-002 → M-005 | A Direção aprovada orienta intenção, fronteiras, restrições e critérios derivados. M-005 não a modifica, não reabre a formação do Projeto e não conclui P-001. |
| M-003 → M-005 | M-003 fornece, quando houver, resultado informado, percurso, handoff, evidências de execução e contexto operacional. M-005 devolve somente informação verificável sobre divergência, insuficiência ou impossibilidade; M-003 decide qualquer avanço posterior. |
| M-004 → M-005 | M-004 recupera proveniência, relações, evidências e atualidade. M-005 define a semântica específica de verificação, sem se tornar histórico central, armazenamento ou mecanismo geral de busca. |
| N-001 | A N-001 continua fonte de verdade do Compromisso e do critério de atendimento. M-005 verifica fatos técnicos relacionados, mas não declara a Necessidade atendida. |
| Verificador Agregado do Projeto | M-005 pode produzir evidências e conclusões técnicas que se tornem insumo desse Ator. Não se confunde com ele: o Verificador compara o resultado agregado ao Compromisso e é o único Ator previsto para os Resultados formais `COMPROMISSO_ATENDIDO` ou `COMPROMISSO_NAO_ATENDIDO`. |

### Objeto de verificação e origem dos critérios

**Proposto.** Para M-005, resultado de software é a manifestação identificável do que foi produzido por um percurso e disponibilizada para observação contra um critério. A identificação deve distinguir suficientemente o resultado e, quando material, sua revisão ou versão, sem pressupor que ele seja release, build, implantação, commit, binário, endpoint ou interface. Sua forma física permanece desconhecida até evidência de realização.

O critério não nasce em M-005. A derivação deve preservar esta cadeia, usando somente o trecho relevante ao resultado:

```text
N-001 e seu Compromisso
→ Direção aprovada de P-001
→ fronteira de M-005 e percurso coordenado
→ resultado de software identificável
→ critério verificável proporcional
```

| Tipo de informação de origem | Tratamento no critério |
| --- | --- |
| Critério de negócio | Explicita qual resultado ou comportamento contribui para o Compromisso; pode exigir decomposição proporcional para ser observável. |
| Restrição | Entra como condição verificável somente quando incidir materialmente sobre o resultado observado. |
| Evidência técnica | Sustenta a observação; não redefine o objetivo nem se torna critério por si só. |
| Condição verificável | Declara comportamento esperado, modo de observação e condição de satisfação ou divergência. |
| Aspecto qualitativo | É relacionado à sua origem e tratado como não demonstrável tecnicamente quando não houver condição observável suficiente. |

Um critério verificável deve, quando aplicável, identificar sua origem, descrever resultado ou comportamento esperado, permitir observação ou evidência, declarar a condição que demonstra ou diverge e expor limitações. A Especificação não cria linguagem específica, lista universal de testes nem transforma todo texto da N-001 em caso de teste.

### Evidência, conclusão e verificação parcial

**Proposto.** Evidência de verificação é uma informação identificável que sustenta uma observação sobre um objeto contra um critério. Conforme for material, ela informa origem, objeto observado, procedimento ou método, resultado observado, momento ou revisão, relação com o critério, limitações e Executor ou verificador. Nem todo atributo é obrigatório: a suficiência é proporcional ao que a evidência pretende demonstrar.

Evidência não é conclusão. A conclusão é a interpretação técnica explícita e limitada que correlaciona critérios e evidências; deve indicar quais informações a sustentam, quais permanecem ausentes ou contraditórias e sobre qual resultado ela vale. São categorias internas possíveis, e não novos Resultados do Processo: `CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `VERIFICAÇÃO_IMPOSSÍVEL` e `DIVERGÊNCIA_ENCONTRADA`.

| Situação | Conclusão técnica proporcional |
| --- | --- |
| Parte do resultado ou dos critérios é observável | Concluir somente sobre a parte demonstrada e identificar o restante como não avaliado. |
| Critério qualitativo ou não operacionalizável | Registrar origem, motivo e limite; não convertê-lo em aprovação automática nem em decisão humana sem necessidade material. |
| Evidência ausente, resultado ou ambiente indisponível | Registrar `EVIDÊNCIA_INSUFICIENTE` ou `VERIFICAÇÃO_IMPOSSÍVEL`, conforme a causa conhecida, sem presumir conformidade. |
| Evidências conflitantes | Preservar as referências e a contradição; não escolher arbitrariamente uma conclusão favorável. |
| Resultado incompleto ou divergente | Relacionar a observação ao critério e registrar `CRITÉRIO_NÃO_DEMONSTRADO` ou `DIVERGÊNCIA_ENCONTRADA`, conforme a sustentação. |

Uma decisão humana só é pendência quando a ambiguidade for material e não puder ser resolvida por evidência ou pela origem do critério. M-005 apresenta a questão e seu contexto, sem decidir pelo Owner.

### Rastreabilidade, explicabilidade e atualidade

M-005 deve permitir recuperar proporcionalmente, por referência em vez de duplicação integral:

```text
resultado observado
→ evidência
→ critério
→ origem do critério
→ percurso
→ P-001
→ Compromisso
→ N-001
```

**Proposto.** Uma verificação material deve ser reproduzível quando isso for proporcionalmente viável ou, no mínimo, explicável. Para tanto, preserva objeto ou revisão identificável, procedimento conhecido, entrada relevante, ambiente quando material, saída observada e limitações. Reprodutibilidade perfeita não é requisito universal nem autoriza inventar ambiente, ferramenta ou automação.

**Proposto.** Receber novamente a mesma evidência identificável, repetir a mesma observação ou receber retorno duplicado não deve criar conclusão conflitante nem ocultar a referência anterior. Nova conclusão exige nova evidência identificável, mudança material no objeto, no critério ou na interpretação explicitamente justificada. O mecanismo físico de identidade, deduplicação e concorrência permanece desconhecido.

**Proposto.** Uma nova versão do resultado, correção posterior, critério legitimamente alterado ou evidência nova não apaga a verificação anterior: ela continua explicável no contexto em que ocorreu, mas não é apresentada como avaliação vigente do resultado posterior. M-004 deve preservar as relações de substituição, atualidade, contradição ou obsolescência quando forem fornecidas; M-005 avalia o efeito delas na conclusão técnica.

### Falha de verificação, segurança e limites técnicos

Quando resultado, critério ou evidência não permitirem demonstrar o esperado, M-005 deve registrar a evidência disponível, a divergência, insuficiência ou impossibilidade, o critério relacionado, as limitações e as referências de contexto necessárias para consumo posterior. A informação retorna a M-003 ou à futura coordenação sem definir que trabalho será criado, por quem será feito ou quando ocorrerá.

Não há requisito sustentado para cobertura mínima, tipos específicos de teste, desempenho, segurança, acessibilidade, qualidade de código, SLA, CI/CD, ambiente de homologação ou ferramenta. Esses aspectos só devem ser incluídos em uma verificação quando derivarem de critério, restrição, risco material ou evidência concreta. Também permanecem desconhecidos e não selecionados: mecanismo de execução, ambiente, automação, armazenamento e retenção de evidências, autenticação, autorização, versionamento físico e observabilidade.

### Relação com verificação agregada, conclusão e atendimento

**Conhecido.** A documentação de Projeto define o Verificador Agregado do Projeto como Ator futuro que compara o resultado agregado ao Compromisso e produz `COMPROMISSO_ATENDIDO` ou `COMPROMISSO_NAO_ATENDIDO`. Assim, M-005 suporta tecnicamente esse Ator e pode fornecer parte das evidências, mas não coincide integralmente com sua responsabilidade: a verificabilidade técnica de um resultado é condição ou insumo possível; a verificação agregada avalia o conjunto contra o Compromisso completo.

**Lacuna normativa conhecida.** Não existe ponto de entrada operacional para o Verificador Agregado, contrato normativo que determine como ele consome a conclusão técnica de M-005 nem efeito operacional definido para seus Resultados. `COMPROMISSO_ATENDIDO` não transiciona hoje P-001 para `CONCLUIDO`; este status segue terminal conceitual futuro sem caminho normativo. Pela vertical Necessidade, somente Projeto concluído com sucesso leva N-001 de `EM_PROJETO` a `ATENDIDA`; como esse caminho de conclusão também não está definido, M-005 não pode produzir tal efeito.

Essa lacuna é de processo/norma posterior, não problema de delimitação: as responsabilidades permanecem distinguíveis e a realização de M-005 continua possível como capacidade técnica de evidenciar e concluir sobre critérios.

### Riscos, lacunas e handoff para Auditoria

| Item | Classificação | Tratamento |
| --- | --- | --- |
| Não há resultado, código, teste, CI ou ambiente executável no repositório versionado | Conhecido | Não se declara evidência inexistente; a Especificação define o contrato para quando houver resultado observável. |
| Forma física do resultado, método de observação e ferramentas | Desconhecido legítimo | Devem ser decididos por evidência e proporcionalidade durante a realização, sem lista ritual de testes. |
| Critérios qualitativos ou ambíguos | Lacuna potencial de origem | M-005 expõe o limite e solicita esclarecimento somente se material; não inventa mensuração nem decide pelo Owner. |
| Evidência, resultado ou ambiente indisponível; conflito de evidências | Risco conhecido | Preservar incerteza, causa e referências; não concluir atendimento por ausência de contraprova. |
| Consumo pela verificação agregada e efeitos em `CONCLUIDO`/`ATENDIDA` | Lacuna normativa posterior | Registrar e entregar à futura camada de continuação do Projeto; não bloqueia a formação nem autoriza novo Resultado ou transição. |
| Persistência, retenção, autenticação, versão, concorrência e observabilidade físicos | Desconhecido legítimo | A realização deve satisfazer identificação, explicabilidade, atualidade e não conflito lógico; mecanismos permanecem futuros. |

A formação entregou ao **Auditor do Módulo** as evidências consultadas, a Especificação, suas classificações e lacunas.

## Resultado do Processo — Auditoria independente do Módulo

`FORMACAO_SUFICIENTE`

### Parecer independente

A formação técnica de M-005 é suficiente para orientar a realização posterior sem redesenhar sua capacidade ou fronteira. O núcleo invariável está presente: origem no P-001, Direção aprovada, item canônico do Mapa, Compromisso da N-001, capacidade e fronteiras explícitas, evidências classificadas, relações com M-002, M-003 e M-004, contratos lógicos, riscos, lacunas e desconhecidos legítimos.

O teste central de fronteira foi satisfeito. M-005 registra e interpreta tecnicamente observações, evidências, critérios, limitações e divergências; não implementa nem corrige software, não coordena retorno ou retrabalho, não seleciona Executor e não preserva contexto como fonte transversal. M-003 permanece responsável por qualquer avanço posterior, e M-004 por preservar e recuperar a proveniência e as relações necessárias.

A Especificação distingue resultado observado, critério verificável, evidência, conclusão técnica interna, Resultado do Processo, status e decisão humana. As categorias `CRITÉRIO_DEMONSTRADO`, `CRITÉRIO_NÃO_DEMONSTRADO`, `EVIDÊNCIA_INSUFICIENTE`, `VERIFICAÇÃO_IMPOSSÍVEL` e `DIVERGÊNCIA_ENCONTRADA` são conclusões internas, não Resultados do Processo. Ela não presume sucesso pela ausência de contraprova, limita conclusões ao alcance das evidências e preserva incerteza, conflito, indisponibilidade, parcialidade, repetição e superação de resultado ou evidência.

A cadeia de critérios e rastreabilidade é suficiente e proporcional: resultado observado → evidência → critério → origem do critério → percurso → P-001 → Compromisso → N-001. O objeto de verificação possui identificação lógica, inclusive de revisão quando material, sem impor release, build, commit, implantação, endpoint, interface ou ferramenta. Critérios exigem origem, expectativa, observação possível, condição de satisfação ou divergência e limitações quando aplicáveis; evidências permanecem distintas da conclusão e são explicáveis sem exigir automação ou reprodutibilidade perfeita.

Não há resultado real de software, código executável, testes, CI, ambiente ou evidência de comportamento no repositório. Isso impede uma conclusão concreta sobre software, mas não a formação da capacidade: seus contratos lógicos tornam possível selecionar método, ambiente, automação, retenção, versionamento e observabilidade proporcionalmente durante a realização, sem tecnologia predefinida ou stack de testes inventada.

A lacuna sobre o consumo pela Verificação Agregada e os efeitos de `COMPROMISSO_ATENDIDO` e `COMPROMISSO_NAO_ATENDIDO` foi confirmada nas fontes de Projeto. O Verificador Agregado do Projeto, em camada ainda sem acionamento operacional, compara o resultado agregado ao Compromisso e é o único Ator previsto para esses Resultados. M-005 pode fornecer evidências e conclusões técnicas, mas não os produz. Tampouco há caminho normativo atual de `FORMADO` a `CONCLUIDO` para P-001; consequentemente, embora Projeto concluído com sucesso leve N-001 a `ATENDIDA`, o caminho até essa conclusão ainda não foi definido. Essas são lacunas normativas externas, não problemas de delimitação ou insuficiências da formação de M-005, e não bloqueiam sua capacidade de verificar tecnicamente um resultado identificável.

Não foram identificados problemas de formação ou delimitação que exijam retorno. A Especificação Técnica fica aprovada e M-005 transiciona de `EM_FORMACAO` para `FORMADO`. Esta auditoria não cria continuação operacional, Entrega de Valor, Item de Trabalho, tarefa, implementação, Resultado de compromisso, mudança no P-001 ou mudança na N-001.
