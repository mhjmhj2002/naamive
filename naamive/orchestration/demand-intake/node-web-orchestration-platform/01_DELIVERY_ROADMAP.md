---
document_type: delivery-roadmap
status: APPROVED_FOR_PHASE_6
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
| Release 4 | Fase 4 | Executar agentes por Codex ou DeepSeek, com seleção/fallback auditáveis e observabilidade de IA. |
| Release 5 | Fase 5 | Confirmar uma baseline tecnológica auditável antes da primeira materialização de módulo. |
| Release 6 | Fase 6 | Supervisionar independentemente todo trabalho delegado, exigir aceite técnico e assistir bloqueios. |
| Release 7 — **MVP completo** | Fase 7 | Concluir um projeto de referência até entrega, aceite e PR draft auditáveis. |
| Release 8 | Fase 8 | Operar e recuperar a plataforma de forma sustentável após o MVP. |

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
| P1-03 | Fases 1–8 | P1 | `RESOLVED` | Releases incrementais e limite do MVP estão nomeados. |
| P1-04 | Fases 1 e 8 | P1 | `RESOLVED` | Backup manual testado na Fase 1; automação fica na Fase 8. |
| P2-05 | Fase 1 | P2 | `RESOLVED` | Compose, migrations e fluxo web completo validados em PostgreSQL local. |
| P1-05 | Fase 3 | P1 | `RESOLVED` | Política Git isolada, recuperação e causas sanitizadas foram implementadas e validadas. |
| P1-06 | Fase 1 | P1 | `RESOLVED` | Autoria de rascunho e submissão separadas no schema/runtime. |
| P1-07 | Fase 1 | P1 | `RESOLVED` | Índices únicos parciais aplicados na migration de status. |
| P1-08 | Fases 1–8 | P1 | `RESOLVED` | North Star e roadmap promovidos para aprovados na Fase 1. |
| P1-09 | Fase 1 | P1 | `RESOLVED` | Bootstrap Node/Web/PostgreSQL e comandos operacionais criados. |
| P1-10 | Fase 1 | P1 | `RESOLVED` | Configuração obrigatória validada no startup e documentada. |
| P0-13 | Fase 4 | P0 | `RESOLVED` | Governança, responsáveis, alçadas, SLA e trilha de auditoria aprovados. |
| P0-14 | Fase 4 | P0 | `RESOLVED` | Schemas, invariantes, estados e idempotência publicados e aprovados. |
| P0-15 | Fase 4 | P0 | `RESOLVED` | Ownership e limites de retry do job/provider, fallback e reconciliação aprovados. |
| P0-16 | Fase 4 | P0 | `RESOLVED` | Precedência de seleção, fallback, bloqueio e motivos estruturados aprovados. |
| P0-17 | Fase 4 | P0 | `RESOLVED` | DDL, FKs, índices, imutabilidade, retenção e restart aprovados. |
| P0-18 | Fase 4 | P0 | `RESOLVED` | DeepSeek, secrets, egress e redaction aprovados dentro dos limites registrados. |
| P0-19 | Fase 4 | P0 | `RESOLVED` | Matriz de consumidores, flags, reversão e cenários de aceite aprovados. |
| P1-11 | Fase 4 | P1 | `OPEN` | `projects.id` continua `text`; a implementação F4 usa `project_key` + UUID derivado em `agent_execution` até uma migração global de PK ser aprovada. |
| P2-01 | Fase 7 | P2 | `OPEN` | Mecanismo de abertura de PR não está escolhido. |
| P2-02 | Fase 3 | P2 | `RESOLVED` | Commits automatizados usam `naamive-bot` e trailers obrigatórios. |
| P2-03 | Fase 3 | P2 | `RESOLVED` | Integração usa merge commit auditável com SHAs e resultado de push. |
| P2-04 | Fase 3 | P2 | `RESOLVED` | Remoto bare temporário e smoke GitHub descartável com allowlist foram validados. |

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
| 2 | F2-01 | `DONE` | Cada job persiste evidência JSON estruturada e Markdown legível, ambos com hash e correlação; aceite controlado verifica o conjunto. |
| 2 | F2-02 | `DONE` | Worker serial despacha os três jobs, com lease, retry e idempotência. |
| 2 | F2-03 | `DONE` | Launcher isolado usa contexto em arquivo, timeout, saída bruta descartada e aceita somente evidência JSON estruturada; falha do smoke externo foi registrada separadamente. |
| 2 | F2-04 | `DONE` | Detalhe/SSE exibem etapa, duração, heartbeat, resultado, próxima ação e referências sanitizadas. |
| 2 | F2-05 | `DONE` | Tela/API exibem o pacote do gate, decisão versionada, feedback obrigatório e retorno a requisitos. |
| 2 | F2-06 | `DONE` | Aceite controlado cobre descoberta até o gate, ajuste, evidências e arquivamento durante job/gate. |
| 3 | F3-01 | `DONE` | Módulos e revisões imutáveis são materializados a partir de `PRODUCT_COMMITMENT`; rounds, workflows publicados, gates de aprovação/arquitetura e evidências JSON/Markdown foram validados no aceite PostgreSQL até `PLANNING_IN_PROGRESS`. |
| 3 | F3-02 | `DONE` | Planejamento materializa work items imutáveis com entradas, limites de paths, saída, critérios, dependências, matriz de QA e evidência JSON/Markdown com hash; aceite PostgreSQL validado. |
| 3 | F3-03 | `DONE` | Aceite HTTP com PostgreSQL e remoto bare temporário comprovou lease/reconciliação (`ACTIVE`, `DIRTY`, `DIVERGED`, `MISSING`), política incremental antes do QA, trailers validados na branch `work-items/<id>`, merge em `phases/3` e rework auditável; evidência: `npm run build`, `npm test` e `npm run e2e` executados em 2026-08-04. |
| 3 | F3-04 | `DONE` | `START_DEVELOPMENT` persiste intenção/operação/job antes de qualquer efeito Git; o worker leased cria e reconcilia o worktree isolado. QA deriva SHAs, commits, paths e findings auditáveis do repositório, e o aceite PostgreSQL/HTTP/E2E cobre rework, idempotência, lease e estados `DIRTY`/`MISSING`/`DIVERGED` (2026-08-04). |
| 3 | F3-05 | `DONE` | QA congela a matriz por delivery e a executa no worktree/SHA revisado, persistindo comando, diretório, timeout, critérios e resultado sanitizado em `qa-report` JSON/Markdown. Findings `DELIVERY_QA`/`CANDIDATE_VALIDATION` são deduplicados por regra/fingerprint, carregam severidade e responsabilidade; somente QA aprovada de delivery posterior os fecha com revalidação registrada. A candidata valida o manifesto congelado em worktree detached no SHA persistido e grava `integration-candidate-validation` JSON/Markdown. Aceite PostgreSQL/E2E cobre timeout sanitizado, severidade, rework/revalidação, candidata aprovada e evidências (2026-08-04). |
| 3 | F3-06 | `DONE` | Rework é uma decisão imutável por finding/delivery/SHA, com índice de exclusão para uma correção ativa por item/revisão, duas rodadas máximas e gate humano auditável para crítico, repetição, escopo, arquitetura, risco aceito ou encerramento. QA aprovado continua sendo a única revalidação que fecha finding; candidata com finding preserva a original, atribui o corretivo e reabre o módulo. Migração e aceite PostgreSQL/E2E comprovados em 2026-08-04. |
| 3 | F3-07 | `DONE` | Candidata congela SHA e manifesto integral; a tentativa e sua intenção de artefato são persistidas antes do Git. Merge/push usa worktree detached, confirma pais e SHAs, e retry/arquivamento reconciliam o remoto para distinguir `NOT_APPLIED`, `APPLIED_UNRECORDED` e `DIVERGED`. Build, testes unitários e aceite HTTP da Fase 3 verificados em 2026-08-05. |
| 3 | F3-08 | `DONE` | Projeções F3 sanitizadas exibem estado, duração, heartbeat, SHAs, evidências, findings, gates, bloqueios e próxima ação. SSE usa cursor/replay sem duplicação e a web assina os eventos F3, inclusive rework, escalonamento, candidata, integração e arquivamento. Aceite HTTP/PostgreSQL comprovou dois work items (aprovado e rejeitado), sanitização e retomada por cursor em 2026-08-05. |
| 3 | F3-09 | `DONE` | Auditoria tratada em 2026-08-05: teardown antecipado e asserção global garantem ausência de `.phase3-http-*`; o aceite HTTP passou 5/5 e o aceite global passou após a implementação ser versionada no commit `a1787a7`. |
| 4 | F4-01 | `DONE` | Contratos canônicos Draft 2020-12 são carregados dos schemas oficiais, validados via AJV e cobertos por testes de request/result inválidos e sem conteúdo bruto. |
| 4 | F4-02 | `DONE` | `AgentExecutionService` virou a porta única por flag para jobs de descoberta, persistindo execução/tentativa, idempotência por `(job_id,idempotency_key)`, evidência sanitizada e reconciliação agendada. |
| 4 | F4-03 | `DONE` | `CodexCliAdapter` encapsula o launcher atual com paridade Codex-only sob flag, preservando workdir/timeout/sanitização e validado no aceite F4 de 2026-08-06. |
| 4 | F4-04 | `DONE` | `OpenAiCompatibleHttpAdapter` limita endpoint/modelo DeepSeek aprovados, usa `SecretResolver`, classifica 429/auth/quota e roda deterministicamente por cenários controlados. |
| 4 | F4-05 | `DONE` | Políticas publicadas e versionadas escolhem primário/fallback com motivo estruturado, respeitando classificação, paths, flags DeepSeek e indisponibilidade conhecida por execução. |
| 4 | F4-06 | `DONE` | Retry no mesmo runtime, fallback único, bloqueio sem ping-pong e reconciliação de tentativas `DISPATCHED` foram persistidos e verificados nos cenários controlados. |
| 4 | F4-07 | `DONE` | Quota DeepSeek/Codex é normalizada separando `RATE_LIMITED` de `QUOTA_EXHAUSTED`, com fallback autorizado e bloqueio recuperável quando ambos esgotam. |
| 4 | F4-08 | `DONE` | Migration `025_phase_4_agent_runtime.sql`, cadastro auditável de runtimes/políticas, `EnvironmentSecretResolver`, classificação/egress e redaction foram aplicados e testados. |
| 4 | F4-09 | `DONE` | Timeline, artefatos, auditoria e uso/custo sanitizados cobrem seleção, tentativa, fallback, bloqueio e sucesso sem persistir segredo, prompt ou saída bruta. |
| 4 | F4-10 | `DONE` | API/detail/web/SSE projetam execuções, tentativas, política, runtime efetivo e próxima ação sob flag, com replay sem duplicação e campos sensíveis filtrados. |
| 4 | F4-11 | `DONE` | Suítes unitárias + E2E PostgreSQL agora cobrem contratos, paridade Codex-only, fallback para DeepSeek, bloqueio por quota e sanitização; `npm run migrate && npm test && npm run e2e` passaram em 2026-08-06. |
| 4 | F4-12 | `DONE` | Worker/consumidores usam o serviço por flags desligadas por padrão, mantendo rollback para novos jobs sem reabrir dispatch incerto nem restaurar chamadas diretas. |
| 5 | F5-01 | `DONE` | Contratos neutros TypeScript e JSON Schema Draft 2020-12 publicados, com validação de payload, enums canônicos e rejeição de texto tecnológico livre. |
| 5 | F5-02 | `DONE` | Migration `026_phase_5_technology_catalog.sql` criou catálogo versionado, snapshots e inventário read-only sanitizado, com guards de imutabilidade. |
| 5 | F5-03 | `DONE` | Migration `027_phase_5_baseline_context.sql` persiste contextos, baselines, revisões, gates e referências propagadas com FKs e invariantes. |
| 5 | F5-04 | `DONE` | Seis seeds versionados validam envelope comum, categorias, itens, perfis e regras da revisão inicial. |
| 5 | F5-05 | `DONE` | Publicador transacional/idempotente valida o pacote, congela o snapshot publicado e registra hash, ator, correlação e evidência. |
| 5 | F5-06 | `DONE` | Avaliador genérico aplica `REQUIRES`, `CONFLICTS_WITH` e `RECOMMENDS` por severidade, direção, escopo e versão. |
| 5 | F5-07 | `DONE` | Validador genérico cobre cardinalidade, precedência de classificação e deferimento explícito sem item tecnológico sentinela. |
| 5 | F5-08 | `DONE` | `START_TECHNOLOGY_INVENTORY` inspeciona worktree detached no SHA reservado e persiste somente fatos sanitizados resolvidos no snapshot publicado. |
| 5 | F5-09 | `DONE` | `PREPARE_TECHNOLOGY_SELECTION_CONTEXT` fixa snapshot publicado, perfil e regras imutáveis antes da criação da baseline. |
| 5 | F5-10 | `DONE` | Migration `029_phase_5_workflow_v3.sql` publicou `PROJECT_DISCOVERY` v3 e a seleção atômica preserva projetos v2 existentes. |
| 5 | F5-11 | `DONE` | Baseline `DRAFT` expande o perfil do contexto imutável, valida referências, cardinalidade e compatibilidade e registra evidência auditável. |
| 5 | F5-12 | `DONE` | Submissão e gate versionado aprovam ou rejeitam a baseline com decisão, hash e evidência imutáveis. |
| 5 | F5-13 | `DONE` | Revisões sucessoras preservam linhagem, numeração monotônica, contextos superseded e contratos já aprovados. |
| 5 | F5-14 | `DONE` | A baseline aprovada bloqueia a primeira materialização e é propagada a módulo, work item, QA, entrega, findings e Dev, preservando o legado v2. |
| 5 | F5-15 | `DONE` | API expõe somente snapshots e opções selecionáveis e aceita payloads de baseline apenas por referências catalogadas. |
| 5 | F5-16 | `DONE` | Projeções e SSE publicam eventos sanitizados e auditáveis da baseline; a TD-F5-001 permanece aberta somente para consolidar a cobertura E2E desses eventos. |
| 5 | F5-17 | `DONE` | Interface web dirigida por dados apresenta inventário, baseline, gate e bloqueio de materialização, mantendo a jornada legada disponível. |
| 5 | F5-18 | `DONE` | Testes unitários e de persistência cobrem contratos, imutabilidade, idempotência, cardinalidade e compatibilidade. |
| 5 | F5-19 | `DONE` | Testes de integração cobrem inventário, workflow, gate e evolução por nova revisão sem alterar registros autorizados. |
| 5 | F5-20 | `DONE` | Regressões da Fase 3 confirmam coexistência do legado e propagação obrigatória da baseline em projetos v3. |
| 5 | F5-21 | `DONE` | Aceite consolidado validou a jornada versionada Catálogo → Perfil → Projeto → Baseline → Módulo e a preservação do legado. |
| 6 | F6-01 | `DONE` | Contratos JSON Schema fechados/versionados e política opt-in validados. |
| 6 | F6-02 | `DONE` | Persistência aditiva, constraints, idempotência e sanitização completas nas migrations 044–047. |
| 6 | F6-03 | `DONE` | Reviewer validado pelo servidor com identidade congelada e independência verificável. |
| 6 | F6-04 | `DONE` | Handoff cria aceite e dispatch de review automaticamente na mesma transação. |
| 6 | F6-05 | `DONE` | Worker de review aplica `ACCEPT`, `REWORK`, `BLOCK` e `ESCALATE` sem autoaceite. |
| 6 | F6-06 | `DONE` | Findings, rework e re-review preservam a coleção e a autoridade da Fase 3. |
| 6 | F6-07 | `DONE` | Gestão de blocks e assistência estruturada com decisões reservadas preservadas. |
| 6 | F6-08 | `DONE` | Routing, advisory e gates humanos autenticados, limitados e auditados. |
| 6 | F6-09 | `DONE` | Handoff de bloqueio e reconciliação idempotente certificados com regressão F3/F4/F5. |
| 6 | F6-10 | `DONE` | APIs e comandos governados expõem somente projeções sanitizadas. |
| 6 | F6-11 | `DONE` | Auditoria, métricas e SSE com cursor/replay/reconexão validados. |
| 6 | F6-12 | `DONE` | UI operacional de assurance, blocks, gates e reconciliação validada em navegador real. |
| 6 | F6-13 | `DONE` | Migration repetível, rollout opt-in e coexistência histórica certificados. |
| 6 | F6-14 | `DONE` | Unitários, contratos, persistência e idempotência cobertos. |
| 6 | F6-15 | `DONE` | Integração e 67 jornadas E2E obrigatórias aprovadas contra PostgreSQL. |
| 6 | F6-16 | `DONE` | Regressões das Fases 3, 4 e 5 aprovadas sem alterar dispatches fora da política. |
| 6 | F6-17 | `DONE` | Aceite consolidado aprovado em 2026-08-14 com build, migration, testes e E2E verdes. |
| 7 | F7-01 | `TO DO` | — |
| 7 | F7-02 | `TO DO` | — |
| 7 | F7-03 | `TO DO` | — |
| 7 | F7-04 | `TO DO` | — |
| 7 | F7-05 | `TO DO` | — |
| 7 | F7-06 | `TO DO` | — |
| 7 | F7-07 | `TO DO` | — |
| 7 | F7-08 | `TO DO` | — |
| 8 | F8-01 | `TO DO` | — |
| 8 | F8-02 | `TO DO` | — |
| 8 | F8-03 | `TO DO` | — |
| 8 | F8-04 | `TO DO` | — |
| 8 | F8-05 | `TO DO` | — |

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

