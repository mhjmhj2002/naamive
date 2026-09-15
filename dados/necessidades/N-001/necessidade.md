# N-001 — NAAMIVE

## 1. Título

Conduzir necessidades de negócio até software entregue sem depender de coordenação manual contínua.

## 2. Tipo da Necessidade

`NOVO_PRODUTO`

Produto pretendido: NAAMIVE.

## 3. Problema ou oportunidade

O desenvolvimento de software apoiado por inteligência artificial ainda depende excessivamente de intervenção humana para preservar contexto, organizar trabalho, determinar o próximo passo, escolher quem deve executar uma atividade, identificar se o trabalho está realmente preparado, manter continuidade entre agentes e etapas, preservar decisões importantes e evitar a reconstrução manual do histórico.

O problema central é que transformar uma necessidade de negócio em software ainda exige coordenação humana demais para que o processo seja sustentável conforme o uso de agentes cresce.

## 4. Quem é afetado

* Pessoas que desenvolvem software com apoio de inteligência artificial.
* Equipes que utilizam agentes.
* Responsáveis por produto.
* Responsáveis por negócio.
* Desenvolvedores.
* Revisores.
* Responsáveis por validação e aceite.

## 5. Resultado pretendido

Uma pessoa ou equipe deve conseguir apresentar uma necessidade de negócio e conduzi-la até um resultado de software verificável, de forma que:

* o estado atual esteja claro;
* o próximo trabalho válido possa ser determinado;
* somente trabalho preparado avance;
* a competência necessária seja conhecida;
* um executor adequado possa ser escolhido;
* decisões humanas sejam solicitadas somente quando necessárias;
* o contexto relevante seja preservado; e
* o executor não dependa de grandes instruções extras para realizar trabalho já declarado pronto.

## 6. Escopo inicial

Esta Necessidade inclui:

* registro da necessidade;
* formação e clarificação;
* avaliação de coerência e entregabilidade;
* criação de Projeto quando houver compromisso;
* decomposição em trabalho executável;
* atribuição conforme competência;
* preservação de contexto;
* identificação de decisões humanas;
* acompanhamento do trabalho;
* chegada a um resultado de software verificável; e
* rastreabilidade entre o resultado e a Necessidade de origem.

O objetivo é comprovar uma jornada completa utilizável. Isso não significa construir imediatamente todas as possibilidades futuras do NAAMIVE.

## 7. Fora de escopo

Esta Necessidade não inclui:

* substituir todas as ferramentas de desenvolvimento;
* administrar qualquer tipo de trabalho corporativo;
* eliminar pessoas do processo;
* automatizar decisões materiais de negócio;
* suportar inicialmente escala ilimitada;
* implementar todas as integrações possíveis;
* resolver antecipadamente todos os cenários de grandes organizações; ou
* incorporar automaticamente todas as funcionalidades futuras ao mesmo Projeto.

Evoluções independentes devem surgir por novas Necessidades.

## 8. Critério de atendimento

A Necessidade estará atendida quando uma necessidade real de software, limitada e entregável, conseguir percorrer uma jornada completa até um resultado verificável, sendo possível:

* saber onde o trabalho está;
* saber qual é o próximo trabalho;
* saber qual competência é necessária;
* selecionar executor adequado;
* fornecer contexto suficiente ao executor;
* identificar decisões humanas pendentes;
* separar estado atual de histórico; e
* relacionar o resultado final à Necessidade original.

Teste central:

> Dado um trabalho declarado pronto, deve ser possível delegá-lo por meio de uma instrução simples, sem que uma pessoa precise reconstruir manualmente todo o contexto necessário para sua execução.

## 9. Por que isso importa

Aumentar a capacidade de execução com inteligência artificial sem melhorar a coordenação pode aumentar retrabalho, inconsistência, perda de contexto, decisões implícitas, dependência humana e dificuldade de trabalhar com vários agentes.

O NAAMIVE pretende permitir o crescimento do uso de inteligência artificial sem crescimento proporcional da coordenação manual.

## 10. Restrições ou dependências já conhecidas

* Decisões materiais continuam exigindo autoridade adequada.
* Agentes devem executar atividades compatíveis com suas competências.
* A ausência de informação essencial não pode ser substituída por invenção.
* O estado atual deve ser separado do histórico.
* A rastreabilidade não pode gerar burocracia desproporcional.
* O processo deve ser compreensível para pessoas.
* A primeira solução pode ter limitações de escala, concorrência e integração.
* Funcionalidades futuras não entram automaticamente no mesmo Projeto.

