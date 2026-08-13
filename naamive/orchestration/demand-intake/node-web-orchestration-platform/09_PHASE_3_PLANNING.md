---
document_type: phase-planning
status: DRAFT_FOR_HUMAN_VALIDATION
created_at: 2026-08-04
scope: planning of Phase 3 only; no implementation authorization
primary_roadmap: 01_DELIVERY_ROADMAP.md
---

# Planejamento da Fase 3 — Ciclo de Módulo, Desenvolvimento e QA

## Objetivo e demonstração

A Fase 3 transforma módulos consolidados no `PRODUCT_COMMITMENT` em entregas rastreáveis. O operador aprova um módulo, acompanha sua definição, arquitetura, planejamento, desenvolvimento e QA. Reprovação de QA cria finding ligado à entrega revisada; a correção retorna a Dev e é revalidada até aprovação ou escalonamento.

A demonstração de aceite parte de um projeto em `PRODUCT_COMMITMENT`: aprovar um módulo, criar o trabalho autorizado, produzir uma entrega Dev, reprová-la em QA, registrar finding, corrigir em nova execução, aprovar a revalidação e deixar a integração da fase elegível e auditável pela web.

## Escopo e exclusões

Inclui F3-01 a F3-09: materialização de módulos, rounds de definição, arquitetura e planejamento, work items, branches/worktrees, Dev, QA, findings, rework, integração em `integration`, projeções web/SSE e aceite.

Não inclui PR draft para `main`, release, aceite final do projeto ou remoção do runtime Python: pertencem à Fase 7. Embora este plano tenha previsto o consumo do contrato neutro, a Fase 3 foi encerrada com paridade Codex-only e não será reaberta para essa migração. A Fase 4 executa o corte controlado de worker, agentes e demais consumidores para `AgentExecutionService` em F4-12, preservando essa paridade. M-001 a M-005 do backlog futuro também não entram como requisito: diagnóstico ampliado de agente, área de documentos, previsão de duração, programa geral de observabilidade e semântica visual da timeline.

## Pré-requisitos para iniciar implementação

O planejamento pode avançar, mas implementação fica bloqueada enquanto estes itens do roadmap estiverem `OPEN`:

| Item | Condição verificável de desbloqueio |
| --- | --- |
| P1-05 | Política Git implementada/testada para árvore suja, remoto adiantado, conflito, push recusado e branch protegida, com estado recuperável e causa sanitizada. |
| P2-02 | Commits automatizados usam `naamive-bot` e trailers `Naamive-Project`, `Naamive-Phase`, `Naamive-Execution` e `Naamive-Work-Item`. |
| P2-03 | Integração de `phases/<fase>` em `integration` usa merge commit e persiste SHAs de origem, ponta anterior, merge, push e evidências. |
| P2-04 | Testes usam remoto bare temporário isolado; smoke autenticado usa somente repositório GitHub descartável identificado e limpo de modo auditável. |

Não há bypass manual silencioso: divergência ou falha mantém refs e evidências, interrompe apenas o trabalho afetado e projeta `ATENCAO_NECESSARIA` com próxima ação explícita.

## Modelo de domínio proposto

### Módulo

`module` é entidade persistida de identidade imutável, criada a partir da lista consolidada no compromisso aprovado. Registra nome, objetivo, escopo, fora de escopo, dependências, critérios de aceite, posição, fonte da evidência e versão do gate que o autorizou. A aprovação individual ocorre na Fase 3; o pacote da Fase 2 não autoriza execução implícita de todos os módulos.

Mudança material de objetivo, escopo, dependência ou critério cria uma nova `module_revision` imutável e gate aplicável; nunca sobrescreve a versão aprovada. Todo round, work item, entrega, finding, decisão arquitetural e gate referencia explicitamente a revisão do módulo. Ao aprovar uma revisão material, rounds e work items pendentes da revisão anterior passam para `SUPERSEDED`; Dev, QA e novas correções sobre ela são bloqueados. Entregas/findings concluídos permanecem somente leitura para auditoria; findings abertos exigem classificação explícita como migrados para a revisão nova, obsoletos ou aceitos em gate de risco.

### Round, work item, entrega e finding

