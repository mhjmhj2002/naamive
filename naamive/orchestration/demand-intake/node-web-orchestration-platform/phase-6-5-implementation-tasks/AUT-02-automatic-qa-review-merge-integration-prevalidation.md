---
task: AUT-02
document_type: prevalidation
status: PREVALIDATION_READY_FOR_IMPLEMENTATION
contract: AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1
governs: WORK_ITEM_DELIVERY:v2
integrates_with: [MODULE_DELIVERY:v2, PROJECT_DISCOVERY:v4]
functional_dependencies: [AUT-01, REC-01, LR-02]
guardrails: [GAT-01, GAT-03]
validated_at: 2026-08-24
---

# AUT-02 — Pré-validação do pipeline automático de assurance e integração

## Decisão, fatos e fronteira

**PREVALIDATION_READY_FOR_IMPLEMENTATION.**
`AUTOMATIC_ASSURANCE_INTEGRATION_PIPELINE:v1` governa exclusivamente novas
instâncias `WORK_ITEM_DELIVERY:v2`: QA determinístico, review independente,
`ACCEPT`, merge para a phase ref, candidata, validação e integração. Ele entrega
fatos a `MODULE_DELIVERY:v2` e `PROJECT_DISCOVERY:v4` somente por
`MACRO_REEVALUATE`; LR-02 continua a única autoridade macro.

O runtime já oferece `deliveries.qa_matrix`/`qa_matrices`, `work_acceptances`,
`assurance_reviews`, `review_decisions`, `findings`, `rework_decisions`,
`recovery_decisions`, `integration_candidates`, `integration_attempts`,
reconciliação Git, macros intents e RBAC. Ainda não oferece o snapshot e o
ledger do pipeline; AUT-02 os adicionará sem reinterpretar v1, F6 ou registros
históricos.

```text
EXECUTION_SUCCEEDED != QA_PASSED != review ACCEPT != merge aplicado
!= candidate validada != integration aplicada
WORK_ACCEPTED != WORK_INTEGRATED
```

`WORK_ITEM_DELIVERY:v2` usa exatamente os estados publicados:
`OUTPUT_SUBMITTED`, `QA_IN_PROGRESS`, `INDEPENDENT_REVIEW`,
`WAITING_FOR_INDEPENDENT_REVIEWER`, `ACCEPTED`, `READY_FOR_INTEGRATION`,
`INTEGRATING`, `INTEGRATED`, `REWORK_REQUIRED`, `BLOCKED`,
`RECOVERY_REQUIRED`, `WAITING_FOR_ESCALATION` e `CANCELLED`.
`READY_FOR_PHASE_MERGE` e `MERGED_TO_PHASE` são legados e não entram no v2.
Candidate é entidade lateral, não um estado novo de WI.

## State machine e predicados

| Origem | Fato/trigger | Destino | Autoridade | Evidence obrigatória | Side effect/intenção |
| --- | --- | --- | --- | --- | --- |
| `OUTPUT_SUBMITTED` | `START_QA` | `QA_IN_PROGRESS` | AUT-02 | snapshot imutável, output e SHA | `RUN_DELIVERY_QA` |
| `QA_IN_PROGRESS` | `QA_ACCEPTED` | `INDEPENDENT_REVIEW` | executor QA | report completo e matrix/hash | `START_INDEPENDENT_REVIEW` |
| `QA_IN_PROGRESS` | `QA_REWORK_REQUIRED` | `REWORK_REQUIRED` | QA/F3 | finding + rework decision | nenhum merge |
| `INDEPENDENT_REVIEW` | reviewer indisponível | `WAITING_FOR_INDEPENDENT_REVIEWER` | selector Assurance | seleção/independência | retry limitado/wait |
| `INDEPENDENT_REVIEW` | `ACCEPT` | `ACCEPTED` | `decideReview` | review decision + acceptance aceita | `MERGE_WORK_ITEM` |
| `INDEPENDENT_REVIEW` | `REWORK` | `REWORK_REQUIRED` | Assurance/F3 | finding + rework | AUT-01 agenda correção |
| `INDEPENDENT_REVIEW` | `BLOCK` | `BLOCKED` | Assurance | block/finding | parar |
| `INDEPENDENT_REVIEW` | `ESCALATE` | `WAITING_FOR_ESCALATION` | Assurance/GAT-01 | razão/evidence/autoridade | parar |
| `ACCEPTED` | merge recorded + candidate | `READY_FOR_INTEGRATION` | AUT-02/Git | SHA, parents, manifest | validate candidate |
| `READY_FOR_INTEGRATION` | integration intent | `INTEGRATING` | AUT-02 | candidate validada/refs | integrate |
| `INTEGRATING` | integration recorded | `INTEGRATED` | AUT-02/Git | remote SHA/parents + attempt | LR-02 re-evaluate |