### Questões de planejamento a decidir antes da implementação

1. **Início e estados:** qual comando inicia o ciclo em `REGISTERED` e quais
   estados/gatilhos versionados conduzem análise, requisitos, revisão e
   `PRODUCT_COMMITMENT`?
2. **Evidências mínimas:** quais schemas e artefatos canônicos de análise,
   proposta de módulos, requisitos e revisão cada etapa deve produzir?
3. **Execução Codex:** quais timeout, retry, evidência sanitizada e tratamento
   de falha o adaptador Node aplica antes de solicitar uma transição?
4. **Experiência do operador:** quais projeções, heartbeat, duração, evidências
   e próxima ação a web exibe em cada etapa, sem simular progresso?
5. **Gate e aceite:** quais dados entram na decisão de `PRODUCT_COMMITMENT` e
   como o E2E controlado valida o fluxo sem depender da variabilidade da IA?
6. **Decisão de módulos — RESOLVIDA:** no gate, o operador aprova/rejeita o pacote inteiro
   ou seleciona módulos individualmente, preservando a decisão auditável de
   cada módulo?
7. **Workflow publicado — RESOLVIDA:** quais códigos exatos de estados, triggers, guards e
   effects compõem `PROJECT_DISCOVERY` v1, incluindo ajustes e arquivamento
   global?
