---
document_type: delivery-roadmap
status: DRAFT_FOR_BRAINSTORM
created_at: 2026-07-30
parent: 00_PRODUCT_NORTH_STAR.md
related_baseline: ../ORCHESTRATION_END_TO_END_AUDIT_GAPS_BACKLOG.md
delivery_strategy: vertical-end-to-end-slices
---

# Roadmap de Entrega — Fatias Verticais Node/Web

## Regra de entrega

Cada fase é uma entrega ponta a ponta utilizável no navegador. Inclui a menor porção necessária de interface web, API, máquina de estados, persistência, execução assíncrona e observabilidade. Não há fase exclusivamente de backend, worker, API ou fundação técnica.

Uma fase só termina quando o único operador consegue demonstrar seu fluxo completo pela web e consultar a auditoria correspondente. Fundações técnicas entram dentro da fase que entrega o valor que habilitam.

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

## Fase 1 — Projeto web iniciado e submetido

**Valor entregue:** o operador vincula um repositório Git local, cria um projeto no navegador, preenche a necessidade guiada, submete e acompanha a validação até decidir `REGISTER_PROJECT`.

**Demonstração ponta a ponta:** abrir a web, criar rascunho, salvar, submeter, ver eventos de validação, revisar a necessidade, aprovar o gate e ver o projeto registrado — sem CLI.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F1-01 | Definir schema de projeto, intake, vínculo Git, evento, operação e gate de registro. | Regras Python dispersas; usar testes e contratos atuais como referência. |
| F1-02 | Marcar runtime Python e seus documentos como `DEPRECATED`; inventariar regras, contratos e testes de referência para Node. | Legado não recebe novas funcionalidades; ausência de inventário pode perder regra crítica. |
| F1-03 | Criar no PostgreSQL catálogo versionado de tipos, status, públicos e mapeamentos de estado/evento; projetar status, marco e próxima ação. | UI não pode inferir estados; migrations controladas não podem alterar transições da máquina. |
| F1-04 | Validar caminho permitido, Git, origin, branch-base, SHA inicial e árvore limpa/confirmada. | Path livre pode expor arquivos; restringir raízes. |
| F1-05 | Implementar estados rascunho, submetido, aguardando registro e registrado; transições auditáveis. | Evitar copiar CLI; modelar comandos de negócio. |
| F1-06 | Implementar API/persistência PostgreSQL para criar, editar, submeter, decidir e consultar projeto, operação e timeline. | Migrations iniciais devem ser repetíveis e testadas. |
| F1-07 | Provisionar PostgreSQL local persistente e comandos de backup/restore; criar dump automático antes de migration destrutiva. | Reset de banco é destrutivo; exigir confirmação e backup válido. |
| F1-08 | Implementar operação assíncrona, eventos e SSE para submissão/validação. | Não simular progresso; emitir somente eventos reais. |
| F1-09 | Implementar web: lista, vínculo Git, criação, formulário, status resumido, marcos, detalhe técnico e decisão de registro. | Sem design system; usar componentes acessíveis e neutros. |
| F1-10 | Criar teste de aceite web de vínculo Git, criação até registro, status de jornada e auditoria. | Normalizar somente IDs e tempos voláteis. |

## Fase 2 — Primeiro ciclo automático visível até compromisso de produto

**Valor entregue:** de um projeto registrado, o operador aciona iniciar, recebe aceite imediato e acompanha análise, definição e revisão até `PRODUCT_COMMITMENT`; decide módulos pela web.

**Demonstração ponta a ponta:** iniciar por botão, ver despacho, heartbeat, evidência e transição de cada agente; abrir documentos e decidir o compromisso com autoria na timeline.

| ID | Tarefa e definição de pronto | Impedimento / tratamento |
| --- | --- | --- |
| F2-01 | Portar análise, proposta de módulos, requisitos e revisão com testes de paridade críticos. | Regressão do Python; mapear cada controle relevante para teste Node. |
| F2-02 | Implementar tabela PostgreSQL de jobs/outbox com estado, tentativa, `available_at`, lease, idempotência e lock global. | Transição, evento e job devem ser atômicos na mesma transação. |
| F2-03 | Implementar despachante reativo sequencial: worker recupera job pendente/vencido e enfileira próximo round somente sem agente ativo. | Despacho duplicado; lock global e idempotência. |
| F2-04 | Implementar adaptador Codex Node isolado, com timeout, sanitização, evidência e pedido de transição. | Autenticação/sandbox; formalizar launcher/CI suportado. |
| F2-05 | Evoluir timeline SSE com agente, fase, duração, heartbeat, evidência, resultado e próxima ação. | CLI não fornece progresso interno confiável; heartbeat prova vida do worker. |
| F2-06 | Implementar tela de compromisso com proposta, requisitos, módulos candidatos, aprovação/rejeição e feedback. | Decisão concorrente; versão do gate é validada pela API. |
| F2-07 | Criar teste de aceite web até compromisso, com eventos e evidências correlacionados. | IA é variável; usar adaptador controlado em teste e smoke separado. |

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

## Decisões ainda abertas

Não há decisões abertas no momento. Novas questões do brainstorm serão incluídas
aqui até serem decididas e movidas para o radar ou roadmap.