## 11. Origem

Esta Necessidade surgiu da experiência prática com desenvolvimento apoiado por inteligência artificial e das dificuldades de manter contexto, continuidade, coordenação, rastreabilidade, divisão de trabalho e autonomia de agentes.

## Verificação inicial

| Aspecto | Avaliação |
| --- | --- |
| Clareza | ATENDE |
| Coerência | ATENDE |
| Escopo | ATENDE |
| Entregabilidade | ATENDE |
| Tamanho | ATENDE PARA QUALIFICACAO |
| Problema x solução | ATENDE |
| Tipo | NOVO_PRODUTO |

Resultado inicial: `QUALIFICAVEL`.

Este resultado registra somente a verificação inicial. Ele é Resultado do Processo, não status do ciclo de vida.

## Situação operacional

### Formação

**Resultado da auditoria:** `QUALIFICAVEL`.

**Pontos adequados:** o problema e os afetados estão claros; o resultado pretendido é coerente; o escopo da primeira jornada utilizável e o fora de escopo delimitam a fronteira; há critério de atendimento observável; o tamanho é compatível com uma Necessidade de novo produto; problema e solução estão separados; e a intenção foi confirmada pela pessoa usuária.

**Pontos a melhorar:** “coordenação manual contínua” é um objetivo com componente qualitativo. O critério de atendimento deve continuar representando uma primeira jornada completa utilizável, sem exigir um NAAMIVE perfeito.

**Tratamento escolhido:** `NENHUM_TRATAMENTO_ADICIONAL`, pois os pontos de atenção não impedem compreensão, qualificação ou compromisso e já estão tratados pela delimitação registrada.

### Qualificação

| Aspecto | Avaliação | Conclusão |
| --- | --- | --- |
| Valor | `ALTO` | Pode reduzir retrabalho, perda de contexto e coordenação manual no desenvolvimento com inteligência artificial. |
| Prioridade | `ALTA` | O problema é central para tornar sustentável o aumento do uso de agentes. |
| Aderência | `ATENDE` | A Necessidade define o próprio produto NAAMIVE e é compatível com seu propósito. |
| Restrições impeditivas | `NENHUMA` | As restrições conhecidas condicionam a condução, mas não impedem o compromisso. |
| Dependências impeditivas | `NENHUMA` | Não há dependência conhecida que impeça assumir compromisso neste momento. |

### Recomendação

`ASSUMIR_COMPROMISSO`.

Justificativa: há valor e prioridade altos, aderência ao NAAMIVE e não há restrição ou dependência impeditiva conhecida.

### Decisão humana de compromisso

| Decisão | Usuário autenticado que decidiu |
| --- | --- |
| `APROVADO` | `mhj` |

Esta foi uma decisão humana material, ocorrida após a recomendação do agente. O identificador `mhj` é o único identificador de usuário comprovável no contexto atual: ele consta como autor do histórico versionado do registro da N-001. Nesta primeira versão, o criador é o usuário responsável pela Necessidade. `APROVADO` é Resultado do Processo e não é nome de status formal da Necessidade.

### Projeto originado

`AINDA NÃO`.

Motivo: a entidade Projeto e seu modelo ainda não foram definidos.

## Situação no ciclo de vida

O ciclo de formação está concluído, com auditoria `QUALIFICAVEL`. A qualificação também está concluída, com recomendação `ASSUMIR_COMPROMISSO` e decisão humana de compromisso `APROVADO`.

Pelo [Ciclo de Vida da Necessidade](../../../documentacao/necessidade/CICLO_DE_VIDA_DA_NECESSIDADE.md), `APROVADO` exige a criação obrigatória do Projeto correspondente antes que a Necessidade possa assumir formalmente `EM_PROJETO`.

Essa transição ainda não foi materializada porque a entidade Projeto e seu modelo não estão definidos. Trata-se de lacuna de implementação e modelagem, não de um novo status intermediário. Enquanto a lacuna existir, não há status oficial atribuível que represente corretamente este instante entre a decisão já ocorrida e a criação obrigatória do Projeto.

Próximo evento obrigatório: criar o Projeto 1:1 correspondente à `N-001` e, então, registrar `EM_PROJETO`.