8. **Launcher Codex — RESOLVIDA:** qual comando/launcher suportado, diretório de trabalho,
   identidade e limite de permissões o adaptador Node usa no ambiente local?

**Decisão inicial — início e jobs:** o botão/comando será
`START_PRODUCT_DISCOVERY` (**Iniciar descoberta do produto**), disponível apenas
em `REGISTERED` e com retorno imediato `ACCEPTED`. O fluxo inicial será
sequencial: `ANALYZE_PRODUCT_NEED` → `DEFINE_PRODUCT_REQUIREMENTS` →
`REVIEW_PRODUCT_COMMITMENT` → gate `PRODUCT_COMMITMENT`. Cada job recebe o
intake e as evidências anteriores, persiste evidência sanitizada e solicita a
transição; o workflow permanece soberano. Revisão com ajustes cria findings e
retorna somente para requisitos. Esta decisão será validada pelo aceite
controlado antes de adicionar gates intermediários ou novos jobs.

**Decisão inicial — evidências:** cada job grava JSON estruturado e Markdown
legível no ArtifactStore, com `schema_version`, projeto, operação, job, hashes
e referências das evidências de entrada. `ANALYZE_PRODUCT_NEED` produz
`product-need-analysis` com problema, público, objetivos, riscos, hipóteses,
lacunas, perguntas abertas e **sugestões** de módulos. `DEFINE_PRODUCT_REQUIREMENTS`
produz `product-requirements` com escopo, fora de escopo, requisitos, critérios
de sucesso, restrições de negócio, dependências e a lista **consolidada** de
módulos candidatos. `REVIEW_PRODUCT_COMMITMENT` produz
`product-commitment-review` com findings, riscos, recomendação e resultado
`READY_FOR_GATE` ou `REQUIRES_ADJUSTMENT`. O gate registra
`product-commitment-decision` com decisão, feedback, versão e referências das
três evidências anteriores.

**Decisão inicial — execução Codex:** o adaptador executa um job por vez, com
intake/evidências anteriores como contexto, evidência estruturada e Markdown
legível, sem persistir prompt completo, saída bruta, tokens ou segredos. O
timeout padrão é **10 minutos**, com **duas tentativas adicionais** para falhas
transitórias e heartbeat a cada 30 segundos. Esses valores serão lidos de
configuração de ambiente (`NAAMIVE_AGENT_TIMEOUT_SECONDS`,
`NAAMIVE_AGENT_MAX_RETRIES` e `NAAMIVE_AGENT_HEARTBEAT_SECONDS`), para ajuste
operacional sem mudança de código. Sucesso apenas solicita transição ao
workflow; falha permanente permanece auditável e exige ação explícita.

**Decisão inicial — experiência do operador:** a web mostra poucos status de
negócio, etapa atual, duração real, heartbeat, próxima ação e timeline de
marcos persistidos. Cada status/evento exibe timestamp completo em horário
local (**data, hora, minuto e segundo**) para permitir acompanhamento das
janelas de execução. Na Fase 2, evidências aparecem como resumo sanitizado,
tipo, hash e data; abertura do conteúdo completo permanece fora da tela inicial
e será evoluída somente quando houver autorização de acesso adequada.

**Decisão inicial — gate e aceite:** `REVIEW_PRODUCT_COMMITMENT` com
`READY_FOR_GATE` abre `PRODUCT_COMMITMENT` contendo resumos, módulos
consolidados, parecer, riscos/findings, hashes e timestamps. O operador pode
aprovar, alcançando `PRODUCT_COMMITMENT`, ou solicitar ajustes com feedback
obrigatório, retornando somente a requisitos e nova revisão. O E2E usa
adaptador controlado/determinístico para cobrir aprovação e ajustes; execução
real do Codex é smoke separado.

**Decisão inicial — cancelamento/arquivamento global:** `ARCHIVE_PROJECT` é uma
ação administrativa disponível em qualquer estado ativo do ciclo de vida,
inclusive durante análise, requisitos, revisão ou gate; ela não depende nem é
bloqueada por uma decisão de gate. A web exige apenas confirmação explícita
(`Você realmente quer cancelar e arquivar este projeto?`) e motivo. O runtime
interrompe/cancela de forma governada qualquer job ativo, registra evento e
evidência de arquivamento e então aplica o arquivamento lógico definido em
I-005. Projetos já arquivados não oferecem a ação novamente.

**Decisão final — módulos no gate:** `PRODUCT_COMMITMENT` aprova ou solicita
ajustes sobre o pacote consolidado inteiro; não haverá seleção individual de
módulos na Fase 2. A análise sugere e requisitos consolida os módulos. Decisão
por módulo pertence à Fase 3, quando cada módulo passa a ter ciclo próprio.

