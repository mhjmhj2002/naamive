# F5-25 — Adendo normativo de prontidão

Este adendo substitui as partes ambíguas de F5-25. Contrato development-runtime/v1; matriz versão 1.

## Escopo e seleção

A projeção é por work_item_id (WI). Uma tentativa é delivery × worktree × job, e as três referências pertencem ao mesmo WI. Leases de WIs distintos são independentes e nunca são inconsistência.

A rota é GET /api/projects/:projectId/work-items/:workItemId/development-runtime. WI inexistente retorna 404 com código WORK_ITEM_NOT_FOUND. WI existente sem delivery retorna 200 com attempt:null. Não aceita parâmetros.

Carregar deliveries do WI e seus worktrees e jobs DEVELOP_WORK_ITEM. Relação ausente ou cruzada, delivery selecionada sem job, build ID ausente, ou dois ou mais jobs LEASED no mesmo WI é inconsistência. Havendo no máximo um leased, selecionar a delivery não terminal mais recente por created_at DESC,id DESC; na ausência dela, a mais recente. Selecionar seu job por available_at DESC,id DESC. Histórico: até três jobs terminais dessa delivery, completed_at DESC,id DESC, sem o job atual.

Remover work_items[].development_job e o array raiz jobs da resposta phase3, além de toda publicação equivalente. A UI consome somente a rota v1; COMPLETED não pode ser exibido como preparo concluído.

## Schema fechado

O arquivo executável do contrato é [development-runtime-v1.schema.json](development-runtime-v1.schema.json); a descrição abaixo é normativa e corresponde a ele.

A raiz contém somente schema_version, work_item_id, attempt, inconsistency, history e diagnostic_id. schema_version é development-runtime/v1; IDs são UUID RFC 4122; timestamps RFC 3339 UTC; strings máximo 256, error.message 512; history máximo 3. Em leitura normal inconsistency é null. attempt:null com inconsistency:null significa exclusivamente WI sem delivery. Em I01, attempt é null e inconsistency é obrigatório.

attempt é null ou contém somente: delivery_id, worktree_id, job_id, delivery_state, worktree_state, work_item_state, job_status, stage, health, next_action, created_at, last_signal_at, error, build_id. inconsistency é null ou contém somente rule_code, stage, health, next_action, delivery_id, worktree_id, job_id. Seus IDs são UUID ou null; stage, health e next_action são obrigatoriamente INCONSISTENT_TERMINAL_STATE, DEGRADED e DIAGNOSE_RUNTIME_AND_RECONCILE. M12 publica a tentativa conhecida junto de inconsistency; I01 permanece com attempt:null. Sempre que inconsistency não for null, diagnostic_id é UUID obrigatório; caso contrário diagnostic_id é null.

Enums:
- delivery_state: RESERVED, PREPARING, DISPATCHED, RUNNING, DEVELOPMENT_IN_PROGRESS, EVIDENCE_REVIEW, QA_IN_PROGRESS, QA_APPROVED, QA_REJECTED, FAILED.
- worktree_state: RESERVED, PREPARED, ACTIVE, RELEASED.
- work_item_state: WAITING_FOR_WORK_ITEM_AUTHORIZATION, DEVELOPMENT_IN_PROGRESS, QA_IN_PROGRESS, READY_FOR_PHASE_MERGE, REWORK_ELIGIBLE, MERGED_TO_PHASE.
- job_status: PENDING, RETRYABLE, LEASED, COMPLETED, FAILED.
- stage: QUEUED, PREPARING_WORKTREE, DISPATCHING_AGENT, EXECUTING_AGENT, VALIDATING_EVIDENCE, READY_FOR_QA, RETRY_SCHEDULED, FAILED, QA_APPROVED, QA_REJECTED, NO_RECENT_SIGNAL, INCONSISTENT_TERMINAL_STATE.
- health: HEALTHY, DEGRADED, FAILED.
- next_action: WAIT_FOR_WORKER, WAIT_FOR_AGENT, SUBMIT_QA, RETRY_GOVERNED_COMMAND, MERGE_TO_PHASE, DIAGNOSE_RUNTIME_AND_RECONCILE.

history contém somente delivery_id, job_id, job_status (COMPLETED ou FAILED) e completed_at. error é null ou code,message. Códigos/mensagens imutáveis: WORKER_FAILED/Worker encerrou com falha.; AGENT_TIMEOUT/Agente excedeu o tempo permitido.; EVIDENCE_INVALID/Evidência não passou na validação.; RUNTIME_INCONSISTENCY/Estados do runtime exigem reconciliação.; NO_SIGNAL/Worker sem sinal recente.

