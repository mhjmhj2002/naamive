---
document_type: phase-planning
status: DRAFT_FOR_HUMAN_VALIDATION
created_at: 2026-08-05
scope: planning of Phase 4 only; no implementation authorization
primary_roadmap: 01_DELIVERY_ROADMAP.md
---

# Planejamento da Fase 4 — Baseline Tecnológica antes dos Módulos

## Objetivo e demonstração

A Fase 4 cria uma decisão de implementação explícita entre o compromisso de produto e a primeira materialização de módulo. Ela não escolhe tecnologia por conta própria: reúne um inventário seguro do repositório, permite que o operador confirme as restrições e preferências do projeto e registra o que continua em aberto para a arquitetura de cada módulo.

A demonstração de aceite parte de um novo projeto cujo produto foi aprovado. Pela web, o operador revisa a baseline proposta, deixa o banco como “a definir na arquitetura do módulo”, aprova a decisão e só então cria o primeiro módulo. A proposta, a arquitetura, o work item, a matriz de QA e a execução Dev desse módulo referenciam a mesma revisão imutável da baseline. Uma mudança material posterior cria nova revisão e não altera os registros já autorizados.

## Escopo e exclusões

Inclui F4-01 a F4-06: workflow e gate da baseline, inventário read-only do repositório, revisões/evidências imutáveis, experiência web, bloqueio da primeira materialização e propagação da revisão aos objetos de entrega.

Não inclui escolher automaticamente linguagem, banco ou infraestrutura; executar instalação, migration, deploy ou comandos arbitrários no repositório; criar PR/release/aceite final, que pertencem à Fase 5; nem reescrever projetos ou módulos já materializados na Fase 3. A baseline registra contexto e autorização — não substitui a decisão arquitetural de cada módulo.

## Pré-requisitos para iniciar implementação

| Item | Condição verificável de desbloqueio |
| --- | --- |
| Fase 3 | A materialização de módulo, suas revisões e o gate individual continuam preservados para projetos legados. |
| Workflow publicado | A nova versão do workflow de projeto pode ser publicada sem editar definições/transições já aplicadas, e a seleção de versão ocorre atomicamente ao iniciar a descoberta. |
| Vínculo Git | O repositório vinculado passa pela allowlist existente e tem SHA inicial persistido. |
| Artefatos | `ArtifactStore` suporta intenção, hash, reconciliação e referências para inventário e baseline. |

Não há migração silenciosa de projeto já em `PRODUCT_COMMITMENT` ou com módulo criado. A política da baseline vale para projetos novos na versão nova do workflow; legado permanece consultável e explicitamente identificado como `BASELINE_NOT_REQUIRED_LEGACY`.

## Modelo de domínio proposto

### Inventário tecnológico

`technology_inventory` é um snapshot read-only, ligado ao projeto, ao SHA do repositório e à execução que o produziu. Ele contém somente fatos detectáveis e sanitizados: arquivos de manifesto reconhecidos, linguagens/runtime declarados, framework provável, persistência/integrações/CI/infraestrutura identificáveis e limitações da detecção. Cada fato informa `source_path`, `detector_code`, `confidence` e valor resumido; nunca inclui conteúdo integral de configuração, credencial, segredo, variável de ambiente ou log bruto.

A coleta usa uma lista fechada de caminhos e parsers locais (por exemplo `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml`, `Dockerfile`, manifests de infraestrutura e pipelines). O job lê exclusivamente uma worktree Git temporária e detached criada no `repository_sha` persistido na reserva do job; não lê a árvore de trabalho do operador nem `HEAD` atual. Antes e depois da leitura confirma que `rev-parse <sha>` resolve exatamente o SHA reservado, registra `requested_sha` e `read_sha`, e falha sem snapshot se divergirem. A criação/remoção da worktree é controlada pelo runtime, fora dos paths de desenvolvimento, e não executa scripts do projeto, hooks Git, gerenciador de pacotes ou comando indicado pelo repositório.

