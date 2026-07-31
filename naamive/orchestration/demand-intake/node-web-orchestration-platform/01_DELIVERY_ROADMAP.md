---
document_type: delivery-roadmap
status: APPROVED_FOR_PHASE_1
created_at: 2026-07-30
approved_at: 2026-07-30
approved_by: NAAMIVE product and engineering
parent: 00_PRODUCT_NORTH_STAR.md
related_baseline: ../ORCHESTRATION_END_TO_END_AUDIT_GAPS_BACKLOG.md
delivery_strategy: vertical-end-to-end-slices
---

# Roadmap de Entrega — Fatias Verticais Node/Web

## Regra de entrega

Cada fase é uma entrega ponta a ponta utilizável no navegador. Inclui a menor porção necessária de interface web, API, máquina de estados, persistência, execução assíncrona e observabilidade. Não há fase exclusivamente de backend, worker, API ou fundação técnica.

Uma fase só termina quando o único operador consegue demonstrar seu fluxo completo pela web e consultar a auditoria correspondente. Fundações técnicas entram dentro da fase que entrega o valor que habilitam.

## Sequência de releases e limite do MVP

As fases são releases incrementais: cada uma preserva o que já é utilizável e
amplia a jornada do operador. Não existe um “primeiro release” que dependa de
uma fase posterior para ter valor.

| Release incremental | Fase | Valor utilizável ao final |
| --- | --- | --- |
| Release 1 | Fase 1 | Criar, submeter, validar e registrar um projeto pela web, com operação assíncrona e auditoria. |
| Release 2 | Fase 2 | Conduzir um projeto registrado até o compromisso de produto, com agentes e gate visíveis. |
| Release 3 | Fase 3 | Conduzir um módulo por desenvolvimento, QA e rework rastreável. |
| Release 4 — **MVP completo** | Fase 4 | Concluir um projeto de referência até entrega, aceite e PR draft auditáveis. |
| Evolução operacional | Fase 5 | Operar e recuperar a plataforma de forma sustentável após o MVP. |

## Fundamentos comuns

- Node.js e TypeScript são o alvo para API, máquina de estados, despachante e adaptador Codex.
- PostgreSQL é obrigatório em desenvolvimento manual e HML; volume persistente protege reinícios comuns.
- Unitários usam memória/fakes; integração e E2E usam PostgreSQL efêmero, nunca outro banco como substituto do fluxo normal.
- A fila do MVP é PostgreSQL: jobs/outbox, leases, idempotência e lock global; Redis/broker não pertencem ao escopo inicial.
- A máquina de estados é soberana: autoriza transições e determina o próximo trabalho elegível.
- O orquestrador é reativo: aceita o comando, registra/enfileira a ação e retorna `ACCEPTED` com `operation_id`; não espera agentes.
- Agentes submetem evidência e pedido de transição; nunca alteram o estado canônico diretamente.
- Eventos alimentam a projeção e SSE para a web. Cada item visual aponta para evento ou evidência canônica.
- O MVP tem operador único e uma única organização.
- Cada projeto vincula um repositório Git local já criado no GitHub e clonado pelo operador; a NAAMIVE não provisiona repositórios remotos.
- Há no máximo um agente ativo em toda a plataforma no MVP.

## Resumo de pendências de prontidão

Uma pendência `OPEN` de prioridade P0 bloqueia o início da fase indicada; uma
P1 deve ser resolvida no momento indicado em sua seção. `RESOLVED` é reservado
para trabalho implementado e verificado; decisões aprovadas aguardando execução
permanecem `OPEN`.