**Decisão final — workflow `PROJECT_DISCOVERY` v1:** estados e transições
publicados: `REGISTERED` -- `START_PRODUCT_DISCOVERY` →
`ANALYSIS_IN_PROGRESS` → `REQUIREMENTS_IN_PROGRESS` →
`REVIEW_IN_PROGRESS` → `WAITING_FOR_PRODUCT_COMMITMENT`; aprovação do gate leva
a `PRODUCT_COMMITMENT` e solicitação de ajustes retorna a
`REQUIREMENTS_IN_PROGRESS`. De qualquer estado ativo,
`ARCHIVE_PROJECT` leva a `ARCHIVING` e, após cancelamento governado de trabalho
ativo e evidência válida, a `ARCHIVED`. Guards exigem estado de origem, lease e
idempotência válidos, evidência completa, versão atual de gate e, para
arquivamento, confirmação e motivo.

**Decisão final — launcher Codex:** o adaptador Node invoca processo filho por
`NAAMIVE_CODEX_COMMAND=codex`, usa workdir temporário por execução em
`NAAMIVE_CODEX_WORKDIR` fora do repositório NAAMIVE e respeita
`NAAMIVE_CODEX_TIMEOUT_SECONDS`. Contexto é entregue em arquivo estruturado
temporário, nunca por argumentos de shell; ambiente é mínimo e stdout/stderr
brutos não são persistidos. Timeout encerra o processo e registra falha
auditável. O launcher só devolve resultado/evidência sanitizados e nunca altera
estado canônico diretamente.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F2-01 | Portar análise, proposta de módulos, requisitos e revisão com testes de paridade críticos. | Regressão do Python; mapear cada controle relevante para teste Node. |
| F2-02 | Evoluir o worker para despachar jobs de análise, requisitos e revisão, sempre um por vez. | Despacho duplicado; reutilizar lock global e idempotência da Fase 1. |
| F2-03 | Implementar adaptador Codex Node isolado, com timeout, sanitização, evidência e pedido de transição. | Autenticação/sandbox; formalizar launcher/CI suportado. |
| F2-04 | Evoluir timeline SSE com agente, fase, duração, heartbeat, evidência, resultado e próxima ação. | CLI não fornece progresso interno confiável; heartbeat prova vida do worker. |
| F2-05 | Implementar tela de compromisso com proposta, requisitos, módulos candidatos, aprovação/rejeição e feedback. | Decisão concorrente; versão do gate é validada pela API. |
| F2-06 | Criar teste de aceite web até compromisso, com eventos e evidências correlacionados. | IA é variável; usar adaptador controlado em teste e smoke separado. |

## Fase 3 — Ciclo de módulo, desenvolvimento e QA com rework

**Status atual da fase:** `DONE` — I-024 foi corrigido e o aceite HTTP confirmou que a proposta completa chega ao gate antes da decisão.

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
| F3-08 | Implementar visão web de entrega, QA, findings, correções e revalidações por work item. | A aprovação inicial exibe a proposta completa e diferencia proposta de entrega/deploy. |
| F3-09 | Criar teste de aceite web de finding que retorna ao Dev e fecha após QA aprovar. | Cobrir também timeout, interrupção e causa sanitizada. |

### Registro de auditoria — 2026-08-05

**Resultado inicial:** Fase 3 foi rebaixada para `DOING`; F3-09 foi reaberta. Build, testes unitários e E2E anteriores não demonstravam integralmente o critério obrigatório de aceite web.

**Achados bloqueantes registrados:** o cenário HTTP usava só um work item; o rework forçava estado e liberação de worktree via SQL; o cenário PostgreSQL alterava estado e matriz de QA diretamente; faltavam asserções do segundo pai do merge, dos commits introduzidos e da exclusão do item pendente; havia diretórios `.phase3-http-*` residuais.

**Tratativa aplicada:** QA reprovado agora libera o worktree pela transição governada para que o worker crie a nova execução. O aceite HTTP passou a criar dois itens isolados: um é aprovado e integrado; o outro reprova, cria finding, recebe decisão de rework pela API, é revalidado e permanece fora da candidata. O teste também verifica o SHA congelado como segundo pai, a igualdade dos conjuntos de commits e a exclusão do item pendente. O aceite PostgreSQL deixou de alterar estado de worktree ou matriz de QA diretamente.

**Encerramento por limpeza:** a auditoria encontrou um diretório `.phase3-http-*` após a execução completa. O teardown dos cenários que criam repositórios agora é registrado antes de qualquer efeito de banco ou servidor e sempre remove a raiz em `finally`; o aceite HTTP também possui asserção global que falha se qualquer `.phase3-http-*` restar. A implementação, migrations e testes foram versionados no commit `a1787a7`; o aceite HTTP passou 5/5 e o aceite global final passou sem diretórios residuais. F3-09 e a Fase 3 foram promovidas para `DONE`.

## Fase 4 — Runtimes configuráveis Codex e DeepSeek

**Valor entregue:** o operador cadastra e reconfigura AI Runtimes Codex e
DeepSeek por PostgreSQL, sem deploy quando o adapter já existe, e executa agentes
por seleção determinística, fallback governado, evidência de tentativas e
observabilidade sem credenciais.

**Demonstração ponta a ponta:** a web cadastra `codex-dev` e `deepseek-dev`,
associa-os à política e inicia um agente. A execução congela a versão do runtime;
trocar modelo ou segredo cria nova versão sem afetá-la. Indisponibilidade ou quota
classificada aciona o runtime de contingência apenas quando permitido, valida saída
estruturada e mostra política, runtime, adapter type,
tentativas, duração, uso/custo disponível, erro sanitizado e evidências. Se os
dois estiverem indisponíveis, bloqueia o trabalho com próxima ação clara. Nenhum
fluxo de negócio conhece um executor específico.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F4-01 | Publicar contratos versionados para solicitação, tentativa, resultado, AI Runtime, adapter type, `SecretReference` e `SecretResolver`. | Não expor SDK, executor concreto ou segredo no contrato. |
| F4-02 | Criar `AgentExecutionService` como única entrada de jobs para agentes. | Worker não importa launcher ou cliente de executor. |
| F4-03 | Implementar adapter `CODEX_CLI` com paridade do launcher e autenticação por sessão. | Preservar workdir, timeout, sanitização e transição indireta. |
| F4-04 | Implementar adapter `OPENAI_COMPATIBLE_HTTP` para DeepSeek, após confirmar compatibilidade. | Segredo, endpoint e modelo ficam externos e allowlisted. |
| F4-05 | Publicar políticas determinísticas entre agentes e AI Runtimes persistidos. | Sem IA, catálogo ou preço de mercado para selecionar runtime. |
| F4-06 | Implementar retry limitado e fallback bidirecional governado. | Não duplicar efeitos, não burlar segurança e não alternar infinitamente. |
| F4-07 | Detectar e tratar quota/créditos esgotados. | Ambos indisponíveis bloqueiam o trabalho com próxima ação explícita. |
| F4-08 | Persistir/versionar AI Runtimes e aplicar `EnvironmentSecretResolver`, classificação, sanitização e controles. | Sem API keys no banco; bloqueio de política/segurança não faz fallback. |
| F4-09 | Persistir decisão, versões congeladas, tentativas imutáveis, auditoria, uso, custo e evidências correlacionadas. | Não persistir prompts, respostas brutas ou segredos. |
| F4-10 | Exibir execução, tentativas, quota, fallback e bloqueios por web/SSE. | Sem inferência local por timer. |
| F4-11 | Cobrir unitários, integração, aceite controlado e smoke externo opcional. | Smoke não bloqueia testes determinísticos. |
| F4-12 | Migrar consumidores, provar modo Codex-only e remover acoplamentos diretos. | Corte somente após matriz de paridade. |

**Gate de início — GO:** ADR, plano e pacote de prontidão foram aprovados em
2026-08-06, com responsáveis, limites de egress/custo e cenários de corte
registrados. A implementação pode iniciar respeitando essas restrições.

