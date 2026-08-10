# Bugs encontrados no teste manual — Fase 5

Registro incremental dos problemas encontrados durante o teste manual da Fase 5. Novas ocorrências devem ser adicionadas a este arquivo na branch `phase5-testing-bugs`.

| ID | Área | Ocorrência | Correção aplicada | Status |
| --- | --- | --- | --- | --- |
| F5-BUG-001 | F5-17 / timeline SSE | Ao abrir um projeto, a UI F5-17 substituía o stream SSE e registrava listeners apenas para poucos eventos técnicos. Eventos históricos nomeados, como `PROJECT_CREATED`, `ANALYSIS_COMPLETED` e `GATE_OPENED`, não eram renderizados; a linha do tempo ficava vazia. | O stream F5-17 passou a registrar listeners para todos os eventos conhecidos em `timelineCopy`. | DONE |
| F5-BUG-002 | F5-17 / decisão de produto | A mesma abertura F5-17 chamava a renderização de módulo, que escondia o painel de decisão. Um projeto em `WAITING_FOR_PRODUCT_COMMITMENT` ficava sem o controle para aprovar o compromisso de produto. | Foi adicionado o painel específico de decisão do compromisso de produto, com ações de aprovar e solicitar ajustes. | DONE |
| F5-BUG-003 | Operação de teste / worker | Um job pendente de fixture apontava para `/tmp` e SHA `000`. O worker falhava ao tentar preparar o inventário e o log expunha apenas `error_kind: Error`, dificultando a identificação inicial. | Os fixtures pendentes foram arquivados e o worker residual foi interrompido antes de retomar o teste controlado. A melhoria de detalhamento sanitizado do log permanece uma oportunidade de observabilidade. | DONE |
| F5-BUG-004 | Recuperação de projeto legado | Evidências anteriores usavam `central-atendimento-2` como identificador textual, mas o contexto técnico da Fase 5 exige UUID em suas relações. Uma recuperação direta com o identificador legado falhava na preparação do contexto. | O projeto foi recriado com UUID interno e a origem legada foi preservada nos metadados de recuperação. | DONE |
| F5-BUG-005 | F5-17 / decisão de produto | Mesmo após a correção do painel de decisão, o replay SSE chamava a atualização F5 e escondia o painel novamente. A versão corrigida era carregada, mas o botão ainda desaparecia após os eventos históricos. | A atualização F5 passou a renderizar novamente a decisão de compromisso de produto após cada refresh. | DONE |
| F5-BUG-006 | F5-17 / linguagem do operador | O painel de decisão expunha “Fase 5” ao operador, confundindo a fase interna de desenvolvimento do NAAMIVE com o fluxo do projeto de negócio. | Os textos passaram a referir-se somente ao compromisso de produto e às orientações técnicas do projeto. | DONE |
| F5-BUG-007 | F5-17 / execução da baseline | Após aprovar o compromisso de produto, a tela mostrava apenas o perfil tecnológico e o estado interno, sem controles para coletar inventário, criar o rascunho ou enviar as orientações para aprovação. | Foram adicionadas ações guiadas para coletar o inventário técnico, criar o rascunho a partir do perfil publicado e enviá-lo para aprovação. A composição usa apenas IDs e regras do catálogo, sem texto tecnológico livre. | DONE |
| F5-BUG-008 | F5-17 / inventário sem fatos | Um clone Git sem `package.json` concluía a coleta com zero fatos. Como a persistência contém apenas fatos, a UI interpretava o resultado como inventário não iniciado e o servidor recusava a criação do rascunho por não haver uma linha de inventário. | A API agora informa a conclusão da coleta mesmo sem fatos; a tela explica o resultado e libera o rascunho. A revisão aceita esse snapshot válido com `inventory_id` nulo. | DONE |
| F5-BUG-009 | F5-17 / apresentação das orientações | As orientações técnicas eram exibidas como uma sequência longa de linhas técnicas, sem hierarquia visual suficiente para leitura e revisão. | O perfil agora é apresentado como resumo destacado e as categorias são distribuídas em cartões, com regras de seleção e classificações em linguagem visual mais clara. | DONE |
| F5-BUG-010 | F5-17 / ordem das ações | Antes de criar o rascunho, a tela mostrava primeiro o botão desativado de criar módulo, fazendo o bloqueio parecer a ação principal. | A próxima ação de baseline passou a ficar antes do bloqueio de módulos. | DONE |
| F5-BUG-011 | F5-17 / repetição de inventário | Após uma coleta concluída sem fatos, a tela continuava oferecendo a coleta e um novo clique criava outro job e outros eventos de inventário. | A coleta concluída passou a ser reutilizada pelo servidor; a versão atual da UI reconhece esse estado e oferece o rascunho em vez de uma nova coleta. | DONE |
| F5-BUG-012 | F5-17 / prioridade do rascunho | Com um rascunho já criado e inventário sem fatos, uma resposta incompleta do estado de inventário podia fazer a UI voltar a oferecer coleta, escondendo a ação de envio. | Quando existe uma revisão em rascunho, a UI sempre substitui a ação por envio para aprovação. | DONE |
| F5-BUG-013 | F5-17 / proposta de módulo | O formulário liberado após a baseline aprovada pedia somente um identificador técnico e chamava a ação de “Novo módulo”, sem explicar qual capacidade do produto deveria ser proposta. | O formulário passou a pedir identificador, nome e objetivo, com orientação e exemplo focados na capacidade de negócio. | DONE |
| F5-BUG-014 | F5-17 / contexto de negócio do módulo | A melhoria inicial do formulário ainda pedia que o operador definisse o assunto do módulo sem apresentar a necessidade e o resultado já aprovados para o projeto. | O primeiro módulo agora apresenta o problema, resultado desejado e uma proposta explícita de registro e acompanhamento de solicitações, derivada do contexto do projeto. | DONE |
| F5-BUG-015 | F5-17 / campos da proposta | A revisão de módulo apresentava escopo, exclusões, dependências e critérios como “Não informado”, mas o formulário de proposta não continha campos para preenchê-los. | O formulário passou a coletar esses quatro grupos, em linhas separadas, e a enviá-los na proposta para revisão. | DONE |
| F5-BUG-016 | Revisão de módulo / retorno para ajustes | Ao usar “Solicitar ajustes” em uma proposta de módulo, o feedback é persistido e o gate é fechado como `REJECTED`, mas a mesma proposta não retorna para edição. O módulo fica em `WAITING_FOR_MODULE_APPROVAL`, a revisão continua `PENDING_APPROVAL`, e não há UI nem rota de negócio para corrigir e reenviar a proposta. | **PENDENTE — implementar.** Reabrir a proposta como uma nova revisão do mesmo módulo, preservar e pré-preencher os dados já enviados, exibir o feedback da revisão e abrir um novo gate de aprovação após o reenvio. Não criar outro módulo nem reutilizar o gate rejeitado. | OPEN |