O caminhamento rejeita symlink, submódulo, path fora da allowlist, arquivo acima do limite versionado e manifesto malformado; registra somente o código sanitizado da rejeição, path permitido e detector. Parsers têm limite de bytes, profundidade e tamanho de campos; nunca serializam conteúdo, lockfiles integrais, variáveis, URLs com credenciais, stdout/stderr ou prompts. Ausência de evidência é “não detectado”, não prova de ausência.

### Baseline e revisão

`technology_baseline` identifica a baseline do projeto. `technology_baseline_revision` é imutável, possui número monotônico, estado, `inventory_id` usado, autor/ator servidor, correlação e artefato canônico. O payload versionado contém:

| Área | Conteúdo |
| --- | --- |
| Stack existente | Tecnologias confirmadas e vínculo com o inventário. |
| Tecnologias permitidas/preferidas | Linguagem/runtime e versões, frameworks e bibliotecas/padrões relevantes. |
| Persistência e integração | Banco, mensageria, APIs e contratos permitidos ou proibidos. |
| Infraestrutura | Build, execução, deploy e ambientes, quando conhecidos. |
| Segurança e compatibilidade | Restrições, políticas, paths/padrões e compatibilidade com o repositório. |
| Decisões abertas | Campo explícito `DEFER_TO_MODULE_ARCHITECTURE`, com pergunta e justificativa. |

O payload obedece a um JSON Schema versionado (`technology-baseline/v1`). Cada item possui uma identidade canônica `ecosystem:name` normalizada em minúsculas, tipo, intervalo SemVer/versão exata quando aplicável, classificação e justificativa. Para a mesma identidade e escopo não pode haver mais de uma classificação nem ranges incompatíveis; `DEFER_TO_MODULE_ARCHITECTURE` é exclusivo daquela identidade/decisão e não pode coexistir com `REQUIRED`, `ALLOWED`, `PREFERRED` ou `PROHIBITED`. A precedência de validação é `PROHIBITED` (nega) > `REQUIRED` (exige range compatível) > `PREFERRED` (orienta) > `ALLOWED` (permite). O servidor valida o schema, normaliza identidades e rejeita contradições antes de criar a revisão. A arquitetura do módulo declara tecnologias na mesma forma normalizada e só pode ser aprovada se satisfizer todos os `REQUIRED` e nenhum `PROHIBITED`; `PREFERRED` divergente exige justificativa auditada.

“Não definido” só é válido como decisão aberta explícita; não é string vazia. O gate aprova uma revisão, não uma inferência. Revisões `DRAFT`, `PENDING_APPROVAL`, `APPROVED`, `REJECTED` e `SUPERSEDED` não são sobrescritas.

Uma alteração material — tecnologia requerida/proibida, versão de runtime, banco, integração, segurança, infraestrutura ou decisão aberta que afete compatibilidade — cria revisão nova e gate. Texto explicativo e metadado sanitizado podem ter correção editorial sem alterar a revisão aprovada apenas se não mudarem a semântica; essa classificação deve ser auditada pelo servidor, nunca inferida pelo navegador.

### Referências aplicadas e integridade transacional

Uma migration aditiva cria `technology_baselines(id, project_id, ...)`, `technology_baseline_revisions(id, baseline_id FK, project_id FK, revision_number, inventory_id FK, payload, schema_version, status, ...)` e `technology_baseline_gates(id, project_id FK, baseline_revision_id FK, status, version, ...)`. Também adiciona `technology_baseline_revision_id uuid REFERENCES technology_baseline_revisions(id)` a `modules`, `module_revisions`, `module_gates`, `work_items`, `deliveries` e `findings`; cria `qa_matrices(id, project_id FK, work_item_id FK, delivery_id FK, technology_baseline_revision_id FK NOT NULL, payload, hash, ...)`, substituindo a matriz congelada somente-em-payload. `jobs`/execuções Dev recebem a mesma coluna e `integration_candidates.manifest` inclui o ID por work item. Os artefatos `module-definition`, arquitetura, `module-plan`, `qa-report`, manifesto/validação de candidata e evidência Dev repetem o ID apenas como referência verificável, nunca como fonte de verdade.