| ID | Fase afetada | Prioridade | Status | Resumo |
| --- | --- | --- | --- | --- |
| P0-01 | Fase 1 | P0 | `RESOLVED` | Worker/outbox mínimo incluído na Fase 1. |
| P0-02 | Fase 1 | P0 | `RESOLVED` | Contrato versionado da máquina de estados publicado. |
| P0-03 | Fase 1 | P0 | `RESOLVED` | Fonte e localização de evidências definidas. |
| P0-04 | Fase 1 | P0 | `RESOLVED` | Criação exige clone válido; vínculo apenas corrige rascunho. |
| P0-05 | Fase 1 | P0 | `RESOLVED` | Contrato de resultado, retry e recuperação de validação publicado. |
| P0-06 | Fase 1 | P0 | `RESOLVED` | Intake estruturado, revisões imutáveis e paridade legada definidos. |
| P0-07 | Fase 1 | P0 | `RESOLVED` | Artefatos obrigatórios e recuperação de escrita definidos. |
| P0-08 | Fase 1 | P0 | `RESOLVED` | API localhost-only e allowlists aprovadas para a Fase 1. |
| P1-01 | Fase 1 | P0 | `RESOLVED` | Submissões distintas são enfileiradas; worker permanece exclusivo. |
| P0-09 | Fase 1 | P0 | `RESOLVED` | Quatro execuções e backoff de 5 s, 15 s e 30 s implementados. |
| P0-10 | Fase 1 | P0 | `RESOLVED` | Intenção persistida e reconciliação idempotente implementadas. |
| P0-11 | Fase 1 | P0 | `RESOLVED` | Vínculo Git, branch-base e auditoria persistidos. |
| P0-12 | Fase 1 | P0 | `RESOLVED` | Operador configurado no servidor e injetado na auditoria. |
| P1-02 | Fase 1 | P1 | `RESOLVED` | Catálogo e único mapeamento de status versionado definidos. |
| P1-03 | Fases 1–5 | P1 | `RESOLVED` | Releases incrementais e limite do MVP estão nomeados. |
| P1-04 | Fases 1 e 5 | P1 | `RESOLVED` | Backup manual testado na Fase 1; automação fica na Fase 5. |
| P2-05 | Fase 1 | P2 | `RESOLVED` | Compose, migrations e fluxo web completo validados em PostgreSQL local. |
| P1-05 | Fase 3 | P1 | `OPEN` | Política Git para falhas e divergências está incompleta. |
| P1-06 | Fase 1 | P1 | `RESOLVED` | Autoria de rascunho e submissão separadas no schema/runtime. |
| P1-07 | Fase 1 | P1 | `RESOLVED` | Índices únicos parciais aplicados na migration de status. |
| P1-08 | Fases 1–5 | P1 | `RESOLVED` | North Star e roadmap promovidos para aprovados na Fase 1. |
| P1-09 | Fase 1 | P1 | `RESOLVED` | Bootstrap Node/Web/PostgreSQL e comandos operacionais criados. |
| P1-10 | Fase 1 | P1 | `RESOLVED` | Configuração obrigatória validada no startup e documentada. |
| P2-01 | Fase 4 | P2 | `OPEN` | Mecanismo de abertura de PR não está escolhido. |
| P2-02 | Fase 3 | P2 | `OPEN` | Identidade e convenção de commits não estão definidas. |
| P2-03 | Fase 3 | P2 | `OPEN` | Método de integração fase → `integration` não está escolhido. |
| P2-04 | Fase 3 | P2 | `OPEN` | Estratégia de teste da integração Git remota não está definida. |

## Status das tarefas das fases

Os status abaixo acompanham a execução de cada tarefa do roadmap. `DONE` exige
definição de pronto e verificação correspondente; `BLOCKED` exige registrar ou
vincular uma pendência explicável.

| Status | Significado |
| --- | --- |
| `TO DO` | Ainda não iniciada. |
| `DOING` | Em implementação ou verificação; não atende integralmente à definição de pronto. |
| `DONE` | Implementada e verificada conforme a definição de pronto. |
| `BLOCKED` | Não pode avançar por dependência externa ou pendência registrada. |

| Fase | ID | Status | Observação inicial |
| --- | --- | --- | --- |
| 1 | F1-01 | `DONE` | Schema de projeto, intake, Git, evento, operação e gate validado no aceite PostgreSQL. |
| 1 | F1-02 | `DONE` | Runtime Python e documentação estão deprecated; inventário de paridade registrado. |
| 1 | F1-03 | `DONE` | Catálogo versionado e projeção de status/próxima ação atendem à UI e ao aceite. |
| 1 | F1-04 | `DONE` | Aceite HTTP valida clone allowlisted, origin, branch-base, SHA e confirmação de árvore suja. |
| 1 | F1-05 | `DONE` | Workflow v1 publicado e imutável; worker e decisão interpretam transições publicadas. |
| 1 | F1-06 | `DONE` | ArtifactStore com intenção, hash, reconciliação e quatro artefatos obrigatórios validado. |
| 1 | F1-07 | `DONE` | API de criação, edição, submissão, decisão, consulta e timeline validada por testes HTTP. |
| 1 | F1-08 | `DONE` | Backup valida dump/checksum/metadados e restore em PostgreSQL efêmero confirmou projetos restaurados. |
| 1 | F1-09 | `DONE` | Submissão grava operação/job/evento na transação; aceite confirmou `ACCEPTED` e processamento recuperável. |
| 1 | F1-10 | `DONE` | Testes PostgreSQL cobrem lease vencido, lock global, tentativas e conclusão recuperável. |
| 1 | F1-11 | `DONE` | Teste inicia processo worker novo e confirma recuperação de job `LEASED` vencido até o gate. |
| 1 | F1-12 | `DONE` | Aceite HTTP automatizado recebe evento persistido via socket SSE; teste de replay por `after` também passou. |
| 1 | F1-13 | `DONE` | Web servida no aceite HTTP oferece lista, formulário, status, detalhe, timeline SSE e decisão. |
| 1 | F1-14 | `DONE` | Aceite automatizado cobre web/HTTP, SSE, ArtifactStore, lease vencido, restart real do worker e restore PostgreSQL efêmero. |
| 2 | F2-01 | `TO DO` | — |
| 2 | F2-02 | `TO DO` | — |
| 2 | F2-03 | `TO DO` | — |
| 2 | F2-04 | `TO DO` | — |
| 2 | F2-05 | `TO DO` | — |
| 2 | F2-06 | `TO DO` | — |
| 3 | F3-01 | `TO DO` | — |
| 3 | F3-02 | `TO DO` | — |
| 3 | F3-03 | `TO DO` | — |
| 3 | F3-04 | `TO DO` | — |
| 3 | F3-05 | `TO DO` | — |
| 3 | F3-06 | `TO DO` | — |
| 3 | F3-07 | `TO DO` | — |
| 3 | F3-08 | `TO DO` | — |
| 3 | F3-09 | `TO DO` | — |
| 4 | F4-01 | `TO DO` | — |
| 4 | F4-02 | `TO DO` | — |
| 4 | F4-03 | `TO DO` | — |
| 4 | F4-04 | `TO DO` | — |
| 4 | F4-05 | `TO DO` | — |
| 4 | F4-06 | `TO DO` | — |
| 4 | F4-07 | `TO DO` | — |
| 4 | F4-08 | `TO DO` | — |
| 5 | F5-01 | `TO DO` | — |
| 5 | F5-02 | `TO DO` | — |
| 5 | F5-03 | `TO DO` | — |
| 5 | F5-04 | `TO DO` | — |
| 5 | F5-05 | `TO DO` | — |

