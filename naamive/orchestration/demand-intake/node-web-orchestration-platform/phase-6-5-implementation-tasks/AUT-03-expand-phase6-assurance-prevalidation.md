---
task: AUT-03-PREVALIDATION-01
parent_task: AUT-03
document_type: prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: ASSURANCE_EXPANSION_TO_REAL_WORK:v1
depends_on: [AUT-02]
guardrails: [GAT-01, GAT-03]
followed_by: REC-02
validated_at: 2026-08-25
---

# AUT-03-PREVALIDATION-01 — Contrato normativo da expansão de Assurance

## Decisão de desbloqueio

**PREVALIDATION_READY_FOR_IMPLEMENTATION.** AUT-03 pode ampliar Assurance
somente por `ASSURANCE_EXPANSION_TO_REAL_WORK:v1`, para dispatches criados após
a publicação de uma policy habilitada. A unidade aceita nunca é “o último
trabalho do módulo”: é o subject imutável e a geração explicitamente congelados
no dispatch. Uma decisão para uma geração não promove, desbloqueia nem substitui
uma geração posterior.

O contrato distingue três papéis que não podem ser confundidos:

| Papel | Autoridade | Consequência |
| --- | --- | --- |
| execução produtora | produz artefato/evidência para o subject congelado | não aprova o próprio resultado |
| Assurance | emite a única decisão técnica para a acceptance a que está vinculada | só aplica a consequência publicada para aquele subject/generation |
| gate humano GAT-01/GAT-02 | decide autoridade humana catalogada, autenticada por GAT-03 | nunca é substituído por serviço, agente, header ou payload |

`ACCEPT` técnico não é aprovação humana, `QA_PASSED` não é `ACCEPT`, e sucesso
de execução não é promoção de negócio.

## 1. Vocabulário, snapshot e identidade canônica

Cada dispatch elegível cria, na **mesma transação** que reserva/publica o job,
um `AssuranceDispatchSnapshot:v1`. Ele é a fonte normativa de seleção e contém:

```text
assurance_dispatch_key =
  assurance-dispatch:v1:<subject_kind>:<subject_id>:<normative_generation>

acceptance_key =
  assurance-acceptance:v1:<subject_kind>:<subject_id>:<normative_generation>:
  <policy_id>:<policy_version>
```

O snapshot persiste `policy_id`, `policy_version`, `policy_hash`,
`selection_result` (`SELECTED` ou `NOT_SELECTED`), `subject_kind`,
`subject_id`, `normative_generation`, `producer_execution_id`, `job_id`,
`operation_id`, `correlation_id`, `classification`, os IDs de projeto/módulo/WI
aplicáveis e o fingerprint de lineage específico da linha da matriz abaixo.
Policy e snapshot são imutáveis; `policy_hash` é o SHA-256 da policy
canonicalizada, inclusive selectors e configuração. O worker recebe apenas o
snapshot já persistido: não relê policy habilitada nem recalcula seleção.

`NOT_SELECTED` também é persistido e auditável. Nesse caso o dispatch segue
somente a continuidade legada/publicada; ele não cria acceptance depois por
mudança de policy, retry ou redelivery.

Uma acceptance é criada somente para um snapshot `SELECTED` cuja linha declare
`acceptance própria`. Banco deve impor unicidade sobre `acceptance_key` e o
vínculo de uma acceptance ao snapshot. A criação, a seleção e o outbox do
dispatch são atômicos. Em particular, `ON CONFLICT` deve devolver o registro
existente, nunca atualizar subject, geração ou policy congelados.

`normative_generation` não é contador genérico: é o identificador abaixo,
assinado pelo fingerprint/lineage do subject. Rework ou uma nova revisão só
criam geração quando criam esse novo subject normativo; retry, restart, lease
expirada, reconciliação e duplicate delivery mantêm a mesma geração.

## 2. Matriz fechada de subjects, evidência e consequência

Somente as linhas desta matriz podem ser selecionadas por AUT-03. `job_kind`
é o nome de runtime; `subject_kind` é estável e é o valor usado por policy. Um
novo kind exige nova revisão deste contrato antes de entrar em uma policy.

