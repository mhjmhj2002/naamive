---
task: REC-01
document_type: recovery-prevalidation
status: READY_FOR_IMPLEMENTATION
policy_version: RECOVERY_POLICY:v1
validated_at: 2026-08-23
functional_dependencies: [LR-01, AUT-01]
authority_guardrails: [GAT-01, GAT-03]
scope: documental; nenhuma alteração funcional, migration ou teste funcional
---

# REC-01 — Pré-validação de recovery orientado pela causa

## Decisão de pré-validação

REC-01 permanece `TO DO`, mas está **READY_FOR_IMPLEMENTATION**: os contratos
abaixo eliminam a ambiguidade que impedia escolher recovery com segurança. Não
há bloqueio externo de arquitetura. A implementação deverá fechar os gaps
inventariados; este documento não os implementa.

A dependência conceitual original em LR-01 significa que REC-01 consome os
workflows v2 e seus estados. A dependência funcional final é `[LR-01, AUT-01]`:
recovery opera sobre `DISPATCHED`, `PRODUCING`, `RECOVERY_REQUIRED`, delivery,
worktree, job, reservation, capacidade e scheduler/reconciler introduzidos ou
consolidados por AUT-01. GAT-01/GAT-03 são guardrails de autoridade, não
dependências funcionais mecânicas: uma escalada ou decisão humana só pode usar
o catálogo e a identidade/grant já publicados. A ordem serial permanece
`LR-01 → GAT-01 → GAT-03 → AUT-01 → REC-01`.

## Invariantes normativos

1. **UNKNOWN EFFECT ⇒ RECONCILE BEFORE RETRY.** `EFFECT_UNKNOWN` jamais produz
   retry, restart, remoção de worktree, merge, push ou nova execução cega.
2. O servidor classifica causa, contexto e efeito; client/UI nunca escolhem a
   ação nem fornecem delivery, SHA, finding, worktree ou causa como autoridade.
3. Toda nova execution/reservation passa pela fronteira transacional de AUT-01;
   `recovery → INSERT job` direto é proibido.
4. Uma decisão é durável, versionada, idempotente e explicável antes de qualquer
   side effect externo. Replay converge para a mesma decisão/execução.
5. Commit, SHA, delivery, finding, round e lineage existentes são preservados.
6. Recovery técnico seguro é automático. Humano só entra por política/materialidade
   publicada e sob GAT-01/GAT-03; não para escolher retry/restart/reconcile/rework.

## Inventário do comportamento atual