## Fase 1 — Projeto web iniciado e submetido

**Valor entregue:** o operador vincula um repositório Git local, cria um projeto no navegador, preenche a necessidade guiada, submete e acompanha a validação até decidir `REGISTER_PROJECT`.

**Demonstração ponta a ponta:** abrir a web, criar rascunho, salvar, submeter, ver eventos de validação, revisar a necessidade, aprovar o gate e ver o projeto registrado — sem CLI.

**Execução por agente:** seguir `06_PHASE_1_AGENT_EXECUTION_GUIDE.md`, incluindo
as regras de atualização da tabela de tarefas, pendências e issues.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F1-01 | Definir schema de projeto, intake, vínculo Git, evento, operação e gate de registro. | Regras Python dispersas; usar testes e contratos atuais como referência. |
| F1-02 | Marcar runtime Python e seus documentos como `DEPRECATED`; inventariar regras, contratos e testes de referência para Node. | Legado não recebe novas funcionalidades; ausência de inventário pode perder regra crítica. |
| F1-03 | Criar no PostgreSQL catálogo versionado de tipos, status, públicos e mapeamentos de estado/evento; projetar status, marco e próxima ação. | UI não pode inferir estados; migrations controladas não podem alterar transições da máquina. |
| F1-04 | Validar caminho permitido, Git, origin, branch-base, SHA inicial e árvore limpa/confirmada. | Path livre pode expor arquivos; restringir raízes. |
| F1-05 | Publicar no PostgreSQL `PROJECT_INTAKE` v1 conforme `02_PHASE_1_STATE_MACHINE_CONTRACT.md`; motor Node interpreta estados, transições, guards e efeitos. | Definição publicada é imutável; nova regra exige nova versão. |
| F1-06 | Implementar `ArtifactStore` obrigatório conforme `03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md`; NAAMIVE é somente leitura em runtime. | URI ausente, temporária ou não persistente bloqueia início. |
| F1-07 | Implementar API/persistência PostgreSQL para criar, editar, submeter, decidir e consultar projeto, operação e timeline. | Migrations iniciais devem ser repetíveis e testadas. |
| F1-08 | Provisionar PostgreSQL local persistente e comandos de backup/restore; criar dump automático antes de migration destrutiva. | Reset de banco é destrutivo; exigir confirmação e backup válido. |
| F1-09 | Implementar transação de submissão: estado, evento, operação e job `VALIDATE_INTAKE` são gravados juntos. | Não permitir que uma transição aceita fique sem job recuperável. |
| F1-10 | Implementar tabela PostgreSQL de jobs/outbox com tentativa, `available_at`, lease, idempotência e lock global. | Transição, evento e job devem ser atômicos na mesma transação. |
| F1-11 | Implementar worker sequencial mínimo: consome `VALIDATE_INTAKE`, recupera job vencido e abre `REGISTER_PROJECT` sem chamar Codex. | Worker não pode executar mais de um job/agente por vez. |
| F1-12 | Implementar SSE a partir de eventos persistidos para submissão, validação, gate e decisão. | Não simular progresso nem depender de memória do processo. |
| F1-13 | Implementar web: lista, vínculo Git, criação, formulário, status resumido, marcos, detalhe técnico e decisão de registro. | Sem design system; usar componentes acessíveis e neutros. |
| F1-14 | Criar teste de aceite web de vínculo Git, criação até registro, status de jornada, ArtifactStore e recuperação de job após restart. | Normalizar somente IDs e tempos voláteis. |

## Fase 2 — Primeiro ciclo automático visível até compromisso de produto

**Valor entregue:** de um projeto registrado, o operador aciona iniciar, recebe aceite imediato e acompanha análise, definição e revisão até `PRODUCT_COMMITMENT`; decide módulos pela web.

**Demonstração ponta a ponta:** iniciar por botão, ver despacho, heartbeat, evidência e transição de cada agente; abrir documentos e decidir o compromisso com autoria na timeline.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F2-01 | Portar análise, proposta de módulos, requisitos e revisão com testes de paridade críticos. | Regressão do Python; mapear cada controle relevante para teste Node. |
| F2-02 | Evoluir o worker para despachar jobs de análise, requisitos e revisão, sempre um por vez. | Despacho duplicado; reutilizar lock global e idempotência da Fase 1. |
| F2-03 | Implementar adaptador Codex Node isolado, com timeout, sanitização, evidência e pedido de transição. | Autenticação/sandbox; formalizar launcher/CI suportado. |
| F2-04 | Evoluir timeline SSE com agente, fase, duração, heartbeat, evidência, resultado e próxima ação. | CLI não fornece progresso interno confiável; heartbeat prova vida do worker. |
| F2-05 | Implementar tela de compromisso com proposta, requisitos, módulos candidatos, aprovação/rejeição e feedback. | Decisão concorrente; versão do gate é validada pela API. |
| F2-06 | Criar teste de aceite web até compromisso, com eventos e evidências correlacionados. | IA é variável; usar adaptador controlado em teste e smoke separado. |