`module_round` agrupa uma rodada de definição, arquitetura, planejamento, Dev e QA. `work_item` pertence a módulo, revisão e round e contém escopo autorizado, entradas, critérios verificáveis, allowlist/denylist de paths normalizados, dependências, saída esperada e referências de evidência. Uma execução Dev atua somente no work item autorizado.

`delivery` registra work item, execução, branch, worktree, SHA inicial, SHA de ponta, commits, validações e artefatos. `finding` tem origem explícita `DELIVERY_QA` ou `CANDIDATE_VALIDATION`, regra/teste ou critério, severidade, descrição sanitizada, evidência, estado, round de correção e revalidação. Ele exige exatamente um de `delivery_id` ou `integration_candidate_id`: `DELIVERY_QA` exige a entrega e o SHA revisados; `CANDIDATE_VALIDATION` exige a candidata e seus `responsible_work_item_ids` não vazios. Seus estados são `OPEN`, `FIXED_PENDING_REVALIDATION`, `CLOSED`, `ACCEPTED_RISK` e `OBSOLETE`. Deduplicação de `DELIVERY_QA` usa origem, entrega, regra/teste e fingerprint normalizado; deduplicação de `CANDIDATE_VALIDATION` usa origem, SHA da candidata, regra/teste e fingerprint normalizado. A relação de work items responsáveis é separada e não participa da chave de deduplicação. Reabertura cria evento e retorna a `OPEN`. Só QA aprovado sobre entrega posterior fecha explicitamente um finding de `DELIVERY_QA`; finding de candidata segue a atribuição e nova candidata descritas adiante.

Severidade é `CRITICAL`, `HIGH`, `MEDIUM` ou `LOW`. `CRITICAL` bloqueia e escala imediatamente; `HIGH` bloqueia até correção ou gate de aceitação de risco; `MEDIUM` bloqueia o work item, salvo aceitação de risco versionada; `LOW` não bloqueia a entrega, mas permanece rastreado e pode ser aceito em risco. Nenhum finding `ACCEPTED_RISK` é fechado: somente deixa de bloquear conforme o gate correspondente.

## Workflows, gates e comandos

Publicar três workflows imutáveis, separados de `PROJECT_DISCOVERY`. `MODULE_DELIVERY` v1 governa módulo/round e só alcança `MODULE_COMPLETED` depois de todos os seus work items obrigatórios terem sido incorporados à candidata integrada ou explicitamente escalonados/aceitos em gate:

```text
WAITING_FOR_MODULE_APPROVAL
  → DEFINITION_IN_PROGRESS
  → WAITING_FOR_ARCHITECTURE_DECISION
  → PLANNING_IN_PROGRESS
  → WORK_ITEMS_ACTIVE
  → WAITING_FOR_MODULE_COMPLETION
  → MODULE_COMPLETED
  └─ MODULE_REOPENED_FOR_CANDIDATE_FINDING → WORK_ITEMS_ACTIVE
  └─ START_MODULE_REVISION → DEFINITION_IN_PROGRESS
```

`WORK_ITEM_DELIVERY` v1 governa cada item, sem concluir o módulo:

```text
WAITING_FOR_WORK_ITEM_AUTHORIZATION
  → DEVELOPMENT_IN_PROGRESS
  → QA_IN_PROGRESS
  ├─ aprovado → READY_FOR_PHASE_MERGE → MERGED_TO_PHASE
  │    └─ finding de candidata atribuído → REWORK_ELIGIBLE
  ├─ finding elegível → REWORK_ELIGIBLE → DEVELOPMENT_IN_PROGRESS
  └─ limite/risco/escopo/arquitetura → WAITING_FOR_ESCALATION
```

`INTEGRATION_CANDIDATE` v1 governa o conjunto de fase:

```text
CANDIDATE_CREATED
  → CANDIDATE_VALIDATION_IN_PROGRESS
  ├─ aprovado → INTEGRATION_PENDING → INTEGRATION_IN_PROGRESS → INTEGRATED
  ├─ falha transitória de validação → INTEGRATION_BLOCKED
  │    ├─ REVALIDATE_CANDIDATE → CANDIDATE_VALIDATION_IN_PROGRESS
  │    ├─ SUPERSEDE_CANDIDATE → SUPERSEDED
  │    └─ ESCALATE_INTEGRATION → WAITING_FOR_ESCALATION
  ├─ falha Git → INTEGRATION_BLOCKED
  │    ├─ RETRY_INTEGRATION → INTEGRATION_IN_PROGRESS
  │    ├─ RECONCILE_INTEGRATION → INTEGRATION_PENDING
  │    └─ ESCALATE_INTEGRATION → WAITING_FOR_ESCALATION
  └─ cancelamento → ARCHIVE_RECONCILIATION_REQUIRED → ARCHIVED
```

Estados de falha recuperável, pausa e arquivamento global devem ser publicados nos contratos aplicáveis. `START_MODULE_REVISION` é permitido de qualquer estado não terminal e não arquivado de `MODULE_DELIVERY`, inclusive trabalho em andamento. Exige uma nova `module_revision` aprovada; primeiro supersede a revisão anterior, bloqueia seus work items pendentes e encerra/cancela de modo governado operações, jobs e gates ativos correlacionados, preservando a auditoria. Em seguida cria novo `module_round` e leva o módulo a `DEFINITION_IN_PROGRESS`; se a revisão já possuir definição, arquitetura e plano autorizados, o gatilho equivalente `APPROVE_MODULE_REVISION_PLAN` pode levá-lo diretamente a `WORK_ITEMS_ACTIVE`. `MODULE_COMPLETED` é não terminal para esse fim, pois uma revisão material ou finding de candidata pode reabri-lo. Cada `INTEGRATION_BLOCKED` persiste `blocked_kind` versionado: `VALIDATION_TRANSIENT`, `VALIDATION_CODE_DEFECT`, `GIT_RECOVERABLE` ou `GIT_DIVERGED`. Os guards só permitem `REVALIDATE_CANDIDATE` para `VALIDATION_TRANSIENT`; `SUPERSEDE_CANDIDATE` ou escalonamento para `VALIDATION_CODE_DEFECT`; `RETRY_INTEGRATION` e `RECONCILE_INTEGRATION` para `GIT_RECOVERABLE`; e somente reconciliação/escalonamento para `GIT_DIVERGED`. Assim nenhum retry Git pula a validação. `SUPERSEDE_CANDIDATE` exige correção de código e cria candidata nova depois de a anterior ser preservada como `SUPERSEDED`. Arquivamento durante `INTEGRATION_IN_PROGRESS` solicita cancelamento, preserva a tentativa e obriga `ARCHIVE_RECONCILIATION_REQUIRED` a consultar o remoto antes de declarar `ARCHIVED`; estado remoto desconhecido nunca é tratado como não aplicado. Todo comando retorna `ACCEPTED` com `operation_id`; agentes persistem evidência e solicitam transição, sem alterar estado canônico.

Gates humanos obrigatórios: aprovação inicial do módulo, decisão arquitetural material, autorização do work item, aceitação de risco por finding e escalonamento. Cada gate registra versão, ator do servidor, decisão, feedback obrigatório na reprovação e referências às evidências de suporte. QA só aprova uma entrega com zero findings bloqueantes em `OPEN` ou `FIXED_PENDING_REVALIDATION`; `ACCEPTED_RISK` exige gate versionado e não equivale a finding fechado.

## Evidências

Cada job grava JSON estruturado e Markdown legível no `ArtifactStore`, com schema versionado, correlação, hash e referências de entrada:

| Etapa | Artefato canônico mínimo |
| --- | --- |
| Definição | `module-definition`: objetivo, escopo, fora de escopo, critérios, dependências e perguntas abertas. |
| Arquitetura | `module-architecture`: alternativas, decisão, consequências, riscos e pontos de gate. |
| Planejamento | `module-plan`: work items, entradas, limites, saída e estratégia de validação. |
| Dev | `development-delivery`: branch/worktree, SHAs, commits, alterações e validações. |
| QA | `qa-report`: critérios, resultados, findings, severidade e recomendação. |
| Rework | `rework-decision`: findings elegíveis, justificativa, limite e referência da correção. |
| Candidata | `integration-candidate-validation`: SHA congelado, manifesto derivado, matriz executada, resultado e findings de integração. |
| Integração | `integration-attempt` e `phase-integration-record`: tentativa, SHAs pai/observados, consulta remota, merge, push, resultado e validações. |