## Fase 5 — Baseline tecnológica antes dos módulos

**Status:** concluída e validada. As implementation tasks F5-01 a F5-21
estão `DONE`; a dívida TD-F5-001 permanece `OPEN` exclusivamente como melhoria
futura de cobertura automatizada, sem pendência funcional da Fase 5.

**Valor entregue:** após o compromisso de produto, o operador revisa e aprova
orientações técnicas auditáveis antes de materializar o primeiro módulo. A
baseline registra fatos sanitizados do repositório, restrições, preferências e
decisões explicitamente delegadas à arquitetura de cada módulo.

**Demonstração ponta a ponta:** um projeto novo chega ao compromisso de produto,
gera inventário read-only no SHA vinculado, recebe baseline com decisão aberta
para o banco e só libera a criação do primeiro módulo após o gate humano. A
revisão aprovada acompanha o módulo e seus contratos de implementação, sem
alterar projetos legados ou módulos já autorizados.

| ID | Tarefa e definição de pronto | Impedimento / tratamento | Status |
| --- | --- | --- | --- |
| F5-01 | Publicar `PROJECT_DISCOVERY` v3 com estados, guards e gate de baseline, preservando v2 para legados. | Não migrar silenciosamente projeto em andamento ou módulo já criado. | `DONE` |
| F5-02 | Gerar inventário tecnológico read-only, sanitizado e vinculado ao SHA reservado. | Não executar código do repositório nem expor conteúdo sensível. | `DONE` |
| F5-03 | Persistir baseline, revisões, decisões abertas e evidências imutáveis com schema versionado. | Rejeitar classificações ou ranges contraditórios antes do gate. | `DONE` |
| F5-04 | Exibir inventário, orientações e gate humano por web/SSE com projeções sanitizadas. | O navegador não calcula nem envia fatos tecnológicos. | `DONE` |
| F5-05 | Bloquear a primeira materialização até haver baseline aprovada e manter o fluxo legado explícito. | Rotas alternativas e workers obedecem ao mesmo guard transacional. | `DONE` |
| F5-06 | Propagar a revisão aprovada a módulo, arquitetura, work item, QA, entrega e execução Dev. | FKs/guards impedem referência nula, divergente ou não aprovada. | `DONE` |

## Fase 6 — Agent Supervision & Assurance

**Valor entregue:** cada trabalho delegado passa por revisão independente antes
de ser tecnicamente aceito; bloqueios deixam de ser texto livre ou falha opaca
e recebem diagnóstico, alternativas, roteamento especializado e escalonamento
rastreáveis. `EXECUTION_SUCCEEDED != WORK_ACCEPTED`.

**Demonstração ponta a ponta:** uma execução produtora submete saída; um reviewer
independente confronta despacho, critérios, artefatos e evidências; findings
exigem rework delimitado e nova revisão. Uma execução bloqueada cria um block
estruturado, recebe assistência e, quando necessário, é roteada a especialista
ou à decisão humana, sem alterar silenciosamente requisitos, arquitetura ou
política.

O detalhamento normativo desta fase está em
[15_PHASE_6_AGENT_SUPERVISION_AND_ASSURANCE.md](15_PHASE_6_AGENT_SUPERVISION_AND_ASSURANCE.md).
Esta fase é implementada de forma aditiva e opt-in; não retroaltera o runtime,
contratos ou comportamento certificado das
Fases 3, 4 e 5.

| ID | Tarefa de implementação e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F6-01 | Publicar contratos e política versionada, fechada e opt-in de assurance. | Não duplicar contratos nem mudar o caminho F4 legado. |
| F6-02 | Criar persistência aditiva, constraints transacionais e limites de dados sanitizados. | Não reinterpretar legado nem introduzir cascata destrutiva. |
| F6-03 | Selecionar reviewer com independência verificável e exceção humana limitada. | Nunca permitir auto-review ou exceção de `agent_id`. |
| F6-04 | Converter sucesso de produção F6 em `OUTPUT_SUBMITTED` e `PENDING_REVIEW` de modo idempotente. | Não concluir job/operação nem promover workflow. |
| F6-05 | Executar review independente e aplicar decisão terminal; `BLOCK` cria/correlaciona block na mesma transação. | Apenas `ACCEPT` promove efeito de negócio. |
| F6-06 | Integrar findings e rework à coleção/autoridade F3. | Não criar fluxo paralelo, terceira rodada ou autoateste. |
| F6-07 | Gerir blocks e assistência estruturada como fonte de verdade F6. | Assistência recomenda, mas não altera decisão reservada. |
| F6-08 | Aplicar routing por categoria, advisory e gates humanos auditados. | Não criar papel/agente sem responsabilidade distinta. |
| F6-09 | Executar handoff bloqueável e reconciliação idempotente. | Preservar terminação F4 fora da política F6. |
| F6-10 | Expor APIs e comandos governados, incluindo reconciliação manual do On-call Owner. | Não expor dados brutos ou aceitar decisão sem autoridade. |
| F6-11 | Publicar auditoria, métricas e SSE sanitizados. | Projeções não podem mutar estado canônico. |
| F6-12 | Entregar UI de supervision, blocks e reconciliação manual autorizada. | Client não deriva aceite, autoridade ou transição. |
| F6-13 | Executar migration, rollout e reversão controlada. | A reversão só alcança novos dispatches. |
| F6-14 | Cobrir unitários, persistência e idempotência. | Sem serviços externos, credenciais ou casos não determinísticos. |
| F6-15 | Demonstrar integração e E2E dos cenários normativos. | Nenhuma informação sensível em evidências/UI/SSE. |
| F6-16 | Certificar regressão e coexistência F3/F4/F5. | Diferença de comportamento só em dispatch F6 opt-in. |
| F6-17 | Consolidar aceite integral da Fase 6. | Não marcar `DONE` sem todos os cenários verdes. |

## Fase 7 — Projeto entregue e aceito pela web

**Valor entregue:** o operador conduz um projeto de referência até entrega,
incluindo integração, validação, risco, release, aceite e consulta completa de
evidências/auditoria no navegador.

**Demonstração ponta a ponta:** projeto criado pela web percorre gates
aplicáveis, produz aplicação, testes e documentação, e alcança `DELIVERED` com
pacote e aceite auditáveis. Toda execução de agente usa exclusivamente
`AgentExecutionService` e políticas publicadas da Fase 4.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F7-01 | Portar integração, validação de qualidade/segurança e relatórios. | Contratos entre módulos; validar versão e hash antes de integrar. |
| F7-02 | Portar gates de risco, release, aceite e rejeição com rework guiado. | Regras de risco precisam ser acordadas; começar com políticas explícitas. |
| F7-03 | Mostrar pacote, aplicação, testes, documentação e registros canônicos na web. | Artefatos grandes/sensíveis; servir apenas referências autorizadas. |
| F7-04 | Abrir/atualizar um PR draft de `integration` → `main`, registrando URL, número, branch e SHAs. | GitHub exige credencial de push/PR com escopo mínimo. |
| F7-05 | Tornar pausa, retomada, timeout, interrupção e cancelamento acionáveis e explicáveis na web. | Cancelamento deve ser atômico; testar falha antes de persistir evidência. |
| F7-06 | Definir projeto de referência descartável e isolado. | Não reutilizar projeto real. |
| F7-07 | Criar teste de aceite web completo até `DELIVERED`; merge em `main` permanece humano. | Combinar testes controlados e smoke autenticado. |
| F7-08 | Executar corte controlado: confirmar matriz de paridade, arquivar evidência legada e remover runtime Python deprecated. | Não remover enquanto houver controle, teste, documentação ou operação sem substituto Node. |

## Fase 8 — Operação sustentável e expansão segura

**Valor entregue:** a plataforma é operável com telemetria, backup, deploy e recuperação; fica preparada para evolução posterior a múltiplos usuários/organizações sem reescrita estrutural.