## Fase 3 — Ciclo de módulo, desenvolvimento e QA com rework

**Valor entregue:** o operador aprova módulo e acompanha planejamento, implementação e QA. Uma reprovação cria finding, torna correção elegível e mostra Dev → QA → Dev até aprovação ou escalonamento.

**Demonstração ponta a ponta:** aprovar módulo, observar criação de trabalho, entrega Dev, reprovação QA, correção, nova validação e fechamento do finding pela web.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F3-01 | Portar materialização de módulo e rounds de definição, arquitetura e planejamento. | Decisões materiais abrem gate; não prosseguir implicitamente. |
| F3-02 | Planejamento gera work item mínimo, autorizado e rastreável. | Escopo excessivo; item tem limites, entradas e saída explícitos. |
| F3-03 | Criar branch `integration` e branch de fase; usar um worktree por vez e preservar commits por execução. | Ref não pode ser prefixo de outra; usar `integration` e `phases/<fase>`. |
| F3-04 | Portar implementação isolada na branch de fase. | Escritas fora de escopo; worktree e validação obrigatórios. |
| F3-05 | Portar QA e findings ligados à entrega revisada, regra/teste, severidade e revalidação. | Critérios iniciais de QA; definir conjunto mínimo para referência. |
| F3-06 | Implementar política de rework: correção elegível, limite de tentativas e gate para risco, escopo, arquitetura ou repetição. | Limites variam por risco; iniciar conservador e configurável. |
| F3-07 | Integrar fase → `integration`, fazer push e registrar SHAs/evidências após QA aprovar. | Falha de merge/push não inicia próxima fase. |
| F3-08 | Implementar visão web de entrega, QA, findings, correções e revalidações por work item. | Muitas tentativas; usar correlação e expansão progressiva. |
| F3-09 | Criar teste de aceite web de finding que retorna ao Dev e fecha após QA aprovar. | Cobrir também timeout, interrupção e causa sanitizada. |

## Fase 4 — Projeto entregue e aceito pela web

**Valor entregue:** o operador conduz um projeto de referência até entrega, incluindo integração, validação, risco, release, aceite e consulta completa de evidências/auditoria no navegador.

**Demonstração ponta a ponta:** projeto criado pela web percorre gates aplicáveis, produz aplicação, testes e documentação, e alcança `DELIVERED` com pacote e aceite auditáveis.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F4-01 | Portar integração, validação de qualidade/segurança e relatórios. | Contratos entre módulos; validar versão e hash antes de integrar. |
| F4-02 | Portar gates de risco, release, aceite e rejeição com rework guiado. | Regras de risco precisam ser acordadas; começar com políticas explícitas. |
| F4-03 | Mostrar pacote, aplicação, testes, documentação e registros canônicos na web. | Artefatos grandes/sensíveis; servir apenas referências autorizadas. |
| F4-04 | Abrir/atualizar um PR draft de `integration` → `main`, registrando URL, número, branch e SHAs. | GitHub exige credencial de push/PR com escopo mínimo. |
| F4-05 | Tornar pausa, retomada, timeout, interrupção e cancelamento acionáveis e explicáveis na web. | Cancelamento deve ser atômico; testar falha antes de persistir evidência. |
| F4-06 | Definir projeto de referência descartável e isolado. | Não reutilizar projeto real. |
| F4-07 | Criar teste de aceite web completo até `DELIVERED`; merge em `main` permanece humano. | Combinar testes controlados e smoke autenticado. |
| F4-08 | Executar corte controlado: confirmar matriz de paridade, arquivar evidência legada e remover runtime Python deprecated. | Não remover enquanto houver controle, teste, documentação ou operação sem substituto Node. |

## Fase 5 — Operação sustentável e expansão segura

**Valor entregue:** a plataforma é operável com telemetria, backup, deploy e recuperação; fica preparada para evolução posterior a múltiplos usuários/organizações sem reescrita estrutural.

**Demonstração ponta a ponta:** simular falha de worker/serviço, recuperar operação sem perda de auditoria e consultar métricas, logs e runbook.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F5-01 | Instrumentar logs, métricas, tracing e alertas correlacionando API, worker, operação e evento. | Volume de eventos; definir retenção e agregação. |
| F5-02 | Automatizar build, migração, backup, rollback e runbooks testados. | Infraestrutura indefinida; manter contrato independente de provedor. |
| F5-03 | Formalizar segredos e launcher Codex; somente ambiente atestado, sem credenciais em logs. | Ambientes locais heterogêneos; documentar suporte explícito. |
| F5-04 | Preparar fronteira de organização/ator sem habilitar multitenancy no MVP. | Não antecipar telas ou permissões. |
| F5-05 | Criar teste de resiliência: restart com volume persistente e restore de backup preservam estado, idempotência e auditoria. | Injetar falhas controladas; reconstrução por ledger não pertence ao MVP. |

