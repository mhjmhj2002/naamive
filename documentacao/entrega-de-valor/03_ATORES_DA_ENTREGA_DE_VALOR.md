# Atores da Entrega de Valor

Este documento é a fonte normativa dos Atores e das responsabilidades da vertical Entrega de Valor. O conceito transversal de Ator, Executor e Skill está em [Conceito de Ator](../atores/01_CONCEITO_DE_ATOR.md).

## Propósito

Os Atores desta vertical mantêm separadas a delimitação da evolução de valor, sua formação, a auditoria da formação e a verificação do software integrado. A especialização impede que trabalho técnico, decisão humana, avaliação independente e execução sejam confundidos.

```text
Ator
→ responsabilidade especializada

Executor
→ entidade concreta que exerce o Ator em uma execução

Skill
→ capacidade operacional especializada que pode orientar um agente no exercício de um Ator agêntico
```

Ator não é Executor, e Ator não é Skill. Os quatro Atores especializados desta vertical são agênticos e possuem Skills principais materializadas, que os orientam operacionalmente sem alterar as responsabilidades definidas neste documento:

| Ator agêntico | Skill principal |
| --- | --- |
| Especialista em Delimitação de Entregas de Valor | `.agents/skills/entrega-de-valor/delimitacao-de-entregas-de-valor/SKILL.md` |
| Especialista em Formação da Entrega de Valor | `.agents/skills/entrega-de-valor/formacao-da-entrega-de-valor/SKILL.md` |
| Auditor da Entrega de Valor | `.agents/skills/entrega-de-valor/auditoria-da-entrega-de-valor/SKILL.md` |
| Verificador da Entrega de Valor | `.agents/skills/entrega-de-valor/verificacao-da-entrega-de-valor/SKILL.md` |

Não há agente genérico responsável por toda a vertical. Um mesmo Executor pode, futuramente e quando permitido, exercer Atores distintos em momentos distintos, sem fundir as respectivas responsabilidades.

## Owner

* **Natureza:** humana.
* **Executor:** usuário autenticado.

O Owner é o Ator humano transversal dotado de autoridade máxima no NAAMIVE. Na Entrega de Valor, possui competência e prerrogativa exclusiva para:

* inspecionar e homologar formalmente a evolução de software entregue, validando se o valor percebido atende à expectativa de negócio e autorizando soberanamente a conclusão da Entrega de Valor (`HOMOLOGADO_PELO_OWNER` ou `REJEITADO_PELO_OWNER`);
* tomar decisões humanas materiais não resolvíveis por evidência técnica objetiva;
* esclarecer ou determinar mudanças materiais da intenção de valor ou da fronteira de produto;
* escolher entre alternativas de negócio ou arquiteturais com impacto relevante; e
* determinar ou aprovar o encerramento excepcional antecipado da Entrega de Valor (`CANCELAMENTO_APROVADO`).

O parecer técnico emitido pelo Verificador da Entrega de Valor (`EVOLUCAO_MATERIALIZADA`) subsidia tecnicamente a decisão, mas não encerra a Entrega de Valor diretamente: a transição para `CONCLUIDA` exige a homologação e aprovação material expressa do Owner. O Owner não substitui o trabalho técnico e executivo dos Atores agênticos especialistas da vertical (Delimitador, Formador, Auditor e Verificador), nem executa diretamente codificação técnica ou elaboração de especificações.

## Especialista em Delimitação de Entregas de Valor

* **Natureza:** agêntica.
* **Executor:** agente especializado.

Sua responsabilidade é identificar e materializar Entregas de Valor coesas dentro da capacidade de um Módulo cuja formação técnica esteja aprovada. A entrada conceitual inclui o Módulo e sua Especificação Técnica aprovada, além da Direção do Projeto e do Compromisso da Necessidade recuperáveis pela cadeia de origem; Jornada e Fluxo são consultados quando disponíveis.

Este Ator avalia, entre outras questões:

* quais evoluções de valor pertencem à capacidade do Módulo;
* se a evolução é utilizável e perceptível para beneficiário identificável;
* se há uma intenção principal de valor coesa e um resultado observável inicial;
* se se trata de uma Entrega de Valor, de mais de uma evolução ou apenas de trabalho técnico;
* qual é o Módulo proprietário, quais capacidades externas são dependências e quais Jornadas ou Fluxos são impactados quando conhecidos; e
* se a fronteira é finita, coesa e não foi fragmentada por camadas técnicas.

Pode analisar a capacidade do Módulo, separar evoluções independentes, definir a fronteira inicial, identificar intenção, beneficiário e resultado observável de forma proporcional, registrar contexto de Jornada ou Fluxo e dependências relevantes, criar ou atualizar o Mapa de Entregas de Valor canônico do Módulo, atribuir identidade e código conforme o Modelo, materializar a entidade e preservar a rastreabilidade até Módulo, Projeto e Necessidade. A materialização usa exclusivamente a regra e a estrutura mínima de [Modelo de Entrega de Valor](02_MODELO_DE_ENTREGA_DE_VALOR.md#materialização-no-modelo-operacional-atual).

Não forma a Entrega de Valor em profundidade, não decide sua solução técnica detalhada, não produz a Especificação da Entrega de Valor, não audita ou verifica, não cria Work Items e não implementa software.

### Delimitação progressiva e retorno estrutural

A delimitação pode ocorrer progressivamente. Não se exige antecipar, de uma vez, todas as futuras Entregas de Valor de um Módulo. Novas Entregas de Valor podem ser identificadas durante a evolução da capacidade, desde que preservem sua fronteira e a propriedade por um único Módulo.

O artefato agregador canônico é o **Mapa de Entregas de Valor do Módulo**, definido no Modelo. Ele permite revisar o conjunto sem transformar Jornada, Fluxo, Status, Resultado do Processo, decisão humana ou evidência em nova entidade. A revisão pode corrigir a delimitação enquanto preservar a identidade existente; substituição, fusão, exclusão ou reutilização de identidade continuam fora do escopo e exigem regra normativa específica.

Quando a formação ou a auditoria identificar intenção incoesa, amplitude excessiva, fragmentação técnica, Módulo proprietário incorreto, sobreposição estrutural, fronteira inadequada ou ausência de valor perceptível, a questão retorna conceitualmente a este Ator. Os efeitos sobre identidade, dados ou posição no ciclo permanecem para definição posterior.

## Especialista em Formação da Entrega de Valor

* **Natureza:** agêntica.
* **Executor:** agente especializado.

Sua responsabilidade é transformar uma Entrega de Valor delimitada em conteúdo suficientemente formado para a futura decomposição em trabalho executável. Atua sobre uma Entrega de Valor individual e prepara tanto a evolução de produto quanto a solução técnica de alto nível, sem transferir sistematicamente essas descobertas à futura vertical Work Item.

No lado de produto, aprofunda proporcionalmente intenção de valor, beneficiário, comportamento esperado, resultado observável, Jornadas e Fluxos relacionados, fronteira, restrições de negócio, dependências relevantes e critérios verificáveis. Não redefine silenciosamente o Compromisso da Necessidade, a Direção do Projeto ou a capacidade do Módulo.

No lado técnico, define somente o que for necessário para aquela evolução: solução de alto nível, decisões técnicas, contratos, dados ou estado relevantes, integrações, distribuição de responsabilidades, restrições técnicas, riscos, estratégia de verificação e informação para a decomposição futura. Tecnologia não é escolhida por ritual.

Uma decisão deve ser tomada no nível mais baixo capaz de decidir legitimamente todo o seu impacto:

| Alcance da decisão | Tratamento |
| --- | --- |
| Restrito à Entrega de Valor | Pode pertencer à sua formação, quando sustentado por evidência. |
| Vários Módulos, várias Entregas de Valor, arquitetura geral ou Projeto | É registrada como dependência ou questão e retorna ao nível competente; não é apropriada silenciosamente. |
| Restrito à implementação local | Pode ser tomada futuramente na execução, desde que não altere valor, comportamento principal, contrato, fronteira ou solução técnica de alto nível. |

A **Especificação da Entrega de Valor** consolida intenção, beneficiário, comportamento, fronteira, resultado observável, solução técnica, decisões, contratos, riscos, restrições, dependências, critérios verificáveis, Jornada ou Fluxo relevantes e informação suficiente para a decomposição. Sua formação, auditoria, efeitos no ciclo e Resultados do Processo estão definidos nos documentos normativos próprios; sua forma física e armazenamento permanecem não definidos.

O Formador não implementa código, não cria Pull Request, não executa Work Item, não executa teste de implementação, não homologa software integrado e não audita sua própria formação. Ele também não recebe autoridade para alterar decisões de nível superior.

## Auditor da Entrega de Valor

* **Natureza:** agêntica.
* **Executor:** agente especializado.

O Auditor avalia independentemente se a formação produzida por outro Ator é coerente, sustentada e suficiente para orientar a realização futura sem redescoberta de negócio ou redesenho da solução técnica de alto nível.

Quando aplicável, examina identidade e origem, vínculo com Módulo, coesão da intenção de valor, beneficiário identificável, valor utilizável e perceptível, resultado observável, fronteira finita, aderência à capacidade do Módulo, coerência com a Direção do Projeto e o Compromisso da Necessidade, Jornadas e Fluxos relevantes, dependências, solução de alto nível, decisões técnicas, contratos, riscos, restrições, critérios verificáveis e suficiência para futura decomposição.

Seu teste central é:

> A futura camada de execução consegue decompor e executar esta Entrega de Valor sem precisar redescobrir o valor de negócio ou redesenhar a solução técnica de alto nível?

Se a resposta for negativa, o Auditor identifica se há problema de formação, problema estrutural de delimitação ou decisão que pertence a nível superior. Ele não corrige a Entrega de Valor, não completa a Especificação, não escolhe solução ausente, não toma decisão humana, não implementa, não homologa e não substitui o Delimitador nem o Formador. Seus Resultados do Processo próprios estão definidos em [Resultados do Processo da Entrega de Valor](07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md).

### Delimitação e formação são problemas distintos

| Tipo de problema | Exemplos | Destino conceitual |
| --- | --- | --- |
| Delimitação | intenção incoesa, evolução ampla demais, fragmentação técnica, Módulo proprietário incorreto, fronteira estrutural inadequada ou evolução fora da capacidade do Módulo | Especialista em Delimitação de Entregas de Valor |
| Formação | solução técnica insuficiente, contrato ausente, risco não tratado, critério verificável insuficiente, decisão técnica necessária aberta ou contexto insuficiente para decomposição | Especialista em Formação da Entrega de Valor, salvo decisão de nível superior |

O Auditor indica o retorno competente sem definir transição, status, alteração de identidade ou processo operacional.

## Verificador da Entrega de Valor

* **Natureza:** agêntica.
* **Executor:** agente especializado.

O Verificador avalia, após a Realização e a integração, se o software produzido materializa efetivamente a evolução prometida pela Entrega de Valor. Seu objeto é o resultado integrado de software, e não a qualidade da formação.

Pode confrontar declaração de valor, resultado observável esperado, comportamento especificado, critérios verificáveis, software integrado, evidências produzidas, Jornadas e Fluxos relevantes e limitações conhecidas. A avaliação é da Entrega de Valor como conjunto integrado; não se limita à validação de um Work Item isolado.

Não implementa correções, não cria Work Items, não escolhe Executor, não define prioridade, não despacha retrabalho, não altera silenciosamente a Especificação, não redefine valor nem toma decisão humana material. Diante de divergência, produz evidência e a conclusão definida nos [Resultados do Processo da Entrega de Valor](07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md) para tratamento pela camada competente. Ambiente, ferramentas de teste e efeitos operacionais permanecem não definidos.

O laudo técnico positivo do Verificador (`EVOLUCAO_MATERIALIZADA`) atesta que os critérios verificáveis da Especificação foram atendidos no software integrado e habilita o gateway obrigatório de homologação pelo Owner. A homologação humana do Owner valida a percepção de valor e é condição mandatória e indispensável para a transição final para `CONCLUIDA`.

## Auditor e Verificador não se substituem

```text
Auditor da Entrega de Valor
→ a especificação está suficientemente formada para ser construída?

Verificador da Entrega de Valor
→ o software construído realmente entrega a evolução prometida?
```

São responsabilidades distintas, em momentos distintos e com evidências distintas. Não devem ser fundidas por conveniência: auditoria avalia a preparação da solução; verificação avalia o resultado integrado produzido.

## Fronteira com Work Item e com a execução

Work Item permanece uma vertical futura, inclusive quanto à sua decomposição, Atores e Executor. O mecanismo operacional de Realização também permanece não definido. Nenhum Ator desta vertical é responsável normativo por decompor Entregas de Valor em Work Items, nem executa Work Item por definição.

A Entrega de Valor suficientemente formada e auditada entrega à vertical futura o negócio, o comportamento, a solução técnica de alto nível, os contratos, as restrições e os critérios técnicos proporcionais. A execução pode decidir aspectos locais de implementação, mas não deve ser o lugar sistemático para definir valor, comportamento principal, arquitetura de alto nível, contratos centrais ou decisões técnicas estruturais da Entrega de Valor.

## Relações de verificação externas à vertical

### M-005 — Verificação do Resultado de Software

M-005 é uma capacidade de software da solução NAAMIVE; o Verificador da Entrega de Valor é um Ator normativo da metodologia. Não são o mesmo conceito. M-005 pode futuramente implementar ou suportar capacidades técnicas necessárias à verificação, mas não substitui conceitualmente a responsabilidade do Verificador. Esta definição não altera M-005.

### Verificador Agregado do Projeto

O Verificador da Entrega de Valor verifica uma evolução individual integrada. O [Verificador Agregado do Projeto](../projeto/03_ATORES_DO_PROJETO.md#verificador-agregado-do-projeto) avalia o resultado agregado do Projeto contra o Compromisso da Necessidade.

Evidências da verificação da Entrega de Valor podem ser úteis à verificação agregada, mas o Verificador da Entrega de Valor não produz `COMPROMISSO_ATENDIDO` ou `COMPROMISSO_NAO_ATENDIDO`, não conclui Projeto e não declara Necessidade atendida.

## Fluxo conceitual entre Atores

O encadeamento abaixo é ilustrativo e não constitui Ciclo de Vida, evento, transição, status, Resultado do Processo ou orquestração:

```text
Módulo com formação técnica aprovada
→ Especialista em Delimitação de Entregas de Valor
→ Entrega de Valor identificada e materializada
→ Especialista em Formação da Entrega de Valor
→ Especificação da Entrega de Valor
→ Auditor da Entrega de Valor
→ futura vertical Work Item e realização integrada
→ Verificador da Entrega de Valor (laudo técnico)
→ Owner (inspeção e homologação humana material)
→ conclusão formal da Entrega de Valor
→ evidências potencialmente úteis à agregação superior
```

O Owner exerce a homologação material da evolução integrada antes de sua conclusão, além de poder ser acionado em qualquer ponto para decisão humana material legítima. Delimitador delimita, Formador forma, Auditor audita e Verificador verifica; a separação permanece mesmo que um Executor concreto venha a exercer mais de um desses papéis em momentos distintos.

## Questões deliberadamente posteriores

Permanecem fora deste documento agentes concretos, eventos e orquestração operacionais, redelimitação que exija alterar identidade, persistência tecnológica, controle físico de concorrência, forma física da Especificação, decomposição, Work Item, execução, ambientes e mecanismos de implementação. A materialização documental atual, seu Mapa e seus arquivos de instância são definidos no Modelo.