| Domínio / job kind | Subject e geração normativa | Execução e evidence produzida | Acceptance e autoridade única | Efeito de `ACCEPT` |
| --- | --- | --- | --- | --- |
| planning / `PLAN_MODULE_WORK_ITEMS` | `ModulePlanProposal:v1`; `module_plan_generation = <module_id>:<module_revision_id>:<plan_operation_id>:<context_hash>` | a execução produtora e seu output versionado; `module_plan_job_context` hash, artefatos JSON/Markdown, baseline e módulo/revision/round | acceptance própria técnica; não é gate | torna a proposta tecnicamente apta a ser submetida; somente `MODULE_PLAN_APPROVAL` pode materializar `module_plan_revision=APPROVED` |
| development / `DEVELOP_WORK_ITEM` | `WorkItemDeliveryCandidate:v1`; `delivery_candidate_id` e `work_item_revision_id`, cujo SHA/fingerprint já congelam `module_plan_revision_id`, `plan_work_item_id`, module revision/round, base/head SHA | execução de desenvolvimento identificada no candidate, commit/patch/output evidence e QA report | **a mesma** `work_acceptance` de AUT-02, uma por `delivery_candidate_id` | somente a acceptance AUT-02 aceita libera `MERGE_WORK_ITEM`; não existe acceptance AUT-03 adicional |
| QA / `RUN_DELIVERY_QA` | o mesmo `WorkItemDeliveryCandidate:v1` do desenvolvimento; geração é o mesmo `delivery_candidate_id` | QA determinístico e `QAReport:v1` com matrix/hash e SHA congelados | não tem acceptance própria nem policy AUT-03 selecionável; é evidência obrigatória da acceptance AUT-02 | `QA_ACCEPTED` somente habilita review AUT-02; não promove e não cria segundo `ACCEPT` |
| integration / `MERGE_WORK_ITEM`, `REASSESS_INTEGRATION_CANDIDATE`, `VALIDATE_INTEGRATION_CANDIDATE` | `IntegrationCandidate:v1`; `candidate_id` e `manifest_hash`, que congelam module revision, round, RequiredWorkItemSet, membros e respectivas delivery generations | merge evidence por membro, manifest e validação determinística da candidate | não tem acceptance própria nem policy AUT-03 selecionável; AUT-02 conserva a única cadeia de acceptances dos membros | candidate validada habilita somente a integração coletiva AUT-02; não reaceita membro nem cria autoridade paralela |
| release / `PREPARE_DELIVERY_PACKAGE` | `DeliveryPackage:v1`; `delivery_package_id` e `release_generation = <project_id>:<package_hash>:<delivery_revision>` | job futuro de GAT-02, pacote versionado, evidências de operação/handover e hashes dos artefatos técnicos | acceptance própria técnica, quando e somente quando GAT-02 publicar esse job/subject | marca o pacote tecnicamente conforme e entrega evidência para `DELIVERY_ACCEPTANCE`; não transita `DELIVERY → DELIVERED` |

`PREPARE_DELIVERY_PACKAGE` é reservado por este contrato: não existe hoje no
runtime e não pode ser despachado/selecionado até GAT-02 publicar sua criação,
schema, geração e adapter. A reserva evita que implementação futura invente
outro subject para release. Os três kinds internos de AUT-02 da linha
integration, assim como `RUN_DELIVERY_QA`, são listados para fixar sua fronteira
de evidência, não para permitir assurance sobre assurance.

Para planning e release, a implementação deve persistir o subject/generation no
snapshot e validar novamente seu fingerprint antes de cada efeito. Para
development, QA e integration, os IDs/hashes de AUT-02 são normativos; AUT-03
não pode derivá-los de estado atual mutável.

## 3. Decisões e consequências — sem autoridade concorrente

As quatro decisões abaixo pertencem apenas à acceptance própria da linha
planning ou release, ou à acceptance AUT-02 compartilhada na linha development.
Nas linhas QA e integration, tentar persistir `review_decision` para o job
interno falha fechado com `ASSURANCE_INTERNAL_JOB_NOT_SELECTABLE`.

| Domínio | `ACCEPT` | `REWORK` | `BLOCK` | `ESCALATE` |
| --- | --- | --- | --- | --- |
| planning | publica `PLAN_TECHNICALLY_ACCEPTED` para a mesma proposta/generation; aguarda exclusivamente `MODULE_PLAN_APPROVAL` | finding técnico e nova operação de planning; nova proposta cria nova generation | block técnico, sem submeter/aprovar plano | block correlacionado; só abre gate GAT-01 catalogado se a condição publicada o exigir |
| development (AUT-02) | única decision AUT-02 libera merge do candidate exato e posterior reassessment coletivo | finding/rework F3; AUT-01 cria nova delivery candidate/generation | finding/block AUT-02; sem merge | `WAITING_FOR_ESCALATION` somente com gate GAT-01 aplicável; sem merge |
| QA (AUT-02 interno) | **não aplicável**: `QA_ACCEPTED` é fato do executor, não decisão Assurance | `QA_REWORK_REQUIRED` cria finding/rework AUT-02/F3 no mesmo candidate | falha de contrato/infra produz finding ou REC-01 conforme AUT-02; sem review/merge | somente a fronteira AUT-02/GAT-01 aplicável; não há acceptance QA |
| integration (AUT-02 interno) | **não aplicável**: `CANDIDATE_VALIDATED` é fato determinístico, não acceptance | finding `CANDIDATE_VALIDATION` torna a candidate inelegível e retorna membros conforme AUT-02/F3 | bloqueia candidate/integração, sem promover qualquer membro | usa somente gate GAT-01 aplicável; não há acceptance de integração |
| release | publica `RELEASE_TECHNICALLY_ACCEPTED` para o pacote exato; mantém projeto em `DELIVERY` | finding técnico devolve o pacote à correção, criando nova `release_generation` | block técnico e nenhuma transição a `DELIVERED` | block correlacionado; gate somente se GAT-01 catalogar a condição |