## Critérios transversais

- Todo comando retorna aceite rápido e é idempotente ou retorna conflito explicável.
- Nenhum agente executa sem contexto, autorização e evento de despacho.
- Erros são sanitizados, auditáveis e indicam próxima ação.
- A UI acompanha eventos reais por SSE e recupera após reconexão.
- Cada fase tem teste de aceite web e demonstração manual reproduzível.
- A CLI pode existir para compatibilidade/administração, mas não é necessária para fluxos de valor.

## Pendências de prontidão para implementação

Estas pendências foram identificadas na revisão de prontidão dos documentos.
Elas são ordenadas por relevância e devem ser resolvidas antes de iniciar a
implementação da fase afetada. Uma decisão aprovada deve atualizar este roadmap,
o radar de produto e as tarefas correspondentes.

### Fase 1 — Bloqueadores e decisões de implementação

### P0-01 — Fase 1 promete execução assíncrona sem worker/outbox mínimo

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** a Fase 1 promete operação assíncrona e SSE, mas jobs/outbox,
lease e despachante aparecem somente na Fase 2.

**Decisão aplicada:** a Fase 1 implementa `VALIDATE_INTAKE` com operação,
jobs/outbox, lease, lock global, recuperação após restart e SSE de eventos
persistidos. A Fase 2 reutiliza esse worker e adiciona apenas jobs de despacho
de agentes/Codex.

### P0-02 — Contrato formal da máquina de estados ainda não existe

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** a máquina é definida como soberana, mas não há especificação
versionada de estados, eventos, guards, transições, gates, efeitos e
idempotência do fluxo Node.

**Decisão aplicada:** o contrato aprovado está em
`02_PHASE_1_STATE_MACHINE_CONTRACT.md`. O Node usa um motor genérico e
definições de workflow versionadas/publicadas no PostgreSQL, em vez de enums de
negócio. A Fase 1 publica `PROJECT_INTAKE` v1; extensões futuras criam novas
versões ou workflows, sem editar uma definição publicada.

### P0-03 — Fonte canônica e localização de evidências não estão fechadas

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o produto separa PostgreSQL, auditoria e repositório externo,
mas não define a localização canônica de cada classe de artefato nem os campos
obrigatórios de referência.

**Decisão aplicada:** `03_ARTIFACT_STORAGE_AND_AUDIT_CONTRACT.md` separa
PostgreSQL operacional, repositório externo do produto e `ArtifactStore`
parametrizável. O repositório NAAMIVE é somente leitura em runtime; toda
referência de artefato contém URI/chave/hash/schema e, quando aplicável,
repositório, branch, commit SHA e caminho relativo.

### P0-04 — Ordem entre criação do projeto e vínculo Git é contraditória

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o contrato exige vínculo Git válido em `CREATE_PROJECT`, mas
também permite `BIND_REPOSITORY` a partir de `DRAFT` sem delimitar se ele cria
ou apenas substitui o vínculo. Isso torna ambígua a jornada de criação e pode
contradizer a exigência do North Star de informar o clone na tela de criação.

**Decisão aplicada:** `04_PHASE_1_INTAKE_AND_VALIDATION_CONTRACT.md` estabelece
que `CREATE_PROJECT` exige clone válido e que `BIND_REPOSITORY` apenas
substitui/corrige vínculo de projeto em `DRAFT`.

### P0-05 — Contrato de resultado e recuperação de `VALIDATE_INTAKE` está incompleto

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** faltam payload canônico de sucesso/erro estruturado, distinção
entre falha permanente e retry, limite de tentativas, backoff, encerramento da
operação e correlação entre job, operação, revisão do intake e eventos.

**Decisão aplicada:** `04_PHASE_1_INTAKE_AND_VALIDATION_CONTRACT.md` publica
resultados, correlação, idempotência, três tentativas com backoff e recuperação
por lease sem duplicação de efeito.

### P0-06 — Modelo normativo e revisão do intake guiado não estão definidos

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o legado valida Markdown/YAML com seções obrigatórias e regra de
tecnologia proibida, enquanto a Fase 1 promete formulário web. Não há definição
de campos estruturados, Markdown versionado ou ambos; tampouco de revisão,
normalização, mensagens de erro e paridade com regras efetivas.

**Decisão aplicada:** `04_PHASE_1_INTAKE_AND_VALIDATION_CONTRACT.md` define o
schema v1, normalização, erros por campo, política de tecnologia, revisão
imutável, renderização Markdown/YAML e matriz de paridade com o legado.

### P0-07 — Artefatos mínimos da Fase 1 e falha de escrita não estão definidos

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o `ArtifactStore` é obrigatório, mas não está decidido se a
submissão, relatório de validação, snapshot do gate e decisão devem ser
gravados nele, nem como a transição reage a erro de persistência.

**Decisão aplicada:** `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` torna esses
quatro conjuntos obrigatórios, determina escrita pré-transição e reconciliação
idempotente sem aceitar auditoria parcial.

### P0-08 — Fronteira de acesso local da API não está fechada

