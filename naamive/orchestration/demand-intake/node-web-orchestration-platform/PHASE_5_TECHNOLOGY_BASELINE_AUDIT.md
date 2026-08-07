# Auditoria Técnica — Fase 5 Technology Baseline Planning

Conduzi esta auditoria validando o documento contra o estado real do repositório (`naamive/runtime/node-web`). Os fatos citados abaixo vêm de arquivos existentes; inferências e recomendações estão explicitamente marcadas como tais. Nenhum arquivo foi alterado.

---

## Executive Summary

O plano é **excepcionalmente detalhado e conceitualmente maduro**. Os princípios arquiteturais (engine genérica, catálogo como única fonte de verdade, baselines por referências imutáveis, evolução por configuração) são sólidos e **coerentes com a arquitetura existente**, que já adota motor de workflow publicado/imutável (`workflow.ts` interpreta somente dados publicados), `ArtifactStore` com intenção/hash/reconciliação (`migrations/004`, `artifacts.ts`), e imutabilidade por triggers/`SUPERSEDED` (`025_phase_4_agent_runtime.sql`, `phase3.ts:startModuleRevision`).

No entanto, o plano é um **cheque em branco**: ele descreve OBJETIVOS (F5-01 a F5-06), um modelo de domínio de altíssima complexidade (21 categorias, dezenas de itens, revisões versionadas, snapshot congelado, workflow v3, inventário read-only com worktree detached) — mas **não há uma única task executável, com critérios de aceite operacionais por etapa, dependências explícitas entre problemas, ordem de implementação com passos incrementais, mapeamento para arquivos existentes, nem divisão verificável do trabalho**. O "Sequência F5-01 a F5-06" é uma tabela de 6 linhas com "Resultado verificável" genérico, e as seções "Testes e validação" e "Critério de aceite da Fase 5" são cenários ponta-a-ponta, não farejamento por task.

**Veredito: REQUIRES REFACTORING BEFORE EXECUTION** (detalhes na seção Final Verdict).

O documento tem força como **especificação normativa de modelo de domínio e contrato**, mas está a um passo de ser um plano executável. Também há lacunas conceituais reais que, se não fechadas, levam a implementação incorreta mesmo com execução textualmente correta das tasks.

---

## Critical Findings

### C1 — O escopo afirma incluir "F5-01 a F5-06", mas o esqueleto do modelo (tabelas novas + workflow v3) é tratado como pré-requisito, não como task
- **Facto (repositório):** não existe nenhuma tabela `technology_*`, nenhum seed `technology-*.json`, nenhum `selection_context`, nenhum `workflow_version=3` em `PROJECT_DISCOVERY`, e nenhum campo `technology_baseline_revision_id` em qualquer tabela. Tudo isso é verde.
- **Facto (doc):** F5-01 é "Seeds versionados publicam a revisão inicial"; mas a implementação de todas as tabelas do modelo, das migrations aditivas, dos seeds, do publicador transacional, do avaliador genérico de compatibilidade, do inventário, do workflow v3, da API, da web, do SSE e dos gates é **mencionada no corpo**, sem pertencer a nenhuma F5-XX.
- **Risco:** um agente executaria F5-01 sem saber se as tabelas/triggers já devem existir, quem cria o `schema_migrations` para elas, ou como o "publicador" é invocado. A linha entre "task" e "pré-requisito implícito" é o maior gap de executabilidade.

### C2 — F5-01 e F5-02 não são decompostas em passos verificáveis
- F5-01 (seeds) exige: seeds JSON + envelope + schema versionado + validação de referências/cardinalidade/regras `ERROR` + hash + transação + evidência no ArtifactStore + idempotência. Isso é pelo menos 5–7 entregáveis lógicos.
- F5-02 (inventário) exige: lista fechada de paths/parsers, worktree detached com verificação de `rev-parse`, sanitização, resolução contra snapshot `PUBLISHED`, detecção de `AMBIGUOUS`/`UNKNOWN`, operação/job/evidência antes da leitura, rejeição de symlink/submódulo/allowlist/manifesto malformado. Isso é, na prática, um subsistema inteiro (comparável em complexidade ao `git-delivery.ts` + `agent-execution-service.ts`).
- **Resultado:** nenhuma task é "executável de forma independente"; cada uma aponta para um universo.