| Componente | Comportamento atual | Problema/gap para REC-01 | Ownership futuro |
| --- | --- | --- | --- |
| `development-runtime.ts` | Detecta combinações inválidas, sinal ausente, reserva não consumida e lease expirado; encerra job/delivery, libera worktree e leva WI v2 a `RECOVERY_REQUIRED`. | Usa presença de `development-execution-evidence` como único guard para lease; grava evento, não uma decisão tipada/footprint. | Reutilizar detector como fonte de sinais; `RecoveryClassifier` decide causa/certeza. |
| `worker.ts` | Lease com `SKIP LOCKED`; retry automático de job com contador, atrasos `5/15/30`, e falha terminal; desenvolvimento terminal vira `RECOVERY_REQUIRED` no v2. | Classifica erro genericamente e pode reexecutar antes de uma taxonomia/effect certainty. | Worker executa somente `RecoveryExecutor`/jobs autorizados. |
| `reconcile.ts` e timer de `server.ts` | Reconciliam artifacts, dispatches e elegibilidade; server também executa reconcile de development a cada intervalo configurável. | Não existe orquestrador único de decisões REC-01 nem wake-up síncrono de capacidade. | Reconciler aciona classificação/replay idempotente. |
| `eligibility-scheduler.ts` | Lock PostgreSQL de capacidade, uma delivery ativa por WI, decisões auditáveis e reservations+delivery+job transacionais. | Não conhece causas REC-01; só despacha WI `ELIGIBLE_FOR_DISPATCH`. | É a única fronteira para nova reservation/attempt REC-01. |
| `phase3.ts` | Possui restart/retry legado, rework auditável, `reconcileWorktree`, retry/reconcile de integração. | Endpoints recebem comandos recovery específicos; retry/restart podem criar job/reservation fora do scheduler v2. | Adaptadores legados; REC-01 centraliza classificação e migra o fluxo v2. |
| `git-delivery.ts` | `reconcileWorktree` retorna `ACTIVE/MISSING/DIRTY/DIVERGED`; `reconcileIntegration` retorna `NOT_APPLIED/APPLIED_UNRECORDED/DIVERGED`. | Resultados ainda não são convertidos em footprint/decisão universal. | Autoridade de observação Git para classifier; não duplicar lógica Git. |
| `projection.ts` e `development-runtime` | Expõem `next_action`, inclusive `RETRY_GOVERNED_COMMAND` e `DIAGNOSE_RUNTIME_AND_RECONCILE`. | `RETRY_GOVERNED_COMMAND` não contém causa/certidão e v2 ainda não projeta a saída REC-01 final. | Projeção deriva a única decisão persistida. UI-01 completa a superfície. |
| HTTP em `server.ts` | Expõe restart, retry, rework, reconcile e integration retry/reconcile; já exige autenticação nas rotas atuais. | Entrada fragmentada permite semânticas por endpoint e payload técnico legado. | Um comando autorizado pede recovery de entidade; servidor deriva contexto. |
| `020`, `024`, `040`–`042`, `047`, `054` migrations | Estados de integração, decisão/round de rework, lineage, retry/job ativo, runtime e scheduler persistidos. | Não há tabela/constraint de `RecoveryDecision` nem unicidade por classificação. | REC-01 adicionará migration nova, sem alterar migrations aplicadas. |
| Testes F3/F5/F6 | Cobrem Git reconciliation, retry lineage, restart de worker, runtime, projection e scheduler concorrente. | Não cobrem a matriz causa→certeza→footprint, crash decision/executor ou competição REC-01/AUT-01. | Base de regressão; REC-01 acrescentará a matriz abaixo. |

### Gaps funcionais encontrados (não corrigidos nesta atividade)

- A classificação de falha está distribuída entre worker, runtime, endpoints e
  Git; não há `RecoveryClassifier` único nem `RecoveryDecision` persistida.
- `RETRY_GOVERNED_COMMAND` é uma projeção histórica genérica e não pode ser a
  decisão final sem causa/effect certainty.
- O retry/restart legado de `phase3.ts` cria/reusa job, delivery e worktree sem
  passar pela API do scheduler AUT-01; isso deve ser substituído no caminho v2.
- A liberação de capacidade depende hoje do reconciler periódico; não foi
  encontrado trigger imediato comprovável após uma liberação de recovery.
- `WAITING_FOR_ESCALATION` tem catálogo/GAT, mas REC-01 ainda não publica a
  causa técnica e a continuação única que precedem REC-02/UI-02.

## Taxonomia versionada de causas

`RECOVERY_POLICY:v1` classifica a causa antes de selecionar a ação:

| Família | Códigos mínimos | Certeza inicial | Ação inicial |
| --- | --- | --- | --- |
| Técnica transitória | `TIMEOUT_PRE_EFFECT`, `QUOTA_LIMIT`, `RATE_LIMIT`, `INFRA_TRANSIENT` | `NO_EFFECT` somente com prova | `RETRY` |
| Processo perdido sem efeito | `WORKER_DEAD_NO_OUTPUT`, `JOB_NOT_CONSUMED`, `WORKTREE_MISSING_NO_EVIDENCE` | `NO_EFFECT` | `RESTART` |
| Estado/efeito incerto | `LEASE_LOST`, `HANDOFF_CRASH`, `NO_TERMINAL_CONFIRMATION`, `DIRTY_WORKTREE`, `OPERATION_UNRECORDED` | `EFFECT_UNKNOWN` | `RECONCILE` |
| Evidência/produto preservável | `COMMIT_PRESENT`, `EXECUTION_EVIDENCE_PRESENT`, `DELIVERY_PRESENT`, `QA_FINDING_PRESENT` | `EFFECT_PRESENT` | `RESUME` ou `REWORK` |
| Integração | `MERGE_TIMEOUT`, `PUSH_TIMEOUT`, `MERGE_APPLIED_UNRECORDED`, `PUSH_APPLIED_UNRECORDED`, `GIT_DIVERGED`, `INTEGRATION_DEFECT` | conforme observação Git | `RECONCILE`, `RECORD_AND_CONTINUE` ou `INTEGRATION_RECOVERY` |