## F5-BUG-016 — especificação para implementação

### Cenário reproduzido

- Projeto: `Centralizar solicitações de atendimento (recuperado)`.
- Módulo: `registro-de-solicitacoes`.
- Proposta enviada sem `out_of_scope`, `dependencies` e `acceptance_criteria`.
- A decisão **Solicitar ajustes** foi enviada com o feedback:
  - `O que não faz parte`
  - `Dependências`
  - `Como saberemos que deu certo?`
- Persistência observada: gate `MODULE_APPROVAL` com `status=REJECTED`; módulo em `WAITING_FOR_MODULE_APPROVAL`; revisão 1 em `PENDING_APPROVAL`.

### Comportamento esperado

Após solicitar ajustes, o operador deve voltar automaticamente para uma tela de edição da **mesma proposta**, identificada como revisão posterior do módulo existente. A tela deve mostrar o feedback recebido e pré-preencher, no mínimo:

- identificador técnico;
- nome;
- objetivo;
- escopo;
- itens fora de escopo;
- dependências;
- critérios de aceite;
- referência à Technology Baseline aprovada.

Ao reenviar, o sistema deve superseder a revisão rejeitada, manter o mesmo `module_id` e `module_key`, registrar uma nova `module_revision` e abrir um novo gate `MODULE_APPROVAL`. O gate rejeitado é histórico e não pode ser reaberto nem reutilizado.

### Critérios de aceite

1. Solicitar ajustes exige feedback e não deixa a proposta sem ação possível.
2. A tela de edição apresenta o feedback e todos os dados previamente enviados.
3. O reenvio não cria um segundo módulo com o mesmo propósito.
4. A nova revisão mantém a referência à baseline aprovada.
5. A linha do tempo registra a solicitação de ajustes, o início da revisão e a nova submissão.
6. A aprovação da nova revisão segue o fluxo normal para detalhamento do módulo.
