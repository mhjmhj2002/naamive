# Ciclo de Vida da Entrega de Valor

## Finalidade

Este documento define o fluxo completo, os eventos conceituais, as condições, os retornos e os encerramentos da Entrega de Valor, desde sua materialização até sua conclusão ou cancelamento. Ele conecta a delimitação, a formação, a auditoria independente, a futura realização integrada e a verificação da evolução prometida.

Os nomes normativos e os significados das posições possíveis nesse fluxo pertencem ao [Status da Entrega de Valor](06_STATUS_DA_ENTREGA_DE_VALOR.md). As conclusões, determinações e decisões produzidas pelas atividades pertencem aos [Resultados do Processo da Entrega de Valor](07_RESULTADOS_DO_PROCESSO_DA_ENTREGA_DE_VALOR.md). As responsabilidades de cada Ator estão em [Atores da Entrega de Valor](03_ATORES_DA_ENTREGA_DE_VALOR.md). Resultado do Processo não é Status, e nenhum dos dois deve representar apenas um handoff burocrático.

## Princípios do ciclo

1. A Entrega de Valor pertence a exatamente um Módulo e preserva a cadeia `Entrega de Valor → Módulo → Projeto → Necessidade` durante todo o ciclo.
2. Ela somente nasce da delimitação conduzida pelo Especialista em Delimitação de Entregas de Valor sobre Módulo com formação técnica aprovada.
3. Formação, auditoria, realização e verificação têm objetos e responsabilidades distintos; nenhum Ator os funde unilateralmente.
4. Um retorno é determinado pela causa identificada, e não pela ideia genérica de “voltar uma etapa”.
5. A conclusão depende de verificação positiva do software integrado, não da existência isolada de código, artefato técnico ou ambiente.
6. Questão cujo alcance exceda a Entrega de Valor retorna ao nível competente; ela não é redefinida silenciosamente nesta vertical.

## Fluxo de referência

```text
Módulo com formação técnica aprovada
→ delimitação da Entrega de Valor
→ materialização da Entrega de Valor
→ formação
→ auditoria independente da formação
   → problema de formação
      → retorno ao Especialista em Formação da Entrega de Valor
   → problema estrutural de delimitação
      → retorno ao Especialista em Delimitação de Entregas de Valor
   → questão de alcance superior
      → retorno ao nível competente
   → formação suficiente
      → Especificação da Entrega de Valor disponível
      → futura decomposição e realização
      → software integrado
      → verificação da Entrega de Valor
         → evolução materializada
            → conclusão
         → evolução não materializada
            → tratamento conforme a causa
               → realização, formação, delimitação ou nível competente

em qualquer posição não terminal
→ decisão humana válida de cancelamento
→ cancelamento
```

O fluxo descreve a ordem conceitual e não define orquestração, persistência, arquivos de instância, tecnologia, agentes concretos nem mecanismo automático de despacho entre Atores.

## Nascimento e materialização

### Condição de entrada

O ponto de partida é um Módulo cuja formação técnica esteja aprovada e cuja **Especificação Técnica do Módulo** esteja disponível. A delimitação recupera também, pela cadeia de origem, a Direção do Projeto e o Compromisso da Necessidade. Esses artefatos são contexto de entrada e não são redefinidos pela Entrega de Valor.

O Especialista em Delimitação de Entregas de Valor identifica uma evolução finita, coesa, utilizável e perceptível para beneficiário identificável dentro da capacidade do Módulo. Trabalho técnico isolado, componente, camada, endpoint, tabela, Pull Request ou agrupamento arbitrário de tarefas não inicia este ciclo como Entrega de Valor.

### Evento de materialização

Quando a delimitação for justificada, o Especialista em Delimitação de Entregas de Valor materializa a entidade com identidade própria, vínculo com exatamente um Módulo, intenção de valor, beneficiário, resultado observável inicial e fronteira inicial suficientes para iniciar sua formação. A materialização é o evento de nascimento da Entrega de Valor.

Ela não nasce de formulário independente, criação manual arbitrária ou vínculo direto concorrente com Projeto ou Necessidade. O ciclo não define formato físico de instância, diretório, arquivo, persistência, geração de código ou mecanismo de atribuição de identidade.

Após materializada, a Entrega de Valor ocupa provisoriamente a posição conceitual de formação. O nome normativo dessa posição será definido somente no documento de Status.

## Formação e auditoria independente