**Prioridade:** bloqueador de segurança para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** a API valida caminhos locais e poderá acionar Git e
`ArtifactStore`; ainda não há login no MVP. Adiar a fronteira para HML deixaria
o desenvolvimento inicial exposto a requisições de outras interfaces de rede.

**Decisão aplicada:** `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` fixa bind
loopback, CORS restrito, allowlists com resolução de symlink e pré-requisitos
explícitos para exposição em HML.

### P1-01 — Submissão concorrente, fila e exclusividade do worker são contraditórias

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o contrato limita o lock global ao worker, mas também prevê
`WORKER_BUSY` ao submeter outro projeto enquanto o slot está ocupado. Rejeitar
antes de gravar operação/job contradiz a fila PostgreSQL recuperável; aceitar e
enfileirar torna o conflito desnecessário nesse caso.

**Solução aprovada para implementação:** aceitar submissões de projetos distintos, gravar a
operação e o job `PENDING` e executá-los sequencialmente. `PROJECT_OPERATION_ACTIVE`
continua bloqueando nova submissão do mesmo projeto; leitura, SSE e edição de
rascunhos permanecem permitidas. `WORKER_BUSY` não é retornado para trabalho que
pode ser enfileirado.

### P0-09 — Tentativas e atrasos de retry de `VALIDATE_INTAKE` são ambíguos

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** “no máximo três tentativas totais” conflita com os atrasos de
`5 s`, `30 s` e `120 s`, que usualmente representam três retries após a
tentativa inicial.

**Solução aprovada para implementação:** são permitidas quatro execuções no máximo: primeira
tentativa imediata e três retries após `5 s`, `15 s` e `30 s`. Ao esgotá-las,
emitir `INTAKE_EXECUTION_FAILED` uma única vez, encerrar a operação como
`FAILED` e projetar `ATENCAO_NECESSARIA`.

### P0-10 — Protocolo de consistência entre `ArtifactStore` e PostgreSQL está incompleto

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** a escrita de artefato precede a transição e o PostgreSQL guarda
sua referência, mas falta o protocolo para a falha entre as duas etapas e a
regra que permite associar um objeto órfão com segurança.

**Solução aprovada para implementação:** publicar uma sequência idempotente: reservar a intenção
no PostgreSQL com `execution_id`, tipo, chave determinística e hash esperado;
gravar o objeto imutável; verificar hash/schema; e, numa transação, registrar a
referência e aceitar a transição. A reconciliação somente associa objeto cuja
chave, hash, tipo e correlação coincidam com a intenção pendente; caso contrário
mantém-no órfão e não avança o workflow.

### P0-11 — Schema, branch-base e auditoria do vínculo Git não estão definidos

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** validar `origin`, branch-base, SHA inicial e árvore limpa ou
confirmada requer campos persistidos, origem da branch-base, formato de
confirmação de árvore suja e eventos de auditoria ainda ausentes.

**Solução aprovada para implementação:** o schema de vínculo inclui caminho canônico,
remote `origin`, URL normalizada, branch-base, SHA inicial, estado da árvore,
ator/tempo/confirmação e versão da validação. A branch-base é definida por
configuração explícita do projeto, com fallback somente para `origin/HEAD`
resolvido e registrado. Árvore suja exige confirmação explícita, motivada e
auditada; toda criação, validação e substituição emite evento correlacionado.

### P0-12 — Origem e validação da identidade auditável do operador não estão definidas

**Prioridade:** bloqueador para a Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o MVP não tem login, mas exige ator auditável em cada comando e
decisão. Aceitar esse ator no payload HTTP permitiria falsificação.

**Solução aprovada para implementação:** `NAAMIVE_OPERATOR_ID` define a identidade única no
servidor, é validada na inicialização e é injetada pela API em todos os eventos
e decisões. O cliente não envia nem escolhe o ator; ausência ou valor inválido
impede a inicialização da aplicação.

### P1-02 — Modelo de status tem duas fontes parcialmente sobrepostas

**Prioridade:** alta; resolver antes de migrations da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o radar prevê `status_types`, `status_definitions`, públicos e
`state_status_mappings`; a versão inicial do contrato da máquina previa
`workflow_status_mappings`. Chaves, versionamento e precedência não estão
definidos.

**Decisão aplicada:** há um único `state_status_mappings`, versionado por
workflow, com precedência de evento e projeção persistida; o catálogo continua
separado e reutilizável.

### P1-03 — Limite entre primeiro release e MVP completo estava ambíguo

**Prioridade:** alta para planejamento e comunicação.

**Status:** `RESOLVED`.

**Decisão aplicada:** cada fase é seu próprio release incremental e de valor
ponta a ponta. A Fase 1 é o primeiro release utilizável: criação, submissão,
validação e registro de projeto pela web. O MVP de entrega completa é formado
pelas Fases 1–4; a Fase 5 é evolução operacional posterior ao MVP.

### P1-04 — Backup manual da Fase 1 e automação da Fase 5 se confundem

**Prioridade:** alta; resolver antes de definir o aceite operacional da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** backup/restore e dump antes de migration destrutiva aparecem na
Fase 1 e novamente na automação operacional da Fase 5, sem separar o nível de
entrega esperado em cada uma.