### C3 — F5-06 (propagação da revisão a todos os contratos) está descrita de forma contraditória com as constraints atuais do schema
- **Facto (repositório, `migrations/016`):** `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries`, `findings` e `integration_candidates` **já existem** com colunas fixas. Não há coluna `technology_baseline_revision_id` nelas.
- **Facto (repo, `phase3.ts:startModuleRevision`):** revisões de módulo criam nova linha `module_revisions` e marcam a anterior `SUPERSEDED` — o mecanismo de "revisão nova = linha nova, anterior = SUPERSEDED" já existe e é **o mesmo padrão** que a baseline propõe. Isso é uma forte validação da abordagem, mas significa que F5-06 exige **ALTER em tabelas que hoje têm FKs `REFERENCES module_revisions(id)` e `ONE active worktree per project`**.
- **Doc:** afirma que serão adicionadas colunas a `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries`, `findings`, `qa_matrices` (nova tabela), `jobs`, `integration_candidates.manifest`, e que "FKs compostas/guards e trigger transacional rejeitam nulo, revisão não APPROVED ou desigualdade". Isso é uma **mudança estrutural massiva** nos contratos F3 existentes, potencialmente causando regressão nos E2Es de F3 (que hoje inserem projetos diretamente em `PRODUCT_COMMITMENT` com `PROJECT_DISCOVERY`,2 e usam links rígidos FKs).
- **Risco de regressão:** os testes E2E atuais (`phase3.e2e.test.ts`, `phase3-http.e2e.test.ts`, `phase3.e2e.test.ts`) inserem em `work_items`/`deliveries` sem baseline. Se a trigger de F5-06 exigir `technology_baseline_revision_id NOT NULL` via trigger (o doc manda), **todos os testes E2E existentes de F3 quebram** — a menos que a representação legada (`BASELINE_NOT_REQUIRED_LEGACY`) seja tratada. O documento reconhece a exceção legada, mas não define como os testes F3 existentes serão ajustados para projetos v2.

### C4 — O "workflow v3" conflita com o padrão vigente de seleção de versão do motor
- **Facto (repositório, `service.ts:startProductDiscovery`):** hoje fixa `workflow_version=2` ao iniciar descoberta (`UPDATE projects SET workflow_code='PROJECT_DISCOVERY',workflow_version=2`). O plano quer que "startProductDiscovery deixa de fixar workflow_version=2" e selecione v3 na mesma transação que sai de REGISTERED, atomicamente.
- **Facto (repo, `workflow.ts`):** o motor lê transições dinamicamente por `workflow_code + workflow_version` — o mecanismo já suporta múltiplas versões publicadas em paralelo. Isso é coerente.
- **Gap (inferência):** o plano não diz **como** o v3 será "publicado". O padrão existente é: nova migration insere `workflow_definitions/codes=PROJECT_DISCOVERY,version=3` (como feito em 012 para v2). O plano fala em "publicar v3 completo, copiando todos os estados/transições/guards/policies de v2" — mas não define a migration, nem como o `workflow_global_policies` (`ARCHIVE_PROJECT`) será estendido para os novos estados (`TECHNOLOGY_SELECTION_PREPARING`, `TECHNOLOGY_BASELINE_IN_REVIEW`, etc.) nem para `READY_FOR_MODULE_MATERIALIZATION` (que hoje nem existe, `materializeModule` exige `state='PRODUCT_COMMITMENT'`).