Para um projeto v3, a materialização escolhe uma revisão aprovada e grava o mesmo ID em módulo, revisão e gate; toda escrita posterior o herda exclusivamente do pai persistido. A igualdade obrigatória é: `modules = module_revisions = module_gates`; `work_items = sua module_revision`; `deliveries = seu work_item`; `qa_matrices = sua delivery/work_item`; `findings = sua delivery` (ou, em candidata, o work item do manifesto); jobs/execuções e payloads de evidência repetem o ID da entidade de origem. FKs compostas/guards verificam também que todos pertencem ao mesmo projeto e uma trigger transacional de `INSERT`/`UPDATE` rejeita nulo, revisão não `APPROVED` ou qualquer desigualdade. A única exceção é projeto com `workflow_code='PROJECT_DISCOVERY'` e `workflow_version <= 2`, marcado `BASELINE_NOT_REQUIRED_LEGACY`; rotas alternativas não podem escolher a exceção. Escrita direta, caminho alternativo e worker usam a mesma transação/guard.

Novo módulo pode usar a revisão recém-aprovada. Alterar baseline no meio de módulo ativo não muda seu contrato: exige revisão material do módulo e os gates correspondentes, ou decisão explícita de manter a baseline anterior. Registros legados podem ter a referência nula, acompanhada da marca de política legada; isso não é convertido retroativamente.

## Workflow, seleção de versão, gates e comandos

Publicar `PROJECT_DISCOVERY` v3 completo, copiando todos os estados, transições, guards e políticas de arquivamento de v2 (inclusive `WAITING_FOR_REVIEW_ADJUSTMENT`, recuperação de falha e `ARCHIVE_PROJECT` → `PROJECT_ARCHIVING`), e acrescentando a baseline após o gate de produto. `startProductDiscovery` deixa de fixar `workflow_version=2`: para todo projeto criado após a publicação de v3, seleciona v3 na mesma transação que sai de `PROJECT_INTAKE/REGISTERED`; projetos que já iniciaram descoberta e todos os v2 continuam em sua versão. A seleção persiste no evento/operation e é imutável. Não há migração silenciosa de projetos em andamento.

Após a decisão `PRODUCT_COMMITMENT_APPROVED`, v3 cria inventário e entra em `TECHNOLOGY_BASELINE_IN_REVIEW`; quando o inventário estiver persistido, abre o gate e entra em `WAITING_FOR_TECHNOLOGY_BASELINE`:

```text
PRODUCT_COMMITMENT
  → TECHNOLOGY_BASELINE_IN_REVIEW
  → WAITING_FOR_TECHNOLOGY_BASELINE
  ├─ APPROVE_TECHNOLOGY_BASELINE → READY_FOR_MODULE_MATERIALIZATION
  └─ REQUEST_BASELINE_ADJUSTMENTS → TECHNOLOGY_BASELINE_IN_REVIEW

READY_FOR_MODULE_MATERIALIZATION
  → MATERIALIZE_MODULE → módulo aguarda aprovação individual
  └─ START_TECHNOLOGY_BASELINE_REVISION → TECHNOLOGY_BASELINE_IN_REVIEW
```

`ARCHIVE_PROJECT` permanece disponível em cada estado ativo acima e segue integralmente a política global publicada: cancela/reconcilia job/gate de baseline, registra evidência e chega a `ARCHIVED`. `REQUEST_BASELINE_ADJUSTMENTS` fecha o gate daquela revisão como `REJECTED`; nunca retorna para editar o objeto rejeitado.

O nome exibido na timeline deve ser amigável: “Preparando orientações técnicas”, “Revisão técnica necessária” e “Orientações técnicas aprovadas”. Os estados/códigos internos só aparecem em evidência e suporte, não como chamada principal ao operador.

Comandos mínimos:

| Comando | Autoridade | Regra |
| --- | --- | --- |
| `START_TECHNOLOGY_INVENTORY` | worker | Só no estado elegível e no SHA vinculado; cria operação/job/evidência antes da leitura. |
| `SUBMIT_TECHNOLOGY_BASELINE` | operador | Só para `DRAFT`; valida schema e cria um único gate novo `OPEN` vinculado àquela revisão, mudando-a para `PENDING_APPROVAL`. Nunca atualiza gate. |
| `DECIDE_TECHNOLOGY_BASELINE` | operador | Exige versão do gate aberto; aprova ou rejeita-o definitivamente. Rejeição exige feedback, preserva a revisão/gate e retorna a `TECHNOLOGY_BASELINE_IN_REVIEW`. |
| `START_TECHNOLOGY_BASELINE_REVISION` | operador | A partir de revisão `REJECTED` ou `APPROVED`, cria novo `DRAFT` monotônico que aponta `supersedes_revision_id`. Nenhum rascunho é editado: corrigir seu conteúdo o marca `SUPERSEDED`/abandonado e cria outro rascunho numerado. Submeter cria novo gate. |
| `MATERIALIZE_MODULE` | operador | Para v3, exige baseline aprovada: usa a última aprovada por padrão ou aceita `technology_baseline_revision_id` explicitamente selecionada dentre as aprovadas do projeto; fixa-a na proposta. Para v2 legado mantém a regra existente. |

Há no máximo um gate `OPEN` por revisão (índice parcial); uma revisão tem no máximo uma decisão. Há no máximo um `DRAFT` ativo por baseline, mas revisões aprovadas podem coexistir para preservar módulos existentes. Após aprovação, `READY_FOR_MODULE_MATERIALIZATION` permanece disponível: iniciar uma nova revisão não bloqueia módulos enquanto houver ao menos uma revisão aprovada, e novos módulos recebem por padrão a última aprovada, ou outra aprovada escolhida pelo operador. Todo comando aceita `idempotency-key`, retorna `ACCEPTED` com `operation_id` quando assíncrono e registra evento persistido. O ator é obtido de `NAAMIVE_OPERATOR_ID`. Conflito de versão, baseline ausente ou tentativa de materializar com revisão não aprovada retorna erro explicável sem efeito.

## Evidências e auditoria

| Etapa | Artefato canônico mínimo |
| --- | --- |
| Inventário | `technology-inventory`: SHA observado, detectores/versões, fatos sanitizados, limitações e hash. |
| Revisão | `technology-baseline`: payload completo versionado, inventário de origem, classificação das escolhas e decisões abertas. |
| Gate | `technology-baseline-decision`: versão, decisão, feedback e hash da revisão aprovada/rejeitada. |
| Mudança material | `technology-baseline-revision`: revisão anterior, resumo de diferenças classificadas e decisão aplicável. |

O protocolo de intenção, escrita, hash, transação e reconciliação do `ArtifactStore` é obrigatório. Caminhos de configuração podem ser registrados somente quando pertencem à allowlist; conteúdo, tokens, URLs com credenciais, stdout/stderr e prompts completos são proibidos.

## API, web e SSE

Endpoints devem ser aninhados no projeto e não aceitar fatos tecnológicos calculados pelo navegador:

```text
GET  /api/projects/:projectId/technology-baseline
POST /api/projects/:projectId/technology-baseline/inventory
POST /api/projects/:projectId/technology-baseline/revisions
POST /api/projects/:projectId/technology-baseline/decision
POST /api/projects/:projectId/technology-baseline/revisions/:revisionId/start-revision
```

A tela apresenta primeiro uma explicação simples: “Estas orientações serão usadas ao planejar e desenvolver os próximos módulos. Você pode deixar decisões específicas para a arquitetura de cada módulo.” Em seguida mostra o que foi detectado, o que o operador confirmou, restrições, preferências e decisões em aberto, cada uma com fonte e incerteza quando aplicável. Ela não chama a decisão de deploy, entrega ou aprovação de código.