**Decisão aplicada:** `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` limita a
Fase 1 a backup/restore manual testado e reserva agendamento, retenção, rollback
automatizado, alertas e runbooks para a Fase 5.

### P1-06 — Nomenclatura de autoria do intake diverge entre jornada e schema

**Prioridade:** importante; tratar no primeiro incremento técnico da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** a jornada usa `author`, enquanto o schema normativo usa
`submitted_by`, deixando incerto se ambos são o mesmo campo ou atores distintos.

**Solução aprovada para implementação:** `submitted_by` identifica a autoria da revisão submetida;
`created_by` e `updated_by` identificam criação e alterações do rascunho.
Contrato, API, banco e eventos devem usar esses nomes.

### P1-07 — Unicidade de mapeamentos de status com `event_code` nulo não está garantida

**Prioridade:** importante; tratar antes da migration de status da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** uma restrição `UNIQUE` comum no PostgreSQL permite múltiplas
linhas com `event_code = NULL`, podendo criar mapeamentos padrão duplicados.

**Solução aprovada para implementação:** criar índices únicos parciais: um para o mapeamento sem
evento (`WHERE event_code IS NULL`) e outro para o mapeamento específico de
evento (`WHERE event_code IS NOT NULL`), usando as demais colunas da chave de
mapeamento em ambos.

### P1-08 — Status dos documentos de direção diverge dos contratos aprovados

**Prioridade:** importante; tratar após consolidar os bloqueadores da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** o North Star e o roadmap permanecem `DRAFT_FOR_BRAINSTORM`,
enquanto contratos complementares estão `APPROVED_FOR_PHASE_1`.

**Solução aprovada para implementação:** após consolidar as decisões P0, revisar a consistência e
promover os documentos de direção para um status que represente a decisão
consolidada, registrando data e responsáveis.

### P1-09 — Bootstrap técnico Node/Web/PostgreSQL não está explicitado

**Prioridade:** importante; tratar no primeiro incremento técnico da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** ainda não há base Node/TypeScript, `package.json`, migrations,
Compose PostgreSQL ou estrutura web no repositório. Não é bloqueio de produto,
mas confirma que a Fase 1 começa do zero.

**Solução aprovada para implementação:** incluir uma tarefa explícita de bootstrap com estrutura
Node/TypeScript, API, worker, aplicação web, Compose PostgreSQL persistente e
migrations repetíveis antes das tarefas de fluxo vertical. O `package.json`
deve expor, no mínimo, comandos reproduzíveis `install`, `migrate`, `dev`,
`worker`, `test` e `e2e`.

### P1-10 — Configuração operacional local obrigatória não está documentada

**Prioridade:** importante; tratar no primeiro incremento técnico da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** `NAAMIVE_ARTIFACT_STORE_URI` e `NAAMIVE_REPOSITORY_ROOTS` são
obrigatórios, mas não há configuração de desenvolvimento documentada ou
implementada.

**Solução aprovada para implementação:** documentar e validar no startup um arquivo de exemplo
sem segredos, as variáveis obrigatórias, formatos aceitos, diretórios persistentes
e mensagens de diagnóstico. O ambiente de desenvolvimento deve falhar cedo se
o `ArtifactStore`, as raízes permitidas ou a identidade do operador não forem
configurados.

### P2-05 — Validação PostgreSQL/Compose impedida pelo sandbox atual

**Prioridade:** não bloqueante para implementação; pendência de ambiente de teste.

**Status:** `RESOLVED`.

**Evidência:** em 2026-07-30, PostgreSQL Compose local iniciou com sucesso; as
migrations foram aplicadas e um repositório Git descartável percorreu criação,
submissão assíncrona, worker, SSE, abertura do gate `REGISTER_PROJECT` e
registro final. A timeline persistida contém `PROJECT_CREATED`,
`INTAKE_SUBMITTED`, `INTAKE_VALIDATED`, `GATE_OPENED` e
`PROJECT_REGISTERED`.

**Decisão aplicada:** o ambiente Docker funcional foi usado para o aceite
local. A mesma sequência deve integrar CI com PostgreSQL efêmero.

### Fase 3 — Decisões necessárias antes da integração Git de entrega

### P1-05 — Política Git para falhas e divergências está incompleta

**Prioridade:** alta; bloquear antes da Fase 3.

**Status:** `OPEN`.

**Evidência:** branches por fase e integração foram definidas, mas faltam regras
para remoto adiantado, árvore suja, conflito fase → integração, push falho, PR
existente e branch protegida.

**Solução aprovada para implementação:** exigir árvore limpa, remoto configurado,
`integration` atualizado contra o remoto e branch de fase baseada no SHA
autorizado. Integrar `phases/<fase>` em `integration` por *merge commit*,
registrando SHA de origem, SHA resultante e evidências. Conflito, remoto
adiantado, push recusado, branch protegida ou PR inconsistente não inicia a
próxima fase: registra causa sanitizada e abre `ATENCAO_NECESSARIA` com ação de
recuperação explícita.

### P2-02 — Identidade e convenção de commits não estão definidas

**Prioridade:** média; resolver antes da Fase 3.

**Status:** `OPEN`.