### C5 — O modelo de "categoria com cardinalidade" cria um problema de representação de decisões de arquitetura que o documento não resolve completamente
- **Doc:** `DATABASE` tem `min_selections=0, max_selections=1`; `OBSERVABILITY` tem `min_selections=1`; `MESSAGING` tem `min_selections=0`. Itens ativos existem para `DATABASE` (POSTGRESQL) e `OBSERVABILITY` (STRUCTURED_LOGGING), mas **não há item ativo para MESSAGING nem para APPLICATION_FRAMEWORK** (este é `min=0`).
- **Facto cruzado:** a demonstração da Fase 5 no roadmap diz "recebe baseline com decisão aberta para o banco" (`01_DELIVERY_ROADMAP.md` linha 390), mas a tabela ativa do catálogo **tem POSTGRESQL ativo**. O doc da Fase 5 (linha da demonstração "expande a composição") contradiz indiretamente o roadmap: a Fase 5 demonstra baseline **sem** decisão aberta para o banco, pois POSTGRESQL está ativo e REQUIRED. O roadmap está desatualizado em relação ao plano F5, ou o plano da Fase 5 não entrega o que o roadmap prometeu ("decisão aberta para o banco").
- **Gap maior (inferência):** `APPLICATION_FRAMEWORK` (min=0, max=1) e `MESSAGING` (min=0) ficam **sem seleção** no snapshot inicial. O perfil `TYPESCRIPT_MODULAR_MONOLITH` não contém esses itens. Aí o operador terá categorias com 0 selecionados e min=0 — ok. Mas `OBSERVABILITY` (min=1) e `SECURITY_REQUIREMENT` (min=1) exigem ao menos 1, e todos os itens dessas categorias são REQUIRED. Qual é a cardinalidade efetiva? O doc diz que o perfil "não satisfaz nem posterga cardinalidade: é apenas uma composição candidata; a validação da baseline ocorre por itens catalogados ou decisão explícita de deferimento". Isso significa que **o perfil REQUIRED por si não atende `min_selections=1` de OBSERVABILITY até a baseline ser validada** — coerente, mas deixa pendente: se o operador remover OBSERVABILITY/STRUCTURED_LOGGING da baseline (permitido, pois baseline "pode adicionar ou restringir... quando compatíveis"), a categoria fica com 0 e min=1 → inválida. O doc proíbe retirar REQUIRED? Não está explícito.

### C6 — Ambiguidade: o que "restrição de versão" significa para items UNMANAGED quando o perfil os declara REQUIRED
- **Facto (doc):** `metadata.version_governance` aceita `REQUIRED` ou `UNMANAGED`; na publicação inicial só `NODEJS_22` é `REQUIRED`, os demais `UNMANAGED` com restrição nula.
- **Inferência/Gap:** o plano não define **qual é o comportamento** quando um perfil ou baseline REQUIRED tem `version_constraint` nula para item `UNMANAGED`: significa "qualquer versão"? "versão detectada no inventário"? O avaliador genérico precisa de regra de interpretação para a condição vazia na validação de compatibilidade e da baseline.

### C7 — Inventário vs. "tecnologia declarada/configurada manualmente" não tem representação separada
- **Doc:** descreve inventário read-only que produz fatos e resoluções (`RESOLVED_ACTIVE`, `RESOLVED_INACTIVE`, `UNKNOWN_CATALOG_ITEM`, `AMBIGUOUS_CATALOG_ITEM`). O operador "confirma" o que foi detectado.
- **Facto (doc):** não há conceito de "tecnologia declarada pelo operador sem detecção" — só itens catalogados selecionados na baseline. O plano distingue 7 estados conceituais (catálogo disponível / utilizada pelo projeto / ativa / inativa / suportada / detectada / declarada) mas o **modelo de dados não tem coluna para "declarada manualmente" vs "detectada automaticamente"** em nível de item — só `inventory_id` na revisão. **Este é um dos maiores gaps conceituais:** o item 7 do pedido de auditoria pede exatamente essa distinção, e o modelo não a materializa (inferência de lacuna; o doc dá a entender que "declarada/configurada" se confunde com "confirmada pelo operador sobre evidência do inventário").

---

## Important Findings

### I1 — `qa_matrices` é definida como nova tabela mas já existe conceito de "matriz de QA congelada" em `deliveries.qa_matrix`
- **Facto (repo, `migrations/023`):** já existe `deliveries.qa_matrix jsonb NOT NULL DEFAULT '[]'`. A Fase 3 congelou QA por delivery.
- **Doc:** propõe `qa_matrices(id, project_id, work_item_id, delivery_id, technology_baseline_revision_id NOT NULL, payload, hash, ...)` substituindo a "matriz congelada somente-em-payload".
- **Risco de conflito:** a Fase 3 já congela `qa_matrix` no `deliveries` e replica em `manifest` dos candidatos (`phase3.ts:createCandidate`). A nova tabela `qa_matrices` precisaria coexistir sem duplicar e sem quebrar o `DELIVERY_QA`/`CANDIDATE_VALIDATION` existentes. O plano menciona a nova tabela e a "substituição" da matriz, mas não define migração nem compatibilidade com o contrato F3 existente.