`EFFECT_UNKNOWN` é um estado de conhecimento, não sinônimo de falha. A primeira
ação obrigatória consulta a fonte de autoridade; só o resultado dessa consulta
permite passar para `NO_EFFECT` ou `EFFECT_PRESENT`.

## Evidence / Effect Footprint

O classifier monta `evidence_footprint` como conjunto de sinais, nunca inferido
apenas da existência de `development-execution-evidence`.

| Footprint | Detecção e fonte de autoridade | Certeza | Ação permitida | Preservar |
| --- | --- | --- | --- | --- |
| `NO_EFFECT` | job/lease terminal, ausência verificada de artifacts, commit, delivery utilizável e efeito remoto | `NO_EFFECT` | retry/restart conforme causa | decisão e tentativa histórica |
| `EXECUTION_EVIDENCE` | artifact de execução vinculado a operation/job | `EFFECT_PRESENT` | resume/rework | artifact, operation, job |
| `COMMIT_PRESENT` | `git-delivery` valida HEAD, paths e commits auditáveis | `EFFECT_PRESENT` | resume/rework | commit, SHA, paths, branch |
| `DELIVERY_PRESENT` | delivery/worktree correlacionados no PostgreSQL | depende de estado | reconcile; resume se consistente | delivery, worktree, job |
| `QA_FINDING` | `findings` + vínculo delivery/WI/revisão | `EFFECT_PRESENT` | rework | finding, delivery, SHA, round |
| `DIRTY_WORKTREE` | `reconcileWorktree(...) === DIRTY` | `EFFECT_UNKNOWN` | reconcile | worktree e diff; não remover |
| `MERGE_EFFECT_POSSIBLE` | timeout/crash no merge; `reconcileIntegration` e Git remoto | `EFFECT_UNKNOWN` | reconcile | SHAs e tentativa |
| `PUSH_EFFECT_POSSIBLE` | timeout/crash no push; remoto `origin/integration` | `EFFECT_UNKNOWN` | reconcile | SHAs e tentativa |
| `INTEGRATION_EFFECT_PRESENT` | Git remoto confirma `APPLIED_UNRECORDED` | `EFFECT_PRESENT` | record/continue | merge/push SHA e candidate |

## Semântica congelada das ações

| Ação | Pré-condição | Identidade e atomicidade | Resultado |
| --- | --- | --- | --- |
| `RETRY` | causa transitória, `NO_EFFECT`, repetição segura | Reusa o contexto lógico e a reservation ainda válida; não cria delivery/worktree/job novo. Uma nova lease do job existente incrementa o contador persistido. | Mesmo dispatch converge por retry controlado. |
| `RESTART` | attempt terminal, processo não retomável, `NO_EFFECT` comprovado | Fecha a attempt anterior e preserva seus IDs/eventos; a nova attempt recebe novos `operation_id`, `delivery_id`, `worktree_id` e `job_id` pela fronteira AUT-01. | Nova reservation apenas após capacidade/locks/predicado. |
| `RESUME` | delivery/contexto consistente e efeito preservável | Mantém IDs e evidências existentes; apenas retoma o passo seguro que ainda não ocorreu. | Não reaplica commit/merge/push. |
| `RECONCILE` | `EFFECT_UNKNOWN` ou inconsistência | Persiste decisão, observa PostgreSQL/Git/artifacts e não cria efeito de negócio. | Classificação posterior: ausente, presente ou divergente. |
| `REWORK` | produto/evidência existente que precisa de correção | Preserva commit, SHA, delivery, finding, round e lineage; cria rodada corretiva conforme política. Nova execução usa AUT-01. | Correção automática salvo gate material. |
| `RECORD_AND_CONTINUE` | efeito de integração confirmado sem registro | Persiste a observação e atualiza estado sem reaplicar o efeito. | Prossegue sem retry. |
| `INTEGRATION_RECOVERY` | divergência/conflito/defeito Git confirmado | Preserva refs e tentativa; abre fluxo específico, não retry genérico. | Caminho técnico ou gate material publicado. |