```text
qaEligible = WI v2 + OUTPUT_SUBMITTED + immutable candidate + !CANCELLED
qaPassed = todos os comandos da matrix congelada passaram no candidate.head_sha
reviewEligible = qaPassed + policy selecionada + sem finding/rework aberto
accepted = work_acceptance=ACCEPTED + única review_decision=ACCEPT
mergeEligible = accepted + qaPassed + sem finding/rework/recovery + revision atual +
                snapshot SHA/ref/ancestry válidos
candidateValid = manifest/hash/lineage/phase ref verificados + sem candidate finding
integrationEligible = candidateValid + target esperado + sem recovery bloqueante
integrated = remote target == SHA registrado + parents esperados + attempt/evidence persistidos
```

## Frozen delivery snapshot

Antes do QA, persistir uma entidade nova imutável
`WorkItemDeliveryCandidate:v1` (`work_item_delivery_candidates`), única por
`delivery_id + head_sha + pipeline_version`, com chave
`delivery-candidate:v1:<delivery_id>:<head_sha>`. Não reutilizar
`integration_candidates`: ela é o pacote multi-WI posterior ao merge.

| Grupo | Campos congelados |
| --- | --- |
| identidade | `id`, pipeline/policy version, `project_id`, `module_id`, `module_revision_id`, `work_item_id`, `work_item_revision_id`, `delivery_id`, `job_id`, `agent_execution_id` se houver, `worktree_id` |
| Git/output | `base_sha`, `head_sha`, branch/ref, patch e changed-path hashes, commits, output artifact IDs/hashes, producer identity |
| contrato | `qa_matrix_id` se houver, matrix canonicalizada e `qa_matrix_hash`, acceptance criteria hash/version, evidence refs |
| rastreio | source operation/event, `correlation_id`, idempotency key, creation time, rework/recovery lineage |

Os campos de identidade, SHA, matriz e critérios não mudam. Correção cria outro
delivery/snapshot. QA, review package, acceptance, merge evidence, manifest,
candidate validation e integration attempt referenciam o mesmo snapshot. Antes
de todo efeito irreversível, servidor relê SHA/ref/lineage: QA em A e merge em
B é proibido. `deliveries.qa_matrix` já é cópia da execução e
`qa_matrices.payload/hash` é a fonte de hash; AUT-02 fixa esse hash, nunca uma
matriz atual do work item.

## QA e candidate validation

QA é **executor determinístico, não agent**. O novo job `RUN_DELIVERY_QA` roda
em worktree detached no `head_sha` congelado. A command source é exclusivamente
a entrada versionada `command`, `cwd` relativo normalizado e
`timeout_seconds`; ausência/invalidez é falha de contrato, não default. O report
persiste exit/sinal/timeout, stdout/stderr redigidos e limitados, duração, cwd,
command hash, artifact hash, executor/environment version, matrix/hash, SHA e
resultado ordenado (`QAReport:v1`).