Antes da validação JSON Schema, developmentRuntimeSanitize é obrigatório e recebe o payload completo. Ele rejeita, e não mascara, qualquer chave ou valor com path, URI, segredo, token, prompt, comando, stdout, stderr ou conteúdo; a rota converte essa rejeição em I01, sem incluir o valor rejeitado. O teste de contrato chama diretamente esse validador para cada termo proibido e valida que cada erro público passa no schema. O schema, por sua vez, usa oneOf/const para exigir literalmente cada par code/message acima. build_id é null para PENDING e RETRYABLE; em LEASED, COMPLETED ou FAILED vem de jobs.metadata.build_id e obedece a [A-Za-z0-9][A-Za-z0-9._-]{0,127}. Sua ausência nesses três estados produz I01.

## Matriz fechada v1

Qualquer combinação não listada, FK ausente, dois ou mais leases no WI ou build ausente após o lease usa I01. M11 tem precedência sobre M04.

| ID | job | delivery | worktree | WI | stage | health | ação |
|---|---|---|---|---|---|---|---|
| M01 | PENDING | RESERVED | RESERVED | WAITING_FOR_WORK_ITEM_AUTHORIZATION | QUEUED | HEALTHY | WAIT_FOR_WORKER |
| M02 | LEASED | PREPARING | RESERVED | DEVELOPMENT_IN_PROGRESS | PREPARING_WORKTREE | HEALTHY | WAIT_FOR_WORKER |
| M03 | LEASED | DISPATCHED | PREPARED | DEVELOPMENT_IN_PROGRESS | DISPATCHING_AGENT | HEALTHY | WAIT_FOR_AGENT |
| M04 | LEASED | RUNNING | ACTIVE | DEVELOPMENT_IN_PROGRESS | EXECUTING_AGENT | HEALTHY | WAIT_FOR_AGENT |
| M05 | COMPLETED | DEVELOPMENT_IN_PROGRESS | ACTIVE | DEVELOPMENT_IN_PROGRESS | VALIDATING_EVIDENCE | DEGRADED | DIAGNOSE_RUNTIME_AND_RECONCILE |
| M06 | COMPLETED | EVIDENCE_REVIEW | ACTIVE | QA_IN_PROGRESS | READY_FOR_QA | HEALTHY | SUBMIT_QA |
| M07 | RETRYABLE | RESERVED | PREPARED | WAITING_FOR_WORK_ITEM_AUTHORIZATION | RETRY_SCHEDULED | DEGRADED | RETRY_GOVERNED_COMMAND |
| M08 | FAILED | FAILED | RELEASED | REWORK_ELIGIBLE | FAILED | FAILED | RETRY_GOVERNED_COMMAND |
| M09 | COMPLETED | QA_APPROVED | ACTIVE | READY_FOR_PHASE_MERGE | QA_APPROVED | HEALTHY | MERGE_TO_PHASE |
| M10 | COMPLETED | QA_REJECTED | RELEASED | REWORK_ELIGIBLE | QA_REJECTED | DEGRADED | RETRY_GOVERNED_COMMAND |
| M11 | LEASED | RUNNING | ACTIVE | DEVELOPMENT_IN_PROGRESS + last_signal_at anterior a 120s | NO_RECENT_SIGNAL | DEGRADED | DIAGNOSE_RUNTIME_AND_RECONCILE |
| M12 | LEASED | RUNNING | ACTIVE | DEVELOPMENT_IN_PROGRESS + last_signal_at nulo | INCONSISTENT_TERMINAL_STATE | DEGRADED | DIAGNOSE_RUNTIME_AND_RECONCILE |
| I01 | não listado | — | — | — | INCONSISTENT_TERMINAL_STATE | DEGRADED | DIAGNOSE_RUNTIME_AND_RECONCILE |

M05 fixa que COMPLETED × DEVELOPMENT_IN_PROGRESS nunca é conclusão. M09/M10 distinguem QA aprovado e rejeitado.

## Migration 043, legado e diagnóstico

043 aplica após 042, é idempotente e não infere legados. Criar runtime_legacy_report com id bigserial, subject_type DELIVERY|JOB|ARTIFACT, subject_id UUID, rule_code, details JSONB, reported_at e UNIQUE(subject_type,subject_id,rule_code). Antes das constraints, reportar jobs de desenvolvimento sem delivery, deliveries ativas sem worktree e relações cruzadas.