### I2 — A API proposta entra em conflito com a estrutura de rotas existente
- **Facto (repo, `server.ts:35-38`):** as rotas são regex em `/api/projects/:id/(intake|submit|...|modules/...)`. O plano propõe `GET /api/technology/categories`, `GET /api/projects/:projectId/technology-baseline/*`, etc.
- **Inferência:** novas rotas `technology-baseline` sob `/api/projects/:id/...` e `technology/...` globais não conflitam com os regex atuais (que não consomem `technology`), mas o padrão de roteamento ad-hoc por regex terá que ser estendido e o `match[2]` atual cobrirá novos sufixos. Não há conflito direto, mas é um ponto de manutenção.

### I3 — A "abertura de health endpoint/OpenAPI" está corretamente ausente, mas falta verificar se o inventário pode detectar "sua própria plataforma"
- **Facto (repo):** não há endpoint `/api/health`, nem OpenAPI, nem Dockerfile do app (existe `tooling/codex-smoke/Dockerfile`, não é o app). Corretamente, `API_DOCUMENTATION`, `PACKAGING`, `CI_PLATFORM` (sem itens ativos) ficam sem itens.
- **Gap (inferência):** o inventário lê `package.json`/`pom.xml`/etc. **do projeto alvo** (o repositório vinculado ao projeto). Para validar a baseline num "projeto novo", o inventário inspeciona o repositório **do projeto**, não o repositório NAAMIVE. O plano não distingue **"inventário do repositório do projeto"** vs **"inventário do próprio repositório NAAMIVE"** — na demonstração "Em um novo projeto com compromisso de produto aprovado, o inventário seguro oferece evidências", fica implícito que é o repo do projeto, mas não é explícito. Isso pode levar um agente a detectar a stack do NAAMIVE em vez da do projeto.

### I4 — Falta clareza sobre como o snapshot `PUBLISHED` será gerado pelo publicador de seeds
- **Doc:** o publicador "carrega os arquivos nesta ordem lógica" e "cria o DRAFT global, calcula o hash... e persiste identidades, associações versionadas, hash, evidência". Mas o modelo de "tabela corrente + tabelas de revisão" cria o seguinte paradoxo (inferência): se a "tabela corrente" (`technology_catalog_items` etc.) é a fonte para novos contextos, então publicar uma nova revisão exigiria `INSERT` em tabelas correntes **e** copiar para as tabelas congeladas. O doc diz que "alterar `is_active` na tabela corrente sem publicar nova revisão não altera as opções consumidas" — então a tabela corrente é "a proposta para a próxima revisão" e o snapshot `PUBLISHED` é a autoridade. **Mas o seed inicial insere nas correntes E publica.** Como será resolvido? (i.e., as correntes começam vazias e o snapshot é materializado a partir de seeds on first publish? ou correntes são seeds + snapshot? O doc é ambíguo.)

### I5 — `revision_number` global único vs. `catalog_revision` por seed pode divergir
- **Doc:** `technology_catalog_revisions.revision_number bigint NOT NULL UNIQUE` (monotônico global) e envelopes de seed com `catalog_revision`. Se os seis arquivos devem "declarar o mesmo catalog_revision", e `revision_number` é global, não está explícito que `revision_number == catalog_revision` no seed inicial. Pequeno, mas pode gerar conflito de interpretação.

### I6 — `DEFER_TO_MODULE_ARCHITECTURE` escopado por categoria tem ambiguidade quanto a "decisão necessária no módulo"
- **Doc:** decisão aberta contém `category_id`, pergunta, justificativa; é exclusiva da categoria; `PROHIBITED` > `REQUIRED` > `PREFERRED` > `ALLOWED`. O módulo "deverá resolver o deferimento antes de aprovar sua própria decisão".
- **Gap (inferência):** não há definição de como esse deferimento é **resolvido na arquitetura do módulo** — qual campo/schema da arquitetura referencia a decisão aberta e qual gate valida que foi resolvido. Fica para F3 adaptação, sem contrato.

---

## Minor Findings