Só todos `PASS` criam `QA_ACCEPTED`. A chave
`qa:v1:<delivery_candidate_id>` permite reexecução apenas enquanto não há report
terminal; o mesmo worker/reconciler a reclama. Falha terminal determinística
(exit, timeout do comando, matrix inválida, policy/Git violation) cria finding
`DELIVERY_QA` ligado à delivery/WI e, quando corretiva, `rework_decision` F3;
vai para `REWORK_REQUIRED`. Timeout infra pré-processo, lease perdida ou resultado
incerto são fatos de REC-01, não finding automático.

Candidate validation é etapa distinta: `VALIDATE_INTEGRATION_CANDIDATE` verifica
em detached worktree o manifest, hashes/lineage dos snapshots, QA e acceptances,
phase SHA, ancestry/parents e ausência de finding. Não relê uma qa matrix atual
nem reexecuta QA de delivery. Checks de pacote futuros precisam estar
versionados no manifest. Defeito cria `CANDIDATE_VALIDATION` finding; incerteza
infra/efeito chama REC-01; falha impede integração.

## ACCEPT, independência e paradas

AUT-02 reutiliza `work_acceptances`, `assurance_reviews`, policies e
`independenceCheck`, sem sistema paralelo. O adapter cria/encontra uma acceptance
correlacionada ao snapshot/execution. `QA_PASSED` nunca cria ACCEPT: somente
`decideReview(... ACCEPT ...)` com decisão terminal única persiste
`work_acceptances.state=ACCEPTED` e libera merge.

O review package redigido contém snapshot, QA report, output evidence, contract,
critérios, policy e decisões/findings permitidos. A regra existente é obrigatória:
agent do reviewer diferente, execution context diferente e runtime/configuration
diferentes, salvo exceção de policy existente, auditada e válida. AUT-02 não cria
exceção.

Sem policy Assurance selecionada, criar `work_blocks` com
`ASSURANCE_POLICY_NOT_SELECTED`, colocar WI `BLOCKED` e projetar
`AUT-03_POLICY_EXPANSION_REQUIRED`; não criar ACCEPT nem autoaccept. Com policy
mas sem reviewer elegível, usar `WAITING_FOR_INDEPENDENT_REVIEWER` e
`NO_INDEPENDENT_REVIEWER`; retry só pelo limite/backoff publicado e, esgotado,
permanece waiting/block ou `ESCALATE` persistido. REC-02 fará fallback/routing.

O limite transitório é o contrato já publicado do worker:
`NAAMIVE_AGENT_MAX_RETRIES` (default `2`), com backoff `5s`, `15s`, `30s`.
Após a tentativa terminal não se cria reviewer, acceptance ou decisão nova; a
acceptance continua `WAITING_FOR_INDEPENDENT_REVIEWER` com o block/evidence e
só REC-02 poderá introduzir routing, especialista ou assistência.

`REWORK` cria finding `ASSURANCE_REVIEW`, acceptance `REWORK_REQUIRED` e F3
rework; AUT-01 é a única fronteira de novo dispatch. `BLOCK` persiste
finding/block e para sem retry automática. `ESCALATE` persiste acceptance/block
escalados, evidence e autoridade; WI espera em `WAITING_FOR_ESCALATION`.

## Ordering, merge, candidate e integration

```text
review ACCEPT / work_acceptance ACCEPTED
→ MERGE_WORK_ITEM intent → merge ou REC-01 reconcile
→ MERGE_RECORDED → INTEGRATION_CANDIDATE_CREATED
→ VALIDATE_INTEGRATION_CANDIDATE → CANDIDATE_VALIDATED
→ INTEGRATE_CANDIDATE → INTEGRATION_RECORDED
→ WI INTEGRATED → MACRO_REEVALUATE (LR-02)
```