Enquanto a baseline estiver pendente, a ação “Criar módulo” fica indisponível e explica: “Revise as orientações técnicas antes de criar o primeiro módulo.” Após aprovação, a linha do tempo mostra a aprovação e a tela passa a oferecer a criação do módulo. Projetos legados mostram aviso informativo, sem bloquear nem fingir que possuem baseline aplicada.

SSE publica `TECHNOLOGY_INVENTORY_STARTED`, `TECHNOLOGY_INVENTORY_READY`, `TECHNOLOGY_BASELINE_SUBMITTED`, `TECHNOLOGY_BASELINE_APPROVED`, `TECHNOLOGY_BASELINE_ADJUSTMENTS_REQUESTED` e `TECHNOLOGY_BASELINE_REVISION_STARTED`. A projeção usa replay por cursor e mostra resumo sanitizado, duração, próxima ação e referências de evidência.

## Testes e validação

1. Unitários: schema/normalização, precedência e contradições de escolhas, versões/ranges, decisão aberta explícita, validação da arquitetura, mudança material, guards e herança da revisão.
2. PostgreSQL: atomicidade de revisão/gate/evento/operação, índice de único gate aberto, rejeição seguida de reenvio, conflito de versão, segunda baseline com módulo ativo, preservação da versão aprovada e projeto v2 legado sem bloqueio retroativo; tentar inserir work item/delivery/finding por rota alternativa sem referência ou com ID divergente falha na trigger.
3. Integração de inventário: crash/retry após reserva e antes/depois da escrita, mudança de `HEAD` entre enfileiramento e leitura, worktree detached no SHA, symlink, submódulo, path fora da allowlist, arquivo excessivo, manifesto malformado, segredo e arquivo não suportado; confirma ausência de execução e de exposição sensível.
4. E2E web: compromisso aprovado → inventário → baseline com decisão aberta → aprovação → criação de módulo; valida bloqueio antes do gate, escolha de revisão aprovada para segundo módulo, cópia da revisão ao módulo/work item/QA/Dev e uma nova baseline que não altera módulo já autorizado.
5. Regressão Fase 3: cenário de projeto legado continua a materializar e entregar módulo sem baseline retroativa; cenário v3 não pode iniciar Dev se alguma referência obrigatória de baseline estiver ausente.

## Sequência F4-01 a F4-06

| Ordem | Tarefa | Resultado verificável |
| --- | --- | --- |
| 1 | F4-01 | Workflow v3, estados, guards e migração aditiva publicados; v2 permanece intacto. |
| 2 | F4-02 | Inventário seguro e read-only gera snapshot sanitizado no SHA vinculado. |
| 3 | F4-03 | Baseline/revisões/evidências imutáveis persistem escolhas, restrições e decisões abertas. |
| 4 | F4-04 | Web e SSE permitem revisão humana amigável e gate versionado. |
| 5 | F4-05 | Novo projeto não materializa o primeiro módulo sem baseline aprovada; legado não é bloqueado. |
| 6 | F4-06 | A revisão aplicada permanece referenciada por todos os contratos de implementação relevantes. |

Os status no roadmap só mudam de `TO DO` para `DOING` após autorização de implementação. Este plano não altera status nem cria issues.

## Critério de aceite da Fase 4

Em repositório descartável com `package.json`, pipeline e configuração de banco, um projeto novo alcança o compromisso de produto. A web mostra o inventário sanitizado e permite ao operador confirmar Node/TypeScript como permitido, declarar a integração corporativa como restrição e deixar o banco como decisão da arquitetura do módulo. Antes da aprovação, a API e a UI recusam a criação do primeiro módulo; depois dela, a proposta criada contém a revisão de baseline aprovada. A arquitetura, o work item, a matriz de QA e a execução Dev conservam essa mesma referência. Uma revisão posterior que troca uma tecnologia proibida/permitida cria gate novo, mas não modifica os registros anteriores. Um projeto v2 já em `PRODUCT_COMMITMENT` continua consultável e executa a jornada legada sem inserção retroativa de evento ou baseline. A timeline, SSE e evidências permitem auditar toda a jornada sem revelar conteúdo sensível ou executar código do repositório.