### M1 — Nomenclatura
- **Facto:** `phase3.ts` usa `module_rounds` para "definition/architecture/plan"; o plano usa "revisão de módulo" de forma intercambiável com proposta. O plano usa "Proposta do módulo, sua arquitetura, work item..." (no critério/aceite) — isso alinha com F3 (`module-definition`, `module-architecture`, `module-plan`). Ok, mas vale padronizar "revisão de baseline" vs "revisão de módulo".

### M2 — `selection_contexts` é "uma revisão única PUBLISHED e perfil ativo congelado", mas o doc também diz que perfis têm revisões de catálogo
- O contexto de seleção guarda `technology_profile_id` — mas o perfil em si evolui por revisões de catálogo. Se duas revisões de catálogo publicam o mesmo perfil com composição diferente, o contexto precisa saber **qual snapshot de perfil** foi usado. O modelo `technology_selection_contexts` (descrito abreviadamente) não lista coluna `technology_catalog_revision_id` — provavelmente a tem, mas não está explícita no excerto; risco de ambiguidade.

### M3 — `content_hash` em `technology_catalog_revisions` vs. hash por package
- O doc diz que o hash é canônico do conteúdo congelado e que o publicador persiste "hash do pacote". Duas noções de hash (conteúdo global vs. pacote de seeds) não são reconciliadas explicitamente. Pode gerar confusão na idempotência.

### M4 — Carga inativa duplica o conceito "inativo = não implementado"
- **Facto (doc):** "MICROSERVICES permanece inativo... sua presença não representa implementação futura confirmada". Isso é uma política sã, mas o roadmap (`01_DELIVERY_ROADMAP.md` linha 390) diz "baseline com decisão aberta para o banco" na **demonstração** — contradição menor já citada em C5.

### M5 — Falta definir como a UI "aplica automaticamente o perfil quando há exatamente um ativo"
- Guideline ok, mas o `GET /api/technology/profiles?status=ACTIVE` e "quando houver exatamente um perfil ativo, a UI pode aplicá-lo automaticamente" precisa de regra de demonstração E2E para não degenerar em atalho.

---

## Task-by-Task Audit

Nota: o documento só nomeia F5-01..F5-06 em duas tabelas (Sequência e Roadmap). O corpo não as decompõe. Auditoria por task conforme os "Resultado verificável".

| Task | Objetivo claro | Executável independente | Pré-requisitos não declarados | Critérios de aceite suficientes? | Ambiguidade técnica | Risco de regressão |
| --- | --- | --- | --- | --- | --- | --- |
| **F5-01** | Sim ("seeds publicam revisão inicial") | **Não** (pressupõe todo o schema de catálogo/revisões/publicador) | Tabelas, triggers, schema das seeds, publicador, hash, evidência — tudo implícito | Não (sem passo verificável isolado) | Alta (ordem de "tabelas correntes vs snapshot") | Baixa (aditivo, mas muda nada existente) |
| **F5-02** | Sim ("inventário read-only...") | **Não** (é um subsistema) | Worktree detached, allowlist paths, parsers, sanitização, resolução contra snapshot | Não | Alta (`AMBIGUOUS`/`UNKNOWN`/`RESOLVED_INACTIVE`; repositório do projeto vs NAAMIVE) | Médio (novo, porém complexo Git) |
| **F5-03** | Sim ("baseline/revisões/evidências imutáveis") | Parcial | Modelo completo + F5-01/02 | Não | Média (json schema baseline; `qa_matrices` vs F3) | Médio (novas tabelas aditivas) |
| **F5-04** | Sim ("API/web/SSE") | Parcial (depende F5-01/03) | API routes, UI data-driven | Não | Média | Baixa |
| **F5-05** | Sim ("bloquear 1ª materialização") | Não (depende F5-03/04 + workflow v3) | Workflow v3, states, guards, trigger de baseline | Parcial | **Alta** (v3 vs padrão atual de seleção; `materializeModule` exige `PRODUCT_COMMITMENT` hoje) | **Alta** (regressão F3) |
| **F5-06** | Sim ("propagar revisão a contratos") | Não (depende F5-05 + alterações em tabelas F3) | ALTER em `modules`/`work_items`/`deliveries`/`findings`/`jobs`/`integration_candidates`, trigger transacional | **Não** | **Alta** (representação legada vs testes F3) | **Crítica** (quebra E2E F3) |