Merge requer `mergeEligible`: acceptance aceita, QA pass, nenhum finding/rework/
recovery bloqueante, snapshot/revision atuais, SHA igual, base ancestral e phase
ref esperada. Usa `mergeWorkItem` F3 e só então grava `MERGE_RECORDED` com phase
SHA, parents, target ref e evidence. A candidate nasce uma vez por
`candidate:v1:<merge_result_id>`, com snapshot IDs, merge/phase SHA, WI/module
revisions e acceptance/QA hashes. Rework/block/finding nunca geram candidate.

Integração só começa em `candidateValid`. `integration_attempt` fixa target
`integration`, `integration_before_sha`, candidate SHA e parents esperados.
`INTEGRATED` exige `reconcileIntegration` confirmar ref remoto e parents; depois
persiste merge/push SHA, attempt/candidate state, event/evidence e WI state.
Push retornando zero não é prova suficiente.

## Atomicidade, outbox e jobs

| Handoff | Escritas de uma transação |
| --- | --- |
| development→QA | completion, snapshot, `QA_IN_PROGRESS`, QA intent/job, event |
| QA pass→review | QA report, acceptance/review, review intent/job, event |
| review ACCEPT→merge | decision/acceptance, merge intent, event |
| merge→candidate | merge evidence, candidate/manifest, validation intent, event |
| validated→integration | validation report/state, integration intent, event |
| integrated | evidence/states, WI `INTEGRATED`, event, LR-02 intent |

`macro_lifecycle_intents` pertence somente ao macro lifecycle. AUT-02 cria um
ledger/outbox aditivo, por exemplo `assurance_integration_intents`, com
destination/kind, candidate lineage, payload/evidence refs, unique idempotency,
`PENDING|LEASED|COMPLETED|FAILED|SUPERSEDED`, attempts, lease owner/token/expiry,
fencing generation e replay. Worker usa `FOR UPDATE SKIP LOCKED`; somente o
último handoff publica `MACRO_REEVALUATE` existente.

Jobs/operations auditáveis: `RUN_DELIVERY_QA`, `REVIEW` (existente),
`MERGE_WORK_ITEM`, `VALIDATE_INTEGRATION_CANDIDATE` e `INTEGRATE_CANDIDATE`.
Os executores Git podem ser internos, mas nunca endpoints diretos.

## REC-01 cause matrix

REC-01 é a única autoridade que cria/classifica `RecoveryDecision`; AUT-02
publica fato/evidence e pede recovery, sem duplicar classifier ou retry engine.

| Caso | Owner e consequência |
| --- | --- |
| QA deterministic failure | AUT-02 → `DELIVERY_QA` finding + F3 rework; sem review/merge |
| reviewer `REWORK` | Assurance/F3 rework; sem merge |
| reviewer indisponível | retry limitado; waiting/block; REC-02 futuro |
| timeout infra pré-efeito | REC-01 `NO_EFFECT`/retry permitido |
| merge/push timeout/crash | `EFFECT_UNKNOWN` → `RECONCILE` antes de retry |
| merge aplicado sem record | `APPLIED_UNRECORDED` → `RECORD_AND_CONTINUE` |
| Git diverged | `INTEGRATION_RECOVERY` |
| validation/integration incerta | REC-01 reconciliation |
| retry esgotado | REC-01 escolhe ação |

Merge, push e integration passam por `PRE_EFFECT → EFFECT_UNKNOWN →` observação
`NOT_APPLIED|APPLIED_UNRECORDED|DIVERGED` da taxonomia REC-01. Nunca retry cego.
Finding surge para defeito terminal comprovado; integração divergida só o cria
quando REC-01 confirma defeito, não na incerteza.

## Boundaries, staleness e endpoints

- **AUT-03:** amplia selectors/policies e outros job kinds. AUT-02 só usa policy
  já selecionada; ausência bloqueia.
- **REC-02:** é dona de reviewer fallback, assistência, specialist routing e
  resolução de blocks. AUT-02 apenas persiste waiting/block/escalate.