Nenhum `ACCEPT` técnico pode executar `MODULE_PLAN_APPROVAL`,
`DELIVERY_ACCEPTANCE`, `DELIVERY → DELIVERED` ou conceder exceção de
independência. Essas decisões são exclusivamente as do catálogo GAT-01 e são
autenticadas/autorizadas server-side por GAT-03. Service principals e agentes
têm apenas permissões de worker explicitamente atribuídas; `actor_id`,
`x-role`, headers ou payload não são prova de role humana.

## 4. Compatibilidade obrigatória com AUT-02

AUT-02 permanece `AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1` validado. Sua
identidade é a autoridade para development: `PlanWorkItem → WorkItem`,
`work_item_revision_id`, `WorkItemDeliveryCandidate:v1`, matrix/criteria/SHA,
`RequiredWorkItemSet:v1`, manifest/candidate e fencing de current module
revision/round continuam imutáveis e normativos.

Consequentemente:

- a acceptance de development de AUT-03 **coincide** com a acceptance AUT-02
  existente, indexada por `delivery_candidate_id`; ela recebe no máximo o
  `AssuranceDispatchSnapshot:v1` como referência de rollout, não outra
  `work_acceptance`;
- QA e integração são evidence/validation do mesmo pipeline, não uma segunda
  acceptance; seus outcomes continuam os publicados em AUT-02;
- planning e release são assurances técnicas diferentes porque seus subjects
  não são `WorkItemDeliveryCandidate:v1`; mesmo assim não usurpam seus gates
  humanos;
- qualquer policy que selecionasse `DEVELOP_WORK_ITEM` sem a compatibility flag
  `aut02_shared_acceptance=true`, ou tentasse selecionar QA/integration, é
  inválida e não pode ser publicada;
- falha fechada de lineage, SHA, candidate, PlanWorkItem identity, generation,
  round ou manifest sempre vence decisão previamente pendente. Acceptance
  antiga nunca promove candidate, merge ou candidate integration novos.

## 5. Seleção, rollout, rollback e legado

Uma policy de expansão é publicada com `policy_id`, `policy_version`, hash,
`enabled`, selectors exatos de `subject_kind`/`job_kind`, classification,
pipeline compatibility e rollout id. Policy desabilitada não seleciona novos
dispatches. Uma revisão nova é outro registro imutável, nunca update in place.

| Situação | Regra normativa |
| --- | --- |
| policy habilitada | dispatch novo que coincide com todos os selectors persiste `SELECTED` e seu snapshot; somente então pode criar acceptance aplicável |
| policy desabilitada | dispatch novo persiste `NOT_SELECTED` ou segue o legado; snapshot `SELECTED` já criado continua sob a revisão congelada |
| alteração de versão | só afeta dispatch posterior; acceptance, reviewer, evidence e consequência abertas mantêm id/versão/hash anteriores |
| execução ou acceptance aberta | conclui, bloqueia, reworka ou escala sob seu snapshot; não é cancelada, aceita nem reinterpretada pela policy atual |
| rollback operacional | desabilita/reverte apenas a seleção de futuros dispatches; preserva histórico e deixa recovery/reconcile usar o snapshot original |

Execuções históricas e o legado F4/F5/F6 permanecem consultáveis e não ganham
snapshot/acceptance retroativamente. A migração deve ser aditiva. Nova policy
nunca pode capturar uma execução já em andamento.

## 6. Idempotência, concorrência e fencing

As seguintes propriedades são obrigatórias no banco e no handler:

- unique `assurance_dispatch_key`, unique `acceptance_key` e um único
  `review_decision` terminal por review; locks do subject/snapshot serializam
  workers concorrentes;
- outbox e deduplication key incluem o `assurance_dispatch_key`; replay,
  crash/restart, redelivery e lease recovery retomam o mesmo snapshot,
  acceptance/review/decisão, jamais criam outro;
- cada comando de decisão usa chave idempotente ligada a acceptance, review,
  decision e generation. A mesma chave com outro payload/subject é conflito;