---

## Data Model Audit (Technology Baseline)

**Pontos fortes (facto confirmado no repositório):** o padrão "linha nova + marca SUPERSEDED" das tabelas correntes + "tabelas congeladas por `revision_id`" é **exatamente o mesmo padrão já usado** em `phase3.ts:startModuleRevision` (marca `module_revisions` como `SUPERSEDED` e cria nova). FKs compostas e `PRIMARY KEY(profile_id, catalog_item_id)` seguem o estilo já usado (`ai_runtime_configuration` composta). `UNIQUE NULLS NOT DISTINCT` é suportado nativamente e evita o bug que a Fase 1 já teve com mapeamento de status com `event_code NULL` (migration 003 criou índices parciais por causa disso — ver `state_status_default_mapping_unique`). **O plano repete corretamente a lição aprendida.**

**Gaps e riscos de modelagem:**

1. **Sobreposição corrente/snapshot (C7/I4):** sem definição de qual é fonte para novo contexto, risco de duplicidade lógica ao publicar.
2. **Unicidade em `technology_catalog_revision_items`:** `PRIMARY KEY(revision_id, catalog_item_id)` e `category_id` também congelada — ok. Mas não há indicação de índice para consultas "por categoria" no snapshot; `display_order` congelado ajuda ordenação, mas sem índice `(revision_id, category_id)` consultas por categoria podem degradar (menor).
3. **`technology_baseline_revision_items`:** é a tabela que materializa a classificação. O doc diz "Para a mesma referência e escopo não pode haver mais de uma classificação". O PK sugerido (`id` genérico) + unicidade não especificada. **Risco:** sem `UNIQUE(baseline_revision_id, catalog_item_id)` a garantia de "uma classificação por referência" não é imposta pelo banco. O doc descreve em palavras mas não lista a constraint.
4. **`selection_contexts`:** não detalhado o bastante; falta coluna explícita de `technology_catalog_revision_id`/hash do snapshot; e a relação com `baseline_revision` (um contexto→uma revisão? uma baseline→muitos contextos?) não está clara.
5. **Delegação `DEFER_TO_MODULE_ARCHITECTURE`:** representada como decisão aberta escopada por `category_id`; mas não há tabela definida para "decisões abertas" na revisão (só listada na `Technology Baseline Revision` como parte do payload `technology-baseline/v1`). **Se a decisão aberta vive só no payload JSON, a engine não consegue validar cardinalidade por categoria de forma genérica sem parse de JSON.** O plano diz "o banco não contém enum..."; mas decisões abertas precisariam de tabela para validação. **Ambíguo.**
6. **Migração para `qa_matrices`:** cria tabela nova, mas F3 já usa `deliveries.qa_matrix`; risco de "duas fontes" e de quebra de `CANDIDATE_VALIDATION`/`DELIVERY_QA` (que lêem `validations` e `qa_matrix`). Ver I1.
7. **Trigger único para baseline em F5-06:** o plano manda trigger rejeitar "nulo, revisão não APPROVED ou qualquer desigualdade" em `modules`/`module_revisions`/`module_gates`/`work_items`/`deliveries`/`findings`. **Isso é uma restrição muito rígida** que ficará difícil de manter com migrações de dados/reconciliação (ex: migration 022 usa `ON DELETE SET NULL` em `deliveries_job_id_fkey` justamente para não travar auditoria; uma trigger que exige igualdade estrita pode conflitar com operações de reconciliação). Risco de manutenção futura.

---

## Repository vs Planning