- **GAT-02:** não cria cancel/pause/resume. Recurso já `CANCELLED` é relido antes
  de cada handoff e a intent vira `SUPERSEDED`/`NO_OP`.
- **LR-02:** recebe intent/fato macro; AUT-02 não altera `projects`/`modules.state`.

Uma module revision nova preserva pipeline antigo como evidência, mas não
satisfaz a nova. Antes de QA, merge e integration, reler a revisão atual. Se não
é mais corrente antes de ACCEPT, intent é `SUPERSEDED`; após ACCEPT, merge só é
permitido com autorização explícita de lineage ainda válida, caso contrário
também supersede. Nunca apagar records nem herdar QA/acceptance à nova revisão.

Para v2, endpoints manuais `/qa`, `/merge`, create candidate, `/validate`,
`/integrate`, `/retry` e `/reconcile` são **B**: reemit/reconcile intent
governada; execução direta é **D**, conflito. Endpoints v1 são **C**,
`PRESERVE_LEGACY`; GET é **A**, read/admin. Rotas Assurance permanecem RBAC
GAT-03. Worker usa service principal real, sem header mágico/default/fallback.

## Projection, fencing e concorrência

API/SSE projeta snapshot/hash, QA report/status, review/acceptance, merge,
candidate/validation/integration, intent atual, recovery, finding/block,
stale/superseded, next automatic action e stop reason. UI não decide.

Chaves: `qa:v1:<delivery_candidate>`, `review:v1:<acceptance>:<version>`,
`merge:v1:<delivery_candidate>`, `candidate:v1:<merge_result>`,
`validate:v1:<candidate>`, `integrate:v1:<candidate>`. Antes de qualquer efeito:
lease/generation, predecessor state, snapshot/SHA/ref, cancelamento,
finding/rework/recovery, workflow v2 e revision corrente são relidos. Sem
autoridade, `SUPERSEDED`/`NO_OP` sem efeito.

Ordem de locks: `project → module/current revision → work_item → delivery
candidate/delivery/worktree → work_acceptance → assurance_review → integration
candidate/attempt → pipeline intent/operation`; AUT-01 toma sua capacidade após
WI; LR-02 não toma locks WI/delivery; REC-01 mantém `RecoveryDecision → job/WI`.
PostgreSQL locks/uniques serializam QA/reviewer/ACCEPT/merge duplicados,
candidate/replay, integration/recovery, nova revisão e CANCELLED.

## Crash, replay e testes

| Crash | Fonte/reconciler | Repetição segura |
| --- | --- | --- |
| development committed, QA intent ausente | snapshot/WI | só QA intent |
| QA result, review intent ausente | QA report/acceptance | só review intent |
| ACCEPT, merge intent ausente | decision/acceptance | só merge intent |
| merge aplicado, record ausente | Git/REC-01 | reconcile/record |
| merge recorded, candidate ausente | merge evidence | candidate única |
| candidate sem validation intent | candidate | só validation intent |
| validation sem integration intent | report | só integration intent |
| integration aplicada sem record | remote Git/REC-01 | reconcile/record |
| integrated sem macro intent | integration evidence | só LR-02 intent |

Eventos, intents, jobs, reviewer output/ACCEPT, merge, candidate e integration
duplicados convergem para a mesma chave/recurso. A implementação deve testar em
PostgreSQL real: happy path até `INTEGRATED`/LR-02; QA failure; review
`REWORK`/`BLOCK`/`ESCALATE`; sem reviewer/policy; stale SHA; merge diverged,
unknown e applied-unrecorded; validation failure; integration unknown; cada
crash; concurrent ACCEPT/merge; replay; revision antiga; recurso já CANCELLED;
e coexistência legada.

## Prontidão

Não há decisão arquitetural pendente. A implementação cria migrations aditivas
para snapshot/intents/uniques e executores/endpoints/testes definidos aqui, sem
antecipar AUT-03, REC-02 ou GAT-02.