Para side effects externos, a unidade é: `persist RecoveryDecision → commit →
execute/reconcile idempotentemente`. A decisão, mudança de estado, encerramento
de attempt, liberação de recurso, event/outbox e solicitação de nova execução
devem ser atômicos quando forem efeitos de banco. Crash posterior é retomado
pelo executor usando a decisão persistida.

## Matriz normativa causa → certeza → evidência → ação

| Caso | Certeza | Footprint | Ação |
| --- | --- | --- | --- |
| timeout comprovadamente antes de efeito | `NO_EFFECT` | `NO_EFFECT` | `RETRY` |
| quota/rate limit | `NO_EFFECT` | `NO_EFFECT` | `RETRY` |
| worker morto sem output | `NO_EFFECT` | `NO_EFFECT` | `RESTART` |
| job nunca consumido | `NO_EFFECT` | `NO_EFFECT` | `RESTART` |
| lease perdida | `EFFECT_UNKNOWN` | `DELIVERY_PRESENT` | `RECONCILE` |
| crash durante handoff | `EFFECT_UNKNOWN` | `DELIVERY_PRESENT` | `RECONCILE` |
| commit existente | `EFFECT_PRESENT` | `COMMIT_PRESENT` | `RESUME` ou `REWORK` |
| evidence de execução | `EFFECT_PRESENT` | `EXECUTION_EVIDENCE` | `RESUME` ou `REWORK` |
| QA finding | `EFFECT_PRESENT` | `QA_FINDING` + `DELIVERY_PRESENT` | `REWORK` |
| worktree dirty | `EFFECT_UNKNOWN` | `DIRTY_WORKTREE` | `RECONCILE` |
| worktree missing sem evidência | `NO_EFFECT` | `NO_EFFECT` | `RESTART` |
| merge/push timeout | `EFFECT_UNKNOWN` | `MERGE_EFFECT_POSSIBLE`/`PUSH_EFFECT_POSSIBLE` | `RECONCILE` |
| merge/push aplicado sem registro | `EFFECT_PRESENT` | `INTEGRATION_EFFECT_PRESENT` | `RECORD_AND_CONTINUE` |
| divergência Git | `EFFECT_PRESENT` | `INTEGRATION_EFFECT_PRESENT` | `INTEGRATION_RECOVERY` |

## RecoveryDecision v1 e responsabilidades

`RecoveryClassifier` recebe causa observada, estado, attempt, job, delivery,
worktree, evidence, Git, finding e effect certainty. Ele produz, sem side
effect, uma única `RecoveryDecision`:

```text
policy_version, cause, effect_certainty, evidence_footprint, selected_action,
reason, work_item_id, attempt_id, job_id, delivery_id, worktree_id,
evidence_refs, finding_refs, source_state, idempotency_key, created_at
```

REC-01 persistirá a decisão com unicidade por `policy_version + resource
identity + source_state/version + classification fingerprint`; replays com a
mesma chave retornam a decisão/operation existentes. A decisão referencia a
operation, gera evento/outbox e é a explicação auditável de “por que RESTART e
não RECONCILE?”.

`RecoveryExecutor` recebe somente decisão persistida, revalida seus guards e
executa a ação selecionada. Endpoint, worker, reconciler e UI não podem
reclassificar individualmente. O executor não deve deixar duas attempts ativas,
slot permanentemente consumido, worktree órfão, decisão impossível de retomar
ou side effect externo sem decisão durável.

## Integração obrigatória com AUT-01 e capacidade

O fluxo para nova execução é:

```text
classificação → RecoveryDecision → necessidade de nova execução
→ scheduler AUT-01 → lock de capacidade PostgreSQL
→ reservation + delivery + job transacionais
```

Ele respeita `NAAMIVE_DEVELOPMENT_MAX_CONCURRENCY`, a attempt ativa única,
idempotência, lock global e reconciler. `RETRY` de uma reservation ainda válida
não abre nova reservation; toda nova attempt de restart/rework sai somente pelo
scheduler.