| Documento (plan) | Repositório (facto) | Status |
| --- | --- | --- |
| "NestJS, Prisma, pnpm, Vitest não são ativados" | `package.json` não os lista; `devDependencies`: `@types/node`, `@types/pg`, `tsx`, `typescript`; deps: `ajv`, `ajv-formats`, `bootstrap`, `pg`. Confirma. | ✅ Coerente |
| "node:http, pg, npm, tsc, node:test, logs estruturados, validação de entrada, tratamento centralizado de erros, segredos por env" | Confirmado em `server.ts` (`createServer from node:http`), `config.ts` (env obrigatório), `log.ts`, `service.ts` (validação `validateIntake`), `package.json`. | ✅ Coerente |
| "Não há OpenAPI, Docker do app, GitHub Actions, health endpoint" | Não há rota `/api/health`; não há `OPENAPI`; não há `Dockerfile` do app (só `tooling/codex-smoke/Dockerfile`); não há `github-actions` em src. | ✅ Coerente |
| Workflow publicado/imutável | `workflow.ts`, `prevent_published_workflow_mutation()` (mig 005) | ✅ Coerente |
| "startProductDiscovery deixa de fixar workflow_version=2" | Hoje fixa `workflow_version=2` (`service.ts:102`). Mudança necessária e bem definida. | ✅ Definida (task futura) |
| "ArtifactStore suporta intenção, hash, reconciliação" | `artifact_intents` (mig 003/004), `artifacts.ts`, reconciliação idempotente. | ✅ Coerente |
| Baseline "não é um inventário" | Correto; o inventário é `technology_inventory`. | ✅ Coerente |
| Fases renumeradas / roadmap mantém Fase 5 = baseline | `01_DELIVERY_ROADMAP.md` + `11_PHASE_RENUMBERING_IMPACT_ANALYSIS.md` confirmam que baseline é Fase 5, entrega Fase 6, operação Fase 7. | ✅ Coerente (docs vivos ainda `DRAFT_FOR_HUMAN_VALIDATION` em 11) |
| Demonstração do roadmap: "baseline com decisão aberta para o banco" | O snapshot inicial **inclui** POSTGRESQL ativo/REQUIRED. Sem decisão aberta de banco na baseline real. | ⚠️ **Inconsistência conceptual** (ver C5) |
| `qa_matrices` nova tabela substituindo matriz congelada | Já existe `deliveries.qa_matrix` congelado em F3. | ⚠️ Potencial conflito (I1) |
| Trigger transacional de baseline em tabelas F3 | Tabelas F3 + FKs existentes já complexas; trigger rígido pode conflitar com migrações aditivas/reconciliação (mig 022 usa `ON DELETE SET NULL`). | ⚠️ Risco de regressão/conflito |
| "o manifesto/candidata inclui o ID por work item" | `integration_candidates.manifest` já existe (`mig 016`). Adicionar campo é factível, mas exigirá ajustar `createCandidate`/`validateCandidate`. | ✅ Factível, mas impõe mudança em F3 |

---

## Missing Tasks (novas tasks que deveriam existir)

