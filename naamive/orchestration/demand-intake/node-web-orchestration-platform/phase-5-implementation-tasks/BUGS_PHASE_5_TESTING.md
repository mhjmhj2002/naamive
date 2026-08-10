# Bugs encontrados no teste manual — Fase 5

Registro incremental dos problemas encontrados durante o teste manual da Fase 5. Novas ocorrências devem ser adicionadas a este arquivo na branch `phase5-testing-bugs`.

| ID | Área | Ocorrência | Correção aplicada | Status |
| --- | --- | --- | --- | --- |
| F5-BUG-001 | F5-17 / timeline SSE | Ao abrir um projeto, a UI F5-17 substituía o stream SSE e registrava listeners apenas para poucos eventos técnicos. Eventos históricos nomeados, como `PROJECT_CREATED`, `ANALYSIS_COMPLETED` e `GATE_OPENED`, não eram renderizados; a linha do tempo ficava vazia. | O stream F5-17 passou a registrar listeners para todos os eventos conhecidos em `timelineCopy`. | DONE |
| F5-BUG-002 | F5-17 / decisão de produto | A mesma abertura F5-17 chamava a renderização de módulo, que escondia o painel de decisão. Um projeto em `WAITING_FOR_PRODUCT_COMMITMENT` ficava sem o controle para aprovar e iniciar a Fase 5. | Foi adicionado o painel específico de decisão do compromisso de produto, com ações de aprovar/iniciar Fase 5 e solicitar ajustes. | DONE |
| F5-BUG-003 | Operação de teste / worker | Um job pendente de fixture apontava para `/tmp` e SHA `000`. O worker falhava ao tentar preparar o inventário e o log expunha apenas `error_kind: Error`, dificultando a identificação inicial. | Os fixtures pendentes foram arquivados e o worker residual foi interrompido antes de retomar o teste controlado. A melhoria de detalhamento sanitizado do log permanece uma oportunidade de observabilidade. | DONE |
| F5-BUG-004 | Recuperação de projeto legado | Evidências anteriores usavam `central-atendimento-2` como identificador textual, mas o contexto técnico da Fase 5 exige UUID em suas relações. Uma recuperação direta com o identificador legado falhava na preparação do contexto. | O projeto foi recriado com UUID interno e a origem legada foi preservada nos metadados de recuperação. | DONE |