O Especialista em Formação da Entrega de Valor aprofunda a evolução conforme [Formação da Entrega de Valor](04_FORMACAO_DA_ENTREGA_DE_VALOR.md). A formação consolida proporcionalmente produto, comportamento esperado, solução técnica de alto nível, decisões, contratos, riscos, restrições, critérios verificáveis e contexto suficiente para a futura decomposição e realização.

Quando a **Especificação da Entrega de Valor** estiver consolidada, o Formador a entrega, com suas evidências, lacunas legítimas, riscos e decisões, ao Auditor da Entrega de Valor. O handoff não aprova a própria formação: a Auditoria é independente e avalia se a futura realização poderá construir a evolução sem redescobrir o valor de negócio ou redesenhar a solução técnica de alto nível.

### Efeitos possíveis da auditoria

| Constatação da Auditoria | Destino e efeito conceitual |
| --- | --- |
| Formação suficiente | A Especificação da Entrega de Valor torna-se disponível para a futura camada de decomposição e realização. A Entrega de Valor passa à posição conceitual pronta para realização. |
| Problema de formação | Retorna ao Especialista em Formação da Entrega de Valor para tratamento da lacuna e posterior nova auditoria. |
| Problema estrutural de delimitação | Retorna ao Especialista em Delimitação de Entregas de Valor para reexaminar a coesão, a fronteira, a propriedade ou a própria caracterização da evolução. |
| Questão de alcance superior | Retorna ao Módulo, Projeto ou outro nível competente, conforme o alcance da decisão; a Entrega de Valor aguarda contexto válido quando a questão for bloqueante. |

Problema de formação inclui, por exemplo, solução técnica de alto nível insuficiente, contrato central ausente, risco material não tratado, critério verificável insuficiente, decisão técnica necessária ainda aberta ou contexto insuficiente para a futura decomposição. Seu destino é o Formador, que não pode convertê-lo em problema de delimitação apenas para abreviar o tratamento.

Problema estrutural de delimitação inclui, por exemplo, intenção incoesa, amplitude excessiva, fragmentação por camada técnica, Módulo proprietário incorreto, ausência de valor perceptível, sobreposição estrutural ou fronteira inadequada. Seu destino é o Delimitador, que não pode ser substituído pelo Formador ou pelo Auditor.

O retorno estrutural não autoriza, por si, alterar identidade, substituir, excluir ou versionar uma Entrega de Valor. Se a revisão exigir efeito dessa natureza, a necessidade de decisão normativa permanece explícita; este ciclo não inventa mecanismo operacional para ela.

### Formação suficiente não é conclusão

A aprovação da formação torna disponível a Especificação e permite o handoff para a camada posterior, mas não significa que a evolução foi entregue. Ela não significa que exista software, que o software esteja integrado, que tenha ocorrido homologação ou que a Entrega de Valor esteja concluída. O token formal da conclusão de auditoria será definido somente em Resultados do Processo.

## Posição durante a realização futura

Depois de a formação estar suficiente, a Entrega de Valor pode ingressar na posição conceitual de realização. Nesse trecho, sua Especificação aprovada orienta a futura decomposição e a realização do software necessário para tornar verdadeira a evolução prometida.

O ciclo reconhece expressamente o percurso abaixo:

```text
Especificação da Entrega de Valor disponível
→ futura decomposição e realização
→ software integrado correspondente à Entrega de Valor
```

Não são definidos aqui Work Item, tarefas, implementação, Executor de Work Item, estratégia de execução, Pull Requests, commits, branches, pipelines, ambientes, deploy ou o ciclo da futura vertical de realização. A Entrega de Valor permanece a referência de valor, comportamento, fronteira, solução de alto nível e critérios verificáveis enquanto esse trabalho futuro ocorre.

Descoberta durante a realização que afete somente a implementação local pode ser tratada naquela camada futura. Descoberta que demonstre insuficiência ou incorreção da Especificação retorna à Formação; descoberta de defeito estrutural da própria evolução retorna à Delimitação; e decisão que atinja Módulo, Projeto, várias Entregas de Valor ou outro alcance superior retorna ao nível competente. A realização não absorve silenciosamente essas mudanças.

## Software integrado e verificação

O software integrado correspondente à Entrega de Valor habilita a atuação do **Verificador da Entrega de Valor**. A verificação avalia o resultado integrado da evolução, e não um Work Item ou artefato técnico isolado.

O Verificador confronta, quando aplicável:

* declaração de valor;
* beneficiário relevante;
* resultado observável esperado;
* comportamento esperado;
* critérios verificáveis;
* software integrado;
* evidências disponíveis; e
* restrições e limitações conhecidas.

A distinção obrigatória é:

```text
Auditoria
→ a Especificação está suficientemente formada para ser construída?

Verificação
→ o software integrado realmente materializa a evolução prometida?
```

A verificação não se reduz a código implementado, Pull Request integrado, deploy realizado, endpoint pronto, tabela criada ou testes técnicos passando. Esses elementos podem compor evidência, mas não demonstram isoladamente que o beneficiário pode utilizar e perceber a evolução prometida.

### Verificação positiva

Quando a verificação concluir, com evidência adequada, que o software integrado materializa a evolução prometida, a Entrega de Valor alcança sua conclusão. A conclusão requer conjuntamente resultado integrado de software, evolução utilizável e perceptível no contexto definido e verificação positiva correspondente.

### Verificação negativa e retorno causal

Verificação negativa não produz retorno automático a uma etapa genérica. A causa orienta o tratamento:

| Causa identificada | Retorno conceitual |
| --- | --- |
| O software não atende uma Especificação válida | Retorno à futura realização para que a implementação integrada seja corrigida ou completada; depois, ocorre nova verificação. |
| A Especificação mostrou-se insuficiente ou incorreta | Retorno ao Especialista em Formação da Entrega de Valor; depois do tratamento e da auditoria independente aplicável, a realização e a verificação podem ser retomadas. |
| A própria evolução possui problema estrutural de fronteira, coesão, propriedade ou caracterização de valor | Retorno ao Especialista em Delimitação de Entregas de Valor. |
| A causa exige decisão de alcance superior | Retorno ao Módulo, Projeto ou outro nível competente, sem a apropriação silenciosa da decisão pela Entrega de Valor. |

O Verificador não implementa a correção, não forma a Especificação, não redelimita a evolução e não decide questão humana ou superior. Ele produz a evidência e a conclusão a serem formalizadas em Resultados do Processo, permitindo que a causa seja tratada pelo responsável competente.

## Encerramentos

### Conclusão

A conclusão encerra com sucesso apenas a Entrega de Valor verificada positivamente. Ela não conclui automaticamente o Módulo, não conclui automaticamente o Projeto e não torna automaticamente a Necessidade `ATENDIDA`. Evidências e conclusões dessa verificação podem subsidiar verificações agregadas superiores, sem substituir o Verificador Agregado do Projeto nem produzir conclusão agregada.

### Cancelamento excepcional

Uma decisão humana material válida pode encerrar excepcionalmente a Entrega de Valor em qualquer posição não terminal. Essa decisão pertence ao Owner, cujo Executor é o usuário autenticado; nenhum Ator agêntico pode produzi-la unilateralmente.

O cancelamento encerra a Entrega de Valor sem caracterizar evolução entregue, conclusão, atendimento de Necessidade ou conclusão de Módulo e Projeto. Este documento não formaliza o token da decisão, RBAC, ACL, delegação, mecanismo de registro, efeitos sobre identidade, exclusão, substituição ou reversão de realização já iniciada; tais definições não podem ser presumidas.

## Posições conceituais e relação com os documentos posteriores

Sem antecipar nomes formais, o ciclo contém posições equivalentes a:

```text
em formação
→ formação aprovada e pronta para realização
→ em realização
→ concluída

terminal excepcional
→ cancelada
```

O documento `06` consolidará somente os nomes formais, os significados e as condições de cada Status derivadas deste fluxo. O documento `07` consolidará somente as conclusões de auditoria e verificação, as determinações de retorno e as decisões humanas derivadas das atividades. Nenhum deles deve criar nova etapa, transição, loop, retorno ou encerramento material que este ciclo tenha deixado indefinido.

## Fronteiras normativas

Este documento não define Skills, agentes concretos, arquivos de instância, diretórios operacionais, persistência, Work Item, decomposição interna da realização, implementação, execução técnica, Pull Request, ambientes, deploy, mecanismo detalhado de homologação, RBAC, ACL, versionamento, substituição, exclusão ou mecanismo físico de evidências.

Também não altera a Especificação Técnica do Módulo, a Direção do Projeto, o Compromisso da Necessidade, a fronteira do Módulo proprietário nem as competências de seus níveis de origem. Quando uma alteração necessária ultrapassar a Entrega de Valor, ela deve ser explicitada e devolvida ao nível competente.