**Decisão de ownership — capacity-release wake-up:** hoje há somente o
reconciler periódico (default de 30s), inclusive após recovery; nenhum hook
direto de liberação foi comprovado. REC-01 deve emitir uma solicitação
idempotente de `scheduleEligibleWorkItems('RECOVERY_CAPACITY_RELEASED')` após
commit que realmente libera slot. Isto é requisito da implementação REC-01,
não alteração desta pré-validação. O reconciler permanece safety net.

## Retry policy existente e contrato REC-01

O worker já persiste `jobs.attempts`, usa `NAAMIVE_AGENT_MAX_RETRIES` (default
2), backoff fixo `5s/15s/30s` e torna a falha terminal quando o limite é
ultrapassado. O caminho manual legado usa
`NAAMIVE_DEVELOPMENT_RETRY_MAX_ATTEMPTS` (default 3) e lineage por
`origin_operation_id`. Não há jitter configurado.

REC-01 reutilizará esses limites, contadores, delays e lineage onde a causa for
`RETRY` válida. Ela deve persistir a causa e a decisão, sobreviver ao restart do
servidor/worker, impedir storm por idempotency/lock e, ao esgotar a política,
classificar novamente para `RECONCILE`, `REWORK`, `INTEGRATION_RECOVERY` ou
escalada material — nunca retornar simplesmente `RETRY_GOVERNED_COMMAND`.

## Limites REC-01, REC-02 e `WAITING_FOR_ESCALATION`

REC-01 é dona de falha técnica, retry/restart/resume/reconcile/rework técnico,
runtime attempt, worktree/Git recovery, integration recovery e saída
operacional de estados técnicos. REC-02 continua dona de reviewer indisponível,
assistência, specialist routing, blocks F6 e escalada humana derivada deles.

REC-01 garante que `WAITING_FOR_ESCALATION` nunca seja limbo: registra causa
técnica, decisão/esgotamento, autoridade requerida e continuação conhecida.
REC-02 implementará assistência, routing, recuperação do reviewer e a decisão
humana correspondente. Nenhum deles cria gate humano para escolher ação técnica.

## Matriz mínima de testes para implementação

| Grupo | Asserção obrigatória |
| --- | --- |
| Timeout, quota e rate limit | `NO_EFFECT` resulta em retry limitado, persistido e idempotente. |
| Job não consumido, worker morto e worktree ausente | attempt terminal sem efeito produz restart via AUT-01, sem duas attempts. |
| Lease perdida, crash/handoff, worktree dirty | `EFFECT_UNKNOWN` executa reconcile antes de qualquer repetição. |
| Commit/evidence/finding | lineage, SHA, delivery, finding e round são preservados; ação é resume/rework. |
| Git | merge/push ambíguo reconcilia; aplicado sem registro é gravado; divergência não recebe retry cego. |
| Política | limites, backoff, exaustão, restart de servidor/worker e retry storm convergem. |
| Concorrência | duas recovery calls, scheduler e reconciler concorrentes, `capacity=1` e capacity release não excedem capacidade. |
| Segurança | payload adulterado de SHA/delivery/finding/worktree/ação não altera classificação server-side. |
| Migração/projeção | `REWORK_ELIGIBLE`, `RECOVERY_REQUIRED` e `WAITING_FOR_ESCALATION` têm saída única e auditável. |
| Crash | decisão persiste; restart a encontra; executor converge sem segunda decisão funcional ou side effect duplicado. |

O teste de crash deve incluir cenário após side effect externo incerto: no
restart, a primeira ação é reconcile, seguida de record/continue, retry seguro
ou integration recovery conforme a observação real.

## Critério para iniciar desenvolvimento

REC-01 pode iniciar desenvolvimento somente implementando este contrato sem
antecipar REC-02, AUT-02 ou UI-01/UI-02. O primeiro patch funcional deve incluir
migration nova para decisões, classifier/executor únicos, adaptação do caminho
v2 à fronteira AUT-01 e os testes acima. Até lá, `status: TO DO` permanece
inalterado.