- antes de side effect, o servidor relê subject e fingerprint sob lock. Se
  current revision, SHA, candidate, plan/release package ou generation divergir,
  grava `STALE_ASSURANCE_SUBJECT`, não aplica efeito e encaminha a REC-01/REC-02
  quando aplicável;
- somente F3/AUT-01 (para development) ou o produtor publicado de planning/
  release pode materializar uma nova geração. Reabrir acceptance não altera
  geração; ela só cria novo review da mesma acceptance quando a decisão
  publicada permitir re-review dessa mesma evidence lineage.

## 7. Proibição de assurance recursiva

Policies AUT-03 devem rejeitar explicitamente `job_kind` ou `subject_kind` de
assurance/reviewer (`REVIEW` e dispatches de `assurance_reviews`), QA AUT-02,
candidate validation/merge/reassess AUT-02, assistance, routing, recovery,
reconcile, retry e qualquer executor de gate. A lista de rejeição é avaliada no
servidor, antes de selectors configuráveis, e não pode ser contornada por nome
de policy, payload ou classification.

O resultado de assurance é evidence para a consequência do subject original;
não é novo subject de assurance. Exceção futura exige contrato novo versionado,
uma política de profundidade explícita, subject distinto e testes de terminação.

## 8. Fronteira recuperável para REC-02

AUT-03 não implementa o fallback de REC-02, mas deve persistir e correlacionar
os seguintes fatos no snapshot, acceptance e `work_blocks` deduplicados:

| Situação | Estado/fato que AUT-03 persiste | Continuação proprietária |
| --- | --- | --- |
| nenhum reviewer elegível | `WAITING_FOR_INDEPENDENT_REVIEWER` + `NO_INDEPENDENT_REVIEWER`, candidate list e resultado do independence check | REC-02 seleciona/routing; não cria acceptance nova |
| reviewer temporariamente indisponível | mesma acceptance/review + tentativa, lease e próxima elegibilidade | retry limitado do contrato atual; depois REC-02 |
| reviewer terminalmente falho | block `REVIEWER_TERMINAL_FAILURE`, tentativa/evidence e acceptance parada | REC-02 abre fallback/assistência/routing idempotente |
| exceção de independência necessária | block `INDEPENDENCE_EXCEPTION_REQUIRED`, policy/version, producer/reviewer identities e expiração requerida | somente gate `INDEPENDENCE_EXCEPTION` GAT-01 + GAT-03 pode liberar a exceção |
| block de assurance | `work_block` com subject, generation, policy snapshot, code e evidence | REC-02 diagnostica/resume ou GAT-01 escala; AUT-03 não faz reconcile manual ordinário |

Nenhuma dessas situações muda o subject/generation ou concede decisão ao
assistente/routing. REC-02 reenfileira somente o dispatch permitido pelo
snapshot original.

## 9. Ordem de implementação e testes mandatórios

AUT-03 deve primeiro adicionar o snapshot/constraints e adaptar producers e
aplicadores de efeito por linha da matriz; somente depois habilitar policy de
canário. Cada policy publicada deve declarar os job kinds selecionáveis e a
compatibilidade AUT-02. Não há rollout “global” implícito.

Além das regressões AUT-02, a implementação deve cobrir:

- planning, development, QA, integration e release, inclusive a rejeição dos
  kinds internos não selecionáveis;
- selecionado/não selecionado, policy revision/hash congelados, enable,
  disable, reversão, coexistência legado/v1 e dispatch já aberto;
- replay, duplicate delivery, crash/restart, dois workers concorrentes e
  unicidade PostgreSQL;
- subject stale: revision, generation, SHA, candidate, manifest, round e
  PlanWorkItem identity; rework criando geração nova e acceptance antiga sem
  promoção da nova;
- ausência/falha de reviewer, independência/exceção válida e expirada e block
  correlacionável para REC-02;
- planning tecnicamente aceito sem bypass de `MODULE_PLAN_APPROVAL`; release
  tecnicamente aceito sem bypass de `DELIVERY_ACCEPTANCE`/`DELIVERY → DELIVERED`;
- AUT-02 development/QA/integration sem acceptance dupla ou autoridade dupla.

## Critério final de implementação

Cada dispatch habilitado deve ser rastreável, sem inferência, por:

```text
dispatch
  → AssuranceDispatchSnapshot:v1(policy + selection + subject + generation)
  → producer execution
  → immutable evidence
  → one applicable acceptance (or explicit AUT-02 evidence-only boundary)
  → terminal decision/fact
  → single authorized consequence
```

Qualquer caminho que não consiga provar a linha da matriz, o snapshot, a
geração e a autoridade única deve falhar fechado e não promover estado.