**Demonstração ponta a ponta:** simular falha de worker/serviço, recuperar operação sem perda de auditoria e consultar métricas, logs e runbook.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F8-01 | Instrumentar logs, métricas, tracing e alertas correlacionando API, worker, operação e evento. | Volume de eventos; definir retenção e agregação. |
| F8-02 | Automatizar build, migração, backup, rollback e runbooks testados. | Infraestrutura indefinida; manter contrato independente de provedor. |
| F8-03 | Formalizar segredos, configuração e operação dos adapters; somente ambiente atestado, sem credenciais em logs. | Ambientes locais heterogêneos; documentar suporte explícito. |
| F8-04 | Preparar fronteira de organização/ator sem habilitar multitenancy no MVP. | Não antecipar telas ou permissões. |
| F8-05 | Criar teste de resiliência: restart com volume persistente e restore de backup preservam estado, idempotência e auditoria. | Injetar falhas controladas; reconstrução por ledger não pertence ao MVP. |

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

### Fase 4 — Bloqueadores de início

**Decisão de prontidão:** `GO`. A aprovação explícita de 2026-08-06 resolveu os
sete bloqueadores abaixo; mudanças futuras de egress, custo, credencial, modelo
ou override continuam sujeitas à governança do pacote de prontidão.

### P0-13 — Governança, aprovações e responsáveis não estão concluídos

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** `14_PHASE_4_IMPLEMENTATION_READINESS_PACKAGE.md`,
**P0-13 — Governança**, com owners e alçadas nomeados.

### P0-14 — Contratos e ciclo de vida de execução não são executáveis

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** `phase-4-contracts/` e pacote de prontidão, **P0-14 —
Contratos e ciclo de vida**.

### P0-15 — Retry de provider conflita com o retry existente do job

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** pacote de prontidão, **P0-15 e P0-16 — Retry, fallback e
reconciliação**.

### P0-16 — Seleção e fallback entre executores não são determinísticos o suficiente

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** pacote de prontidão, **P0-15 e P0-16 — Retry, fallback e
reconciliação**.

### P0-17 — Persistência e operação não têm contrato físico

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** pacote de prontidão, **P0-17 — Contrato físico e
restart**.

### P0-18 — Configuração e segurança permanecem abertas

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** pacote de prontidão, **P0-18 — DeepSeek, secrets e
egress**, com DeepSeek habilitado para `PUBLIC`.

### P0-19 — Corte e aceite não possuem matriz verificável

**Prioridade:** bloqueador para a Fase 4. **Status:**
`RESOLVED`.

**Evidência aprovada:** pacote de prontidão, **P0-19 — Corte, flags e aceite**.

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
pelas Fases 1–7; a Fase 8 é evolução operacional posterior ao MVP. A Fase 4
é uma capacidade de runtime e a Fase 6 assegura trabalho delegado antes do fechamento funcional.

### P1-04 — Backup manual da Fase 1 e automação da Fase 8 se confundem

**Prioridade:** alta; resolver antes de definir o aceite operacional da Fase 1.

**Status:** `RESOLVED`.

**Evidência:** backup/restore e dump antes de migration destrutiva aparecem na
Fase 1 e novamente na automação operacional da Fase 8, sem separar o nível de
entrega esperado em cada uma.

**Decisão aplicada:** `05_PHASE_1_PLATFORM_OPERATIONS_CONTRACT.md` limita a
Fase 1 a backup/restore manual testado e reserva agendamento, retenção, rollback
automatizado, alertas e runbooks para a Fase 8.

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

**Status:** `RESOLVED`.

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

**Status:** `RESOLVED`.

**Solução aprovada para implementação:** usar `naamive-bot` como autor técnico
dos commits automatizados. A mensagem começa por `<tipo>(<work-item>):
<resumo>` e cada commit contém os trailers obrigatórios `Naamive-Project`,
`Naamive-Phase`, `Naamive-Execution` e `Naamive-Work-Item`. O operador continua
como ator auditável de comandos e gates, sem assumir autoria Git do agente.

### P2-03 — Método de integração fase → branch de integração não está escolhido

**Prioridade:** média; resolver antes da Fase 3.

**Status:** `RESOLVED`.

**Solução aprovada para implementação:** usar *merge commit* de
`phases/<fase>` para `integration`, sem squash ou fast-forward, preservando a
ancestralidade auditável. O registro de integração contém SHA da ponta de fase,
SHA anterior de `integration`, SHA do merge, resultado do push e referências de
evidência/validação.

### P2-04 — Estratégia de teste da integração Git remota não está definida

**Prioridade:** média; resolver antes da Fase 3.

**Status:** `RESOLVED`.

**Solução aprovada para implementação:** testes automatizados usam remoto bare
local temporário e proíbem URLs que não tenham sido criadas pelo teste. O smoke
autenticado usa exclusivamente repositório GitHub descartável identificado por
prefixo dedicado, com limpeza no término; falha de limpeza preserva evidência e
abre alerta, nunca usa repositório real.

### Fase 7 — Decisão necessária antes da entrega por PR

### P2-01 — Mecanismo de abertura de PR não está escolhido

**Prioridade:** média; resolver antes da Fase 7.

**Status:** `OPEN`.

**Solução aprovada para implementação:** criar adaptador isolado baseado em
`gh` autenticado. A credencial tem somente escopo mínimo para leitura/escrita no
repositório alvo e não é registrada em logs; o adaptador localiza PR draft
existente por branches e cria ou atualiza idempotentemente. Falhas de
autenticação, permissão ou rede são sanitizadas, auditadas e não avançam estado.

## Dívidas técnicas