Adicionar jobs.metadata JSONB NOT NULL DEFAULT {}. Adicionar, como NOT VALID: jobs_development_delivery_required: kind diferente de DEVELOP_WORK_ITEM ou delivery_id não nulo; deliveries_worktree_required: delivery nos estados RESERVED, PREPARING, DISPATCHED, RUNNING, DEVELOPMENT_IN_PROGRESS, EVIDENCE_REVIEW, QA_IN_PROGRESS, QA_APPROVED, QA_REJECTED exige worktree_id; artifacts_metadata_runtime_contract: metadata é objeto e não tem path, uri, prompt, command, stdout, stderr, content, secret ou token.

O DDL exato (após os três ALTERs descritos) é:

```sql
CREATE TABLE IF NOT EXISTS runtime_processes (
 id uuid PRIMARY KEY, role text NOT NULL CHECK(role IN ('SERVER','WORKER')),
 instance_id uuid NOT NULL, build_id text NOT NULL CHECK(build_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'),
 schema_version text NOT NULL CHECK(schema_version='development-runtime/v1'),
 last_heartbeat_at timestamptz NOT NULL, started_at timestamptz NOT NULL DEFAULT clock_timestamp(), stopped_at timestamptz,
 UNIQUE(role,instance_id));
CREATE UNIQUE INDEX IF NOT EXISTS one_live_runtime_process_per_role ON runtime_processes(role) WHERE stopped_at IS NULL;
CREATE TABLE IF NOT EXISTS runtime_diagnostics (
 id uuid PRIMARY KEY, work_item_id uuid NOT NULL REFERENCES work_items(id), fingerprint text NOT NULL,
 rule_code text NOT NULL, state_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(work_item_id,fingerprint));
```

043 termina com constraints NOT VALID; nova violação já falha. npm run migrate:validate-043 atualiza o relatório, retorna exit 1 havendo legado e só então valida constraints. O relatório fica em runtime_legacy_report.

O server cria jobs com metadata vazio e build_id null na projeção enquanto PENDING ou RETRYABLE. No mesmo UPDATE transacional que muda PENDING/RETRYABLE para LEASED, exclusivamente o worker grava metadata.build_id com seu NAAMIVE_BUILD_ID; nenhum outro ator pode gravar ou substituir esse campo. COMPLETED/FAILED preservam esse valor. Um job leased sem build ID é I01; pendência não é. O teste de contrato deve verificar os quatro momentos: criação pendente, lease/dispatch, conclusão e falha/retry.

Fingerprint é SHA-256 hex do UTF-8 canônico: development-runtime/v1|WI|rule_code|delivery_id-or-null|job_id-or-null|D|T|W|J. Fora de GET e numa transação, inserir primeiro runtime_diagnostics; somente se inserido, evento DEVELOPMENT_RUNTIME_INCONSISTENT e artefato development-runtime-diagnostic com metadata contract, fingerprint, diagnostic_id. Usar ON CONFLICT DO NOTHING. Mudança no fingerprint reemite; retorno ao anterior não. O detector não atualiza domínio, jobs, leases ou operações.

## Health e aceite

NAAMIVE_BUILD_ID é obrigatório no server e worker. Ambos batem heartbeat a cada 30s; TTL 90s. Startup faz transação com lock por role: marca stopped_at em toda linha viva com last_heartbeat_at menor que now()-90s e só então insere ou atualiza sua linha. Se uma linha viva não expirada já existir para o role, startup falha sem removê-la. Assim a unique index de processo vivo permite reclamar processo morto sem liberar duplicidade viva. GET /health/runtime retorna 200 apenas com exatamente um SERVER e um WORKER vivos, mesmo build_id e schema; caso contrário 503. O envelope fechado contém schema_version runtime-health/v1, healthy boolean, required_build_id e processes. Cada processo contém somente role, build_id, schema_version, last_heartbeat_at, healthy. Erro não expõe mensagem interna.

Testar M01–M12 e I01; relação ausente/build ausente após lease; dois leases no mesmo WI e em WIs distintos; ausência de tentativa, seleção e histórico de três; schema/sanitização; pares fixos de error; ciclo PENDING→LEASED→terminal do build ID; 043 e legados; dedupe concorrente e reemissão; E2E M06/M09/M10/M05; smoke de worker ausente, TTL, reclamação de linha expirada, role/schema/build divergente; remoção de development_job/jobs e UI v1.