**Solução aprovada para implementação:** usar `naamive-bot` como autor técnico
dos commits automatizados. A mensagem começa por `<tipo>(<work-item>):
<resumo>` e cada commit contém os trailers obrigatórios `Naamive-Project`,
`Naamive-Phase`, `Naamive-Execution` e `Naamive-Work-Item`. O operador continua
como ator auditável de comandos e gates, sem assumir autoria Git do agente.

### P2-03 — Método de integração fase → branch de integração não está escolhido

**Prioridade:** média; resolver antes da Fase 3.

**Status:** `OPEN`.

**Solução aprovada para implementação:** usar *merge commit* de
`phases/<fase>` para `integration`, sem squash ou fast-forward, preservando a
ancestralidade auditável. O registro de integração contém SHA da ponta de fase,
SHA anterior de `integration`, SHA do merge, resultado do push e referências de
evidência/validação.

### P2-04 — Estratégia de teste da integração Git remota não está definida

**Prioridade:** média; resolver antes da Fase 3.

**Status:** `OPEN`.

**Solução aprovada para implementação:** testes automatizados usam remoto bare
local temporário e proíbem URLs que não tenham sido criadas pelo teste. O smoke
autenticado usa exclusivamente repositório GitHub descartável identificado por
prefixo dedicado, com limpeza no término; falha de limpeza preserva evidência e
abre alerta, nunca usa repositório real.

### Fase 4 — Decisão necessária antes da entrega por PR

### P2-01 — Mecanismo de abertura de PR não está escolhido

**Prioridade:** média; resolver antes da Fase 4.

**Status:** `OPEN`.

**Solução aprovada para implementação:** criar adaptador isolado baseado em
`gh` autenticado. A credencial tem somente escopo mínimo para leitura/escrita no
repositório alvo e não é registrada em logs; o adaptador localiza PR draft
existente por branches e cria ou atualiza idempotentemente. Falhas de
autenticação, permissão ou rede são sanitizadas, auditadas e não avançam estado.

## Issues encontradas durante a implementação

Esta seção registra problemas reais descobertos durante a execução das tarefas
das fases. Ela é distinta das pendências de prontidão: uma pendência orienta o
planejamento; uma issue descreve uma ocorrência encontrada na implementação.
O agente deve incluir uma issue assim que a identificar, vinculá-la à tarefa
afetada e continuar todo trabalho independente que não esteja bloqueado.

| ID | Fase / tarefa | Impacto | Status | Descrição | Proposta de solução | Aprovada |
| --- | --- | --- | --- | --- | --- | --- |
| I-001 | F1-06 / F1-09 | `BLOCKING` | `RESOLVED` | A submissão bloqueava ao reservar intenção de artefato por uma segunda conexão enquanto a transação mantinha lock do projeto. | A intenção passou a usar a transação do comando; aceite HTTP PostgreSQL confirmou `ACCEPTED` e os quatro artefatos obrigatórios. | `YES` |
| I-002 | F1-13 | `NON_BLOCKING` | `RESOLVED` | A interface web da Fase 1 era funcional e responsiva, porém usava apresentação visual mínima e não comunicava adequadamente o valor do produto em demonstrações para stakeholders. | Bootstrap 5 local/versionado aplicado com cabeçalho, cartões, formulário segmentado, timeline, feedback de ação, estados vazios e decisão de gate destacados. Aceite E2E web/HTTP/SSE permaneceu aprovado; não há CDN ou dependência de rede em runtime. | `YES` |
| I-003 | F1-13 | `NON_BLOCKING` | `RESOLVED` | Ao selecionar um projeto, a UI recriava a conexão SSE durante o tratamento de cada evento e voltava a assinar a timeline desde o início, causando renderização repetida e aparência de recarregamento. | Uma assinatura SSE única é mantida por projeto; o cursor do último evento e IDs renderizados evitam duplicação; eventos atualizam apenas o resumo/gate sem limpar a timeline. Aceite E2E web/HTTP/SSE permaneceu aprovado. | `YES` |
| I-004 | F1-13 | `BLOCKING` | `OPEN` | O formulário perde todos os dados digitados quando a página é atualizada, a criação falha ou o operador navega antes de o rascunho ser persistido. A UI não informa claramente se a criação falhou nem preserva recuperação local do preenchimento, causando perda de trabalho do operador. | Implementar recuperação local versionada do formulário (localStorage, sem dados sensíveis), aviso de rascunho recuperável, indicador de salvamento e mensagens de erro acionáveis. Após `CREATE_PROJECT` bem-sucedido, persistir/atualizar o rascunho pela API e remover somente a recuperação local após confirmação. Critérios de aceite: recarregar preserva todos os campos; falha de API mantém dados e explica a próxima ação; sucesso cria projeto visível; nenhum dado é apagado sem ação explícita ou confirmação persistida. | `PENDING` |

Valores permitidos:

| Campo | Valores |
| --- | --- |
| `Impacto` | `BLOCKING`, `NON_BLOCKING` |
| `Status` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `WONT_FIX` |
| `Aprovada` | `PENDING`, `YES`, `NO`, `NOT_REQUIRED` |

Uma issue `BLOCKING` bloqueia somente a tarefa ou fase indicada; não impede o
avanço de tarefas independentes. Uma issue só passa a `RESOLVED` após a solução
ser implementada e verificada.