| ID | Categoria | Origem | Status | Descrição | Critério de encerramento |
| --- | --- | --- | --- | --- | --- |
| TD-F5-001 — Consolidar cenário E2E da sequência completa dos eventos da Technology Baseline | `Technical Debt / Test Coverage` | F5-16 — SSE e projeção da Technology Baseline | `OPEN` | A implementação funcional da F5-16 está concluída. A cobertura automatizada permanece distribuída entre os testes de contexto de seleção, inventário, baseline gate, baseline revision, replay por cursor e ArtifactStore. Durante a implementação foi tentada a criação de um cenário E2E único para a Technology Baseline; problemas de isolamento do harness levaram à reversão dessa tentativa para preservar a estabilidade da suíte. Permanece como melhoria futura um cenário dedicado que valide `TECHNOLOGY_SELECTION_CONTEXT_READY`, `TECHNOLOGY_INVENTORY_STARTED`, `TECHNOLOGY_INVENTORY_READY`, `TECHNOLOGY_BASELINE_SUBMITTED`, `TECHNOLOGY_BASELINE_APPROVED`, `TECHNOLOGY_BASELINE_ADJUSTMENTS_REQUESTED` e `TECHNOLOGY_BASELINE_REVISION_STARTED`, além de replay por cursor, ausência de duplicação e consistência dos `evidence_hash`. Esta dívida técnica **não representa limitação funcional da Fase 5**; registra exclusivamente uma melhoria futura de cobertura automatizada de integração. | Criar cenário E2E isolado que percorra integralmente o fluxo da Technology Baseline e valide a sequência completa dos eventos da F5-16. |

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
| I-004 | F1-13 | `BLOCKING` | `RESOLVED` | O formulário perdia todos os dados digitados quando a página era atualizada, a criação falhava ou o operador navegava antes de o rascunho ser persistido. | Recuperação local versionada salva campos a cada edição, restaura após reload/falha e informa seu estado; exemplo de desenvolvimento reduz preenchimento repetitivo. A recuperação local é removida somente após criação bem-sucedida no servidor. Aceite E2E permaneceu aprovado. | `YES` |
| I-005 | F2-01 | `NON_BLOCKING` | `RESOLVED` | A implementação anterior era parcial: alterava estado diretamente e não tinha aceite durante job/gate. | O workflow publicado `PROJECT_ARCHIVING` v1 e a política global versionada conduzem `ARCHIVING` → `ARCHIVED`; jobs, operações e gates são encerrados na mesma transação auditável. O registro único em `archive/projects/<project-id>/archive-record.json` é criado exclusivamente e validado por hash. A UI filtra arquivados e o E2E cobre job e gate. | `YES` |
| I-006 | F1-07 / F1-13 | `BLOCKING` | `RESOLVED` | A criação de rascunho retornava `INTERNAL_ERROR` quando o caminho do clone Git não existia. A causa era `realpath` executado antes do tratamento de erro do vínculo Git. | A resolução do caminho passou a ser tratada pelo vínculo Git: caminho inexistente retorna `422 REPOSITORY_PATH_NOT_FOUND` com próxima ação segura; caminho fora da allowlist e clone inválido também retornam códigos específicos. Build e aceite E2E permaneceram aprovados. | `YES` |
| I-007 | F1-07 | `NON_BLOCKING` | `RESOLVED` | O servidor local iniciava sem informar endereço/porta, configurações efetivas seguras ou erros sanitizados de requisição no terminal. | Logs JSON sanitizados foram incluídos para startup, falha e encerramento, com método, rota, status, código, tipo do erro e ID de requisição; startup informa URL local. Build e aceite E2E permaneceram aprovados. | `YES` |
| I-008 | F1-04 / F1-07 | `BLOCKING` | `RESOLVED` | O clone `/home/mhj/git/central-atendimento` era válido, mas a criação falhava quando a resolução automática de `origin/HEAD` não era aceita pelo processo runtime. | O vínculo Git agora usa a branch local atual como fallback seguro quando `origin/HEAD` não puder ser resolvido; criação sem `base_branch` explícita foi reproduzida com sucesso no clone validado. | `YES` |
| I-009 | F2-03 | `BLOCKING` | `RESOLVED` | Smoke separado encontrou `codex-cli 0.144.0`, mas não recebeu confirmação de evidência estruturada do launcher dentro da janela de 30 s no ambiente local. No teste real de 01/08/2026, `PRODUCT_DISCOVERY_STARTED` foi persistido, porém `ANALYZE_PRODUCT_NEED` falhou após três tentativas porque `NAAMIVE_CODEX_WORKDIR` não aponta para diretório existente e gravável. Após a correção do workdir, a pré-validação retornou `CODEX_COMMAND_NOT_AVAILABLE`: o processo `npm run dev` usa PATH sem `codex`; o binário encontrado durante diagnóstico anterior era um caminho temporário injetado pelo ambiente do agente/IDE, não disponível ao servidor. O schema estruturado inválido foi corrigido, mas os jobs reais e a readiness expiravam porque o processo filho Node preservava stdin aberto e o Codex aguardava entrada adicional até o timeout. | O launcher fecha stdin imediatamente após entregar o prompt, sinalizando EOF ao Codex. O smoke autenticado real concluiu com `ready: true`, `codex-cli 0.146.0` e schema válido. O `.env` usa o binário autenticado absoluto; logs registram comando/versão. A validação real ponta a ponta foi concluída em 03/08/2026: análise, requisitos e revisão Codex produziram artefatos, passaram por rodadas de ajuste humano e abriram o gate de compromisso aprovado. | `YES` |
| I-010 | F2-05 / F2-06 | `BLOCKING` | `RESOLVED` | A chave de ArtifactStore podia incorporar identificador excessivamente longo e causar `ENAMETOOLONG` durante decisão. | A chave agora usa prefixo seguro limitado e digest do tipo, preservando tipo completo como metadado. O aceite controlado validou solicitação de ajustes e retorno a requisitos. | `YES` |
| I-011 | F2-06 | `BLOCKING` | `RESOLVED` | `npm run e2e` podia encerrar em sucesso com todos os testes PostgreSQL ignorados. | O script carrega `.env` e falha sem `DATABASE_URL` antes dos testes. A execução validada rodou os cinco cenários de integração, sem skips. | `YES` |
| I-012 | F2-06 | `BLOCKING` | `RESOLVED` | A execução padrão de `npm run e2e` podia falhar no aceite de descoberta por concorrência no worker global e ambiente de artefatos compartilhado. | A suíte E2E foi serializada, o cenário aguarda e diagnostica apenas os jobs do próprio projeto, e os artefatos de teste usam raiz temporária isolada. A execução padrão completou 5/5 cenários sem skips. | `YES` |
| I-013 | F1-07 / F2-01 / F2-06 | `BLOCKING` | `RESOLVED` | No teste manual de 31/07/2026, um projeto cuja timeline já contém `PROJECT_REGISTERED` apareceu em `WAITING_FOR_REGISTRATION` após nova validação, com novo gate `REGISTER_PROJECT` e sem evento explícito de retorno a `DRAFT`. A consulta ao PostgreSQL confirmou a combinação inválida `workflow_code=PROJECT_DISCOVERY` + `state=WAITING_FOR_REGISTRATION`; como esse estado não pertence ao workflow de descoberta, o arquivamento também retorna `WORKFLOW_TRANSITION_NOT_ALLOWED`. Isso impede usá-lo corretamente como ponto de partida da descoberta ou arquivá-lo. | A migration 009 recupera os pares legados inválidos para `PROJECT_INTAKE` v1 e instala um trigger PostgreSQL que só aceita estados publicados pelo workflow selecionado. O aceite cobre `REGISTER_PROJECT` mantendo `PROJECT_INTAKE / REGISTERED`, a troca atômica para `PROJECT_DISCOVERY / ANALYSIS_IN_PROGRESS` ao iniciar descoberta, a rejeição do par inválido e o arquivamento a partir de `PROJECT_INTAKE / WAITING_FOR_REGISTRATION`. `npm run migrate`, build e E2E passaram com 6/6 cenários; o projeto afetado foi recuperado para `PROJECT_INTAKE / WAITING_FOR_REGISTRATION`. | `YES` |
| I-014 | F2-05 | `BLOCKING` | `RESOLVED` | A timeline da interface não mostra `PRODUCT_DISCOVERY_STARTED` nem os eventos posteriores da Fase 2, embora estejam persistidos. O `EventSource` assina explicitamente apenas eventos da Fase 1; eventos nomeados não são recebidos por `onmessage`. Além disso, após falha definitiva a tela continua indicando `ANALYSIS_IN_PROGRESS` e “A plataforma está preparando a descoberta”, ocultando que a operação falhou. | A UI passou a assinar eventos da descoberta, falha, recuperação e arquivamento. O workflow publicado ganhou `DISCOVERY_FAILED`, com projeção “Descoberta interrompida”, etapa e código sanitizado; o resumo deixa de indicar progresso ativo após falha. Migration 011 também converte operações legadas esgotadas para estado recuperável. E2E 7/7 cobre a transição de falha e sua projeção persistida. | `YES` |
| I-015 | F2-03 / F2-05 | `BLOCKING` | `RESOLVED` | Depois de esgotar as tentativas automáticas de um job de agente, a operação fica `FAILED` e o projeto permanece no estado de execução, mas a interface não oferece ação de recuperação/reenvio. No teste real de 01/08/2026, a falha de configuração do workdir tornou o projeto inutilizável para nova tentativa sem intervenção operacional. | Implementado `RETRY_PRODUCT_DISCOVERY`, disponível somente em `DISCOVERY_FAILED`: valida prontidão e ausência de operação ativa, preserva evidências, cria operação/job correlacionados e retorna à etapa que falhou. A UI oferece **Tentar novamente** junto ao diagnóstico. E2E 7/7 cobre falha `CODEX_WORKDIR_NOT_READY` → estado/código persistidos → recuperação idempotente de requisitos e evento auditável. | `YES` |
| I-016 | F1-10 / F2-03 / F2-05 | `BLOCKING` | `RESOLVED` | Os logs operacionais não incluem timestamp e o worker não registra início, leasing, retry, conclusão ou falha de jobs. Durante o teste real, a falha do agente só foi descoberta por consulta direta ao banco; no servidor, respostas esperadas de negócio também aparecem indistintamente como `error`. | Logger JSON único implementado com timestamp ISO UTC, serviço, componente, nível, evento e correlação. Servidor registra ciclo de vida e diferencia rejeição 4xx (`warn`) de falha 5xx (`error`); worker registra início, retry, conclusão, falha e ciclo de vida. A execução E2E 7/7 exibiu `job_started`, `job_retry_scheduled`, `job_failed` e `job_completed` com IDs de job/operação/projeto e sem payloads ou segredos. | `YES` |
| I-017 | F1-10 / F2-03 / F2-05 | `BLOCKING` | `RESOLVED` | Durante execução real de descoberta, o worker mantém a transação PostgreSQL aberta enquanto aguarda o Codex. O job leased e seu heartbeat não ficam visíveis a outras sessões até o commit; externamente ele parece `PENDING`, há sessão `idle in transaction` e o lock global permanece retido por toda a chamada potencialmente longa. No timeout real de 01/08/2026, `AGENT_EXECUTION_FAILED` também recebeu o horário de início da transação (13:38:32), não o instante da falha, pois `now()` do PostgreSQL é fixado no início da transação. Os logs também comprovam que os retries anunciados para 5 s e 15 s reiniciaram após cerca de 1 s: `available_at=now()+delay` foi calculado com o mesmo `now()` congelado no início da transação de 10 min. | Worker refatorado em três momentos: lease confirmado em transação curta, chamada do agente fora de transação e conclusão/falha em nova transação curta. Heartbeat/lease são renovados em conexão independente; `clock_timestamp()` registra horário real e calcula backoff após o retorno do agente. E2E 7/7 passou após a refatoração. | `YES` |
| I-018 | F2-03 / F2-05 | `NON_BLOCKING` | `RESOLVED` | O adaptador reduzia toda falha do processo filho a `CODEX_TIMEOUT`/`AGENT_EXECUTION_FAILED`. No diagnóstico real, o Codex retornava `400 invalid_json_schema`, mas esse detalhe sanitizado não era capturado nem projetado; foi necessário reproduzir manualmente o comando e o schema para encontrar a causa. | Adaptador passou a emitir `agent_invocation_started`, `agent_process_exited` e `agent_invocation_failed` com duração, etapa, código, exit code/sinal e validação do arquivo de saída, sem payload, prompt, stderr bruto ou segredos. Erros conhecidos, incluindo schema inválido, são classificados. Build e E2E 7/7 passaram. | `YES` |
| I-019 | F2-03 / F2-05 | `BLOCKING` | `RESOLVED` | A descoberta aceitava o comando e só revelava indisponibilidade do agente após o worker criar operação, alterar o estado e aguardar o timeout completo. Não havia teste explícito de autenticação/conectividade/resposta estruturada mínima da IA. | Implementada readiness do adaptador: smoke estruturado `OK`, timeout próprio (`NAAMIVE_AGENT_READINESS_TIMEOUT_SECONDS=20`), cache de sucesso configurável (`NAAMIVE_AGENT_READINESS_CACHE_SECONDS=300`), logs sanitizados de início/sucesso/falha, comando/versão efetivos, endpoint manual `POST /api/agent/readiness` e botão **Testar conexão da IA**. A UI recebe `ACCEPTED` e atualiza o estado antes do smoke; a readiness é executada pelo worker e falha de modo auditável sem bloquear a resposta HTTP. O launcher fecha stdin para evitar que o Codex aguarde entrada adicional; E2E 7/7 cobre o endpoint e o smoke autenticado real confirmou sucesso em 7,7 s. | `YES` |
| I-020 | F2-03 / F2-05 | `BLOCKING` | `RESOLVED` | `REVIEW_REQUIRES_ADJUSTMENT` retornava automaticamente a requisitos, permitindo ciclo ilimitado Revisão → Requisitos quando a IA repetia o mesmo parecer. A tela também expunha códigos técnicos sem descrição curta do motivo. No reteste manual, o relato humano era auditado mas não chegava ao contexto da nova rodada do agente, que reavaliava apenas a necessidade original e podia repetir o parecer. | Workflow `PROJECT_DISCOVERY` v2 cria `WAITING_FOR_REVIEW_ADJUSTMENT`; a revisão pausa sem criar job sucessor, mostra status, motivo, recomendação e pendências amigáveis, e exige um relato humano de até 500 caracteres para iniciar uma única nova rodada. O worker recupera o último relato auditado e o entrega às etapas subsequentes; o contrato do agente exige recomendação e ações estruturadas. A UI aceita formatos legados de evidência já persistidos. O reteste real completou múltiplas rodadas humanas sem job automático em loop e alcançou `PRODUCT_COMMITMENT` aprovado; E2E isolado cobre a pausa e a retomada. | `YES` |
| I-021 | F2-03 / F2-06 | `BLOCKING` | `RESOLVED` | O gate `PRODUCT_COMMITMENT` era aberto com `evidence: []`: artefatos persistem `execution_id=job.id`, mas a consolidação consultava esse campo com `operation_id`. O projeto podia ser aprovado sem o snapshot das três evidências no gate. | O gate agora consolida a evidência mais recente de cada tipo obrigatório (`product-need-analysis`, `product-requirements`, `product-commitment-review`) no projeto, preservando análise válida da rodada anterior quando uma nova operação executa apenas requisitos e revisão. A abertura é bloqueada se não houver exatamente três evidências; migrations 014 e 015 reconciliam snapshots já gravados. O E2E isolado validou o fluxo inicial e a rodada após ajuste; o gate `central-atendimento-2` foi reconciliado e contém os três tipos esperados. | `YES` |
| I-022 | F3-09 | `BLOCKING` | `RESOLVED` | A validação PostgreSQL/E2E da Fase 3 exigia `DATABASE_URL`; o ambiente local já dispunha de PostgreSQL controlado. | `docker compose up -d postgres`, migrations e `npm run e2e` executados em 04/08/2026: 8/8 cenários aprovados, sem skips, sem expor conteúdo da configuração. | `NOT_REQUIRED` |
| I-023 | F3-04 | `BLOCKING` | `RESOLVED` | `START_DEVELOPMENT` criava worktree e SHA-base, mas não executava Dev como job recuperável nem preservava entrega verificável. | O ciclo Dev agora persiste intenção/operação/job antes do Git, usa lease/retry/reconciliação, exige commit real de `naamive-bot` com trailers, registra evidência imutável, valida paths e sincroniza rework. O aceite PostgreSQL/HTTP/E2E de 2026-08-05 confirmou a recuperação e os dois resultados de QA sem edição manual fora do runtime. | `YES` |
| I-024 | F3-08 | `BLOCKING` | `RESOLVED` | O gate `MODULE_APPROVAL` exibiu somente identificador e estado, seguido de uma aprovação genérica. Sem objetivo, escopo, exclusões, dependências e critérios, a pessoa operadora não conseguia aprovar de forma informada nem distinguir a proposta inicial de uma entrega Dev, deploy ou uso em produção. | A revisão da proposta agora mostra objetivo, escopo, exclusões, dependências e critérios de aceite antes da decisão. A tela explica que aprovar inicia a definição do módulo — não aprova entrega, deploy ou uso — e permite solicitar ajustes com feedback obrigatório. O aceite HTTP verifica o payload completo ainda com o gate aberto e a versão visível da UI (`UI 2026.08.05-f3-module-review.2`) contém os textos de revisão e distinção de deploy. | `YES` |

Valores permitidos:

| Campo | Valores |
| --- | --- |
| `Impacto` | `BLOCKING`, `NON_BLOCKING` |
| `Status` | `OPEN`, `IN_PROGRESS`, `RESOLVED`, `WONT_FIX` |
| `Aprovada` | `PENDING`, `YES`, `NO`, `NOT_REQUIRED` |

Uma issue `BLOCKING` bloqueia somente a tarefa ou fase indicada; não impede o
avanço de tarefas independentes. Uma issue só passa a `RESOLVED` após a solução
ser implementada e verificada.