Aplicar o protocolo existente de intenção, hash, reconciliação e transação. Nunca persistir prompt completo, stdout/stderr bruto, tokens, segredos ou variáveis de ambiente.

## Estratégia Git

Cada work item usa uma branch `work-items/<id>`, criada do SHA congelado de `phases/3`. Somente depois do QA aprovando aquela entrega e de todos os findings bloqueantes estarem resolvidos é permitido merge commit de `work-items/<id>` para `phases/3`. Antes de cada nova entrega, inclusive rework, o item deve integrar a ponta atual de `phases/3` em sua branch e resolver eventual conflito de modo auditável. Esse merge/rebase de sincronização é um evento próprio, com SHA anterior, SHA da ponta de fase e SHA-base resultante; ele substitui o SHA-base da execução. A política de paths usa exclusivamente o diff incremental produzido pela execução Dev a partir dessa nova base, não o diff que trouxe alterações legítimas da fase. A entrega baseada em SHA antigo não pode seguir diretamente a merge de fase.

A unidade de integração é um `integration_candidate` imutável, congelado pelo SHA da ponta de `phases/3` e por um manifesto derivado de todos os work items já `MERGED_TO_PHASE` nessa ancestralidade. Não há seleção de subconjunto pelo operador: a candidata sempre contém exatamente todos os itens aprovados já mergeados. Após congelá-la, a etapa obrigatória `CANDIDATE_VALIDATION` executa a matriz de integração relevante no SHA exato da candidata. Falha mantém a candidata em `INTEGRATION_BLOCKED`, sem invalidar retroativamente o QA individual. Falha transitória pode usar `REVALIDATE_CANDIDATE` no mesmo SHA; defeito de código exige finding corretivo e `SUPERSEDE_CANDIDATE`, seguida de candidata nova. Só candidata aprovada pode iniciar integração.

`START_INTEGRATION` nunca faz merge da ref móvel `phases/3`: cria worktree detached no SHA congelado da candidata e executa merge desse SHA em `integration`. O guard exige que o segundo pai do merge observado seja exatamente o SHA da candidata e registra também o SHA anterior de `integration`. A ref `phases/3` pode avançar após o congelamento, mas não altera a unidade integrada.

Antes de Dev, validar árvore limpa, remoto configurado, base autorizada e `integration` sincronizada. Criar ou validar `integration`, `phases/3` e a branch do work item. Validar nomes para evitar refs prefixo ambíguas. Commits automatizados usam `naamive-bot`, mensagem `<tipo>(<work-item>): <resumo>` e trailers de P2-02.

Um worktree tem `worktree_id`, path canônico, execução dona, lease, SHA-base e estado persistidos. Há no máximo um lease ativo por repositório. No restart, o reconciliador confere existência, propriedade, árvore limpa e SHA antes de renovar ou bloquear a execução. Só remove worktree comprovadamente limpo, pertencente a execução encerrada e sem ref ativa; falha preserva-o para diagnóstico e impede reuso.

O agente calcula o diff contra o SHA-base em paths normalizados. A allowlist/denylist do work item bloqueia automaticamente commit por mudança fora de escopo, rename/delete que alcance path proibido, symlink que escape da raiz, submodule ou hook Git não autorizado. A violação abre escalonamento; não é somente aviso.

## Tentativa de integração e reconciliação

`integration_attempt` é imutável e criada antes de qualquer efeito Git, com chave de idempotência, candidata, SHA pai esperado da candidata, SHA pai esperado de `integration`, operação e intenção de artefato. O SHA de merge não é previsto: autor, committer, data e mensagem de merge não são determinísticos sem construção artificial. O runtime registra o SHA de merge observado depois do comando e o usa nas consultas de reconciliação. Antes de repetir merge ou push, consulta obrigatoriamente as refs locais/remotas e classifica:

| Resultado | Conduta |
| --- | --- |
| `NOT_APPLIED` | Nenhum merge/push correspondente existe; pode executar uma única tentativa com os SHAs esperados. |
| `APPLIED_UNRECORDED` | Merge/push já existe, mas PostgreSQL/artefato não foram concluídos; reconcilia a mesma tentativa sem repetir side effect. |
| `DIVERGED` | Ref, SHA ou ancestralidade não coincidem; bloqueia a integração e exige reconciliação ou escalonamento humano. |

Commit de merge, push, escrita de artefato e transição PostgreSQL não são uma transação distribuída. A máquina de recuperação é: reservar intenção e tentativa no PostgreSQL; produzir/verificar artefato; consultar remoto; executar merge/push somente quando `NOT_APPLIED`; consultar novamente; registrar evidência/SHAs observados e concluir. Crash entre etapas resulta em `APPLIED_UNRECORDED` ou `DIVERGED`, nunca em novo merge/push cego. Conflito, remoto adiantado, push recusado, branch protegida ou PR inconsistente levam a `INTEGRATION_BLOCKED`, sem criar próxima fase ou resolução implícita.

Finding produzido por `CANDIDATE_VALIDATION` não é órfão: referencia o SHA da candidata e um ou mais work items responsáveis inferidos pela matriz/diff ou escolhidos pelo operador em gate. Se não houver responsabilidade segura, cria-se um work item corretivo explícito. O work item responsável sai de `MERGED_TO_PHASE` para `REWORK_ELIGIBLE`, gera nova entrega e é novamente mergeado em `phases/3`; se o módulo já estiver em `MODULE_COMPLETED`, o evento `MODULE_REOPENED_FOR_CANDIDATE_FINDING` o retorna a `WORK_ITEMS_ACTIVE`, referenciando candidata e finding causadores. A candidata que revelou o defeito passa para `SUPERSEDED` ou `WAITING_FOR_ESCALATION`. A correção sempre cria candidata nova, preservando a auditoria da anterior.

## QA e rework

O `module-plan` congela por work item a matriz de QA: comandos exatos, diretório, timeout, versão/ambiente esperado, critérios de aceite e política explícita para ausência de build, lint, typecheck ou testes. QA executa somente essa matriz congelada; qualquer alteração exige nova revisão/plano autorizado.

Finding produzido por QA de entrega torna correção elegível apenas se pertence à entrega e SHA revisados. Findings produzidos por `CANDIDATE_VALIDATION` seguem a regra específica de atribuição/correção definida na seção de reconciliação. A política inicial permite duas rodadas automáticas por par `work_item + module_revision`, não por finding ou entrega. Um contador monotônico é incrementado, a operação é criada e o estado é trocado na mesma transação; um índice único parcial permite uma única correção ativa por work item/revisão. Replays retornam a operação idempotente. Terceira rodada, finding crítico, mudança de escopo, impacto arquitetural ou repetição abre `WAITING_FOR_ESCALATION`. O operador decide novo escopo, alteração arquitetural, aceitação explícita de risco ou encerramento; nenhuma decisão fecha findings implicitamente.

## API, web e SSE

Cada comando da API tem payload versionado, `idempotency-key`, versão esperada da entidade/gate e, quando aplicável, revisão do módulo, tentativa e SHAs esperados. Comando defasado retorna conflito explicável sem efeito. O contrato deve nomear pelo menos: `MATERIALIZE_MODULE`, `DECIDE_MODULE`, `START_MODULE_REVISION`, `APPROVE_MODULE_REVISION_PLAN`, `DECIDE_ARCHITECTURE`, `AUTHORIZE_WORK_ITEM`, `START_DEVELOPMENT`, `SUBMIT_QA`, `AUTHORIZE_REWORK`, `CREATE_INTEGRATION_CANDIDATE`, `VALIDATE_INTEGRATION_CANDIDATE`, `REVALIDATE_CANDIDATE`, `SUPERSEDE_CANDIDATE`, `START_INTEGRATION`, `RETRY_INTEGRATION`, `RECONCILE_INTEGRATION`, `ESCALATE_INTEGRATION` e `ARCHIVE_INTEGRATION`. A identidade continua vindo apenas de `NAAMIVE_OPERATOR_ID` no servidor.