1. **F5-00/A — Publicar o schema físico das migrations da Fase 5** (tabelas correntes + snapshot + perfis + regras + contextos + baseline + revisões + itens+decisões abertas), com as constraints de unicidade de referência (`UNIQUE(baseline_revision_id, catalog_item_id)`, `UNIQUE(contexto)`, etc.), antes de F5-01.
2. **F5-00/B — Definir o contrato `technology-baseline/v1` JSON Schema** (payload da revisão, decisões abertas, referências) publicado e versionado, com testes de schema.
3. **F5-00/C — Implementar o avaliador genérico de compatibilidade** (REQUIRES/CONFLICTS/RECOMMENDS + sério + versão/escopo), como componente testável independente da engine — hoje não existe nada disso.
4. **F5-00/D — Publicar `PROJECT_DISCOVERY` v3 (workflow) como migration aditiva** (estados `TECHNOLOGY_SELECTION_PREPARING`, `TECHNOLOGY_BASELINE_IN_REVIEW`, `WAITING_FOR_TECHNOLOGY_BASELINE`, `READY_FOR_MODULE_MATERIALIZATION` + transições + guards + políticas de arquivamento), copiando v2 conforme o plano — deve preceder F5-05.
5. **F5-00/E — Adaptar `startProductDiscovery` para selecionar v3 atomicamente** e migrar testes E2E que assumem `workflow_version=2`.
6. **F5-02/S — Definir a lista fechada de parsers/detectors e o mecanismo de detecção do repositório do projeto** (não do NAAMIVE), incluindo `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, manifests — com esquema de detecção sanitizada.
7. **F5-06/M — Migração compatível de F3** para propriedade `technology_baseline_revision_id` em `modules`/`module_revisions`/`module_gates`/`work_items`/`deliveries`/`findings`/`jobs`/`integration_candidates.manifest`, numa `migration` aditiva que não quebre os E2Es F3 existentes, tratando a exceção legada.
8. **F5-06/T — Atualizar os testes E2E F3 existentes** (`phase3.e2e.test.ts` etc.) para inserir a baseline como dado de setup dos cenários v3, preservando os cenários legados v2.
9. **F5-01/S — Documentar a semântica de "tabela corrente vs snapshot PUBLISHED"** e a idempotência do publicador, com um teste que rode o pacote duas vezes.
10. **F5-ADD — Decidir e especificar a representação de "tecnologia declarada pela operação sem detecção"** (se entra na baseline só via confirmação do inventário, ou se há flag no item da revisão indicando origem "auto" vs "manual").
11. **F5-GATE — Definir o gate humano da baseline como entidade própria** (`technology_baseline_gates`) com versionamento/idempotência, seguindo o padrão `module_gates`/`gates` já existentes, e o comando `DECIDE_TECHNOLOGY_BASELINE`.

---

## Recommended Execution Order

Considerando dependências reais:

1. **F5-00/A + F5-00/B** (schema físico + contrato baseline) — precede tudo.
2. **F5-00/C** (avaliador genérico de compatibilidade) — independente, pode ser paralelo.
3. **F5-00/D + F5-00/E** (workflow v3 + adaptar `startProductDiscovery`) — antes de F5-05.
4. **F5-01** (seeds/publicador) — requer F5-00/A.
5. **F5-02/S + F5-02** (inventário) — requer F5-00/A e F5-01 (snapshot PUBLISHED).
6. **F5-03** (baseline/revisões/evidências) — requer F5-00/A, F5-01, F5-02; e F5-06/M para `qa_matrices`/propagação (pode ser feita em paralelo com F5-06/M).
7. **F5-04** (API/web/SSE) — requer F5-01, F5-03.
8. **F5-05** (bloquear 1ª materialização) — requer F5-00/D/E, F5-03, F5-04.
9. **F5-06/M + F5-06/T** (propagação + ajuste E2E F3) — requer F5-05; é o último passo por ser o de maior risco de regressão.

Ordem do documento (F5-01→F5-06) está **conceitualmente correta mas omite os itens F5-00** e a pré-tarefa F5-02/S.

---

## Final Verdict

**REQUIRES REFACTORING BEFORE EXECUTION**

**Justificativa objetiva:**

1. As seis tasks F5-XX não são executáveis de forma independente nem têm critérios de aceite por etapa; cada uma representa um agregado de subsistemas (schema, publicador, avaliador, inventário, workflow v3, UI, propagação F3) que exigiria uma decomposição em 20–30 subtarefas verificáveis.
2. Há lacunas conceituais não resolvidas que podem levar a implementação textualmente correta mas **conceitualmente errada**: (a) sobreposição "tabela corrente vs snapshot PUBLISHED" na publicação; (b) representação de decisões abertas apenas em payload JSON sem validação genérica por categoria; (c) ausência de modelagem da origem "manual vs detectada"; (d) interpretação de `version_constraint` nula para itens `UNMANAGED`.
3. Conflito latente com o roadmap: o roadmap promete "decisão aberta para o banco", mas o snapshot inclui POSTGRESQL como ativo/REQUIRED — a demonstração da Fase 5 precisa ser reconciliada.
4. Dois riscos de regressão "críticos": (a) trigger rígida de igualdade de baseline nas tabelas F3 existentes, que pode quebrar as E2E de F3 atuais, e (b) a definição de `qa_matrices` conflitando com `deliveries.qa_matrix` já congelado.
5. Faltam decisões/contratos: JSON Schema `technology-baseline/v1`, gates da baseline como entidade, e a definição de "repositório do projeto" para o inventário.

O plano é um **excelente documento normativo** (modelo de domínio, princípios, políticas de inatividade/imutabilidade) e está fortemente alinhado aos padrões já estabelecidos no código (workflow publicado, SUPERSEDED aditivo, `UNIQUE NULLS NOT DISTINCT`, intenção/hash/reconciliação). Preciso de um **refactor para transformá-lo em um plano executável por etapas**, com decomposition, contrato de schema, ordem com dependências e tratamento explícito dos E2Es F3 legados.