O detalhe do projeto mostra módulo e work item de modo progressivo: estado, etapa, duração real, heartbeat, SHAs, entrega, QA, findings, correções, revalidações, gates e próxima ação. SSE usa eventos persistidos e replay por cursor, sem percentual simulado; a web mostra somente resumos e referências sanitizadas.

## Testes e validação

1. Unitários: guards, três workflows, `blocked_kind` e suas transições permitidas, origem exclusiva de finding (`delivery_id` xor `integration_candidate_id`), idempotência, revisão material de módulo, limites de rework, severidade, proibição de fechamento sem revalidação e arquivamento durante integração.
2. PostgreSQL: atomicidade de estado/evento/operação/job, lease, restart, artefatos e arquivamento em qualquer estado ativo do workflow novo.
3. Integração Git local: remoto bare e clones temporários apenas; branch/worktree detached no SHA da candidata, rebase/merge da ponta de fase antes de rework, atualização de SHA-base e diff incremental de escopo, trailers, merge commit com segundo pai igual ao SHA congelado, push, conflito, remoto adiantado, merge já aplicado sem persistência, push confirmado seguido de crash e arquivamento durante push. URLs externas são proibidas nesta camada.
4. E2E web controlado: dois work items/módulos isolados, um aprovado e um pendente/reprovado; candidata derivada da ponta de fase, validação obrigatória no SHA congelado, finding de candidata em work item de módulo concluído que reabre o módulo e cria nova candidata, sincronização de fase que altera path fora da allowlist sem bloquear o Dev e alteração nova do agente nesse path que é bloqueada, além de timeout, interrupção e causa sanitizada.
5. Smoke remoto autenticado: allowlist efêmera que contém exclusivamente repositório GitHub descartável criado para o teste; valida permissões/proteção quando disponíveis, cleanup bem-sucedido e falha de limpeza. Não usa repositório real.

## Sequência F3-01 a F3-09

| Ordem | Tarefa | Resultado verificável |
| --- | --- | --- |
| 1 | F3-01 | Workflows separados de módulo, work item e candidata; módulos, rounds, evidências e gates materiais publicados. |
| 2 | F3-02 | Work item autorizado tem entradas, limites, saída e critérios rastreáveis. |
| 3 | F3-03 | Branches `work-items/<id>`, `phases/3` e worktrees com lease/reconciliação, política de paths e commits auditáveis validados em remoto temporário. |
| 4 | F3-04 | Dev isolado produz entrega e commits verificáveis somente para o work item. |
| 5 | F3-05 | QA reproduz matriz congelada, aplica severidade/findings ao SHA revisado e candidata recebe validação obrigatória no SHA congelado. |
| 6 | F3-06 | Rework limita rodadas, preserva histórico e escala casos materiais. |
| 7 | F3-07 | Candidata derivada da ponta de fase e validada é integrada a partir de seu SHA congelado por tentativa idempotente/reconciliável; merge/push para `integration` registram pais/SHAs/evidências e bloqueiam em falha. |
| 8 | F3-08 | Web/SSE acompanham módulo, work item, entrega, QA, finding e revalidação. |
| 9 | F3-09 | Aceite web controlado prova ciclo e falhas recuperáveis. |

Os status no roadmap só mudam de `TO DO` para `DOING` após autorização de implementação. Este plano não altera os status nem cria issues.

## Critério de aceite da Fase 3

Em repositório de referência descartável, o operador demonstra pela web: aprovação individual de módulo, dois work items isolados, entrega Dev em worktree/branch auditáveis, QA reprovado em um item, finding correlacionado, correção e revalidação aprovada no item elegível. A candidata derivada da ponta de `phases/3` passa por validação obrigatória no SHA congelado. O merge enviado a `integration` tem como segundo pai exatamente esse SHA e o conjunto de commits introduzidos entre o `integration` anterior e o merge é igual ao conjunto alcançável da candidata que não estava naquele `integration` anterior; ele não inclui commits do item pendente/reprovado. A jornada é recuperável após reinício, consultável por SSE/timeline e respaldada por evidências imutáveis. Falhas Git/agente permanecem sanitizadas e não avançam o workflow indevidamente.
